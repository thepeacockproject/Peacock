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

import type {
    ChallengeProgressionData,
    CompiledChallengeIngameData,
    RequestWithJwt,
} from "../types/types"
import { log, LogLevel } from "../loggingInterop"
import { getConfig } from "../configSwizzleManager"

import { Router } from "express"
import { controller } from "../controller"
import { json as jsonMiddleware } from "body-parser"
import { uuidRegex } from "../utils"
import { compileRuntimeChallenge } from "../candle/challengeHelpers"
import { GetChallengeProgressionBody } from "../types/gameSchemas"

const legacyProfileRouter = Router()

// /authentication/api/userchannel/

legacyProfileRouter.post(
    "/ChallengesService/GetActiveChallenges",
    jsonMiddleware(),
    // @ts-expect-error Has jwt props.
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
    // @ts-expect-error Has jwt props.
    (req: RequestWithJwt<never, GetChallengeProgressionBody>, res) => {
        if (!Array.isArray(req.body.challengeids)) {
            res.status(400).send("invalid body")
            return
        }

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

        for (const challengeId of req.body.challengeids) {
            const challenge = controller.challengeService.getChallengeById(
                challengeId,
                "h1",
            )

            if (!challenge) {
                log(
                    LogLevel.ERROR,
                    `Unknown challenge in LCSGP: ${challengeId}`,
                )
                continue
            }

            const progression =
                controller.challengeService.getPersistentChallengeProgression(
                    req.jwt.unique_name,
                    challengeId,
                    req.gameVersion,
                )

            challenges.push({
                ChallengeId: challengeId,
                ProfileId: req.jwt.unique_name,
                Completed: progression.Completed,
                Ticked: progression.Ticked,
                State: progression.State,
                ETag: `W/"datetime'${encodeURIComponent(
                    new Date().toISOString(),
                )}'"`,
                CompletedAt: progression.CompletedAt,
                MustBeSaved: progression.MustBeSaved,
            })
        }
        // TODO: HELP! Please DM rdil if you see this

        res.json(challenges)
    },
)

export { legacyProfileRouter }
