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
    clampValue,
    DEFAULT_MASTERY_MAXLEVEL,
    difficultyToString,
    evergreenLevelForXp,
    EVERGREEN_LEVEL_INFO,
    handleAxiosError,
    isObjectiveActive,
    levelForXp,
    PEACOCKVERSTRING,
    SNIPER_LEVEL_INFO,
    xpRequiredForEvergreenLevel,
    xpRequiredForLevel,
} from "./utils"
import { contractSessions, getCurrentState } from "./eventHandler"
import { getConfig } from "./configSwizzleManager"
import { _theLastYardbirdScpc, controller } from "./controller"
import type {
    ContractSession,
    GameChanger,
    GameVersion,
    MissionManifest,
    MissionManifestObjective,
    RatingKill,
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
import { log, logDebug, LogLevel } from "./loggingInterop"
import {
    generateCompletionData,
    getSubLocationByName,
} from "./contracts/dataGen"
import { liveSplitManager } from "./livesplit/liveSplitManager"
import { Playstyle, ScoringHeadline } from "./types/scoring"
import { MissionEndRequestQuery } from "./types/gameSchemas"
import { ChallengeFilterType } from "./candle/challengeHelpers"
import { getCompletionPercent } from "./menus/destinations"
import {
    CalculateXpResult,
    CalculateScoreResult,
    MissionEndResponse,
    MissionEndDrop,
    MissionEndEvergreen,
    MissionEndChallenge,
} from "./types/score"
import { MasteryData } from "./types/mastery"

/**
 * Checks the criteria of each possible play-style, ranking them by scoring.
 *
 * @author CurryMaker
 * @param session The contract session.
 * @returns The play-styles, ranked from best fit to worst fit.
 */
//TODO: This could use an update with more playstyles
export function calculatePlaystyle(
    session: Partial<{ kills: Set<RatingKill> }>,
): Playstyle[] {
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

export function calculateXp(
    contractSession: ContractSession,
): CalculateXpResult {
    const completedChallenges: MissionEndChallenge[] = []
    let totalXp = 0

    //TODO: Merge with the non-global challenges?
    for (const challengeId of Object.keys(contractSession.challengeContexts)) {
        const data = contractSession.challengeContexts[challengeId]

        if (data.timesCompleted <= 0) {
            continue
        }

        const challenge =
            controller.challengeService.getChallengeById(challengeId)

        if (!challenge || !challenge.Xp || !challenge.Tags.includes("global")) {
            continue
        }

        const challengeXp = challenge.Xp * data.timesCompleted
        totalXp += challengeXp

        const challengeData = {
            ChallengeId: challenge.Id,
            ChallengeTags: challenge.Tags,
            ChallengeName: challenge.Name,
            ChallengeImageUrl: challenge.ImageName,
            ChallengeDescription: challenge.Description,
            //TODO: We probably have to use Repeatable here somehow to determine when to "repeat" a challenge.
            XPGain: challengeXp,
            IsGlobal: true,
            IsActionReward: challenge.Tags.includes("actionreward"),
            Drops: challenge.Drops,
        }

        completedChallenges.push(challengeData)
    }

    return {
        completedChallenges: completedChallenges,
        xp: totalXp,
    }
}

export function calculateScore(
    gameVersion: GameVersion,
    contractSessionId: string,
    contractSession: ContractSession,
    contractData: MissionManifest,
    timeTotal: Seconds,
): CalculateScoreResult {
    //Bonuses
    const bonuses = [
        {
            headline: "UI_SCORING_SUMMARY_OBJECTIVES",
            bonusId: "AllObjectivesCompletedBonus",
            condition:
                gameVersion === "h1" ||
                contractData.Metadata.Id ===
                    "2d1bada4-aa46-4954-8cf5-684989f1668a" ||
                contractData.Data.Objectives?.every(
                    (obj: MissionManifestObjective) =>
                        obj.ExcludeFromScoring ||
                        contractSession.completedObjectives.has(obj.Id) ||
                        (obj.IgnoreIfInactive &&
                            !isObjectiveActive(
                                obj,
                                contractSession.completedObjectives,
                            )) ||
                        "Success" ===
                            getCurrentState(contractSessionId, obj.Id),
                ),
            fractionNumerator: 2,
            fractionDenominator: 3,
        },
        {
            headline: "UI_SCORING_SUMMARY_NOT_SPOTTED",
            bonusId: "Unspotted",
            condition: [
                ...contractSession.witnesses,
                ...contractSession.spottedBy,
            ].every(
                (witness) =>
                    (gameVersion === "h1"
                        ? false
                        : contractSession.targetKills.has(witness)) ||
                    contractSession.npcKills.has(witness),
            ),
        },
        {
            headline: "UI_SCORING_SUMMARY_NO_NOTICED_KILLS",
            bonusId: "NoWitnessedKillsBonus",
            condition: [...contractSession.killsNoticedBy].every(
                (witness) =>
                    (gameVersion === "h1"
                        ? true
                        : contractSession.targetKills.has(witness)) ||
                    contractSession.npcKills.has(witness),
            ),
        },
        {
            headline: "UI_SCORING_SUMMARY_NO_BODIES_FOUND",
            bonusId: "NoBodiesFound",
            condition:
                contractSession.legacyHasBodyBeenFound === false &&
                [...contractSession.bodiesFoundBy].every(
                    (witness) =>
                        (gameVersion === "h1"
                            ? false
                            : contractSession.targetKills.has(witness)) ||
                        contractSession.npcKills.has(witness),
                ),
        },
        {
            headline: "UI_SCORING_SUMMARY_NO_RECORDINGS",
            bonusId: "SecurityErased",
            condition:
                contractSession.recording === "NOT_SPOTTED" ||
                contractSession.recording === "ERASED",
        },
    ]

    //Non-target kills
    const nonTargetKills =
        contractData?.Metadata.AllowNonTargetKills === true
            ? 0
            : contractSession.npcKills.size + contractSession.crowdNpcKills

    let totalScore = -5000 * nonTargetKills

    //Headlines and bonuses
    const scoringHeadlines = []
    const awardedBonuses = []
    const failedBonuses = []

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
            FractionNumerator: bonus.fractionNumerator || 0,
            FractionDenominator: bonus.fractionDenominator || 0,
        }

        const headlineObj = Object.assign(
            {},
            headlineObjTemplate,
        ) as ScoringHeadline
        headlineObj.headline = bonus.headline
        headlineObj.fractionNumerator = bonus.fractionNumerator || 0
        headlineObj.fractionDenominator = bonus.fractionDenominator || 0

        if (bonus.condition) {
            totalScore += 20000
            scoringHeadlines.push(headlineObj)
            awardedBonuses.push(bonusObj)
        } else {
            bonusObj.Score = 0
            headlineObj.scoreTotal = 0
            scoringHeadlines.push(headlineObj)
            failedBonuses.push(bonusObj)
        }
    }

    totalScore = Math.max(0, totalScore)

    scoringHeadlines.push(
        Object.assign(Object.assign({}, headlineObjTemplate), {
            headline: "UI_SCORING_SUMMARY_KILL_PENALTY",
            count: nonTargetKills > 0 ? `${nonTargetKills}x-5000` : "",
            scoreTotal: -5000 * nonTargetKills,
        }) as ScoringHeadline,
    )

    //#region Time
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

        timebonus = totalScore * bonusMultiplier
        break
    }

    timebonus = Math.round(timebonus)

    const totalScoreWithBonus = totalScore + timebonus

    awardedBonuses.push({
        Score: timebonus,
        Id: "SwiftExecution",
        FractionNumerator: 0,
        FractionDenominator: 0,
    })

    scoringHeadlines.push(
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
        scoringHeadlines.push(
            Object.assign(Object.assign({}, headlineObjTemplate), {
                type,
                headline: `UI_SCORING_SUMMARY_${type.toUpperCase()}`,
                scoreTotal: totalScoreWithBonus,
            }) as ScoringHeadline,
        )
    }

    //Stars
    let stars =
        5 -
        [...bonuses, { condition: nonTargetKills === 0 }].filter(
            (x) => !x!.condition,
        ).length // one star less for each bonus missed

    stars = stars < 0 ? 0 : stars // clamp to 0

    //Achieved masteries
    const achievedMasteries = [
        {
            score: -5000 * nonTargetKills,
            RatioParts: nonTargetKills,
            RatioTotal: nonTargetKills,
            Id: "KillPenaltyMastery",
            BaseScore: -5000,
        },
    ]

    //NOTE: need to have all bonuses except objectives for SA
    const silentAssassin = [
        ...bonuses.slice(1),
        { condition: nonTargetKills === 0 },
    ].every((x) => x.condition)

    return {
        stars: stars,
        scoringHeadlines: scoringHeadlines,
        achievedMasteries: achievedMasteries,
        awardedBonuses: awardedBonuses,
        failedBonuses: failedBonuses,
        silentAssassin: silentAssassin,
        score: totalScore,
        scoreWithBonus: totalScoreWithBonus,
    }
}

export async function missionEnd(
    req: RequestWithJwt<MissionEndRequestQuery>,
    res: Response,
): Promise<void> {
    //Resolve the contract session
    if (!req.query.contractSessionId) {
        res.status(400).end()
        return
    }

    const sessionDetails = contractSessions.get(req.query.contractSessionId)

    if (!sessionDetails) {
        res.status(404).send("contract session not found")
        return
    }

    if (sessionDetails.userId !== req.jwt.unique_name) {
        res.status(401).send("requested score for other user's session")
        return
    }

    //Resolve userdata
    const userData = getUserData(req.jwt.unique_name, req.gameVersion)

    //Resolve contract data
    const contractData =
        req.gameVersion === "scpc" &&
        sessionDetails.contractId === "ff9f46cf-00bd-4c12-b887-eac491c3a96d"
            ? _theLastYardbirdScpc
            : controller.resolveContract(sessionDetails.contractId)

    if (!contractData) {
        res.status(404).send("contract not found")
        return
    }

    //Handle escalation groups
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
    }

    //Resolve the id of the parent location
    const subLocation = getSubLocationByName(
        contractData.Metadata.Location,
        req.gameVersion,
    )

    const locationParentId = subLocation
        ? subLocation.Properties?.ParentLocation
        : contractData.Metadata.Location

    if (!locationParentId) {
        res.status(404).send("location parentid not found")
        return
    }

    const locationParentIdLowerCase = locationParentId.toLocaleLowerCase()

    //Resolve all opportunities for the location
    const opportunities = contractData.Metadata.Opportunities
    const opportunityCount = opportunities ? opportunities.length : 0
    const opportunityCompleted = opportunities
        ? opportunities.filter(
              (ms) => ms in userData.Extensions.opportunityprogression,
          ).length
        : 0

    //Resolve all challenges for the location
    const locationChallenges =
        controller.challengeService.getGroupedChallengeLists(
            {
                type: ChallengeFilterType.None,
            },
            locationParentId,
        )
    const contractChallenges =
        controller.challengeService.getChallengesForContract(
            sessionDetails.contractId,
            req.gameVersion,
        )
    const locationChallengeCompletion =
        controller.challengeService.countTotalNCompletedChallenges(
            locationChallenges,
            userData.Id,
            req.gameVersion,
        )

    const contractChallengeCompletion =
        controller.challengeService.countTotalNCompletedChallenges(
            contractChallenges,
            userData.Id,
            req.gameVersion,
        )

    const locationPercentageComplete = getCompletionPercent(
        locationChallengeCompletion.CompletedChallengesCount,
        locationChallengeCompletion.ChallengesCount,
        opportunityCompleted,
        opportunityCount,
    )

    //Get the location and playerprofile progression from the userdata
    if (!userData.Extensions.progression.Locations[locationParentIdLowerCase]) {
        userData.Extensions.progression.Locations[locationParentIdLowerCase] = {
            Xp: 0,
            Level: 1,
        }
    }

    const locationProgressionData =
        userData.Extensions.progression.Locations[locationParentIdLowerCase]
    const playerProgressionData =
        userData.Extensions.progression.PlayerProfileXP

    //Calculate XP based on all challenges, including the global ones.
    const calculateXpResult: CalculateXpResult = calculateXp(sessionDetails)
    let justTickedChallenges = 0
    let masteryXpGain = 0

    Object.values(contractChallenges)
        .flat()
        .filter((challengeData) => {
            return (
                !challengeData.Tags.includes("global") &&
                controller.challengeService.fastGetIsUnticked(
                    userData,
                    challengeData.Id,
                )
            )
        })
        .forEach((challengeData) => {
            const userId = req.jwt.unique_name
            const gameVersion = req.gameVersion

            userData.Extensions.ChallengeProgression[challengeData.Id].Ticked =
                true
            writeUserData(userId, gameVersion)

            justTickedChallenges++

            masteryXpGain += challengeData.Rewards.MasteryXP

            calculateXpResult.completedChallenges.push({
                ChallengeId: challengeData.Id,
                ChallengeTags: challengeData.Tags,
                ChallengeName: challengeData.Name,
                ChallengeImageUrl: challengeData.ImageName,
                ChallengeDescription: challengeData.Description,
                XPGain: challengeData.Rewards.MasteryXP,
                IsGlobal: false,
                IsActionReward: challengeData.Tags.includes("actionreward"),
                Drops: challengeData.Drops,
            })
        })

    //NOTE: Official doesn't seem to make up it's mind whether or not XPGain is the same for both Mastery and Profile...
    const totalXpGain = calculateXpResult.xp + masteryXpGain

    //Calculate the old location progression based on the current one and process it
    const oldLocationXp = locationProgressionData.Xp - masteryXpGain
    let oldLocationLevel = levelForXp(oldLocationXp)
    const newLocationXp = locationProgressionData.Xp
    let newLocationLevel = levelForXp(newLocationXp)

    const masteryData =
        controller.masteryService.getMasteryPackage(locationParentId)

    let maxLevel = 1
    let locationLevelInfo = [0]

    if (masteryData) {
        maxLevel = masteryData.MaxLevel || DEFAULT_MASTERY_MAXLEVEL

        Array.from({ length: maxLevel }, (_, i) => {
            return xpRequiredForLevel(i + 1)
        })
    }

    const completionData = generateCompletionData(
        contractData.Metadata.Location,
        req.jwt.unique_name,
        req.gameVersion,
    )

    //Calculate the old playerprofile progression based on the current one and process it
    const oldPlayerProfileXp = playerProgressionData.Total - totalXpGain
    const oldPlayerProfileLevel = levelForXp(oldPlayerProfileXp)
    const newPlayerProfileXp = playerProgressionData.Total
    const newPlayerProfileLevel = levelForXp(newPlayerProfileXp)

    //NOTE: We assume the ProfileLevel is currently already up-to-date
    const profileLevelInfo = []

    for (
        let level = oldPlayerProfileLevel;
        level <= newPlayerProfileLevel + 1;
        level++
    ) {
        profileLevelInfo.push(xpRequiredForLevel(level))
    }

    const profileLevelInfoOffset = oldPlayerProfileLevel - 1

    //Time
    const timeTotal: Seconds =
        (sessionDetails.timerEnd as number) -
        (sessionDetails.timerStart as number)

    //Playstyle
    const calculatedPlaystyles = calculatePlaystyle(sessionDetails)

    let playstyle =
        calculatedPlaystyles[0].Score !== 0
            ? calculatedPlaystyles[0]
            : undefined

    //Calculate score and summary
    const calculateScoreResult = calculateScore(
        req.gameVersion,
        req.query.contractSessionId,
        sessionDetails,
        contractData,
        timeTotal,
    )

    let contractScore = {
        Total: calculateScoreResult.scoreWithBonus,
        AchievedMasteries: calculateScoreResult.achievedMasteries,
        AwardedBonuses: calculateScoreResult.awardedBonuses,
        TotalNoMultipliers: calculateScoreResult.score,
        TimeUsedSecs: timeTotal,
        StarCount: calculateScoreResult.stars,
        FailedBonuses: calculateScoreResult.failedBonuses,
        SilentAssassin: calculateScoreResult.silentAssassin,
    }

    //Evergreen
    const evergreenData: MissionEndEvergreen = <MissionEndEvergreen>{
        PayoutsCompleted: [],
        PayoutsFailed: [],
    }

    if (contractData.Metadata.Type === "evergreen") {
        const gameChangerProperties = getConfig<Record<string, GameChanger>>(
            "EvergreenGameChangerProperties",
            true,
        )

        let totalPayout = 0

        //ASSUMPTION: All payout objectives have a "condition"-category objective
        //and a "secondary"-category objective with a "MyPayout" in the context.
        Object.keys(gameChangerProperties).forEach((e) => {
            const gameChanger = gameChangerProperties[e]

            const conditionObjective = gameChanger.Objectives.find(
                (e) => e.Category === "condition",
            )

            const secondaryObjective = gameChanger.Objectives.find(
                (e) =>
                    e.Category === "secondary" &&
                    e.Definition.Context["MyPayout"],
            )

            if (
                conditionObjective &&
                secondaryObjective &&
                sessionDetails.objectiveStates.get(conditionObjective.Id) ===
                    "Success"
            ) {
                const payoutObjective = {
                    Name: gameChanger.Name,
                    Payout: parseInt(
                        sessionDetails.objectiveContexts.get(
                            secondaryObjective.Id,
                        )["MyPayout"] || 0,
                    ),
                    IsPrestige: gameChanger.IsPrestigeObjective || false,
                }

                if (
                    sessionDetails.objectiveStates.get(
                        secondaryObjective.Id,
                    ) === "Success"
                ) {
                    totalPayout += payoutObjective.Payout
                    evergreenData.PayoutsCompleted.push(payoutObjective)
                } else {
                    evergreenData.PayoutsFailed.push(payoutObjective)
                }
            }
        })

        logDebug("Payout", sessionDetails.evergreen.payout, totalPayout)

        evergreenData.Payout = totalPayout
        evergreenData.EndStateEventName =
            sessionDetails.evergreen.scoringScreenEndState

        locationLevelInfo = EVERGREEN_LEVEL_INFO

        const currentLevelRequiredXp = xpRequiredForEvergreenLevel(
            locationProgressionData.Level,
        )
        const nextLevelRequiredXp = clampValue(
            xpRequiredForEvergreenLevel(locationProgressionData.Level + 1),
            1,
            100,
        )

        //Override completion data for proper animations
        completionData.XP = locationProgressionData.Xp
        completionData.Level = locationProgressionData.Level
        completionData.Completion =
            (currentLevelRequiredXp - locationProgressionData.Xp) /
            (nextLevelRequiredXp - currentLevelRequiredXp)

        //Override the location levels to trigger potential drops
        oldLocationLevel = evergreenLevelForXp(
            locationProgressionData.Xp - totalXpGain,
        )
        newLocationLevel = locationProgressionData.Level

        //Override the silent assassin rank
        if (calculateScoreResult.silentAssassin) {
            playstyle = {
                Id: "595f6ff1-85bf-4e4f-a9ee-76038a455648",
                Name: "UI_PLAYSTYLE_ICA_STEALTH_ASSASSIN",
                Type: "STEALTH_ASSASSIN",
                Score: 0,
            }
        }

        calculateScoreResult.silentAssassin = false

        //Overide the calculated score
        calculateScoreResult.stars = undefined
    }

    //Sniper
    let unlockableProgression = undefined
    let sniperChallengeScore = undefined

    //TODO: Calculate proper Sniper XP and Score
    //TODO: Move most of this to its own calculateSniperScore function
    if (contractData.Metadata.Type === "sniper") {
        const sniperLoadouts = getConfig("SniperLoadouts", true)

        const mainUnlockableProperties =
            sniperLoadouts[contractData.Metadata.Location][
                req.query.masteryUnlockableId
            ].MainUnlockable.Properties

        unlockableProgression = {
            LevelInfo: SNIPER_LEVEL_INFO,
            XP: SNIPER_LEVEL_INFO[SNIPER_LEVEL_INFO.length - 1],
            Level: SNIPER_LEVEL_INFO.length,
            XPGain: 0,
            Id: mainUnlockableProperties.ProgressionKey,
            Name: mainUnlockableProperties.Name,
        }

        sniperChallengeScore = {
            FinalScore: 112000,
            BaseScore: 112000,
            TotalChallengeMultiplier: 1.0,
            BulletsMissed: 0,
            BulletsMissedPenalty: 0,
            TimeTaken: timeTotal,
            TimeBonus: 0,
            SilentAssassin: false,
            SilentAssassinBonus: 0,
            SilentAssassinMultiplier: 1.0,
        }

        //Override the contract score
        contractScore = undefined

        //Override the playstyle
        playstyle = undefined

        //Override the calculated score
        const timeMinutes = Math.floor(timeTotal / 60)
        const timeSeconds = Math.floor(timeTotal % 60)
        const timeMiliseconds = Math.floor(
            ((timeTotal % 60) - timeSeconds) * 1000,
        )

        const defaultHeadline: Partial<ScoringHeadline> = {
            type: "summary",
            count: "",
            scoreIsFloatingType: false,
            fractionNumerator: 0,
            fractionDenominator: 0,
            scoreTotal: 0,
        }

        const headlines = [
            {
                headline: "UI_SNIPERSCORING_SUMMARY_BASESCORE",
                scoreTotal: 112000,
            },
            {
                headline: "UI_SNIPERSCORING_SUMMARY_BULLETS_MISSED_PENALTY",
                scoreTotal: 0,
            },
            {
                headline: "UI_SNIPERSCORING_SUMMARY_TIME_BONUS",
                count: `${String(timeMinutes).padStart(2, "0")}:${String(
                    timeSeconds,
                ).padStart(2, "0")}.${String(timeMiliseconds).padStart(
                    3,
                    "0",
                )}`,
                scoreTotal: 0,
            },
            {
                headline: "UI_SNIPERSCORING_SUMMARY_SILENT_ASSASIN_BONUS",
                scoreTotal: 0,
            },
            {
                headline: "UI_SNIPERSCORING_SUMMARY_SUBTOTAL",
                scoreTotal: 112000,
            },
            {
                headline: "UI_SNIPERSCORING_SUMMARY_CHALLENGE_MULTIPLIER",
                scoreIsFloatingType: true,
                scoreTotal: 1.0,
            },
            {
                headline: "UI_SNIPERSCORING_SUMMARY_SILENT_ASSASIN_MULTIPLIER",
                scoreIsFloatingType: true,
                scoreTotal: 1.0,
            },
            {
                type: "total",
                headline: "UI_SNIPERSCORING_SUMMARY_TOTAL",
                scoreTotal: 112000,
            },
        ]

        calculateScoreResult.stars = undefined
        calculateScoreResult.scoringHeadlines = headlines.map((e) => {
            return Object.assign(
                Object.assign({}, defaultHeadline),
                e,
            ) as ScoringHeadline
        })
    }

    //Drops
    let drops: MissionEndDrop[] = []

    if (newLocationLevel - oldLocationLevel > 0) {
        const masteryData =
            controller.masteryService.getMasteryDataForDestination(
                locationParentId,
                req.gameVersion,
                req.jwt.unique_name,
            ) as MasteryData[]

        if (masteryData) {
            drops = masteryData[0].Drops.filter(
                (e) =>
                    e.Level > oldLocationLevel && e.Level <= newLocationLevel,
            ).map((e) => {
                return {
                    Unlockable: e.Unlockable,
                }
            })
        }
    }

    //Setup the result
    const result: MissionEndResponse = {
        MissionReward: {
            LocationProgression: {
                LevelInfo: locationLevelInfo,
                XP: completionData.XP,
                Level: completionData.Level,
                Completion: completionData.Completion,
                //NOTE: Official makes this 0 if maximum Mastery is reached
                XPGain: completionData.Level === maxLevel ? 0 : totalXpGain,
                HideProgression: masteryData?.HideProgression || false,
            },
            ProfileProgression: {
                LevelInfo: profileLevelInfo,
                LevelInfoOffset: profileLevelInfoOffset,
                XP: newPlayerProfileXp,
                Level: newPlayerProfileLevel,
                XPGain: totalXpGain,
            },
            Challenges: calculateXpResult.completedChallenges,
            Drops: drops,
            //TODO: Do these exist? Appears to be optional.
            OpportunityRewards: [],
            UnlockableProgression: unlockableProgression,
            CompletionData: completionData,
            ChallengeCompletion: locationChallengeCompletion,
            ContractChallengeCompletion: contractChallengeCompletion,
            OpportunityStatistics: {
                Count: opportunityCount,
                Completed: opportunityCompleted,
            },
            LocationCompletionPercent: locationPercentageComplete,
        },
        ScoreOverview: {
            XP: completionData.XP,
            Level: completionData.Level,
            Completion: completionData.Completion,
            //NOTE: Official appears to always make this 0
            XPGain: 0,
            ChallengesCompleted: justTickedChallenges,
            LocationHideProgression: masteryData?.HideProgression || false,
            ProdileId1: req.jwt.unique_name,
            stars: calculateScoreResult.stars,
            ScoreDetails: {
                Headlines: calculateScoreResult.scoringHeadlines,
            },
            ContractScore: contractScore,
            SniperChallengeScore: sniperChallengeScore,
            SilentAssassin:
                contractScore?.SilentAssassin ||
                sniperChallengeScore?.silentAssassin ||
                false,
            //TODO: Use data from the leaderboard?
            NewRank: 1,
            RankCount: 1,
            Rank: 1,
            FriendsRankCount: 1,
            FriendsRank: 1,
            IsPartOfTopScores: false,
            PlayStyle: playstyle,
            IsNewBestScore: false,
            IsNewBestTime: false,
            IsNewBestStars: false,
            Evergreen: evergreenData,
        },
    }

    //Finalize the response
    if ((getFlag("autoSplitterForceSilentAssassin") as boolean) === true) {
        if (result.ScoreOverview.SilentAssassin) {
            await liveSplitManager.completeMission(timeTotal)
        } else {
            await liveSplitManager.failMission(timeTotal)
        }
    } else {
        await liveSplitManager.completeMission(timeTotal)
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
                    score: calculateScoreResult.scoreWithBonus,
                    data: {
                        Score: {
                            Total: calculateScoreResult.scoreWithBonus,
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
                            StarCount: calculateScoreResult.stars,
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
