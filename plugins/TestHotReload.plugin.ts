import { log, LogLevel } from "../components/loggingInterop"
import { Controller, IPlugin } from "../components/controller"
import { Intercept } from "../components/hooksImpl"

class TestHotReloadPlugin implements IPlugin {
    private controller: Controller

    public get name() {
        return "TestHotReloadPlugin"
    }

    constructor(controller: Controller) {
        this.controller = controller

        this.init()
    }

    private init(): void {
        log(LogLevel.DEBUG, `[${this.name}] Loading...`)

        const interceptor: Intercept<[], void> = {
            name: `${this.name}_ServerStart_Interceptor`,
            call: () => {
                log(LogLevel.DEBUG, `[${this.name}] interceptor called!`)
            },
            tap: () => {
                log(LogLevel.DEBUG, `[${this.name}] interceptor tapped!`)
            },
        }
        this.controller.hooks.serverStart.intercept(interceptor)

        this.controller.hooks.serverStart.tap(
            `${this.name}_ServerStart_Tap`,
            () => {
                log(LogLevel.DEBUG, `[${this.name}] hook called!`)
            },
        )

        this.controller.hooks.serverStart.call()

        log(LogLevel.INFO, `[${this.name}] Loaded!`)
    }

    public unload(): boolean {
        log(LogLevel.DEBUG, `[${this.name}] Unloading...`)

        let result = this.controller.hooks.serverStart.removeInterceptor(
            `${this.name}_ServerStart_Interceptor`,
        )
        result &&= this.controller.hooks.serverStart.untap(
            `${this.name}_ServerStart_Tap`,
        )

        log(LogLevel.INFO, `[${this.name}] Unloaded!`)

        return result
    }
}

function initPlugin(controller: Controller): void | IPlugin {
    if (!controller.runningInTestMode()) {
        return
    }

    return new TestHotReloadPlugin(controller)
}

module.exports = initPlugin
