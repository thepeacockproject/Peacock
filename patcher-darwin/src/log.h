#pragma once

#include <string>

namespace peacock {
    inline void log(const std::string &msg) {
        printf("[patcher] %s\n", msg.c_str());
    }
} // namespace peacock
