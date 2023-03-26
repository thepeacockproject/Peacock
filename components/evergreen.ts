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

import { getUserData, writeUserData } from "./databaseHandler"
import { getConfig } from "./configSwizzleManager"
import { ContractProgressionData } from "./types/types"
import { getFlag } from "./flags"

export async function setCpd(
    data: ContractProgressionData,
    uID: string,
    cpdID: string,
) {
    const userData = getUserData(uID, "h3")

    userData.Extensions.CPD[cpdID] = {
        ...userData.Extensions.CPD[cpdID],
        ...data,
    }

    await writeUserData(uID, "h3")
}

export async function getCpd(
    uID: string,
    cpdID: string,
): Promise<ContractProgressionData> {
    const userData = getUserData(uID, "h3")

    if (!Object.keys(userData.Extensions.CPD).includes(cpdID)) {
        const defaultCPD = getConfig(
            "DefaultCpdConfig",
            false,
        ) as ContractProgressionData

        //NOTE: Override the EvergreenLevel with the latest Mastery Level
        if (getFlag("gameplayUnlockAllFreelancerMasteries")) {
            //TODO: Get rid of hardcoded values
            userData.Extensions.CPD[cpdID]["EvergreenLevel"] = 100
        }

        await setCpd(defaultCPD, uID, cpdID)
        return defaultCPD
    }

    //NOTE: Override the EvergreenLevel with the latest Mastery Level
    if (getFlag("gameplayUnlockAllFreelancerMasteries")) {
        //TODO: Get rid of hardcoded values
        userData.Extensions.CPD[cpdID]["EvergreenLevel"] = 100
    }

    return userData.Extensions.CPD[cpdID]
}
