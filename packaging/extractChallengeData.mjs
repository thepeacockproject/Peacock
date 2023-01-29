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

import { writeFile } from "fs/promises"
import pc from "picocolors"
import { Command, Option, runExit } from "clipanion"
import axios from "axios"

/**
 * @param {import("axios").AxiosInstance} axiosClient
 * @param {string} contractId
 * @returns {Promise<*>}
 */
async function fetchContractCAndPFromIOI(axiosClient, contractId) {
    console.log(`${pc.blue`Fetching contract`} ${contractId}...`)

    const { data } = await axiosClient.post(
        "/authentication/api/userchannel/ChallengesService/GetActiveChallengesAndProgression",
        {
            contractId,
            difficultyLevel: 2,
        },
    )

    return data
}

/**
 * @param {import("axios").AxiosInstance} axiosClient
 * @param {string} locationId
 * @returns {Promise<*>}
 */
async function fetchDestination(axiosClient, locationId) {
    const resp = await axiosClient.get("/profiles/page/Destination", {
        params: {
            locationId,
        },
    })

    return resp.data
}

/**
 * @param {string} locationParent
 * @param {string} jwt
 * @param {string} apiUrl
 * @returns {Promise<string>}
 */
async function extract(locationParent, jwt, apiUrl) {
    const httpClient = axios.create({
        baseURL: `https://${apiUrl}/`,
        headers: {
            "User-Agent": "G2 Http/1.0 (Windows NT 10.0; DX12/1; d3d12/1)",
            "Content-Type": "application/json",
            Accept: "application/json, text/*, image/*, application/json",
            Version: "8.9.0",
            Authorization: `bearer ${jwt}`,
        },
    })

    console.log(
        `Fetching destination ${locationParent} from ${pc.underline(
            apiUrl,
        )}...`,
    )

    const missionIds = new Set()

    const destinationsData = await fetchDestination(httpClient, locationParent)

    const sublocations =
        destinationsData.data.MissionData.SubLocationMissionsData

    console.log(`Found ${pc.green(sublocations.length)} sublocations.`)

    const getOrEmpty = (val) => val || []

    for (const sublocationMissionData of sublocations) {
        for (const mission of [
            ...getOrEmpty(sublocationMissionData.Missions),
            ...getOrEmpty(sublocationMissionData.SarajevoSixMissions),
            ...getOrEmpty(sublocationMissionData.ElusiveMissions),
            ...getOrEmpty(sublocationMissionData.EscalationMissions),
            ...getOrEmpty(sublocationMissionData.SniperMissions),
            ...getOrEmpty(sublocationMissionData.PlaceholderMissions),
            ...getOrEmpty(sublocationMissionData.CampaignMissions),
        ]) {
            missionIds.add(mission.Id)
        }
    }

    const missions = await Promise.all(
        [...missionIds].map(async (id) => {
            return await fetchContractCAndPFromIOI(httpClient, id)
        }),
    )

    /**
     * @type {SavedChallengeGroup[]}
     */
    let groups = []
    const idToRuntimeExtras = {}

    // read runtime files
    for (const singleChallengesProgResult of missions) {
        for (const challenge of singleChallengesProgResult) {
            const { Type, Definition, InclusionData, Tags, XpModifier, Id } =
                challenge.Challenge

            idToRuntimeExtras[Id] = {
                XpModifier: XpModifier || {},
                RuntimeType: Type,
                Definition,
                Tags,
                InclusionData,
            }
        }
    }

    for (const group of destinationsData.data.ChallengeData.Children) {
        const challengeObjects = []

        console.log(`Creating group ${pc.magenta(group.CategoryId)}...`)

        groups.push({
            Name: group.Name,
            Image: group.Image,
            Icon: group.Icon,
            CategoryId: group.CategoryId,
            Description: group.Description,
            Challenges: challengeObjects,
        })

        const groupChallenges = group.SwitchData.Data.Challenges

        for (let fullPlanningChallenge of groupChallenges) {
            const shortName = fullPlanningChallenge.Name.replace(
                "UI_CHALLENGES_",
                "",
            )

            if (fullPlanningChallenge.Type === "global") {
                console.log(
                    `  - ${shortName} ${pc.yellow("is global (skipping)")}`,
                )
                continue
            } else {
                console.log(
                    `  - Adding ${pc.blue(shortName)} to ${pc.magenta(
                        group.CategoryId,
                    )}`,
                )
            }

            fullPlanningChallenge = {
                ...fullPlanningChallenge,
                ...idToRuntimeExtras[fullPlanningChallenge.Id],
            }

            if (fullPlanningChallenge.UserCentricContract) {
                const contractId =
                    fullPlanningChallenge.UserCentricContract?.Contract
                        ?.Metadata?.Id

                fullPlanningChallenge.InclusionData ??= {}

                if (
                    !(
                        fullPlanningChallenge.InclusionData?.ContractIds || []
                    ).includes(contractId)
                ) {
                    fullPlanningChallenge.InclusionData.ContractIds ??= []
                    fullPlanningChallenge.InclusionData.ContractIds.push(
                        contractId,
                    )
                }
            }

            fullPlanningChallenge.CompletionData = undefined
            fullPlanningChallenge.Completed = undefined
            fullPlanningChallenge.ChallengeProgress = undefined
            fullPlanningChallenge.UserCentricContract = undefined

            challengeObjects.push(fullPlanningChallenge)
        }
    }

    {
        const prunedGroups = new Set()

        // remove groups with no challenges
        groups = groups.filter((group) => {
            const hasAny = group.Challenges.length > 0

            if (!hasAny) {
                prunedGroups.add(group.Name)
            }

            return hasAny
        })

        for (const prunedGroup of prunedGroups) {
            console.log(`Removed empty group ${pc.magenta(prunedGroup)}`)
        }
    }

    console.log(`Compiled ${pc.green(groups.length)} groups of challenges`)

    return JSON.stringify(
        {
            meta: {
                Location: locationParent,
            },
            groups,
        },
        undefined,
        4,
    )
}

class ExtractChallengeDataCommand extends Command {
    outFile = Option.String("--out-file", { required: true })
    jwt = Option.String("--jwt", { required: true })
    locationParent = Option.String("--location-parent", { required: true })
    // https://youtrack.jetbrains.com/issue/WEB-56917
    // noinspection JSCheckFunctionSignatures
    apiUrl = Option.String("--api-url", "hm3-service.hitman.io")

    static usage = Command.Usage({
        category: `Challenges`,
        description: `Extracts challenge data into the Peacock challenge format.`,
        details: ``,
        examples: [
            [
                `Basic usage`,
                `$0 --location-parent LOCATION_PARENT_PARIS --jwt someJsonWebToken --out-file out.json`,
            ],
            [
                `With API URL`,
                `$0 --location-parent LOCATION_PARENT_PARIS --jwt someJsonWebToken --out-file out.json --api-url hm2-service.hitman.io`,
            ],
        ],
    })

    async execute() {
        const data = await extract(this.locationParent, this.jwt, this.apiUrl)

        await writeFile(this.outFile, data)
    }
}

// https://youtrack.jetbrains.com/issue/WEB-56917
// noinspection JSCheckFunctionSignatures
await runExit(
    {
        binaryName: "extractChallengeData.mjs",
    },
    ExtractChallengeDataCommand,
)
