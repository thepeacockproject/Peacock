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

import { RequestWithJwt } from "../types/types"
import { contractSessions } from "../eventHandler"
import { getUserData } from "../databaseHandler"
import {
    calculateMpScore,
    getMultiplayerLoadoutData,
    MultiplayerScore,
} from "./multiplayerUtils"
import { Router } from "express"
import { getConfig } from "../configSwizzleManager"
import { MultiplayerPreset } from "./multiplayerService"
import { generateUserCentric } from "../contracts/dataGen"
import { controller } from "../controller"
import {
    MissionEndRequestQuery,
    MultiplayerMatchStatsQuery,
    MultiplayerQuery,
} from "../types/gameSchemas"

export const multiplayerMenuDataRouter = Router()

multiplayerMenuDataRouter.post(
    "/multiplayermatchstatsready",
    // @ts-expect-error Has JWT data.
    (req: RequestWithJwt<MissionEndRequestQuery>, res) => {
        res.json({
            template: null,
            data: {
                contractSessionId: req.query.contractSessionId,
                isReady: true,
                retryCount: 1,
            },
        })
    },
)

multiplayerMenuDataRouter.post(
    "/multiplayermatchstats",
    // @ts-expect-error Has JWT data.
    (req: RequestWithJwt<MultiplayerMatchStatsQuery>, res) => {
        const sessionDetails = contractSessions.get(
            req.query.contractSessionId || "",
        )

        if (!sessionDetails) {
            // contract session not found
            res.status(404).end()
            return
        }

        const scores: MultiplayerScore[] = [calculateMpScore(sessionDetails)]

        if (!sessionDetails.ghost) {
            throw new Error("no mp details on mp session")
        }

        for (const opponentId in sessionDetails.ghost.Opponents) {
            const opponentSessionDetails = contractSessions.get(
                sessionDetails.ghost.Opponents[opponentId],
            )

            if (opponentSessionDetails) {
                scores.push(calculateMpScore(opponentSessionDetails))
            } else {
                // opponent contract session not found
                scores.push({})
            }
        }

        res.json({
            template: null,
            data: {
                Players: scores,
            },
        })
    },
)

type MultiplayerPresetsQuery = {
    gamemode?: string
    disguiseUnlockableId?: string
}

multiplayerMenuDataRouter.get(
    "/multiplayerpresets",
    // @ts-expect-error Has JWT data.
    (req: RequestWithJwt<MultiplayerPresetsQuery>, res) => {
        if (req.query.gamemode !== "versus") {
            res.status(400).send("unknown gamemode")
            return
        }

        req.query.disguiseUnlockableId ??= "TOKEN_OUTFIT_HITMANSUIT"

        const presets = getConfig<MultiplayerPreset[]>(
            "MultiplayerPresets",
            false,
        )

        const userData = getUserData(req.jwt.unique_name, req.gameVersion)

        const contractIds: Set<string> = new Set()

        for (const preset of presets) {
            for (const contractId of preset.Data.Contracts) {
                contractIds.add(contractId)
            }
        }

        res.json({
            template: null,
            data: {
                Presets: presets,
                UserCentricContracts: [...contractIds].map((contractId) => {
                    return generateUserCentric(
                        controller.resolveContract(contractId, req.gameVersion),
                        req.jwt.unique_name,
                        req.gameVersion,
                    )
                }),
                LoadoutData: getMultiplayerLoadoutData(
                    userData,
                    req.query.disguiseUnlockableId,
                    req.gameVersion,
                ),
            },
        })
    },
)

multiplayerMenuDataRouter.get(
    "/multiplayer",
    // @ts-expect-error Has JWT data.
    (req: RequestWithJwt<MultiplayerQuery>, res) => {
        // /multiplayer?gamemode=versus&disguiseUnlockableId=TOKEN_OUTFIT_ELUSIVE_COMPLETE_15_SUIT
        if (req.query.gamemode !== "versus") {
            res.status(400).send("unknown gamemode")
            return
        }

        req.query.disguiseUnlockableId ??= "TOKEN_OUTFIT_HITMANSUIT"

        const userData = getUserData(req.jwt.unique_name, req.gameVersion)

        res.json({
            template: null,
            data: {
                LoadoutData: getMultiplayerLoadoutData(
                    userData,
                    req.query.disguiseUnlockableId,
                    req.gameVersion,
                ),
            },
        })
    },
)
