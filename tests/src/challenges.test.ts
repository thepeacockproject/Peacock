import { readFile } from "atomically"
import { join } from "path"
import { ClientToServerEvent } from "../types/types"
import {
    HandleEventOptions,
    handleEvent,
} from "@peacockproject/statemachine-parser"
import {
    ChallengeContext,
    ChallengePackage,
    SavedChallenge,
} from "../../components/types/challenges"
import { fastClone } from "../../components/utils"

describe("challenges", () => {
    test("fasterThanYourOwnShadow - should fail", async () => {
        const jsonChallengeData = await readFile(
            join(
                process.cwd(),
                "contractdata",
                "SNUG",
                "_SNUG_CHALLENGES.json",
            ),
        )

        const challengeData = JSON.parse(
            jsonChallengeData.toString(),
        ) as ChallengePackage

        const challenge = challengeData.groups
            .find((e) => e.CategoryId === "feats")
            .Challenges.find(
                (e) => e.Id === "5138536b-1c72-459f-b666-96ea0d793c1e",
            )

        const eventDataJsonFile = join(
            process.cwd(),
            "tests",
            "res",
            "fasterThanYourOwnShadow.session.json",
        )

        const actual = await testChallenge(challenge, eventDataJsonFile, true)

        assert.equal(actual, false)
    })
})

async function testChallenge(
    challenge: SavedChallenge,
    eventDataJsonFile,
    enableLogging = false,
) {
    const jsonEventData = await readFile(eventDataJsonFile)

    const eventData = JSON.parse(
        jsonEventData.toString(),
    ) as ClientToServerEvent[]

    const data: ChallengeContext = {
        context: { AreaIDs: [] },
        state: "Start",
        timers: [],
        timesCompleted: 0,
    }

    // NOTE: Direct copy from scoreHandler, because saveEvents is not exported and rewire doesn't work with ES6 modules.
    for (const event of eventData) {
        enableLogging &&
            console.log(
                `\n[${event.Timestamp}] ${event.Name}\n${JSON.stringify(
                    event.Value,
                )}`,
            )

        const options: HandleEventOptions = {
            eventName: event.Name,
            currentState: data.state,
            timers: data.timers,
            timestamp: event.Timestamp,
            contractId: "test",
            logger: enableLogging
                ? (category, message) => console.log(category, message)
                : undefined,
        }

        const previousState = data.state

        const result = handleEvent(
            challenge.Definition as never,
            fastClone(data.context),
            event.Value,
            options,
        )

        data.state = result.state
        data.context = result.context || challenge.Definition?.Context || {}

        console.log(result.state)

        if (previousState !== "Failure" && result.state === "Failure") {
            enableLogging && console.log("Failure!")

            return false
        } else if (previousState !== "Success" && result.state === "Success") {
            enableLogging && console.log("Success!")

            return true
        }
    }

    enableLogging && console.log("Unknown!")

    return undefined
}
