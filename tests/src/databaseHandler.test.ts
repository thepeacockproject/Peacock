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

import { afterEach, describe, expect, vi } from "vitest"
import {
    ContractSession,
    PeacockCameraStatus,
    UserProfile,
} from "../../components/types/types"
import {
    asyncGuard,
    getContractSession,
    getUserData,
    writeContractSession,
    writeExternalUserData,
    writeNewUserData,
} from "../../components/databaseHandler"
import { testWithFakeFs } from "../helpers/testHelpers"
import { npath } from "@yarnpkg/fslib"

afterEach(() => {
    vi.restoreAllMocks()
})

const basicFakeSession: ContractSession = {
    Id: "fakeSessionId",
    gameVersion: "h3",
    sessionStart: 1234,
    lastUpdate: 1234,
    contractId: "1f87dec7-23a3-4052-bf91-52162e4dbdd6",
    userId: "1273f7aa-e53b-4446-b940-0c32430dec0c",
    timerStart: 0,
    timerEnd: 0,
    duration: 0,
    crowdNpcKills: 0,
    targetKills: new Set(),
    npcKills: new Set(),
    bodiesHidden: new Set(),
    pacifications: new Set(),
    disguisesUsed: new Set(),
    disguisesRuined: new Set(),
    spottedBy: new Set(),
    witnesses: new Set(),
    bodiesFoundBy: new Set(),
    legacyHasBodyBeenFound: false,
    killsNoticedBy: new Set(),
    completedObjectives: new Set(),
    failedObjectives: new Set(),
    recording: PeacockCameraStatus.NotSpotted,
    lastAccident: 0,
    lastKill: {},
    kills: new Set(),
    compat: true,
    markedTargets: new Set(),
    currentDisguise: "4fc9396e-2619-4e66-a51e-2bd366230da7", // sig suit
    difficulty: 2,
    objectiveContexts: new Map(),
    objectiveStates: new Map(),
    objectiveDefinitions: new Map(),
    ghost: {
        deaths: 0,
        unnoticedKills: 0,
        Opponents: [],
        OpponentScore: 0,
        Score: 0,
        IsDraw: false,
        IsWinner: false,
        timerEnd: null,
    },
    challengeContexts: {},
}

describe("contract session storage", () => {
    testWithFakeFs(
        "can read and write a basic contract session",
        async ({ fakeFs, expect }) => {
            await writeContractSession(
                "nullSlot_jeff_fakeSessionId",
                basicFakeSession,
            )

            const read = JSON.parse(
                (
                    await fakeFs.readFile(
                        "contractSessions/nullSlot_jeff_fakeSessionId.json",
                    )
                ).toString(),
            )

            expect(read).toMatchSnapshot()

            const sessionLoaded = await getContractSession("jeff_fakeSessionId")

            expect(sessionLoaded).toBeTruthy()
            expect(sessionLoaded.bodiesHidden).toBeInstanceOf(Set)
            expect(sessionLoaded.lastUpdate).toBe(1234)
        },
    )

    testWithFakeFs(
        "throws an error if no matching contract sessions are found",
        async ({ expect }) => {
            await expect(
                getContractSession("nonexistentSessionId"),
            ).rejects.toThrowError()
        },
    )
})

describe("platform linkage", () => {
    testWithFakeFs(
        "can properly resolve platform links for h3",
        async ({ fakeFs }) => {
            const userId = "522043fd-bf41-4dcd-8aee-0f7e2a1ff260"
            const userSteamId = "000000000047"

            await writeExternalUserData(userId, "steamids", userSteamId, "h3")

            const written = (
                await fakeFs.readFile(
                    npath.join("userdata", "steamids", `${userId}.json`),
                )
            ).toString()

            expect(written).toBe(userSteamId)
        },
    )

    testWithFakeFs(
        "can properly resolve platform links for h1",
        async ({ fakeFs }) => {
            const userId = "522043fd-bf41-4dcd-8aee-0f7e2a1ff260"
            const userEpicId = "0123456789abcdef0123456789abcdef"

            await writeExternalUserData(userId, "epicids", userEpicId, "h1")

            const written = (
                await fakeFs.readFile(
                    npath.join("userdata", "h1", "epicids", `${userId}.json`),
                )
            ).toString()

            expect(written).toBe(userEpicId)
        },
    )
})

// TODO: test user data handling (in all of it's async glory)
describe("user data handling", () => {
    testWithFakeFs("can write new user data", async ({ fakeFs, expect }) => {
        const userId = "522043fd-bf41-4dcd-8aee-0f7e2a1ff260"
        const userProfile: UserProfile = {
            Id: userId,
            LinkedAccounts: {},
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Extensions: {} as any,
            EpicId: null,
            SteamId: null,
            Gamertag: "TobiasRieper",
            ETag: null,
            DevId: null,
            NintendoId: null,
            PSNOnlineId: null,
            XboxLiveId: null,
            PSNAccountId: null,
            Version: 1,
        }

        expect(getUserData(userId, "h3")).toBeUndefined()

        writeNewUserData(userId, userProfile, "h3")

        await asyncGuard.forceFlush()

        const read = JSON.parse(
            (
                await fakeFs.readFile(
                    npath.join("userdata", "users", `${userId}.json`),
                )
            ).toString(),
        )

        expect(read).toEqual(userProfile)
    })

    testWithFakeFs.todo("background task properly saves changes")
})
