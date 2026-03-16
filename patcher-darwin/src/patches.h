#pragma once

#include <string>
#include <unordered_map>
#include <vector>

#include <mach/vm_prot.h>

namespace peacock {
    constexpr std::vector<uint8_t> str_bytes(const char *s) {
        std::vector<uint8_t> v;
        while (*s) v.push_back(static_cast<uint8_t>(*s++));
        return v;
    }

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

}
