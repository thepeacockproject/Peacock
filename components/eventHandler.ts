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

import { Router } from "express"
import {
    ClientToServerEvent,
    ContractProgressionData,
    ContractSession,
    GameVersion,
    MissionManifestObjective,
    PeacockCameraStatus,
    PushMessage,
    RatingKill,
    RequestWithJwt,
    S2CEventWithTimestamp,
    Seconds,
    ServerToClientEvent,
} from "./types/types"
import { extractToken, ServerVer } from "./utils"
import { json as jsonMiddleware } from "body-parser"
import { log, LogLevel } from "./loggingInterop"
import { getContractSession, writeContractSession } from "./databaseHandler"
import { controller } from "./controller"
import { swapToLocationStatus } from "./discordRp"
import { randomUUID } from "crypto"
import { liveSplitManager } from "./livesplit/liveSplitManager"
import { handleMultiplayerEvent } from "./multiplayer/multiplayerService"
import { handleEvent } from "@peacockproject/statemachine-parser"
import picocolors from "picocolors"
import { encodePushMessage } from "./multiplayer/multiplayerUtils"
import {
    ActorTaggedC2SEvent,
    AmbientChangedC2SEvent,
    BodyHiddenC2SEvent,
    ContractStartC2SEvent,
    HeroSpawn_LocationC2SEvent,
    ItemDroppedC2SEvent,
    ItemPickedUpC2SEvent,
    KillC2SEvent,
    MurderedBodySeenC2SEvent,
    ObjectiveCompletedC2SEvent,
    PacifyC2SEvent,
    SecuritySystemRecorderC2SEvent,
    SetpiecesC2SEvent,
    SpottedC2SEvent,
    WitnessesC2SEvent,
} from "./types/events"
import { setCpd } from "./evergreen"

const eventRouter = Router()

// /authentication/api/userchannel/EventsService/

const eventQueue = new Map<string, S2CEventWithTimestamp[]>()
const pushMessageQueue = new Map<string, PushMessage[]>()

/**
 * Enqueue a server to client push message.
 * It will be sent back the next time the client calls `SaveAndSynchronizeEvents4`.
 *
 * @param userId The push message's target user.
 * @param message The encoded push message to send.
 * @see enqueueEvent
 * @author grappigegovert
 */
export function enqueuePushMessage(userId: string, message: unknown): void {
    let userQueue
    const time = process.hrtime.bigint()

    if ((userQueue = pushMessageQueue.get(userId))) {
        userQueue.push({
            time,
            message: encodePushMessage(time, message),
        })
    } else {
        userQueue = [
            {
                time,
                message: encodePushMessage(time, message),
            },
        ]
        pushMessageQueue.set(userId, userQueue)
    }
}

/**
 * Register a listener for an objective. Allows server-side tracking of the objective's state as events come in.
 *
 * @param session The contract session.
 * @param objective The objective object.
 * @author Reece Dunham
 */
export function registerObjectiveListener(
    session: ContractSession,
    objective: MissionManifestObjective,
): void {
    if (!objective.Definition) {
        return
    }

    let context = objective.Definition.Context || {}
    let state = "Start"

    session.objectiveDefinitions.set(objective.Id, objective.Definition)

    const immediate = handleEvent(
        // @ts-expect-error Type issue, needs to be corrected in sm-p.
        objective.Definition,
        context,
        {},
        {
            eventName: "-",
            currentState: state,
        },
    )

    if (immediate.state) {
        state = immediate.state
    }

    if (immediate.context) {
        context = immediate.context
    }

    session.objectiveContexts.set(objective.Id, context)
    session.objectiveStates.set(objective.Id, state)
}

/**
 * Enqueue a server to client event.
 * It will be sent back the next time the client calls `SaveAndSynchronizeEvents4`.
 *
 * @param userId The event's target user.
 * @param event The event to send.
 * @see enqueuePushMessage
 * @author grappigegovert
 */
export function enqueueEvent(userId: string, event: ServerToClientEvent): void {
    let userQueue: S2CEventWithTimestamp[] | undefined
    const time = process.hrtime.bigint().toString()
    event.CreatedAt = new Date().toISOString().slice(0, -1)
    event.Token = time.toString()

    if ((userQueue = eventQueue.get(userId))) {
        userQueue.push({
            time,
            event,
        })
    } else {
        userQueue = [
            {
                time,
                event,
            },
        ]
        eventQueue.set(userId, userQueue)
    }
}

/**
 * Like the game's internal enum for EDeathContext.
 *
 * @see https://github.com/OrfeasZ/ZHMModSDK/blob/ba9512092a37d3b1f4de047bdd6acf15a7b9ac7c/ZHMModSDK/Include/Glacier/Enums.h#L6158
 */
export const enum EDeathContext {
    eDC_UNDEFINED = 0,
    eDC_NOT_HERO = 1,
    eDC_HIDDEN = 2,
    eDC_ACCIDENT = 3,
    eDC_MURDER = 4,
}

export const contractSessions = new Map<string, ContractSession>()
const userIdToTempSession = new Map<string, string>()

/**
 * Get the current state of an objective.
 *
 * @param sessionId The session ID.
 * @param objectiveId The objective ID.
 */
export function getCurrentState(
    sessionId: string,
    objectiveId: string,
): string | undefined {
    // Note: after the double-layered maps are merged into the session object, this should be rewritten.
    const session = contractSessions.get(sessionId)

    if (!session) {
        return "Start"
    }

    return session.objectiveStates.get(objectiveId)
}

/**
 * Creates a new contract session.
 *
 * @param sessionId The ID for the session.
 * @param contractId The ID of the contract the session is for.
 * @param userId The ID of the user playing the session.
 * @param difficulty The difficulty of the game.
 * @param gameVersion The game version.
 * @param doScoring If true, this will be treated like a normal session. If false, this session will not be scored/put on the leaderboards. This should be false if we don't have full session details, e.g. if this is a save from the official servers loaded on Peacock.
 */
export function newSession(
    sessionId: string,
    contractId: string,
    userId: string,
    difficulty: number,
    gameVersion: GameVersion,
    doScoring = true,
): void {
    const timestamp = new Date()

    const contract = controller.resolveContract(contractId)

    if (!contract) {
        log(LogLevel.ERROR, `Failed to load ${contractId}`)
        throw new Error("no ct")
    }

    swapToLocationStatus(
        contract.Metadata.ScenePath,
        contract.Metadata.Type,
        contract.Data.Bricks || [],
    )

    contractSessions.set(sessionId, {
        gameVersion,
        sessionStart: timestamp,
        lastUpdate: timestamp,
        contractId,
        userId: userId,
        timerStart: 0,
        timerEnd: 0,
        duration: 0,
        crowdNpcKills: 0,
        targetKills: new Set(),
        npcKills: new Set(),
        bodiesHidden: new Set(),
        pacifications: new Set(),
        disguisesUsed: new Set(),
        disguisesRuined: new Set(),
        spottedBy: new Set(),
        witnesses: new Set(),
        bodiesFoundBy: new Set(),
        legacyHasBodyBeenFound: false,
        killsNoticedBy: new Set(),
        completedObjectives: new Set(),
        failedObjectives: new Set(),
        recording: PeacockCameraStatus.NotSpotted,
        lastAccident: 0,
        lastKill: {},
        kills: new Set(),
        compat: doScoring,
        markedTargets: new Set(),
        currentDisguise: "4fc9396e-2619-4e66-a51e-2bd366230da7", // sig suit
        difficulty,
        objectiveContexts: new Map(),
        objectiveStates: new Map(),
        objectiveDefinitions: new Map(),
        ghost: {
            deaths: 0,
            unnoticedKills: 0,
            Opponents: [],
            OpponentScore: 0,
            Score: 0,
            IsDraw: false,
            IsWinner: false,
            timerEnd: null,
        },
    })
    userIdToTempSession.set(userId, sessionId)

    controller.challengeService.startContract(
        userId,
        sessionId,
        contractSessions.get(sessionId)!,
    )
}

eventRouter.post(
    "/SaveAndSynchronizeEvents4",
    extractToken,
    jsonMiddleware({ limit: "10Mb" }),
    (
        req: RequestWithJwt<
            unknown,
            {
                lastPushDt: number | string
                lastEventTicks: number | string
                userId?: string
                values?: []
            }
        >,
        res,
    ) => {
        if (req.body.userId !== req.jwt.unique_name) {
            res.status(403).send() // Trying to save events for other user
            return
        }

        if (!Array.isArray(req.body.values)) {
            res.status(400).end() // malformed request
            return
        }

        const savedTokens = req.body.values.length
            ? saveEvents(req.body.userId, req.body.values, req)
            : null

        let userQueue: S2CEventWithTimestamp[] | undefined
        let newEvents: ServerToClientEvent[] | null = null

        // events: (server -> client)
        if ((userQueue = eventQueue.get(req.jwt.unique_name))) {
            userQueue = userQueue.filter(
                (item) => item.time > req.body.lastEventTicks,
            )
            eventQueue.set(req.jwt.unique_name, userQueue)

            newEvents = Array.from(userQueue, (item) => item.event)
        }

        // push messages: (server -> client)
        let userPushQueue: PushMessage[] | undefined
        let pushMessages: string[] | null = null

        if ((userPushQueue = pushMessageQueue.get(req.jwt.unique_name))) {
            userPushQueue = userPushQueue.filter(
                (item) => item.time > req.body.lastPushDt,
            )
            pushMessageQueue.set(req.jwt.unique_name, userPushQueue)

            pushMessages = Array.from(userPushQueue, (item) => item.message)
        }

        res.json({
            SavedTokens: savedTokens,
            NewEvents: newEvents || null,
            NextPoll: 10.0,
            PushMessages: pushMessages || null,
        })
    },
)

eventRouter.post(
    "/SaveEvents2",
    extractToken,
    jsonMiddleware({ limit: "10Mb" }),
    (req: RequestWithJwt, res) => {
        if (req.jwt.unique_name !== req.body.userId) {
            res.status(403).send() // Trying to save events for other user
            return
        }

        res.json(saveEvents(req.body.userId, req.body.values, req))
    },
)

/**
 * Gets the active session's ID for the specified user (by their ID).
 *
 * @param uId The user's ID.
 * @returns The ID for the user's active session.
 * @author Reece Dunham
 */
export function getActiveSessionIdForUser(uId: string): string | undefined {
    return userIdToTempSession.get(uId)
}

/**
 * Gets the active session for the specified user (by their ID).
 *
 * @param uId The user's ID.
 * @returns The user's active contract session.
 * @author Reece Dunham
 */
export function getSession(uId: string): ContractSession | undefined {
    const currentSession = getActiveSessionIdForUser(uId)

    if (!currentSession) {
        return undefined
    }

    return contractSessions.get(currentSession)
}

function contractFailed(
    event: ClientToServerEvent,
    session: ContractSession,
): void {
    session.markedTargets.clear()

    const json = controller.resolveContract(session.contractId)!

    let realName: string

    if (json.Metadata.Type === "creation") {
        realName =
            event.Value === "Contract ended manually: OnRestartLevel"
                ? "GameRestart"
                : `ContractFailed:${event.Value}`
    } else {
        realName = `ContractFailed:${event.Value}`
    }

    // if still in cutscene, end mission with 0 time pass -- this will get converted to minimum time within split manager
    if (session.timerStart !== 0) {
        // @ts-expect-error TypeScript still hates dates
        const timeTotal: Seconds = session.timerEnd - session.timerStart
        liveSplitManager.failMission(timeTotal)
    } else {
        liveSplitManager.failMission(0)
    }

    enqueueEvent(session.userId, {
        CreatedAt: new Date().toISOString(),
        Token: process.hrtime.bigint().toString(),
        Id: randomUUID(),
        Name: "SegmentClosing",
        UserId: session.userId,
        ContractId: session.contractId,
        SessionId: null,
        ContractSessionId: event.ContractSessionId,
        Timestamp: 0.0,
        Value: {
            SegmentIndex: 0,
            LastEventName: "ContractFailed",
            LastEventTime: (session.lastUpdate as Date).toISOString(),
            CloseType: realName,
        },
        Origin: "ContractSessionService",
        Version: ServerVer,
        IsReplicated: false,
    })
}

function saveEvents(
    userId: string,
    events: ClientToServerEvent[],
    req: RequestWithJwt<unknown, unknown>,
): string[] {
    const response: string[] = []
    const processed: string[] = []

    events.forEach((event) => {
        const session = contractSessions.get(event.ContractSessionId)

        if (
            !session ||
            session.contractId !== event.ContractId ||
            session.userId !== userId
        ) {
            if (PEACOCK_DEV) {
                log(LogLevel.DEBUG, "No session or session user ID mismatch!")
                console.debug(session)
                console.debug(event)
            }

            return // session does not exist or contractid/userid doesn't match
        }

        session.duration = event.Timestamp
        session.lastUpdate = new Date()

        // @ts-expect-error Issue with request type mismatch.
        controller.hooks.newEvent.call(event, req, session)

        for (const objectiveId of session.objectiveStates.keys()) {
            try {
                const objectiveDefinition =
                    session.objectiveDefinitions.get(objectiveId)
                const objectiveState = session.objectiveStates.get(objectiveId)
                const objectiveContext =
                    session.objectiveContexts.get(objectiveId)

                const val = handleEvent(
                    objectiveDefinition as never,
                    objectiveContext,
                    event.Value,
                    {
                        eventName: event.Name,
                        currentState: objectiveState,
                        timestamp: event.Timestamp,
                    },
                )

                if (val.state === "Failure") {
                    if (PEACOCK_DEV) {
                        log(LogLevel.DEBUG, `Objective failed: ${objectiveId}`)
                    }

                    session.failedObjectives.add(objectiveId)
                }

                if (val.context) {
                    session.objectiveContexts.set(objectiveId, val.context)
                    session.objectiveStates.set(objectiveId, val.state)
                }
            } catch (e) {
                log(
                    LogLevel.ERROR,
                    "An error occurred while tracing C2S events, please report this!",
                )
                log(LogLevel.ERROR, e)
                log(LogLevel.ERROR, e.stack)
            }
        }

        controller.challengeService.onContractEvent(
            event,
            event.ContractSessionId,
            session,
        )

        // these events are important but may be fired after the timer is over
        const canGetAfterTimerOver = [
            "ContractEnd",
            "ObjectiveCompleted",
            "CpdSet",
        ]

        if (
            !canGetAfterTimerOver.includes(event.Name) &&
            session.timerEnd !== 0 &&
            event.Timestamp > session.timerEnd
        ) {
            // Do not handle events that occur after exiting the level
            response.push(process.hrtime.bigint().toString())
            return
        }

        // @ts-expect-error Tapable types not sufficient
        controller.hooks.newEvent.call(event, req)

        const contract = controller.resolveContract(session.contractId)
        const contractType = contract?.Metadata?.Type?.toLowerCase()

        if (handleMultiplayerEvent(event, session)) {
            processed.push(event.Name)
        }

        switch (event.Name) {
            case "HeroSpawn_Location":
                liveSplitManager.missionIntentResolved(
                    event.ContractId,
                    (<HeroSpawn_LocationC2SEvent>event).Value.RepositoryId,
                )
                break
            case "Kill": {
                const killValue = (event as KillC2SEvent).Value

                if (session.lastKill.timestamp === event.Timestamp) {
                    session.lastKill.repositoryIds?.push(killValue.RepositoryId)
                } else {
                    session.lastKill = {
                        timestamp: event.Timestamp,
                        repositoryIds: [killValue.RepositoryId],
                    }
                }

                if (killValue.KillContext === EDeathContext.eDC_NOT_HERO) {
                    // this is not 47, so we keep silent assassin
                    log(
                        LogLevel.DEBUG,
                        `${killValue.RepositoryId} eliminated, 47 not responsible`,
                    )
                    response.push(process.hrtime.bigint().toString())
                    return
                }

                log(
                    LogLevel.DEBUG,
                    `Actor ${killValue.RepositoryId} eliminated.`,
                )

                if (killValue.IsTarget || contractType === "creation") {
                    const kill: RatingKill = {
                        KillClass: killValue.KillClass,
                        KillMethodBroad: killValue.KillMethodBroad,
                        KillItemCategory: killValue.KillItemCategory,
                        IsHeadshot: killValue.IsHeadshot,
                        KillMethodStrict: killValue.KillMethodStrict,
                        KillItemRepositoryId: killValue.KillItemRepositoryId,
                        _RepositoryId: killValue.RepositoryId,
                        OutfitRepoId: session.currentDisguise,
                    }

                    session.kills.add(kill)

                    session.targetKills.add(killValue.RepositoryId)
                } else {
                    session.npcKills.add(killValue.RepositoryId)
                }
                break
            }
            case "CrowdNPC_Died":
                session.crowdNpcKills += 1
                break
            case "Pacify":
                session.pacifications.add(
                    (<PacifyC2SEvent>event).Value.RepositoryId,
                )
                break
            case "BodyHidden":
                session.bodiesHidden.add(
                    (<BodyHiddenC2SEvent>event).Value.RepositoryId,
                )
                break
            case "BodyFound":
                if (req.gameVersion === "h1") {
                    session.legacyHasBodyBeenFound = true
                }
                break
            case "Disguise":
                log(LogLevel.DEBUG, `Now disguised: ${event.Value as string}`)
                session.currentDisguise = event.Value as string
                session.disguisesUsed.add(event.Value as string)
                break
            case "ContractStart": {
                const disguise = (<ContractStartC2SEvent>event).Value.Disguise

                session.currentDisguise = disguise
                session.disguisesUsed.add(disguise)
                liveSplitManager.startMission(
                    session.contractId,
                    req.gameVersion,
                    req.jwt.unique_name,
                )
                break
            }
            case "DisguiseBlown":
                session.disguisesRuined.add(event.Value as string)
                break
            case "BrokenDisguiseCleared":
                session.disguisesRuined.delete(event.Value as string)
                break
            case "Spotted":
                for (const actor of (event as SpottedC2SEvent).Value) {
                    session.spottedBy.add(actor)
                }
                break
            case "Witnesses":
                for (const actor of (event as WitnessesC2SEvent).Value) {
                    session.witnesses.add(actor)
                }
                break
            case "SecuritySystemRecorder": {
                const eventValue = (<SecuritySystemRecorderC2SEvent>event).Value
                if (
                    eventValue.event === "spotted" &&
                    session.recording !== PeacockCameraStatus.Erased
                ) {
                    session.recording = PeacockCameraStatus.Spotted
                } else if (
                    eventValue.event === "destroyed" ||
                    eventValue.event === "erased"
                ) {
                    session.recording = PeacockCameraStatus.Erased
                }
                break
            }
            case "IntroCutEnd":
                if (!session.timerStart) {
                    session.timerStart = event.Timestamp
                }
                break
            case "exit_gate":
                session.timerEnd = event.Timestamp
                break
            case "ContractEnd":
                if (!session.timerEnd) {
                    session.timerEnd = event.Timestamp
                }
                break
            case "ObjectiveCompleted":
                session.completedObjectives.add(
                    (<ObjectiveCompletedC2SEvent>event).Value.Id,
                )
                break
            case "AccidentBodyFound":
                session.lastAccident = event.Timestamp
                break
            case "MurderedBodySeen":
                if (
                    (event.Timestamp as unknown as number) !==
                    session.lastAccident
                ) {
                    session.bodiesFoundBy.add(
                        (<MurderedBodySeenC2SEvent>event).Value.Witness,
                    )
                    if (event.Timestamp === session.lastKill.timestamp) {
                        session.killsNoticedBy.add(
                            (<MurderedBodySeenC2SEvent>event).Value.Witness,
                        )
                    }
                }
                break
            case "ActorTagged": {
                const val = (<ActorTaggedC2SEvent>event).Value

                if (!val.Tagged) {
                    session.markedTargets.delete(val.RepositoryId)
                } else if (val.Tagged) {
                    session.markedTargets.add(val.RepositoryId)
                }
                break
            }
            case "ItemPickedUp":
                log(
                    LogLevel.INFO,
                    `Picked up item with repository ID: ${
                        (<ItemPickedUpC2SEvent>event).Value.RepositoryId
                    }`,
                )
                break
            case "StartingSuit":
                session.currentDisguise = event.Value as string
                break
            case "ContractFailed":
                session.timerEnd = event.Timestamp
                contractFailed(event, session)
                break
            case "setpieces":
                log(
                    LogLevel.DEBUG,
                    `Setpiece: ${
                        (<SetpiecesC2SEvent>event).Value.RepositoryId
                    }`,
                )
                break
            case "ItemDropped":
                log(
                    LogLevel.DEBUG,
                    `Item dropped: ${
                        (<ItemDroppedC2SEvent>event).Value.RepositoryId
                    }`,
                )
                break
            case "AmbientChanged":
                log(
                    LogLevel.DEBUG,
                    `Ambient switched to ${
                        (<AmbientChangedC2SEvent>event).Value.AmbientValue
                    }`,
                )
                break
            // Evergreen
            case "CpdSet":
                setCpd(
                    event.Value as ContractProgressionData,
                    userId,
                    contract.Metadata.CpdId,
                )
                break
            case "NoCampaignActive": {
                setCpd(
                    {
                        AnyActiveCampaign: false,
                    },
                    userId,
                    contract.Metadata.CpdId,
                )
                break
            }
            // Sinkhole events we don't care about
            case "Hero_Health":
            case "NPC_Distracted":
            case "ShotsHit":
            case "FirstNonHeadshot":
            case "OpportunityEvents":
            case "FirstMissedShot":
                break
            default:
                // no-op on our part
                break
        }

        processed.push(event.Name)

        response.push(process.hrtime.bigint().toString())
    })

    if (PEACOCK_DEV && processed.length > 0) {
        log(
            LogLevel.DEBUG,
            `Event summary: ${picocolors.gray(processed.join(", "))}`,
        )
    }

    return response
}

export async function saveSession(
    sessionId: string,
    token: string,
): Promise<void> {
    if (!contractSessions.has(sessionId)) {
        log(LogLevel.WARN, `Refusing to save ${sessionId} as it doesn't exist`)
        return
    }

    await writeContractSession(
        token + "_" + sessionId,
        contractSessions.get(sessionId)!,
    )
}

export async function loadSession(
    sessionId: string,
    token: string,
    sessionData?: ContractSession,
): Promise<void> {
    if (!sessionData) {
        sessionData = await getContractSession(token + "_" + sessionId)
    }

    contractSessions.set(sessionId, sessionData)
}

export { eventRouter }
