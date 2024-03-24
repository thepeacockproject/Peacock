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

/* eslint-disable @typescript-eslint/no-explicit-any */
import type * as core from "express-serve-static-core"
import { RequestWithJwt } from "../../components/types/types"
import { expect, Mock, test, vi } from "vitest"
import { sign } from "jsonwebtoken"
import { mockDatabaseFs, MockedFsReturn } from "../mocks/databaseHandlerMock"
import type { DataStorageFs } from "../../components/databaseHandler"

export function asMock<T>(value: T): Mock {
    return value as Mock
}

export function mockRequestWithJwt<
    QS = core.Query,
    Body = any,
>(): RequestWithJwt<QS, Body> {
    const mockedRequest = <RequestWithJwt<QS, Body>>{
        headers: {},
        header: (name: string) =>
            mockedRequest.headers[name.toLowerCase()] as string,
    }

    return mockedRequest
}

export function mockRequestWithValidJwt<QS = core.Query, Body = any>(
    pId: string,
): RequestWithJwt<QS, Body> {
    const mockedRequest = mockRequestWithJwt<QS, Body>()

    const jwtToken = sign(
        {
            unique_name: pId,
        },
        "secret",
    )

    mockedRequest.headers.authorization = `Bearer ${jwtToken}`

    return mockedRequest
}

export function mockResponse(): core.Response {
    const response = {
        status: undefined,
        json: undefined,
        end: undefined,
    }

    const mockImplementation = () => {
        return response
    }

    // @ts-expect-error It works.
    response.status = vi.fn().mockImplementation(mockImplementation)
    // @ts-expect-error It works.
    response.json = vi.fn()
    // @ts-expect-error It works.
    response.end = vi.fn()

    // @ts-expect-error It works.
    return <core.Response>response
}

export function getResolvingPromise<T>(value?: T): Promise<T> {
    return new Promise((resolve) => {
        // @ts-expect-error It works.
        resolve(value)
    })
}

export function getMockCallArgument<T>(
    value: any,
    call: number,
    argument: number,
): T {
    const calls = asMock(value).mock.calls

    expect(calls.length).toBeGreaterThanOrEqual(call)
    expect(calls[call].length).toBeGreaterThanOrEqual(argument)

    return asMock(value).mock.calls[call][argument] as T
}

/**
 * Vitest's `test` function, but `fakeFs` is available on the context object.
 * Provides a temporary, in-memory, per-test, disposable file system.
 */
export const testWithFakeFs = test.extend<{
    fakeFs: DataStorageFs
    fakeFsData: MockedFsReturn
}>({
    fakeFs: async ({ fakeFsData }, use) => {
        await use(fakeFsData.fsImpl)
    },
    // eslint-disable-next-line no-empty-pattern
    fakeFsData: async ({}, use) => {
        const dbFs = await mockDatabaseFs()

        await use(dbFs)

        dbFs.discard()
    },
})
