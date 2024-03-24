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

import { join } from "path"
import type { ContractSession, GameVersion, UserProfile } from "./types/types"
import { deserializeSession, serializeSession } from "./contracts/sessions"
import { castUserProfile } from "./utils"
import { log, LogLevel } from "./loggingInterop"
import { mkdir, readdir, readFile, unlink, writeFile } from "fs/promises"
import type * as nodeFs from "node:fs/promises"
import { existsSync } from "fs"

// unlink, mkdir, readdir from node:fs/promises
type NodeUnlinkMkdirReaddir = Pick<
    typeof nodeFs,
    "unlink" | "mkdir" | "readdir" | "writeFile" | "readFile"
>

// custom exists function because node doesn't have an async version of existsSync
type ExistsPromise = {
    exists: (path: string) => Promise<boolean>
}

/**
 * The fs implementation that this system uses.
 */
export type DataStorageFs = NodeUnlinkMkdirReaddir & ExistsPromise

/**
 * Handles the dispatching of user data in a way that avoids FS operations unless absolutely needed.
 */
class AsyncUserDataGuard {
    /** @internal */
    readonly userData: Map<string, UserProfile> = new Map()
    /** @internal */
    readonly dirtyProfiles: Set<string> = new Set()
    /**
     * Internal list of background tasks that have been scheduled.
     * The key is the versioned user ID.
     * @internal
     */
    readonly tasks: Map<string, NodeJS.Timeout> = new Map()

    /** If true, none of the background tasks will attempt to write. */
    #paused = false

    /**
     * Get the fs implementation to use for file read/writes.
     * Mainly for test purposes, but could also be used by plugins to make it use a real database.
     */
    getFs(): DataStorageFs {
        return {
            writeFile,
            readFile,
            unlink,
            mkdir,
            readdir,
            exists(path) {
                // node's fs doesn't have a promise version of exists
                return Promise.resolve(existsSync(path))
            },
        }
    }

    /**
     * Get a loaded user's profile.
     * @param id The target user ID.
     * @returns The profile, or undefined if they're not loaded.
     * Profiles are loaded when they perform the auth handshake via the game.
     */
    getProfile(id: string): UserProfile | undefined {
        return this.userData.get(id)
    }

    addLoadedProfile(id: string, profile: UserProfile): void {
        if (!this.userData.has(id) && !this.tasks.has(id)) {
            const interval = setInterval(() => {
                if (!this.dirtyProfiles.has(id) || this.#paused) {
                    return
                }

                this.save(id)
            }, 3000)

            this.tasks.set(id, interval.unref())
        }

        this.userData.set(id, profile)
        // just in case
        this.dirtyProfiles.delete(id)
    }

    /**
     * Saves any modifications to a given profile, called by a background scheduled task.
     * @param id The user ID.
     */
    save(id: string) {
        this.dirtyProfiles.delete(id)

        this.write(id)
            .then(() => undefined)
            .catch((e) => {
                log(LogLevel.ERROR, `Failed to write user profile ${id}: ${e}`)
            })
    }

    markDirty(id: string): void {
        this.dirtyProfiles.add(id)
    }

    /** @internal */
    async write(versionedId: string): Promise<void> {
        let path

        const [id, gameVersion] = versionedId.split(".")

        if (["scpc", "h1", "h2"].includes(gameVersion)) {
            path = join("userdata", gameVersion, "users", `${id}.json`)
        } else {
            path = join("userdata", "users", `${id}.json`)
        }

        await this.getFs().writeFile(
            path,
            JSON.stringify(this.getProfile(versionedId)),
        )
    }

    /**
     * Immediately write all loaded profiles to the disk, even if no changes are pending.
     */
    async forceFlush() {
        const taskKeys = this.tasks.keys()
        this.#paused = true

        for (const id of taskKeys) {
            this.dirtyProfiles.delete(id)
            await this.write(id)
        }

        this.#paused = false
    }

    /**
     * Unload all profiles without saving.
     */
    unloadAll() {
        for (const id of this.tasks.keys()) {
            clearInterval(this.tasks.get(id))
            this.dirtyProfiles.delete(id)
            this.userData.delete(id)
        }
    }
}

/**
 * If you are touching this, you better know what you're doing.
 */
export const asyncGuard = new AsyncUserDataGuard()

/**
 * Gets a user's profile data.
 *
 * @param userId The user's ID.
 * @param gameVersion The game's version.
 * @returns The user's profile, OR UNDEFINED if not loaded.
 */
export function getUserData(
    userId: string,
    gameVersion: GameVersion,
): UserProfile {
    // TODO: consumers could have undefined returned - this function needs undefined
    //       as part of it's signature, but that requires a lot of changes.
    const data = asyncGuard.getProfile(`${userId}.${gameVersion}`)!

    // NOTE: ProfileLevel always starts at 1
    if (data?.Extensions?.progression?.PlayerProfileXP?.ProfileLevel === 0) {
        data.Extensions.progression.PlayerProfileXP.ProfileLevel = 1
    }

    return data
}

/**
 * Attempts to load a user's profile if it hasn't been loaded yet.
 *
 * @param userId The user's ID.
 * @param gameVersion The game's version.
 */
export async function cheapLoadUserData(
    userId: string,
    gameVersion: GameVersion,
): Promise<void> {
    if (!userId || !gameVersion) {
        return
    }

    const userProfile = asyncGuard.getProfile(`${userId}.${gameVersion}`)

    if (userProfile) {
        return
    }

    try {
        await loadUserData(userId, gameVersion)
    } catch (e) {
        log(LogLevel.DEBUG, "Unable to load profile information.")
    }
}

/**
 * Loads a user's profile data.
 *
 * @param userId The user's ID.
 * @param gameVersion The game's version.
 * @returns The raw JSON data.
 */
export async function loadUserData(
    userId: string,
    gameVersion: GameVersion,
): Promise<UserProfile> {
    let path

    if (["scpc", "h1", "h2"].includes(gameVersion)) {
        path = join("userdata", gameVersion, "users", `${userId}.json`)
    } else {
        path = join("userdata", "users", `${userId}.json`)
    }

    const userProfile = castUserProfile(
        JSON.parse((await asyncGuard.getFs().readFile(path)).toString()),
        gameVersion,
        path,
    )

    asyncGuard.addLoadedProfile(`${userId}.${gameVersion}`, userProfile)
    return userProfile
}

/**
 * Marks a user's profile as dirty.
 * Dirty profiles are automatically saved by a background thread every 3 seconds.
 *
 * @param userId The user's ID.
 * @param gameVersion The game's version.
 */
export function writeUserData(userId: string, gameVersion: GameVersion): void {
    asyncGuard.markDirty(`${userId}.${gameVersion}`)
}

/**
 * Writes a previously-non existent user profile.
 * This is used for creating new profiles.
 *
 * @param userId The user's ID.
 * @param userProfile
 * @param gameVersion The game's version.
 */
export function writeNewUserData(
    userId: string,
    userProfile: UserProfile,
    gameVersion: GameVersion,
): void {
    asyncGuard.addLoadedProfile(`${userId}.${gameVersion}`, userProfile)
    asyncGuard.markDirty(`${userId}.${gameVersion}`)
}

/**
 * Gets the value of an external provider binding.
 *
 * @param userId The user's ID.
 * @param externalFolder The folder where this provider's users are stored.
 * @param gameVersion The game's version.
 */
export async function getExternalUserData(
    userId: string,
    externalFolder: string,
    gameVersion: GameVersion,
): Promise<string> {
    const fs = asyncGuard.getFs()

    if (["scpc", "h1", "h2"].includes(gameVersion)) {
        return (
            await fs.readFile(
                join("userdata", gameVersion, externalFolder, `${userId}.json`),
            )
        ).toString()
    }

    return (
        await fs.readFile(join("userdata", externalFolder, `${userId}.json`))
    ).toString()
}

/**
 * Writes the value of an external provider binding.
 *
 * @param userId The user's ID.
 * @param externalFolder The folder where this provider's users are stored.
 * @param userData The data to write to the binding.
 * @param gameVersion The game's version.
 */
export async function writeExternalUserData(
    userId: string,
    externalFolder: string,
    userData: string,
    gameVersion: GameVersion,
): Promise<void> {
    const fs = asyncGuard.getFs()

    if (["scpc", "h1", "h2"].includes(gameVersion)) {
        return await fs.writeFile(
            join("userdata", gameVersion, externalFolder, `${userId}.json`),
            userData,
        )
    }

    return await fs.writeFile(
        join("userdata", externalFolder, `${userId}.json`),
        userData,
    )
}

/**
 * Reads a contract session from the contractSessions folder.
 *
 * @param identifier The identifier for the saved session, in the format of token_sessionID.
 * @returns The contract session.
 */
export async function getContractSession(
    identifier: string,
): Promise<ContractSession> {
    const fs = asyncGuard.getFs()
    const files = await fs.readdir("contractSessions")
    const filtered = files.filter((fn) => fn.endsWith(`_${identifier}.json`))

    if (filtered.length === 0) {
        throw new Error(`No session saved with identifier ${identifier}`)
    }

    // The filtered files have the same identifier, they are just stored at different slots
    // So we can read any of them, and it will be the same.
    return deserializeSession(
        JSON.parse(
            (
                await fs.readFile(join("contractSessions", filtered[0]))
            ).toString(),
        ),
    )
}

/**
 * Writes a contract session to the contractsSessions folder.
 *
 * @param identifier The identifier for the saved session, in the format of slot_token_sessionID.
 * @param session The contract session.
 */
export async function writeContractSession(
    identifier: string,
    session: ContractSession,
): Promise<void> {
    const fs = asyncGuard.getFs()

    return await fs.writeFile(
        join("contractSessions", `${identifier}.json`),
        JSON.stringify(serializeSession(session)),
    )
}

/**
 * Deletes a saved contract session from the contractsSessions folder.
 *
 * @param fileName The identifier for the saved session, in the format of slot_token_sessionID.
 * @throws ENOENT if the file is not found.
 */
export async function deleteContractSession(fileName: string): Promise<void> {
    const fs = asyncGuard.getFs()

    return await fs.unlink(join("contractSessions", `${fileName}.json`))
}

/**
 * Sets up the required file structure for the server.
 *
 * @param joinFunc The path join function to use, defaulting to Node's. You may need to specify it if working in a VFS.
 */
export async function setupFileStructure(joinFunc = join) {
    const fs = asyncGuard.getFs()

    for (const dir of [
        "contractSessions",
        "plugins",
        "userdata",
        "contracts",
        joinFunc("userdata", "epicids"),
        joinFunc("userdata", "steamids"),
        joinFunc("userdata", "users"),
        joinFunc("userdata", "h1", "steamids"),
        joinFunc("userdata", "h1", "epicids"),
        joinFunc("userdata", "h1", "users"),
        joinFunc("userdata", "h2", "steamids"),
        joinFunc("userdata", "h2", "users"),
        joinFunc("userdata", "scpc", "users"),
        joinFunc("userdata", "scpc", "steamids"),
        joinFunc("images", "actors"),
        joinFunc("images", "contracts"),
        joinFunc("images", "contracts", "elusive"),
        joinFunc("images", "contracts", "escalation"),
        joinFunc("images", "contracts", "featured"),
        joinFunc("images", "unlockables_override"),
    ]) {
        if (await fs.exists(dir)) {
            continue
        }

        log(LogLevel.DEBUG, `Creating missing directory ${dir}`)
        await fs.mkdir(dir, { recursive: true })
    }
}
