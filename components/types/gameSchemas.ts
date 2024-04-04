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
 * Query for `/profiles/page/stashpoint`.
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
 * Query for `/profiles/page/stashpoint` (H2016 ONLY).
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

export type GetChallengeProgressionBody = Partial<{
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
 * Body for `/authentication/api/userchannel/ContractSessionsService/Load`.
 */
export type LoadSaveBody = Partial<{
    saveToken: string
    contractSessionId: string
    profileId: string
    difficultyLevel: number
    contractId: string
}>

/**
 * Query for `/profiles/page/Safehouse`.
 * Roughly the same as {@link SafehouseCategoryQuery} but this route is only for H1.
 */
export type SafehouseQuery = {
    type?: string
}

/**
 * Query for `/profiles/page/SafehouseCategory` (used for Career > Inventory and possibly some of the H1 stuff).
 */
export type SafehouseCategoryQuery = {
    type?: string
    subtype?: string
}

/**
 * Query for `/profiles/page/Destination`.
 */
export type GetDestinationQuery = {
    locationId: string
    difficulty?: string
}

/**
 * Query params that `/profiles/page/Leaderboards` gets.
 */
export type LeaderboardEntriesCommonQuery = {
    contractid: string
    difficultyLevel?: string
}

/**
 * Query for `/profiles/page/DebriefingLeaderboards`.
 * Because ofc it's different. Thanks IOI.
 */
export type DebriefingLeaderboardsQuery = {
    contractid: string
    difficulty?: string
}

/**
 * Query for `/profiles/page/ChallengeLocation`.
 */
export type ChallengeLocationQuery = {
    locationId: string
}

/**
 * Body for `/authentication/api/userchannel/ReportingService/ReportContract`.
 */
export type ContractReportBody = {
    contractId: string
    reason: number
}

/**
 * Query for `/profiles/page/LookupContractPublicId`.
 */
export type LookupContractPublicIdQuery = {
    publicid: string
}

/**
 * Body for `/authentication/api/userchannel/ProfileService/ResolveGamerTags`.
 */
export type ResolveGamerTagsBody = {
    profileIds: string[]
}

/**
 * Query for `/profiles/page/GetMasteryCompletionDataForUnlockable`.
 */
export type GetMasteryCompletionDataForUnlockableQuery = {
    unlockableId: string
}
