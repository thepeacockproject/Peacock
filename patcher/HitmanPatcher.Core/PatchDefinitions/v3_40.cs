namespace HitmanPatcher.PatchDefinitions
{
    internal static class v3_40
    {
        internal static void AddVersions()
        {
            HitmanVersion.AddVersion("3.40.0.0_dx12", 0x60C1D571, v3_40_0_dx12);
            HitmanVersion.AddVersion("3.40.1.0_dx12", 0x60D1D7D0, v3_40_1_dx12);
        }

        private static readonly HitmanVersion v3_40_0_dx12 = new HitmanVersion()
        {
            certpin = new[]
            {
                new Patch(0x0FA04ED, "0F85", "90E9", MemProtection.PAGE_EXECUTE_READ)
            },
            authheader = new[]
            {
                new Patch(0x0C6184D, "0F85B5000000", "909090909090", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x0C61933, "0F84B8000000", "909090909090", MemProtection.PAGE_EXECUTE_READ)
            },
            configdomain = new[]
            {
                new Patch(0x3AE1DD8, "", "", MemProtection.PAGE_READWRITE, "configdomain")
            },
            protocol = new[]
            {
                new Patch(0x1E65918, "68", "61", MemProtection.PAGE_READONLY) // dont ask me why this works
			},
            dynres_noforceoffline = new[]
            {
                new Patch(0x3AE2758, "01", "00", MemProtection.PAGE_EXECUTE_READWRITE)
            }
        };

        private static readonly HitmanVersion v3_40_1_dx12 = new HitmanVersion()
        {
            certpin = v3_40_0_dx12.certpin,
            authheader = v3_40_0_dx12.authheader,
            configdomain = new[]
            {
                new Patch(0x3AE1D18, "", "", MemProtection.PAGE_READWRITE, "configdomain")
            },
            protocol = new[]
            {
                new Patch(0x1E65968, "68", "61", MemProtection.PAGE_READONLY) // dont ask me why this works
			},
            dynres_noforceoffline = new[]
            {
                new Patch(0x3AE2698, "01", "00", MemProtection.PAGE_EXECUTE_READWRITE)
            }
        };
    }
}
