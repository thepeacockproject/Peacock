import path from "path"
import { defineConfig } from "vitest/config"
import { Plugin } from "vite"

function dontLoadJsonPlugin() {
    const pluginName = "dontLoadJsonPlugin"
    const resolvedIdPrefix = `\0${pluginName}:`
    const jsonRegex = /\.json$/

    return <Plugin>{
        name: pluginName,
        enforce: "pre",
        resolveId(id: string, importer: string) {
            if (id.startsWith("\0") || !jsonRegex.test(id)) {
                return null
            }

            const filePath = path.join(path.dirname(importer), id)

            return `${resolvedIdPrefix}${filePath}`
        },
        load(id: string) {
            if (!id.startsWith(resolvedIdPrefix) || !jsonRegex.test(id)) {
                return null
            }

            return `export default "\\"${id.substring(
                resolvedIdPrefix.length,
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
