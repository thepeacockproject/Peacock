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

import { Factory } from "fishery"
import type { GameVersion, UserProfile } from "../../components/types/types"
import { getVersionedConfig } from "../../components/configSwizzleManager"
import { writeNewUserData } from "../../components/databaseHandler"
import { loadConfig } from "../mocks/configSwizzleManager"
import { sequentialUuid } from "../helpers/testHelpers.js"

type UserProfileTransientParams = {
    /** The game version the profile belongs to. Defaults to h3. */
    gameVersion: GameVersion
}

loadConfig("UserDefault")
loadConfig("LegacyUserDefault")

class UserProfileFactory extends Factory<
    UserProfile,
    UserProfileTransientParams
> {
    /**
     * Builds the profile a brand-new player would get on the given game version.
     */
    forVersion(gameVersion: GameVersion) {
        return this.transient({ gameVersion })
    }
}

/**
 * Builds a fresh user profile.
 *
 * - `build()` returns the profile without registering it anywhere.
 * - `create()` also registers it in the user data store, so code that goes
 *   through `getUserData` (inventory, progression, etc.) can find it. Pair it
 *   with `testWithFakeFs` so the store is in memory and torn down afterwards.
 */
export const userProfileFactory = UserProfileFactory.define(
    ({ sequence, transientParams, onCreate }) => {
        const gameVersion = transientParams.gameVersion ?? "h3"

        onCreate((profile) => {
            writeNewUserData(profile.Id, profile, gameVersion)
            return profile
        })

        const profile = getVersionedConfig<UserProfile>(
            "UserDefault",
            gameVersion,
            true,
        )
        profile.Id = sequentialUuid(sequence)

        return profile
    },
)
