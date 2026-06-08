const sampleMatches = [
  {
	id: '1',
	teamAName: 'Kabaddi Kings',
	teamBName: 'Raid Rangers',
	teamAScore: 12,
	teamBScore: 10,
	status: 'LIVE',
  },
  {
	id: '2',
	teamAName: 'Super Strikers',
	teamBName: 'Defence Warriors',
	teamAScore: 8,
	teamBScore: 8,
	status: 'LIVE',
  },
  {
	id: '3',
	teamAName: 'Patna Panthers',
	teamBName: 'Bengal Bulls',
	teamAScore: 18,
	teamBScore: 16,
	status: 'END',
  },
];

function cloneMatch(match) {
  return { ...match };
}

module.exports = { sampleMatches, cloneMatch };

