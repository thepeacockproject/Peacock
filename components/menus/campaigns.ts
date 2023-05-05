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

import { contractIdToHitObject, controller } from "../controller"
import type {
    Campaign,
    GameVersion,
    GenSingleMissionFunc,
    ICampaignMission,
    ICampaignVideo,
    IVideo,
    StoryData,
} from "../types/types"
import { log, LogLevel } from "../loggingInterop"
import { getConfig } from "../configSwizzleManager"
import { fastClone } from "../utils"
import assert from "assert"

/* eslint-disable prefer-const */

const genSingleMissionFactory = (userId: string): GenSingleMissionFunc => {
    return function genSingleMission(
        contractId: string,
        gameVersion: GameVersion,
    ): ICampaignMission {
        assert.ok(
            contractId,
            "Plugin tried to generate mission with no contract ID",
        )
        assert.ok(
            gameVersion,
            "Plugin tried to generate mission with no game version",
        )

        const actualContractData = controller.resolveContract(contractId, true)

        if (!actualContractData) {
            log(LogLevel.ERROR, `Failed to resolve contract ${contractId}!`)
        }

        return {
            Type: "Mission",
            Data: contractIdToHitObject(contractId, gameVersion, userId),
        }
    }
}

function genSingleVideo(
    videoId: string,
    gameVersion: GameVersion,
): ICampaignVideo {
    const videos = getConfig<Record<string, IVideo>>("Videos", true) // we modify videos so we need to clone this
    const video = videos[videoId]

    switch (gameVersion) {
        // H1 is not included here as there should be no edits required for the videos from H1
        case "h2": {
            if (video.Data.DlcName === "GAME_STORE_METADATA_GAME_TITLE") {
                video.Data.DlcName = "GAME_STORE_METADATA_S2_GAME_TITLE"
                video.Data.DlcImage =
                    "images/livetile/dlc/wide_logo_hitman2.png"
            }

            if (video.Data.DlcName.includes("METADATA_DLC")) {
                video.Data.DlcName.replace(
                    "METADATA_DLC",
                    "METADATA_LEGACY_DLC",
                )
                video.Data.DlcImage.replace("wide_logo", "wide_logo_legacy")
            }

            // Void entitlements unless it's LOCATION_NEWZEALAND, that is currently the only known entitlement for S2 maps
            if (!video.Entitlements.includes("LOCATION_NEWZEALAND")) {
                video.Entitlements = []
            }

            break
        }
        case "h3": {
            video.Data = {
                DlcName: "GAME_STORE_METADATA_S3_GAME_TITLE",
                DlcImage: "images/livetile/dlc/tile_hitman3.jpg",
            }

            if (video.Entitlements.includes("GOTY_PATIENT_ZERO")) {
                video.Entitlements = ["H1_LEGACY_STANDARD"]
            }

            if (video.Entitlements.includes("LOCATION_NEWZEALAND")) {
                video.Entitlements = ["H2_LEGACY_STANDARD"]
            }

            break
        }

        default:
            break
    }

    return {
        Type: "Video",
        Data: video,
    }
}

/**
 * Generates the campaigns data fed to the game's hub route.
 *
 * @param gameVersion The game's version.
 * @param userId The current user's ID.
 * @returns The campaigns.
 */
export function makeCampaigns(
    gameVersion: GameVersion,
    userId: string,
): Campaign[] {
    const genSingleMission = genSingleMissionFactory(userId)

    let c: Campaign[] = []

    const prologueStoryData: StoryData[] = [
        genSingleMission("1436cbe4-164b-450f-ad2c-77dec88f53dd", gameVersion),
        genSingleVideo("prologue_intermission1", gameVersion),
        genSingleMission("1d241b00-f585-4e3d-bc61-3095af1b96e2", gameVersion),
        genSingleVideo("prologue_intermission2", gameVersion),
        genSingleMission("b573932d-7a34-44f1-bcf4-ea8f79f75710", gameVersion),
        genSingleVideo("prologue_intermission3", gameVersion),
        genSingleMission("ada5f2b1-8529-48bb-a596-717f75f5eacb", gameVersion),
        genSingleVideo("prologue_intermission4", gameVersion),
    ]

    const s1StoryData: StoryData[] = [
        genSingleMission("00000000-0000-0000-0000-000000000200", gameVersion),
        genSingleVideo("debriefing_peacock", gameVersion),
        genSingleMission("00000000-0000-0000-0000-000000000600", gameVersion),
        genSingleVideo("debriefing_octopus", gameVersion),
        genSingleMission("00000000-0000-0000-0000-000000000400", gameVersion),
        genSingleVideo("debriefing_spider", gameVersion),
        genSingleMission("db341d9f-58a4-411d-be57-0bc4ed85646b", gameVersion),
        genSingleVideo("debriefing_tiger", gameVersion),
        genSingleMission("42bac555-bbb9-429d-a8ce-f1ffdf94211c", gameVersion),
        genSingleVideo("bull_secret_room", gameVersion),
        genSingleVideo("debriefing_bull", gameVersion),
        genSingleMission("0e81a82e-b409-41e9-9e3b-5f82e57f7a12", gameVersion),
        genSingleVideo("debriefing_snowcrane", gameVersion),
    ]

    let prologueCampaign: Campaign,
        s1Campaign: Campaign,
        s2Campaign: Campaign,
        s3Campaign: Campaign | undefined,
        sdsCampaign: Campaign | undefined

    if (gameVersion !== "h1") {
        const s2StoryData: StoryData[] = [
            genSingleMission(
                "c65019e5-43a8-4a33-8a2a-84c750a5eeb3",
                gameVersion,
            ),
            genSingleVideo("debriefing_sheep", gameVersion),
            genSingleMission(
                "c1d015b4-be08-4e44-808e-ada0f387656f",
                gameVersion,
            ),
            genSingleVideo("debriefing_flamingo", gameVersion),
            genSingleMission(
                "422519be-ed2e-44df-9dac-18f739d44fd9",
                gameVersion,
            ),
            genSingleVideo("debriefing_hippo", gameVersion),
            genSingleMission(
                "0fad48d7-3d0f-4c66-8605-6cbe9c3a46d7",
                gameVersion,
            ),
            genSingleVideo("debriefing_mongoose", gameVersion),
            genSingleVideo("intro_skunk", gameVersion),
            genSingleMission(
                "82f55837-e26c-41bf-bc6e-fa97b7981fbc",
                gameVersion,
            ),
            genSingleVideo("debriefing_skunk", gameVersion),
            genSingleVideo("intro_magpie", gameVersion),
            genSingleMission(
                "0d225edf-40cd-4f20-a30f-b62a373801d3",
                gameVersion,
            ),
            genSingleVideo("debriefing_magpie", gameVersion),
            genSingleMission(
                "7a03a97d-238c-48bd-bda0-e5f279569cce",
                gameVersion,
            ),
            genSingleMission(
                "095261b5-e15b-4ca1-9bb7-001fb85c5aaa",
                gameVersion,
            ),
        ]

        const s3StoryData: StoryData[] | undefined =
            gameVersion === "h3"
                ? [
                      genSingleVideo("intro_gecko", gameVersion),
                      genSingleMission(
                          "7d85f2b0-80ca-49be-a2b7-d56f67faf252",
                          gameVersion,
                      ),
                      genSingleVideo("debriefing_gecko", gameVersion),
                      genSingleMission(
                          "755984a8-fb0b-4673-8637-95cfe7d34e0f",
                          gameVersion,
                      ),
                      genSingleVideo("debriefing_bulldog", gameVersion),
                      genSingleMission(
                          "ebcd14b2-0786-4ceb-a2a4-e771f60d0125",
                          gameVersion,
                      ),
                      genSingleVideo("debriefing_fox", gameVersion),
                      genSingleMission(
                          "3d0cbb8c-2a80-442a-896b-fea00e98768c",
                          gameVersion,
                      ),
                      genSingleVideo("debriefing_rat", gameVersion),
                      genSingleMission(
                          "d42f850f-ca55-4fc9-9766-8c6a2b5c3129",
                          gameVersion,
                      ),
                      genSingleVideo("debriefing_llama", gameVersion),
                      genSingleMission(
                          "a3e19d55-64a6-4282-bb3c-d18c3f3e6e29",
                          gameVersion,
                      ),
                      genSingleVideo("debriefing_wolverine", gameVersion),
                  ]
                : undefined

        const sdsStoryData: StoryData[] | undefined =
            gameVersion === "h3"
                ? [
                      genSingleMission(
                          "ae04c7a0-4028-4524-b27f-6a62f020fdca",
                          gameVersion,
                      ),
                      genSingleMission(
                          "494d97a6-9e31-45e0-9dae-f3793c731336",
                          gameVersion,
                      ),
                      genSingleMission(
                          "a838c4b0-7db5-4ac7-8d52-e8c5b82aa376",
                          gameVersion,
                      ),
                      genSingleMission(
                          "e3b65e65-636b-4dfd-bb42-65a18c5dce4a",
                          gameVersion,
                      ),
                      genSingleMission(
                          "5121acde-313d-4517-ae70-6a54ca5d775a",
                          gameVersion,
                      ),
                      genSingleMission(
                          "8c8ed496-948f-4672-879b-4d9575406577",
                          gameVersion,
                      ),
                      genSingleMission(
                          "8e95dcd0-704f-4121-8be6-088a3812f838",
                          gameVersion,
                      ),
                  ]
                : undefined

        // BackgroundImage is duplicated as H3 uses properties, H2 doesn't
        prologueCampaign = {
            BackgroundImage: "images/story/background_training.jpg",
            Image: "",
            Name: "UI_CAMPAIGN_ICA_FACILITY_TITLE",
            Properties: {
                BackgroundImage: "images/story/background_training.jpg",
            },
            StoryData: prologueStoryData,
            Type: "training",
        }

        s1Campaign = {
            BackgroundImage: "images/story/background_season1.jpg",
            Image: "",
            Name: "UI_SEASON_1",
            Properties: {
                BackgroundImage: "images/story/background_season1.jpg",
            },
            StoryData: s1StoryData,
            Type: "mission",
        }

        s2Campaign = {
            BackgroundImage: "images/story/background_season2.jpg",
            Image: "",
            Name: "UI_SEASON_2",
            Properties: {
                BackgroundImage: "images/story/background_season2.jpg",
            },
            StoryData: s2StoryData,
            Type: "mission",
        }

        s3Campaign =
            gameVersion === "h3"
                ? {
                      BackgroundImage: null,
                      Image: "",
                      Name: "UI_SEASON_3",
                      Properties: {
                          BackgroundImage:
                              "images/story/background_season3.jpg",
                      },
                      StoryData: s3StoryData!,
                      Type: "mission",
                  }
                : undefined

        sdsCampaign =
            gameVersion === "h3"
                ? {
                      Name: "UI_MENU_PAGE_HUB_SEVEN_DEADLY_SINS",
                      Image: "",
                      Type: "campaign",
                      BackgroundImage: "images/story/background_deadlysins.jpg",
                      StoryData: sdsStoryData!,
                  }
                : undefined
    }

    const pzCampaign: Campaign = {
        Name: "UI_CONTRACT_CAMPAIGN_WHITE_SPIDER_TITLE",
        Image: "images/story/tile_whitespider.jpg",
        Type: "campaign",
        BackgroundImage:
            gameVersion === "h1"
                ? null
                : "images/story/background_whitespider.jpg",
        StoryData: [
            genSingleMission(
                "024b6964-a3bb-4457-b085-08f9a7dc7fb7",
                gameVersion,
            ),
            genSingleMission(
                "7e3f758a-2435-42de-93bd-d8f0b72c63a4",
                gameVersion,
            ),
            genSingleMission(
                "ada6205e-6ee8-4189-9cdb-4947cccd84f4",
                gameVersion,
            ),
            genSingleMission(
                "a2befcec-7799-4987-9215-6a152cb6a320",
                gameVersion,
            ),
        ],
    }

    switch (gameVersion) {
        case "h1": {
            c.push(
                {
                    Name: "UI_SEASON_1",
                    Image: "images/story/tile_season1.jpg",
                    Type: "mission",
                    BackgroundImage: null,
                    StoryData: prologueStoryData.concat(s1StoryData),
                },
                pzCampaign,
            )
            break
        }
        case "h2": {
            c.push(prologueCampaign!, s1Campaign!, s2Campaign!, pzCampaign)
            break
        }
        case "h3": {
            c.push(prologueCampaign!, s1Campaign!, s2Campaign!, s3Campaign!, {
                Name: "UI_MENU_PAGE_SIDE_MISSIONS_TITLE",
                Image: "",
                Type: "mission",
                BackgroundImage: null,
                Subgroups: [
                    sdsCampaign,
                    {
                        Name: "UI_MENU_PAGE_SPECIAL_ASSIGNMENTS_TITLE",
                        Image: "",
                        Type: "campaign",
                        BackgroundImage:
                            "images/story/background_special_assignments.jpg",
                        StoryData: [
                            genSingleMission(
                                "179563a4-727a-4072-b354-c9fff4e8bff0",
                                gameVersion,
                            ),
                            genSingleMission(
                                "a8036782-de0a-4353-b522-0ab7a384bade",
                                gameVersion,
                            ),
                            genSingleMission(
                                "f1ba328f-e3dd-4ef8-bb26-0363499fdd95",
                                gameVersion,
                            ),
                            genSingleMission(
                                "0b616e62-af0c-495b-82e3-b778e82b5912",
                                gameVersion,
                            ),
                        ],
                    },
                    pzCampaign,
                    {
                        Name: "UI_MENU_PAGE_BONUS_MISSIONS_TITLE",
                        Image: "",
                        Type: "campaign",
                        BackgroundImage:
                            "images/story/background_bonus_missions.jpg",
                        StoryData: [
                            genSingleMission(
                                "00000000-0000-0000-0001-000000000006",
                                gameVersion,
                            ),
                            genSingleMission(
                                "00000000-0000-0000-0001-000000000005",
                                gameVersion,
                            ),
                            genSingleMission(
                                "ced93d8f-9535-425a-beb9-ef219e781e81",
                                gameVersion,
                            ),
                            genSingleMission(
                                "c414a084-a7b9-43ce-b6ca-590620acd87e",
                                gameVersion,
                            ),
                            genSingleMission(
                                "4e45e91a-94ca-4d89-89fc-1b250e608e73",
                                gameVersion,
                            ),
                        ],
                    },
                ].filter((o) => o !== undefined),
                StoryData: [],
                Properties: {
                    BackgroundImage:
                        "images/story/background_side_missions.jpg",
                },
            })
            break
        }

        default:
            break
    }

    controller.hooks.contributeCampaigns.call(
        c,
        genSingleMission,
        genSingleVideo,
        gameVersion,
    )

    return c.filter(Boolean)
}

/**
 * Get all campaigns (including sub-campaigns) for the specified game version.
 *
 * @param gameVersion The game version.
 * @param userId The user's ID.
 */
export function getAllCampaigns(
    gameVersion: GameVersion,
    userId: string,
): Campaign[] {
    // Warning: cloning this is required, as pushing to this field would normally
    // modify the actual campaigns object.
    const list = fastClone(makeCampaigns(gameVersion, userId))

    const deepIterateCampaigns = (current: Campaign[]) => {
        for (const c of current) {
            if (c.Subgroups) {
                list.push(...c.Subgroups)
                deepIterateCampaigns(c.Subgroups)
            }
        }
    }

    deepIterateCampaigns(list)

    return list
}
