const EventEmitter = require('events');

class Eventry extends EventEmitter {
  constructor(type = 'none', ...args) {
    super(args);
    this.type = type;
  }
  // overload .on and .emit func to
  // support special event syntax
  on(ev, fn) {
    super.on(`${this.type}:${ev}`, fn);
  }
  emit(ev, ...args) {
    super.emit(`${this.type}:${ev}`, ...args);
  }
}

module.exports = Eventry;
