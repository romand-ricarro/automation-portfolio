import { server } from "./server.js"
import dotenv from 'dotenv';
import { Client, GatewayIntentBits, Events } from "discord.js"

const client = new Client({
    intents: [
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
});

dotenv.config();

client.once(Events.ClientReady, async (client) => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
});

const app = server(client)

client.login(process.env.DISCORD_BOT_TOKEN)

app.listen(3000, () => {
    console.log("Express server is listening on port 3000")
});