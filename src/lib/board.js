const store = require('./store');
const { boardEmbed, boardSelectMenu } = require('./embeds');
const { getTodaysActiveEvents } = require('./flights');

async function refreshBoard(client, guildId) {
  const board = store.getBoard(guildId);
  if (!board) return;
  const channel = await client.channels.fetch(board.channelId).catch(() => null);
  if (!channel) return;

  const now = new Date();
  const events = getTodaysActiveEvents(guildId, now);

  if (board.messageId) {
    const old = await channel.messages.fetch(board.messageId).catch(() => null);
    if (old) await old.delete().catch(() => {});
  }

  const sent = await channel.send({
    embeds: [boardEmbed(events, now, process.env.BOARD_IMAGE_URL || null)],
    components: [boardSelectMenu(events)],
  });
  store.setBoard(guildId, channel.id, sent.id);
}

module.exports = { refreshBoard };
