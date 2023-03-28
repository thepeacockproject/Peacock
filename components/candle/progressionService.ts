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
import { controller } from "../controller"
import { awardDropsToUser, getDataForUnlockables } from "../inventory"
import type {
    ContractSession,
    UserProfile,
    Unlockable,
    GameVersion,
} from "../types/types"
import {
    DEFAULT_MASTERY_MAXLEVEL,
    clampValue,
    xpRequiredForLevel,
    xpRequiredForEvergreenLevel,
    levelForXp,
    evergreenLevelForXp,
    getMaxProfileLevel,
} from "../utils"
import { writeUserData } from "../databaseHandler"

export class ProgressionService {
    grantProfileProgression(
        actionXp: number,
        masteryXp: number,
        challengeDrops: Unlockable[],
        contractSession: ContractSession,
        userProfile: UserProfile,
    ) {
        // Grants profile XP
        this.grantUserXp(actionXp + masteryXp, contractSession, userProfile)

        // Grants Mastery Progression and Drops
        this.grantLocationMasteryXpAndRewards(
            masteryXp,
            actionXp,
            contractSession,
            userProfile,
        )

        // Grants challenge related drops
        awardDropsToUser(userProfile.Id, challengeDrops)

        // Saves profile data
        writeUserData(userProfile.Id, contractSession.gameVersion)
    }

    // Returns current mastery progression for given location
    getMasteryProgressionForLocation(
        userProfile: UserProfile,
        location: string,
    ) {
        return (userProfile.Extensions.progression.Locations[
            location.toLocaleLowerCase()
        ] ??= {
            Xp: 0,
            Level: 1,
        })
    }

    // Return mastery drops from location from a level range
    private getLocationMasteryDrops(
        gameVersion: GameVersion,
        isEvergreenContract: boolean,
        masteryLocationDrops: {
            Id: string
            Level: number
        }[],
        minLevel: number,
        maxLevel: number,
    ) {
        const unlockableIds = masteryLocationDrops
            .filter((drop) => drop.Level > minLevel && drop.Level <= maxLevel)
            .map((drop) => drop.Id)

        const unlockables = getDataForUnlockables(gameVersion, unlockableIds)

        /**
         * If missions type is evergreen, checks if any of the unlockables has unlockable gear, and award those too
         *
         * This is required to unlock the item to the normal inventory too, as the freelancer and normal inventory item ID is not the same
         */
        if (isEvergreenContract) {
            const evergreenGearUnlockables = unlockables.reduce((acc, u) => {
                if (u.Properties.Unlocks) acc.push(...u.Properties.Unlocks)
                return acc
            }, [])
            evergreenGearUnlockables.length &&
                unlockables.push(
                    ...getDataForUnlockables(
                        gameVersion,
                        evergreenGearUnlockables,
                    ),
                )
        }

        return unlockables
    }

    // Grants xp and rewards to mastery progression on contract location
    private grantLocationMasteryXpAndRewards(
        masteryXp: number,
        actionXp: number,
        contractSession: ContractSession,
        userProfile: UserProfile,
    ): boolean {
        const contract = controller.resolveContract(contractSession.contractId)

        if (!contract) {
            return false
        }

        const subLocation = getSubLocationByName(
            contract.Metadata.Location,
            contractSession.gameVersion,
        )

        const parentLocationId = subLocation
            ? subLocation.Properties?.ParentLocation
            : contract.Metadata.Location

        if (!parentLocationId) {
            return false
        }

        const masteryData =
            controller.masteryService.getMasteryPackage(parentLocationId)

        const locationData = this.getMasteryProgressionForLocation(
            userProfile,
            parentLocationId.toLocaleLowerCase(),
        )

        const maxLevel = masteryData?.MaxLevel || DEFAULT_MASTERY_MAXLEVEL
        const isEvergreenContract = contract.Metadata.Type !== "evergreen"

        if (masteryData) {
            const previousLevel = locationData.Level

            locationData.Xp = clampValue(
                locationData.Xp + masteryXp + actionXp,
                0,
                isEvergreenContract
                    ? xpRequiredForEvergreenLevel(maxLevel)
                    : xpRequiredForLevel(maxLevel),
            )

            locationData.Level = clampValue(
                isEvergreenContract
                    ? evergreenLevelForXp(locationData.Xp)
                    : levelForXp(locationData.Xp),
                1,
                maxLevel,
            )

            // If mastery level has gone up, check if there are available drop rewards and award them
            if (locationData.Level > previousLevel) {
                const masteryLocationDrops = this.getLocationMasteryDrops(
                    contractSession.gameVersion,
                    isEvergreenContract,
                    masteryData.Drops,
                    previousLevel,
                    locationData.Level,
                )
                awardDropsToUser(userProfile.Id, masteryLocationDrops)
            }
        }

        //Update the SubLocation data
        const profileData = userProfile.Extensions.progression.PlayerProfileXP

        let foundSubLocation = profileData.Sublocations.find(
            (e) => e.Location === parentLocationId,
        )

        if (!foundSubLocation) {
            foundSubLocation = {
                Location: parentLocationId,
                Xp: 0,
                ActionXp: 0,
            }

            profileData.Sublocations.push(foundSubLocation)
        }

        foundSubLocation.Xp += masteryXp
        foundSubLocation.ActionXp += actionXp

        //Update the EvergreenLevel with the latest Mastery Level
        if (isEvergreenContract) {
            userProfile.Extensions.CPD[contract.Metadata.CpdId][
                "EvergreenLevel"
            ] = locationData.Level
        }

        return true
    }

    // Grants xp to user profile
    //TODO: Combine with grantLocationMasteryXp?
    private grantUserXp(
        xp: number,
        contractSession: ContractSession,
        userProfile: UserProfile,
    ): boolean {
        const profileData = userProfile.Extensions.progression.PlayerProfileXP

        profileData.Total += xp
        profileData.ProfileLevel = clampValue(
            levelForXp(profileData.Total),
            1,
            getMaxProfileLevel(contractSession.gameVersion),
        )

        return true
    }
}
