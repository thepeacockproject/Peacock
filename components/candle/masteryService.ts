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

import {
    getParentLocationByName,
    getSubLocationByName,
} from "../contracts/dataGen"
import { log, LogLevel } from "../loggingInterop"
import { getConfig } from "../configSwizzleManager"
import { getUserData } from "../databaseHandler"
import {
    GenericCompletionData,
    LocationMasteryData,
    MasteryData,
    MasteryDrop,
    MasteryPackage,
    MasteryPackageDrop,
    UnlockableMasteryData,
} from "../types/mastery"
import {
    CompletionData,
    GameVersion,
    ProgressionData,
    Unlockable,
} from "../types/types"
import {
    clampValue,
    DEFAULT_MASTERY_MAXLEVEL,
    isSniperLocation,
    xpRequiredForEvergreenLevel,
    xpRequiredForLevel,
    xpRequiredForSniperLevel,
} from "../utils"

import { getUnlockablesById } from "../inventory"
import assert from "assert"

export class MasteryService {
    /**
     * @Key1 Game version.
     * @Key2 The parent location Id.
     * @Value A `MasteryPackage` object.
     */
    protected masteryPackages: Record<
        GameVersion,
        Map<string, MasteryPackage>
    > = {
        h1: new Map(),
        h2: new Map(),
        h3: new Map(),
        scpc: new Map(),
    }
    /**
     * @Key1 Game version.
     * @Key2 Unlockable Id.
     * @Value A `UnlockableMasteryData` object.
     */
    private unlockableMasteryData: Record<
        GameVersion,
        Map<string, UnlockableMasteryData>
    > = {
        h1: new Map(),
        h2: new Map(),
        h3: new Map(),
        scpc: new Map(),
    }

    registerMasteryData(masteryPackage: MasteryPackage) {
        for (const gv of masteryPackage.GameVersions) {
            this.masteryPackages[gv].set(
                masteryPackage.LocationId,
                masteryPackage,
            )
        }
    }

    /**
     * Generates mastery data in a reverse order. It uses already registered
     * mastery packages, so MUST be rerun when changing mastery data.
     * This could be considered redundant, but this allows for faster access to
     * location and level based on unlockable ID, avoiding big-O operation for `getMasteryForUnlockable`.
     * @param gameVersions Game version(s) to process.
     */
    rebuildDropIndexes(...gameVersions: GameVersion[]) {
        for (const gv of gameVersions) {
            this.unlockableMasteryData[gv] = new Map()

            for (const pkg of this.masteryPackages[gv].values()) {
                if (pkg.SubPackages) {
                    for (const subPkg of pkg.SubPackages) {
                        for (const drop of subPkg.Drops) {
                            this.unlockableMasteryData[gv].set(drop.Id, {
                                Location: pkg.LocationId,
                                SubPackageId: subPkg.Id,
                                Level: drop.Level,
                            })
                        }
                    }
                } else {
                    for (const drop of pkg.Drops) {
                        this.unlockableMasteryData[gv].set(drop.Id, {
                            Location: pkg.LocationId,
                            Level: drop.Level,
                        })
                    }
                }
            }
        }
    }

    /**
     * Returns mastery data for unlockable, if there's any
     * @param unlockable
     * @param gameVersion
     */
    getMasteryForUnlockable(
        unlockable: Unlockable,
        gameVersion: GameVersion,
    ): UnlockableMasteryData | undefined {
        return this.unlockableMasteryData[gameVersion].get(unlockable.Id)
    }

    getMasteryDataForSubPackage(
        locationParentId: string,
        subPackageId: string,
        gameVersion: GameVersion,
        userId: string,
    ): MasteryData {
        // Since we're getting a subpackage, we know there will only be one entry in this array.
        // If the array is empty it will return undefined.
        return this.getMasteryDataForDestination(
            locationParentId,
            gameVersion,
            userId,
            subPackageId,
        )[0]
    }

    /**
     * Returns mastery data for a location (either a parent or sub-location). For mastery data of a destination, use {@link getMasteryDataForDestination}.
     * @param locationId The location's ID.
     * @param gameVersion The game version.
     * @param userId The user's ID.
     * @returns The mastery data.
     */
    getMasteryDataForLocation(
        locationId: string,
        gameVersion: GameVersion,
        userId: string,
    ): LocationMasteryData {
        const location =
            getSubLocationByName(locationId, gameVersion) ??
            getParentLocationByName(locationId, gameVersion)

        assert.ok(location, "cannot get mastery data for unknown location")

        const masteryData = this.getMasteryDataForDestination(
            location.Properties.ParentLocation ?? location.Id,
            gameVersion,
            userId,
        )

        return {
            Location: location,
            MasteryData: masteryData,
        }
    }

    /**
     * Get generic completion data stored in a user's profile.
     * @param userId The id of the user.
     * @param gameVersion The game version.
     * @param locationParentId The location's parent ID, used for progression storage @since v7.0.0
     * @param maxLevel The max level for this progression.
     * @param levelToXpRequired A function to get the XP required for a level.
     * @param subPackageId The subpackage id you want.
     * @param xpPerLevel The amount of XP required to level up, passed to `levelToXpRequired` function.
     * @returns The completion data, minus any location-specific fields.
     */
    private getGenericCompletionData(
        userId: string,
        gameVersion: GameVersion,
        locationParentId: string,
        maxLevel: number,
        levelToXpRequired: (level: number, xpPerLevel?: number) => number,
        subPackageId?: string,
        xpPerLevel?: number,
    ): GenericCompletionData {
        // Get the user profile
        const userProfile = getUserData(userId, gameVersion)

        assert.ok(userProfile, `user profile ${userId} not found`)

        const parent =
            userProfile.Extensions.progression.Locations[locationParentId]

        assert.ok(parent, `parent ${locationParentId} not found`)

        const completionData: ProgressionData = subPackageId
            ? (parent[subPackageId as keyof typeof parent] as ProgressionData)
            : (parent as ProgressionData)

        const nextLevel: number = clampValue(
            completionData.Level + 1,
            1,
            maxLevel,
        )

        const nextLevelXp: number = levelToXpRequired(nextLevel, xpPerLevel)

        const thisLevelXp: number = levelToXpRequired(
            completionData.Level,
            xpPerLevel,
        )

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
     * @param subPackageId The id of the subpackage you want.
     * @returns The CompletionData object.
     */
    getLocationCompletion(
        locationParentId: string,
        subLocationId: string,
        gameVersion: GameVersion,
        userId: string,
        contractType = "mission",
        subPackageId?: string,
    ): CompletionData | undefined {
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
            ? getConfig<Unlockable[]>("SniperUnlockables", false).find(
                  (unlockable) => unlockable.Id === subPackageId,
              )?.Properties.Name
            : null

        if (isSniper) {
            assert.ok(name, `unlockable ${subPackageId} not found`)
        }

        return {
            ...this.getGenericCompletionData(
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
                masteryPkg.XpPerLevel,
            ),
            Id: isSniper ? subPackageId! : masteryPkg.LocationId,
            SubLocationId: isSniper ? "" : subLocationId,
            HideProgression: masteryPkg.HideProgression || false,
            IsLocationProgression: !isSniper,
            Name: name!,
        }
    }

    getMasteryPackage(
        locationParentId: string,
        gameVersion: GameVersion,
    ): MasteryPackage | undefined {
        return this.masteryPackages[gameVersion].get(locationParentId)
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
                const unlockable: Unlockable = unlockableMap.get(drop.Id)!

                return {
                    IsLevelMarker: false,
                    Unlockable: unlockable,
                    Level: drop.Level,
                    IsLocked: drop.Level > curLevel,
                    TypeLocaKey: `UI_MENU_PAGE_MASTERY_UNLOCKABLE_NAME_${unlockable.Type}`,
                }
            })
    }

    getMasteryDataForDestination(
        locationParentId: string,
        gameVersion: GameVersion,
        userId: string,
        subPackageId?: string,
    ): MasteryData[] {
        // Get the mastery data
        const masteryPkg: MasteryPackage | undefined = this.getMasteryPackage(
            locationParentId,
            gameVersion,
        )

        if (!masteryPkg || (!masteryPkg.Drops && !masteryPkg.SubPackages)) {
            return []
        }

        // We use the result from this function a lot in here, so we're just "caching" it
        const isSniper = isSniperLocation(locationParentId)

        // Put all Ids into a set for quick lookup
        let dropIdSet: Set<string>

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
                for (const pkg of masteryPkg.SubPackages) {
                    dropIdSet.add(pkg.Id)
                }
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
        const unlockableData = getUnlockablesById(
            Array.from(dropIdSet),
            gameVersion,
        )

        // Put all unlockabkes in a map for quick lookup
        const mapped: [string, Unlockable][] = unlockableData.map(
            (unlockable) => {
                return [unlockable?.Id, unlockable] as unknown as [
                    string,
                    Unlockable,
                ]
            },
        )

        const unlockableMap: Map<string, Unlockable> = new Map(mapped)

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

                if (completionData) {
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

            if (completionData) {
                masteryData.push({
                    CompletionData: completionData,
                    Drops: this.processDrops(
                        completionData.Level,
                        masteryPkg.Drops || [],
                        unlockableMap,
                    ),
                })
            }
        }

        return masteryData
    }
}
