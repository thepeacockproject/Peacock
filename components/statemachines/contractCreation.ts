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

import type { MissionManifestObjective } from "../types/types"
import { randomUUID } from "crypto"

/**
 * The payload provided to the game for each target in the create menu route.
 */
export interface IContractCreationPayload {
    RepositoryId: string
    Selected: boolean
    Weapon: {
        RepositoryId: string
        KillMethodBroad: string
        KillMethodStrict: string
        RequiredKillMethodType: number
    }
    Outfit: {
        RepositoryId: string
        Required: boolean
        IsHitmanSuit: boolean
    }
}

/**
 * The target creator API.
 */
export class TargetCreator {
    // @ts-expect-error TODO: type this
    private _targetSm
    // @ts-expect-error TODO: type this
    private _outfitSm
    private _targetConds: undefined | unknown[] = undefined

    /**
     * The constructor.
     *
     * @param _params The contract creation payload.
     */
    public constructor(private readonly _params: IContractCreationPayload) {}

    private _requireTargetConds(): void {
        if (!this._targetConds || !Array.isArray(this._targetConds)) {
            this._targetConds = []
        }
    }

    private _bootstrapEntrySm(): void {
        this._targetSm = {
            Type: "statemachine",
            Id: randomUUID(),
            BriefingText: {
                $loc: {
                    key: "UI_CONTRACT_GENERAL_OBJ_KILL",
                    data: `$($repository ${this._params.RepositoryId}).Name`,
                },
            },
            HUDTemplate: {
                display: {
                    $loc: {
                        key: "UI_CONTRACT_GENERAL_OBJ_KILL",
                        data: `$($repository ${this._params.RepositoryId}).Name`,
                    },
                },
            },
            Category: "primary",
            Definition: {
                Scope: "Hit",
                Context: {
                    Targets: [this._params.RepositoryId],
                },
                States: {
                    Start: {
                        Kill: [
                            // this is the base state machine, we don't have fail states
                            {
                                Condition: {
                                    $eq: [
                                        "$Value.RepositoryId",
                                        this._params.RepositoryId,
                                    ],
                                },
                                Transition: "Success",
                            },
                        ],
                    },
                },
            },
        }
    }

    private _createOutfitSm(hmSuit: boolean): void {
        this._requireTargetConds()

        this._outfitSm = {
            Type: "statemachine",
            Id: randomUUID(),
            Category: "secondary",
            Definition: {
                Scope: "Hit",
                Context: {
                    Targets: [this._params.RepositoryId],
                },
                States: {
                    Start: {
                        Kill: [
                            {
                                Condition: {
                                    $and: [
                                        {
                                            $eq: [
                                                "$Value.RepositoryId",
                                                this._params.RepositoryId,
                                            ],
                                        },
                                        hmSuit
                                            ? {
                                                  $eq: [
                                                      "$Value.OutfitIsHitmanSuit",
                                                      true,
                                                  ],
                                              }
                                            : {
                                                  $eq: [
                                                      "$Value.OutfitRepositoryId",
                                                      this._params.Outfit
                                                          .RepositoryId,
                                                  ],
                                              },
                                    ],
                                },
                                Transition: "Success",
                            },
                            {
                                Condition: {
                                    $eq: [
                                        "$Value.RepositoryId",
                                        this._params.RepositoryId,
                                    ],
                                },
                                Transition: "Failure",
                            },
                        ],
                    },
                },
            },
        }

        this._targetConds?.push({
            Type: hmSuit ? "hitmansuit" : "disguise",
            RepositoryId: this._params.Outfit.RepositoryId,
            HardCondition: false,
            ObjectiveId: this._outfitSm.Id,
            // ioi moment
            KillMethod: "",
        })
    }

    /**
     * Get the array of finalized state machines.
     *
     * @returns The state machines.
     */
    public build(): MissionManifestObjective[] {
        this._bootstrapEntrySm()

        if (this._params.Outfit.Required) {
            // not any disguise
            this._createOutfitSm(this._params.Outfit.IsHitmanSuit)
        }

        const values = [this._targetSm]

        if (this._outfitSm) {
            values.push(this._outfitSm)
        }

        if (this._targetConds && Array.isArray(this._targetConds)) {
            this._targetSm.TargetConditions = this._targetConds
        }

        return values
    }
}

/**
 * The time limit creator API.
 *
 * @param time The amount of time to use in seconds.
 * @param optional If the objective should be optional or not.
 * @returns The generated state machine.
 */
export function createTimeLimit(
    time: number,
    optional: boolean,
): MissionManifestObjective {
    const descLocString = optional
        ? "UI_CONTRACT_UGC_TIME_LIMIT_SECONDARY_DESC"
        : "UI_CONTRACT_UGC_TIME_LIMIT_PRIMARY_DESC"
    const timeLimit = Math.floor(time)
    const timeSeconds = timeLimit % 60
    const timeMinutes = Math.trunc(timeLimit / 60) % 60
    const timeHours = Math.trunc(timeLimit / 3600)
    const timeLimitStr = `${
        timeHours ? `${timeHours}:` : ""
    }${`0${timeMinutes}`.slice(-2)}:${`0${timeSeconds}`.slice(-2)}`

    return {
        Type: "statemachine",
        Id: "1a596216-381e-4592-9798-26f156973942",
        ObjectiveType: "custom",
        Category: optional ? "secondary" : "primary",
        BriefingName: "$loc UI_CONTRACT_UGC_TIME_LIMIT_NAME",
        BriefingText: {
            $loc: {
                key: descLocString,
                data: `$formatstring ${timeLimitStr}`,
            },
        },
        LongBriefingText: {
            $loc: {
                key: descLocString,
                data: `$formatstring ${timeLimitStr}`,
            },
        },
        HUDTemplate: {
            display: {
                $loc: {
                    key: descLocString,
                    data: `$formatstring ${timeLimitStr}`,
                },
            },
        },
        Image: "images/contractconditions/condition_contrac_time_limit.jpg",
        OnActive: {
            IfInProgress: {
                State: "Completed",
            },
        },
        CombinedDisplayInHud: true,
        Definition: {
            Scope: "session",
            States: {
                Start: {
                    IntroCutEnd: [
                        {
                            Transition: "TimerRunning",
                        },
                    ],
                },
                TimerRunning: {
                    exit_gate: [
                        {
                            Transition: "Success",
                        },
                    ],
                    $timer: [
                        {
                            Condition: {
                                $after: timeLimit,
                            },
                            Transition: "Failure",
                        },
                    ],
                },
            },
        },
    }
}
