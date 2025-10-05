namespace HitmanPatcher
{
    partial class TrayOptionsForm
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
            this.textBoxDomains = new System.Windows.Forms.RichTextBox();
            this.label1 = new System.Windows.Forms.Label();
            this.checkboxStart = new System.Windows.Forms.CheckBox();
            this.checkBoxMinimize = new System.Windows.Forms.CheckBox();
            this.buttonSave = new System.Windows.Forms.Button();
            this.buttonCancel = new System.Windows.Forms.Button();
            this.SuspendLayout();
            //
            // textBoxDomains
            //
            this.textBoxDomains.Anchor = ((System.Windows.Forms.AnchorStyles)((((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom)
                    | System.Windows.Forms.AnchorStyles.Left)
                | System.Windows.Forms.AnchorStyles.Right)));
            this.textBoxDomains.Location = new System.Drawing.Point(13, 36);
            this.textBoxDomains.Margin = new System.Windows.Forms.Padding(4);
            this.textBoxDomains.Name = "textBoxDomains";
            this.textBoxDomains.Size = new System.Drawing.Size(184, 115);
            this.textBoxDomains.TabIndex = 0;
            this.textBoxDomains.Text = "";
            //
            // label1
            //
            this.label1.AutoSize = true;
            this.label1.Location = new System.Drawing.Point(13, 9);
            this.label1.Margin = new System.Windows.Forms.Padding(4, 0, 4, 0);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(142, 16);
            this.label1.TabIndex = 1;
            this.label1.Text = "Domains (one per line)";
            //
            // checkboxStart
            //
            this.checkboxStart.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.checkboxStart.AutoSize = true;
            this.checkboxStart.Location = new System.Drawing.Point(218, 38);
            this.checkboxStart.Margin = new System.Windows.Forms.Padding(4);
            this.checkboxStart.Name = "checkboxStart";
            this.checkboxStart.Size = new System.Drawing.Size(94, 20);
            this.checkboxStart.TabIndex = 2;
            this.checkboxStart.Text = "Start in tray";
            this.checkboxStart.UseVisualStyleBackColor = true;
            //
            // checkBoxMinimize
            //
            this.checkBoxMinimize.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.checkBoxMinimize.AutoSize = true;
            this.checkBoxMinimize.Location = new System.Drawing.Point(218, 66);
            this.checkBoxMinimize.Margin = new System.Windows.Forms.Padding(4);
            this.checkBoxMinimize.Name = "checkBoxMinimize";
            this.checkBoxMinimize.Size = new System.Drawing.Size(120, 20);
            this.checkBoxMinimize.TabIndex = 3;
            this.checkBoxMinimize.Text = "Minimize to tray";
            this.checkBoxMinimize.UseVisualStyleBackColor = true;
            //
            // buttonSave
            //
            this.buttonSave.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Right)));
            this.buttonSave.Location = new System.Drawing.Point(209, 123);
            this.buttonSave.Margin = new System.Windows.Forms.Padding(4);
            this.buttonSave.Name = "buttonSave";
            this.buttonSave.Size = new System.Drawing.Size(75, 28);
            this.buttonSave.TabIndex = 4;
            this.buttonSave.Text = "Save";
            this.buttonSave.UseVisualStyleBackColor = true;
            this.buttonSave.Click += new System.EventHandler(this.buttonSave_Click);
            //
            // buttonCancel
            //
            this.buttonCancel.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Right)));
            this.buttonCancel.Location = new System.Drawing.Point(294, 123);
            this.buttonCancel.Margin = new System.Windows.Forms.Padding(4);
            this.buttonCancel.Name = "buttonCancel";
            this.buttonCancel.Size = new System.Drawing.Size(75, 28);
            this.buttonCancel.TabIndex = 5;
            this.buttonCancel.Text = "Cancel";
            this.buttonCancel.UseVisualStyleBackColor = true;
            this.buttonCancel.Click += new System.EventHandler(this.buttonCancel_Click);
            //
            // TrayOptionsForm
            //
            this.AutoScaleDimensions = new System.Drawing.SizeF(8F, 16F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(382, 164);
            this.Controls.Add(this.buttonCancel);
            this.Controls.Add(this.buttonSave);
            this.Controls.Add(this.checkBoxMinimize);
            this.Controls.Add(this.checkboxStart);
            this.Controls.Add(this.label1);
            this.Controls.Add(this.textBoxDomains);
            this.FormBorderStyle = System.Windows.Forms.FormBorderStyle.SizableToolWindow;
            this.Margin = new System.Windows.Forms.Padding(4);
            this.MinimumSize = new System.Drawing.Size(400, 211);
            this.Name = "TrayOptionsForm";
            this.Text = "Tray Options";
            this.ResumeLayout(false);
            this.PerformLayout();
        }

        #endregion

        private System.Windows.Forms.RichTextBox textBoxDomains;
        private System.Windows.Forms.Label label1;
        private System.Windows.Forms.CheckBox checkboxStart;
        private System.Windows.Forms.CheckBox checkBoxMinimize;
        private System.Windows.Forms.Button buttonSave;
        private System.Windows.Forms.Button buttonCancel;
    }
}
