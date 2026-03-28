#include "log.h"
#include "patcher.h"

#include <chrono>
#include <cstdio>
// ReSharper disable once CppUnusedIncludeDirective
#include <cstring>
#include <string>
#include <thread>
#include <unistd.h>

static void print_usage() {
    printf("Peacock Patcher for macOS\n");
    printf("Patches HITMAN World of Assassination to use a custom server.\n");
    printf("\n");
    printf("Usage: PeacockPatcher [options]\n");
    printf("\n");
    printf("Options:\n");
    printf("  --headless                     Patch once and exit\n");
    printf("  --domain <url>                 Server domain (default: "
        "127.0.0.1)\n");
    printf("  --dont-use-http                Use HTTPS instead of HTTP\n");
    printf(
        "  --non-optional-dynamic-resources   Don't try to make dynamic"
        "resources optional\n");
    printf("  --help                         Show this help message\n");
}

int main(int argc, char *argv[]) {
    // Check for root (required for task_for_pid)
    if (geteuid() != 0) {
        fprintf(stderr,
                "Warning: not running as root. task_for_pid will likely "
                "fail.\nRe-run with: sudo %s\n\n",
                argv[0]);
    }

    // Parse arguments
    bool headless = false;
    std::string domain = "127.0.0.1";
    bool use_http = true;
    bool optional_dynres = true;

    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--headless") == 0) {
            headless = true;
        } else if (strcmp(argv[i], "--domain") == 0) {
            if (i + 1 < argc) {
                domain = argv[++i];
            } else {
                fprintf(stderr, "Error: --domain requires a value\n");
                return 1;
            }
        } else if (strcmp(argv[i], "--dont-use-http") == 0) {
            use_http = false;
        } else if (strcmp(argv[i], "--non-optional-dynamic-resources") == 0) {
            optional_dynres = false;
        } else if (strcmp(argv[i], "--help") == 0) {
            print_usage();
            return 0;
        } else {
            fprintf(stderr, "Unknown option: %s\n", argv[i]);
            print_usage();
            return 1;
        }
    }

    peacock::PatchOptions options;
    options.custom_config_domain = domain;
    options.use_http = use_http;
    options.disable_cert_pinning = true;
    options.always_send_auth_header = true;
    options.set_custom_config_domain = true;
    options.enable_dynamic_resources = true;
    options.disable_force_offline_on_failed_dynres = optional_dynres;

    peacock::Patcher patcher;

    if (headless) {
        peacock::log("Running in headless mode (patch once)...");
        patcher.patch_all_processes(options);
    } else {
        peacock::log("Watching for HITMAN processes... (Ctrl+C to stop)");
        peacock::log("Server: " + domain);

        // ReSharper disable once CppDFAEndlessLoop
        while (true) {
            patcher.patch_all_processes(options);
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
    }

    return 0;
}
