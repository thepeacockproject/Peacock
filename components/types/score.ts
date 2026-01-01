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

import { Playstyle, ScoringBonus, ScoringHeadline } from "./scoring"
import {
    ChallengeCompletion,
    CompletionData,
    OpportunityStatistics,
    Seconds,
    Unlockable,
} from "./types"

export type CalculateXpResult = {
    completedChallenges: MissionEndChallenge[]
    xp: number
}

export type ScoreProgressionStats = {
    LevelInfo: number[]
    XP: number
    Level: number
    XPGain: number
    Id?: string
    Name?: string
    Completion?: number
    HideProgression?: boolean
}

export type ScoreProfileProgressionStats = {
    LevelInfo: number[]
    LevelInfoOffset: number
    XP: number
    Level: number
    XPGain: number
}

export type CalculateScoreResult = {
    stars: number
    scoringHeadlines: ScoringHeadline[]
    awardedBonuses: ScoringBonus[]
    failedBonuses: ScoringBonus[]
    achievedMasteries: MissionEndAchievedMastery[]
    silentAssassin: boolean
    score: number
    scoreWithBonus: number
}

export type CalculateSniperScoreResult = {
    FinalScore: number
    BaseScore: number
    TotalChallengeMultiplier: number
    BulletsMissed: number
    BulletsMissedPenalty: number
    TimeTaken: number
    TimeBonus: number
    SilentAssassin: boolean
    SilentAssassinBonus: number | undefined
    SilentAssassinMultiplier: number | undefined
}

export type MissionEndChallenge = {
    ChallengeId: string
    ChallengeTags: string[]
    ChallengeName: string
    ChallengeImageUrl: string
    ChallengeDescription: string
    XPGain: number
    IsGlobal: boolean
    IsActionReward: boolean
    Drops?: string[]
}

export type MissionEndSourceChallenge = {
    ChallengeId: string
    ChallengeTags: string[]
    ChallengeName: string
    ChallengeImageUrl: string
    ChallengeDescription: string
    XPGain: number
    IsGlobal: boolean
    IsActionReward: boolean
}

export type MissionEndDrop = {
    Unlockable: Unlockable
    SourceChallenge?: MissionEndSourceChallenge
}

export type MissionEndAchievedMastery = {
    score: number
    RatioParts: number
    RatioTotal: number
    Id: string
    BaseScore: number
}

export type MissionEndEvergreen = {
    Payout: number
    EndStateEventName?: string | null
    PayoutsCompleted: MissionEndEvergreenPayout[]
    PayoutsFailed: MissionEndEvergreenPayout[]
}

export type MissionEndEvergreenPayout = {
    Name: string
    Payout: number
    IsPrestige: boolean
}

export type ContractScore = {
    Total: number
    AchievedMasteries: MissionEndAchievedMastery[]
    AwardedBonuses: ScoringBonus[]
    TotalNoMultipliers: number
    TimeUsedSecs: Seconds
    StarCount: number
    FailedBonuses: ScoringBonus[]
    SilentAssassin: boolean
}

export type MissionEndResult = {
    MissionReward: {
        LocationProgression: ScoreProgressionStats
        ProfileProgression: ScoreProfileProgressionStats
        Challenges: MissionEndChallenge[]
        Drops: MissionEndDrop[]
        OpportunityRewards: unknown[] // ?
        UnlockableProgression?: ScoreProgressionStats
        CompletionData: CompletionData
        ChallengeCompletion: ChallengeCompletion
        ContractChallengeCompletion: ChallengeCompletion
        OpportunityStatistics: OpportunityStatistics
        LocationCompletionPercent: number
    }
    ScoreOverview: {
        XP: number
        Level: number
        Completion: number
        XPGain: number
        ChallengesCompleted: number
        LocationHideProgression: boolean
        ProdileId1?: string
        stars?: number
        ScoreDetails: {
            Headlines: ScoringHeadline[]
        }
        ContractScore?: ContractScore
        SniperChallengeScore?: CalculateSniperScoreResult
        SilentAssassin: boolean
        NewRank: number
        RankCount: number
        Rank: number
        FriendsRankCount: number
        FriendsRank: number
        IsPartOfTopScores: boolean
        PlayStyle?: Playstyle
        IsNewBestScore: boolean
        IsNewBestTime: boolean
        IsNewBestStars: boolean
        Evergreen?: MissionEndEvergreen
    }
}
