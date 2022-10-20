using System;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;

namespace HitmanPatcher
{
    public partial class TrayOptionsForm : Form
    {
        public TrayOptionsForm(bool startInTray, bool minimizeToTray, List<string> trayDomains, bool darkMode)
        {
            InitializeComponent();
            this.startInTray = startInTray;
            this.minimizeToTray = minimizeToTray;
            this.trayDomains = trayDomains;
            toggleTheme(darkMode);
        }

        private void toggleTheme(bool darkModeEnabled)
        {
            FlatStyle flatStyle =
                darkModeEnabled ? FlatStyle.Flat : FlatStyle.Standard;
            Color text =
                darkModeEnabled ? Color.White : SystemColors.ControlText;

            // Change main form background
            BackColor = darkModeEnabled ? Color.FromArgb(24, 26, 27) : SystemColors.Control;

            // Change the group box colours
            textBoxDomains.BackColor = darkModeEnabled ? Color.FromArgb(24, 26, 27) : SystemColors.Control;
            textBoxDomains.ForeColor = text;

            label1.ForeColor = text;

            // Change button colours and style
            buttonSave.FlatStyle = flatStyle;
            buttonSave.BackColor = darkModeEnabled ? Color.FromArgb(19, 21, 22) : SystemColors.Control;
            buttonSave.ForeColor = text;

            checkboxStart.ForeColor = text;
            checkBoxMinimize.ForeColor = text;

            buttonCancel.FlatStyle = flatStyle;
            buttonCancel.BackColor = darkModeEnabled ? Color.FromArgb(19, 21, 22) : SystemColors.Control;
            buttonCancel.ForeColor = text;
        }

        public bool startInTray
        {
            get => checkboxStart.Checked;
            private set => checkboxStart.Checked = value;
        }

        public bool minimizeToTray
        {
            get => checkBoxMinimize.Checked;
            private set => checkBoxMinimize.Checked = value;
        }

        public List<string> trayDomains
        {
            get => new List<string>(textBoxDomains.Lines);
            private set => textBoxDomains.Lines = value.ToArray();
        }

        private void buttonCancel_Click(object sender, EventArgs e)
        {
            DialogResult = DialogResult.Cancel;
            Close();
        }

        private void buttonSave_Click(object sender, EventArgs e)
        {
            DialogResult = DialogResult.OK;
            Close();
        }
    }
}
