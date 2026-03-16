cmake_minimum_required(VERSION 3.20)
project(PeacockPatcher LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_OSX_ARCHITECTURES "arm64")
set(CMAKE_OSX_DEPLOYMENT_TARGET "15.0")

add_executable(PeacockPatcher
        src/main.cpp
        src/process.cpp
        src/memory.cpp
        src/scanner.cpp
        src/patcher.cpp
        src/patches.cpp
        src/patch_definitions/v3_260_1.cpp
        src/version.cpp
)

target_include_directories(PeacockPatcher PRIVATE src)
