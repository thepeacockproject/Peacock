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

import type { Response } from "express"
import { decode, sign } from "jsonwebtoken"
import { extractToken, uuidRegex } from "./utils"
import type { GameVersion, RequestWithJwt, UserProfile } from "./types/types"
import { getVersionedConfig } from "./configSwizzleManager"
import { log, LogLevel } from "./loggingInterop"
import {
    STEAM_NAMESPACE_2018,
    STEAM_NAMESPACE_2021,
} from "./platformEntitlements"
import {
    getExternalUserData,
    getUserData,
    loadUserData,
    writeExternalUserData,
    writeNewUserData,
} from "./databaseHandler"
import { OfficialServerAuth, userAuths } from "./officialServerAuth"
import { randomUUID, randomBytes } from "crypto"
import { clearInventoryFor } from "./inventory"
import {
    EpicH1Strategy,
    EpicH3Strategy,
    IOIStrategy,
    SteamH1Strategy,
    SteamH2Strategy,
    SteamScpcStrategy,
} from "./entitlementStrategies"
import { getFlag } from "./flags"

export const JWT_SECRET =
    getFlag("developmentAllowRuntimeRestart") || PEACOCK_DEV
        ? "secret"
        : randomBytes(32).toString("hex")

export async function handleOauthToken(
    req: RequestWithJwt,
    res: Response,
): Promise<void> {
    const isFrankenstein = req.body.gs === "scpc-prod"

    const signOptions = {
        notBefore: -60000,
        expiresIn: 6000,
        issuer: "auth.hitman.io",
        audience: isFrankenstein ? "scpc-prod" : "pc_prod_8",
        noTimestamp: true,
    }

    let external_platform: "steam" | "epic",
        external_userid: string,
        external_users_folder: "steamids" | "epicids",
        external_appid: string

    if (req.body.grant_type === "external_steam") {
        if (!/^\d{1,20}$/.test(req.body.steam_userid)) {
            res.status(400).end() // invalid steam user id
            return
        }

        external_platform = "steam"
        external_userid = req.body.steam_userid
        external_users_folder = "steamids"
        external_appid = req.body.steam_appid
    } else if (req.body.grant_type === "external_epic") {
        if (!/^[\da-f]{32}$/.test(req.body.epic_userid)) {
            res.status(400).end() // invalid epic user id
            return
        }

        const epic_token = decode(
            req.body.access_token.replace(/^eg1~/, ""),
        ) as {
            appid: string
            app: string
        }

        if (!epic_token || !(epic_token.appid || epic_token.app)) {
            res.status(400).end() // invalid epic access token
            return
        }

        external_appid = epic_token.appid || epic_token.app
        external_platform = "epic"
        external_userid = req.body.epic_userid
        external_users_folder = "epicids"
    } else if (req.body.grant_type === "refresh_token") {
        // send back the token from the request (re-signed so the timestamps update)
        extractToken(req) // init req.jwt
        // remove signOptions from existing jwt
        // ts-expect-error Non-optional, we're reassigning.
        delete req.jwt.nbf // notBefore
        // ts-expect-error Non-optional, we're reassigning.
        delete req.jwt.exp // expiresIn
        // ts-expect-error Non-optional, we're reassigning.
        delete req.jwt.iss // issuer
        // ts-expect-error Non-optional, we're reassigning.
        delete req.jwt.aud // audience

        if (!isFrankenstein) {
            if (userAuths.has(req.jwt.unique_name)) {
                userAuths
                    .get(req.jwt.unique_name)!
                    ._doRefresh()
                    .then(() => undefined)
                    .catch(() => {
                        log(LogLevel.WARN, "Failed authentication refresh.")
                        userAuths.get(req.jwt.unique_name)!.initialized = false
                    })
            }
        }

        res.json({
            access_token: sign(req.jwt, JWT_SECRET, signOptions),
            token_type: "bearer",
            expires_in: 5000,
            refresh_token: randomUUID(),
        })

        return
    } else {
        res.status(406).end() // unsupported auth method
        return
    }

    if (req.body.pId && !uuidRegex.test(req.body.pId)) {
        res.status(400).end() // pId is not a GUID
        return
    }

    const isHitman3 =
        external_appid === "fghi4567xQOCheZIin0pazB47qGUvZw4" ||
        external_appid === STEAM_NAMESPACE_2021

    const gameVersion: GameVersion = isFrankenstein
        ? "scpc"
        : isHitman3
        ? "h3"
        : external_appid === STEAM_NAMESPACE_2018
        ? "h2"
        : "h1"

    if (!req.body.pId) {
        // if no profile id supplied
        try {
            req.body.pId = (
                await getExternalUserData(
                    external_userid,
                    external_users_folder,
                    gameVersion,
                )
            ).toString()
        } catch (e) {
            req.body.pId = randomUUID()
            await writeExternalUserData(
                external_userid,
                external_users_folder,
                req.body.pId,
                gameVersion,
            )
        }
    } else {
        // if a profile id is supplied
        getExternalUserData(external_userid, external_users_folder, gameVersion)
            .then(() => null)
            .catch(async () => {
                // external id is not yet linked to this profile
                await writeExternalUserData(
                    external_userid,
                    external_users_folder,
                    req.body.pId,
                    gameVersion,
                )
            })
    }

    try {
        await loadUserData(req.body.pId, gameVersion)
    } catch (e) {
        log(LogLevel.DEBUG, "Unable to load profile information.")
    }

    /* 
       Store user auth for all games except scpc
    */
    if (!isFrankenstein) {
        const authContainer = new OfficialServerAuth(
            gameVersion,
            req.body.access_token,
        )

        log(LogLevel.DEBUG, `Setting up container with ID ${req.body.pId}.`)

        userAuths.set(req.body.pId, authContainer)

        await authContainer._initiallyAuthenticate(req)
    }

    let userData = getUserData(req.body.pId, gameVersion)

    if (userData === undefined) {
        // User does not exist, create new profile from default:
        log(LogLevel.DEBUG, `Create new profile ${req.body.pId}`)

        userData = getVersionedConfig(
            "UserDefault",
            gameVersion,
            true,
        ) as UserProfile
        userData.Id = req.body.pId
        userData.LinkedAccounts[external_platform] = external_userid

        if (external_platform === "steam") {
            userData.SteamId = req.body.steam_userid
        } else if (external_platform === "epic") {
            userData.EpicId = req.body.epic_userid
        }

        if (
            Object.prototype.hasOwnProperty.call(
                userData.Extensions,
                "inventory",
            )
        ) {
            // @ts-expect-error No longer in the typedefs.
            delete userData.Extensions.inventory
        }
    }

    async function getEntitlements(): Promise<string[]> {
        if (isFrankenstein) {
            return new SteamScpcStrategy().get()
        }

        if (gameVersion === "h1") {
            if (external_platform === "steam") {
                return new SteamH1Strategy().get()
            } else if (external_platform === "epic") {
                return new EpicH1Strategy().get()
            } else {
                log(LogLevel.ERROR, "Unsupported platform.")
                return []
            }
        }

        if (gameVersion === "h2") {
            return new SteamH2Strategy().get()
        }

        if (gameVersion === "h3") {
            if (external_platform === "epic") {
                return await new EpicH3Strategy().get(
                    req.body.access_token,
                    req.body.epic_userid,
                )
            } else if (external_platform === "steam") {
                return await new IOIStrategy(
                    gameVersion,
                    STEAM_NAMESPACE_2021,
                ).get(req.body.pId)
            } else {
                log(LogLevel.ERROR, "Unsupported platform.")
                return []
            }
        }

        log(LogLevel.ERROR, "Unsupported platform.")
        return []
    }

    const newEntP = await getEntitlements()

    if (newEntP.length === 0) {
        if (userData.Extensions.entP) {
            log(
                LogLevel.WARN,
                `Error getting latest entitlement data for user ${req.body.pId}. Recently acquired DLCs might not be displayed!`,
            )
        } else {
            log(
                LogLevel.ERROR,
                `Error getting entitlement data for new user ${req.body.pId}!`,
            )
            userData.Extensions.entP = newEntP
            writeNewUserData(req.body.pId, userData, gameVersion)
        }
    } else {
        userData.Extensions.entP = newEntP
        writeNewUserData(req.body.pId, userData, gameVersion)
    }

    // Format here follows steam_external, Epic jwt has some different fields
    const userinfo = {
        "auth:method": req.body.grant_type,
        roles: "user",
        sub: req.body.pId,
        unique_name: req.body.pId,
        userid: external_userid,
        platform: external_platform,
        locale: req.body.locale,
        rgn: req.body.rgn,
        pis: external_appid,
        cntry: req.body.locale,
    }

    clearInventoryFor(req.body.pId)

    res!.json({
        access_token: sign(userinfo, JWT_SECRET, signOptions),
        token_type: "bearer",
        expires_in: 5000,
        refresh_token: randomUUID(),
    })
}
