/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2025 The Peacock Project Team
 *
 *     This program is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU Affero General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU Affero General Public License for more details.
 *
 *     You should have received a copy of the GNU Affero General Public License
 *     along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import express, { NextFunction, Request, Response, Router } from "express"
import http from "http"
import {
    checkForUpdates,
    extractServerVersion,
    extractToken,
    handleAxiosError,
    IS_LAUNCHER,
    jokes,
    PEACOCKVERSTRING,
    ServerVer,
} from "./utils"
import { getConfig } from "./configSwizzleManager"
import {
    error400,
    error406,
    handleOAuthToken,
    OAuthTokenBody,
} from "./oauthToken"
import type {
    RequestWithJwt,
    S2CEventWithTimestamp,
    ServerConnectionConfig,
} from "./types/types"
import { readFileSync } from "fs"
import {
    errorLoggingMiddleware,
    log,
    loggingMiddleware,
    LogLevel,
    requestLoggingMiddleware,
} from "./loggingInterop"
import { eventRouter } from "./eventHandler"
import { contractRoutingRouter } from "./contracts/contractRouting"
import { profileRouter } from "./profileHandler"
import { menuDataRouter } from "./menuData"
import { menuSystemPreRouter, menuSystemRouter } from "./menus/menuSystem"
import { controller } from "./controller"
import {
    STEAM_NAMESPACE_2016,
    STEAM_NAMESPACE_2018,
    STEAM_NAMESPACE_2021,
    STEAM_NAMESPACE_SCPC,
} from "./platformEntitlements"
import { legacyProfileRouter } from "./2016/legacyProfileRouter"
import { legacyMenuDataRouter } from "./2016/legacyMenuData"
import { legacyContractRouter } from "./2016/legacyContractHandler"
import { initRp } from "./discord/discordRp"
import random from "random"
import bodyParser from "body-parser"
import { loadoutRouter, loadouts } from "./loadouts"
import { setupHotListener } from "./hotReloadService"
import type { AxiosError } from "axios"
import serveStatic from "serve-static"
import { webFeaturesRouter } from "./webFeatures"
import picocolors from "picocolors"
import { multiplayerRouter } from "./multiplayer/multiplayerService"
import { multiplayerMenuDataRouter } from "./multiplayer/multiplayerMenuData"
import { liveSplitManager } from "./livesplit/liveSplitManager"
import { cheapLoadUserData, setupFileStructure } from "./databaseHandler"
import { getFlag, saveFlags } from "./flags"
import { initializePeacockMenu } from "./menus/settings"
import { ConfigRouteParams } from "./types/gameSchemas"
import { setTimeout } from "timers"

const host = process.env.HOST || "0.0.0.0"
const port = process.env.PORT || 80

function uncaught(error: Error): void {
    if (
        (error.message || "").includes("EADDRINUSE") ||
        (error.message || "").includes("EACCES") ||
        (error.stack || "").includes("EADDRINUSE")
    ) {
        log(LogLevel.ERROR, `Failed to use the server on ${host}:${port}!`)
        log(
            LogLevel.ERROR,
            "This is likely due to one of the following reasons:",
        )
        log(LogLevel.ERROR, `  - Peacock is already running on this port`)
        log(
            LogLevel.ERROR,
            `  - Another app is already using this port (like IIS server)`,
        )
        log(
            LogLevel.ERROR,
            `  - Your user account doesn't have permission (firewall can block it)`,
        )
        log(
            LogLevel.INFO,
            `Check this wiki page: https://thepeacockproject.org/wiki/troubleshooting/fix-port-in-use for steps on how to fix this!`,
        )
        process.exit(1)
    }

    if ((error as AxiosError).isAxiosError) {
        handleAxiosError(error as AxiosError)
    }

    log(LogLevel.ERROR, error.message)
    if (error.stack) log(LogLevel.ERROR, error.stack)
}

process.on("uncaughtException", uncaught)

const app = express()

const baseDir = __dirname

app.use(function badPathRewritingMiddleware(req, _, next) {
    req.url = req.url.replaceAll("//", "/")
    next()
})
app.use(loggingMiddleware)

if (getFlag("developmentLogRequests")) {
    app.use(requestLoggingMiddleware)
}

app.use("/_wf", webFeaturesRouter)

app.get("/", (_: Request, res) => {
    if (PEACOCK_DEV) {
        res.contentType("text/html")
        res.send(
            '<html lang="en">PEACOCK_DEV active, please run "yarn webui start" to start the web UI on port 3000 and access it there.</html>',
        )
        return
    }

    const data = readFileSync(`${baseDir}/webui/dist/index.html`).toString()

    res.contentType("text/html")
    res.send(data)
})

app.use(
    "/assets",
    serveStatic(`${baseDir}/webui/dist/assets`, {
        setHeaders: (res: Response, path) => {
            if (path.includes(".js")) res.contentType("application/javascript")

            if (path.includes(".css")) res.contentType("text/css")
        },
    }),
)

// make sure all responses have a default content-type set
app.use(function ensurePlainContentType(_req, res, next) {
    res.contentType("text/plain")

    next()
})

app.use(function throttleResponses(_req, res, next): void {
    const sendJson = res.json
    const delay = getFlag("throttleMs") as number

    if (delay > 0) {
        // @ts-expect-error yes yes I know what I'm doing
        res.json = (...args) => {
            setTimeout(() => {
                sendJson(...args)
            }, delay)
        }
    }

    next()
})

if (getFlag("loadoutSaving") === "PROFILES") {
    app.use("/loadouts", loadoutRouter)
}

app.get(
    "/config/:audience/:serverVersion",
    // @ts-expect-error Has jwt props.
    (
        req: RequestWithJwt<{ issuer: string }, never, ConfigRouteParams>,
        res,
    ) => {
        const serverVersion = extractServerVersion(req.params.serverVersion)

        if (!serverVersion) {
            res.status(400).send("Bad/no server version.")
            return
        }

        const proto = req.protocol
        const config = getConfig(
            "ServerVersionConfig",
            true,
        ) as ServerConnectionConfig
        const serverhost = req.get("Host")

        config.Versions[0].GAME_VER = "6.74.0"

        if (serverVersion?._Major === 8) {
            config.Versions[0].GAME_VER = `${ServerVer._Major}.${ServerVer._Minor}.${ServerVer._Build}`
            config.Versions[0].SERVER_VER.GlobalAuthentication.RequestedAudience =
                "pc-prod_8"
        } else if (serverVersion?._Major === 7) {
            config.Versions[0].GAME_VER = "7.17.0"
            config.Versions[0].SERVER_VER.GlobalAuthentication.RequestedAudience =
                "pc-prod_7"
        }

        if (serverVersion?._Major === 6) {
            config.Versions[0].SERVER_VER.GlobalAuthentication.RequestedAudience =
                "pc-prod_6"
        }

        if (req.query.issuer === STEAM_NAMESPACE_2021) {
            config.Versions[0].SERVER_VER.GlobalAuthentication.RequestedAudience =
                "steam-prod_8"
        }

        if (req.params.audience === "scpc-prod") {
            // sniper challenge is a different game/audience
            config.Versions[0].Name = "scpc-prod"
            config.Versions[0].GAME_VER = "7.3.0"
            config.Versions[0].SERVER_VER.GlobalAuthentication.RequestedAudience =
                "scpc-prod"
        }

        config.Versions[0].ISSUER_ID = req.query.issuer || "*"

        config.Versions[0].SERVER_VER.Metrics.MetricsServerHost = `${proto}://${serverhost}`

        config.Versions[0].SERVER_VER.Authentication.AuthenticationHost = `${proto}://${serverhost}`

        config.Versions[0].SERVER_VER.Configuration.Url = `${proto}://${serverhost}/files/onlineconfig.json`

        config.Versions[0].SERVER_VER.Configuration.AgreementUrl = `${proto}://${serverhost}/files/privacypolicy/hm3/privacypolicy.json`

        config.Versions[0].SERVER_VER.Resources.ResourcesServicePath = `${proto}://${serverhost}/files`

        config.Versions[0].SERVER_VER.GlobalAuthentication.AuthenticationHost = `${proto}://${serverhost}`

        res.json(config)
    },
)

app.get("/files/privacypolicy/hm3/privacypolicy_:version.json", (_, res) => {
    res.set("Content-Type", "application/octet-stream")
    // it silently fails on some game versions without this, no clue why
    res.set("x-ms-meta-version", "20181001")
    res.send(getConfig("PrivacyPolicy", false))
})

app.post(
    "/api/metrics/add",
    bodyParser.json({ limit: "10Mb" }),
    // @ts-expect-error jwt props.
    (req: RequestWithJwt<never, S2CEventWithTimestamp[]>, res) => {
        for (const event of req.body) {
            controller.hooks.newMetricsEvent.call(event, req)
        }

        res.send()
    },
)

/**
 * The game is a LIAR and does NOT give us `application/json` like it claims.
 */
function fixContentType(req: Request, _: Response, next: NextFunction): void {
    req.headers["content-type"] = "application/x-www-form-urlencoded"
    next()
}

app.post(
    "/oauth/token",
    fixContentType,
    express.urlencoded({ extended: false }),
    // @ts-expect-error jwt props.
    (req: RequestWithJwt<never, OAuthTokenBody>, res) => {
        handleOAuthToken(req)
            .then((token) => {
                if (token === error400) {
                    return res.status(400).send()
                } else if (token === error406) {
                    return res.status(406).send()
                } else {
                    return res.json(token)
                }
            })
            .catch((err) => {
                log(LogLevel.ERROR, err.message)
                res.status(500).send()
            })
    },
)

app.get("/files/onlineconfig.json", (_, res) => {
    res.set("Content-Type", "application/octet-stream")
    res.send(getConfig("OnlineConfig", false))
})

// NOTE! All routes attached after this point will be checked for a JWT or blob signature.
// If you are adding a route that does NOT require authentication, put it ABOVE this message!

app.use(
    Router()
        .use(
            "/resources-:serverVersion/",
            // @ts-expect-error Has jwt props.
            (req: RequestWithJwt, _, next) => {
                req.serverVersion = req.params.serverVersion
                req.gameVersion = "h1"

                if (req.serverVersion.startsWith("8")) {
                    req.gameVersion = "h3"
                } else if (req.serverVersion.startsWith("7")) {
                    req.gameVersion = "h2"
                }

                if (req.serverVersion === "7.3.0") {
                    req.gameVersion = "scpc"
                }

                next("router")
            },
        )
        // we're fine with skipping to the next router if we don't have auth
        // @ts-expect-error Has jwt props.
        .use(extractToken, (req: RequestWithJwt, res, next) => {
            switch (req.jwt?.pis) {
                case "egp_io_interactive_hitman_the_complete_first_season":
                case STEAM_NAMESPACE_2016:
                case STEAM_NAMESPACE_SCPC:
                    req.serverVersion = "6-74"
                    break
                case STEAM_NAMESPACE_2018:
                    req.serverVersion = "7-17"
                    break
                case "fghi4567xQOCheZIin0pazB47qGUvZw4":
                case STEAM_NAMESPACE_2021:
                    req.serverVersion = "8-20"
                    break
                default:
                    res.status(400).json({ message: "no game data" })
                    return
            }

            req.gameVersion = "h1"

            if (req.serverVersion.startsWith("8")) {
                req.gameVersion = "h3"
            } else if (req.serverVersion.startsWith("7")) {
                req.gameVersion = "h2"
            }

            if (req.jwt?.aud === "scpc-prod") {
                req.gameVersion = "scpc"
            }

            next()
        }),
)

if (PEACOCK_DEV) {
    // @ts-expect-error Has jwt props.
    app.use(async (req: RequestWithJwt, _res, next): Promise<void> => {
        if (!req.jwt) {
            next()

            return
        }

        // Make sure the userdata is always loaded if a proper JWT token is available
        await cheapLoadUserData(req.jwt.unique_name, req.gameVersion)

        next()
    })
}

function generateBlobConfig(req: RequestWithJwt) {
    return {
        bloburl: `${req.protocol}://${req.get("Host")}/resources-${
            req.serverVersion
        }/`,
        blobsig: `?sv=2018-03-28&ver=${req.gameVersion}`,
        blobsigduration: 7200000.0,
    }
}

app.get(
    "/authentication/api/configuration/Init",
    // @ts-expect-error jwt props.
    extractToken,
    (req: RequestWithJwt, res) => {
        // configName=pc-prod&lockedContentDisabled=false&isFreePrologueUser=false&isIntroPackUser=false&isFullExperienceUser=false
        res.json({
            token: `${req.jwt.exp}-${req.jwt.nbf}-${req.jwt.platform}-${req.jwt.userid}`,
            blobconfig: generateBlobConfig(req),
            profileid: req.jwt.unique_name,
            serverversion: `${ServerVer._Major}.${ServerVer._Minor}.${ServerVer._Build}.${ServerVer._Revision}`,
            servertimeutc: new Date().toISOString(),
            ias: 2,
        })

        controller.hooks.onUserLogin.call(req.gameVersion, req.jwt.unique_name)
    },
)

app.post(
    "/authentication/api/userchannel/AuthenticationService/RenewBlobSignature",
    // @ts-expect-error jwt props.
    (req: RequestWithJwt, res) => {
        res.json(generateBlobConfig(req))
    },
)

const legacyRouter = Router()
const primaryRouter = Router()

legacyRouter.use("/authentication/api/userchannel/", legacyProfileRouter)
legacyRouter.use("/profiles/page/", legacyMenuDataRouter)
legacyRouter.use(
    "/authentication/api/userchannel/ContractsService/",
    legacyContractRouter,
)
legacyRouter.use(
    "/authentication/api/userchannel/ContractSessionsService/",
    legacyContractRouter,
)

primaryRouter.use(
    "/authentication/api/userchannel/MultiplayerService/",
    multiplayerRouter,
)
primaryRouter.use("/authentication/api/userchannel/EventsService/", eventRouter)
primaryRouter.use(
    "/authentication/api/userchannel/ContractsService/",
    contractRoutingRouter,
)
primaryRouter.get(
    "/authentication/api/userchannel/ReportingService/ReportContract",
    (_, res) => {
        // TODO
        res.json({})
    },
)
primaryRouter.use("/authentication/api/userchannel/", profileRouter)
primaryRouter.use("/profiles/page", multiplayerMenuDataRouter)
primaryRouter.use("/profiles/page/", menuDataRouter)
primaryRouter.use("/resources-:serverVersion/", menuSystemPreRouter)
primaryRouter.use("/resources-:serverVersion/", menuSystemRouter)

app.use(
    Router()
        // @ts-expect-error Has jwt props.
        .use((req: RequestWithJwt, _, next) => {
            if (req.shouldCease) {
                return next("router")
            }

            if (req.serverVersion === "6-74" || req.serverVersion === "7-3") {
                return next() // continue along h1router
            }

            next("router")
        })
        .use(legacyRouter),
    Router()
        // @ts-expect-error Has jwt props.
        .use((req: RequestWithJwt, _, next) => {
            if (req.shouldCease) {
                return next("router")
            }

            if (
                ["6-74", "7-3", "7-17", "8-20"].includes(
                    <string>req.serverVersion,
                )
            ) {
                return next() // continue along h3 router
            }

            next("router")
        })
        .use(primaryRouter),
)

app.all("*splat", (req, res) => {
    log(LogLevel.WARN, `Unhandled URL: ${req.url}`)
    res.status(404).send("Not found!")
})

app.use(errorLoggingMiddleware)

export async function startServer(options: {
    hmr: boolean
    pluginDevHost: boolean
}): Promise<void> {
    void checkForUpdates()

    if (!IS_LAUNCHER) {
        console.log(
            picocolors.greenBright(`
 ███████████  ██████████   █████████     █████████     ███████      █████████  █████   ████
░░███░░░░░███░░███░░░░░█  ███░░░░░███   ███░░░░░███  ███░░░░░███   ███░░░░░███░░███   ███░
 ░███    ░███ ░███  █ ░  ░███    ░███  ███     ░░░  ███     ░░███ ███     ░░░  ░███  ███
 ░██████████  ░██████    ░███████████ ░███         ░███      ░███░███          ░███████
 ░███░░░░░░   ░███░░█    ░███░░░░░███ ░███         ░███      ░███░███          ░███░░███
 ░███         ░███ ░   █ ░███    ░███ ░░███     ███░░███     ███ ░░███     ███ ░███ ░░███
 █████        ██████████ █████   █████ ░░█████████  ░░░███████░   ░░█████████  █████ ░░████
░░░░░        ░░░░░░░░░░ ░░░░░   ░░░░░   ░░░░░░░░░     ░░░░░░░      ░░░░░░░░░  ░░░░░   ░░░░
`),
        )
    }

    log(
        LogLevel.INFO,
        `This is Peacock v${PEACOCKVERSTRING} with Node v${process.versions.node}.`,
    )

    if (getFlag("jokes") === true) {
        log(
            LogLevel.INFO,
            picocolors.yellowBright(
                `${jokes[random.int(0, jokes.length - 1)]}`,
            ),
        )
    }

    try {
        // make sure required folder structure is in place
        await setupFileStructure()

        if (options.hmr) {
            void setupHotListener("contracts", () => {
                log(
                    LogLevel.INFO,
                    "Detected a change in contracts! Re-indexing...",
                )
                // eslint-disable-next-line promise/catch-or-return
                controller.index().then(() => {
                    return log(
                        LogLevel.INFO,
                        "Completed re-indexing.",
                        "contracts",
                    )
                })
            })
        }

        // once contracts directory is present, we are clear to boot
        await loadouts.init()
        await controller.boot(options.pluginDevHost)

        // all plugins had a chance to provide their flags now
        saveFlags()

        const httpServer = http.createServer(app)

        log(LogLevel.INFO, `Listening on ${host}:${port}...`)
        // @ts-expect-error Non-matching method sig
        httpServer.listen(port, host)
        log(LogLevel.INFO, "Server started.")

        if (getFlag("discordRp") === true) {
            initRp()
        }

        // initialize livesplit
        await liveSplitManager.init()

        initializePeacockMenu()

        return
    } catch (e) {
        log(LogLevel.ERROR, "Critical error during bootstrap!")
        log(LogLevel.ERROR, (e as Error)?.stack ?? e)
    }
}
