require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('DISCORD_TOKEN and CLIENT_ID must be set in .env');
  process.exit(1);
}

const commandsPath = path.join(__dirname, 'commands');
const commands = fs
  .readdirSync(commandsPath)
  .filter((f) => f.endsWith('.js'))
  .map((f) => require(path.join(commandsPath, f)).data.toJSON());

const rest = new REST().setToken(DISCORD_TOKEN);

(async () => {
  const route = GUILD_ID
    ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
    : Routes.applicationCommands(CLIENT_ID);

  const data = await rest.put(route, { body: commands });
  console.log(`Registered ${data.length} command(s)${GUILD_ID ? ` to guild ${GUILD_ID}` : ' globally'}.`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
