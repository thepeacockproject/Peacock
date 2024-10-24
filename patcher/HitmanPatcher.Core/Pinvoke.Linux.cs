#if LINUX
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;

namespace HitmanPatcher;

public static partial class Pinvoke
{
    [StructLayout(LayoutKind.Sequential)]
#pragma warning disable CS8981
    private unsafe struct iovec
#pragma warning restore CS8981
    {
        public void* iov_base;
        public int iov_len;
    }

    private enum PtraceRequest
    {
        //PTRACE_PEEKDATA = 2,
        PTRACE_POKEDATA = 5,
        PTRACE_ATTACH = 16,
        PTRACE_DETACH = 17
    }

    [DllImport("libc", SetLastError = true)]
    private static extern unsafe long ptrace(PtraceRequest request, int pid, void* address, void* data);

    [DllImport("libc", SetLastError = true)]
    private static extern unsafe int process_vm_readv(int pid, iovec* local_iov, ulong liovcnt, iovec* remote_iov, ulong riovcnt, ulong flags);

    private static readonly Regex _modulePathRegex = new Regex("\\/.*?$", RegexOptions.Compiled);

    public static ProcessMetadata GetProcessMetadata(Process process)
    {
        var lines = File.ReadAllLines($"/proc/{process.Id}/maps");

        var findProcess = process.ProcessName.ToLower();
        var foundModule = lines.First(x => x.Contains(findProcess, StringComparison.CurrentCultureIgnoreCase));
        var foundModulePath = _modulePathRegex.Match(foundModule).Value;
        var (baseAddress, imageSize) = GetImageSizeFromPE(foundModulePath);

        return new ProcessMetadata
        {
            PID = process.Id,
            BaseAddress = new IntPtr((long) baseAddress),
            ModuleMemorySize = imageSize
        };
    }

    /**
     * Attach to the given process using ptrace, return the PID as the handle.
     */
    public static unsafe IntPtr OpenProcess(ProcessAccess dwDesiredAccess, bool bInheritHandle, int dwProcessId)
    {
        Compositions.Logger.log("Open: " + dwProcessId);

        var result = ptrace(PtraceRequest.PTRACE_ATTACH, dwProcessId, null, null);

        if (result == -1)
        {
            Compositions.Logger.log($"- Attach error: {LastError}");

            return IntPtr.Zero;
        }

        Compositions.Logger.log("- Attach: " + result);

        return new IntPtr(dwProcessId);
    }

    /**
     * Retrieve the PID from the handle, and detach from the process using ptrace.
     */
    public static unsafe void CloseHandle(IntPtr hProcess)
    {
        var pid = hProcess.ToInt32();

        Compositions.Logger.log($"Close: {pid}");

        var result = ptrace(PtraceRequest.PTRACE_DETACH, pid, null, null);

        if (result == -1)
        {
            Compositions.Logger.log($"- Detach error: {LastError}");
        }
        else
        {
            Compositions.Logger.log($"- Detach: {result}");
        }
    }

    /**
     * Since process_vm_writev is too respectful of permissions, we have to use ptrace to write to memory.
     *
     * ptrace writes data in blocks of 8 bytes (long), so if a given buffer is non-divisible by 8, we have to pad it with data read from memory to prevent corruption.
     */
    public static unsafe bool WriteProcessMemory(IntPtr hProcess, IntPtr address, byte[] buffer, UIntPtr size, out UIntPtr numberOfBytesWritten)
    {
        var pid = hProcess.ToInt32();
        var sizeAsUInt = (int)size.ToUInt32();

        Compositions.Logger.log($"Write: {pid} {sizeAsUInt}");

        var desiredBufferSize = (int)Math.Ceiling(sizeAsUInt / 8.0) * 8;

        byte[] paddedBuffer;

        if (sizeAsUInt < desiredBufferSize)
        {
            Compositions.Logger.log($"- Padding buffer to {desiredBufferSize}");

            paddedBuffer = new byte[desiredBufferSize];
            ReadProcessMemory(hProcess, address, paddedBuffer, new UIntPtr((uint)desiredBufferSize), out _);

            for (var i = 0; i < sizeAsUInt; i++)
            {
                paddedBuffer[i] = buffer[i];
            }
        }
        else
        {
            paddedBuffer = buffer;
        }

        Compositions.Logger.log($"- Padded: {BitConverter.ToString(paddedBuffer)}");

        var debugBuffer = new byte[paddedBuffer.Length];
        ReadProcessMemory(hProcess, address, debugBuffer, new UIntPtr((uint)debugBuffer.Length), out _);
        Compositions.Logger.log($"- Debug before: {BitConverter.ToString(debugBuffer)}");

        for (int i = 0; i < desiredBufferSize; i += 8)
        {
            var value = BitConverter.ToInt64(paddedBuffer, i);

            var result = ptrace(PtraceRequest.PTRACE_POKEDATA, pid, (address + i).ToPointer(), (void*)value);

            if (result == -1)
            {
                Compositions.Logger.log($"- Poke error: {LastError}");

                numberOfBytesWritten = UIntPtr.Zero;

                return false;
            }

            Compositions.Logger.log($"- Poke: {result}");
        }

        debugBuffer = new byte[paddedBuffer.Length];
        ReadProcessMemory(hProcess, address, debugBuffer, new UIntPtr((uint)debugBuffer.Length), out _);
        Compositions.Logger.log("- Debug after: " + BitConverter.ToString(debugBuffer));

        numberOfBytesWritten = size;

        return true;
    }

    /**
     * Memory can always be read regardless of permissions, so we can use process_vm_readv.
     *
     * To prevent stack overflows, memory is read in chunks of 1MB.
     */
    public static unsafe bool ReadProcessMemory(IntPtr hProcess, IntPtr address, byte[] buffer, UIntPtr size, out UIntPtr numberOfBytesRead)
    {
        var pid = hProcess.ToInt32();
        var sizeAsUInt = (int)size.ToUInt32();

        Compositions.Logger.log($"Read: {pid} {sizeAsUInt}");

        var chunkSize = Math.Min(sizeAsUInt, 1_000_000);

        var ptr = stackalloc byte[chunkSize];

        for (var i = 0; i < sizeAsUInt; i += chunkSize)
        {
            if (sizeAsUInt - i < chunkSize)
            {
                chunkSize = sizeAsUInt - i;
            }

            Compositions.Logger.log($"- Chunk: {i}/{sizeAsUInt} => {chunkSize}");

            var localIo = new iovec
            {
                iov_base = ptr,
                iov_len = chunkSize
            };

            var remoteIo = new iovec
            {
                iov_base = (address + i).ToPointer(),
                iov_len = chunkSize
            };

            var res = process_vm_readv(pid, &localIo, 1, &remoteIo, 1, 0);

            if (res == -1)
            {
                numberOfBytesRead = UIntPtr.Zero;

                return false;
            }

            Marshal.Copy((IntPtr)ptr, buffer, i, chunkSize);
        }

        numberOfBytesRead = new UIntPtr((uint)sizeAsUInt);

        return true;
    }

    /**
     * Technically ptrace attach/detach would be the closest equivalent, but from a performance perspective, we only do that once.
     */
    public static bool VirtualProtectEx(IntPtr hProcess, IntPtr lpAddress, UIntPtr dwSize, MemProtection flNewProtect, out MemProtection lpflOldProtect)
    {
        lpflOldProtect = 0;

        return true;
    }

    public static void AttachConsole(int attachParentProcess)
    {
        //Do nothing
    }

    public static bool CheckForAdmin()
    {
        //TODO: Check if SUDO_USER is set

        return false;
    }

    public static int GetProcessParentPid(Process process)
    {
        //TODO: Retrieve "PPid" from "/proc/pid/status"

        return -1;
    }

    private static (ulong, uint) GetImageSizeFromPE(string modulePath) 
    {
        using var module = File.OpenRead(modulePath);
        using var reader = new BinaryReader(module);

        //Validate DOS Header (MZ)
        var dosHeader = reader.ReadUInt16();

        if(dosHeader != 0x5A4D) {
            return (0, 0);
        }

        //Skip to PE offset
        reader.BaseStream.Seek(0x3A, SeekOrigin.Current);
        var peOffset = reader.ReadInt32();

        //Validate PE Header (PE\0\0)
        reader.BaseStream.Seek(peOffset, SeekOrigin.Begin);
        var peHeader = reader.ReadUInt32();

        if(peHeader != 0x00004550) {
            return (0, 0); 
        }

        //Validate PE Type (PE32+)
        reader.BaseStream.Seek(20, SeekOrigin.Current);
        var peType = reader.ReadUInt16();

        if(peType != 0x020B) {
            return (0, 0);
        }

        //Skip to base address
        reader.BaseStream.Seek(22, SeekOrigin.Current);
        var baseAddress = reader.ReadUInt64();

        //Skip to image size
        reader.BaseStream.Seek(24, SeekOrigin.Current);
        var imageSize = reader.ReadUInt32();

        return (baseAddress, imageSize);
    }
}
#endif