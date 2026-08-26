#!/usr/bin/env bash
set -Eeuo pipefail

command -v curl >/dev/null || { echo 'curl fehlt.' >&2; exit 1; }
command -v tar >/dev/null || { echo 'tar fehlt.' >&2; exit 1; }
command -v unzip >/dev/null || { echo 'unzip fehlt.' >&2; exit 1; }
command -v sha256sum >/dev/null || { echo 'sha256sum fehlt.' >&2; exit 1; }

tool_root="${LX_FAMILY_BUILD_TOOLS:-$HOME/.local/opt/lx-family-build}"
mkdir -p "$tool_root"
node_dir="$tool_root/node"
jdk_dir="$tool_root/jdk"

install_node() {
  local sums archive expected actual temporary
  sums="$(mktemp)"
  trap 'rm -f "$sums"' RETURN
  curl --fail --location --retry 3 'https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt' -o "$sums"
  archive="$(awk '/node-v24.*-linux-x64\.tar\.xz$/ { print $2; exit }' "$sums")"
  [[ -n "$archive" ]] || { echo 'Aktuelle Node-24-Archivdatei konnte nicht bestimmt werden.' >&2; exit 1; }
  expected="$(awk -v archive="$archive" '$2 == archive { print $1; exit }' "$sums")"
  temporary="$(mktemp --suffix=.tar.xz)"
  curl --fail --location --retry 3 "https://nodejs.org/dist/latest-v24.x/$archive" -o "$temporary"
  actual="$(sha256sum "$temporary" | awk '{print $1}')"
  [[ "$actual" == "$expected" ]] || { echo 'Prüfsumme des Node-Archivs stimmt nicht.' >&2; exit 1; }
  rm -rf "$node_dir"
  mkdir -p "$node_dir"
  tar -xJf "$temporary" -C "$node_dir" --strip-components=1
  rm -f "$temporary"
}

if [[ ! -x "$node_dir/bin/node" || "$("$node_dir/bin/node" -p 'process.versions.node.split(`.`)[0]')" -lt 22 ]]; then
  echo 'Installiere Node.js 24 lokal …'
  install_node
fi
export PATH="$node_dir/bin:$PATH"

install_jdk() {
  local metadata package_url package_sha archive actual temporary
  metadata="$(mktemp)"
  trap 'rm -f "$metadata"' RETURN
  curl --fail --location --retry 3 \
    'https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=x64&image_type=jdk&jvm_impl=hotspot&os=linux&vendor=eclipse' \
    -o "$metadata"
  read -r package_url package_sha < <(node -e '
    const fs = require("fs");
    const value = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const pkg = value[0]?.binary?.package;
    if (!pkg?.link || !pkg?.checksum) process.exit(1);
    console.log(pkg.link, pkg.checksum);
  ' "$metadata")
  [[ -n "${package_url:-}" && -n "${package_sha:-}" ]] || { echo 'JDK-Download konnte nicht bestimmt werden.' >&2; exit 1; }
  temporary="$(mktemp --suffix=.tar.gz)"
  curl --fail --location --retry 3 "$package_url" -o "$temporary"
  actual="$(sha256sum "$temporary" | awk '{print $1}')"
  [[ "$actual" == "$package_sha" ]] || { echo 'Prüfsumme des JDK-Archivs stimmt nicht.' >&2; exit 1; }
  rm -rf "$jdk_dir"
  mkdir -p "$jdk_dir"
  tar -xzf "$temporary" -C "$jdk_dir" --strip-components=1
  rm -f "$temporary"
}

if [[ ! -x "$jdk_dir/bin/javac" ]]; then
  echo 'Installiere JDK 21 lokal …'
  install_jdk
fi
export JAVA_HOME="$jdk_dir"
export PATH="$JAVA_HOME/bin:$PATH"

sdk_root="${ANDROID_SDK_ROOT:-$tool_root/android-sdk}"
tools_dir="$sdk_root/cmdline-tools/latest"
if [[ ! -x "$tools_dir/bin/sdkmanager" ]]; then
  echo "Installiere Android Command-line Tools unter $sdk_root …"
  archive="$(mktemp --suffix=.zip)"
  trap 'rm -f "$archive"' EXIT
  curl --fail --location --retry 3 \
    'https://dl.google.com/android/repository/commandlinetools-linux-15859902_latest.zip' \
    --output "$archive"
  expected='4e4c464f145a7512b57d088ac6c278c03c9eea610886b35a5e0804e74eedf583'
  actual="$(sha256sum "$archive" | awk '{print $1}')"
  [[ "$actual" == "$expected" ]] || { echo 'Prüfsumme der Android-Werkzeuge stimmt nicht.' >&2; exit 1; }
  mkdir -p "$tools_dir"
  temporary="$(mktemp -d)"
  unzip -q "$archive" -d "$temporary"
  mv "$temporary/cmdline-tools/"* "$tools_dir/"
  rm -rf "$temporary"
fi

export ANDROID_SDK_ROOT="$sdk_root"
export ANDROID_HOME="$sdk_root"
export PATH="$sdk_root/cmdline-tools/latest/bin:$sdk_root/platform-tools:$PATH"

# The Android command-line tools ship sdkmanager. Accept the SDK licences once
# and install only the packages needed by LX Family's Gradle build.
yes | sdkmanager --sdk_root="$sdk_root" --licenses >/dev/null
sdkmanager --sdk_root="$sdk_root" \
  "platform-tools" "platforms;android-36" "build-tools;36.0.0"

cat <<EOF

Android-Build-Umgebung ist bereit.
Node: $(node --version)
Java: $(java -version 2>&1 | head -n 1)
SDK: $ANDROID_SDK_ROOT

Im Projekt genügt künftig:
  npm run build:apk:linux

Für ein Update einer bereits installierten APK kopiere vorher den bisherigen
Release-Schlüssel nach data/android-signing/ und die Firebase-Datei nach
android/app/google-services.json. Beide Dateien werden bewusst nicht in Git
gespeichert.
EOF
