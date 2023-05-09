import { readFile } from "atomically"
import { setupScoring } from "../../components/eventHandler"
import { join } from "path"
import {
    ClientToServerEvent,
    ContractSession,
    MissionManifest,
} from "../../components/types/types"
import { handleEvent } from "@peacockproject/statemachine-parser"

describe("calculateSniperScore", () => {
    test("default", async () => {
        const jsonContractData = await readFile(
            join(
                process.cwd(),
                "contractdata",
                "SNIPER",
                "THELASTYARDBIRD.json",
            ),
        )

        const jsonEventData = await readFile(
            join(process.cwd(), "tests", "res", "sniperScore.session.json"),
        )

        const session = <ContractSession>{}

        const contractData = JSON.parse(
            jsonContractData.toString(),
        ) as MissionManifest

        const eventData = JSON.parse(
            jsonEventData.toString(),
        ) as ClientToServerEvent[]

        setupScoring(session, contractData.Metadata.Modules)

        // NOTE: Direct copy from scoreHandler, because saveEvents is not exported and rewire doesn't work with ES6 modules.
        eventData.forEach((event) => {
            console.log(
                `\n[${event.Timestamp}] ${event.Name}\n${JSON.stringify(
                    event.Value,
                )}\n${session.scoring.Context["TotalScore"]} @ ${
                    session.scoring.State
                }`,
            )

            const scoringContext = session.scoring.Context
            const scoringState = session.scoring.State

            const val = handleEvent(
                session.scoring.Definition as never,
                scoringContext,
                event.Value,
                {
                    // logger: (category, message) => console.log(category, message),
                    eventName: event.Name,
                    timestamp: event.Timestamp,
                    currentState: scoringState,
                    timers: session.scoring.Timers,
                },
            )

            if (val.context) {
                session.scoring.Context = val.context
                session.scoring.State = val.state

                console.log(
                    `${session.scoring.Context["TotalScore"]} @ ${session.scoring.State}`,
                )
            }
        })
    })
})
