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

import { pack } from "msgpackr"
import { writeFile } from "node:fs/promises"

const lines = await fetch(
    "https://raw.githubusercontent.com/glacier-modding/Hitman-l10n-Hashes/master/lines.json",
)
    .then((res) => res.json())
    .catch(() => {
        throw new Error("Failed to fetch lines.json")
    })

const outKeys = Object.keys(lines).map((key) => {
    return parseInt(key, 16)
})

await writeFile("testData/game-defined-locr-crc32s.msgpack", pack(outKeys))
