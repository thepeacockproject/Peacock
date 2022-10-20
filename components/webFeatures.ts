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

import { Request, Response, Router } from "express"
import { getConfig } from "./configSwizzleManager"
import { readFileSync } from "atomically"
import { GameVersion, UserProfile } from "./types/types"
import { join } from "path"
import { uuidRegex } from "./utils"
import { getUserData, loadUserData, writeUserData } from "./databaseHandler"
import { readdirSync } from "fs"

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

webFeaturesRouter.get("/codenames", (req, res) => {
    res.json(getConfig("EscalationCodenames", false))
})

webFeaturesRouter.get(
    "/local-users",
    (req: Request<unknown, unknown, unknown, { gv: GameVersion }>, res) => {
        if (
            !req.query.gv ||
            !["h1", "h2", "h3"].includes(req.query.gv ?? null)
        ) {
            res.json({ error: "bad gv" })
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
    if (!req.query.gv || !["h1", "h2", "h3"].includes(req.query.gv ?? null)) {
        res.json({ error: "bad gv" })
        return false
    }

    if (!req.query.user || !uuidRegex.test(req.query.user)) {
        res.json({ error: "bad user" })
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

        if (!req.query.level && !isNaN(parseInt(req.query.level))) {
            res.json({ error: "bad level" })
            return
        }

        if (!req.query.id && !uuidRegex.test(req.query.id)) {
            res.json({ error: "bad id" })
            return
        }

        try {
            await loadUserData(req.query.user, req.query.gv)
        } catch (e) {
            res.json({ error: "failed to load user data" })
            return
        }

        const read = getUserData(req.query.user, req.query.gv)

        read.Extensions.PeacockEscalations[req.query.id] = parseInt(
            req.query.level,
        )

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
            res.json({ error: "failed to load user data" })
            return
        }

        const d = getUserData(req.query.user, req.query.gv)

        res.json(d.Extensions.PeacockEscalations)
    },
)

export { webFeaturesRouter }
