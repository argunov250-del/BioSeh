"""Install the BioSeh sources into the generated Capacitor Android project."""

from pathlib import Path
from shutil import copyfile
from xml.etree import ElementTree as ET

root = Path(__file__).resolve().parents[1]
src = root / "android/app/src/main"
java = src / "java/com/bioseh/app"

for path in (root / "native/android").glob("*.java"):
    copyfile(path, java / path.name)

main = java / "MainActivity.java"
main.write_text("""package com.bioseh.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BioSehHealthPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
""", encoding="utf-8")

ns = "http://schemas.android.com/apk/res/android"
ET.register_namespace("android", ns)

def attrs(**values):
    return {f"{{{ns}}}{key}": value for key, value in values.items()}

manifest_path = src / "AndroidManifest.xml"
manifest = ET.parse(manifest_path)
app = manifest.find("application")
app.set(f"{{{ns}}}allowBackup", "false")

for suffix in ("HEART_RATE", "RESTING_HEART_RATE", "HEART_RATE_VARIABILITY", "RESPIRATORY_RATE", "OXYGEN_SATURATION", "SLEEP", "EXERCISE"):
    permission = attrs(name=f"android.permission.health.READ_{suffix}")
    if not any(node.attrib == permission for node in manifest.findall("uses-permission")):
        ET.SubElement(manifest.getroot(), "uses-permission", permission)

for node in list(app):
    if node.get(f"{{{ns}}}name") in (".HealthPrivacyActivity", ".ViewPermissionUsageActivity"):
        app.remove(node)

ET.SubElement(app, "activity", attrs(name=".HealthPrivacyActivity", exported="false"))
alias = ET.SubElement(app, "activity-alias", attrs(
    name=".ViewPermissionUsageActivity", targetActivity=".HealthPrivacyActivity",
    exported="true", permission="android.permission.START_VIEW_PERMISSION_USAGE",
))
intent = ET.SubElement(alias, "intent-filter")
ET.SubElement(intent, "action", attrs(name="android.intent.action.VIEW_PERMISSION_USAGE"))
ET.SubElement(intent, "category", attrs(name="android.intent.category.HEALTH_PERMISSIONS"))

ET.indent(manifest, space="    ")
manifest.write(manifest_path, encoding="utf-8", xml_declaration=True)
