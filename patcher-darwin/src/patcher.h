#pragma once

#include "settings.h"
#include <set>

namespace peacock {
    class Patcher {
    public:
        /// Scan for HITMAN processes and patch any that haven't been patched yet.
        void patch_all_processes(const PatchOptions &options);

        /// Clear the set of patched PIDs (to force re-patching).
        void reset();

    private:
        /// Patch a single process. Returns true on success.
        static bool patch_process(pid_t pid,
                                  uint64_t base_address,
                                  uint64_t image_size,
                                  const PatchOptions &options);

        std::set<pid_t> patched_pids_;
    };
} // namespace peacock
