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

import { Router } from "express"
import {
    contractTypes,
    fastClone,
    nilUuid,
    ServerVer,
    uuidRegex,
} from "../utils"
import { json as jsonMiddleware } from "body-parser"
import {
    enqueueEvent,
    getSession,
    newSession,
    registerObjectiveListener,
    setupScoring,
} from "../eventHandler"
import { controller } from "../controller"
import { getConfig } from "../configSwizzleManager"
import type {
    CreateFromParamsBody,
    GameChanger,
    MissionManifest,
    MissionManifestObjective,
    MissionStory,
    RequestWithJwt,
} from "../types/types"
import {
    escalationTypes,
    getPlayEscalationInfo,
} from "./escalations/escalationService"
import { log, LogLevel } from "../loggingInterop"
import { randomUUID } from "crypto"
import {
    createTimeLimit,
    TargetCreator,
} from "../statemachines/contractCreation"
import { createSniperLoadouts } from "../menus/sniper"
import { GetForPlay2Body } from "../types/gameSchemas"
import assert from "assert"
import { getUserData } from "../databaseHandler"
import { getCpd } from "../evergreen"

const contractRoutingRouter = Router()

contractRoutingRouter.post(
    "/GetForPlay2",
    jsonMiddleware(),
    async (req: RequestWithJwt<never, GetForPlay2Body>, res) => {
        if (!req.body.id || !uuidRegex.test(req.body.id)) {
            res.status(400).end()
            return // user sent some nasty info
        }

        const contractData = controller.resolveContract(req.body.id)

        if (!contractData) {
            log(
                LogLevel.ERROR,
                `Requested unknown contract in GetForPlay2: ${req.body.id}`,
            )
            res.status(404).end()
            return
        }

        const sniperloadouts = createSniperLoadouts(
            req.jwt.unique_name,
            req.gameVersion,
            contractData,
        )
        const loadoutData = {
            CharacterLoadoutData:
                sniperloadouts.length !== 0 ? sniperloadouts : null,
        }

        // Add escalation data to Contract data HERE
        contractData.Metadata = {
            ...contractData.Metadata,
            ...(escalationTypes.includes(contractData.Metadata.Type)
                ? getPlayEscalationInfo(
                      req.jwt.unique_name,
                      contractData.Metadata.InGroup,
                      req.gameVersion,
                  )
                : {}),
            ...loadoutData,
            ...{
                OpportunityData: getContractOpportunityData(req, contractData),
            },
        }

        // Edit usercreated contract data HERE
        if (contractTypes.includes(contractData.Metadata.Type)) {
            contractData.Data.EnableSaving = false
        }

        // Edit elusive contract data HERE

        const contractSesh = {
            Contract: contractData,
            ContractSessionId: `${process.hrtime
                .bigint()
                .toString()}-${randomUUID()}`,
            ContractProgressionData: contractData.Metadata
                .UseContractProgressionData
                ? await getCpd(req.jwt.unique_name, contractData.Metadata.CpdId)
                : null,
        }

        if (
            contractData.Data.GameChangers &&
            contractData.Data.GameChangers.length > 0
        ) {
            type GCPConfig = Record<string, GameChanger>

            const gameChangerData: GCPConfig = {
                ...getConfig<GCPConfig>("GameChangerProperties", true),
                ...getConfig<GCPConfig>("PeacockGameChangerProperties", true),
                ...getConfig<GCPConfig>("EvergreenGameChangerProperties", true),
            }

            contractData.Data.GameChangerReferences =
                contractData.Data.GameChangerReferences || []

            for (const gameChangerId of contractData.Data.GameChangers) {
                if (
                    !Object.prototype.hasOwnProperty.call(
                        gameChangerData,
                        gameChangerId,
                    )
                ) {
                    log(
                        LogLevel.ERROR,
                        `GetForPlay has detected a missing GameChanger: ${gameChangerId}! This is a bug.`,
                    )
                }

                const gameChanger = gameChangerData[gameChangerId]
                gameChanger.Id = gameChangerId
                delete gameChanger.ObjectivesCategory

                if (
                    contractData.Data.GameChangerReferences.filter(
                        (value) => value.Id === gameChangerId,
                    ).length !== 0
                ) {
                    continue
                }

                contractData.Data.GameChangerReferences.push(gameChanger)
                contractData.Data.Bricks = [
                    ...(contractData.Data.Bricks ?? []),
                    ...(gameChanger.Resource ?? []),
                ]
                contractData.Data.Objectives = [
                    ...(contractData.Data.Objectives ?? []),
                    ...(gameChanger.Objectives.map((val) => {
                        if (contractData.Metadata.Type !== "evergreen")
                            return val

                        return {
                            ...val,
                            GameChangerName: gameChanger.Name,
                            IsPrestigeObjective:
                                gameChanger.IsPrestigeObjective ?? false,
                        }
                    }) ?? []),
                ]
            }
        }

        enqueueEvent(req.jwt.unique_name, {
            Version: ServerVer,
            IsReplicated: false,
            CreatedContract: null,
            Id: randomUUID(),
            Name: "ContractSessionMarker",
            UserId: nilUuid,
            ContractId: nilUuid,
            SessionId: null,
            ContractSessionId: contractSesh.ContractSessionId,
            Timestamp: 0.0,
            Value: {
                Currency: {
                    ContractPaymentAllowed: true,
                    ContractPayment: null,
                },
            },
            Origin: null,
        })

        res.json(contractSesh)
        newSession(
            contractSesh.ContractSessionId,
            contractSesh.Contract.Metadata.Id,
            req.jwt.unique_name,
            req.body.difficultyLevel!,
            req.gameVersion,
        )

        const theSession = getSession(req.jwt.unique_name)

        assert.ok(theSession, "Session should exist")

        for (const obj of contractData.Data.Objectives || []) {
            // register the objective as a tracked statemachine
            registerObjectiveListener(theSession, obj)
        }

        if (contractData.Metadata.Modules) {
            setupScoring(theSession, contractData.Metadata.Modules)
        }
    },
)

contractRoutingRouter.post(
    "/CreateFromParams",
    jsonMiddleware(),
    async (
        req: RequestWithJwt<Record<never, never>, CreateFromParamsBody>,
        res,
    ) => {
        const gameChangerData = getConfig<Record<string, GameChanger>>(
            "GameChangerProperties",
            true,
        )

        const objectives: MissionManifestObjective[] = []
        const gamechangers: string[] = []
        const sessionDetails = getSession(req.jwt.unique_name)

        if (!sessionDetails) {
            res.status(400).end()
            log(
                LogLevel.WARN,
                `CreateFromParams called without a valid session`,
            )
            return
        }

        // I'm using Math.ceil here to round the time to the nearest next full second
        // IOI servers don't do this, but that means that the displayed time in the objective
        // is not accurate with the actual time limit.
        // If you change this, also change it in menuData.ts
        const timeLimit = Math.ceil(
            (sessionDetails.timerEnd as number) -
                (sessionDetails.timerStart as number),
        )

        const contractData = controller.resolveContract(
            sessionDetails.contractId,
        )

        if (!contractData) {
            res.status(400).end()
            log(
                LogLevel.ERROR,
                `No such contract creation contract: ${sessionDetails.contractId}`,
            )
            return
        }

        req.body.creationData.Targets.forEach((target) => {
            if (!target.Selected) {
                return
            }

            objectives.push(...new TargetCreator(target).build())
        })

        req.body.creationData.ContractConditionIds.forEach(
            (contractConditionId) => {
                if (
                    Object.prototype.hasOwnProperty.call(
                        gameChangerData,
                        contractConditionId,
                    )
                ) {
                    gamechangers.push(contractConditionId)
                } else if (
                    contractConditionId ===
                    "1a596216-381e-4592-9798-26f156973942"
                ) {
                    // Optional time limit
                    objectives.push(createTimeLimit(timeLimit, true))
                } else if (
                    contractConditionId ===
                    "3d6f9119-7ec8-496f-ab4c-ed9757d976a4"
                ) {
                    // Mandatory time limit
                    objectives.push(createTimeLimit(timeLimit, false))
                }
            },
        )

        const theVersion = `${ServerVer._Major}.${ServerVer._Minor}.${ServerVer._Build}.${ServerVer._Revision}`

        const manifest: MissionManifest = {
            Data: {
                Objectives: objectives,
                GameChangers: gamechangers,
                Bricks: [],
            },
            Metadata: {
                Title: req.body.creationData.Title,
                Description: req.body.creationData.Description,
                Entitlements: contractData.Metadata.Entitlements,
                ScenePath: contractData.Metadata.ScenePath,
                Location: contractData.Metadata.Location,
                IsPublished: true,
                CreatorUserId: "fadb923c-e6bb-4283-a537-eb4d1150262e",
                GameVersion: theVersion,
                ServerVersion: theVersion,
                Type: "usercreated",
                Id: req.body.creationData.ContractId,
                PublicId: req.body.creationData.ContractPublicId,
                TileImage: `$($repository ${req.body.creationData.Targets[0]?.RepositoryId}).Image`,
                GroupObjectiveDisplayOrder: req.body.creationData.Targets.map(
                    (t) => ({
                        Id: t.RepositoryId,
                    }),
                ),
                CreationTimestamp: new Date().toISOString(),
            },
            UserData: {},
        }

        await controller.commitNewContract(manifest)
        res.json(manifest)
    },
)

contractRoutingRouter.post(
    "/GetContractOpportunities",
    jsonMiddleware(),
    (req: RequestWithJwt<never, { contractId: string }>, res) => {
        const contract = controller.resolveContract(req.body.contractId)
        res.json(getContractOpportunityData(req, contract))
    },
)

function getContractOpportunityData(
    req: RequestWithJwt,
    contract: MissionManifest,
): MissionStory[] {
    const userData = getUserData(req.jwt.unique_name, req.gameVersion)
    const result = []
    const missionStories = getConfig<Record<string, MissionStory>>(
        "MissionStories",
        false,
    )

    if (contract.Metadata.Opportunities) {
        for (const ms of contract.Metadata.Opportunities) {
            if (!Object.keys(missionStories).includes(ms)) {
                continue
            }

            missionStories[ms].PreviouslyCompleted =
                ms in userData.Extensions.opportunityprogression
            const current = fastClone(missionStories[ms])
            delete current.Location
            result.push(current)
        }
    }

    return result
}

export { contractRoutingRouter }
