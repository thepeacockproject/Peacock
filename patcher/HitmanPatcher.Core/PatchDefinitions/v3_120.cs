namespace HitmanPatcher.PatchDefinitions
{
    public static class v3_120
    {
        public static void AddVersions()
        {
            HitmanVersion.AddVersion("3.120.0.0_epic_dx12", 0x62C641F4, v3_120_0_epic_dx12);
            HitmanVersion.AddVersion("3.120.0.0_steam_dx12", 0x62C6418B, v3_120_0_steam_dx12);
#if PLATFORM_SCARLETT
            HitmanVersion.AddVersion("3.120.0.0_gamepass_dx12", 0x62BDD5D5, v3_120_0_gamepass_dx12);
#endif
        }

        private static readonly HitmanVersion v3_120_0_epic_dx12 = new HitmanVersion()
        {
            certpin = new[]
            {
                new Patch(0x0FCF7CD, "0F85", "90E9", MemProtection.PAGE_EXECUTE_READ)
            },
            authheader = new[]
            {
                new Patch(0x0C84A8D, "0F85B5000000", "909090909090", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x0C84B73, "0F84B8000000", "909090909090", MemProtection.PAGE_EXECUTE_READ)
            },
            configdomain = new[]
            {
                new Patch(0x3C855B8, "", "", MemProtection.PAGE_READWRITE, "configdomain")
            },
            protocol = new[] {
                new Patch(0x1ECD668, Patch.https, Patch.http, MemProtection.PAGE_READONLY),
                new Patch(0x0C958B9, "0B", "0A", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x0C9599F, "0B", "0A", MemProtection.PAGE_EXECUTE_READ),
            },
            dynres_noforceoffline = new[]
            {
                new Patch(0x3C85810, "01", "00", MemProtection.PAGE_EXECUTE_READWRITE)
            }
        };

        private static readonly HitmanVersion v3_120_0_steam_dx12 = new HitmanVersion()
        {
            certpin = new[]
            {
                new Patch(0x0FCF06D, "0F85", "90E9", MemProtection.PAGE_EXECUTE_READ)
            },
            authheader = new[]
            {
                new Patch(0x0C81EDD, "0F85B5000000", "909090909090", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x0C81FC3, "0F84B8000000", "909090909090", MemProtection.PAGE_EXECUTE_READ)
            },
            configdomain = new[]
            {
                new Patch(0x3C8CB78, "", "", MemProtection.PAGE_READWRITE, "configdomain")
            },
            protocol = new[]
            {
                new Patch(0x1ED0E28, "68", "61", MemProtection.PAGE_READONLY)
            },
            dynres_noforceoffline = new[]
            {
                new Patch(0x3C8CDD0, "01", "00", MemProtection.PAGE_EXECUTE_READWRITE)
            }
        };

#if PLATFORM_SCARLETT
        private static readonly HitmanVersion v3_120_0_gamepass_dx12 = new HitmanVersion()
        {
            certpin = new[]
            {
                new Patch(0x10159ED, "0F85", "90E9", MemProtection.PAGE_EXECUTE_READ)
            },
            authheader = new[]
            {
                new Patch(0x0C7B50D, "0F85B5000000", "909090909090", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x0C7B5F3, "0F84B5000000", "909090909090", MemProtection.PAGE_EXECUTE_READ)
            },
            configdomain = new[]
            {
                new Patch(0x3D594C8, "", "", MemProtection.PAGE_READWRITE, "configdomain")
            },
            protocol = new[] {
                new Patch(0x1F59168, Patch.https, Patch.http, MemProtection.PAGE_READONLY),
                new Patch(0x0CA2749, "0B", "0A", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x0CA282F, "0B", "0A", MemProtection.PAGE_EXECUTE_READ),
            },
            dynres_noforceoffline = new[]
            {
                new Patch(0x3D58DC8, "01", "00", MemProtection.PAGE_EXECUTE_READWRITE)
            }
        };
#endif
    }
}
