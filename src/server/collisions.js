const Constants = require('../shared/constants');

// Returns an array of bullets to be destroyed.
/**
 * 
 * @param {*} players : arrays of all players; key = socket.id
 * @param {*} bullets : optional;
 * @param {*} health_kits : optional; health_kits, damage_boost, speed_boost, exp
 * @returns : An object of arrays of all destroyed objects/items
 */
function applyCollisions(players, bullets = [], health_kits = []) {
  const destroyedBullets = [];
  const destroyedHealthKits = [];

  for (let player_idx = 0; player_idx < players.length; player_idx++) {
    const player = players[player_idx];

    // Look for a player (who didn't create the bullet) to collide each bullet with.
    // As soon as we find one, break out of the loop to prevent double counting a bullet.
    for (let bullet_idx = 0; bullet_idx < bullets.length; bullet_idx++) {
      const bullet = bullets[bullet_idx];
      if (
        bullet.parentID !== player.id &&
        player.distanceTo(bullet) <= Constants.PLAYER_RADIUS + Constants.BULLET_RADIUS
      ) {
        destroyedBullets.push(bullet);
        player.takeBulletDamage();
        break;
      }
    }

    // check for health_kits collisions
    for (let health_kit_idx = 0; health_kit_idx < health_kits.length; health_kit_idx++) {
      const health_kit = health_kits[health_kit_idx];
      if (
        player.distanceTo(health_kit) <= Constants.PLAYER_RADIUS + Constants.HEALTH_KIT_RADIUS
      ) { // it pick up health_kit
        destroyedHealthKits.push(health_kit);
        player.addHealthKit();

        // add 5 points to the score
        player.onPickedUpItems();
        break;
      }
    }
  }

  return {destroyed_bullets : destroyedBullets, destroyed_healthKits : destroyedHealthKits};
}

module.exports = applyCollisions;
