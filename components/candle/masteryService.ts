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
    getParentLocationByName,
    getSubLocationByName,
} from "../contracts/dataGen"
import { log, LogLevel } from "../loggingInterop"
import { getConfig, getVersionedConfig } from "../configSwizzleManager"
import { getUserData } from "../databaseHandler"
import {
    MasteryData,
    MasteryDataTemplate,
    MasteryDrop,
    MasteryPackage,
    MasteryPackageDrop,
    UnlockableMasteryData,
} from "../types/mastery"
import { CompletionData, GameVersion, Unlockable } from "../types/types"
import {
    clampValue,
    DEFAULT_MASTERY_MAXLEVEL,
    isSniperLocation,
    xpRequiredForEvergreenLevel,
    xpRequiredForLevel,
    xpRequiredForSniperLevel,
} from "../utils"

import { getUnlockablesById } from "../inventory"

export class MasteryService {
    /**
     * @Key1 Game version.
     * @Key2 The parent location Id.
     * @Value A `MasteryPackage` object.
     */
    protected masteryPackages: Map<GameVersion, Map<string, MasteryPackage>> =
        new Map([
            ["h1", new Map()],
            ["h2", new Map()],
            ["h3", new Map()],
            ["scpc", new Map()],
        ])
    /**
     * @Key1 Game version.
     * @Key2 Unlockable Id.
     * @Value A `MasteryPackage` object.
     */
    private unlockableMasteryData: Map<
        string,
        Map<string, UnlockableMasteryData>
    > = new Map([
        ["h1", new Map()],
        ["h2", new Map()],
        ["h3", new Map()],
        ["scpc", new Map()],
    ])

    registerMasteryData(masteryPackage: MasteryPackage) {
        for (const gv of masteryPackage.GameVersions) {
            this.masteryPackages
                .get(gv)
                .set(masteryPackage.LocationId, masteryPackage)

            /**
             * Generates the same data in a reverse order. It could be considered redundant but this allows for
             * faster access to location and level based on unlockable ID, avoiding big-O operation for `getMasteryForUnlockable`
             */
            if (masteryPackage.SubPackages) {
                for (const subPkg of masteryPackage.SubPackages) {
                    for (const drop of subPkg.Drops) {
                        this.unlockableMasteryData.get(gv).set(drop.Id, {
                            Location: masteryPackage.LocationId,
                            SubPackageId: subPkg.Id,
                            Level: drop.Level,
                        })
                    }
                }
            } else {
                for (const drop of masteryPackage.Drops) {
                    this.unlockableMasteryData.get(gv).set(drop.Id, {
                        Location: masteryPackage.LocationId,
                        Level: drop.Level,
                    })
                }
            }
        }
    }

    /**
     * Returns mastery data for unlockable, if there's any
     * @param unlockable
     * @param gameVersion
     * @returns { Location: string, Level: number  } | undefined
     */
    getMasteryForUnlockable(
        unlockable: Unlockable,
        gameVersion: GameVersion,
    ): UnlockableMasteryData | undefined {
        return this.unlockableMasteryData.get(gameVersion).get(unlockable.Id)
    }

    getMasteryDataForDestination(
        locationParentId: string,
        gameVersion: GameVersion,
        userId: string,
        difficulty?: string,
    ): MasteryData[] {
        return this.getMasteryData(
            locationParentId,
            gameVersion,
            userId,
            difficulty,
        )
    }

    getMasteryDataForSubPackage(
        locationParentId: string,
        subPackageId: string,
        gameVersion: GameVersion,
        userId: string,
    ): MasteryData {
        // Since we're getting a subpackage, we know there will only be one entry in this array.
        // If the array is empty it will return undefined.
        return this.getMasteryData(
            locationParentId,
            gameVersion,
            userId,
            subPackageId,
        )[0]
    }

    getMasteryDataForLocation(
        locationId: string,
        gameVersion: GameVersion,
        userId: string,
    ): MasteryDataTemplate {
        const location: Unlockable =
            getSubLocationByName(locationId, gameVersion) ??
            getParentLocationByName(locationId, gameVersion)

        const masteryDataTemplate: MasteryDataTemplate =
            getConfig<MasteryDataTemplate>(
                "MasteryDataForLocationTemplate",
                false,
            )

        const masteryData = this.getMasteryData(
            location.Properties.ParentLocation ?? location.Id,
            gameVersion,
            userId,
        )

        return {
            template: masteryDataTemplate,
            data: {
                Location: location,
                MasteryData: masteryData,
            },
        }
    }

    /**
     * Get generic completion data stored in a user's profile. Called by both `getLocationCompletion` and `getFirearmCompletion`.
     * @param userId The id of the user.
     * @param gameVersion The game version.
     * @param locationParentId The location's parent ID, used for progression storage @since v7.0.0
     * @param maxLevel The max level for this progression.
     * @param levelToXpRequired A function to get the XP required for a level.
     * @param subPackageId? The subpackage id you want.
     */
    private getCompletionData(
        userId: string,
        gameVersion: GameVersion,
        locationParentId: string,
        maxLevel: number,
        levelToXpRequired: (level: number) => number,
        subPackageId?: string,
    ) {
        // Get the user profile
        const userProfile = getUserData(userId, gameVersion)

        // @since v7.0.0 this has been commented out as the default profile should
        // have all the required properties - AF
        /* userProfile.Extensions.progression.Locations[locationParentId] ??= {
            Xp: 0,
            Level: 1,
            PreviouslySeenXp: 0,
        } */

        const completionData = subPackageId
            ? userProfile.Extensions.progression.Locations[locationParentId][
                  subPackageId
              ]
            : userProfile.Extensions.progression.Locations[locationParentId]

        const nextLevel: number = clampValue(
            completionData.Level + 1,
            1,
            maxLevel,
        )

        const nextLevelXp: number = levelToXpRequired(nextLevel)

        const thisLevelXp: number = levelToXpRequired(completionData.Level)

        return {
            Level: completionData.Level,
            MaxLevel: maxLevel,
            XP: completionData.Xp,
            PreviouslySeenXp: completionData.PreviouslySeenXp,
            Completion:
                (completionData.Xp - thisLevelXp) / (nextLevelXp - thisLevelXp),
            XpLeft: nextLevelXp - completionData.Xp,
        }
    }

    /**
     * Get the completion data for a location.
     * @param locationParentId The parent Id of the location.
     * @param subLocationId The id of the sublocation.
     * @param gameVersion The game version.
     * @param userId The id of the user.
     * @param contractType The type of the contract, only used to distinguish evergreen from other types (default).
     * @param subPackageId? The id of the subpackage you want.
     * @returns The CompletionData object.
     */
    getLocationCompletion(
        locationParentId: string,
        subLocationId: string,
        gameVersion: GameVersion,
        userId: string,
        contractType = "mission",
        subPackageId?: string,
    ): CompletionData {
        // Get the mastery data
        const masteryPkg = this.getMasteryPackage(locationParentId, gameVersion)

        // We use the result from this function a bit, so we're just caching it
        const isSniper = isSniperLocation(locationParentId)

        if (!masteryPkg || (masteryPkg.SubPackages && !subPackageId)) {
            return undefined
        }

        const subPackage = masteryPkg.SubPackages
            ? masteryPkg.SubPackages.filter((pkg) => pkg.Id === subPackageId)[0]
            : undefined

        if (!subPackage && subPackageId) {
            return undefined
        }

        // TODO: Refactor this into the new inventory system?
        const name = isSniper
            ? getVersionedConfig<Unlockable[]>(
                  "SniperUnlockables",
                  gameVersion,
                  false,
              ).find((unlockable) => unlockable.Id === subPackageId).Properties
                  .Name
            : undefined

        return {
            ...this.getCompletionData(
                userId,
                gameVersion,
                locationParentId,
                (subPackage ? subPackage.MaxLevel : masteryPkg.MaxLevel) ||
                    DEFAULT_MASTERY_MAXLEVEL,
                contractType === "sniper"
                    ? xpRequiredForSniperLevel
                    : contractType === "evergreen"
                    ? xpRequiredForEvergreenLevel
                    : xpRequiredForLevel,
                subPackageId,
            ),
            Id: isSniper ? subPackageId : masteryPkg.LocationId,
            SubLocationId: isSniper ? "" : subLocationId,
            HideProgression: masteryPkg.HideProgression || false,
            IsLocationProgression: !isSniper,
            Name: name,
        }
    }

    getMasteryPackage(
        locationParentId: string,
        gameVersion: GameVersion,
    ): MasteryPackage {
        if (!this.masteryPackages.get(gameVersion).has(locationParentId)) {
            return undefined
        }

        return this.masteryPackages.get(gameVersion).get(locationParentId)
    }

    private processDrops(
        curLevel: number,
        drops: MasteryPackageDrop[],
        unlockableMap: Map<string, Unlockable>,
    ): MasteryDrop[] {
        return drops
            .filter((drop) => {
                if (!unlockableMap.has(drop.Id)) {
                    log(LogLevel.DEBUG, `No unlockable found for ${drop.Id}`)

                    return false
                }

                return true
            })
            .map((drop) => {
                const unlockable: Unlockable = unlockableMap.get(drop.Id)

                return {
                    IsLevelMarker: false,
                    Unlockable: unlockable,
                    Level: drop.Level,
                    IsLocked: drop.Level > curLevel,
                    TypeLocaKey: `UI_MENU_PAGE_MASTERY_UNLOCKABLE_NAME_${unlockable.Type}`,
                }
            })
    }

    private getMasteryData(
        locationParentId: string,
        gameVersion: GameVersion,
        userId: string,
        subPackageId?: string,
    ): MasteryData[] {
        // Get the mastery data
        const masteryPkg: MasteryPackage = this.getMasteryPackage(
            locationParentId,
            gameVersion,
        )

        if (!masteryPkg || (!masteryPkg.Drops && !masteryPkg.SubPackages)) {
            return []
        }

        // We use the result from this function a lot in here, so we're just "caching" it
        const isSniper = isSniperLocation(locationParentId)

        // Put all Ids into a set for quick lookup
        let dropIdSet = undefined

        if (masteryPkg.SubPackages) {
            dropIdSet = new Set(
                masteryPkg.SubPackages.map((pkg) =>
                    subPackageId && pkg.Id !== subPackageId
                        ? []
                        : pkg.Drops.map((drop) => drop.Id),
                ).reduce((a, e) => a.concat(e)),
            )

            // Add the main unlockable to the set to generate the page properly
            if (isSniper) {
                masteryPkg.SubPackages.forEach((pkg) => dropIdSet.add(pkg.Id))
            }

            if (!dropIdSet || dropIdSet.size === 0) {
                log(
                    LogLevel.ERROR,
                    "Unknown subPackageId specified for location",
                )

                return []
            }
        } else {
            dropIdSet = new Set(masteryPkg.Drops.map((drop) => drop.Id))
        }

        // Get all unlockables with matching Ids
        const unlockableData: Unlockable[] = getUnlockablesById(
            Array.from(dropIdSet),
            gameVersion,
        )

        // Put all unlockabkes in a map for quick lookup
        const unlockableMap = new Map(
            unlockableData.map((unlockable) => [unlockable.Id, unlockable]),
        )

        const masteryData: MasteryData[] = []

        if (masteryPkg.SubPackages) {
            for (const subPkg of masteryPkg.SubPackages) {
                if (subPackageId && subPkg.Id !== subPackageId) continue

                const completionData = this.getLocationCompletion(
                    locationParentId,
                    locationParentId,
                    gameVersion,
                    userId,
                    isSniper
                        ? "sniper"
                        : locationParentId.includes("SNUG")
                        ? "evergreen"
                        : "mission",
                    subPkg.Id,
                )

                masteryData.push({
                    CompletionData: completionData,
                    Drops: this.processDrops(
                        completionData.Level,
                        subPkg.Drops,
                        unlockableMap,
                    ),
                    Unlockable: isSniper
                        ? unlockableMap.get(subPkg.Id)
                        : undefined,
                })
            }
        } else {
            // All sniper locations are subpackages, so we don't need to add "sniper"
            // to the contractType expression.
            const completionData = this.getLocationCompletion(
                locationParentId,
                locationParentId,
                gameVersion,
                userId,
                locationParentId.includes("SNUG") ? "evergreen" : "mission",
            )

            masteryData.push({
                CompletionData: completionData,
                Drops: this.processDrops(
                    completionData.Level,
                    masteryPkg.Drops,
                    unlockableMap,
                ),
            })
        }

        return masteryData
    }
}
