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

import { existsSync, readdirSync, readFileSync } from "fs"
import { readdir, readFile, writeFile } from "fs/promises"
import * as atomically from "atomically"
import { join } from "path"
import * as dataGen from "./contracts/dataGen"
import {
    generateUserCentric,
    getSubLocationFromContract,
} from "./contracts/dataGen"
import type {
    Campaign,
    ClientToServerEvent,
    CompiledChallengeRuntimeData,
    ContractSession,
    GameVersion,
    GenSingleMissionFunc,
    GenSingleVideoFunc,
    IHit,
    MissionManifest,
    PeacockLocationsData,
    PlayNextGetCampaignsHookReturn,
    RegistryChallenge,
    RequestWithJwt,
    S2CEventWithTimestamp,
    SMFLastDeploy,
    Unlockable,
    UserCentricContract,
} from "./types/types"
import type * as configManagerType from "./configSwizzleManager"
import {
    configs,
    getConfig,
    getSwizzleable,
    getVersionedConfig,
    swizzle,
} from "./configSwizzleManager"
import * as logging from "./loggingInterop"
import { log, LogLevel } from "./loggingInterop"
import * as axios from "axios"
import * as ini from "js-ini"
import * as statemachineParser from "@peacockproject/statemachine-parser"
import * as utils from "./utils"
import {
    addDashesToPublicId,
    fastClone,
    getRemoteService,
    hitmapsUrl,
} from "./utils"
import * as sessionSerialization from "./sessionSerialization"
import * as databaseHandler from "./databaseHandler"
import * as playnext from "./menus/playnext"
import * as hooksImpl from "./hooksImpl"
import { AsyncSeriesHook, SyncBailHook, SyncHook } from "./hooksImpl"
import * as hitsCategoryServiceMod from "./contracts/hitsCategoryService"
import { MenuSystemDatabase, menuSystemDatabase } from "./menus/menuSystem"
import { escalationMappings } from "./contracts/escalationMappings"
import { parse } from "json5"
import { userAuths } from "./officialServerAuth"
// @ts-expect-error Ignore JSON import
import LASTYARDBIRDSCPC from "../contractdata/SNIPER/THELASTYARDBIRD_SCPC.json"
// @ts-expect-error Ignore JSON import
import LEGACYFF from "../contractdata/COLORADO/FREEDOMFIGHTERSLEGACY.json"
import { missionsInLocations } from "./contracts/missionsInLocation"
import { createContext, Script } from "vm"
import { ChallengeService } from "./candle/challengeService"
import { getFlag } from "./flags"
import { unpack } from "msgpackr"
import { ChallengePackage, SavedChallengeGroup } from "./types/challenges"
import { promisify } from "util"
import { brotliDecompress } from "zlib"
import assert from "assert"
import { Response } from "express"
import { MissionEndRequestQuery } from "./types/gameSchemas"
import { ChallengeFilterType } from "./candle/challengeHelpers"
import { MasteryService } from "./candle/masteryService"
import { MasteryPackage } from "./types/mastery"
import { ProgressionService } from "./candle/progressionService"

/**
 * An array of string arrays that contains the IDs of the featured contracts.
 * Each of the string arrays is one page.
 */
export const featuredContractGroups: string[][] = [
    [
        "6275f476-b90a-4f79-abf3-bf30af020ad8",
        "ee0411d6-b3e7-4320-b56b-25c45d8a9d61",
        "a03285bd-7342-4262-b118-df485b5e99a9",
        "35547610-b036-4025-84f8-18a5db125ea4",
        "2c9b146a-cad6-48e0-a0d2-55eb7e58dbf7",
        "2b61a384-b3f7-42cb-b850-4cac06e2eef1",
        "ecb3e3b9-af4e-40e5-b7d7-9da54715a959",
        "89936bfe-673c-4b35-9404-72d809620f43",
        "1447a96c-73bd-4811-9c2e-5588885e36d7",
    ],
    [
        "ae25aaf1-53c4-4d4d-80b9-609ea09aa8a9",
        "9272bab9-3322-45c3-bb56-695f9923e27e",
        "cdc9e2ac-ae52-4ad8-bc85-929c886e4965",
        "19b1daaf-a472-4cee-9670-304cd62a3307",
        "57c854f1-92c2-4429-90cb-ebc27cd0f912",
        "9582fda8-d4c3-4464-955a-497365740ec2",
    ],
    [
        "7e1e00a0-5e12-4115-bcdb-ddbff1eaa9d1",
        "6ccce0de-7143-4099-af97-cf9838073f6b",
        "0db2289d-9035-4c77-a618-d196c4ca4f5c",
        "7a03a97d-238c-48bd-bda0-e5f279569ccf",
        "e1795c6a-5728-4bc5-bd71-248bc0071b44",
        "608830ec-01f2-4606-a904-8acd95f7e112",
        "4d049c4d-581f-4080-a600-8f1b38937256",
        "2d26476a-aad3-4a75-b2cd-afaf037876b7",
        "3b15b095-c278-4633-bb60-9939ce995a2c",
        "cee4716f-62a5-4290-a5d3-cf7764bf7b4b",
        "1d33dad8-2d70-4cc6-a1d1-e56c6a9c548c",
        "1ffb2af4-97c0-446a-add9-2565a358d862",
        "de89370c-105a-46f7-862f-64c330f28ee9",
        "1564ba59-58a8-4d20-b73d-63aca3254fa2",
        "f9c0cc2c-d779-4641-a011-a39734349058",
    ],
    [
        "5e546c0a-a407-4a17-a226-6cc4674fe987",
        "9b4636e3-2a6f-4bce-80e1-e3a5f79972b3",
        "fd3d8751-6298-4a11-9b29-e1bc01c8e08c",
        "d963e11c-7f49-49c9-a011-8d5d22c0216d",
        "8484edb5-65a2-4c12-9966-16eee599ee63",
    ],
    [
        "400562ab-e093-4d42-adb1-3e6fd5dfe99c",
        "8eed22a6-5bce-4dae-b9ac-5b539acf302e",
        "5b88babb-d565-4bee-95ec-4d434d49333f",
        "411b6f6a-a0ac-4ac8-9f9a-dd2c4c273180",
        "f4a096de-8783-4d97-862e-9db4d032150d",
        "0b37ea64-f9aa-464f-8cfc-252b58b52e41",
        "a6d3dc63-9d95-4030-ae90-5f7efce19473",
        "13d41ab3-4774-4caa-87d1-8d6d31df0423",
        "fb5cd917-0b3a-464b-8489-8e1f4cc824f9",
        "4d3a51a8-9cc0-4081-a53e-d1d21c8dbbe8",
    ],
    [
        "c99273cd-7c1f-4a1c-9b07-e3ceef5ec4cc",
        "ffd1a594-a3ce-4ee2-95bc-a976c3ee8b46",
        "857152eb-29ab-419b-946e-f6124a96b34d",
        "ee0485a3-fead-4a03-8f6a-06d98da31809",
        "028756e3-f911-4e30-bcda-2e3fa12cd427",
        "418be72d-89b7-480f-a1ab-3efa88e51cec",
    ],
    [
        "72d51ef4-3cbd-48ce-9c5a-6502e3313be6",
        "0244490f-df02-4923-85cb-bafbac351842",
        "48404607-6f03-4942-9068-7fab4e164dfe",
        "abc4866f-0837-4708-9ac5-0f5a7a6ca0f6",
        "bdd6b3dc-f8ae-44cd-8c80-44e018362553",
        "15cbf4c7-64ab-4dcb-b00d-afab433fe658",
        "9256f129-4407-4859-8b4d-690026e12b9c",
        "ab65c0b5-c7da-47aa-82a1-5033126ec18c",
        "982e023a-5b97-49af-a2e0-91c640dd874b",
    ],
    [
        "46729d34-489e-4cb1-89f8-30bb1d0df9d1",
        "b475edbd-50ba-46e5-8c73-78a094129bb6",
        "1ead714f-9bce-4736-b9cc-3dd5ce75c491",
    ],
    [
        "f0c1c9e9-f9e1-445b-9611-61546d2aea69",
        "94836810-aa7b-4472-9ed4-73806c2f303d",
        "1b2b32ae-798e-4ccc-b353-c3d1c8475faa",
        "8ba7ffda-7e62-4341-bca3-65b16f2ee6af",
        "55eb16e8-91a2-48f4-a6f6-141229d220d2",
        "f8e2aa93-15ca-4a88-b5b7-02f9a712b057",
        "1878154a-8e23-4fce-908e-cfe26fb67a29",
        "717aed54-8685-4901-b7bf-118b9780fa36",
        "ecbd78f6-bc65-4f19-934f-f2bb5adced6d",
        "001b058d-dea6-42c7-86de-c625a6f87c75",
    ],
]

const peacockRequireTable = {
    "@peacockproject/core/contracts/dataGen": { __esModule: true, ...dataGen },
    "@peacockproject/core/databaseHandler": {
        __esModule: true,
        ...databaseHandler,
    },
    "@peacockproject/core/utils": {
        __esModule: true,
        ...utils,
    },
    "@peacockproject/core/loggingInterop": { __esModule: true, ...logging },
    "@peacockproject/core/sessionSerialization": {
        __esModule: true,
        ...sessionSerialization,
    },
    "@peacockproject/statemachine-parser": statemachineParser,
    "@peacockproject/core/menus/playnext": {
        __esModule: true,
        ...playnext,
    },
    "@peacockproject/core/hooksImpl": {
        __esModule: true,
        ...hooksImpl,
    },
    "@peacockproject/core/contracts/hitsCategoryService": {
        __esModule: true,
        hitsCategoryService: hitsCategoryServiceMod,
    },
    "@peacockproject/core/menus/menuSystem": {
        __esModule: true,
        MenuSystemDatabase,
        menuSystemDatabase,
    },
    axios,
    ini,
    atomically,
}

/**
 * A binding of the virtual require function that displays the problematic plugin's name.
 *
 * @param pluginName The problematic plugin's name.
 */
function createPeacockRequire(pluginName: string): NodeRequire {
    /**
     * A virtual require function for plugins.
     *
     * @param specifier The requested module.
     */
    const peacockRequire: NodeRequire = (specifier: string) => {
        if (
            Object.prototype.hasOwnProperty.call(peacockRequireTable, specifier)
        ) {
            return peacockRequireTable[specifier]
        }

        try {
            return require(specifier)
        } catch (e) {
            log(LogLevel.ERROR, `PRMR: Unable to load ${specifier}.`)
            log(
                LogLevel.ERROR,
                `This is a problem with ${pluginName} - please let the author know.`,
            )
            throw e
        }
    }

    peacockRequire.resolve = require.resolve
    peacockRequire.cache = require.cache
    // Yes, we assert that the literal null keyword is not null here.
    // This is an awful idea in any scenario, except for this one, in which we
    // control module resolution, and don't need plugins to view/modify either
    // of these properties.
    // In short, it's either this, or ts-expect-error. -rdil, Jul 1 2022
    // noinspection JSDeprecatedSymbols
    peacockRequire.extensions = null!
    peacockRequire.main = null!

    return peacockRequire
}

/**
 * Freedom Fighters for Hitman 2016 (objectives are different).
 */
export const _legacyBull: MissionManifest = JSON.parse(LEGACYFF)

export const _theLastYardbirdScpc: MissionManifest =
    JSON.parse(LASTYARDBIRDSCPC)

export const peacockRecentEscalations: readonly string[] = [
    "35f1f534-ae2d-42be-8472-dd55e96625ea",
    "edbacf4b-e402-4548-b723-cd4351571537",
    "218302a3-f682-46f9-9ffd-bb3e82487b7c",
    "9a461f89-86c5-44e4-998e-f2f66b496aa7",
]

/**
 * Ensure a mission has the bare minimum required to work.
 *
 * @param m The mission manifest.
 * @returns If the mission is valid.
 */
export const validateMission = (m: MissionManifest): boolean => {
    if (!m.Metadata || !m.Data) {
        return false
    }

    for (const prop of ["Id", "Title", "Location", "ScenePath"]) {
        if (!Object.prototype.hasOwnProperty.call(m.Metadata, prop)) {
            log(LogLevel.ERROR, `Contract missing property Metadata.${prop}!`)
            return false
        }
    }

    for (const prop of ["Objectives", "Bricks"]) {
        if (!Object.prototype.hasOwnProperty.call(m.Data, prop)) {
            log(LogLevel.ERROR, `Contract missing property Data.${prop}!`)
            return false
        }

        if (!Array.isArray(m.Data[prop])) {
            log(
                LogLevel.ERROR,
                `Contract property Data.${prop} should be an array (found ${typeof prop})`,
            )
            return false
        }
    }

    return true
}

const modFrameworkDataPath: string | false =
    (process.env.LOCALAPPDATA &&
        join(
            process.env.LOCALAPPDATA,
            "Simple Mod Framework",
            "lastDeploy.json",
        )) ||
    false

export class Controller {
    public hooks: {
        serverStart: SyncHook<[]>
        challengesLoaded: SyncHook<[]>
        masteryDataLoaded: SyncHook<[]>
        newEvent: SyncHook<
            [
                /** event */ ClientToServerEvent,
                /** request */ RequestWithJwt,
                /** session */ ContractSession,
            ]
        >
        newMetricsEvent: SyncHook<
            [
                /** event */ S2CEventWithTimestamp,
                /** request */ RequestWithJwt<never, S2CEventWithTimestamp[]>,
            ]
        >
        getContractManifest: SyncBailHook<
            // prettier-ignore
            [
                /** contractId */ string
            ],
            MissionManifest | undefined
        >
        contributeCampaigns: SyncHook<
            [
                /** campaigns */ Campaign[],
                /** genSingleMissionFunc */ GenSingleMissionFunc,
                /** genSingleVideoFunc */ GenSingleVideoFunc,
                /** gameVersion */ GameVersion,
            ]
        >
        // prettier-ignore
        getSearchResults: AsyncSeriesHook<[
            /** query */ string[],
            /** contractIds */ string[]
        ]>
        getNextCampaignMission: SyncBailHook<
            // prettier-ignore
            [
                /** contractId */ string,
                /** gameVersion */ GameVersion
            ],
            PlayNextGetCampaignsHookReturn | undefined
        >
        getMissionEnd: SyncBailHook<
            [
                /** req */ RequestWithJwt<MissionEndRequestQuery>,
                /** res */ Response,
            ],
            boolean
        >
    }
    public escalationMappings = escalationMappings
    public configManager: typeof configManagerType = {
        getConfig,
        configs,
        getSwizzleable,
        getVersionedConfig,
        swizzle,
    }
    public missionsInLocations = missionsInLocations
    /**
     * Note: if you are adding a contract, please use {@link addMission}!
     */
    public contracts: Map<string, MissionManifest> = new Map()

    // Converts a contract's ID to public ID.
    public contractIdToPublicId: Map<string, string> = new Map()

    public challengeService: ChallengeService
    public masteryService: MasteryService
    public progressionService: ProgressionService
    /**
     * A list of Simple Mod Framework mods installed.
     */
    public readonly installedMods: readonly string[]
    private _pubIdToContractId: Map<string, string> = new Map()
    private _internalContracts: MissionManifest[]
    /** Internal elusive target contracts - only accessible during bootstrap. */
    private _internalElusives: MissionManifest[] | undefined

    /**
     * The constructor.
     */
    public constructor() {
        this.hooks = {
            serverStart: new SyncHook(),
            challengesLoaded: new SyncHook(),
            masteryDataLoaded: new SyncHook(),
            newEvent: new SyncHook(),
            newMetricsEvent: new SyncHook(),
            getContractManifest: new SyncBailHook(),
            contributeCampaigns: new SyncHook(),
            getSearchResults: new AsyncSeriesHook(),
            getNextCampaignMission: new SyncBailHook(),
            getMissionEnd: new SyncBailHook(),
        }

        if (modFrameworkDataPath && existsSync(modFrameworkDataPath)) {
            this.installedMods = (
                parse(
                    readFileSync(modFrameworkDataPath!).toString(),
                ) as SMFLastDeploy
            )?.loadOrder as readonly string[]
            return
        }

        this.installedMods = []
    }

    /**
     * You should use {@link modIsInstalled} instead!
     *
     * Returns whether a mod is UNAVAILABLE.
     *
     * @param modId The mod's ID.
     * @returns If the mod is unavailable. You should probably abort initialization if true is returned. Also returns true if the `overrideFrameworkChecks` flag is set.
     * @deprecated since v5.5.0
     */
    public addClientSideModDependency(modId: string): boolean {
        return (
            !this.installedMods.includes(modId) ||
            getFlag("overrideFrameworkChecks") === true
        )
    }

    /**
     * Returns whether a mod is available and installed.
     *
     * @param modId The mod's ID.
     * @returns If the mod is available (or the `overrideFrameworkChecks` flag is set). You should probably abort initialisation if false is returned.
     */
    public modIsInstalled(modId: string): boolean {
        return (
            this.installedMods.includes(modId) ||
            getFlag("overrideFrameworkChecks") === true
        )
    }

    /**
     * Starts the service and loads in all contracts.
     *
     * @throws {Error} If all hope is lost. (In theory, this should never happen)
     */
    async boot(pluginDevHost: boolean): Promise<void> {
        // this should never actually be hit, but it makes IntelliJ not
        // complain that it's unused, so...
        if (!this.configManager) {
            throw new Error("All hope is lost.")
        }

        log(
            LogLevel.INFO,
            "Booting Peacock internal services - this may take a moment.",
        )

        await this._loadInternalContracts()

        this.challengeService = new ChallengeService(this)
        this.masteryService = new MasteryService()
        this.progressionService = new ProgressionService()

        this._addElusiveTargets()
        this.index()

        if (modFrameworkDataPath && existsSync(modFrameworkDataPath)) {
            log(
                LogLevel.INFO,
                "Simple Mod Framework installed - using the data it outputs.",
            )

            const lastServerSideData = (
                parse(
                    readFileSync(modFrameworkDataPath!).toString(),
                ) as SMFLastDeploy
            ).lastServerSideStates

            if (lastServerSideData?.unlockables) {
                this.configManager.configs["allunlockables"] =
                    lastServerSideData.unlockables.slice(1)
            }

            if (lastServerSideData?.contracts) {
                for (const [contractId, contractData] of Object.entries(
                    lastServerSideData.contracts,
                )) {
                    this.contracts.set(contractId, contractData)
                }
            }

            if (lastServerSideData?.blobs) {
                menuSystemDatabase.hooks.getConfig.tap(
                    "SMFBlobs",
                    (name, gameVersion) => {
                        if (
                            gameVersion === "h3" &&
                            (lastServerSideData.blobs[name] ||
                                lastServerSideData.blobs[name.slice(1)]) // leading slash is not included in SMF blobs
                        ) {
                            return parse(
                                readFileSync(
                                    join(
                                        process.env.LOCALAPPDATA,
                                        "Simple Mod Framework",
                                        "blobs",
                                        lastServerSideData.blobs[name] ||
                                            lastServerSideData.blobs[
                                                name.slice(1)
                                            ],
                                    ),
                                ).toString(),
                            )
                        }
                    },
                )
            }
        }

        await this._loadPlugins()

        if (pluginDevHost) {
            await this._loadWorkspacePlugins()
        }

        this.hooks.serverStart.call()

        try {
            await this._loadResources()

            this.hooks.challengesLoaded.call()
            this.hooks.masteryDataLoaded.call()
        } catch (e) {
            log(LogLevel.ERROR, `Fatal error with challenge bootstrap: ${e}`)
            log(LogLevel.ERROR, e.stack)
        }
    }

    /**
     * Gets a contract from the registry by its public ID,
     * or downloads it from the official servers if possible.
     *
     * @param pubId The contract's public ID.
     * @param currentUserId The current user's ID.
     * @param gameVersion The current game version.
     * @returns The mission manifest or null if it couldn't be resolved.
     */
    public async contractByPubId(
        pubId: string,
        currentUserId: string,
        gameVersion: GameVersion,
    ): Promise<MissionManifest | undefined> {
        if (!this._pubIdToContractId.has(pubId)) {
            return await this.downloadContract(
                currentUserId,
                pubId,
                gameVersion,
            )
        }

        if (this.contracts.has(this._pubIdToContractId.get(pubId)!)) {
            return (
                this.contracts.get(this._pubIdToContractId.get(pubId)!) ||
                undefined
            )
        }

        return undefined
    }

    /**
     * Saves a new contract to the contracts folder, and makes it resolve properly,
     * without triggering a hot module reload.
     *
     * @param manifest The contract's data (mission manifest, a.k.a. mission JSON).
     * @return The manifest that got passed, in case you want to use chaining.
     */
    public async commitNewContract(
        manifest: MissionManifest,
    ): Promise<MissionManifest> {
        const j = JSON.stringify(manifest, undefined, 4)

        log(
            LogLevel.INFO,
            `Saving generated contract ${manifest.Metadata.Id} to contracts/${manifest.Metadata.PublicId}.json`,
        )

        const name = `contracts/${manifest.Metadata.PublicId}.json`

        await writeFile(name, j)

        this.index()
        return manifest
    }

    /**
     * Get a contract by its ID.
     *
     * Order of precedence:
     * 1. Plugins ({@link addMission} or the `getMissionManifest` hook)
     * 2. Peacock internal contracts storage
     * 3. Files in the `contracts` folder.
     *
     * @param id The contract's ID.
     * @returns The mission manifest object, or undefined if it wasn't found.
     */
    public resolveContract(id: string): MissionManifest | undefined {
        if (!id) {
            return undefined
        }
        const optionalPluginJson = this.hooks.getContractManifest.call(id)

        if (optionalPluginJson) {
            return fastClone(optionalPluginJson)
        }

        const registryJson = this._internalContracts.find(
            (j) => j.Metadata.Id === id,
        )

        if (registryJson) {
            const dereferenced: MissionManifest = fastClone(registryJson)

            if (registryJson.Metadata.Type === "elusive") {
                dereferenced.Metadata.Type = "mission"
                return dereferenced
            }

            return dereferenced
        }

        const openCtJson = this.contracts.has(id)
            ? this.contracts.get(id)
            : undefined

        if (openCtJson) {
            return fastClone(openCtJson)
        }
        return undefined
    }

    /**
     * Adds the specified mission manifest as a mission.
     * It will be prioritized over all internal missions, escalations, and contracts.
     *
     * @param manifest The mission's manifest.
     */
    public addMission(manifest: MissionManifest): void {
        if (!validateMission(manifest)) {
            return
        }

        this.hooks.getContractManifest.tap(
            `RegisterContract: ${manifest.Metadata.Id}`,
            (id) => {
                if (id === manifest.Metadata.Id) {
                    return manifest
                }

                return undefined
            },
        )
    }

    /**
     * Adds an escalation to the game.
     *
     * @param groupId The escalation group ID. All levels must have the `Metadata.InGroup` value set to this!
     * @param locationId The location of the escalation's ID.
     * @param levels The escalation's levels.
     */
    public addEscalation(
        groupId: string,
        locationId: string,
        ...levels: MissionManifest[]
    ): void {
        const fixedLevels = [...levels].filter(Boolean)

        fixedLevels.forEach((level) => this.addMission(level))

        if (!this.missionsInLocations.escalations[locationId]) {
            this.missionsInLocations.escalations[locationId] = []
        }

        this.missionsInLocations.escalations[locationId].push(groupId)

        const escalationGroup = {}

        let i = 0

        while (i + 1 <= fixedLevels.length) {
            escalationGroup[i + 1] = fixedLevels[i].Metadata.Id
            i++
        }

        this.escalationMappings[groupId] = escalationGroup
    }

    /**
     * Downloads a contract from the IOI servers.
     *
     * @param userId The current user's ID.
     * @param pubId The public ID (numeric ID) of the contract.
     * @param gameVersion The game version (IOI's servers are version-dependent).
     */
    public async downloadContract(
        userId: string,
        pubId: string,
        gameVersion: GameVersion,
    ): Promise<MissionManifest | undefined> {
        log(
            LogLevel.DEBUG,
            `User ${userId} is downloading contract ${pubId}...`,
        )

        let contractData: MissionManifest | undefined = undefined

        if (
            gameVersion === "h3" &&
            getFlag("legacyContractDownloader") !== true
        ) {
            const result = await Controller._hitmapsFetchContract(pubId)

            if (result) {
                contractData = result
            } else {
                log(
                    LogLevel.WARN,
                    `Failed to download from HITMAP servers. Trying official servers instead...`,
                )
            }
        }

        if (!contractData) {
            contractData = await Controller._officialFetchContract(
                pubId,
                gameVersion,
                userId,
            )
        }

        if (!contractData) {
            log(LogLevel.ERROR, `No contract data for ${pubId}.`)
            return undefined
        }

        contractData.Metadata.CreatorUserId =
            "fadb923c-e6bb-4283-a537-eb4d1150262e"

        await writeFile(
            `contracts/${pubId}.json`,
            JSON.stringify(contractData, undefined, 4),
        )
        await this.commitNewContract(contractData)

        if (PEACOCK_DEV) {
            log(LogLevel.DEBUG, `Saved contract to contracts/${pubId}.json`)
        }

        return contractData
    }

    /**
     * Index all installed contract files (OCREs).
     *
     * @internal
     */
    index(): void {
        this.contracts.clear()
        this._pubIdToContractId.clear()

        const contracts = readdirSync("contracts")
        contracts.forEach((i) => {
            if (!isContractFile(i)) {
                return
            }

            try {
                const f = parse(
                    readFileSync(join("contracts", i)).toString(),
                ) as MissionManifest

                if (!validateMission(f)) {
                    log(LogLevel.ERROR, `Skipped loading ${i} due to an error!`)
                    return
                }

                this.contracts.set(f.Metadata.Id, f)
                if (f.Metadata.PublicId) {
                    this._pubIdToContractId.set(
                        f.Metadata.PublicId,
                        f.Metadata.Id,
                    )
                }
            } catch (e) {
                log(LogLevel.ERROR, `Failed to load contract ${i}!`)
                log(LogLevel.ERROR, e.stack)
            }
        })
    }

    /**
     * Perform late initialization.
     *
     * @internal
     */
    _addElusiveTargets(): void {
        if (getFlag("elusivesAreShown") === true) {
            this._internalContracts.push(
                ...this._internalElusives!.map((elusive) => {
                    const e = { ...elusive }

                    assert.ok(e.Data.Objectives, "no objectives on ET")

                    e.Data.Objectives = e.Data.Objectives.map(
                        (missionObjective) => {
                            if (
                                missionObjective.SuccessEvent?.EventName ===
                                "Kill"
                            ) {
                                missionObjective.IsHidden = false
                            }

                            return missionObjective
                        },
                    )

                    return e
                }),
            )
            this._internalElusives = undefined
            return
        }

        this._internalContracts.push(...this._internalElusives!)
        this._internalElusives = undefined
    }

    /**
     * Fetch a contract from HITMAPS.
     *
     * @param publicId The contract's public ID.
     * @internal
     */
    static async _hitmapsFetchContract(
        publicId: string,
    ): Promise<MissionManifest | undefined> {
        const id = addDashesToPublicId(publicId)

        type Response = {
            contract?: {
                Contract: MissionManifest
                Location: Unlockable
                UserCentricContract: UserCentricContract
            } | null
            ErrorReason?: string | null
        }

        const resp = await axios.default.get<Response>(hitmapsUrl, {
            params: {
                publicId: id,
            },
        })

        const fetchedData = resp.data
        const hasData = !!fetchedData?.contract?.Contract

        if (!hasData) {
            return undefined
        }

        return fetchedData!.contract!.Contract
    }

    private async _loadResources(): Promise<void> {
        // Load challenge resources
        const challengeDirectory = join(
            PEACOCK_DEV ? process.cwd() : __dirname,
            "resources",
            "challenges",
        )

        await this._handleResources(
            challengeDirectory,
            (data: ChallengePackage) => {
                this._handleChallengeResources(data)
            },
        )

        //Get all global challenges and register a simplified version of them
        {
            const globalChallenges: RegistryChallenge[] = (
                getConfig(
                    "GlobalChallenges",
                    true,
                ) as CompiledChallengeRuntimeData[]
            ).map((e) => {
                const tags = e.Challenge.Tags || []
                tags.push("global")

                //NOTE: Treat all other fields as undefined
                return <RegistryChallenge>{
                    Id: e.Challenge.Id,
                    Tags: tags,
                    Name: e.Challenge.Name,
                    ImageName: e.Challenge.ImageName,
                    Description: e.Challenge.Description,
                    Definition: e.Challenge.Definition,
                    Xp: e.Challenge.Xp,
                }
            })

            this._handleChallengeResources({
                groups: [
                    <SavedChallengeGroup>{
                        CategoryId: "global",
                        Challenges: globalChallenges,
                    },
                ],
                meta: {
                    Location: "GLOBAL",
                },
            })
        }

        // Load mastery resources
        const masteryDirectory = join(
            PEACOCK_DEV ? process.cwd() : __dirname,
            "resources",
            "mastery",
        )

        await this._handleResources(
            masteryDirectory,
            (data: MasteryPackage) => {
                this._handleMasteryResources(data)
            },
        )
    }

    private async _handleResources<T>(
        directory: string,
        handleDataCallback: (data: T) => void | Promise<void>,
    ): Promise<void> {
        const files = await readdir(directory)

        for (const file of files) {
            try {
                const fileBuffer = await readFile(join(directory, file))
                const data: T = unpack(fileBuffer)

                await handleDataCallback(data)
            } catch (e) {
                log(LogLevel.ERROR, `Aborting resource parsing. ${e}`)
            }
        }
    }

    private _handleChallengeResources(data: ChallengePackage): void {
        for (const group of data.groups) {
            if (
                [
                    "UI_MENU_PAGE_PROFILE_CHALLENGES_CATEGORY_ARCADE",
                    "UI_MENU_PAGE_PROFILE_CHALLENGES_CATEGORY_ESCALATION_HM1",
                    "UI_MENU_PAGE_PROFILE_CHALLENGES_CATEGORY_ESCALATION_HM2",
                ].includes(group.Name)
            ) {
                continue
            }

            this.challengeService.registerGroup(group, data.meta.Location)

            for (const challenge of group.Challenges) {
                this.challengeService.registerChallenge(
                    challenge,
                    group.CategoryId,
                    data.meta.Location,
                )
            }
        }
    }

    private _handleMasteryResources(data: MasteryPackage): void {
        this.masteryService.registerMasteryData(data)
    }

    /**
     * Fetch a contract from the official servers.
     *
     * @param publicId The contract's public ID.
     * @param gameVersion The game's version.
     * @param userId The user's ID.
     * @internal
     * @private
     */
    private static async _officialFetchContract(
        publicId: string,
        gameVersion: GameVersion,
        userId: string,
    ): Promise<MissionManifest | undefined> {
        const remoteService = getRemoteService(gameVersion)

        const user = userAuths.get(userId)

        if (!user) {
            log(LogLevel.WARN, `No authentication for user ${userId}!`)
            return undefined
        }

        const resp = await user._useService<{
            data?: { Contract?: MissionManifest }
        }>(
            `https://${remoteService}.hitman.io/profiles/page/LookupContractPublicId?publicid=${publicId}`,
            true,
        )

        const contractData: MissionManifest | undefined =
            resp.data.data?.Contract

        return contractData || undefined
    }

    /**
     * Loads all normal, pre-built or pure JS plugins either from root or plugins folder.
     *
     * @internal
     */
    private async _loadPlugins(): Promise<void> {
        if (existsSync("plugins")) {
            const entries = (
                await readdir(join(process.cwd(), "plugins"))
            ).filter((n) => isPlugin(n, "js") || isPlugin(n, "cjs"))

            for (const plugin of entries) {
                const sourceFile = join(process.cwd(), "plugins", plugin)
                const src = (await readFile(sourceFile)).toString()

                await this._executePlugin(plugin, src, sourceFile)
            }
        }
        const entries = (await readdir(process.cwd())).filter(
            (n) => isPlugin(n, "js") || isPlugin(n, "cjs"),
        )

        for (const plugin of entries) {
            const src = (await readFile(plugin)).toString()

            await this._executePlugin(plugin, src, join(process.cwd(), plugin))
        }
    }

    private async _loadWorkspacePlugins(): Promise<void> {
        const entries = (await readdir(join(process.cwd(), "plugins"))).filter(
            (n) => isPlugin(n, "ts") || isPlugin(n, "cts"),
        )

        const esbuild = await import("esbuild-wasm")
        const { transform } = esbuild

        for (const plugin of entries) {
            const sourceFile = join(process.cwd(), "plugins", plugin)
            const raw = (await readFile(sourceFile)).toString()

            const builtPlugin = await transform(raw, {
                loader: "ts",
                sourcemap: "inline",
                sourcefile: sourceFile,
                target: "node18",
                format: "cjs",
            })

            await this._executePlugin(plugin, builtPlugin.code, sourceFile)
        }
    }

    private async _executePlugin(
        pluginName: string,
        pluginContents: string,
        pluginPath: string,
    ): Promise<void> {
        const context = createContext({
            module: { exports: {} },
            exports: {},
            process,
            require: createPeacockRequire(pluginName),
        })

        let theExports

        try {
            // eslint-disable-next-line prefer-const
            theExports = new Script(pluginContents, {
                filename: pluginPath,
            }).runInContext(context)
        } catch (e) {
            log(
                LogLevel.ERROR,
                `Error while attempting to queue plugin ${pluginName} for loading!`,
            )
            log(LogLevel.ERROR, e)
            log(LogLevel.ERROR, e.stack)
            return
        }

        try {
            let plugin = theExports

            if (theExports.__esModule) {
                // the plugin thinks it's an ES module (incorrectly, as it's in
                // a CommonJS environment, meaning the plugin was likely written
                // as a module, and then compiled by a tool), so the actual
                // function will likely be on the 'default' property
                plugin = theExports.default ?? theExports
            }

            await (plugin as (controller: Controller) => Promise<void>)(this)
        } catch (e) {
            log(LogLevel.ERROR, `Error while evaluating plugin ${pluginName}!`)
            log(LogLevel.ERROR, e)
            log(LogLevel.ERROR, e.stack)
        }
    }

    private async _loadInternalContracts(): Promise<void> {
        const decompress = promisify(brotliDecompress)

        const buf = await readFile(
            join(
                PEACOCK_DEV ? process.cwd() : __dirname,
                "resources",
                "contracts.br",
            ),
        )

        const decompressed = JSON.parse((await decompress(buf)).toString()) as {
            b: MissionManifest[]
            el: MissionManifest[]
        }

        this._internalContracts = decompressed.b
        this._internalElusives = decompressed.el
    }

    public storeIdToPublicId(contracts: UserCentricContract[]): void {
        contracts.forEach((c) =>
            controller.contractIdToPublicId.set(
                c.Contract.Metadata.Id,
                c.Contract.Metadata.PublicId,
            ),
        )
    }
}

/**
 * Returns if the specified file is a OpenContracts contract file.
 *
 * @param name The file's name.
 * @returns If the specified file is an OCRE.
 */
export function isContractFile(name: string): boolean {
    return name.endsWith(".ocre") || name.endsWith(".json")
}

/**
 * Returns if the specified file is a Peacock plugin file.
 *
 * @param name The file's name.
 * @param extension The target file extension.
 * @returns If the specified file is a plugin.
 */
export function isPlugin(name: string, extension: string): boolean {
    return (
        name.endsWith(`.plugin.${extension}`) ||
        // ends with Plugin.js, but isn't just Plugin.js
        name.endsWith(`Plugin.${extension}`)
    )
}

/**
 * Returns if the specified repository ID is a suit.
 *
 * @param repoId The repository ID.
 * @param gameVersion The game version.
 * @returns If the repository ID points to a suit.
 */
export function isSuit(repoId: string, gameVersion: GameVersion): boolean {
    const suitsToTypeMap = new Map<string, string>()

    ;(getVersionedConfig("allunlockables", gameVersion, false) as Unlockable[])
        .filter((unlockable) => unlockable.Type === "disguise")
        .forEach((u) =>
            suitsToTypeMap.set(u.Properties.RepositoryId, u.Subtype),
        )

    return suitsToTypeMap.has(repoId)
        ? suitsToTypeMap.get(repoId) !== "disguise"
        : false
}

/**
 * Translates a contract ID to a "hit" object.
 *
 * @param contractId The contract's ID.
 * @param gameVersion The game's version.
 * @param userId The current user's ID.
 * @returns The hit object.
 */
export function contractIdToHitObject(
    contractId: string,
    gameVersion: GameVersion,
    userId: string,
): IHit | undefined {
    const contract = controller.resolveContract(contractId)

    if (!contract) {
        throw new Error(
            "Something went terribly wrong. Please investigate this or inform rdil.",
        )
    }

    if (
        gameVersion === "h1" &&
        contract.Metadata.Location.includes("LOCATION_ICA_FACILITY")
    ) {
        contract.Metadata.Location = "LOCATION_ICA_FACILITY"
    }

    const subLocation = getSubLocationFromContract(contract, gameVersion)

    const parentLocation = getVersionedConfig<PeacockLocationsData>(
        "LocationsData",
        gameVersion,
        false,
    ).parents[subLocation?.Properties?.ParentLocation]

    // failed to find the location, must be from a newer game
    if (!subLocation && (gameVersion === "h1" || gameVersion === "h2")) {
        log(
            LogLevel.DEBUG,
            `${contract.Metadata.Location} looks to be from a newer game, skipping (hitObj)!`,
        )
        return undefined
    }

    const userCentric = generateUserCentric(contract, userId, gameVersion)

    if (!userCentric) {
        log(LogLevel.ERROR, "No UC due to previous error?")
        return undefined
    }

    const challenges = controller.challengeService.getGroupedChallengeLists(
        {
            type: ChallengeFilterType.None,
        },
        parentLocation?.Id,
    )

    const challengeCompletion =
        controller.challengeService.countTotalNCompletedChallenges(
            challenges,
            userId,
            gameVersion,
        )

    return {
        Id: contract.Metadata.Id,
        UserCentricContract: userCentric,
        Location: parentLocation,
        SubLocation: subLocation,
        ChallengesCompleted: challengeCompletion.CompletedChallengesCount,
        ChallengesTotal: challengeCompletion.ChallengesCount,
        LocationLevel: 1,
        LocationMaxLevel: 1,
        LocationCompletion: 0,
        LocationXPLeft: 6000,
        LocationHideProgression: false,
    }
}

/**
 * Sends an array of publicIds to the contract preservation backend.
 * @param publicIds The contract publicIds to send.
 */
export async function preserveContracts(publicIds: string[]): Promise<void> {
    for (const id of publicIds) {
        await axios.default.get<Response>(hitmapsUrl, {
            params: {
                publicId: addDashesToPublicId(id),
            },
        })
    }
}

export const controller = new Controller()
