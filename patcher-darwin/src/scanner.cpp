#include "scanner.h"
#include "log.h"

namespace peacock {
    // ARM64 instructions are 4-byte aligned; use step of 4 instead of 16
    // to avoid missing patterns. The C# version uses 16 for x86_64.
    static constexpr int kArm64InstructionAlignment = 4;

    // NOP instruction (ARM64)
    static constexpr uint8_t kNop[] = {0x1F, 0x20, 0x03, 0xD5};

    // Distance from the configdomain string buffer to the dynres config variables.
    static constexpr int64_t kDynresEnableOffsetFromConfig = -0x40;
    static constexpr int64_t kDynresNoforceofflineOffsetFromConfig = -0x20;

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

    /// Search for all occurrences of a null-terminated string in the binary.
    /// Uses byte-level scanning (no alignment requirement).
    static std::vector<uint64_t> find_string(const std::vector<uint8_t> &data,
                                             const char *str) {
        std::vector<uint64_t> results;
        const size_t len = strlen(str);
        if (len == 0 || data.size() < len + 1)
            return results;

        const size_t end = data.size() - len;
        for (size_t i = 0; i < end; i++) {
            if (data[i] == static_cast<uint8_t>(str[0]) &&
                memcmp(&data[i], str, len + 1) == 0) {
                // include null terminator
                results.push_back(i);
            }
        }
        return results;
    }

    /// Encode an ARM64 unconditional branch (B) instruction with the given
    /// signed offset in bytes (must be 4-byte aligned).
    constexpr std::vector<uint8_t> encode_arm64_b(const int32_t byte_offset) {
        const int32_t imm26 = byte_offset >> 2;
        const uint32_t word = 0x14000000u | (imm26 & 0x03FFFFFFu);
        return {
            static_cast<uint8_t>(word),
            static_cast<uint8_t>(word >> 8),
            static_cast<uint8_t>(word >> 16),
            static_cast<uint8_t>(word >> 24),
        };
    }

    /// Extract the branch offset (in bytes) from a TBNZ/TBZ instruction.
    static int32_t decode_tbnz_offset(const uint8_t *bytes) {
        uint32_t word;
        memcpy(&word, bytes, kArm64InstructionAlignment);
        auto imm14 = static_cast<int32_t>((word >> 5) & 0x3FFF);
        // Sign-extend from 14 bits
        if (imm14 & 0x2000)
            imm14 |= ~0x3FFF;
        return imm14 << 2;
    }

    /// Read a 4-byte vector from the binary data at the given offset.
    static std::vector<uint8_t> read_bytes(const std::vector<uint8_t> &data,
                                           const uint64_t offset) {
        return {
            // ReSharper disable once CppRedundantCastExpression
            data.begin() + static_cast<ptrdiff_t>(offset),
            // ReSharper disable once CppRedundantCastExpression
            data.begin() + static_cast<ptrdiff_t>(offset + kArm64InstructionAlignment)
        };
    }

    std::optional<HitmanVersion>
    Scanner::scan_for_version(const std::vector<uint8_t> &exe_data) {
        log("Starting AOB scan (" + std::to_string(exe_data.size()) + " bytes)...");

        // In mbedtls_ssl_parse_certificate, after x509_verify_cert, the code
        // checks the authmode and verification result:
        //   cmp  w24, #0x2           ; 1F 0B 00 71
        //   eor  w8, w23, #0x1       ; E8 02 00 52
        //   csinc w8, w8, wzr, eq    ; 08 05 9F 1A
        //   tbnz w8, #0, +??         ; ?? ?? 00 37  ← patch target
        //
        // We patch the tbnz → unconditional branch (b) to always skip cert
        // verification failures.

        auto certpin_matches = find_pattern(exe_data, 0,
                                            "1F 0B 00 71 E8 02 00 52 08 05 9F 1A ? ? 00 37");

        if (certpin_matches.size() != 1) {
            log("AOB scan failed: certpin pattern found " +
                std::to_string(certpin_matches.size()) + " matches (expected 1)");
            return std::nullopt;
        }

        const uint64_t certpin_offset = certpin_matches[0] + 12;

        // Build replacement: same branch target, but unconditional
        const int32_t certpin_branch_offset =
                decode_tbnz_offset(&exe_data[certpin_offset]);
        auto certpin_orig = read_bytes(exe_data, certpin_offset);
        auto certpin_repl = encode_arm64_b(certpin_branch_offset);

        // In the HTTP request header builder, two conditional branches gate
        // Authorization header injection:
        //
        //   bl   isHttps             ; ?? ?? ?? 94
        //   cbz  w0, +??             ; ?? ?? ?? 34  ← patch 1 (NOP)
        //   mov  x0, x19             ; E0 03 13 AA
        //   bl   authStateCheck      ; ?? ?? ?? 94
        //   eor  w8, w0, #0x1        ; 08 00 00 52
        //   orr  w8, w21, w8         ; A8 02 08 2A
        //   tbnz w8, #0, +??         ; ?? ?? 00 37  ← patch 2 (NOP)
        //
        // We anchor on the distinctive mov+bl+eor+orr+tbnz sequence,
        // then derive the cbz position (4 bytes before the mov).

        auto auth_matches = find_pattern(exe_data, 0,
                                         "E0 03 13 AA ? ? ? 94 08 00 00 52 A8 02 08 2A ? ? 00 37");

        if (auth_matches.size() != 1) {
            log("AOB scan failed: authheader pattern found " +
                std::to_string(auth_matches.size()) + " matches (expected 1)");
            return std::nullopt;
        }

        const uint64_t auth1_offset = auth_matches[0] - 4; // cbz before mov
        const uint64_t auth2_offset = auth_matches[0] + 16; // tbnz at end

        auto auth1_orig = read_bytes(exe_data, auth1_offset);
        auto auth2_orig = read_bytes(exe_data, auth2_offset);

        // Verify the cbz: byte 3 should be 0x34 (CBZ w-register)
        if (auth1_orig[3] != 0x34) {
            log("AOB scan failed: expected CBZ at authheader patch 1 "
                "(got 0x" + std::to_string(auth1_orig[3]) + ")");
            return std::nullopt;
        }

        auto protocol_matches = find_string(exe_data, "https://{0}");

        if (protocol_matches.empty()) {
            log("AOB scan failed: protocol string \"https://{0}\" not found");
            return std::nullopt;
        }

        const uint64_t protocol_offset = protocol_matches.front();

        // "config.hitman.io" appears twice:
        //   1. In __cstring (read-only literal) — lower address
        //   2. In __common (writable buffer, strncpy'd at init) — higher address
        // We want the writable buffer (last occurrence).

        auto config_matches = find_string(exe_data, "config.hitman.io");

        if (config_matches.size() < 2) {
            log("AOB scan failed: config.hitman.io found " +
                std::to_string(config_matches.size()) + " times (expected >= 2)");
            return std::nullopt;
        }

        const uint64_t configdomain_offset = config_matches.back();

        // The ZConfigInt variables for OnlineResources_Disable and
        // OnlineResources_ForceOfflineOnFailure are at fixed offsets relative
        // to the configdomain buffer.

        const uint64_t dynres_enable_offset =
                configdomain_offset + kDynresEnableOffsetFromConfig;
        const uint64_t dynres_noforceoffline_offset =
                configdomain_offset + kDynresNoforceofflineOffsetFromConfig;

        // Sanity check: dynres_enable should be initialized to 1
        if (dynres_enable_offset + 4 > exe_data.size()) {
            log("AOB scan failed: dynres_enable offset out of bounds");
            return std::nullopt;
        }

        uint32_t dynres_val;
        memcpy(&dynres_val, &exe_data[dynres_enable_offset], 4);
        if (dynres_val != 1) {
            log("AOB scan failed: dynres_enable value is " +
                std::to_string(dynres_val) + " (expected 1)");
            return std::nullopt;
        }

        log("AOB scan succeeded:");
        log("  certpin:               0x" + to_hex(certpin_offset));
        log("  authheader[0] (cbz):   0x" + to_hex(auth1_offset));
        log("  authheader[1] (tbnz):  0x" + to_hex(auth2_offset));
        log("  protocol:              0x" + to_hex(protocol_offset));
        log("  configdomain:          0x" + to_hex(configdomain_offset));
        log("  dynres_enable:         0x" + to_hex(dynres_enable_offset));
        log("  dynres_noforceoffline: 0x" + to_hex(dynres_noforceoffline_offset));

        static const std::vector nop(kNop, kNop + kArm64InstructionAlignment);

        HitmanVersion version;
        version.name = "Unknown (AOB Scanned)";

        version.certpin = {
            Patch(certpin_offset, certpin_orig, certpin_repl,
                  VM_PROT_READ | VM_PROT_EXECUTE),
        };

        version.authheader = {
            Patch(auth1_offset, auth1_orig, nop,
                  VM_PROT_READ | VM_PROT_EXECUTE),
            Patch(auth2_offset, auth2_orig, nop,
                  VM_PROT_READ | VM_PROT_EXECUTE),
        };

        version.configdomain = {
            Patch(configdomain_offset, {}, {},
                  VM_PROT_READ | VM_PROT_WRITE, "configdomain"),
        };

        version.protocol = {
            Patch(protocol_offset,
                  str_bytes("https://{0}"),
                  str_bytes("http://{0}a"),
                  VM_PROT_READ),
        };

        version.dynres_noforceoffline = {
            Patch(dynres_noforceoffline_offset,
                  {0x00, 0x00, 0x00, 0x00},
                  {0x00, 0x00, 0x00, 0x00},
                  VM_PROT_READ | VM_PROT_WRITE),
        };

        version.dynres_enable = {
            Patch(dynres_enable_offset,
                  {0x01, 0x00, 0x00, 0x00},
                  {0x00, 0x00, 0x00, 0x00},
                  VM_PROT_READ | VM_PROT_WRITE),
        };

        return version;
    }
}
