// One-off cleanup: wipes any commands registered directly to a specific
// guild, leaving only the global commands in place. Only needed if leftover
// guild-scoped commands (from earlier testing with GUILD_ID set) are still
// showing up alongside or instead of the global ones.
//
// Usage: GUILD_ID must be set to the server you want cleared, then:
//   railway run node src/clear-guild-commands.js
require('dotenv').config();
const { REST, Routes } = require('discord.js');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('DISCORD_TOKEN, CLIENT_ID, and GUILD_ID must all be set to clear that guild\'s commands.');
  process.exit(1);
}

const rest = new REST().setToken(DISCORD_TOKEN);

(async () => {
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: [] });
  console.log(`Cleared all guild-specific commands for guild ${GUILD_ID}. Global commands are unaffected.`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
