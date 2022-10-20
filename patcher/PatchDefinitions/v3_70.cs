namespace HitmanPatcher.PatchDefinitions
{
    internal static class v3_70
    {
        internal static void AddVersions()
        {
            HitmanVersion.AddVersion("3.70.0.0_dx12", 0x614B0237, v3_70_0_dx12);
            HitmanVersion.AddVersion("3.70.0.0-h1_dx12", 0x6157119F, v3_70_0_h1_dx12);
            HitmanVersion.AddVersion("3.70.0.0-h2_dx12", 0x615D0611, v3_70_0_h2_dx12);
        }

        private static readonly HitmanVersion v3_70_0_dx12 = new HitmanVersion()
        {
            certpin = new[]
            {
                new Patch(0x0FA9DAD, "0F85", "90E9", MemProtection.PAGE_EXECUTE_READ)
            },
            authheader = new[]
            {
                new Patch(0x0C6A3FD, "0F85B5000000", "909090909090", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x0C6A4E3, "0F84B8000000", "909090909090", MemProtection.PAGE_EXECUTE_READ)
            },
            configdomain = new[]
            {
                new Patch(0x3B22198, "", "", MemProtection.PAGE_READWRITE, "configdomain")
            },
            protocol = new[]
            {
                new Patch(0x1E77550, "68", "61", MemProtection.PAGE_READONLY) // dont ask me why this works
            },
            dynres_noforceoffline = new[]
            {
                new Patch(0x3B22B18, "01", "00", MemProtection.PAGE_EXECUTE_READWRITE)
            }
        };

        private static readonly HitmanVersion v3_70_0_h1_dx12 = new HitmanVersion()
        {
            certpin = v3_70_0_dx12.certpin,
            authheader = v3_70_0_dx12.authheader,
            configdomain = v3_70_0_dx12.configdomain,
            protocol = new[]
            {
                new Patch(0x1E77580, "68", "61", MemProtection.PAGE_READONLY)
            },
            dynres_noforceoffline = v3_70_0_dx12.dynres_noforceoffline
        };

        private static readonly HitmanVersion v3_70_0_h2_dx12 = v3_70_0_h1_dx12;
    }
}
