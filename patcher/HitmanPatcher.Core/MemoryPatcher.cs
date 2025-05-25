using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;

namespace HitmanPatcher
{
    /// <summary>
	/// Describes a class that provides a logging implementation.
	/// </summary>
	/// <remarks>
	/// Please inform the Peacock team before changing or removing this API!
	/// </remarks>
	public interface ILoggingProvider
	{
		/// <summary>
		/// Logs the provided message.
		/// </summary>
		/// <param name="msg">The message.</param>
		void log(string msg);
	}

    public static class MemoryPatcher
    {
        public static HashSet<int> patchedprocesses = new HashSet<int>();

        private static List<Process> GetProcessesByName(params string[] names)
        {
			Process[] allProcesses = Process.GetProcesses();
			List<Process> result = new List<Process>();
			foreach (Process p in allProcesses)
			{
				try
				{
					if (names.Contains(p.ProcessName, StringComparer.OrdinalIgnoreCase))
					{
						result.Add(p);
					}
					else
					{
						p.Dispose();
					}
				}
				catch (InvalidOperationException) // Process has exited or has no name
				{
					p.Dispose();
				}
			}
			return result;
		}

		public static void PatchAllProcesses(ILoggingProvider logger, Options patchOptions)
		{
			IEnumerable<Process> hitmans = GetProcessesByName("HITMAN", "HITMAN2", "HITMAN3");
			foreach (Process process in hitmans)
			{
				if (!patchedprocesses.Contains(process.Id))
				{
					patchedprocesses.Add(process.Id);
					try
					{
						bool dontPatch = false;
						try
						{
							dontPatch = patchedprocesses.Contains(Pinvoke.GetProcessParentPid(process));
						}
						catch (Win32Exception ex)
						{
							if (ex.NativeErrorCode == 5 && !Compositions.HasAdmin)
							{
								logger.log(String.Format("Access denied, try running the patcher as admin."));
								process.Dispose();
								continue;
							}
							else // The process has exited already
							{
								dontPatch = true;
							}
						}
						if (dontPatch)
						{
							// if we patched this process' parent before, this is probably an error reporter, so don't patch it.
							logger.log(String.Format("Skipping PID {0}...", process.Id));
							process.Dispose();
							continue;
						}

						if (MemoryPatcher.Patch(process, patchOptions))
						{
							logger.log(String.Format("Successfully patched processid {0}", process.Id));
							if (patchOptions.SetCustomConfigDomain)
							{
								logger.log(String.Format("Injected server: {0}", patchOptions.CustomConfigDomain));
							}
						}
						else
						{
							// else: process not yet ready for patching, try again next timer tick
							patchedprocesses.Remove(process.Id);
						}
					}
					catch (Win32Exception err)
					{
						logger.log(String.Format("Failed to patch processid {0}: error code {1}", process.Id, err.NativeErrorCode));
						logger.log(err.Message);
					}
					catch (NotImplementedException)
					{
						logger.log(String.Format("Failed to patch processid {0}: unknown version", process.Id));
					}
				}
				process.Dispose();
			}
		}

        public static bool Patch(Process process, Options patchOptions)
        {
			IntPtr hProcess = Pinvoke.OpenProcess(
				  ProcessAccess.PROCESS_VM_READ
				| ProcessAccess.PROCESS_VM_WRITE
				| ProcessAccess.PROCESS_VM_OPERATION,
				false, process.Id);

            if (hProcess == IntPtr.Zero)
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "Failed to get a process handle.");
            }

			try
			{
				IntPtr b = IntPtr.Zero;
				try
				{
					ProcessModule mainModule = process.MainModule;
					b = mainModule.BaseAddress;
				}
				catch (NullReferenceException)
				{
					return false; // process has no main module (not initialized yet?), try again next timer tick.
				}

				uint timestamp = getTimestamp(hProcess, b);
				HitmanVersion v = HitmanVersion.GetVersion(timestamp);
				if (v == HitmanVersion.NotFound)
				{
					if (AOBScanner.TryGetHitmanVersionByScanning(process, hProcess, out v))
					{
						// add it to the db so subsequent patches don't need searching again
						HitmanVersion.AddVersion(timestamp.ToString("X8"), timestamp, v);
					}
					else
					{
						throw new NotImplementedException();
					}
				}
				UIntPtr byteswritten;
				MemProtection oldprotectflags = 0;
				byte[] newurl = Encoding.ASCII.GetBytes(patchOptions.CustomConfigDomain).Concat(new byte[] { 0x00 }).ToArray();
				List<Patch> patches = new List<Patch>();

				if (!IsReadyForPatching(hProcess, b, v))
				{
					// Online_ConfigDomain variable is not initialized yet, try again in 1 second.
					Pinvoke.CloseHandle(hProcess);
					return false;
				}

				if (patchOptions.DisableCertPinning)
				{
					patches.AddRange(v.certpin);
				}
				if (patchOptions.AlwaysSendAuthHeader)
				{
					patches.AddRange(v.authheader);
				}
				if (patchOptions.SetCustomConfigDomain)
				{
					patches.AddRange(v.configdomain);
				}
				if (patchOptions.UseHttp)
				{
					patches.AddRange(v.protocol);
				}
                // can be null on older game versions, which is fine, this should no longer be relevant when
                // PSVR and the main H3 branch merge back together in a late 2025 patch.
				if (patchOptions.EnableDynamicResources && v.dynres_enable is not null)
				{
					patches.AddRange(v.dynres_enable);
				}
				if (patchOptions.DisableForceOfflineOnFailedDynamicResources)
				{
					patches.AddRange(v.dynres_noforceoffline);
				}

				foreach (Patch patch in patches)
				{
					byte[] dataToWrite = patch.patch;
					if (patch.customPatch == "configdomain")
					{
						dataToWrite = newurl;
					}
					MemProtection newmemprotection;

					switch (patch.defaultProtection)
					{
						case MemProtection.PAGE_EXECUTE_READ:
						case MemProtection.PAGE_EXECUTE_READWRITE:
							newmemprotection = MemProtection.PAGE_EXECUTE_READWRITE;
							break;
						case MemProtection.PAGE_READONLY:
						case MemProtection.PAGE_READWRITE:
							newmemprotection = MemProtection.PAGE_READWRITE;
							break;
						default:
							throw new Exception("This shouldn't be able to happen.");
					}

					if (!Pinvoke.VirtualProtectEx(hProcess, b + patch.offset, (UIntPtr)dataToWrite.Length,
						newmemprotection, out oldprotectflags))
					{
						throw new Win32Exception(Marshal.GetLastWin32Error(), string.Format("error at {0} for offset {1:X}", "vpe1", patch.offset));
					}

					if (!Pinvoke.WriteProcessMemory(hProcess, b + patch.offset, dataToWrite, (UIntPtr)dataToWrite.Length, out byteswritten))
					{
						throw new Win32Exception(Marshal.GetLastWin32Error(), string.Format("error at {0} for offset {1:X}"
							+ "\nBytes written: {2}", "wpm", patch.offset, byteswritten));
					}

					MemProtection protectionToRestore = oldprotectflags;

					if (!Pinvoke.VirtualProtectEx(hProcess, b + patch.offset, (UIntPtr)dataToWrite.Length,
						protectionToRestore, out oldprotectflags))
					{
						throw new Win32Exception(Marshal.GetLastWin32Error(), string.Format("error at {0} for offset {1:X}", "vpe2", patch.offset));
					}
				}
			}
			finally
			{
				Pinvoke.CloseHandle(hProcess);
			}

			return true;
		}

		private static bool IsReadyForPatching(IntPtr hProcess, IntPtr baseAddress, HitmanVersion version)
		{
			byte[] buffer = { 0 };
			UIntPtr bytesread;
			bool ready = true;
			MemProtection newmemprotection = MemProtection.PAGE_READWRITE;
			// It should already be READWRITE, but this is to remove possible PAGE_GUARD temporarily
			foreach (Patch p in version.configdomain.Where(p => p.customPatch == "configdomain"))
			{
				MemProtection oldprotectflags;
				if (!Pinvoke.VirtualProtectEx(hProcess, baseAddress + p.offset, (UIntPtr)1, newmemprotection, out oldprotectflags))
				{
					throw new Win32Exception(Marshal.GetLastWin32Error(), string.Format("error at vpe1Check for offset {0:X}", p.offset));
				}
				if (!Pinvoke.ReadProcessMemory(hProcess, baseAddress + p.offset, buffer, (UIntPtr)1, out bytesread))
				{
					throw new Win32Exception(Marshal.GetLastWin32Error(), string.Format("error at rpmCheck for offset {0:X}", p.offset));
				}
				if (!Pinvoke.VirtualProtectEx(hProcess, baseAddress + p.offset, (UIntPtr)1, oldprotectflags, out oldprotectflags))
				{
					throw new Win32Exception(Marshal.GetLastWin32Error(), string.Format("error at vpe2Check for offset {0:X}", p.offset));
				}
				ready &= buffer[0] != 0;
			}
			return ready;
		}

		public struct Options
		{
			public bool DisableCertPinning;
			public bool AlwaysSendAuthHeader;
			public bool SetCustomConfigDomain;
			public string CustomConfigDomain;
			public bool UseHttp;
			public bool EnableDynamicResources;
			public bool DisableForceOfflineOnFailedDynamicResources;
        }

		public static UInt32 getTimestamp(IntPtr hProcess, IntPtr baseAddress)
		{
			byte[] buffer = new byte[4];
			UIntPtr bytesread;
			Pinvoke.ReadProcessMemory(hProcess, baseAddress + 0x3C, buffer, (UIntPtr)4, out bytesread);
			int NTHeaderOffset = BitConverter.ToInt32(buffer, 0);
			Pinvoke.ReadProcessMemory(hProcess, baseAddress + NTHeaderOffset + 0x8, buffer, (UIntPtr)4, out bytesread);
			return BitConverter.ToUInt32(buffer, 0);
		}
	}
}
