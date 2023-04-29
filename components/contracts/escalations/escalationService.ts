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

import { controller } from "../../controller"
import type {
    EscalationInfo,
    GameVersion,
    MissionManifest,
    MissionType,
    UserProfile,
} from "../../types/types"
import { getUserData } from "../../databaseHandler"
import { log, LogLevel } from "../../loggingInterop"

/**
 * Put a group id in here to hide it from the menus on 2016.
 * This should only be used if:
 *   - The content is custom.
 *   - The content is on a 2016 map.
 */
export const no2016 = [
    "0cceeecb-c8fe-42a4-aee4-d7b575f56a1b",
    "9e0188e8-bdad-476c-b4ce-2faa5d2be56c",
    "115425b1-e797-47bf-b517-410dc7507397",
    "74415eca-d01e-4070-9bc9-5ef9b4e8f7d2",
    "07bbf22b-d6ae-4883-bec2-122eeeb7b665",
]

/**
 * An array of contract types to determine whether the escalation service
 * should be used.
 */
export const escalationTypes: MissionType[] = ["escalation", "arcade"]

/**
 * Gets a user's progress on the specified escalation's group ID.
 *
 * @param userData The user's profile object.
 * @param groupContractId The escalation's group contract ID.
 * @returns The level of the escalation the user is on.
 */
export function getUserEscalationProgress(
    userData: UserProfile,
    groupContractId: string,
): number {
    userData.Extensions.PeacockEscalations ??= { [groupContractId]: 1 }

    if (!userData.Extensions.PeacockEscalations[groupContractId]) {
        userData.Extensions.PeacockEscalations[groupContractId] = 1
        return 1
    }

    return userData.Extensions.PeacockEscalations[groupContractId]
}

/**
 * Resets a user's progress on the specified escalation.
 *
 * @param userData The user's profile object.
 * @param groupContractId The escalation's group contract ID.
 */
export function resetUserEscalationProgress(
    userData: UserProfile,
    groupContractId: string,
): void {
    userData.Extensions.PeacockEscalations ??= {}

    userData.Extensions.PeacockEscalations[groupContractId] = 1

    if (
        userData.Extensions.PeacockCompletedEscalations?.includes(
            groupContractId,
        )
    ) {
        userData.Extensions.PeacockCompletedEscalations =
            userData.Extensions.PeacockCompletedEscalations!.filter(
                (e) => e !== groupContractId,
            )
    }
}

/**
 * Get the number of levels in the specified group.
 *
 * @param groupContract The escalation group's contract.
 * @returns The number of levels.
 */
export function getLevelCount(groupContract: MissionManifest): number {
    return groupContract.Metadata.GroupDefinition.Order.length
}

/**
 * Get the "play" escalation info.
 *
 * @param userId The current user's ID.
 * @param groupContractId The escalation's group contract ID.
 * @param gameVersion The game's version.
 * @returns The escalation play details.
 */
export function getPlayEscalationInfo(
    userId: string,
    groupContractId: string,
    gameVersion: GameVersion,
): EscalationInfo {
    const userData = getUserData(userId, gameVersion)

    const p = getUserEscalationProgress(userData, groupContractId)
    const groupCt = controller.escalationMappings.get(groupContractId)

    const totalLevelCount = getLevelCount(
        controller.resolveContract(groupContractId),
    )

    let nextContractId = "00000000-0000-0000-0000-000000000000"

    if (p < totalLevelCount) {
        nextContractId = groupCt[p + 1]
    }

    log(
        LogLevel.DEBUG,
        `Get Play-EscalationInfo - group: ${groupContractId} prog: ${p} next: ${nextContractId}`,
    )

    return {
        InGroup: groupContractId,
        NextContractId: nextContractId,
        GroupData: {
            Level: p,
            TotalLevels: totalLevelCount,
            Completed:
                userData.Extensions.PeacockCompletedEscalations?.includes(
                    groupContractId,
                ) || false,
            FirstContractId: groupCt[1],
        },
    }
}
