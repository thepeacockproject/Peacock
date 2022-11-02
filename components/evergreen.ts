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

import { getUserData, writeUserData } from "./databaseHandler"
import { getConfig } from "./configSwizzleManager"

export function generateSeed(): number {
    return Math.floor(Math.random() * (2147483647 + 2147483647) - 2147483647)
}

export async function setCpd(
    data: Record<string, string | number | boolean>,
    uID: string,
) {
    const userData = getUserData(uID, "h3")

    userData.Extensions.CPD = {
        ...userData.Extensions.CPD,
        ...data,
    }

    await writeUserData(uID, "h3")
}

export function getCpd(uID: string): Record<string, string | number | boolean> {
    const userData = getUserData(uID, "h3")

    if (Object.keys(userData.Extensions.CPD).length === 0) {
        const defaultCPD = getConfig("DefaultCpdConfig", false) as Record<
            string,
            string | number | boolean
        >
        const seed = generateSeed()

        // Not entirely sure if this is necessary as the game doesn't seem to use this
        // but it cannot be zero, better to be safe than sorry - AF
        defaultCPD["DynamicSeed"] = seed
        defaultCPD["RandomSeed"] = seed

        setCpd(defaultCPD, uID)
        return defaultCPD
    }

    return userData.Extensions.CPD
}
