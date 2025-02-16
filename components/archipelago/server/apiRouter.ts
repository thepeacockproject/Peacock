import { getArchipelagoClient } from "../archipelago"
import express from "express"

import { json as jsonMiddleware } from "body-parser"
import { log, LogLevel } from "../../loggingInterop"
import archipelagoStore from "../store"

export default function apiRouter() {
    const app = express.Router()

    app.get("/status", (req, res) => {
        const client = getArchipelagoClient()
        const state = archipelagoStore.getState()
        res.json({
            address: state.address,
            name: client.name,
            game: client.game,
            authenticated: client.authenticated,
            arguments: client.arguments,
        })
    })

    app.post("/connect", jsonMiddleware(), async (req, res) => {
        try {
            const client = getArchipelagoClient()
            log(LogLevel.DEBUG, "Connecting to Archipelago")
            log(LogLevel.DEBUG, req.body)
            await client.login(req.body.url, req.body.name, "Hitman World of Assassination", {
                password: req.body.password ?? undefined
            })

            archipelagoStore.setState(state => {
                state.address = req.body.url
                state.name = req.body.name
                state.password = req.body.password ?? ""

                return state
            })

            res.json({
                name: client.name,
                game: client.game,
                authenticated: client.authenticated,
                arguments: client.arguments,
            })
        } catch (error) {
            log(
                LogLevel.ERROR,
                `Failed to connect to Archipelago:\n${JSON.stringify(error, undefined, 4)}`,
            )
            res.status(500).json({
                error: "Failed to connect to Archipelago",
            })
        }
    })

    app.get("/messages-stream", (req, res) => {
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        })

        const client = getArchipelagoClient()

        const messageListener = (message: string) => {
            res.write(`data: ${JSON.stringify({ message })}\n\n`)
        }

        client.messages.on("message", messageListener)

        const pingInterval = setInterval(() => {
            res.write(
                `data: ${JSON.stringify({ ping: true, timestamp: Date.now() })}\n\n`,
            )
        }, 1000)

        res.on("close", () => {
            client.messages.off("message", messageListener)
            clearInterval(pingInterval)
        })
    })

    return app
}