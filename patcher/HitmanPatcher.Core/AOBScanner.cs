using System.Diagnostics;

// ReSharper disable PossibleMultipleEnumeration

namespace HitmanPatcher;

using FindPatchesTask = Task<IEnumerable<Patch[]>>;

internal static class AOBScanner
{
    public static bool TryGetHitmanVersionByScanning(Process process,
        IntPtr hProcess, out HitmanVersion result)
    {
        Debug.Assert(process.MainModule != null, "process.MainModule != null");
        IntPtr baseAddress = process.MainModule.BaseAddress;
        byte[] exeData = new byte[process.MainModule.ModuleMemorySize];
        Pinvoke.ReadProcessMemory(hProcess, baseAddress, exeData,
            (UIntPtr)exeData.Length,
            out _); // fuck it, just read the whole thing

        FindPatchesTask getCertpinPatches = Task.Factory.ContinueWhenAll([
                FindCertpinNearjump(exeData),
                FindCertpinNearjumpNew(exeData),
                FindCertpin_shortjump(exeData),
                FindCertpinFirstLight(exeData)
            ],
            RejectNullReturns);

        FindPatchesTask getAuthheadPatches = Task.Factory.ContinueWhenAll(
            [
                FindAuthhead3_210(exeData),
                FindAuthhead3_30(exeData),
                FindAuthhead2_72(exeData),
                FindAuthhead1_15(exeData),
                FindAuthheadFirstLight(exeData)
            ],
            RejectNullReturns
        );

        FindPatchesTask getConfigdomainPatches = Task.Factory.ContinueWhenAll(
            [
                FindConfigdomain(exeData)
            ],
            RejectNullReturns
        );

        FindPatchesTask getProtocolPatches = Task.Factory.ContinueWhenAll(
            [
                FindProtocolCombined(exeData),
                FindProtocolFirstLight(exeData)
            ],
            RejectNullReturns
        );

        FindPatchesTask getDynresForceofflinePatches =
            Task.Factory.ContinueWhenAll(
                [
                    FindDynresForceoffline(exeData)
                ],
                RejectNullReturns
            );

        FindPatchesTask getDynresEnablePatches =
            Task.Factory.ContinueWhenAll(
                [
                    FindDynresEnable(exeData)
                ],
                RejectNullReturns
            );

        bool isFirstLight =
            process.ProcessName.IndexOf("007FirstLight",
                StringComparison.OrdinalIgnoreCase) >= 0;

        List<FindPatchesTask> requiredTasks =
        [
            getCertpinPatches, getAuthheadPatches, getConfigdomainPatches,
            getProtocolPatches
        ];
        if (!isFirstLight)
        {
            requiredTasks.Add(getDynresForceofflinePatches);
        }

        // ReSharper disable once CoVariantArrayConversion
        Task.WaitAll(getCertpinPatches, getAuthheadPatches,
            getConfigdomainPatches, getProtocolPatches,
            getDynresForceofflinePatches, getDynresEnablePatches);

        // error out if any required task does not have exactly 1 result
        if (requiredTasks.Any(task => task.Result.Count() != 1))
        {
            result = null;
            return false;
        }

#if DEBUG
        long imageBase = ReadImageBase(exeData);

        LogFoundPatch("CertPin", getCertpinPatches.Result.First()[0],
            imageBase);
        LogFoundPatch("AuthHeader1", getAuthheadPatches.Result.First()[0],
            imageBase);
        LogFoundPatch("AuthHeader2", getAuthheadPatches.Result.First()[1],
            imageBase);
        LogFoundPatch("ConfigDomain",
            getConfigdomainPatches.Result.First()[0], imageBase);
        LogFoundPatch("Protocol", getProtocolPatches.Result.First()[0],
            imageBase);
        LogFoundPatch("DynamicResources->ForceOffline",
            getDynresForceofflinePatches.Result.FirstOrDefault()?[0], imageBase);
        LogFoundPatch("DynamicResources->Enable",
            getDynresEnablePatches.Result.FirstOrDefault()?[0], imageBase);
#endif

        result = new HitmanVersion()
        {
            certpin = getCertpinPatches.Result.First(),
            authheader = getAuthheadPatches.Result.First(),
            configdomain = getConfigdomainPatches.Result.First(),
            protocol = getProtocolPatches.Result.First(),
            dynres_noforceoffline =
                getDynresForceofflinePatches.Result.FirstOrDefault() ?? [],
            dynres_enable =
                getDynresEnablePatches.Result.FirstOrDefault() ?? []
        };

        return true;
    }

    #region Utilities

    private static IEnumerable<Patch[]> RejectNullReturns(
        Task<Patch[]>[] tasks) =>
        tasks.Select(task => task.Result)
            .Where(x => x != null);

#if DEBUG
    private static void LogFoundPatch(string name, Patch patch,
        long imageBase)
    {
        if (patch == null)
        {
            Compositions.Logger.log($"{name}: n/a");

            return;
        }

        long va = imageBase + patch.offset;
        Compositions.Logger.log(
            $"{name}: {patch.offset:X} (virtual address {va:X}) | {BitConverter.ToString(patch.original).Replace("-", string.Empty)} {BitConverter.ToString(patch.patch).Replace("-", string.Empty)}");
    }

    // Reads the preferred ImageBase from the PE optional header (PE32+).
    private static long ReadImageBase(byte[] data)
    {
        // e_lfanew
        int peHeader = BitConverter.ToInt32(data, 0x3C);
        // "PE\0\0" (4) + IMAGE_FILE_HEADER (20) -> optional header,
        // ImageBase at optional header offset 0x18 (8 bytes for PE32+)
        return BitConverter.ToInt64(data, peHeader + 4 + 20 + 0x18);
    }
#endif

    #endregion

    #region certpin

    private static Task<Patch[]> FindCertpinNearjump(byte[] data)
    {
        return Task.Factory.ContinueWhenAll([
            Task.Factory.StartNew(() => FindPattern(data, 0xe,
                "? ? 9afdffffc747302f000000c7471803000000")),
            Task.Factory.StartNew(() => FindPattern(data, 0xc,
                "? ? 9afdffffc747302f000000c7471803000000")) // 1.15
        ], tasks =>
        {
            IEnumerable<int> offsets =
                tasks.SelectMany(task => task.Result);
            if (offsets.Count() != 1)
                return null;
            return new[]
            {
                new Patch(offsets.First(), "0F85", "90E9",
                    MemProtection.PAGE_EXECUTE_READ)
            };
        });
    }

    private static Task<Patch[]> FindCertpinNearjumpNew(byte[] data)
    {
        return Task.Factory
            .StartNew(() =>
                FindPattern(data, 0x4, "0f84 ? fdffff4584f6 ? ? ? fdffff"))
            .ContinueWith(task =>
            {
                if (task.Result.Length != 1)
                    return null; // pattern should occur only once
                return new[]
                {
                    new Patch(task.Result[0] + 9, "0F85", "90E9",
                        MemProtection.PAGE_EXECUTE_READ),
                };
            });
    }

    private static Task<Patch[]> FindCertpin_shortjump(byte[] data)
    {
        return Task.Factory.ContinueWhenAll([
            Task.Factory.StartNew(() =>
                FindPattern(data, 0x3, "? 0ec746302f000000c7461803000000")),
            Task.Factory.StartNew(() =>
                FindPattern(data, 0x2,
                    "? 0ec746302f000000c7461803000000")) // v2.13
        ], tasks =>
        {
            IEnumerable<int> offsets =
                tasks.SelectMany(task => task.Result);
            if (offsets.Count() != 1)
                return null;
            return new[]
            {
                new Patch(offsets.First(), "75", "EB",
                    MemProtection.PAGE_EXECUTE_READ)
            };
        });
    }

    private static Task<Patch[]> FindCertpinFirstLight(byte[] data)
    {
        // jnz <secure failure> ; mov dword [rdi+0x30], 0x2f ; mov dword [rdi+0x18], 4
        // First Light stores 4 here where Hitman stores 3.
        return Task.Factory
            .StartNew(() =>
                FindPattern(data, 0x3,
                    "0f85 ? ? ? ? c747302f000000c7471804000000"))
            .ContinueWith(task =>
            {
                if (task.Result.Length != 1)
                    return null; // pattern should occur only once
                return new[]
                {
                    new Patch(task.Result[0], "0F85", "90E9",
                        MemProtection.PAGE_EXECUTE_READ)
                };
            });
    }

    #endregion

    #region authheader

    private static Task<Patch[]> FindAuthhead3_210(byte[] data)
    {
        return Task.Factory.ContinueWhenAll([
            // jump 1
            Task.Factory.StartNew(() =>
                FindPattern(data, 0xc,
                    "75084883f90675eceb22")), // unpatched
            Task.Factory.StartNew(() =>
                FindPattern(data, 0xc, "90904883f90675eceb22")), // patched
            // jump 2
            Task.Factory.StartNew(() =>
                FindPattern(data, 0x2,
                    "0f84c20000004584ed0f85")), // unpatched
            Task.Factory.StartNew(() =>
                FindPattern(data, 0x2, "9090909090904584ed0f85")) // patched
        ], tasks =>
        {
            // concat results for non-patched and patched
            IEnumerable<int> offsetsjump1 =
                tasks.Take(2).SelectMany(task => task.Result);
            IEnumerable<int> offsetsjump2 = tasks.Skip(2).Take(2)
                .SelectMany(task => task.Result);
            if (offsetsjump1.Count() != 1 || offsetsjump2.Count() != 1)
                return null;
            return new[]
            {
                new Patch(offsetsjump1.First(), "7508", "9090",
                    MemProtection.PAGE_EXECUTE_READ),
                new Patch(offsetsjump2.First(), "0F84C2000000",
                    "909090909090", MemProtection.PAGE_EXECUTE_READ)
            };
        });
    }

    private static Task<Patch[]> FindAuthhead3_30(byte[] data)
    {
        return Task.Factory.ContinueWhenAll([
            Task.Factory.StartNew(() =>
                FindPattern(data, 0xd, "0f85b50000004883f90675e8")),
            Task.Factory.StartNew(() =>
                FindPattern(data, 0xd, "9090909090904883f90675e8")),
            Task.Factory.StartNew(() =>
                FindPattern(data, 0x3, "0f84b800000084db0f85b0000000")),
            Task.Factory.StartNew(() =>
                FindPattern(data, 0x3, "90909090909084db0f85b0000000"))
        ], tasks =>
        {
            // concat results for non-patched and patched
            IEnumerable<int> offsetsPart1 =
                tasks.Take(2).SelectMany(task => task.Result);
            IEnumerable<int> offsetsPart2 = tasks.Skip(2).Take(2)
                .SelectMany(task => task.Result);
            if (offsetsPart1.Count() != 1 || offsetsPart2.Count() != 1)
                return null;
            return new[]
            {
                new Patch(offsetsPart1.First(), "0F85B5000000",
                    "909090909090", MemProtection.PAGE_EXECUTE_READ),
                new Patch(offsetsPart2.First(), "0F84B8000000",
                    "909090909090", MemProtection.PAGE_EXECUTE_READ)
            };
        });
    }

    private static Task<Patch[]> FindAuthhead2_72(byte[] data)
    {
        return Task.Factory.ContinueWhenAll([
            Task.Factory.StartNew(() =>
                FindPattern(data, 0x8, "? 18488d15ff02cd00")),
            Task.Factory.StartNew(() =>
                FindPattern(data, 0x8, "? 18488d155fd6cc00")),
            Task.Factory.StartNew(() =>
                FindPattern(data, 0x7, "? 18488d152018cc00")), // v2.13
            Task.Factory.StartNew(() =>
                FindPattern(data, 0xc, "0f84860000004584e4")),
            Task.Factory.StartNew(() =>
                FindPattern(data, 0xc, "9090909090904584e4")),
            Task.Factory.StartNew(() =>
                FindPattern(data, 0xb, "0f84830000004584e4")), // v2.13
            Task.Factory.StartNew(() =>
                FindPattern(data, 0xb, "9090909090904584e4")) // v2.13
        ], tasks =>
        {
            // concat results for non-patched and patched
            IEnumerable<int> offsetsPart1 =
                tasks.Take(3).SelectMany(task => task.Result);
            IEnumerable<int> offsetsPart2 = tasks.Skip(3).Take(4)
                .SelectMany(task => task.Result);
            if (offsetsPart1.Count() != 1 || offsetsPart2.Count() != 1)
                return null;
            return new[]
            {
                new Patch(offsetsPart1.First(), "75", "EB",
                    MemProtection.PAGE_EXECUTE_READ),
                new Patch(offsetsPart2.First(), "0F8486000000",
                    "909090909090", MemProtection.PAGE_EXECUTE_READ)
            };
        });
    }

    private static Task<Patch[]> FindAuthhead1_15(byte[] data)
    {
        return Task.Factory.ContinueWhenAll([
            Task.Factory.StartNew(() =>
                FindPattern(data, 0x5, "0f84b3000000498bcf")),
            Task.Factory.StartNew(() =>
                FindPattern(data, 0x5, "909090909090498bcf")),
            Task.Factory.StartNew(() =>
                FindPattern(data, 0x5, "0f84a30000004584ed")),
            Task.Factory.StartNew(() =>
                FindPattern(data, 0x5, "9090909090904584ed"))
        ], tasks =>
        {
            // concat results for non-patched and patched
            IEnumerable<int> offsetspart1 =
                tasks.Take(2).SelectMany(task => task.Result);
            IEnumerable<int> offsetspart2 = tasks.Skip(2).Take(2)
                .SelectMany(task => task.Result);
            if (offsetspart1.Count() != 1 || offsetspart2.Count() != 1)
                return null;
            return new[]
            {
                new Patch(offsetspart1.First(), "0F84B3000000",
                    "909090909090", MemProtection.PAGE_EXECUTE_READ),
                new Patch(offsetspart2.First(), "0F84A3000000",
                    "909090909090", MemProtection.PAGE_EXECUTE_READ)
            };
        });
    }

    private static Task<Patch[]> FindAuthheadFirstLight(byte[] data)
    {
        // The auth header is only attached when the request scheme is secure
        // (https/wss) AND the host matches an allow-listed domain suffix.
        // The scheme check ("wss") mismatch jump and the domain check jump
        // both branch away from the code that adds the "bearer " header;
        // nop both so the header is always attached.
        //   movzx eax, [rdx+rcx] ; inc rcx ; cmp al, [r8+rcx-1]
        //   jne <skip>                                  <- patch 1 (scheme)
        //   cmp rcx, 4 ; jne <loop>
        //   lea rcx, [r15+0x20] ; call <domain check> ; test al, al
        //   je <skip>                                   <- patch 2 (domain)
        return Task.Factory
            .StartNew(() =>
                FindPattern(data, 0x0,
                    "0fb6040a48ffc1413a4408ff0f85 ? ? ? ? 4883f90475e8498d4f20e8 ? ? ? ? 84c00f84 ? ? ? ?"))
            .ContinueWith(task =>
            {
                if (task.Result.Length != 1)
                    return null; // pattern should occur only once
                int start = task.Result[0];
                return new[]
                {
                    new Patch(start + 12, "0F85BF000000", "909090909090",
                        MemProtection.PAGE_EXECUTE_READ),
                    new Patch(start + 35, "0F84A8000000", "909090909090",
                        MemProtection.PAGE_EXECUTE_READ)
                };
            });
    }

    #endregion

    #region configdomain

    private static Task<Patch[]> FindConfigdomain(byte[] data)
    {
        return Task.Factory.ContinueWhenAll([
            Task.Factory.StartNew(() => FindPattern(data, 0xe,
                    "488905 ? ? ? ? 488d0d ? ? ? ? 4883c4205b48ff25 ? ? ? 01"))
                .ContinueWith(task =>
                    task.Result.Select(addr =>
                            addr + 14 +
                            BitConverter.ToInt32(data, addr + 10))
                        .ToArray()),
            Task.Factory.StartNew(() => FindPattern(data, 0xd,
                    "83f06e69d093010001e8 ? ? 0400488d05 ? ? ? 01ba000100004c8d05 ? ? ? 01488905 ? ? ? 02488d0d ? ? ? 02"))
                .ContinueWith(task =>
                    task.Result.Select(addr =>
                            addr + 47 +
                            BitConverter.ToInt32(data, addr + 43))
                        .ToArray()),
            Task.Factory.StartNew(() => FindPattern(data, 0xd,
                    "83f16e69d193010001488d0d ? ? ? 02e8 ? ? 0400488d05 ? ? ? 01ba000100004c8d05 ? ? ? 01488905 ? ? ? 02488d0d ? ? ? 02"))
                .ContinueWith(task =>
                    task.Result.Select(addr =>
                            addr + 54 +
                            BitConverter.ToInt32(data, addr + 50))
                        .ToArray()), // 2.13: big boy
            Task.Factory.StartNew(() => FindPattern(data, 0x0,
                    "4883ec28baa71ace87488d0d ? ? ? 02e8 ? ? 0200488d05 ? ? ? 01ba000100004c8d05 ? ? ? 01488905 ? ? ? 02488d0d ? ? ? 02"))
                .ContinueWith(task =>
                    task.Result.Select(addr =>
                            addr + 54 +
                            BitConverter.ToInt32(data, addr + 50))
                        .ToArray()), // 1.15: big boy as well
            Task.Factory.StartNew(() => FindPattern(data, 0x0,
                    "4883ec288b15 ? ? ? ? 81f2 ? ? ? ? 488d0d ? ? ? ? e8 ? ? ? ? 488d05 ? ? ? ? c605 ? ? ? ? 014c8d05 ? ? ? ? 488905 ? ? ? ? ba00010000488d0d ? ? ? ?"))
                .ContinueWith(task =>
                    task.Result.Select(addr =>
                            addr + 68 +
                            BitConverter.ToInt32(data, addr + 64))
                        .ToArray()) // First Light: copies into the writable config-domain buffer (lea rcx, [dest])
        ], tasks =>
        {
            IEnumerable<int> offsets =
                tasks.SelectMany(task => task.Result);
            if (offsets.Count() != 1)
                return null;
            return new[]
            {
                new Patch(offsets.First(), "", "",
                    MemProtection.PAGE_READWRITE, "configdomain")
            };
        });
    }

    #endregion

    #region protocol

    private static Task<Patch[]> FindHttpsString(byte[] data)
    {
        return Task.Factory.ContinueWhenAll([
            Task.Factory.StartNew(() =>
                FindPattern(data, 0x8,
                    "68747470733a2f2f7b307d00")), // "https://{0}"
            Task.Factory.StartNew(() =>
                FindPattern(data, 0x8,
                    "687474703a2f2f7b307d00")), // "http://{0}"
            Task.Factory.StartNew(() =>
                FindPattern(data, 0x0,
                    "68747470733a2f2f7b307d00")), // "https://{0}"
            Task.Factory.StartNew(() =>
                FindPattern(data, 0x0,
                    "687474703a2f2f7b307d00")) // "http://{0}"
        ], tasks =>
        {
            IEnumerable<int> offsets =
                tasks.SelectMany(task => task.Result);
            if (offsets.Count() != 1)
                return null;
            return new[]
            {
                new Patch(offsets.First(), Patch.Https, Patch.Http,
                    MemProtection.PAGE_READONLY)
            };
        });
    }

    private static Task<Patch[]> FindHttpsLengths1_16(byte[] data)
    {
        return Task.Factory
            .StartNew(() => FindPattern(data, 0xC,
                "c745B7 ? 000080488d05 ? ? ? 0148894dd7"))
            .ContinueWith(task =>
            {
                if (task.Result.Length != 1)
                    return null; // pattern should occur only once
                return new[]
                {
                    new Patch(task.Result[0] + 3, "0B", "0A",
                        MemProtection.PAGE_EXECUTE_READ),
                };
            });
    }

    private static Task<Patch[]> FindHttpsLengthsPre3_30(byte[] data)
    {
        return Task.Factory.ContinueWhenAll([
            Task.Factory.StartNew(() =>
                FindPattern(data, 0xC, "488d55c7488d4d17e8 ? ? ? ff41b8")),
            Task.Factory.StartNew(() =>
                FindPattern(data, 0x5, "488d55c7488d4d17e8 ? ? ? ff41b8"))
        ], tasks =>
        {
            IEnumerable<int> offsets =
                tasks.SelectMany(task => task.Result);
            if (offsets.Count() != 1)
                return null; // pattern should occur only once
            return new[]
            {
                new Patch(offsets.First() + 15, "0C", "0B",
                    MemProtection.PAGE_EXECUTE_READ),
            };
        });
    }

    private static Task<Patch[]> FindHttpsLengths3_30(byte[] data)
    {
        return Task.Factory.ContinueWhenAll([
            Task.Factory.StartNew(() =>
                FindPattern(data, 0x6, "c74547 ? 0000800fbae81f")),
            Task.Factory.StartNew(() =>
                FindPattern(data, 0x9, "85d2750cc703 ? 000080"))
        ], tasks =>
        {
            int[][] offsets = tasks.Select(task => task.Result).ToArray();
            if (offsets[0].Length != 1 || offsets[1].Length != 1)
                return null; // fail if not both patterns occur once
            return new[]
            {
                new Patch(offsets[0][0] + 3, "0B", "0A",
                    MemProtection.PAGE_EXECUTE_READ),
                new Patch(offsets[1][0] + 6, "0B", "0A",
                    MemProtection.PAGE_EXECUTE_READ),
            };
        });
    }

    private static Task<Patch[]> findHttpsLength3_210(byte[] data)
    {
        return Task.Factory.ContinueWhenAll([
            Task.Factory.StartNew(() =>
                FindPattern(data, 0x7, "488945d741b8 ? 000080 448945b7"))
        ], tasks =>
        {
            IEnumerable<int> offsets =
                tasks.SelectMany(task => task.Result);
            if (offsets.Count() != 1)
                return null; // pattern should occur only once
            return new[]
            {
                new Patch(offsets.First() + 6, "0B", "0A",
                    MemProtection.PAGE_EXECUTE_READ),
            };
        });
    }

    private static Task<Patch[]> FindProtocolCombined(byte[] data)
    {
        return Task.Factory.ContinueWhenAll([
            FindHttpsString(data),
            FindHttpsLengths1_16(data),
            FindHttpsLengthsPre3_30(data),
            FindHttpsLengths3_30(data),
            findHttpsLength3_210(data)
        ], tasks =>
        {
            if (tasks[0].Result == null)
                return null; // fail if string offset not found
            IEnumerable<Patch[]> lengthPatches = tasks.Skip(1)
                .Select(t => t.Result).Where(result => result != null);
            if (lengthPatches.Count() != 1)
                return
                    null; // fail if not exactly one set of length offsets found

            return tasks[0].Result.Concat(lengthPatches.First()).ToArray();
        });
    }

    private static Task<Patch[]> FindProtocolFirstLight(byte[] data)
    {
        // First Light stores "https://{0}" as a plain null-terminated char*
        // (lea rdx, [str]) and the formatter uses strlen, so unlike Hitman
        // there is no separate length constant to patch - only the string.
        //   mov [rbp-0x59], rcx ; mov [rbp-0x51], rax
        //   lea rdx, ["https://{0}"] ; lea rax, [..]
        //   mov [rbp-0x31], rdx ; mov [rbp-0x29], rax
        return Task.Factory
            .StartNew(() =>
                FindPattern(data, 0x9,
                    "48894da7488945af488d15 ? ? ? ? 488d05 ? ? ? ? 488955cf488945d7"))
            .ContinueWith(task =>
            {
                if (task.Result.Length != 1)
                    return null; // pattern should occur only once
                // resolve the rip-relative target of "lea rdx, [https string]"
                int stringOffset = task.Result[0] + 15 +
                                   BitConverter.ToInt32(data,
                                       task.Result[0] + 11);
                return new[]
                {
                    new Patch(stringOffset, Patch.Https, Patch.Http,
                        MemProtection.PAGE_READONLY)
                };
            });
    }

    #endregion

    #region dynres_forceoffline

    private static Task<Patch[]> FindDynresForceoffline(byte[] data)
    {
        return Task.Factory.ContinueWhenAll([
            Task.Factory
                .StartNew(() =>
                    FindPattern(data, 0x4, "baa7935217488d0d")) // 3.210
                .ContinueWith(task =>
                    task.Result.Select(addr =>
                        addr + 0x22 +
                        BitConverter.ToInt32(data, addr + 0x1A)).ToArray()),
            Task.Factory.StartNew(() => FindPattern(data, 0x1,
                    "83f17269c193010001488d0d ? ? ? 0383f06569d093010001e8 ? ? 0400488d05 ? ? ? 01c705 ? ? ? 0301000000"))
                .ContinueWith(task =>
                    task.Result.Select(addr =>
                            addr + 47 +
                            BitConverter.ToInt32(data, addr + 39))
                        .ToArray()),
            Task.Factory.StartNew(() => FindPattern(data, 0xb,
                    "83f17269c193010001488d0d ? ? ? 0283f06569d093010001e8 ? ? 0400488d05 ? ? ? 01c705 ? ? ? 0201000000")) // 2.72
                .ContinueWith(task =>
                    task.Result.Select(addr =>
                            addr + 47 +
                            BitConverter.ToInt32(data, addr + 39))
                        .ToArray()),
            Task.Factory.StartNew(() => FindPattern(data, 0x7,
                    "83f17269c193010001488d0d ? ? ? 0283f06569d093010001e8 ? ? 0400488d05 ? ? ? 01c705 ? ? ? 0201000000")) // 2.13
                .ContinueWith(task =>
                    task.Result.Select(addr =>
                            addr + 47 +
                            BitConverter.ToInt32(data, addr + 39))
                        .ToArray()),
            Task.Factory.StartNew(() => FindPattern(data, 0x4,
                    "ba2734ff12488d0d ? ? ? 02e8 ? ? 0200488d05 ? ? ? 01c705 ? ? ? 0201000000")) // 1.15
                .ContinueWith(task =>
                    task.Result.Select(addr =>
                            addr + 34 +
                            BitConverter.ToInt32(data, addr + 26))
                        .ToArray())
        ], tasks =>
        {
            IEnumerable<int> offsets =
                tasks.SelectMany(task => task.Result);
            if (offsets.Count() != 1)
                return null;
            return new[]
            {
                new Patch(offsets.First(), "01", "00",
                    MemProtection.PAGE_EXECUTE_READWRITE)
            };
        });
    }

    #endregion

    #region dynres_enable

    private static Task<Patch[]> FindDynresEnable(byte[] data)
    {
        return Task.Factory.ContinueWhenAll([
            Task.Factory
                .StartNew(() =>
                    FindPattern(data, 0x4, "ba502e23f1488d0d")) // 3.210
                .ContinueWith(task =>
                    task.Result.Select(addr =>
                        addr + 0x22 +
                        BitConverter.ToInt32(data, addr + 0x1A)).ToArray())
        ], tasks =>
        {
            IEnumerable<int> offsets =
                tasks.SelectMany(task => task.Result);
            if (offsets.Count() != 1)
                return null;
            return new[]
            {
                new Patch(offsets.First(), "01", "00",
                    MemProtection.PAGE_EXECUTE_READWRITE)
            };
        });
    }

    #endregion

    private static int[] FindPattern(byte[] data, byte alignment,
        string pattern)
    {
        List<int> results = [];
        int offset = 0;

        // convert string pattern to byte array
        List<byte> bytepatternlist = new List<byte>(pattern.Length);
        List<int> wildcardslist = new List<int>(pattern.Length);
        pattern = pattern.Replace(" ", ""); // remove spaces
        for (int i = 0; i < pattern.Length; i += 2)
        {
            string twochars = pattern.Substring(i, 2);
            if (twochars.StartsWith("?"))
            {
                if (wildcardslist.Count ==
                    0) // pattern starts with wildcard(s)
                {
                    alignment += 1;
                    offset -= 1;
                }
                else
                {
                    wildcardslist.Add(1);
                    for (int j = wildcardslist.Count - 2;
                         wildcardslist[j] > 0;
                         j--)
                    {
                        wildcardslist[j] += 1;
                    }

                    bytepatternlist.Add(0x00); // dummy value
                }

                i -= 1; // step forward 1 less because it's one '?' instead of two hex chars
            }
            else
            {
                wildcardslist.Add(0);
                bytepatternlist.Add(Convert.ToByte(twochars, 16));
            }
        }

        byte[] bytepattern = bytepatternlist.ToArray();
        int[] wildcards = wildcardslist.ToArray();
        int patternLen = bytepattern.Length;
        int searchEnd = data.Length - patternLen;
        byte firstbyte = bytepattern[0];

        // search data for byte array
        for (int i = alignment; i < searchEnd; i += 16)
        {
            if (data[i] != firstbyte) continue;

            var k = 1;
            k += wildcards[k];
            while (data[i + k] == bytepattern[k])
            {
                k += 1;
                if (k == patternLen)
                {
                    results.Add(i + offset);
                    break;
                }

                k += wildcards[k];
            }
        }

        return results.ToArray();
    }
}