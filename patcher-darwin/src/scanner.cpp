#include "scanner.h"

#include <cstdio>

namespace peacock {
    // ARM64 instructions are 4-byte aligned; use step of 4 instead of 16
    // to avoid missing patterns. The C# version uses 16 for x86_64.
    static constexpr int kArm64InstructionAlignment = 4;

    /// Port of AOBScanner.cs findPattern() (lines 575-647).
    /// Pattern format: hex string with '?' wildcards, spaces optional.
    /// e.g., "1F2003D5 ? ? 0091" or "1F 20 03 D5 ? ? 00 91"
    std::vector<int> Scanner::find_pattern(const std::vector<uint8_t> &data,
                                           const uint8_t alignment,
                                           const std::string &pattern) {
        std::vector<int> results;

        // Parse pattern string into bytes and wildcard mask
        std::vector<uint8_t> byte_pattern;
        std::vector<bool> is_wildcard;
        int leading_wildcards = 0;

        // Remove spaces from pattern
        std::string clean;
        for (const char c: pattern) {
            if (c != ' ')
                clean += c;
        }

        bool counting_leading = true;
        for (size_t i = 0; i < clean.size();) {
            if (clean[i] == '?') {
                if (counting_leading) {
                    leading_wildcards++;
                    i++;
                } else {
                    byte_pattern.push_back(0x00);
                    is_wildcard.push_back(true);
                    i++;
                }
            } else {
                counting_leading = false;
                if (i + 1 >= clean.size())
                    break;
                std::string hex_byte = clean.substr(i, 2);
                byte_pattern.push_back(
                    static_cast<uint8_t>(std::stoul(hex_byte, nullptr, 16)));
                is_wildcard.push_back(false);
                i += 2;
            }
        }

        if (byte_pattern.empty())
            return results;

        const int offset = -leading_wildcards;
        const uint8_t effective_alignment = alignment + leading_wildcards;

        const size_t pat_len = byte_pattern.size();
        const size_t search_end = data.size() - pat_len;

        for (size_t i = effective_alignment; i < search_end; i += kArm64InstructionAlignment) {
            if (data[i] != byte_pattern[0])
                continue;

            bool matched = true;
            for (size_t k = 1; k < pat_len; k++) {
                if (!is_wildcard[k] && data[i + k] != byte_pattern[k]) {
                    matched = false;
                    break;
                }
            }

            if (matched) {
                results.push_back(static_cast<int>(i) + offset);
            }
        }

        return results;
    }

    std::optional<HitmanVersion>
    Scanner::scan_for_version(const std::vector<uint8_t> &exe_data) {
        // TODO: implement ARM64 pattern scanning once patterns are captured.
        // This will follow the same structure as AOBScanner.cs
        // TryGetHitmanVersionByScanning:
        //
        // 1. Search for certpin patterns (ARM64 conditional branch -> NOP/uncond)
        // 2. Search for authheader patterns
        // 3. Search for configdomain patterns (ADRP+ADD to data section)
        // 4. Search for protocol patterns (https:// string literal)
        // 5. Search for dynres patterns
        //
        // Each search must find exactly one match to succeed.

        fprintf(stderr, "AOB scanning not yet implemented for ARM64.\n");
        return std::nullopt;
    }
} // namespace peacock
