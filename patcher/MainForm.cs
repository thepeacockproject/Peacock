using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Windows.Forms;
using System.Drawing;
using System.IO;
using System.Text;
using Newtonsoft.Json;

namespace HitmanPatcher
{
    public partial class MainForm : Form, ILoggingProvider
    {
        private static MainForm instance;
        private GameServer[] gameServers;
        private readonly string serverlistLocation;

        public static MainForm GetInstance()
        {
            return instance ??= new MainForm();
        }

        private void ToggleTheme(bool darkModeEnabled)
        {
            // Change main form background
            BackColor = darkModeEnabled ? Color.FromArgb(24, 26, 27) : SystemColors.Control;

            // Change the text label colours
            serverAddressLabel.ForeColor = darkModeEnabled ? Color.White : SystemColors.ControlText;
            logLabel.ForeColor = darkModeEnabled ? Color.White : SystemColors.ControlText;
            basedOnLabel.ForeColor = darkModeEnabled ? Color.White : SystemColors.ControlText;
            statusLabel.ForeColor = darkModeEnabled ? Color.White : SystemColors.ControlText;
            localghostLinkLabel.LinkColor = darkModeEnabled ? Color.FromArgb(50, 115, 234) : Color.FromArgb(0, 0, 255);

            // Change the log colours
            logListView.BackColor = darkModeEnabled ? Color.FromArgb(19, 21, 22) : SystemColors.Window;
            logListView.ForeColor = darkModeEnabled ? Color.White : SystemColors.WindowText;

            // Change combo box colours and style
            serverUrlComboBox.FlatStyle = darkModeEnabled ? FlatStyle.Flat : FlatStyle.Standard;
            serverUrlComboBox.BackColor = darkModeEnabled ? Color.FromArgb(19, 21, 22) : SystemColors.Window;
            serverUrlComboBox.ForeColor = darkModeEnabled ? Color.White : SystemColors.ControlText;

            // Change button colours and style
            buttonRepatch.FlatStyle = darkModeEnabled ? FlatStyle.Flat : FlatStyle.Standard;
            buttonRepatch.BackColor = darkModeEnabled ? Color.FromArgb(19, 21, 22) : SystemColors.Control;
            buttonRepatch.ForeColor = darkModeEnabled ? Color.White : SystemColors.ControlText;

            buttonOptions.FlatStyle = darkModeEnabled ? FlatStyle.Flat : FlatStyle.Standard;
            buttonOptions.BackColor = darkModeEnabled ? Color.FromArgb(19, 21, 22) : SystemColors.Control;
            buttonOptions.ForeColor = darkModeEnabled ? Color.White : SystemColors.ControlText;
        }

        public MainForm()
        {
            InitializeComponent();

            // Try to get ServerList
            string appData = Environment.GetFolderPath(Environment
                .SpecialFolder
                .ApplicationData);

            serverlistLocation = Path.Combine(Settings.ConfigLocation, "Server.json");
            
            
            logListView.Columns[0].Width = logListView.Width - 4 - SystemInformation.VerticalScrollBarWidth;
            Timer timer = new Timer
            {
                Interval = 1000
            };
            timer.Tick += (sender, args) => MemoryPatcher.PatchAllProcesses(this, CurrentSettings.patchOptions);
            timer.Enabled = true;
            gameServers = new GameServer[0];
            try
            {
                CurrentSettings = Settings.GetFromFile();
            }
            catch (Exception)
            {
                CurrentSettings = new Settings();
            }
            try
            {
                var fileContent = File.ReadAllText(serverlistLocation, Encoding.UTF8);
                gameServers = JsonConvert.DeserializeObject<GameServer[]>(fileContent);
                if (gameServers == null || gameServers.Length == 0)
                {
                    gameServers = CreateDefautServerList();
                }

            }
            catch (FileNotFoundException ex)
            {
                gameServers = CreateDefautServerList();
            }
            catch (JsonSerializationException ex)
            {
                gameServers = CreateDefautServerList();
            }
            SetSelectedServerHostname(serverUrlComboBox.Text);
            UpdateServerUrlCombobox();
            updateTrayDomains();

            ToggleTheme(CurrentSettings.darkModeEnabled);

            log("Patcher ready");

            if (CurrentSettings.startInTray)
            {
                trayIcon.Visible = true;
                WindowState = FormWindowState.Minimized;
                Hide();
                ShowInTaskbar = false;
                trayIcon.ShowBalloonTip(5000, "Peacock Patcher", "The Peacock Patcher has been started in the tray.", ToolTipIcon.Info);
            }
        }

        private GameServer[] CreateDefautServerList()
        {
            GameServer[] gameServers = new GameServer[2];
            gameServers[0] = new GameServer { ServerName = "IOI Official", ServerAddress = "config.hitman.io" };
            gameServers[1] = new GameServer { ServerName = "Peacock Local", ServerAddress = "127.0.0.1" };
            var serverList = JsonConvert.SerializeObject(gameServers);
           
            File.WriteAllText(serverlistLocation, serverList, Encoding.UTF8);
            return gameServers;
        }

        public void log(string msg)
        {
            if (msg.Contains("Failed to patch"))
            {
                SetStatusImage(-1);
            }

            if (msg.Contains("Successfully patched"))
            {
                SetStatusImage(1);
            }

            foreach (string line in msg.Split('\n'))
            {
                logListView.Items.Insert(0, String.Format("[{0:HH:mm:ss}] - {1}", DateTime.Now, line));
            }
        }

        private void RePatchButton_Click(object sender, EventArgs e)
        {
            MemoryPatcher.patchedprocesses.Clear();
            SetStatusImage(0);
        }

        private void MainForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            CurrentSettings.SaveToFile();
        }

        private string GetSelectedServerHostname()
        {
            string hostname = "";
            var result = gameServers.FirstOrDefault(server => server.ServerName == serverUrlComboBox.Text);
            if(result == null)
            {
                hostname = serverUrlComboBox.Text;
            }

            if (string.IsNullOrEmpty(hostname))
            {
                hostname = "127.0.0.1";
            }

            return hostname;
        }

        private void SetSelectedServerHostname(string input)
        {
            GameServer server = null;
            if (input == "localhost" || input == "127.0.0.1")
            {
                server = gameServers.FirstOrDefault(server => server.ServerAddress == input);
            }
            else
            {
                server = gameServers.FirstOrDefault(server => server.ServerName == input);
            }

            string result;
            if (server == null)
            {
                result = input;             
            }
            else
            {
                result = server.ServerName;
            }

            serverUrlComboBox.Text = result;
        }

        private void LocalghostLink_LinkClicked(object sender, LinkLabelLinkClickedEventArgs e)
        {
            Process.Start("https://gitlab.com/grappigegovert/localghost");
        }

        private void ButtonOptions_Click(object sender, EventArgs e)
        {
            OptionsForm optionsForm = new OptionsForm(CurrentSettings);
            DialogResult result = optionsForm.ShowDialog();
            if (result == DialogResult.OK)
            {
                CurrentSettings = optionsForm.Settings;
                updateTrayDomains();
                ToggleTheme(CurrentSettings.darkModeEnabled);
            }
        }

        private Settings _currentSettings;
        private Settings CurrentSettings
        {
            get
            {
                _currentSettings.patchOptions.CustomConfigDomain = GetSelectedServerHostname();
                return _currentSettings;
            }
            set
            {
                _currentSettings = value;

                SetSelectedServerHostname(value.patchOptions.CustomConfigDomain);
                UpdateServerUrlCombobox();
            }
        }

        private void UpdateServerUrlCombobox()
        {
            serverUrlComboBox.Items.Clear();
            foreach (var gameserver in gameServers)
            {
                serverUrlComboBox.Items.Add(gameserver.ServerName);
            }
        }

        private void MainForm_Resize(object sender, EventArgs e)
        {
            if (WindowState == FormWindowState.Minimized && CurrentSettings.minimizeToTray)
            {
                Hide();
                ShowInTaskbar = false;
                trayIcon.Visible = true;
                trayIcon.ShowBalloonTip(5000, "Peacock Patcher", "The Peacock Patcher has been minimized to the tray.", ToolTipIcon.Info);
            }
            else
            {
                logListView.Columns[0].Width = logListView.Width - 4 - SystemInformation.VerticalScrollBarWidth;
            }
        }

        private void SetStatusImage(int status)
        {
            if (status == 0)
            {
                novikovPictureBox.Image = Properties.Resources.Novikov_standard;
            }
            else if (status > 0)
            {
                novikovPictureBox.Image = Properties.Resources.Novikov_success;
            }
            else
            {
                novikovPictureBox.Image = Properties.Resources.Novikov_error;
            }
        }

        private void menuItemOpen_Click(object sender, EventArgs e)
        {
            Visible = true;
            WindowState = FormWindowState.Normal;

            Focus();
            ShowInTaskbar = true;
            trayIcon.Visible = false;
        }

        private void menuItemExit_Click(object sender, EventArgs e)
        {
            Application.Exit();
        }

        private void domainItem_Click(object sender, EventArgs e)
        {
            ToolStripMenuItem clickedItem = sender as ToolStripMenuItem;
            if (clickedItem != null)
            {
                foreach (ToolStripMenuItem item in domainsTrayMenu.DropDownItems)
                {
                    if (item == clickedItem)
                    {
                        item.Checked = true;
                    }
                    else
                    {
                        item.Checked = false;
                    }
                }

                SetSelectedServerHostname(clickedItem.Text);
            }
        }

        private void updateTrayDomains()
        {
            domainsTrayMenu.DropDownItems.Clear();
            foreach (string domain in CurrentSettings.trayDomains)
            {
                if (!string.IsNullOrWhiteSpace(domain))
                {
                    ToolStripMenuItem item = new ToolStripMenuItem();
                    item.Text = domain;
                    item.Click += domainItem_Click;

                    domainsTrayMenu.DropDownItems.Add(item);
                }
            }
        }

        private void copyLogToClipboardToolStripMenuItem_Click(object sender, EventArgs e)
        {
            var builder = new StringBuilder();
            foreach (ListViewItem item in logListView.Items)
            {
                builder.AppendLine(item.Text);
            }
            Clipboard.SetText(builder.ToString());
        }

        private void serverList_Click(object sender, EventArgs e)
        {
            ServerListEditor serverListEditor = new ServerListEditor();
            serverListEditor.GameServers = gameServers;
            var result = serverListEditor.ShowDialog();
            if (result == DialogResult.OK)
            {
                gameServers = serverListEditor.GameServers;
                UpdateServerUrlCombobox();
            }
        }
    }
}
