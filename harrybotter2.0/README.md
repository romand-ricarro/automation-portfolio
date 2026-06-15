# Harry Botter - Discord Support Ticket Bot 🧙‍♂️

Harry Botter is a magical Discord bot for creating and managing support tickets with a Harry Potter theme. The bot allows users to create tickets through an intuitive step-by-step interface with dropdowns and forms, then tracks ticket status changes and sends notifications to users.

## ✨ Features

- **Magical Harry Potter Theme** - Fully themed UI and messages
- **Multi-step Ticket Creation** - Guided workflow for creating support tickets
- **Google Sheets Integration** - Stores all ticket data in Google Sheets
- **Status Change Notifications** - Sends DMs when ticket status changes
- **User-friendly UI** - Buttons, dropdowns, and modals for easy interaction
- **Real Name Mapping** - Maps Discord IDs to real names for personalized messages
- **Cooldown System** - Prevents spam with configurable cooldowns
- **UK Timezone Support** - Records all timestamps in UK time (GMT/BST)

## 🛠️ Installation

1. Clone the repository:
   ```
   git clone https://github.com/FoodStyles-Tech-Tools/harrybotter2.0.git
   cd harrybotter2.0
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Create a `.env` file with the following variables:
   ```
   DISCORD_TOKEN=your_discord_bot_token
   CHANNEL_ID=your_harry_botter_channel_id
   TICKET_CHANNEL_ID=your_ticket_channel_id
   GUILD_ID=your_server_id
   SPREADSHEET_ID=your_google_spreadsheet_id
   WORKSHEET_NAME=HarryBotter
   WORKSHEET_GID=your_worksheet_gid
   SERVICE_ACCOUNT_FILE=credentials/credentials.json
   ```

4. Create the necessary configuration files:
   - `messages.json` - Customizable messages
   - `members.json` - Staff member information
   - `mappings.json` - Discord ID to real name mappings

5. Set up Google Sheets credentials:
   - Create a `credentials` folder
   - Place your Google service account JSON file in this folder as `credentials.json`

## 📝 Configuration Files

### messages.json

Contains all user-facing messages that can be customized:

```json
{
  "active_session": "By Merlin's beard! You've already got an enchantment in progress. Please complete your current magical request before starting another.",
  "stop_message": "Your spell has been cancelled. Feel free to visit the Chamber of Tech Support when you're ready to try again!",
  "cooldown_message": "Your magical energy is still recharging! Please wait {minutes} minutes and {seconds} seconds before casting another support spell.",
  "session_timeout": "Oh no! Your magical connection has timed out. The spirits of Hogwarts request you try the spell again.",
  "task_creation_success": "✨ Brilliant! ✨ Your magical scroll has been successfully delivered to the Ministry of Tech Support! You can track its progress here: {task_url}",
  "thank_you": "Thank you for consulting the Wizard of Tech Support! Our team of magical experts will review your scroll soon. Keep an eye on your owl post (DMs) for status updates!",
  "sheet_error": "Alas! The magical ledger seems to be experiencing some enchantment interference. Please try again later or send an owl to an administrator."
}
```

### members.json

Contains information about staff members who can be assigned to tickets:

```json
{
  "members": [
    {
      "name": "Albus Dumbledore",
      "emoji": "🧙‍♂️",
      "user_id": "123456789012345678",
      "description": "Headmaster of Debugging"
    },
    {
      "name": "Minerva McGonagall",
      "emoji": "👩‍🏫",
      "user_id": "234567890123456789",
      "description": "Professor of Code Transfiguration"
    }
  ]
}
```

### mappings.json

Maps Discord user IDs to real names for more personalized interactions:

```json
{
  "123456789012345678": "Harry Potter",
  "234567890123456789": "Ron Weasley",
  "345678901234567890": "Hermione Granger"
}
```

## 🪄 Cooldown System

The bot includes a built-in cooldown system to prevent spam and ensure fair use:

1. **How it works**: 
   - After creating a ticket, users are placed on cooldown for 60 seconds
   - During this time, they cannot create new tickets
   - Users receive a friendly message showing remaining cooldown time

2. **Implementation**:
   - Cooldowns are stored in memory (reset on bot restart)
   - Remaining time is calculated and formatted in minutes and seconds
   - Messages use the `cooldown_message` template from messages.json

3. **Customizing cooldowns**:
   - To change the cooldown duration, modify the line in `submit_to_google_sheets()`:
     ```python
     user_cooldowns[user_id] = time.time() + 60  # Change 60 to desired seconds
     ```

## 📊 Google Sheets Setup

The bot stores all ticket information in a Google Sheet with the following columns:

- **A**: Ticket Number (auto-generated)
- **B**: Timestamp (UK time)
- **C**: Task Name
- **D**: Description
- **E**: Requested By (mapped name)
- **F**: Link
- **G**: Priority
- **H**: Ticket Type
- **I**: Status
- **J**: Required Date
- **K**: Assignee
- **L-Q**: (not used)
- **R**: Assigned Timestamp
- **S-AF**: (not used)
- **AG**: Discord ID

Make sure your Google service account has write permissions to the spreadsheet.

## 💬 Discord Setup

1. Create a new Discord application at the [Discord Developer Portal](https://discord.com/developers/applications)
2. Add a bot to your application
3. Enable the following intents:
   - Message Content
   - Server Members
   - Presence
4. Generate an invite link with the following permissions:
   - Send Messages
   - Embed Links
   - Attach Files
   - Read Message History
   - Add Reactions
   - Use External Emojis
   - Use Slash Commands
5. Create the following channels in your server:
   - `#harry-botter` - Main channel for the ticket creation button
   - `#ticket` - Channel for ticket notifications

## 🚀 Running the Bot

Start the bot with:
```
bot.py
```

The bot will:
1. Test the connection to Google Sheets
2. Create a message with the "Cast Ticket Spell" button in your designated channel
3. Start monitoring for status changes in your Google Sheet

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🧙‍♂️ Acknowledgements

- [Discord.py](https://discordpy.readthedocs.io/) - Python library for Discord API
- [gspread](https://docs.gspread.org/) - Python library for Google Sheets API
- The Harry Potter series by J.K. Rowling for inspiring the magical theme