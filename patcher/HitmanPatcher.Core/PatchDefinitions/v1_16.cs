namespace HitmanPatcher.PatchDefinitions
{
	internal static class v1_16
	{
		internal static void AddVersions()
		{
			HitmanVersion.AddVersion("1.16.0.0_epic_dx11", 0x5F8D62C5, v1_16_0_epic_dx11);
#if PLATFORM_GOG
            HitmanVersion.AddVersion("1.16.0.0_gog_dx11", 0x613A0240, v1_16_0_gog_dx11);
			HitmanVersion.AddVersion("1.16.0.0_gog_dx12", 0x613A0736, v1_16_0_gog_dx12);
#endif
        }

		private static readonly HitmanVersion v1_16_0_epic_dx11 = new HitmanVersion()
		{
			certpin = new[]
            {
                new Patch(0x0CD9FCC, "0F85", "90E9", MemProtection.PAGE_EXECUTE_READ)
            },
			authheader = new[]
			{
				new Patch(0x09C7815, "0F84B3000000", "909090909090", MemProtection.PAGE_EXECUTE_READ),
				new Patch(0x09C7825, "0F84A3000000", "909090909090", MemProtection.PAGE_EXECUTE_READ)
			},
			configdomain = new[]
            {
                new Patch(0x273A548, "", "", MemProtection.PAGE_READWRITE, "configdomain")
            },
			protocol = new[]
			{
				new Patch(0x14DB678, "68", "61", MemProtection.PAGE_READONLY) // this is just stupid
			},
			dynres_noforceoffline = new[]
            {
                new Patch(0x273A9C8, "01", "00", MemProtection.PAGE_READWRITE)
            }
		};

#if PLATFORM_GOG
		private static readonly HitmanVersion v1_16_0_gog_dx11 = new HitmanVersion()
		{
			certpin = new[]
            {
                new Patch(0x0CD649C, "0F85", "90E9", MemProtection.PAGE_EXECUTE_READ)
            },
			authheader = new[]
			{
				new Patch(0x09C4D95, "0F84B3000000", "909090909090", MemProtection.PAGE_EXECUTE_READ),
				new Patch(0x09C4DA5, "0F84A3000000", "909090909090", MemProtection.PAGE_EXECUTE_READ)
			},
			configdomain = new[]
            {
                new Patch(0x2739988, "", "", MemProtection.PAGE_READWRITE, "configdomain")
            },
			protocol = new[]
			{
				new Patch(0x14DA438, "68", "61", MemProtection.PAGE_READONLY)
			},
			dynres_noforceoffline = new[]
            {
                new Patch(0x2739e08, "01", "00", MemProtection.PAGE_READWRITE)
            }
		};

		private static readonly HitmanVersion v1_16_0_gog_dx12 = new HitmanVersion()
		{
			certpin = new[]
            {
                new Patch(0x0CD754C, "0F85", "90E9", MemProtection.PAGE_EXECUTE_READ)
            },
			authheader = new[]
			{
				new Patch(0x09C4BA5, "0F84B3000000", "909090909090", MemProtection.PAGE_EXECUTE_READ),
				new Patch(0x09C4BB5, "0F84A3000000", "909090909090", MemProtection.PAGE_EXECUTE_READ)
			},
			configdomain = new[]
            {
                new Patch(0x2742D88, "", "", MemProtection.PAGE_READWRITE, "configdomain")
            },
			protocol = new[]
			{
				new Patch(0x14E2488, "68", "61", MemProtection.PAGE_READONLY) // this is just stupid
			},
			dynres_noforceoffline = new[]
            {
                new Patch(0x2743208, "01", "00", MemProtection.PAGE_READWRITE)
            }
		};
#endif
	}
}
