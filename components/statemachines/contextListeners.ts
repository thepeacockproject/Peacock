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

import { test } from "@peacockproject/statemachine-parser"

/**
 * The base for a context listener.
 */
export interface IContextListener<Type> {
    /**
     * The context listener type.
     */
    type: Type
    "extra-data"?: Record<string, unknown>
}

export interface ChallengeCounter extends IContextListener<"challengecounter"> {
    /**
     * Pointer to (or literal value of) the number of completed challenges the counter targets.
     */
    count: string | number
    /**
     * Pointer to (or literal value of) the completion goal.
     */
    total: string | number
    /**
     * Localized string for displaying progress.
     */
    text?: string
}

/**
 * Utilizes a challenge tree to track completion of the specified challenges.
 */
export interface ChallengeTree extends IContextListener<"challengetree"> {
    /**
     * Pointer to an array of challenge IDs.
     */
    comparand: string
}

// If somebody figures out what this does, please ping rdil and grappigegovert on Discord!
export interface MatchArrays extends IContextListener<"matcharrays"> {
    comparand: string
}

/**
 * Used to update a HUD element.
 */
export interface Custom extends IContextListener<"custom"> {
    HUDTemplate: unknown
}

export type Toggle = IContextListener<"toggle">

/**
 * Used to count things during a challenge.
 */
export interface ObjectiveCounter
    extends IContextListener<"objective-counter"> {
    /**
     * Locale string for the HUD display.
     */
    header: string
    /**
     * A pointer to (or the literal value of) any number which will cause the counter to be deactivated if it equals the count.
     */
    deactivate?: string | number
    /**
     * A pointer to (or the literal value of) the number that the counter should be decreased by.
     */
    decrementor?: string | number
}

export interface ForceUpdate extends IContextListener<"force-update"> {
    /**
     * A pointer to the context listener to forcibly update.
     */
    target: string
}

/**
 * One of the context listener types.
 */
export type ContextListener =
    | ForceUpdate
    | ObjectiveCounter
    | Toggle
    | Custom
    | MatchArrays
    | ChallengeCounter
    | ChallengeTree

export interface ParsedContextListenerInfo {
    /**
     * A list of strings of challenge IDs targeted by this listener.
     */
    challengeTreeIds: string[]
    /**
     * An object containing the counts for challenges that increment.
     */
    challengeCountData: {
        /**
         * Number of completed challenges.
         */
        count: number
        /**
         * Number of total challenges.
         */
        total: number
    }
}

/**
 * Parse context listeners into a more easily consumable data format.
 *
 * @param contextListeners The `ContextListeners` object.
 * @param context The context object.
 * @returns The parsed information.
 */
export function parseContextListeners(
    contextListeners: Record<string, ContextListener>,
    context: unknown,
): ParsedContextListenerInfo {
    const listeners = Object.keys(contextListeners || {})
    const info: ParsedContextListenerInfo = {
        challengeTreeIds: [],
        challengeCountData: {
            count: 0,
            total: 0,
        },
    }

    for (const listener of listeners) {
        if (contextListeners[listener].type === "challengetree") {
            const ctListener = contextListeners[listener] as ChallengeTree
            const comparand = ctListener.comparand

            // hack: give the SM parser our target string, which will output the named child
            const result: string[] = test(comparand, context)

            info.challengeTreeIds.push(...result)
        }

        if (contextListeners[listener].type === "challengecounter") {
            const ctListener = contextListeners[listener] as ChallengeCounter
            const { total, count } = ctListener

            info.challengeCountData.count = test(count, context)
            info.challengeCountData.total = test(total, context)

            // Might be counting finished challenges, so need required challenges list. e.g. (SA5, SA12, SA17)
            if ((count as string).includes("CompletedChallenges")) {
                info.challengeTreeIds.push(
                    ...test("$.RequiredChallenges", context),
                )
            }
        }
    }

    return info
}
