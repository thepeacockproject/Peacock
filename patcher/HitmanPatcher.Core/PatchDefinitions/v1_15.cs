namespace HitmanPatcher.PatchDefinitions
{
    internal static class v1_15
    {
        internal static void AddVersions()
        {
            HitmanVersion.AddVersion("1.15.0.0_dx11", 0x5F8ED8B9, v1_15_0_dx11);
            HitmanVersion.AddVersion("1.15.0.0_dx12", 0x5F8ED8D0, v1_15_0_dx12);
        }

        private static readonly HitmanVersion v1_15_0_dx11 = new HitmanVersion()
        {
            certpin = new[]
            {
                new Patch(0x0CD744C, "0F85", "90E9", MemProtection.PAGE_EXECUTE_READ)
            },
            authheader = new[]
            {
                new Patch(0x09C3925, "0F84B3000000", "909090909090", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x09C3935, "0F84A3000000", "909090909090", MemProtection.PAGE_EXECUTE_READ)
            },
            configdomain = new[]
            {
                new Patch(0x273C628, "", "", MemProtection.PAGE_READWRITE, "configdomain")
            },
            protocol = new[]
            {
                new Patch(0x14DD458, "68", "61", MemProtection.PAGE_READONLY) // this is just stupid
			},
            dynres_noforceoffline = new[]
            {
                new Patch(0x273CAA8, "01", "00", MemProtection.PAGE_READWRITE)
            }
        };

        private static readonly HitmanVersion v1_15_0_dx12 = new HitmanVersion()
        {
            certpin = new[]
            {
                new Patch(0x0CD7C6C, "0F85", "90E9", MemProtection.PAGE_EXECUTE_READ)
            },
            authheader = new[]
            {
                new Patch(0x09C4C45, "0F84B3000000", "909090909090", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x09C4C55, "0F84A3000000", "909090909090", MemProtection.PAGE_EXECUTE_READ)
            },
            configdomain = new[]
            {
                new Patch(0x2744B28, "", "", MemProtection.PAGE_READWRITE, "configdomain")
            },
            protocol = new[]
            {
                new Patch(0x14E44B8, "68", "61", MemProtection.PAGE_READONLY) // this is just stupid
			},
            dynres_noforceoffline = new[]
            {
                new Patch(0x2744FA8, "01", "00", MemProtection.PAGE_READWRITE)
            }
        };
    }
}
