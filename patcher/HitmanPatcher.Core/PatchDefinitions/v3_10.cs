namespace HitmanPatcher.PatchDefinitions
{
    internal static class v3_10
    {
        internal static void AddVersions()
        {
            HitmanVersion.AddVersion("3.10.0.0_dx12", 0x5FFECE18, v3_10_0_dx12);
            HitmanVersion.AddVersion("3.10.0.0-h1_dx12", 0x60084611, v3_10_0_h1_dx12);
            HitmanVersion.AddVersion("3.10.1.0_dx12", 0x600AB0F6, v3_10_1_dx12);
        }

        private static readonly HitmanVersion v3_10_0_dx12 = new HitmanVersion()
        {
            certpin = new[]
            {
                new Patch(0x0C9E55E, "0F85", "90E9", MemProtection.PAGE_EXECUTE_READ)
            },
            authheader = new[]
            {
                new Patch(0x0A10837, "75", "EB", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x0A1085B, "0F8482000000", "909090909090", MemProtection.PAGE_EXECUTE_READ)
            },
            configdomain = new[]
            {
                new Patch(0x2AAB688, "", "", MemProtection.PAGE_READWRITE, "configdomain")
            },
            protocol = new[]
            {
                new Patch(0x194BB20, Patch.https, Patch.http, MemProtection.PAGE_READONLY),
                new Patch(0x0A05694, "0C", "0B", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x0A34850, "0C", "0B", MemProtection.PAGE_EXECUTE_READ)
            },
            dynres_noforceoffline = new[]
            {
                new Patch(0x2AAC008, "01", "00", MemProtection.PAGE_EXECUTE_READWRITE)
            }
        };

        private static readonly HitmanVersion v3_10_0_h1_dx12 = v3_10_0_dx12;

        private static readonly HitmanVersion v3_10_1_dx12 = new HitmanVersion()
        {
            certpin = new[]
            {
                new Patch(0x0C9E61E, "0F85", "90E9", MemProtection.PAGE_EXECUTE_READ)
            },
            authheader = v3_10_0_dx12.authheader,
            configdomain = v3_10_0_dx12.configdomain,
            protocol = v3_10_0_dx12.protocol,
            dynres_noforceoffline = v3_10_0_dx12.dynres_noforceoffline
        };
    }
}
