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

import { ContractSession, SaveFile, UserProfile } from "../types/types"
import { contractSessions } from "../eventHandler"
import {
    deleteContractSession,
    getContractSession,
    writeContractSession,
} from "../databaseHandler"
import { log, LogLevel } from "../loggingInterop"
import assert from "assert"
import { controller } from "../controller"
import { getErrorMessage } from "../profileHandler"

/**
 * Changes a set to an array.
 *
 * @param set The set.
 */
export function normalizeSet<T>(set: Set<T>): T[] {
    const l: T[] = []

    set.forEach((i) => l.push(i))

    return l
}

const SESSION_SET_PROPS: (keyof ContractSession)[] = [
    "targetKills",
    "npcKills",
    "bodiesHidden",
    "pacifications",
    "disguisesUsed",
    "disguisesRuined",
    "spottedBy",
    "witnesses",
    "bodiesFoundBy",
    "killsNoticedBy",
    "completedObjectives",
    "kills",
    "markedTargets",
    "failedObjectives",
]

const SESSION_MAP_PROPS: (keyof ContractSession)[] = [
    "objectiveStates",
    "objectiveContexts",
    "objectiveDefinitions",
]

/**
 * Prepares a contract session for saving to a file.
 *
 * @param session The ContractSession.
 */
export function serializeSession(session: ContractSession): unknown {
    const o: Partial<ContractSession> = {}

    type K = keyof ContractSession

    // obj clone
    for (const key of Object.keys(session)) {
        if (session[key as K] instanceof Map) {
            // @ts-expect-error Type mismatch.
            o[key] = Array.from(
                (session[key as K] as Map<string, unknown>).entries(),
            )
            continue
        }

        if (session[key as K] instanceof Set) {
            // @ts-expect-error Type mismatch.
            o[key] = normalizeSet(session[key])
            continue
        }

        // @ts-expect-error Type mismatch.
        o[key] = session[key as K]
    }

    return o
}

/**
 * Changes all ContractSession array items into sets.
 *
 * @param saved The ContractSession.
 */
export function deserializeSession(
    saved: Record<string, unknown>,
): ContractSession {
    const session: Partial<ContractSession> = {}

    // obj clone
    for (const key of Object.keys(saved)) {
        // @ts-expect-error Type mismatch.
        session[key] = saved[key]
    }

    for (const collection of SESSION_SET_PROPS) {
        // @ts-expect-error Type mismatch.
        session[collection] = new Set(session[collection])
    }

    for (const map of SESSION_MAP_PROPS) {
        if (Object.hasOwn(session, map)) {
            // @ts-expect-error Type mismatch.
            session[map] = new Map(session[map])
        }
    }

    return <ContractSession>session
}

export async function saveSession(
    save: SaveFile,
    userData: UserProfile,
): Promise<void> {
    const sessionId = save.ContractSessionId
    const token = save.Value.LastEventToken
    const slot = save.Value.Name

    if (!contractSessions.has(sessionId)) {
        throw new Error("the session does not exist in the server's memory", {
            cause: "non-existent",
        })
    }

    if (!userData.Extensions.Saves) {
        userData.Extensions.Saves = {}
    }

    if (slot in userData.Extensions.Saves) {
        const delta = save.TimeStamp - userData.Extensions.Saves[slot].Timestamp

        if (delta === 0) {
            throw new Error(
                `the client is accessing /ProfileService/UpdateUserSaveFileTable with nothing updated.`,
                { cause: "cause uninvestigated" },
            )
        } else if (delta < 0) {
            throw new Error(`there is a newer save in slot ${slot}`, {
                cause: "outdated",
            })
        } else {
            // If we can delete the old save, then do it. If not, we can still proceed.
            try {
                await deleteContractSession(
                    slot +
                        "_" +
                        userData.Extensions.Saves[slot].Token +
                        "_" +
                        userData.Extensions.Saves[slot].ContractSessionId,
                )
            } catch (e) {
                log(
                    LogLevel.DEBUG,
                    `Failed to delete old ${slot} save. ${getErrorMessage(e)}.`,
                )
            }
        }
    }

    await writeContractSession(
        slot + "_" + token + "_" + sessionId,
        contractSessions.get(sessionId)!,
    )
    log(
        LogLevel.DEBUG,
        `Saved contract to slot ${slot} with token = ${token}, session id = ${sessionId}, start time = ${
            contractSessions.get(sessionId)!.timerStart
        }.`,
    )
}

export async function loadSession(
    sessionId: string,
    token: string,
    userData: UserProfile,
    sessionData?: ContractSession,
): Promise<void> {
    if (!sessionData) {
        try {
            // First, try the loading the session from the filesystem.
            sessionData = await getContractSession(token + "_" + sessionId)
        } catch (e) {
            // Otherwise, see if we still have this session in memory.
            // This may be the currently active session, but we need a fallback of some sorts in case a player disconnected.
            if (contractSessions.has(sessionId)) {
                sessionData = contractSessions.get(sessionId)
            } else {
                // Rethrow the error
                throw e
            }
        }
    }

    assert.ok(sessionData, "should have session data")

    // Update challenge progression with the user's latest progression data
    for (const cid in sessionData.challengeContexts) {
        // Make sure the ChallengeProgression is available, otherwise loading might fail!
        userData.Extensions.ChallengeProgression[cid] ??= {
            CurrentState: "Start",
            State: {},
            Completed: false,
            Ticked: false,
        }

        const challenge = controller.challengeService.getChallengeById(
            cid,
            sessionData.gameVersion,
        )

        assert.ok(
            challenge,
            `session has context for unregistered challenge ${cid}`,
        )

        if (
            !userData.Extensions.ChallengeProgression[cid].Completed &&
            controller.challengeService.needSaveProgression(challenge)
        ) {
            sessionData.challengeContexts[cid].context =
                userData.Extensions.ChallengeProgression[cid].State
        }
    }

    contractSessions.set(sessionId, sessionData)
    log(
        LogLevel.DEBUG,
        `Loaded contract with token = ${token}, session id = ${sessionId}, start time = ${
            contractSessions.get(sessionId)!.timerStart
        }.`,
    )
}
