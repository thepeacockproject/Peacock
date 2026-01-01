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

import { Socket } from "net"
import { EventEmitter } from "events"

export type LiveSplitResult = Promise<string | boolean | undefined>

/**
 * Node.js client for the LiveSplit Server running instance.
 *
 * @see https://github.com/LiveSplit/LiveSplit.Server LiveSplit server component
 * @see https://github.com/satanch/livesplit-node-client Original source code
 * @author satanch (https://github.com/satanch)
 * @license MIT
 */
export class LiveSplitClient extends EventEmitter {
    timeout: number
    private readonly _connectionDetails: {
        ip: string
        port: number
    }
    private _connected: boolean
    private _initGameTimeOnce: boolean
    private _socket: Socket | undefined

    /**
     * Creates a new instance.
     *
     * @param address - Connection address, in the format of 127.0.0.1:1234.
     */
    constructor(address: string) {
        super()

        const formatted: string[] = address.split(":")

        if (formatted.length !== 2) {
            throw new Error(
                "Failed to parse connection details! IP:PORT expected.",
            )
        }

        this._connectionDetails = {
            ip: formatted[0],
            port: parseInt(formatted[1]),
        }

        this._connected = false
        this.timeout = 100

        /*
            According to: https://github.com/LiveSplit/LiveSplit.Server/blob/a4a57716dce90936606bfc8f8ac84f7623773aa5/README.md#commands

            When using Game Time, it's important that you call "initgametime" once. Once "initgametime" is used, an additional comparison will appear, and you can switch to it via the context menu (Compare Against > Game Time). This special comparison will show everything based on the Game Time (every component now shows Game Time based information).
        */
        this._initGameTimeOnce = false
    }

    /**
     * Checks that no disallowed symbols are present in the command.
     *
     * @param str The command.
     * @throws {Error} If the command includes `\r\n`.
     */
    private static _checkDisallowedSymbols(str: string): void {
        if (str.indexOf("\r\n") !== -1) {
            throw new Error("No newline symbols allowed!")
        }
    }

    /**
     * Performs connection attempt to the LiveSplit Server instance.
     */
    connect(): Promise<boolean> {
        this._socket = new Socket()

        return new Promise((resolve, reject) => {
            this._socket!.connect(
                this._connectionDetails.port,
                this._connectionDetails.ip,
                () => {
                    this._connected = true
                    this.emit("connected")
                    resolve(this._connected)
                },
            )

            this._socket!.on("data", (data) => {
                // noinspection TypeScriptValidateJSTypes
                this.emit("data", data.toString("utf-8").replace("\r\n", ""))
            })

            this._socket!.on("error", (err) => {
                reject(err)
            })

            this._socket!.on("close", () => {
                this._connected = false
                this.emit("disconnected")
            })
        })
    }

    /**
     * Disconnect client from the server.
     */
    disconnect(): boolean {
        if (!this._connected) {
            return false
        }

        this._socket?.destroy()
        this._connected = false
        return true
    }

    /**
     * Send command to the LiveSplit Server instance.
     */
    async send(command: string, expectResponse = true): LiveSplitResult {
        if (!this._connected) {
            throw new Error("Client must be connected to the server!")
        }

        LiveSplitClient._checkDisallowedSymbols(command)

        this._socket?.write(`${command}\r\n`)

        if (expectResponse) {
            return await this._waitForResponse()
        }

        return true
    }

    /**
     * Start the timer.
     */
    async startTimer(): LiveSplitResult {
        return await this.send("starttimer", false)
    }

    /**
     * Start or split.
     */
    async startOrSplit(): LiveSplitResult {
        return await this.send("startorsplit", false)
    }

    /**
     * Split.
     */
    async split(): LiveSplitResult {
        return await this.send("split", false)
    }

    /**
     * Un-split.
     */
    async unsplit(): LiveSplitResult {
        return await this.send("unsplit", false)
    }

    /**
     * Skip split.
     */
    async skipSplit(): LiveSplitResult {
        return await this.send("skipsplit", false)
    }

    /**
     * Pause.
     */
    async pause(): LiveSplitResult {
        return await this.send("pause", false)
    }

    /**
     * Resume.
     */
    async resume(): LiveSplitResult {
        return await this.send("resume", false)
    }

    /**
     * Reset.
     */
    async reset(): LiveSplitResult {
        return await this.send("reset", false)
    }

    /**
     * Init game time. Can only be called once according to LiveSplit Server documentation.
     */
    async initGameTime(): LiveSplitResult {
        if (this._initGameTimeOnce) {
            return false
        }

        this._initGameTimeOnce = true
        return await this.send("initgametime", false)
    }

    /**
     * Set game time.
     *
     * @param time Game time.
     */
    async setGameTime(time: string): LiveSplitResult {
        return await this.send(`setgametime ${time}`, false)
    }

    /**
     * Set loading times.
     *
     * @param time Loading times.
     */
    async setLoadingTimes(time: string): LiveSplitResult {
        return await this.send(`setloadingtimes ${time}`, false)
    }

    /**
     * Pause game time.
     */
    async pauseGameTime(): LiveSplitResult {
        return await this.send("pausegametime", false)
    }

    /**
     * Unpause game time.
     */
    async unpauseGameTime(): LiveSplitResult {
        return await this.send("unpausegametime", false)
    }

    /**
     * Set comparison.
     *
     * @param comparison The comparison.
     */
    async setComparison(comparison: string): LiveSplitResult {
        return await this.send(`setcomparison ${comparison}`, false)
    }

    /**
     * Get delta.
     *
     * @param comparison The comparison.
     */
    async getDelta(comparison = ""): LiveSplitResult {
        if (comparison.length > 0) {
            comparison = ` ${comparison}`
        }

        return await this.send(`getdelta${comparison}`, true)
    }

    /**
     * Get last split time.
     */
    async getLastSplitTime(): LiveSplitResult {
        return await this.send("getlastsplittime", true)
    }

    /**
     * Get comparison split time.
     */
    async getComparisonSplitTime(): LiveSplitResult {
        return await this.send("getcomparisonsplittime", true)
    }

    /**
     * Get the current time.
     */
    async getCurrentTime(): LiveSplitResult {
        return await this.send("getcurrenttime", true)
    }

    /**
     * Get the final time.
     *
     * @param comparison The comparison.
     */
    async getFinalTime(comparison = ""): LiveSplitResult {
        if (comparison.length > 0) {
            comparison = ` ${comparison}`
        }

        return await this.send(`getfinaltime${comparison}`, true)
    }

    /**
     * Get predicted time.
     *
     * @param comparison The comparison.
     */
    async getPredictedTime(comparison: string): LiveSplitResult {
        return await this.send(`getpredictedtime ${comparison}`, true)
    }

    /**
     * Get the best possible time.
     */
    async getBestPossibleTime(): LiveSplitResult {
        return await this.send("getbestpossibletime", true)
    }

    /**
     * Get split index.
     */
    async getSplitIndex(): LiveSplitResult {
        return await this.send("getsplitindex", true)
    }

    /**
     * Get current split name.
     */
    async getCurrentSplitName(): LiveSplitResult {
        return await this.send("getcurrentsplitname", true)
    }

    /**
     * Get previous split name.
     */
    async getPreviousSplitName(): LiveSplitResult {
        return await this.send("getprevioussplitname", true)
    }

    /**
     * Get current timer phase.
     */
    async getCurrentTimerPhase(): LiveSplitResult {
        return await this.send("getcurrenttimerphase", true)
    }

    /**
     * @internal
     */
    private async _waitForResponse(): LiveSplitResult {
        let listener: (
            ...args: (string | boolean | PromiseLike<string | boolean>)[]
        ) => void = () => {}

        const responseRecieved = new Promise<Awaited<LiveSplitResult>>(
            (resolve) => {
                listener = (data) => {
                    resolve(data)
                }

                this.once("data", listener)
            },
        )

        const responseTimeout = new Promise<Awaited<LiveSplitResult>>(
            (resolve) => {
                setTimeout(() => {
                    this.removeListener("data", listener)
                    resolve(undefined)
                }, this.timeout)
            },
        )

        return await Promise.race([responseRecieved, responseTimeout])
    }
}
