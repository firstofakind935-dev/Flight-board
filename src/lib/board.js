const store = require('./store');
const { boardEmbed, boardSelectMenu } = require('./embeds');
const { getTodaysActiveEvents } = require('./flights');
const { refreshPanel } = require('./panel');

async function refreshBoardMessage(client, guildId) {
  const board = store.getBoard(guildId);
  if (!board) return;
  const channel = await client.channels.fetch(board.channelId).catch(() => null);
  if (!channel) return;

  const now = new Date();
  const events = getTodaysActiveEvents(guildId, now);
  const payload = {
    embeds: [boardEmbed(events, now, process.env.BOARD_IMAGE_URL || null)],
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

module.exports = { refreshBoard };
