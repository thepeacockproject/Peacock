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
export type ContractCreationNpcTargetPayload = {
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

const createTargetKillObjective = (
    params: ContractCreationNpcTargetPayload,
): MissionManifestObjective => ({
    Type: "statemachine",
    Id: randomUUID(),
    BriefingText: {
        $loc: {
            key: "UI_CONTRACT_GENERAL_OBJ_KILL",
            data: `$($repository ${params.RepositoryId}).Name`,
        },
    },
    HUDTemplate: {
        display: {
            $loc: {
                key: "UI_CONTRACT_GENERAL_OBJ_KILL",
                data: `$($repository ${params.RepositoryId}).Name`,
            },
        },
    },
    Category: "primary",
    Definition: {
        Scope: "Hit",
        Context: {
            Targets: [params.RepositoryId],
        },
        States: {
            Start: {
                Kill: {
                    Condition: {
                        $eq: ["$Value.RepositoryId", params.RepositoryId],
                    },
                    Transition: "Success",
                },
            },
        },
    },
})

const createRequiredOutfitObjective = (
    params: ContractCreationNpcTargetPayload,
): MissionManifestObjective => ({
    Type: "statemachine",
    Id: randomUUID(),
    Category: "secondary",
    Definition: {
        Scope: "Hit",
        Context: {
            Targets: [params.RepositoryId],
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
                                        params.RepositoryId,
                                    ],
                                },
                                params.Outfit.IsHitmanSuit
                                    ? {
                                          $eq: [
                                              "$Value.OutfitIsHitmanSuit",
                                              true,
                                          ],
                                      }
                                    : {
                                          $eq: [
                                              "$Value.OutfitRepositoryId",
                                              params.Outfit.RepositoryId,
                                          ],
                                      },
                            ],
                        },
                        Transition: "Success",
                    },
                    // state machines fall through to the next state if the condition is not met
                    {
                        Condition: {
                            $eq: ["$Value.RepositoryId", params.RepositoryId],
                        },
                        Transition: "Failure",
                    },
                ],
            },
        },
    },
    TargetConditions: [],
})

export function createObjectivesForTarget(
    params: ContractCreationNpcTargetPayload,
): MissionManifestObjective[] {
    const targetSm = createTargetKillObjective(params)

    const objectives: MissionManifestObjective[] = [targetSm]

    // if the required field is true, that means the user requested something OTHER than any disguise
    if (params.Outfit.Required) {
        const outfitSm = createRequiredOutfitObjective(params)

        targetSm.TargetConditions!.push({
            Type: params.Outfit.IsHitmanSuit ? "hitmansuit" : "disguise",
            RepositoryId: params.Outfit.RepositoryId,
            // for contract creation it's always optional, only escalations set hard fail conditions
            HardCondition: false,
            ObjectiveId: outfitSm.Id,
            // "Amazing!" - Athena Savalas
            KillMethod: "",
        })
    }

    // TODO: weapon objectives

    return objectives
}

/**
 * Create a time limit objective.
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
                    IntroCutEnd: {
                        Transition: "TimerRunning",
                    },
                },
                TimerRunning: {
                    exit_gate: {
                        Transition: "Success",
                    },
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
