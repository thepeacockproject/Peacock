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
    ChallengeCompletion,
    ChallengeProgressionData,
    ChallengeTreeWaterfallState,
    ClientToServerEvent,
    CompiledChallengeTreeCategory,
    CompiledChallengeTreeData,
    ContractSession,
    GameVersion,
    MissionManifest,
    PeacockLocationsData,
    RegistryChallenge,
    Unlockable,
    UserProfile,
} from "../types/types"
import { getUserData, writeUserData } from "../databaseHandler"

import { controller, Controller } from "../controller"
import {
    generateCompletionData,
    generateUserCentric,
    getSubLocationFromContract,
} from "../contracts/dataGen"
import { log, LogLevel } from "../loggingInterop"
import {
    parseContextListeners,
    ParsedContextListenerInfo,
} from "../statemachines/contextListeners"
import {
    handleEvent,
    HandleEventOptions,
} from "@peacockproject/statemachine-parser"
import { ChallengeContext, SavedChallengeGroup } from "../types/challenges"
import { fastClone, gameDifficulty, isSniperLocation } from "../utils"
import {
    ChallengeFilterOptions,
    ChallengeFilterType,
    filterChallenge,
    inclusionDataCheck,
    mergeSavedChallengeGroups,
} from "./challengeHelpers"
import assert from "assert"
import { getVersionedConfig } from "../configSwizzleManager"
import { SyncHook } from "../hooksImpl"
import { getUserEscalationProgress } from "../contracts/escalations/escalationService"

import { getUnlockableById } from "../inventory"

type ChallengeDefinitionLike = {
    Context?: Record<string, unknown>
}

type Compiler = (
    challenge: RegistryChallenge,
    progression: ChallengeProgressionData,
    gameVersion: GameVersion,
    userId: string,
) => CompiledChallengeTreeData

type GroupIndexedChallengeLists = {
    [groupId: string]: RegistryChallenge[]
}

export type ChallengePack = {
    Name: string
    Description: string
    GameVersions: GameVersion[]
    Image: string
    Icon: string
}

/**
 * A base class providing challenge registration support.
 */
export abstract class ChallengeRegistry {
    /**
     * @Key1 Game version.
     * @Key2 The challenge Id.
     * @value A `RegistryChallenge` object.
     */
    protected challenges: Record<GameVersion, Map<string, RegistryChallenge>> =
        {
            h1: new Map(),
            h2: new Map(),
            h3: new Map(),
            scpc: new Map(),
        }

    /**
     * @Key1 Game version.
     * @Key2 The parent location Id.
     * @Key3 The group's categoryId.
     * @Value A `SavedChallengeGroup` object.
     */
    protected groups: Record<
        GameVersion,
        Map<string, Map<string, SavedChallengeGroup>>
    > = {
        h1: new Map(),
        h2: new Map(),
        h3: new Map(),
        scpc: new Map(),
    }

    /**
     * @Key1 Game version.
     * @Key2 The parent location Id.
     * @Key3 The group Id.
     * @Value A `Set` of challenge Ids.
     */
    protected groupContents: Record<
        GameVersion,
        Map<string, Map<string, Set<string>>>
    > = {
        h1: new Map(),
        h2: new Map(),
        h3: new Map(),
        scpc: new Map(),
    }

    /**
     * @Key1 Game version.
     * @Key2 The challenge Id.
     * @Value An `array` of challenge Ids that Key2 depends on.
     */
    protected readonly _dependencyTree: Record<
        GameVersion,
        Map<string, readonly string[]>
    > = {
        h1: new Map(),
        h2: new Map(),
        h3: new Map(),
        scpc: new Map(),
    }

    protected constructor(protected readonly controller: Controller) {}

    public challengePacks: Map<string, ChallengePack> = new Map([
        [
            "cheesecake-pack",
            {
                Name: "UI_MENU_PAGE_PROFILE_CHALLENGES_CATEGORY_PACK_CHEESECAKE",
                Description: "",
                GameVersions: ["h3"],
                Image: "images/challenges/categories/packcheesecake/tile.jpg",
                Icon: "challenge_category_feats",
            },
        ],
        [
            "argentum-pack",
            {
                Name: "UI_MENU_PAGE_PROFILE_CHALLENGES_CATEGORY_PACK_ARGENTUM",
                Description: "",
                GameVersions: ["h3"],
                Image: "images/challenges/categories/packargentum/tile.jpg",
                Icon: "challenge_category_feats",
            },
        ],
        [
            "argon-pack",
            {
                Name: "UI_MENU_PAGE_PROFILE_CHALLENGES_CATEGORY_PACK_ARGON",
                Description: "",
                GameVersions: ["h3"],
                Image: "images/challenges/categories/packargon/tile.jpg",
                Icon: "challenge_category_feats",
            },
        ],
    ])

    registerChallenge(
        challenge: RegistryChallenge,
        groupId: string,
        location: string,
        gameVersion: GameVersion,
    ): void {
        const gameChallenges = this.groupContents[gameVersion]
        challenge.inGroup = groupId
        this.challenges[gameVersion].set(challenge.Id, challenge)

        if (!gameChallenges.has(location)) {
            gameChallenges.set(location, new Map())
        }

        const locationMap = gameChallenges.get(location)!

        if (!locationMap.has(groupId)) {
            locationMap.set(groupId, new Set())
        }

        const set = locationMap.get(groupId)!
        set.add(challenge.Id)

        this.checkHeuristics(challenge, gameVersion)
    }

    registerGroup(
        group: SavedChallengeGroup,
        location: string,
        gameVersion: GameVersion,
    ): void {
        const gameGroups = this.groups[gameVersion]

        if (!gameGroups.has(location)) {
            gameGroups.set(location, new Map())
        }

        gameGroups.get(location)?.set(group.CategoryId, group)
    }

    getChallengeById(
        challengeId: string,
        gameVersion: GameVersion,
    ): RegistryChallenge | undefined {
        return this.challenges[gameVersion].get(challengeId)
    }

    getChallengeIds(gameVersion: GameVersion): string[] {
        return Array.from(this.challenges[gameVersion].keys())
    }

    removeChallenge(challengeId: string, gameVersion: GameVersion): boolean {
        const challenge = this.challenges[gameVersion].get(challengeId)
        if (!challenge) return false

        return (
            this.challenges[gameVersion].delete(challengeId) &&
            this.groupContents[gameVersion]
                .get(challenge.ParentLocationId)!
                .get(challenge.inGroup!)!
                .delete(challengeId)
        )
    }

    /**
     * This method retrieves all the unlockables associated with the challenges for a given game version.
     * It iterates over all the challenges for the specified game version and for each challenge, it checks if there are any unlockables (Drops).
     * If there are unlockables, it adds them to the accumulator object with the dropId as the key and the challenge Id as the value.
     *
     * @param gameVersion - The version of the game for which to retrieve the unlockables.
     * @returns {Record<string, string>} - An object where each key is an unlockable's id (dropId) and the corresponding value is the id of the challenge that unlocks it.
     */
    getChallengesUnlockables(gameVersion: GameVersion): Record<string, string> {
        return [...this.challenges[gameVersion].values()].reduce(
            (acc: Record<string, string>, challenge) => {
                if (challenge?.Drops?.length) {
                    challenge.Drops.forEach(
                        (dropId) => (acc[dropId] = challenge.Id),
                    )
                }

                return acc
            },
            {},
        )
    }

    /**
     * Gets a challenge group by its parent location and group ID.
     * @param groupId The group ID of the challenge group.
     * @param location The parent location for this challenge group.
     * @param gameVersion The current game version.
     * @returns A `SavedChallengeGroup` if such a group exists, or `undefined` if not.
     */
    getGroupByIdLoc(
        groupId: string,
        location: string,
        gameVersion: GameVersion,
    ): SavedChallengeGroup | undefined {
        const gameGroups = this.groups[gameVersion]

        const mainGroup = gameGroups.get(location)?.get(groupId)

        if (groupId === "feats" && gameVersion !== "h3") {
            if (!mainGroup) {
                // emergency bailout - shouldn't happen in practice
                return undefined
            }

            return mergeSavedChallengeGroups(
                mainGroup,
                gameGroups.get("GLOBAL_ESCALATION_CHALLENGES")?.get(groupId),
            )
        }

        if (groupId?.includes("featured")) {
            return gameGroups.get("GLOBAL_FEATURED_CHALLENGES")?.get(groupId)
        }

        if (groupId?.includes("arcade")) {
            return gameGroups.get("GLOBAL_ARCADE_CHALLENGES")?.get(groupId)
        }

        if (groupId?.includes("escalation")) {
            return gameGroups.get("GLOBAL_ESCALATION_CHALLENGES")?.get(groupId)
        }

        // Included by default. Filtered later.
        if (groupId === "classic" && location !== "GLOBAL_CLASSIC_CHALLENGES") {
            if (!mainGroup) {
                // emergency bailout - shouldn't happen in practice
                return undefined
            }

            return mergeSavedChallengeGroups(
                mainGroup,
                gameGroups.get("GLOBAL_CLASSIC_CHALLENGES")?.get(groupId),
            )
        }

        if (
            groupId === "elusive" &&
            location !== "GLOBAL_ELUSIVES_CHALLENGES"
        ) {
            if (!mainGroup) {
                // emergency bailout - shouldn't happen in practice
                return undefined
            }

            return mergeSavedChallengeGroups(
                mainGroup,
                gameGroups.get("GLOBAL_ELUSIVES_CHALLENGES")?.get(groupId),
            )
        }

        return mainGroup
    }

    public getChallengesForGroup(
        groupId: string,
        gameVersion: GameVersion,
    ): GroupIndexedChallengeLists {
        return {
            [groupId]: Array.from(this.challenges[gameVersion].values()).filter(
                (value) => value.inGroup === groupId,
            ),
        }
    }

    public getGroupContentByIdLoc(
        groupId: string,
        location: string,
        gameVersion: GameVersion,
    ): Set<string> | undefined {
        const gameChalGC = this.groupContents[gameVersion]

        if (groupId === "feats" && gameVersion !== "h3") {
            return new Set([
                ...(gameChalGC.get(location)?.get(groupId) ?? []),
                ...(gameChalGC
                    .get("GLOBAL_ESCALATION_CHALLENGES")
                    ?.get(groupId) ?? []),
            ])
        }

        if (groupId?.includes("featured")) {
            return gameChalGC.get("GLOBAL_FEATURED_CHALLENGES")?.get(groupId)
        }

        if (groupId?.includes("arcade")) {
            return gameChalGC.get("GLOBAL_ARCADE_CHALLENGES")?.get(groupId)
        }

        if (groupId?.includes("escalation")) {
            return gameChalGC.get("GLOBAL_ESCALATION_CHALLENGES")?.get(groupId)
        }

        // Included by default. Filtered later.
        if (groupId === "classic" && location !== "GLOBAL_CLASSIC_CHALLENGES") {
            return new Set([
                ...(gameChalGC.get(location)?.get(groupId) ?? []),
                ...(gameChalGC.get("GLOBAL_CLASSIC_CHALLENGES")?.get(groupId) ??
                    []),
            ])
        }

        if (
            groupId === "elusive" &&
            location !== "GLOBAL_ELUSIVES_CHALLENGES"
        ) {
            return new Set([
                ...(gameChalGC.get(location)?.get(groupId) ?? []),
                ...(gameChalGC
                    .get("GLOBAL_ELUSIVES_CHALLENGES")
                    ?.get(groupId) ?? []),
            ])
        }

        return gameChalGC.get(location)?.get(groupId)
    }

    getDependenciesForChallenge(
        challengeId: string,
        gameVersion: GameVersion,
    ): readonly string[] {
        return this._dependencyTree[gameVersion].get(challengeId) || []
    }

    /**
     * This method checks the heuristics of a challenge.
     * It parses the context listeners of the challenge and if the challenge has any dependencies (other challenges that need to be completed before this one), it adds them to the dependency tree.
     *
     * @param challenge The challenge to check.
     * @param gameVersion The game version this challenge belongs to.
     */
    protected checkHeuristics(
        challenge: RegistryChallenge,
        gameVersion: GameVersion,
    ): void {
        const ctxListeners = ChallengeRegistry._parseContextListeners(challenge)

        if (ctxListeners.challengeTreeIds.length > 0) {
            this._dependencyTree[gameVersion].set(
                challenge.Id,
                ctxListeners.challengeTreeIds,
            )
        }
    }

    /**
     * Parse a challenge's context listeners into the format used internally.
     *
     * @param challenge The challenge.
     * @param Context The current context of the challenge.
     * @returns The context listener details.
     */
    protected static _parseContextListeners(
        challenge: RegistryChallenge,
        Context?: Record<string, unknown>,
    ): ParsedContextListenerInfo {
        return parseContextListeners(
            challenge.Definition?.ContextListeners || {},
            {
                ...(Context || challenge.Definition?.Context || {}),
                ...(challenge.Definition?.Constants || {}),
            },
        )
    }
}

export class ChallengeService extends ChallengeRegistry {
    public hooks: {
        /**
         * A hook that is called when a challenge is completed.
         *
         * Params:
         * - userId: The user's ID.
         * - challenge: The challenge.
         * - gameVersion: The game version.
         */
        onChallengeCompleted: SyncHook<[string, RegistryChallenge, GameVersion]>
    }

    constructor(controller: Controller) {
        super(controller)
        this.hooks = {
            onChallengeCompleted: new SyncHook(),
        }
    }

    /**
     * Check if the challenge needs to be saved in the user's progression data.
     * Challenges with scopes "profile" or "hit".
     *
     * @param challenge The challenge.
     * @returns Whether the challenge needs to be saved in the user's progression data.
     */
    needSaveProgression(challenge: RegistryChallenge): boolean {
        return (
            challenge.Definition.Scope === "profile" ||
            challenge.Definition.Scope === "hit"
        )
    }

    /**
     * Same concept as {@link getPersistentChallengeProgression},
     * but significantly faster. Why? Because it doesn't need to load the user's
     * data, check dependencies, etc. It's just a yes or no.
     *
     * @param userData The user's data object. Will not be modified.
     * @param challengeId The ID of the challenge.
     * @returns Whether the challenge is completed.
     * @see getPersistentChallengeProgression
     */
    fastGetIsCompleted(
        userData: Readonly<UserProfile>,
        challengeId: string,
    ): boolean {
        return (
            userData.Extensions.ChallengeProgression[challengeId]?.Completed ||
            false
        )
    }

    /**
     * Same concept as {@link fastGetIsCompleted},
     * but for if a challenge is unticked.
     *
     * @param userData The user's data object. Will not be modified.
     * @param challengeId The ID of the challenge.
     * @returns Whether the challenge is completed and unticked.
     * @see fastGetIsCompleted
     */
    fastGetIsUnticked(
        userData: Readonly<UserProfile>,
        challengeId: string,
    ): boolean {
        const progression =
            userData.Extensions.ChallengeProgression[challengeId]
        return (progression?.Completed && !progression.Ticked) || false
    }

    getPersistentChallengeProgression(
        userId: string,
        challengeId: string,
        gameVersion: GameVersion,
    ): ChallengeProgressionData {
        const userData = getUserData(userId, gameVersion)

        const challenge = this.getChallengeById(challengeId, gameVersion)

        userData.Extensions.ChallengeProgression ??= {}

        const data = userData.Extensions.ChallengeProgression

        // prevent game crash - when we have a challenge that is completed, we
        // need to implicitly add this key to the state
        if (data[challengeId]?.Completed) {
            data[challengeId].State = {
                CurrentState: "Success",
            }
            data[challengeId].CurrentState = "Success"
        }

        // apply default context if no progression exists
        data[challengeId] ??= {
            Ticked: false,
            Completed: false,
            CurrentState: "Start",
            State:
                (<ChallengeDefinitionLike>challenge?.Definition)?.Context || {},
        }

        const dependencies = this.getDependenciesForChallenge(
            challengeId,
            gameVersion,
        )

        if (dependencies.length > 0) {
            data[challengeId].State.CompletedChallenges = dependencies.filter(
                (depId) => this.fastGetIsCompleted(userData, depId),
            )
        }

        return {
            Completed: data[challengeId].Completed,
            Ticked: data[challengeId].Ticked,
            State: data[challengeId].State,
            ChallengeId: challengeId,
            ProfileId: userId,
            CompletedAt: null,
            MustBeSaved: true,
        }
    }

    /**
     * This is a helper function for {@link getGroupedChallengeLists}. It is not expected to be used elsewhere.
     *
     * Filter all challenges in a parent location using a given filter, sort them into groups,
     * and write them into the `challenges` array provided.
     *
     * @param filter The filter to use.
     * @param location The parent location whose challenges to get.
     * @param challenges The array to write results to.
     * @param gameVersion The game's version.
     */
    getGroupedChallengesByLoc(
        filter: ChallengeFilterOptions,
        location: string,
        challenges: [string, RegistryChallenge[]][],
        gameVersion: GameVersion,
    ) {
        const groups = this.groups[gameVersion].get(location)?.keys() ?? []

        for (const groupId of groups) {
            // if this is the global group, skip it.
            if (groupId === "global") {
                continue
            }

            const groupContents = this.getGroupContentByIdLoc(
                groupId,
                location,
                gameVersion,
            )

            if (groupContents) {
                let groupChallenges: RegistryChallenge[] | string[] = [
                    ...groupContents,
                ]

                groupChallenges = groupChallenges
                    .map((challengeId) => {
                        const challenge = this.getChallengeById(
                            challengeId,
                            gameVersion,
                        )

                        // early return if the challenge is falsy
                        if (!challenge) {
                            return challenge
                        }

                        const res = filterChallenge(filter, challenge)

                        return res ? challenge : undefined
                    })
                    .filter(Boolean) as RegistryChallenge[]

                challenges.push([groupId, [...groupChallenges]])
            }
        }
    }

    /**
     * Filter all challenges in a parent location using a given filter, sort them into groups,
     * and return them as a `GroupIndexedChallengeLists`.
     *
     * @param filter The filter to use.
     * @param location The parent location whose challenges to get.
     * @param gameVersion The active game version.
     * @returns A GroupIndexedChallengeLists containing the resulting challenge groups.
     */
    getGroupedChallengeLists(
        filter: ChallengeFilterOptions,
        location: string,
        gameVersion: GameVersion,
    ): GroupIndexedChallengeLists {
        let challenges: [string, RegistryChallenge[]][] = []

        // Challenge packs ignore the filter
        if (this.challengePacks.has(location)) {
            challenges.push([
                location,
                this.getChallengesForGroup(location, gameVersion)[location],
            ])
        } else {
            this.getGroupedChallengesByLoc(
                filter,
                location,
                challenges,
                gameVersion,
            )

            if (
                filter.type === ChallengeFilterType.Contract &&
                filter.isFeatured
            ) {
                this.getGroupedChallengesByLoc(
                    filter,
                    "GLOBAL_FEATURED_CHALLENGES",
                    challenges,
                    gameVersion,
                )
            }

            this.getGroupedChallengesByLoc(
                filter,
                "GLOBAL_ARCADE_CHALLENGES",
                challenges,
                gameVersion,
            )

            // H2 & H1 have the escalation challenges in "feats"
            if (gameVersion === "h3") {
                this.getGroupedChallengesByLoc(
                    filter,
                    "GLOBAL_ESCALATION_CHALLENGES",
                    challenges,
                    gameVersion,
                )
            }
        }

        // remove empty groups
        challenges = challenges.filter(
            ([, challenges]) => challenges.length > 0,
        )

        return Object.fromEntries(challenges)
    }

    getChallengesForContract(
        contractId: string,
        gameVersion: GameVersion,
        userId: string,
        difficulty = 4,
    ): GroupIndexedChallengeLists {
        const userData = getUserData(userId, gameVersion)
        const contractGroup = this.controller.resolveContract(contractId, true)

        if (!contractGroup) {
            return {}
        }

        let contract: MissionManifest | undefined

        if (
            contractGroup.Metadata.Type === "arcade" &&
            contractGroup.Metadata.Id === contractId
        ) {
            const currentLevel =
                contractGroup.Metadata.GroupDefinition?.Order[
                    getUserEscalationProgress(userData, contractId) - 1
                ]

            assert.ok(currentLevel, "expected current level ID in escalation")

            contract = this.controller.resolveContract(currentLevel, false)
        } else {
            contract = this.controller.resolveContract(contractId, false)
        }

        if (!contract) {
            return {}
        }

        const levelParentLocation = getSubLocationFromContract(
            contract,
            gameVersion,
        )?.Properties.ParentLocation

        assert.ok(levelParentLocation)

        return this.getGroupedChallengeLists(
            {
                type: ChallengeFilterType.Contract,
                contractId: contractId,
                locationId:
                    contractGroup.Metadata.Id ===
                        "aee6a16f-6525-4d63-a37f-225e293c6118" &&
                    gameVersion !== "h1"
                        ? "LOCATION_ICA_FACILITY_SHIP"
                        : contract.Metadata.Location,
                isFeatured: contractGroup.Metadata.Type === "featured",
                difficulty,
            },
            levelParentLocation,
            gameVersion,
        )
    }

    getChallengesForLocation(
        child: string,
        gameVersion: GameVersion,
    ): GroupIndexedChallengeLists {
        const locations = getVersionedConfig<PeacockLocationsData>(
            "LocationsData",
            gameVersion,
            true,
        )
        const parent = locations.children[child].Properties.ParentLocation

        let contracts = isSniperLocation(child)
            ? // @ts-expect-error This is fine - we know it will be there
              this.controller.missionsInLocations.sniper[child]
            : // @ts-expect-error This is fine - we know it will be there
              (this.controller.missionsInLocations[child] ?? [])
                  .concat(
                      // @ts-expect-error This is fine - we know it will be there
                      this.controller.missionsInLocations.escalations[child],
                  )
                  // @ts-expect-error This is fine - we know it will be there
                  .concat(this.controller.missionsInLocations.arcade[child])

        if (!contracts) {
            contracts = []
        }

        assert.ok(parent, "expected parent location")

        return this.getGroupedChallengeLists(
            {
                type: ChallengeFilterType.Contracts,
                contractIds: contracts,
                locationId: child,
            },
            parent,
            gameVersion,
        )
    }

    startContract(session: ContractSession): void {
        // we know we will have challenge contexts because this session is
        // brand new.
        const { gameVersion, contractId, challengeContexts } = session

        const contractJson = this.controller.resolveContract(contractId, true)

        const challengeGroups = this.getChallengesForContract(
            contractId,
            gameVersion,
            session.userId,
            session.difficulty,
        )

        if (contractJson?.Metadata.Type === "evergreen") {
            session.evergreen = {
                payout: 0,
                scoringScreenEndState: null,
                failed: false,
            }
        }

        // TODO: Add this to getChallengesForContract without breaking the rest of Peacock?
        challengeGroups["global"] =
            this.getGroupByIdLoc(
                "global",
                "GLOBAL",
                session.gameVersion,
            )?.Challenges.filter((val) =>
                inclusionDataCheck(val.InclusionData, contractJson),
            ) || []

        const profile = getUserData(session.userId, session.gameVersion)

        for (const group of Object.keys(challengeGroups)) {
            if (!challengeContexts) {
                break
            }

            for (const challenge of challengeGroups[group]) {
                challengeContexts[challenge.Id] = {
                    context: undefined,
                    state: this.fastGetIsCompleted(profile, challenge.Id)
                        ? "Success"
                        : undefined,
                    timers: [],
                    timesCompleted: 0,
                }

                if (this.needSaveProgression(challenge)) {
                    profile.Extensions.ChallengeProgression[challenge.Id] ??= {
                        Ticked: false,
                        Completed: false,
                        CurrentState: "Start",
                        State:
                            (<ChallengeDefinitionLike>challenge?.Definition)
                                ?.Context || {},
                    }

                    challengeContexts[challenge.Id].context =
                        profile.Extensions.ChallengeProgression[
                            challenge.Id
                        ].State
                    challengeContexts[challenge.Id].state ??=
                        profile.Extensions.ChallengeProgression[
                            challenge.Id
                        ].CurrentState
                } else {
                    challengeContexts[challenge.Id].context =
                        fastClone(
                            (<ChallengeDefinitionLike>challenge.Definition)
                                ?.Context || {},
                        ) || {}
                    challengeContexts[challenge.Id].state ??= "Start"
                }
            }
        }
    }

    /**
     * Updates the challenge context for a given challenge on an event.
     * @param event  The event to handle.
     * @param session  The session to handle the event for.
     * @param challengeId  The challenge to handle the event for.
     * @param userData  The user data to update.
     * @param data  The context of the challenge.
     */
    public challengeOnEvent(
        event: ClientToServerEvent,
        session: ContractSession,
        challengeId: string,
        userData: UserProfile,
        data: ChallengeContext,
    ): void {
        const challenge = this.getChallengeById(
            challengeId,
            session.gameVersion,
        )

        if (!challenge) {
            log(LogLevel.WARN, `Challenge ${challengeId} not found`)
            return
        }

        if (this.fastGetIsCompleted(userData, challengeId)) {
            return
        }

        try {
            const options: HandleEventOptions = {
                eventName: event.Name,
                currentState: data.state,
                timers: data.timers,
                timestamp: event.Timestamp,
                contractId: session.contractId,
                // logger: (category, message) =>
                //     log(LogLevel.DEBUG, `[${category}] ${message}`),
            }

            const previousState = data.state

            const result = handleEvent(
                // @ts-expect-error Needs to be fixed upstream.
                challenge.Definition,
                fastClone(data.context),
                event.Value,
                options,
            )

            if (this.needSaveProgression(challenge)) {
                userData.Extensions.ChallengeProgression[challengeId].State =
                    result.context

                userData.Extensions.ChallengeProgression[
                    challengeId
                ].CurrentState = result.state

                writeUserData(session.userId, session.gameVersion)
            }

            // Need to update session context for all challenges
            // to correctly determine challenge completion
            data.state = result.state
            data.context = result.context || challenge.Definition?.Context || {}

            if (previousState !== "Success" && result.state === "Success") {
                this.onChallengeCompleted(
                    session,
                    session.userId,
                    session.gameVersion,
                    challenge,
                )
            }
        } catch (e) {
            log(LogLevel.ERROR, e)
        }
    }

    /**
     * Upon an event, updates the context for all challenges in a contract session. Challenges not in the session are ignored.
     * @param event The event to handle.
     * @param session The session.
     */
    onContractEvent(
        event: ClientToServerEvent,
        session: ContractSession,
    ): void {
        if (!session.challengeContexts) {
            log(LogLevel.WARN, "Session does not have challenge contexts.")
            log(LogLevel.WARN, "Challenges will be disabled!")
            return
        }

        const userData = getUserData(session.userId, session.gameVersion)

        for (const challengeId of Object.keys(session.challengeContexts)) {
            this.challengeOnEvent(
                event,
                session,
                challengeId,
                userData,
                session.challengeContexts[challengeId],
            )
        }
    }

    /**
     * Get the challenge tree for a contract.
     *
     * @param contractId The ID of the contract.
     * @param gameVersion The game version requesting the challenges.
     * @param userId The user requesting the challenges' ID.
     * @param difficulty The upper bound on the difficulty of the challenges to return, defaulted to 4 (return challenges of all difficulties).
     * @returns The challenge tree.
     */
    getChallengeTreeForContract(
        contractId: string,
        gameVersion: GameVersion,
        userId: string,
        difficulty = gameDifficulty.master,
    ): CompiledChallengeTreeCategory[] {
        const userData = getUserData(userId, gameVersion)

        const contractData = this.controller.resolveContract(contractId, true)

        if (!contractData) {
            return []
        }

        let levelData: MissionManifest | undefined

        if (
            contractData.Metadata.Type === "arcade" &&
            contractData.Metadata.Id === contractId
        ) {
            const order =
                contractData.Metadata.GroupDefinition?.Order[
                    getUserEscalationProgress(userData, contractId) - 1
                ]

            if (!order) {
                log(
                    LogLevel.WARN,
                    `Failed to get escalation order in CTREE [${contractData.Metadata.GroupDefinition?.Order}]`,
                )
                return []
            }

            levelData = this.controller.resolveContract(order, false)
        } else {
            levelData = this.controller.resolveContract(contractId, false)
        }

        if (!levelData) {
            log(
                LogLevel.WARN,
                `Failed to get level data in CTREE [${contractId}]`,
            )
            return []
        }

        const subLocation = getSubLocationFromContract(levelData, gameVersion)

        if (!subLocation) {
            log(
                LogLevel.WARN,
                `Failed to get location data in CTREE [${contractData.Metadata.Location}]`,
            )
            return []
        }

        const forContract = this.getChallengesForContract(
            levelData.Metadata.Id,
            gameVersion,
            userId,
            difficulty,
        )
        return this.reBatchIntoSwitchedData(
            forContract,
            userId,
            gameVersion,
            false,
            subLocation,
        )
    }

    private mapSwitchChallenges(
        challenges: RegistryChallenge[],
        userId: string,
        gameVersion: GameVersion,
        compiler: Compiler,
    ): CompiledChallengeTreeData[] {
        return challenges
            .map((challengeData) => {
                return compiler(
                    challengeData,
                    this.getPersistentChallengeProgression(
                        userId,
                        challengeData.Id,
                        gameVersion,
                    ),
                    gameVersion,
                    userId,
                )
            })
            .sort((a, b) => a.OrderIndex - b.OrderIndex)
    }

    private getChallengeDependencyData(
        challengeData: RegistryChallenge,
        userId: string,
        gameVersion: GameVersion,
    ): ChallengeTreeWaterfallState {
        const userData = getUserData(userId, gameVersion)

        // Always return null for completed challenges
        if (this.fastGetIsCompleted(userData!, challengeData.Id)) {
            return null
        }

        // Handle challenge dependencies
        const dependencies = this.getDependenciesForChallenge(
            challengeData.Id,
            gameVersion,
        )
        const completed: string[] = []
        const missing: string[] = []

        for (const dependency of dependencies) {
            if (this.fastGetIsCompleted(userData!, dependency)) {
                completed.push(dependency)
                continue
            }

            missing.push(dependency)
        }

        const { challengeCountData } = ChallengeService._parseContextListeners(
            challengeData,
            userData.Extensions.ChallengeProgression[challengeData.Id].State,
        )

        // If this challenge is counting something, AND it relies on other challenges (e.g. SA5, SA12, ...)
        // Then the "count & total" return format prevails.
        if (challengeCountData.total > 0) {
            return {
                count: challengeCountData.count,
                total: challengeCountData.total,
            }
        }

        if (dependencies.length > 0) {
            return {
                count: completed.length,
                completed,
                total: dependencies.length,
                missing: missing.length,
                all: dependencies,
            }
        }

        return null
    }

    getChallengeDataForDestination(
        locationParentId: string,
        gameVersion: GameVersion,
        userId: string,
    ): CompiledChallengeTreeCategory[] {
        const locationsData = getVersionedConfig<PeacockLocationsData>(
            "LocationsData",
            gameVersion,
            false,
        )

        const locationData = locationsData.parents[locationParentId]

        if (!locationData) {
            log(
                LogLevel.WARN,
                `Failed to get location data in CSERV [${locationParentId}]`,
            )
            return []
        }

        const forLocation = this.getGroupedChallengeLists(
            {
                type: ChallengeFilterType.ParentLocation,
                parent: locationParentId,
            },
            locationParentId,
            gameVersion,
        )

        return this.reBatchIntoSwitchedData(
            forLocation,
            userId,
            gameVersion,
            true,
            locationData,
        )
    }

    getChallengeDataForCategory(
        categoryId: string | null,
        location: Unlockable | undefined,
        gameVersion: GameVersion,
        userId: string,
    ): CompiledChallengeTreeCategory[] {
        const challenges = location
            ? this.getChallengesForLocation(location.Id, gameVersion)
            : this.getChallengesForGroup(categoryId!, gameVersion)

        return this.reBatchIntoSwitchedData(
            challenges,
            userId,
            gameVersion,
            true,
            location,
        )
    }

    /**
     * Re-batch a `GroupIndexedChallengeLists` object into a `CompiledChallengeTreeCategory` array.
     * @param challengeLists The challenge lists to use.
     * @param userId The id of the user.
     * @param gameVersion The current game version.
     * @param isDestination Will also get escalation challenges if set to true.
     * @param location A location as an `Unlockable`. If challengeLists contains all challenges of a challenge pack, this parameter should be "undefined". Otherwise, it might be a parent location or a sublocation, depending on `isDestination`.
     * @returns An array of `CompiledChallengeTreeCategory` objects.
     */
    private reBatchIntoSwitchedData(
        challengeLists: GroupIndexedChallengeLists,
        userId: string,
        gameVersion: GameVersion,
        isDestination: boolean,
        location?: Unlockable,
    ): CompiledChallengeTreeCategory[] {
        const entries = Object.entries(challengeLists)
        const compiler = isDestination
            ? this.compileRegistryDestinationChallengeData.bind(this)
            : this.compileRegistryChallengeTreeData.bind(this)

        const completion = location
            ? generateCompletionData(location?.Id, userId, gameVersion)
            : {}

        const groups = entries
            .map(([groupId, challenges], index) => {
                if (challenges.length === 0) {
                    return undefined
                }

                const groupData = this.getGroupByIdLoc(
                    groupId,
                    challenges[0].ParentLocationId,
                    gameVersion,
                )

                if (!groupData) {
                    return undefined
                }

                const challengeProgressionData = challenges.map(
                    (challengeData) =>
                        this.getPersistentChallengeProgression(
                            userId,
                            challengeData.Id,
                            gameVersion,
                        ),
                )

                const lastGroup = location
                    ? this.getGroupByIdLoc(
                          Object.keys(challengeLists)[index - 1],
                          location.Properties.ParentLocation ?? location.Id,
                          gameVersion,
                      )
                    : undefined
                const nextGroup = location
                    ? this.getGroupByIdLoc(
                          Object.keys(challengeLists)[index + 1],
                          location.Properties.ParentLocation ?? location.Id,
                          gameVersion,
                      )
                    : undefined

                return {
                    Name: groupData.Name,
                    Description: groupData.Description,
                    Image: groupData.Image,
                    CategoryId: groupData.CategoryId,
                    Icon: groupData.Icon,
                    ChallengesCount: challenges.length,
                    CompletedChallengesCount: challengeProgressionData.filter(
                        (progressionData) => progressionData.Completed,
                    ).length,
                    CompletionData: completion,
                    Location: location,
                    IsLocked: location?.Properties.IsLocked || false,
                    ImageLocked: location?.Properties.LockedIcon || "",
                    RequiredResources:
                        location?.Properties.RequiredResources || [],
                    OrderIndex: groupData.OrderIndex ?? 10000,
                    SwitchData: {
                        Data: {
                            Challenges: this.mapSwitchChallenges(
                                challenges,
                                userId,
                                gameVersion,
                                compiler,
                            ),
                            HasPrevious: index !== 0, // whether we are not at the first group
                            HasNext:
                                index !==
                                Object.keys(challengeLists).length - 1, // whether we are not at the final group
                            PreviousCategoryIcon:
                                index !== 0 ? lastGroup?.Icon : "",
                            NextCategoryIcon:
                                index !== Object.keys(challengeLists).length - 1
                                    ? nextGroup?.Icon
                                    : "",
                            CategoryData: {
                                Name: groupData.Name,
                                Image: groupData.Image,
                                Icon: groupData.Icon,
                                ChallengesCount: challenges.length,
                                CompletedChallengesCount:
                                    challengeProgressionData.filter(
                                        (progressionData) =>
                                            progressionData.Completed,
                                    ).length,
                            },
                            CompletionData: completion,
                        },
                        IsLeaf: true,
                    },
                }
            })
            .filter(Boolean) as CompiledChallengeTreeCategory[]

        return groups.sort((a, b) => {
            return a.OrderIndex - b.OrderIndex
        })
    }

    compileRegistryChallengeTreeData(
        challenge: RegistryChallenge,
        progression: ChallengeProgressionData,
        gameVersion: GameVersion,
        userId: string,
        isDestination = false,
    ): CompiledChallengeTreeData {
        const drops = challenge.Drops.map((e) =>
            getUnlockableById(e, gameVersion),
        ).filter(Boolean) as Unlockable[]

        if (drops.length !== challenge.Drops.length) {
            log(
                LogLevel.DEBUG,
                `Challenge ${challenge.Id} contains non-existing drops!`,
            )
        }

        return {
            // GetChallengeTreeFor
            Id: challenge.Id,
            Name: challenge.Name,
            ImageName: challenge.ImageName,
            Description: challenge.Description,
            Rewards: {
                MasteryXP: challenge.Rewards.MasteryXP,
            },
            Drops: drops,
            Completed: progression.Completed,
            IsPlayable: isDestination,
            IsLocked: challenge.IsLocked || false,
            HideProgression: false,
            CategoryName: challenge.CategoryName ?? "NOTFOUND",
            Icon: challenge.Icon,
            LocationId: challenge.LocationId,
            ParentLocationId: challenge.ParentLocationId,
            Type: challenge.Type || "contract",
            ChallengeProgress: this.getChallengeDependencyData(
                challenge,
                userId,
                gameVersion,
            ),
            OrderIndex: challenge.OrderIndex ?? 10000,
            DifficultyLevels: challenge.DifficultyLevels ?? [],
            // Only include CompletionData if ParentLocationId is not an empty string
            ...(challenge.ParentLocationId !== "" && {
                CompletionData: generateCompletionData(
                    challenge.ParentLocationId,
                    userId,
                    gameVersion,
                ),
                TypeHeader: challenge.TypeHeader,
                TypeIcon: challenge.TypeIcon,
                TypeTitle: challenge.TypeTitle,
            }),
        }
    }

    compileRegistryDestinationChallengeData(
        challenge: RegistryChallenge,
        progression: ChallengeProgressionData,
        gameVersion: GameVersion,
        userId: string,
    ): CompiledChallengeTreeData {
        let contract: MissionManifest | undefined

        if (challenge.Type === "contract") {
            contract = this.controller.resolveContract(
                challenge.InclusionData?.ContractIds?.[0] || "",
            )

            // This is so we can remove unused data and make it more like official - AF
            const meta = contract?.Metadata
            contract =
                !contract || !meta
                    ? undefined
                    : {
                          // The null is for escalations as we cannot currently get groups
                          Data: {
                              Bricks: contract.Data.Bricks,
                              DevOnlyBricks: null,
                              GameChangerReferences:
                                  contract.Data.GameChangerReferences || [],
                              GameChangers: contract.Data.GameChangers || [],
                              GameDifficulties:
                                  contract.Data.GameDifficulties || [],
                          },
                          Metadata: {
                              CreationTimestamp: null,
                              CreatorUserId: meta.CreatorUserId,
                              DebriefingVideo: meta.DebriefingVideo || "",
                              Description: meta.Description,
                              Drops: meta.Drops || null,
                              Entitlements: meta.Entitlements || [],
                              GroupTitle: meta.GroupTitle || "",
                              Id: meta.Id,
                              IsPublished: meta.IsPublished || true,
                              LastUpdate: null,
                              Location: meta.Location,
                              PublicId: meta.PublicId || "",
                              ScenePath: meta.ScenePath,
                              Subtype: meta.Subtype || "",
                              TileImage: meta.TileImage,
                              Title: meta.Title,
                              Type: meta.Type,
                          },
                      }
        }

        return {
            ...this.compileRegistryChallengeTreeData(
                challenge,
                progression,
                gameVersion,
                userId,
                true, // isDestination
            ),
            UserCentricContract:
                challenge.Type === "contract"
                    ? generateUserCentric(contract, userId, gameVersion)
                    : (null as unknown as undefined),
        }
    }

    /**
     * Counts the number of challenges and completed challenges in a GroupIndexedChallengeLists object.
     * CAUTION: THIS IS SLOW. Use sparingly.
     *
     * @param challengeLists A GroupIndexedChallengeLists object, holding some challenges to be counted
     * @param userId The userId of the user to acquire completion information
     * @param gameVersion The version of the game
     * @returns An object with two properties: ChallengesCount and CompletedChallengesCount.
     */
    countTotalNCompletedChallenges(
        challengeLists: GroupIndexedChallengeLists,
        userId: string,
        gameVersion: GameVersion,
    ): ChallengeCompletion {
        const userData = getUserData(userId, gameVersion)

        userData.Extensions.ChallengeProgression ??= {}

        let challengesCount = 0
        let completedChallengesCount = 0

        for (const groupId in challengeLists) {
            const challenges = challengeLists[groupId]
            const challengeProgressionData = challenges.map((challengeData) =>
                this.fastGetIsCompleted(userData, challengeData.Id),
            )
            challengesCount += challenges.length
            completedChallengesCount += challengeProgressionData.filter(
                (progressionData) => progressionData,
            ).length
        }

        return {
            ChallengesCount: challengesCount,
            CompletedChallengesCount: completedChallengesCount,
            CompletionPercent: completedChallengesCount / challengesCount,
        }
    }

    /**
     * Checks if the conditions to complete a challenge are met. If so, calls `onChallengeCompleted` for it.
     * @param session The contract session where the challenge was completed.
     * @param challengeId The id of the challenge.
     * @param userData The profile of the user.
     * @param parentId A parent challenge of this challenge, the completion of which might cause this challenge to complete. Pass `undefined` if such a parent is unknown or doesn't exist.
     * @param gameVersion The game version.
     */
    public tryToCompleteChallenge(
        session: ContractSession,
        challengeId: string,
        userData: UserProfile,
        parentId: string,
        gameVersion: GameVersion,
    ): void {
        if (this.fastGetIsCompleted(userData, challengeId)) {
            // Skip completed trees
            return
        }

        if (challengeId === parentId) {
            // we're checking the tree of the challenge that was just completed,
            // so we need to skip it, or we'll get an infinite loop
            return
        }

        const allDeps = this._dependencyTree[gameVersion].get(challengeId)
        assert.ok(allDeps, `No dep tree for ${challengeId}`)

        if (!allDeps.includes(parentId)) {
            // we don't care about this tree, it doesn't depend on the challenge
            // note: without this check, a race condition can occur where two
            // trees basically bounce back and forth between each other, causing
            // an infinite loop
            return
        }

        // Check if the dependency tree is completed now

        const challengeDependency = this.getChallengeById(
            challengeId,
            gameVersion,
        )

        if (!challengeDependency) {
            return
        }

        const { challengeCountData } =
            ChallengeService._parseContextListeners(challengeDependency)

        // First check for challengecounter, then challengetree
        const completed =
            (challengeCountData.total > 0 &&
                challengeCountData.count >= challengeCountData.total - 1) || // The current challenge has not been counted yet
            allDeps.every((depId) => this.fastGetIsCompleted(userData, depId))

        if (!completed) {
            return
        }

        const challenge = this.getChallengeById(challengeId, gameVersion)

        assert.ok(challenge, `No challenge for ${challengeId}`)

        this.onChallengeCompleted(
            session,
            userData.Id,
            gameVersion,
            challenge,
            parentId,
        )
    }

    private onChallengeCompleted(
        session: ContractSession,
        userId: string,
        gameVersion: GameVersion,
        challenge: RegistryChallenge,
        waterfallParent?: string,
    ): void {
        if (waterfallParent) {
            log(
                LogLevel.DEBUG,
                `Challenge ${challenge.Id} completed [via ${waterfallParent}]`,
            )
        } else {
            log(LogLevel.DEBUG, `Challenge ${challenge.Id} completed`)
        }

        this.onContractEvent(
            {
                Value: {
                    ChallengeId: challenge.Id,
                },
                ContractSessionId: session.Id,
                ContractId: session.contractId,
                Name: "ChallengeCompleted",
                // The timestamp (used for timers) is not important here, since it's not an event sent by the game.
                Timestamp: 0,
            },
            session,
        )

        const userData = getUserData(userId, gameVersion)

        // ASSUMED: Challenges that are not global should always be completed
        if (!challenge.Tags.includes("global")) {
            userData.Extensions.ChallengeProgression ??= {}

            userData.Extensions.ChallengeProgression[challenge.Id] ??= {
                CurrentState: "Start",
                State: {},
                Completed: false,
                Ticked: false,
            }

            userData.Extensions.ChallengeProgression[challenge.Id].Completed =
                true
        }

        if (session.challengeContexts) {
            // Always count the number of completions
            if (session.challengeContexts[challenge.Id]) {
                session.challengeContexts[challenge.Id].timesCompleted++
            }

            // If we have a Definition-scope with a Repeatable, we may want to restart it.
            // TODO: Figure out what Base/Delta means. For now if Repeatable is set, we restart the challenge.
            if (
                challenge.Definition.Repeatable &&
                session.challengeContexts[challenge.Id]
            ) {
                session.challengeContexts[challenge.Id].state = "Start"
            }
        }

        controller.progressionService.grantProfileProgression(
            challenge.Xp ?? 0,
            challenge.Rewards?.MasteryXP ?? 0,
            challenge?.Drops ?? [],
            session,
            userData,
            challenge.LocationId,
        )

        this.hooks.onChallengeCompleted.call(userId, challenge, gameVersion)

        // Check if completing this challenge also completes any dependency trees depending on it
        for (const depTreeId of this._dependencyTree[gameVersion].keys()) {
            this.tryToCompleteChallenge(
                session,
                depTreeId,
                userData,
                challenge.Id,
                gameVersion,
            )
        }
    }
}
