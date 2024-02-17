namespace HitmanPatcher
{
    public static class Compositions
    {
        public static bool HasAdmin => Pinvoke.CheckForAdmin();

        public static ILoggingProvider Logger;
    }
}
