namespace HitmanPatcher.PatchDefinitions
{
    public static class v007FirstLight
    {
        public static void AddVersions()
        {
            HitmanVersion.AddVersion("007FirstLight", 0x6A135D07, firstLight);
        }

        private static readonly HitmanVersion firstLight = new HitmanVersion()
        {
            // jnz 0x1409b5a73 at VA 0x1409B5BA3 -> RVA 0x9B5BA3 (image base 0x140000000)
            certpin = new[]
            {
                new Patch(0x09B5BA3, "0F85", "90E9", MemProtection.PAGE_EXECUTE_READ)
            },
            authheader = new Patch[] { },
            configdomain = new Patch[] { },
            protocol = new Patch[] { },
            dynres_noforceoffline = new Patch[] { }
        };
    }
}
