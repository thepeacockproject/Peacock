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

import type { Response } from "express"
import {
    difficultyToString,
    handleAxiosError,
    isObjectiveActive,
    PEACOCKVERSTRING,
    xpRequiredForLevel,
} from "./utils"
import { contractSessions, getCurrentState } from "./eventHandler"
import { getConfig, getVersionedConfig } from "./configSwizzleManager"
import { _theLastYardbirdScpc, controller } from "./controller"
import type {
    ContractSession,
    MissionManifestObjective,
    PeacockLocationsData,
    RequestWithJwt,
    Seconds,
} from "./types/types"
import {
    contractIdToEscalationGroupId,
    getLevelCount,
} from "./contracts/escalations/escalationService"
import { getUserData, writeUserData } from "./databaseHandler"
import axios from "axios"
import { getFlag } from "./flags"
import { log, LogLevel } from "./loggingInterop"
import { generateCompletionData } from "./contracts/dataGen"
import { liveSplitManager } from "./livesplit/liveSplitManager"
import { Playstyle, ScoringBonus, ScoringHeadline } from "./types/scoring"
import { MissionEndRequestQuery } from "./types/gameSchemas"
import { ChallengeFilterType } from "./candle/challengeHelpers"
import { getCompletionPercent } from "./menus/destinations"

/**
 * Checks the criteria of each possible play-style, ranking them by scoring.
 *
 * @author CurryMaker
 * @param session The contract session.
 * @returns The play-styles, ranked from best fit to worst fit.
 */
export function calculatePlaystyle(session: ContractSession): Playstyle[] {
    const playstylesCopy = getConfig("Playstyles", true) as Playstyle[]

    // Resetting the scores...
    playstylesCopy.forEach((p) => {
        p.Score = 0
    })

    const doneWeaponTypes: string[] = []
    const doneKillMethods: string[] = []
    const doneAccidents: string[] = []

    session.kills.forEach((k) => {
        if (k.KillClass === "ballistic") {
            if (k.KillItemCategory === "pistol") {
                playstylesCopy[1].Score += 6000
            }

            if (k.IsHeadshot) {
                playstylesCopy[0].Score += 6000
            } else {
                playstylesCopy[0].Score -= 2000
            }

            if (doneWeaponTypes.includes(k.KillItemCategory)) {
                playstylesCopy[2].Score -= 2000
            } else {
                playstylesCopy[2].Score += 6000
                doneWeaponTypes.push(k.KillItemCategory)
            }

            if (k.KillItemCategory === "shotgun") {
                playstylesCopy[7].Score += 6000
            }

            if (k.KillItemCategory === "assaultrifle") {
                playstylesCopy[9].Score += 6000
            }

            if (k.KillItemCategory === "sniperrifle") {
                playstylesCopy[10].Score += 6000
            }

            if (k.KillItemCategory === "smg") {
                playstylesCopy[15].Score += 6000
            }
        } else if (k.KillClass === "melee") {
            if (
                k.KillMethodBroad === "accident" &&
                k.KillItemCategory === undefined
            ) {
                playstylesCopy[4].Score += 6000
            }

            if (k.KillMethodStrict === "fiberwire") {
                playstylesCopy[13].Score += 6000
            }

            if (k.KillMethodBroad === "unarmed") {
                playstylesCopy[16].Score += 6000
            }

            if (k.KillMethodStrict === "accident_drown") {
                playstylesCopy[6].Score += 6000
            }

            if (k.KillMethodBroad === "accident") {
                if (doneAccidents.includes(k.KillMethodStrict)) {
                    playstylesCopy[8].Score -= 2000
                } else {
                    playstylesCopy[8].Score += 6000
                    doneAccidents.push(k.KillMethodStrict)
                }
            }

            playstylesCopy[5].Score += 6000
        } else if (k.KillClass === "explosion") {
            if (k.KillMethodBroad === "explosive") {
                playstylesCopy[12].Score += 6000
            }
            if (k.KillMethodBroad === "accident") {
                playstylesCopy[19].Score += 6000
            }
        } else if (k.KillClass === "unknown") {
            if (k.KillMethodStrict === "accident_electric") {
                playstylesCopy[11].Score += 6000
            }

            if (k.KillMethodStrict === "accident_suspended_object") {
                playstylesCopy[14].Score += 6000
            }

            if (k.KillMethodStrict === "accident_burn") {
                playstylesCopy[18].Score += 6000
            }

            if (doneAccidents.includes(k.KillMethodStrict)) {
                playstylesCopy[8].Score -= 2000
            } else {
                playstylesCopy[8].Score += 6000
                doneAccidents.push(k.KillMethodStrict)
            }
        } else if (k.KillClass === "poison") {
            playstylesCopy[17].Score += 6000
        }

        if (doneKillMethods.includes(k.KillClass)) {
            playstylesCopy[3].Score -= 2000
        } else {
            playstylesCopy[3].Score += 6000
            doneKillMethods.push(k.KillClass)
        }
    })

    playstylesCopy.sort((a, b) => {
        if (a.Score > b.Score) {
            return -1
        }
        if (b.Score > a.Score) {
            return 1
        }
        return 0
    })

    return playstylesCopy
}

export async function missionEnd(
    req: RequestWithJwt<MissionEndRequestQuery>,
    res: Response,
): Promise<void> {
    if (!req.query.contractSessionId) {
        res.status(400).end()
        return
    }

    const sessionDetails = contractSessions.get(req.query.contractSessionId)

    if (!sessionDetails) {
        // contract session not found
        res.status(404).end()
        return
    }

    if (sessionDetails.userId !== req.jwt.unique_name) {
        // requested score for other user's session
        res.status(401).end()
        return
    }

    const userData = getUserData(req.jwt.unique_name, req.gameVersion)

    const contractData =
        req.gameVersion === "scpc" &&
        sessionDetails.contractId === "ff9f46cf-00bd-4c12-b887-eac491c3a96d"
            ? _theLastYardbirdScpc
            : controller.resolveContract(sessionDetails.contractId)

    if (!contractData) {
        // contract not found
        res.status(404).send("contract not found")
        return
    }

    if (contractData.Metadata.Type === "escalation") {
        const eGroupId = contractIdToEscalationGroupId(
            sessionDetails.contractId,
        )

        if (!eGroupId) {
            log(
                LogLevel.ERROR,
                `Unregistered escalation group ${sessionDetails.contractId}`,
            )
            res.status(500).end()
            return
        }

        if (!userData.Extensions.PeacockEscalations[eGroupId]) {
            userData.Extensions.PeacockEscalations[eGroupId] = 1
        }

        if (
            userData.Extensions.PeacockEscalations[eGroupId] ===
            getLevelCount(controller.escalationMappings[eGroupId])
        ) {
            // we are on the final level, and the user completed this level
            if (
                !userData.Extensions.PeacockCompletedEscalations?.includes(
                    eGroupId,
                )
            ) {
                // the user never finished this escalation before
                userData.Extensions.PeacockCompletedEscalations.push(eGroupId)
            }
        } else {
            // not the final level
            userData.Extensions.PeacockEscalations[eGroupId] += 1
        }

        writeUserData(req.jwt.unique_name, req.gameVersion)
    } else if (
        contractData.Metadata.Type === "featured" ||
        contractData.Metadata.Type === "usercreated"
    ) {
        // Update the contract in the played list
        const id = contractData.Metadata.Id

        if (!userData.Extensions.PeacockPlayedContracts[id]) {
            userData.Extensions.PeacockPlayedContracts[id] = {}
        }
        // todo: generate timestamp
        userData.Extensions.PeacockPlayedContracts[id].LastPlayedAt = new Date()
        userData.Extensions.PeacockPlayedContracts[id].Completed = true
        writeUserData(req.jwt.unique_name, req.gameVersion)
    }

    const nonTargetKills =
        contractData?.Metadata.AllowNonTargetKills === true
            ? 0
            : sessionDetails.npcKills.size + sessionDetails.crowdNpcKills

    const locations = getVersionedConfig<PeacockLocationsData>(
        "LocationsData",
        req.gameVersion,
        true,
    )
    const location = contractData.Metadata.Location
    const parent = locations.children[location].Properties.ParentLocation
    const locationChallenges =
        controller.challengeService.getGroupedChallengeLists({
            type: ChallengeFilterType.ParentLocation,
            locationParentId: parent,
        })
    const contractChallenges =
        controller.challengeService.getChallengesForContract(
            sessionDetails.contractId,
            req.gameVersion,
        )
    const challengeCompletion =
        controller.challengeService.countTotalNCompletedChallenges(
            locationChallenges,
            userData.Id,
            req.gameVersion,
        )
    const opportunities = contractData.Metadata.Opportunities
    const opportunityCount = opportunities ? opportunities.length : 0
    const opportunityCompleted = opportunities
        ? opportunities.filter(
              (ms) => ms in userData.Extensions.opportunityprogression,
          ).length
        : 0
    const result = {
        MissionReward: {
            LocationProgression: {
                LevelInfo: Array.from({ length: 1 }, (_, i) =>
                    xpRequiredForLevel(i + 1),
                ),
                XP: 0,
                Level: 1,
                Completion: 1,
                XPGain: 0,
                HideProgression: false,
            },
            ProfileProgression: {
                LevelInfo: [0, 6000],
                LevelInfoOffset: 0,
                XP: userData.Extensions.progression.PlayerProfileXP.Total,
                Level: userData.Extensions.progression.PlayerProfileXP
                    .ProfileLevel,
                XPGain: 0,
            },
            Challenges: Object.values(contractChallenges)
                .flat()
                .filter((challengeData) => {
                    return controller.challengeService.fastGetIsUnticked(
                        userData,
                        challengeData.Id,
                    )
                })
                .map((challengeData) => {
                    const userId = req.jwt.unique_name
                    const gameVersion = req.gameVersion
                    userData.Extensions.ChallengeProgression[
                        challengeData.Id
                    ].Ticked = true
                    writeUserData(userId, gameVersion)
                    return {
                        ChallengeId: challengeData.Id,
                        ChallengeTags: challengeData.Tags,
                        ChallengeName: challengeData.Name,
                        ChallengeImageUrl: challengeData.ImageName,
                        ChallengeDescription: challengeData.Description,
                        XPGain: challengeData.Rewards.MasteryXP,
                        IsGlobal: challengeData.Name.includes("GLOBAL"),
                        IsActionReward:
                            challengeData.Tags.includes("actionreward"),
                        Drops: challengeData.Drops,
                    }
                }),
            Drops: [],
            OpportunityRewards: [], // ?
            CompletionData: generateCompletionData(
                contractData.Metadata.Location,
                req.jwt.unique_name,
                req.gameVersion,
            ),
            ChallengeCompletion: challengeCompletion,
            ContractChallengeCompletion:
                controller.challengeService.countTotalNCompletedChallenges(
                    contractChallenges,
                    userData.Id,
                    req.gameVersion,
                ),
            OpportunityStatistics: {
                Count: opportunityCount,
                Completed: opportunityCompleted,
            },
            LocationCompletionPercent: getCompletionPercent(
                challengeCompletion.CompletedChallengesCount,
                challengeCompletion.ChallengesCount,
                opportunityCompleted,
                opportunityCount,
            ),
        },
        ScoreOverview: {
            XP: 0,
            Level: 1,
            Completion: 1,
            XPGain: 0,
            ChallengesCompleted: 0,
            LocationHideProgression: false,
            ScoreDetails: {
                Headlines: [] as ScoringHeadline[],
            },
            stars: 0,
            SilentAssassin: false,
            ContractScore: {
                AchievedMasteries: [
                    {
                        score: -5000 * nonTargetKills,
                        RatioParts: nonTargetKills,
                        RatioTotal: nonTargetKills,
                        Id: "KillPenaltyMastery",
                        BaseScore: -5000,
                    },
                ],
                TotalNoMultipliers: 0,
                AwardedBonuses: [] as ScoringBonus[],
                FailedBonuses: [] as ScoringBonus[],
                Total: 0,
                StarCount: 0,
                SilentAssassin: false,
                TimeUsedSecs: 0,
            },
            // todo
            NewRank: 1,
            RankCount: 1,
            Rank: 1,
            FriendsRankCount: 1,
            FriendsRank: 1,
            IsPartOfTopScores: false,
            PlayStyle: {},
        },
    }

    const bonuses = [
        {
            headline: "UI_SCORING_SUMMARY_OBJECTIVES",
            bonusId: "AllObjectivesCompletedBonus",
            condition:
                req.gameVersion === "h1" ||
                contractData.Metadata.Id ===
                    "2d1bada4-aa46-4954-8cf5-684989f1668a" ||
                contractData.Data.Objectives?.every(
                    (obj: MissionManifestObjective) =>
                        obj.ExcludeFromScoring ||
                        sessionDetails.completedObjectives.has(obj.Id) ||
                        (obj.IgnoreIfInactive &&
                            !isObjectiveActive(
                                obj,
                                sessionDetails.completedObjectives,
                            )) ||
                        "Success" ===
                            getCurrentState(
                                req.query.contractSessionId!,
                                obj.Id,
                            ),
                ),
        },
        {
            headline: "UI_SCORING_SUMMARY_NOT_SPOTTED",
            bonusId: "Unspotted",
            condition: [
                ...sessionDetails.witnesses,
                ...sessionDetails.spottedBy,
            ].every(
                (witness) =>
                    (req.gameVersion === "h1"
                        ? false
                        : sessionDetails.targetKills.has(witness)) ||
                    sessionDetails.npcKills.has(witness),
            ),
        },
        {
            headline: "UI_SCORING_SUMMARY_NO_NOTICED_KILLS",
            bonusId: "NoWitnessedKillsBonus",
            condition: [...sessionDetails.killsNoticedBy].every(
                (witness) =>
                    (req.gameVersion === "h1"
                        ? true
                        : sessionDetails.targetKills.has(witness)) ||
                    sessionDetails.npcKills.has(witness),
            ),
        },
        {
            headline: "UI_SCORING_SUMMARY_NO_BODIES_FOUND",
            bonusId: "NoBodiesFound",
            condition:
                sessionDetails.legacyHasBodyBeenFound === false &&
                [...sessionDetails.bodiesFoundBy].every(
                    (witness) =>
                        (req.gameVersion === "h1"
                            ? false
                            : sessionDetails.targetKills.has(witness)) ||
                        sessionDetails.npcKills.has(witness),
                ),
        },
        {
            headline: "UI_SCORING_SUMMARY_NO_RECORDINGS",
            bonusId: "SecurityErased",
            condition:
                sessionDetails.recording === "NOT_SPOTTED" ||
                sessionDetails.recording === "ERASED",
        },
    ]

    let stars =
        5 -
        [...bonuses, { condition: nonTargetKills === 0 }].filter(
            (x) => !x!.condition,
        ).length // one star less for each bonus missed

    stars = stars < 0 ? 0 : stars // clamp to 0

    let total = -5000 * nonTargetKills

    const headlineObjTemplate: Partial<ScoringHeadline> = {
        type: "summary",
        count: "",
        scoreIsFloatingType: false,
        fractionNumerator: 0,
        fractionDenominator: 0,
        scoreTotal: 20000,
    }

    for (const bonus of bonuses) {
        const bonusObj = {
            Score: 20000,
            Id: bonus.bonusId,
            FractionNumerator: 0,
            FractionDenominator: 0,
        }
        const headlineObj = Object.assign(
            {},
            headlineObjTemplate,
        ) as ScoringHeadline
        headlineObj.headline = bonus.headline

        if (bonus.condition) {
            total += 20000
            result.ScoreOverview.ScoreDetails.Headlines.push(headlineObj)
            result.ScoreOverview.ContractScore.AwardedBonuses.push(bonusObj)
        } else {
            bonusObj.Score = 0
            headlineObj.scoreTotal = 0
            result.ScoreOverview.ScoreDetails.Headlines.push(headlineObj)
            result.ScoreOverview.ContractScore.FailedBonuses.push(bonusObj)
        }
    }

    total = Math.max(total, 0)
    result.ScoreOverview.ContractScore.TotalNoMultipliers =
        result.ScoreOverview.ContractScore.Total = total

    result.ScoreOverview.ScoreDetails.Headlines.push(
        Object.assign(Object.assign({}, headlineObjTemplate), {
            headline: "UI_SCORING_SUMMARY_KILL_PENALTY",
            count: nonTargetKills > 0 ? `${nonTargetKills}x-5000` : "",
            scoreTotal: -5000 * nonTargetKills,
        }) as ScoringHeadline,
    )

    //#region Time
    const timeTotal: Seconds =
        (sessionDetails.timerEnd as number) -
        (sessionDetails.timerStart as number)
    result.ScoreOverview.ContractScore.TimeUsedSecs = timeTotal

    const timeHours = Math.floor(timeTotal / 3600)
    const timeMinutes = Math.floor((timeTotal - timeHours * 3600) / 60)
    const timeSeconds = Math.floor(
        timeTotal - timeHours * 3600 - timeMinutes * 60,
    )
    let timebonus = 0

    // formula from https://hitmanforumarchive.notex.app/#/t/how-the-time-bonus-is-calculated/17438 (https://archive.ph/pRjzI)
    const scorePoints = [
        [0, 1.1], // 1.1 bonus multiplier at 0 secs (0 min)
        [300, 0.7], // 0.7 bonus multiplier at 300 secs (5 min)
        [900, 0.6], // 0.6 bonus multiplier at 900 secs (15 min)
        [17100, 0.0], // 0 bonus multiplier at 17100 secs (285 min)
    ]

    let prevsecs: number, prevmultiplier: number

    for (const [secs, multiplier] of scorePoints) {
        if (timeTotal > secs) {
            prevsecs = secs
            prevmultiplier = multiplier
            continue
        }

        // linear interpolation between current and previous scorePoints
        const bonusMultiplier =
            prevmultiplier! -
            ((prevmultiplier! - multiplier) * (timeTotal - prevsecs!)) /
                (secs - prevsecs!)
        timebonus = total * bonusMultiplier
        break
    }

    timebonus = Math.round(timebonus)

    total += timebonus

    result.ScoreOverview.ContractScore.AwardedBonuses.push({
        Score: timebonus,
        Id: "SwiftExecution",
        FractionNumerator: 0,
        FractionDenominator: 0,
    })

    result.ScoreOverview.ScoreDetails.Headlines.push(
        Object.assign(Object.assign({}, headlineObjTemplate), {
            headline: "UI_SCORING_SUMMARY_TIME",
            count: `${`0${timeHours}`.slice(-2)}:${`0${timeMinutes}`.slice(
                -2,
            )}:${`0${timeSeconds}`.slice(-2)}`,
            scoreTotal: timebonus,
        }) as ScoringHeadline,
    )
    //#endregion

    for (const type of ["total", "subtotal"]) {
        result.ScoreOverview.ScoreDetails.Headlines.push(
            Object.assign(Object.assign({}, headlineObjTemplate), {
                type,
                headline: `UI_SCORING_SUMMARY_${type.toUpperCase()}`,
                scoreTotal: total,
            }) as ScoringHeadline,
        )
    }

    result.ScoreOverview.stars = result.ScoreOverview.ContractScore.StarCount =
        stars
    result.ScoreOverview.SilentAssassin =
        result.ScoreOverview.ContractScore.SilentAssassin = [
            ...bonuses.slice(1),
            { condition: nonTargetKills === 0 },
        ].every((x) => x.condition) // need to have all bonuses except objectives for SA

    if ((getFlag("autoSplitterForceSilentAssassin") as boolean) === true) {
        if (result.ScoreOverview.SilentAssassin) {
            await liveSplitManager.completeMission(timeTotal)
        } else {
            await liveSplitManager.failMission(timeTotal)
        }
    } else {
        await liveSplitManager.completeMission(timeTotal)
    }

    // Playstyles
    const calculatedPlaystyles = calculatePlaystyle(sessionDetails)
    if (calculatedPlaystyles[0].Score !== 0) {
        result.ScoreOverview.PlayStyle = calculatedPlaystyles[0]
    }

    //#region Leaderboards
    if (
        getFlag("leaderboards") === true &&
        req.gameVersion !== "scpc" &&
        req.gameVersion !== "h1" &&
        sessionDetails.compat === true &&
        contractData.Metadata.Type !== "vsrace"
    ) {
        try {
            // update leaderboards
            await axios.post(
                `${getFlag("leaderboardsHost")}/leaderboards/commit`,
                {
                    contractId: sessionDetails.contractId,
                    gameDifficulty: difficultyToString(
                        sessionDetails.difficulty,
                    ),
                    gameVersion: req.gameVersion,
                    platform: req.jwt.platform,
                    username: userData.Gamertag,
                    platformId:
                        req.jwt.platform === "epic"
                            ? userData.EpicId
                            : userData.SteamId,
                    score: total,
                    data: {
                        Score: {
                            Total: total,
                            AchievedMasteries:
                                result.ScoreOverview.ContractScore
                                    .AchievedMasteries,
                            AwardedBonuses:
                                result.ScoreOverview.ContractScore
                                    .AwardedBonuses,
                            TotalNoMultipliers:
                                result.ScoreOverview.ContractScore
                                    .TotalNoMultipliers,
                            TimeUsedSecs:
                                result.ScoreOverview.ContractScore.TimeUsedSecs,
                            FailedBonuses: null,
                            IsVR: false,
                            SilentAssassin: result.ScoreOverview.SilentAssassin,
                            StarCount: stars,
                        },
                        GroupIndex: 0,
                        // TODO sniper scores
                        SniperChallengeScore: null,
                        PlayStyle: result.ScoreOverview.PlayStyle || null,
                        Description: "UI_MENU_SCORE_CONTRACT_COMPLETED",
                        ContractSessionId: req.query.contractSessionId,
                        Percentile: {
                            Spread: Array(10).fill(0),
                            Index: 0,
                        },
                        peacockHeadlines:
                            result.ScoreOverview.ScoreDetails.Headlines,
                    },
                },
                {
                    headers: {
                        "Peacock-Version": PEACOCKVERSTRING,
                    },
                },
            )
        } catch (e) {
            handleAxiosError(e)
            log(
                LogLevel.WARN,
                "Failed to commit leaderboards data! Either you or the server may be offline.",
            )
        }
    }
    //#endregion

    res.json({
        template:
            req.gameVersion === "scpc"
                ? getConfig("FrankensteinScoreOverviewTemplate", false)
                : null,
        data: result,
    })
}
