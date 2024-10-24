#if !LINUX
using System.ComponentModel;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Security.Principal;

namespace HitmanPatcher
{
    public static partial class Pinvoke 
    {
        //Source: https://docs.microsoft.com/en-us/windows/win32/api/winternl/nf-winternl-ntqueryinformationprocess
        private enum PROCESSINFOCLASS
        {
            ProcessBasicInformation = 0,
            ProcessDebugPort = 7,
            ProcessWow64Information = 26,
            ProcessImageFileName = 27,
            ProcessBreakOnTermination = 29,
            ProcessSubsystemInformation = 75
        }

        //Source: https://docs.microsoft.com/en-us/windows/win32/api/winternl/nf-winternl-ntqueryinformationprocess
        [StructLayout(LayoutKind.Sequential)]
        private struct PROCESS_BASIC_INFORMATION
        {
            public IntPtr Reserved1;
            public IntPtr PebBaseAddress;
            public IntPtr Reserved2_0;
            public IntPtr Reserved2_1;
            public IntPtr UniqueProcessId;
            public IntPtr Reserved3;
        }

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool AttachConsole(int dwProcessId);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern IntPtr OpenProcess(ProcessAccess dwDesiredAccess, bool bInheritHandle, int dwProcessId);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool CloseHandle(IntPtr hObject);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool WriteProcessMemory([In] IntPtr hProcess, [In] IntPtr address, [In, MarshalAs(UnmanagedType.LPArray)] byte[] buffer, [In] UIntPtr size, [Out] out UIntPtr byteswritten);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool ReadProcessMemory([In] IntPtr hProcess, [In] IntPtr address, [Out, MarshalAs(UnmanagedType.LPArray, SizeParamIndex = 3)] byte[] buffer, [In] UIntPtr size, [Out] out UIntPtr numberOfBytesRead);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool VirtualProtectEx([In] IntPtr hProcess, [In] IntPtr lpAddress, [In] UIntPtr dwSize, [In] MemProtection flNewProtect, [Out] out MemProtection lpflOldProtect);

        [DllImport("ntdll.dll")]
        private static extern int NtQueryInformationProcess(IntPtr hProcess, PROCESSINFOCLASS processInformationClass, out PROCESS_BASIC_INFORMATION processInformation, uint processInformationLength, out uint returnLength);

        public static bool CheckForAdmin()
        {
            using var identity = WindowsIdentity.GetCurrent();

            var principal = new WindowsPrincipal(identity);

            return principal.IsInRole(WindowsBuiltInRole.Administrator);
        }

        public static int GetProcessParentPid(Process process)
        {
            IntPtr hProcess = OpenProcess(
                ProcessAccess.PROCESS_VM_READ
                | ProcessAccess.PROCESS_QUERY_INFORMATION,
                false, process.Id);

            if (hProcess == IntPtr.Zero)
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "Failed to get a process handle.");
            }

            PROCESS_BASIC_INFORMATION PEB = new PROCESS_BASIC_INFORMATION();

            int result = NtQueryInformationProcess(hProcess,
                PROCESSINFOCLASS.ProcessBasicInformation, out PEB,
                (uint)Marshal.SizeOf(PEB), out _);

            CloseHandle(hProcess);
            if (result != 0)
            {
                throw new Win32Exception(result, "(NTSTATUS)"); // not a w32 status code, but an NTSTATUS
            }

            return PEB.Reserved3.ToInt32(); // undocumented, but should hold the parent PID
        }

        public static ProcessMetadata GetProcessMetadata(Process process)
        {
            return new ProcessMetadata
            {
                PID = process.Id,
                BaseAddress = process.MainModule?.BaseAddress ?? IntPtr.Zero,
                ModuleMemorySize = process.MainModule?.ModuleMemorySize ?? 0
            };
        }
    }
}
#endif