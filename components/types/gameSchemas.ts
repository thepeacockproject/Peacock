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

export type MissionEndRequestQuery = Partial<{
    contractSessionId: string
    masteryUnlockableId?: string
}>

export type StashpointSlotName =
    | "gear"
    | "disguise"
    | "stashpoint"
    | "carriedweapon"
    | "carrieditem"
    | "concealedweapon"
    | "concealedweapon2"
    | string

/**
 * Query that the game sends for the stashpoint route.
 */
export type StashpointQuery = Partial<{
    contractid: string
    /**
     * Can be a number or a UUID.
     */
    slotid: number | string
    slotname: StashpointSlotName
    stashpoint?: string
    allowlargeitems: "true" | "false"
    allowcontainers: "true" | "false"
}>

/**
 * Query that the game sends for the stashpoint route in H2016.
 *
 * @see StashpointQuery
 */
export type StashpointQueryH2016 = Omit<
    StashpointQuery,
    "allowcontainers" | "slotid"
>

export type PlanningQuery = Partial<{
    contractid: string
    resetescalation: "true" | "false"
    /**
     * This is observed to be true for the planning page that shows after the mission end page when finishing a level of an escalation.
     */
    forcecurrentcontract: "true" | "false"
    errorhandling: "true" | "false"
}>

export type GetForPlay2Body = Partial<{
    id: string
    difficultyLevel: number
}>

export type MultiplayerQuery = Partial<{
    gamemode: string
    disguiseUnlockableId: string
}>

export type MultiplayerMatchStatsQuery = Partial<{
    contractSessionId: string
}>

export type LegacyGetProgressionBody = Partial<{
    profileid: string
    challengeids: string[]
}>

export type MasteryUnlockableQuery = Partial<{
    unlockableId: string
}>

export type GetCompletionDataForLocationQuery = Partial<{
    locationId: string
}>

/**
 * Body that the game sends for the
 * `/authentication/api/userchannel/ContractSessionsService/Load` route.
 */
export type LoadSaveBody = Partial<{
    saveToken: string
    contractSessionId: string
    profileId: string
    difficultyLevel: number
    contractId: string
}>
