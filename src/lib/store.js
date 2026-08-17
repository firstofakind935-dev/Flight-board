const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const BOARDS_FILE = path.join(DATA_DIR, 'boards.json');

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  const raw = fs.readFileSync(file, 'utf8').trim();
  if (!raw) return fallback;
  return JSON.parse(raw);
}

function writeJson(file, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getEvents() {
  return readJson(EVENTS_FILE, []);
}

function getEventsByGuild(guildId) {
  return getEvents().filter((e) => e.guildId === guildId);
}

function getEventById(id) {
  return getEvents().find((e) => e.id === id) || null;
}

function upsertEvent(record) {
  const events = getEvents();
  const index = events.findIndex((e) => e.id === record.id);
  if (index >= 0) {
    events[index] = { ...events[index], ...record };
  } else {
    events.push(record);
  }
  writeJson(EVENTS_FILE, events);
  return getEventById(record.id);
}

function removeEvent(id) {
  const events = getEvents();
  const next = events.filter((e) => e.id !== id);
  const removed = next.length !== events.length;
  writeJson(EVENTS_FILE, next);
  return removed;
}

// Each guild gets its own independent board (channel + message), so the bot
// can run in any number of servers at once without them interfering.
function getBoard(guildId) {
  const boards = readJson(BOARDS_FILE, {});
  return boards[guildId] || null;
}

function setBoard(guildId, channelId, messageId) {
  const boards = readJson(BOARDS_FILE, {});
  boards[guildId] = { channelId, messageId };
  writeJson(BOARDS_FILE, boards);
}

function getBoardGuildIds() {
  return Object.keys(readJson(BOARDS_FILE, {}));
}

module.exports = {
  getEvents,
  getEventsByGuild,
  getEventById,
  upsertEvent,
  removeEvent,
  getBoard,
  setBoard,
  getBoardGuildIds,
};
