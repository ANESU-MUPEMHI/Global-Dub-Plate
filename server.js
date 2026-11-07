// Global Dub Plate - Backend Server & API
// Created by Adrian Anesu Mupemhi for Jahvisions, Benjamin Music & Terence Taona Technologies

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

// Helper to read JSON data file safely
function readJson(filename, defaultVal = []) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2), 'utf8');
      return defaultVal;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filename}:`, err);
    return defaultVal;
  }
}

// Helper to write JSON data file safely
function writeJson(filename, data) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filename}:`, err);
    return false;
  }
}

// Helper to parse JSON request body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        reject(new Error('Request entity too large'));
      }
    });
    req.on('end', () => {
      try {
        if (!body) return resolve({});
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

// JSON API response helper
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Static file handler
function serveStaticFile(req, res, pathname) {
  let safePath = pathname === '/' ? '/index.html' : pathname;
  safePath = path.normalize(safePath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      if (!path.extname(safePath)) {
        const indexPath = path.join(PUBLIC_DIR, 'index.html');
        return fs.readFile(indexPath, (readErr, content) => {
          if (readErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('404 Not Found');
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        });
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Asset Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const range = req.headers.range;
    if (range && (ext === '.mp3' || ext === '.wav' || ext === '.mp4')) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunkSize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType
      });
      fileStream.pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

// Server router
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // API Routes
  if (pathname.startsWith('/api/')) {
    try {
      if (pathname === '/api/artists' && method === 'GET') {
        const artists = readJson('artists.json', []);
        return sendJson(res, 200, { success: true, count: artists.length, data: artists });
      }

      if (pathname === '/api/riddims' && method === 'GET') {
        const riddims = readJson('riddims.json', []);
        return sendJson(res, 200, { success: true, count: riddims.length, data: riddims });
      }

      if (pathname === '/api/orders' && method === 'GET') {
        const orders = readJson('orders.json', []);
        return sendJson(res, 200, { success: true, count: orders.length, data: orders });
      }

      // GET /api/profile
      if (pathname === '/api/profile' && method === 'GET') {
        const profile = readJson('profile.json', {
          fullName: 'Adrian Anesu Mupemhi',
          email: 'mupemhianesu@gmail.com',
          phone: '+2772442 5958',
          country: 'South Africa',
          city: 'Johannesburg',
          soundName: 'Jahvisions International Sound',
          crewMembers: 'Selector Adrian, MC Fireseed, DJ Benjamin, Terence Dub Operator',
          areasToMention: 'Johannesburg, Kensington, Harare, Kingston, Brixton, Tokyo',
          tagLine: 'The Undisputed Dubplate Champions • Pure Reggae & Dancehall Pressure',
          suggestions: "Please pronounce 'Jahvisions' clearly. For clash cuts, shout out the sound crew and state that no rival sound system can survive this selection. Keep it high energy with dub delay on the drop."
        });
        return sendJson(res, 200, { success: true, data: profile });
      }

      // POST /api/profile
      if (pathname === '/api/profile' && method === 'POST') {
        const payload = await parseBody(req);
        const existing = readJson('profile.json', {});
        const updatedProfile = {
          ...existing,
          ...payload,
          updatedAt: new Date().toISOString()
        };
        writeJson('profile.json', updatedProfile);
        return sendJson(res, 200, {
          success: true,
          message: 'User profile and sound system identity updated successfully!',
          data: updatedProfile
        });
      }

      // GET /api/notifications
      if (pathname === '/api/notifications' && method === 'GET') {
        const notifications = readJson('notifications.json', []);
        const unreadCount = notifications.filter(n => n.unread).length;
        return sendJson(res, 200, { success: true, count: notifications.length, unreadCount, data: notifications });
      }

      // POST /api/notifications
      if (pathname === '/api/notifications' && method === 'POST') {
        const payload = await parseBody(req);
        const notifications = readJson('notifications.json', []);
        if (payload.action === 'mark_all_read') {
          notifications.forEach(n => { n.unread = false; });
          writeJson('notifications.json', notifications);
          return sendJson(res, 200, { success: true, message: 'All notifications marked as read', unreadCount: 0, data: notifications });
        }
        if (payload.action === 'mark_read' && payload.id) {
          const item = notifications.find(n => n.id === payload.id);
          if (item) item.unread = false;
          writeJson('notifications.json', notifications);
          const unreadCount = notifications.filter(n => n.unread).length;
          return sendJson(res, 200, { success: true, unreadCount, data: notifications });
        }
        const newNotif = {
          id: `NOTIF-${Date.now()}`,
          timestamp: new Date().toISOString(),
          unread: true,
          icon: payload.icon || '🔔',
          ...payload
        };
        notifications.unshift(newNotif);
        writeJson('notifications.json', notifications);
        const unreadCount = notifications.filter(n => n.unread).length;
        return sendJson(res, 201, { success: true, notification: newNotif, unreadCount, data: notifications });
      }

      if (pathname === '/api/stats' && method === 'GET') {
        const artists = readJson('artists.json', []);
        const orders = readJson('orders.json', []);
        const inStudioCount = artists.filter(a => a.studioStatus === 'in_studio').length;
        const totalCuts = artists.reduce((acc, a) => acc + (a.completedCuts || 0), 0) + orders.length;
        const countries = [...new Set(artists.map(a => a.country))];

        return sendJson(res, 200, {
          success: true,
          stats: {
            liveInStudioArtists: inStudioCount,
            totalArtists: artists.length,
            countriesActive: countries.length,
            countriesList: countries,
            totalCutsCompleted: totalCuts,
            activeOrdersCount: orders.filter(o => o.status !== 'completed').length
          }
        });
      }

      if (pathname === '/api/orders' && method === 'POST') {
        const payload = await parseBody(req);
        const {
          soundSystem,
          selector,
          location,
          artistId,
          recordingType,
          catalogSong,
          useCustomRiddim,
          riddimId,
          isTempoClickAcapella,
          tempoBpm,
          deliveryFormat,
          hasVideoCapture,
          customLyrics
        } = payload;

        if (!soundSystem || !artistId || !recordingType) {
          return sendJson(res, 400, { success: false, message: 'Missing required order fields' });
        }

        const artists = readJson('artists.json', []);
        const artist = artists.find(a => a.id === artistId);
        if (!artist) {
          return sendJson(res, 404, { success: false, message: 'Artist not found' });
        }

        const riddims = readJson('riddims.json', []);
        const selectedRiddim = riddims.find(r => r.id === riddimId);

        const baseFee = artist.pricing[recordingType] || artist.pricing.dubplate;
        const videoFee = hasVideoCapture ? (artist.pricing.videoCapture || 100) : 0;
        const customRiddimFee = useCustomRiddim ? 50 : 0;
        const totalFee = baseFee + videoFee + customRiddimFee;
        const depositPaid = Math.round(totalFee * 0.25);
        const balanceDue = totalFee - depositPaid;

        const newOrder = {
          id: `GDP-${Math.floor(1000 + Math.random() * 9000)}`,
          createdAt: new Date().toISOString(),
          soundSystem: soundSystem || 'International Sound System',
          selector: selector || 'Head Selector',
          location: location || 'World Clash Arena',
          artistId: artist.id,
          artistName: artist.name,
          artistFlag: artist.flag,
          recordingType,
          catalogSong: catalogSong || (artist.catalog[0]?.title || 'Custom Anthem'),
          useCustomRiddim: !!useCustomRiddim,
          riddimId: riddimId || 'original',
          riddimName: selectedRiddim ? `${selectedRiddim.name} (${selectedRiddim.bpm} BPM)` : 'Artist Original Production',
          isTempoClickAcapella: !!isTempoClickAcapella,
          tempoBpm: tempoBpm || 85,
          deliveryFormat: deliveryFormat || 'stereo',
          hasVideoCapture: !!hasVideoCapture,
          customLyrics: customLyrics || `Dubplate cut direct for ${soundSystem}!`,
          pricing: {
            baseFee,
            videoFee,
            customRiddimFee,
            totalFee,
            depositPaid,
            balanceDue,
            percentPaid: 25
          },
          status: 'preview_ready',
          statusMessage: 'Dub Cut Voiced & Uploaded! 25% Preview Gate Active. Only 25% playback unlocked. Pay balance to release full master audio, split-track & video.',
          audioDuration: 120,
          previewDuration: 30,
          audioTitle: `${artist.name} - ${catalogSong || 'Sound Killer'} (${soundSystem} Special)`,
          videoUrl: hasVideoCapture ? '/assets/sample-session-buju.mp4' : null
        };

        const orders = readJson('orders.json', []);
        orders.unshift(newOrder);
        writeJson('orders.json', orders);

        // Auto-create notification in user profile inbox
        const notifs = readJson('notifications.json', []);
        notifs.unshift({
          id: `NOTIF-${Date.now()}`,
          orderId: newOrder.id,
          type: 'order_dispatched',
          title: `🚀 Request Forwarded to ${newOrder.artistName}`,
          message: `Your ${newOrder.recordingType.toUpperCase()} request for "${newOrder.soundSystem}" has been forwarded to the vocal booth! 25% deposit ($${newOrder.pricing.depositPaid.toFixed(2)}) secured in escrow.`,
          timestamp: new Date().toISOString(),
          unread: true,
          artistName: newOrder.artistName,
          artistFlag: newOrder.artistFlag || '🇯🇲',
          recordingType: newOrder.recordingType,
          depositAmount: newOrder.pricing.depositPaid,
          balanceAmount: newOrder.pricing.balanceDue,
          icon: '🚀'
        });
        writeJson('notifications.json', notifs);

        return sendJson(res, 201, {
          success: true,
          message: '25% Deposit received! Dub plate order dispatched to studio.',
          order: newOrder
        });
      }

      const payMatch = pathname.match(/^\/api\/orders\/([a-zA-Z0-9\-_]+)\/pay-balance$/);
      if (payMatch && method === 'POST') {
        const orderId = payMatch[1];
        const orders = readJson('orders.json', []);
        const orderIndex = orders.findIndex(o => o.id === orderId);

        if (orderIndex === -1) {
          return sendJson(res, 404, { success: false, message: 'Order not found' });
        }

        const order = orders[orderIndex];
        order.pricing.depositPaid = order.pricing.totalFee;
        order.pricing.balanceDue = 0;
        order.pricing.percentPaid = 100;
        order.status = 'completed';
        order.statusMessage = '100% Full Payment Verified! Full stereo WAV, split-track, stems pack & 4K video are now fully unlocked.';
        order.previewDuration = order.audioDuration;

        orders[orderIndex] = order;
        writeJson('orders.json', orders);

        // Auto-create notification for master unlock
        const notifs = readJson('notifications.json', []);
        notifs.unshift({
          id: `NOTIF-${Date.now()}`,
          orderId: order.id,
          type: 'master_unlocked',
          title: `🏆 Master Audio & Stems Unlocked: ${order.audioTitle}`,
          message: `100% Full Payment of $${order.pricing.totalFee.toFixed(2)} completed. Full stereo WAV, split-track voice/music stems, and 4K studio video are ready to download!`,
          timestamp: new Date().toISOString(),
          unread: true,
          artistName: order.artistName,
          artistFlag: order.artistFlag || '🇯🇲',
          recordingType: order.recordingType,
          depositAmount: order.pricing.totalFee,
          balanceAmount: 0,
          icon: '🏆'
        });
        writeJson('notifications.json', notifs);

        return sendJson(res, 200, {
          success: true,
          message: 'Full balance paid! Master Dubplate and Stems unlocked.',
          order
        });
      }

      const uploadMatch = pathname.match(/^\/api\/orders\/([a-zA-Z0-9\-_]+)\/upload-cut$/);
      if (uploadMatch && method === 'POST') {
        const orderId = uploadMatch[1];
        const orders = readJson('orders.json', []);
        const orderIndex = orders.findIndex(o => o.id === orderId);

        if (orderIndex === -1) {
          return sendJson(res, 404, { success: false, message: 'Order not found' });
        }

        const order = orders[orderIndex];
        order.status = 'preview_ready';
        order.statusMessage = 'Artist has recorded and uploaded the dub! 25% preview audio unlocked for sound system verification.';
        orders[orderIndex] = order;
        writeJson('orders.json', orders);

        // Auto-create notification in user profile inbox for 25% preview ready
        const notifs = readJson('notifications.json', []);
        notifs.unshift({
          id: `NOTIF-${Date.now()}`,
          orderId: order.id,
          type: 'preview_ready',
          title: `🎵 Dubplate Preview Ready (25% Gate Active): ${order.audioTitle}`,
          message: `${order.artistName} has voiced and uploaded your cut from ${order.studioName || 'the studio'}! 25% audio preview is now unlocked in your Vault. Pay 75% balance to unlock master WAV, split-track & 4K video.`,
          timestamp: new Date().toISOString(),
          unread: true,
          artistName: order.artistName,
          artistFlag: order.artistFlag || '🇯🇲',
          recordingType: order.recordingType,
          depositAmount: order.pricing.depositPaid,
          balanceAmount: order.pricing.balanceDue,
          icon: '🎵'
        });
        writeJson('notifications.json', notifs);

        return sendJson(res, 200, {
          success: true,
          message: 'Dub plate uploaded! Sound system notified for 25% preview.',
          order
        });
      }

      // POST /api/orders/:id/reminder
      const reminderMatch = pathname.match(/^\/api\/orders\/([a-zA-Z0-9\-_]+)\/reminder$/);
      if (reminderMatch && method === 'POST') {
        const orderId = reminderMatch[1];
        const orders = readJson('orders.json', []);
        const order = orders.find(o => o.id === orderId);
        if (!order) {
          return sendJson(res, 404, { success: false, message: 'Order not found' });
        }
        const notifs = readJson('notifications.json', []);
        notifs.unshift({
          id: `NOTIF-${Date.now()}`,
          orderId: order.id,
          type: 'balance_reminder',
          title: `🔔 Studio Reminder: ${order.artistName} awaiting balance release`,
          message: `${order.artistName} is ready to ship your 100% unwatermarked master WAV, split-track & stems for "${order.soundSystem}". Pay remaining $${order.pricing.balanceDue} to release immediately.`,
          timestamp: new Date().toISOString(),
          unread: true,
          artistName: order.artistName,
          artistFlag: order.artistFlag || '🇯🇲',
          recordingType: order.recordingType,
          depositAmount: order.pricing.depositPaid,
          balanceAmount: order.pricing.balanceDue,
          icon: '🔔'
        });
        writeJson('notifications.json', notifs);
        return sendJson(res, 200, {
          success: true,
          message: `Reminder ping sent to ${order.soundSystem}'s Profile Inbox!`
        });
      }

      // POST /api/artists/:id/update
      const artistUpdateMatch = pathname.match(/^\/api\/artists\/([a-zA-Z0-9\-_]+)\/update$/);
      if (artistUpdateMatch && method === 'POST') {
        const artistId = artistUpdateMatch[1];
        const payload = await parseBody(req);
        const artists = readJson('artists.json', []);
        const idx = artists.findIndex(a => a.id === artistId);
        if (idx === -1) {
          return sendJson(res, 404, { success: false, message: 'Artist not found' });
        }
        artists[idx] = {
          ...artists[idx],
          ...payload,
          pricing: {
            ...artists[idx].pricing,
            ...(payload.pricing || {})
          }
        };
        writeJson('artists.json', artists);
        return sendJson(res, 200, {
          success: true,
          message: 'Artist profile & rate card updated successfully!',
          artist: artists[idx]
        });
      }

      // POST /api/artists/:id/payout
      const payoutMatch = pathname.match(/^\/api\/artists\/([a-zA-Z0-9\-_]+)\/payout$/);
      if (payoutMatch && method === 'POST') {
        const artistId = payoutMatch[1];
        const payload = await parseBody(req);
        const payouts = readJson('payouts.json', []);
        const payoutRecord = {
          id: `PAYOUT-${Date.now()}`,
          artistId,
          amount: Number(payload.amount) || 500,
          payoutMethod: payload.method || 'wire_transfer',
          accountDetails: payload.accountDetails || 'Default Verified Payout Rail',
          status: 'processing',
          createdAt: new Date().toISOString()
        };
        payouts.unshift(payoutRecord);
        writeJson('payouts.json', payouts);
        return sendJson(res, 201, {
          success: true,
          message: `Payout request of $${payoutRecord.amount} dispatched! Funds will settle via ${payoutRecord.payoutMethod}.`,
          payout: payoutRecord
        });
      }

      if (pathname === '/api/artists/register' && method === 'POST') {
        const payload = await parseBody(req);
        const {
          name,
          country,
          city,
          dubplateFee,
          jingleFee,
          dropInFee,
          shoutOutFee,
          videoFee,
          catalogSongs,
          studioName
        } = payload;

        if (!name || !country || !dubplateFee) {
          return sendJson(res, 400, { success: false, message: 'Artist name, country and fees are required' });
        }

        const countryFlags = {
          'Jamaica': '🇯🇲',
          'Ghana': '🇬🇭',
          'Zimbabwe': '🇿🇼',
          'America': '🇺🇸',
          'Kenya': '🇰🇪',
          'Europe': '🇪🇺',
          'United Kingdom': '🇬🇧',
          'Germany': '🇩🇪',
          'Japan': '🇯🇵',
          'South Africa': '🇿🇦',
          'Nigeria': '🇳🇬',
          'Canada': '🇨🇦'
        };

        const flag = countryFlags[country] || '🌐';
        const artistId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        const catalogArray = (catalogSongs || 'Special Dub Anthem,Sound Killer Dub')
          .split(',')
          .map((title, idx) => ({
            id: `song-${idx + 1}`,
            title: title.trim(),
            year: 2026,
            riddim: 'Custom Dub Selection',
            bpm: 85
          }));

        const newArtist = {
          id: artistId,
          name,
          country,
          countryCode: country.slice(0, 2).toUpperCase(),
          flag,
          city: city || 'Global Studio Hub',
          studioStatus: 'in_studio',
          studioName: studioName || `${name} Vocal Booth`,
          sessionTitle: 'Direct Global Dub Voicing',
          bio: `Official Reggae & Sound System talent representing ${country}. Ready to cut custom clash anthems and jingles live direct.`,
          pricing: {
            dubplate: Number(dubplateFee) || 600,
            jingle: Number(jingleFee) || 300,
            dropIn: Number(dropInFee) || 200,
            shoutOut: Number(shoutOutFee) || 150,
            videoCapture: Number(videoFee) || 90
          },
          catalog: catalogArray,
          sampleVocal: `Live direct from ${country}! ${name} voicing specials for the global sound system movement!`,
          rating: 5.0,
          completedCuts: 1,
          responseTime: 'Instant / Within 2 hrs'
        };

        const artists = readJson('artists.json', []);
        artists.unshift(newArtist);
        writeJson('artists.json', artists);

        return sendJson(res, 201, {
          success: true,
          message: `Welcome to Global Dub Plate, ${name}! Your artist roster profile is now live.`,
          artist: newArtist
        });
      }

      return sendJson(res, 404, { success: false, message: 'API route not found' });
    } catch (apiErr) {
      console.error('API Error:', apiErr);
      return sendJson(res, 500, { success: false, message: apiErr.message });
    }
  }

  serveStaticFile(req, res, pathname);
});

function startServer(portToTry) {
  server.listen(portToTry, () => {
    console.log(`=======================================================`);
    console.log(`🎶 Global Dub Plate Platform is LIVE on:`);
    console.log(`👉 http://localhost:${portToTry}`);
    console.log(`=======================================================`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const nextPorts = [3333, 8888, 4000, 5000, 8080];
    const currentPort = server.address() ? server.address().port : PORT;
    const nextPort = nextPorts.find(p => p > currentPort) || (currentPort + 1);
    console.log(`⚠️ Port ${currentPort} is currently occupied. Auto-switching to port ${nextPort}...`);
    setTimeout(() => {
      startServer(nextPort);
    }, 200);
  } else {
    console.error('Server error:', err);
  }
});

const defaultPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 3333;
startServer(defaultPort);
