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

import { Router } from "express"
import { join } from "path"
import md5File from "md5-file"
import { readFile } from "atomically"

const legacyMenuSystemRouter = Router()

// /resources-6-74/

legacyMenuSystemRouter.get(
    "/dynamic_resources_pc_release_rpkg",
    async (req, res) => {
        const filePath = join(
            PEACOCK_DEV ? process.cwd() : __dirname,
            "resources",
            "dynamic_resources_h1.rpkg",
        )

        const md5 = await md5File(filePath)

        res.set("Content-Type", "application/octet-stream")
        res.set("Content-MD5", Buffer.from(md5, "hex").toString("base64"))

        res.send(await readFile(filePath))
    },
)

export { legacyMenuSystemRouter }
