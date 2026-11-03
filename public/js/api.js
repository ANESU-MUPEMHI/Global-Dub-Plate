// Global Dub Plate - API Client with Offline / file:// Protocol Fallbacks
// Created by Adrian Anesu Mupemhi for Jahvisions, Benjamin Music & Terence Taona Technologies

let inMemoryOrders = null;
let inMemoryArtists = null;
let inMemoryProfile = null;

const GDP_API = {
  async getProfile() {
    try {
      const res = await fetch('/api/profile');
      const json = await res.json();
      if (json.success && json.data) {
        inMemoryProfile = json.data;
        localStorage.setItem('gdp_user_profile', JSON.stringify(json.data));
        return json.data;
      }
    } catch (e) {
      // Fallback
    }
    const cached = localStorage.getItem('gdp_user_profile');
    if (cached) {
      try {
        inMemoryProfile = JSON.parse(cached);
        return inMemoryProfile;
      } catch (err) {}
    }
    if (!inMemoryProfile) inMemoryProfile = { ...(window.DEFAULT_PROFILE || {}) };
    return inMemoryProfile;
  },

  async saveProfile(profileData) {
    inMemoryProfile = { ...inMemoryProfile, ...profileData };
    localStorage.setItem('gdp_user_profile', JSON.stringify(inMemoryProfile));
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inMemoryProfile)
      });
      const json = await res.json();
      return json;
    } catch (e) {
      return {
        success: true,
        message: 'Profile saved locally in your sound system terminal!',
        data: inMemoryProfile
      };
    }
  },
  async getArtists() {
    try {
      const res = await fetch('/api/artists');
      const json = await res.json();
      inMemoryArtists = json.data;
      return json.data || [];
    } catch (e) {
      if (!inMemoryArtists) inMemoryArtists = [...(window.DEFAULT_ARTISTS || [])];
      return inMemoryArtists;
    }
  },

  async getRiddims() {
    try {
      const res = await fetch('/api/riddims');
      const json = await res.json();
      return json.data || [];
    } catch (e) {
      return window.DEFAULT_RIDDIMS || [];
    }
  },

  async getOrders() {
    try {
      const res = await fetch('/api/orders');
      const json = await res.json();
      inMemoryOrders = json.data;
      return json.data || [];
    } catch (e) {
      if (!inMemoryOrders) inMemoryOrders = [...(window.DEFAULT_ORDERS || [])];
      return inMemoryOrders;
    }
  },

  async getStats() {
    try {
      const res = await fetch('/api/stats');
      const json = await res.json();
      return json.stats || {};
    } catch (e) {
      const artists = await this.getArtists();
      const orders = await this.getOrders();
      return {
        liveInStudioArtists: artists.filter(a => a.studioStatus === 'in_studio').length,
        totalArtists: artists.length,
        countriesActive: 7,
        totalCutsCompleted: 1420 + orders.length,
        activeOrdersCount: orders.filter(o => o.status !== 'completed').length
      };
    }
  },

  async createOrder(orderPayload) {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      return await res.json();
    } catch (e) {
      const artists = await this.getArtists();
      const artist = artists.find(a => a.id === orderPayload.artistId);
      const riddims = await this.getRiddims();
      const riddim = riddims.find(r => r.id === orderPayload.riddimId);

      const baseFee = artist?.pricing[orderPayload.recordingType] || 800;
      const videoFee = orderPayload.hasVideoCapture ? (artist?.pricing?.videoCapture || 100) : 0;
      const customRiddimFee = orderPayload.useCustomRiddim ? 50 : 0;
      const totalFee = baseFee + videoFee + customRiddimFee;
      const depositPaid = Math.round(totalFee * 0.25);
      const balanceDue = totalFee - depositPaid;

      const newOrder = {
        id: `GDP-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date().toISOString(),
        soundSystem: orderPayload.soundSystem,
        selector: orderPayload.selector,
        location: orderPayload.location || 'Global Clash Arena',
        artistId: orderPayload.artistId,
        artistName: artist?.name || 'Dub Artist',
        artistFlag: artist?.flag || '🇯🇲',
        recordingType: orderPayload.recordingType,
        catalogSong: orderPayload.catalogSong || 'Sound Killer Special',
        useCustomRiddim: !!orderPayload.useCustomRiddim,
        riddimId: orderPayload.riddimId || 'original',
        riddimName: riddim ? `${riddim.name} (${riddim.bpm} BPM)` : 'Artist Original Production',
        isTempoClickAcapella: !!orderPayload.isTempoClickAcapella,
        tempoBpm: orderPayload.tempoBpm || 85,
        deliveryFormat: orderPayload.deliveryFormat || 'stereo',
        hasVideoCapture: !!orderPayload.hasVideoCapture,
        customLyrics: orderPayload.customLyrics || 'Special Dubplate cut live!',
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
        statusMessage: 'Dub Cut Voiced & Uploaded! 25% Audio Preview Gate active. Pay balance to unlock master WAV, split-track & video.',
        audioDuration: 120,
        previewDuration: 30,
        audioTitle: `${artist?.name || 'Artist'} - ${orderPayload.catalogSong || 'Special'} (${orderPayload.soundSystem} Special)`,
        videoUrl: orderPayload.hasVideoCapture ? '/assets/sample-session-buju.mp4' : null
      };

      if (!inMemoryOrders) inMemoryOrders = [...(window.DEFAULT_ORDERS || [])];
      inMemoryOrders.unshift(newOrder);

      return {
        success: true,
        message: '25% Deposit received! Dub plate order dispatched to studio.',
        order: newOrder
      };
    }
  },

  async payBalance(orderId) {
    try {
      const res = await fetch(`/api/orders/${orderId}/pay-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return await res.json();
    } catch (e) {
      if (!inMemoryOrders) inMemoryOrders = [...(window.DEFAULT_ORDERS || [])];
      const order = inMemoryOrders.find(o => o.id === orderId);
      if (order) {
        order.pricing.depositPaid = order.pricing.totalFee;
        order.pricing.balanceDue = 0;
        order.pricing.percentPaid = 100;
        order.status = 'completed';
        order.previewDuration = order.audioDuration;
        return { success: true, order };
      }
      return { success: false, message: 'Order not found' };
    }
  },

  async uploadCut(orderId) {
    try {
      const res = await fetch(`/api/orders/${orderId}/upload-cut`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return await res.json();
    } catch (e) {
      if (!inMemoryOrders) inMemoryOrders = [...(window.DEFAULT_ORDERS || [])];
      const order = inMemoryOrders.find(o => o.id === orderId);
      if (order) {
        order.status = 'preview_ready';
        return { success: true, order };
      }
      return { success: false, message: 'Order not found' };
    }
  },

  async registerArtist(artistData) {
    try {
      const res = await fetch('/api/artists/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(artistData)
      });
      return await res.json();
    } catch (e) {
      const newArtist = {
        id: artistData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: artistData.name,
        country: artistData.country,
        countryCode: artistData.country.slice(0, 2).toUpperCase(),
        flag: '🇯🇲',
        city: artistData.city || 'Kingston',
        studioStatus: 'in_studio',
        studioName: artistData.studioName || `${artistData.name} Studio`,
        sessionTitle: 'Direct Global Dub Voicing',
        bio: `Official Reggae & Sound System talent representing ${artistData.country}.`,
        pricing: {
          dubplate: Number(artistData.dubplateFee) || 600,
          jingle: Number(artistData.jingleFee) || 300,
          dropIn: Number(artistData.dropInFee) || 200,
          shoutOut: Number(artistData.shoutOutFee) || 150,
          videoCapture: Number(artistData.videoFee) || 90
        },
        catalog: (artistData.catalogSongs || 'Special Dub Anthem')
          .split(',')
          .map((title, i) => ({ id: `song-${i + 1}`, title: title.trim(), year: 2026, riddim: 'Custom Selection', bpm: 85 })),
        sampleVocal: `Live direct from ${artistData.country}! ${artistData.name} voicing specials!`,
        rating: 5.0,
        completedCuts: 1
      };

      if (!inMemoryArtists) inMemoryArtists = [...(window.DEFAULT_ARTISTS || [])];
      inMemoryArtists.unshift(newArtist);

      return {
        success: true,
        message: `Welcome to Global Dub Plate, ${artistData.name}!`,
        artist: newArtist
      };
    }
  }
};

window.GDP_API = GDP_API;
