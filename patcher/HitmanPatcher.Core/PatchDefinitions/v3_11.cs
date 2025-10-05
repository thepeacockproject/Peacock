namespace HitmanPatcher.PatchDefinitions
{
    internal static class v3_11
    {
        internal static void AddVersions()
        {
            HitmanVersion.AddVersion("3.11.0.0_dx12", 0x60338C8E, v3_11_0_dx12);
        }

        private static readonly HitmanVersion v3_11_0_dx12 = new HitmanVersion()
        {
            certpin = new[]
            {
                new Patch(0x0CA5F3E, "0F85", "90E9", MemProtection.PAGE_EXECUTE_READ)
            },
            authheader = new[]
            {
                new Patch(0x0A15D07, "75", "EB", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x0A15D2B, "0F8482000000", "909090909090", MemProtection.PAGE_EXECUTE_READ)
            },
            configdomain = new[]
            {
                new Patch(0x2AB84E8, "", "", MemProtection.PAGE_READWRITE, "configdomain")
            },
            protocol = new[]
            {
                new Patch(0x19562A0, Patch.https, Patch.http, MemProtection.PAGE_READONLY),
                new Patch(0x0A0AAD4, "0C", "0B", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x0A3A120, "0C", "0B", MemProtection.PAGE_EXECUTE_READ)
            },
            dynres_noforceoffline = new[]
            {
                new Patch(0x2AB8E68, "01", "00", MemProtection.PAGE_EXECUTE_READWRITE)
            }
        };
    }
}
