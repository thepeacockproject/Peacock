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

import { Controller } from "./controller"
import { existsSync, readdirSync, readFileSync } from "fs"
import { getFlag } from "./flags"
import { log, LogLevel } from "./loggingInterop"
import { Campaign, GameVersion, JwtData, MissionManifest } from "./types/types"
import path, { basename, join } from "path"
import { readFile } from "fs/promises"
import { satisfies } from "semver"
import md5File from "md5-file"

export interface Game {
    version: "h1" | "h2" | "h3"
    platform: "steam" | "epic" | "microsoft" | "gog"
    hash: string
    path: string
}

export interface ServerSideData {
    unlockables: string | null
    repository: string | null
    contracts: Record<string, string>
    worldMapMetadata: Record<string, string>
    storyConfig: string | null
    peacockPlugins: string[]
    dynamicResourcesDisabled: boolean
}

export interface DeploySummary {
    game: Game
    frameworkPath: string
    config: { deployOrder: string[] }
    modVersions: Record<string, string>
    serverSideData: ServerSideData
}

export interface Deployment {
    id: string
    path: string
    summary: DeploySummary
}

interface StoryConfigCampaign {
    Name: string
    Image: string
    Type: string
    Properties: Record<string, unknown>
    Subgroups?: StoryConfigCampaign[]
    StoryData: { Type: "Mission" | "Video"; Id: string }[]
}

export class SMFSupport {
    public readonly deployments: Deployment[] = []

    private userPlatforms: Record<string, [GameVersion, JwtData["platform"]]> =
        {}

    constructor(private readonly controller: Controller) {
        const dataPaths = SMFSupport.modFrameworkDataPaths

        if (dataPaths) {
            for (const dataPath of dataPaths) {
                if (!existsSync(dataPath)) continue

                for (const game of readdirSync(dataPath)) {
                    const path = join(dataPath, game)
                    const summary = JSON.parse(
                        readFileSync(join(path, "summary.json"), "utf8"),
                    ) as DeploySummary

                    if (summary.game.platform === "microsoft") continue
                    if (!["h1", "h2", "h3"].includes(summary.game.version)) continue
                    if (!existsSync(summary.frameworkPath)) continue

                    this.deployments.push({
                        id: game,
                        path,
                        summary,
                    })
                }
            }
        }

        this.deployments.sort((a, b) =>
            a.summary.game.version.localeCompare(b.summary.game.version),
        )
    }

    static get modFrameworkDataPaths(): string[] | false {
        if (getFlag("smfDeploymentsPath") !== "AUTO")
            return [getFlag("smfDeploymentsPath") as string]

        switch (process.platform) {
            case "win32":
                return (
                    (process.env.LOCALAPPDATA && [
                        join(
                            process.env.LOCALAPPDATA,
                            "Simple Mod Framework",
                            "deployments",
                        ),
                    ]) ||
                    false
                )
            case "linux": {
                if (!process.env.HOME) return false
                const XDG_DATA_HOME =
                    process.env.XDG_DATA_HOME ??
                    join(process.env.HOME, ".local", "share")

                return [
                    join(XDG_DATA_HOME, "Simple Mod Framework", "deployments"),
                ]
            }

            default:
                return false
        }
    }

    private async executePlugin(plugin: string) {
        // Check if we are running on linux and got a wine path
        if (
            process.platform === "linux" &&
            plugin.startsWith(`${process.env.WINE_DRIVE_PREFIX ?? "Z"}:\\`)
        ) {
            plugin = plugin.substring(2).replace(/\\/g, path.sep)
        }

        if (!existsSync(plugin)) return

        await this.controller.executePlugin(
            basename(plugin),
            (await readFile(plugin)).toString(),
            plugin,
        )
    }

    private handleContracts(deployment: Deployment) {
        for (const assetId of Object.values(
            deployment.summary.serverSideData.contracts,
        )) {
            const contractData = JSON.parse(
                readFileSync(join(deployment.path, assetId), "utf8"),
            ) as MissionManifest

            if (contractData.SMF?.destinations?.peacockIntegration !== false) {
                this.controller.hooks.getContractManifest.tap(
                    `smfContract-${deployment.id}-${assetId}`,
                    (contractId, userId, gameVersion) => {
                        if (
                            contractId === contractData.Metadata.Id &&
                            (!userId ||
                                this.userPlatforms[userId]?.[1] ===
                                    deployment.summary.game.platform) &&
                            deployment.summary.game.version === gameVersion
                        ) {
                            return contractData
                        }
                    },
                )

                if (contractData.SMF?.destinations?.addToDestinations) {
                    this.handleDestination(contractData)
                }
            }
        }
    }

    private handleDestination(contractData: MissionManifest) {
        const location = contractData.Metadata.Location
        const id = contractData.Metadata.Id
        const placeBefore = contractData.SMF?.destinations.placeBefore
        const placeAfter = contractData.SMF?.destinations.placeAfter

        for (const game of ["h1", "h2", "h3"] as const) {
            // @ts-expect-error I know what I'm doing.
            const inLocation = (this.controller.missionsInLocation[game][
                location
            ] ??
                // @ts-expect-error I know what I'm doing.
                (this.controller.missionsInLocation[game][location] =
                    [])) as string[]

            if (placeBefore) {
                const index = inLocation.indexOf(placeBefore)
                inLocation.splice(index, 0, id)
            } else if (placeAfter) {
                const index = inLocation.indexOf(placeAfter) + 1
                inLocation.splice(index, 0, id)
            } else {
                inLocation.push(id)
            }
        }
    }

    private handleUnlockables(deployment: Deployment) {
        if (deployment.summary.serverSideData.unlockables) {
            const unlockablesData = JSON.parse(
                readFileSync(
                    join(
                        deployment.path,
                        deployment.summary.serverSideData.unlockables,
                    ),
                    "utf8",
                ),
            )

            this.controller.configManager.configs[
                (
                    {
                        h1: "Legacyallunlockables",
                        h2: "H2allunlockables",
                        h3: "allunlockables",
                    } as const
                )[deployment.summary.game.version]
            ] = unlockablesData

            const locationsData =
                this.controller.configManager.configs[
                    (
                        {
                            h1: "LegacyLocationsData",
                            h2: "H2LocationsData",
                            h3: "LocationsData",
                        } as const
                    )[deployment.summary.game.version]
                ]

            for (const location of unlockablesData.filter(
                (item: { Type: string; Subtype: string }) =>
                    item.Type === "location",
            )) {
                if (location.Subtype === "location") {
                    locationsData.parents[location.Id] = {
                        ...location,
                        DisplayNameLocKey: `UI_${location.Id}_NAME`,
                    }
                } else {
                    locationsData.children[location.Id] = {
                        ...location,
                        DisplayNameLocKey: `UI_${location.Id}_NAME`,
                    }
                }
            }
        }
    }

    private handleWorldMapMetadata(deployment: Deployment) {
        for (const [scene, assetId] of Object.entries(
            deployment.summary.serverSideData.worldMapMetadata,
        )) {
            const data: {
                entrances: { id: string }[]
                AgencyPickups: { id: string }[]
            } = JSON.parse(readFileSync(join(deployment.path, assetId), "utf8"))

            this.controller.configManager.configs.Entrances[scene] =
                data.entrances.map((entrance) => entrance.id)

            this.controller.configManager.configs.AgencyPickups[scene] =
                data.AgencyPickups.map((entrance) => entrance.id)
        }
    }

    private handleCampaigns(deployment: Deployment) {
        if (deployment.summary.serverSideData.storyConfig) {
            const data: StoryConfigCampaign[] = JSON.parse(
                readFileSync(
                    join(
                        deployment.path,
                        deployment.summary.serverSideData.storyConfig,
                    ),
                    "utf8",
                ),
            )

            this.controller.hooks.contributeCampaigns.tap(
                `smfCampaigns-${deployment.id}`,
                (
                    campaigns,
                    genSingleMission,
                    genSingleVideo,
                    gameVersion,
                    userId,
                ) => {
                    if (
                        this.userPlatforms[userId]?.[1] ===
                            deployment.summary.game.platform &&
                        deployment.summary.game.version === gameVersion
                    ) {
                        for (const campaign of data) {
                            const existing = campaigns.find(
                                (c) => c.Name === campaign.Name,
                            )

                            if (!existing) {
                                function convertCampaign(
                                    campaign: StoryConfigCampaign,
                                ): Campaign {
                                    return {
                                        Name: campaign.Name,
                                        Image: campaign.Image,
                                        Type: campaign.Type,
                                        BackgroundImage: campaign.Properties
                                            .BackgroundImage as
                                            | string
                                            | null
                                            | undefined,
                                        Properties: campaign.Properties,
                                        Subgroups:
                                            campaign.Subgroups?.map(
                                                convertCampaign,
                                            ),
                                        StoryData: campaign.StoryData.map(
                                            (data) =>
                                                data.Type === "Mission"
                                                    ? genSingleMission(
                                                          data.Id,
                                                          gameVersion,
                                                      )
                                                    : genSingleVideo(
                                                          data.Id,
                                                          gameVersion,
                                                      ),
                                        ).filter(Boolean),
                                    }
                                }

                                campaigns.push(convertCampaign(campaign))
                            } else {
                                function extendCampaign(
                                    existing: Campaign,
                                    campaign: StoryConfigCampaign,
                                ) {
                                    existing.StoryData.push(
                                        ...campaign.StoryData.filter(
                                            (data) =>
                                                !existing.StoryData.some(
                                                    (e) =>
                                                        e.Type === data.Type &&
                                                        // @ts-expect-error They have the same Type so this is fine
                                                        (e.Data.Id ||
                                                            // @ts-expect-error They have the same Type so this is fine
                                                            e.Data.VideoId) ===
                                                            data.Id,
                                                ),
                                        )
                                            .map((data) =>
                                                data.Type === "Mission"
                                                    ? genSingleMission(
                                                          data.Id,
                                                          gameVersion,
                                                      )
                                                    : genSingleVideo(
                                                          data.Id,
                                                          gameVersion,
                                                      ),
                                            )
                                            .filter(Boolean),
                                    )

                                    campaign.Subgroups?.forEach((subgroup) => {
                                        const existingSubgroup =
                                            existing.Subgroups?.find(
                                                (c) => c.Name === subgroup.Name,
                                            )

                                        if (existingSubgroup) {
                                            extendCampaign(
                                                existingSubgroup,
                                                subgroup,
                                            )
                                        }
                                    })
                                }

                                extendCampaign(existing, campaign)
                            }
                        }
                    }
                },
            )
        }
    }

    public async initSMFSupport() {
        for (const idx of [
            ...new Array(this.deployments.length).keys(),
        ].toReversed()) {
            const deployment = this.deployments[idx]

            if (
                (await md5File(
                    join(
                        deployment.summary.game.path,
                        (
                            {
                                h1: "HITMAN.exe",
                                h2: "HITMAN2.exe",
                                h3: "HITMAN3.exe",
                            } as const
                        )[deployment.summary.game.version],
                    ),
                )) !== deployment.summary.game.hash
            ) {
                this.deployments.splice(idx, 1)
            }
        }

        if (!this.deployments.length) return

        log(
            LogLevel.INFO,
            "Simple Mod Framework installed - using the data it outputs.",
            "boot",
        )

        this.controller.hooks.onUserLogin.tap(
            "smfSupport",
            (gameVersion, userId, platform) => {
                this.userPlatforms[userId] = [gameVersion, platform]
            },
        )

        for (const deployment of this.deployments) {
            this.handleContracts(deployment)
            this.handleUnlockables(deployment)
            this.handleWorldMapMetadata(deployment)
            this.handleCampaigns(deployment)
        }

        for (const plugin of new Set(
            this.deployments.flatMap(
                (deployment) =>
                    deployment.summary.serverSideData.peacockPlugins,
            ),
        )) {
            await this.executePlugin(plugin)
        }
    }

    /**
     * Returns whether a mod is enabled for the given user, by checking the deployments from Simple Mod Framework.
     * Note that if the user has not yet logged in, this function will return null.
     *
     * @param userId The user ID to check against.
     * @param modRef The mod ID and SemVer version range, in the form `id@version`.
     * @returns If the mod is enabled (or the `overrideFrameworkChecks` flag is set).
     */
    public modEnabledForUser(userId: string, modRef: string): boolean | null {
        const modId = modRef.split("@")[0]
        const modVersionRange = modRef.split("@")[1]

        const userInfo = this.userPlatforms[userId]

        if (!userInfo) return null

        return (
            this.deployments.some(
                (deployment) =>
                    deployment.summary.game.version === userInfo[0] &&
                    deployment.summary.game.platform === userInfo[1] &&
                    deployment.summary.config.deployOrder.includes(modId) &&
                    satisfies(
                        deployment.summary.modVersions[modId],
                        !isNaN(Number(modVersionRange[0]))
                            ? `^${modVersionRange}`
                            : modVersionRange,
                    ),
            ) || getFlag("overrideFrameworkChecks") === true
        )
    }

    /**
     * Returns whether a mod is enabled for the given game version and platform, by checking the deployments from Simple Mod Framework.
     *
     * @param gameVersion The game version to check against.
     * @param platform The platform to check against.
     * @param modRef The mod ID and SemVer version range, in the form `id@version`.
     * @returns If the mod is enabled (or the `overrideFrameworkChecks` flag is set).
     */
    public modEnabledForGame(
        gameVersion: GameVersion,
        platform: JwtData["platform"],
        modRef: string,
    ): boolean {
        const modId = modRef.split("@")[0]
        const modVersionRange = modRef.split("@")[1]

        return (
            this.deployments.some(
                (deployment) =>
                    deployment.summary.game.version === gameVersion &&
                    deployment.summary.game.platform === platform &&
                    deployment.summary.config.deployOrder.includes(modId) &&
                    satisfies(
                        deployment.summary.modVersions[modId],
                        !isNaN(Number(modVersionRange[0]))
                            ? `^${modVersionRange}`
                            : modVersionRange,
                    ),
            ) || getFlag("overrideFrameworkChecks") === true
        )
    }
}
