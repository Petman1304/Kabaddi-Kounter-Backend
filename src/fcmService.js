let admin = null;
let initialized = false;
let initializationError = null;

function tryInitializeAdmin() {
  if (initialized) {
    return admin;
  }

  initialized = true;

  try {
    // Lazy-load so backend still runs when Firebase credentials are not configured.
    // eslint-disable-next-line global-require
    admin = require('firebase-admin');
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  } catch (error) {
    initializationError = error;
    admin = null;
  }

  return admin;
}

function isEnabled() {
  return Boolean(tryInitializeAdmin());
}

function getInitializationError() {
  tryInitializeAdmin();
  return initializationError;
}

function buildMessagePayload(match, update, recipientToken) {
  const finalScore = `${match.teamAScore} - ${match.teamBScore}`;
  const scoringTeam = update.scoringTeam || 'Match update';
  const newScore = update.newScore || finalScore;

  return {
    token: recipientToken,
    notification: {
      title: scoringTeam,
      body: newScore,
    },
    data: {
      matchId: String(match.id),
      scoringTeam: String(scoringTeam),
      newScore: String(newScore),
      scoreA: String(match.teamAScore),
      scoreB: String(match.teamBScore),
      teamAName: String(match.teamAName),
      teamBName: String(match.teamBName),
      status: String(match.status),
    },
  };
}

async function sendUpdate(match, update, subscribers) {
  if (!subscribers.length) {
    return { enabled: isEnabled(), sent: 0, skipped: 'no subscribers' };
  }

  const messaging = tryInitializeAdmin()?.messaging?.();
  if (!messaging) {
    return { enabled: false, sent: 0, skipped: 'firebase-admin not configured' };
  }

  const responses = [];
  for (const subscriber of subscribers) {
    const payload = buildMessagePayload(match, update, subscriber.token);
    const response = await messaging.send(payload);
    responses.push({ token: subscriber.token, response });
  }

  return { enabled: true, sent: responses.length, responses };
}

module.exports = {
  buildMessagePayload,
  getInitializationError,
  isEnabled,
  sendUpdate,
};

