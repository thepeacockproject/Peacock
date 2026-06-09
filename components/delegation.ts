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

interface DelegationContainer<T extends object> {
    instance: T
}

/**
 * Creates a proxy that transparently delegates all operations to
 * `container.instance`. Swapping `container.instance` changes what
 * the proxy delegates to, without changing the proxy's identity.
 */
export function createDelegatingProxy<T extends object>(
    container: DelegationContainer<T>,
): T {
    return new Proxy(Object.create(null) as T, {
        get(_target, prop, receiver) {
            const value = Reflect.get(container.instance, prop, receiver)

            if (typeof value === "function") {
                return value.bind(container.instance)
            }

            return value
        },
        set(_target, prop, value) {
            return Reflect.set(container.instance, prop, value)
        },
        has(_target, prop) {
            return Reflect.has(container.instance, prop)
        },
        ownKeys() {
            return Reflect.ownKeys(container.instance)
        },
        getOwnPropertyDescriptor(_target, prop) {
            return Reflect.getOwnPropertyDescriptor(container.instance, prop)
        },
        getPrototypeOf() {
            return Reflect.getPrototypeOf(container.instance)
        },
    })
}
