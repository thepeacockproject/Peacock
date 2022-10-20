/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2022 The Peacock Project Team
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

import { NextFunction, Response, Router } from "express"
import serveStatic from "serve-static"
import { join } from "path"
import md5File from "md5-file"
import { getConfig } from "../configSwizzleManager"
import { readFile } from "atomically"
import { GameVersion, RequestWithJwt } from "../types/types"
import { log, LogLevel } from "../loggingInterop"
import send from "send"
import { imageFetchingMiddleware } from "./imageHandler"
import { SyncBailHook, SyncHook } from "../hooksImpl"

const menuSystemRouter = Router()

// /resources-8-10/

/**
 * A class for managing the menu system's fetched JSON data.
 */
export class MenuSystemDatabase {
    /**
     * The hooks.
     */
    hooks: {
        /**
         * A hook for getting a list of configurations which the game should
         * fetch from the server.
         *
         * Params:
         * - configs: The configurations list (mutable). These should be full paths,
         * for instance, `/menusystem/data/testing.json`.
         * - gameVersion: The game's version.
         */
        getDatabaseDiff: SyncHook<
            [/** configs */ string[], /** gameVersion */ GameVersion]
        >

        /**
         * A hook for getting the requested configuration.
         *
         * Params:
         * - configName: The requested file's name.
         * - gameVersion: The game's version.
         *
         * Returns: The file as an object.
         */
        getConfig: SyncBailHook<
            [/** configName */ string, /** gameVersion */ GameVersion],
            unknown
        >
    }

    constructor() {
        this.hooks = {
            getDatabaseDiff: new SyncHook(),
            getConfig: new SyncBailHook(),
        }

        this.hooks.getDatabaseDiff.tap(
            "PeacockInternal",
            (configs, gameVersion) => {
                if (gameVersion === "h3") {
                    configs.push(
                        "menusystem/elements/settings/data/isnonvroptionvisible.json",
                    )
                }

                if (gameVersion === "h3" || gameVersion === "h1") {
                    configs.push("menusystem/pages/hub/hub_page.json")
                }

                configs.push("menusystem/data/ishitman3available.json")
                configs.push("menusystem/pages/hub/modals/roadmap/modal.json")
                configs.push(
                    "menusystem/pages/hub/data/isfullmenuavailable.json",
                )

                if (["h3", "h2"].includes(gameVersion)) {
                    configs.push(
                        "menusystem/pages/hub/dashboard/dashboard.json",
                    )
                    configs.push(
                        "menusystem/pages/hub/dashboard/category_escalation/result.json",
                    )
                }

                if (gameVersion === "h2") {
                    configs.push("menusystem/data/ismultiplayeravailable.json")
                    configs.push(
                        "menusystem/pages/multiplayer/content/lobbyslim.json",
                    )
                }
            },
        )

        this.hooks.getConfig.tap("PeacockInternal", (name, gameVersion) => {
            switch (name) {
                case "/elements/settings/data/isnonvroptionvisible.json":
                    return {
                        $if: {
                            $condition: {
                                $and: ["$isingame", "$not $isineditor"],
                            },
                            $then: "$eq($vrmode,off)",
                            $else: true,
                        },
                    }
                case "/data/ishitman3available.json":
                    return {
                        "$if $eq (0,0)": {
                            $then: "$isonline",
                            $else: false,
                        },
                    }
                case "/pages/hub/modals/roadmap/modal.json":
                    return getConfig("Roadmap", false)
                case "/pages/hub/hub_page.json":
                    return getConfig("HubPageData", false)
                case "/pages/hub/data/isfullmenuavailable.json":
                    return {
                        "$if $not $isuser freeprologue": {
                            $then: true,
                            $else: {
                                $and: [
                                    "$not $eq($platform,izumo)",
                                    "$isonline",
                                ],
                            },
                        },
                    }
                case "/pages/hub/dashboard/dashboard.json":
                    if (gameVersion === "h3") {
                        return getConfig("EiderDashboard", false)
                    } else if (gameVersion === "h2") {
                        return getConfig("H2DashboardTemplate", false)
                    }

                    return undefined
                case "/pages/hub/dashboard/category_escalation/result.json":
                    return getConfig("DashboardCategoryEscalation", false)
                case "/data/ismultiplayeravailable.json":
                    return {
                        "$if $eq ($platform,stadia)": {
                            $then: false,
                            $else: true,
                        },
                    }
                case "/pages/multiplayer/content/lobbyslim.json":
                    return getConfig("LobbySlimTemplate", false)
                default:
                    return undefined
            }
        })
    }

    /**
     * @internal
     */
    _getNamedConfig(configName: string, gameVersion: GameVersion): unknown {
        return this.hooks.getConfig.call(configName, gameVersion)
    }

    /**
     * Express middleware for fetching configurations.
     *
     * @param req The request.
     * @param res The response.
     * @param next The next function.
     */
    static configMiddleware(
        req: RequestWithJwt,
        res: Response,
        next: NextFunction,
    ): void {
        const config = menuSystemDatabase._getNamedConfig(
            req.path,
            req.gameVersion,
        )

        if (config) {
            res.json(config)
            return
        }

        log(LogLevel.DEBUG, `Unable to resolve config ${req.path}, skipping...`)
        next()
    }
}

export const menuSystemDatabase = new MenuSystemDatabase()

menuSystemRouter.get(
    "/dynamic_resources_pc_release_rpkg",
    async (req: RequestWithJwt, res) => {
        const dynamicResourceName = `dynamic_resources_${req.gameVersion}.rpkg`
        const dynamicResourcePath = join(
            PEACOCK_DEV ? process.cwd() : __dirname,
            "resources",
            dynamicResourceName,
        )

        log(
            LogLevel.DEBUG,
            `Serving dynamic resources from file ${dynamicResourceName}.`,
        )

        const hash = await md5File(dynamicResourcePath)
        res.set("Content-Type", "application/octet-stream")
        res.set("Content-MD5", Buffer.from(hash, "hex").toString("base64"))
        res.send(await readFile(dynamicResourcePath))
    },
)

menuSystemRouter.use("/menusystem/", MenuSystemDatabase.configMiddleware)

menuSystemRouter.use(
    "/images/",
    serveStatic("images", { fallthrough: true }),
    imageFetchingMiddleware,
)

// Miranda Jamison's image path in the repository is escaped for some reason
menuSystemRouter.get(
    "/images%5Cactors%5Celusive_goldendoublet_face.jpg",
    (req, res) => {
        send(req, "images/actors/elusive_goldendoublet_face.jpg").pipe(res)
    },
)

// Sully Bowden is the same (come on IOI!)
menuSystemRouter.get(
    "/images%5Cactors%5Celusive_redsnapper_face.jpg",
    (req, res) => {
        send(req, "images/actors/elusive_redsnapper_face.jpg").pipe(res)
    },
)

export { menuSystemRouter }
