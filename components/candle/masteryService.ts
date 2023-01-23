import { getSubLocationByName } from "components/contracts/dataGen"
import { log, LogLevel } from "components/loggingInterop"
import { getConfig, getVersionedConfig } from "../configSwizzleManager"
import { getUserData } from "../databaseHandler"
import {
    MasteryData,
    MasteryDataTemplate,
    MasteryDrop,
    MasteryPackage,
} from "../types/mastery"
import { CompletionData, GameVersion, Unlockable } from "../types/types"
import { xpRequiredForLevel } from "../utils"

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

    getCompletionData(
        locationParentId: string,
        subLocationId: string,
        gameVersion: GameVersion,
        userId: string,
    ): CompletionData {
        if (!this.masteryData.has(locationParentId)) {
            return undefined
        }

        //Get the mastery data
        const masteryData: MasteryPackage =
            this.masteryData.get(locationParentId)

        //Get the user profile
        const userProfile = getUserData(userId, gameVersion)

        //Gather all required data
        const lowerCaseLocationParentId = locationParentId.toLowerCase()

        userProfile.Extensions.progression.Locations[
            lowerCaseLocationParentId
        ] ??= {
            Xp: 0,
            Level: 1,
        }

        const locationData =
            userProfile.Extensions.progression.Locations[
                lowerCaseLocationParentId
            ]

        const maxLevel = masteryData.MaxLevel || 20

        const nextLevel: number = Math.max(
            0,
            Math.min(locationData.Level + 1, maxLevel),
        )
        const nextLevelXp: number = xpRequiredForLevel(nextLevel)

        return {
            Level: locationData.Level,
            MaxLevel: maxLevel,
            XP: locationData.Xp,
            Completion: locationData.Xp / nextLevelXp,
            XpLeft: nextLevelXp - locationData.Xp,
            Id: masteryData.Id,
            SubLocationId: subLocationId,
            HideProgression: masteryData.HideProgression || false,
            IsLocationProgression: true,
            Name: undefined,
        }
    }

    private getMasteryData(
        locationParentId: string,
        gameVersion: GameVersion,
        userId: string,
    ): MasteryData[] {
        if (!this.masteryData.has(locationParentId)) {
            return []
        }

        //Get the mastery data
        const masteryData: MasteryPackage =
            this.masteryData.get(locationParentId)

        if (masteryData.Drops.length === 0) {
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
        const completionData = this.getCompletionData(
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
