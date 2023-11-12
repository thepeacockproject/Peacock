msbuild.exe patcher\HitmanPatcher.sln -t:Build -p:Configuration=Release -m
msbuild.exe patcher\HitmanPatcher.sln -t:Build -p:Configuration=Linux.Release -m
rename patcher\bin\x64\Release\PeacockPatcher.exe PeacockPatcher.exe
