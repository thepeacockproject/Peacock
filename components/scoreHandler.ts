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
    contractTypes,
    DEFAULT_MASTERY_MAXLEVEL,
    difficultyToString,
    EVERGREEN_LEVEL_INFO,
    evergreenLevelForXp,
    handleAxiosError,
    isObjectiveActive,
    levelForXp,
    PEACOCKVERSTRING,
    SNIPER_LEVEL_INFO,
    sniperLevelForXp,
    xpRequiredForLevel,
} from "./utils"
import { contractSessions, getCurrentState } from "./eventHandler"
import { getConfig } from "./configSwizzleManager"
import { _theLastYardbirdScpc, controller } from "./controller"
import type {
    ContractHistory,
    ContractSession,
    GameChanger,
    GameVersion,
    MissionManifest,
    MissionManifestObjective,
    RequestWithJwt,
    Seconds,
} from "./types/types"
import {
    escalationTypes,
    getLevelCount,
} from "./contracts/escalations/escalationService"
import { getUserData, writeUserData } from "./databaseHandler"
import axios from "axios"
import { getFlag } from "./flags"
import { log, LogLevel } from "./loggingInterop"
import {
    generateCompletionData,
    getSubLocationByName,
} from "./contracts/dataGen"
import { liveSplitManager } from "./livesplit/liveSplitManager"
import { ScoringHeadline } from "./types/scoring"
import { MissionEndRequestQuery } from "./types/gameSchemas"
import { ChallengeFilterType } from "./candle/challengeHelpers"
import { getCompletionPercent } from "./menus/destinations"
import {
    CalculateScoreResult,
    CalculateSniperScoreResult,
    CalculateXpResult,
    MissionEndChallenge,
    MissionEndDrop,
    MissionEndEvergreen,
    MissionEndResponse,
} from "./types/score"
import { MasteryData } from "./types/mastery"
import { createInventory, InventoryItem, getUnlockablesById } from "./inventory"
import { calculatePlaystyle } from "./playStyles"

export function calculateGlobalXp(
    contractSession: ContractSession,
    gameVersion: GameVersion,
): CalculateXpResult {
    const completedChallenges: MissionEndChallenge[] = []
    let totalXp = 0

    // TODO: Merge with the non-global challenges?
    for (const challengeId of Object.keys(contractSession.challengeContexts)) {
        const data = contractSession.challengeContexts[challengeId]

        if (data.timesCompleted <= 0) {
            continue
        }

        const challenge = controller.challengeService.getChallengeById(
            challengeId,
            gameVersion,
        )

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
            // TODO: We probably have to use Repeatable here somehow to determine when to "repeat" a challenge.
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
    contractSession: ContractSession,
    contractData: MissionManifest,
    timeTotal: Seconds,
): CalculateScoreResult {
    // Bonuses
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
                            getCurrentState(contractSession.Id, obj.Id),
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

    // Non-target kills
    const nonTargetKills =
        contractData?.Metadata.AllowNonTargetKills === true
            ? 0
            : contractSession.npcKills.size + contractSession.crowdNpcKills

    let totalScore = -5000 * nonTargetKills

    // Headlines and bonuses
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

    for (const type of ["total", "subtotal"]) {
        scoringHeadlines.push(
            Object.assign(Object.assign({}, headlineObjTemplate), {
                type,
                headline: `UI_SCORING_SUMMARY_${type.toUpperCase()}`,
                scoreTotal: totalScoreWithBonus,
            }) as ScoringHeadline,
        )
    }

    // Stars
    let stars =
        5 -
        [...bonuses, { condition: nonTargetKills === 0 }].filter(
            (x) => !x!.condition,
        ).length // one star less for each bonus missed

    stars = stars < 0 ? 0 : stars // clamp to 0

    // Achieved masteries
    const achievedMasteries = [
        {
            score: -5000 * nonTargetKills,
            RatioParts: nonTargetKills,
            RatioTotal: nonTargetKills,
            Id: "KillPenaltyMastery",
            BaseScore: -5000,
        },
    ]

    // NOTE: need to have all bonuses except objectives for SA
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

export function calculateSniperScore(
    contractSession: ContractSession,
    timeTotal: Seconds,
    inventory: InventoryItem[],
): [CalculateSniperScoreResult, ScoringHeadline[]] {
    const timeMinutes = Math.floor(timeTotal / 60)
    const timeSeconds = Math.floor(timeTotal % 60)
    const timeMiliseconds = Math.floor(((timeTotal % 60) - timeSeconds) * 1000)

    const bonusTimeStart =
        contractSession.firstKillTimestamp ?? contractSession.timerStart
    const bonusTimeEnd = contractSession.timerEnd
    const bonusTimeTotal: Seconds =
        (bonusTimeEnd as number) - (bonusTimeStart as number)

    let timeBonus = 0

    // TODO? generate this curve from contractSession.scoring.Settings["timebonus"] somehow
    const scorePoints = [
        [0, 50000], // 50000 bonus score at 0 secs (0 min)
        [240, 40000], // 40000 bonus score at 240 secs (4 min)
        [480, 35000], // 35000 bonus score at 480 secs (8 min)
        [900, 0], // 0 bonus score at 900 secs (15 min)
    ]
    let prevsecs: number, prevscore: number

    for (const [secs, score] of scorePoints) {
        if (bonusTimeTotal > secs) {
            prevsecs = secs
            prevscore = score
            continue
        }

        // linear interpolation between current and previous scorePoints
        timeBonus =
            prevscore -
            ((prevscore - score) * (bonusTimeTotal - prevsecs)) /
                (secs - prevsecs)
        break
    }

    timeBonus = Math.floor(timeBonus)

    const defaultHeadline: Partial<ScoringHeadline> = {
        type: "summary",
        count: "",
        scoreIsFloatingType: false,
        fractionNumerator: 0,
        fractionDenominator: 0,
        scoreTotal: 0,
    }

    const baseScore = contractSession.scoring.Context["TotalScore"]
    const challengeMultiplier = contractSession.scoring.Settings["challenges"][
        "Unlockables"
    ].reduce((acc, unlockable) => {
        const item = inventory.find((item) => item.Unlockable.Id === unlockable)

        if (item) {
            return acc + item.Unlockable.Properties["Multiplier"]
        }

        return acc
    }, 1.0)
    const bulletsMissed = 0 // TODO? not sure if neccessary, the penalty is always 0 for inbuilt contracts
    const bulletsMissedPenalty =
        bulletsMissed *
        contractSession.scoring.Settings["bulletsused"]["penalty"]
    // Get SA status from global SA challenge for contracttype sniper
    const silentAssassin =
        contractSession.challengeContexts[
            "029c4971-0ddd-47ab-a568-17b007eec04e"
        ].state !== "Failure"
    const saBonus = silentAssassin
        ? contractSession.scoring.Settings["silentassassin"]["score"]
        : 0
    const saMultiplier = silentAssassin
        ? contractSession.scoring.Settings["silentassassin"]["multiplier"]
        : 1.0

    const subTotalScore = baseScore + timeBonus + saBonus - bulletsMissedPenalty
    const totalScore = Math.round(
        subTotalScore * challengeMultiplier * saMultiplier,
    )

    const headlines = [
        {
            headline: "UI_SNIPERSCORING_SUMMARY_BASESCORE",
            scoreTotal: baseScore,
        },
        {
            headline: "UI_SNIPERSCORING_SUMMARY_BULLETS_MISSED_PENALTY",
            scoreTotal: bulletsMissedPenalty,
        },
        {
            headline: "UI_SNIPERSCORING_SUMMARY_TIME_BONUS",
            count: `${String(timeMinutes).padStart(2, "0")}:${String(
                timeSeconds,
            ).padStart(2, "0")}.${String(timeMiliseconds).padStart(3, "0")}`,
            scoreTotal: timeBonus,
        },
        {
            headline: "UI_SNIPERSCORING_SUMMARY_SILENT_ASSASIN_BONUS",
            scoreTotal: saBonus,
        },
        {
            headline: "UI_SNIPERSCORING_SUMMARY_SUBTOTAL",
            scoreTotal: subTotalScore,
        },
        {
            headline: "UI_SNIPERSCORING_SUMMARY_CHALLENGE_MULTIPLIER",
            scoreIsFloatingType: true,
            scoreTotal: challengeMultiplier,
        },
        {
            headline: "UI_SNIPERSCORING_SUMMARY_SILENT_ASSASIN_MULTIPLIER",
            scoreIsFloatingType: true,
            scoreTotal: saMultiplier,
        },
        {
            type: "total",
            headline: "UI_SNIPERSCORING_SUMMARY_TOTAL",
            scoreTotal: totalScore,
        },
    ].map((e) => {
        return Object.assign(
            Object.assign({}, defaultHeadline),
            e,
        ) as ScoringHeadline
    })

    return [
        {
            FinalScore: totalScore,
            BaseScore: baseScore,
            TotalChallengeMultiplier: challengeMultiplier,
            BulletsMissed: bulletsMissed,
            BulletsMissedPenalty: bulletsMissedPenalty,
            TimeTaken: timeTotal,
            TimeBonus: timeBonus,
            SilentAssassin: silentAssassin,
            SilentAssassinBonus: saBonus,
            SilentAssassinMultiplier: saMultiplier,
        },
        headlines,
    ]
}

export async function missionEnd(
    req: RequestWithJwt<MissionEndRequestQuery>,
    res: Response,
): Promise<void> {
    // TODO: For this entire function, add support for 2016 difficulties
    // Resolve the contract session
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

    // Resolve userdata
    const userData = getUserData(req.jwt.unique_name, req.gameVersion)

    // Resolve contract data
    const contractData =
        req.gameVersion === "scpc" &&
        sessionDetails.contractId === "ff9f46cf-00bd-4c12-b887-eac491c3a96d"
            ? _theLastYardbirdScpc
            : controller.resolveContract(sessionDetails.contractId, true)

    if (!contractData) {
        res.status(404).send("contract not found")
        return
    }

    // Handle escalation groups
    if (escalationTypes.includes(contractData.Metadata.Type)) {
        const eGroupId =
            contractData.Metadata.InGroup ?? contractData.Metadata.Id

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

        const history: ContractHistory = {
            LastPlayedAt: new Date().getTime(),
            IsEscalation: true,
        }

        if (
            userData.Extensions.PeacockEscalations[eGroupId] ===
            getLevelCount(controller.resolveContract(eGroupId))
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

            history.Completed = true
        } else {
            // not the final level
            userData.Extensions.PeacockEscalations[eGroupId] += 1
        }

        if (!userData.Extensions.PeacockPlayedContracts[eGroupId]) {
            userData.Extensions.PeacockPlayedContracts[eGroupId] = {}
        }

        userData.Extensions.PeacockPlayedContracts[eGroupId] = history

        writeUserData(req.jwt.unique_name, req.gameVersion)
    } else if (contractTypes.includes(contractData.Metadata.Type)) {
        // Update the contract in the played list
        const id = contractData.Metadata.Id

        if (!userData.Extensions.PeacockPlayedContracts[id]) {
            userData.Extensions.PeacockPlayedContracts[id] = {}
        }

        userData.Extensions.PeacockPlayedContracts[id] = {
            LastPlayedAt: new Date().getTime(),
            Completed: true,
        }

        writeUserData(req.jwt.unique_name, req.gameVersion)
    }

    const levelData = controller.resolveContract(
        sessionDetails.contractId,
        false,
    )

    // Resolve the id of the parent location
    const subLocation = getSubLocationByName(
        levelData.Metadata.Location,
        req.gameVersion,
    )

    const locationParentId = subLocation
        ? subLocation.Properties?.ParentLocation
        : levelData.Metadata.Location

    if (!locationParentId) {
        res.status(404).send("location parentid not found")
        return
    }

    // Resolve all opportunities for the location
    const opportunities = contractData.Metadata.Opportunities
    const opportunityCount = opportunities ? opportunities.length : 0
    const opportunityCompleted = opportunities
        ? opportunities.filter(
              (ms) => ms in userData.Extensions.opportunityprogression,
          ).length
        : 0

    // Resolve all challenges for the location
    const locationChallenges =
        controller.challengeService.getGroupedChallengeLists(
            {
                type: ChallengeFilterType.ParentLocation,
                parent: locationParentId,
            },
            locationParentId,
            req.gameVersion,
        )
    const contractChallenges =
        controller.challengeService.getChallengesForContract(
            sessionDetails.contractId,
            req.gameVersion,
            req.jwt.unique_name,
            sessionDetails.difficulty,
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

    const playerProgressionData =
        userData.Extensions.progression.PlayerProfileXP

    // Calculate XP based on global challenges.
    const calculateXpResult: CalculateXpResult = calculateGlobalXp(
        sessionDetails,
        req.gameVersion,
    )
    let justTickedChallenges = 0
    let totalXpGain = calculateXpResult.xp

    // Calculate XP based on non-global challenges. Remember to add elusive challenges of the contract
    Object.values({
        ...locationChallenges,
        ...(Object.keys(contractChallenges).includes("elusive") && {
            elusive: contractChallenges.elusive,
        }),
    })
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

            totalXpGain += challengeData.Rewards.MasteryXP

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

    let completionData = generateCompletionData(
        levelData.Metadata.Location,
        req.jwt.unique_name,
        req.gameVersion,
        contractData.Metadata.Type,
        req.query.masteryUnlockableId,
    )

    // Calculate the old location progression based on the current one and process it
    const oldLocationXp = completionData.PreviouslySeenXp
        ? completionData.PreviouslySeenXp
        : completionData.XP - totalXpGain
    let oldLocationLevel = levelForXp(oldLocationXp)

    const newLocationXp = completionData.XP
    let newLocationLevel = levelForXp(newLocationXp)

    if (!req.query.masteryUnlockableId) {
        userData.Extensions.progression.Locations[
            locationParentId
        ].PreviouslySeenXp = newLocationXp
    }

    writeUserData(req.jwt.unique_name, req.gameVersion)

    const masteryData = controller.masteryService.getMasteryPackage(
        locationParentId,
        req.gameVersion,
    )

    let maxLevel = 1
    let locationLevelInfo = [0]

    if (masteryData) {
        maxLevel =
            (req.query.masteryUnlockableId
                ? masteryData.SubPackages.find(
                      (subPkg) => subPkg.Id === req.query.masteryUnlockableId,
                  ).MaxLevel
                : masteryData.MaxLevel) || DEFAULT_MASTERY_MAXLEVEL

        locationLevelInfo = Array.from({ length: maxLevel }, (_, i) => {
            return xpRequiredForLevel(i + 1)
        })
    }

    // Calculate the old playerprofile progression based on the current one and process it
    const oldPlayerProfileXp = playerProgressionData.Total - totalXpGain
    const oldPlayerProfileLevel = levelForXp(oldPlayerProfileXp)
    const newPlayerProfileXp = playerProgressionData.Total
    const newPlayerProfileLevel = levelForXp(newPlayerProfileXp)

    // NOTE: We assume the ProfileLevel is currently already up-to-date
    const profileLevelInfo = []

    for (
        let level = oldPlayerProfileLevel;
        level <= newPlayerProfileLevel + 1;
        level++
    ) {
        profileLevelInfo.push(xpRequiredForLevel(level))
    }

    const profileLevelInfoOffset = oldPlayerProfileLevel - 1

    // Time
    const timeTotal: Seconds =
        (sessionDetails.timerEnd as number) -
        (sessionDetails.timerStart as number)

    // Playstyle
    const calculatedPlaystyles = calculatePlaystyle(sessionDetails)

    let playstyle =
        calculatedPlaystyles[0].Score !== 0
            ? calculatedPlaystyles[0]
            : undefined

    // Calculate score and summary
    const calculateScoreResult = calculateScore(
        req.gameVersion,
        sessionDetails,
        contractData,
        timeTotal,
    )

    // Evergreen
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

        // ASSUMPTION: All payout objectives have a "condition"-category objective
        // and a "secondary"-category objective with a "MyPayout" in the context.
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
                    !sessionDetails.evergreen.failed &&
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

        evergreenData.Payout = totalPayout
        evergreenData.EndStateEventName =
            sessionDetails.evergreen.scoringScreenEndState

        locationLevelInfo = EVERGREEN_LEVEL_INFO

        // Override the location levels to trigger potential drops
        oldLocationLevel = evergreenLevelForXp(oldLocationXp)
        newLocationLevel = completionData.Level

        // Override the silent assassin rank
        if (calculateScoreResult.silentAssassin) {
            playstyle = {
                Id: "595f6ff1-85bf-4e4f-a9ee-76038a455648",
                Name: "UI_PLAYSTYLE_ICA_STEALTH_ASSASSIN",
                Type: "STEALTH_ASSASSIN",
                Score: 0,
            }
        }

        calculateScoreResult.silentAssassin = false

        // Overide the calculated score
        calculateScoreResult.stars = undefined
    }

    // Sniper
    let unlockableProgression = undefined
    let sniperChallengeScore = undefined

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

    if (contractData.Metadata.Type === "sniper") {
        const userInventory = createInventory(
            req.jwt.unique_name,
            req.gameVersion,
            undefined,
        )

        const [sniperScore, headlines] = calculateSniperScore(
            sessionDetails,
            timeTotal,
            userInventory,
        )
        sniperChallengeScore = sniperScore

        // Grant sniper mastery
        controller.progressionService.grantProfileProgression(
            0,
            sniperScore.FinalScore,
            [],
            sessionDetails,
            userData,
            locationParentId,
            req.query.masteryUnlockableId,
        )

        // Update completion data with latest mastery
        locationLevelInfo = SNIPER_LEVEL_INFO
        oldLocationLevel = sniperLevelForXp(oldLocationXp)

        // Temporarily get completion data for the unlockable
        completionData = generateCompletionData(
            levelData.Metadata.Location,
            req.jwt.unique_name,
            req.gameVersion,
            "sniper", // We know the type will be sniper.
            req.query.masteryUnlockableId,
        )
        newLocationLevel = completionData.Level
        unlockableProgression = {
            Id: completionData.Id,
            Level: completionData.Level,
            LevelInfo: locationLevelInfo,
            Name: completionData.Name,
            XP: completionData.XP,
            XPGain:
                completionData.Level === completionData.MaxLevel
                    ? 0
                    : sniperScore.FinalScore,
        }

        userData.Extensions.progression.Locations[locationParentId][
            req.query.masteryUnlockableId
        ].PreviouslySeenXp = completionData.XP

        writeUserData(req.jwt.unique_name, req.gameVersion)

        // Set the completion data to the location so the end screen formats properly.
        completionData = generateCompletionData(
            levelData.Metadata.Location,
            req.jwt.unique_name,
            req.gameVersion,
        )

        // Override the contract score
        contractScore = undefined

        // Override the playstyle
        playstyle = undefined

        calculateScoreResult.stars = undefined
        calculateScoreResult.scoringHeadlines = headlines
    }

    // Mastery Drops
    let masteryDrops: MissionEndDrop[] = []

    if (newLocationLevel - oldLocationLevel > 0) {
        // We get the subpackage as it functions like getMasteryDataForDestination
        // but allows us to get the specific unlockable if required.
        const masteryData =
            controller.masteryService.getMasteryDataForSubPackage(
                locationParentId,
                req.query.masteryUnlockableId ?? undefined,
                req.gameVersion,
                req.jwt.unique_name,
            ) as MasteryData

        if (masteryData) {
            masteryDrops = masteryData.Drops.filter(
                (e) =>
                    e.Level > oldLocationLevel && e.Level <= newLocationLevel,
            ).map((e) => {
                return {
                    Unlockable: e.Unlockable,
                }
            })
        }
    }

    // Challenge Drops
    const challengeDrops: MissionEndDrop[] =
        calculateXpResult.completedChallenges.reduce((acc, challenge) => {
            if (challenge?.Drops?.length) {
                const drops = getUnlockablesById(
                    challenge.Drops,
                    req.gameVersion,
                )
                delete challenge.Drops

                for (const drop of drops) {
                    acc.push({
                        Unlockable: drop,
                        SourceChallenge: challenge,
                    })
                }
            }

            return acc
        }, [])

    // Setup the result
    const result: MissionEndResponse = {
        MissionReward: {
            LocationProgression: {
                LevelInfo: locationLevelInfo,
                XP: completionData.XP,
                Level: completionData.Level,
                Completion: completionData.Completion,
                // NOTE: Official makes this 0 if maximum Mastery is reached
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
            Drops: [...masteryDrops, ...challengeDrops],
            // TODO: Do these exist? Appears to be optional.
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
            // NOTE: Official appears to always make this 0
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
            // TODO: Use data from the leaderboard?
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

    // Finalize the response
    if ((getFlag("autoSplitterForceSilentAssassin") as boolean) === true) {
        if (result.ScoreOverview.SilentAssassin) {
            await liveSplitManager.completeMission(timeTotal)
        } else {
            await liveSplitManager.failMission(timeTotal)
        }
    } else {
        await liveSplitManager.completeMission(timeTotal)
    }

    if (
        getFlag("leaderboards") === true &&
        sessionDetails.compat === true &&
        contractData.Metadata.Type !== "vsrace" &&
        contractData.Metadata.Type !== "evergreen" &&
        // Disable sending sniper scores for now
        contractData.Metadata.Type !== "sniper"
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
                        SniperChallengeScore: sniperChallengeScore,
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

    res.json({
        template:
            req.gameVersion === "scpc"
                ? getConfig("FrankensteinScoreOverviewTemplate", false)
                : null,
        data: result,
    })
}
