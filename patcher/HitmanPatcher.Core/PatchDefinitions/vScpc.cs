namespace HitmanPatcher.PatchDefinitions
{
    internal static class vScpc
    {
        internal static void AddVersions()
        {
            HitmanVersion.AddVersion("1.0.1.0-h1_dx11_sniper", 0x5B31107D, v1_0_1_h1_dx11_scpc);
            HitmanVersion.AddVersion("1.0.1.0-h1_dx12_sniper", 0x5B311189, v1_0_1_h1_dx12_scpc);
        }

        private static readonly HitmanVersion v1_0_1_h1_dx11_scpc = new HitmanVersion()
        {
            certpin = new[]
            {
                new Patch(0x0E32B46, "75", "EB", MemProtection.PAGE_EXECUTE_READ)
            },
            authheader = new[]
            {
                new Patch(0x0A964F5, "0F84B3000000", "909090909090", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x0A96505, "0F84A3000000", "909090909090", MemProtection.PAGE_EXECUTE_READ)
            },
            configdomain = new[]
            {
                new Patch(0x2AA4948, "", "", MemProtection.PAGE_READWRITE, "configdomain")
            },
            protocol = new[]
            {
                new Patch(0x16A5260, "68", "61", MemProtection.PAGE_READONLY)
            },
            dynres_noforceoffline = new[]
            {
                new Patch(0x2AA4E48, "01", "00", MemProtection.PAGE_READWRITE)
            }
        };

        private static readonly HitmanVersion v1_0_1_h1_dx12_scpc = new HitmanVersion()
        {
            certpin = new[]
            {
                new Patch(0x0E31486, "75", "EB", MemProtection.PAGE_EXECUTE_READ)
            },
            authheader = new[]
            {
                new Patch(0x0A95685, "0F84B3000000", "909090909090", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x0A95695, "0F84A3000000", "909090909090", MemProtection.PAGE_EXECUTE_READ)
            },
            configdomain = new[]
            {
                new Patch(0x2AB5F08, "", "", MemProtection.PAGE_READWRITE, "configdomain")
            },
            protocol = new[]
            {
                new Patch(0x16B6270, "68", "61", MemProtection.PAGE_READONLY)
            },
            dynres_noforceoffline = new[]
            {
                new Patch(0x2AB6408, "01", "00", MemProtection.PAGE_READWRITE)
            }
        };
    }
}
