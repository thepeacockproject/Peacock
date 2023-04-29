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
import { gameDifficulty, nilUuid, ServerVer, uuidRegex } from "../utils"
import { json as jsonMiddleware } from "body-parser"
import { enqueueEvent, newSession } from "../eventHandler"
import { _legacyBull, _theLastYardbirdScpc, controller } from "../controller"
import { log, LogLevel } from "../loggingInterop"
import { getConfig } from "../configSwizzleManager"
import type { GameChanger, RequestWithJwt } from "../types/types"
import { randomUUID } from "crypto"
import { getFlag } from "../flags"
import { getPlayEscalationInfo } from "../contracts/escalations/escalationService"

const legacyContractRouter = Router()

legacyContractRouter.post(
    "/GetForPlay",
    jsonMiddleware(),
    (req: RequestWithJwt, res) => {
        if (!uuidRegex.test(req.body.id)) {
            res.status(400).end()
            return
        }

        const contractData =
            req.gameVersion === "h1" &&
            req.body.id === "42bac555-bbb9-429d-a8ce-f1ffdf94211c"
                ? _legacyBull
                : req.body.id === "ff9f46cf-00bd-4c12-b887-eac491c3a96d"
                ? _theLastYardbirdScpc
                : controller.resolveContract(req.body.id)

        if (!contractData) {
            log(
                LogLevel.ERROR,
                `Requested unknown contract in LGFP: ${req.body.id}`,
            )
            res.status(400).send("no such contract")
            return
        }

        if (
            contractData.Metadata.Type === "elusive" &&
            getFlag("legacyElusivesEnableSaving")
        ) {
            log(LogLevel.DEBUG, "Changing elusive mission...")
            contractData.Metadata.Type = "mission"
        }

        if (!contractData.Data.GameChangers) {
            contractData.Data.GameChangers = []
        }

        for (const gamechangerId of req.body.extraGameChangerIds) {
            contractData.Data.GameChangers.push(gamechangerId)
        }

        if (contractData.Data.GameChangers.length > 0) {
            type GCPConfig = Record<string, GameChanger>

            const gameChangerData: GCPConfig = {
                ...getConfig<GCPConfig>("GameChangerProperties", true),
                ...getConfig<GCPConfig>("PeacockGameChangerProperties", true),
            }

            contractData.Data.GameChangerReferences = []

            for (const gameChangerId of contractData.Data.GameChangers) {
                const gameChanger = gameChangerData[gameChangerId]

                if (!gameChanger) {
                    log(
                        LogLevel.ERROR,
                        `Encountered unknown GameChanger id: ${gameChangerId}`,
                    )
                    res.status(500)
                    continue
                }

                gameChanger.Id = gameChangerId
                delete gameChanger.ObjectivesCategory

                contractData.Data.GameChangerReferences.push(gameChanger)

                if (gameChanger.Resource) {
                    contractData.Data.Bricks.push(...gameChanger.Resource)
                }

                if (gameChanger.Objectives) {
                    contractData.Data.Objectives?.push(
                        ...gameChanger.Objectives,
                    )
                }
            }
        }

        // Add escalation data to Contract data HERE
        contractData.Metadata = {
            ...contractData.Metadata,
            ...(contractData.Metadata.Type === "escalation"
                ? getPlayEscalationInfo(
                      req.jwt.unique_name,
                      contractData.Metadata.InGroup,
                      req.gameVersion,
                  )
                : {}),
        }

        res.json(contractData)
    },
)

legacyContractRouter.post(
    "/Start",
    jsonMiddleware(),
    (req: RequestWithJwt, res) => {
        if (req.body.profileId !== req.jwt.unique_name) {
            res.status(400).end() // requested for different user id
            return
        }

        if (!uuidRegex.test(req.body.contractId)) {
            res.status(400).end()
            return
        }

        const c = controller.resolveContract(req.body.contractId)

        if (!c) {
            res.status(404).end()
            return
        }

        const contractSessionId = `${process.hrtime
            .bigint()
            .toString()}-${randomUUID()}`

        // all event stuff is handled in h3 event handler
        enqueueEvent(req.jwt.unique_name, {
            Version: ServerVer,
            IsReplicated: false,
            CreatedContract: null,
            Id: randomUUID(),
            Name: "ContractSessionMarker",
            UserId: nilUuid,
            ContractId: nilUuid,
            SessionId: null,
            ContractSessionId: contractSessionId,
            Timestamp: 0.0,
            Value: {
                Currency: {
                    ContractPaymentAllowed: true,
                    ContractPayment: null,
                },
            },
            Origin: null,
        })

        res.json(contractSessionId)

        newSession(
            contractSessionId,
            req.body.contractId,
            req.jwt.unique_name,
            gameDifficulty.normal,
            req.gameVersion,
        )
    },
)

export { legacyContractRouter }
