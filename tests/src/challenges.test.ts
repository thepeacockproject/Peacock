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
} from "../../components/types/challenges"
import { LogLevel, log } from "../../components/loggingInterop"
import { fastClone } from "../../components/utils"

describe("challenges", () => {
    test("fasterThanYourOwnShadow", async () => {
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

        console.log(challenge)

        const jsonEventData = await readFile(
            join(
                process.cwd(),
                "tests",
                "res",
                "fasterThanYourOwnShadow.session.json",
            ),
        )

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
        eventData.forEach((event) => {
            if (data.state === "Success") {
                return
            }

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
                logger: (category, message) =>
                    log(LogLevel.DEBUG, `[${category}] ${message}`),
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

            console.log( result.state )
            
            if (previousState !== "Failure" && result.state === "Failure") {
                console.log("Failure!")

                return
            } else if (
                previousState !== "Success" &&
                result.state === "Success"
            ) {
                console.log("Success!")

                return
            }
        })
    })
})
