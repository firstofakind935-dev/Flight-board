const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, GuildScheduledEventStatus } = require('discord.js');
const { formatBoardDate, discordTimestamp } = require('./dates');

const MAX_SELECT_OPTIONS = 25;
// Air India brand palette
const BOARD_COLOR = 0xda0e29; // Air India red
const DELAYED_COLOR = 0xc8a24a; // Air India gold
const CANCELLED_COLOR = 0x8a8f98;
const BRAND = 'Air India';

const EMOJI = {
  date: '<:AirIndialogo_1637374664622_16373:1540256329279475712>',
  header: '<:aipattern:1546929002420109353>',
  aircraft: '<:Ai_Plane:1540250013882384404>',
  route: '<:AI_Route:1540263390939709450>',
  departure: '<:AI_Takeoff:1540249916323008512>',
  cancelled: '<:AI_Cross:1540263520006840381>',
  delayed: '<:Ai_delayed:1540250239741468692>',
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
