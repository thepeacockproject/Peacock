import { readFileSync } from "fs"
import path from "path"

import { LogLevel, log } from "../../loggingInterop"
import express from "express"
import serveStatic from "serve-static"
import createApiRouter from "./apiRouter"

let app: express.Express
const archipelagoDir = path.resolve(__dirname, "../webui")
const assetsDir = path.resolve(archipelagoDir, "assets")

export default function startServer() {
    app = express()

    const apiRouter = createApiRouter()
    app.use("/api", apiRouter)

    app.use((_req, res, next) => {
        // Remove the default Content-Type header that may be applied when Peacock runs in dev mode
        res.removeHeader("Content-Type")
        next()
    })

    app.use("/assets", serveStatic(assetsDir))

    // Intercept all routes that are not "/api" or "/assets" and serve the index.html file
    app.get("/*", (req, res) => {
        const data = readFileSync(
            path.resolve(archipelagoDir, "index.html"),
        ).toString()
        res.contentType("text/html")
        res.send(data)
    })

    // DEBUG: list files in current dir
    log(LogLevel.DEBUG, "Serving files from " + assetsDir)

    return app
}
