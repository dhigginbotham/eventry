const ms = require('ms');

module.exports.start = function start(interval = ms('5s'), fn) {
  let to = null;
  const restrict = Date.now() + interval;
  function time() {
    clearTimeout(to);
    const now = Date.now();
    if (now >= restrict) fn({ restrict, to, now, interval });
    const len = restrict - now > 0
     ? restrict - now
     : interval;
    to = setTimeout(time, len);
    return to;
  }
  to = setTimeout(time, interval);
  return to;
};
