namespace HitmanPatcher
{
    partial class OptionsForm
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
            this.buttonSave = new System.Windows.Forms.Button();
            this.buttonCancel = new System.Windows.Forms.Button();
            this.groupBox1 = new System.Windows.Forms.GroupBox();
            this.darkModeBox = new System.Windows.Forms.CheckBox();
            this.dynResources = new System.Windows.Forms.CheckBox();
            this.checkBoxHttp = new System.Windows.Forms.CheckBox();
            this.buttonTrayOptions = new System.Windows.Forms.Button();
            this.groupBox1.SuspendLayout();
            this.SuspendLayout();
            //
            // buttonSave
            //
            this.buttonSave.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Right)));
            this.buttonSave.Location = new System.Drawing.Point(302, 55);
            this.buttonSave.Margin = new System.Windows.Forms.Padding(3, 2, 3, 2);
            this.buttonSave.Name = "buttonSave";
            this.buttonSave.Size = new System.Drawing.Size(166, 32);
            this.buttonSave.TabIndex = 4;
            this.buttonSave.Text = "Save";
            this.buttonSave.UseVisualStyleBackColor = true;
            this.buttonSave.Click += new System.EventHandler(this.ButtonSave_Click);
            //
            // buttonCancel
            //
            this.buttonCancel.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Right)));
            this.buttonCancel.Location = new System.Drawing.Point(302, 91);
            this.buttonCancel.Margin = new System.Windows.Forms.Padding(3, 2, 3, 2);
            this.buttonCancel.Name = "buttonCancel";
            this.buttonCancel.Size = new System.Drawing.Size(166, 32);
            this.buttonCancel.TabIndex = 5;
            this.buttonCancel.Text = "Cancel";
            this.buttonCancel.UseVisualStyleBackColor = true;
            this.buttonCancel.Click += new System.EventHandler(this.ButtonCancel_Click);
            //
            // groupBox1
            //
            this.groupBox1.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom)
                | System.Windows.Forms.AnchorStyles.Left)));
            this.groupBox1.Controls.Add(this.darkModeBox);
            this.groupBox1.Controls.Add(this.dynResources);
            this.groupBox1.Controls.Add(this.checkBoxHttp);
            this.groupBox1.Location = new System.Drawing.Point(12, 12);
            this.groupBox1.Margin = new System.Windows.Forms.Padding(3, 2, 3, 2);
            this.groupBox1.Name = "groupBox1";
            this.groupBox1.Padding = new System.Windows.Forms.Padding(3, 2, 3, 2);
            this.groupBox1.Size = new System.Drawing.Size(284, 167);
            this.groupBox1.TabIndex = 2;
            this.groupBox1.TabStop = false;
            this.groupBox1.Text = "Patcher Options";
            //
            // darkModeBox
            //
            this.darkModeBox.AutoSize = true;
            this.darkModeBox.Location = new System.Drawing.Point(5, 73);
            this.darkModeBox.Margin = new System.Windows.Forms.Padding(3, 2, 3, 2);
            this.darkModeBox.Name = "darkModeBox";
            this.darkModeBox.Size = new System.Drawing.Size(140, 20);
            this.darkModeBox.TabIndex = 2;
            this.darkModeBox.Text = "Enable dark mode";
            this.darkModeBox.UseVisualStyleBackColor = true;
            //
            // dynResources
            //
            this.dynResources.AutoSize = true;
            this.dynResources.Location = new System.Drawing.Point(5, 47);
            this.dynResources.Margin = new System.Windows.Forms.Padding(3, 2, 3, 2);
            this.dynResources.Name = "dynResources";
            this.dynResources.Size = new System.Drawing.Size(231, 20);
            this.dynResources.TabIndex = 1;
            this.dynResources.Text = "Make dynamic resources optional";
            this.dynResources.UseVisualStyleBackColor = true;
            //
            // checkBoxHttp
            //
            this.checkBoxHttp.AutoSize = true;
            this.checkBoxHttp.Location = new System.Drawing.Point(5, 21);
            this.checkBoxHttp.Margin = new System.Windows.Forms.Padding(3, 2, 3, 2);
            this.checkBoxHttp.Name = "checkBoxHttp";
            this.checkBoxHttp.Size = new System.Drawing.Size(170, 20);
            this.checkBoxHttp.TabIndex = 0;
            this.checkBoxHttp.Text = "Use http instead of https";
            this.checkBoxHttp.UseVisualStyleBackColor = true;
            //
            // buttonTrayOptions
            //
            this.buttonTrayOptions.AccessibleDescription = "A button that opens the tray options.";
            this.buttonTrayOptions.AccessibleName = "Tray Options";
            this.buttonTrayOptions.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Right)));
            this.buttonTrayOptions.Location = new System.Drawing.Point(302, 18);
            this.buttonTrayOptions.Name = "buttonTrayOptions";
            this.buttonTrayOptions.Size = new System.Drawing.Size(166, 32);
            this.buttonTrayOptions.TabIndex = 3;
            this.buttonTrayOptions.Text = "Tray Options";
            this.buttonTrayOptions.UseVisualStyleBackColor = true;
            this.buttonTrayOptions.Click += new System.EventHandler(this.buttonTrayOptions_Click);
            //
            // OptionsForm
            //
            this.AccessibleName = "Advanced options menu";
            this.AutoScaleDimensions = new System.Drawing.SizeF(8F, 16F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(479, 190);
            this.Controls.Add(this.buttonTrayOptions);
            this.Controls.Add(this.groupBox1);
            this.Controls.Add(this.buttonCancel);
            this.Controls.Add(this.buttonSave);
            this.FormBorderStyle = System.Windows.Forms.FormBorderStyle.FixedToolWindow;
            this.Margin = new System.Windows.Forms.Padding(3, 2, 3, 2);
            this.Name = "OptionsForm";
            this.ShowIcon = false;
            this.StartPosition = System.Windows.Forms.FormStartPosition.CenterParent;
            this.Text = "Advanced Options";
            this.groupBox1.ResumeLayout(false);
            this.groupBox1.PerformLayout();
            this.ResumeLayout(false);
        }

        private System.Windows.Forms.Button buttonTrayOptions;

        #endregion

        private System.Windows.Forms.Button buttonSave;
        private System.Windows.Forms.Button buttonCancel;
        private System.Windows.Forms.GroupBox groupBox1;
        private System.Windows.Forms.CheckBox checkBoxHttp;
        private System.Windows.Forms.CheckBox dynResources;
		private System.Windows.Forms.CheckBox darkModeBox;
	}
}
