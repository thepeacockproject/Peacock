/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2024 The Peacock Project Team
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

import { RPCClient } from "./client"
import { getConfig } from "../configSwizzleManager"
import type { GameVersion, MissionType } from "../types/types"
import { getFlag } from "../flags"
import { log, LogLevel } from "../loggingInterop"

let rpcClient: undefined | RPCClient
/*@__NOINLINE__*/
const processStartTime = Math.round(Date.now() / 1000)

export function initRp(): void {
    for (const key of Object.keys(getConfig("Entrances", false))) {
        if (!scenePathToRpAsset(key, []) && PEACOCK_DEV) {
            log(LogLevel.WARN, `Missing scene ${key} for RP!`, "discord")
        }
    }

    // creates a new rp client, pretty self-explanatory.
    rpcClient = new RPCClient()

    // connects to the Peacock discord developer app, which contains the images for the rp.
    void rpcClient.login({
        clientId: "846361353027584013",
    })

    // checks if the rp is on the state "ready", and starts the rp, displaying the details on discord.
    rpcClient.on("ready", () => {
        swapToIdle()
    })
}

/**
 * Sets the user's Discord RP status to "browsing menus" if the feature is enabled.
 *
 * @param gameVersion The game version.
 */
export function swapToBrowsingMenusStatus(gameVersion: GameVersion): void {
    if (getFlag("discordRp") === true) {
        rpcClient?.setActivity({
            details: `Playing HITMAN™ ${gameVersion
                .substring(1)
                .replace("1", "(2016)")}`,
            largeImageKey: gameVersion,
            largeImageText: "Browsing Menus",
            smallImageKey: "peacock",
            smallImageText: "Using Peacock",
            startTimestamp:
                getFlag("discordRpAppTime") === true
                    ? processStartTime
                    : Math.round(Date.now() / 1000),
        })
    }
}

/**
 * Sets the user's Discord RP status to "idle" if the feature is enabled.
 */
export function swapToIdle(): void {
    if (getFlag("discordRp") === true) {
        rpcClient?.setActivity({
            details: "Idle",
            largeImageKey: "peacock",
            largeImageText: "Idling",
            startTimestamp:
                getFlag("discordRpAppTime") === true
                    ? processStartTime
                    : Math.round(Date.now() / 1000),
        })
    }
}

/**
 * Sets the user's Discord RP status to playing something if the feature is enabled.
 *
 * @param scenePath The path to the loaded scene, used to determine names/assets used.
 * @param missionType The mission's type.
 * @param bricks The mission's loaded bricks.
 */
export function swapToLocationStatus(
    scenePath: string,
    missionType: MissionType,
    bricks: string[],
): void {
    if (getFlag("discordRp") !== true) {
        return
    }

    const details = scenePathToRpAsset(scenePath, bricks)

    if (!Array.isArray(details)) {
        // we need to handle this somehow in the future
        return
    }

    const formattedMissionType =
        missionType === "orbis"
            ? "Sarajevo Six"
            : `${missionType
                  .substring(0, 1)
                  .toUpperCase()}${missionType.substring(1)}`

    rpcClient?.setActivity({
        state: `${formattedMissionType} in ${details[2]}`,
        details: details[1],
        largeImageKey: details[0],
        largeImageText: details[1],
        smallImageKey: "peacock",
        smallImageText: "Using Peacock",
        startTimestamp:
            getFlag("discordRpAppTime") === true
                ? processStartTime
                : Math.round(Date.now() / 1000),
    })
}

type BrickDataMap = Record<string, [string, string, string]>

/**
 * Translates a scene path to a Discord RP asset and human-readable name.
 *
 * @param scenePath The scene path.
 * @param bricks The mission's loaded bricks.
 * @returns An array of the RP asset, human-readable name, and location human-readable name.
 */
export function scenePathToRpAsset(
    scenePath: string,
    bricks: string[],
): [string, string, string] | undefined {
    const brickAssetsMap = getConfig<BrickDataMap>(
        "DiscordRichAssetsForBricks",
        false,
    )

    for (const brick of bricks) {
        if (brickAssetsMap[brick.toLowerCase()]) {
            return brickAssetsMap[brick.toLowerCase()]!
        }
    }

    switch (scenePath.toLowerCase()) {
        // paris
        case "assembly:/_pro/scenes/missions/paris/_scene_paris.entity":
        case "assembly:/_pro/scenes/missions/paris/_scene_paris_torenia.entity":
        case "assembly:/_pro/scenes/missions/paris/_scene_fashionshowhit_01.entity":
        case "assembly:/_pro/scenes/missions/paris/_scene_tutorial_contractcreationparis.entity":
        case "assembly:/_pro/scenes/missions/paris/_scene_fashionshowhit_amd.entity":
            return ["parisshowstopper", "The Showstopper", "Paris"]
        case "assembly:/_pro/scenes/missions/paris/_scene_tequilasunrise_01.entity":
            return ["elusivetequilasunrise", "The Forger", "Paris"]
        case "assembly:/_pro/scenes/missions/paris/_scene_whiterussian_01.entity":
            return ["elusivewhiterussian", "The Identity Thief", "Paris"]

        // sapienza
        case "assembly:/_pro/scenes/missions/coastaltown/_scene_copperhead.entity":
        case "assembly:/_pro/scenes/missions/coastaltown/_scene_mission_copperhead.entity":
            return ["sapienzaicon", "The Icon", "Sapienza"]
        case "assembly:/_pro/scenes/missions/coastaltown/_scene_mamba.entity":
        case "assembly:/_pro/scenes/missions/coastaltown/_scene_mission_mamba.entity":
            return ["sapienzalandslide", "Landslide", "Sapienza"]
        case "assembly:/_pro/scenes/missions/coastaltown/mission01.entity":
        case "assembly:/_pro/scenes/missions/coastaltown/_scene_octopus.entity":
            return ["sapienzaworldoftomorrow", "World of Tomorrow", "Sapienza"]
        case "assembly:/_pro/scenes/missions/coastaltown/scene_ebola.entity":
            return ["sapienzapzauthor", "The Author", "Sapienza"]

        // marrakesh
        case "assembly:/_pro/scenes/missions/marrakesh/_scene_mission_spider.entity":
        case "assembly:/_pro/scenes/missions/marrakesh/_scene_spider.entity":
            return ["marrakeshguildedcage", "A Gilded Cage", "Marrakesh"]
        case "assembly:/_pro/scenes/missions/marrakesh/_scene_mission_python.entity":
        case "assembly:/_pro/scenes/missions/marrakesh/_scene_python_hellebore.entity":
        case "assembly:/_pro/scenes/missions/marrakesh/_scene_python.entity":
            return ["marrakeshahbos", "A House Built On Sand", "Marrakesh"]

        // bangkok missions
        case "assembly:/_pro/scenes/missions/bangkok/_scene_mission_tiger.entity":
        case "assembly:/_pro/scenes/missions/bangkok/_scene_tiger.entity":
            return ["bangkokclub27", "Club 27", "Bangkok"]
        case "assembly:/_pro/scenes/missions/bangkok/scene_zika.entity":
            return ["bangkokpzsource", "The Source", "Bangkok"]

        // colorado missions
        case "assembly:/_pro/scenes/missions/colorado_2/_scene_bull.entity":
        case "assembly:/_pro/scenes/missions/colorado_2/_scene_mission_bull.entity":
            return ["coloradofreedomfighters", "Freedom Fighters", "Colorado"]
        case "assembly:/_pro/scenes/missions/colorado_2/scene_rabies.entity":
            return ["coloradopzvector", "The Vector", "Colorado"]

        // hokkaido missions
        case "assembly:/_pro/scenes/missions/hokkaido/_scene_mission_snowcrane.entity":
        case "assembly:/_pro/scenes/missions/hokkaido/_scene_snowcrane_tumbleweed.entity":
        case "assembly:/_pro/scenes/missions/hokkaido/_scene_snowcrane.entity":
            return ["hokkaidositusinvertus", "Situs Invertus", "Hokkaido"]
        case "assembly:/_pro/scenes/missions/hokkaido/scene_mamushi.entity":
            return [
                "hokkaidosnowfestival",
                "Hokkaido Snow Festival",
                "Hokkaido",
            ]
        case "assembly:/_pro/scenes/missions/hokkaido/_scene_flu.entity":
            return ["hokkaidopz", "Patient Zero", "Hokkaido"]

        // dartmoor
        case "assembly:/_pro/scenes/missions/ancestral/scene_bulldog.entity":
        case "assembly:/_pro/scenes/missions/ancestral/scene_bulldog_fern.entity":
            return ["dartmoordeathoffamily", "Death in the Family", "Dartmoor"]
        case "assembly:/_pro/scenes/missions/ancestral/scene_smoothsnake.entity":
            return ["dartmoorgardenshow", "Dartmoor Garden Show", "Dartmoor"]
        case "assembly:/_pro/scenes/missions/ancestral/scene_ancestral_vesper.entity":
            return ["elusivevesper", "The Procurers", "Dartmoor"]
        case "assembly:/_pro/scenes/missions/ancestral/scene_ancestral_harebell.entity":
            return ["harebell", "The Sloth Depletion", "Dartmoor"]
        case "assembly:/_pro/scenes/missions/ancestral/scene_hollyhock.entity":
            return ["hollyhock", "The Wrath Termination", "Dartmoor"]

        // columbia
        case "assembly:/_pro/scenes/missions/colombia/mission_millipede/scene_millipede.entity":
        case "assembly:/_pro/scenes/missions/colombia/scene_anaconda.entity":
            return [
                "santafortunaembraceserpent",
                "Embrace of the Serpent",
                "Santa Fortuna",
            ]
        case "assembly:/_pro/scenes/missions/colombia/scene_hippo.entity":
        case "assembly:/_pro/scenes/missions/colombia/scene_hippo_calluna.entity":
        case "assembly:/_pro/scenes/missions/colombia/scene_hippo_rafflesia.entity":
            return [
                "santafortunathreeheadedserpent",
                "Three-Headed Serpent",
                "Santa Fortuna",
            ]

        // berlin
        case "assembly:/_pro/scenes/missions/edgy/mission_fox/scene_radler.entity":
            return ["elusiveradler", "The Liability", "Berlin"]
        case "assembly:/_pro/scenes/missions/edgy/mission_fox/scene_fox_basic.entity":
        case "assembly:/_pro/scenes/missions/edgy/mission_fox/scene_fox_contractcreation.entity":
        case "assembly:/_pro/scenes/missions/edgy/mission_fox/scene_fox_cornflower.entity":
        case "assembly:/_pro/scenes/missions/edgy/mission_fox/scene_fox_nightphlox.entity":
        case "assembly:/_pro/scenes/missions/edgy/mission_fox/scene_fox_smilax.entity":
        case "assembly:/_pro/scenes/missions/edgy/mission_fox/scene_fox_smilax_level2.entity":
        case "assembly:/_pro/scenes/missions/edgy/mission_fox/scene_fox_smilax_level3.entity":
            return ["berlinapexpredator", "Apex Predator", "Berlin"]
        case "assembly:/_pro/scenes/missions/edgy/mission_fox/scene_grasssnake.entity":
            return ["berlinegghunt", "Berlin Egg Hunt", "Berlin"]
        case "assembly:/_pro/scenes/missions/edgy/mission_fox/scene_fox_tomorrowland.entity":
            return ["elusivetomorrowland", "The Drop", "Berlin"]
        case "assembly:/_pro/scenes/missions/edgy/mission_fox/scene_ambrosia.entity":
            return ["ambrosia", "The Lust Assignation", "Berlin"]

        // mendozer
        case "assembly:/_pro/scenes/missions/elegant/scene_llama_elusive_clerico.entity":
            return ["elusiveclerico", "The Heartbreaker", "Mendoza"]
        case "assembly:/_pro/scenes/missions/elegant/scene_llama_elusive_jockeyclub.entity":
            return ["elusivejockeyclub", "The Iconoclast", "Mendoza"]
        case "assembly:/_pro/scenes/missions/elegant/scene_llama.entity":
        case "assembly:/_pro/scenes/missions/elegant/scene_llama_jacaranda.entity":
        case "assembly:/_pro/scenes/missions/elegant/scene_whitedryas.entity":
        case "assembly:/_pro/scenes/missions/elegant/scene_whitedryas_level2.entity":
        case "assembly:/_pro/scenes/missions/elegant/scene_whitedryas_level3.entity":
            return ["mendozafarewell", "The Farewell", "Mendoza"]
        case "assembly:/_pro/scenes/missions/elegant/scene_frangipani.entity":
            return ["frangipani", "The Envy Contention", "Mendoza"]

        // dubai
        case "assembly:/_pro/scenes/missions/golden/mission_gecko/scene_gecko_angelica.entity":
        case "assembly:/_pro/scenes/missions/golden/mission_gecko/scene_gecko_basic.entity":
        case "assembly:/_pro/scenes/missions/golden/mission_gecko/scene_gecko_desertrose.entity":
        case "assembly:/_pro/scenes/missions/golden/mission_gecko/scene_gecko_lunaria.entity":
        case "assembly:/_pro/scenes/missions/golden/mission_gecko/scene_gecko_sinstest.entity":
        case "assembly:/_pro/scenes/missions/golden/mission_gecko/scene_gecko_sheepsorrel.entity":
            return ["dubaiontopoftheworld", "On Top Of The World", "Dubai"]
        case "assembly:/_pro/scenes/missions/golden/mission_gecko/scene_gibson.entity":
            return ["elusivegibson", "The Ascensionist", "Dubai"]

        // chongqing
        case "assembly:/_pro/scenes/missions/wet/scene_wet_makoyana.entity":
        case "assembly:/_pro/scenes/missions/wet/scene_rat_ginseng.entity":
        case "assembly:/_pro/scenes/missions/wet/scene_rat_basic.entity":
        case "assembly:/_pro/scenes/missions/wet/scene_magnolia.entity":
            return ["chongqingendofanera", "End Of An Era", "Chongqing"]
        case "assembly:/_pro/scenes/missions/wet/scene_rat_elusive_redsnapper.entity":
            return ["elusiveredsnapper", "The Rage", "Chongqing"]
        case "assembly:/_pro/scenes/missions/wet/scene_wet_azalea.entity":
            return ["azalea", "The Gluttony Gobble", "Chongqing"]

        // training
        case "assembly:/_pro/scenes/missions/thefacility/_scene_polarbear_005.entity":
        case "assembly:/_pro/scenes/missions/thefacility/_scene_mission_polarbear_002_for_escalation_.entity":
        case "assembly:/_pro/scenes/missions/thefacility/_scene_mission_polarbear_002_contracts_creation_tutorial.entity":
        case "assembly:/_pro/scenes/missions/thefacility/_scene_mission_polarbear_intro_firsttime.entity":
        case "assembly:/_pro/scenes/missions/thefacility/_scene_mission_polarbear_module_002.entity":
        case "assembly:/_pro/scenes/missions/thefacility/_scene_mission_polarbear_module_002_b.entity":
        case "assembly:/_pro/scenes/missions/thefacility/_scene_mission_polarbear_module_005.entity":
            return ["icafacilityfinaltest", "ICA Facility", "Greenland"]

        // new york
        case "assembly:/_pro/scenes/missions/greedy/mission_raccoon/scene_raccoon_basic.entity":
        case "assembly:/_pro/scenes/missions/greedy/mission_raccoon/scene_raccoon_basic_dandelion.entity":
            return ["newyorkgoldenhandshake", "Golden Handshake", "New York"]

        // haven
        case "assembly:/_pro/scenes/missions/opulent/mission_stingray/scene_stingray_basic.entity":
        case "assembly:/_pro/scenes/missions/opulent/mission_stingray/scene_stingray_arcticthyme.entity":
            return ["havenlastresort", "The Last Resort", "Haven"]

        // miami
        case "assembly:/_pro/scenes/missions/miami/scene_et_sambuca.entity":
            return ["elusivesambuca", "The Undying", "Miami"]
        case "assembly:/_pro/scenes/missions/miami/scene_flamingo.entity":
            return ["miamifinishline", "The Finish Line", "Miami"]
        case "assembly:/_pro/scenes/missions/miami/scene_cottonmouth.entity":
            return ["miamisilvertounge", "A Silver Tongue", "Miami"]

        // hawkes bay
        case "assembly:/_pro/scenes/missions/sheep/scene_adonis.entity":
            return ["elusiveadonis", "The Politician", "Hawke's Bay"]
        case "assembly:/_pro/scenes/missions/sheep/scene_sheep.entity":
            return ["hawkenightcall", "Nightcall", "Hawke's Bay"]
        case "assembly:/_pro/scenes/missions/sheep/scene_opuntia.entity":
            return ["opuntia", "Opuntia", "Hawke's Bay"]

        // sgail
        case "assembly:/_pro/scenes/missions/theark/scene_magpie.entity":
        case "assembly:/_pro/scenes/missions/theark/_scene_magpie_pansy.entity":
        case "assembly:/_pro/scenes/missions/theark/_scene_magpie_lotus.entity":
            return ["sgailarksociety", "The Ark Society", "Isle of Sgáil"]

        // whittleton
        case "assembly:/_pro/scenes/missions/skunk/scene_skunk.entity":
        case "assembly:/_pro/scenes/missions/skunk/mission_grasshopper/scene_grasshopper.entity":
            return ["whittletonanotherlife", "Another Life", "Whittleton Creek"]
        case "assembly:/_pro/scenes/missions/skunk/scene_gartersnake.entity":
            return ["whittletonbitterpill", "A Bitter Pill", "Whittleton Creek"]

        // mumbai
        case "assembly:/_pro/scenes/missions/mumbai/scene_mongoose.entity":
            return ["mumbaichasingghost", "Chasing A Ghost", "Mumbai"]
        case "assembly:/_pro/scenes/missions/mumbai/scene_kingcobra.entity":
            return ["mumbaikingcobra", "Illusions of Grandeur", "Mumbai"]

        // romania
        case "assembly:/_pro/scenes/missions/trapped/scene_bellflower.entity":
        case "assembly:/_pro/scenes/missions/trapped/scene_wolverine.entity":
            return ["romaniatile", "Untouchable", "Romania"]

        // ambrose
        case "assembly:/_pro/scenes/missions/rocky/scene_dugong.entity":
            return [
                "shadowsinthewater",
                "Shadows in the Water",
                "Ambrose Island",
            ]

        // sniper
        case "assembly:/_pro/scenes/missions/caged/mission_falcon/scene_falcon_sniper.entity":
            return ["sniper_siberia", "Crime and Punishment", "Siberia"]
        case "assembly:/_pro/scenes/missions/hawk/scene_hawk.entity":
            return ["austria", "The Last Yardbird", "Austria"]
        case "assembly:/_pro/scenes/missions/salty/mission_seagull/scene_seagull.entity":
            return ["hantuport", "The Pen and the Sword", "Hantu Port"]

        // snug
        case "assembly:/_pro/scenes/missions/snug/scene_vanilla.entity":
            return ["snug", "Safehouse", "Safehouse"]
    }

    return undefined
}
