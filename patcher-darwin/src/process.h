#pragma once

#include <string>
#include <sys/types.h>
#include <vector>

namespace peacock {
    struct ProcessInfo {
        pid_t pid;
        std::string name;
        std::string path;
        uint64_t base_address;
        uint64_t image_size;
    };

    class Process {
    public:
        /// Find running HITMAN processes by name.
        static std::vector<ProcessInfo> find_hitman_processes();

        /// Get the parent PID of a process.
        static pid_t get_parent_pid(pid_t pid);

        /// Get the base address and image size of the main executable
        /// in the target process (accounting for ASLR slide).
        static bool get_main_image_info(pid_t pid,
                                        uint64_t &base_address,
                                        uint64_t &image_size);
    };
}
