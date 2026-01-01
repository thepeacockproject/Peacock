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

import {
    contractTypes,
    DEFAULT_MASTERY_MAXLEVEL,
    difficultyToString,
    EVERGREEN_LEVEL_INFO,
    evergreenLevelForXp,
    isTrueForEveryElement,
    handleAxiosError,
    isObjectiveActive,
    levelForXp,
    PEACOCKVERSTRING,
    ServerVer,
    SNIPER_LEVEL_INFO,
    sniperLevelForXp,
    xpRequiredForLevel,
} from "./utils"
import { contractSessions, enqueueEvent } from "./eventHandler"
import { getConfig } from "./configSwizzleManager"
import { controller } from "./controller"
import type {
    ContractHistory,
    ContractSession,
    GameChanger,
    GameVersion,
    JwtData,
    MissionManifest,
    MissionManifestObjective,
    Seconds,
    UserProfile,
} from "./types/types"
import {
    escalationTypes,
    getLevelCount,
} from "./contracts/escalations/escalationService"
import { getUserData, writeUserData } from "./databaseHandler"
import axios, { AxiosError } from "axios"
import { getFlag } from "./flags"
import { log, LogLevel } from "./loggingInterop"
import {
    generateCompletionData,
    getSubLocationByName,
} from "./contracts/dataGen"
import { liveSplitManager } from "./livesplit/liveSplitManager"
import { ScoringHeadline } from "./types/scoring"
import { MissionEndRequestQuery } from "./types/gameSchemas"
import { ChallengeFilterType, Pro1FilterType } from "./candle/challengeHelpers"
import { getCompletionPercent } from "./menus/destinations"
import {
    CalculateScoreResult,
    CalculateSniperScoreResult,
    CalculateXpResult,
    ContractScore,
    MissionEndChallenge,
    MissionEndDrop,
    MissionEndEvergreen,
    MissionEndResult,
} from "./types/score"
import { MasteryData } from "./types/mastery"
import {
    createInventory,
    getUnlockablesById,
    grantDrops,
    InventoryItem,
} from "./inventory"
import { calculatePlaystyle } from "./playStyles"
import assert from "assert"

export function calculateGlobalXp(
    contractSession: ContractSession,
    gameVersion: GameVersion,
): CalculateXpResult {
    const completedChallenges: MissionEndChallenge[] = []
    let totalXp = 0

    // TODO: Merge with the non-global challenges?
    for (const challengeId of Object.keys(
        contractSession.challengeContexts || {},
    )) {
        const data = contractSession.challengeContexts![challengeId]

        if (data.timesCompleted <= 0) {
            continue
        }

        const challenge = controller.challengeService.getChallengeById(
            challengeId,
            gameVersion,
        )

        if (!challenge?.Xp || !challenge.Tags.includes("global")) {
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
    const noticedKillsAreVanilla =
        getFlag("legacyNoticedKillScoring") === "vanilla"

    // Bonuses
    const bonuses = [
        {
            headline: "UI_SCORING_SUMMARY_OBJECTIVES",
            bonusId: "AllObjectivesCompletedBonus",
            condition:
                gameVersion === "h1" ||
                isTrueForEveryElement(
                    contractSession.objectives.values(),
                    (obj: MissionManifestObjective) =>
                        obj.ExcludeFromScoring ||
                        contractSession.completedObjectives.has(obj.Id) ||
                        (obj.IgnoreIfInactive &&
                            !isObjectiveActive(
                                obj,
                                contractSession.completedObjectives,
                            )) ||
                        "Success" ===
                            contractSession.objectiveStates.get(obj.Id),
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
            condition:
                gameVersion === "h1" && noticedKillsAreVanilla
                    ? contractSession.lastKill.legacyIsUnnoticed
                    : [...contractSession.killsNoticedBy].every(
                          (witness) =>
                              contractSession.targetKills.has(witness) ||
                              contractSession.npcKills.has(witness),
                      ),
        },
        {
            headline: "UI_SCORING_SUMMARY_NO_BODIES_FOUND",
            bonusId: "NoBodiesFound",
            condition:
                !contractSession.legacyHasBodyBeenFound &&
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
    const allowNonTargetKills =
        contractData?.Metadata.NonTargetKillsAllowed === true
    const nonTargetKills =
        contractSession.npcKills.size + contractSession.crowdNpcKills

    let totalScore = 0

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

    if (nonTargetKills === 0 || allowNonTargetKills) {
        scoringHeadlines.push(
            Object.assign(Object.assign({}, headlineObjTemplate), {
                headline: "UI_SCORING_SUMMARY_KILL_PENALTY",
                count: "",
                scoreTotal: 0,
            }) as ScoringHeadline,
        )
    } else {
        scoringHeadlines.push(
            Object.assign(Object.assign({}, headlineObjTemplate), {
                headline: "UI_SCORING_SUMMARY_KILL_PENALTY",
                count: `${nonTargetKills}x-5000`,
                scoreTotal: -5000 * nonTargetKills,
            }) as ScoringHeadline,
        )
        totalScore += -5000 * nonTargetKills
    }

    totalScore = Math.max(0, totalScore)

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
        [
            ...bonuses,
            { condition: nonTargetKills === 0 || allowNonTargetKills },
        ].filter((x) => !x!.condition).length // one star less for each bonus missed

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
    const silentAssassin =
        [...bonuses.slice(1), { condition: nonTargetKills === 0 }].every(
            (x) => x.condition,
        ) && !contractSession.silentAssassinLost

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

    const scorePoints = [
        [0, 50000], // 50000 bonus score at 0 secs (0 min)
        [240, 40000], // 40000 bonus score at 240 secs (4 min)
        [480, 35000], // 35000 bonus score at 480 secs (8 min)
        [900, 0], // 0 bonus score at 900 secs (15 min)
    ]
    let prevsecs: number = 0
    let prevscore: number = 0

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseScore = (contractSession.scoring?.Context as any)?.["TotalScore"]
    // @ts-expect-error it's a number
    const challengeMultiplier = contractSession.scoring?.Settings["challenges"][
        "Unlockables"
    ].reduce((acc, unlockable) => {
        const item = inventory.find((item) => item.Unlockable.Id === unlockable)

        if (item) {
            // @ts-expect-error it's a number
            return acc + item.Unlockable.Properties["Multiplier"]
        }

        return acc
    }, 1.0)

    assert(
        typeof challengeMultiplier === "number",
        "challengeMultiplier is falsey/NaN",
    )

    const bulletsMissed = 0 // TODO? not sure if neccessary, the penalty is always 0 for inbuilt contracts
    const bulletsMissedPenalty =
        bulletsMissed *
        (contractSession.scoring?.Settings["bulletsused"]["penalty"] || 0)
    // Get SA status from global SA challenge for contracttype sniper
    const silentAssassin =
        contractSession.challengeContexts?.[
            "029c4971-0ddd-47ab-a568-17b007eec04e"
        ].state !== "Failure"
    const saBonus = silentAssassin
        ? contractSession.scoring?.Settings["silentassassin"]["score"]
        : 0
    const saMultiplier = silentAssassin
        ? contractSession.scoring?.Settings["silentassassin"]["multiplier"]
        : 1.0

    const subTotalScore = baseScore + timeBonus + saBonus - bulletsMissedPenalty
    const totalScore = Math.round(
        // @ts-expect-error it's a number
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

async function commitLeaderboardScore(
    sessionDetails: ContractSession,
    jwt: JwtData,
    userData: UserProfile,
    calculateScoreResult: CalculateScoreResult,
    result: MissionEndResult,
    sniperChallengeScore: undefined | CalculateSniperScoreResult,
): Promise<void> {
    try {
        const host = getFlag("leaderboardsHost") as string

        // update leaderboards
        await axios.post(
            `${host}/leaderboards/contracts/${sessionDetails.contractId}/${sessionDetails.gameVersion}/${jwt["platform"]}/${difficultyToString(sessionDetails.difficulty)}`,
            {
                username: userData.Gamertag,
                platformId:
                    jwt.platform === "epic"
                        ? userData.EpicId
                        : userData.SteamId,
                score: calculateScoreResult.scoreWithBonus,
                data: {
                    Score: {
                        AchievedMasteries:
                            result.ScoreOverview.ContractScore
                                ?.AchievedMasteries,
                        AwardedBonuses:
                            result.ScoreOverview.ContractScore?.AwardedBonuses,
                        TotalNoMultipliers:
                            result.ScoreOverview.ContractScore
                                ?.TotalNoMultipliers,
                        TimeUsedSecs:
                            result.ScoreOverview.ContractScore?.TimeUsedSecs,
                        FailedBonuses: null,
                        IsVR: false,
                        SilentAssassin: result.ScoreOverview.SilentAssassin,
                        StarCount: calculateScoreResult.stars,
                    },
                    GroupIndex: 0,
                    SniperChallengeScore: sniperChallengeScore,
                    PlayStyle: result.ScoreOverview.PlayStyle?.Name,
                    Description: "UI_MENU_SCORE_CONTRACT_COMPLETED",
                    ContractSessionId: sessionDetails.Id,
                    Headlines: result.ScoreOverview.ScoreDetails.Headlines,
                },
            },
            {
                headers: {
                    "Peacock-Version": PEACOCKVERSTRING,
                },
            },
        )
    } catch (e) {
        handleAxiosError(e as AxiosError)
        log(
            LogLevel.WARN,
            "Failed to commit leaderboards data! Either you or the server may be offline.",
        )
    }
}

/**
 * Get the data for a mission end screen.
 * This function also changes the user's data, unless `isDryRun` is true.
 * `isDryRun` is a hack because 2016 exists, and needs some of this data before
 * the intended route will be called.
 * @param query The query for the route.
 * @param jwt User's JWT data.
 * @param gameVersion The game version.
 * @param isDryRun When true, the function will not change the user's data or commit scores.
 */
export async function getMissionEndData(
    query: MissionEndRequestQuery,
    jwt: JwtData,
    gameVersion: GameVersion,
    isDryRun: boolean,
): Promise<MissionEndResult> {
    const sessionDetails = contractSessions.get(query.contractSessionId || "")

    assert.ok(sessionDetails, "contract session not found")
    assert(
        sessionDetails.userId === jwt.unique_name,
        "requested score for other user's session",
    )

    // call hook
    controller.hooks.onMissionEnd.call(sessionDetails)

    const realData = getUserData(jwt.unique_name, gameVersion)
    // Resolve userdata
    const userData = isDryRun ? structuredClone(realData) : realData

    // Resolve contract data
    const contractData = controller.resolveContract(
        sessionDetails.contractId,
        gameVersion,
        false,
    )

    assert.ok(contractData, "contract not found")

    // Handle escalation groups
    if (escalationTypes.includes(contractData.Metadata.Type)) {
        const eGroupId =
            contractData.Metadata.InGroup ?? contractData.Metadata.Id

        assert.ok(
            eGroupId,
            `Unregistered escalation group ${sessionDetails.contractId}`,
        )

        if (!userData.Extensions.PeacockEscalations[eGroupId]) {
            userData.Extensions.PeacockEscalations[eGroupId] = 1
        }

        const history: ContractHistory = {
            LastPlayedAt: new Date().getTime(),
            IsEscalation: true,
        }

        const levelCount = getLevelCount(
            controller.resolveContract(eGroupId, gameVersion),
        )

        escalationCompletion: if (
            userData.Extensions.PeacockEscalations[eGroupId] === levelCount
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

            if ((gameVersion === "h1" && levelCount !== 5) || isDryRun) {
                break escalationCompletion
            }

            // Send the AchievementEscalated event to the client
            // for achievements.
            enqueueEvent(jwt.unique_name, {
                Name: "AchievementEscalated",
                Value: {
                    Location: contractData.Metadata.Location,
                },
                Version: ServerVer,
            })
        } else {
            // not the final level
            userData.Extensions.PeacockEscalations[eGroupId] += 1
        }

        if (!userData.Extensions.PeacockPlayedContracts[eGroupId]) {
            userData.Extensions.PeacockPlayedContracts[eGroupId] = {}
        }

        userData.Extensions.PeacockPlayedContracts[eGroupId] = history

        if (!isDryRun) writeUserData(jwt.unique_name, gameVersion)
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

        if (!isDryRun) writeUserData(jwt.unique_name, gameVersion)
    }

    // Resolve the id of the parent location
    const subLocation = getSubLocationByName(
        contractData.Metadata.Location,
        gameVersion,
    )

    const locationParentId = subLocation
        ? subLocation.Properties?.ParentLocation
        : contractData.Metadata.Location

    assert.ok(
        locationParentId,
        `location ${subLocation?.Properties?.ParentLocation || contractData.Metadata.Location} not found (trying to resolve parent)`,
    )

    if (gameVersion === "h1") {
        // h1 has a separate mastery track for pro1 and normal
        query.masteryUnlockableId = contractData.Metadata.Difficulty ?? "normal"
    }

    // Resolve all opportunities for the location
    const opportunities: string[] | null | undefined =
        contractData.Metadata.Opportunities
    const opportunityCount = opportunities?.length ?? 0
    const opportunityCompleted =
        opportunities?.filter(
            (ms: string) => ms in userData.Extensions.opportunityprogression,
        ).length ?? 0

    // Resolve all challenges for the location
    const locationChallenges =
        controller.challengeService.getGroupedChallengeLists(
            {
                type: ChallengeFilterType.ParentLocation,
                parent: locationParentId,
                gameVersion,
                pro1Filter:
                    contractData.Metadata.Difficulty === "pro1"
                        ? Pro1FilterType.Only
                        : Pro1FilterType.Exclude,
            },
            locationParentId,
            gameVersion,
        )
    const contractChallenges =
        controller.challengeService.getChallengesForContract(
            sessionDetails.contractId,
            gameVersion,
            jwt.unique_name,
            sessionDetails.difficulty,
        )
    const locationChallengeCompletion =
        controller.challengeService.countTotalNCompletedChallenges(
            locationChallenges,
            userData.Id,
            gameVersion,
        )

    const contractChallengeCompletion =
        controller.challengeService.countTotalNCompletedChallenges(
            contractChallenges,
            userData.Id,
            gameVersion,
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
        gameVersion,
    )
    let justTickedChallenges = 0
    let totalXpGain = calculateXpResult.xp

    // Calculate XP based on non-global challenges. Remember to add elusive challenges of the contract
    const nonGlobalChallenges = Object.values({
        ...locationChallenges,
        ...contractChallenges,
        ...(Object.keys(contractChallenges).includes("elusive") && {
            elusive: contractChallenges.elusive,
        }),
    })
        .flat()
        .filter(
            (challengeData) =>
                !challengeData.Tags.includes("global") &&
                controller.challengeService.fastGetIsUnticked(
                    userData,
                    challengeData.Id,
                ),
        )

    for (const challengeData of nonGlobalChallenges) {
        const userId = jwt.unique_name

        userData.Extensions.ChallengeProgression[challengeData.Id].Ticked = true
        if (!isDryRun) writeUserData(userId, gameVersion)

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
    }

    let completionData = generateCompletionData(
        contractData.Metadata.Location,
        jwt.unique_name,
        gameVersion,
        contractData.Metadata.Type,
        query.masteryUnlockableId,
    )

    const masteryData = controller.masteryService.getMasteryPackage(
        locationParentId,
        gameVersion,
    )

    // Calculate the old location progression based on the current one and process it
    const oldLocationXp = completionData.PreviouslySeenXp
        ? completionData.PreviouslySeenXp
        : completionData.XP - totalXpGain
    let oldLocationLevel = levelForXp(oldLocationXp, masteryData?.XpPerLevel)

    const newLocationXp = completionData.XP
    let newLocationLevel = levelForXp(newLocationXp, masteryData?.XpPerLevel)
    const userProgressionLocations = userData.Extensions.progression.Locations

    if (!query.masteryUnlockableId) {
        userProgressionLocations[locationParentId] ??= {
            Xp: 0,
            Level: 1,
            PreviouslySeenXp: newLocationXp,
        }
        userProgressionLocations[locationParentId].PreviouslySeenXp =
            newLocationXp
    }

    if (!isDryRun) writeUserData(jwt.unique_name, gameVersion)

    let maxLevel = 1
    let locationLevelInfo = [0]

    if (masteryData) {
        maxLevel =
            (query.masteryUnlockableId
                ? masteryData.SubPackages?.find(
                      (subPkg) => subPkg.Id === query.masteryUnlockableId,
                  )?.MaxLevel
                : masteryData.MaxLevel) || DEFAULT_MASTERY_MAXLEVEL

        locationLevelInfo = Array.from({ length: maxLevel }, (_, i) => {
            return xpRequiredForLevel(i + 1, masteryData.XpPerLevel)
        })
    }

    // Calculate the old playerprofile progression based on the current one and process it
    const oldPlayerProfileXp = playerProgressionData.Total - totalXpGain
    const oldPlayerProfileLevel = levelForXp(
        oldPlayerProfileXp,
        masteryData?.XpPerLevel,
    )
    const newPlayerProfileXp = playerProgressionData.Total
    const newPlayerProfileLevel = levelForXp(
        newPlayerProfileXp,
        masteryData?.XpPerLevel,
    )

    // NOTE: We assume the ProfileLevel is currently already up-to-date
    const profileLevelInfo = []

    for (
        let level = oldPlayerProfileLevel;
        level <= newPlayerProfileLevel + 1;
        level++
    ) {
        profileLevelInfo.push(
            xpRequiredForLevel(level, masteryData?.XpPerLevel),
        )
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
        gameVersion,
        sessionDetails,
        contractData,
        timeTotal,
    )

    // Evergreen
    const evergreenData: MissionEndEvergreen = {
        Payout: 0,
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

            const conditionObjective = gameChanger.Objectives?.find(
                (e) => e.Category === "condition",
            )

            const secondaryObjective = gameChanger.Objectives?.find(
                (e) =>
                    e.Category === "secondary" &&
                    e.Definition?.Context?.["MyPayout"],
            )

            if (
                conditionObjective &&
                secondaryObjective &&
                sessionDetails.objectiveStates.get(conditionObjective.Id) ===
                    "Success"
            ) {
                type P = { MyPayout: string }

                const context = sessionDetails.objectiveContexts.get(
                    secondaryObjective.Id,
                ) as P | undefined

                const payoutObjective = {
                    Name: gameChanger.Name,
                    Payout: parseInt(context?.["MyPayout"] || "0"),
                    IsPrestige: gameChanger.IsPrestigeObjective || false,
                }

                if (
                    !sessionDetails.evergreen?.failed &&
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
            sessionDetails.evergreen?.scoringScreenEndState

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
        calculateScoreResult.stars = 0
    }

    // Sniper
    let unlockableProgression = undefined
    let sniperChallengeScore: CalculateSniperScoreResult | undefined = undefined

    let contractScore: ContractScore | undefined = {
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
        const userInventory = createInventory(jwt.unique_name, gameVersion)

        const [sniperScore, headlines] = calculateSniperScore(
            sessionDetails,
            timeTotal,
            userInventory,
        )
        sniperChallengeScore = sniperScore

        if (!isDryRun) {
            // Grant sniper mastery
            controller.progressionService.grantProfileProgression(
                0,
                sniperScore.FinalScore,
                [],
                sessionDetails,
                userData,
                locationParentId,
                query.masteryUnlockableId,
            )
        }

        // Update completion data with latest mastery
        locationLevelInfo = SNIPER_LEVEL_INFO
        oldLocationLevel = sniperLevelForXp(oldLocationXp)

        // Temporarily get completion data for the unlockable
        completionData = generateCompletionData(
            contractData.Metadata.Location,
            jwt.unique_name,
            gameVersion,
            "sniper", // We know the type will be sniper.
            query.masteryUnlockableId,
        )
        newLocationLevel = completionData.Level
        unlockableProgression = {
            Id: completionData.Id,
            Level: completionData.Level,
            LevelInfo: locationLevelInfo,
            Name: completionData.Name!,
            XP: completionData.XP,
            XPGain:
                completionData.Level === completionData.MaxLevel
                    ? 0
                    : sniperScore.FinalScore,
        }

        // @ts-expect-error should be fine (allegedly)
        userData.Extensions.progression.Locations[locationParentId][
            query.masteryUnlockableId!
        ].PreviouslySeenXp = completionData.XP

        if (!isDryRun) writeUserData(jwt.unique_name, gameVersion)

        // Set the completion data to the location so the end screen formats properly.
        completionData = generateCompletionData(
            contractData.Metadata.Location,
            jwt.unique_name,
            gameVersion,
        )

        // Override the contract score
        contractScore = undefined

        // Override the playstyle
        playstyle = undefined

        calculateScoreResult.stars = 0
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
                query.masteryUnlockableId!,
                gameVersion,
                jwt.unique_name,
            ) as MasteryData

        if (masteryData) {
            masteryDrops = masteryData.Drops.filter(
                (e) =>
                    e.Level > oldLocationLevel && e.Level <= newLocationLevel,
            ).map((e) => ({
                Unlockable: e.Unlockable,
            }))
        }

        // If this isn't a dry run, tell the user that their level has changed,
        // so we can pop the achievement.
        if (!isDryRun) {
            enqueueEvent(jwt.unique_name, {
                Name: "Progression_LevelGain",
                Value: {
                    Location: contractData.Metadata.Location,
                    NewLevel: newLocationLevel,
                },
                Version: ServerVer,
            })
        }
    }

    // If this isn't a dry run (and mastery progression is enabled), grant drops
    // if the user's inventory doesn't already have it.
    if (!isDryRun && getFlag("enableMasteryProgression")) {
        const userInventory = createInventory(jwt.unique_name, gameVersion)

        const toGrant = masteryDrops
            .filter(
                (drop) =>
                    !userInventory.some(
                        (e) => e.Unlockable.Id === drop.Unlockable.Id,
                    ),
            )
            .map((e) => e.Unlockable)

        grantDrops(jwt.unique_name, toGrant)
    }

    // Challenge Drops
    const challengeDrops: MissionEndDrop[] =
        calculateXpResult.completedChallenges.reduce(
            (acc: MissionEndDrop[], challenge) => {
                if (challenge?.Drops?.length) {
                    const drops = getUnlockablesById(
                        challenge.Drops,
                        gameVersion,
                    )
                    delete challenge.Drops

                    for (const drop of drops) {
                        if (!drop) {
                            continue
                        }

                        acc.push({
                            Unlockable: drop,
                            SourceChallenge: challenge,
                        })
                    }
                }

                return acc
            },
            [],
        )

    // Setup the result
    const result: MissionEndResult = {
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
            ProdileId1: jwt.unique_name,
            stars: calculateScoreResult.stars,
            ScoreDetails: {
                Headlines: calculateScoreResult.scoringHeadlines,
            },
            ContractScore: contractScore,
            SniperChallengeScore: sniperChallengeScore,
            SilentAssassin:
                contractScore?.SilentAssassin ||
                sniperChallengeScore?.SilentAssassin ||
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

    if (isDryRun) {
        return result
    }

    // Finalize the response
    if (getFlag("autoSplitterForceSilentAssassin")) {
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
        sessionDetails.compat &&
        contractData.Metadata.Type !== "vsrace" &&
        contractData.Metadata.Type !== "evergreen" &&
        // Disable sending sniper scores for now
        contractData.Metadata.Type !== "sniper"
    ) {
        await commitLeaderboardScore(
            sessionDetails,
            jwt,
            userData,
            calculateScoreResult,
            result,
            sniperChallengeScore,
        )
    }

    return result
}
