#include "version.h"
#include "memory.h"

#include <cstdio>
#include <mach-o/loader.h>

namespace peacock {
    static constexpr uint32_t kCrc32Init = 0xFFFFFFFF;
    static constexpr uint32_t kCrc32Polynomial = 0xEDB88320;

    /// Simple CRC32 (ISO 3309 / ITU-T V.42).
    static uint32_t crc32(const uint8_t *data, const size_t len) {
        uint32_t crc = kCrc32Init;
        for (size_t i = 0; i < len; i++) {
            crc ^= data[i];
            for (int j = 0; j < 8; j++) {
                crc = (crc >> 1) ^ (kCrc32Polynomial & (-(crc & 1)));
            }
        }
        return ~crc;
    }

    uint32_t Version::get_identifier(const mach_port_t task,
                                     const uint64_t base_address) {
        // Read the Mach-O header
        mach_header_64 header{};
        if (!Memory::read(task, base_address, &header, sizeof(header)))
            return 0;

        if (header.magic != MH_MAGIC_64) {
            fprintf(stderr, "Not a 64-bit Mach-O (magic: 0x%x)\n", header.magic);
            return 0;
        }

        // Walk load commands looking for LC_UUID
        uint64_t cmd_offset = base_address + sizeof(header);
        for (uint32_t i = 0; i < header.ncmds; i++) {
            load_command lc{};
            if (!Memory::read(task, cmd_offset, &lc, sizeof(lc)))
                break;

            if (lc.cmd == LC_UUID) {
                uuid_command uuid_cmd{};
                if (!Memory::read(task, cmd_offset, &uuid_cmd, sizeof(uuid_cmd)))
                    break;
                return crc32(uuid_cmd.uuid, sizeof(uuid_cmd.uuid));
            }

            cmd_offset += lc.cmdsize;
        }

        // Fallback: CRC32 of first 4KB of the binary
        fprintf(stderr,
                "LC_UUID not found, falling back to CRC32 of first 4KB.\n");
        uint8_t buf[4096];
        if (!Memory::read(task, base_address, buf, sizeof(buf)))
            return 0;

        return crc32(buf, sizeof(buf));
    }
}
