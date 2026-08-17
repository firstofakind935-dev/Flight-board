# Flight Board

A Discord bot that turns a server's native **Scheduled Events** into a live flight board: a
single message listing every flight, with a dropdown at the bottom to pull up any one flight's
full details. One bot install can run in any number of servers — each server gets its own
independent board and flight list, set up separately with its own `/board setup`.

## How it works

People don't run bot commands to add flights — they use Discord's built-in **Events** creator
(the calendar icon in a channel / server). The bot watches for scheduled events and maps their
fields to flight info. The mapping depends on the event's location type:

**Someplace Else events** (Discord's label for what the API calls "External" — has a free-text
Location field):

| Discord event field | Used as       |
|----------------------|----------------|
| Name                 | Flight number  |
| Location             | Route, e.g. `JFK → LAX` (also accepts `JFK-LAX` / `JFK to LAX`) |
| Description           | Aircraft type  |
| Start time             | Flight time    |

**Stage Channel / Voice Channel events** (no Location field, so route and aircraft go in
Description as labeled lines):

| Discord event field | Used as       |
|----------------------|----------------|
| Name                 | Flight number  |
| Description, `Departing:` line | Route origin |
| Description, `Arriving:` line  | Route destination |
| Description, `Aircraft:` line  | Aircraft type |
| Start time             | Flight time    |

Example Description for a Stage event:
```
Departing: Seoul (ICN), South Korea
Arriving: Delhi (DEL), India
Aircraft: B787-9 Dreamliner
```

The board is **one message**, not one message per flight, titled with today's date (e.g.
"📅 16th August") and only listing flights scheduled for **today** (UTC). Flights get no marker
while scheduled or in progress; if a flight's start time gets pushed later than when it was first
posted, it's flagged delayed; once a flight's status is completed or cancelled, it drops off the
board entirely. Whenever an event is created, updated, or deleted/cancelled, the bot updates its
internal list and re-posts that single message so it stays at the bottom of the channel. It also
rolls the board over automatically at the next UTC day even if nothing else changes.

All icons live in one place (`EMOJI` in `src/lib/embeds.js`) and are wired to real custom server
emoji codes — Discord only renders a custom emoji from bot-sent content if you paste the real
`<:name:id>` code (typing a bare `:name:` won't render).

Picking a flight from the dropdown replies with that flight's full embed, visible only to you.
Departure times use Discord's `<t:unix:t>` timestamp tag, so each viewer sees the time rendered
in their own local timezone automatically — no timezone handling needed on the bot's side.

## Cancelling and delaying flights

Two admin-only commands edit the real Discord Scheduled Event directly (not just the board), so
the change also shows up if you open the event itself:

- `/cancel flight:<pick from list>` — sets the event's status to cancelled.
- `/delay flight:<pick from list> minutes:<number>` — pushes the event's start time back by that
  many minutes.

Both `flight` options autocomplete from that server's currently active flights as you type. Since
these edit the event through Discord's API, Discord broadcasts the change back to the bot the same
way it would for a manual edit — the existing update handling picks it up, refreshes the board, and
(for delays) shows the delayed marker automatically. Both commands require the **Manage Events**
server permission by default (see setup below).

## Setup

1. Create a Discord application + bot at https://discord.com/developers/applications.
2. Invite it to your server with the `bot` and `applications.commands` scopes, and permissions:
   View Channel, Send Messages, Embed Links, **Manage Events** (required for `/cancel` and
   `/delay` to edit scheduled events).
3. Copy `.env.example` to `.env` and fill in:
   - `DISCORD_TOKEN` — your bot token
   - `CLIENT_ID` — your application ID
   - `GUILD_ID` — (optional) leave this **unset** if you want the bot to work in any server it's
     invited to. Only set it during local development to register commands instantly in one test
     server — a value here restricts commands to that single server.
   - `BOARD_IMAGE_URL` — (optional) a direct image URL shown as a banner at the bottom of every
     server's board embed
4. Install dependencies:
   ```
   npm install
   ```
5. Register the slash commands:
   ```
   npm run deploy
   ```
   Without `GUILD_ID` set, this registers `/board`, `/cancel`, and `/delay` globally — it can take
   up to an hour to show up in a server the first time, but then works in every server the bot is
   invited to. Deploying to a host like Railway does **not** run this automatically — it's a
   separate one-off step you run yourself whenever the command list changes.
6. Start the bot:
   ```
   npm start
   ```
7. In each server, in the channel you want to use as that server's flight board, run
   `/board setup`. This binds that server's board to that channel and posts the initial (empty)
   dropdown. Every server does this independently.
8. Create a Server Event (Scheduled Event), either "Someplace Else" or Stage/Voice Channel type,
   using the matching field mapping above. The bot will post it automatically to that server's
   board.

## Notes

- Every server the bot is in has its own board and flight list — a flight created in one server
  never shows up on another server's board.
- Only non-cancelled, non-completed events scheduled for the current UTC day appear on a board
  (max 25, Discord's dropdown limit).
- On startup the bot syncs any existing scheduled events it may have missed while offline, per
  server.
- Global and guild-specific slash commands are two separate lists in Discord's API — if commands
  were ever registered with `GUILD_ID` set and you later deploy globally (or vice versa), the
  other list isn't cleared automatically. `src/clear-guild-commands.js` is a one-off script to wipe
  a specific guild's leftover commands if that happens.
