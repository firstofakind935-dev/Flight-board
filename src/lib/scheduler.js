const { refreshBoard } = require('./board');
const { isSameUtcDay } = require('./dates');
const store = require('./store');

const CHECK_INTERVAL_MS = 10 * 60 * 1000;

function startDailyRefresh(client) {
  let lastDate = new Date();
  setInterval(async () => {
    const now = new Date();
    if (isSameUtcDay(now, lastDate)) return;
    lastDate = now;
    for (const guildId of store.getBoardGuildIds()) {
      await refreshBoard(client, guildId).catch((err) => console.error(`Daily board refresh failed for guild ${guildId}:`, err));
    }
  }, CHECK_INTERVAL_MS);
}

module.exports = { startDailyRefresh };
