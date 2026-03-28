#pragma once

#include "patches.h"
#include <optional>
#include <vector>

namespace peacock {
    class Scanner {
    public:
        /// Search `data` for the given hex pattern with wildcard support.
        /// Pattern format: hex bytes separated by spaces, '?' for single-byte
        /// wildcard. e.g., "1F 20 03 D5 ? ? 00 91"
        /// `alignment` is the byte alignment for the first byte of the pattern.
        /// Returns all matching offsets.
        static std::vector<int> find_pattern(const std::vector<uint8_t> &data,
                                             uint8_t alignment,
                                             const std::string &pattern);

        /// Attempt to identify the HITMAN version by scanning the process memory
        /// for known byte patterns. Returns a HitmanVersion if all required
        /// patterns are found exactly once.
        static std::optional<HitmanVersion>
        scan_for_version(const std::vector<uint8_t> &exe_data);
    };
}
