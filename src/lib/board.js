const store = require('./store');
const { boardEmbed, boardSelectMenu } = require('./embeds');
const { getTodaysActiveEvents } = require('./flights');
const { refreshPanel } = require('./panel');

const DEFAULT_ROTATE_MINUTES = 5;

// BOARD_IMAGE_URL holds one banner link, or several separated by commas to
// rotate through them as a slideshow. Only real http(s) links are kept —
// anything else makes Discord reject the whole board message.
function boardImageUrls() {
  const raw = process.env.BOARD_IMAGE_URL || '';
  return raw
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)
    .filter((u) => {
      const ok = /^https?:\/\/\S+$/i.test(u);
      if (!ok) console.warn(`Ignoring banner "${u}": it must be a direct http(s) link to an image.`);
      return ok;
    });
}

const MIN_ROTATE_SECONDS = 10;

// BOARD_IMAGE_INTERVAL_SECONDS wins if set; otherwise BOARD_IMAGE_INTERVAL_MINUTES.
// Floored at 10 seconds so the bot doesn't hammer Discord with edits.
function rotateIntervalMs() {
  const seconds = Number(process.env.BOARD_IMAGE_INTERVAL_SECONDS);
  if (process.env.BOARD_IMAGE_INTERVAL_SECONDS && Number.isFinite(seconds)) {
    return Math.max(seconds, MIN_ROTATE_SECONDS) * 1000;
  }
  const minutes = Number(process.env.BOARD_IMAGE_INTERVAL_MINUTES);
  return (Number.isFinite(minutes) && minutes >= 1 ? minutes : DEFAULT_ROTATE_MINUTES) * 60 * 1000;
}

// Every board shows the same slide at the same time: the slide is picked
// from the clock, not from a counter, so restarts don't reset it.
function boardImageUrl(now = new Date()) {
  const urls = boardImageUrls();
  if (urls.length === 0) return null;
  return urls[Math.floor(now.getTime() / rotateIntervalMs()) % urls.length];
}

async function refreshBoardMessage(client, guildId) {
  const board = store.getBoard(guildId);
  if (!board) return;
  const channel = await client.channels.fetch(board.channelId).catch(() => null);
  if (!channel) {
    console.warn(`Board channel ${board.channelId} for guild ${guildId} is missing or not visible to the bot.`);
    return;
  }

  const now = new Date();
  const events = getTodaysActiveEvents(guildId, now);
  const payload = {
    embeds: [boardEmbed(events, now, boardImageUrl(now))],
    components: [boardSelectMenu(events)],
  };

  const existing = board.messageId ? await channel.messages.fetch(board.messageId).catch(() => null) : null;

  if (existing) {
    await existing.edit(payload);
  } else {
    const sent = await channel.send(payload);
    store.setBoard(guildId, channel.id, sent.id);
  }
}

// Refreshes everything that shows a guild's flights: the public board and
// the staff control panel. Each is skipped if that guild hasn't set it up.
async function refreshBoard(client, guildId) {
  await refreshBoardMessage(client, guildId);
  await refreshPanel(client, guildId).catch((err) => console.error(`Panel refresh failed for guild ${guildId}:`, err));
}

module.exports = { refreshBoard, refreshBoardMessage, boardImageUrls, rotateIntervalMs };
