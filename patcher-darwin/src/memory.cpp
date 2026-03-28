#include "memory.h"
#include <cstdio>

namespace peacock {
    bool Memory::open_task(const pid_t pid, mach_port_t &task) {
        const kern_return_t kr = task_for_pid(mach_task_self(), pid, &task);

        if (kr != KERN_SUCCESS) {
            fprintf(stderr, "task_for_pid(%d) failed: %s (0x%x)\n", pid,
                    mach_error_string(kr), kr);

            if (kr == KERN_FAILURE) {
                fprintf(stderr,
                        "Hint: run with sudo, or disable SIP if targeting "
                        "an iOS-on-Mac app.\n");
            }
            return false;
        }
        return true;
    }

    void Memory::close_task(const mach_port_t task) {
        mach_port_deallocate(mach_task_self(), task);
    }

    bool Memory::read(const mach_port_t task,
                      const mach_vm_address_t address,
                      void *buffer,
                      const mach_vm_size_t size) {
        mach_vm_size_t out_size = size;
        const kern_return_t kr = mach_vm_read_overwrite(
            task, address, size, reinterpret_cast<mach_vm_address_t>(buffer),
            &out_size);

        if (kr != KERN_SUCCESS) {
            fprintf(stderr, "mach_vm_read_overwrite(0x%llx, %llu) failed: %s\n",
                    address, size, mach_error_string(kr));
            return false;
        }
        return true;
    }

    bool Memory::write(const mach_port_t task,
                       const mach_vm_address_t address,
                       const void *buffer,
                       const mach_vm_size_t size) {
        const kern_return_t kr = mach_vm_write(
            task, address, reinterpret_cast<vm_offset_t>(buffer),
            static_cast<mach_msg_type_number_t>(size));

        if (kr != KERN_SUCCESS) {
            fprintf(stderr, "mach_vm_write(0x%llx, %llu) failed: %s\n", address,
                    size, mach_error_string(kr));
            return false;
        }
        return true;
    }

    bool Memory::protect(const mach_port_t task,
                         const mach_vm_address_t address,
                         const mach_vm_size_t size,
                         const vm_prot_t new_prot,
                         vm_prot_t *old_prot) {
        // Read current protection first if caller wants it
        if (old_prot) {
            vm_region_basic_info_data_64_t info;
            mach_msg_type_number_t count = VM_REGION_BASIC_INFO_COUNT_64;
            mach_vm_address_t region_addr = address;
            mach_vm_size_t region_size = 0;
            mach_port_t object_name;

            const kern_return_t kr = mach_vm_region(
                task, &region_addr, &region_size, VM_REGION_BASIC_INFO_64,
                reinterpret_cast<vm_region_info_t>(&info), &count, &object_name);

            if (kr == KERN_SUCCESS) {
                *old_prot = info.protection;
                if (object_name != MACH_PORT_NULL)
                    mach_port_deallocate(mach_task_self(), object_name);
            } else {
                *old_prot = VM_PROT_NONE;
            }
        }

        const kern_return_t kr =
                mach_vm_protect(task, address, size, FALSE, new_prot);

        if (kr != KERN_SUCCESS) {
            fprintf(stderr, "mach_vm_protect(0x%llx, %llu, 0x%x) failed: %s\n",
                    address, size, new_prot, mach_error_string(kr));
            return false;
        }
        return true;
    }
}
