// ReSharper disable CppUseStructuredBinding
#include "log.h"
#include "patcher.h"

#include <chrono>
#include <cstdio>
// ReSharper disable once CppUnusedIncludeDirective
#include <cstring>
#include <string>
#include <thread>
#include <unistd.h>

struct CliOption {
    const char *flag;
    const char *description;
};

constexpr CliOption kCliOptions[] = {
    {"--headless", "Patch once and exit"},
    {"--domain <url>", "Server domain (default: 127.0.0.1)"},
    {"--dont-use-http", "Use HTTPS instead of HTTP"},
    {"--non-optional-dynamic-resources",
     "Don't try to make dynamic resources optional"},
    {"--disable-dynamic-resources",
     "Don't try to make dynamic resources mandatory"},
    {"--help", "Show this help message"},
};

constexpr size_t cstr_length(const char *s) {
    size_t n = 0;
    while (s[n] != '\0') ++n;
    return n;
}

/** Find the longest flag's length, so we know how many spaces each entry needs to be padded by. */
constexpr size_t kFlagWidth = [] {
    size_t max = 0;
    for (auto& option : kCliOptions) {
        const size_t len = cstr_length(option.flag);
        if (len > max) max = len;
    }
    return max;
}();

static void print_usage() {
    printf("Peacock Patcher for macOS\n");
    printf("Patches HITMAN World of Assassination to use a custom server.\n");
    printf("\n");
    printf("Usage: PeacockPatcher [options]\n");
    printf("\n");
    printf("Options:\n");

    for (const auto& option : kCliOptions) {
        printf("  %-*s  %s\n", static_cast<int>(kFlagWidth), option.flag, option.description);
    }
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
    bool enable_dynres = true;
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
        } else if (strcmp(argv[i], "--disable-dynamic-resources") == 0) {
            enable_dynres = false;
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
    options.enable_dynamic_resources = enable_dynres;
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
