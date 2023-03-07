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

import {
    ContextScopedStorageLocation,
    GameVersion,
    InclusionData,
    MissionManifestObjective,
} from "./types"

export interface SavedChallenge {
    Id: string
    Name: string
    ImageName: string
    Description: string
    Rewards: {
        MasteryXP: number
    }
    Drops: string[]
    IsPlayable: boolean
    IsLocked: boolean
    HideProgression: boolean
    CategoryName: string
    Icon: string
    LocationId: string
    ParentLocationId: string
    Type: "Hit" | string
    RuntimeType: "contract" | string
    XpModifier?: unknown
    DifficultyLevels: string[]
    Definition: MissionManifestObjective["Definition"] & {
        Scope: ContextScopedStorageLocation
    }
    Tags: string[]
    InclusionData?: InclusionData
}

export interface SavedChallengeGroup {
    Name: string
    Image: string
    Icon: string
    CategoryId: string
    Description: string
    Challenges: SavedChallenge[]
}

export interface ChallengePackage {
    groups: SavedChallengeGroup[]
    meta: {
        /**
         * The parent location.
         */
        Location: string
        GameVersion: GameVersion
    }
}

export type ProfileChallengeData = {
    Ticked: boolean
    Completed: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    State: any
}
