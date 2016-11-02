const request = require('request');
const ms = require('ms');
const log = require('debug')('bot:app:eventry:');

const defaults = {
  prefix: 'http://localhost',
};
defaults.headers = {
  'x-requested-with': 'eventry',
};

class Request {
  constructor(opts) {
    this.options = Object.assign({}, defaults, opts);
  }

  xhr(opts, fn) {
    const { method = 'GET', body = {} } = opts;
    const { json = true, headers = Object.assign(this.options.headers) } = opts;
    let { url = null } = opts;
    if (!url) return fn(new Error('You must provide a URL'), null);
    url = `${this.options.prefix}/events${url}`;
    return request({ method, body, json, headers, url }, fn);
  }

  add(opts, fn) {
    const { payload = {}, type = 'none', name = 'emit' } = opts;
    const body = { payload, name };
    const method = 'POST';
    const url = `/add/${type}`;
    const req = Object.assign({ method, body, url });
    return this.xhr(req, (err, resp) => {
      if (err) return fn(new Error(err), null);
      log('resp', resp);
      return fn(null, resp);
    });
  }

  collect(opts, fn) {
    const { type = 'none' } = opts;
    const { start = Date.now() - ms('1h'), end = Date.now() } = opts;
    const url = `/collect/${type}/${start}/${end}`;
    const req = Object.assign({ url });
    return this.xhr(req, (err, resp) => {
      if (err) return fn(new Error(err), null);
      log('resp', resp);
      return fn(null, resp);
    });
  }

  report(opts, fn) {
    const { id = null } = opts;
    if (!id) return fn(new Error('Cannot report an event without an ID'), null);
    const url = `/report/${id}`;
    const method = 'GET';
    const req = Object.assign({ url, method });
    return this.xhr(req, (err, resp) => {
      if (err) return fn(new Error(err), null);
      log('resp', resp);
      return fn(null, resp);
    });
  }
}

module.exports = Request;
