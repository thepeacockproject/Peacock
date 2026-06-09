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

// Partially based on https://github.com/derhuerst/node-systemd/blob/master/lib/systemd.js

const SD_LISTEN_FDS_START = 3

export function getSocketActivationFileDescriptors(): number[] | null {
    if (process.env.LISTEN_PID === undefined) {
        return null
    }

    const pid = parseInt(process.env.LISTEN_PID)

    if (pid !== process.pid) {
        return null
    }

    if (process.env.LISTEN_FDS === undefined) {
        return null
    }

    const fdCount = parseInt(process.env.LISTEN_FDS)
    return new Array(fdCount).fill(null).map((_, i) => SD_LISTEN_FDS_START + i)
}
