const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');
const { LiveMatchStore } = require('../src/matchStore');

test('GET /match returns seeded matches', async () => {
  const app = createApp({ store: new LiveMatchStore(), notifier: async () => ({ sent: 0 }) });
  const response = await request(app).get('/match').expect(200);

  assert.equal(Array.isArray(response.body), true);
  assert.equal(response.body.length >= 2, true);
  assert.equal(response.body[0].teamAName.length > 0, true);
});

test('POST /match/:id/subscribe registers token once', async () => {
  const store = new LiveMatchStore();
  const app = createApp({ store, notifier: async () => ({ sent: 0 }) });

  const response = await request(app)
    .post('/match/1/subscribe')
    .send({ token: 'fcm-token-1', deviceName: 'Pixel 8' })
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.subscriberCount, 1);
  assert.equal(store.getSubscriptions('1').length, 1);
});

test('POST /match/:id/score increments score and notifies subscribers', async () => {
  const store = new LiveMatchStore();
  store.subscribe('1', 'token-a');
  const calls = [];
  const app = createApp({
    store,
    notifier: async (match, update, subscribers) => {
      calls.push({ match, update, subscribers });
      return { sent: subscribers.length };
    },
  });

  const response = await request(app)
    .post('/match/1/score')
    .send({ team: 'A', increment: 2 })
    .expect(200);

  assert.equal(response.body.success, true);
  assert.equal(response.body.match.teamAScore, 14);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].update.scoringTeam, 'Kabaddi Kings');
  assert.equal(calls[0].update.newScore, '14 - 10');
  assert.equal(calls[0].subscribers.length, 1);
});

test('POST /match/:id/score accepts team names as scoring hints', async () => {
  const store = new LiveMatchStore();
  const app = createApp({ store, notifier: async () => ({ sent: 0 }) });

  const response = await request(app)
    .post('/match/1/score')
    .send({ scoringTeam: 'Raid Rangers', increment: 3 })
    .expect(200);

  assert.equal(response.body.match.teamAScore, 12);
  assert.equal(response.body.match.teamBScore, 13);
});

test('POST /match/:id/end marks match as ended', async () => {
  const store = new LiveMatchStore();
  const app = createApp({ store, notifier: async () => ({ sent: 0 }) });

  const response = await request(app)
    .post('/match/2/end')
    .expect(200);

  assert.equal(response.body.match.status, 'END');
});

test('rejects subscribing to ended match', async () => {
  const store = new LiveMatchStore();
  const app = createApp({ store, notifier: async () => ({ sent: 0 }) });

  const response = await request(app)
    .post('/match/3/subscribe')
    .send({ token: 'token-ended' })
    .expect(400);

  assert.match(response.body.message, /Only LIVE matches/i);
});

