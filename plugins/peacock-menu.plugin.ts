import {
    CommandFunction,
    commandService,
} from "@peacockproject/core/commandService"
import { Controller } from "@peacockproject/core/controller"
import { log, LogLevel } from "@peacockproject/core/loggingInterop"

type ModalTestResponse = {
    Count: number
}

type ButtonTestResponse = {
    Count: number
}

type ForEachTestResponse = {
    Title: string
    Body: string
}

const commandMap = new Map<string, CommandFunction>([
    ["modalTest", commandModalTest as CommandFunction],
    ["buttonTest", commandButtonTest as CommandFunction],
    ["forEachTest", commandForEachTest as CommandFunction],
])

function commandModalTest(lastResponse: ModalTestResponse): ModalTestResponse {
    let count = (lastResponse || { Count: 0 }).Count

    return {
        Count: ++count,
    }
}

function commandButtonTest(
    lastResponse: ButtonTestResponse,
): ButtonTestResponse {
    let count = (lastResponse || { Count: 0 }).Count

    return {
        Count: ++count,
    }
}

function commandForEachTest(): ForEachTestResponse[] {
    return [
        {
            Title: "Title #1",
            Body: "Body #1",
        },
        {
            Title: "Title #2",
            Body: "Body #2",
        },
        {
            Title: "Title #3",
            Body: "Body #3",
        },
    ]
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function initPlugin(_controller: Controller): void {
    log(LogLevel.INFO, "[Plugin] Peacock Menu", "peacock-menu")

    commandService.handleCommandMap("PeacockMenuPlugin", commandMap)
}

// TODO: Add plugin for all weapons unlock

module.exports = initPlugin
