/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2022 The Peacock Project Team
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

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { log, LogLevel } from "./loggingInterop"
import type { GameVersion } from "./types/types"
import { fastClone } from "./utils"

/**
 * All the configurations. Gets modified before being exported.
 *
 * @private
 */
const configs: Record<string, unknown> = {
    Roadmap: require("../static/Roadmap.json"),
    StoreData: require("../static/StoreData.json"),
    FilterData: require("../static/FilterData.json"),
    LocationsData: require("../static/LocationsData.json"),
    GameChangerProperties: require("../static/GameChangerProperties.json"),
    allunlockables: require("../static/allunlockables.json"),
    Destinations: require("../static/Destinations.json"),
    config: require("../static/config.json"),
    onlineconfig: require("../static/onlineconfig.json"),
    privacypolicy: require("../static/privacypolicy.json"),
    UserDefault: require("../static/UserDefault.json"),
    AgencyPickups: require("../static/AgencyPickups.json"),
    Entrances: require("../static/Entrances.json"),
    LeaderboardEntriesTemplate: require("../static/LeaderboardEntriesTemplate.json"),
    LeaderboardsViewTemplate: require("../static/LeaderboardsViewTemplate.json"),
    MissionEndReadyTemplate: require("../static/MissionEndReadyTemplate.json"),
    MissionEndNotReadyTemplate: require("../static/MissionEndNotReadyTemplate.json"),
    SelectAgencyPickupTemplate: require("../static/SelectAgencyPickupTemplate.json"),
    SelectEntranceTemplate: require("../static/SelectEntranceTemplate.json"),
    StashpointTemplate: require("../static/StashpointTemplate.json"),
    LoadMenuTemplate: require("../static/LoadMenuTemplate.json"),
    SaveMenuTemplate: require("../static/SaveMenuTemplate.json"),
    Playstyles: require("../static/Playstyles.json"),
    HubPageData: require("../static/HubPageData.json"),
    DashboardCategoryEscalation: require("../static/DashboardCategoryEscalation.json"),
    GlobalChallenges: require("../static/GlobalChallenges.json"),
    ContractsTemplate: require("../static/ContractsTemplate.json"),
    CreateContractPlanningTemplate: require("../static/CreateContractPlanningTemplate.json"),
    CreateContractReturnTemplate: require("../static/CreateContractReturnTemplate.json"),
    PlayerProfilePage: require("../static/PlayerProfileView.json"),
    Legacyallunlockables: require("../static/Legacyallunlockables.json"),
    LegacyGlobalChallenges: require("../static/LegacyGlobalChallenges.json"),
    LegacySafehouseTemplate: require("../static/LegacySafehouseTemplate.json"),
    LegacyHubTemplate: require("../static/LegacyHubTemplate.json"),
    LegacyPlanningTemplate: require("../static/LegacyPlanningTemplate.json"),
    LegacySelectAgencyPickupTemplate: require("../static/LegacySelectAgencyPickupTemplate.json"),
    LegacySelectEntranceTemplate: require("../static/LegacySelectEntranceTemplate.json"),
    LegacyStashpointTemplate: require("../static/LegacyStashpointTemplate.json"),
    LegacyUserDefault: require("../static/LegacyUserDefault.json"),
    LegacyContractSearchResponseTemplate: require("../static/LegacyContractSearchResponseTemplate.json"),
    LegacyFilterData: require("../static/LegacyFilterData.json"),
    PlayNextTemplate: require("../static/PlayNextTemplate.json"),
    LookupContractByIdTemplate: require("../static/LookupContractByIdTemplate.json"),
    LookupContractFavoriteTemplate: require("../static/LookupContractFavoriteTemplate.json"),
    MissionStories: require("../static/MissionStories.json"),
    DebriefingLeaderboardsTemplate: require("../static/DebriefingLeaderboardsTemplate.json"),
    LegacyHitsCategoryTemplate: require("../static/LegacyHitsCategoryTemplate.json"),
    LegacyStoreData: require("../static/LegacyStoreData.json"),
    LegacyDestinations: require("../static/LegacyDestinations.json"),
    LegacyDestinationTemplate: require("../static/LegacyDestinationTemplate.json"),
    LegacyLocationsData: require("../static/LegacyLocationsData.json"),
    LegacySaveMenuTemplate: require("../static/LegacySaveMenuTemplate.json"),
    LegacyLoadMenuTemplate: require("../static/LegacyLoadMenuTemplate.json"),
    LegacyLookupContractByIdTemplate: require("../static/LegacyLookupContractByIdTemplate.json"),
    EiderDashboard: require("../static/EiderDashboard.json"),
    PersistentBools: require("../static/PersistentBools.json"),
    H2allunlockables: require("../static/H2allunlockables.json"),
    H2DestinationsData: require("../static/H2DestinationsData.json"),
    H2StoreData: require("../static/H2StoreData.json"),
    H2ContractSearchResponseTemplate: require("../static/H2ContractSearchResponseTemplate.json"),
    H2LocationsData: require("../static/H2LocationsData.json"),
    H2FilterData: require("../static/H2FilterData.json"),
    H2DashboardTemplate: require("../static/H2DashboardTemplate.json"),
    FrankensteinHubTemplate: require("../static/FrankensteinHubTemplate.json"),
    FrankensteinMmSpTemplate: require("../static/FrankensteinMmSpTemplate.json"),
    FrankensteinMmMpTemplate: require("../static/FrankensteinMmMpTemplate.json"),
    FrankensteinScoreOverviewTemplate: require("../static/FrankensteinScoreOverviewTemplate.json"),
    FrankensteinPlanningTemplate: require("../static/FrankensteinPlanningTemplate.json"),
    Videos: require("../static/Videos.json"),
    ContractSearchPageTemplate: require("../static/ContractSearchPageTemplate.json"),
    ContractSearchResponseTemplate: require("../static/ContractSearchResponseTemplate.json"),
    LegacyDebriefingChallengesTemplate: require("../static/LegacyDebriefingChallengesTemplate.json"),
    MasteryUnlockablesTemplate: require("../static/MasteryUnlockablesTemplate.json"),
    SniperLoadouts: require("../static/SniperLoadouts.json"),
    Scpcallunlockables: require("../static/Scpcallunlockables.json"),
    DiscordRichAssetsForBricks: require("../static/DiscordRichAssetsForBricks.json"),
    EscalationCodenames: require("../static/EscalationCodenames.json"),
    scoreoverviewtemplate: require("../static/scoreoverviewtemplate.json"),
    PeacockGameChangerProperties: require("../static/PeacockGameChangerProperties.json"),
    MultiplayerPresets: require("../static/MultiplayerPresets.json"),
    LobbySlimTemplate: require("../static/LobbySlimTemplate.json"),
}

Object.keys(configs).forEach((cfg) => {
    const overridePath = join("overrides", `${cfg}.json`)

    if (existsSync(overridePath)) {
        log(LogLevel.INFO, `Loaded override config for ${cfg}.`)
        configs[cfg] = JSON.parse(readFileSync(overridePath).toString())
    }
})

export { configs }

/**
 * Get a config file.
 * Configs for H1 start with "Legacy", "H2" for HITMAN 2, and no prefix for HITMAN 3.
 *
 * @param config The name of the config file.
 * @param clone If the value should be cloned (saves memory if false, but as a side effect, modifications will affect the actual config).
 * @returns The config.
 * @throws {Error} If the config file specified doesn't exist.
 */
export function getConfig<T = unknown>(config: string, clone: boolean): T {
    if (configs.hasOwnProperty.call(configs, config)) {
        if (!clone) {
            return configs[config]
        }

        // properly create object clones
        // this could be better, but this is the best temporary solution
        return fastClone(configs[config])
    }

    throw new Error(`Tried to lookup config that does not exist: ${config}`)
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
    config: string,
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
        `${h1Prefix}${gameVersion === "h2" ? "H2" : ""}${config}`,
        clone,
    )
}

/**
 * Creates an override config.
 *
 * @param name The name of the config to override.
 */
export function swizzle(name: string): void {
    if (existsSync(join("overrides", `${name}.json`))) {
        log(
            LogLevel.ERROR,
            `That file already exists in overrides/${name}.json - Aborting.`,
        )
        process.exit(1)
    }

    if (!Object.prototype.hasOwnProperty.call(configs, name)) {
        log(LogLevel.ERROR, `No configs have the name ${name} - Aborting.`)
        process.exit(1)
    }

    if (!existsSync("overrides")) {
        mkdirSync("overrides")
    }

    writeFileSync(
        join("overrides", `${name}.json`),
        JSON.stringify(configs[name]),
    )

    log(LogLevel.INFO, `Done! Wrote override to overrides/${name}.json`)
}

/**
 * Gets a list of swizzleable configurations.
 *
 * @returns A list of swizzleable configs.
 */
export function getSwizzleable(): string[] {
    return Object.keys(configs)
}
