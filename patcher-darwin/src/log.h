#pragma once

#include <cstdio>
#include <string>

namespace peacock {
    inline void log(const std::string &msg) {
        printf("[patcher] %s\n", msg.c_str());
    }

    inline std::string to_hex(const uint64_t v, const int width = 0) {
        char buf[32];
        if (width)
            snprintf(buf, sizeof(buf), "%0*llX", width, v);
        else
            snprintf(buf, sizeof(buf), "%llX", v);
        return buf;
    }
}
