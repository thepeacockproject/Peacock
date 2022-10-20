/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2022 The Peacock Project Team
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

import type {
    GameVersion,
    MissionManifest,
    RequestWithJwt,
    Unlockable,
    UserCentricContract,
} from "../types/types"
import { controller } from "../controller"
import { generateUserCentric } from "../contracts/dataGen"
import { getUserData, writeUserData } from "../databaseHandler"
import { getConfig, getVersionedConfig } from "../configSwizzleManager"
import type { Response } from "express"

export function withLookupDialog(
    req: RequestWithJwt<{ contractId: string }>,
    res: Response,
): void {
    const lookupFavoriteTemplate = getConfig(
        "LookupContractFavoriteTemplate",
        false,
    )

    if (!req.query.contractId) {
        res.status(400).send("no contract id")
        return
    }

    const contract = controller.resolveContract(req.query.contractId)

    if (!contract) {
        res.status(404).send("contract does not exist!")
        return
    }

    interface Result {
        template: unknown
        data: {
            Contract: MissionManifest
            UserCentricContract: UserCentricContract
            Location: unknown
            AddedSuccessfully?: boolean
        }
    }

    const sublocation = getVersionedConfig<readonly Unlockable[]>(
        "allunlockables",
        req.gameVersion,
        false,
    ).find((entry) => entry.Id === contract.Metadata.Location)

    const result: Result = {
        template: lookupFavoriteTemplate,
        data: {
            Contract: contract,
            Location: sublocation,
            UserCentricContract: generateUserCentric(
                contract,
                req.jwt.unique_name,
                req.gameVersion,
            ),
        },
    }

    result.data.AddedSuccessfully = toggleFavorite(
        req.jwt.unique_name,
        req.query.contractId,
        req.gameVersion,
    )

    res.json(result)
}

/**
 * Toggles a contract as a user's favorite.
 *
 * @param userId The user's ID.
 * @param contractId The contract's ID.
 * @param gameVersion The game's version.
 * @returns If the contract is a favorite after the operation or not.
 */
export function toggleFavorite(
    userId: string,
    contractId: string,
    gameVersion: GameVersion,
): boolean {
    let flag = false
    const userProfile = getUserData(userId, gameVersion)

    if (!Array.isArray(userProfile.Extensions.PeacockFavoriteContracts)) {
        userProfile.Extensions.PeacockFavoriteContracts = []
    }

    if (userProfile.Extensions.PeacockFavoriteContracts.includes(contractId)) {
        userProfile.Extensions.PeacockFavoriteContracts =
            userProfile.Extensions.PeacockFavoriteContracts.filter(
                (f) => f !== contractId,
            )
    } else {
        userProfile.Extensions.PeacockFavoriteContracts.push(contractId)
        flag = true
    }

    writeUserData(userId, gameVersion)
    return flag
}

export function directRoute(req: RequestWithJwt, res: Response): void {
    if (!req.params.contractId) {
        res.status(400).send("no contract id")
        return
    }

    const contract = controller.resolveContract(req.params.contractId)

    if (!contract) {
        res.status(404).send("contract does not exist!")
        return
    }

    res.json({
        template: null,
        data: {
            ContractId: req.params.contractId,
            IsInPlaylist: toggleFavorite(
                req.jwt.unique_name,
                req.params.contractId,
                req.gameVersion,
            ),
        },
    })
}
