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
import { existsSync, readFileSync } from "fs"
import { getFlag } from "./flags"
import { log, LogLevel } from "./loggingInterop"
import { MissionManifest, SMFLastDeploy } from "./types/types"
import path, { basename, join } from "path"
import { readFile } from "fs/promises"
import { menuSystemDatabase } from "./menus/menuSystem"
import { parse } from "json5"

type LastServerSideData = SMFLastDeploy["lastServerSideStates"]

export class SMFSupport {
    public readonly lastDeploy: SMFLastDeploy | null

    constructor(private readonly controller: Controller) {
        const dataPaths = SMFSupport.modFrameworkDataPaths

        if (dataPaths) {
            for (const dataPath of dataPaths) {
                if (!existsSync(dataPath)) continue
                this.lastDeploy = parse(readFileSync(dataPath).toString())
                return
            }
        }

        this.lastDeploy = null
    }

    static get modFrameworkDataPaths(): string[] | false {
        if (getFlag("frameworkDeploySummaryPath") !== "AUTO")
            return [getFlag("frameworkDeploySummaryPath") as string]

        switch (process.platform) {
            case "win32":
                return (
                    (process.env.LOCALAPPDATA && [
                        join(
                            process.env.LOCALAPPDATA,
                            "Simple Mod Framework",
                            "deploySummary.json",
                        ),
                        join(
                            process.env.LOCALAPPDATA,
                            "Simple Mod Framework",
                            "lastDeploy.json",
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
                    join(
                        XDG_DATA_HOME,
                        "app.simple-mod-framework",
                        "deploySummary.json",
                    ),
                    join(
                        XDG_DATA_HOME,
                        "app.simple-mod-framework",
                        "lastDeploy.json",
                    ),
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

    private handleBlobs(lastServerSideData: LastServerSideData) {
        if (!lastServerSideData?.blobs) return

        menuSystemDatabase.hooks.getConfig.tap(
            "SMFBlobs",
            (name: string, gameVersion: string) => {
                if (
                    !(
                        gameVersion === "h3" &&
                        (lastServerSideData.blobs?.[name] ||
                            lastServerSideData.blobs?.[name.slice(1)])
                    )
                ) {
                    return
                }

                if (!process.env.LOCALAPPDATA) return

                return parse(
                    readFileSync(
                        join(
                            process.env.LOCALAPPDATA as string,
                            "Simple Mod Framework",
                            "blobs",
                            lastServerSideData.blobs[name] ||
                                lastServerSideData.blobs[name.slice(1)],
                        ),
                    ).toString(),
                )
            },
        )
    }

    private handleContracts(lastServerSideData: LastServerSideData) {
        if (!lastServerSideData?.contracts) return

        for (const contractData of Object.values(
            lastServerSideData.contracts,
        )) {
            if (contractData.SMF?.destinations?.peacockIntegration !== false) {
                this.controller.addMission(contractData)

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
        // @ts-expect-error I know what I'm doing.
        const inLocation = (this.controller.missionsInLocation["h3"][
            location
        ] ??
            // @ts-expect-error I know what I'm doing.
            (this.controller.missionsInLocation["h3"][location] =
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

    private handleUnlockables(lastServerSideData: LastServerSideData) {
        if (lastServerSideData?.unlockables) {
            this.controller.configManager.configs["allunlockables"] =
                lastServerSideData.unlockables.slice(1)
        }
    }

    public async initSMFSupport() {
        if (!this.lastDeploy) return

        log(
            LogLevel.INFO,
            "Simple Mod Framework installed - using the data it outputs.",
            "boot",
        )

        const lastServerSideData = this.lastDeploy?.lastServerSideStates

        this.handleUnlockables(lastServerSideData)
        this.handleContracts(lastServerSideData)
        this.handleBlobs(lastServerSideData)

        if (lastServerSideData?.peacockPlugins) {
            for (const plugin of lastServerSideData.peacockPlugins) {
                await this.executePlugin(plugin)
            }
        }
    }

    /**
     * Returns whether a mod is available and installed.
     *
     * @param modId The mod's ID.
     * @returns If the mod is available (or the `overrideFrameworkChecks` flag is set). You should probably abort initialisation if false is returned.
     */
    public modIsInstalled(modId: string): boolean {
        return (
            this.lastDeploy?.loadOrder.includes(modId) ||
            getFlag("overrideFrameworkChecks") === true
        )
    }
}
