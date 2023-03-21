import { loadConfig } from "../mocks/configSwizzleManager"

//NOTE: Required due to import of "./menus/destinations" on scoreHandler below
loadConfig("MissionStories")

import { calculatePlaystyle } from "../../components/scoreHandler"
import { ContractSession, RatingKill } from "../../components/types/types"

loadConfig("Playstyles")

describe("calculatePlaystyle", () => {
    test("default", () => {
        const contractSession = <ContractSession>{
            kills: new Set<RatingKill>(),
        }

        const result = calculatePlaystyle(contractSession)

        expect(result[0].Type).toBe("HEAD_SHOT_ASSASSIN")
    })

    test("pistol", () => {
        const ratingKill: RatingKill = <RatingKill>{
            KillClass: "ballistic",
            KillItemCategory: "pistol",
        }

        const contractSession = <ContractSession>{
            kills: new Set<RatingKill>([ratingKill]),
        }

        const result = calculatePlaystyle(contractSession)

        expect(result[0].Type).toBe("PISTOL_ASSASSIN")
    })
})
