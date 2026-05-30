using System.Runtime.Remoting.Metadata.W3cXsd2001;
using System.Text;
using HitmanPatcher.PatchDefinitions.FirstLight;
using HitmanPatcher.PatchDefinitions.Hitman6;
using HitmanPatcher.PatchDefinitions.Hitman7;
using HitmanPatcher.PatchDefinitions.Hitman8;
using HitmanPatcher.PatchDefinitions.SniperChallenge;

namespace HitmanPatcher;

public class Patch
{
    public static readonly byte[] Http = Encoding.ASCII.GetBytes("http://{0}\0").ToArray();
    public static readonly byte[] Https = Encoding.ASCII.GetBytes("https://{0}\0").ToArray();

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

    private static Dictionary<uint, string> timestampMap = new();

    private static Dictionary<string, HitmanVersion> versionMap = new();

    public static readonly HitmanVersion NotFound = new();

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
        V1_12.AddVersions();
        V1_15.AddVersions();
        V1_16.AddVersions();
        V2_13.AddVersions();
        V2_71.AddVersions();
        V2_72.AddVersions();
        V3_10.AddVersions();
        V3_11.AddVersions();
        V3_20.AddVersions();
        V3_30.AddVersions();
        V3_40.AddVersions();
        V3_50.AddVersions();
        V3_70.AddVersions();
        V3_100.AddVersions();
        V3_110.AddVersions();
        V3_120.AddVersions();
        V1_0.AddVersions();
        Scpc.AddVersions();
    }
}