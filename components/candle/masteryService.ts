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

import { getSubLocationByName } from "../contracts/dataGen"
import { log, LogLevel } from "../loggingInterop"
import { getConfig, getVersionedConfig } from "../configSwizzleManager"
import { getUserData } from "../databaseHandler"
import {
    MasteryData,
    MasteryDataTemplate,
    MasteryDrop,
    MasteryPackage,
} from "../types/mastery"
import { CompletionData, GameVersion, Unlockable } from "../types/types"
import {
    clampValue,
    DEFAULT_MASTERY_MAXLEVEL,
    xpRequiredForLevel,
    xpRequiredForSniper,
    XP_PER_LEVEL,
} from "../utils"

export class MasteryService {
    private masteryData: Map<string, MasteryPackage> = new Map()

    registerMasteryData(masteryPackage: MasteryPackage) {
        this.masteryData.set(masteryPackage.Id, masteryPackage)
    }

    getMasteryDataForDestination(
        locationParentId: string,
        gameVersion: GameVersion,
        userId: string,
    ): MasteryData[] {
        return this.getMasteryData(locationParentId, gameVersion, userId)
    }

    getMasteryDataForLocation(
        locationId: string,
        gameVersion: GameVersion,
        userId: string,
    ): MasteryDataTemplate {
        const subLocation: Unlockable = getSubLocationByName(
            locationId,
            gameVersion,
        )

        const masteryDataTemplate: MasteryDataTemplate =
            getConfig<MasteryDataTemplate>(
                "MasteryDataForLocationTemplate",
                true,
            )

        const masteryData = this.getMasteryData(
            subLocation.Properties.ParentLocation,
            gameVersion,
            userId,
        )

        return {
            template: masteryDataTemplate,
            data: {
                Location: subLocation,
                MasteryData: masteryData,
            },
        }
    }

    /**
     * Get generic completion data stored in a user's profile. Called by both `getLocationCompletion` and `getFirearmCompletion`.
     * @param userId The id of the user.
     * @param gameVersion The game version.
     * @param completionId An Id used to look up completion data in the user's profile. Can be `parentLocationId` or `progressionKey`.
     * @param maxLevel The max level for this progression.
     */
    private getCompletionData(
        userId: string,
        gameVersion: GameVersion,
        completionId: string,
        maxLevel: number,
    ) {
        //Get the user profile
        const userProfile = getUserData(userId, gameVersion)

        // Generate default completion before trying to acquire it
        userProfile.Extensions.progression.Locations[completionId] ??= {
            Xp: 0,
            Level: 1,
        }

        const locationData =
            userProfile.Extensions.progression.Locations[completionId]

        const nextLevel: number = clampValue(
            locationData.Level + 1,
            1,
            maxLevel,
        )

        const nextLevelXp: number = completionId.includes("LOCATION")
            ? xpRequiredForLevel(nextLevel)
            : xpRequiredForSniper(nextLevel)

        return {
            Level: locationData.Level,
            MaxLevel: maxLevel,
            XP: locationData.Xp,
            Completion:
                (XP_PER_LEVEL - (nextLevelXp - locationData.Xp)) / XP_PER_LEVEL,
            XpLeft: nextLevelXp - locationData.Xp,
        }
    }

    /**
     * Get the completion data for a location.
     * @param locationParentId The parent Id of the location.
     * @param subLocationId The id of the sublocation.
     * @param gameVersion The game version.
     * @param userId The id of the user.
     * @returns The CompletionData object.
     */
    getLocationCompletion(
        locationParentId: string,
        subLocationId: string,
        gameVersion: GameVersion,
        userId: string,
    ): CompletionData {
        //Get the mastery data
        const masteryData: MasteryPackage =
            this.getMasteryPackage(locationParentId)

        if (!masteryData) {
            return undefined
        }

        return {
            ...this.getCompletionData(
                userId,
                gameVersion,
                locationParentId.toLowerCase(),
                masteryData.MaxLevel || DEFAULT_MASTERY_MAXLEVEL,
            ),
            Id: masteryData.Id,
            SubLocationId: subLocationId,
            HideProgression: masteryData.HideProgression || false,
            IsLocationProgression: true,
            Name: undefined,
        }
    }

    /**
     * Get the completion data for a firearm. Used for sniper assassin mastery.
     * @param progressionKey The Id of the progression. E.g. FIREARMS_SC_HERO_SNIPER_HM.
     * @param unlockableName The name of the unlockable.
     * @param userId The id of the user.
     * @param gameVersion The game version.
     * @returns The CompletionData object.
     */
    getFirearmCompletion(
        progressionKey: string,
        unlockableName: string,
        userId: string,
        gameVersion: GameVersion,
    ): CompletionData {
        return {
            ...this.getCompletionData(userId, gameVersion, progressionKey, 20),
            Id: progressionKey,
            SubLocationId: "",
            HideProgression: false,
            IsLocationProgression: false,
            Name: unlockableName,
        }
    }

    getMasteryPackage(locationParentId: string): MasteryPackage {
        if (!this.masteryData.has(locationParentId)) {
            return undefined
        }

        return this.masteryData.get(locationParentId)
    }

    private getMasteryData(
        locationParentId: string,
        gameVersion: GameVersion,
        userId: string,
    ): MasteryData[] {
        //Get the mastery data
        const masteryData: MasteryPackage =
            this.getMasteryPackage(locationParentId)

        if (!masteryData || masteryData.Drops.length === 0) {
            return []
        }

        //Put all Ids into a set for quick lookup
        const dropIdSet = new Set(masteryData.Drops.map((drop) => drop.Id))

        //Get all unlockables with matching Ids
        const unlockableData: Unlockable[] = getVersionedConfig<Unlockable[]>(
            "allunlockables",
            gameVersion,
            true,
        ).filter((unlockable) => dropIdSet.has(unlockable.Id))

        //Put all unlockabkes in a map for quick lookup
        const unlockableMap = new Map(
            unlockableData.map((unlockable) => [unlockable.Id, unlockable]),
        )

        //Map all the data into a new structure
        const completionData = this.getLocationCompletion(
            locationParentId,
            locationParentId,
            gameVersion,
            userId,
        )

        const drops: MasteryDrop[] = masteryData.Drops.filter((drop) => {
            if (!unlockableMap.has(drop.Id)) {
                log(LogLevel.DEBUG, `No unlockable found for ${drop.Id}`)

                return false
            }

            return true
        }).map((drop) => {
            const unlockable: Unlockable = unlockableMap.get(drop.Id)

            return {
                IsLevelMarker: false,
                Unlockable: unlockable,
                Level: drop.Level,
                IsLocked: drop.Level > completionData.Level,
                TypeLocaKey: `UI_MENU_PAGE_MASTERY_UNLOCKABLE_NAME_${unlockable.Type}`,
            }
        })

        return [
            {
                CompletionData: completionData,
                Drops: drops,
            },
        ]
    }
}
