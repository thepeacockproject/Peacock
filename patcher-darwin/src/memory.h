#pragma once

#include <sys/types.h>
#include <mach/mach.h>
#include <mach/mach_vm.h>

namespace peacock {
    class Memory {
    public:
        /// Acquire a Mach task port for the given PID.
        /// Requires root or the taskgated entitlement.
        static bool open_task(pid_t pid,
                              mach_port_t &task);

        /// Release a Mach task port.
        static void close_task(mach_port_t task);

        /// Read `size` bytes from `address` in the target task into `buffer`.
        static bool read(mach_port_t task,
                         mach_vm_address_t address,
                         void *buffer,
                         mach_vm_size_t size);

        /// Write `size` bytes from `buffer` to `address` in the target task.
        static bool write(mach_port_t task,
                          mach_vm_address_t address,
                          const void *buffer,
                          mach_vm_size_t size);

        /// Change memory protection on a region in the target task.
        /// Returns the old protection in `old_prot`.
        static bool protect(mach_port_t task,
                            mach_vm_address_t address,
                            mach_vm_size_t size,
                            vm_prot_t new_prot,
                            vm_prot_t *old_prot);
    };
}
