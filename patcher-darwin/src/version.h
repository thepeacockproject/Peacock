#pragma once

#include <mach/mach.h>

namespace peacock {
    class Version {
    public:
        /// Read a version identifier from the Mach-O header of the main image
        /// in the target process. Returns 0 on failure.
        ///
        /// Currently: computes a CRC32 of the Mach-O UUID (LC_UUID load command).
        /// If LC_UUID is not found, falls back to CRC32 of the first 4KB of
        /// __TEXT.
        static uint32_t get_identifier(mach_port_t task,
                                       uint64_t base_address);
    };
}
