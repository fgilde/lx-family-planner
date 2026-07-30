import fs from 'node:fs';
import path from 'node:path';

const tag = String(process.argv[2] || '').trim();
const version = tag.replace(/^v/, '');

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`Ungültiger Release-Tag: ${tag || '(leer)'}`);
}

const readJson = file =>
  JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));

const packageVersion = readJson('package.json').version;
const apkMetadata = readJson('public/apk/version.json');
const gradle = fs.readFileSync(
  path.resolve('android/app/build.gradle'),
  'utf8'
);
const gradleVersion = gradle.match(/versionName\s+"([^"]+)"/)?.[1] || '';
const releaseNotes = path.resolve(`docs/releases/v${version}.md`);

const versions = {
  tag: version,
  package: packageVersion,
  apk: apkMetadata.versionName,
  android: gradleVersion
};

const mismatches = Object.entries(versions)
  .filter(([, value]) => value !== version)
  .map(([name, value]) => `${name}=${value || '(leer)'}`);

if (mismatches.length) {
  throw new Error(
    `Release-Versionen stimmen nicht überein: ${mismatches.join(', ')}`
  );
}

if (!fs.existsSync(releaseNotes)) {
  throw new Error(
    `Release Notes fehlen: ${path.relative(process.cwd(), releaseNotes)}`
  );
}

if (!fs.existsSync(path.resolve('public/apk/latest.apk'))) {
  throw new Error('Die Android-APK public/apk/latest.apk fehlt.');
}

console.log(`Release v${version} ist vollständig und konsistent.`);
