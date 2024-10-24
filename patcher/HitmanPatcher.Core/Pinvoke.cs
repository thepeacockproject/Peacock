using System.Runtime.InteropServices;

namespace HitmanPatcher
{
    public class ProcessMetadata
    {
        public int PID { get; set; } 
        public IntPtr BaseAddress { get; set; }
        public long ModuleMemorySize { get; set; }
    }

    //Source: https://docs.microsoft.com/en-us/windows/win32/memory/memory-protection-constants
    [Flags]
    public enum MemProtection : uint
    {
        PAGE_EXECUTE = 0x00000010,
        PAGE_EXECUTE_READ = 0x00000020,
        PAGE_EXECUTE_READWRITE = 0x00000040,
        PAGE_EXECUTE_WRITECOPY = 0x00000080,
        PAGE_NOACCESS = 0x00000001,
        PAGE_READONLY = 0x00000002,
        PAGE_READWRITE = 0x00000004,
        PAGE_WRITECOPY = 0x00000008,
        PAGE_GUARD = 0x00000100,
        PAGE_NOCACHE = 0x00000200,
        PAGE_WRITECOMBINE = 0x00000400
    }

    //Source: https://docs.microsoft.com/en-us/windows/win32/procthread/process-security-and-access-rights
    [Flags]
    public enum ProcessAccess : uint
    {
        PROCESS_QUERY_INFORMATION = 0x0400, // Required to retrieve certain information about a process.
        PROCESS_VM_READ = 0x0010, // Required to read memory in a process using ReadProcessMemory.
        PROCESS_VM_WRITE = 0x0020, // Required to write to memory in a process using WriteProcessMemory.
        PROCESS_VM_OPERATION = 0x0008 // Required to perform an operation on the address space of a process using VirtualProtectEx
    }

    public static partial class Pinvoke
    {
        public static int LastError => Marshal.GetLastWin32Error();
    }
}
