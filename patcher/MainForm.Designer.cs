namespace HitmanPatcher
{
    partial class MainForm
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.components = new System.ComponentModel.Container();
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(MainForm));
            this.serverAddressLabel = new System.Windows.Forms.Label();
            this.logListView = new System.Windows.Forms.ListView();
            this.columnHeader1 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.logContextMenu = new System.Windows.Forms.ContextMenuStrip(this.components);
            this.copyLogToClipboardToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.logLabel = new System.Windows.Forms.Label();
            this.buttonRepatch = new System.Windows.Forms.Button();
            this.serverUrlComboBox = new System.Windows.Forms.ComboBox();
            this.localghostLinkLabel = new System.Windows.Forms.LinkLabel();
            this.buttonOptions = new System.Windows.Forms.Button();
            this.basedOnLabel = new System.Windows.Forms.Label();
            this.statusLabel = new System.Windows.Forms.Label();
            this.novikovPictureBox = new System.Windows.Forms.PictureBox();
            this.trayIcon = new System.Windows.Forms.NotifyIcon(this.components);
            this.trayMenu = new System.Windows.Forms.ContextMenuStrip(this.components);
            this.menuItemOpen = new System.Windows.Forms.ToolStripMenuItem();
            this.menuItemRepatch = new System.Windows.Forms.ToolStripMenuItem();
            this.domainsTrayMenu = new System.Windows.Forms.ToolStripMenuItem();
            this.menuItemExit = new System.Windows.Forms.ToolStripMenuItem();
            this.serverList = new System.Windows.Forms.Button();
            this.logContextMenu.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)(this.novikovPictureBox)).BeginInit();
            this.trayMenu.SuspendLayout();
            this.SuspendLayout();
            // 
            // serverAddressLabel
            // 
            this.serverAddressLabel.AccessibleDescription = "Server address label.";
            this.serverAddressLabel.AccessibleName = "Server address";
            this.serverAddressLabel.AutoSize = true;
            this.serverAddressLabel.Location = new System.Drawing.Point(7, 12);
            this.serverAddressLabel.Margin = new System.Windows.Forms.Padding(2, 0, 2, 0);
            this.serverAddressLabel.Name = "serverAddressLabel";
            this.serverAddressLabel.Size = new System.Drawing.Size(81, 13);
            this.serverAddressLabel.TabIndex = 0;
            this.serverAddressLabel.Text = "Server address:";
            // 
            // logListView
            // 
            this.logListView.AccessibleDescription = "Patcher log";
            this.logListView.AccessibleName = "Log";
            this.logListView.Anchor = ((System.Windows.Forms.AnchorStyles)((((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom) 
            | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.logListView.Columns.AddRange(new System.Windows.Forms.ColumnHeader[] {
            this.columnHeader1});
            this.logListView.ContextMenuStrip = this.logContextMenu;
            this.logListView.FullRowSelect = true;
            this.logListView.HeaderStyle = System.Windows.Forms.ColumnHeaderStyle.None;
            this.logListView.HideSelection = false;
            this.logListView.Location = new System.Drawing.Point(9, 66);
            this.logListView.Margin = new System.Windows.Forms.Padding(2);
            this.logListView.Name = "logListView";
            this.logListView.Size = new System.Drawing.Size(309, 87);
            this.logListView.TabIndex = 2;
            this.logListView.UseCompatibleStateImageBehavior = false;
            this.logListView.View = System.Windows.Forms.View.Details;
            // 
            // columnHeader1
            // 
            this.columnHeader1.Width = 300;
            // 
            // logContextMenu
            // 
            this.logContextMenu.AccessibleDescription = "Patcher log context menu";
            this.logContextMenu.AccessibleName = "Log context";
            this.logContextMenu.BackColor = System.Drawing.SystemColors.Control;
            this.logContextMenu.ImageScalingSize = new System.Drawing.Size(20, 20);
            this.logContextMenu.Items.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.copyLogToClipboardToolStripMenuItem});
            this.logContextMenu.Name = "logContextMenu";
            this.logContextMenu.Size = new System.Drawing.Size(190, 26);
            // 
            // copyLogToClipboardToolStripMenuItem
            // 
            this.copyLogToClipboardToolStripMenuItem.AccessibleDescription = "Action for copying patcher logs to the clipboard.";
            this.copyLogToClipboardToolStripMenuItem.AccessibleName = "Copy log to clipboard action";
            this.copyLogToClipboardToolStripMenuItem.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Text;
            this.copyLogToClipboardToolStripMenuItem.Name = "copyLogToClipboardToolStripMenuItem";
            this.copyLogToClipboardToolStripMenuItem.Size = new System.Drawing.Size(189, 22);
            this.copyLogToClipboardToolStripMenuItem.Text = "Copy log to clipboard";
            this.copyLogToClipboardToolStripMenuItem.Click += new System.EventHandler(this.copyLogToClipboardToolStripMenuItem_Click);
            // 
            // logLabel
            // 
            this.logLabel.AutoSize = true;
            this.logLabel.Location = new System.Drawing.Point(7, 41);
            this.logLabel.Margin = new System.Windows.Forms.Padding(2, 0, 2, 0);
            this.logLabel.Name = "logLabel";
            this.logLabel.Size = new System.Drawing.Size(28, 13);
            this.logLabel.TabIndex = 3;
            this.logLabel.Text = "Log:";
            // 
            // buttonRepatch
            // 
            this.buttonRepatch.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.buttonRepatch.Location = new System.Drawing.Point(236, 36);
            this.buttonRepatch.Margin = new System.Windows.Forms.Padding(2);
            this.buttonRepatch.Name = "buttonRepatch";
            this.buttonRepatch.Size = new System.Drawing.Size(82, 23);
            this.buttonRepatch.TabIndex = 1;
            this.buttonRepatch.Text = "Re-patch";
            this.buttonRepatch.UseVisualStyleBackColor = true;
            this.buttonRepatch.Click += new System.EventHandler(this.RePatchButton_Click);
            // 
            // serverUrlComboBox
            // 
            this.serverUrlComboBox.AccessibleDescription = "";
            this.serverUrlComboBox.AccessibleName = "Server address picker";
            this.serverUrlComboBox.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.serverUrlComboBox.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
            this.serverUrlComboBox.FormattingEnabled = true;
            this.serverUrlComboBox.Location = new System.Drawing.Point(95, 10);
            this.serverUrlComboBox.Margin = new System.Windows.Forms.Padding(2);
            this.serverUrlComboBox.MaxLength = 150;
            this.serverUrlComboBox.Name = "serverUrlComboBox";
            this.serverUrlComboBox.Size = new System.Drawing.Size(136, 21);
            this.serverUrlComboBox.TabIndex = 0;
            // 
            // localghostLinkLabel
            // 
            this.localghostLinkLabel.AccessibleDescription = "Link to LocalGhost GitLab repository.";
            this.localghostLinkLabel.AccessibleName = "LocalGhost link";
            this.localghostLinkLabel.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Right)));
            this.localghostLinkLabel.AutoSize = true;
            this.localghostLinkLabel.Location = new System.Drawing.Point(169, 164);
            this.localghostLinkLabel.Margin = new System.Windows.Forms.Padding(2, 0, 2, 0);
            this.localghostLinkLabel.Name = "localghostLinkLabel";
            this.localghostLinkLabel.Size = new System.Drawing.Size(149, 13);
            this.localghostLinkLabel.TabIndex = 3;
            this.localghostLinkLabel.TabStop = true;
            this.localghostLinkLabel.Text = "LocalGhost by grappigegovert";
            this.localghostLinkLabel.TextAlign = System.Drawing.ContentAlignment.MiddleLeft;
            this.localghostLinkLabel.LinkClicked += new System.Windows.Forms.LinkLabelLinkClickedEventHandler(this.LocalghostLink_LinkClicked);
            // 
            // buttonOptions
            // 
            this.buttonOptions.AccessibleDescription = "Button that opens the options menu.";
            this.buttonOptions.AccessibleName = "Options button";
            this.buttonOptions.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Left)));
            this.buttonOptions.Location = new System.Drawing.Point(9, 158);
            this.buttonOptions.Margin = new System.Windows.Forms.Padding(2);
            this.buttonOptions.Name = "buttonOptions";
            this.buttonOptions.Size = new System.Drawing.Size(70, 27);
            this.buttonOptions.TabIndex = 2;
            this.buttonOptions.Text = "Options";
            this.buttonOptions.UseVisualStyleBackColor = true;
            this.buttonOptions.Click += new System.EventHandler(this.ButtonOptions_Click);
            // 
            // basedOnLabel
            // 
            this.basedOnLabel.AccessibleName = "Based on";
            this.basedOnLabel.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Right)));
            this.basedOnLabel.AutoSize = true;
            this.basedOnLabel.Location = new System.Drawing.Point(115, 164);
            this.basedOnLabel.Name = "basedOnLabel";
            this.basedOnLabel.Size = new System.Drawing.Size(52, 13);
            this.basedOnLabel.TabIndex = 9;
            this.basedOnLabel.Text = "Based on";
            this.basedOnLabel.TextAlign = System.Drawing.ContentAlignment.MiddleRight;
            // 
            // statusLabel
            // 
            this.statusLabel.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.statusLabel.AutoSize = true;
            this.statusLabel.Location = new System.Drawing.Point(152, 41);
            this.statusLabel.Margin = new System.Windows.Forms.Padding(2, 0, 2, 0);
            this.statusLabel.Name = "statusLabel";
            this.statusLabel.Size = new System.Drawing.Size(40, 13);
            this.statusLabel.TabIndex = 10;
            this.statusLabel.Text = "Status:";
            // 
            // novikovPictureBox
            // 
            this.novikovPictureBox.AccessibleDescription = "Icon showing the patcher status.";
            this.novikovPictureBox.AccessibleName = "Status icon";
            this.novikovPictureBox.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.novikovPictureBox.Image = global::HitmanPatcher.Properties.Resources.Novikov_standard;
            this.novikovPictureBox.InitialImage = ((System.Drawing.Image)(resources.GetObject("novikovPictureBox.InitialImage")));
            this.novikovPictureBox.Location = new System.Drawing.Point(197, 36);
            this.novikovPictureBox.Name = "novikovPictureBox";
            this.novikovPictureBox.Size = new System.Drawing.Size(34, 25);
            this.novikovPictureBox.SizeMode = System.Windows.Forms.PictureBoxSizeMode.Zoom;
            this.novikovPictureBox.TabIndex = 11;
            this.novikovPictureBox.TabStop = false;
            // 
            // trayIcon
            // 
            this.trayIcon.ContextMenuStrip = this.trayMenu;
            this.trayIcon.Icon = ((System.Drawing.Icon)(resources.GetObject("trayIcon.Icon")));
            this.trayIcon.Text = "Peacock Patcher";
            this.trayIcon.MouseDoubleClick += new System.Windows.Forms.MouseEventHandler(this.menuItemOpen_Click);
            // 
            // trayMenu
            // 
            this.trayMenu.ImageScalingSize = new System.Drawing.Size(20, 20);
            this.trayMenu.Items.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.menuItemOpen,
            this.menuItemRepatch,
            this.domainsTrayMenu,
            this.menuItemExit});
            this.trayMenu.Name = "trayMenu";
            this.trayMenu.Size = new System.Drawing.Size(151, 92);
            // 
            // menuItemOpen
            // 
            this.menuItemOpen.Font = new System.Drawing.Font("Segoe UI", 9F, System.Drawing.FontStyle.Bold);
            this.menuItemOpen.Name = "menuItemOpen";
            this.menuItemOpen.Size = new System.Drawing.Size(150, 22);
            this.menuItemOpen.Text = "&Open Patcher";
            this.menuItemOpen.Click += new System.EventHandler(this.menuItemOpen_Click);
            // 
            // menuItemRepatch
            // 
            this.menuItemRepatch.Name = "menuItemRepatch";
            this.menuItemRepatch.Size = new System.Drawing.Size(150, 22);
            this.menuItemRepatch.Text = "&Re-patch";
            this.menuItemRepatch.Click += new System.EventHandler(this.RePatchButton_Click);
            // 
            // domainsTrayMenu
            // 
            this.domainsTrayMenu.Name = "domainsTrayMenu";
            this.domainsTrayMenu.Size = new System.Drawing.Size(150, 22);
            this.domainsTrayMenu.Text = "Set &Domain";
            // 
            // menuItemExit
            // 
            this.menuItemExit.Name = "menuItemExit";
            this.menuItemExit.Size = new System.Drawing.Size(150, 22);
            this.menuItemExit.Text = "&Exit";
            this.menuItemExit.Click += new System.EventHandler(this.menuItemExit_Click);
            // 
            // serverList
            // 
            this.serverList.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.serverList.Location = new System.Drawing.Point(235, 8);
            this.serverList.Name = "serverList";
            this.serverList.Size = new System.Drawing.Size(83, 23);
            this.serverList.TabIndex = 12;
            this.serverList.Text = "Edit Serverlist";
            this.serverList.UseVisualStyleBackColor = true;
            this.serverList.Click += new System.EventHandler(this.serverList_Click);
            // 
            // MainForm
            // 
            this.AccessibleName = "Peacock Patcher";
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.BackColor = System.Drawing.SystemColors.Control;
            this.ClientSize = new System.Drawing.Size(322, 189);
            this.Controls.Add(this.serverList);
            this.Controls.Add(this.novikovPictureBox);
            this.Controls.Add(this.statusLabel);
            this.Controls.Add(this.basedOnLabel);
            this.Controls.Add(this.buttonOptions);
            this.Controls.Add(this.localghostLinkLabel);
            this.Controls.Add(this.serverUrlComboBox);
            this.Controls.Add(this.buttonRepatch);
            this.Controls.Add(this.logLabel);
            this.Controls.Add(this.logListView);
            this.Controls.Add(this.serverAddressLabel);
            this.Icon = ((System.Drawing.Icon)(resources.GetObject("$this.Icon")));
            this.Margin = new System.Windows.Forms.Padding(2);
            this.MaximizeBox = false;
            this.MinimumSize = new System.Drawing.Size(321, 201);
            this.Name = "MainForm";
            this.Text = "Peacock Patcher";
            this.FormClosing += new System.Windows.Forms.FormClosingEventHandler(this.MainForm_FormClosing);
            this.Resize += new System.EventHandler(this.MainForm_Resize);
            this.logContextMenu.ResumeLayout(false);
            ((System.ComponentModel.ISupportInitialize)(this.novikovPictureBox)).EndInit();
            this.trayMenu.ResumeLayout(false);
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private System.Windows.Forms.Label serverAddressLabel;
        private System.Windows.Forms.ListView logListView;
        private System.Windows.Forms.ColumnHeader columnHeader1;
        private System.Windows.Forms.Label logLabel;
        private System.Windows.Forms.Button buttonRepatch;
        private System.Windows.Forms.ComboBox serverUrlComboBox;
        private System.Windows.Forms.LinkLabel localghostLinkLabel;
        private System.Windows.Forms.Button buttonOptions;
        private System.Windows.Forms.Label basedOnLabel;
        private System.Windows.Forms.Label statusLabel;
        private System.Windows.Forms.PictureBox novikovPictureBox;
        private System.Windows.Forms.NotifyIcon trayIcon;
        private System.Windows.Forms.ContextMenuStrip trayMenu;
        private System.Windows.Forms.ToolStripMenuItem menuItemExit;
        private System.Windows.Forms.ToolStripMenuItem menuItemRepatch;
        private System.Windows.Forms.ToolStripMenuItem domainsTrayMenu;
        private System.Windows.Forms.ToolStripMenuItem menuItemOpen;
        private System.Windows.Forms.ContextMenuStrip logContextMenu;
        private System.Windows.Forms.ToolStripMenuItem copyLogToClipboardToolStripMenuItem;
        private System.Windows.Forms.Button serverList;
    }
}

