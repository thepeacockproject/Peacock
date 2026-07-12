#include "definitions.h"

namespace peacock::patch_definitions {
    // UUID: 133CC413-E97A-35A3-A36E-392A5238D15B
    static const HitmanVersion v3_270_1_macos_arm64_steam = {
        .name = "3.270.1 macOS ARM64 (Steam)",

        // Patch tbnz → unconditional branch in mbedtls_ssl_parse_certificate.
        // Makes cert verification results always non-fatal.
        .certpin = {
            Patch(0x19C18C8,
                  {0x68, 0x01, 0x00, 0x37}, // tbnz w8, #0, +0x2C
                  {0x0B, 0x00, 0x00, 0x14}, // b +0x2C (unconditional)
                  VM_PROT_READ | VM_PROT_EXECUTE),
        },

        // NOP both conditional branches that skip Authorization header injection.
        .authheader = {
            Patch(0xFF086C,
                  {0x60, 0x05, 0x00, 0x34}, // cbz w0, +0xAC
                  {0x1F, 0x20, 0x03, 0xD5}, // NOP
                  VM_PROT_READ | VM_PROT_EXECUTE),
            Patch(0xFF0880,
                  {0xC1, 0x04, 0x00, 0x54}, // b.ne +0x98
                  {0x1F, 0x20, 0x03, 0xD5}, // NOP
                  VM_PROT_READ | VM_PROT_EXECUTE),
        },

        // Overwrite ZConfigString buffer for "config.hitman.io" with custom domain.
        .configdomain = {
            Patch(0x2DC7DB0,
                  {},
                  {},
                  VM_PROT_READ | VM_PROT_WRITE,
                  "configdomain"),
        },

        // Patch "https://{0}" → "http://{0}a"
        .protocol = {
            Patch(0x1B9E014,
                  str_bytes("https://{0}"),
                  str_bytes("http://{0}a"),
                  VM_PROT_READ),
        },

        // Set "OnlineResources_ForceOfflineOnFailure" to 0.
        .dynres_noforceoffline = {
            Patch(0x2DC7D90,
                  {0x00, 0x00, 0x00, 0x00},
                  {0x00, 0x00, 0x00, 0x00},
                  VM_PROT_READ | VM_PROT_WRITE),
        },

        // Set "OnlineResources_Disable" to 0 (enable dynamic resources).
        .dynres_enable = {
            Patch(0x2DC7D70,
                  {0x01, 0x00, 0x00, 0x00},
                  {0x00, 0x00, 0x00, 0x00},
                  VM_PROT_READ | VM_PROT_WRITE),
        },
    };

    void add_v3_270_1(PatchRegistry &registry) {
        registry.add_version(0x9A46E97F, v3_270_1_macos_arm64_steam);
    }
}
