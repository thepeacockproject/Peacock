import { log, LogLevel } from "../components/loggingInterop"
import { Controller, IPlugin } from "../components/controller"

class TestNormalPlugin {
    private name = "TestNormalPlugin"

    constructor() {
        this.init()
    }

    private init(): void {
        log(LogLevel.DEBUG, `[${this.name}] Loading...`)

        log(LogLevel.INFO, `[${this.name}] Loaded!`)
    }
}

function initPlugin(controller: Controller): void | IPlugin {
    if (!controller.runningInTestMode()) {
        return
    }

    new TestNormalPlugin()
}

module.exports = initPlugin
