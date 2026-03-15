#include "patches.h"

namespace peacock {
    PatchRegistry &PatchRegistry::instance() {
        static PatchRegistry reg;
        return reg;
    }

    PatchRegistry::PatchRegistry() {
        // TODO: register known macOS ARM64 versions here once patterns are captured from the binary.
    }

    void PatchRegistry::add_version(uint32_t identifier, HitmanVersion version) {
        versions_.emplace(identifier, std::move(version));
    }

    const HitmanVersion *
    PatchRegistry::find_version(const uint32_t identifier) const {
        const auto it = versions_.find(identifier);
        if (it != versions_.end())
            return &it->second;
        return nullptr;
    }
} // namespace peacock
