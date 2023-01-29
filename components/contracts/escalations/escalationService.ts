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

import { contractIdToHitObject, controller } from "../../controller"
import type {
    EscalationInfo,
    GameVersion,
    IHit,
    UserProfile,
} from "../../types/types"
import { getUserData } from "../../databaseHandler"
import { log, LogLevel } from "../../loggingInterop"
import type { EscalationGroup } from "../escalationMappings"

/**
 * Put a level in here to hide it from the menus on 2016.
 * This should only be used if:
 *   - The content is custom.
 *   - The content is on a 2016 map.
 */
const no2016 = [
    "0cceeecb-c8fe-42a4-aee4-d7b575f56a1b",
    "9e0188e8-bdad-476c-b4ce-2faa5d2be56c",
    "115425b1-e797-47bf-b517-410dc7507397",
    "74415eca-d01e-4070-9bc9-5ef9b4e8f7d2",
]

/**
 * Gets a user's progress on the specified escalation's group ID.
 *
 * @param userData The user's profile object.
 * @param eGroupId The escalation's group ID.
 * @returns The level of the escalation the user is on.
 */
export function getUserEscalationProgress(
    userData: UserProfile,
    eGroupId: string,
): number {
    userData.Extensions.PeacockEscalations ??= { [eGroupId]: 1 }

    if (!userData.Extensions.PeacockEscalations[eGroupId]) {
        userData.Extensions.PeacockEscalations[eGroupId] = 1
        return 1
    }

    return userData.Extensions.PeacockEscalations[eGroupId]
}

/**
 * Resets a user's progress on the specified escalation.
 *
 * @param userData The user's profile object.
 * @param eGroupId The escalation's group ID.
 */
export function resetUserEscalationProgress(
    userData: UserProfile,
    eGroupId: string,
): void {
    userData.Extensions.PeacockEscalations ??= {}

    userData.Extensions.PeacockEscalations[eGroupId] = 1

    if (userData.Extensions.PeacockCompletedEscalations?.includes(eGroupId)) {
        userData.Extensions.PeacockCompletedEscalations =
            userData.Extensions.PeacockCompletedEscalations!.filter(
                (e) => e !== eGroupId,
            )
    }
}

/**
 * Translates a contract ID to the escalation group that it is in's ID.
 *
 * @param id The contract ID.
 * @returns The escalation's group ID or null if it isn't in a group.
 */
export function contractIdToEscalationGroupId(id: string): string | undefined {
    let name: string | undefined = undefined

    for (const groupId of Object.keys(controller.escalationMappings)) {
        for (const level of Object.keys(
            controller.escalationMappings[groupId],
        )) {
            if (controller.escalationMappings[groupId][level].includes(id)) {
                name = groupId
            }
        }
    }

    return name
}

export function getMenuDetailsForEscalation(
    eGroupId: string,
    userId: string,
    gameVersion: GameVersion,
): IHit | undefined {
    const userData = getUserData(userId, gameVersion)

    const level = getUserEscalationProgress(userData, eGroupId)
    const escalationGroup = controller.escalationMappings[eGroupId]

    if (gameVersion === "h1" && no2016.includes(eGroupId)) {
        return undefined
    }

    // not great for performance, but it's fine for now
    if (!controller.resolveContract(escalationGroup[level])) {
        return undefined
    }

    return contractIdToHitObject(escalationGroup[level], gameVersion, userId)
}

/**
 * Get the number of levels in the specified group.
 *
 * @param group The escalation group.
 * @returns The number of levels.
 */
export function getLevelCount(group: EscalationGroup): number {
    let levels = 1

    while (Object.prototype.hasOwnProperty.call(group, levels + 1)) {
        levels++
    }

    return levels
}

/**
 * Get the "play" escalation info.
 *
 * @param b Internal control for code cleanliness. Setting to false returns an empty object.
 * @param userId The current user's ID.
 * @param eGroupId The escalation's group ID.
 * @param gameVersion The game's version.
 * @returns The escalation play details.
 */
export function getPlayEscalationInfo(
    b: boolean,
    userId: string,
    eGroupId: string,
    gameVersion: GameVersion,
): EscalationInfo {
    if (!b) {
        return {}
    }

    const userData = getUserData(userId, gameVersion)

    const p = getUserEscalationProgress(userData, eGroupId)
    const group = controller.escalationMappings[eGroupId]

    const totalLevelCount = getLevelCount(
        controller.escalationMappings[eGroupId],
    )

    let nextContractId = "00000000-0000-0000-0000-000000000000"
    if (p < totalLevelCount) {
        nextContractId = group[p + 1]
    }

    log(
        LogLevel.DEBUG,
        `Get Play-EscalationInfo - group: ${eGroupId} prog: ${p} next: ${nextContractId}`,
    )

    return {
        Type: "escalation",
        InGroup: eGroupId,
        NextContractId: nextContractId,
        GroupData: {
            Level: p,
            TotalLevels: totalLevelCount,
            Completed:
                userData.Extensions.PeacockCompletedEscalations?.includes(
                    eGroupId,
                ) || false,
            FirstContractId: group[1],
        },
    }
}
