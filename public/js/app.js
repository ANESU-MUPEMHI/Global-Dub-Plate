// Global Dub Plate - Main Application Controller
// Created by Adrian Anesu Mupemhi for Jahvisions, Benjamin Music & Terence Taona Technologies

document.addEventListener('DOMContentLoaded', async () => {
  const state = {
    artists: [],
    riddims: [],
    orders: [],
    stats: {},
    userProfile: null,
    activeTab: 'roster',
    selectedCountry: 'ALL',
    selectedStatusFilter: 'ALL',
    searchQuery: '',
    selectedArtist: null,
    activeOrder: null,
    userRole: 'sound_system',
    waveformAnimId: null
  };

  const artistsGrid = document.getElementById('artists-grid');
  const countryFilters = document.getElementById('country-filters');
  const sessionStatusFilter = document.getElementById('session-status-filter');
  const searchInput = document.getElementById('artist-search-input');
  const liveTicker = document.getElementById('live-session-ticker');
  const ordersList = document.getElementById('orders-list');
  const orderModal = document.getElementById('cut-request-modal');
  const paymentModal = document.getElementById('payment-modal');
  const registerModal = document.getElementById('register-artist-modal');
  const profileModal = document.getElementById('user-profile-modal');
  const profileForm = document.getElementById('user-profile-form');
  const stemsDrawer = document.getElementById('stems-drawer');
  const videoModal = document.getElementById('video-preview-modal');

  const playPauseBtn = document.getElementById('player-play-btn');
  const playerTrackTitle = document.getElementById('player-track-title');
  const playerSubtitle = document.getElementById('player-subtitle');
  const playerProgressBar = document.getElementById('player-progress');
  const playerProgressContainer = document.getElementById('player-progress-container');
  const playerTimeCurrent = document.getElementById('player-time-current');
  const playerTimeTotal = document.getElementById('player-time-total');
  const playerGateBadge = document.getElementById('player-gate-badge');
  const playerUnlockBtn = document.getElementById('player-unlock-btn');
  const canvasWaveform = document.getElementById('waveform-canvas');

  const engine = window.dubEngine;

  async function init() {
    setupEventListeners();
    await loadInitialData();
    renderArtists();
    renderOrders();
    setupWaveformVisualizer();
    checkAutoSelectFirstOrder();
    updateUserProfileUI();
  }

  async function loadInitialData() {
    try {
      const [artists, riddims, orders, stats, profile] = await Promise.all([
        window.GDP_API.getArtists(),
        window.GDP_API.getRiddims(),
        window.GDP_API.getOrders(),
        window.GDP_API.getStats(),
        window.GDP_API.getProfile()
      ]);
      state.artists = artists;
      state.riddims = riddims;
      state.orders = orders;
      state.stats = stats;
      state.userProfile = profile;
      renderLiveTicker();
      updateStatsDisplay();
      updateUserProfileUI();
    } catch (err) {
      console.error('Failed to load initial data:', err);
      showToast('⚠️ Connecting in offline mode with cached sound data.', 'warning');
    }
  }

  function renderLiveTicker() {
    if (!liveTicker) return;
    const liveArtists = state.artists.filter(a => a.studioStatus === 'in_studio');
    const tickerItems = liveArtists.map(a => `
      <span class="ticker-pill">
        <span class="pulse-dot"></span>
        <strong>${a.flag} ${a.name}</strong> is in <em>${a.studioName}</em> (${a.city}) — Cutting dubplates live & direct!
      </span>
    `).join(' • ');

    liveTicker.innerHTML = `<div class="ticker-content">${tickerItems} • 🇯🇲 🇬🇭 🇿🇼 🇺🇸 🇰🇪 🇬🇧 🇩🇪 🇯🇵 Global Sound System Dubplate Network Active • 25% Deposit Escrow Guaranteed</div>`;
  }

  function updateStatsDisplay() {
    const liveCountEl = document.getElementById('stat-live-artists');
    const cutsCountEl = document.getElementById('stat-total-cuts');
    const soundSystemsCountEl = document.getElementById('stat-sound-systems');

    if (liveCountEl) liveCountEl.textContent = state.artists.filter(a => a.studioStatus === 'in_studio').length;
    if (cutsCountEl) cutsCountEl.textContent = (state.stats.totalCutsCompleted || 1420) + '+';
    if (soundSystemsCountEl) soundSystemsCountEl.textContent = '380+ Sounds';
  }

  function getFilteredArtists() {
    return state.artists.filter(artist => {
      if (state.selectedCountry !== 'ALL') {
        if (state.selectedCountry === 'EUROPE') {
          if (artist.country !== 'Europe' && artist.countryCode !== 'GB' && artist.countryCode !== 'DE') return false;
        } else if (artist.country.toUpperCase() !== state.selectedCountry.toUpperCase()) {
          return false;
        }
      }

      if (state.selectedStatusFilter === 'IN_STUDIO' && artist.studioStatus !== 'in_studio') return false;
      if (state.selectedStatusFilter === 'IN_SESSION' && artist.studioStatus !== 'in_session') return false;

      if (state.searchQuery.trim() !== '') {
        const query = state.searchQuery.toLowerCase();
        const matchName = artist.name.toLowerCase().includes(query);
        const matchCity = artist.city.toLowerCase().includes(query);
        const matchSongs = artist.catalog.some(s => s.title.toLowerCase().includes(query));
        if (!matchName && !matchCity && !matchSongs) return false;
      }

      return true;
    });
  }

  function renderArtists() {
    if (!artistsGrid) return;
    const filtered = getFilteredArtists();

    if (filtered.length === 0) {
      artistsGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📻</div>
          <h3>No Artists Found in this Studio Session</h3>
          <p>Try resetting filters or searching for another reggae legend or country.</p>
          <button class="btn btn-gold btn-sm" id="reset-filters-btn">Reset All Filters</button>
        </div>
      `;
      document.getElementById('reset-filters-btn')?.addEventListener('click', () => {
        state.selectedCountry = 'ALL';
        state.selectedStatusFilter = 'ALL';
        state.searchQuery = '';
        if (searchInput) searchInput.value = '';
        renderArtists();
      });
      return;
    }

    artistsGrid.innerHTML = filtered.map(artist => {
      const isLiveInStudio = artist.studioStatus === 'in_studio';
      const statusClass = isLiveInStudio ? 'status-live' : 'status-session';
      const statusLabel = isLiveInStudio ? '🔴 LIVE IN STUDIO' : '🟡 IN DUB SESSION';

      return `
        <div class="artist-card" data-artist-id="${artist.id}">
          <div class="artist-card-header">
            <div class="artist-badge-row">
              <span class="country-pill">${artist.flag} ${artist.country}</span>
              <span class="status-pill ${statusClass}">
                ${isLiveInStudio ? '<span class="live-dot"></span>' : ''}
                ${statusLabel}
              </span>
            </div>
            <div class="artist-avatar-wrap">
              <div class="artist-avatar-placeholder">
                <span class="artist-initials">${artist.name.slice(0, 2).toUpperCase()}</span>
                <span class="vinyl-disc-spin"></span>
              </div>
            </div>
            <h3 class="artist-name">${artist.name}</h3>
            <p class="artist-location"><i class="icon-mic"></i> ${artist.studioName}</p>
          </div>

          <div class="artist-card-body">
            <p class="artist-bio">${artist.bio}</p>

            <div class="price-matrix">
              <div class="price-tier" title="Exclusive custom sound clash dubplate">
                <span class="tier-name">Dub Plate</span>
                <span class="tier-val">$${artist.pricing.dubplate}</span>
                <span class="tier-deposit">25% Dep: $${Math.round(artist.pricing.dubplate * 0.25)}</span>
              </div>
              <div class="price-tier" title="Station / Radio / Mixtape Jingle">
                <span class="tier-name">Jingle</span>
                <span class="tier-val">$${artist.pricing.jingle}</span>
                <span class="tier-deposit">25% Dep: $${Math.round(artist.pricing.jingle * 0.25)}</span>
              </div>
              <div class="price-tier" title="Quick voice drop-in">
                <span class="tier-name">Drop-In</span>
                <span class="tier-val">$${artist.pricing.dropIn}</span>
                <span class="tier-deposit">25% Dep: $${Math.round(artist.pricing.dropIn * 0.25)}</span>
              </div>
              <div class="price-tier" title="Shout-out / tempo acapella">
                <span class="tier-name">Shout Out</span>
                <span class="tier-val">$${artist.pricing.shoutOut}</span>
                <span class="tier-deposit">25% Dep: $${Math.round(artist.pricing.shoutOut * 0.25)}</span>
              </div>
            </div>

            <div class="video-addon-tag">
              <i class="icon-video"></i> Studio Video Capture available (+${artist.pricing.videoCapture ? '$' + artist.pricing.videoCapture : '$100'})
            </div>

            <div class="catalog-tags">
              <span class="catalog-title">Catalog Hits:</span>
              ${artist.catalog.slice(0, 3).map(song => `<span class="song-tag">${song.title}</span>`).join('')}
              ${artist.catalog.length > 3 ? `<span class="song-tag more">+${artist.catalog.length - 3} more</span>` : ''}
            </div>

            <div class="vocal-snippet-box">
              <button class="btn-preview-vocal" data-artist-id="${artist.id}" title="Audition Artist Voice Signature">
                <i class="icon-play"></i> Audition Voice
              </button>
              <span class="snippet-text">"${artist.sampleVocal}"</span>
            </div>
          </div>

          <div class="artist-card-footer">
            <button class="btn btn-gold btn-block btn-cut-dub" data-artist-id="${artist.id}">
              <i class="icon-disc"></i> Request Cut Direct (25% Dep)
            </button>
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.btn-cut-dub').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const artistId = e.currentTarget.getAttribute('data-artist-id');
        openOrderModal(artistId);
      });
    });

    document.querySelectorAll('.btn-preview-vocal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const artistId = e.currentTarget.getAttribute('data-artist-id');
        const artist = state.artists.find(a => a.id === artistId);
        if (artist) {
          engine.initContext();
          engine.triggerDubSiren(1.2);
          showToast(`Auditioning ${artist.name}: "${artist.sampleVocal}"`, 'info');
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(artist.sampleVocal);
            utterance.pitch = 0.95;
            utterance.rate = 1.0;
            window.speechSynthesis.speak(utterance);
          }
        }
      });
    });
  }

  function openOrderModal(artistId) {
    const artist = state.artists.find(a => a.id === artistId);
    if (!artist) return;
    state.selectedArtist = artist;

    document.getElementById('modal-artist-name').textContent = artist.name;
    document.getElementById('modal-artist-flag').textContent = artist.flag;
    document.getElementById('modal-artist-studio').textContent = `${artist.studioName} (${artist.city})`;

    // Pre-populate with user profile defaults if empty
    if (state.userProfile) {
      const orderPreviewName = document.getElementById('order-profile-preview-name');
      if (orderPreviewName && state.userProfile.soundName) {
        orderPreviewName.textContent = state.userProfile.soundName;
      }
      const soundInput = document.getElementById('order-sound-name');
      if (soundInput && !soundInput.value) {
        applyProfileToOrderForm();
      }
    }

    const catalogSelect = document.getElementById('order-catalog-song');
    catalogSelect.innerHTML = artist.catalog.map(song => `
      <option value="${song.title}" data-bpm="${song.bpm}" data-riddim="${song.riddim}">
        ${song.title} (${song.year}) — ${song.riddim} [${song.bpm} BPM]
      </option>
    `).join('') + `<option value="Custom / Freestyle Song Request" data-bpm="85">Custom / Freestyle Lyrics Request</option>`;

    const riddimSelect = document.getElementById('order-custom-riddim-select');
    riddimSelect.innerHTML = state.riddims.map(r => `
      <option value="${r.id}" data-bpm="${r.bpm}">
        ${r.name} (${r.year}) — ${r.genre} [${r.bpm} BPM - Producer: ${r.producer}]
      </option>
    `).join('');

    updateOrderModalCalculations();
    orderModal.classList.add('active');
  }

  // --- USER PROFILE & SOUND IDENTITY CONTROLLER ---

  function updateUserProfileUI() {
    if (!state.userProfile) return;
    const p = state.userProfile;

    const navLabel = document.getElementById('nav-user-label');
    if (navLabel) {
      const displayName = p.fullName ? p.fullName.split(' ')[0] : 'Selector';
      const soundAbbr = p.soundName ? p.soundName.split(' ')[0] : 'Sound';
      navLabel.textContent = `👤 ${displayName} (${soundAbbr})`;
    }

    const orderPreviewName = document.getElementById('order-profile-preview-name');
    if (orderPreviewName && p.soundName) {
      orderPreviewName.textContent = p.soundName;
    }

    const avatarInitials = document.getElementById('profile-modal-avatar-initials');
    if (avatarInitials && p.fullName) {
      const parts = p.fullName.trim().split(' ');
      avatarInitials.textContent = parts.length > 1
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : p.fullName.slice(0, 2).toUpperCase();
    }
  }

  function openProfileModal() {
    if (!state.userProfile) {
      state.userProfile = { ...(window.DEFAULT_PROFILE || {}) };
    }
    const p = state.userProfile;

    // Contact Details
    document.getElementById('profile-full-name').value = p.fullName || '';
    document.getElementById('profile-email').value = p.email || '';
    document.getElementById('profile-phone').value = p.phone || '';
    document.getElementById('profile-location').value = p.location || ((p.city && p.country) ? `${p.city}, ${p.country}` : '');

    // 5 Sound System Specifics (Editable)
    document.getElementById('profile-sound-name').value = p.soundName || '';
    document.getElementById('profile-crew-members').value = p.crewMembers || '';
    document.getElementById('profile-areas').value = p.areasToMention || '';
    document.getElementById('profile-tagline').value = p.tagLine || '';
    document.getElementById('profile-suggestions').value = p.suggestions || '';

    updateLiveSlatePreview();
    profileModal.classList.add('active');
  }

  function updateLiveSlatePreview() {
    const soundName = document.getElementById('profile-sound-name')?.value || 'Your Sound System';
    const crew = document.getElementById('profile-crew-members')?.value || 'Selector & Crew';
    const areas = document.getElementById('profile-areas')?.value || 'Global';
    const tagline = document.getElementById('profile-tagline')?.value || '';
    const suggestions = document.getElementById('profile-suggestions')?.value || '';

    const previewEl = document.getElementById('profile-live-slate-preview');
    if (previewEl) {
      previewEl.innerHTML = `
        "Big up <strong class="gold">${escapeHtml(soundName)}</strong>! Representing <strong>${escapeHtml(areas)}</strong>! Shouting out <strong>${escapeHtml(crew)}</strong>! <em>${escapeHtml(tagline)}</em>"<br>
        ${suggestions ? `<span style="font-size: 0.72rem; color: #94a3b8; display: block; margin-top: 0.25rem;">[Studio Note: ${escapeHtml(suggestions)}]</span>` : ''}
      `;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  async function handleSaveProfile(e) {
    e.preventDefault();

    const fullName = document.getElementById('profile-full-name').value.trim();
    const email = document.getElementById('profile-email').value.trim();
    const phone = document.getElementById('profile-phone').value.trim();
    const locationVal = document.getElementById('profile-location').value.trim();
    const soundName = document.getElementById('profile-sound-name').value.trim();
    const crewMembers = document.getElementById('profile-crew-members').value.trim();
    const areasToMention = document.getElementById('profile-areas').value.trim();
    const tagLine = document.getElementById('profile-tagline').value.trim();
    const suggestions = document.getElementById('profile-suggestions').value.trim();

    if (!fullName || !email || !soundName) {
      showToast('Please provide your name, email, and sound system name!', 'error');
      return;
    }

    const payload = {
      fullName,
      email,
      phone,
      location: locationVal,
      soundName,
      crewMembers,
      areasToMention,
      tagLine,
      suggestions
    };

    const submitBtn = document.getElementById('btn-save-profile');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner"></span> Saving Sound System Credentials...`;

    try {
      const res = await window.GDP_API.saveProfile(payload);
      if (res.success && res.data) {
        state.userProfile = res.data;
        updateUserProfileUI();
        profileModal.classList.remove('active');
        showToast('✅ Sound System Profile & Voicing Identity Saved Successfully!', 'success');
      } else {
        showToast(res.message || 'Error saving profile', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to save profile', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="icon-save"></i> Save Sound System Profile & Identity`;
    }
  }

  function applyProfileToOrderForm() {
    if (!state.userProfile) return;
    const p = state.userProfile;

    if (p.soundName) document.getElementById('order-sound-name').value = p.soundName;
    if (p.fullName) document.getElementById('order-selector-name').value = p.fullName;
    if (p.location || (p.city && p.country)) {
      document.getElementById('order-sound-location').value = p.location || `${p.city}, ${p.country}`;
    }

    let clashDirection = `Big up ${p.soundName || 'Champion Sound'}!`;
    if (p.areasToMention) clashDirection += ` Representing ${p.areasToMention}!`;
    if (p.crewMembers) clashDirection += ` Shout out the crew: ${p.crewMembers}.`;
    if (p.tagLine) clashDirection += ` "${p.tagLine}!"`;
    if (p.suggestions) clashDirection += ` [Special Instructions: ${p.suggestions}]`;

    document.getElementById('order-custom-lyrics').value = clashDirection;
    showToast(`⚡ Profile details & crew specs applied to order!`, 'success');
  }

  function updateOrderModalCalculations() {
    if (!state.selectedArtist) return;
    const artist = state.selectedArtist;

    const recordingType = document.querySelector('input[name="recording-type"]:checked')?.value || 'dubplate';
    const useCustomRiddim = document.getElementById('order-toggle-custom-riddim')?.checked;
    const isTempoClick = document.getElementById('order-toggle-tempo-click')?.checked;
    const hasVideoCapture = document.getElementById('order-toggle-video-capture')?.checked;

    const baseFee = artist.pricing[recordingType] || artist.pricing.dubplate;
    const videoFee = hasVideoCapture ? (artist.pricing.videoCapture || 120) : 0;
    const customRiddimFee = useCustomRiddim ? 50 : 0;
    const totalFee = baseFee + videoFee + customRiddimFee;
    const deposit25 = Math.round(totalFee * 0.25);
    const balance75 = totalFee - deposit25;

    document.getElementById('calc-base-fee').textContent = `$${baseFee}`;
    document.getElementById('calc-video-fee').textContent = videoFee ? `+$${videoFee}` : '$0';
    document.getElementById('calc-riddim-fee').textContent = customRiddimFee ? `+$${customRiddimFee}` : '$0';
    document.getElementById('calc-total-fee').textContent = `$${totalFee}`;
    document.getElementById('calc-deposit-due').textContent = `$${deposit25}`;
    document.getElementById('calc-balance-due').textContent = `$${balance75}`;

    const riddimContainer = document.getElementById('custom-riddim-picker-container');
    if (riddimContainer) {
      riddimContainer.style.display = useCustomRiddim ? 'block' : 'none';
    }

    const tempoContainer = document.getElementById('tempo-click-container');
    if (tempoContainer) {
      tempoContainer.style.display = isTempoClick ? 'block' : 'none';
    }
  }

  async function submitDubOrder(e) {
    e.preventDefault();
    if (!state.selectedArtist) return;

    const soundSystem = document.getElementById('order-sound-name').value.trim();
    const selector = document.getElementById('order-selector-name').value.trim();
    const location = document.getElementById('order-sound-location').value.trim();
    const recordingType = document.querySelector('input[name="recording-type"]:checked').value;
    const catalogSong = document.getElementById('order-catalog-song').value;
    const useCustomRiddim = document.getElementById('order-toggle-custom-riddim').checked;
    const riddimId = useCustomRiddim ? document.getElementById('order-custom-riddim-select').value : null;
    const isTempoClickAcapella = document.getElementById('order-toggle-tempo-click').checked;
    const tempoBpm = parseInt(document.getElementById('order-tempo-bpm').value, 10) || 85;
    const deliveryFormat = document.querySelector('input[name="delivery-format"]:checked').value;
    const hasVideoCapture = document.getElementById('order-toggle-video-capture').checked;
    const customLyrics = document.getElementById('order-custom-lyrics').value.trim();

    if (!soundSystem || !selector) {
      showToast('Please provide your Sound System & Selector name!', 'error');
      return;
    }

    const payload = {
      soundSystem,
      selector,
      location,
      artistId: state.selectedArtist.id,
      recordingType,
      catalogSong,
      useCustomRiddim,
      riddimId,
      isTempoClickAcapella,
      tempoBpm,
      deliveryFormat,
      hasVideoCapture,
      customLyrics
    };

    const submitBtn = document.getElementById('btn-submit-order');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner"></span> Securing 25% Deposit & Studio Mic...`;

    try {
      const res = await window.GDP_API.createOrder(payload);
      if (res.success && res.order) {
        state.orders.unshift(res.order);
        renderOrders();
        orderModal.classList.remove('active');

        engine.initContext();
        engine.triggerDubSiren(2.0);

        showToast(`🎉 25% Deposit ($${res.order.pricing.depositPaid}) Locked! Dubplate cut requested for ${soundSystem}!`, 'success');

        switchTab('vault');
        loadOrderIntoPlayer(res.order);
      } else {
        showToast(res.message || 'Error creating dub order', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while processing deposit', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="icon-lock"></i> Pay 25% Deposit & Lock Studio Session`;
    }
  }

  function renderOrders() {
    if (!ordersList) return;

    if (state.orders.length === 0) {
      ordersList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎛️</div>
          <h3>Your Dubplate Vault is Empty</h3>
          <p>Request your first sound clash dubplate, jingle, or tempo click acapella from our live global artists!</p>
          <button class="btn btn-gold btn-sm" onclick="document.querySelector('[data-tab=roster]').click()">Browse Live Artists</button>
        </div>
      `;
      return;
    }

    ordersList.innerHTML = state.orders.map(order => {
      const isFullPaid = order.pricing.percentPaid === 100 || order.status === 'completed';
      const isPreviewReady = order.status === 'preview_ready';

      let statusBadge = '';
      if (isFullPaid) {
        statusBadge = `<span class="badge badge-success"><i class="icon-check"></i> 100% Master Released</span>`;
      } else if (isPreviewReady) {
        statusBadge = `<span class="badge badge-warning"><i class="icon-lock"></i> 25% Audio Preview Gate Active</span>`;
      } else {
        statusBadge = `<span class="badge badge-info"><i class="icon-mic"></i> In Studio Recording</span>`;
      }

      return `
        <div class="vault-order-card ${state.activeOrder?.id === order.id ? 'active-playing' : ''}" data-order-id="${order.id}">
          <div class="order-card-top">
            <div class="order-id-badge">
              <strong>${order.id}</strong> • ${new Date(order.createdAt).toLocaleDateString()}
            </div>
            ${statusBadge}
          </div>

          <div class="order-main-info">
            <div class="order-track-title">
              <h4>${order.audioTitle || `${order.artistName} - ${order.catalogSong} Special`}</h4>
              <p class="order-meta">
                Cut for: <strong>${order.soundSystem}</strong> (${order.selector}) • ${order.location}
              </p>
            </div>
            <div class="order-specs">
              <span class="spec-pill"><i class="icon-disc"></i> ${order.recordingType.toUpperCase()}</span>
              <span class="spec-pill"><i class="icon-sound"></i> ${order.deliveryFormat.replace('_', ' ').toUpperCase()}</span>
              ${order.isTempoClickAcapella ? '<span class="spec-pill highlight">TEMPO CLICK ACAPELLA</span>' : ''}
              ${order.useCustomRiddim ? `<span class="spec-pill">${order.riddimName}</span>` : ''}
              ${order.hasVideoCapture ? '<span class="spec-pill video">📹 4K VIDEO INCLUDED</span>' : ''}
            </div>
          </div>

          <div class="order-financials">
            <div class="fin-item">
              <span class="fin-label">Total Fee</span>
              <span class="fin-val">$${order.pricing.totalFee}</span>
            </div>
            <div class="fin-item">
              <span class="fin-label">25% Deposit Paid</span>
              <span class="fin-val gold">$${order.pricing.depositPaid}</span>
            </div>
            <div class="fin-item">
              <span class="fin-label">Balance Remaining (75%)</span>
              <span class="fin-val ${isFullPaid ? 'green' : 'red'}">$${order.pricing.balanceDue}</span>
            </div>
            <div class="fin-item">
              <span class="fin-label">Access State</span>
              <span class="fin-val ${isFullPaid ? 'green' : 'yellow'}">
                ${isFullPaid ? '100% Full Master' : '25% Preview Gate'}
              </span>
            </div>
          </div>

          <div class="order-lyrics-preview">
            <em>"${order.customLyrics}"</em>
          </div>

          <div class="order-card-actions">
            <button class="btn btn-outline btn-sm btn-play-order" data-order-id="${order.id}">
              <i class="icon-play"></i> ${isFullPaid ? 'Play Full Master Cut' : 'Play 25% Preview Cut'}
            </button>

            ${!isFullPaid ? `
              <button class="btn btn-gold btn-sm btn-pay-balance" data-order-id="${order.id}">
                <i class="icon-lock-open"></i> Pay Remaining 75% ($${order.pricing.balanceDue}) to Unlock Master
              </button>
            ` : `
              <div class="download-dropdown-wrap">
                <button class="btn btn-green btn-sm btn-download-master" data-order-id="${order.id}">
                  <i class="icon-download"></i> Download Master WAV
                </button>
                <button class="btn btn-outline btn-sm btn-download-split" data-order-id="${order.id}" title="Left: Vocal / Right: Riddim">
                  <i class="icon-split"></i> Split Track
                </button>
                <button class="btn btn-outline btn-sm btn-download-stems" data-order-id="${order.id}" title="Vocals, Riddim, Dub FX, Click">
                  <i class="icon-layers"></i> Stems Pack
                </button>
                ${order.hasVideoCapture ? `
                  <button class="btn btn-outline btn-sm btn-watch-video" data-order-id="${order.id}">
                    <i class="icon-video"></i> 4K Video Proof
                  </button>
                ` : ''}
              </div>
            `}
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.btn-play-order').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.currentTarget.getAttribute('data-order-id');
        const order = state.orders.find(o => o.id === orderId);
        if (order) {
          loadOrderIntoPlayer(order);
          engine.play();
        }
      });
    });

    document.querySelectorAll('.btn-pay-balance').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.currentTarget.getAttribute('data-order-id');
        openPaymentModal(orderId);
      });
    });

    document.querySelectorAll('.btn-download-master').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.currentTarget.getAttribute('data-order-id');
        downloadOrderAudio(orderId, 'master');
      });
    });

    document.querySelectorAll('.btn-download-split').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.currentTarget.getAttribute('data-order-id');
        downloadOrderAudio(orderId, 'split');
      });
    });

    document.querySelectorAll('.btn-download-stems').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.currentTarget.getAttribute('data-order-id');
        downloadOrderAudio(orderId, 'stems');
      });
    });

    document.querySelectorAll('.btn-watch-video').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.currentTarget.getAttribute('data-order-id');
        openVideoModal(orderId);
      });
    });
  }

  function loadOrderIntoPlayer(order) {
    state.activeOrder = order;
    engine.loadOrder(order);

    if (playerTrackTitle) playerTrackTitle.textContent = order.audioTitle || `${order.artistName} - ${order.catalogSong}`;
    if (playerSubtitle) {
      playerSubtitle.textContent = `Cut for ${order.soundSystem} • ${order.recordingType.toUpperCase()} • ${order.riddimName}`;
    }

    const isFullUnlocked = order.pricing.percentPaid === 100 || order.status === 'completed';
    updatePlayerGateUI(isFullUnlocked, order);
    renderOrders();
  }

  function updatePlayerGateUI(isFullUnlocked, order) {
    if (!playerGateBadge) return;

    if (isFullUnlocked) {
      playerGateBadge.className = 'player-gate-badge unlocked';
      playerGateBadge.innerHTML = `<i class="icon-unlocked"></i> 100% Master Cut Unlocked (Full Length & Stems)`;
      if (playerUnlockBtn) playerUnlockBtn.style.display = 'none';
    } else {
      playerGateBadge.className = 'player-gate-badge locked';
      playerGateBadge.innerHTML = `<i class="icon-lock"></i> 25% Audio Preview Gate Active (Playback Limited to ${Math.round(order.previewDuration || 30)}s)`;
      if (playerUnlockBtn) {
        playerUnlockBtn.style.display = 'inline-flex';
        playerUnlockBtn.textContent = `Unlock Master (Pay $${order.pricing.balanceDue})`;
      }
    }
  }

  engine.onTimeUpdate = (currentTime, totalDuration, currentLimit) => {
    if (playerTimeCurrent) playerTimeCurrent.textContent = formatTime(currentTime);
    if (playerTimeTotal) playerTimeTotal.textContent = formatTime(totalDuration);

    if (playerProgressBar) {
      const percent = (currentTime / totalDuration) * 100;
      playerProgressBar.style.width = `${percent}%`;
    }

    if (playPauseBtn) {
      playPauseBtn.innerHTML = engine.isPlaying ? '<i class="icon-pause"></i>' : '<i class="icon-play"></i>';
    }
  };

  engine.onPreviewLocked = (order) => {
    if (playPauseBtn) playPauseBtn.innerHTML = '<i class="icon-play"></i>';
    showToast(`🛑 25% Audio Preview Gate Reached! Pay remaining $${order?.pricing?.balanceDue || 0} to unlock 100% Master audio.`, 'warning');
    if (order) openPaymentModal(order.id);
  };

  engine.onEnded = () => {
    if (playPauseBtn) playPauseBtn.innerHTML = '<i class="icon-play"></i>';
  };

  function openPaymentModal(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    document.getElementById('pay-order-id').textContent = order.id;
    document.getElementById('pay-sound-name').textContent = order.soundSystem;
    document.getElementById('pay-artist-name').textContent = order.artistName;
    document.getElementById('pay-song-title').textContent = order.catalogSong;
    document.getElementById('pay-balance-due').textContent = `$${order.pricing.balanceDue}`;
    document.getElementById('pay-deposit-paid').textContent = `$${order.pricing.depositPaid}`;
    document.getElementById('pay-total-fee').textContent = `$${order.pricing.totalFee}`;

    paymentModal.setAttribute('data-target-order', order.id);
    paymentModal.classList.add('active');
  }

  async function confirmPayBalance() {
    const orderId = paymentModal.getAttribute('data-target-order');
    if (!orderId) return;

    const btn = document.getElementById('btn-confirm-payment');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Releasing 100% Master Escrow...`;

    try {
      const res = await window.GDP_API.payBalance(orderId);
      if (res.success && res.order) {
        const index = state.orders.findIndex(o => o.id === orderId);
        if (index !== -1) {
          state.orders[index] = res.order;
        }

        if (state.activeOrder?.id === orderId) {
          engine.unlockFull();
          updatePlayerGateUI(true, res.order);
        }

        renderOrders();
        paymentModal.classList.remove('active');

        engine.initContext();
        engine.triggerAirhorn();
        setTimeout(() => engine.triggerDubSiren(2.5), 600);

        showToast(`🏆 100% Full Payment Received! Master WAV, Split-Track, Multitrack Stems & Video Unlocked!`, 'success');
      } else {
        showToast(res.message || 'Payment processing error', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error processing payment', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="icon-lock-open"></i> Authorize & Release Master Dubplate`;
    }
  }

  function downloadOrderAudio(orderId, type) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    const isFullPaid = order.pricing.percentPaid === 100 || order.status === 'completed';
    const duration = isFullPaid ? (order.audioDuration || 120) : (order.previewDuration || 30);
    const soundClean = order.soundSystem.replace(/[^a-zA-Z0-9]/g, '_');
    const artistClean = order.artistName.replace(/[^a-zA-Z0-9]/g, '_');

    if (type === 'master') {
      const blob = engine.generateWavFile({ duration, isSplitTrack: false });
      engine.downloadDubFile(`${artistClean}_${soundClean}_Master_Dubplate.wav`, blob);
      showToast(`Master WAV Downloaded! High-fidelity dubplate ready for your sound system.`, 'success');
    } else if (type === 'split') {
      const blob = engine.generateWavFile({ duration, isSplitTrack: true });
      engine.downloadDubFile(`${artistClean}_${soundClean}_Split_Track_L-Vocal_R-Riddim.wav`, blob);
      showToast(`Split Track WAV Downloaded (Left Channel: Vocals, Right Channel: Riddim)!`, 'success');
    } else if (type === 'stems') {
      const vocalBlob = engine.generateWavFile({ duration, isSplitTrack: false });
      engine.downloadDubFile(`${artistClean}_${soundClean}_Stem_LeadVocals.wav`, vocalBlob);
      showToast(`Stems generated: Lead Vocals, Riddim, Dub FX, Click Track downloaded.`, 'success');
    }
  }

  function openVideoModal(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    document.getElementById('video-modal-title').textContent = `${order.artistName} - In-Studio Video Capture`;
    document.getElementById('video-modal-sound').textContent = `Official Studio Voicing Proof for ${order.soundSystem}`;
    videoModal.classList.add('active');
  }

  function renderArtistStudioView() {
    const studioContainer = document.getElementById('artist-studio-content');
    if (!studioContainer) return;

    const pendingOrders = state.orders.filter(o => o.status !== 'completed');
    const completedOrders = state.orders.filter(o => o.status === 'completed');

    studioContainer.innerHTML = `
      <div class="studio-dashboard">
        <div class="studio-header-card">
          <div class="studio-artist-profile">
            <div class="studio-avatar">🎙️</div>
            <div>
              <h3>Artist / Engineer Live Recording Desk</h3>
              <p>Manage incoming requests from sound systems in Japan, UK, USA, Germany, Jamaica, Africa & beyond.</p>
            </div>
          </div>
          <div class="studio-status-toggle">
            <span class="live-indicator">LIVE ON AIR</span>
            <button class="btn btn-gold btn-sm" id="btn-open-register-artist">
              <i class="icon-user-plus"></i> Join Roster as New Artist
            </button>
          </div>
        </div>

        <div class="studio-queues">
          <div class="queue-col">
            <h4>🔴 Incoming Studio Dubplate Queue (${pendingOrders.length})</h4>
            ${pendingOrders.length === 0 ? '<p class="text-muted">No pending dub cuts in queue right now.</p>' : ''}
            ${pendingOrders.map(o => `
              <div class="studio-order-card">
                <div class="studio-order-top">
                  <strong>${o.id}</strong> • Cut: <span class="gold">${o.recordingType.toUpperCase()}</span>
                  <span class="deposit-tag">25% Locked ($${o.pricing.depositPaid})</span>
                </div>
                <h5>Sound: ${o.soundSystem} (${o.selector})</h5>
                <p>Location: ${o.location}</p>
                <p>Song: <strong>${o.catalogSong}</strong> | Riddim: <strong>${o.riddimName}</strong></p>
                <div class="studio-lyrics-box">
                  <strong>Custom Sound Lyrics:</strong>
                  <p>"${o.customLyrics}"</p>
                </div>
                <div class="studio-actions">
                  <button class="btn btn-gold btn-sm btn-studio-voice" data-order-id="${o.id}">
                    <i class="icon-mic"></i> Voice Dub & Upload Cut (25% Preview)
                  </button>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="queue-col">
            <h4>🟢 Completed & Full Paid Dubs (${completedOrders.length})</h4>
            ${completedOrders.map(o => `
              <div class="studio-order-card completed">
                <div class="studio-order-top">
                  <strong>${o.id}</strong> • 100% Paid ($${o.pricing.totalFee})
                  <span class="badge badge-success">Released</span>
                </div>
                <h5>${o.soundSystem}</h5>
                <p>${o.audioTitle}</p>
                <p class="text-green"><i class="icon-check"></i> 75% Balance Released from Escrow</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    document.querySelectorAll('.btn-studio-voice').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const orderId = e.currentTarget.getAttribute('data-order-id');
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner"></span> Voicing cut on studio mic...`;

        try {
          const res = await window.GDP_API.uploadCut(orderId);
          if (res.success) {
            engine.initContext();
            engine.triggerAirhorn();
            showToast(`🎤 Dubplate cut voiced & uploaded! Sound system notified for 25% preview!`, 'success');
            await loadInitialData();
            renderArtistStudioView();
            renderOrders();
          }
        } catch (err) {
          console.error(err);
        }
      });
    });

    document.getElementById('btn-open-register-artist')?.addEventListener('click', () => {
      registerModal.classList.add('active');
    });
  }

  async function submitArtistRegistration(e) {
    e.preventDefault();
    const name = document.getElementById('reg-artist-name').value.trim();
    const country = document.getElementById('reg-artist-country').value;
    const city = document.getElementById('reg-artist-city').value.trim();
    const dubplateFee = document.getElementById('reg-fee-dubplate').value;
    const jingleFee = document.getElementById('reg-fee-jingle').value;
    const dropInFee = document.getElementById('reg-fee-dropin').value;
    const shoutOutFee = document.getElementById('reg-fee-shoutout').value;
    const videoFee = document.getElementById('reg-fee-video').value;
    const catalogSongs = document.getElementById('reg-catalog-songs').value.trim();
    const studioName = document.getElementById('reg-studio-name').value.trim();

    if (!name || !country || !dubplateFee) {
      showToast('Please fill all required artist registration fields!', 'error');
      return;
    }

    try {
      const res = await window.GDP_API.registerArtist({
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
      });

      if (res.success && res.artist) {
        state.artists.unshift(res.artist);
        renderArtists();
        renderLiveTicker();
        registerModal.classList.remove('active');
        showToast(`Welcome ${name}! Your artist profile is now live on Global Dub Plate!`, 'success');
        switchTab('roster');
      } else {
        showToast(res.message || 'Error registering artist', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Registration failed', 'error');
    }
  }

  function setupWaveformVisualizer() {
    if (!canvasWaveform) return;
    const canvasCtx = canvasWaveform.getContext('2d');

    const draw = () => {
      state.waveformAnimId = requestAnimationFrame(draw);

      const width = canvasWaveform.width;
      const height = canvasWaveform.height;

      canvasCtx.fillStyle = '#0f172a';
      canvasCtx.fillRect(0, 0, width, height);

      const lockX = width * 0.25;
      const isLocked = !engine.isFullUnlocked;

      canvasCtx.strokeStyle = isLocked ? 'rgba(239, 68, 68, 0.7)' : 'rgba(16, 185, 129, 0.4)';
      canvasCtx.lineWidth = 2;
      canvasCtx.setLineDash([4, 4]);
      canvasCtx.beginPath();
      canvasCtx.moveTo(lockX, 0);
      canvasCtx.lineTo(lockX, height);
      canvasCtx.stroke();
      canvasCtx.setLineDash([]);

      canvasCtx.fillStyle = isLocked ? '#ef4444' : '#10b981';
      canvasCtx.font = '10px monospace';
      canvasCtx.fillText(isLocked ? '25% PREVIEW GATE 🔒' : '25% CHECKPOINT', lockX + 5, 14);

      if (!engine.analyser || !engine.isPlaying) {
        canvasCtx.strokeStyle = '#334155';
        canvasCtx.lineWidth = 1.5;
        canvasCtx.beginPath();
        canvasCtx.moveTo(0, height / 2);
        canvasCtx.lineTo(width, height / 2);
        canvasCtx.stroke();
        return;
      }

      const bufferLength = engine.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      engine.analyser.getByteTimeDomainData(dataArray);

      canvasCtx.lineWidth = 2.5;
      canvasCtx.strokeStyle = '#f59e0b';
      canvasCtx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      canvasCtx.lineTo(width, height / 2);
      canvasCtx.stroke();
    };

    draw();
  }

  function checkAutoSelectFirstOrder() {
    if (state.orders.length > 0) {
      loadOrderIntoPlayer(state.orders[0]);
    }
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-pane-${tabId}`);
    });

    if (tabId === 'artist-studio') {
      renderArtistStudioView();
    }
  }

  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  }

  function setupEventListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        switchTab(tab);
      });
    });

    if (countryFilters) {
      countryFilters.addEventListener('click', (e) => {
        const filterBtn = e.target.closest('.filter-btn');
        if (!filterBtn) return;
        document.querySelectorAll('#country-filters .filter-btn').forEach(b => b.classList.remove('active'));
        filterBtn.classList.add('active');
        state.selectedCountry = filterBtn.getAttribute('data-country');
        renderArtists();
      });
    }

    if (sessionStatusFilter) {
      sessionStatusFilter.addEventListener('change', (e) => {
        state.selectedStatusFilter = e.target.value;
        renderArtists();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderArtists();
      });
    }

    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        if (!state.activeOrder) {
          if (state.orders.length > 0) loadOrderIntoPlayer(state.orders[0]);
          else return;
        }

        if (engine.isPlaying) {
          engine.pause();
        } else {
          engine.play();
        }
      });
    }

    if (playerProgressContainer) {
      playerProgressContainer.addEventListener('click', (e) => {
        const rect = playerProgressContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const targetPercent = clickX / width;
        const targetSeconds = targetPercent * engine.totalDuration;
        engine.seek(targetSeconds);
      });
    }

    if (playerUnlockBtn) {
      playerUnlockBtn.addEventListener('click', () => {
        if (state.activeOrder) {
          openPaymentModal(state.activeOrder.id);
        }
      });
    }

    document.getElementById('btn-fx-siren')?.addEventListener('click', () => {
      engine.initContext();
      engine.triggerDubSiren(2.5);
      showToast('🚨 Dub Siren Sounded!', 'info');
    });

    document.getElementById('btn-fx-airhorn')?.addEventListener('click', () => {
      engine.initContext();
      engine.triggerAirhorn();
      showToast('🎺 Sound System Airhorn Blasted!', 'info');
    });

    document.getElementById('btn-fx-laser')?.addEventListener('click', () => {
      engine.initContext();
      engine.triggerLaser();
      showToast('⚡ Sound Clash Laser Fired!', 'info');
    });

    document.getElementById('btn-fx-tapestop')?.addEventListener('click', () => {
      engine.initContext();
      engine.triggerTapeStop();
      showToast('⏹️ Turntable Tape Stopped!', 'info');
    });

    document.getElementById('btn-split-both')?.addEventListener('click', (e) => {
      engine.setSplitMode('both');
      updateSplitBtnActive(e.currentTarget);
      showToast('🔊 Stereo Balance Active (Vocal & Riddim)', 'info');
    });

    document.getElementById('btn-split-left')?.addEventListener('click', (e) => {
      engine.setSplitMode('left_vocal');
      updateSplitBtnActive(e.currentTarget);
      showToast('🎤 Left Channel Isolated (Dry Dubplate Vocals Only)', 'info');
    });

    document.getElementById('btn-split-right')?.addEventListener('click', (e) => {
      engine.setSplitMode('right_riddim');
      updateSplitBtnActive(e.currentTarget);
      showToast('🎸 Right Channel Isolated (Riddim & Bass Only)', 'info');
    });

    function updateSplitBtnActive(targetBtn) {
      document.querySelectorAll('.split-track-btn').forEach(b => b.classList.remove('active'));
      targetBtn.classList.add('active');
    }

    document.getElementById('btn-toggle-stems')?.addEventListener('click', () => {
      stemsDrawer.classList.toggle('active');
    });

    document.getElementById('btn-close-stems')?.addEventListener('click', () => {
      stemsDrawer.classList.remove('active');
    });

    ['vocal', 'riddim', 'dubFx', 'click'].forEach(stemKey => {
      const slider = document.getElementById(`stem-slider-${stemKey}`);
      if (slider) {
        slider.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value) / 100;
          engine.setStemVolume(stemKey, val);
        });
      }

      const muteBtn = document.getElementById(`stem-mute-${stemKey}`);
      if (muteBtn) {
        muteBtn.addEventListener('click', () => {
          const isMuted = engine.toggleStemMute(stemKey);
          muteBtn.classList.toggle('active', isMuted);
        });
      }

      const soloBtn = document.getElementById(`stem-solo-${stemKey}`);
      if (soloBtn) {
        soloBtn.addEventListener('click', () => {
          const isSolo = engine.toggleStemSolo(stemKey);
          soloBtn.classList.toggle('active', isSolo);
        });
      }
    });

    document.querySelectorAll('input[name="recording-type"]').forEach(radio => {
      radio.addEventListener('change', updateOrderModalCalculations);
    });

    document.getElementById('order-toggle-custom-riddim')?.addEventListener('change', updateOrderModalCalculations);
    document.getElementById('order-toggle-tempo-click')?.addEventListener('change', updateOrderModalCalculations);
    document.getElementById('order-toggle-video-capture')?.addEventListener('change', updateOrderModalCalculations);

    document.getElementById('btn-insert-clash-lyrics')?.addEventListener('click', () => {
      const sound = document.getElementById('order-sound-name').value || 'Champion Sound';
      const lyrics = `Kill sound boy dead! When ${sound} drops this cut, no other sound can stand! Play the sound, selector!`;
      document.getElementById('order-custom-lyrics').value = lyrics;
    });

    document.getElementById('btn-insert-radio-lyrics')?.addEventListener('click', () => {
      const sound = document.getElementById('order-sound-name').value || 'Power FM';
      const lyrics = `You are tuned in live and direct with ${sound}! Strictly reggae and dancehall pressure 24/7!`;
      document.getElementById('order-custom-lyrics').value = lyrics;
    });

    document.getElementById('order-form')?.addEventListener('submit', submitDubOrder);

    document.querySelectorAll('.modal-close, .btn-modal-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
      });
    });

    document.getElementById('btn-confirm-payment')?.addEventListener('click', confirmPayBalance);
    document.getElementById('register-artist-form')?.addEventListener('submit', submitArtistRegistration);
    document.getElementById('btn-nav-register')?.addEventListener('click', () => {
      registerModal.classList.add('active');
    });

    // Profile Modal Listeners
    document.getElementById('btn-nav-profile')?.addEventListener('click', openProfileModal);
    document.getElementById('btn-autofill-profile')?.addEventListener('click', applyProfileToOrderForm);
    document.getElementById('user-profile-form')?.addEventListener('submit', handleSaveProfile);

    // Live preview reactive updates on typing in profile fields
    ['profile-sound-name', 'profile-crew-members', 'profile-areas', 'profile-tagline', 'profile-suggestions'].forEach(fieldId => {
      document.getElementById(fieldId)?.addEventListener('input', updateLiveSlatePreview);
    });
  }

  init();
});
