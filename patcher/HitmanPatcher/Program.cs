using System;
using System.Security.Principal;
using System.Windows.Forms;

namespace HitmanPatcher
{
    static class Program
    {
        /// <summary>
        /// The main entry point for the application.
        /// </summary>
        [STAThread]
        private static void Main(string[] args)
        {
            Compositions.HasAdmin = CheckForAdmin();
#if !DEBUG
            Cli.EnsureConsole(args);
#endif

            Cli.CliOptions o = Cli.CliOptions.FromArguments(args);

            if (o.Headless)
            {
                // ReSharper disable once LocalizableElement
                Console.WriteLine(CliLocale.HeadlessBanner);
                MemoryPatcher.PatchAllProcesses(new Cli.ConsoleLogger(), new MemoryPatcher.Options
                {
                    AlwaysSendAuthHeader = true,
                    CustomConfigDomain = o.Domain,
                    DisableCertPinning = true,
                    DisableForceOfflineOnFailedDynamicResources = o.OptionalDynRes,
                    EnableDynamicResources = true,
                    SetCustomConfigDomain = true,
                    UseHttp = o.UseHttp
                });
            }
            else
            {
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);

                Application.Run(MainForm.GetInstance());
            }
        }

        static bool CheckForAdmin()
        {
            WindowsIdentity identity = WindowsIdentity.GetCurrent();
            WindowsPrincipal principal = new WindowsPrincipal(identity);
            return principal.IsInRole(WindowsBuiltInRole.Administrator);
        }

    }
}
