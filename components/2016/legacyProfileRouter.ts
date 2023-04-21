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
                    req.jwt.unique_name,
                ),
            )
                .flat()
                .map(
                    (challengeData) =>
                        compileRuntimeChallenge(
                            challengeData,
                            controller.challengeService.getPersistentChallengeProgression(
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
                // Here we don't care about "Ticked" and the client will ignore it
                Ticked: false,
                State: {},
                ETag: `W/"datetime'${encodeURIComponent(
                    new Date().toISOString(),
                )}'"`,
                CompletedAt: null,
                MustBeSaved: false,
            }))

        /*
        for (const challengeId of req.body.challengeids) {
            const challenge =
                controller.challengeService.getChallengeById(challengeId)

            if (!challenge) {
                log(
                    LogLevel.ERROR,
                    `Unknown challenge in LCSGP: ${challengeId}`,
                )
                continue
            }

            const progression =
                controller.challengeService.getChallengeProgression(
                    req.jwt.unique_name,
                    challengeId,
                    req.gameVersion,
                )

            challenges.push({
                ChallengeId: challengeId,
                ProfileId: req.jwt.unique_name,
                Completed: progression.Completed,
                State: progression.State,
                ETag: `W/"datetime'${encodeURIComponent(
                    new Date().toISOString(),
                )}'"`,
                CompletedAt: progression.CompletedAt,
                MustBeSaved: false,
            })
        }
         */
        // TODO: atampy broke this - please fix
        //      update(RD) nov 18 '22: fixed but still missing challenges in
        //      2016 engine (e.g. showstopper is missing 9, 5 of which are the
        //      classics I think, not sure about the other 4)

        res.json(challenges)
    },
)

export { legacyProfileRouter }
