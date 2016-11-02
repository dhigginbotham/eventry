const db = require('../../../models');
const Schema = require('mongoose').Schema;
const Promise = require('bluebird');
const _ = require('lodash');
const log = require('debug')('bot:models:eventage');
const ms = require('ms');

let Event = null;

Promise.promisifyAll(require('mongoose'));
Promise.longStackTraces();

const schema = new Schema({
  createdDate: { type: Number, default: function() { return Date.now(); } },
  type: { type: String, default: null },
  status: { type: String, default: 'new' },
  updatedDate: [{ type: Number, default: function() { return Date.now(); } }],
  expires: { type: Number, default: function() { return Date.now() + ms('1h'); } },
  payload: { type: Object },
  name: { type: String, default: 'emit' },
});

// hooks
// -
// this happens before mongoose calls .save()
// we want to keep track of some history, and tidy up
schema.pre('save', function(next) {
  this.updatedDate.push(Date.now());
  return next();
});

// funcs
// -
// generic functions that will help later in life
const utils = {};

utils.createEvent = function(opts, fn) {
  const event = new Event();
  _.merge(event, opts);
  return event.save(fn);
};

utils.collectEvents = function(events, fn) {
  events = !Array.isArray(events) ? [] : events;
  events.forEach(e => {
    e.status = 'collected';
    return e.save();
  });
  return fn(null, events);
};

utils.expireEvents = function(events, fn) {
  events = !Array.isArray(events) ? [] : events;
  events.forEach(e => {
    e.expires = Date.now();
    return e.save();
  });
  return fn(null, events);
};

utils.expireEventsByType = function({ type = null }, fn) {
  return Event
  .find()
  .where('type', type)
  .execAsync()
  .catch(fn)
  .then(events => {
    events.forEach(e => {
      e.expires = Date.now();
      return e.save();
    });
    return fn(null, events);
  });
};

utils.queryEvents = function({ end = Date.now(), start = Date.now() - ms('1h'), type = null, collect = true, expire = false }, fn) {
  start = isNaN(Number(start)) ? Date.now() - ms('1h') : parseInt(start, 0);
  end = isNaN(Number(end)) ? new Date() : parseInt(end, 0);
  collect = collect === 'true' || collect === true;
  expire = expire === 'true' || expire === true;
  log('utils:queryEvents:', { start, end, type, collect });
  return Event
    .find()
    // only need the following status
    .where('status')
      .in(['new', 'collected'])
    // only get the type specified
    .where('type', type)
    // enforce range query
    .where('createdDate')
      .gt(start)
      .lt(end)
    // only allow non-expired events
    .where('expires')
      .gt(Date.now())
    // sort by oldest
    .sort('createdDate')
    .execAsync()
    .catch(fn)
    .then((events) => {
      if (!collect) return fn(null, events);
      if (expire) return Event.util.expireEvents(events, fn);
      return Event.utils.collectEvents(events, fn);
    });
};

utils.queryReported = function({ type = null }, fn) {
  return Event
    .find()
    .where('status', 'reported')
    .where('type', type)
    .execAsync()
    .catch(fn)
    .then(fn.bind(null, null));
};

// middleware
// -
// middleware specific to the model, mostly tries
// to use utils
const middleware = {};

middleware.createEvent = function(req, res, next) {
  const { body = {}, params = {} } = req;
  const { payload = null, name = null } = body;
  const { type = null } = params;
  const opts = Object.assign({ payload, name, type });
  log('createEvent:opts', opts);
  return Event.utils.createEvent(opts, (err, resp) => {
    if (err) return next(err, null);
    req.currentEvents.push(resp);
    return next();
  });
};

middleware.queryEvents = function(req, res, next) {
  const { params = {}, query = {} } = req;
  const { collect = true } = query;
  const { start = Date.now() - ms('1h'), end = Date.now(), type = null } = params;
  const opts = Object.assign({ start, end, type, collect });
  log('queryEvents:opts', opts);
  return Event.utils.queryEvents(opts, (err, resp) => {
    if (err) return next(err, null);
    req.currentEvents.push(resp);
    return next();
  });
};

middleware.reportById = function(req, res, next) {
  const { params = {} } = req;
  const { id = null } = params;
  return Event
    .findOne()
    .where('_id', id)
    .execAsync()
    .catch(next)
    .then((event) => {
      event.status = 'reported';
      req.currentEvents.push(event);
      return event.save(next);
    });
};

middleware.queryReported = function(req, res, next) {
  const { params = {} } = req;
  const { type = null } = params;
  return Event.utils.queryReported({ type }, (err, resp) => {
    if (err) return next(err, null);
    req.currentEvents.push(resp);
    return next();
  });
};

middleware.inspectType = function(req, res, next) {
  const { params = {} } = req;
  const { type = null } = params;
  return Event
    .find()
    .where('type', type)
    .execAsync()
    .catch(next)
    .then((events) => {
      req.currentEvents.push(events);
      return next();
    });
};

middleware.initializer = function(req, res, next) {
  req.currentEvents = !(Array.isArray(req.currentEvents))
    ? []
    : req.currentEvents;
  return next();
};

middleware.resolver = function(req, res) {
  if (req.currentEvents.length) return res.json(req.currentEvents.shift());
  return res.status(400).json({ message: 'There was an error with your query' });
};

schema.statics = Object.assign({ middleware, utils });

Event = db.model('Event', schema);

module.exports = Event;
