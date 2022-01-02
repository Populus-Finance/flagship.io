const shortid = require('shortid');
// const GameItemClass = require('./item');
const Constants = require('../shared/constants');

class HealthKit {
  constructor(x, y) {
    // location randomly generated on the map
    this.x = x;
    this.y = y;
  }

  serializeForUpdate() {
    return {
      x: this.x,
      y: this.y,
    };
  }
}

module.exports = HealthKit;