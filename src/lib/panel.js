const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
} = require('discord.js');
const store = require('./store');
const { getTodaysActiveEvents } = require('./flights');
const { flightEmbed, isDelayed, BOARD_COLOR, EMOJI } = require('./embeds');
const { formatBoardDate, formatUtcTime } = require('./dates');
const { addFlight, delayFlight, cancelFlight } = require('./actions');

const MAX_SELECT_OPTIONS = 25;

function panelEmbed(events, date = new Date()) {
  const lines = events.slice(0, MAX_SELECT_OPTIONS).map(
    (e) =>
      `${EMOJI.header} **${e.flightNumber}** · ${e.origin} to ${e.destination} · ${formatUtcTime(e.scheduledStart)} · ${e.aircraft}` +
      (isDelayed(e) ? ` · ${EMOJI.delayed} Delayed` : ''),
  );
  return new EmbedBuilder()
    .setTitle('Flight Control Panel')
    .setColor(BOARD_COLOR)
    .setDescription(
      `Today's flights (${formatBoardDate(date)}):\n\n` +
        (lines.length ? lines.join('\n') : '_No flights scheduled today._') +
        '\n\nSelect a flight below to delay or cancel it, or press **Add flight** to schedule a new one.',
    );
}

function panelComponents(events) {
  const shown = events.slice(0, MAX_SELECT_OPTIONS);
  const select = new StringSelectMenuBuilder()
    .setCustomId('panel_select')
    .setPlaceholder(shown.length ? 'Select a flight to manage…' : 'No flights to manage')
    .setDisabled(shown.length === 0)
    .addOptions(
      shown.length
        ? shown.map((e) => ({
            label: e.flightNumber.slice(0, 100),
            description: `${e.origin} to ${e.destination} · ${formatUtcTime(e.scheduledStart)}`.slice(0, 100),
            value: e.id,
          }))
        : [{ label: 'placeholder', value: 'placeholder' }],
    );
  const addButton = new ButtonBuilder().setCustomId('panel_add').setLabel('Add flight').setStyle(ButtonStyle.Success);
  return [new ActionRowBuilder().addComponents(select), new ActionRowBuilder().addComponents(addButton)];
}

async function refreshPanel(client, guildId) {
  const panel = store.getPanel(guildId);
  if (!panel) return;
  const channel = await client.channels.fetch(panel.channelId).catch(() => null);
  if (!channel) return;

  const now = new Date();
  const events = getTodaysActiveEvents(guildId, now);
  const payload = { embeds: [panelEmbed(events, now)], components: panelComponents(events) };

  const existing = panel.messageId ? await channel.messages.fetch(panel.messageId).catch(() => null) : null;
  if (existing) {
    await existing.edit(payload);
  } else {
    const sent = await channel.send(payload);
    store.setPanel(guildId, channel.id, sent.id);
  }
}

function findActiveFlight(guildId, eventId) {
  return getTodaysActiveEvents(guildId).find((e) => e.id === eventId) || null;
}

function textInput(id, label, { placeholder, required = true, maxLength } = {}) {
  const input = new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(TextInputStyle.Short).setRequired(required);
  if (placeholder) input.setPlaceholder(placeholder);
  if (maxLength) input.setMaxLength(maxLength);
  return new ActionRowBuilder().addComponents(input);
}

const GONE = { content: "That flight isn't on today's board anymore.", ephemeral: true };

// Handles every panel button, select and modal. Returns true if the
// interaction belonged to the panel.
async function handlePanelInteraction(interaction) {
  const id = interaction.customId || '';
  if (!id.startsWith('panel_')) return false;

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageEvents)) {
    await interaction.reply({ content: 'Only staff with the Manage Events permission can use this panel.', ephemeral: true });
    return true;
  }

  const [action, eventId] = id.split(':');

  if (interaction.isStringSelectMenu() && action === 'panel_select') {
    const record = findActiveFlight(interaction.guildId, interaction.values[0]);
    if (!record) return interaction.reply(GONE).then(() => true);
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`panel_delay:${record.id}`).setLabel('Delay').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`panel_cancel:${record.id}`).setLabel('Cancel flight').setStyle(ButtonStyle.Danger),
    );
    await interaction.reply({ embeds: [flightEmbed(record)], components: [buttons], ephemeral: true });
    return true;
  }

  if (interaction.isButton()) {
    if (action === 'panel_add') {
      const modal = new ModalBuilder()
        .setCustomId('panel_add_modal')
        .setTitle('Add flight')
        .addComponents(
          textInput('number', 'Flight number', { placeholder: 'AI 101', maxLength: 100 }),
          textInput('route', 'Route', { placeholder: 'DEL → JFK', maxLength: 100 }),
          textInput('time', 'Departure time (UTC, 24h HH:MM)', { placeholder: '14:30', maxLength: 5 }),
          textInput('aircraft', 'Aircraft', { placeholder: 'B777-300ER', maxLength: 1000 }),
          textInput('date', 'Date (YYYY-MM-DD, UTC) — blank for today', { placeholder: 'Leave blank for today', required: false, maxLength: 10 }),
        );
      await interaction.showModal(modal);
      return true;
    }

    if (action === 'panel_delay') {
      const record = findActiveFlight(interaction.guildId, eventId);
      if (!record) return interaction.reply(GONE).then(() => true);
      const modal = new ModalBuilder()
        .setCustomId(`panel_delay_modal:${record.id}`)
        .setTitle(`Delay ${record.flightNumber}`.slice(0, 45))
        .addComponents(textInput('minutes', 'Delay by how many minutes?', { placeholder: '30', maxLength: 4 }));
      await interaction.showModal(modal);
      return true;
    }

    if (action === 'panel_cancel') {
      const record = findActiveFlight(interaction.guildId, eventId);
      if (!record) return interaction.reply(GONE).then(() => true);
      const confirm = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`panel_cancel_confirm:${record.id}`).setLabel(`Yes, cancel ${record.flightNumber}`.slice(0, 80)).setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('panel_cancel_abort').setLabel('No, keep it').setStyle(ButtonStyle.Secondary),
      );
      await interaction.update({ content: `Are you sure you want to cancel **${record.flightNumber}**?`, components: [confirm] });
      return true;
    }

    if (action === 'panel_cancel_confirm') {
      const record = findActiveFlight(interaction.guildId, eventId);
      if (!record) {
        await interaction.update({ content: GONE.content, embeds: [], components: [] });
        return true;
      }
      await interaction.deferUpdate();
      const result = await cancelFlight(interaction.guild, record);
      await interaction.editReply({ content: result.message, embeds: [], components: [] });
      return true;
    }

    if (action === 'panel_cancel_abort') {
      await interaction.update({ content: 'Flight kept — nothing was changed.', components: [] });
      return true;
    }
  }

  if (interaction.isModalSubmit()) {
    if (action === 'panel_add_modal') {
      await interaction.deferReply({ ephemeral: true });
      const field = (name) => interaction.fields.getTextInputValue(name);
      const result = await addFlight(interaction.guild, {
        number: field('number'),
        route: field('route'),
        time: field('time'),
        aircraft: field('aircraft'),
        date: field('date'),
      });
      await interaction.editReply(result.message);
      return true;
    }

    if (action === 'panel_delay_modal') {
      const minutes = Number(interaction.fields.getTextInputValue('minutes').trim());
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
        await interaction.reply({ content: '⚠️ Enter a whole number of minutes between 1 and 1440.', ephemeral: true });
        return true;
      }
      const record = findActiveFlight(interaction.guildId, eventId);
      if (!record) return interaction.reply(GONE).then(() => true);
      await interaction.deferReply({ ephemeral: true });
      const result = await delayFlight(interaction.guild, record, minutes);
      await interaction.editReply(result.message);
      return true;
    }
  }

  return false;
}

module.exports = { panelEmbed, panelComponents, refreshPanel, handlePanelInteraction };
