using System.Reflection;

namespace HitmanPatcher
{
    public static class Resources
    {
        public static Icon Icon { get; }
        public static Bitmap Novikov_standard { get; }
        public static Bitmap Novikov_success { get; }
        public static Bitmap Novikov_error { get; }

        static Resources()
        {
            Icon = new Icon(ReadResource("patcher.ico"));
            Novikov_standard = new Bitmap(ReadResource("Novikov_standard.png"));
            Novikov_success = new Bitmap(ReadResource("Novikov_success.png"));
            Novikov_error = new Bitmap(ReadResource("Novikov_error.png"));
        }

        private static Stream ReadResource(string name)
        {
            var assembly = Assembly.GetExecutingAssembly();

            string resourcePath = assembly
                .GetManifestResourceNames()
                .Single(str => str.EndsWith(name));

            return assembly.GetManifestResourceStream(resourcePath);
        }
    }
}
