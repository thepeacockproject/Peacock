namespace HitmanPatcher.PatchDefinitions
{
    public static class v3_110
    {
        public static void AddVersions()
        {
            HitmanVersion.AddVersion("3.110.1.0_epic_dx12", 0x6283A378, v3_110_1_epic_dx12);
            HitmanVersion.AddVersion("3.110.1.0_steam_dx12", 0x6283A806, v3_110_1_steam_dx12);
        }

        private static readonly HitmanVersion v3_110_1_epic_dx12 = new HitmanVersion()
        {
            certpin = new[]
            {
                new Patch(0x100942d, "0F85", "90E9", MemProtection.PAGE_EXECUTE_READ)
            },
            authheader = new[]
            {
                new Patch(0x0CBF2BD, "0F85B5000000", "909090909090", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x0CBF3A3, "0F84B8000000", "909090909090", MemProtection.PAGE_EXECUTE_READ)
            },
            configdomain = new[]
            {
                new Patch(0x3C820B8, "", "", MemProtection.PAGE_READWRITE, "configdomain")
            },
            protocol = new[]
            {
                new Patch(0x1ECA1D0, "68", "61", MemProtection.PAGE_READONLY)
            },
            dynres_noforceoffline = new[]
            {
                new Patch(0x3C82310, "01", "00", MemProtection.PAGE_EXECUTE_READWRITE)
            }
        };

        private static readonly HitmanVersion v3_110_1_steam_dx12 = new HitmanVersion()
        {
            certpin = new[]
            {
                new Patch(0x1008CBD, "0F85", "90E9", MemProtection.PAGE_EXECUTE_READ)
            },
            authheader = new[]
            {
                new Patch(0x0CBC6ED, "0F85B5000000", "909090909090", MemProtection.PAGE_EXECUTE_READ),
                new Patch(0x0CBC7D3, "0F84B8000000", "909090909090", MemProtection.PAGE_EXECUTE_READ)
            },
            configdomain = new[]
            {
                new Patch(0x3C888B8, "", "", MemProtection.PAGE_READWRITE, "configdomain")
            },
            protocol = new[]
            {
                new Patch(0x1ECD740, "68", "61", MemProtection.PAGE_READONLY)
            },
            dynres_noforceoffline = new[]
            {
                new Patch(0x3C88B10, "01", "00", MemProtection.PAGE_EXECUTE_READWRITE)
            }
        };
    }
}
