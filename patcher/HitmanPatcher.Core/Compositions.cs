#if WINDOWS
using System.Security.Principal;
#endif

namespace HitmanPatcher
{
    public static class Compositions
    {
        public static bool HasAdmin;
        public static ILoggingProvider Logger;

        public static void Initialize()
        {
            HasAdmin = CheckForAdmin();
        }

        private static bool CheckForAdmin()
        {
#if WINDOWS
            WindowsIdentity identity = WindowsIdentity.GetCurrent();
            WindowsPrincipal principal = new WindowsPrincipal(identity);
            return principal.IsInRole(WindowsBuiltInRole.Administrator);
#else
            return false;
#endif
        }
    }
}
