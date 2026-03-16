#include "definitions.h"

namespace peacock::patch_definitions {
    // macOS ARM64 (iOS-on-Mac) — "Hitman WOA" v3.260.1
    // UUID: B49ACFFB-CC95-399E-9FDE-8F30DD7F4645
    // CRC32(UUID): 0x924EDC50
    // Base address: 0x100000000 (all offsets below are relative to base)

    static const HitmanVersion v3_260_1_macos_arm64 = {
        .name = "3.260.1 macOS ARM64",

        // Patch tbnz → unconditional branch in mbedtls_ssl_parse_certificate.
        // Makes cert verification results always non-fatal.
        .certpin = {
            Patch(0x1987BD8,
                  {0x68, 0x01, 0x00, 0x37}, // tbnz w8, #0, +0x2C
                  {0x0B, 0x00, 0x00, 0x14}, // b +0x2C (unconditional)
                  VM_PROT_READ | VM_PROT_EXECUTE),
        },

        // NOP both conditional branches that skip Authorization header injection.
        .authheader = {
            Patch(0xFCA928,
                  {0x60, 0x05, 0x00, 0x34}, // cbz w0, +0xAC
                  {0x1F, 0x20, 0x03, 0xD5}, // NOP
                  VM_PROT_READ | VM_PROT_EXECUTE),
            Patch(0xFCA93C,
                  {0xC8, 0x04, 0x00, 0x37}, // tbnz w8, #0, +0x98
                  {0x1F, 0x20, 0x03, 0xD5}, // NOP
                  VM_PROT_READ | VM_PROT_EXECUTE),
        },

        // Overwrite ZConfigString buffer for "config.hitman.io" with custom domain.
        .configdomain = {
            Patch(0x2D89EE0,
                  {},
                  {},
                  VM_PROT_READ | VM_PROT_WRITE,
                  "configdomain"),
        },

        // Patch "https://{0}" → "http://{0}a"
        // No clue why this works, but it does. For winhttp, we do `httpa://{0}` instead,
        // but that doesn't seem to work.
        .protocol = {
            Patch(0x1B6867F,
                  str_bytes("https://{0}"),
                  str_bytes("http://{0}a"),
                  VM_PROT_READ),
        },

        // Set "OnlineResources_ForceOfflineOnFailure" to 0.
        .dynres_noforceoffline = {
            Patch(0x2D89EC0,
                  {0x00, 0x00, 0x00, 0x00},
                  {0x00, 0x00, 0x00, 0x00},
                  VM_PROT_READ | VM_PROT_WRITE),
        },

        // Set "OnlineResources_Disable" to 0 (enable dynamic resources).
        .dynres_enable = {
            Patch(0x2D89EA0,
                  {0x01, 0x00, 0x00, 0x00},
                  {0x00, 0x00, 0x00, 0x00},
                  VM_PROT_READ | VM_PROT_WRITE),
        },
    };

    void add_v3_260_1(PatchRegistry &registry) {
        registry.add_version(0x924EDC50, v3_260_1_macos_arm64);
    }
}
