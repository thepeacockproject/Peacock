namespace HitmanPatcher.PatchDefinitions
{
    internal static class v2_71
    {
        internal static void AddVersions()
        {
            HitmanVersion.AddVersion("2.71.0.0-h1_dx11", 0x5D9DEA3E, v2_71_0_h1_dx11);
            HitmanVersion.AddVersion("2.71.0.0-h1_dx12", 0x5D9DEA53, v2_71_0_h1_dx12);
        }

        private static readonly HitmanVersion v2_71_0_h1_dx11 = new HitmanVersion()
        {
            certpin = new[]
            {
                new Patch(0x0F33293, "75", "EB", MemProtection.PAGE_EXECUTE_READ)
            },
            authheader = new[]
            {
                new Patch(0x0B5A238, "75", "EB", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x0B5A25C, "0F8486000000", "909090909090", MemProtection.PAGE_EXECUTE_READ)
            },
            configdomain = new[]
            {
                new Patch(0x2BBB5E8, "", "", MemProtection.PAGE_READWRITE, "configdomain")
            },
            protocol = new[]
            {
                new Patch(0x182D598, Patch.https, Patch.http, MemProtection.PAGE_READONLY),
                new Patch(0x0B4EDA4, "0C", "0B", MemProtection.PAGE_EXECUTE_READ)
            },
            dynres_noforceoffline = new[]
            {
                new Patch(0x2BBBF28, "01", "00", MemProtection.PAGE_READWRITE)
            }
        };

        private static readonly HitmanVersion v2_71_0_h1_dx12 = new HitmanVersion()
        {
            certpin = new[]
            {
                new Patch(0x0F32DF3, "75", "EB", MemProtection.PAGE_EXECUTE_READ)
            },
            authheader = new[]
            {
                new Patch(0x0B59D98, "75", "EB", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x0B59DBC, "0F8486000000", "909090909090", MemProtection.PAGE_EXECUTE_READ)
            },
            configdomain = new[]
            {
                new Patch(0x2BD9CA8, "", "", MemProtection.PAGE_READWRITE, "configdomain")
            },
            protocol = new[]
            {
                new Patch(0x18486B8, Patch.https, Patch.http, MemProtection.PAGE_READONLY),
                new Patch(0x0B4E904, "0C", "0B", MemProtection.PAGE_EXECUTE_READ)
            },
            dynres_noforceoffline = new[]
            {
                new Patch(0x2BDA5E8, "01", "00", MemProtection.PAGE_EXECUTE_READWRITE)
            }
        };
    }
}
