const typescriptEslint = require("@typescript-eslint/eslint-plugin")
const promise = require("eslint-plugin-promise")
const reactHooks = require("eslint-plugin-react-hooks")
const peacockproject = require("@peacockproject/eslint-plugin")

const { fixupPluginRules } = require("@eslint/compat")

const globals = require("globals")
const tsParser = require("@typescript-eslint/parser")
const js = require("@eslint/js")

const { FlatCompat } = require("@eslint/eslintrc")

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
})

module.exports = [
    {
        ignores: [
            "packaging",
            "**/*.d.ts",
            ".yarn",
            "build",
            "**/chunk*.js",
            "**/chunk*.mjs",
            "webui/dist",
            "**/*.plugin.js",
            "**/*Plugin.js",
            "tests/testData/scripts",
            "eslint.config.cjs",
            "resources",
        ],
    },
    ...compat.extends(
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
    ),
    {
        plugins: {
            "@typescript-eslint": typescriptEslint,
            promise,
            "react-hooks": fixupPluginRules(reactHooks),
            "@peacockproject": peacockproject,
        },

        linterOptions: {
            reportUnusedDisableDirectives: true,
        },

        languageOptions: {
            globals: {
                ...globals.node,
            },

            parser: tsParser,
            ecmaVersion: 22,
            sourceType: "module",

            parserOptions: {
                project: [
                    "./tsconfig.json",
                    "./webui/tsconfig.json",
                    "./tests/tsconfig.json",
                ],
            },
        },

        rules: {
            "@typescript-eslint/prefer-optional-chain": "warn",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/no-extra-semi": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/require-await": "warn",
            "@typescript-eslint/prefer-ts-expect-error": "error",
            "no-nested-ternary": "warn",
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
                {
                    markers: ["*", "@__NOINLINE__"],
                },
            ],
        },
    },
]
