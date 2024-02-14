namespace HitmanPatcher
{
    internal static class Program
    {
        /// <summary>
        /// The main entry point for the application.
        /// </summary>
        [STAThread]
        private static void Main(string[] args)
        {
            Compositions.Initialize();
            Compositions.Logger = new Cli.ConsoleLogger();

#if !DEBUG
            Cli.EnsureConsole(args);
#endif

            Cli.CliOptions o = Cli.CliOptions.FromArguments(args);

            // ReSharper disable once LocalizableElement
            Console.WriteLine(CliLocale.HeadlessBanner);

            var settings = Settings.GetFromFile();
            settings.SaveToFile();

            Console.WriteLine("Settings:");
            Console.WriteLine($"- File = {Path.GetFullPath(Settings.GetSavePath())}");
            Console.WriteLine($"- CustomConfigDomain = {settings.patchOptions.CustomConfigDomain}");
            Console.WriteLine($"- UseHttp = {settings.patchOptions.UseHttp}");
            Console.WriteLine($"- DisableForceDynamicResources = {settings.patchOptions.DisableForceOfflineOnFailedDynamicResources}");
            Console.WriteLine();

            bool result = false;

            while(!result)
            {
                result = MemoryPatcher.PatchAllProcesses(Compositions.Logger, settings.patchOptions with
                {
                    CustomConfigDomain = o.Domain ?? settings.patchOptions.CustomConfigDomain,
                    DisableForceOfflineOnFailedDynamicResources = o.OptionalDynRes ?? settings.patchOptions.DisableForceOfflineOnFailedDynamicResources,
                    UseHttp = o.UseHttp ?? settings.patchOptions.UseHttp
                });

                if (result)
                {
                    continue;
                }

                Console.WriteLine("Waiting...");

                Thread.Sleep(1000);
            }
        }
    }
}
