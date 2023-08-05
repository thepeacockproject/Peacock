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

import type * as core from "express-serve-static-core"

import type { IContractCreationPayload } from "../statemachines/contractCreation"
import type { Request } from "express"
import {
    ChallengeContext,
    ProfileChallengeData,
    SavedChallenge,
} from "./challenges"
import { SessionGhostModeDetails } from "../multiplayer/multiplayerService"
import { IContextListener } from "../statemachines/contextListeners"
import { ManifestScoringModule, ScoringModule } from "./scoring"
import { Timer } from "@peacockproject/statemachine-parser"

/**
 * A duration or relative point in time expressed in seconds.
 */
export type Seconds = number

/**
 * The game's major version.
 */
export type GameVersion = "h1" | "h2" | "h3" | "scpc"

/**
 * The server configuration's target audience.
 *
 * Notes:
 *   - pc-prod8 is deprecated, as HITMAN 3 after 3.100.0 no longer uses it.
 */
export type GameAudience =
    | "pc-prod8"
    | "pc-prod7"
    | "pc-prod6"
    | "steam-prod_8"
    | "epic-prod_8"
    | "xboxone-prod"
    | "scpc-prod"
    | "playtest01-prod_8"

/**
 * Data from the JSON Web Token (JWT) authentication scheme.
 */
export interface JwtData {
    /**
     * Usually bearer.
     */
    "auth:method": "bearer" | string
    /**
     * Always "user".
     */
    roles: "user"
    sub: string
    /**
     * Profile ID.
     */
    unique_name: string
    /**
     * User ID.
     */
    userid: string
    /**
     * Either "steam" or "epic" on PC.
     */
    platform: "steam" | "epic"
    /**
     * Client/account locale.
     */
    locale: string
    /**
     * Client/account region.
     */
    rgn: string
    /**
     * External appid.
     */
    pis: string
    /**
     * Country, specified by the locale property.
     */
    cntry: string
    /**
     * Expires in.
     */
    exp: string
    /**
     * Not before.
     */
    nbf: string
    /**
     * Issuer (from external provider).
     */
    iss: string
    /**
     * The audience.
     *
     * @see GameAudience
     */
    aud: GameAudience
}

/**
 * A request with a JSON web token (JWT) already parsed. Also contains our custom request properties.
 */
export interface RequestWithJwt<
    Query = core.Query,
    // TODO: Make this `unknown` instead, requires lots of changes elsewhere
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    RequestBody = any,
> extends Request<
        core.ParamsDictionary,
        // eslint-disable-next-line
        any,
        RequestBody,
        core.Query & Query
    > {
    /**
     * The user's JSON Web Token (JWT) data.
     */
    jwt: JwtData
    /**
     * The current Hitman server version.
     */
    serverVersion?: string
    /**
     * The game's version.
     */
    gameVersion: GameVersion
    /**
     * Used internally to declare if a route should be propagated to its handler or cancelled early.
     */
    shouldCease?: boolean
}

/**
 * The status of cameras in a mission.
 */
export enum PeacockCameraStatus {
    NotSpotted = "NOT_SPOTTED",
    Spotted = "SPOTTED",
    Erased = "ERASED",
}

/**
 * The status of security cameras in a mission (event-end).
 */
export type SecurityCameraStatus = "destroyed" | "spotted" | "erased"

/**
 * A repository ID (really just a UUID v4).
 */
export type RepositoryId = string

/**
 * Possible mission `Metadata.Type` values.
 */
export type MissionType =
    | "mission"
    | "elusive"
    | "escalation"
    | "featured"
    | "sniper"
    | "usercreated"
    | "creation"
    | "tutorial"
    | "orbis"
    | "campaign"
    | "arcade"
    | "vsrace"
    | "evergreen"
    | "flashback"

/**
 * The data acquired when using the "contract search" functionality.
 */
export interface ContractSearchResult {
    Data: {
        Contracts: {
            UserCentricContract: UserCentricContract
        }[]
        ErrorReason: string
        HasMore: boolean
        HasPrevious: boolean
        Page: number
        TotalCount: number
    }
}

/**
 * The last kill in a contract session.
 *
 * @see ContractSession
 */
export interface ContractSessionLastKill {
    timestamp?: Date | number
    repositoryIds?: RepositoryId[]
}

/**
 * A contract session is created every time you start a level, which contains the data of the play session.
 * Primarily used for scoring, saving, and loading.
 */
export interface ContractSession {
    Id: string
    gameVersion: GameVersion
    sessionStart: Date | number
    lastUpdate: Date | number
    contractId: string
    userId: string
    timerStart: Date | number
    timerEnd: Date | number
    duration: Date | number
    crowdNpcKills: number
    targetKills: Set<RepositoryId>
    npcKills: Set<RepositoryId>
    bodiesHidden: Set<RepositoryId>
    pacifications: Set<RepositoryId>
    disguisesUsed: Set<RepositoryId>
    disguisesRuined: Set<RepositoryId>
    spottedBy: Set<RepositoryId>
    witnesses: Set<RepositoryId>
    bodiesFoundBy: Set<RepositoryId>
    legacyHasBodyBeenFound: boolean
    killsNoticedBy: Set<RepositoryId>
    completedObjectives: Set<RepositoryId>
    failedObjectives: Set<RepositoryId>
    recording: PeacockCameraStatus
    lastAccident: number
    lastKill: ContractSessionLastKill
    kills: Set<RatingKill>
    markedTargets: Set<RepositoryId>
    compat: boolean
    currentDisguise: string
    difficulty: number
    objectiveDefinitions: Map<string, unknown>
    objectiveStates: Map<string, string>
    objectiveContexts: Map<string, unknown>
    /**
     * Session Ghost Mode details.
     *
     * @since v5.0.0
     */
    ghost?: SessionGhostModeDetails
    /**
     * The current state of the challenges.
     *
     * @since v5.6.0-dev.1
     */
    challengeContexts?: {
        [challengeId: string]: ChallengeContext
    }
    /**
     * Session Evergreen details.
     *
     * @since v6.0.0
     */
    evergreen?: {
        payout: number
        scoringScreenEndState: string
        failed: boolean
    }
    /**
     * Scoring settings, and statemachine settings.
     * Currently only used for Sniper Challenge missions.
     *
     * Settings: Keyed by the type property in modules.
     * Context: The current context of the scoring statemachine.
     * Definition: The initial definition of the scoring statemachine.
     * State: The current state of the scoring statemachine.
     * Timers: The current timers of the scoring statemachine.
     *
     * @since v7.0.0
     */
    scoring?: {
        Settings: {
            [name: string]: ScoringModule
        }
        Context: unknown
        Definition: unknown
        State: string
        Timers: Timer[]
    }
    /**
     * Timestamp of first kill.
     * Used for calculating Sniper Challenge time bonus.
     * @since v7.0.0
     */
    firstKillTimestamp?: number
}

/**
 * The SaveFile object passed by the client in /ProfileService/UpdateUserSaveFileTable
 */
export interface SaveFile {
    // The contract session ID of the save
    ContractSessionId: string
    // The unix timestamp at the time of saving
    TimeStamp: number
    Value: {
        // The name of the save slot
        Name: string
        // The token of the last event that happened before the save was made
        LastEventToken: string
    }
}

/**
 * The body sent with the UpdateUserSaveFileTable request from the game after saving.
 *
 * @see SaveFile
 */
export interface UpdateUserSaveFileTableBody {
    clientSaveFileList: SaveFile[]
    deletedSaveFileList: SaveFile[]
}

/**
 * The Hitman server version in object form.
 */
export interface ServerVersion {
    readonly _Major: number
    readonly _Minor: number
    readonly _Build: number
    readonly _Revision: number
}

/**
 * An event sent from the game client to the server.
 */
export interface ClientToServerEvent<EventValue = unknown> {
    Value: EventValue extends object ? Readonly<EventValue> : EventValue
    ContractSessionId: string
    ContractId: string
    Name: string
    Timestamp: number
}

/**
 * A wrapper for {@link ServerToClientEvent} that also has a timestamp value.
 *
 * @see ServerToClientEvent
 */
export interface S2CEventWithTimestamp<EventValue = unknown> {
    time: number | string
    event: ServerToClientEvent<EventValue>
}

/**
 * A server to client push message. The message component is encoded JSON.
 */
export interface PushMessage {
    time: number | string
    message: string
}

/**
 * A server to client event.
 */
export interface ServerToClientEvent<EventValue = unknown> {
    message?: string
    CreatedAt?: string
    Token?: string
    IsReplicated?: boolean
    Version: ServerVersion
    CreatedContract?: string | null
    Id?: string
    Name?: string
    UserId?: string
    ContractId?: string
    SessionId?: string | null
    ContractSessionId?: string
    Timestamp?: number
    Value?: EventValue
    Origin?: string | null
}

export interface MissionStory {
    CommonRepositoryId: RepositoryId
    PreviouslyCompleted: boolean
    IsMainOpportunity: boolean
    Title: string
    Summary: string
    Briefing: string
    Location: string
    SubLocation: string
    Image: string
}

export interface PlayerProfileView {
    template: unknown
    data: {
        SubLocationData: {
            ParentLocation: Unlockable
            Location: Unlockable
            CompletionData: CompletionData
            ChallengeCategoryCompletion: ChallengeCategoryCompletion[]
            ChallengeCompletion: ChallengeCompletion
            OpportunityStatistics: OpportunityStatistics
            LocationCompletionPercent: number
        }[]
        PlayerProfileXp: {
            Total: number
            Level: number
            Seasons: {
                Number: number
                Locations: {
                    LocationId: string
                    Xp: number
                    ActionXp: number
                    LocationProgression?: {
                        Level: number
                        MaxLevel: number
                    }
                }[]
            }[]
        }
    }
}

export interface ChallengeCompletion {
    ChallengesCount: number
    CompletedChallengesCount: number
    CompletionPercent?: number
}

export interface ChallengeCategoryCompletion extends ChallengeCompletion {
    Name: string
}

export interface OpportunityStatistics {
    Count: number
    Completed: number
}

export interface ContractHistory {
    LastPlayedAt?: number
    Completed?: boolean
    IsEscalation?: boolean
}

export interface ProgressionData {
    Xp: number
    Level: number
    PreviouslySeenXp: number
}

export interface UserProfile {
    Id: string
    LinkedAccounts: {
        dev?: string
        epic?: string
        steam?: string
        gog?: string
        xbox?: string
        stadia?: string
    }
    Extensions: {
        /**
         * Map of escalation group ID to current level number.
         */
        PeacockEscalations: {
            [escalationId: string]: number
        }
        PeacockFavoriteContracts: string[]
        PeacockPlayedContracts: {
            [contractId: string]: ContractHistory
        }
        PeacockCompletedEscalations: string[]
        Saves: {
            [slot: string]: {
                Timestamp: number
                ContractSessionId: string
                Token: string
            }
        }
        ChallengeProgression: {
            [id: string]: ProfileChallengeData
        }
        /**
         * Player progression data.
         */
        progression: {
            /**
             * Player XP and level data.
             */
            PlayerProfileXP: {
                ProfileLevel: number
                /**
                 * The total amount of XP a user has obtained.
                 */
                Total: number
                Sublocations: {
                    Location: string
                    Xp: number
                    ActionXp: number
                }[]
            }
            /**
             * If the mastery location has subpackages and not drops, it will
             * be an object.
             */
            Locations: {
                [location: string]:
                    | ProgressionData
                    | {
                          [subPackageId: string]: ProgressionData
                      }
            }
        }
        defaultloadout?: {
            [location: string]: {
                "2"?: string
                "3"?: string
                "4"?: string
                "5"?: string
            }
        }
        entP: string[]
        achievements?: unknown
        gamepersistentdata: {
            __stats?: unknown
            PersistentBool: Record<string, unknown>
            HitsFilterType: {
                // "all" / "completed" / "failed"
                MyHistory: string
                MyContracts: string
                MyPlaylist: string
            }
            menudata: {
                difficulty: {
                    destinations: {
                        [locationId: string]: "normal" | "pro1"
                    }
                }
                newunlockables: string[]
            }
        }
        opportunityprogression: {
            [opportunityId: RepositoryId]: boolean
        }
        CPD: CPDStore
    }
    ETag: string | null
    Gamertag: string
    DevId: string | null
    SteamId: string | null
    StadiaId: string | null
    EpicId: string | null
    NintendoId: string | null
    XboxLiveId: string | null
    PSNAccountId: string | null
    PSNOnlineId: string | null
    /**
     * @since v7.0.0 user profiles are now versioned.
     */
    Version: number
}

export interface RatingKill {
    IsHeadshot: boolean
    KillClass: string
    KillItemCategory: string
    KillMethodBroad: string
    KillMethodStrict: string
    KillItemRepositoryId: RepositoryId
    // only used in contract creation?
    RequiredKillMethodType?: number
    // TODO: why did we do this??
    _RepositoryId?: RepositoryId
    // !!! use the one above this one - this is only a placeholder and will not actually work
    RepositoryId?: RepositoryId
    OutfitRepoId: string
}

export interface NamespaceEntitlementEpic {
    namespace: string
    itemId: string
    owned: boolean
}

/**
 * An unlockable item.
 */
export interface Unlockable {
    Id: string
    DisplayNameLocKey: string
    GameAsset: string | null
    Guid: string
    Type: string
    Subtype?: string
    // TODO: is this used?
    SubType?: string
    ImageId?: string | null
    RMTPrice?: number
    GamePrice?: number
    IsPurchasable: boolean
    IsPublished: boolean
    IsDroppable: boolean
    Capabilities: unknown[]
    Qualities?: Record<string, unknown> | null
    Properties: {
        RewardHidden?: boolean
        HowToUnlock?: string
        AllowUpSync?: boolean
        Background?: string
        Icon?: string
        LockedIcon?: string
        DlcImage?: string
        DlcName?: string
        IsLocked?: boolean
        Order?: number
        ProgressionKey?: string
        Season?: number
        RequiredResources?: string[]
        Entitlements?: string[]
        ParentLocation?: string
        GameChangers?: unknown[]
        CreateContractId?: null | string
        IsFreeDLC?: boolean
        HideProgression?: boolean
        ExcludeParentRewards?: boolean
        Quality?: number | string
        UpcomingContent?: boolean
        UpcomingKey?: "UI_MENU_LIVETILE_CONTENT_UPCOMING_HEADLINE" | string
        LimitedLoadout?: boolean
        NormalLoadoutUnlock?:
            | {
                  normal: string
                  pro1: string
              }
            | string
        Unlocks?: string[]
        Rarity?: string | null
        // noinspection SpellCheckingInspection
        LoadoutSlot?:
            | "carriedweapon"
            | "concealedweapon"
            | "disguise"
            | "gear"
            | string
        IsConsumable?: boolean
        RepositoryId?: RepositoryId
        OrderIndex?: number
        Name?: string
        Description?: string
        UnlockOrder?: number
        Location?: string
        Equip?: string[]
        GameAssets?: string[]
        RepositoryAssets?: RepositoryId[]
        Gameplay?: ItemGameplay
        AlwaysAdd?: boolean
        BlacklistedByDefault?: boolean
        IsContainer?: boolean
        LoadoutSettings?: {
            GearSlotsEnabledCount?: number
            GearSlotsAllowContainers?: boolean
            ConcealedWeaponSlotEnabled?: boolean
        }
        UnlockedByDefault?: boolean
        DifficultyUnlock?: {
            pro1?: string
        }
        Difficulty?: string
        /**
         * Sniper rifle modifier repository IDs.
         */
        Modifiers?: RepositoryId[] | null
        // noinspection SpellCheckingInspection
        /**
         * Inclusion data for an unlockable. The only known use for this is
         * sniper rifle unlockables for Sniper Assassin mode.
         *
         * With the `InclusionData` type added,
         * I think this line can be `InclusionData: InclusionData`. --Moony
         */
        InclusionData?: {
            ContractTypes?: MissionType[] | null
        } | null
        /**
         * Item perks - only known use is for Sniper Assassin.
         */
        Perks?: string[] | null
    }
    Rarity?: string | null
}

export interface ItemGameplay {
    range?: number
    damage?: number
    clipsize?: number
    rateoffire?: number
}

export interface CompletionData {
    Level: number
    MaxLevel: number
    XP: number
    PreviouslySeenXp: number
    Completion: number
    XpLeft: number
    Id: string
    SubLocationId: string
    HideProgression: boolean
    IsLocationProgression: boolean
    Name: string | null
}

export interface UserCentricContract {
    Contract: MissionManifest
    Data: {
        IsLocked: boolean
        LockedReason: string
        LocationLevel: number
        LocationMaxLevel: number
        LocationCompletion: number
        LocationXpLeft: number
        LocationHideProgression: boolean
        ElusiveContractState: string
        LastPlayedAt?: string
        IsFeatured?: boolean
        // For favorite contracts
        PlaylistData?: {
            IsAdded: boolean
            // Not sure if this is important
            AddedTime: string
        }
        Completed?: boolean
        LocationId: string
        ParentLocationId: string
        CompletionData?: CompletionData
        DlcName: string
        DlcImage: string
        EscalationCompleted?: boolean
        EscalationCompletedLevels?: number
        EscalationTotalLevels?: number
        InGroup?: string
    }
}

export interface TargetCondition {
    Type: string
    RepositoryId?: RepositoryId
    HardCondition?: boolean
    ObjectiveId?: string
    KillMethod?: string
}

/**
 * Data structure for an objective's HUD template.
 */
export interface HUDTemplate {
    display:
        | string
        | {
              $loc: {
                  key: string
                  data: string
              }
          }
    iconType?: number
}

/**
 * Data structure for a mission manifest's `Data.VR` bricks property.
 */
export interface VRQualityDefinition {
    Quality: string
    Bricks: string[]
}

export interface MissionManifestObjective {
    _comment?: string
    Id: string
    Type?: "kill" | "statemachine" | string
    Scope?: string
    Primary?: boolean
    IsHidden?: boolean
    BriefingText?: string | { $loc: { key: string; data: string | number[] } }
    LongBriefingText?:
        | string
        | { $loc: { key: string; data: string | number[] } }
    Image?: string
    BriefingName?: string
    ShowInHud?: boolean
    CombinedDisplayInHud?: boolean
    DisplayAsKillObjective?: boolean
    Category?: "primary" | "secondary" | "condition" | string
    ForceShowOnLoadingScreen?: boolean
    /**
     * Allow Elusive Target Arcade contracts to be restarted if this objective is already successfully completed.
     */
    AllowEtRestartOnSuccess?: boolean
    OnInactive?: {
        IfCompleted?: {
            State?: string
        }
    }
    Definition?: {
        display?: {
            iconType?: number
        }
        ContextListeners?: null | Record<string, IContextListener<never>>
        Scope?: string
        States?: Record<string, unknown>
        Constants?: Record<string, unknown>
        Context?: Record<string, unknown | string[] | string>
    }
    Activation?: {
        $eq?: (string | boolean)[]
    }
    OnActive?: {
        IfInProgress?: {
            Visible?: boolean
            State?: "Completed" | "InProgress" | "Failed" | string
        }
        IfCompleted?: {
            Visible?: boolean
            State?: "Completed" | "InProgress" | "Failed" | string
        }
        IfFailed?: {
            Visible?: boolean
            State?: "Completed" | "InProgress" | "Failed" | string
        }
    }
    ObjectiveType?: "kill" | "customkill" | "setpiece" | "custom" | string
    TargetConditions?: TargetCondition[]
    ExcludeFromScoring?: boolean
    HUDTemplate?: HUDTemplate
    SuccessEvent?: {
        EventName: "Kill" | string
        EventValues: {
            RepositoryId: RepositoryId
        }
    }
    FailedEvent?: {
        EventName: string
        EventValues?: {
            RepositoryId?: RepositoryId
        }
    }
    ResetEvent?: null
    IgnoreIfInactive?: boolean
    GameChangerName?: string
    IsPrestigeObjective?: boolean
}

/**
 * Data for a group contract.
 */
export type ContractGroupDefinition = {
    /**
     * The contract group type.
     */
    Type: MissionType
    /**
     * The contracts in this group, ordered by their position in the group.
     */
    Order: string[]
}

export interface EscalationInfo {
    Type?: MissionType
    InGroup?: string
    NextContractId?: string
    GroupData?: {
        Level: number
        TotalLevels: number
        Completed: boolean
        FirstContractId: string
    }
}

export interface MissionManifestMetadata {
    Id: string
    Location: string
    IsPublished?: boolean
    CreationTimestamp?: string
    CreatorUserId?: string
    Title: string
    Description?: string
    BriefingVideo?:
        | string
        | {
              Mode: string
              VideoId: string
          }[]
    DebriefingVideo?: string
    TileImage?:
        | string
        | {
              Mode: string
              Image: string
          }[]
    CodeName_Hint?: string
    ScenePath: string
    Type: MissionType
    Release?: string | object
    RequiredUnlockable?: string
    Drops?: string[]
    Opportunities?: string[]
    OpportunityData?: MissionStory[]
    Entitlements: string[]
    LastUpdate?: string
    PublicId?: string
    GroupObjectiveDisplayOrder?: GroupObjectiveDisplayOrderItem[]
    GameVersion?: string
    ServerVersion?: string
    AllowNonTargetKills?: boolean
    Difficulty?: "pro1" | string
    CharacterSetup?: {
        Mode: "singleplayer" | "multiplayer" | string
        Characters: {
            Name: string
            Id: string
            MandatoryLoadout?: string[]
        }[]
    }[]
    CharacterLoadoutData?: {
        Id: string
        Loadout: unknown
        CompletionData: CompletionData
    }[]
    SpawnSelectionType?: "random" | string
    Gamemodes?: ("versus" | string)[]
    Enginemodes?: ("singleplayer" | "multiplayer" | string)[]
    EndConditions?: {
        PointLimit?: number
    }
    Subtype?: string
    GroupTitle?: string
    TargetExpiration?: number
    TargetExpirationReduced?: number
    TargetLifeTime?: number
    NonTargetKillPenaltyEnabled?: boolean
    NoticedTargetStreakPenaltyMax?: number
    IsFeatured?: boolean
    // Begin escalation-exclusive properties
    InGroup?: string
    NextContractId?: string
    GroupDefinition?: ContractGroupDefinition
    GroupData?: {
        Level: number
        TotalLevels: number
        Completed: boolean
        FirstContractId: string
    }
    // End escalation-exclusive properties
    /**
     * Useless property.
     *
     * @deprecated
     */
    readonly UserData?: unknown | null
    IsVersus?: boolean
    IsEvergreenSafehouse?: boolean
    UseContractProgressionData?: boolean
    CpdId?: string
    /**
     * Custom property used for Elusives (like official's year)
     * and Escalations (if it's 0, it is a Peacock escalation,
     * and OriginalSeason will exist for filtering).
     */
    Season?: number
    OriginalSeason?: number
    // Used for sniper scoring
    Modules?: ManifestScoringModule[]
}

export interface GroupObjectiveDisplayOrderItem {
    Id: string
    IsNew?: boolean
}

export interface GameChanger {
    Id: string
    Name: string
    Description: string
    TileImage?: string | null
    Icon?: string | null
    ObjectivesCategory?: string | null
    IsHidden?: boolean | null
    Resource?: string[] | null
    Objectives?: MissionManifestObjective[] | null
    LongDescription?: string | null
    IsPrestigeObjective?: boolean
}

/**
 * A mission's manifest is what defines how a specific contract plays.
 *
 * @see MissionManifestMetadata
 * @see MissionManifestObjective
 */
export interface MissionManifest {
    Data: {
        EnableSaving?: boolean
        Objectives?: MissionManifestObjective[]
        GameDifficulties?: {
            Difficulty: "easy" | "normal" | "hard" | string
            Bricks: string[]
        }[]
        GameModesBricks?: unknown[]
        EngineModesBricks?: unknown[]
        // noinspection SpellCheckingInspection
        /**
         * IOI typo.
         *
         * @deprecated
         */
        EngineModessBricks?: null
        MandatoryLoadout?: unknown[]
        RecommendedLoadout?: unknown[]
        Bricks: string[]
        VR?: VRQualityDefinition[]
        GameChangers?: string[]
        GameChangerReferences?: GameChanger[]
        Entrances?: string[]
        Stashpoints?: string[]
        EnableExits?: {
            $eq?: (string | boolean)[]
        }
        DevOnlyBricks?: string[]
    }
    Metadata: MissionManifestMetadata
    readonly UserData?: Record<string, never> | never[]
    Peacock?: {
        noAgencyPickupsActive?: boolean
        noGear?: boolean
        noCarriedWeapon?: boolean
    }
    SMF?: {
        destinations: {
            addToDestinations: boolean
            peacockIntegration?: boolean
            narrativeContext?: "Mission" | "Campaign"
            placeBefore?: string
            placeAfter?: string
        }
    }
}

/**
 * A configuration that tells the game where it should connect to.
 * This config is the first thing that the game asks for when logging in.
 */
export interface ServerConnectionConfig {
    Versions: {
        Name: string
        GAME_VER: string
        ISSUER_ID: string
        SERVER_VER: {
            Metrics: {
                MetricsServerHost: string
            }
            Authentication: {
                AuthenticationHost: string
            }
            Configuration: {
                Url: string
                AgreementUrl: string
            }
            Resources: {
                ResourcesServicePath: string
            }
            GlobalAuthentication: {
                AuthenticationHost: string
                RequestedAudience: string
            }
        }
    }[]
}

/**
 * The format we store our locations data in, which is more concise than the
 * one used by the game.
 *
 * @see GameLocationsData
 */
export interface PeacockLocationsData {
    /**
     * The parent locations.
     */
    parents: Record<string, Unlockable>
    /**
     * The sub-locations.
     */
    children: Record<string, Unlockable>
}

/**
 * A structure representing the game's LocationsData object.
 */
export interface GameLocationsData {
    Data: {
        HasMore: boolean
        Page: number
        Locations: {
            /**
             * The contract creation contract.
             */
            Contract: MissionManifest
            Location: Unlockable
            SubLocation: Unlockable
        }[]
    }
}

/**
 * The body sent with the CreateFromParams request from the game during the final phase of contract creation.
 *
 * @see IContractCreationPayload
 */
export interface CreateFromParamsBody {
    creationData: {
        Title: string
        Description: string
        ContractId: string
        ContractPublicId: string
        Targets: IContractCreationPayload[]
        ContractConditionIds: string[]
    }
}

export interface CommonSelectScreenConfig {
    template: unknown
    data?: {
        Unlocked: string[]
        Contract: MissionManifest
        OrderedUnlocks: Unlockable[]
        UserCentric: UserCentricContract
    }
}

export type CompiledIoiStatemachine = unknown

/**
 * The `ChallengeProgress` data for a `challengetree` context listener.
 */
export interface ChallengeProgressCTreeContextListener {
    total: number
    completed: string[] | readonly string[]
    missing: number
    all: string[] | readonly string[]
    count: number
}

/**
 * The `ChallengeProgress` data for a `challengecount` context listener.
 */
export interface ChallengeProgressCCountContextListener {
    total: number
    count: number
}

export interface CompiledChallengeTreeCategory {
    CategoryId: string
    ChallengesCount: number
    CompletedChallengesCount: number
    CompletionData: CompletionData
    Icon: string
    Image: string
    ImageLocked?: string
    IsLocked: boolean
    Location: Unlockable
    Name: string
    RequiredResources: string[]
    SwitchData: {
        Data: {
            CategoryData: CompiledChallengeTreeCategoryInfo
            Challenges: CompiledChallengeTreeData[]
            CompletionData: CompletionData
            HasNext: boolean
            HasPrevious: boolean
            NextCategoryIcon?: string
            PreviousCategoryIcon?: string
        }
        IsLeaf: boolean
    }
}

export interface CompiledChallengeTreeCategoryInfo {
    Name: string
    Image: string
    Icon: string
    ChallengesCount: number
    CompletedChallengesCount: number
}

/**
 * The data for a challenge's `ChallengeProgression` field. Tells the game how
 * many challenges are completed, how many are left, etc.
 */
export type ChallengeTreeWaterfallState =
    | ChallengeProgressCTreeContextListener
    | ChallengeProgressCCountContextListener
    | null

export interface CompiledChallengeTreeData {
    CategoryName: string
    ChallengeProgress?: ChallengeTreeWaterfallState
    Completed: boolean
    CompletionData: CompletionData
    Description: string
    // A string array of at most one element ("easy", "normal", or "hard").
    // If empty, then the challenge should appear in sessions on any difficulty.
    // If not, then it should only appear in sessions on or above the specified difficulty.
    DifficultyLevels?: string[]
    Displayed?: boolean
    Drops?: Unlockable[]
    HideProgression: boolean
    Icon: string
    Id: string
    ImageName: string
    IsLocked: boolean
    IsPlayable: boolean
    LocationId: string
    Name: string
    ParentLocationId: string
    Rewards: {
        MasteryXP?: number
    }
    Type?: string
    UserCentricContract?: UserCentricContract
}

export interface InclusionData {
    ContractIds?: string[]
    ContractTypes?: MissionType[]
    Locations?: string[]
    GameModes?: string[]
}

export interface CompiledChallengeIngameData {
    Id: string
    GroupId?: string
    Name: string
    Type: "Hit" | string
    Description?: string
    ImageName?: string
    Definition: CompiledIoiStatemachine
    Tags?: string[]
    Drops?: string[]
    LastModified?: string
    PlayableSince?: string | null
    PlayableUntil?: string | null
    Xp: number
    XpModifier: unknown
    InclusionData?: InclusionData
    CrowdChoice?: {
        Tag: string
    }
}

/**
 * Game-facing challenge progression data.
 */
export interface ChallengeProgressionData {
    ChallengeId: string
    ProfileId: string
    Completed: boolean
    Ticked: boolean
    State: Record<string, unknown>
    CompletedAt: Date | string | null
    MustBeSaved: boolean
}

export interface CompiledChallengeRuntimeData {
    Challenge: CompiledChallengeIngameData
    Progression: ChallengeProgressionData
}

export interface CompiledChallengeRewardData {
    ChallengeId: string
    ChallengeName: string
    ChallengeDescription: string
    ChallengeImageUrl: string
    XPGain: number
}

export type LoadoutSavingMechanism = "PROFILES" | "LEGACY"
export type ImageLoadingStrategy = "SAVEASREQUESTED" | "ONLINE" | "OFFLINE"

export type Flags = Record<
    string,
    { desc: string; default: boolean | string | number }
>

/**
 * A "hit" object.
 */
export interface IHit {
    Id: string
    UserCentricContract: UserCentricContract
    Location: Unlockable
    SubLocation?: Unlockable
    ChallengesCompleted: number
    ChallengesTotal: number
    LocationLevel: number
    LocationMaxLevel: number
    LocationCompletion: number
    LocationXPLeft: number
    LocationHideProgression: boolean
}

/**
 * A video object.
 *
 * @see ICampaignVideo
 * @see StoryData
 */
export interface IVideo {
    VideoTitle: string
    VideoHeader: string
    VideoId: string
    Entitlements: string[]
    IsLocked: boolean
    LockedReason?: string
    VideoType: string
    VideoImage: string
    RequiredResources: string[]
    Data: {
        DlcName: string
        DlcImage: string
    }
}

/**
 * A campaign mission item.
 *
 * @see IHit
 */
export type ICampaignMission = {
    Type: "Mission"
    Data: IHit
}

/**
 * A campaign video item.
 *
 * @see IVideo
 */
export type ICampaignVideo = {
    Type: "Video"
    Data: IVideo
}

export interface RegistryChallenge extends SavedChallenge {
    /**
     * Warning: this property is INTERNAL and should NOT BE SPECIFIED by API users.
     *
     * @internal
     */
    inGroup?: string
}

/**
 * An element for the game's story data.
 */
export type StoryData = ICampaignMission | ICampaignVideo

/**
 * A campaign object.
 */
export interface Campaign {
    Name: string
    Image: string
    Type: MissionType | string
    BackgroundImage?: string | null
    StoryData: StoryData[]
    Subgroups?: Campaign[]
    Properties?: {
        BackgroundImage?: string | null
    }
}

/**
 * A loadout.
 */
export interface Loadout {
    /**
     * Random ID.
     *
     * @since Peacock v5
     */
    id: string
    name: string
    data: {
        [locationName: string]: {
            readonly 2?: string
            readonly 3?: string
            readonly 4?: string
        } & { [briefcaseId: string]: string }
    }
}

/**
 * The object for individual game versions' loadout profiles data.
 *
 * @see LoadoutFile
 */
export interface LoadoutsGameVersion {
    selected: string | null
    loadouts: Loadout[]
}

/**
 * The top-level format for the loadout profiles storage file.
 */
export interface LoadoutFile {
    h1: LoadoutsGameVersion
    h2: LoadoutsGameVersion
    h3: LoadoutsGameVersion
}

/**
 * A function that generates a campaign mission object for use in the campaigns menu.
 */
export type GenSingleMissionFunc = (
    contractId: string,
    gameVersion: GameVersion,
) => ICampaignMission

/**
 * A function that generates a campaign video object for use in the campaigns menu.
 */
export type GenSingleVideoFunc = (
    videoId: string,
    gameVersion: GameVersion,
) => ICampaignVideo

/**
 * A "hits category" is used to display lists of contracts in-game.
 *
 * @see IHit
 */
export interface HitsCategoryCategory {
    Category: string
    Data: {
        Type: string
        Hits: IHit[]
        Page: number
        HasMore: boolean
    }
    CurrentSubType: string
}

export interface PlayNextCampaignDetails {
    CampaignName: string
    ParentCampaignName?: string
}

export interface PlayNextGetCampaignsHookReturn {
    /**
     * The UUID of the next contract in the campaign.
     */
    nextContractId: string
    /**
     * An object containing the campaign's details.
     */
    campaignDetails: PlayNextCampaignDetails
    /**
     * An array index for plugins to override play next tiles that Peacock
     * internally added
     *
     * @since v6.3.0
     */
    overrideIndex?: number
}

export type SafehouseCategory = {
    Category: string
    SubCategories: SafehouseCategory[]
    IsLeaf: boolean
    Data: null
}

export type SniperLoadout = {
    ID: string
    InstanceID: string
    Unlockable: Unlockable[]
    MainUnlockable: Unlockable
}

/**
 * Common type for the `Entrances` and `AgencyPickups` configs.
 */
export type SceneConfig = Record<string, string[]>

/**
 * Where a state machine's `Context` data should be stored.
 *
 * - For `profile`, the challenge's context data should be stored in the user's
 *   profile. This data will be used across hits, instead of being constrained
 *   to a single hit, like `Hit` is.
 *
 * - For `hit`, the challenge's context data should be stored with persistent
 *   data for the current contract. This appears to function differently when
 *   this is used in objectives.
 *
 * - For `session`, the challenge's context data should be stored on the
 *   contract session. When a mission is restarted, this data is not persisted,
 *   since that creates a new session.
 */
export type ContextScopedStorageLocation = "profile" | "hit" | "session"

/**
 * Evergreen-related types
 */
export type CPDStore = Record<string, Record<string, string | number | boolean>>

export type ContractProgressionData = Record<string, string | number | boolean>

/** SMF's lastDeploy.json */
export interface SMFLastDeploy {
    loadOrder: string[]
    lastServerSideStates?: {
        unlockables?: Unlockable[]
        contracts?: {
            [k: string]: MissionManifest
        }
        blobs?: Record<string, string>
    }
}
