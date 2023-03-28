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
    getSubLocationByName,
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
import { SavedChallengeGroup } from "../types/challenges"
import {
    clampValue,
    DEFAULT_MASTERY_MAXLEVEL,
    evergreenLevelForXp,
    fastClone,
    getMaxProfileLevel,
    levelForXp,
    xpRequiredForEvergreenLevel,
    xpRequiredForLevel,
    isSniperLocation,
} from "../utils"
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
import { awardDropsToUser, getDataForUnlockables } from "../inventory"

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

/**
 * A base class providing challenge registration support.
 */
export abstract class ChallengeRegistry {
    protected challenges: Map<string, RegistryChallenge> = new Map()

    /** A map of parentLocationIds to maps of groupIds to SavedChallengeGroup objects for this group of this parent location. */
    protected groups: Map<string, Map<string, SavedChallengeGroup>> = new Map()

    /** A map of parentLocationIds to maps of groupIds to sets of challenge Ids in this group of this parent location. */

    protected groupContents: Map<string, Map<string, Set<string>>> = new Map()
    /**
     * A map of a challenge ID to a list of challenge IDs that it depends on.
     */
    protected readonly _dependencyTree: Map<string, readonly string[]> =
        new Map()

    protected constructor(protected readonly controller: Controller) {}

    registerChallenge(
        challenge: RegistryChallenge,
        groupId: string,
        location: string,
    ): void {
        challenge.inGroup = groupId
        this.challenges.set(challenge.Id, challenge)

        if (!this.groupContents.has(location)) {
            this.groupContents.set(location, new Map())
        }

        const locationMap = this.groupContents.get(location)!

        if (!locationMap.has(groupId)) {
            locationMap.set(groupId, new Set())
        }

        const set = locationMap.get(groupId)!
        set.add(challenge.Id)

        this.checkHeuristics(challenge)
    }

    registerGroup(group: SavedChallengeGroup, location: string): void {
        if (!this.groups.has(location)) {
            this.groups.set(location, new Map())
        }
        this.groups.get(location).set(group.CategoryId, group)
    }

    getChallengeById(challengeId: string): RegistryChallenge | undefined {
        return this.challenges.get(challengeId)
    }

    /**
     * Returns a list of all challenges unlockables
     */
    getChallengesUnlockables() {
        return [...this.challenges.values()].reduce((acc, challenge) => {
            if (challenge?.Drops?.length) {
                challenge?.Drops.forEach(
                    (drop) => (acc[drop.Id] = challenge.Id),
                )
            }
            return acc
        }, {})
    }

    /**
     * Gets a challenge group by its parent location and group ID.
     * @param groupId The group ID of the challenge group.
     * @param location The parent location for this challenge group.
     * @returns A `SavedChallengeGroup` if such a group exists, or `undefined` if not.
     */
    getGroupByIdLoc(
        groupId: string,
        location: string,
    ): SavedChallengeGroup | undefined {
        // Included by default. Filtered later.
        if (groupId === "classic" && location !== "GLOBAL_CLASSIC_CHALLENGES") {
            return mergeSavedChallengeGroups(
                this.groups.get(location)?.get(groupId),
                this.groups.get("GLOBAL_CLASSIC_CHALLENGES")?.get(groupId),
            )
        }
        return this.groups.get(location)?.get(groupId)
    }

    public getGroupContentByIdLoc(
        groupId: string,
        location: string,
    ): Set<string> | undefined {
        // Included by default. Filtered later.
        if (groupId === "classic" && location !== "GLOBAL_CLASSIC_CHALLENGES") {
            return new Set([
                ...(this.groupContents.get(location)?.get(groupId) ?? []),
                ...(this.groupContents
                    .get("GLOBAL_CLASSIC_CHALLENGES")
                    ?.get(groupId) ?? []),
            ])
        }
        return this.groupContents.get(location)?.get(groupId)
    }

    getDependenciesForChallenge(challengeId: string): readonly string[] {
        return this._dependencyTree.get(challengeId) || []
    }

    protected checkHeuristics(challenge: RegistryChallenge): void {
        const ctxListeners = ChallengeRegistry._parseContextListeners(challenge)

        if (ctxListeners.challengeTreeIds.length > 0) {
            this._dependencyTree.set(
                challenge.Id,
                ctxListeners.challengeTreeIds,
            )
        }
    }

    /**
     * Parse a challenge's context listeners into the format used internally.
     *
     * @param challenge The challenge.
     * @returns The context listener details.
     */
    protected static _parseContextListeners(
        challenge: RegistryChallenge,
    ): ParsedContextListenerInfo {
        return parseContextListeners(
            challenge.Definition?.ContextListeners || {},
            {
                ...(challenge.Definition?.Context || {}),
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

        const challenge = this.getChallengeById(challengeId)

        userData.Extensions.ChallengeProgression ??= {}

        const data = userData.Extensions.ChallengeProgression

        // prevent game crash - when we have a challenge that is completed, we
        // need to implicitly add this key to the state
        if (data[challengeId]?.Completed) {
            data[challengeId].State = {
                CurrentState: "Success",
            }
        }

        // the default context, used if the user has no progression for this
        // challenge
        const initialContext =
            (<ChallengeDefinitionLike>challenge?.Definition)?.Context || {}

        // apply default context if no progression exists
        data[challengeId] ??= {
            Ticked: false,
            Completed: false,
            State: initialContext,
        }

        const dependencies = this.getDependenciesForChallenge(challengeId)

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
     * Filter all challenges in a parent location using a given filter, sort them into groups,
     * and return them as a `GroupIndexedChallengeLists`.
     *
     * @param filter The filter to use.
     * @param location The parent location whose challenges to get.
     * @returns A GroupIndexedChallengeLists containing the resulting challenge groups.
     */
    getGroupedChallengeLists(
        filter: ChallengeFilterOptions,
        location: string,
    ): GroupIndexedChallengeLists {
        let challenges: [string, RegistryChallenge[]][] = []

        for (const groupId of this.groups.get(location).keys()) {
            // if this is the global group, skip it.
            if (groupId === "global") {
                continue
            }

            const groupContents = this.getGroupContentByIdLoc(groupId, location)
            if (groupContents) {
                let groupChallenges: RegistryChallenge[] | string[] = [
                    ...groupContents,
                ]

                groupChallenges = groupChallenges
                    .map((challengeId) => {
                        const challenge = this.getChallengeById(challengeId)

                        // early return if the challenge is falsy
                        if (!challenge) {
                            return challenge
                        }

                        return filterChallenge(filter, challenge)
                            ? challenge
                            : undefined
                    })
                    .filter(Boolean) as RegistryChallenge[]

                challenges.push([groupId, [...groupChallenges]])
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
    ): GroupIndexedChallengeLists {
        const contract = this.controller.resolveContract(contractId)

        assert.ok(contract)

        const contractParentLocation = getSubLocationFromContract(
            contract,
            gameVersion,
        )?.Properties.ParentLocation

        assert.ok(contractParentLocation)

        return this.getGroupedChallengeLists(
            {
                type: ChallengeFilterType.Contract,
                contractId: contractId,
                locationId: contract.Metadata.Location,
            },
            contractParentLocation,
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
        const location = locations.children[child]
        assert.ok(location)

        let contracts = isSniperLocation(child)
            ? this.controller.missionsInLocations.sniper[child]
            : this.controller.missionsInLocations[child]
        if (!contracts) {
            contracts = []
        }

        return this.getGroupedChallengeLists(
            {
                type: ChallengeFilterType.Contracts,
                contractIds: contracts,
                locationId: child,
            },
            parent,
        )
    }

    startContract(
        userId: string,
        sessionId: string,
        session: ContractSession,
    ): void {
        // we know we will have challenge contexts because this session is
        // brand new.
        const { gameVersion, contractId, challengeContexts } = session

        const challengeGroups = this.getChallengesForContract(
            contractId,
            gameVersion,
        )

        const contractJson = this.controller.resolveContract(contractId)

        if (contractJson.Metadata.Type === "evergreen") {
            session.evergreen = {
                payout: 0,
                scoringScreenEndState: undefined,
                failed: false,
            }
        }

        //TODO: Add this to getChallengesForContract without breaking the rest of Peacock?
        challengeGroups["global"] = this.getGroupByIdLoc(
            "global",
            "GLOBAL",
        ).Challenges.filter((val) =>
            inclusionDataCheck(val.InclusionData, contractJson),
        )

        const profile = getUserData(session.userId, session.gameVersion)

        for (const group of Object.keys(challengeGroups)) {
            for (const challenge of challengeGroups[group]) {
                const isDone = this.fastGetIsCompleted(profile, challenge.Id)

                if (
                    challenge.Definition.Scope === "profile" ||
                    challenge.Definition.Scope === "hit"
                ) {
                    profile.Extensions.ChallengeProgression[challenge.Id] ??= {
                        Ticked: false,
                        Completed: false,
                        State:
                            (<ChallengeDefinitionLike>challenge?.Definition)
                                ?.Context || {},
                    }
                }

                // For challenges with scopes being "profile" or "hit",
                // update challenge progression with the user's progression data
                const ctx =
                    challenge.Definition.Scope === "profile" ||
                    challenge.Definition.Scope === "hit"
                        ? profile.Extensions.ChallengeProgression[challenge.Id]
                              .State
                        : fastClone(
                              (<ChallengeDefinitionLike>challenge.Definition)
                                  ?.Context || {},
                          ) || {}

                challengeContexts[challenge.Id] = {
                    context: ctx,
                    state: isDone ? "Success" : "Start",
                    timers: [],
                    timesCompleted: 0,
                }
            }
        }
    }

    onContractEvent(
        event: ClientToServerEvent,
        sessionId: string,
        session: ContractSession,
    ): void {
        if (!session.challengeContexts) {
            log(LogLevel.WARN, "Session does not have challenge contexts.")
            log(LogLevel.WARN, "Challenges will be disabled!")
            return
        }

        const userData = getUserData(session.userId, session.gameVersion)

        for (const challengeId of Object.keys(session.challengeContexts)) {
            const challenge = this.getChallengeById(challengeId)
            const data = session.challengeContexts[challengeId]

            if (!challenge) {
                log(LogLevel.WARN, `Challenge ${challengeId} not found`)
                continue
            }

            if (this.fastGetIsCompleted(userData, challengeId)) {
                continue
            }

            try {
                const options: HandleEventOptions = {
                    eventName: event.Name,
                    currentState: data.state,
                    timers: data.timers,
                    timestamp: event.Timestamp,
                    //logger: (category, message) =>
                    //    log(LogLevel.DEBUG, `[${category}] ${message}`),
                }

                const previousState = data.state

                const result = handleEvent(
                    // @ts-expect-error Needs to be fixed upstream.
                    challenge.Definition,
                    fastClone(data.context),
                    event.Value,
                    options,
                )

                // For challenges with scopes being "profile" or "hit",
                // save challenge progression to the user's progression data
                if (
                    challenge.Definition.Scope === "profile" ||
                    challenge.Definition.Scope === "hit"
                ) {
                    userData.Extensions.ChallengeProgression[
                        challengeId
                    ].State = result.context

                    writeUserData(session.userId, session.gameVersion)
                }
                // Need to update session context for all challenges
                // to correctly determine challenge completion
                session.challengeContexts[challengeId].state = result.state
                session.challengeContexts[challengeId].context =
                    result.context || challenge.Definition?.Context || {}

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
    }

    /**
     * Get the challenge tree for a contract.
     *
     * @param contractId The ID of the contract.
     * @param gameVersion The game version requesting the challenges.
     * @param userId The user requesting the challenges' ID.
     * @returns The challenge tree.
     */
    getChallengeTreeForContract(
        contractId: string,
        gameVersion: GameVersion,
        userId: string,
    ): CompiledChallengeTreeCategory[] {
        const contractData = this.controller.resolveContract(contractId)

        if (!contractData) {
            return []
        }

        const subLocation = getSubLocationFromContract(
            contractData,
            gameVersion,
        )

        if (!subLocation) {
            log(
                LogLevel.WARN,
                `Failed to get location data in CTREE [${contractData.Metadata.Location}]`,
            )
            return []
        }

        const forContract = this.getChallengesForContract(
            contractId,
            gameVersion,
        )
        return this.reBatchIntoSwitchedData(
            forContract,
            userId,
            gameVersion,
            subLocation,
        )
    }

    private mapSwitchChallenges(
        challenges: RegistryChallenge[],
        userId: string,
        gameVersion: GameVersion,
        compiler: Compiler,
    ): CompiledChallengeTreeData[] {
        const progression = getUserData(userId, gameVersion).Extensions
            .ChallengeProgression
        return challenges.map((challengeData) => {
            // Update challenge progression with the user's latest progression data
            if (
                !progression[challengeData.Id].Completed &&
                (challengeData.Definition.Scope === "profile" ||
                    challengeData.Definition.Scope === "hit")
            ) {
                challengeData.Definition.Context =
                    progression[challengeData.Id].State
            }
            const compiled = compiler(
                challengeData,
                this.getPersistentChallengeProgression(
                    userId,
                    challengeData.Id,
                    gameVersion,
                ),
                gameVersion,
                userId,
            )

            compiled.ChallengeProgress = this.getChallengeDependencyData(
                challengeData,
                userId,
                gameVersion,
            )

            return compiled
        })
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
        const dependencies = this.getDependenciesForChallenge(challengeData.Id)
        const completed: string[] = []
        const missing: string[] = []

        for (const dependency of dependencies) {
            if (this.fastGetIsCompleted(userData!, dependency)) {
                completed.push(dependency)
                continue
            }

            missing.push(dependency)
        }

        const { challengeCountData } =
            ChallengeService._parseContextListeners(challengeData)

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
                type: ChallengeFilterType.None,
            },
            locationParentId,
        )

        return this.reBatchIntoSwitchedData(
            forLocation,
            userId,
            gameVersion,
            locationData,
            true,
        )
    }

    getChallengeDataForLocation(
        locationId: string,
        gameVersion: GameVersion,
        userId: string,
    ): CompiledChallengeTreeCategory[] {
        const locationsData = getVersionedConfig<PeacockLocationsData>(
            "LocationsData",
            gameVersion,
            false,
        )

        const locationData = locationsData.children[locationId]

        if (!locationData) {
            log(
                LogLevel.WARN,
                `Failed to get location data in CSERV [${locationId}]`,
            )
            return []
        }

        const forLocation = this.getChallengesForLocation(
            locationId,
            gameVersion,
        )

        return this.reBatchIntoSwitchedData(
            forLocation,
            userId,
            gameVersion,
            locationData,
            true,
        )
    }

    /**
     * Re-batch a `GroupIndexedChallengeLists` object into a `CompiledChallengeTreeCategory` array.
     * @param challengeLists The challenge lists to use.
     * @param userId The id of the user.
     * @param gameVersion The current game version.
     * @param location A location as an `Unlockable`. Might be a parent location or a sublocation, depending on `isDestination`.
     * @param isDestination Will also get escalation challenges if set to true.
     * @returns An array of `CompiledChallengeTreeCategory` objects.
     */
    private reBatchIntoSwitchedData(
        challengeLists: GroupIndexedChallengeLists,
        userId: string,
        gameVersion: GameVersion,
        location: Unlockable,
        isDestination = false,
    ): CompiledChallengeTreeCategory[] {
        const entries = Object.entries(challengeLists)
        const compiler = isDestination
            ? this.compileRegistryDestinationChallengeData.bind(this)
            : this.compileRegistryChallengeTreeData.bind(this)

        return entries.map(([groupId, challenges], index) => {
            const groupData = this.getGroupByIdLoc(
                groupId,
                location.Properties.ParentLocation ?? location.Id,
            )
            const challengeProgressionData = challenges.map((challengeData) =>
                this.getPersistentChallengeProgression(
                    userId,
                    challengeData.Id,
                    gameVersion,
                ),
            )

            const lastGroup = this.getGroupByIdLoc(
                Object.keys(challengeLists)[index - 1],
                location.Properties.ParentLocation ?? location.Id,
            )
            const nextGroup = this.getGroupByIdLoc(
                Object.keys(challengeLists)[index + 1],
                location.Properties.ParentLocation ?? location.Id,
            )

            const completion = generateCompletionData(
                location?.Id,
                userId,
                gameVersion,
            )

            return {
                Name: groupData?.Name,
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
                IsLocked: location.Properties.IsLocked || false,
                ImageLocked: location.Properties.LockedIcon || "",
                RequiredResources: location.Properties.RequiredResources!,
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
                            index !== Object.keys(challengeLists).length - 1, // whether we are not at the final group
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
    }

    compileRegistryChallengeTreeData(
        challenge: RegistryChallenge,
        progression: ChallengeProgressionData,
        gameVersion: GameVersion,
        userId: string,
        isDestination = false,
    ): CompiledChallengeTreeData {
        return {
            // GetChallengeTreeFor
            Id: challenge.Id,
            Name: challenge.Name,
            ImageName: challenge.ImageName,
            Description: challenge.Description,
            Rewards: {
                MasteryXP: challenge.Rewards.MasteryXP,
            },
            Drops: [],
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
            DifficultyLevels: challenge.DifficultyLevels ?? [],
            // Only include CompletionData if ParentLocationId is not an empty string
            ...(challenge.ParentLocationId !== "" && {
                CompletionData: generateCompletionData(
                    challenge.ParentLocationId,
                    userId,
                    gameVersion,
                ),
            }),
        }
    }

    compileRegistryDestinationChallengeData(
        challenge: RegistryChallenge,
        progression: ChallengeProgressionData,
        gameVersion: GameVersion,
        userId: string,
    ): CompiledChallengeTreeData {
        let contract: MissionManifest | null

        // TODO: Properly get escalation groups for this
        if (challenge.Type === "contract") {
            contract = this.controller.resolveContract(
                challenge.InclusionData?.ContractIds?.[0] || "",
            )

            // This is so we can remove unused data and make it more like official - AF
            const meta = contract?.Metadata
            contract = !contract
                ? null
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
                true, //isDestination
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
    ): { ChallengesCount: number; CompletedChallengesCount: number } {
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
        }
    }

    /**
     * Checks if the conditions to complete a challenge are met. If so, calls `onChallengeCompleted` for it.
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
            // so we need to skip it, or we'll get an infinite loop and hit
            // the max call stack size
            return
        }

        const allDeps = this._dependencyTree.get(challengeId)
        assert.ok(allDeps, `No dep tree for ${challengeId}`)

        if (!allDeps.includes(parentId)) {
            // we don't care about this tree, it doesn't depend on the challenge
            // note: without this check, a race condition can occur where two
            // trees basically bounce back and forth between each other, causing
            // an infinite loop
            return
        }

        // Check if the dependency tree is completed now

        const dep = this.getChallengeById(challengeId)

        const { challengeCountData } =
            ChallengeService._parseContextListeners(dep)

        // First check for challengecounter, then challengetree
        const completed =
            (challengeCountData.total > 0 &&
                challengeCountData.count >= challengeCountData.total - 1) || // The current challenge has not been counted yet
            allDeps.every((depId) => this.fastGetIsCompleted(userData, depId))

        if (!completed) {
            return
        }

        this.onChallengeCompleted(
            session,
            userData.Id,
            gameVersion,
            this.getChallengeById(challengeId),
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

        const userData = getUserData(userId, gameVersion)

        //ASSUMED: Challenges that are not global should always be completed
        if (!challenge.Tags.includes("global")) {
            userData.Extensions.ChallengeProgression ??= {}

            userData.Extensions.ChallengeProgression[challenge.Id] ??= {
                State: {},
                Completed: false,
                Ticked: false,
            }

            userData.Extensions.ChallengeProgression[challenge.Id].Completed =
                true
        }

        //Always count the number of completions
        session.challengeContexts[challenge.Id].timesCompleted++

        //If we have a Definition-scope with a Repeatable, we may want to restart it.
        //TODO: Figure out what Base/Delta means. For now if Repeatable is set, we restart the challenge.
        if (challenge.Definition.Repeatable) {
            session.challengeContexts[challenge.Id].state = "Start"
        }

        //NOTE: Official will always grant XP to both Location Mastery and the Player Profile
        const actionXp = challenge.Xp || 0
        const masteryXp = challenge.Rewards?.MasteryXP || 0

        controller.progressionService.grantProfileProgression(
            actionXp,
            masteryXp,
            challenge?.Drops ?? [],
            session,
            userData,
        )

        writeUserData(userId, gameVersion)

        this.hooks.onChallengeCompleted.call(userId, challenge, gameVersion)

        // Check if completing this challenge also completes any dependency trees depending on it
        for (const depTreeId of this._dependencyTree.keys()) {
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
