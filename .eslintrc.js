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

module.exports = {
    env: {
        node: true,
        es2021: true,
    },
    plugins: [
        "@typescript-eslint",
        "promise",
        "react-hooks",
        "@peacockproject",
    ],
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: "es2022",
        sourceType: "module",
        project: [
            // server full
            "./tsconfig.json",
            // plugins
            "./plugins/tsconfig.json",
            // web UI
            "./webui/tsconfig.json",
            // tests
            "./tests/tsconfig.json",
        ],
    },
    rules: {
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-extra-semi": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/require-await": "warn",
        "@typescript-eslint/prefer-ts-expect-error": "error",
        eqeqeq: "error",
        "no-duplicate-imports": "warn",
        "promise/always-return": "error",
        "promise/no-return-wrap": "error",
        "promise/param-names": "error",
        "promise/catch-or-return": "error",
        "promise/no-native": "off",
        "promise/no-nesting": "warn",
        "promise/no-promise-in-callback": "warn",
        "promise/no-callback-in-promise": "warn",
        "promise/avoid-new": "off",
        "promise/no-new-statics": "error",
        "promise/no-return-in-finally": "warn",
        "promise/valid-params": "warn",
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
        "@peacockproject/import-components": "error",
        "padding-line-between-statements": [
            "error",
            {
                blankLine: "always",
                prev: "block-like",
                next: "*",
            },
            {
                blankLine: "always",
                prev: "*",
                next: "block-like",
            },
            {
                blankLine: "never",
                prev: "block-like",
                next: "case",
            },
            {
                blankLine: "never",
                prev: "case",
                next: "block-like",
            },
        ],
        "spaced-comment": [
            "error",
            "always",
            { markers: ["*", "@__NOINLINE__"] },
        ],
    },
    reportUnusedDisableDirectives: true,
}
