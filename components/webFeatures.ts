/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2024 The Peacock Project Team
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

import { NextFunction, Request, Response, Router } from "express"
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

type CommonRequest<ExtraQuery = Record<never, never>> = Request<
    unknown,
    unknown,
    unknown,
    {
        user: string
        gv: Exclude<GameVersion, "scpc">
    } & ExtraQuery
>

function commonValidationMiddleware(
    req: CommonRequest,
    res: Response,
    next: NextFunction,
): void {
    if (!req.query.gv || !versions.includes(req.query.gv ?? null)) {
        res.json({
            success: false,
            error: "invalid game version",
        })
        return
    }

    if (!req.query.user || !uuidRegex.test(req.query.user)) {
        res.json({
            success: false,
            error: "The request must contain the uuid of a user.",
        })
        return
    }

    next()
}

function formErrorMessage(res: Response, message: string): void {
    res.json({
        success: false,
        error: message,
    })
}

webFeaturesRouter.get("/codenames", (_, res) => {
    res.json(getConfig("EscalationCodenames", false))
})

webFeaturesRouter.get("/local-users", (req: CommonRequest, res) => {
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
})

webFeaturesRouter.get(
    "/modify",
    commonValidationMiddleware,
    async (req: CommonRequest<{ level: string; id: string }>, res) => {
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

        const mapping = controller.escalationMappings.get(req.query.id)

        if (!mapping) {
            formErrorMessage(res, "Unknown escalation.")
            return
        }

        if (Object.keys(mapping).length < parseInt(req.query.level, 10)) {
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
    commonValidationMiddleware,
    async (req: CommonRequest, res) => {
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
