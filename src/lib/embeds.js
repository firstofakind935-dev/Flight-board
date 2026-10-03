const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, GuildScheduledEventStatus } = require('discord.js');
const { formatBoardDate, discordTimestamp } = require('./dates');

const MAX_SELECT_OPTIONS = 25;
// Air India brand palette
const BOARD_COLOR = 0xda0e29; // Air India red
const DELAYED_COLOR = 0xc8a24a; // Air India gold
const CANCELLED_COLOR = 0x8a8f98;
const BRAND = 'Air India';

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
    .setAuthor({ name: BRAND })
    .setTitle(`${EMOJI.header} Flight ${record.flightNumber}`)
    .addFields(
      { name: `${EMOJI.route} Route`, value: `${record.origin} to ${record.destination}`, inline: false },
      { name: `${EMOJI.departure} Departure time`, value: record.scheduledStart ? discordTimestamp(record.scheduledStart) : 'Unknown', inline: true },
      { name: `${EMOJI.aircraft} Aircraft`, value: record.aircraft, inline: true },
    )
    .setFooter({ text: `${BRAND} • Created by ${record.creatorTag}` })
    .setColor(
      record.status === GuildScheduledEventStatus.Canceled
        ? CANCELLED_COLOR
        : isDelayed(record)
          ? DELAYED_COLOR
          : BOARD_COLOR,
    );

  if (record.status === GuildScheduledEventStatus.Canceled) {
    embed.setDescription(`${EMOJI.cancelled} We regret to inform you that this flight has been cancelled.`);
  } else if (isDelayed(record)) {
    embed.setDescription(`${EMOJI.delayed} Delayed`);
  }

  return embed;
}

function boardEmbed(events, date = new Date(), imageUrl = null) {
  const dateLabel = formatBoardDate(date);
  const embed = new EmbedBuilder()
    .setAuthor({ name: `${BRAND} Departures` })
    .setTitle(`${EMOJI.date} ${dateLabel}`)
    .setFooter({ text: `Namaste and welcome aboard ${BRAND}` })
    .setColor(BOARD_COLOR);

  if (events.length === 0) {
    embed.setDescription(`Namaste! There are no ${BRAND} flights scheduled for the ${dateLabel}.`);
    if (imageUrl) embed.setImage(imageUrl);
    return embed;
  }

  const shown = events.slice(0, MAX_SELECT_OPTIONS);
  embed.setDescription(
    `Namaste! Here are today's ${BRAND} flights for the ${dateLabel}. To view more information about a flight, select it from the menu below.` +
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
    .setPlaceholder(shown.length ? 'Select an Air India flight to view details…' : 'No Air India flights available')
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
