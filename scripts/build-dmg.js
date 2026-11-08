/**
 * Native macOS .app and .dmg Installer Builder for Global Dub Plate
 * Created by Adrian Anesu Mupemhi for Jahvisions, Benjamin Music & Terence Taona Technologies
 * 
 * Generates:
 * - dist/Global Dub Plate.app
 * - dist/Global-Dub-Plate-1.0.0.dmg
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { buildIcns } = require('./generate-icon');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function buildDMG() {
  console.log('=======================================================');
  console.log('🚀 Building Native macOS Application & DMG Installer...');
  console.log('Project: Global Dub Plate DAW (FL Studio Emulation)');
  console.log('Created by: Adrian Anesu Mupemhi');
  console.log('For: Jahvisions, Benjamin Music & Terence Taona Technologies');
  console.log('=======================================================\n');

  const rootDir = path.join(__dirname, '..');
  const buildDir = path.join(rootDir, 'build');
  const distDir = path.join(rootDir, 'dist');
  const stagingDir = path.join(distDir, 'staging');
  const appName = 'Global Dub Plate.app';
  const appPath = path.join(stagingDir, appName);
  const contentsPath = path.join(appPath, 'Contents');
  const macOSPath = path.join(contentsPath, 'MacOS');
  const resourcesPath = path.join(contentsPath, 'Resources');
  const appCodePath = path.join(resourcesPath, 'app');
  const dmgName = 'Global-Dub-Plate-1.0.0.dmg';
  const dmgFinalPath = path.join(distDir, dmgName);

  // 1. Ensure AppIcon.icns exists
  const icnsPath = path.join(buildDir, 'AppIcon.icns');
  if (!fs.existsSync(icnsPath)) {
    console.log('🎨 Generating AppIcon.icns...');
    buildIcns();
  }

  // 2. Prepare staging directories
  console.log('📂 Creating .app bundle structure...');
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  fs.mkdirSync(macOSPath, { recursive: true });
  fs.mkdirSync(resourcesPath, { recursive: true });
  fs.mkdirSync(appCodePath, { recursive: true });

  // 3. Create Info.plist
  console.log('📝 Writing Contents/Info.plist...');
  const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleExecutable</key>
    <string>Global Dub Plate</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>com.jahvisions.globaldubplate</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>Global Dub Plate</string>
    <key>CFBundleDisplayName</key>
    <string>Global Dub Plate DAW</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSRequiresAquaSystemAppearance</key>
    <false/>
    <key>NSHumanReadableCopyright</key>
    <string>Copyright © 2026 Adrian Anesu Mupemhi for Jahvisions, Benjamin Music &amp; Terence Taona Technologies. All rights reserved.</string>
</dict>
</plist>
`;
  fs.writeFileSync(path.join(contentsPath, 'Info.plist'), infoPlist);

  // 4. Copy AppIcon.icns
  fs.copyFileSync(icnsPath, path.join(resourcesPath, 'AppIcon.icns'));

  // 5. Create Native Launcher Script (Contents/MacOS/Global Dub Plate)
  console.log('⚡ Generating executable native launcher...');
  const launcherScript = `#!/usr/bin/env bash
###############################################################################
# Global Dub Plate - Native macOS Application Launcher
# Created by Adrian Anesu Mupemhi for Jahvisions, Benjamin Music & Terence Taona Technologies
###############################################################################

APP_DIR="$(cd "$(dirname "$0")/../Resources/app" && pwd)"
PORT=3333
URL="http://localhost:\${PORT}"

# Locate Node.js executable on the system
NODE_BIN=""
CANDIDATES=(
  "/usr/local/bin/node"
  "/opt/homebrew/bin/node"
  "$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" 2>/dev/null | tail -n 1)/bin/node"
  "$(which node 2>/dev/null)"
)

for cand in "\${CANDIDATES[@]}"; do
  if [ -x "$cand" ]; then
    NODE_BIN="$cand"
    break
  fi
done

if [ -z "$NODE_BIN" ]; then
  osascript -e 'display alert "Node.js Required" message "Node.js was not found. Please install Node.js (https://nodejs.org) to run Global Dub Plate DAW."'
  exit 1
fi

# Check if server is already responding
SERVER_READY=0
if curl -s -I "$URL" > /dev/null 2>&1; then
  SERVER_READY=1
fi

if [ $SERVER_READY -eq 0 ]; then
  cd "$APP_DIR" || exit 1
  nohup "$NODE_BIN" server.js > /tmp/global-dub-plate.log 2>&1 &
  SERVER_PID=$!

  # Wait up to 5 seconds for server to boot
  for i in {1..25}; do
    if curl -s -I "$URL" > /dev/null 2>&1; then
      SERVER_READY=1
      break
    fi
    sleep 0.2
  done
fi

# Launch in Dedicated Desktop Window Mode
# Chromium-based browser app mode strips all browser chrome for a 60fps native DAW window
CHROMIUM_APP=""
if [ -d "/Applications/Google Chrome.app" ]; then
  CHROMIUM_APP="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
elif [ -d "$HOME/Applications/Google Chrome.app" ]; then
  CHROMIUM_APP="$HOME/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
elif [ -d "/Applications/Brave Browser.app" ]; then
  CHROMIUM_APP="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
elif [ -d "/Applications/Microsoft Edge.app" ]; then
  CHROMIUM_APP="/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
elif [ -d "/Applications/Chromium.app" ]; then
  CHROMIUM_APP="/Applications/Chromium.app/Contents/MacOS/Chromium"
fi

if [ -n "$CHROMIUM_APP" ]; then
  exec "$CHROMIUM_APP" \\
    --app="$URL" \\
    --window-size=1340,860 \\
    --window-position=center \\
    --enable-audio-service-sandbox=false \\
    --autoplay-policy=no-user-gesture-required \\
    --enable-features=VaapiVideoDecoder \\
    --disable-features=Translate \\
    --app-id="global-dub-plate-daw"
else
  # Fallback: Open in default macOS web environment
  open "$URL"
fi
`;
  const launcherPath = path.join(macOSPath, 'Global Dub Plate');
  fs.writeFileSync(launcherPath, launcherScript);
  fs.chmodSync(launcherPath, '755');

  // 6. Copy Application Code into Resources/app
  console.log('📦 Bundling app resources, frontend & audio server...');
  fs.copyFileSync(path.join(rootDir, 'server.js'), path.join(appCodePath, 'server.js'));
  fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(appCodePath, 'package.json'));
  if (fs.existsSync(path.join(rootDir, 'test-api.js'))) {
    fs.copyFileSync(path.join(rootDir, 'test-api.js'), path.join(appCodePath, 'test-api.js'));
  }
  copyRecursiveSync(path.join(rootDir, 'public'), path.join(appCodePath, 'public'));
  copyRecursiveSync(path.join(rootDir, 'data'), path.join(appCodePath, 'data'));

  // Copy .app to dist root as standalone ready-to-run app
  console.log('📋 Creating standalone Global Dub Plate.app in dist/...');
  const distAppPath = path.join(distDir, appName);
  if (fs.existsSync(distAppPath)) {
    fs.rmSync(distAppPath, { recursive: true, force: true });
  }
  copyRecursiveSync(appPath, distAppPath);

  // 7. Add Applications Symlink for Standard Drag & Drop DMG Installer
  console.log('🔗 Creating /Applications drag-and-drop installer symlink...');
  const appSymlink = path.join(stagingDir, 'Applications');
  try {
    fs.symlinkSync('/Applications', appSymlink);
  } catch (e) {
    // Ignore if symlink exists
  }

  // 8. Add README.txt into DMG root with creator attribution
  const readmeText = `================================================================================
GLOBAL DUB PLATE - DIGITAL AUDIO WORKSTATION (DAW)
FL Studio Emulation • Multitrack Arranger • Floating Mixer • Sound Clash Desk
================================================================================

INSTALLATION INSTRUCTIONS:
1. Drag "Global Dub Plate.app" into your "Applications" folder.
2. Open Launchpad or Spotlight and launch "Global Dub Plate".
3. Enjoy zero-latency multitrack dub recording, floating mixer (F9), and playlist arrangement (F5)!

KEYBOARD SHORTCUTS:
- F5       : Bring Out / Focus Playlist Arrangement
- F9       : Bring Out / Toggle Floating Mixer Window
- Space    : Start / Stop Playback
- Ctrl + M : Toggle Metronome Click
- Ctrl + P : Toggle 3-2-1 Countdown Pre-Count

--------------------------------------------------------------------------------
PROJECT & CREATOR ATTRIBUTION:
This project was made by Adrian Anesu Mupemhi for Jahvisions, Benjamin Music & Terence Taona Technologies.
Owner: Adrian Anesu Mupemhi | Contact: +2772442 5958 | Address: 34 Derby Road, Kensington, Johannesburg, South Africa, 2094 | Email: mupemhianesu@gmail.com
--------------------------------------------------------------------------------
`;
  fs.writeFileSync(path.join(stagingDir, 'README.txt'), readmeText);

  // 9. Build DMG using /usr/bin/hdiutil
  console.log(`💽 Creating Apple Disk Image (${dmgName}) using hdiutil...`);
  if (fs.existsSync(dmgFinalPath)) {
    fs.unlinkSync(dmgFinalPath);
  }

  const hdiutilCmd = `/usr/bin/hdiutil create -volname "Global Dub Plate DAW" -srcfolder "${stagingDir}" -ov -format UDZO "${dmgFinalPath}"`;
  execSync(hdiutilCmd, { stdio: 'inherit' });

  // 10. Clean up staging folder
  fs.rmSync(stagingDir, { recursive: true, force: true });

  const stats = fs.statSync(dmgFinalPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('\n=======================================================');
  console.log(`🎉 macOS DMG BUILD COMPLETE!`);
  console.log(`📍 DMG File: ${dmgFinalPath} (${sizeMB} MB)`);
  console.log(`📍 Standalone App: ${distAppPath}`);
  console.log('=======================================================');
}

if (require.main === module) {
  try {
    buildDMG();
  } catch (err) {
    console.error('❌ Build failed:', err);
    process.exit(1);
  }
}

module.exports = { buildDMG };
