using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HitmanPatcher
{
    public class GameServer
    {
        public string ServerName { get; set; }
        public string ServerAddress { get; set; }

        public static void SaveServers(string path, GameServer[] servers)
        {
            StringBuilder stringBuilder = new StringBuilder();
            foreach (GameServer server in servers)
            {
                stringBuilder.Append(server.ServerName.Replace(";","-") + ";" + server.ServerAddress.Replace(";", "-") + '\n');
            }
            File.WriteAllText(path, stringBuilder.ToString().Trim());
        }

        public static GameServer[] LoadServers(string path)
        {
            if (File.Exists(path))
            {
                var serversString = File.ReadAllText(path).Trim();
                List<GameServer> servers = new List<GameServer>();
                foreach (var line in serversString.Split( '\n'))
                {
                    var serverString = line.Split(';');
                    var server = new GameServer();
                    server.ServerName = serverString[0];
                    server.ServerAddress = serverString[1];
                    servers.Add(server);
                }
                return servers.ToArray();
            }
            else
            {
                throw new FileNotFoundException(path);
            }

        }
    }

}
