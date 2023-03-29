Object.assign(globalThis, {
    PEACOCK_DEV: false,
    HUMAN_VERSION: "test",
    REV_IDENT: 1,
})

process.env.TEST = "peacock"
process.env.LOG_LEVEL_FILE = "none"

export {}
