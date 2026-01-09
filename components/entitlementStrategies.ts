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

import { AxiosError, AxiosResponse } from "axios"
import { log, LogLevel } from "./loggingInterop"
import { userAuths } from "./officialServerAuth"
import {
    EPIC_NAMESPACE_2021,
    SCPC_ENTITLEMENTS,
    getEpicEntitlements,
    H2_STEAM_ENTITLEMENTS,
    STEAM_NAMESPACE_2016,
} from "./platformEntitlements"
import { GameVersion } from "./types/types"
import { getRemoteService } from "./utils"

/**
 * The base class for an entitlement strategy.
 *
 * @internal
 */
abstract class EntitlementStrategy {
    abstract get(
        accessToken: string,
        userId: string,
    ): string[] | Promise<string[]>
}

/**
 * Provider for HITMAN 3 on Epic Games Store.
 *
 * @internal
 */
export class EpicH3Strategy extends EntitlementStrategy {
    override async get(accessToken: string, userId: string) {
        return await getEpicEntitlements(
            EPIC_NAMESPACE_2021,
            userId,
            accessToken,
        )
    }
}

/**
 * Provider for any game using the official servers.
 *
 * @internal
 */
export class IOIStrategy extends EntitlementStrategy {
    private readonly _remoteService: string

    constructor(
        gameVersion: GameVersion,
        private readonly issuerId: string,
    ) {
        super()
        this.issuerId = issuerId
        this._remoteService = getRemoteService(gameVersion)!
    }

    override async get(userId: string) {
        if (!userAuths.has(userId)) {
            log(LogLevel.ERROR, `No user data found for ${userId}.`)
            return []
        }

        const user = userAuths.get(userId)

        let resp: AxiosResponse<string[]> | undefined = undefined

        try {
            resp = await user?._useService<string[]>(
                `https://${this._remoteService}.hitman.io/authentication/api/userchannel/ProfileService/GetPlatformEntitlements`,
                false,
                {
                    issuerId: this.issuerId,
                },
            )
        } catch (error) {
            if (error instanceof AxiosError) {
                log(
                    LogLevel.ERROR,
                    `Failed to get entitlements from Steam: got ${error.response?.status} ${error.response?.statusText}.`,
                )
            } else {
                log(
                    LogLevel.ERROR,
                    `Failed to get entitlements from Steam: ${JSON.stringify(
                        error,
                    )}.`,
                )
            }
        }

        return resp?.data || []
    }
}

/**
 * Provider for HITMAN 2016 on Epic Games.
 *
 * @internal
 */
export class EpicH1Strategy extends EntitlementStrategy {
    override get() {
        return [
            "0a73eaedcac84bd28b567dbec764c5cb", // Hitman 1 standard edition
            "81aecb49a60b47478e61e1cbd68d63c5", // Hitman 1 GOTY upgrade
        ]
    }
}

/**
 * Provider for HITMAN: Sniper Challenge (Hawk) on Steam.
 *
 * @internal
 */
export class SteamScpcStrategy extends EntitlementStrategy {
    override get() {
        return SCPC_ENTITLEMENTS
    }
}

/**
 * Provider for HITMAN 2016 on Steam.
 *
 * @internal
 */
export class SteamH1Strategy extends EntitlementStrategy {
    override get() {
        return [
            STEAM_NAMESPACE_2016,
            "439870", // Paris
            "439890", // Sapienza
            "440930", // Marrakesh
            "440940", // Bonus Episode
            "440960", // Bangkok
            "440961", // Colorado
            "440962", // Hokkaido
            "440970", // Requiem Legacy Suit
            "440971", // Silenced ICA-19 Chrome Pistol
            "440972", // White Rubber Duck Explosive
            "505180", // FULL EXPERIENCE
            "505200", // FULL EXPERIENCE Upgrade
            "505201", // Intro Pack
            "588660", // Blood Money Requiem Pack
            "588780", // Digital Bonus Content
            "664270", // Japanese V/O Pack
            "725350", // GOTY Clown Suit
            "725351", // GOTY Raven Suit
            "725352", // GOTY Cowboy Suit
            "725353", // Bonus Campaign Patient Zero
            "737780", // GOTY Suit Pack
        ]
    }
}

/**
 * Provider for HITMAN 2 on Steam.
 *
 * @internal
 */
export class SteamH2Strategy extends EntitlementStrategy {
    override get() {
        return H2_STEAM_ENTITLEMENTS
    }
}
