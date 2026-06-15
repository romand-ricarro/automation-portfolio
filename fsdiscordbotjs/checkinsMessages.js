const { Events } = require("discord.js");
const googleSheet = require("./googleSheetApi");
const moment = require("moment-timezone");

const checkinsMessages = async (client, channelId, questions, googleSheetId, sheetRange, responseChannelId) => {
    moment().tz("Europe/London");

    const channel = await client.channels.fetch(channelId);
    await channel.send(`Happy Monday @everyone! This is the link for the Check-ins for week ${moment().isoWeek()} (${moment().year()})`);

    const checkinsEmbed = {
        title: "Check-in Here!",
        description: "Please react below to check-in.",
        color: 0x00FF00
    }

    const checkinsMessage = await channel.send({ embeds: [checkinsEmbed] });
    await checkinsMessage.react('✅');

    const answers = []

    client.on(Events.MessageReactionAdd, async (reaction, user) => {
        if (user.bot) return

        if (reaction.message.id === checkinsMessage.id && reaction.emoji.name === '✅') {
            const dmChannel = await user.createDM();
            await dmChannel.send(`Welcome to the weekly check-ins. This is your check-in for **week ${moment().isoWeek()} (${moment().year()})**.`);

            const msg_filter = (m) => m.author.id === user.id;

            for (let i = 0, cancel = false; i < questions.length && cancel === false; i++) {
                await dmChannel.send(questions[i]);
                await dmChannel.awaitMessages({ filter: msg_filter, max: 1, time: 30 * 60 * 1000, errors: ["time"] })
                    .then(async collected => {
                        answers.push(collected.first().content)
                    })
            }

            answers.push(moment().isoWeek());
            answers.push(moment().year());

            // Store the answers in Google Sheet
            googleSheet(googleSheetId, sheetRange, answers);

            // Send the answers to the channel
            var userResponse = `<@${user.id}>\n`

            questions.forEach((q, index) => {
                userResponse += q + `: **${answers[index]}**\n`
            });

            userResponse += "\n**Please show emojis of support! 🎉 🥳**"

            const responseChannel = await client.channels.fetch(responseChannelId);
            await responseChannel.send(userResponse);

            const lastMessages = await dmChannel.messages.fetch({ limit: questions.length * 2 + 1});
            lastMessages.forEach(async (msg) => {
                if (msg.author.bot) {
                    await dmChannel.messages.fetch(msg.id).then(m => m.delete());
                }
            })

            await dmChannel.send("Your responses have been recorded, please check the **weekly-checkins** channel. Thank you!");

            console.info(`User ${user.id} has checked-ins on week ${moment().isoWeek()} (${moment().year()})`);
        }

    })
};


module.exports = checkinsMessages;