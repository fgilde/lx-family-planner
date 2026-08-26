#!/usr/bin/env bash
set -Eeuo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

die() {
  printf 'FEHLER: %s\n' "$*" >&2
  exit 1
}

tool_root="${LX_FAMILY_BUILD_TOOLS:-$HOME/.local/opt/lx-family-build}"
if [[ -x "$tool_root/node/bin/node" ]]; then
  export PATH="$tool_root/node/bin:$PATH"
fi
if [[ -x "$tool_root/jdk/bin/javac" ]]; then
  export JAVA_HOME="$tool_root/jdk"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

command -v node >/dev/null || die 'Node.js fehlt. Bitte scripts/setup-android-popos.sh ausführen.'
command -v npm >/dev/null || die 'npm fehlt. Bitte scripts/setup-android-popos.sh ausführen.'
command -v javac >/dev/null || die 'JDK 21 fehlt. Bitte scripts/setup-android-popos.sh ausführen.'
command -v keytool >/dev/null || die 'keytool fehlt. Bitte scripts/setup-android-popos.sh ausführen.'

node_major="$(node -p 'process.versions.node.split(`.`)[0]')"
[[ "$node_major" -ge 22 ]] || die "Node.js 22 oder neuer ist nötig (gefunden: $(node --version))."

if [[ -z "${JAVA_HOME:-}" ]]; then
  export JAVA_HOME="$(dirname "$(dirname "$(readlink -f "$(command -v javac)")")")"
fi

export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$tool_root/android-sdk}}"
export ANDROID_HOME="$ANDROID_SDK_ROOT"
export PATH="$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$PATH"
[[ -x "$ANDROID_SDK_ROOT/platform-tools/adb" ]] || die 'Android-SDK fehlt. Bitte scripts/setup-android-popos.sh ausführen.'

google_services_file='android/app/google-services.json'
[[ -f "$google_services_file" ]] || die 'android/app/google-services.json fehlt. Ohne passende Firebase-Datei wird keine Update-APK erzeugt.'
node -e '
  const fs = require("fs");
  const file = process.argv[1];
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  const found = (json.client || []).some(client =>
    client?.client_info?.android_client_info?.package_name === "com.lxfamily.planner"
  );
  if (!found) process.exitCode = 1;
' "$google_services_file" || die 'google-services.json gehört nicht zu com.lxfamily.planner.'

printf '[1/3] Web-App bauen …\n'
npm run build
rm -rf dist/apk

printf '[2/3] Capacitor mit Android abgleichen …\n'
npx cap sync android

signing_dir='data/android-signing'
signing_file="$signing_dir/signing.json"
keystore="$signing_dir/lx-family-release.jks"
if [[ -z "${LX_ANDROID_KEYSTORE:-}" || -z "${LX_ANDROID_STORE_PASSWORD:-}" || -z "${LX_ANDROID_KEY_ALIAS:-}" || -z "${LX_ANDROID_KEY_PASSWORD:-}" ]]; then
  mkdir -p "$signing_dir"
  if [[ -f "$signing_file" && -f "$keystore" ]]; then
    mapfile -t signing < <(node -e '
      const fs = require("fs");
      const value = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
      for (const key of ["storePassword", "keyAlias", "keyPassword"]) {
        if (!value[key]) process.exit(1);
        console.log(value[key]);
      }
    ' "$signing_file") || die 'Lokale Signaturdaten sind ungültig.'
    export LX_ANDROID_KEYSTORE="$project_root/$keystore"
    export LX_ANDROID_STORE_PASSWORD="${signing[0]}"
    export LX_ANDROID_KEY_ALIAS="${signing[1]}"
    export LX_ANDROID_KEY_PASSWORD="${signing[2]}"
  else
    printf 'Neue lokale Release-Signatur wird erzeugt. Diesen Ordner unbedingt sichern.\n'
    password="$(node -e 'console.log(require("crypto").randomBytes(36).toString("base64url"))')"
    alias='lx-family'
    keytool -genkeypair -keystore "$keystore" -storepass "$password" -keypass "$password" \
      -alias "$alias" -keyalg RSA -keysize 4096 -validity 10000 \
      -dname 'CN=LX Family Planner, OU=LaxX Lab, O=LaxX Lab, C=DE'
    SIGNING_FILE="$signing_file" SIGNING_PASSWORD="$password" SIGNING_ALIAS="$alias" node -e '
      const fs = require("fs");
      fs.writeFileSync(process.env.SIGNING_FILE, JSON.stringify({
        storePassword: process.env.SIGNING_PASSWORD,
        keyAlias: process.env.SIGNING_ALIAS,
        keyPassword: process.env.SIGNING_PASSWORD
      }, null, 2) + "\n", { mode: 0o600 });
    '
    export LX_ANDROID_KEYSTORE="$project_root/$keystore"
    export LX_ANDROID_STORE_PASSWORD="$password"
    export LX_ANDROID_KEY_ALIAS="$alias"
    export LX_ANDROID_KEY_PASSWORD="$password"
  fi
fi

printf '[3/3] Signierte Android-APK bauen …\n'
(cd android && ./gradlew assembleRelease)

apk_source='android/app/build/outputs/apk/release/app-release.apk'
[[ -f "$apk_source" ]] || die 'Gradle hat keine Release-APK erzeugt.'
mkdir -p data/apk public/apk
cp "$apk_source" data/apk/latest.apk
cp "$apk_source" LX-Family-Planner.apk
cp "$apk_source" public/apk/latest.apk

APK_PATH="$project_root/data/apk/latest.apk" node - <<'NODE'
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const root = process.cwd();
const apk = process.env.APK_PATH;
const versionName = require(path.join(root, 'package.json')).version;
const gradle = fs.readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8');
const versionCode = Number(gradle.match(/versionCode\s+(\d+)/)?.[1] || 0);
const file = fs.statSync(apk);
const metadata = {
  versionName,
  versionCode,
  buildKind: 'release',
  builtAt: file.mtime.toISOString(),
  sha256: crypto.createHash('sha256').update(fs.readFileSync(apk)).digest('hex')
};
for (const directory of ['data/apk', 'public/apk']) {
  fs.writeFileSync(path.join(root, directory, 'version.json'), `${JSON.stringify(metadata, null, 2)}\n`);
}
NODE

printf '\nFERTIG: signierte APK erstellt.\n%s\n' "$project_root/LX-Family-Planner.apk"
