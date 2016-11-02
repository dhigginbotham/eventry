const express = require('express');
const bodyParser = require('body-parser');
const app = module.exports = express();
const { middleware } = require('./lib/model');

app.use(bodyParser.json());

app.use(middleware.initializer);

app.post('/add/:type', middleware.createEvent, middleware.resolver);
app.get('/collect/:type/:start?/:end?', middleware.queryEvents, middleware.resolver);
app.get('/inspect/:type', middleware.inspectType, middleware.resolver);
app.get('/report/:id', middleware.reportById, middleware.resolver);
app.get('/reported/:type', middleware.queryReported, middleware.resolver);
