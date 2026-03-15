#pragma once

#include <string>
#include <unordered_map>
#include <vector>

#include <mach/vm_prot.h>

namespace peacock {
    struct Patch {
        uint64_t offset;
        std::vector<uint8_t> original;
        std::vector<uint8_t> replacement;
        vm_prot_t default_protection;
        std::string custom_patch; // "configdomain" for URL injection

        Patch(const uint64_t off,
              std::vector<uint8_t> orig,
              std::vector<uint8_t> repl,
              const vm_prot_t prot,
              std::string custom = "")
            : offset(off), original(std::move(orig)),
              replacement(std::move(repl)), default_protection(prot),
              custom_patch(std::move(custom)) {
        }
    };

    struct HitmanVersion {
        std::string name;
        std::vector<Patch> certpin;
        std::vector<Patch> authheader;
        std::vector<Patch> configdomain;
        std::vector<Patch> protocol;
        std::vector<Patch> dynres_noforceoffline;
        std::vector<Patch> dynres_enable;
    };

    /// Registry of known game versions. Keyed by a version identifier
    /// (e.g., Mach-O UUID hash or CRC of a fixed region).
    class PatchRegistry {
    public:
        static PatchRegistry &instance();

        void add_version(uint32_t identifier, HitmanVersion version);

        [[nodiscard]] const HitmanVersion *find_version(uint32_t identifier) const;

    private:
        PatchRegistry();

        std::unordered_map<uint32_t, HitmanVersion> versions_;
    };

    // TODO: populate when ARM64 patterns are captured from the macOS binary.
    // These will mirror the C# PatchDefinitions/*.cs files but with ARM64
    // instruction patterns.
    //
    // ARM64 differences from x86_64:
    //   - NOP: D5 03 20 1F (4 bytes, little-endian: 1F 20 03 D5)
    //   - Conditional branch (B.cond) -> unconditional (B) or NOP
    //   - ADRP+ADD pairs for PC-relative addressing
    //   - Fixed 4-byte instruction width
} // namespace peacock
