namespace HitmanPatcher.PatchDefinitions
{
    internal static class v3_20
    {
        internal static void AddVersions()
        {
            HitmanVersion.AddVersion("3.20.0.0_dx12", 0x604FB467, v3_20_0_dx12);
            HitmanVersion.AddVersion("3.20.0.0-h1_dx12", 0x605AB156, v3_20_0_h1_dx12);
        }

        private static readonly HitmanVersion v3_20_0_dx12 = new HitmanVersion()
        {
            certpin = new[]
            {
                new Patch(0x0CAC72E, "0F85", "90E9", MemProtection.PAGE_EXECUTE_READ)
            },
            authheader = new[]
            {
                new Patch(0x0A1AF77, "75", "EB", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x0A1AF9B, "0F8482000000", "909090909090", MemProtection.PAGE_EXECUTE_READ)
            },
            configdomain = new[]
            {
                new Patch(0x2AC4688, "", "", MemProtection.PAGE_READWRITE, "configdomain")
            },
            protocol = new[]
            {
                new Patch(0x195F9D8, Patch.https, Patch.http, MemProtection.PAGE_READONLY),
                new Patch(0x0A0FBE4, "0C", "0B", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x0A3F4E0, "0C", "0B", MemProtection.PAGE_EXECUTE_READ)
            },
            dynres_noforceoffline = new[]
            {
                new Patch(0x2AC5008, "01", "00", MemProtection.PAGE_EXECUTE_READWRITE)
            }
        };

        private static readonly HitmanVersion v3_20_0_h1_dx12 = new HitmanVersion()
        {
            certpin = new[]
            {
                new Patch(0x0CAC73E, "0F85", "90E9", MemProtection.PAGE_EXECUTE_READ)
            },
            authheader = v3_20_0_dx12.authheader,
            configdomain = v3_20_0_dx12.configdomain,
            protocol = v3_20_0_dx12.protocol,
            dynres_noforceoffline = v3_20_0_dx12.dynres_noforceoffline
        };
    }
}
