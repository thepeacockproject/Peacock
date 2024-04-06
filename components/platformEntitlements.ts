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

import type { Response } from "express"
import axios, { AxiosError } from "axios"
import type { NamespaceEntitlementEpic, RequestWithJwt } from "./types/types"
import { getUserData } from "./databaseHandler"
import { log, LogLevel } from "./loggingInterop"

export const H3_EPIC_ENTITLEMENTS = [
    // DUBAI:
    "06d4d61bbb774ca99c1661bee04fbde0",
    // DARTMOOR:
    "2e4ad3e9aa9b4dcfa709b3f3b44cbf94",
    // BERLIN:
    "a9b1afdd05584441aeec75ba230b2e54",
    // CHONGQING:
    "66246e4364134f4689da72e9c6731687",
    // MENDOZA:
    "4216cdf59dbc4f19af227be076520202",
    // CARPATHIANMOUNTAINS:
    "8a690003855745e884d5040c6bc9ede8",
    // H3DELUXE:
    "bc610b36c75442299edcbe99f6f0fb60",
    // H3TRINITY:
    "5d06a6c6af9b4875b3530d5328f61287",
    // H1STANDARD:
    "0b59243cb8aa420691b66be1ecbe68c0",
    // H1GOTY:
    "894d1e6771044f48a8fdde934b8e443a",
    // H1REQUIEM:
    "e698e1a4b63947b0bc9349a5ae2dc015",
    // H3PASSH2:
    "391d08a543dc43a083eb50246916a291",
    // H3PASSH2EXPANSION:
    "afa4b921503f43339c360d4b53910791",
    // H2EXECUTIVE:
    "6408de14f7dc46b9a33adcf6cbc4d159",
    // EIDERGOLDEDITIONAUDIENCE:
    "b4e2e682cecd42b3a7017ee4838b4593",
    // H3PREPURCHASE1:
    "1dea1e39a8044a69b4020845afb4bd97",
    // H3PREPURCHASE2:
    "feeac4b521734f22ae99e8ac55a5f896",
    // SINGREED:
    "0e8632b4cdfb415e94291d97d727b98d",
    // SINPRIDE:
    "3f9adc216dde44dda5e829f11740a0a2",
    // SINSLOTH:
    "aece009ff59441c0b526f8aa69e24cfb",
    // SINLUST:
    "dfe5aeb89976450ba1e0e2c208b63d33",
    // SINGLUTTONY:
    "30107bff80024d1ab291f9cd3bac9fac",
    // SINENVY:
    "9e936ed2507a473db6f53ad24d2da587",
    // SINWRATH:
    "0403062df0d347619c8dcf043c65c02e",
    // WOASTANDARD:
    "a3509775467d4d6a8a7adffe518dc204",
    // WOADELUXE:
    "84a1a6fda4fb48afbb78ee9b2addd475",
    // MAKESHIFT:
    "08d2bc4d20754191b6c488541d2b4fa1",
    // CONCRETEART:
    "a1e9a63fa4f3425aa66b9b8fa3c9cc35",
    // THESARAJEVOSIX:
    "28455871cd0d4ffab52f557cc012ea5e",
    // SAMBUCA:
    "9220c020262f420da06eb46a4b1ce86f",
]

export const H2_STEAM_ENTITLEMENTS = [
    "863550", // Hitman 2
    "950540", // Hitman - Legacy: Paris
    "950550", // Hitman - Legacy: Sapienza
    "950551", // Hitman - Legacy: Marrakesh
    "950552", // Hitman - Legacy: Bonus Missions
    "950553", // Hitman - Legacy: Bankok
    "950554", // Hitman - Legacy: Colorado
    "950555", // Hitman - Legacy: Hokkaido
    "950556", // Hitman 2 - Hawke's Bay
    "950557", // Hitman 2 - Miami
    "950558", // Hitman 2 - Santa Fortuna
    "950559", // Hitman 2 - Mumbai
    "950560", // Hitman 2 - Whittleton Creek
    "950561", // Hitman 2 - Isle of Sgàil
    "950562", // Hitman 2 - Himmelstein
    "953090", // Hitman 2 - Bonus Campaign Patient Zero
    "953091", // Hitman 2 - GOTY Cowboy Suit
    "953092", // Hitman 2 - GOTY Raven Suit
    "953093", // Hitman 2 - GOTY Clown Suit
    "953094", // Hitman 2 - White Rubber Duck Explosive
    "953095", // Hitman 2 - Silenced ICA-19 Chrome Pistol
    "953096", // Hitman 2 - Requiem Legacy Suit
    "957690", // Hitman 2 - Expansion Pass
    "957691", // Hitman 2 - Expansion Pack 1
    "957692", // Hitman 2 - Expansion Pack 2
    "957693", // Hitman 2 - Winter Sports Pack
    "957694", // Hitman 2 - Smart Casual Pack
    "957695", // Hitman 2 - Special Assignments Pack 1
    "957696", // Hitman 2 - Special Assignments Pack 2
    "957697", // Hitman 2 - Executive Pack
    "957698", // Hitman 2 - Collector's Pack
    "957730", // Hitman 2 - New York
    "957731", // Hitman 2 - Haven Island
    "957733", // Hitman 2 - Hantu Port
    "957735", // Hitman 2 - Siberia
    "960831", // Hitman 2 - GOTY Legacy Pack
    "960832", // Hitman 2 - GOTY Upgrade Legacy Pack
    "972340", // Hitman 2 - Gold Edition
    "977941", // Hitman 2 - Early Access
]

export const STEAM_NAMESPACE_2016 = "236870"
export const EPIC_NAMESPACE_2016 = "3c06b15a8a2845c0b725d4f952fe00aa"
export const STEAM_NAMESPACE_SCPC = "783781"
export const STEAM_NAMESPACE_2018 = "863550"
export const EPIC_NAMESPACE_2021 = "ed55aa5edc5941de92fd7f64de415793"
export const STEAM_NAMESPACE_2021 = "1659040"

export const FRANKENSTEIN_SNIPER_ENTITLEMENTS = [STEAM_NAMESPACE_2016, "783781"]

export function getPlatformEntitlements(
    req: RequestWithJwt,
    res: Response,
): void {
    log(LogLevel.DEBUG, `Platform issuer: ${req.body.issuerId}`)

    const exts = getUserData(req.jwt.unique_name, req.gameVersion).Extensions
        .entP

    res.json(exts)
}

/**
 * Gets a user's entitlements through Epic.
 *
 * @param namespace The Epic namespace.
 * @param epicUid The user's Epic ID.
 * @param epicAuth The user's Epic authentication token.
 * @see https://dev.epicgames.com/docs/services/en-US/WebAPIRef/EcomWebAPI/index.html
 * @returns A string array with the user's entitlements, or an empty array if failed to acquire entitlements.
 */
export async function getEpicEntitlements(
    namespace: string,
    epicUid: string,
    epicAuth: string,
): Promise<string[]> {
    async function getEnts(
        ents: string[],
    ): Promise<NamespaceEntitlementEpic[]> {
        const v: { headers: Record<string, string> } = {
            headers: {},
        }

        v.headers["Authorization"] = `bearer ${epicAuth}`

        const url = `https://api.epicgames.dev/epic/ecom/v1/platforms/EPIC/identities/${epicUid}/ownership?nsCatalogItemId=${ents
            .map((e) => `${namespace}:${e}`)
            .join(`&nsCatalogItemId=`)}`

        let result: NamespaceEntitlementEpic[] = []

        try {
            result = (await axios(url, v)).data as NamespaceEntitlementEpic[]
        } catch (error) {
            if (error instanceof AxiosError) {
                log(
                    LogLevel.ERROR,
                    `Failed to get entitlements from Epic: got ${error.response?.status} ${error.response?.statusText}.`,
                )
            } else {
                log(
                    LogLevel.ERROR,
                    `Failed to get entitlements from Epic: ${JSON.stringify(
                        error,
                    )}.`,
                )
            }
        }

        return result
    }

    const actuallyOwned = new Set<string>()
    const res = await getEnts(H3_EPIC_ENTITLEMENTS)

    if (res) {
        for (const ent of res) {
            if (ent.owned) {
                actuallyOwned.add(ent.itemId)
            }
        }
    }

    return Array.from(actuallyOwned)
}
