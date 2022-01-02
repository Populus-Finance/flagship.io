const Constants = require('../shared/constants');
const Player = require('./player');
const applyCollisions = require('./collisions');
const HealthKit = require('./health_kit');

class Game {
  constructor() {
    this.sockets = {};
    this.players = {};
    this.bullets = [];
    this.health_kits = [];
    this.health_kits_next_gen = 0;
    this.lastUpdateTime = Date.now();
    this.shouldSendUpdate = false;
    setInterval(this.update.bind(this), 1000 / 60);
  }

  addPlayer(socket, username) {
    this.sockets[socket.id] = socket;

    // Generate a position to start this player at.
    const x = Constants.MAP_SIZE * (0.25 + Math.random() * 0.5);
    const y = Constants.MAP_SIZE * (0.25 + Math.random() * 0.5);
    this.players[socket.id] = new Player(socket.id, username, x, y);
  }

  removePlayer(socket) {
    delete this.sockets[socket.id];
    delete this.players[socket.id];
  }

  handleInput(socket, dir) {
    if (this.players[socket.id]) {
      this.players[socket.id].setDirection(dir);
    }
  }

  addHealthKit() {
    const x = Constants.MAP_SIZE * (0.10 + Math.random() * 0.8);
    const y = Constants.MAP_SIZE * (0.10 + Math.random() * 0.8);
    this.health_kits.push(new HealthKit(x, y));
    this.health_kits_next_gen += Constants.HEALTH_KIT_GEN_COOLDOWN;
  }

  update() {
    // Calculate time elapsed
    const now = Date.now();
    const dt = (now - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = now;

    // Update each bullet
    const bulletsToRemove = [];
    this.bullets.forEach(bullet => {
      if (bullet.update(dt)) {
        // Destroy this bullet
        bulletsToRemove.push(bullet);
      }
    });
    this.bullets = this.bullets.filter(bullet => !bulletsToRemove.includes(bullet));

    // Update each player
    Object.keys(this.sockets).forEach(playerID => {
      const player = this.players[playerID];
      const newBullet = player.update(dt);
      if (newBullet) {
        this.bullets.push(newBullet);
      }
    });

    // Apply all collisions, give players score for hitting bullets
    const destroyedItems = applyCollisions(Object.values(this.players), this.bullets, this.health_kits);
    destroyedItems.destroyed_bullets.forEach(b => {
      if (this.players[b.parentID]) {
        this.players[b.parentID].onDealtDamage(); // add 20 points to score
      }
    });
    this.bullets = this.bullets.filter(bullet => !destroyedItems.destroyed_bullets.includes(bullet));

    // Apply health_kit collisions (already applied in collisions.js)
    // Maintains max of 3 health kits; and a generation cooldown of 15 seconds
    this.health_kits = this.health_kits.filter(health_kit => !destroyedItems.destroyed_healthKits.includes(health_kit));
    if (this.health_kits.length < Constants.MAX_HEALTH_KITS && now >= this.health_kits_next_gen) {
      this.addHealthKit();
    }

    // Check if any players are dead
    Object.keys(this.sockets).forEach(playerID => {
      const socket = this.sockets[playerID];
      const player = this.players[playerID];
      if (player.hp <= 0) {
        socket.emit(Constants.MSG_TYPES.GAME_OVER);
        this.removePlayer(socket);
      }
    });

    // Send a game update to each player every other time
    if (this.shouldSendUpdate) {
      const leaderboard = this.getLeaderboard();
      Object.keys(this.sockets).forEach(playerID => {
        const socket = this.sockets[playerID];
        const player = this.players[playerID];
        socket.emit(Constants.MSG_TYPES.GAME_UPDATE, this.createUpdate(player, leaderboard));
      });
      this.shouldSendUpdate = false;
    } else {
      this.shouldSendUpdate = true;
    }
  }

  getLeaderboard() {
    return Object.values(this.players)
      .sort((p1, p2) => p2.score - p1.score)
      .slice(0, 5)
      .map(p => ({ username: p.username, score: Math.round(p.score) }));
  }

  createUpdate(player, leaderboard) {
    const nearbyPlayers = Object.values(this.players).filter(
      p => p !== player && p.distanceTo(player) <= Constants.MAP_SIZE / 2,
    );
    const nearbyBullets = this.bullets.filter(
      b => b.distanceTo(player) <= Constants.MAP_SIZE / 2,
    );
    // const nearbyHealthKits = this.health_kits.filter(
    //   h => h.distanceTo(player) <= Constants.MAP_SIZE / 2,
    // );

    return {
      t: Date.now(),
      me: player.serializeForUpdate(),
      others: nearbyPlayers.map(p => p.serializeForUpdate()),
      bullets: nearbyBullets.map(b => b.serializeForUpdate()),
      // health_kits: nearbyHealthKits.map(h => h.serializeForUpdate()),
      health_kits: this.health_kits.map(h => h.serializeForUpdate()),
      leaderboard,
    };
  }
}

module.exports = Game;
