#include "process.h"

#include <libproc.h>
#include <mach-o/dyld_images.h>
#include <mach-o/loader.h>
#include <mach/mach.h>
#include <mach/mach_vm.h>
#include <sys/sysctl.h>

namespace peacock {
    static const char *kProcessNames[] = {
        "Hitman WOA", // macOS CFBundleExecutable
        nullptr,
    };

    static bool is_hitman_process(const char *name, const char *path) {
        for (const char **pn = kProcessNames; *pn; pn++) {
            if (strcasecmp(name, *pn) == 0)
                return true;
        }

        // Also match if the path contains the bundle identifier
        return strstr(path, "dk.ioi.ios.hitman") != nullptr;
    }

    /// Read the base address of the main executable from dyld image infos.
    static bool get_dyld_main_image_base(const mach_port_t task,
                                         uint64_t &base_address) {
        task_dyld_info_data_t dyld_info{};
        mach_msg_type_number_t count = TASK_DYLD_INFO_COUNT;
        kern_return_t kr = task_info(task, TASK_DYLD_INFO,
                                     reinterpret_cast<task_info_t>(&dyld_info), &count);
        if (kr != KERN_SUCCESS)
            return false;

        // Read the dyld_all_image_infos structure
        dyld_all_image_infos all_infos{};
        mach_vm_size_t out_size = sizeof(all_infos);
        kr = mach_vm_read_overwrite(
            task, dyld_info.all_image_info_addr, sizeof(all_infos),
            reinterpret_cast<mach_vm_address_t>(&all_infos), &out_size);
        if (kr != KERN_SUCCESS)
            return false;

        if (all_infos.infoArrayCount == 0)
            return false;

        // The first image in the array is the main executable
        dyld_image_info first_image{};
        out_size = sizeof(first_image);
        kr = mach_vm_read_overwrite(
            task, reinterpret_cast<mach_vm_address_t>(all_infos.infoArray),
            sizeof(first_image),
            reinterpret_cast<mach_vm_address_t>(&first_image), &out_size);
        if (kr != KERN_SUCCESS)
            return false;

        base_address = reinterpret_cast<uint64_t>(first_image.imageLoadAddress);
        return true;
    }

    /// Walk Mach-O load commands to compute total mapped image size.
    /// Excludes __PAGEZERO (unmapped guard page). Segment vmaddrs are
    /// pre-slide, but the *span* (max - min) is slide-invariant.
    static bool compute_image_size(const mach_port_t task,
                                   const uint64_t base_address,
                                   uint64_t &image_size) {
        mach_header_64 header{};
        mach_vm_size_t out_size = sizeof(header);
        kern_return_t kr = mach_vm_read_overwrite(
            task, base_address, sizeof(header),
            reinterpret_cast<mach_vm_address_t>(&header), &out_size);
        if (kr != KERN_SUCCESS || header.magic != MH_MAGIC_64)
            return false;

        uint64_t min_addr = UINT64_MAX;
        uint64_t max_addr = 0;
        uint64_t cmd_offset = base_address + sizeof(header);

        for (uint32_t i = 0; i < header.ncmds; i++) {
            load_command lc{};
            out_size = sizeof(lc);
            kr = mach_vm_read_overwrite(
                task, cmd_offset, sizeof(lc),
                reinterpret_cast<mach_vm_address_t>(&lc), &out_size);
            if (kr != KERN_SUCCESS)
                break;

            if (lc.cmd == LC_SEGMENT_64) {
                segment_command_64 seg{};
                out_size = sizeof(seg);
                mach_vm_read_overwrite(
                    task, cmd_offset, sizeof(seg),
                    reinterpret_cast<mach_vm_address_t>(&seg), &out_size);

                // skip __PAGEZERO — it's a non-readable guard region
                if (strcmp(seg.segname, SEG_PAGEZERO) == 0) {
                    cmd_offset += lc.cmdsize;
                    continue;
                }

                if (seg.vmaddr < min_addr)
                    min_addr = seg.vmaddr;
                const uint64_t seg_end = seg.vmaddr + seg.vmsize;
                if (seg_end > max_addr)
                    max_addr = seg_end;
            }
            cmd_offset += lc.cmdsize;
        }

        if (max_addr <= min_addr)
            return false;

        image_size = max_addr - min_addr;
        return true;
    }

    std::vector<ProcessInfo> Process::find_hitman_processes() {
        std::vector<ProcessInfo> results;

        int count = proc_listallpids(nullptr, 0);
        if (count <= 0)
            return results;

        std::vector<pid_t> pids(count);
        count = proc_listallpids(pids.data(),
                                 static_cast<int>(pids.size() * sizeof(pid_t)));

        for (int i = 0; i < count; i++) {
            char path[PROC_PIDPATHINFO_MAXSIZE];
            if (proc_pidpath(pids[i], path, sizeof(path)) <= 0)
                continue;

            const char *name = strrchr(path, '/');
            name = name ? name + 1 : path;

            if (!is_hitman_process(name, path))
                continue;

            ProcessInfo info;
            info.pid = pids[i];
            info.name = name;
            info.path = path;
            info.base_address = 0;
            info.image_size = 0;
            results.push_back(info);
        }

        return results;
    }

    pid_t Process::get_parent_pid(const pid_t pid) {
        kinfo_proc kp{};
        size_t len = sizeof(kp);
        int mib[4] = {CTL_KERN, KERN_PROC, KERN_PROC_PID, pid};

        if (sysctl(mib, 4, &kp, &len, nullptr, 0) == 0) {
            return kp.kp_eproc.e_ppid;
        }
        return -1;
    }

    bool Process::get_main_image_info(const pid_t pid,
                                      uint64_t &base_address,
                                      uint64_t &image_size) {
        mach_port_t task = MACH_PORT_NULL;
        const kern_return_t kr = task_for_pid(mach_task_self(), pid, &task);
        if (kr != KERN_SUCCESS)
            return false;

        if (!get_dyld_main_image_base(task, base_address)) {
            mach_port_deallocate(mach_task_self(), task);
            return false;
        }

        compute_image_size(task, base_address, image_size);

        mach_port_deallocate(mach_task_self(), task);
        return true;
    }
}
