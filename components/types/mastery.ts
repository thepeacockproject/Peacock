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

import { CompletionData, GameVersion, Unlockable } from "./types"

export type LocationMasteryData = {
    Location: Unlockable
    MasteryData: MasteryData[]
}

export type MasteryPackageDrop = {
    Id: string
    Level: number
}

export type MasterySubPackage = {
    Id: string
    MaxLevel?: number
    Drops: MasteryPackageDrop[]
}

/**
 * @since v7.0.0
 * The Id field has been renamed to LocationId to properly reflect what it is.
 *
 * Mastery packages may have Drops OR SubPackages, never both.
 * This is to properly support sniper mastery by integrating it into the current system
 * and mastery on H2016 as it is separated by difficulty.
 *
 * Also, a GameVersions array has been added to support multi-version mastery.
 */
export type MasteryPackage = {
    LocationId: string
    GameVersions: GameVersion[]
    MaxLevel?: number
    XpPerLevel?: number
    HideProgression?: boolean
} & (MasteryPackageDropExt | MasteryPackageSubPackageExt)

/**
 * Extends {@link MasteryPackage} with the `Drops` field.
 */
export type MasteryPackageDropExt = {
    Drops: MasteryPackageDrop[]
    SubPackages?: never
}

/**
 * Extends {@link MasteryPackage} with the `SubPackages` field.
 */
export type MasteryPackageSubPackageExt = {
    Drops?: never
    SubPackages: MasterySubPackage[]
}

export type MasteryData = {
    CompletionData: CompletionData
    Drops: MasteryDrop[]
    Unlockable?: Unlockable
}

export type MasteryDrop = {
    IsLevelMarker: boolean
    Unlockable: Unlockable
    Level: number
    IsLocked: boolean
    TypeLocaKey: string
}

export type UnlockableMasteryData = {
    Location: string
    SubPackageId?: string
    Level: number
}

export type GenericCompletionData = Omit<
    CompletionData,
    | "Id"
    | "SubLocationId"
    | "HideProgression"
    | "IsLocationProgression"
    | "Name"
>
