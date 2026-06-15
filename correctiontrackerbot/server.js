import express from "express"

export const server = client => {
    const app = express()

    app.use(express.json())

    app.get("/", (req, res) => {
        res.send("Ready to rock!")
    })

    app.post("/send-challenged-tasks", async (req, res) => {
        if (req.headers["api-key"] === process.env.SECRET_API_KEY) {
            const data = req.body

            let dmChannel = await client.users.createDM(data.discordId)

            var message = []
            message.push(`Hello ${data.qa}! Your prompt attention is required! Someone has challenged their mistakes. Please review and resolve as soon as you can. Thank you!\n`)

            let taskNumber = 0

            for (let i = 0; i < data.challenged.length; i++) {
                const task = data.challenged[i]

                if (taskNumber === 0) {
                    message.push(`> - [${task[task.length - 2]}](${task[task.length - 1]})\n`)
                    taskNumber += 1
                } else if (taskNumber > 0 && taskNumber <= 5) {
                    message[message.length - 1] += `> - [${task[task.length - 2]}](${task[task.length - 1]})\n`
                    taskNumber += 1
                } else {
                    taskNumber = 0
                }
            }

            for (let i = 0; i < message.length; i++) {
                await dmChannel.send(message[i])
                await sleep(1000)
            }

            res.status(200).send(`Message sent to ${data.qa}`)
        } else {
            res.status(400).send("Unauthorized")
        }
    })

    app.post("/send-challenged-task", async (req, res) => {
        if (req.headers["api-key"] === process.env.SECRET_API_KEY) {
            const data = req.body

            let dmChannel = await client.users.createDM(data.discordId)

            
            var message = `Hello ${data.qa}! Your prompt attention is required! Someone has challenged their mistakes. Please review and resolve as soon as you can. Thank you!\n`
            message += `[${data.member} (${data.challenged[8]})](${data.url})`

            await dmChannel.send(message)

            res.status(200).send(`Message sent to ${data.qa}`)
        } else {
            res.status(400).send("Unauthorized")
        }
    })

    return app
}

let sleep = async (ms) => await new Promise(r => setTimeout(r, ms));