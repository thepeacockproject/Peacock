/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2023 The Peacock Project Team
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

// noinspection RequiredAttributes

// load as soon as possible to prevent dependency issues
import "./generatedPeacockRequireTable"

// load flags as soon as possible
import { getFlag, loadFlags } from "./flags"

loadFlags()

import { setFlagsFromString } from "v8"
import { program } from "commander"
import express, { Request, Router } from "express"
import http from "http"
import {
    checkForUpdates,
    extractToken,
    handleAxiosError,
    IS_LAUNCHER,
    jokes,
    PEACOCKVER,
    PEACOCKVERSTRING,
    ServerVer,
} from "./utils"
import { getConfig, getSwizzleable, swizzle } from "./configSwizzleManager"
import { handleOauthToken } from "./oauthToken"
import type {
    RequestWithJwt,
    S2CEventWithTimestamp,
    ServerConnectionConfig,
} from "./types/types"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"
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
import { menuDataRouter, preMenuDataRouter } from "./menuData"
import { menuSystemPreRouter, menuSystemRouter } from "./menus/menuSystem"
import { legacyEventRouter } from "./2016/legacyEventRouter"
import { legacyMenuSystemRouter } from "./2016/legacyMenuSystem"
import { _theLastYardbirdScpc, controller } from "./controller"
import {
    STEAM_NAMESPACE_2016,
    STEAM_NAMESPACE_2018,
    STEAM_NAMESPACE_2021,
    STEAM_NAMESPACE_SCPC,
} from "./platformEntitlements"
import { legacyProfileRouter } from "./2016/legacyProfileRouter"
import { legacyMenuDataRouter } from "./2016/legacyMenuData"
import { legacyContractRouter } from "./2016/legacyContractHandler"
import { initRp } from "./discordRp"
import random from "random"
import { generateUserCentric } from "./contracts/dataGen"
import { json as jsonMiddleware, urlencoded } from "body-parser"
import { loadoutRouter, loadouts } from "./loadouts"
import { setupHotListener } from "./hotReloadService"
import type { AxiosError } from "axios"
import serveStatic from "serve-static"
import { webFeaturesRouter } from "./webFeatures"
import { toolsMenu } from "./tools"
import picocolors from "picocolors"
import { multiplayerRouter } from "./multiplayer/multiplayerService"
import { multiplayerMenuDataRouter } from "./multiplayer/multiplayerMenuData"
import { pack, unpack } from "msgpackr"
import { liveSplitManager } from "./livesplit/liveSplitManager"
import { cheapLoadUserData } from "./databaseHandler"
import { reportRouter } from "./contracts/reportRouting"

// welcome to the bleeding edge
setFlagsFromString("--harmony")

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
        process.exit(1)
    }

    if ((error as AxiosError).isAxiosError) {
        handleAxiosError(error as AxiosError)
    }

    log(LogLevel.ERROR, error.message)
    error.stack && log(LogLevel.ERROR, error.stack)
}

process.on("uncaughtException", uncaught)

const app = express()

app.use(loggingMiddleware)

if (getFlag("developmentLogRequests")) {
    app.use(requestLoggingMiddleware)
}

app.use("/_wf", webFeaturesRouter)

app.get("/", (req: Request, res) => {
    if (PEACOCK_DEV) {
        res.contentType("text/html")
        res.send(
            '<html lang="en">PEACOCK_DEV active, please run "yarn webui start" to start the web UI on port 3000 and access it there.</html>',
        )
    } else {
        const data = readFileSync("webui/dist/index.html").toString()

        res.contentType("text/html")
        res.send(data)
    }
})

serveStatic.mime.define({ "application/javascript": ["js"] })
app.use("/assets", serveStatic("webui/dist/assets"))

// make sure all responses have a default content-type set
app.use(function (_req, res, next) {
    res.contentType("text/plain")

    next()
})

if (getFlag("loadoutSaving") === "PROFILES") {
    app.use("/loadouts", loadoutRouter)
}

app.get(
    "/config/:audience/:serverVersion(\\d+_\\d+_\\d+)",
    (req: RequestWithJwt<{ issuer: string }>, res) => {
        const proto = req.protocol
        const config = getConfig(
            "ServerVersionConfig",
            true,
        ) as ServerConnectionConfig
        const serverhost = req.get("Host")

        config.Versions[0].GAME_VER = req.params.serverVersion.startsWith("8")
            ? `${ServerVer._Major}.${ServerVer._Minor}.${ServerVer._Build}`
            : req.params.serverVersion.startsWith("7")
            ? "7.17.0"
            : "6.74.0"

        if (req.params.serverVersion.startsWith("8")) {
            config.Versions[0].SERVER_VER.GlobalAuthentication.RequestedAudience =
                "pc-prod_8"
        }

        if (req.params.serverVersion.startsWith("7")) {
            config.Versions[0].SERVER_VER.GlobalAuthentication.RequestedAudience =
                "pc-prod_7"
        }

        if (req.params.serverVersion.startsWith("6")) {
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

app.get("/files/privacypolicy/hm3/privacypolicy_*.json", (req, res) => {
    res.set("Content-Type", "application/octet-stream")
    res.set("x-ms-meta-version", "20181001")
    res.send(getConfig("PrivacyPolicy", false))
})

app.post(
    "/api/metrics/*",
    jsonMiddleware({ limit: "10Mb" }),
    (req: RequestWithJwt<never, S2CEventWithTimestamp[]>, res) => {
        req.body.forEach((event) => {
            controller.hooks.newMetricsEvent.call(event, req)
        })

        res.send()
    },
)

app.use("/oauth/token", urlencoded())

app.post("/oauth/token", (req: RequestWithJwt, res) =>
    handleOauthToken(req, res),
)

app.get("/files/onlineconfig.json", (req, res) => {
    res.set("Content-Type", "application/octet-stream")
    res.send(getConfig("OnlineConfig", false))
})

// NOTE! All routes attached after this point will be checked for a JWT or blob signature.
// If you are adding a route that does NOT require authentication, put it ABOVE this message!

app.use(
    Router()
        .use(
            "/resources-:serverVersion(\\d+-\\d+)/",
            (req: RequestWithJwt, res, next) => {
                req.serverVersion = req.params.serverVersion
                req.gameVersion = req.serverVersion.startsWith("8")
                    ? "h3"
                    : req.serverVersion.startsWith("7") &&
                      // prettier-ignore
                      req.serverVersion !== "7.3.0"
                    ? // prettier-ignore
                      "h2"
                    : // prettier-ignore
                      "h1"

                if (req.serverVersion === "7.3.0") {
                    req.gameVersion = "scpc"
                }

                next("router")
            },
        )
        // we're fine with skipping to the next router if we don't have auth
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
                    req.serverVersion = "8-12"
                    break
                default:
                    res.status(400).json({ message: "no game data" })
                    return
            }

            req.gameVersion = req.serverVersion.startsWith("8")
                ? "h3"
                : req.serverVersion.startsWith("7")
                ? "h2"
                : "h1"

            if (req.jwt?.aud === "scpc-prod") {
                req.gameVersion = "scpc"
            }

            next()
        }),
)

app.get(
    "/profiles/page//dashboard//Dashboard_Category_Sniper_Singleplayer/00000000-0000-0000-0000-000000000015/Contract/ff9f46cf-00bd-4c12-b887-eac491c3a96d",
    (req: RequestWithJwt, res) => {
        res.json({
            template: getConfig("FrankensteinMmSpTemplate", false),
            data: {
                Item: {
                    Id: "ff9f46cf-00bd-4c12-b887-eac491c3a96d",
                    Type: "Contract",
                    Title: "UI_CONTRACT_HAWK_TITLE",
                    Date: new Date().toISOString(),
                    Data: generateUserCentric(
                        _theLastYardbirdScpc,
                        req.jwt.unique_name,
                        "scpc",
                    ),
                },
            },
        })
    },
)

// We handle this for now, but it's not used. For the future though.
app.get(
    "/profiles/page//dashboard//Dashboard_Category_Sniper_Multiplayer/00000000-0000-0000-0000-000000000015/Contract/ff9f46cf-00bd-4c12-b887-eac491c3a96d",
    (req: RequestWithJwt, res) => {
        const template = getConfig("FrankensteinMmMpTemplate", false)

        /* To enable multiplayer:
         * Change MultiplayerNotSupported to false
         * NOTE: REMOVING THIS FULLY WILL BREAK THE EDITED TEMPLATE!
         */

        res.json({
            template: template,
            data: {
                Item: {
                    Id: "ff9f46cf-00bd-4c12-b887-eac491c3a96d",
                    Type: "Contract",
                    Title: "UI_CONTRACT_HAWK_TITLE",
                    Date: new Date().toISOString(),
                    Disabled: true,
                    Data: {
                        ...generateUserCentric(
                            _theLastYardbirdScpc,
                            req.jwt.unique_name,
                            "scpc",
                        ),
                        ...{ MultiplayerNotSupported: true },
                    },
                },
            },
        })
    },
)

if (getFlag("developmentAllowRuntimeRestart")) {
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
    "/authentication/api/configuration/Init?*",
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
    },
)

app.post(
    "/authentication/api/userchannel/AuthenticationService/RenewBlobSignature",
    (req: RequestWithJwt, res) => {
        res.json(generateBlobConfig(req))
    },
)

const legacyRouter = Router()
const primaryRouter = Router()

legacyRouter.use(
    "/authentication/api/userchannel/EventsService/",
    legacyEventRouter,
)
legacyRouter.use("/resources-(\\d+-\\d+)/", legacyMenuSystemRouter)
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
primaryRouter.use(
    "/authentication/api/userchannel/ReportingService/",
    reportRouter,
)
primaryRouter.use("/authentication/api/userchannel/", profileRouter)
primaryRouter.use("/profiles/page/", preMenuDataRouter)
primaryRouter.use("/profiles/page", multiplayerMenuDataRouter)
primaryRouter.use("/profiles/page/", menuDataRouter)
primaryRouter.use("/resources-(\\d+-\\d+)/", menuSystemPreRouter)
primaryRouter.use("/resources-(\\d+-\\d+)/", menuSystemRouter)

app.use(
    Router()
        .use((req: RequestWithJwt, res, next) => {
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
        .use((req: RequestWithJwt, res, next) => {
            if (req.shouldCease) {
                return next("router")
            }

            if (
                ["6-74", "7-3", "7-17", "8-12"].includes(
                    <string>req.serverVersion,
                )
            ) {
                return next() // continue along h3 router
            }

            next("router")
        })
        .use(primaryRouter),
)

app.all("*", (req, res) => {
    log(LogLevel.WARN, `Unhandled URL: ${req.url}`)
    res.status(404).send("Not found!")
})

app.use(errorLoggingMiddleware)

program.description(
    "The Peacock Project is a HITMAN™ World of Assassination Trilogy server built for general use.",
)

const PEECOCK_ART = picocolors.yellow(`
 ███████████  ██████████ ██████████   █████████     ███████      █████████  █████   ████
░░███░░░░░███░░███░░░░░█░░███░░░░░█  ███░░░░░███  ███░░░░░███   ███░░░░░███░░███   ███░
 ░███    ░███ ░███  █ ░  ░███  █ ░  ███     ░░░  ███     ░░███ ███     ░░░  ░███  ███
 ░██████████  ░██████    ░██████   ░███         ░███      ░███░███          ░███████
 ░███░░░░░░   ░███░░█    ░███░░█   ░███         ░███      ░███░███          ░███░░███
 ░███         ░███ ░   █ ░███ ░   █░░███     ███░░███     ███ ░░███     ███ ░███ ░░███
 █████        ██████████ ██████████ ░░█████████  ░░░███████░   ░░█████████  █████ ░░████
░░░░░        ░░░░░░░░░░ ░░░░░░░░░░   ░░░░░░░░░     ░░░░░░░      ░░░░░░░░░  ░░░░░   ░░░░
`)

function startServer(options: { hmr: boolean; pluginDevHost: boolean }): void {
    checkForUpdates()

    if (!IS_LAUNCHER) {
        console.log(
            Math.random() < 0.001
                ? PEECOCK_ART
                : picocolors.greenBright(`
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
        `This is Peacock v${PEACOCKVERSTRING} (rev ${PEACOCKVER}), with Node v${process.versions.node}.`,
    )

    // jokes lol
    if (getFlag("jokes") === true) {
        log(
            LogLevel.INFO,
            picocolors.yellowBright(
                `${jokes[random.int(0, jokes.length - 1)]}`,
            ),
        )
    }

    // make sure required folder structure is in place
    for (const dir of [
        "contractSessions",
        "plugins",
        "userdata",
        "contracts",
        join("userdata", "epicids"),
        join("userdata", "steamids"),
        join("userdata", "users"),
        join("userdata", "h1", "steamids"),
        join("userdata", "h1", "epicids"),
        join("userdata", "h1", "users"),
        join("userdata", "h2", "steamids"),
        join("userdata", "h2", "users"),
        join("userdata", "scpc", "users"),
        join("userdata", "scpc", "steamids"),
        join("images", "actors"),
        join("images", "contracts"),
        join("images", "contracts", "elusive"),
        join("images", "contracts", "escalation"),
        join("images", "contracts", "featured"),
        join("images", "unlockables_override"),
    ]) {
        if (existsSync(dir)) {
            continue
        }

        log(LogLevel.DEBUG, `Creating missing directory ${dir}`)
        mkdirSync(dir, { recursive: true })
    }

    if (options.hmr) {
        log(LogLevel.DEBUG, "Experimental HMR enabled.")

        setupHotListener("contracts", () => {
            log(LogLevel.INFO, "Detected a change in contracts! Re-indexing...")
            controller.index()
        })
    }

    // once contracts directory is present, we are clear to boot
    loadouts.init()
    controller.boot(options.pluginDevHost)

    const httpServer = http.createServer(app)

    // @ts-expect-error Non-matching method sig
    httpServer.listen(port, host)
    log(LogLevel.INFO, "Server started.")

    if (getFlag("discordRp") === true) {
        initRp()
    }

    // initialize livesplit
    liveSplitManager.init()
}

program.option(
    "--hmr",
    "enable experimental hot reloading of contracts",
    getFlag("experimentalHMR") as boolean,
)
program.option(
    "--plugin-dev-host",
    "activate plugin development features - requires plugin dev workspace setup",
    getFlag("developmentPluginDevHost") as boolean,
)
program.action(startServer)

program
    .command("swizzle")
    .option(
        "-c, --config <name>",
        "the config file to generate an override for",
        "",
    )
    .option("--list", "get a list of config files that can be overridden")
    .description(
        "generates a file that overrides its internal config counterpart",
    )
    .action((args: { list: boolean; config: string }) => {
        if (args.list) {
            log(LogLevel.INFO, "The following configurations can be swizzled:")
            getSwizzleable().forEach((swizzleable) => {
                log(LogLevel.INFO, `  - ${swizzleable}`)
            })
            return
        }

        // doesn't want list, but hasn't specified a swizzleable
        if (!args.list && args.config === "") {
            log(LogLevel.ERROR, "No config specified! - Aborting.")
            return process.exit(1)
        }

        return swizzle(args.config)
    })

program
    .command("tools")
    .description("open the tools UI")
    .action(() => {
        toolsMenu()
    })

program
    .command("pack")
    .argument("<input>", "input file to pack")
    .option("-o, --output <path>", "where to output the packed file to", "")
    .description("packs an input file into a Challenge Resource Package")
    .action((input, options: { output: string }) => {
        const outputPath =
            options.output !== ""
                ? options.output
                : input.replace(/\.[^/\\.]+$/, ".crp")

        writeFileSync(
            outputPath,
            pack(JSON.parse(readFileSync(input).toString())),
        )

        log(LogLevel.INFO, `Packed "${input}" to "${outputPath}" successfully.`)
    })

program
    .command("unpack")
    .argument("<input>", "input file to unpack")
    .option("-o, --output <path>", "where to output the unpacked file to", "")
    .description("unpacks a Challenge Resource Package")
    .action((input, options: { output: string }) => {
        const outputPath =
            options.output !== ""
                ? options.output
                : input.replace(/\.[^/\\.]+$/, ".json")

        writeFileSync(outputPath, JSON.stringify(unpack(readFileSync(input))))

        log(
            LogLevel.INFO,
            `Unpacked "${input}" to "${outputPath}" successfully.`,
        )
    })

program.parse(process.argv)
