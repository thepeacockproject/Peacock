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

import { GameVersion, Unlockable } from "./types/types"
import { getVersionedConfig } from "./configSwizzleManager"
import { log, LogLevel } from "./loggingInterop"

/**
 * We use maps here instead of objects because we don't want V8 to fall back to
 * slow property lookups.
 */
const caches: Record<GameVersion, Map<string, Unlockable>> = {
    scpc: new Map<string, Unlockable>(),
    h1: new Map<string, Unlockable>(),
    h2: new Map<string, Unlockable>(),
    h3: new Map<string, Unlockable>(),
}

/**
 * Get an unlockable by its ID, lazy-loading the unlockable cache if necessary.
 *
 * @param id The unlockable's ID.
 * @param gameVersion The current game version.
 * @see getUnlockablesById
 */
export function getUnlockableById(
    id: string,
    gameVersion: GameVersion,
): Unlockable | undefined {
    if (caches[gameVersion].size === 0) {
        // no data is loaded yet (to save memory), so load it now
        const unlockables = getVersionedConfig<readonly Unlockable[]>(
            "allunlockables",
            gameVersion,
            false,
        )

        for (const unlockable of unlockables) {
            caches[gameVersion].set(unlockable.Id, unlockable)
        }

        log(
            LogLevel.DEBUG,
            `Lazy-loaded ${unlockables.length} unlockables for ${gameVersion}`,
        )
    }

    return caches[gameVersion].get(id)
}

/**
 * Multi-getter for unlockables.
 *
 * @param ids The unlockable IDs to get.
 * @param gameVersion The current game version.
 * @see getUnlockableById
 */
export function getUnlockablesById(
    ids: string[],
    gameVersion: GameVersion,
): (Unlockable | undefined)[] {
    return ids.map((id) => getUnlockableById(id, gameVersion))
}
