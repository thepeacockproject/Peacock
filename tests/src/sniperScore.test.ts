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
    test("session #1", async () => {
        const actual = await calculateScoreForContract(
            join(
                process.cwd(),
                "contractdata",
                "SNIPER",
                "THELASTYARDBIRD.json",
            ),
            join(process.cwd(), "tests", "res", "sniperScore1.session.json"),
        )

        assert.equal(actual, 71000)
    })

    test("session #2", async () => {
        const actual = await calculateScoreForContract(
            join(
                process.cwd(),
                "contractdata",
                "SNIPER",
                "THELASTYARDBIRD.json",
            ),
            join(process.cwd(), "tests", "res", "sniperScore2.session.json"),
        )

        assert.equal(actual, 126250)
    })
})

async function calculateScoreForContract(
    contractDataJsonFile,
    eventDataJsonFile,
    enableLogging = false,
): Promise<number> {
    const jsonContractData = await readFile(contractDataJsonFile)
    const jsonEventData = await readFile(eventDataJsonFile)

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
        enableLogging &&
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
                logger: enableLogging
                    ? (category, message) => console.log(category, message)
                    : undefined,
                eventName: event.Name,
                timestamp: event.Timestamp,
                currentState: scoringState,
                timers: session.scoring.Timers,
                contractId: event.ContractId,
            },
        )

        if (val.context) {
            session.scoring.Context = val.context
            session.scoring.State = val.state

            enableLogging &&
                console.log(
                    `${session.scoring.Context["TotalScore"]} @ ${session.scoring.State}`,
                )
        }
    })

    return session.scoring.Context["TotalScore"] as number
}
