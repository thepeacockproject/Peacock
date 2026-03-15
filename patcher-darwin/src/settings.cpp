#include "settings.h"

#include <filesystem>
#include <fstream>
#include <sstream>

namespace fs = std::filesystem;

namespace peacock {

std::string Settings::config_path() {
    const char *home = std::getenv("HOME");
    if (!home)
        home = "/tmp";
    const fs::path dir = fs::path(home) / ".config" / "PeacockProject";
    fs::create_directories(dir);

    return (dir / "darwin_peacock_patcher.conf").string();
}

Settings Settings::load() {
    Settings result;
    std::string path = config_path();
    std::ifstream file(path);
    if (!file.is_open())
        return result;

    std::string line;
    while (std::getline(file, line)) {
        if (line.empty())
            continue;
        auto eq = line.find('=');
        if (eq == std::string::npos)
            continue;

        std::string key = line.substr(0, eq);
        std::string value = line.substr(eq + 1);

        if (key == "CustomConfigDomain") {
            result.patch_options.custom_config_domain = value;
        } else if (key == "UseHttp") {
            result.patch_options.use_http = (value == "True");
        } else if (key == "DisableForceDynamicResources") {
            result.patch_options.disable_force_offline_on_failed_dynres =
                (value == "True");
        } else if (key == "trayDomain") {
            result.tray_domains.push_back(value);
        }
    }

    return result;
}

void Settings::save() const {
    const std::string path = config_path();
    std::ofstream file(path);
    if (!file.is_open())
        return;

    file << "CustomConfigDomain=" << patch_options.custom_config_domain
         << "\n";
    file << "UseHttp=" << (patch_options.use_http ? "True" : "False") << "\n";
    file << "DisableForceDynamicResources="
         << (patch_options.disable_force_offline_on_failed_dynres ? "True"
                                                                 : "False")
         << "\n";

    for (const auto &domain : tray_domains) {
        file << "trayDomain=" << domain << "\n";
    }
}

} // namespace peacock
