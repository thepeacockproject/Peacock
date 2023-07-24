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

import { CompletionData, GameVersion, Unlockable } from "./types"

export interface MasteryDataTemplate {
    template: unknown
    data: {
        Location: Unlockable
        MasteryData: MasteryData[]
    }
}

export interface MasteryPackageDrop {
    Id: string
    Level: number
}

interface MasterySubPackage {
    Id: string
    MaxLevel?: number
    Drops: MasteryPackageDrop[]
}

/**
 * @since v7.0.0
 * The Id field has been renamed to LocationId to properly reflect what it is.
 *
 * Mastery packages may have Drops OR SubPackages, never the two.
 * This is to properly support sniper mastery by integrating it into the current system
 * and mastery on H2016 as it is separated by difficulty.
 *
 * Also, a GameVersions array has been added to support multi-version mastery.
 */
export interface MasteryPackage {
    LocationId: string
    GameVersions: GameVersion[]
    MaxLevel?: number
    HideProgression?: boolean
    Drops?: MasteryPackageDrop[]
    SubPackages?: MasterySubPackage[]
}

export interface MasteryData {
    CompletionData: CompletionData
    Drops: MasteryDrop[]
    Unlockable?: Unlockable
}

export interface MasteryDrop {
    IsLevelMarker: boolean
    Unlockable: Unlockable
    Level: number
    IsLocked: boolean
    TypeLocaKey: string
}

export interface UnlockableMasteryData {
    Location: string
    SubPackageId?: string
    Level: number
}
