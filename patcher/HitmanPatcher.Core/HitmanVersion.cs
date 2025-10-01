using System.Collections.Generic;
using System.Linq;
using System.Runtime.Remoting.Metadata.W3cXsd2001;
using System.Text;
using HitmanPatcher.PatchDefinitions;

namespace HitmanPatcher
{
    public class Patch
    {
        public static readonly byte[] http = Encoding.ASCII.GetBytes("http://{0}\0").ToArray();
        public static readonly byte[] https = Encoding.ASCII.GetBytes("https://{0}\0").ToArray();

        public readonly int offset;
        public readonly byte[] original, patch;
        public readonly string customPatch;
        public readonly MemProtection defaultProtection;

        public Patch(int offset, byte[] original, byte[] patch, MemProtection defaultProtection, string customPatch = "")
        {
            this.offset = offset;
            this.original = original;
            this.patch = patch;
            this.defaultProtection = defaultProtection;
            this.customPatch = customPatch;
        }

        public Patch(int offset, string original, string patch, MemProtection defaultProtection, string customPatch = "")
            : this(offset, SoapHexBinary.Parse(original).Value, SoapHexBinary.Parse(patch).Value, defaultProtection, customPatch)
        {

        }
    }

    public class HitmanVersion
    {
        public Patch[] certpin, authheader, configdomain, protocol, dynres_noforceoffline, dynres_enable;

        private static Dictionary<uint, string> timestampMap = new Dictionary<uint, string>();

        private static Dictionary<string, HitmanVersion> versionMap = new Dictionary<string, HitmanVersion>();

        public static readonly HitmanVersion NotFound = new HitmanVersion();

        public static void AddVersion(string name, uint timestamp, HitmanVersion patchVersions)
        {
            timestampMap.Add(timestamp, name);
            versionMap.Add(name, patchVersions);
        }

        private static string VersionStringFromTimestamp(uint timestamp)
        {
            if (!timestampMap.TryGetValue(timestamp, out string result))
            {
                result = "unknown";
            }
            return result;
        }

        public static HitmanVersion GetVersion(uint timestamp)
        {
            string versionString = VersionStringFromTimestamp(timestamp);

            if (versionMap.TryGetValue(versionString, out HitmanVersion version))
            {
                return version;
            }

            return NotFound;
        }

        static HitmanVersion()
        {
            v1_12.AddVersions();
            v1_15.AddVersions();
            v1_16.AddVersions();
            v2_13.AddVersions();
            v2_71.AddVersions();
            v2_72.AddVersions();
            v3_10.AddVersions();
            v3_11.AddVersions();
            v3_20.AddVersions();
            v3_30.AddVersions();
            v3_40.AddVersions();
            v3_50.AddVersions();
            v3_70.AddVersions();
            v3_100.AddVersions();
            v3_110.AddVersions();
            v3_120.AddVersions();
            vScpc.AddVersions();
        }
    }
}
