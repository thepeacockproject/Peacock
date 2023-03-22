import path from "path"
import { defineConfig } from "vitest/config"
import { Plugin } from "vite"

function dontLoadJsonPlugin() {
    const pluginName = "dontLoadJsonPlugin"
    const resolvedIdPrefix = `\0${pluginName}:`
    const jsonRegexResolve = /\.json$/
    const jsonRegexLoad = /\.json.ignore$/
    const ignoreExtension = ".ignore"

    return <Plugin>{
        name: pluginName,
        enforce: "pre",
        resolveId(id: string, importer: string) {
            if (id.startsWith("\0") || !jsonRegexResolve.test(id)) {
                return null
            }

            const filePath = path.join(path.dirname(importer), id)

            return `${resolvedIdPrefix}${filePath}${ignoreExtension}`
        },
        load(id: string) {
            if (!id.startsWith(resolvedIdPrefix) || !jsonRegexLoad.test(id)) {
                return null
            }

            return `export default "\\"${id.substring(
                resolvedIdPrefix.length,
                id.length - ignoreExtension.length,
            )}\\""`
        },
    }
}

export default defineConfig({
    test: {
        globals: true,
        setupFiles: ["tests/setup/globalDefines.ts"],
    },
    plugins: [dontLoadJsonPlugin()],
})
