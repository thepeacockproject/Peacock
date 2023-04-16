/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2023 The Peacock Project Team
 *
 *     This program is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU Affero General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU Affero General Public License for more details.
 *
 *     You should have received a copy of the GNU Affero General Public License
 *     along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import * as e from "esbuild"
import { createRequire } from "module"
import { esbuildPluginLicense } from "./esbuild-plugin-license.mjs"
import { generateRequireTable, packResources } from "./buildTasks.mjs"

const require = createRequire(import.meta.url)

await generateRequireTable()
await packResources()

const { version, revisionIdent } = require("../package.json")

const jsonAsCompressedTextPlugin = {
    name: "jsonAsCompressedTextPlugin",

    setup(build) {
        const fs = require("fs")

        build.onLoad({ filter: /\.json$/ }, async (args) => {
            const text = await fs.promises.readFile(args.path)

            return {
                contents: JSON.stringify(JSON.parse(text)),
                loader: "text",
            }
        })
    },
}

await e.build({
    entryPoints: ["components/index.ts"],
    bundle: true,
    logLevel: "info",
    outfile: "chunk0.js",
    platform: "node",
    target: "es2021",
    minifyIdentifiers: true,
    external: [
        "node-gyp-build-optional-packages",
        "msgpackr-extract",
        "esbuild-wasm",
    ],
    define: {
        PEACOCK_DEV: "false",
        HUMAN_VERSION: `"${version}"`,
        REV_IDENT: `${revisionIdent}`,
        "process.env.DEBUG_MIME": "false",
        "process.env.TESTING_TAR_FAKE_PLATFORM": "undefined",
        "process.env.__TESTING_MKDIRP_PLATFORM__": "undefined",
        "process.env.__TESTING_MKDIRP_NODE_VERSION__": "undefined",
        "process.env.__FAKE_PLATFORM__": "undefined",
        "process.env.VERCEL_GITHUB_COMMIT_SHA": "undefined",
        "process.env.VERCEL_GITLAB_COMMIT_SHA": "undefined",
        "process.env.VERCEL_BITBUCKET_COMMIT_SHA": "undefined",
        "process.env.ZEIT_GITHUB_COMMIT_SHA": "undefined",
        "process.env.ZEIT_BITBUCKET_COMMIT_SHA": "undefined",
        "process.env.VERCEL_GIT_COMMIT_SHA": "undefined",
        "process.env.ZEIT_GITLAB_COMMIT_SHA": "undefined",
    },
    sourcemap: "external",
    plugins: [
        jsonAsCompressedTextPlugin,
        esbuildPluginLicense({
            thirdParty: {
                output: {
                    file: "THIRDPARTYNOTICES.txt",
                },
            },
        }),
    ],
})
