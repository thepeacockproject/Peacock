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
    ClientToServerEvent,
    GameChanger,
    MissionManifestObjective,
    MissionType,
    RepositoryId,
    SecurityCameraStatus,
} from "./types"
import { EDeathContext } from "../eventHandler"

type RuntimeItem = {
    IsPerceivedAsWeapon?: boolean
    InstanceId: string
    ItemType: string
    ItemName: string
    RepositoryId: RepositoryId
    OnlineTraits: string[]
    Category: null
    ActionRewardType: string
}

export type MatchOverC2SEvent = ClientToServerEvent<{
    MyScore: number
    OpponentScore: number
    IsWinner: boolean
    IsDraw: boolean
    timerEnd: Date
}>

export type KillC2SEvent = ClientToServerEvent<{
    RepositoryId: string
    ActorId: number
    ActorName: string
    ActorType: number
    KillType: number
    KillContext: number
    KillClass: string
    Accident: boolean
    WeaponSilenced: boolean
    Explosive: boolean
    ExplosionType: number
    Projectile: boolean
    Sniper: boolean
    IsHeadshot: boolean
    IsTarget: boolean
    ThroughWall: boolean
    BodyPartId: number
    TotalDamage: number
    IsMoving: boolean
    RoomId: number
    ActorPosition: string
    HeroPosition: string
    DamageEvents: string[]
    PlayerId: number
    OutfitRepositoryId: string
    OutfitIsHitmanSuit: boolean
    KillItemRepositoryId: string
    KillItemInstanceId: string
    KillItemCategory: string
    KillMethodBroad: string
    KillMethodStrict: string
    EvergreenRarity?: number
    IsReplicated?: boolean
    History: unknown[]
}>

export type HeroSpawn_LocationC2SEvent = ClientToServerEvent<{
    RepositoryId: RepositoryId
}>

export type ContractStartC2SEvent = ClientToServerEvent<{
    Loadout: {
        RepositoryId: RepositoryId
        InstanceId: string
        OnlineTraits: string[]
        Category?: null
    }[]
    Disguise: string
    LocationId: string
    GameChangers: GameChanger[]
    ContractType: MissionType
    DifficultyLevel: number
    IsVR: boolean
    IsHitmanSuit: boolean
    SelectedCharacterId: string
}>

export type OpportunityEventsC2SEvent = ClientToServerEvent<{
    RepositoryId: RepositoryId
    Event: string
}>

export type StartingSuitC2SEvent = ClientToServerEvent<string>

export type IntroCutEndC2SEvent = ClientToServerEvent<string>

export type HoldingIllegalWeaponC2SEvent = ClientToServerEvent<{
    IsHoldingIllegalWeapon: boolean
    WeaponEquipped?: RuntimeItem
}>

export type SpottedC2SEvent = ClientToServerEvent<readonly string[]>

export type WitnessesC2SEvent = ClientToServerEvent<readonly string[]>

export type AmbientChangedC2SEvent = ClientToServerEvent<{
    PreviousAmbientValue: number
    AmbientValue: number
    PreviousAmbient: string
    Ambient: string
}>

export type DisguiseBlownC2SEvent = ClientToServerEvent<string>

export type Investigate_CuriousC2SEvent = ClientToServerEvent<{
    ActorId: number
    RepositoryId: RepositoryId
    SituationType: string
    EventType: string
    JoinReason: string
    InvestigationType: number
}>

export type ItemDestroyedC2SEvent = ClientToServerEvent<{
    ItemName: string
}>

export type Level_Setup_EventsC2SEvent = ClientToServerEvent<{
    Contract_Name_metricvalue?: string
    Location_MetricValue?: string
    Event_metricvalue: string
}>

export type PacifyC2SEvent = KillC2SEvent

export type MurderedBodySeenC2SEvent = ClientToServerEvent<{
    Witness: string
    /** `true` if the witness is a target */
    IsWitnessTarget: boolean
    DeadBody: {
        RepositoryId: RepositoryId
        IsCrowdActor: false
        DeathContext: EDeathContext
        DeathType: number
    }
}>

export type NoticedPacifiedC2SEvent = ClientToServerEvent<{
    RepositoryId: RepositoryId
    IsTarget: boolean
}>

export type NoticedKillC2SEvent = NoticedPacifiedC2SEvent

export type DeadBodySeenC2SEvent = ClientToServerEvent<string>

export type Hero_HealthC2SEvent = ClientToServerEvent<number>

export type OpportunityStageEventC2SEvent = ClientToServerEvent<{
    RepositoryId: RepositoryId
    Event: string
    OpportunityStageID: string
}>

export type TrespassingC2SEvent = ClientToServerEvent<{
    IsTrespassing: boolean
    RoomId: number
}>

export type AllPacifiedHiddenC2SEvent = ClientToServerEvent<string>

export type DumpInOceanC2SEvent = ClientToServerEvent<{
    RepositoryId: RepositoryId
}>

export type ItemPickedUpC2SEvent = ClientToServerEvent<Readonly<RuntimeItem>>

export type CrowdEvacuationC2SEvent = ClientToServerEvent<string>

export type Unnoticed_KillC2SEvent = ClientToServerEvent<{
    RepositoryId: RepositoryId
    IsTarget: boolean
}>

export type ObjectiveCompletedC2SEvent = ClientToServerEvent<{
    Id: string
    Type: MissionManifestObjective["Type"]
    Category: MissionManifestObjective["Category"]
    ExcludeFromScoring: boolean
}>

export type SecuritySystemRecorderC2SEvent = ClientToServerEvent<{
    event: SecurityCameraStatus
    recorder: number
}>

export type ActorTaggedC2SEvent = ClientToServerEvent<{
    RepositoryId: RepositoryId
    Tagged: boolean
}>

export type ItemDroppedC2SEvent = ClientToServerEvent<RuntimeItem>

// noinspection SpellCheckingInspection
export type SetpiecesC2SEvent = ClientToServerEvent<{
    RepositoryId: RepositoryId
    name_metricvalue: string | "NotAvailable" | "HideBody"
    setpieceHelper_metricvalue: string
    setpieceType_metricvalue: "trap" | "BodyContainer" | string
    toolUsed_metricvalue: "Exploded" | "NA" | string
    Item_triggered_metricvalue: "NotAvailable" | string
    Position: {
        x: number
        y: number
        z: number
    }
}>

export type DoorUnlockedC2SEvent = ClientToServerEvent<string>

export type EvidenceHiddenC2SEvent = ClientToServerEvent<"Body" | string>

export type BodyHiddenC2SEvent = ClientToServerEvent<{
    ActorId: number
    RepositoryId: RepositoryId
    ActorName: string
}>

export type AreaDiscoveredC2SEvent = ClientToServerEvent<{
    RepositoryId: RepositoryId
}>

export type Dart_HitC2SEvent = ClientToServerEvent<{
    IsTarget: boolean
    RepositoryId: RepositoryId
    ActorType: number
    Sedative: "" | string
}>

export type Evergreen_Payout_DataC2SEvent = ClientToServerEvent<{
    Total_Payout: number
}>

export type OpponentsC2sEvent = ClientToServerEvent<{
    ConnectedSessions: string[]
}>
