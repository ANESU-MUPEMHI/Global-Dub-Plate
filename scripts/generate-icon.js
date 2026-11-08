/**
 * High-Resolution macOS AppIcon Generator for Global Dub Plate
 * Created by Adrian Anesu Mupemhi for Jahvisions, Benjamin Music & Terence Taona Technologies
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

function makeDubplateIcon(size) {
  const width = size;
  const height = size;
  const rowSize = width * 4 + 1;
  const buffer = Buffer.alloc(height * rowSize);
  
  const cx = width / 2;
  const cy = height / 2;
  const maxR = width * 0.46; // Radius with padding
  const labelR = maxR * 0.42; // Gold center label
  const spindleR = maxR * 0.08; // Center spindle hole

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    buffer[rowOffset] = 0; // Filter: None
    
    for (let x = 0; x < width; x++) {
      const px = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy);

      if (r <= maxR) {
        // Antialiased outer border
        const alpha = Math.min(255, Math.max(0, Math.round((maxR - r + 1) * 255)));

        if (r <= spindleR) {
          // Center Spindle Hole (Dark Metallic)
          const holeGradient = Math.round(15 + (dx + dy) * 0.1);
          buffer[px] = holeGradient;
          buffer[px + 1] = holeGradient;
          buffer[px + 2] = holeGradient + 5;
          buffer[px + 3] = alpha;
        } else if (r <= spindleR + 3) {
          // Spindle Brass Ring
          buffer[px] = 230;
          buffer[px + 1] = 180;
          buffer[px + 2] = 40;
          buffer[px + 3] = alpha;
        } else if (r <= labelR) {
          // Gold / Reggae Dubplate Center Label
          const angle = Math.atan2(dy, dx);
          const normDist = (r - spindleR) / (labelR - spindleR);
          
          if (normDist > 0.88 && normDist <= 0.94) {
            // Red Ring (Reggae Trinity)
            buffer[px] = 220; buffer[px + 1] = 38; buffer[px + 2] = 38; buffer[px + 3] = alpha;
          } else if (normDist > 0.82 && normDist <= 0.88) {
            // Gold Ring
            buffer[px] = 245; buffer[px + 1] = 158; buffer[px + 2] = 11; buffer[px + 3] = alpha;
          } else if (normDist > 0.76 && normDist <= 0.82) {
            // Green Ring
            buffer[px] = 16; buffer[px + 1] = 185; buffer[px + 2] = 129; buffer[px + 3] = alpha;
          } else {
            // Rich Brushed Gold Label
            const sheen = Math.sin(angle * 2) * 22;
            const goldR = Math.min(255, Math.max(0, Math.round(235 + sheen)));
            const goldG = Math.min(255, Math.max(0, Math.round(165 + sheen * 0.8)));
            const goldB = Math.min(255, Math.max(0, Math.round(20 + sheen * 0.4)));

            // Horizontal audio waveform stripe in center
            if (Math.abs(dy) < height * 0.04 && Math.abs(dx) < labelR * 0.65) {
              const waveY = Math.sin(dx * 0.15) * 8;
              if (Math.abs(dy - waveY) < 3) {
                // Waveform line (deep cyan / dark)
                buffer[px] = 15; buffer[px + 1] = 23; buffer[px + 2] = 42; buffer[px + 3] = alpha;
                continue;
              }
            }

            buffer[px] = goldR;
            buffer[px + 1] = goldG;
            buffer[px + 2] = goldB;
            buffer[px + 3] = alpha;
          }
        } else if (r <= labelR + 4) {
          // Label Runout Margin (Black)
          buffer[px] = 10; buffer[px + 1] = 12; buffer[px + 2] = 18; buffer[px + 3] = alpha;
        } else {
          // Dark Vinyl Grooves with Realistic Angular Specular Highlights
          const angle = Math.atan2(dy, dx);
          const grooveFreq = Math.sin(r * 2.5);
          const grooveBase = grooveFreq > 0 ? 26 : 16;
          
          // Cross-specular shine at 45 and 135 degrees (typical vinyl light reflection)
          const shineAngle = Math.abs(Math.sin(angle * 2));
          const shine = Math.pow(shineAngle, 8) * 65;

          const v = Math.min(255, Math.round(grooveBase + shine));
          buffer[px] = v;
          buffer[px + 1] = Math.min(255, Math.round(v * 1.05 + 2));
          buffer[px + 2] = Math.min(255, Math.round(v * 1.2 + 6));
          buffer[px + 3] = alpha;
        }
      } else {
        // Outside circle: transparent
        buffer[px] = 0; buffer[px + 1] = 0; buffer[px + 2] = 0; buffer[px + 3] = 0;
      }
    }
  }

  const idat = zlib.deflateSync(buffer);

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'binary');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    header,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function buildIcns() {
  console.log('📀 Preparing 1024x1024 Dubplate Master Artwork (Option 1 Golden Vinyl Emblem)...');
  const buildDir = path.join(__dirname, '..', 'build');
  const iconsetDir = path.join(buildDir, 'icon.iconset');
  fs.mkdirSync(iconsetDir, { recursive: true });

  const masterPngPath = path.join(buildDir, 'icon-1024.png');
  const opt1JpgPath = path.join(__dirname, '..', 'public', 'images', 'logo-opt1-vinyl-emblem.jpg');

  if (fs.existsSync(opt1JpgPath)) {
    console.log(`📸 Converting master Option 1 artwork from ${opt1JpgPath}...`);
    execSync(`/usr/bin/sips -s format png "${opt1JpgPath}" --out "${masterPngPath}" > /dev/null 2>&1`);
  } else if (!fs.existsSync(masterPngPath)) {
    console.log('Synthesizing procedural dubplate icon fallback...');
    const masterPng = makeDubplateIcon(1024);
    fs.writeFileSync(masterPngPath, masterPng);
  }
  console.log(`✓ Master PNG verified: ${masterPngPath}`);

  // Required macOS icon sizes
  const sizes = [
    { name: 'icon_16x16.png', size: 16 },
    { name: 'icon_16x16@2x.png', size: 32 },
    { name: 'icon_32x32.png', size: 32 },
    { name: 'icon_32x32@2x.png', size: 64 },
    { name: 'icon_128x128.png', size: 128 },
    { name: 'icon_128x128@2x.png', size: 256 },
    { name: 'icon_256x256.png', size: 256 },
    { name: 'icon_256x256@2x.png', size: 512 },
    { name: 'icon_512x512.png', size: 512 },
    { name: 'icon_512x512@2x.png', size: 1024 }
  ];

  console.log('📐 Generating macOS iconset dimensions using sips...');
  for (const s of sizes) {
    const dest = path.join(iconsetDir, s.name);
    execSync(`/usr/bin/sips -z ${s.size} ${s.size} "${masterPngPath}" --out "${dest}" > /dev/null 2>&1`);
  }

  const icnsPath = path.join(buildDir, 'AppIcon.icns');
  console.log('🔨 Compiling AppIcon.icns with iconutil...');
  execSync(`/usr/bin/iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`);

  console.log(`✨ Success! Native macOS AppIcon.icns generated at: ${icnsPath}`);
  return icnsPath;
}

if (require.main === module) {
  try {
    buildIcns();
  } catch (err) {
    console.error('Error building icns:', err);
    process.exit(1);
  }
}

module.exports = { makeDubplateIcon, buildIcns };
