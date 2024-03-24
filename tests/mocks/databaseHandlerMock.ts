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

import type { DataStorageFs } from "../../components/databaseHandler"
import * as databaseHandler from "../../components/databaseHandler"
import { expect, MockInstance, vi } from "vitest"
import * as nodeFs from "fs"
import { constants, Filename, npath, Path } from "@yarnpkg/fslib"
import { mountMemoryDrive } from "@yarnpkg/libzip"

/** TS fun stuff. */
function itBetterBeABuffer(data: unknown): asserts data is Buffer {
    expect(data).not.toBeFalsy()
}

export type MockedFsReturn = {
    fsImpl: DataStorageFs
    discard: () => void
    spies: Record<`${keyof DataStorageFs}Spy`, MockInstance>
}

/**
 * This function mocks databaseHandler's file system implementation using an
 * in-memory file system.
 * Make sure to call `discard` after you're done or memory will leak!
 */
export async function mockDatabaseFs(): Promise<MockedFsReturn> {
    const memoryDrive = mountMemoryDrive(
        nodeFs,
        npath.toPortablePath(__dirname),
        null,
        { typeCheck: constants.S_IFDIR },
    )

    const fsImpl: DataStorageFs = {
        async writeFile(path, data) {
            itBetterBeABuffer(data)

            return await memoryDrive.writeFilePromise(
                npath.toPortablePath(path as Path),
                data,
            )
        },
        // @ts-expect-error This type seems to be broken.
        async readFile(path) {
            try {
                return await memoryDrive.readFilePromise(
                    npath.toPortablePath(path as Path),
                )
            } catch (e) {
                console.error(path)
                throw e
            }
        },
        async unlink(path) {
            try {
                return await memoryDrive.unlinkPromise(path as Filename)
            } catch (e) {
                console.error(path)
                throw e
            }
        },
        async mkdir(path, opts) {
            try {
                await memoryDrive.mkdirPromise(
                    npath.toPortablePath(path as Filename),
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    opts as any,
                )
            } catch (e) {
                console.error(path)
                throw e
            }
        },
        // @ts-expect-error This type seems to be broken.
        async readdir(path) {
            return await memoryDrive.readdirPromise(
                npath.toPortablePath(path as Filename),
            )
        },
        async exists(path: string) {
            return await memoryDrive.existsPromise(
                npath.toPortablePath(path as Filename),
            )
        },
    }

    vi.spyOn(databaseHandler.asyncGuard, "getFs").mockImplementation(
        () => fsImpl,
    )

    await databaseHandler.setupFileStructure((...strings) =>
        npath.toPortablePath(npath.join(...strings)),
    )

    return {
        fsImpl,
        discard() {
            memoryDrive.discardAndClose()
            databaseHandler.asyncGuard.unloadAll()
        },
        spies: {
            writeFileSpy: vi.spyOn(fsImpl, "writeFile"),
            readFileSpy: vi.spyOn(fsImpl, "readFile"),
            unlinkSpy: vi.spyOn(fsImpl, "unlink"),
            mkdirSpy: vi.spyOn(fsImpl, "mkdir"),
            readdirSpy: vi.spyOn(fsImpl, "readdir"),
            existsSpy: vi.spyOn(fsImpl, "exists"),
        },
    }
}
