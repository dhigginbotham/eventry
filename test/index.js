const expect = require('expect.js');
const Eventry = require('../lib/events');

const test = new Eventry('test');

test.on('testing', (a, b, done) => {
  expect(a).to.equal(1);
  expect(b).to.equal(2);
  return done();
});

describe('evertry tests', () => {
  it('it should be able to listen to an event', (done) => {
    test.emit('testing', 1, 2, done);
  });
});
