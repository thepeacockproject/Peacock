describe("vitest", () => {
    /**
     * This test will verify if globals are configured correctly
     */
    it("globals", () => {
        const result =
            !PEACOCK_DEV && HUMAN_VERSION === "test" && REV_IDENT === 1

        expect(result).toBe(true)
    })
})

export {}
