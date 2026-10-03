const { refreshBoard, refreshBoardMessage, boardImageUrls, rotateIntervalMs } = require('./board');
const { isSameUtcDay } = require('./dates');
const store = require('./store');

const CHECK_INTERVAL_MS = 10 * 60 * 1000;

function startDailyRefresh(client) {
  let lastDate = new Date();
  setInterval(async () => {
    const now = new Date();
    if (isSameUtcDay(now, lastDate)) return;
    lastDate = now;
    const guildIds = new Set([...store.getBoardGuildIds(), ...store.getPanelGuildIds()]);
    for (const guildId of guildIds) {
      await refreshBoard(client, guildId).catch((err) => console.error(`Daily board refresh failed for guild ${guildId}:`, err));
    }
  }, CHECK_INTERVAL_MS);
}

// With more than one banner configured, re-render every board on each slide
// change so the banner advances. Only the board is edited, not the panel.
function startBannerRotation(client) {
  if (boardImageUrls().length < 2) return;
  const interval = rotateIntervalMs();
  const tick = async () => {
    for (const guildId of store.getBoardGuildIds()) {
      await refreshBoardMessage(client, guildId).catch((err) => console.error(`Banner rotation failed for guild ${guildId}:`, err));
    }
  };
  // Line up with slide boundaries so the banner changes right when the slide does.
  setTimeout(() => {
    tick();
    setInterval(tick, interval);
  }, interval - (Date.now() % interval) + 1000);
  console.log(`Rotating ${boardImageUrls().length} banners every ${interval / 1000} seconds.`);
}

module.exports = { startDailyRefresh, startBannerRotation };
