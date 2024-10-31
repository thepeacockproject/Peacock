using Newtonsoft.Json;
using System;
using System.Collections;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace HitmanPatcher
{
    public partial class ServerListEditor : Form
    {
        private GameServer[] gameServers;
        public GameServer[] GameServers { 
            get { return gameServers; } 
            set
            {
                gameServers = value;
                foreach (GameServer server in gameServers)
                {
                    string[] tmp = { server.ServerName, server.ServerAddress };
                    dataGridView1.Rows.Add(tmp);
                }
            }
        }
        public ServerListEditor()
        {
            InitializeComponent();
        }

        private void saveButton_Click(object sender, EventArgs e)
        {
            var list = new List<GameServer>();

            for(int i = 0; i < dataGridView1.RowCount - 1; i++)
            {
                var item = dataGridView1.Rows[i];
                list.Add(new GameServer { ServerName = item.Cells[0].Value.ToString(), ServerAddress = item.Cells[1].Value.ToString() });
            }
            GameServers = list.ToArray();
            string appData = Environment.GetFolderPath(Environment
                .SpecialFolder
                .ApplicationData);

            var folder = $@"{appData}\PeacockProject\";
            var serverString = JsonConvert.SerializeObject(GameServers);
            File.WriteAllText(@$"{folder}Servers.json", serverString, Encoding.UTF8);
            this.DialogResult = DialogResult.OK;
            this.Close();
        }
    }
}
