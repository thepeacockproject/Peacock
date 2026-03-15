#pragma once

#include <string>
#include <vector>

namespace peacock {

struct PatchOptions {
    bool disable_cert_pinning = true;
    bool always_send_auth_header = true;
    bool set_custom_config_domain = true;
    std::string custom_config_domain = "127.0.0.1";
    bool use_http = true;
    bool enable_dynamic_resources = true;
    bool disable_force_offline_on_failed_dynres = true;
};

struct Settings {
    PatchOptions patch_options;
    std::vector<std::string> tray_domains;

    /// Load settings from the config file.
    /// Path: ~/.config/PeacockProject/darwin_peacock_patcher.conf
    static Settings load();

    /// Save settings to the config file.
    void save() const;

    /// Get the config file path.
    static std::string config_path();
};

} // namespace peacock
