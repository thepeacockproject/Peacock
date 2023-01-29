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

/* eslint-disable @typescript-eslint/no-explicit-any */

import { StateMachineLike } from "@peacockproject/statemachine-parser"

export type SniperScoreModules = {
    Type: string
    ScoringDefinitions: StateMachineLike<SniperContext, SniperConstants>[]
}

type SniperConstants = Readonly<{
    Score_Synchronised_Kill: number
    Score_Synchronised_Kill_Successive: number
    SynchronisedKillTimerLength: number
    Score_Kill_Bodyshot: number
    Score_Kill_Streak: number
    Score_Kill_Streak_Successive: number
    Score_Kill_Headshot: number
    Score_Kill_Headshot_Streak: number
    Score_Kill_Headshot_Streak_Successive: number
    Score_Kill_Headshot_Successive: number
    Score_Kill_Multi: number
    Score_Kill_Multi_Successive: number
    Score_Kill_Multi_Shot: number
    Score_Kill_Multi_Shot_Successive: number
    Score_Kill_Moving: number
    Score_Kill_Moving_Successive: number
    Score_Kill_Moving_Streak: number
    Score_Kill_Moving_Streak_Successive: number
    Score_Kill_Explosion: number
    Score_Kill_Explosion_Successive: number
    Score_Kill_Civilian: number
    Score_Kill_Civilian_Successive: number
    Score_Kill_Accident: number
    Score_Kill_Accident_Successive: number
    Score_Kill_Distraction: number
    Score_Kill_Distraction_Successive: number
    Score_BodyHidden: number
    Score_BodyHidden_Successive: number
}>

export type SniperContext = {
    PlayerIds: any[]
    SuccessivePlayerIds: any[]
    Events: any[]
    TotalScore: number
    SynchronisedKill_Count: number
    SynchronisedKill_Successive_CurrentScore: number
    SynchronisedKill_CurrentScore: number
    Targets: string[]
    BulletsUsed: number
    HeadShot_Successive_Count: number
    HeadShot_Successive_CurrentScore: number
    HeadShot_CurrentScore: number
    HeadShot_Streak_Count: number
    HeadShot_Streak_Count_Temp: number
    HeadShot_Streak_CurrentScore: number
    Moving_Successive_Count: number
    Moving_Successive_CurrentScore: number
    Moving_CurrentScore: number
    Moving_Streak_Count: number
    Moving_Streak_Count_Temp: number
    Moving_Streak_CurrentScore: number
    Kill_Streak_Count: number
    Kill_Streak_Count_Temp: number
    Kill_Streak_CurrentScore: number
    Accident_Successive_Count: number
    Accident_Successive_CurrentScore: number
    Explosion_Successive_Count: number
    Explosion_Successive_CurrentScore: number
    BodyHidden_Successive_Count: number
    BodyHidden_Successive_CurrentScore: number
    BodyHidden_CurrentScore: number
    CivilianKill_Successive_Count: number
    CivilianKill_Successive_CurrentScore: number
    CivilianKill_CurrentScore: number
    MultiKill_CurrentScore: number
    MultiKill_Shot_CurrentScore: number
    ReInitialiseTimer: number
    StreakTime: number
    PlayerId: number
}
