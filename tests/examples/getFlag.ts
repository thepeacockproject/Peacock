/* eslint-disable @typescript-eslint/no-unused-vars */
import * as flags from "../flags"

/**
 * Always return false when a flag is requested
 */
function getFlagExample1() {
    const getFlag = vi.spyOn(flags, "getFlag").mockReturnValue(false)

    expect(getFlag).toHaveBeenCalledWith("officialAuthentication")
}

/**
 * Return specific values based on the requested flag
 */
function getFlagExample2() {
    const getFlag = vi.spyOn(flags, "getFlag").mockImplementation((flag) => {
        switch (flag) {
            case "officialAuthentication":
                return false

            default:
                return true
        }
    })

    expect(getFlag).toHaveBeenCalledWith("officialAuthentication")
}
