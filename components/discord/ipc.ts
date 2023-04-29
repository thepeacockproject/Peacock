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

import net from "net"
import EventEmitter from "events"
import axios from "axios"
import { randomUUID } from "crypto"
import type { RPCClient } from "./client"
import { log, LogLevel } from "../loggingInterop"

const enum OPCodes {
    HANDSHAKE = 0,
    FRAME = 1,
    CLOSE = 2,
    PING = 3,
    PONG = 4,
}

function getIPCPath(id: number): string {
    if (process.platform === "win32") {
        return `\\\\?\\pipe\\discord-ipc-${id}`
    }

    const {
        env: { XDG_RUNTIME_DIR, TMPDIR, TMP, TEMP },
    } = process
    const prefix = XDG_RUNTIME_DIR || TMPDIR || TMP || TEMP || "/tmp"
    return `${prefix.replace(/\/$/, "")}/discord-ipc-${id}`
}

function getIPC(id = 0): Promise<net.Socket | undefined> {
    return new Promise((resolve) => {
        const path = getIPCPath(id)

        const onerror = (err: Error) => {
            if (id < 10) {
                resolve(getIPC(id + 1))
                return
            }

            log(
                LogLevel.WARN,
                "Failed to connect to Discord for rich presence. Discord may not be running.",
            )

            if (err.stack) {
                log(LogLevel.DEBUG, err.stack)
            } else {
                log(LogLevel.DEBUG, err.message)
            }

            resolve(undefined)
        }

        const sock = net.createConnection(path, () => {
            sock.removeListener("error", onerror)
            resolve(sock)
        })

        sock.once("error", onerror)
    })
}

async function findEndpoint(tries = 0): Promise<string> {
    if (tries > 30) {
        throw new Error("Could not find endpoint")
    }

    const endpoint = `http://127.0.0.1:${6463 + (tries % 10)}`

    try {
        const r = await axios(endpoint)

        if (r.status === 404) {
            return endpoint
        }

        return findEndpoint(tries + 1)
    } catch (e) {
        return findEndpoint(tries + 1)
    }
}

function encode(op: number, data): Buffer {
    data = JSON.stringify(data)
    const len = Buffer.byteLength(data)
    const packet = Buffer.alloc(8 + len)
    packet.writeInt32LE(op, 0)
    packet.writeInt32LE(len, 4)
    packet.write(data, 8, len)
    return packet
}

const working = {
    full: "",
    op: undefined,
}

function decode(socket: net.Socket, callback): void {
    const packet = socket.read()

    if (!packet) {
        return
    }

    let { op } = working
    let raw: string

    if (working.full === "") {
        op = working.op = packet.readInt32LE(0)
        const len = packet.readInt32LE(4)
        raw = packet.slice(8, len + 8)
    } else {
        raw = packet.toString()
    }

    try {
        const data = JSON.parse(working.full + raw)
        callback({ op, data })
        working.full = ""
        working.op = undefined
    } catch (err) {
        working.full += raw
    }

    decode(socket, callback)
}

export class IPCTransport extends EventEmitter {
    /**
     * This will only be true if the initial connection failed, to prevent unhandled promise rejections.
     */
    public unavailable = false
    private socket: net.Socket | undefined = undefined

    constructor(private readonly client: RPCClient) {
        super()
    }

    async connect() {
        const socket = (this.socket = await getIPC())

        if (!this.socket) {
            // failed to connect
            this.unavailable = true
            return
        }

        socket!.on("close", this.onClose.bind(this))
        socket!.on("error", this.onClose.bind(this))
        this.emit("open")
        socket!.write(
            encode(OPCodes.HANDSHAKE, {
                v: 1,
                client_id: this.client.clientId,
            }),
        )
        socket!.pause()
        socket!.on("readable", () => {
            decode(socket!, ({ op, data }) => {
                switch (op) {
                    case OPCodes.PING:
                        this.send(data, OPCodes.PONG)
                        break
                    case OPCodes.FRAME:
                        if (!data) {
                            return
                        }

                        if (data.cmd === "AUTHORIZE" && data.evt !== "ERROR") {
                            findEndpoint()
                                .then((endpoint) => {
                                    // @ts-expect-error Unexpected property.
                                    this.client.request.endpoint = endpoint
                                    return
                                })
                                .catch((e) => {
                                    this.client.emit("error", e)
                                })
                        }

                        this.emit("message", data)
                        break
                    case OPCodes.CLOSE:
                        this.emit("close", data)
                        break
                    default:
                        break
                }
            })
        })
    }

    onClose(e): void {
        this.emit("close", e)
    }

    send(data, op = OPCodes.FRAME): void {
        if (this.unavailable) {
            log(
                LogLevel.DEBUG,
                "Skipping RPC data send: transport unavailable.",
            )
            return
        }

        this.socket?.write(encode(op, data))
    }

    async close(): Promise<void> {
        return new Promise((resolve) => {
            this.once("close", resolve)
            this.send({}, OPCodes.CLOSE)
            this.socket?.end()
        })
    }

    ping(): void {
        this.send(randomUUID(), OPCodes.PING)
    }
}
