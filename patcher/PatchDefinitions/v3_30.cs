namespace HitmanPatcher.PatchDefinitions
{
    internal static class v3_30
    {
        internal static void AddVersions()
        {
            HitmanVersion.AddVersion("3.30.0.0_dx12", 0x608B687F, v3_30_0_dx12);
        }

        private static readonly HitmanVersion v3_30_0_dx12 = new HitmanVersion()
        {
            certpin = new[]
            {
                new Patch(0x0F96A9D, "0F85", "90E9", MemProtection.PAGE_EXECUTE_READ)
            },
            authheader = new[]
            {
                new Patch(0x0C5AC8D, "0F85B5000000", "909090909090", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x0C5AD73, "0F84B8000000", "909090909090", MemProtection.PAGE_EXECUTE_READ)
            },
            configdomain = new[]
            {
                new Patch(0x3AC8998, "", "", MemProtection.PAGE_READWRITE, "configdomain")
            },
            protocol = new[]
            {
                new Patch(0x1E55A40, "68", "61", MemProtection.PAGE_READONLY) // dont ask me why this works
			},
            dynres_noforceoffline = new[]
            {
                new Patch(0x3AC9318, "01", "00", MemProtection.PAGE_EXECUTE_READWRITE)
            }
        };
    }
}
