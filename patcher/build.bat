@echo off
rem Windows - CLI
dotnet publish HitmanPatcher.CLI/HitmanPatcher.CLI.csproj -c Release -p:PublishSingleFile=True --no-self-contained -p DebugType=none -p:EnableWindowsTargeting=True -o Publish/Windows-Portable
dotnet publish HitmanPatcher.CLI/HitmanPatcher.CLI.csproj -r win-x64 -c Release -f net8.0 -p:PublishTrimmed=True -p:PublishSingleFile=True --self-contained -p DebugType=none -p:EnableWindowsTargeting=True -o Publish/Windows-x64

rem Linux - CLI
dotnet publish HitmanPatcher.CLI/HitmanPatcher.CLI.csproj -r linux-x64 -c "Release - Linux" -p:PublishSingleFile=True --no-self-contained -p DebugType=none -p:IsLinux=true -o Publish/Linux-Portable
dotnet publish HitmanPatcher.CLI/HitmanPatcher.CLI.csproj -r linux-x64 -c "Release - Linux" -f net8.0 -p:PublishTrimmed=True -p:PublishSingleFile=True --self-contained -p DebugType=none -p:IsLinux=true -o Publish/Linux-x64

rem Windows - UI
dotnet publish HitmanPatcher.UI/HitmanPatcher.UI.csproj -c Release -p:PublishSingleFile=True --no-self-contained -p DebugType=none -p:EnableWindowsTargeting=True -o Publish/Windows-Portable
dotnet publish HitmanPatcher.UI/HitmanPatcher.UI.csproj -r win-x64 -c Release -p:PublishSingleFile=True --self-contained -p DebugType=none -p:EnableWindowsTargeting=True -o Publish/Windows-x64

rem Windows (.NET Framework)
dotnet publish HitmanPatcher.CLI/HitmanPatcher.CLI.csproj -c Release -p DebugType=none -p:EnableWindowsTargeting=True -o Publish/Windows-Legacy -p:IsLegacy=True
dotnet publish HitmanPatcher.UI/HitmanPatcher.UI.csproj -c Release -p DebugType=none -p:EnableWindowsTargeting=True -o Publish/Windows-Legacy -p:IsLegacy=True

pause