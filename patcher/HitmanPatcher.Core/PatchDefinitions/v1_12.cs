namespace HitmanPatcher.PatchDefinitions
{
    internal static class v1_12
    {
        internal static void AddVersions()
        {
            HitmanVersion.AddVersion("1.12.2.0_dx11", 0x59CBC22A, v1_12_2_dx11);
            HitmanVersion.AddVersion("1.12.2.0_dx12", 0x59CBC201, v1_12_2_dx12);
        }

        private static readonly HitmanVersion v1_12_2_dx11 = new HitmanVersion()
        {
            certpin = new[]
            {
                new Patch(0x0D787A8, "75", "EB", MemProtection.PAGE_EXECUTE_READ)
            },
            authheader = new[]
            {
                new Patch(0x0A852AF, "0F84B2000000", "909090909090", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x0A852BF, "0F8599000000", "909090909090", MemProtection.PAGE_EXECUTE_READ)
            },
            configdomain = new[]
            {
                new Patch(0x278A748, "", "", MemProtection.PAGE_READWRITE, "configdomain")
            },
            protocol = new[]
            {
                new Patch(0x154F680, "68", "61", MemProtection.PAGE_READONLY) // this is just stupid
            },
            dynres_noforceoffline = new[]
            {
                new Patch(0x278ABC8, "01", "00", MemProtection.PAGE_READWRITE)
            }
        };

        private static readonly HitmanVersion v1_12_2_dx12 = new HitmanVersion()
        {
            certpin = new[]
            {
                new Patch(0x0D77D78, "75", "EB", MemProtection.PAGE_EXECUTE_READ)
            },
            authheader = new[]
            {
                new Patch(0x0A842CF, "0F84B2000000", "909090909090", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x0A842DF, "0F8599000000", "909090909090", MemProtection.PAGE_EXECUTE_READ)
            },
            configdomain = new[]
            {
                new Patch(0x2792BC8, "", "", MemProtection.PAGE_READWRITE, "configdomain")
            },
            protocol = new[]
            {
                new Patch(0x1556800, "68", "61", MemProtection.PAGE_READONLY) // this is just stupid
            },
            dynres_noforceoffline = new[]
            {
                new Patch(0x2793048, "01", "00", MemProtection.PAGE_READWRITE)
            }
        };
    }
}
