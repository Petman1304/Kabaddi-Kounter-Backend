const { cloneMatch, sampleMatches } = require('./sampleMatches');

class LiveMatchStore {
  constructor(seedMatches = sampleMatches) {
    this.matches = new Map(seedMatches.map((match) => [match.id, cloneMatch(match)]));
    this.subscriptions = new Map();
  }

  listMatches() {
    return Array.from(this.matches.values()).map(cloneMatch);
  }

  getMatch(matchId) {
    const match = this.matches.get(String(matchId));
    return match ? cloneMatch(match) : null;
  }

  subscribe(matchId, token, deviceName = null) {
    const normalizedMatchId = String(matchId);
    const normalizedToken = String(token || '').trim();

    if (!normalizedToken) {
      throw new Error('FCM token is required');
    }

    const match = this.matches.get(normalizedMatchId);
    if (!match) {
      throw new Error(`Match ${normalizedMatchId} not found`);
    }

    if (match.status !== 'LIVE') {
      throw new Error('Only LIVE matches can be subscribed to');
    }

    if (!this.subscriptions.has(normalizedMatchId)) {
      this.subscriptions.set(normalizedMatchId, new Map());
    }

    const matchSubscriptions = this.subscriptions.get(normalizedMatchId);
    matchSubscriptions.set(normalizedToken, {
      token: normalizedToken,
      deviceName: deviceName || null,
      subscribedAt: new Date().toISOString(),
    });

    return {
      match: cloneMatch(match),
      subscriberCount: matchSubscriptions.size,
    };
  }

  incrementScore(matchId, side, increment = 1) {
    const normalizedMatchId = String(matchId);
    const match = this.matches.get(normalizedMatchId);

    if (!match) {
      throw new Error(`Match ${normalizedMatchId} not found`);
    }

    if (match.status !== 'LIVE') {
      throw new Error('Match has already ended');
    }

    const numericIncrement = Number(increment);
    if (!Number.isFinite(numericIncrement) || numericIncrement <= 0) {
      throw new Error('Increment must be a positive number');
    }

    const normalizedSide = String(side || '').trim().toUpperCase();
    const scoringSide = normalizedSide === 'B' || normalizedSide === 'TEAMB' || normalizedSide === 'TEAM_B' ? 'B' : 'A';

    if (scoringSide === 'A') {
      match.teamAScore += numericIncrement;
    } else {
      match.teamBScore += numericIncrement;
    }

    return cloneMatch(match);
  }

  setScore(matchId, teamAScore, teamBScore) {
    const normalizedMatchId = String(matchId);
    const match = this.matches.get(normalizedMatchId);

    if (!match) {
      throw new Error(`Match ${normalizedMatchId} not found`);
    }

    if (match.status !== 'LIVE') {
      throw new Error('Match has already ended');
    }

    if (teamAScore !== undefined) {
      const numericTeamAScore = Number(teamAScore);
      if (!Number.isFinite(numericTeamAScore) || numericTeamAScore < 0) {
        throw new Error('teamAScore must be a non-negative number');
      }
      match.teamAScore = numericTeamAScore;
    }

    if (teamBScore !== undefined) {
      const numericTeamBScore = Number(teamBScore);
      if (!Number.isFinite(numericTeamBScore) || numericTeamBScore < 0) {
        throw new Error('teamBScore must be a non-negative number');
      }
      match.teamBScore = numericTeamBScore;
    }

    return cloneMatch(match);
  }

  endMatch(matchId) {
    const normalizedMatchId = String(matchId);
    const match = this.matches.get(normalizedMatchId);

    if (!match) {
      throw new Error(`Match ${normalizedMatchId} not found`);
    }

    match.status = 'END';
    return cloneMatch(match);
  }

  getSubscriptions(matchId) {
    const normalizedMatchId = String(matchId);
    const subscriptionMap = this.subscriptions.get(normalizedMatchId);

    if (!subscriptionMap) {
      return [];
    }

    return Array.from(subscriptionMap.values()).map((item) => ({ ...item }));
  }
}

module.exports = { LiveMatchStore };

