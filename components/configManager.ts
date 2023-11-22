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

import type { GameVersion } from "./types/types"
import { SyncWaterfallHook } from "tapable"
import { fastClone } from "./utils"

class ConfigManager {
    hooks: {
        getConfig: SyncWaterfallHook<[unknown, ConfigKey, boolean]>
    } = {
        getConfig: new SyncWaterfallHook([
            "currentConfig",
            "configName",
            "clone",
        ]),
    }

    /**
     * DO NOT MODIFY OUTSIDE OF TESTS!!
     * The require function used to load configs.
     */
    _require = require
}

export const configManager = new ConfigManager()

const h2LookupContractTemplate = () =>
    configManager._require("static/H2LookupContractTemplate.json")

// noinspection JSUnusedGlobalSymbols
const configs = {
    Roadmap() {
        return configManager._require("static/Roadmap.json")
    },
    StoreData() {
        return configManager._require("static/StoreData.json")
    },
    FilterData() {
        return configManager._require("static/FilterData.json")
    },
    LocationsData() {
        return configManager._require("static/LocationsData.json")
    },
    LeaderboardsViewTemplate() {
        return configManager._require("static/LeaderboardsViewTemplate.json")
    },
    LeaderboardEntriesTemplate() {
        return configManager._require("static/LeaderboardEntriesTemplate.json")
    },
    GameChangerProperties() {
        return configManager._require("static/GameChangerProperties.json")
    },
    allunlockables() {
        return configManager._require("static/allunlockables.json")
    },
    ServerVersionConfig() {
        return configManager._require("static/ServerVersionConfig.json")
    },
    OnlineConfig() {
        return configManager._require("static/OnlineConfig.json")
    },
    PrivacyPolicy() {
        return configManager._require("static/PrivacyPolicy.json")
    },
    UserDefault() {
        return configManager._require("static/UserDefault.json")
    },
    AgencyPickups() {
        return configManager._require("static/AgencyPickups.json")
    },
    Entrances() {
        return configManager._require("static/Entrances.json")
    },
    MissionEndReadyTemplate() {
        return configManager._require("static/MissionEndReadyTemplate.json")
    },
    MissionEndNotReadyTemplate() {
        return configManager._require("static/MissionEndNotReadyTemplate.json")
    },
    SelectAgencyPickupTemplate() {
        return configManager._require("static/SelectAgencyPickupTemplate.json")
    },
    SelectEntranceTemplate() {
        return configManager._require("static/SelectEntranceTemplate.json")
    },
    StashpointTemplate() {
        return configManager._require("static/StashpointTemplate.json")
    },
    LoadMenuTemplate() {
        return configManager._require("static/LoadMenuTemplate.json")
    },
    SaveMenuTemplate() {
        return configManager._require("static/SaveMenuTemplate.json")
    },
    Playstyles() {
        return configManager._require("static/Playstyles.json")
    },
    HubPageData() {
        return configManager._require("static/HubPageData.json")
    },
    DashboardCategoryEscalation() {
        return configManager._require("static/DashboardCategoryEscalation.json")
    },
    GlobalChallenges() {
        return configManager._require("static/GlobalChallenges.json")
    },
    ContractsTemplate() {
        return configManager._require("static/ContractsTemplate.json")
    },
    CreateContractPlanningTemplate() {
        return configManager._require(
            "static/CreateContractPlanningTemplate.json",
        )
    },
    CreateContractReturnTemplate() {
        return configManager._require(
            "static/CreateContractReturnTemplate.json",
        )
    },
    PlayerProfilePage() {
        return configManager._require("static/PlayerProfileView.json")
    },
    Legacyallunlockables() {
        return configManager._require("static/Legacyallunlockables.json")
    },
    LegacyGlobalChallenges() {
        return configManager._require("static/LegacyGlobalChallenges.json")
    },
    LegacySafehouseTemplate() {
        return configManager._require("static/LegacySafehouseTemplate.json")
    },
    LegacyHubTemplate() {
        return configManager._require("static/LegacyHubTemplate.json")
    },
    LegacyPlanningTemplate() {
        return configManager._require("static/LegacyPlanningTemplate.json")
    },
    LegacySelectAgencyPickupTemplate() {
        return configManager._require(
            "static/LegacySelectAgencyPickupTemplate.json",
        )
    },
    LegacySelectEntranceTemplate() {
        return configManager._require(
            "static/LegacySelectEntranceTemplate.json",
        )
    },
    LegacyStashpointTemplate() {
        return configManager._require("static/LegacyStashpointTemplate.json")
    },
    LegacyUserDefault() {
        return configManager._require("static/LegacyUserDefault.json")
    },
    LegacyFilterData() {
        return configManager._require("static/LegacyFilterData.json")
    },
    PlayNextTemplate() {
        return configManager._require("static/PlayNextTemplate.json")
    },
    LookupContractByIdTemplate() {
        return configManager._require("static/LookupContractByIdTemplate.json")
    },
    LookupContractFavoriteTemplate() {
        return configManager._require(
            "static/LookupContractFavoriteTemplate.json",
        )
    },
    MissionStories() {
        return configManager._require("static/MissionStories.json")
    },
    DebriefingLeaderboardsTemplate() {
        return configManager._require(
            "static/DebriefingLeaderboardsTemplate.json",
        )
    },
    LegacyHitsCategoryTemplate() {
        return configManager._require("static/LegacyHitsCategoryTemplate.json")
    },
    LegacyStoreData() {
        return configManager._require("static/LegacyStoreData.json")
    },
    LegacyDestinations() {
        return configManager._require("static/LegacyDestinations.json")
    },
    LegacyDestinationTemplate() {
        return configManager._require("static/LegacyDestinationTemplate.json")
    },
    LegacyLocationsData() {
        return configManager._require("static/LegacyLocationsData.json")
    },
    LegacySaveMenuTemplate() {
        return configManager._require("static/LegacySaveMenuTemplate.json")
    },
    LegacyLoadMenuTemplate() {
        return configManager._require("static/LegacyLoadMenuTemplate.json")
    },
    LegacyContractSearchResponseTemplate() {
        return configManager._require(
            "static/LegacyContractSearchResponseTemplate.json",
        )
    },
    LegacyDebriefingChallengesTemplate() {
        return configManager._require(
            "static/LegacyDebriefingChallengesTemplate.json",
        )
    },
    DebriefingChallengesTemplate() {
        return configManager._require(
            "static/DebriefingChallengesTemplate.json",
        )
    },
    LegacyLookupContractByIdTemplate() {
        return configManager._require(
            "static/LegacyLookupContractByIdTemplate.json",
        )
    },
    EiderDashboard() {
        return configManager._require("static/EiderDashboard.json")
    },
    FrankensteinHubTemplate() {
        return configManager._require("static/FrankensteinHubTemplate.json")
    },
    H2allunlockables() {
        return configManager._require("static/H2allunlockables.json")
    },
    H2DestinationsData() {
        return configManager._require("static/H2DestinationsData.json")
    },
    H2StoreData() {
        return configManager._require("static/H2StoreData.json")
    },
    H2ContractSearchResponseTemplate() {
        return configManager._require(
            "static/H2ContractSearchResponseTemplate.json",
        )
    },
    H2LocationsData() {
        return configManager._require("static/H2LocationsData.json")
    },
    H2LookupContractByIdTemplate: h2LookupContractTemplate,
    H2LookupContractFavoriteTemplate: h2LookupContractTemplate,
    H2FilterData() {
        return configManager._require("static/H2FilterData.json")
    },
    H2CareerTemplate() {
        return configManager._require("static/H2CareerTemplate.json")
    },
    H2DashboardTemplate() {
        return configManager._require("static/H2DashboardTemplate.json")
    },
    H2SniperContentTemplate() {
        return configManager._require("static/H2SniperContentTemplate.json")
    },
    FrankensteinMmSpTemplate() {
        return configManager._require("static/FrankensteinMmSpTemplate.json")
    },
    FrankensteinMmMpTemplate() {
        return configManager._require("static/FrankensteinMmMpTemplate.json")
    },
    FrankensteinPlanningTemplate() {
        return configManager._require(
            "static/FrankensteinPlanningTemplate.json",
        )
    },
    FrankensteinScoreOverviewTemplate() {
        return configManager._require(
            "static/FrankensteinScoreOverviewTemplate.json",
        )
    },
    Videos() {
        return configManager._require("static/Videos.json")
    },
    ChallengeLocationTemplate() {
        return configManager._require("static/ChallengeLocationTemplate.json")
    },
    H2ChallengeLocationTemplate() {
        return configManager._require("static/H2ChallengeLocationTemplate.json")
    },
    LegacyChallengeLocationTemplate() {
        return configManager._require(
            "static/LegacyChallengeLocationTemplate.json",
        )
    },
    ReportTemplate() {
        return configManager._require("static/ReportTemplate.json")
    },
    ContractSearchPageTemplate() {
        return configManager._require("static/ContractSearchPageTemplate.json")
    },
    ContractSearchPaginateTemplate() {
        return configManager._require(
            "static/ContractSearchPaginateTemplate.json",
        )
    },
    ContractSearchResponseTemplate() {
        return configManager._require(
            "static/ContractSearchResponseTemplate.json",
        )
    },
    MasteryUnlockablesTemplate() {
        return configManager._require("static/MasteryUnlockablesTemplate.json")
    },
    Scpcallunlockables() {
        return configManager._require("static/Scpcallunlockables.json")
    },
    ScpcLocationsData() {
        return configManager._require("static/ScpcLocationsData.json")
    },
    DiscordRichAssetsForBricks() {
        return configManager._require("static/DiscordRichAssetsForBricks.json")
    },
    EscalationCodenames() {
        return configManager._require("static/EscalationCodenames.json")
    },
    ScoreOverviewTemplate() {
        return configManager._require("static/ScoreOverviewTemplate.json")
    },
    PeacockGameChangerProperties() {
        return configManager._require(
            "static/PeacockGameChangerProperties.json",
        )
    },
    MultiplayerPresets() {
        return configManager._require("static/MultiplayerPresets.json")
    },
    LobbySlimTemplate() {
        return configManager._require("static/LobbySlimTemplate.json")
    },
    MasteryDataForLocationTemplate() {
        return configManager._require(
            "static/MasteryDataForLocationTemplate.json",
        )
    },
    LegacyMasteryLocationTemplate() {
        return configManager._require(
            "static/LegacyMasteryLocationTemplate.json",
        )
    },
    DefaultCpdConfig() {
        return configManager._require("static/DefaultCpdConfig.json")
    },
    EvergreenGameChangerProperties() {
        return configManager._require(
            "static/EvergreenGameChangerProperties.json",
        )
    },
    AreaMap() {
        return configManager._require("static/AreaMap.json")
    },
    ArcadePageTemplate() {
        return configManager._require("static/ArcadePageTemplate.json")
    },
    HitsCategoryElusiveTemplate() {
        return configManager._require("static/HitsCategoryElusiveTemplate.json")
    },
    HitsCategoryContractAttackTemplate() {
        return configManager._require(
            "static/HitsCategoryContractAttackTemplate.json",
        )
    },
    MissionRewardsTemplate() {
        return configManager._require("static/MissionRewardsTemplate.json")
    },
    SniperUnlockables() {
        return configManager._require("static/SniperUnlockables.json")
    },
}

export type ConfigKey = keyof typeof configs

export const configKeys: ConfigKey[] = Object.keys(configs) as ConfigKey[]

/**
 * Get a config file.
 * Configs for H1 start with "Legacy", "H2" for HITMAN 2, and no prefix for HITMAN 3.
 *
 * @param config The name of the config file.
 * @param clone If the value should be cloned (saves memory if false, but as a side effect, modifications will affect the actual config).
 * @returns The config.
 * @throws {Error} If the config file specified doesn't exist.
 */
export function getConfig<T = unknown>(config: ConfigKey, clone: boolean): T {
    if (!Object.hasOwn(configs, config)) {
        throw new Error(`Tried to lookup config that does not exist: ${config}`)
    }

    let c = configs[config]()
    c = configManager.hooks.getConfig.call(c, config, clone)

    return clone ? fastClone(c) : c
}

/**
 * Get a config file intended for the specified game version.
 *
 * @param config The name of the config file.
 * @param gameVersion The game's version ("h1", "h2", or "h3").
 * @param clone If the config should be cloned (saves memory if false, but as a side effect, modifications will affect the actual config).
 * @returns The config.
 * @see getConfig
 * @throws {Error} If the config file specified doesn't exist.
 */
export function getVersionedConfig<T = unknown>(
    config: ConfigKey,
    gameVersion: GameVersion,
    clone: boolean,
): T {
    let h1Prefix = ""

    if (
        // is this scpc, do we have a scpc config?
        gameVersion === "scpc" &&
        Object.prototype.hasOwnProperty.call(configs, `Scpc${config}`)
    ) {
        h1Prefix = "Scpc"
    } else {
        // the above condition wasn't true
        if (["scpc", "h1"].includes(gameVersion)) {
            h1Prefix = "Legacy"
        }
    }

    // if this is H2, but we don't have a h2 specific config, fall back to h3
    if (
        gameVersion === "h2" &&
        !Object.prototype.hasOwnProperty.call(configs, `H2${config}`)
    ) {
        return getConfig(config, clone)
    }

    return getConfig(
        // @ts-expect-error No good way to explain this to TypeScript.
        `${h1Prefix}${gameVersion === "h2" ? "H2" : ""}${config}`,
        clone,
    )
}
