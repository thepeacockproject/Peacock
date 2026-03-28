#include "patcher.h"
#include "log.h"
#include "memory.h"
#include "process.h"
#include "scanner.h"
#include "version.h"

namespace peacock {
    /// Identify the game version, falling back to AOB scanning if needed.
    static const HitmanVersion *identify_version(const mach_port_t task,
                                                 const uint64_t base_address,
                                                 const uint64_t image_size) {
        const uint32_t identifier = Version::get_identifier(task, base_address);

        if (identifier != 0) {
            if (const auto *version = PatchRegistry::instance().find_version(identifier))
                return version;
        }

        // Fallback: AOB scan
        if (image_size == 0)
            return nullptr;

        log("Unknown version (id: 0x" + to_hex(identifier, 8) +
            "), attempting AOB scan...");

        std::vector<uint8_t> exe_data(image_size);
        if (!Memory::read(task, base_address, exe_data.data(), image_size))
            return nullptr;

        auto scanned = Scanner::scan_for_version(exe_data);
        if (!scanned)
            return nullptr;

        if (identifier != 0) {
            PatchRegistry::instance().add_version(identifier, std::move(*scanned));
            return PatchRegistry::instance().find_version(identifier);
        }

        return new HitmanVersion(std::move(*scanned));
    }

    /// Collect patches to apply based on user options.
    static std::vector<const Patch *> collect_patches(const HitmanVersion &version,
                                                      const PatchOptions &options) {
        std::vector<const Patch *> patches;

        auto append = [&](const std::vector<Patch> &src) {
            for (const auto &p: src)
                patches.push_back(&p);
        };

        if (options.disable_cert_pinning)
            append(version.certpin);
        if (options.always_send_auth_header)
            append(version.authheader);
        if (options.set_custom_config_domain)
            append(version.configdomain);
        if (options.use_http)
            append(version.protocol);
        if (options.enable_dynamic_resources)
            append(version.dynres_enable);
        if (options.disable_force_offline_on_failed_dynres)
            append(version.dynres_noforceoffline);

        return patches;
    }

    /// Write patches into the target process memory.
    static bool apply_patches(const mach_port_t task,
                              const uint64_t base_address,
                              const std::vector<const Patch *> &patches,
                              const std::vector<uint8_t> &url_bytes) {
        for (const Patch *patch: patches) {
            const std::vector<uint8_t> &data_to_write =
                    (patch->custom_patch == "configdomain")
                        ? url_bytes
                        : patch->replacement;

            const mach_vm_address_t addr = base_address + patch->offset;

            // Make memory writable.
            // VM_PROT_COPY triggers COW, bypassing code-signing protection
            // on __TEXT pages.
            vm_prot_t old_prot;
            constexpr vm_prot_t new_prot = VM_PROT_READ | VM_PROT_WRITE | VM_PROT_COPY;

            if (!Memory::protect(task, addr, data_to_write.size(), new_prot,
                                 &old_prot)) {
                log("Failed to change protection at offset 0x" +
                    to_hex(patch->offset));
                return false;
            }

            if (!Memory::write(task, addr, data_to_write.data(),
                               data_to_write.size())) {
                log("Failed to write at offset 0x" + to_hex(patch->offset));
                Memory::protect(task, addr, data_to_write.size(), old_prot, nullptr);
                return false;
            }

            // Restore original protection
            Memory::protect(task, addr, data_to_write.size(), old_prot, nullptr);
        }
        return true;
    }

    void Patcher::patch_all_processes(const PatchOptions &options) {
        const auto processes = Process::find_hitman_processes();

        for (auto &proc: processes) {
            if (patched_pids_.contains(proc.pid))
                continue;

            patched_pids_.insert(proc.pid);

            const pid_t parent = Process::get_parent_pid(proc.pid);

            // Skip error reporter child processes (same as C# logic)
            if (patched_pids_.contains(parent)) {
                log("Skipping PID " + std::to_string(proc.pid) +
                    " (child of patched process)");
                continue;
            }

            // Get base address info
            uint64_t base = 0, size = 0;
            if (!Process::get_main_image_info(proc.pid, base, size)) {
                log("Failed to get image info for PID " +
                    std::to_string(proc.pid));
                patched_pids_.erase(proc.pid);
                continue;
            }

            if (patch_process(proc.pid, base, size, options)) {
                log("Successfully patched PID " + std::to_string(proc.pid));
                if (options.set_custom_config_domain) {
                    log("Injected server: " + options.custom_config_domain);
                }
            } else {
                // Not ready yet, try again next tick
                patched_pids_.erase(proc.pid);
            }
        }
    }

    void Patcher::reset() { patched_pids_.clear(); }

    bool Patcher::patch_process(const pid_t pid,
                                const uint64_t base_address,
                                const uint64_t image_size,
                                const PatchOptions &options) {
        mach_port_t task;
        if (!Memory::open_task(pid, task))
            return false;

        const HitmanVersion *version = identify_version(task, base_address, image_size);
        if (!version) {
            log("Failed to identify game version for PID " +
                std::to_string(pid));
            Memory::close_task(task);
            return false;
        }

        const auto patches = collect_patches(*version, options);

        // Build the custom URL bytes (must fit in the configdomain buffer)
        static constexpr size_t kMaxConfigDomainLen = 256;
        const std::string &url = options.custom_config_domain;
        if (url.size() >= kMaxConfigDomainLen) {
            log("Custom config domain too long (" + std::to_string(url.size()) +
                " bytes, max " + std::to_string(kMaxConfigDomainLen - 1) + ")");
            Memory::close_task(task);
            return false;
        }
        std::vector<uint8_t> url_bytes(url.begin(), url.end());
        url_bytes.push_back(0x00);

        const bool ok = apply_patches(task, base_address, patches, url_bytes);

        Memory::close_task(task);
        return ok;
    }
}
