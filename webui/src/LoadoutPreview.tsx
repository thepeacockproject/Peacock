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

import * as React from "react"
import { type Loadout } from "./utils"

export interface LoadoutPreviewProps {
    loadout: Loadout["data"]
}

function adjustCase(input: string): string {
    return input
        .split(" ")
        .map((i) => `${i[0].toUpperCase()}${i.substring(1).toLowerCase()}`)
        .join(" ")
}

function translateMapName(name: string): string {
    let newName = name.replace("LOCATION_", "")

    if (newName.includes("GOLDEN")) {
        return "Dubai"
    } else if (newName.includes("SMOOTHSNAKE")) {
        return "Dartmoor Garden Show"
    } else if (newName.includes("ANCESTRAL")) {
        return "Dartmoor"
    } else if (newName.includes("EDGY")) {
        return "Berlin"
    } else if (newName.includes("WET")) {
        return "Chongqing"
    } else if (newName.includes("ELEGANT")) {
        return "Mendoza"
    } else if (newName.includes("TRAPPED")) {
        return "Carpathian Mountains"
    } else if (newName.includes("ROCKY")) {
        return "Ambrose Island"
    } else if (newName.includes("GREEDY")) {
        return "New York"
    } else if (newName.includes("OPULENT")) {
        return "Haven"
    }

    if (newName.includes("_")) {
        const items = newName.split("_")

        const subLocNameForHumans = {
            MOVIESET: "The Icon",
            NIGHT: "Landslide",
            ZIKA: "The Source",
            EBOLA: "The Author",
            FLU: "Patient Zero",
        }[items[1]]

        newName = `${adjustCase(items[0])} (${subLocNameForHumans})`
    }

    return newName
}

function slotIdToIdentifier(id: string): string {
    switch (id) {
        case "2":
            return "Gun"
        case "3":
            return "Suit"
        case "4":
        case "5":
            return "Gear"
        default:
            return "Briefcase"
    }
}

function removeUnderscores(input: string): string {
    let newVal = input

    do {
        newVal = newVal.replace("_", " ")
    } while (newVal.includes("_"))

    return newVal
}

export function LoadoutPreview({
    loadout,
}: LoadoutPreviewProps): React.ReactElement {
    const maps = Object.keys(loadout)

    if (maps.length === 0) {
        return (
            <div>
                <h4>This profile has no default loadouts.</h4>
            </div>
        )
    }

    return (
        <div>
            {maps.map((map) => {
                const slotStuff = loadout[map]

                return (
                    <div key={map}>
                        <h4>{translateMapName(map)}</h4>
                        <ul>
                            {Object.keys(slotStuff).map((slot) => (
                                <li key={slot}>
                                    {slotIdToIdentifier(slot)} -{" "}
                                    {adjustCase(
                                        removeUnderscores(slotStuff[slot]),
                                    )
                                        .replace("Token ", "")
                                        .replace("Prop ", "")
                                        .replace("Firearms ", "")
                                        .replace("Device ", "")
                                        .replace("Outfit ", "")
                                        .replace("Hero ", "")
                                        .replace("Container ", "")}
                                </li>
                            ))}
                        </ul>
                    </div>
                )
            })}
        </div>
    )
}
