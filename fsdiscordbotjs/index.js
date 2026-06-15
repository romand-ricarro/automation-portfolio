const { Client, GatewayIntentBits, Events } = require("discord.js");

const cron = require("node-cron");

const checkinsMessages = require("./checkinsMessages");
const questions = require("./questions");

require('dotenv').config();

// Instantiate the Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
    ],
});

client.once(Events.ClientReady, async (discordClient) => {
    console.log(`Ready! Logged in as ${discordClient.user.tag}`);

    const curationBot = async () => await checkinsMessages(discordClient,
        process.env.CURATION_CHANNEL_ID,
        questions(1),
        process.env.SPREADSHEET_ID, process.env.SHEET_RANGE, process.env.RESPONSE_CHANNEL_ID);
    
    // TODO change the cron schedule here
    cron.schedule('1 0 * * 1', curationBot, {
        timezone: 'Europe/London',
    });

});

client.login(process.env.DISCORD_BOT_TOKEN);