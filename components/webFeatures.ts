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

import { Request, Response, Router } from "express"
import { getConfig } from "./configSwizzleManager"
import { readFileSync } from "atomically"
import { GameVersion, UserProfile } from "./types/types"
import { join } from "path"
import { uuidRegex, versions } from "./utils"
import { getUserData, loadUserData, writeUserData } from "./databaseHandler"
import { readdirSync } from "fs"
import { controller } from "./controller"
import { log, LogLevel } from "./loggingInterop"

const webFeaturesRouter = Router()

if (PEACOCK_DEV) {
    webFeaturesRouter.use((_req, res, next) => {
        res.set("Access-Control-Allow-Origin", "*")
        res.set(
            "Access-Control-Allow-Methods",
            "GET,HEAD,PUT,PATCH,POST,DELETE",
        )
        res.set("Access-Control-Allow-Headers", "Content-Type")
        next()
    })
}

function formErrorMessage(res: Response, message: string): void {
    res.json({
        success: false,
        error: message,
    })
}

webFeaturesRouter.get("/codenames", (req, res) => {
    res.json(getConfig("EscalationCodenames", false))
})

webFeaturesRouter.get(
    "/local-users",
    (req: Request<unknown, unknown, unknown, { gv: GameVersion }>, res) => {
        if (!req.query.gv || !versions.includes(req.query.gv ?? null)) {
            res.json([])
            return
        }

        let dir

        if (req.query.gv === "h3") {
            dir = join("userdata", "users")
        } else {
            dir = join("userdata", req.query.gv, "users")
        }

        const files: string[] = readdirSync(dir).filter(
            (name) => name !== "lop.json",
        )

        const result = []

        for (const file of files) {
            const read = JSON.parse(
                readFileSync(join(dir, file)).toString(),
            ) as UserProfile

            result.push({
                id: read.Id,
                name: read.Gamertag,
                platform: read.EpicId ? "Epic" : "Steam",
            })
        }

        res.json(result)
    },
)

function validateUserAndGv(
    req: Request<unknown, unknown, unknown, { gv: GameVersion; user: string }>,
    res: Response,
): boolean {
    if (!req.query.gv || !versions.includes(req.query.gv ?? null)) {
        formErrorMessage(
            res,
            'The request must contain a valid game version among "h1", "h2", and "h3".',
        )
        return false
    }

    if (!req.query.user || !uuidRegex.test(req.query.user)) {
        formErrorMessage(res, "The request must contain the uuid of a user.")
        return false
    }

    return true
}

webFeaturesRouter.get(
    "/modify",
    async (
        req: Request<
            unknown,
            unknown,
            unknown,
            { gv: GameVersion; user: string; level: string; id: string }
        >,
        res,
    ) => {
        if (!validateUserAndGv(req, res)) {
            return
        }

        if (!req.query.level) {
            formErrorMessage(
                res,
                "The request must contain the level to set the escalation to.",
            )
            return
        }

        if (
            isNaN(parseInt(req.query.level)) ||
            parseInt(req.query.level) <= 0
        ) {
            formErrorMessage(res, "The level must be a positive integer.")
            return
        }

        if (!req.query.id || !uuidRegex.test(req.query.id)) {
            formErrorMessage(
                res,
                "The request must contain the uuid of an escalation.",
            )
            return
        }

        try {
            await loadUserData(req.query.user, req.query.gv)
        } catch (e) {
            formErrorMessage(res, "Failed to load user data.")
            return
        }

        if (controller.escalationMappings.get(req.query.id) === undefined) {
            formErrorMessage(res, "Unknown escalation.")
            return
        }

        if (
            Object.keys(controller.escalationMappings.get(req.query.id))
                .length < parseInt(req.query.level, 10)
        ) {
            formErrorMessage(
                res,
                "Cannot exceed the maximum level for this escalation!",
            )
            return
        }

        log(
            LogLevel.INFO,
            `Setting the level of escalation ${req.query.id} to ${req.query.level}`,
        )
        const read = getUserData(req.query.user, req.query.gv)

        read.Extensions.PeacockEscalations[req.query.id] = parseInt(
            req.query.level,
        )

        if (
            read.Extensions.PeacockCompletedEscalations.includes(req.query.id)
        ) {
            read.Extensions.PeacockCompletedEscalations =
                read.Extensions.PeacockCompletedEscalations.filter(
                    (val) => val !== req.query.id,
                )
        }

        writeUserData(req.query.user, req.query.gv)

        res.json({ success: true })
    },
)

webFeaturesRouter.get(
    "/user-progress",
    async (
        req: Request<
            unknown,
            unknown,
            unknown,
            { gv: GameVersion; user: string }
        >,
        res,
    ) => {
        if (!validateUserAndGv(req, res)) {
            return
        }

        try {
            await loadUserData(req.query.user, req.query.gv)
        } catch (e) {
            formErrorMessage(res, "Failed to load user data.")
            return
        }

        const d = getUserData(req.query.user, req.query.gv)

        res.json(d.Extensions.PeacockEscalations)
    },
)

export { webFeaturesRouter }
