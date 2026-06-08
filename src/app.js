const express = require('express');
const cors = require('cors');
const { LiveMatchStore } = require('./matchStore');
const { getInitializationError, sendUpdate } = require('./fcmService');

function resolveScoringSide(match, body) {
  const rawHint = String(body.team || body.side || body.scoringSide || body.scoringTeam || body.teamName || '').trim();
  const normalizedHint = rawHint.toUpperCase();

  if (['B', 'TEAMB', 'TEAM_B'].includes(normalizedHint)) {
    return 'B';
  }

  if (['A', 'TEAMA', 'TEAM_A'].includes(normalizedHint)) {
    return 'A';
  }

  if (rawHint && rawHint === match.teamBName) {
    return 'B';
  }

  if (rawHint && rawHint === match.teamAName) {
    return 'A';
  }

  return 'A';
}

function parseOptionalNumber(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  return parsed;
}

function buildScoreUpdateMetadata(match, body) {
  const scoringSide = resolveScoringSide(match, body);
  const scoringTeamName = scoringSide === 'A' ? match.teamAName : match.teamBName;
  const exactScoreA = parseOptionalNumber(body.teamAScore, 'teamAScore');
  const exactScoreB = parseOptionalNumber(body.teamBScore, 'teamBScore');

  return {
    scoringSide,
    scoringTeam: body.scoringTeam || scoringTeamName,
    newScore: body.newScore,
    exactScoreA,
    exactScoreB,
    increment: body.increment,
  };
}

function createApp({ store = new LiveMatchStore(), notifier = sendUpdate } = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ ok: true, firebaseEnabled: Boolean(getInitializationError() === null) });
  });

  app.get('/match', (req, res) => {
    res.json(store.listMatches());
  });

  app.post('/match/:id/subscribe', async (req, res, next) => {
    try {
      const { id } = req.params;
      const { token, deviceName } = req.body || {};
      const result = store.subscribe(id, token, deviceName);
      res.status(200).json({
        success: true,
        match: result.match,
        subscriberCount: result.subscriberCount,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/match/:id/score', async (req, res, next) => {
    try {
      const { id } = req.params;
      const match = store.getMatch(id);
      if (!match) {
        return res.status(404).json({ message: 'Match not found' });
      }

      const update = buildScoreUpdateMetadata(match, req.body || {});
      let updatedMatch;

      if (update.exactScoreA !== undefined || update.exactScoreB !== undefined) {
        updatedMatch = store.setScore(id, update.exactScoreA, update.exactScoreB);
      } else {
        updatedMatch = store.incrementScore(id, update.scoringSide, update.increment || 1);
      }

      const subscribers = store.getSubscriptions(id);
      const notificationResult = await notifier(updatedMatch, {
        scoringTeam: update.scoringTeam,
        newScore: update.newScore || `${updatedMatch.teamAScore} - ${updatedMatch.teamBScore}`,
      }, subscribers);

      res.json({
        success: true,
        match: updatedMatch,
        notificationResult,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/match/:id/end', async (req, res, next) => {
    try {
      const { id } = req.params;
      const endedMatch = store.endMatch(id);
      const subscribers = store.getSubscriptions(id);
      const notificationResult = await notifier(endedMatch, {
        scoringTeam: 'Match ended',
        newScore: `${endedMatch.teamAScore} - ${endedMatch.teamBScore}`,
      }, subscribers);

      res.json({
        success: true,
        match: endedMatch,
        notificationResult,
      });
    } catch (error) {
      next(error);
    }
  });

  app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });

  app.use((error, req, res, next) => {
    const message = error?.message || 'Internal server error';
    const status = /not found/i.test(message) ? 404 : /required|invalid|positive|LIVE/i.test(message) ? 400 : 500;
    res.status(status).json({ message });
  });

  return app;
}

module.exports = { buildScoreUpdateMetadata, createApp };

