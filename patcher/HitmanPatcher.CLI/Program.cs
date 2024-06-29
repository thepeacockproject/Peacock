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

            // Set the active values
            settings.patchOptions.CustomConfigDomain = o.Domain ?? settings.patchOptions.CustomConfigDomain;
            settings.patchOptions.DisableForceOfflineOnFailedDynamicResources = o.OptionalDynRes ?? settings.patchOptions.DisableForceOfflineOnFailedDynamicResources;
            settings.patchOptions.UseHttp = o.UseHttp ?? settings.patchOptions.UseHttp;

            var keepScanning = o.KeepScanning ?? false;

            while (true)
            {
                var result = MemoryPatcher.PatchAllProcesses(Compositions.Logger, settings.patchOptions);

                if (result && !keepScanning)
                {
                    break;
                }

                Console.WriteLine("Waiting...");

                Thread.Sleep(1000);
            }
        }
    }
}
