using System;
using System.Diagnostics.CodeAnalysis;
#if !DEBUG
using System.Linq;
using System.Runtime.InteropServices;
#endif

namespace HitmanPatcher
{
    internal static class Cli
    {
#if !DEBUG
        // in any mode outside debug (which is probably what it's being run in while in IDE),
        // we attach the console to the parent process

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool AttachConsole(int dwProcessId);

        private const int ATTACH_PARENT_PROCESS = -1;

        internal static void EnsureConsole(string[] args)
        {
            if (args.Any(arg => arg.Contains("-")))
            {
                AttachConsole(ATTACH_PARENT_PROCESS);
            }
        }
#endif

        internal class CliOptions
        {
            internal bool Headless { get; set; }

            internal string Domain { get; set; }

            internal bool UseHttp { get; set; }

            internal bool OptionalDynRes { get; set; }

            [SuppressMessage("ReSharper", "LocalizableElement")]
            internal static CliOptions FromArguments(string[] args)
            {
                var options = new CliOptions
                {
                    Domain = "127.0.0.1",
                    Headless = false,
                    OptionalDynRes = true,
                    UseHttp = true
                };

                var i = 0;

                var ensureNext = new Action<int, string>((index, argName) =>
                {
                    if (!(args.Length > index))
                    {
                        throw new ArgumentException($"Expected next value for argument {argName} but didn't find one!");
                    }
                });

                foreach (var arg in args)
                {
                    switch (arg)
                    {
                        case "--headless":
                            options.Headless = true;
                            break;
                        case "--optional-dynamic-resources":
                            options.OptionalDynRes = true;
                            break;
                        case "--domain":
                            ensureNext(i, arg);
                            options.Domain = args[i + 1];
                            break;
                        case "--use-http":
                            options.UseHttp = true;
                            break;
                        case "--help":
                            Console.WriteLine(CliLocale.HelpHeader);
                            Console.WriteLine("");
                            Console.WriteLine("Options:");
                            Console.WriteLine($"  --headless : {CliLocale.HeadlessDescription}");
                            Console.WriteLine($"  --optional-dynamic-resources : {CliLocale.OptionalDynResDescription}");
                            Console.WriteLine($"  --domain <url> : {CliLocale.DomainDescription}");
                            Console.WriteLine($"  --use-http : {CliLocale.UseHttpDescription}");
                            Environment.Exit(0);
                            break;
                    }
                    
                    i++;
                }

                return options;
            }
        }

        internal class ConsoleLogger : ILoggingProvider
        {
            public void log(string msg)
            {
                Console.WriteLine(msg);
            }
        }
    }
}
