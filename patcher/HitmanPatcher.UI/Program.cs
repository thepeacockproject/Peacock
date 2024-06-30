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
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

#if !LEGACY
            Application.SetHighDpiMode(HighDpiMode.SystemAware);
#endif
            
            var mainForm = MainForm.GetInstance();

            Compositions.Logger = mainForm;

            Application.Run(mainForm);
        }
    }
}
