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

import { getSubLocationByName } from "../contracts/dataGen"
import { controller } from "../controller"
import { getUnlockablesById, grantDrops } from "../inventory"
import type {
    ContractSession,
    GameVersion,
    ProgressionData,
    Unlockable,
    UserProfile,
} from "../types/types"
import {
    clampValue,
    DEFAULT_MASTERY_MAXLEVEL,
    evergreenLevelForXp,
    getMaxProfileLevel,
    levelForXp,
    sniperLevelForXp,
    xpRequiredForEvergreenLevel,
    xpRequiredForLevel,
    xpRequiredForSniperLevel,
} from "../utils"
import { writeUserData } from "../databaseHandler"
import { MasteryPackageDrop } from "../types/mastery"
import assert from "assert"

export class ProgressionService {
    // NOTE: Official will always grant XP to both Location Mastery and the Player Profile
    grantProfileProgression(
        actionXp: number,
        masteryXp: number,
        dropIds: string[],
        contractSession: ContractSession,
        userProfile: UserProfile,
        location: string,
        subPackage?: string,
    ): void {
        // Total XP for profile XP is the total sum of the action and mastery XP
        const xp = actionXp + masteryXp

        // Grants profile XP, if this is at contract end where we're adding the final
        // sniper score, don't grant it to the profile, otherwise you'll get 1,000+ levels.
        if (!subPackage) {
            this.grantUserXp(xp, contractSession, userProfile)
        }

        // Grants Mastery Progression and Drops
        this.grantLocationMasteryXpAndRewards(
            masteryXp,
            actionXp,
            contractSession,
            userProfile,
            location,
            subPackage,
        )

        // Award provided drops. E.g. From challenges. Don't run this function
        // if there aren't any drops being granted.
        if (dropIds.length > 0) {
            grantDrops(
                userProfile.Id,
                getUnlockablesById(dropIds, contractSession.gameVersion).filter(
                    Boolean,
                ) as Unlockable[],
            )
        }

        // Saves profile data
        writeUserData(userProfile.Id, contractSession.gameVersion)
    }

    // Returns current mastery progression for given location
    getMasteryProgressionForLocation(
        userProfile: UserProfile,
        location: string,
        subPkgId?: string,
    ): ProgressionData | undefined {
        const theLocation =
            userProfile.Extensions.progression.Locations[location]

        assert.ok(theLocation, `Location ${location} not found in user data`)

        return subPkgId
            ? // @ts-expect-error It is possible to index into an object with a string
              theLocation[subPkgId]
            : theLocation
    }

    // Return mastery drops from location from a level range
    private getLocationMasteryDrops(
        gameVersion: GameVersion,
        isEvergreenContract: boolean,
        masteryLocationDrops: MasteryPackageDrop[],
        minLevel: number,
        maxLevel: number,
    ): Unlockable[] {
        const unlockableIds = masteryLocationDrops
            .filter((drop) => drop.Level > minLevel && drop.Level <= maxLevel)
            .map((drop) => drop.Id)

        const unlockables = getUnlockablesById(unlockableIds, gameVersion)

        /**
         * If missions type is evergreen, checks if any of the unlockables has unlockable gear, and award those too
         *
         * This is required to unlock the item to the normal inventory too, as the freelancer and normal inventory item ID is not the same
         */
        if (isEvergreenContract) {
            const evergreenGearUnlockables = unlockables.reduce(
                (acc: string[], u) => {
                    if (u?.Properties.Unlocks) acc.push(...u.Properties.Unlocks)
                    return acc
                },
                [],
            )

            if (evergreenGearUnlockables.length) {
                unlockables.push(
                    ...getUnlockablesById(
                        evergreenGearUnlockables,
                        gameVersion,
                    ),
                )
            }
        }

        return unlockables.filter((u) => !!u) as Unlockable[]
    }

    // Grants xp and rewards to mastery progression on contract location
    private grantLocationMasteryXpAndRewards(
        masteryXp: number,
        actionXp: number,
        contractSession: ContractSession,
        userProfile: UserProfile,
        location: string,
        sniperUnlockable?: string,
    ): void {
        const contract = controller.resolveContract(contractSession.contractId)

        if (!contract) {
            return
        }

        const subLocation = getSubLocationByName(
            location ?? contract.Metadata.Location,
            contractSession.gameVersion,
        )

        const parentLocationId = subLocation
            ? subLocation.Properties?.ParentLocation
            : location ?? contract.Metadata.Location

        if (!parentLocationId) {
            return
        }

        // We can't grant sniper XP here as it's based on final score, so we skip updating mastery
        // until we call this in mission end.
        if (contract.Metadata.Type !== "sniper" || sniperUnlockable) {
            const masteryData = controller.masteryService.getMasteryPackage(
                parentLocationId,
                contractSession.gameVersion,
            )
            const locationData = this.getMasteryProgressionForLocation(
                userProfile,
                parentLocationId,
                contractSession.gameVersion === "h1"
                    ? contract.Metadata.Difficulty ?? "normal"
                    : sniperUnlockable ?? undefined,
            )

            const maxLevel = masteryData?.MaxLevel || DEFAULT_MASTERY_MAXLEVEL
            const isEvergreenContract = contract.Metadata.Type === "evergreen"

            if (masteryData) {
                assert.ok(locationData, `location ${location} not found`)
                const previousLevel = locationData.Level

                locationData.Xp = clampValue(
                    locationData.Xp + masteryXp + actionXp,
                    0,
                    isEvergreenContract
                        ? xpRequiredForEvergreenLevel(maxLevel)
                        : sniperUnlockable
                          ? xpRequiredForSniperLevel(maxLevel)
                          : xpRequiredForLevel(maxLevel),
                )

                locationData.Level = clampValue(
                    isEvergreenContract
                        ? evergreenLevelForXp(locationData.Xp)
                        : sniperUnlockable
                          ? sniperLevelForXp(locationData.Xp)
                          : levelForXp(locationData.Xp),
                    1,
                    maxLevel,
                )

                // If mastery level has gone up, check if there are available drop rewards and award them
                if (locationData.Level > previousLevel) {
                    const masteryLocationDrops = this.getLocationMasteryDrops(
                        contractSession.gameVersion,
                        isEvergreenContract,
                        sniperUnlockable
                            ? masteryData.SubPackages?.find(
                                  (pkg) => pkg.Id === sniperUnlockable,
                              )?.Drops || []
                            : masteryData.Drops || [],
                        previousLevel,
                        locationData.Level,
                    ).filter(Boolean) as Unlockable[]
                    grantDrops(userProfile.Id, masteryLocationDrops)
                }
            }

            // Update the EvergreenLevel with the latest Mastery Level
            if (isEvergreenContract) {
                assert.ok(
                    contract.Metadata.CpdId,
                    "evergreen contract has no CPD",
                )

                userProfile.Extensions.CPD[contract.Metadata.CpdId][
                    "EvergreenLevel"
                ] = locationData?.Level ?? 0
            }
        }

        // Update the SubLocation data
        const profileData = userProfile.Extensions.progression.PlayerProfileXP

        profileData.Sublocations[contract.Metadata.Location] ??= {
            Xp: 0,
            ActionXp: 0,
        }

        profileData.Sublocations[contract.Metadata.Location].Xp += masteryXp
        profileData.Sublocations[contract.Metadata.Location].ActionXp +=
            actionXp
    }

    // Grants xp to user profile
    // TODO: Combine with grantLocationMasteryXp?
    private grantUserXp(
        xp: number,
        contractSession: ContractSession,
        userProfile: UserProfile,
    ): void {
        const profileData = userProfile.Extensions.progression.PlayerProfileXP

        profileData.Total += xp
        profileData.ProfileLevel = clampValue(
            levelForXp(profileData.Total),
            1,
            getMaxProfileLevel(contractSession.gameVersion),
        )
    }
}
