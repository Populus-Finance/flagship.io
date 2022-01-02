class Item {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
  
    distanceTo(player) {
      const dx = this.x - player.x;
      const dy = this.y - player.y;
      return Math.sqrt(dx * dx + dy * dy);
    }
  
    // Items: health_kits ... do not need an id
    serializeForUpdate() {
      return {
        x: this.x,
        y: this.y,
      };
    }
  }
  
  module.exports = Item;
  