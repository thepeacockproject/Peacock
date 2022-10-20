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
    ChallengeProgressionData,
    CompiledChallengeIngameData,
    RequestWithJwt,
} from "../types/types"
import { log, LogLevel } from "../loggingInterop"
import { getConfig } from "../configSwizzleManager"

import { Router } from "express"
import { controller } from "../controller"
import { getPlatformEntitlements } from "../platformEntitlements"
import { json as jsonMiddleware } from "body-parser"
import { uuidRegex } from "../utils"
import { menuSystemDatabase } from "../menus/menuSystem"
import { compileRuntimeChallenge } from "../candle/challengeHelpers"
import { LegacyGetProgressionBody } from "../types/gameSchemas"

const legacyProfileRouter = Router()

// /authentication/api/userchannel/

legacyProfileRouter.post(
    "/ProfileService/GetPlatformEntitlements",
    jsonMiddleware(),
    getPlatformEntitlements,
)

legacyProfileRouter.post(
    "/AuthenticationService/GetBlobOfflineCacheDatabaseDiff",
    (req: RequestWithJwt, res) => {
        const configs = []

        menuSystemDatabase.hooks.getDatabaseDiff.call(configs, req.gameVersion)

        res.json(configs)
    },
)

legacyProfileRouter.post(
    "/ChallengesService/GetActiveChallenges",
    jsonMiddleware(),
    (req: RequestWithJwt, res) => {
        if (!uuidRegex.test(req.body.contractId)) {
            return res.status(404).send("invalid contract")
        }

        const legacyGlobalChallenges = getConfig<CompiledChallengeIngameData[]>(
            "LegacyGlobalChallenges",
            false,
        )

        const json = controller.resolveContract(req.body.contractId)

        if (!json) {
            log(
                LogLevel.ERROR,
                `Unknown contract in LGAC: ${req.body.contractId}`,
            )
            return res.status(404).send("contract not found")
        }

        if (json.Metadata.Type === "creation") {
            return res.json([])
        }

        const challenges: CompiledChallengeIngameData[] = legacyGlobalChallenges

        challenges.push(
            ...Object.values(
                controller.challengeService.getChallengesForContract(
                    json.Metadata.Id,
                    req.gameVersion,
                ),
            )
                .flat()
                .map(
                    (challengeData) =>
                        compileRuntimeChallenge(
                            challengeData,
                            controller.challengeService.getChallengeProgression(
                                req.jwt.unique_name,
                                challengeData.Id,
                                req.gameVersion,
                            ),
                        ).Challenge,
                ),
        )

        res.json(challenges)
    },
)

legacyProfileRouter.post(
    "/ChallengesService/GetProgression",
    jsonMiddleware(),
    (req: RequestWithJwt<never, LegacyGetProgressionBody>, res) => {
        const legacyGlobalChallenges = getConfig<CompiledChallengeIngameData[]>(
            "LegacyGlobalChallenges",
            false,
        )

        const challenges: ChallengeProgressionData[] =
            legacyGlobalChallenges.map((challenge) => ({
                ChallengeId: challenge.Id,
                ProfileId: req.jwt.unique_name,
                Completed: false,
                State: {},
                ETag: `W/"datetime'${encodeURIComponent(
                    new Date().toISOString(),
                )}'"`,
                CompletedAt: null,
                MustBeSaved: false,
            }))

        /*
        challenges.push(
            ...Object.values(
                controller.challengeService.getChallengesForContract(
                    req.body.contractId,
                    req.gameVersion,
                ),
            )
                .flat()
                .map((challengeData) =>
                    controller.challengeService.getChallengeProgression(
                        req.jwt.unique_name,
                        challengeData.Id,
                        req.gameVersion,
                    ),
                ),
        )
         */
        // TODO: atampy broke this - please fix
        //  (no contract ID given on this route!!)

        res.json(challenges)
    },
)

export { legacyProfileRouter }
