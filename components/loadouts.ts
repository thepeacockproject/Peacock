/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2026 The Peacock Project Team
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

import {
    GameLoadout,
    GameVersion,
    Loadout,
    LoadoutFile,
    LoadoutsGameVersion,
    LocationLoadout,
    Unlockable,
} from "./types/types"
import { Request, Router } from "express"
import { json as jsonMiddleware } from "body-parser"
import { writeFile } from "fs/promises"
import { nanoid } from "nanoid"
import { getDefaultSuitFor, versions } from "./utils"
import { asyncGuard, getUserData } from "./databaseHandler"
import { getFlag } from "./flags"
import { StashpointSlotName } from "./types/gameSchemas"
import { getUnlockableById } from "./inventory"

export const REQUIRED_LOADOUT_SLOTS = [
    3, // disguise
]

const LOADOUT_PROFILES_FILE = "userdata/users/lop.json"

export const LOADOUT_SLOTS: StashpointSlotName[] = [
    "carriedweapon",
    "carrieditem",
    "concealedweapon",
    "disguise",
    "gear",
    "gear",
    "stashpoint",
]

const defaultValue: LoadoutFile = {
    h1: {
        selected: null,
        loadouts: [],
    },
    h2: {
        selected: null,
        loadouts: [],
    },
    h3: {
        selected: null,
        loadouts: [],
    },
}

/**
 * A class for managing loadouts.
 */
export class Loadouts {
    loadouts!: LoadoutFile

    /**
     * Initializes the loadouts manager.
     */
    async init(): Promise<void> {
        const fs = asyncGuard.getFs()

        if (!(await fs.exists(LOADOUT_PROFILES_FILE))) {
            this.loadouts = defaultValue

            await fs.writeFile(
                LOADOUT_PROFILES_FILE,
                JSON.stringify(defaultValue),
            )
            return
        }

        this.loadouts = JSON.parse(
            (await fs.readFile(LOADOUT_PROFILES_FILE)).toString(),
        )

        let dirty = false

        // make sure they all have IDs
        for (const gameVersion of versions) {
            for (const loadout of this.loadouts[gameVersion].loadouts) {
                if (!loadout.id) {
                    dirty = true
                    loadout.id = nanoid()
                }
            }

            // if the selected value is null/undefined or is not length 0 or 21, it's not a valid id
            if (
                !this.loadouts[gameVersion].selected ||
                // first condition ensures selected is truthy, but TS doesn't know
                ![0, 21].includes(
                    this.loadouts[gameVersion].selected?.length || -1,
                )
            ) {
                dirty = true

                // long story short: find a loadout with a name matching the selected value,
                // and if found, set selected to the id
                this.loadouts[gameVersion].selected =
                    this.loadouts[gameVersion].loadouts.find(
                        (lo) => lo.name === this.loadouts[gameVersion].selected,
                    )?.id || ""
            }
        }

        if (dirty) {
            await writeFile(
                LOADOUT_PROFILES_FILE,
                JSON.stringify(this.loadouts),
            )
        }
    }

    /**
     * Create the default loadout (or just a new loadout) for the specified game version, and optionally with a name.
     *
     * @param gameVersion The game version to perform the operation on.
     * @param name The optional name for the new loadout set, defaults to "Unnamed loadout set".
     * @returns The Loadout object.
     */
    createDefault(
        gameVersion: GameVersion,
        name = "Unnamed loadout set",
    ): Loadout {
        if (gameVersion === "scpc") {
            gameVersion = "h1"
        }

        const l: Loadout = {
            name,
            id: nanoid(),
            data: {},
        }

        this.loadouts[gameVersion].loadouts.push(l)
        this.loadouts[gameVersion].selected = l.id

        return l
    }

    /**
     * Get the active loadout profile for the specified game version. May be undefined.
     *
     * @param gameVersion The game version.
     * @returns The loadout profile or undefined if one isn't selected or none exist.
     */
    getLoadoutFor(gameVersion: GameVersion): Loadout | undefined {
        if (gameVersion === "scpc") {
            gameVersion = "h1"
        }

        const theLoadouts = this.loadouts[gameVersion] as LoadoutsGameVersion
        return theLoadouts.loadouts.find((s) => s.id === theLoadouts.selected)
    }

    getLocationLoadout(
        userId: string,
        gameVersion: GameVersion,
        sublocation: Unlockable,
        suitOverride?: string | undefined,
    ): LocationLoadout {
        const defaultLoadout = {
            2:
                gameVersion === "h1"
                    ? "FIREARMS_HERO_PISTOL_TACTICAL_001_SU_SKIN01"
                    : "FIREARMS_HERO_PISTOL_TACTICAL_ICA_19",
            3: getDefaultSuitFor(sublocation, gameVersion, suitOverride),
            4: "TOKEN_FIBERWIRE",
            5: "PROP_TOOL_COIN",
        }

        const output: LocationLoadout = {
            loadout: {},
        }

        const userProfile = getUserData(userId, gameVersion)

        let loadout: GameLoadout

        if (getFlag("loadoutSaving") === "LEGACY") {
            loadout =
                userProfile.Extensions.defaultloadout?.[sublocation?.Id] ??
                defaultLoadout
        } else {
            let gameVersionedLoadout = loadouts.getLoadoutFor(gameVersion)

            if (!gameVersionedLoadout) {
                gameVersionedLoadout = loadouts.createDefault(gameVersion)
            }

            loadout =
                gameVersionedLoadout.data[sublocation?.Id] ?? defaultLoadout
        }

        // SILLY HACK FOR OLD (< 8.6.0) SAVES: For LOCATION_NEWZEALAND, if the saved suit is TOKEN_OUTFIT_WET_SUIT, replace
        // it with TOKEN_OUTFIT_NEWZEALAND_HERO_NEWZEALANDSUIT since we now respect the location's default suit.
        if (
            sublocation.Id === "LOCATION_NEWZEALAND" &&
            loadout["3"] === "TOKEN_OUTFIT_WET_SUIT"
        )
            loadout["3"] = "TOKEN_OUTFIT_NEWZEALAND_HERO_NEWZEALANDSUIT"

        // Typecast nightmare
        for (let i = 0; i < LOADOUT_SLOTS.length; i++) {
            const idx = i as keyof typeof loadout
            const item = (() => {
                if (
                    loadout[idx] &&
                    getUnlockableById(loadout[idx], gameVersion)
                ) {
                    return loadout[idx]
                }

                if (REQUIRED_LOADOUT_SLOTS.includes(i)) {
                    return defaultLoadout[i as keyof typeof defaultLoadout]
                }

                return undefined
            })()
            if (item) output.loadout[idx] = item
        }

        if (["h2", "h3"].includes(gameVersion)) {
            // Try to get briefcase item, operates off the assumption that it's the only non-integer entry.
            for (const [key, value] of Object.entries(loadout)) {
                if (Number.isInteger(Number(key))) continue
                output.briefcase = {
                    id: key,
                    unlockableId: value,
                }
            }
        }

        return output
    }

    /**
     * Saves the loadout data to the Peacock userdata/users folder.
     */
    public async save(): Promise<void> {
        await writeFile(LOADOUT_PROFILES_FILE, JSON.stringify(this.loadouts))
    }
}

/**
 * A synthetic default bind to the global Loadouts instance.
 * @todo Move this somewhere that makes more sense with a dependency injection model.
 */
export const loadouts = new Loadouts()

/**
 * Router object for loadout-related web requests.
 */
export const loadoutRouter = Router()

if (PEACOCK_DEV) {
    loadoutRouter.use((_req, res, next) => {
        res.set("Access-Control-Allow-Origin", "*")
        res.set(
            "Access-Control-Allow-Methods",
            "GET,HEAD,PUT,PATCH,POST,DELETE",
        )
        res.set("Access-Control-Allow-Headers", "Content-Type")
        next()
    })
}

loadoutRouter.get("/all-loadouts", (req, res) => {
    res.json(loadouts.loadouts)
})

loadoutRouter.patch("/update", jsonMiddleware(), async (req, res) => {
    // todo: perform validation on this
    loadouts.loadouts = req.body

    await loadouts.save()

    res.json({ message: "request completed" })
})

loadoutRouter.patch(
    "/remove",
    jsonMiddleware(),
    async (
        req: Request<
            never,
            string | { error?: string; message?: string },
            { gameVersion: "h1" | "h2" | "h3"; id: string }
        >,
        res,
    ) => {
        // check for gameVersion
        if (!req.body.gameVersion) {
            res.status(400).json({ error: "missing gv" })
            return
        }

        // validate gameVersion
        if (!versions.includes(req.body.gameVersion)) {
            res.status(400).json({ error: "invalid gv" })
            return
        }

        // check for id
        if (!req.body.id) {
            res.status(400).json({ error: "missing id" })
            return
        }

        const data = loadouts.loadouts

        const withoutDeletionTarget = data[
            req.body.gameVersion
        ].loadouts.filter((l) => {
            return l.id !== data[req.body.gameVersion].selected
        })

        if (withoutDeletionTarget.length === 0) {
            data[req.body.gameVersion].loadouts = []

            // we have no other loadouts, so make a default one
            loadouts.createDefault(req.body.gameVersion)
        } else {
            // we have other loadouts, so pick the first one
            data[req.body.gameVersion].loadouts = withoutDeletionTarget
            data[req.body.gameVersion].selected = withoutDeletionTarget[0]?.id
        }

        loadouts.loadouts = data
        await loadouts.save()

        res.json({ message: "request completed" })
    },
)

loadoutRouter.post("/create", jsonMiddleware(), async (req, res) => {
    if (!versions.includes(req.body.gameVersion)) {
        res.status(400).json({ message: "invalid gv" })
        return
    }

    loadouts.createDefault(req.body.gameVersion)
    await loadouts.save()
    res.json({ message: "success" })
})
