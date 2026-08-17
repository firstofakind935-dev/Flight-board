const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, GuildScheduledEventStatus } = require('discord.js');
const { formatBoardDate, discordTimestamp } = require('./dates');

const MAX_SELECT_OPTIONS = 25;
const BOARD_COLOR = 0x9dd9e5;

const EMOJI = {
  date: '<:Emoji20:1538217782234062878>',
  header: '<:KE_Tail:1505248567290368172>',
  aircraft: '<:Emoji29:1538218192324010035>',
  route: '<:Emoji15:1538217589359120515>',
  departure: '<:Emoji22:1538217910454063205>',
  cancelled: '<:Emoji27:1538218104734220370>',
  delayed: '<:Emoji28:1538218156475027476>',
};

function isDelayed(record) {
  if (!record.originalScheduledStart || !record.scheduledStart) return false;
  return new Date(record.scheduledStart).getTime() > new Date(record.originalScheduledStart).getTime();
}

function flightEmbed(record) {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJI.header} Flight ${record.flightNumber}`)
    .addFields(
      { name: `${EMOJI.route} Route`, value: `${record.origin} to ${record.destination}`, inline: false },
      { name: `${EMOJI.departure} Departure time`, value: record.scheduledStart ? discordTimestamp(record.scheduledStart) : 'Unknown', inline: true },
      { name: `${EMOJI.aircraft} Aircraft`, value: record.aircraft, inline: true },
    )
    .setFooter({ text: `Created by ${record.creatorTag}` })
    .setColor(record.status === GuildScheduledEventStatus.Canceled ? 0x8a8f98 : BOARD_COLOR);

  if (record.status === GuildScheduledEventStatus.Canceled) {
    embed.setDescription(`${EMOJI.cancelled} This event was cancelled.`);
  } else if (isDelayed(record)) {
    embed.setDescription(`${EMOJI.delayed} Delayed`);
  }

  return embed;
}

function boardEmbed(events, date = new Date(), imageUrl = null) {
  const dateLabel = formatBoardDate(date);
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJI.date} ${dateLabel}`)
    .setColor(BOARD_COLOR);

  if (events.length === 0) {
    embed.setDescription(`No flights are hosted on the ${dateLabel}.`);
    if (imageUrl) embed.setImage(imageUrl);
    return embed;
  }

  const shown = events.slice(0, MAX_SELECT_OPTIONS);
  embed.setDescription(
    `Displayed flights are hosted on the ${dateLabel}. To check more information about a flight, select it on the display menu down below.` +
      (events.length > MAX_SELECT_OPTIONS
        ? `\n\n_Showing ${MAX_SELECT_OPTIONS} of ${events.length} flights (dropdown limit)._`
        : ''),
  );
  embed.addFields(
    shown.map((e) => ({
      name: `${EMOJI.header} ${e.flightNumber}`,
      value:
        (isDelayed(e) ? `${EMOJI.delayed} Delayed\n` : '') +
        `${EMOJI.route} Route: ${e.origin} to ${e.destination}\n` +
        `${EMOJI.departure} Departure time: ${discordTimestamp(e.scheduledStart)}\n` +
        `${EMOJI.aircraft} Aircraft: ${e.aircraft}`,
      inline: false,
    })),
  );

  if (imageUrl) embed.setImage(imageUrl);
  return embed;
}

function boardSelectMenu(events) {
  const shown = events.slice(0, MAX_SELECT_OPTIONS);
  const menu = new StringSelectMenuBuilder()
    .setCustomId('flight_board_select')
    .setPlaceholder(shown.length ? 'Select a flight to view details…' : 'No flights available')
    .setDisabled(shown.length === 0)
    .addOptions(
      shown.length
        ? shown.map((e) => ({
            label: e.flightNumber.slice(0, 100),
            description: `${e.origin} to ${e.destination}`.slice(0, 100),
            value: e.id,
          }))
        : [{ label: 'placeholder', value: 'placeholder' }],
    );
  return new ActionRowBuilder().addComponents(menu);
}

module.exports = { flightEmbed, boardEmbed, boardSelectMenu };
