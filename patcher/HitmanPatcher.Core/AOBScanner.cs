using System.Diagnostics;

namespace HitmanPatcher
{
    internal static class AOBScanner
    {
        public static bool TryGetHitmanVersionByScanning(Process process,
            IntPtr hProcess, out HitmanVersion result)
        {
            Stopwatch bench = Stopwatch.StartNew();

            IntPtr baseAddress = process.MainModule.BaseAddress;
            byte[] exeData = new byte[process.MainModule.ModuleMemorySize];
            Pinvoke.ReadProcessMemory(hProcess, baseAddress, exeData,
                (UIntPtr) exeData.Length,
                out _); // fuck it, just read the whole thing

            Task<IEnumerable<Patch[]>> getCertpinPatches =
                Task.Factory.ContinueWhenAll(new Task<Patch[]>[]
                    {
                        findCertpin_nearjump(exeData),
                        findCertpin_shortjump(exeData),
                    },
                    tasks =>
                        tasks.Select(task => task.Result)
                            .Where(x => x != null));

            Task<IEnumerable<Patch[]>> getAuthheadPatches =
                Task.Factory.ContinueWhenAll(new Task<Patch[]>[]
                    {
                        findAuthhead3_30(exeData),
                        findAuthhead2_72(exeData),
                        findAuthhead1_15(exeData),
                    },
                    tasks =>
                        tasks.Select(task => task.Result)
                            .Where(x => x != null));

            Task<IEnumerable<Patch[]>> getConfigdomainPatches =
                Task.Factory.ContinueWhenAll(new Task<Patch[]>[]
                    {
                        findConfigdomain(exeData),
                    },
                    tasks =>
                        tasks.Select(task => task.Result)
                            .Where(x => x != null));

            Task<IEnumerable<Patch[]>> getProtocolPatches =
                Task.Factory.ContinueWhenAll(new Task<Patch[]>[]
                    {
                        findProtocol3_30(exeData),
                    },
                    tasks =>
                        tasks.Select(task => task.Result)
                            .Where(x => x != null));

            Task<IEnumerable<Patch[]>> getDynresForceofflinePatches =
                Task.Factory.ContinueWhenAll(new Task<Patch[]>[]
                    {
                        findDynresForceoffline(exeData),
                    },
                    tasks =>
                        tasks.Select(task => task.Result)
                            .Where(x => x != null));


            Task<IEnumerable<Patch[]>>[] alltasks =
            {
                getCertpinPatches, getAuthheadPatches, getConfigdomainPatches,
                getProtocolPatches, getDynresForceofflinePatches
            };
            // ReSharper disable once CoVariantArrayConversion
            Task.WaitAll(alltasks);

            bench.Stop();
            Compositions.Logger.log(bench.Elapsed.ToString());

            // error out if any task does not have exactly 1 result
            if (alltasks.Any(task => task.Result.Count() != 1))
            {
                result = null;
                return false;
            }

#if DEBUG
            Note("CertPin", getCertpinPatches.Result.First()[0]);
            Note("AuthHeader1", getAuthheadPatches.Result.First()[0]);
            Note("AuthHeader2", getAuthheadPatches.Result.First()[1]);
            Note("ConfigDomain", getConfigdomainPatches.Result.First()[0]);
            Note("Protocol", getProtocolPatches.Result.First()[0]);
            Note("DynamicResources", getDynresForceofflinePatches.Result.First()[0]);
#endif

            result = new HitmanVersion()
            {
                certpin = getCertpinPatches.Result.First(),
                authheader = getAuthheadPatches.Result.First(),
                configdomain = getConfigdomainPatches.Result.First(),
                protocol = getProtocolPatches.Result.First(),
                dynres_noforceoffline =
                    getDynresForceofflinePatches.Result.First()
            };

            return true;
        }

        #region Utilities

#if DEBUG
        private static void Note(string name, Patch patch)
        {
            Compositions.Logger.log($"{name}: {patch.offset:X} {BitConverter.ToString(patch.original).Replace("-", string.Empty)} {BitConverter.ToString(patch.patch).Replace("-", string.Empty)}");
        }
#endif

        #endregion

        #region certpin

        private static Task<Patch[]> findCertpin_nearjump(byte[] data)
        {
            return Task.Factory.ContinueWhenAll(new[]
            {
                Task.Factory.StartNew(() => findPattern(data, 0xe,
                    "? ? 9afdffffc747302f000000c7471803000000")),
                Task.Factory.StartNew(() => findPattern(data, 0xc,
                    "? ? 9afdffffc747302f000000c7471803000000")), // 1.15
                Task.Factory.StartNew(() => findPattern(data, 0xd,
                    "? ? 6ffdffffc747302f000000c7471804000000"))
            }, tasks =>
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

        private static Task<Patch[]> findCertpin_shortjump(byte[] data)
        {
            return Task.Factory.ContinueWhenAll(new[]
            {
                Task.Factory.StartNew(() =>
                    findPattern(data, 0x3, "? 0ec746302f000000c7461803000000")),
                Task.Factory.StartNew(() =>
                    findPattern(data, 0x2,
                        "? 0ec746302f000000c7461803000000")), // v2.13
            }, tasks =>
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

        #endregion

        #region authheader

        private static Task<Patch[]> findAuthhead3_30(byte[] data)
        {
            return Task.Factory.ContinueWhenAll(new[]
            {
                Task.Factory.StartNew(() =>
                    findPattern(data, 0xd, "0f85b50000004883f90675e8")),
                Task.Factory.StartNew(() =>
                    findPattern(data, 0xd, "9090909090904883f90675e8")),
                Task.Factory.StartNew(() =>
                    findPattern(data, 0x3, "0f84b800000084db0f85b0000000")),
                Task.Factory.StartNew(() =>
                    findPattern(data, 0x3, "90909090909084db0f85b0000000"))
            }, tasks =>
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
                    new Patch(offsetspart1.First(), "0F85B5000000",
                        "909090909090", MemProtection.PAGE_EXECUTE_READ),
                    new Patch(offsetspart2.First(), "0F84B8000000",
                        "909090909090", MemProtection.PAGE_EXECUTE_READ)
                };
            });
        }

        private static Task<Patch[]> findAuthhead2_72(byte[] data)
        {
            return Task.Factory.ContinueWhenAll(new[]
            {
                Task.Factory.StartNew(() =>
                    findPattern(data, 0x8, "? 18488d15ff02cd00")),
                Task.Factory.StartNew(() =>
                    findPattern(data, 0x8, "? 18488d155fd6cc00")),
                Task.Factory.StartNew(() =>
                    findPattern(data, 0x7, "? 18488d152018cc00")), // v2.13
                Task.Factory.StartNew(() =>
                    findPattern(data, 0xc, "0f84860000004584e4")),
                Task.Factory.StartNew(() =>
                    findPattern(data, 0xc, "9090909090904584e4")),
                Task.Factory.StartNew(() =>
                    findPattern(data, 0xb, "0f84830000004584e4")), // v2.13
                Task.Factory.StartNew(() =>
                    findPattern(data, 0xb, "9090909090904584e4")), // v2.13
            }, tasks =>
            {
                // concat results for non-patched and patched
                IEnumerable<int> offsetspart1 =
                    tasks.Take(3).SelectMany(task => task.Result);
                IEnumerable<int> offsetspart2 = tasks.Skip(3).Take(4)
                    .SelectMany(task => task.Result);
                if (offsetspart1.Count() != 1 || offsetspart2.Count() != 1)
                    return null;
                return new[]
                {
                    new Patch(offsetspart1.First(), "75", "EB",
                        MemProtection.PAGE_EXECUTE_READ),
                    new Patch(offsetspart2.First(), "0F8486000000",
                        "909090909090", MemProtection.PAGE_EXECUTE_READ)
                };
            });
        }

        private static Task<Patch[]> findAuthhead1_15(byte[] data)
        {
            return Task.Factory.ContinueWhenAll(new[]
            {
                Task.Factory.StartNew(() =>
                    findPattern(data, 0x5, "0f84b3000000498bcf")),
                Task.Factory.StartNew(() =>
                    findPattern(data, 0x5, "909090909090498bcf")),
                Task.Factory.StartNew(() =>
                    findPattern(data, 0x5, "0f84a30000004584ed")),
                Task.Factory.StartNew(() =>
                    findPattern(data, 0x5, "9090909090904584ed"))
            }, tasks =>
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

        #endregion

        #region configdomain

        private static Task<Patch[]> findConfigdomain(byte[] data)
        {
            return Task.Factory.ContinueWhenAll(new[]
            {
                Task.Factory.StartNew(() => findPattern(data, 0xe,
                        "488905 ? ? ? 03488d0d ? ? ? 034883c4205b48ff25 ? ? ? 01"))
                    .ContinueWith(task =>
                        task.Result.Select(addr =>
                                addr + 14 +
                                BitConverter.ToInt32(data, addr + 10))
                            .ToArray()),
                Task.Factory.StartNew(() => findPattern(data, 0xd,
                        "83f06e69d093010001e8 ? ? 0400488d05 ? ? ? 01ba000100004c8d05 ? ? ? 01488905 ? ? ? 02488d0d ? ? ? 02"))
                    .ContinueWith(task =>
                        task.Result.Select(addr =>
                                addr + 47 +
                                BitConverter.ToInt32(data, addr + 43))
                            .ToArray()),
                Task.Factory.StartNew(() => findPattern(data, 0xd,
                        "83f16e69d193010001488d0d ? ? ? 02e8 ? ? 0400488d05 ? ? ? 01ba000100004c8d05 ? ? ? 01488905 ? ? ? 02488d0d ? ? ? 02"))
                    .ContinueWith(task =>
                        task.Result.Select(addr =>
                                addr + 54 +
                                BitConverter.ToInt32(data, addr + 50))
                            .ToArray()), // 2.13: big boy
                Task.Factory.StartNew(() => findPattern(data, 0x0,
                        "4883ec28baa71ace87488d0d ? ? ? 02e8 ? ? 0200488d05 ? ? ? 01ba000100004c8d05 ? ? ? 01488905 ? ? ? 02488d0d ? ? ? 02"))
                    .ContinueWith(task =>
                        task.Result.Select(addr =>
                                addr + 54 +
                                BitConverter.ToInt32(data, addr + 50))
                            .ToArray()) // 1.15: big boy as well
            }, tasks =>
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

        private static Task<Patch[]> findProtocol3_30(byte[] data)
        {
            return Task.Factory.ContinueWhenAll(new[]
            {
                Task.Factory.StartNew(() =>
                    findPattern(data, 0x0, "? 747470733a2f2f7b307d00")),
                Task.Factory.StartNew(() =>
                    findPattern(data, 0x8, "? 747470733a2f2f7b307d00"))
            }, tasks =>
            {
                IEnumerable<int> offsets =
                    tasks.SelectMany(task => task.Result);
                if (offsets.Count() != 1)
                    return null;
                return new[]
                {
                    new Patch(offsets.First(), "68", "61",
                        MemProtection.PAGE_READONLY)
                };
            });
        }

        #endregion

        #region dynres_forceoffline

        private static Task<Patch[]> findDynresForceoffline(byte[] data)
        {
            return Task.Factory.ContinueWhenAll(new[]
            {
                Task.Factory.StartNew(() => findPattern(data, 0x1,
                        "83f17269c193010001488d0d ? ? ? 0383f06569d093010001e8 ? ? 0400488d05 ? ? ? 01c705 ? ? ? 0301000000"))
                    .ContinueWith(task =>
                        task.Result.Select(addr =>
                                addr + 47 +
                                BitConverter.ToInt32(data, addr + 39))
                            .ToArray()),
                Task.Factory.StartNew(() => findPattern(data, 0xb,
                        "83f17269c193010001488d0d ? ? ? 0283f06569d093010001e8 ? ? 0400488d05 ? ? ? 01c705 ? ? ? 0201000000")) // 2.72
                    .ContinueWith(task =>
                        task.Result.Select(addr =>
                                addr + 47 +
                                BitConverter.ToInt32(data, addr + 39))
                            .ToArray()),
                Task.Factory.StartNew(() => findPattern(data, 0x7,
                        "83f17269c193010001488d0d ? ? ? 0283f06569d093010001e8 ? ? 0400488d05 ? ? ? 01c705 ? ? ? 0201000000")) // 2.13
                    .ContinueWith(task =>
                        task.Result.Select(addr =>
                                addr + 47 +
                                BitConverter.ToInt32(data, addr + 39))
                            .ToArray()),
                Task.Factory.StartNew(() => findPattern(data, 0x4,
                        "ba2734ff12488d0d ? ? ? 02e8 ? ? 0200488d05 ? ? ? 01c705 ? ? ? 0201000000")) // 1.15
                    .ContinueWith(task =>
                        task.Result.Select(addr =>
                                addr + 34 +
                                BitConverter.ToInt32(data, addr + 26))
                            .ToArray())
            }, tasks =>
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

        private static int[] findPattern(byte[] data, byte alignment,
            string pattern)
        {
            List<int> results = new List<int>();
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
                        i -= 1; // step forward 1 less because it's one '?' instead of two hex chars
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
                        i -= 1; // step forward 1 less because it's one '?' instead of two hex chars
                    }
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
            // int[] matched = new int[patternLen];
            byte firstbyte = bytepattern[0];

            // search data for byte array
            for (int i = alignment; i < searchEnd; i += 16)
            {
                if (data[i] == firstbyte)
                {
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
            }

            return results.ToArray();
        }
    }
}
