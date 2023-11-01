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

import { Controller } from "./controller"
import { existsSync, readFileSync } from "fs"
import { getFlag } from "./flags"
import { log, LogLevel } from "./loggingInterop"
import { MissionManifest, SMFLastDeploy } from "./types/types"
import { basename, join } from "path"
import { readFile } from "fs/promises"
import { menuSystemDatabase } from "./menus/menuSystem"
import { parse } from "json5"

type LastServerSideData = SMFLastDeploy["lastServerSideStates"]

export class SMFSupport {
    public readonly lastDeploy: SMFLastDeploy

    constructor(private readonly controller: Controller) {
        const dataPath = SMFSupport.modFrameworkDataPath

        if (dataPath && existsSync(dataPath)) {
            this.lastDeploy = parse(readFileSync(dataPath).toString())
            return
        }

        this.lastDeploy = null
    }

    static get modFrameworkDataPath() {
        return (
            (process.env.LOCALAPPDATA &&
                join(
                    process.env.LOCALAPPDATA,
                    "Simple Mod Framework",
                    "lastDeploy.json",
                )) ||
            false
        )
    }

    private async executePlugin(plugin: string) {
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
                        (lastServerSideData.blobs[name] ||
                            lastServerSideData.blobs[name.slice(1)])
                    )
                ) {
                    return
                }

                return parse(
                    readFileSync(
                        join(
                            process.env.LOCALAPPDATA,
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
            this.controller.addMission(contractData)

            if (contractData.SMF?.destinations?.addToDestinations) {
                if (
                    contractData.SMF.destinations.peacockIntegration !== false
                ) {
                    this.handleDestination(contractData)
                }
            }
        }
    }

    private handleDestination(contractData: MissionManifest) {
        const location = contractData.Metadata.Location
        const id = contractData.Metadata.Id
        const placeBefore = contractData.SMF.destinations.placeBefore
        const placeAfter = contractData.SMF.destinations.placeAfter

        if (placeBefore) {
            const index =
                this.controller.missionsInLocations[location].indexOf(
                    placeBefore,
                )
            this.controller.missionsInLocations[location].splice(index, 0, id)
        } else if (placeAfter) {
            const index =
                this.controller.missionsInLocations[location].indexOf(
                    placeAfter,
                ) + 1
            this.controller.missionsInLocations[location].splice(index, 0, id)
        } else {
            this.controller.missionsInLocations[location].push(id)
        }
    }

    private handleUnlockables(lastServerSideData: LastServerSideData) {
        if (lastServerSideData?.unlockables) {
            this.controller.configManager.configs["allunlockables"] =
                lastServerSideData.unlockables.slice(1)
        }
    }

    public async initSMFSupport(modFrameworkDataPath: string) {
        if (!(modFrameworkDataPath && existsSync(modFrameworkDataPath))) {
            return
        }

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
