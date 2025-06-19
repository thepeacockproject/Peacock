using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;

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
                        findCertpin_nearjump_new(exeData),
                        findCertpin_shortjump(exeData),
                    },
                    tasks =>
                        tasks.Select(task => task.Result)
                            .Where(x => x != null));

            Task<IEnumerable<Patch[]>> getAuthheadPatches =
                Task.Factory.ContinueWhenAll(new Task<Patch[]>[]
                    {
                        findAuthhead3_210(exeData),
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
                        findProtocolCombined(exeData),
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
            
            Task<IEnumerable<Patch[]>> getDynresEnablePatches =
                Task.Factory.ContinueWhenAll(new Task<Patch[]>[]
                    {
                        findDynresEnable(exeData),
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
            Task.WaitAll([..alltasks, getDynresEnablePatches]);

            bench.Stop();
#if DEBUG
            Compositions.Logger.log(bench.Elapsed.ToString());
#endif
            
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
            Note("DynamicResources->ForceOffline", getDynresForceofflinePatches.Result.First()[0]);
            Note("DynamicResources->Enable", getDynresEnablePatches.Result.FirstOrDefault()?[0]);
#endif

            result = new HitmanVersion()
            {
                certpin = getCertpinPatches.Result.First(),
                authheader = getAuthheadPatches.Result.First(),
                configdomain = getConfigdomainPatches.Result.First(),
                protocol = getProtocolPatches.Result.First(),
                dynres_noforceoffline =
                    getDynresForceofflinePatches.Result.First(),
                dynres_enable = 
                    getDynresEnablePatches.Result.FirstOrDefault() ?? []
            };

            return true;
        }

        #region Utilities

#if DEBUG
        private static void Note(string name, Patch patch)
        {
            if (patch == null)
            {
                Compositions.Logger.log($"{name}: n/a");
                
                return;
            }
            
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

        private static Task<Patch[]> findCertpin_nearjump_new(byte[] data)
        {
            return Task.Factory.StartNew(() => findPattern(data, 0x4, "0f84 ? fdffff4584f6 ? ? ? fdffff")).ContinueWith(task =>
            {
                if (task.Result.Length != 1)
                    return null; // pattern should occur only once
                return new[]
                {
                    new Patch(task.Result[0] + 9, "0F85", "90E9", MemProtection.PAGE_EXECUTE_READ),
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

        private static Task<Patch[]> findAuthhead3_210(byte[] data)
        {
            return Task.Factory.ContinueWhenAll(new[]
            {
				// jump 1
				Task.Factory.StartNew(() => findPattern(data, 0xc, "75084883f90675eceb22")), // unpatched
				Task.Factory.StartNew(() => findPattern(data, 0xc, "90904883f90675eceb22")), // patched
				// jump 2
				Task.Factory.StartNew(() => findPattern(data, 0x2, "0f84c20000004584ed0f85")), // unpatched
				Task.Factory.StartNew(() => findPattern(data, 0x2, "9090909090904584ed0f85")), // patched
			}, tasks =>
            {
                // concat results for non-patched and patched
                IEnumerable<int> offsetsjump1 = tasks.Take(2).SelectMany(task => task.Result);
                IEnumerable<int> offsetsjump2 = tasks.Skip(2).Take(2).SelectMany(task => task.Result);
                if (offsetsjump1.Count() != 1 || offsetsjump2.Count() != 1)
                    return null;
                return new[]
                {
                    new Patch(offsetsjump1.First(), "7508", "9090", MemProtection.PAGE_EXECUTE_READ),
                    new Patch(offsetsjump2.First(), "0F84C2000000", "909090909090", MemProtection.PAGE_EXECUTE_READ)
                };
            });
        }

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
                        "488905 ? ? ? ? 488d0d ? ? ? ? 4883c4205b48ff25 ? ? ? 01"))
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

        private static Task<Patch[]> findHttpsString(byte[] data)
        {
            return Task.Factory.ContinueWhenAll(new[]
            {
                Task.Factory.StartNew(() => findPattern(data, 0x8, "68747470733a2f2f7b307d00")), // "https://{0}"
				Task.Factory.StartNew(() => findPattern(data, 0x8, "687474703a2f2f7b307d00")), // "http://{0}"
				Task.Factory.StartNew(() => findPattern(data, 0x0, "68747470733a2f2f7b307d00")), // "https://{0}"
				Task.Factory.StartNew(() => findPattern(data, 0x0, "687474703a2f2f7b307d00")), // "http://{0}"
			}, tasks =>
            {
                IEnumerable<int> offsets = tasks.SelectMany(task => task.Result);
                if (offsets.Count() != 1)
                    return null;
                return new[]
                {
                    new Patch(offsets.First(), Patch.https, Patch.http, MemProtection.PAGE_READONLY)
                };
            });
        }

        private static Task<Patch[]> findHttpsLengths1_16(byte[] data)
        {
            return Task.Factory.StartNew(() => findPattern(data, 0xC, "c745B7 ? 000080488d05 ? ? ? 0148894dd7")).ContinueWith(task =>
            {
                if (task.Result.Length != 1)
                    return null; // pattern should occur only once
                return new[]
                {
                    new Patch(task.Result[0] + 3, "0B", "0A", MemProtection.PAGE_EXECUTE_READ),
                };
            });
        }

        private static Task<Patch[]> findHttpsLengthsPre3_30(byte[] data)
        {
            return Task.Factory.ContinueWhenAll(new[]
            {
                Task.Factory.StartNew(() => findPattern(data, 0xC, "488d55c7488d4d17e8 ? ? ? ff41b8")),
                Task.Factory.StartNew(() => findPattern(data, 0x5, "488d55c7488d4d17e8 ? ? ? ff41b8")),
            }, tasks =>
            {
                IEnumerable<int> offsets = tasks.SelectMany(task => task.Result);
                if (offsets.Count() != 1)
                    return null; // pattern should occur only once
                return new[]
                {
                    new Patch(offsets.First() + 15, "0C", "0B", MemProtection.PAGE_EXECUTE_READ),
                };
            });
        }

        private static Task<Patch[]> findHttpsLengths3_30(byte[] data)
        {
            return Task.Factory.ContinueWhenAll(new[]
            {
                Task.Factory.StartNew(() => findPattern(data, 0x6, "c74547 ? 0000800fbae81f")),
                Task.Factory.StartNew(() => findPattern(data, 0x9, "85d2750cc703 ? 000080")),
            }, tasks =>
            {
                int[][] offsets = tasks.Select(task => task.Result).ToArray();
                if (offsets[0].Length != 1 || offsets[1].Length != 1)
                    return null; // fail if not both patterns occur once
                return new[]
                {
                    new Patch(offsets[0][0] + 3, "0B", "0A", MemProtection.PAGE_EXECUTE_READ),
                    new Patch(offsets[1][0] + 6, "0B", "0A", MemProtection.PAGE_EXECUTE_READ),
                };
            });
        }

        private static Task<Patch[]> findHttpsLength3_210(byte[] data)
        {
            return Task.Factory.ContinueWhenAll(new[]
            {
                Task.Factory.StartNew(() => findPattern(data, 0x7, "488945d741b8 ? 000080 448945b7")),
            }, tasks =>
            {
                IEnumerable<int> offsets = tasks.SelectMany(task => task.Result);
                if (offsets.Count() != 1)
                    return null; // pattern should occur only once
                return new[]
                {
                    new Patch(offsets.First() + 6, "0B", "0A", MemProtection.PAGE_EXECUTE_READ),
                };
            });
        }

        private static Task<Patch[]> findProtocolCombined(byte[] data)
        {
            return Task.Factory.ContinueWhenAll(new[]
            {
                findHttpsString(data),
                findHttpsLengths1_16(data),
                findHttpsLengthsPre3_30(data),
                findHttpsLengths3_30(data),
                findHttpsLength3_210(data),
            }, tasks =>
            {
                if (tasks[0].Result == null)
                    return null; // fail if string offset not found
                IEnumerable<Patch[]> lengthPatches = tasks.Skip(1).Select(t => t.Result).Where(result => result != null);
                if (lengthPatches.Count() != 1)
                    return null; // fail if not exactly one set of length offsets found

                return tasks[0].Result.Concat(lengthPatches.First()).ToArray();
            });
        }

        #endregion

        #region dynres_forceoffline

        private static Task<Patch[]> findDynresForceoffline(byte[] data)
        {
            return Task.Factory.ContinueWhenAll(new[]
            {
                Task.Factory.StartNew(() => findPattern(data, 0x4, "baa7935217488d0d")) // 3.210
					.ContinueWith(task =>
                        task.Result.Select(addr => addr + 0x22 + BitConverter.ToInt32(data, addr + 0x1A)).ToArray()),
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

        #region dynres_enable

        private static Task<Patch[]> findDynresEnable(byte[] data)
        {
            return Task.Factory.ContinueWhenAll(new[]
            {
                Task.Factory.StartNew(() => findPattern(data, 0x4, "ba502e23f1488d0d")) // 3.210
					.ContinueWith(task =>
                        task.Result.Select(addr => addr + 0x22 + BitConverter.ToInt32(data, addr + 0x1A)).ToArray()),
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
