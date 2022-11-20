import * as configSwizzleManager from "../../components/configSwizzleManager"
import { readFileSync } from "fs"

const originalFilePaths: Record<string, string> = {}

Object.keys(configSwizzleManager.configs).forEach((config: string) => {
    originalFilePaths[config] = <string>configSwizzleManager.configs[config]

    configSwizzleManager.configs[config] = undefined
})

export function loadConfig(config: string) {
    if (!originalFilePaths[config]) {
        return
    }

    const contents = readFileSync(originalFilePaths[config], "utf-8")

    configSwizzleManager.configs[config] = JSON.parse(contents)
}

export function setConfig(config: string, data: unknown) {
    configSwizzleManager.configs[config] = data
}

const getConfigOriginal = configSwizzleManager.getConfig
vi.spyOn(configSwizzleManager, "getConfig").mockImplementation(
    (config: string, clone: boolean) => {
        if (!configSwizzleManager.configs[config]) {
            throw `Config '${config}' has not been loaded!`
        }

        return getConfigOriginal(config, clone)
    },
)
