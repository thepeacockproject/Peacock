namespace HitmanPatcher
{
    public static class Compositions
    {
        //NOTE: This will only have to be determined once
        public static bool HasAdmin { get; } = Pinvoke.CheckForAdmin();

        public static ILoggingProvider Logger { get; set; }
    }
}
