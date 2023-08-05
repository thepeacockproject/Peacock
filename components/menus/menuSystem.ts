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

import { NextFunction, Response, Router } from "express"
import serveStatic from "serve-static"
import { join } from "path"
import md5File from "md5-file"
import { getConfig } from "../configSwizzleManager"
import { readFile } from "atomically"
import { GameVersion, RequestWithJwt } from "../types/types"
import { log, LogLevel } from "../loggingInterop"
import { imageFetchingMiddleware } from "./imageHandler"
import { SyncBailHook, SyncHook } from "../hooksImpl"

/**
 * Router triggered before {@link menuSystemRouter}.
 */
const menuSystemPreRouter = Router()
const menuSystemRouter = Router()

// /resources-8-12/

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

                    configs.push(
                        "images/unlockables/outfit_ef223b60-b53a-4c7b-b914-13c3310fc61a_0.jpg",
                    )

                    configs.push(
                        "images/unlockables_override/47_outfits_legacy47.jpg",
                    )
                }

                if (["h3", "h1"].includes(gameVersion)) {
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

                    configs.push(
                        "menusystem/elements/contract/hitscategory_elusive.json",
                    )

                    // To allow the elusive page loading on H2 and for contract
                    // attack pages in H2/3 - AF
                    configs.push(
                        "menusystem/elements/contract/contractshitcategoryloading.json",
                    )

                    // The following is to allow restart/replan/save/load on elusive contracts
                    // alongside removing the warning when starting one in H2/3 - AF
                    configs.push(
                        "menusystem/pages/pause/pausemenu/restart.json",
                    )
                    configs.push("menusystem/pages/pause/pausemenu/replan.json")
                    configs.push("menusystem/pages/pause/pausemenu/save.json")
                    configs.push("menusystem/pages/pause/pausemenu/load.json")
                    configs.push(
                        "menusystem/pages/planning/actions/actions_contextbutton_play.json",
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
                case "/elements/contract/hitscategory_elusive.json":
                    return getConfig("HitsCategoryElusiveTemplate", false)
                case "/elements/contract/hitscategory_contractattack.json":
                    return getConfig(
                        "HitsCategoryContractAttackTemplate",
                        false,
                    )
                case "/elements/contract/contractshitcategoryloading.json":
                    return {
                        controller: "group",
                        view: "menu3.containers.ScrollingListContainer",
                        layoutchildren: true,
                        id: "hitscategory_container",
                        nrows: 3,
                        ncols: 10,
                        pressable: false,
                        data: { direction: "horizontal" },
                        actions: {
                            activated: {
                                "load-async": {
                                    path: {
                                        "$if $eq ($.Category,Elusive_Target_Hits)":
                                            {
                                                $then: "menusystem/elements/contract/hitscategory_elusive.json",
                                                $else: {
                                                    "$if $eq ($.Category,ContractAttack)":
                                                        {
                                                            $then: "menusystem/elements/contract/hitscategory_contractattack.json",
                                                            $else: "menusystem/elements/contract/hitscategory.json",
                                                        },
                                                },
                                            },
                                    },
                                    from: {
                                        url: "hitscategory",
                                        args: {
                                            page: 0,
                                            type: "$.Category",
                                            mode: "dataonly",
                                        },
                                    },
                                    target: "hitscategory_container",
                                    showloadingindicator: true,
                                    blocksinput: false,
                                    "post-load-action": [
                                        {
                                            "set-selected": {
                                                target: "hitscategory_container",
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                        children: [{ pressable: false, selectable: true }],
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
                case "/data/ispeacock.json":
                    return {
                        "$if $eq (0,0)": {
                            $then: true,
                            $else: true,
                        },
                    }
                case "/pages/multiplayer/content/lobbyslim.json":
                    return getConfig("LobbySlimTemplate", false)
                case "/pages/pause/pausemenu/restart.json":
                    return {
                        $if: {
                            $condition: {
                                $or: [
                                    "$not $eq({$currentcontractcontext}.ContractType,evergreen)",
                                    "$isallowedtorestart",
                                ],
                            },
                            $then: {
                                $include: {
                                    $path: "menusystem/pages/pause/pausemenu/restartnoconditions.json",
                                },
                            },
                        },
                    }
                case "/pages/pause/pausemenu/replan.json":
                    return {
                        $if: {
                            $condition: {
                                $and: [
                                    "$not $eq({$currentcontractcontext}.ContractLocation,LOCATION_ICA_FACILITY)",
                                    "$not $eq({$currentcontractcontext}.ContractType,tutorial)",
                                    "$not $eq({$currentcontractcontext}.ContractType,vsrace)",
                                    "$not $eq({$currentcontractcontext}.ContractType,evergreen)",
                                ],
                            },
                            $then: {
                                "$if $isallowedtorestart": {
                                    $then: {
                                        view: "menu3.basic.ListElementSmall",
                                        pressable:
                                            "$not $isnull {$currentcontractcontext}.Contract",
                                        selectable:
                                            "$not $isnull {$currentcontractcontext}.Contract",
                                        data: {
                                            showningame: "$isingame",
                                            title: "$loc UI_MENU_PAGE_PAUSE_REPLAN",
                                            icon: "planning",
                                        },
                                        actions: {
                                            accept: {
                                                "$if $eq ({$currentcontractcontext}.ContractType,placeholder)":
                                                    {
                                                        $then: {
                                                            $datacontext: {
                                                                in: "$.",
                                                                datavalues: {
                                                                    AutoStart:
                                                                        false,
                                                                },
                                                                do: {
                                                                    $include: {
                                                                        $path: "menusystem/pages/pause/pausemenu/replanplaceholder.json",
                                                                    },
                                                                },
                                                            },
                                                        },
                                                        $else: {
                                                            "replan-level": {},
                                                        },
                                                    },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    }
                case "/pages/pause/pausemenu/save.json":
                    return {
                        $if: {
                            $condition: {
                                $and: [
                                    "$not $eq({$currentcontractcontext}.ContractType,arcade)",
                                    "$not $eq({$currentcontractcontext}.ContractType,evergreen)",
                                    "$not $eq({$currentcontractcontext}.ContractType,sniper)",
                                    "$not $eq({$currentcontractcontext}.ContractType,vsrace)",
                                ],
                            },
                            $then: {
                                $datacontext: {
                                    in: "$.",
                                    datavalues: {
                                        CanSave: "$cansave",
                                    },
                                    do: {
                                        view: "menu3.basic.ListElementSmall",
                                        selectable: "$.CanSave",
                                        pressable: "$.CanSave",
                                        data: {
                                            showningame: "$isingame",
                                            title: "$loc UI_MENU_PAGE_PAUSE_SAVE",
                                            icon: {
                                                "$if $.CanSave": {
                                                    $then: "save",
                                                    $else: "savedisabled",
                                                },
                                            },
                                            greyelement: "$not $.CanSave",
                                        },
                                        actions: {
                                            "$if $.CanSave": {
                                                $then: {
                                                    accept: {
                                                        link: {
                                                            page: "savepage",
                                                            args: {
                                                                url: "save",
                                                                args: {
                                                                    saveorload:
                                                                        "save",
                                                                },
                                                                saveorload:
                                                                    "save",
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    }
                case "/pages/pause/pausemenu/load.json":
                    return {
                        $if: {
                            $condition: {
                                $and: [
                                    "$not $eq({$currentcontractcontext}.ContractType,arcade)",
                                    "$not $eq({$currentcontractcontext}.ContractType,evergreen)",
                                    "$not $eq({$currentcontractcontext}.ContractType,sniper)",
                                    "$not $eq({$currentcontractcontext}.ContractType,vsrace)",
                                ],
                            },
                            $then: {
                                view: "menu3.basic.ListElementSmall",
                                data: {
                                    showningame: "$isingame",
                                    title: "$loc UI_MENU_PAGE_PAUSE_LOAD_GAME",
                                    icon: "load",
                                },
                                actions: {
                                    accept: {
                                        link: {
                                            page: "loadpage",
                                            args: {
                                                url: "load",
                                                args: {
                                                    saveorload: "load",
                                                },
                                                saveorload: "load",
                                                mainmenu: false,
                                                reloadonchange: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    }
                // Following exists in the files of H3, but not H2. No need to put it in the diff. - AF
                case "/pages/pause/pausemenu/restartnoconditions.json":
                    return {
                        view: "menu3.basic.ListElementSmall",
                        data: {
                            showningame: "$isingame",
                            title: {
                                "$if $eq ({$currentcontractcontext}.ContractType,vsrace)":
                                    {
                                        $then: "$loc UI_MENU_LOBBY_REMATCH",
                                        $else: "$loc UI_MENU_PAGE_PAUSE_RESTART",
                                    },
                            },
                            icon: "replay",
                        },
                        actions: {
                            accept: {
                                "$if $eq ({$currentcontractcontext}.ContractType,placeholder)":
                                    {
                                        $then: {
                                            $datacontext: {
                                                in: "$.",
                                                datavalues: {
                                                    AutoStart: true,
                                                },
                                                do: {
                                                    $include: {
                                                        $path: "menusystem/pages/pause/pausemenu/replanplaceholder.json",
                                                    },
                                                },
                                            },
                                        },
                                        $else: {
                                            "restart-level": {},
                                        },
                                    },
                            },
                        },
                    }
                case "/pages/planning/actions/actions_contextbutton_play.json":
                    return {
                        $mergeobjects: [
                            {
                                accept: {
                                    "start-contract": {
                                        contract: "$.Contract",
                                        difficulty:
                                            "$.@parent.CurrentDifficulty",
                                        objectives: "$.@parent.Objectives",
                                    },
                                },
                            },
                            {
                                $include: {
                                    $path: "menusystem/pages/planning/actions/actions_contextbutton_common.json",
                                },
                            },
                        ],
                    }
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

// Miranda Jamison's image path in the repository is escaped for some reason
menuSystemPreRouter.get(
    "/images%5Cactors%5Celusive_goldendoublet_face.jpg",
    (req, res, next) => {
        req.url = "/images/actors/elusive_goldendoublet_face.jpg"
        next("router")
    },
)

// Sully Bowden is the same (come on IOI!)
menuSystemPreRouter.get(
    "/images%5Cactors%5Celusive_redsnapper_face.jpg",
    (req, res, next) => {
        req.url = "/images/actors/elusive_redsnapper_face.jpg"
        next("router")
    },
)

menuSystemRouter.use(
    "/images/",
    serveStatic("images", { fallthrough: true }),
    imageFetchingMiddleware,
)

export { menuSystemRouter, menuSystemPreRouter }
