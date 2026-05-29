namespace HitmanPatcher.PatchDefinitions
{
    public static class v007FirstLight
    {
        public static void AddVersions()
        {
            HitmanVersion.AddVersion("007FirstLight", 0x6A135D07, firstLightLaunchBuild);
            HitmanVersion.AddVersion("007FirstLight", 0x6A16C68D, firstLightPatch1);
        }

        private static readonly HitmanVersion firstLightLaunchBuild = new()
        {
            // jnz 0x1409b5a73 at VA 0x1409B5BA3 -> RVA 0x9B5BA3 (image base 0x140000000)
            certpin =
            [
                new Patch(0x09B5BA3, "0F85", "90E9", MemProtection.PAGE_EXECUTE_READ)
            ],
            authheader = [],
            configdomain = [],
            protocol = [],
            dynres_noforceoffline = []
        };

        private static readonly HitmanVersion firstLightPatch1 = new()
        {
            // jnz 0x1409b5bf3 at VA 0x1409B5D23 -> RVA 0x9B5D23 (image base 0x140000000)
            certpin =
            [
                new Patch(0x09B5D23, "0F85", "90E9", MemProtection.PAGE_EXECUTE_READ)
            ],
            authheader = [],
            configdomain = [],
            protocol = [],
            dynres_noforceoffline = []
        };
    }
}
