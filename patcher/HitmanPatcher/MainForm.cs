using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Windows.Forms;
using System.Drawing;
using System.IO;
using System.Text;
using Timer = System.Windows.Forms.Timer;

namespace HitmanPatcher
{
    public partial class MainForm : Form, ILoggingProvider
    {
        private static MainForm instance;

        public static MainForm GetInstance()
        {
            return instance ??= new MainForm();
        }

        private static readonly Dictionary<string, string> servers = new Dictionary<string, string>()
        {
            {"IOI Official", "config.hitman.io"},
            {"Peacock Local", "127.0.0.1"}
        };

        private static readonly Dictionary<string, string> serversReverse = servers.ToDictionary(kvp => kvp.Value, kvp => kvp.Key);

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
            Compositions.Logger = this;
            
            InitializeComponent();
            logListView.Columns[0].Width = logListView.Width - 4 - SystemInformation.VerticalScrollBarWidth;
            Timer timer = new Timer
            {
                Interval = 1000
            };
            timer.Tick += (sender, args) => MemoryPatcher.PatchAllProcesses(this, CurrentSettings.patchOptions);
            timer.Enabled = true;

            try
            {
                CurrentSettings = Settings.GetFromFile();
            }
            catch (Exception)
            {
                CurrentSettings = new Settings();
            }
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
            if (!Directory.Exists(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData) + @"\PeacockProject"))
            {
                Directory.CreateDirectory(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData) + @"\PeacockProject");
            }

            CurrentSettings.SaveToFile();
        }

        private string GetSelectedServerHostname()
        {
            if (!servers.TryGetValue(serverUrlComboBox.Text, out string hostname))
            {
                hostname = serverUrlComboBox.Text;
            }

            if (string.IsNullOrEmpty(hostname))
            {
                hostname = "localhost";
            }

            return hostname;
        }

        private void SetSelectedServerHostname(string input)
        {
            if (!serversReverse.TryGetValue(input, out string result))
            {
                result = input;
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

                serverUrlComboBox.Items.Clear();
                serverUrlComboBox.Items.AddRange(servers.Keys.ToArray<object>());
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
                novikovPictureBox.Image = Resources.Novikov_standard;
            }
            else if (status > 0)
            {
                novikovPictureBox.Image = Resources.Novikov_success;
            }
            else
            {
                novikovPictureBox.Image = Resources.Novikov_error;
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
    }
}
