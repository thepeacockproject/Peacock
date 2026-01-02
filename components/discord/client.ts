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

// Vendor code - does not need type-checking.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import EventEmitter from "events"
import { clearTimeout, setTimeout } from "timers"
import { IPCTransport } from "./ipc"
import { randomUUID } from "crypto"

function subKey(event, args) {
    return `${event}${JSON.stringify(args)}`
}

export interface PresenceButton {
    label: string
    url: string
}

export interface Presence {
    state?: string
    details?: string
    startTimestamp?: number | Date
    endTimestamp?: number | Date
    largeImageKey?: string
    largeImageText?: string
    smallImageKey?: string
    smallImageText?: string
    instance?: boolean
    buttons?: PresenceButton[]
    timestamps?: {
        start?: number
        end?: number
    }
    assets?: {
        large_image?: string
        large_text?: string
        small_image?: string
        small_text?: string
    }
}

export interface ClientOptions {
    clientId: string
}

export class RPCClient extends EventEmitter {
    clientId?: string | undefined = undefined
    user?: unknown | undefined = undefined
    private transport: IPCTransport
    private _expecting: Map<string, Promise<unknown> & PromiseConstructor> =
        new Map()
    private _subscriptions: Map<string, Promise<unknown>> = new Map()
    private _connectPromise: Promise<unknown> | undefined = undefined

    constructor() {
        super()

        this.transport = new IPCTransport(this)
        this.transport.on("message", this._onRpcMessage.bind(this))
    }

    connect(clientId: string): Promise<unknown> {
        if (this._connectPromise) {
            return this._connectPromise
        }

        this._connectPromise = new Promise((resolve, reject) => {
            this.clientId = clientId
            const timeout = setTimeout(() => {
                if (this.transport.unavailable) {
                    return
                }

                reject(new Error("RPC_CONNECTION_TIMEOUT"))
            }, 10e3)
            timeout.unref()

            this.once("connected", () => {
                clearTimeout(timeout)
                resolve(this)
            })

            this.transport.once("close", () => {
                this._expecting.forEach((e) => {
                    e.reject(new Error("connection closed"))
                })

                this.emit("disconnected")
                reject(new Error("connection closed"))
            })

            this.transport.connect().catch(reject)
        })

        return this._connectPromise
    }

    async login(options: ClientOptions): Promise<this> {
        const { clientId } = options
        await this.connect(clientId)
        this.emit("ready")
        return this
    }

    request(
        cmd: string,
        args: { pid: number; activity?: Presence; instance?: boolean },
        evt?: undefined,
    ): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const nonce = randomUUID()
            this.transport.send({ cmd, args, evt, nonce })
            // @ts-expect-error It's a partial promise.
            this._expecting.set(nonce, { resolve, reject })
        })
    }

    _onRpcMessage(message): void {
        if (message.cmd === "DISPATCH" && message.evt === "READY") {
            if (message.data.user) {
                this.user = message.data.user
            }

            this.emit("connected")
            return
        }

        if (!this._expecting.has(message.nonce)) {
            const subid = subKey(message.evt, message.args)

            if (!this._subscriptions.has(subid)) {
                return
            }

            // @ts-expect-error Strange promise call.
            this._subscriptions.get(subid)(message.data)
            return
        }

        const { resolve, reject } = this._expecting.get(
            message.nonce,
        ) as PromiseConstructor

        if (message.evt === "ERROR") {
            const e = new Error(message.data.message)
            // @ts-expect-error The Error object shouldn't have this.
            e.data = message.data
            reject(e)
        } else {
            resolve(message.data)
        }

        this._expecting.delete(message.nonce)
    }

    async setActivity(
        args: Presence = {},
        pid = process.pid,
    ): Promise<unknown> {
        let timestamps
        let assets: {
            large_image: string
            large_text: string
            small_image: string
            small_text: string
        }

        if (args.startTimestamp || args.endTimestamp) {
            timestamps = {
                start: args.startTimestamp,
                end: args.endTimestamp,
            }

            if (timestamps.start instanceof Date) {
                timestamps.start = Math.round(timestamps.start.getTime())
            }

            if (timestamps.end instanceof Date) {
                timestamps.end = Math.round(timestamps.end.getTime())
            }
        }

        if (
            args.largeImageKey ||
            args.largeImageText ||
            args.smallImageKey ||
            args.smallImageText
        ) {
            assets = {
                large_image: args.largeImageKey!,
                large_text: args.largeImageText!,
                small_image: args.smallImageKey!,
                small_text: args.smallImageText!,
            }
        }

        return await this.request("SET_ACTIVITY", {
            pid,
            activity: {
                state: args.state,
                details: args.details,
                timestamps,
                assets,
                buttons: args.buttons,
                instance: !!args.instance,
            },
        })
    }

    async clearActivity(pid = process.pid): Promise<Awaited<unknown>> {
        return await this.request("SET_ACTIVITY", {
            pid,
        })
    }

    async destroy(): Promise<void> {
        await this.transport.close()
    }
}
