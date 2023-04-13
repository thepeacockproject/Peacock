import { Playstyle, ScoringBonus, ScoringHeadline } from "./scoring"
import {
    ChallengeCompletion,
    CompletionData,
    OpportunityStatistics,
    Seconds,
    Unlockable,
} from "./types"

export interface CalculateXpResult {
    completedChallenges: MissionEndChallenge[]
    xp: number
}

export interface CalculateScoreResult {
    stars: number
    scoringHeadlines: ScoringHeadline[]
    awardedBonuses: ScoringBonus[]
    failedBonuses: ScoringBonus[]
    achievedMasteries: MissionEndAchievedMastery[]
    silentAssassin: boolean
    score: number
    scoreWithBonus: number
}

export interface MissionEndChallenge {
    ChallengeId: string
    ChallengeTags: string[]
    ChallengeName: string
    ChallengeImageUrl: string
    ChallengeDescription: string
    XPGain: number
    IsGlobal: boolean
    IsActionReward: boolean
    Drops: string[]
}

export interface MissionEndSourceChallenge {
    ChallengeId: string
    ChallengeTags: string[]
    ChallengeName: string
    ChallengeImageUrl: string
    ChallengeDescription: string
    XPGain: number
    IsGlobal: boolean
    IsActionReward: boolean
}

export interface MissionEndDrop {
    Unlockable: Unlockable
    SourceChallenge?: MissionEndSourceChallenge
}

export interface MissionEndAchievedMastery {
    score: number
    RatioParts: number
    RatioTotal: number
    Id: string
    BaseScore: number
}

export interface MissionEndEvergreen {
    Payout: number
    EndStateEventName?: string
    PayoutsCompleted: MissionEndEvergreenPayout[]
    PayoutsFailed: MissionEndEvergreenPayout[]
}

export interface MissionEndEvergreenPayout {
    Name: string
    Payout: number
    IsPrestige: boolean
}

export interface MissionEndResponse {
    MissionReward: {
        LocationProgression: {
            LevelInfo: number[]
            XP: number
            Level: number
            Completion: number
            XPGain: number
            HideProgression: boolean
        }
        ProfileProgression: {
            LevelInfo: number[]
            LevelInfoOffset: number
            XP: number
            Level: number
            XPGain: number
        }
        Challenges: MissionEndChallenge[]
        Drops: MissionEndDrop[]
        OpportunityRewards: unknown[] //?
        UnlockableProgression?: {
            LevelInfo: number[]
            XP: number
            Level: number
            XPGain: number
            Id: string
            Name: string
        }
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
        ContractScore?: {
            Total: number
            AchievedMasteries: MissionEndAchievedMastery[]
            AwardedBonuses: ScoringBonus[]
            TotalNoMultipliers: number
            TimeUsedSecs: Seconds
            StarCount: number
            FailedBonuses: ScoringBonus[]
            SilentAssassin: boolean
        }
        SniperChallengeScore?: {
            FinalScore: number
            BaseScore: number
            TotalChallengeMultiplier: number
            BulletsMissed: number
            BulletsMissedPenalty: number
            TimeTaken: number
            TimeBonus: number
            SilentAssassin: boolean
            SilentAssassinBonus: number
            SilentAssassinMultiplier: number
        }
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
