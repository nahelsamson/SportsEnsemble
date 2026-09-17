const catalogue = require('./agenda-catalog.cjs');
const { address, directions } = require('./agenda-core.js');

// Only information needed to display the authenticated user's agenda leaves this API.
function mobileAgenda(user, clubs = catalogue) {
  const agenda = user.agenda || { sports: [], selectedIds: [] };
  const sessions = user.weeklyPlan?.sessions || [];
  const selected = new Set(agenda.selectedIds);
  const referenced = new Set([...selected, ...sessions.map(s => s.clubId)]);
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    user: { id: user._id.toString(), name: user.name },
    sports: agenda.sports,
    revision: user.weeklyPlan?.revision || 0,
    clubs: clubs.filter(c => referenced.has(c.id)).map(c => ({
      id: c.id, name: c.name, sport: c.discipline, selected: selected.has(c.id),
      address: address(c), directions: directions(c),
      hours: c.fields.Horaires || 'Non communiqué',
      price: c.fields.Tarif || 'Non communiqué',
      audience: c.fields['Âge / Public'] || 'Non communiqué'
    })),
    sessions: sessions.map(s => ({ id: s.id, clubId: s.clubId, day: s.day, start: s.start, end: s.end }))
  };
}
module.exports = { mobileAgenda };
