#pragma once

#include <set>
#include <string>
#include <sys/types.h>

namespace peacock {
    struct PatchOptions {
        bool disable_cert_pinning = true;
        bool always_send_auth_header = true;
        bool set_custom_config_domain = true;
        std::string custom_config_domain = "127.0.0.1";
        bool use_http = true;
        bool enable_dynamic_resources = true;
        bool disable_force_offline_on_failed_dynres = true;
    };

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
}
