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
    activeSoundTab: 'roster',
    activeArtistTab: 'artist-booth',
    selectedCountry: 'ALL',
    selectedStatusFilter: 'ALL',
    searchQuery: '',
    selectedArtist: null,
    activeOrder: null,
    userRole: 'sound_system',
    activeArtistId: 'capleton',
    activeBoothOrderId: null,
    activeQueueFilter: 'ALL',
    selectedPayoutRail: 'wire_transfer',
    isMetronomeActive: false,
    metronomeInterval: null,
    metronomeStep: 1,
    vuMeterInterval: null,
    waveformAnimId: null,
    currentProfileMode: 'dubplate',
    notifications: [],
    activeProfileTab: 'request'
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
    updatePlayerButtonUI();
  }

  async function loadInitialData() {
    try {
      const [artists, riddims, orders, stats, profile, notifications] = await Promise.all([
        window.GDP_API.getArtists(),
        window.GDP_API.getRiddims(),
        window.GDP_API.getOrders(),
        window.GDP_API.getStats(),
        window.GDP_API.getProfile(),
        window.GDP_API.getNotifications()
      ]);
      state.artists = artists;
      state.riddims = riddims;
      state.orders = orders;
      state.stats = stats;
      state.userProfile = profile;
      state.notifications = notifications || [];
      renderLiveTicker();
      updateStatsDisplay();
      updateUserProfileUI();
      populateForwardArtistSelect();
      updateNotificationBadges();
      renderProfileInbox();
      updateArtistHeaderStats();
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

  // --- DYNAMIC 4-WAY VOICING SPEC CONFIGURATION (DUB PLATE, JINGLE, DROP-IN, SHOUT OUT) ---
  const PROFILE_MODES = {
    dubplate: {
      key: 'dubplate',
      title: 'Dub Plate',
      badgeText: '🎵 Dub Plate Voicing Specs (Clash Special)',
      badgeClass: 'badge-warning',
      soundLabel: '1. Sound Name / Sound System Title *',
      soundPlaceholder: 'e.g. Jahvisions International Sound / Bass Odyssey / Killamanjaro',
      soundDesc: 'The exact sound system name the artist will immortalize and call out in the clash cut.',
      crewLabel: '2. Sound Crew Members (Selectors, MCs, Sound Operators)',
      crewPlaceholder: 'e.g. Selector Adrian, MC Fireseed, DJ Benjamin, Terence Dub Operator',
      crewDesc: 'Names of selectors, MCs, or sound engineers you want mentioned in dubplate intros and counteractions.',
      areasLabel: '3. Sound Territory / Localities to Rep in the Clash',
      areasPlaceholder: 'e.g. Johannesburg, Kensington, Harare, Kingston, Brixton, Brooklyn, Tokyo',
      areasDesc: 'Cities, neighborhoods, towns, or territories to represent in the lyrics (crucial for local clash dominance).',
      taglineLabel: '4. Sound War Cry / Official Clash Slogan',
      taglinePlaceholder: 'e.g. The Undisputed Dubplate Champions • Pure Reggae & Dancehall Pressure',
      taglineDesc: 'Your sound system\'s signature catchphrase, motto, or audio trademark.',
      suggestionsLabel: '5. Suggestions & Extra Directions (For Dub Plate Special)',
      suggestionsPlaceholder: 'Special directions for the clash cut: call out rival sounds, dub delay on the drop, custom murder lyrics...',
      suggestionsDesc: 'Special directions sent directly to the artist\'s studio booth screen before voicing the clash plate.',
      fieldProp: 'suggestionsDubplate',
      defaultSuggestion: 'Kill any rival sound system! State that Jahvisions rules the arena from Johannesburg to Kingston. Add heavy dub delay on the chorus hook.',
      presets: [
        { label: '+ Clash Murder', text: 'State clearly that Jahvisions Sound kills all rival sound systems in the arena tonight! Add gunshot fx cue.' },
        { label: '+ Counteraction', text: 'Call out the rival selectors by name and tell the crowd to put up their lighters. Heavy dub delay on the drop.' },
        { label: '+ Heavy Dub Delay', text: 'Deliver verse 1 raw, then bring heavy space echo dub delay reverb on the chorus drop.' }
      ],
      previewSlate: (p) => {
        const sound = p.soundName || 'Jahvisions International Sound';
        const crew = p.crewMembers || 'Selector Adrian & MC Fireseed';
        const areas = p.areasToMention || 'Johannesburg, Kensington, Kingston';
        const tagline = p.tagLine || 'The Undisputed Dubplate Champions';
        const note = p.suggestionsDubplate || p.suggestions || '';
        return `<strong>[DUBPLATE CLASH CUT]</strong>: "Hold on deh! Dis is a special dubplate cut for <strong class="gold">${escapeHtml(sound)}</strong>! Shouting out di champion selectors <strong>${escapeHtml(crew)}</strong>! Straight out of <strong>${escapeHtml(areas)}</strong>, no rival sound can survive! <em>'${escapeHtml(tagline)}'</em>"<br>${note ? `<span style="font-size: 0.72rem; color: #f59e0b; display: block; margin-top: 0.25rem;">[Studio Clash Note: ${escapeHtml(note)}]</span>` : ''}`;
      }
    },
    jingle: {
      key: 'jingle',
      title: 'Jingle',
      badgeText: '📻 Radio Station ID & Mixtape Sweeper Specs',
      badgeClass: 'badge-info',
      soundLabel: '1. Radio Station / Show / Mixtape Name *',
      soundPlaceholder: 'e.g. Jahvisions Radio FM / Power 104.5 / Jamrock Mixtape Sessions',
      soundDesc: 'The exact station, podcast, show, or mixtape title for the broadcast jingle.',
      crewLabel: '2. Show Hosts, Resident DJs & Announcers',
      crewPlaceholder: 'e.g. Host Adrian, DJ Fireseed, DJ Benjamin, Terence in the Control Room',
      crewDesc: 'Names of radio show hosts, guest selectors, and producers to credit in the sweeper.',
      areasLabel: '3. Broadcast Coverage & Dial Frequencies',
      areasPlaceholder: 'e.g. Worldwide Stream, 104.5 FM, Johannesburg, London, New York',
      areasDesc: 'Broadcast dial frequency, online stream URL, or coverage listening regions.',
      taglineLabel: '4. Station Slogan / Sweeper Tag',
      taglinePlaceholder: 'e.g. Number One for Reggae & Dancehall Pressure 24/7 • Non-Stop High Energy',
      taglineDesc: 'The signature station ID motto or promotional sweeper slogan.',
      suggestionsLabel: '5. Suggestions & Extra Directions (For Radio Jingle & Sweeper)',
      suggestionsPlaceholder: 'Special directions for radio sweeper: countdown to the hour, siren sweep, frequency call letters...',
      suggestionsDesc: 'Instructions for broadcast energy, musical transition cue, and station call letters.',
      fieldProp: 'suggestionsJingle',
      defaultSuggestion: 'High energy radio / mixtape station ID! Start with siren sweep, shout out "You are locked in live with Jahvisions International Sound, strictly reggae pressure!"',
      presets: [
        { label: '+ Top of Hour ID', text: 'You are tuned in live to the top of the hour with Jahvisions Radio! The official voice of reggae culture.' },
        { label: '+ Mixtape Opener', text: 'Fire it up! Volume up high for the official 2026 Jahvisions Mixtape, mixed by Selector Adrian & DJ Benjamin!' },
        { label: '+ Clean Sweeper', text: 'Pure reggae music, strictly positive vibes and conscious dancehall 24/7 across the globe on Jahvisions FM.' }
      ],
      previewSlate: (p) => {
        const sound = p.soundName || 'Jahvisions Radio FM';
        const crew = p.crewMembers || 'Host Adrian & DJ Benjamin';
        const areas = p.areasToMention || '104.5 FM Worldwide Stream';
        const tagline = p.tagLine || 'Number One for Reggae & Dancehall Pressure 24/7';
        const note = p.suggestionsJingle || '';
        return `<strong>[RADIO / MIXTAPE JINGLE]</strong>: "You are tuned in live and direct to <strong class="gold">${escapeHtml(sound)}</strong>! Broadcasting across <strong>${escapeHtml(areas)}</strong> with <strong>${escapeHtml(crew)}</strong>! <em>'${escapeHtml(tagline)}'</em>"<br>${note ? `<span style="font-size: 0.72rem; color: #38bdf8; display: block; margin-top: 0.25rem;">[Radio Sweeper Note: ${escapeHtml(note)}]</span>` : ''}`;
      }
    },
    dropIn: {
      key: 'dropIn',
      title: 'Drop In',
      badgeText: '🔊 Voice Signature & DJ Drop-In Specs',
      badgeClass: 'badge-success',
      soundLabel: '1. DJ Name / Brand Tag (Voice Signature) *',
      soundPlaceholder: 'e.g. Selector Adrian / DJ Fireseed / Jahvisions Sound Tag',
      soundDesc: 'The primary artist or DJ signature to be voiced as a punchy sound bite.',
      crewLabel: '2. Secondary MC or Crew Co-Star',
      crewPlaceholder: 'e.g. MC Fireseed, DJ Benjamin, Terence Dub Operator',
      crewDesc: 'Optional second selector or engineer name for double-voice drops.',
      areasLabel: '3. City / Home Base Tag',
      areasPlaceholder: 'e.g. Johannesburg City, Kensington, Harare, Kingston',
      areasDesc: 'Quick locality name check (e.g. "Direct from Joburg!").',
      taglineLabel: '4. Punchy Catchphrase / Audio Stamp',
      taglinePlaceholder: 'e.g. Nobody does it better! • Lock off the dance!',
      taglineDesc: 'Short 3-5 word audio trademark for quick transition drops between songs.',
      suggestionsLabel: '5. Suggestions & Extra Directions (For Voice Drop-In)',
      suggestionsPlaceholder: 'e.g. Fast, punchy 5-10 second delivery. Gunshot rewind sound cue, aggressive Jamaican patois...',
      suggestionsDesc: 'Tone, delivery pace, and attitude instructions for high-impact drops.',
      fieldProp: 'suggestionsDropIn',
      defaultSuggestion: 'Punchy 5-10 second voice tag: "Hold tight! You\'re rocking with the undisputed champions, Jahvisions Sound!"',
      presets: [
        { label: '+ Gunshot Rewind', text: 'Bada-bang! When Jahvisions Sound drops the needle, every other selector run! Selector Adrian pull up!' },
        { label: '+ Fast Hype Stamp', text: 'Hold tight! You\'re locked in with the undisputed audio powerhouse, Jahvisions International!' },
        { label: '+ Wheel & Come Again', text: 'Hold on, stop di music! Jahseed says wheel that and come again for Jahvisions Sound!' }
      ],
      previewSlate: (p) => {
        const sound = p.soundName || 'Jahvisions Sound';
        const crew = p.crewMembers || 'Selector Adrian';
        const areas = p.areasToMention || 'Johannesburg to Kingston';
        const tagline = p.tagLine || 'Nobody does it better!';
        const note = p.suggestionsDropIn || '';
        return `<strong>[VOICE SIGNATURE DROP-IN]</strong>: "Bada-bang! When <strong class="gold">${escapeHtml(sound)}</strong> touches down in <strong>${escapeHtml(areas)}</strong>, all other sounds bow! Rewind <strong>${escapeHtml(crew)}</strong>! <em>'${escapeHtml(tagline)}'</em>"<br>${note ? `<span style="font-size: 0.72rem; color: #4ade80; display: block; margin-top: 0.25rem;">[Drop-In Cue: ${escapeHtml(note)}]</span>` : ''}`;
      }
    },
    shoutOut: {
      key: 'shoutOut',
      title: 'Shout Out',
      badgeText: '🎤 Raw Acapella / Tempo Click Specs',
      badgeClass: 'badge-purple',
      soundLabel: '1. Organization / Sound / Movement Name *',
      soundPlaceholder: 'e.g. Jahvisions International Sound & Massive / Dubplate Family',
      soundDesc: 'The group, sound system, festival, or movement receiving the salute.',
      crewLabel: '2. People, VIPs & Massive to Big Up',
      crewPlaceholder: 'e.g. Selector Adrian, MC Fireseed, Terence, Benjamin & All Sound Supporters',
      crewDesc: 'Individual names to personally salute and show respect to in the acapella.',
      areasLabel: '3. Cities, Countries & Global Diaspora to Greet',
      areasPlaceholder: 'e.g. South Africa, Zimbabwe, Jamaica, UK, Japan, Ghana, Worldwide',
      areasDesc: 'All regions and communities to send greetings and brotherhood/sisterhood vibes to.',
      taglineLabel: '4. Message of Respect, Unity or Motivation',
      taglinePlaceholder: 'e.g. One Love, Unity in Reggae Music • Maximum Respect to the Movement',
      taglineDesc: 'Core inspiring message, anniversary blessing, or solidarity statement.',
      suggestionsLabel: '5. Suggestions & Extra Directions (For Acapella Shout Out)',
      suggestionsPlaceholder: 'e.g. Dry vocal delivery, no instruments, record with metronome tempo click cue at 96 BPM...',
      suggestionsDesc: 'Specify recording bpm for tempo-click sync or ask for dry, completely unmastered vocals.',
      fieldProp: 'suggestionsShoutOut',
      defaultSuggestion: 'Dry tempo click acapella on beat. Shout out Selector Adrian, MC Fireseed, Terence, and Benjamin, and big up the worldwide sound system massive!',
      presets: [
        { label: '+ 96 BPM Click Cue', text: 'Voiced dry on the beat at 96 BPM. Give a 4-beat click count-in so our producer can drop it on any clash riddim.' },
        { label: '+ Anniversary Salute', text: 'Big up and celebrate Jahvisions Sound on another championship year! Blessings to Adrian and the whole sound family.' },
        { label: '+ Raw Patois Acapella', text: 'Raw, powerful dancehall delivery straight into the mic with no effects so we can mix our own dub delays.' }
      ],
      previewSlate: (p) => {
        const sound = p.soundName || 'Jahvisions Movement';
        const crew = p.crewMembers || 'Adrian, Fireseed, Benjamin & Terence';
        const areas = p.areasToMention || 'South Africa, Kingston, Worldwide';
        const tagline = p.tagLine || 'One Love & Maximum Respect';
        const note = p.suggestionsShoutOut || '';
        return `<strong>[RAW ACAPELLA / TEMPO CLICK]</strong>: "Salute and maximum respect to <strong class="gold">${escapeHtml(sound)}</strong>! Bigging up <strong>${escapeHtml(crew)}</strong> straight across <strong>${escapeHtml(areas)}</strong>! <em>'${escapeHtml(tagline)}'</em>"<br>${note ? `<span style="font-size: 0.72rem; color: #c084fc; display: block; margin-top: 0.25rem;">[Acapella Studio Spec: ${escapeHtml(note)}]</span>` : ''}`;
      }
    }
  };

  function openProfileModal(targetTab = 'request') {
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

    // Switch to active mode (or default 'dubplate')
    const activeMode = p.activeMode || 'dubplate';
    switchProfileMode(activeMode, false);

    // Populate the forward artist selection dropdown & pricing
    populateForwardArtistSelect();

    // Switch to desired tab (request, inbox, or account)
    switchProfileTab(targetTab);

    profileModal.classList.add('active');
  }

  function switchProfileTab(tabName) {
    state.activeProfileTab = tabName;
    document.querySelectorAll('.profile-tab-btn').forEach(btn => {
      if (btn.getAttribute('data-profile-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const panelRequest = document.getElementById('tab-panel-request');
    const panelInbox = document.getElementById('tab-panel-inbox');
    const panelAccount = document.getElementById('tab-panel-account');

    if (panelRequest) panelRequest.style.display = tabName === 'request' ? 'block' : 'none';
    if (panelInbox) panelInbox.style.display = tabName === 'inbox' ? 'block' : 'none';
    if (panelAccount) panelAccount.style.display = tabName === 'account' ? 'block' : 'none';

    if (tabName === 'inbox') {
      renderProfileInbox();
    }
  }

  function populateForwardArtistSelect() {
    const select = document.getElementById('profile-forward-artist');
    if (!select || !state.artists.length) return;
    const currentVal = select.value || 'capleton';
    select.innerHTML = state.artists.map(a => `
      <option value="${a.id}" ${a.id === currentVal ? 'selected' : ''}>
        ${a.flag} ${a.name} — ${a.city} (${a.studioStatus === 'in_studio' ? '🔴 Live in Studio' : '⚡ Online'})
      </option>
    `).join('');
    updateForwardArtistPricing();
  }

  function updateForwardArtistPricing() {
    const select = document.getElementById('profile-forward-artist');
    if (!select) return;
    const artistId = select.value || 'capleton';
    const artist = state.artists.find(a => a.id === artistId) || state.artists[0];
    if (!artist) return;

    const activeMode = state.currentProfileMode || 'dubplate';
    const cfg = PROFILE_MODES[activeMode] || PROFILE_MODES.dubplate;
    const baseFee = artist.pricing[activeMode] || 700;
    const depositFee = Math.round(baseFee * 0.25);
    const balanceFee = baseFee - depositFee;

    const cutBadge = document.getElementById('forward-cut-badge');
    if (cutBadge) cutBadge.textContent = cfg.badgeText;

    const totalEl = document.getElementById('forward-total-fee');
    if (totalEl) totalEl.textContent = `$${baseFee}.00`;

    const depositEl = document.getElementById('forward-deposit-fee');
    if (depositEl) depositEl.textContent = `$${depositFee}.00`;

    const balanceEl = document.getElementById('forward-balance-fee');
    if (balanceEl) balanceEl.textContent = `$${balanceFee}.00`;

    const btnText = document.getElementById('forward-btn-text');
    if (btnText) {
      const shortName = artist.name.split(' ')[0];
      btnText.textContent = `Send to ${shortName} & Pay 25% Deposit ($${depositFee})`;
    }
  }

  function renderProfileInbox() {
    const listEl = document.getElementById('profile-inbox-list');
    if (!listEl) return;

    const notifs = state.notifications || [];
    updateNotificationBadges();

    if (!notifs.length) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); font-size: 0.85rem;">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📭</div>
          <p style="font-weight: 600; color: #cbd5e1;">Your Profile Inbox is Clear!</p>
          <span style="font-size: 0.74rem;">When you forward dubplate, jingle, or drop-in requests to studio artists, your 25% escrow receipts and booth updates will appear here live.</span>
        </div>
      `;
      return;
    }

    listEl.innerHTML = notifs.map(n => {
      const isUnread = n.unread;
      const timeStr = formatRelativeTime(n.timestamp);
      return `
        <div class="inbox-card ${isUnread ? 'unread' : ''}" data-notif-id="${n.id}">
          <div class="inbox-card-header">
            <div class="inbox-card-title">
              <span>${n.icon || '🔔'}</span>
              <span>${escapeHtml(n.title)}</span>
              ${isUnread ? '<span class="badge badge-warning" style="font-size: 0.6rem; padding: 0.1rem 0.35rem;">NEW</span>' : ''}
            </div>
            <span class="inbox-card-time">${timeStr}</span>
          </div>

          <div class="inbox-card-body">
            ${escapeHtml(n.message)}
          </div>

          <div class="inbox-card-footer">
            <div>
              <span style="color: var(--gold-primary); font-weight: 700;">${n.artistFlag || '🇯🇲'} ${escapeHtml(n.artistName || 'Studio')}</span>
              ${n.depositAmount ? `<span style="margin-left: 0.5rem; color: #94a3b8;">• 25% Deposit: <strong style="color: #fff;">$${n.depositAmount}</strong></span>` : ''}
              ${n.balanceAmount ? `<span style="margin-left: 0.35rem; color: #f59e0b;">• 75% Due: <strong>$${n.balanceAmount}</strong></span>` : ''}
            </div>
            <div style="display: flex; gap: 0.4rem; align-items: center;">
              ${n.orderId ? `
                <button type="button" class="btn btn-gold btn-xs btn-inbox-view-order" data-order-id="${n.orderId}" style="font-size: 0.68rem; padding: 0.2rem 0.5rem;">
                  ${n.type === 'preview_ready' ? '▶ Play 25% Preview' : 'View Order'}
                </button>
              ` : ''}
              ${isUnread ? `
                <button type="button" class="btn btn-outline btn-xs btn-inbox-mark-read" data-notif-id="${n.id}" style="font-size: 0.68rem; padding: 0.2rem 0.45rem;">
                  ✓ Mark Read
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Wire clicks on inbox items
    listEl.querySelectorAll('.btn-inbox-view-order').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const orderId = btn.getAttribute('data-order-id');
        const order = state.orders.find(o => o.id === orderId);
        if (order) {
          profileModal.classList.remove('active');
          switchTab('vault');
          loadOrderIntoPlayer(order);
          engine.play();
        }
      });
    });

    listEl.querySelectorAll('.btn-inbox-mark-read').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const notifId = btn.getAttribute('data-notif-id');
        await window.GDP_API.markNotificationRead(notifId);
        const item = state.notifications.find(n => n.id === notifId);
        if (item) item.unread = false;
        updateNotificationBadges();
        renderProfileInbox();
      });
    });
  }

  function updateNotificationBadges() {
    const unreadCount = (state.notifications || []).filter(n => n.unread).length;

    const navBadge = document.getElementById('nav-inbox-count');
    if (navBadge) {
      navBadge.textContent = unreadCount;
      navBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }

    const tabBadge = document.getElementById('profile-inbox-tab-badge');
    if (tabBadge) {
      tabBadge.textContent = unreadCount;
      tabBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }

    const profileDot = document.getElementById('nav-profile-dot');
    if (profileDot) {
      profileDot.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }
  }

  function formatRelativeTime(iso) {
    if (!iso) return 'Just now';
    try {
      const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
      if (diff < 60) return 'Just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    } catch (e) {
      return 'Recent';
    }
  }

  async function handleMarkAllNotificationsRead() {
    await window.GDP_API.markAllNotificationsRead();
    (state.notifications || []).forEach(n => { n.unread = false; });
    updateNotificationBadges();
    renderProfileInbox();
    showToast('All notifications marked as read', 'info');
  }

  async function handleForwardRequestToArtist() {
    const soundNameInput = document.getElementById('profile-sound-name');
    const soundName = soundNameInput?.value.trim();
    const fullName = document.getElementById('profile-full-name')?.value.trim();
    const email = document.getElementById('profile-email')?.value.trim();
    const phone = document.getElementById('profile-phone')?.value.trim();
    const locationVal = document.getElementById('profile-location')?.value.trim();
    const crewMembers = document.getElementById('profile-crew-members')?.value.trim();
    const areasToMention = document.getElementById('profile-areas')?.value.trim();
    const tagLine = document.getElementById('profile-tagline')?.value.trim();
    const suggestions = document.getElementById('profile-suggestions')?.value.trim();

    if (!soundName) {
      showToast('⚠️ Please enter your Sound Name / Radio Name before forwarding!', 'error');
      if (soundNameInput) {
        soundNameInput.focus();
        soundNameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const activeMode = state.currentProfileMode || 'dubplate';
    const cfg = PROFILE_MODES[activeMode] || PROFILE_MODES.dubplate;

    const artistSelect = document.getElementById('profile-forward-artist');
    const artistId = artistSelect?.value || 'capleton';
    const artist = state.artists.find(a => a.id === artistId) || state.artists[0];

    // Format the vocal booth directions directly from the user's specs
    let customLyrics = `Big up ${soundName}!`;
    if (areasToMention) customLyrics += ` Representing ${areasToMention}!`;
    if (crewMembers) customLyrics += ` Shouting out ${crewMembers}!`;
    if (tagLine) customLyrics += ` "${tagLine}"!`;
    if (suggestions) customLyrics += ` [Booth Directions: ${suggestions}]`;

    // 1. Save profile to memory & disk
    state.userProfile = {
      ...(state.userProfile || {}),
      fullName: fullName || 'Adrian Anesu Mupemhi',
      email: email || 'mupemhianesu@gmail.com',
      phone: phone || '+2772442 5958',
      location: locationVal || 'Johannesburg, South Africa',
      soundName,
      crewMembers,
      areasToMention,
      tagLine,
      activeMode,
      suggestions,
      [cfg.fieldProp]: suggestions
    };
    await window.GDP_API.saveProfile(state.userProfile);
    updateUserProfileUI();

    // 2. Button spinner
    const fwdBtn = document.getElementById('btn-forward-request-now');
    if (fwdBtn) {
      fwdBtn.disabled = true;
      fwdBtn.innerHTML = `<span class="spinner"></span> Securing 25% Deposit & Vocal Booth...`;
    }

    try {
      // 3. Create the order
      const payload = {
        soundSystem: soundName,
        selector: fullName || 'Selector Adrian',
        location: locationVal || 'Johannesburg, South Africa',
        artistId: artist.id,
        recordingType: activeMode,
        catalogSong: artist.catalog[0]?.title || 'Special Cut Anthem',
        useCustomRiddim: false,
        riddimId: 'original',
        isTempoClickAcapella: activeMode === 'shoutOut',
        tempoBpm: 85,
        deliveryFormat: 'split_track',
        hasVideoCapture: false,
        customLyrics
      };

      const res = await window.GDP_API.createOrder(payload);
      if (res.success && res.order) {
        state.orders.unshift(res.order);
        renderOrders();

        // 4. Trigger dub siren sound effect
        engine.initContext();
        engine.triggerDubSiren(1.8);

        // 5. Refresh notifications from server / memory
        const updatedNotifs = await window.GDP_API.getNotifications();
        state.notifications = updatedNotifs || [];
        updateNotificationBadges();

        // 6. Switch directly to the Profile Inbox tab inside the modal!
        switchProfileTab('inbox');

        showToast(`🎉 Request forwarded to ${artist.name}! 25% Deposit ($${res.order.pricing.depositPaid}) Secured in Escrow! Notification sent to Profile Inbox.`, 'success');
      } else {
        showToast(res.message || 'Error forwarding request to artist', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error forwarding request to studio booth', 'error');
    } finally {
      if (fwdBtn) {
        fwdBtn.disabled = false;
        updateForwardArtistPricing();
      }
    }
  }

  function switchProfileMode(modeKey, savePrevious = true) {
    if (!PROFILE_MODES[modeKey]) modeKey = 'dubplate';

    // Save current textarea content to previous mode
    const prevKey = state.currentProfileMode || 'dubplate';
    const prevCfg = PROFILE_MODES[prevKey];
    const suggestionsInput = document.getElementById('profile-suggestions');
    if (savePrevious && suggestionsInput && state.userProfile && prevCfg) {
      state.userProfile[prevCfg.fieldProp] = suggestionsInput.value;
    }

    state.currentProfileMode = modeKey;
    const cfg = PROFILE_MODES[modeKey];
    if (state.userProfile) {
      state.userProfile.activeMode = modeKey;
    }

    // Update active button state
    document.querySelectorAll('.profile-mode-toggle-btn').forEach(btn => {
      if (btn.getAttribute('data-profile-mode') === modeKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update section header badge
    const badge = document.getElementById('profile-voicing-badge');
    if (badge) {
      badge.textContent = cfg.badgeText;
      badge.className = 'badge ' + cfg.badgeClass;
    }

    // Update Field 1: Sound Name / Radio Name
    const soundLabel = document.getElementById('profile-sound-label');
    const soundInput = document.getElementById('profile-sound-name');
    const soundDesc = document.getElementById('profile-sound-desc');
    if (soundLabel) soundLabel.textContent = cfg.soundLabel;
    if (soundInput) soundInput.placeholder = cfg.soundPlaceholder;
    if (soundDesc) soundDesc.textContent = cfg.soundDesc;

    // Update Field 2: Crew Members
    const crewLabel = document.getElementById('profile-crew-label');
    const crewInput = document.getElementById('profile-crew-members');
    const crewDesc = document.getElementById('profile-crew-desc');
    if (crewLabel) crewLabel.textContent = cfg.crewLabel;
    if (crewInput) crewInput.placeholder = cfg.crewPlaceholder;
    if (crewDesc) crewDesc.textContent = cfg.crewDesc;

    // Update Field 3: Areas to Mention
    const areasLabel = document.getElementById('profile-areas-label');
    const areasInput = document.getElementById('profile-areas');
    const areasDesc = document.getElementById('profile-areas-desc');
    if (areasLabel) areasLabel.textContent = cfg.areasLabel;
    if (areasInput) areasInput.placeholder = cfg.areasPlaceholder;
    if (areasDesc) areasDesc.textContent = cfg.areasDesc;

    // Update Field 4: Tag Line
    const tagLabel = document.getElementById('profile-tagline-label');
    const tagInput = document.getElementById('profile-tagline');
    const tagDesc = document.getElementById('profile-tagline-desc');
    if (tagLabel) tagLabel.textContent = cfg.taglineLabel;
    if (tagInput) tagInput.placeholder = cfg.taglinePlaceholder;
    if (tagDesc) tagDesc.textContent = cfg.taglineDesc;

    // Update Field 5: Suggestions
    const suggLabel = document.getElementById('profile-suggestions-label');
    const suggDesc = document.getElementById('profile-suggestions-desc');
    if (suggLabel) suggLabel.textContent = cfg.suggestionsLabel;
    if (suggDesc) suggDesc.textContent = cfg.suggestionsDesc;
    if (suggestionsInput) {
      suggestionsInput.placeholder = cfg.suggestionsPlaceholder;
      const storedVal = state.userProfile
        ? (state.userProfile[cfg.fieldProp] || (modeKey === 'dubplate' ? state.userProfile.suggestions : '') || cfg.defaultSuggestion)
        : cfg.defaultSuggestion;
      suggestionsInput.value = storedVal || '';
    }

    // Render quick template pills
    renderSuggestionPresets(cfg.presets);

    // Update live slate preview
    updateLiveSlatePreview();

    // Update forward artist pricing for this cut mode
    updateForwardArtistPricing();
  }

  function renderSuggestionPresets(presets) {
    const container = document.getElementById('suggestion-presets-container');
    if (!container) return;
    container.innerHTML = '';
    (presets || []).forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-pill-btn';
      btn.textContent = item.label;
      btn.title = 'Click to use template: ' + item.text;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const textarea = document.getElementById('profile-suggestions');
        if (textarea) {
          textarea.value = item.text;
          const currentMode = state.currentProfileMode || 'dubplate';
          const cfg = PROFILE_MODES[currentMode];
          if (state.userProfile && cfg) {
            state.userProfile[cfg.fieldProp] = item.text;
          }
          updateLiveSlatePreview();
          showToast(`Applied preset: ${item.label}`, 'info');
        }
      });
      container.appendChild(btn);
    });
  }

  function updateLiveSlatePreview() {
    const currentMode = state.currentProfileMode || 'dubplate';
    const cfg = PROFILE_MODES[currentMode] || PROFILE_MODES.dubplate;

    const soundName = document.getElementById('profile-sound-name')?.value || 'Your Sound System';
    const crew = document.getElementById('profile-crew-members')?.value || 'Selector & Crew';
    const areas = document.getElementById('profile-areas')?.value || 'Global';
    const tagLine = document.getElementById('profile-tagline')?.value || '';
    const suggestions = document.getElementById('profile-suggestions')?.value || '';

    const profileData = {
      ...(state.userProfile || {}),
      soundName,
      crewMembers: crew,
      areasToMention: areas,
      tagLine,
      suggestions,
      [cfg.fieldProp]: suggestions
    };

    const previewEl = document.getElementById('profile-live-slate-preview');
    if (previewEl && cfg.previewSlate) {
      previewEl.innerHTML = cfg.previewSlate(profileData);
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

    const currentMode = state.currentProfileMode || 'dubplate';
    const cfg = PROFILE_MODES[currentMode] || PROFILE_MODES.dubplate;

    // Update in-memory profile state
    state.userProfile = {
      ...(state.userProfile || {}),
      fullName,
      email,
      phone,
      location: locationVal,
      soundName,
      crewMembers,
      areasToMention,
      tagLine,
      activeMode: currentMode,
      suggestions,
      [cfg.fieldProp]: suggestions
    };

    const payload = {
      fullName,
      email,
      phone,
      location: locationVal,
      soundName,
      crewMembers,
      areasToMention,
      tagLine,
      activeMode: currentMode,
      suggestions,
      suggestionsDubplate: state.userProfile.suggestionsDubplate || (currentMode === 'dubplate' ? suggestions : ''),
      suggestionsJingle: state.userProfile.suggestionsJingle || (currentMode === 'jingle' ? suggestions : ''),
      suggestionsDropIn: state.userProfile.suggestionsDropIn || (currentMode === 'dropIn' ? suggestions : ''),
      suggestionsShoutOut: state.userProfile.suggestionsShoutOut || (currentMode === 'shoutOut' ? suggestions : '')
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
        showToast(`✅ ${cfg.title} Voicing Profile & Sound Identity Saved!`, 'success');
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

    const recType = document.querySelector('input[name="recording-type"]:checked')?.value || 'dubplate';
    let modeSuggestion = p.suggestions;
    if (recType === 'dubplate' && p.suggestionsDubplate) modeSuggestion = p.suggestionsDubplate;
    else if (recType === 'jingle' && p.suggestionsJingle) modeSuggestion = p.suggestionsJingle;
    else if (recType === 'dropIn' && p.suggestionsDropIn) modeSuggestion = p.suggestionsDropIn;
    else if (recType === 'shoutOut' && p.suggestionsShoutOut) modeSuggestion = p.suggestionsShoutOut;

    let clashDirection = `Big up ${p.soundName || 'Champion Sound'}!`;
    if (p.areasToMention) clashDirection += ` Representing ${p.areasToMention}!`;
    if (p.crewMembers) clashDirection += ` Shout out the crew: ${p.crewMembers}.`;
    if (p.tagLine) clashDirection += ` "${p.tagLine}!"`;
    if (modeSuggestion) clashDirection += ` [Special Instructions: ${modeSuggestion}]`;

    document.getElementById('order-custom-lyrics').value = clashDirection;
    showToast(`⚡ Profile details & ${recType.toUpperCase()} specs applied to order!`, 'success');
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
    updatePlayerButtonUI();
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

  function updatePlayerButtonUI() {
    const playBtn = document.getElementById('player-play-btn');
    const mainIcon = document.getElementById('player-main-icon');
    const mainLabel = document.getElementById('player-main-label');
    const startBtn = document.getElementById('player-start-btn');
    const stopBtn = document.getElementById('player-stop-btn');

    if (engine.isPlaying) {
      // PLAYING -> Circle Button shows STOP
      if (playBtn) {
        playBtn.classList.remove('is-stopped');
        playBtn.classList.add('is-playing');
        playBtn.title = 'Click to STOP playback & reset';
      }
      if (mainIcon) mainIcon.textContent = '⏹';
      if (mainLabel) mainLabel.textContent = 'STOP';

      if (startBtn) startBtn.classList.add('active');
      if (stopBtn) stopBtn.classList.remove('active');
    } else {
      // STOPPED -> Circle Button shows START
      if (playBtn) {
        playBtn.classList.remove('is-playing');
        playBtn.classList.add('is-stopped');
        playBtn.title = 'Click to START playback';
      }
      if (mainIcon) mainIcon.textContent = '▶';
      if (mainLabel) mainLabel.textContent = 'START';

      if (startBtn) startBtn.classList.remove('active');
      if (stopBtn) stopBtn.classList.add('active');
    }
  }

  function startPlayback() {
    if (!state.activeOrder) {
      if (state.orders.length > 0) {
        loadOrderIntoPlayer(state.orders[0]);
      } else {
        showToast('Please select or create a dubplate to play', 'info');
        return;
      }
    }
    engine.initContext();
    engine.play();
    updatePlayerButtonUI();
  }

  function stopPlayback() {
    engine.stop();
    if (playerProgressBar) playerProgressBar.style.width = '0%';
    if (playerTimeCurrent) playerTimeCurrent.textContent = '0:00';
    updatePlayerButtonUI();
    showToast('⏹ Dubplate Audio Stopped & Reset to 0:00', 'info');
  }

  function toggleStartStop() {
    if (engine.isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }

  engine.onTimeUpdate = (currentTime, totalDuration, currentLimit) => {
    if (playerTimeCurrent) playerTimeCurrent.textContent = formatTime(currentTime);
    if (playerTimeTotal) playerTimeTotal.textContent = formatTime(totalDuration);

    if (playerProgressBar) {
      const percent = (currentTime / totalDuration) * 100;
      playerProgressBar.style.width = `${percent}%`;
    }

    updatePlayerButtonUI();
  };

  engine.onPreviewLocked = (order) => {
    updatePlayerButtonUI();
    showToast(`🛑 25% Audio Preview Gate Reached! Pay remaining $${order?.pricing?.balanceDue || 0} to unlock 100% Master audio.`, 'warning');
    if (order) openPaymentModal(order.id);
  };

  engine.onEnded = () => {
    updatePlayerButtonUI();
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

  // =========================================================================
  // ARTIST STUDIO PORTAL CONTROLLERS & VIEWS
  // Created by Adrian Anesu Mupemhi for Jahvisions, Benjamin Music & Terence Taona Technologies
  // =========================================================================

  function switchPortalRole(role) {
    state.userRole = role;

    const btnSelector = document.getElementById('btn-role-selector');
    const btnArtist = document.getElementById('btn-role-artist');
    const tabsSound = document.getElementById('tabs-sound-system');
    const tabsArtist = document.getElementById('tabs-artist-studio');
    const statsSound = document.getElementById('stats-sound-system');
    const statsArtist = document.getElementById('stats-artist-studio');
    const navUserLabel = document.getElementById('nav-user-label');

    if (role === 'sound_system') {
      btnSelector?.classList.add('active');
      btnArtist?.classList.remove('active');
      if (tabsSound) tabsSound.style.display = 'flex';
      if (tabsArtist) tabsArtist.style.display = 'none';
      if (statsSound) statsSound.style.display = 'flex';
      if (statsArtist) statsArtist.style.display = 'none';
      if (navUserLabel) navUserLabel.textContent = '👤 Selector Profile';

      switchTab(state.activeSoundTab || 'roster');
      renderLiveTicker();
    } else {
      btnSelector?.classList.remove('active');
      btnArtist?.classList.add('active');
      if (tabsSound) tabsSound.style.display = 'none';
      if (tabsArtist) tabsArtist.style.display = 'flex';
      if (statsSound) statsSound.style.display = 'none';
      if (statsArtist) statsArtist.style.display = 'flex';
      if (navUserLabel) navUserLabel.textContent = '🎙️ Studio Profile';

      switchTab(state.activeArtistTab || 'artist-booth');
      renderArtistStudioAll();

      if (liveTicker) {
        liveTicker.innerHTML = `<div class="ticker-content">🔴 LIVE VOCAL BOOTH ACTIVE • Kingston 🇯🇲 • Harare 🇿🇼 • Accra 🇬🇭 • Johannesburg 🇿🇦 • 25% Escrow Deposits Cleared Instantly on Voicing • High-Definition Split-Track & Stems Master Protocol</div>`;
      }
    }
  }

  function renderArtistStudioAll() {
    updateArtistHeaderStats();
    renderArtistBooth();
    renderArtistQueue();
    renderArtistEscrow();
    renderArtistRates();
  }

  function updateArtistHeaderStats() {
    const holdingEl = document.getElementById('stat-artist-holding');
    const clearedEl = document.getElementById('stat-artist-cleared');
    const pendingEl = document.getElementById('stat-artist-pending');
    const headerQueueBadge = document.getElementById('header-artist-queue-badge');
    const tabQueueBadge = document.getElementById('artist-queue-tab-badge');

    const inHolding = state.orders
      .filter(o => o.status !== 'completed')
      .reduce((sum, o) => sum + (o.pricing?.depositPaid || 0), 0);

    const cleared = state.orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + (o.pricing?.totalFee || 0), 0) + 4000;

    const pendingOrders = state.orders.filter(o => o.status === 'in_studio');

    if (holdingEl) holdingEl.textContent = `$${inHolding.toFixed(0)}`;
    if (clearedEl) clearedEl.textContent = `$${cleared.toFixed(0)}`;
    if (pendingEl) pendingEl.textContent = `${pendingOrders.length} Cuts`;
    if (headerQueueBadge) headerQueueBadge.textContent = pendingOrders.length;
    if (tabQueueBadge) tabQueueBadge.textContent = pendingOrders.length;
  }

  function getActiveArtist() {
    const artist = state.artists.find(a => a.id === state.activeArtistId);
    return artist || state.artists[0] || null;
  }

  function renderArtistBooth() {
    const artist = getActiveArtist();
    if (!artist) return;

    // Operator banner elements
    const avatarEl = document.getElementById('booth-operator-avatar');
    const flagEl = document.getElementById('booth-operator-flag');
    const nameEl = document.getElementById('booth-operator-name');
    const subtitleEl = document.getElementById('booth-operator-subtitle');
    const artistSelect = document.getElementById('booth-artist-select');

    if (avatarEl) avatarEl.textContent = artist.name.slice(0, 2).toUpperCase();
    if (flagEl) flagEl.textContent = artist.flag || '🇯🇲';
    if (nameEl) {
      nameEl.innerHTML = `<span>${artist.name}</span> <span class="badge badge-warning" id="booth-facility-badge" style="font-size: 0.68rem;">${artist.studioName || 'Studio'}</span>`;
    }
    if (subtitleEl) {
      subtitleEl.textContent = `${artist.city}, ${artist.country} • ${artist.sessionTitle || 'Direct Global Dub Voicing'}`;
    }

    // Populate artist dropdown
    if (artistSelect) {
      artistSelect.innerHTML = state.artists.map(a => `
        <option value="${a.id}" ${a.id === artist.id ? 'selected' : ''}>
          ${a.flag} ${a.name} (${a.city})
        </option>
      `).join('');
    }

    // Status pill active
    document.querySelectorAll('#booth-status-toggle .status-pill-btn').forEach(btn => {
      const status = btn.getAttribute('data-status');
      btn.classList.toggle('active', status === (artist.studioStatus || 'in_studio'));
    });

    // Populate target order dropdown
    const orderSelect = document.getElementById('booth-target-order-select');
    if (orderSelect) {
      const relevantOrders = state.orders.length > 0 ? state.orders : [];
      orderSelect.innerHTML = relevantOrders.map(o => {
        const isCurrent = o.id === state.activeBoothOrderId;
        const statusTag = o.status === 'in_studio' ? '🔴 Pending Voicing' : (o.status === 'preview_ready' ? '🟡 25% Preview' : '🟢 100% Paid');
        return `<option value="${o.id}" ${isCurrent ? 'selected' : ''}>
          ${o.id}: ${o.soundSystem} — ${o.catalogSong} (${o.recordingType.toUpperCase()}) [${statusTag}]
        </option>`;
      }).join('');

      if (!state.activeBoothOrderId && relevantOrders.length > 0) {
        state.activeBoothOrderId = relevantOrders[0].id;
      }
    }

    // Update prompter with active order
    updateTeleprompterData();
    startVuMeter();
  }

  function updateTeleprompterData() {
    let order = state.orders.find(o => o.id === state.activeBoothOrderId);
    if (!order && state.orders.length > 0) {
      order = state.orders[0];
      state.activeBoothOrderId = order.id;
    }

    const typeEl = document.getElementById('prompter-order-type');
    const idEl = document.getElementById('prompter-order-id');
    const formatEl = document.getElementById('prompter-format');
    const songEl = document.getElementById('prompter-song-title');
    const riddimEl = document.getElementById('prompter-riddim-name');
    const soundNameEl = document.getElementById('prompter-sound-name');
    const crewEl = document.getElementById('prompter-crew-members');
    const areasEl = document.getElementById('prompter-areas');
    const taglineEl = document.getElementById('prompter-tagline');
    const lyricsEl = document.getElementById('prompter-custom-lyrics');
    const bpmEl = document.getElementById('prompter-bpm');
    const slateEl = document.getElementById('booth-slate-text');
    const depositStatusEl = document.getElementById('booth-order-deposit-status');

    if (order) {
      if (typeEl) typeEl.textContent = `🎵 ${order.recordingType.toUpperCase()} SPECIAL`;
      if (idEl) idEl.textContent = order.id;
      if (formatEl) formatEl.textContent = order.deliveryFormat === 'split_track' ? 'Split Track (L: Vocal / R: Riddim)' : (order.deliveryFormat === 'stems' ? 'Multitrack Stems Pack' : 'Stereo Master WAV');
      if (songEl) songEl.textContent = order.catalogSong || 'Clash Anthem';
      if (riddimEl) riddimEl.textContent = order.riddimName || 'Classic Riddim';
      if (soundNameEl) soundNameEl.textContent = order.soundSystem || 'JAHVISIONS INTERNATIONAL SOUND';
      if (crewEl) crewEl.textContent = (order.selector ? `Selector ${order.selector}` : '') + (state.userProfile?.crewMembers ? `, ${state.userProfile.crewMembers}` : '');
      if (areasEl) areasEl.textContent = order.location || state.userProfile?.areasToMention || 'Johannesburg, Kingston, Tokyo';
      if (taglineEl) taglineEl.textContent = state.userProfile?.tagLine || '"The Undisputed Dubplate Champions • Pure Reggae & Dancehall Pressure"';
      if (lyricsEl) lyricsEl.textContent = `"${order.customLyrics || 'Special Dubplate cut live and direct!'}"`;
      if (bpmEl) bpmEl.textContent = `${order.tempoBpm || 85} BPM`;
      if (slateEl) slateEl.textContent = `"${order.soundSystem} • ${order.recordingType.toUpperCase()} Take 1"`;
      if (depositStatusEl) {
        depositStatusEl.innerHTML = `🔒 25% Deposit Held in Escrow: <strong>$${(order.pricing?.depositPaid || 250).toFixed(2)}</strong> (${order.status === 'in_studio' ? 'Ready to Voice' : 'Voiced & Ready'})`;
      }
    } else {
      // Fallback preview from profile
      const prof = state.userProfile || {};
      if (soundNameEl) soundNameEl.textContent = prof.soundName || 'JAHVISIONS INTERNATIONAL SOUND';
      if (crewEl) crewEl.textContent = prof.crewMembers || 'Selector Adrian, MC Fireseed, DJ Benjamin';
      if (areasEl) areasEl.textContent = prof.areasToMention || 'Johannesburg, Kensington, Harare, Kingston';
      if (taglineEl) taglineEl.textContent = prof.tagLine || '"The Undisputed Dubplate Champions"';
      if (lyricsEl) lyricsEl.textContent = `"${prof.suggestions || 'Kill any rival sound system! State that Jahvisions rules the arena from Johannesburg to Kingston.'}"`;
    }
  }

  function startVuMeter() {
    const container = document.getElementById('vu-meter-display');
    if (!container) return;

    if (!container.hasChildNodes()) {
      container.innerHTML = Array.from({ length: 18 }, (_, i) => {
        const color = i < 11 ? 'green' : (i < 15 ? 'yellow' : 'red');
        return `<div class="vu-bar ${color}" data-index="${i}"></div>`;
      }).join('');
    }

    if (!state.vuMeterInterval) {
      state.vuMeterInterval = setInterval(() => {
        const bars = container.querySelectorAll('.vu-bar');
        const peak = Math.floor(Math.random() * 14) + 3;
        bars.forEach((bar, idx) => {
          if (idx <= peak) {
            bar.style.height = `${Math.min(100, (idx / 18) * 100 + Math.random() * 20)}%`;
            bar.style.opacity = '1';
          } else {
            bar.style.height = '15%';
            bar.style.opacity = '0.3';
          }
        });
      }, 120);
    }
  }

  function toggleBoothMetronome() {
    state.isMetronomeActive = !state.isMetronomeActive;
    const btn = document.getElementById('btn-prompter-metronome');
    const icon = document.getElementById('metronome-btn-icon');
    const text = document.getElementById('metronome-btn-text');

    if (state.isMetronomeActive) {
      engine.initContext();
      if (icon) icon.textContent = '⏹';
      if (text) text.textContent = 'Stop Metronome Click';
      if (btn) btn.classList.add('active');

      let order = state.orders.find(o => o.id === state.activeBoothOrderId);
      const bpm = order?.tempoBpm || 85;
      const intervalMs = (60 / bpm) * 1000;

      state.metronomeStep = 1;
      flashMetronomeBeat(state.metronomeStep);
      engine.playMetronomeClick(true);

      state.metronomeInterval = setInterval(() => {
        state.metronomeStep = (state.metronomeStep % 4) + 1;
        const isAccent = state.metronomeStep === 1;
        flashMetronomeBeat(state.metronomeStep);
        engine.playMetronomeClick(isAccent);
      }, intervalMs);
    } else {
      if (state.metronomeInterval) clearInterval(state.metronomeInterval);
      state.metronomeInterval = null;
      if (icon) icon.textContent = '▶';
      if (text) text.textContent = 'Start 4-Beat Count-In Click';
      if (btn) btn.classList.remove('active');
      document.querySelectorAll('.metronome-beat-dot').forEach(d => d.classList.remove('active'));
    }
  }

  function flashMetronomeBeat(step) {
    document.querySelectorAll('.metronome-beat-dot').forEach(dot => {
      const beat = parseInt(dot.getAttribute('data-beat'), 10);
      dot.classList.toggle('active', beat === step);
    });
  }

  async function voiceActiveBoothOrder(orderId) {
    const targetId = orderId || state.activeBoothOrderId;
    if (!targetId) {
      showToast('No order selected in vocal booth!', 'warning');
      return;
    }

    const btn = document.getElementById('btn-booth-voice-now');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span> Voicing Cut & Capturing 4K Video in Booth...`;
    }

    try {
      const res = await window.GDP_API.uploadCut(targetId);
      if (res.success) {
        engine.initContext();
        engine.triggerAirhorn();
        setTimeout(() => engine.triggerDubSiren(2.0), 350);

        showToast(`🎤 Dubplate cut voiced & uploaded for ${res.order.soundSystem}! 25% preview unlocked!`, 'success');

        await loadInitialData();
        renderArtistStudioAll();
        renderOrders();

        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `✓ Cut Voiced & 25% Preview Ready! Voice Another Take`;
        }
      }
    } catch (err) {
      console.error('Error voicing cut:', err);
      showToast('Error recording cut', 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `🎙️ Record & Voice Cut (Upload 25% Preview Gate)`;
      }
    }
  }

  function renderArtistQueue() {
    const queueList = document.getElementById('artist-queue-list');
    if (!queueList) return;

    const filtered = state.orders.filter(o => {
      if (state.activeQueueFilter === 'PENDING') return o.status === 'in_studio';
      if (state.activeQueueFilter === 'PREVIEW') return o.status === 'preview_ready';
      if (state.activeQueueFilter === 'COMPLETED') return o.status === 'completed';
      return true;
    });

    const pendingCount = state.orders.filter(o => o.status === 'in_studio').length;
    const previewCount = state.orders.filter(o => o.status === 'preview_ready').length;
    const completedCount = state.orders.filter(o => o.status === 'completed').length;

    const elAll = document.getElementById('queue-count-all');
    const elPending = document.getElementById('queue-count-pending');
    const elPreview = document.getElementById('queue-count-preview');
    const elCompleted = document.getElementById('queue-count-completed');

    if (elAll) elAll.textContent = state.orders.length;
    if (elPending) elPending.textContent = pendingCount;
    if (elPreview) elPreview.textContent = previewCount;
    if (elCompleted) elCompleted.textContent = completedCount;

    if (filtered.length === 0) {
      queueList.innerHTML = `
        <div class="empty-state" style="padding: 2.5rem; background: var(--bg-card); border-radius: 8px;">
          <div class="empty-icon">📻</div>
          <h3>No Orders Found in this Filter</h3>
          <p>Switch filters above or forward a request from "My Request" to see it live in your queue.</p>
        </div>
      `;
      return;
    }

    queueList.innerHTML = filtered.map(o => {
      const isPending = o.status === 'in_studio';
      const isPreview = o.status === 'preview_ready';
      const isCompleted = o.status === 'completed';

      const statusBadge = isPending
        ? '<span class="badge badge-warning">🔴 Pending Studio Voicing</span>'
        : (isPreview ? '<span class="badge badge-info">🟡 25% Preview Ready (Awaiting 75%)</span>' : '<span class="badge badge-success">🟢 100% Master Released</span>');

      return `
        <div class="studio-order-card" style="margin-bottom: 1.25rem; border-left: 4px solid ${isPending ? 'var(--red-clash)' : (isPreview ? 'var(--gold-primary)' : 'var(--green-reggae)')};">
          <div class="studio-order-top" style="align-items: center;">
            <div>
              <strong style="color: #fff; font-size: 0.95rem;">${o.id}</strong> •
              <span class="gold" style="font-weight: 700;">${o.recordingType.toUpperCase()} SPECIAL</span> •
              <span>${o.catalogSong}</span>
            </div>
            <div>
              ${statusBadge}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; margin: 0.75rem 0;">
            <div>
              <span style="font-size: 0.72rem; color: #94a3b8; text-transform: uppercase;">Sound System & Selector:</span>
              <div style="font-weight: 700; color: #fff;">${o.soundSystem}</div>
              <div style="font-size: 0.75rem; color: #cbd5e1;">Selector: ${o.selector || 'Adrian'} (${o.location || 'Johannesburg'})</div>
            </div>

            <div>
              <span style="font-size: 0.72rem; color: #94a3b8; text-transform: uppercase;">Riddim & Format:</span>
              <div style="font-weight: 700; color: var(--gold-primary);">${o.riddimName}</div>
              <div style="font-size: 0.75rem; color: #cbd5e1;">Format: ${o.deliveryFormat} ${o.hasVideoCapture ? '• 📹 4K Video' : ''}</div>
            </div>

            <div>
              <span style="font-size: 0.72rem; color: #94a3b8; text-transform: uppercase;">Escrow Settlement:</span>
              <div style="font-weight: 700; color: #10b981;">Total: $${o.pricing?.totalFee || 0}</div>
              <div style="font-size: 0.75rem; color: #f59e0b;">
                ${isCompleted ? '✓ $0 Due • 100% Cleared' : `25% Dep: $${o.pricing?.depositPaid || 0} | Balance: $${o.pricing?.balanceDue || 0}`}
              </div>
            </div>
          </div>

          <div class="studio-lyrics-box">
            <span style="font-size: 0.7rem; color: var(--gold-primary); font-weight: 700; text-transform: uppercase;">Clash Voicing Directions:</span>
            <p style="margin: 0.25rem 0 0 0; font-style: italic; color: #f1f5f9;">"${o.customLyrics}"</p>
          </div>

          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.85rem; justify-content: flex-end;">
            <button type="button" class="btn btn-outline btn-sm btn-load-prompter" data-order-id="${o.id}">
              🎙️ Load in Teleprompter
            </button>

            ${isPending ? `
              <button type="button" class="btn btn-gold btn-sm btn-queue-voice" data-order-id="${o.id}">
                ⚡ Instant Voice & Upload 25% Preview
              </button>
            ` : ''}

            ${isPreview ? `
              <button type="button" class="btn btn-outline btn-sm btn-queue-remind" data-order-id="${o.id}">
                🔔 Ping Selector for Balance Release
              </button>
              <button type="button" class="btn btn-gold btn-sm btn-queue-audition" data-order-id="${o.id}">
                🎧 Audition 25% Preview
              </button>
            ` : ''}

            ${isCompleted ? `
              <button type="button" class="btn btn-green btn-sm btn-queue-audition" data-order-id="${o.id}">
                🏆 Audition Full Master & Stems
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Wire action buttons
    queueList.querySelectorAll('.btn-load-prompter').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.currentTarget.getAttribute('data-order-id');
        state.activeBoothOrderId = orderId;
        switchTab('artist-booth');
        updateTeleprompterData();
        showToast(`Loaded ${orderId} into Vocal Booth Teleprompter!`, 'info');
      });
    });

    queueList.querySelectorAll('.btn-queue-voice').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const orderId = e.currentTarget.getAttribute('data-order-id');
        await voiceActiveBoothOrder(orderId);
      });
    });

    queueList.querySelectorAll('.btn-queue-remind').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const orderId = e.currentTarget.getAttribute('data-order-id');
        btn.disabled = true;
        btn.textContent = 'Pinging Selector...';
        await window.GDP_API.sendOrderReminder(orderId);
        showToast('🔔 Reminder delivered to Sound System profile inbox!', 'success');
        btn.textContent = '✓ Reminder Sent';
      });
    });

    queueList.querySelectorAll('.btn-queue-audition').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.currentTarget.getAttribute('data-order-id');
        const order = state.orders.find(o => o.id === orderId);
        if (order) {
          loadOrderIntoPlayer(order);
          startPlayback();
          showToast(`Now Playing ${order.audioTitle}`, 'info');
        }
      });
    });
  }

  function renderArtistEscrow() {
    const artist = getActiveArtist();
    const inHolding = state.orders
      .filter(o => o.status !== 'completed')
      .reduce((sum, o) => sum + (o.pricing?.depositPaid || 0), 0);

    const cleared = state.orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + (o.pricing?.totalFee || 0), 0) + 4000;

    const lifetime = cleared + inHolding + 30000;
    const cutsCount = (artist?.completedCuts || 12) + state.orders.filter(o => o.status === 'completed').length;

    const holdEl = document.getElementById('escrow-holding-value');
    const clearEl = document.getElementById('escrow-cleared-value');
    const lifeEl = document.getElementById('escrow-lifetime-value');
    const cutsEl = document.getElementById('escrow-cuts-count');

    if (holdEl) holdEl.textContent = `$${inHolding.toFixed(2)}`;
    if (clearEl) clearEl.textContent = `$${cleared.toFixed(2)}`;
    if (lifeEl) lifeEl.textContent = `$${lifetime.toFixed(2)}`;
    if (cutsEl) cutsEl.textContent = `${cutsCount} Cuts`;
  }

  function renderArtistRates() {
    const artist = getActiveArtist();
    if (!artist) return;

    const dubplateInput = document.getElementById('rate-fee-dubplate');
    const jingleInput = document.getElementById('rate-fee-jingle');
    const dropInInput = document.getElementById('rate-fee-dropin');
    const shoutOutInput = document.getElementById('rate-fee-shoutout');
    const videoInput = document.getElementById('rate-fee-video');
    const studioNameInput = document.getElementById('rate-studio-name');
    const cityInput = document.getElementById('rate-city');
    const sessionTitleInput = document.getElementById('rate-session-title');
    const bioInput = document.getElementById('rate-bio');

    if (dubplateInput) dubplateInput.value = artist.pricing?.dubplate || 800;
    if (jingleInput) jingleInput.value = artist.pricing?.jingle || 400;
    if (dropInInput) dropInInput.value = artist.pricing?.dropIn || 250;
    if (shoutOutInput) shoutOutInput.value = artist.pricing?.shoutOut || 180;
    if (videoInput) videoInput.value = artist.pricing?.videoCapture || 100;
    if (studioNameInput) studioNameInput.value = artist.studioName || '';
    if (cityInput) cityInput.value = `${artist.city}, ${artist.country}`;
    if (sessionTitleInput) sessionTitleInput.value = artist.sessionTitle || 'Direct Global Dub Voicing';
    if (bioInput) bioInput.value = artist.bio || '';
  }

  // =========================================================================
  // MINI 4-TRACK DUB RECORDER & MULTITRACK MIXER CONTROLLER
  // Created by Adrian Anesu Mupemhi for Jahvisions, Benjamin Music & Terence Taona Technologies
  // =========================================================================

  let fourTrackAnimId = null;
  let activeDawTool = 'pointer'; // 'pointer' | 'scissors' | 'curves' | 'slip'
  let dawSearchQuery = '';

  function initFourTrackUI() {
    engine.initFourTrack();
    buildVUMeterLEDs();
    updateFourTrackTransportUI();

    if (!fourTrackAnimId) {
      animateFourTrackVUMeters();
    }

    setupDawAutoHideFlags();
    setupDawToolBar();
    setupDawMixerControls();
    renderDawDrawerClips(dawSearchQuery);
    initPlaylistAndEditorUI();
  }

  function buildVUMeterLEDs() {
    // 6 Channels + Master, each with left & right columns
    const columns = [
      'mix-vu-1-l', 'mix-vu-1-r',
      'mix-vu-2-l', 'mix-vu-2-r',
      'mix-vu-3-l', 'mix-vu-3-r',
      'mix-vu-4-l', 'mix-vu-4-r',
      'mix-vu-5-l', 'mix-vu-5-r',
      'mix-vu-6-l', 'mix-vu-6-r',
      'mix-vu-master-l', 'mix-vu-master-r'
    ];

    columns.forEach(colId => {
      const container = document.getElementById(colId);
      if (container && !container.hasChildNodes()) {
        // 12 segments: 1 to 7 Green, 8 to 10 Yellow, 11 to 12 Red
        container.innerHTML = Array.from({ length: 12 }, (_, i) => {
          const segNum = i + 1;
          const color = segNum <= 7 ? 'green' : (segNum <= 10 ? 'yellow' : 'red');
          return `<div class="daw-led-seg ${color}" data-seg="${segNum}"></div>`;
        }).join('');
      }
    });

    // Also support any legacy bar IDs
    ['vu-bar-trk-1', 'vu-bar-trk-2', 'vu-bar-trk-3', 'vu-bar-trk-4', 'vu-bar-master-L', 'vu-bar-master-R'].forEach(barId => {
      const container = document.getElementById(barId);
      if (container && !container.hasChildNodes()) {
        container.innerHTML = Array.from({ length: 14 }, (_, i) => {
          const segNum = i + 1;
          const color = segNum <= 8 ? 'green' : (segNum <= 12 ? 'yellow' : 'red');
          return `<div class="vu-led-segment ${color}" data-seg="${segNum}"></div>`;
        }).join('');
      }
    });
  }

  function updateVUColumn(colId, level) {
    const col = document.getElementById(colId);
    if (!col) return;
    const activeSegCount = Math.round((level || 0) * 12);
    const segs = col.querySelectorAll('.daw-led-seg');
    segs.forEach((seg, idx) => {
      seg.classList.toggle('lit', idx < activeSegCount);
    });
  }

  function animateFourTrackVUMeters() {
    fourTrackAnimId = requestAnimationFrame(animateFourTrackVUMeters);

    const levels = engine.getFourTrackVULevels();

    // Update 6 Multitrack mixer channel dual meters
    for (let i = 1; i <= 6; i++) {
      const lvl = levels[i] || 0;
      updateVUColumn(`mix-vu-${i}-l`, lvl);
      // stereo phase nuance
      const lvlR = Math.max(0, Math.min(1.0, lvl * (0.88 + Math.sin(Date.now() * 0.008 + i) * 0.12)));
      updateVUColumn(`mix-vu-${i}-r`, lvlR);
    }

    // Update Master Stereo Meter
    updateVUColumn('mix-vu-master-l', levels.masterL || 0);
    updateVUColumn('mix-vu-master-r', levels.masterR || 0);

    // Legacy meters support
    for (let i = 1; i <= 4; i++) {
      updateVUBar(`vu-bar-trk-${i}`, `vu-peak-${i}`, levels[i]);
    }
    updateVUBar('vu-bar-master-L', 'vu-peak-master', levels.masterL);
    updateVUBar('vu-bar-master-R', 'vu-peak-master', levels.masterR);

    // Update Timecode, Bar/Beat & Playhead
    if (engine.fourTrack) {
      const curTime = engine.fourTrack.currentTime || 0;
      const mins = Math.floor(curTime / 60);
      const secs = Math.floor(curTime % 60);
      const frames = Math.floor((curTime % 1) * 30);

      const tc = document.getElementById('daw-timecode-display');
      if (tc) {
        tc.textContent = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}:${frames < 10 ? '0' : ''}${frames}`;
      }

      const barBeat = document.getElementById('daw-bar-beat-display');
      if (barBeat) {
        const bpm = engine.bpm || 85;
        const beatSec = 60 / bpm;
        const totalBeats = Math.floor(curTime / beatSec);
        const bar = Math.floor(totalBeats / 4) + 1;
        const beat = (totalBeats % 4) + 1;
        barBeat.textContent = `BAR ${bar < 10 ? '0' : ''}${bar} . ${beat < 10 ? '0' : ''}${beat}`;
      }

      // Smooth playhead line progression across timeline
      const playhead = document.getElementById('daw-playhead');
      if (playhead && (engine.fourTrack.isPlaying || engine.fourTrack.isRecording)) {
        const bpm = engine.bpm || 85;
        const loopDuration = 48 * (4 * (60 / bpm));
        const pct = (curTime % loopDuration) / loopDuration * 100;
        playhead.style.left = `${pct}%`;
      }

      // Legacy counter
      const counterEl = document.getElementById('deck-counter-display');
      if (counterEl) {
        counterEl.textContent = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}:${frames < 10 ? '0' : ''}${frames}`;
      }
    }
  }

  function updateVUBar(barId, peakId, level) {
    const bar = document.getElementById(barId);
    if (!bar) return;

    const activeSegCount = Math.round((level || 0) * 14);
    const segments = bar.querySelectorAll('.vu-led-segment');

    segments.forEach((seg, idx) => {
      seg.classList.toggle('lit', idx < activeSegCount);
    });

    const peakEl = document.getElementById(peakId);
    if (peakEl) {
      peakEl.classList.toggle('flashing', (level || 0) > 0.88);
    }
  }

  function updateFourTrackTransportUI() {
    const ft = engine.fourTrack;
    if (!ft) return;

    const playBtn = document.getElementById('daw-btn-play');
    const stopBtn = document.getElementById('daw-btn-stop');
    const recBtn = document.getElementById('daw-btn-rec');

    if (ft.isPlaying) {
      playBtn?.classList.add('active');
      stopBtn?.classList.remove('active');
    } else {
      playBtn?.classList.remove('active');
      stopBtn?.classList.add('active');
    }

    if (ft.isRecording) {
      recBtn?.classList.add('active');
    } else {
      recBtn?.classList.remove('active');
    }

    // Legacy controls support
    const legacyPlay = document.getElementById('deck-btn-play');
    const legacyStop = document.getElementById('deck-btn-stop');
    const legacyRec = document.getElementById('deck-btn-rec');
    const legacyPause = document.getElementById('deck-btn-pause');
    const reelL = document.getElementById('deck-reel-left');
    const reelR = document.getElementById('deck-reel-right');

    if (ft.isPlaying) {
      legacyPlay?.classList.add('active');
      legacyStop?.classList.remove('active');
      legacyPause?.classList.remove('active');
      reelL?.classList.add('spinning');
      reelR?.classList.add('spinning');
    } else {
      legacyPlay?.classList.remove('active');
      legacyStop?.classList.add('active');
      reelL?.classList.remove('spinning', 'spinning-fast', 'spinning-reverse');
      reelR?.classList.remove('spinning', 'spinning-fast', 'spinning-reverse');
    }

    if (ft.isRecording) {
      legacyRec?.classList.add('active');
    } else {
      legacyRec?.classList.remove('active');
    }

    if (ft.isPaused) {
      legacyPause?.classList.add('active');
      reelL?.classList.remove('spinning');
      reelR?.classList.remove('spinning');
    } else {
      legacyPause?.classList.remove('active');
    }
  }

  // =========================================================================
  // AUTO-HIDE MIXER LOGIC & PIN TOGGLE
  // =========================================================================
  function setupDawAutoHideFlags() {
    const chkAuto = document.getElementById('chk-mixer-autohide');
    const btnTopToggle = document.getElementById('btn-toggle-autohide-mixer');
    const btnManualToggle = document.getElementById('btn-dock-manual-toggle');
    const mixerDock = document.getElementById('daw-mixer-dock');
    const dockStatusHint = document.getElementById('dock-status-hint');
    const caret = document.getElementById('dock-caret-symbol');
    const btnText = document.getElementById('dock-btn-text');

    if (!mixerDock) return;

    function applyAutoHide(isAuto) {
      if (isAuto) {
        mixerDock.classList.remove('pinned-mode');
        mixerDock.classList.add('autohide-mode');
        btnTopToggle?.classList.add('autohide-active');
        if (btnTopToggle) btnTopToggle.innerHTML = '🎚️ Auto-Hide Mixer <span class="badge-status">ON</span>';
        if (dockStatusHint) dockStatusHint.textContent = 'Auto-Hide Active (Hover or Click to Expand)';
        if (chkAuto) chkAuto.checked = true;
      } else {
        mixerDock.classList.remove('autohide-mode', 'expanded');
        mixerDock.classList.add('pinned-mode');
        btnTopToggle?.classList.remove('autohide-active');
        if (btnTopToggle) btnTopToggle.innerHTML = '🎚️ Auto-Hide Mixer <span class="badge-status">PINNED</span>';
        if (dockStatusHint) dockStatusHint.textContent = 'Mixer Pinned Open';
        if (caret) caret.textContent = '▼';
        if (btnText) btnText.textContent = 'Mixer Pinned';
        if (chkAuto) chkAuto.checked = false;
      }
    }

    chkAuto?.addEventListener('change', (e) => {
      applyAutoHide(e.target.checked);
      showToast(`🎚️ Mixer Console ${e.target.checked ? 'Auto-Hide ON (slides on hover)' : 'PINNED Open'}`, 'info');
    });

    btnTopToggle?.addEventListener('click', () => {
      const willBeAuto = !mixerDock.classList.contains('autohide-mode');
      applyAutoHide(willBeAuto);
      showToast(`🎚️ Mixer Console ${willBeAuto ? 'Auto-Hide ON' : 'PINNED Open'}`, 'info');
    });

    btnManualToggle?.addEventListener('click', () => {
      if (mixerDock.classList.contains('pinned-mode')) {
        applyAutoHide(true);
        return;
      }
      const isExpanded = mixerDock.classList.toggle('expanded');
      if (caret) caret.textContent = isExpanded ? '▼' : '▲';
      if (btnText) btnText.textContent = isExpanded ? 'Collapse Mixer' : 'Expand Mixer';
    });
  }

  // =========================================================================
  // DAW WORKSTATION EDITING TOOLS (POINTER, SCISSORS, CURVES, SLIP)
  // =========================================================================
  function setupDawToolBar() {
    const tools = ['pointer', 'scissors', 'curves', 'slip'];
    tools.forEach(tool => {
      const btn = document.getElementById(`daw-tool-${tool}`);
      btn?.addEventListener('click', () => {
        activeDawTool = tool;
        tools.forEach(t => document.getElementById(`daw-tool-${t}`)?.classList.toggle('active', t === tool));

        const timelineCol = document.getElementById('daw-timeline-col');
        const scissorsLine = document.getElementById('daw-scissors-line');
        if (timelineCol) {
          timelineCol.classList.toggle('tool-scissors-active', tool === 'scissors');
          timelineCol.classList.toggle('tool-curves-active', tool === 'curves');
          timelineCol.classList.toggle('tool-slip-active', tool === 'slip');
        }
        if (tool !== 'scissors' && scissorsLine) {
          scissorsLine.style.display = 'none';
        }

        const msgs = {
          pointer: '👆 Pointer Tool: Click to select, drag to reposition clips.',
          scissors: '✂️ Scissors Split Tool: Click any clip block on the timeline to slice!',
          curves: '📈 Audio Curves Tool: Shape fade-in, fade-out & audio volume curves.',
          slip: '📐 Slip / Trim Tool: Adjust left & right audio clip boundaries.'
        };
        showToast(msgs[tool], 'info');
      });
    });

    // Scissors Cursor Movement across timeline
    const timelineCol = document.getElementById('daw-timeline-col');
    const scissorsLine = document.getElementById('daw-scissors-line');
    if (timelineCol && scissorsLine) {
      timelineCol.addEventListener('mousemove', (e) => {
        if (activeDawTool !== 'scissors') return;
        const rect = timelineCol.getBoundingClientRect();
        const x = e.clientX - rect.left;
        scissorsLine.style.display = 'block';
        scissorsLine.style.left = `${x}px`;
      });

      timelineCol.addEventListener('mouseleave', () => {
        scissorsLine.style.display = 'none';
      });
    }

    // Timeline Ruler Click Seek
    const ruler = document.getElementById('daw-timeline-ruler');
    if (ruler) {
      ruler.addEventListener('click', (e) => {
        const rect = ruler.getBoundingClientRect();
        const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const playhead = document.getElementById('daw-playhead');
        if (playhead) playhead.style.left = `${frac * 100}%`;

        const bpm = engine.bpm || 85;
        const loopDuration = 48 * (4 * (60 / bpm));
        engine.fourTrack.currentTime = frac * loopDuration;

        const curTime = engine.fourTrack.currentTime;
        const mins = Math.floor(curTime / 60);
        const secs = Math.floor(curTime % 60);
        const frames = Math.floor((curTime % 1) * 30);
        const tc = document.getElementById('daw-timecode-display');
        if (tc) tc.textContent = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}:${frames < 10 ? '0' : ''}${frames}`;
      });
    }

    // Interactive Clip Slicing & Curve Handle listeners
    setupTimelineClipInteractions();
  }

  function setupTimelineClipInteractions() {
    const timelineCol = document.getElementById('daw-timeline-col');
    if (!timelineCol) return;

    timelineCol.addEventListener('click', (e) => {
      const clipEl = e.target.closest('.daw-clip-block');
      if (!clipEl) return;

      if (activeDawTool === 'scissors') {
        e.stopPropagation();
        const rect = clipEl.getBoundingClientRect();
        const clickRatio = Math.max(0.15, Math.min(0.85, (e.clientX - rect.left) / rect.width));

        const parentLane = clipEl.parentElement;
        const currentLeft = parseFloat(clipEl.style.left) || 14;
        const currentWidth = parseFloat(clipEl.style.width) || 15;

        const leftWidth = currentWidth * clickRatio;
        const rightLeft = currentLeft + leftWidth + 0.3;
        const rightWidth = currentWidth * (1 - clickRatio) - 0.3;

        clipEl.style.width = `${leftWidth.toFixed(2)}%`;
        const cloned = clipEl.cloneNode(true);
        cloned.style.left = `${rightLeft.toFixed(2)}%`;
        cloned.style.width = `${rightWidth.toFixed(2)}%`;

        const topLabel = cloned.querySelector('.clip-label');
        if (topLabel) topLabel.textContent += ' [Cut]';

        parentLane.appendChild(cloned);
        engine.triggerScissorsCut();
        showToast('✂️ Clip sliced at timeline position into two parts!', 'success');
      } else if (activeDawTool === 'curves') {
        e.stopPropagation();
        showToast('📈 Audio Curve node selected! Adjust fade and curve slope.', 'info');
      } else if (activeDawTool === 'slip') {
        e.stopPropagation();
        showToast('📐 Clip trim boundary active.', 'info');
      } else {
        document.querySelectorAll('.daw-clip-block').forEach(c => c.classList.remove('selected'));
        clipEl.classList.add('selected');
        const label = clipEl.querySelector('.clip-label')?.textContent || 'Clip';
        showToast(`Selected "${label}"`, 'info');
      }
    });

    // Curve handles
    document.querySelectorAll('.clip-curve-handle').forEach(h => {
      h.addEventListener('click', (e) => {
        e.stopPropagation();
        const isIn = h.classList.contains('curve-in');
        showToast(`📈 ${isIn ? 'Fade-In' : 'Fade-Out'} Curve shape adjusted!`, 'info');
      });
    });
  }

  // =========================================================================
  // MIXER CHANNELS (1 TO 6 + MASTER) CONTROLS
  // =========================================================================
  function setupDawMixerControls() {
    for (let i = 1; i <= 6; i++) {
      // Fader
      const fader = document.getElementById(`mix-fader-${i}`);
      if (fader) {
        fader.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          engine.setTrackVolume(i, val / 100);
        });
      }

      // Pan
      const pan = document.getElementById(`mix-pan-${i}`);
      if (pan) {
        pan.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value) / 100;
          engine.setTrackPan(i, val);
        });
      }

      // Send A (Delay)
      const sendA = document.getElementById(`mix-senda-${i}`);
      if (sendA) {
        sendA.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value) / 100;
          engine.setTrackDelaySend(i, val);
        });
      }

      // Solo Button (Mixer Strip & Track Header)
      const mixSolo = document.getElementById(`mix-btn-s-${i}`);
      const hdrSolo = document.getElementById(`btn-solo-${i}`);
      const handleSolo = () => {
        const isSolo = engine.toggleTrackSolo(i);
        mixSolo?.classList.toggle('active', isSolo);
        hdrSolo?.classList.toggle('active', isSolo);
        showToast(`Track 0${i} Solo: ${isSolo ? 'ON' : 'OFF'}`, 'info');
      };
      mixSolo?.addEventListener('click', handleSolo);
      hdrSolo?.addEventListener('click', handleSolo);

      // Mute Button (Mixer Strip & Track Header)
      const mixMute = document.getElementById(`mix-btn-m-${i}`);
      const hdrMute = document.getElementById(`btn-mute-${i}`);
      const handleMute = () => {
        const isMuted = engine.toggleTrackMute(i);
        mixMute?.classList.toggle('active', isMuted);
        hdrMute?.classList.toggle('active', isMuted);
        showToast(`Track 0${i} Mute: ${isMuted ? 'MUTED' : 'UNMUTED'}`, 'info');
      };
      mixMute?.addEventListener('click', handleMute);
      hdrMute?.addEventListener('click', handleMute);

      // Rec Arm Button (Mixer Strip & Track Header)
      const mixRec = document.getElementById(`mix-btn-r-${i}`);
      const hdrRec = document.getElementById(`btn-rec-${i}`);
      const handleRec = () => {
        const isArmed = engine.toggleTrackRecArm(i);
        mixRec?.classList.toggle('active', isArmed);
        hdrRec?.classList.toggle('active', isArmed);
        showToast(`Track 0${i} Record Arm: ${isArmed ? 'ARMED' : 'DISARMED'}`, isArmed ? 'error' : 'info');
      };
      mixRec?.addEventListener('click', handleRec);
      hdrRec?.addEventListener('click', handleRec);
    }

    // Master Fader
    const masterFader = document.getElementById('daw-master-fader');
    const masterReadout = document.getElementById('daw-master-fader-val');
    if (masterFader) {
      masterFader.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        engine.setMasterVolume(val / 100);
        const db = Math.round((val - 85) / 5 * 10) / 10;
        if (masterReadout) masterReadout.textContent = `${db > 0 ? '+' : ''}${db.toFixed(1)} dB`;
      });
    }
  }

  // =========================================================================
  // AUDIO POOL DRAWER
  // =========================================================================
  function renderDawDrawerClips(query = '') {
    const listEl = document.getElementById('daw-drawer-clips-list');
    const poolCountEl = document.getElementById('daw-pool-count');
    if (!listEl) return;

    const clips = engine.getPlaylistClips('all');
    if (poolCountEl) poolCountEl.textContent = clips.length;

    const filtered = query.trim()
      ? clips.filter(c => c.title.toLowerCase().includes(query.toLowerCase()) || c.category.toLowerCase().includes(query.toLowerCase()))
      : clips;

    listEl.innerHTML = filtered.map(c => `
      <div class="drawer-clip-card" data-clip-id="${c.id}">
        <div class="drawer-clip-head">
          <span class="clip-cat-badge ${c.category}">${c.category.toUpperCase()}</span>
          <span class="clip-dur">${c.duration.toFixed(1)}s</span>
        </div>
        <div class="drawer-clip-title"><strong>${c.title}</strong></div>
        <div class="drawer-clip-meta">${c.assignedTrack ? `👉 Loaded on Track 0${c.assignedTrack}` : 'Unassigned Pool Clip'}</div>
        <div class="drawer-clip-actions">
          <button type="button" class="btn btn-outline btn-xs btn-drawer-audition" data-audition="${c.id}">▶ Audition</button>
          <div class="btn-group-mini">
            <button type="button" class="btn-mini-trk ${c.assignedTrack === 1 ? 'loaded' : ''}" data-route="${c.id}" data-trk="1" title="Track 1 (TR-808)">T1</button>
            <button type="button" class="btn-mini-trk ${c.assignedTrack === 2 ? 'loaded' : ''}" data-route="${c.id}" data-trk="2" title="Track 2 (Juno 106 Vocal)">T2</button>
            <button type="button" class="btn-mini-trk ${c.assignedTrack === 3 ? 'loaded' : ''}" data-route="${c.id}" data-trk="3" title="Track 3 (Moog Backing)">T3</button>
            <button type="button" class="btn-mini-trk ${c.assignedTrack === 4 ? 'loaded' : ''}" data-route="${c.id}" data-trk="4" title="Track 4 (Minilogue FX)">T4</button>
            <button type="button" class="btn-mini-trk ${c.assignedTrack === 5 ? 'loaded' : ''}" data-route="${c.id}" data-trk="5" title="Track 5 (DX7 Echo)">T5</button>
            <button type="button" class="btn-mini-trk ${c.assignedTrack === 6 ? 'loaded' : ''}" data-route="${c.id}" data-trk="6" title="Track 6 (MS1 Clash)">T6</button>
          </div>
        </div>
      </div>
    `).join('');

    // Wire Audition Buttons
    listEl.querySelectorAll('.btn-drawer-audition').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const cid = b.getAttribute('data-audition');
        loadClipIntoEditor(cid);
        startClipAudition();
      });
    });

    // Wire Route Buttons
    listEl.querySelectorAll('.btn-mini-trk').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const cid = b.getAttribute('data-route');
        const trk = parseInt(b.getAttribute('data-trk'));
        engine.assignClipToTrack(cid, trk);
        const clip = engine.getClip(cid);
        showToast(`👉 "${clip?.title}" routed to Track 0${trk}!`, 'success');
        renderDawDrawerClips(dawSearchQuery);
        updateTrackAssignedBadges();
      });
    });
  }

  function exportFourTrackMasterWav() {
    engine.initFourTrack();
    const blob = engine.generateWavFile({
      duration: 60,
      isSplitTrack: false
    });
    engine.downloadDubFile('GlobalDubPlate-Master-Mixdown-24bit.wav', blob);
    engine.triggerAirhorn();
    showToast('💾 Master Mixdown WAV Exported Successfully (24-bit 44.1kHz)!', 'success');
  }

  // =========================================================================
  // 4-TRACK AUDIO PLAYLIST & MINIMAL WAVEFORM EDITING CONTROLLER
  // Audio Curves, Scissors Slicing, Slip Trimming & Direct 4-Track Routing
  // Created by Adrian Anesu Mupemhi for Jahvisions, Benjamin Music & Terence Taona Technologies
  // =========================================================================

  let activePlaylistFilter = 'all';
  let activeClipId = 'clip-sleng-teng';
  let isAuditioning = false;
  let isPlaylistInitialized = false;

  function initPlaylistAndEditorUI() {
    if (isPlaylistInitialized) {
      renderPlaylistClips(activePlaylistFilter);
      loadClipIntoEditor(activeClipId);
      updateTrackAssignedBadges();
      return;
    }
    isPlaylistInitialized = true;

    setupPlaylistEventListeners();
    renderPlaylistClips(activePlaylistFilter);
    loadClipIntoEditor(activeClipId);
    updateTrackAssignedBadges();
  }

  function renderPlaylistClips(filter = 'all') {
    const listEl = document.getElementById('playlist-scroll-list');
    const countEl = document.getElementById('playlist-item-count');
    const countAllEl = document.getElementById('count-all-clips');
    if (!listEl) return;

    const allClips = engine.getPlaylistClips('all');
    if (countAllEl) countAllEl.textContent = allClips.length;

    const filtered = engine.getPlaylistClips(filter);
    if (countEl) countEl.textContent = filtered.length;

    listEl.innerHTML = filtered.map(clip => {
      const isActive = clip.id === activeClipId;
      const assignedText = clip.assignedTrack ? `TRK ${clip.assignedTrack}` : 'Unassigned';
      const assignedClass = clip.assignedTrack ? 'assigned' : 'unassigned';

      return `
        <div class="playlist-clip-card ${isActive ? 'active' : ''}" data-clip-id="${clip.id}">
          <div class="clip-card-header">
            <span class="clip-cat-badge ${clip.category}">${clip.category}</span>
            <span class="clip-duration-tag">${clip.duration.toFixed(1)}s</span>
          </div>
          <div class="clip-title-row">
            <strong>${clip.title}</strong>
            ${clip.assignedTrack ? `<span class="clip-assigned-pill">👉 TRK ${clip.assignedTrack}</span>` : ''}
          </div>
          <div class="clip-card-actions">
            <button type="button" class="btn-card-audition" data-audition="${clip.id}">
              ▶ Audition
            </button>
            <div class="clip-route-btns" title="Quick Route to 4-Track">
              <button type="button" class="btn-mini-route ${clip.assignedTrack === 1 ? 'loaded' : ''}" data-route-clip="${clip.id}" data-target-track="1">T1</button>
              <button type="button" class="btn-mini-route ${clip.assignedTrack === 2 ? 'loaded' : ''}" data-route-clip="${clip.id}" data-target-track="2">T2</button>
              <button type="button" class="btn-mini-route ${clip.assignedTrack === 3 ? 'loaded' : ''}" data-route-clip="${clip.id}" data-target-track="3">T3</button>
              <button type="button" class="btn-mini-route ${clip.assignedTrack === 4 ? 'loaded' : ''}" data-route-clip="${clip.id}" data-target-track="4">T4</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Card Selection clicks
    listEl.querySelectorAll('.playlist-clip-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-card-audition') || e.target.closest('.btn-mini-route')) return;
        const id = card.getAttribute('data-clip-id');
        loadClipIntoEditor(id);
      });
    });

    // Card Mini Audition clicks
    listEl.querySelectorAll('.btn-card-audition').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-audition');
        loadClipIntoEditor(id);
        startClipAudition();
      });
    });

    // Card Mini Route clicks
    listEl.querySelectorAll('.btn-mini-route').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const clipId = btn.getAttribute('data-route-clip');
        const trk = parseInt(btn.getAttribute('data-target-track'));
        engine.assignClipToTrack(clipId, trk);
        const clip = engine.getClip(clipId);
        showToast(`👉 "${clip?.title}" routed to Track ${trk}!`, 'info');
        renderPlaylistClips(activePlaylistFilter);
        updateTrackAssignedBadges();
        updateRouteButtonsUI(clip);
      });
    });
  }

  function loadClipIntoEditor(clipId) {
    activeClipId = clipId;
    const clip = engine.getClip(clipId);
    if (!clip) return;

    // Update active state in playlist cards
    document.querySelectorAll('.playlist-clip-card').forEach(card => {
      card.classList.toggle('active', card.getAttribute('data-clip-id') === clipId);
    });

    // Update Editor Header
    const badgeEl = document.getElementById('editor-clip-badge');
    const titleEl = document.getElementById('editor-clip-title');
    const metaEl = document.getElementById('editor-clip-meta');

    if (badgeEl) {
      badgeEl.className = `active-clip-badge ${clip.category}`;
      badgeEl.textContent = `${clip.category.toUpperCase()}`;
    }
    if (titleEl) titleEl.textContent = clip.title;
    if (metaEl) {
      const assignedStr = clip.assignedTrack ? `• 👉 Track ${clip.assignedTrack} Assigned` : '• Unassigned';
      metaEl.textContent = `Duration: ${clip.duration.toFixed(1)}s • Region: ${clip.trimStart.toFixed(1)}s - ${clip.trimEnd.toFixed(1)}s • In: ${(clip.fadeInDur * 1000).toFixed(0)}ms (${clip.fadeInCurve}) • Out: ${(clip.fadeOutDur * 1000).toFixed(0)}ms (${clip.fadeOutCurve}) ${assignedStr}`;
    }

    // Update Sliders
    const dur = clip.duration;
    const sliderTrimStart = document.getElementById('slider-trim-start');
    const sliderTrimEnd = document.getElementById('slider-trim-end');
    const valTrimStart = document.getElementById('val-trim-start');
    const valTrimEnd = document.getElementById('val-trim-end');
    const timeTotalEl = document.getElementById('editor-time-total');

    if (sliderTrimStart) {
      sliderTrimStart.value = (clip.trimStart / dur) * 100;
    }
    if (valTrimStart) valTrimStart.textContent = `${clip.trimStart.toFixed(2)}s`;

    if (sliderTrimEnd) {
      sliderTrimEnd.value = (clip.trimEnd / dur) * 100;
    }
    if (valTrimEnd) valTrimEnd.textContent = `${clip.trimEnd.toFixed(2)}s`;

    if (timeTotalEl) timeTotalEl.textContent = `0:${clip.duration.toFixed(1).padStart(4, '0')}`;

    // Update Audio Curve Dials
    const sliderFadeIn = document.getElementById('slider-fade-in');
    const valFadeIn = document.getElementById('val-fade-in-dur');
    if (sliderFadeIn) sliderFadeIn.value = Math.round((clip.fadeInDur || 0.15) * 1000);
    if (valFadeIn) valFadeIn.textContent = `${Math.round((clip.fadeInDur || 0.15) * 1000)} ms`;

    const sliderFadeOut = document.getElementById('slider-fade-out');
    const valFadeOut = document.getElementById('val-fade-out-dur');
    if (sliderFadeOut) sliderFadeOut.value = Math.round((clip.fadeOutDur || 0.35) * 1000);
    if (valFadeOut) valFadeOut.textContent = `${Math.round((clip.fadeOutDur || 0.35) * 1000)} ms`;

    const sliderGain = document.getElementById('slider-clip-gain');
    const valGain = document.getElementById('val-clip-gain');
    const gainStatus = document.getElementById('gain-status-label');
    if (sliderGain) sliderGain.value = clip.gainDb || 0;
    if (valGain) valGain.textContent = `${(clip.gainDb || 0) > 0 ? '+' : ''}${(clip.gainDb || 0).toFixed(1)} dB`;
    if (gainStatus) {
      const g = clip.gainDb || 0;
      gainStatus.textContent = g === 0 ? 'Unity Gain (0.0 dB)' : (g > 0 ? `+${g.toFixed(1)} dB Boost` : `${g.toFixed(1)} dB Cut`);
    }

    // Update Curve Shape Buttons
    document.querySelectorAll('#fadein-shapes .shape-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-shape') === (clip.fadeInCurve || 'scurve'));
    });
    document.querySelectorAll('#fadeout-shapes .shape-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-shape') === (clip.fadeOutCurve || 'scurve'));
    });

    // Update Loop state button
    const loopBtn = document.getElementById('btn-tool-loop');
    const loopText = document.getElementById('loop-state-text');
    if (loopBtn) loopBtn.classList.toggle('active', !!clip.loop);
    if (loopText) loopText.textContent = clip.loop ? 'ON' : 'OFF';

    // Update Route Buttons
    updateRouteButtonsUI(clip);

    // Draw the interactive waveform with audio curves
    drawPlaylistWaveform(clip, 0);
  }

  function updateRouteButtonsUI(clip) {
    for (let t = 1; t <= 4; t++) {
      const btn = document.getElementById(`btn-route-trk${t}`);
      if (btn) {
        btn.classList.toggle('active', clip?.assignedTrack === t);
      }
    }
  }

  function updateTrackAssignedBadges() {
    for (let t = 1; t <= 4; t++) {
      const label = document.getElementById(`trk${t}-clip-label`);
      const assigned = engine.playlistClips?.find(c => c.assignedTrack === t);
      if (label) {
        label.textContent = assigned ? assigned.title : 'No Clip Loaded';
      }
    }
  }

  function drawPlaylistWaveform(clip, playheadFraction = 0) {
    const canvas = document.getElementById('playlist-waveform-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, width, height);

    // Center horizontal baseline
    const midY = height / 2;

    // Draw Subtle Grid Lines
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    if (!clip) return;

    // Generate deterministic peak bars for this clip
    const numBars = 160;
    const barWidth = width / numBars;
    const seed = clip.seed || 100;
    const duration = clip.duration;

    const startX = (clip.trimStart / duration) * width;
    const endX = (clip.trimEnd / duration) * width;

    // Color theme by category
    let activeBarColor = '#f59e0b'; // riddim gold
    if (clip.category === 'vocal') activeBarColor = '#ef4444'; // vocal red
    if (clip.category === 'chant') activeBarColor = '#fbbf24'; // chant amber
    if (clip.category === 'fx') activeBarColor = '#a855f7'; // fx purple

    // Draw Waveform Bars
    for (let i = 0; i < numBars; i++) {
      const x = i * barWidth;
      const t = (i / numBars) * duration;
      
      const pseudoVal = Math.sin(i * 0.28 + seed) * 0.4 + Math.sin(i * 0.73 + seed * 2) * 0.35 + Math.cos(i * 0.12) * 0.25;
      const amp = Math.max(0.08, Math.min(0.92, Math.abs(pseudoVal)));
      const barH = amp * (height * 0.42);

      const isInAudibleRegion = (t >= clip.trimStart && t <= clip.trimEnd);

      if (isInAudibleRegion) {
        ctx.fillStyle = activeBarColor;
      } else {
        ctx.fillStyle = '#1e293b'; // dimmed trimmed region
      }

      ctx.fillRect(x + 1, midY - barH, Math.max(1.5, barWidth - 1), barH * 2);
    }

    // =========================================================================
    // RENDER AUDIO CURVES (Fade In, Fade Out & Gain Level Overlay)
    // =========================================================================
    const activeWidth = endX - startX;
    if (activeWidth > 8) {
      const fadeInPx = Math.max(4, Math.min(activeWidth * 0.45, (clip.fadeInDur / duration) * width));
      const fadeOutPx = Math.max(4, Math.min(activeWidth * 0.45, (clip.fadeOutDur / duration) * width));
      const gainFactor = Math.pow(10, (clip.gainDb || 0) / 20); // 0dB = 1.0
      const peakAmpY = Math.max(12, Math.min(height * 0.45, (height * 0.22) / Math.max(0.5, Math.min(2.0, gainFactor))));

      // Draw Translucent Gain Envelope Fill
      ctx.beginPath();
      ctx.moveTo(startX, midY);

      // Fade In Curve Ramp
      const stepsIn = 30;
      for (let s = 0; s <= stepsIn; s++) {
        const frac = s / stepsIn;
        const x = startX + frac * fadeInPx;
        const gainVal = engine.getCurveGainValue(frac, clip.fadeInCurve || 'scurve');
        const y = midY - gainVal * (midY - peakAmpY);
        ctx.lineTo(x, y);
      }

      // Flat Sustain Region
      const sustainEndX = Math.max(startX + fadeInPx, endX - fadeOutPx);
      ctx.lineTo(sustainEndX, peakAmpY);

      // Fade Out Curve Ramp
      const stepsOut = 30;
      for (let s = 0; s <= stepsOut; s++) {
        const frac = s / stepsOut;
        const x = sustainEndX + frac * (endX - sustainEndX);
        const gainVal = 1.0 - engine.getCurveGainValue(frac, clip.fadeOutCurve || 'scurve');
        const y = midY - gainVal * (midY - peakAmpY);
        ctx.lineTo(x, y);
      }

      ctx.lineTo(endX, midY);
      ctx.closePath();

      // Envelope glow fill
      const envGradient = ctx.createLinearGradient(0, peakAmpY, 0, midY);
      envGradient.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
      envGradient.addColorStop(1, 'rgba(6, 182, 212, 0.02)');
      ctx.fillStyle = envGradient;
      ctx.fill();

      // Envelope Glowing Border Line
      ctx.save();
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(startX, midY);
      for (let s = 0; s <= stepsIn; s++) {
        const frac = s / stepsIn;
        const x = startX + frac * fadeInPx;
        const gainVal = engine.getCurveGainValue(frac, clip.fadeInCurve || 'scurve');
        const y = midY - gainVal * (midY - peakAmpY);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(sustainEndX, peakAmpY);
      for (let s = 0; s <= stepsOut; s++) {
        const frac = s / stepsOut;
        const x = sustainEndX + frac * (endX - sustainEndX);
        const gainVal = 1.0 - engine.getCurveGainValue(frac, clip.fadeOutCurve || 'scurve');
        const y = midY - gainVal * (midY - peakAmpY);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(endX, midY);
      ctx.stroke();
      ctx.restore();
    }

    // Update Trim Dim Overlays
    const headDim = document.getElementById('trim-head-dim');
    const tailDim = document.getElementById('trim-tail-dim');
    if (headDim) headDim.style.width = `${(clip.trimStart / duration) * 100}%`;
    if (tailDim) tailDim.style.width = `${(1 - (clip.trimEnd / duration)) * 100}%`;

    // Update Scissors Cut Line Position
    const scissorsLine = document.getElementById('waveform-scissors-line');
    const cutLabel = document.getElementById('cut-position-label');
    if (scissorsLine) {
      const cutPct = (clip.cutPosition / duration) * 100;
      scissorsLine.style.left = `${cutPct}%`;
      if (cutLabel) cutLabel.textContent = `${clip.cutPosition.toFixed(2)}s`;
    }

    // Update Playhead position
    const playhead = document.getElementById('waveform-playhead');
    const playheadTag = document.getElementById('playhead-tag');
    if (playhead) {
      const pct = Math.max(0, Math.min(100, playheadFraction * 100));
      playhead.style.left = `${pct}%`;
      if (playheadTag) {
        const currSec = (playheadFraction * duration);
        playheadTag.textContent = `0:${(currSec % 60).toFixed(1).padStart(4, '0')}`;
      }
    }
  }

  function startClipAudition() {
    const clip = engine.getClip(activeClipId);
    if (!clip) return;

    const auditionBtn = document.getElementById('btn-tool-audition');
    if (auditionBtn) auditionBtn.textContent = '⏸ Auditioning...';
    isAuditioning = true;

    engine.auditionClip(
      activeClipId,
      (currentSec, totalSec, frac) => {
        const elapsedEl = document.getElementById('editor-time-elapsed');
        if (elapsedEl) elapsedEl.textContent = `0:${currentSec.toFixed(1).padStart(4, '0')}`;
        drawPlaylistWaveform(clip, currentSec / totalSec);
      },
      () => {
        isAuditioning = false;
        if (auditionBtn) auditionBtn.textContent = '▶ Audition Clip';
        const elapsedEl = document.getElementById('editor-time-elapsed');
        if (elapsedEl) elapsedEl.textContent = '0:00.0';
        drawPlaylistWaveform(clip, 0);
      }
    );
  }

  function stopClipAudition() {
    engine.stopAudition();
    isAuditioning = false;
    const auditionBtn = document.getElementById('btn-tool-audition');
    if (auditionBtn) auditionBtn.textContent = '▶ Audition Clip';
    const elapsedEl = document.getElementById('editor-time-elapsed');
    if (elapsedEl) elapsedEl.textContent = '0:00.0';
    const clip = engine.getClip(activeClipId);
    if (clip) drawPlaylistWaveform(clip, 0);
  }

  function setupPlaylistEventListeners() {
    // Filter Pills
    document.querySelectorAll('#playlist-filter-group .filter-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        document.querySelectorAll('#playlist-filter-group .filter-pill').forEach(p => p.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activePlaylistFilter = e.currentTarget.getAttribute('data-filter');
        renderPlaylistClips(activePlaylistFilter);
      });
    });

    // Waveform Click / Scrub / Scissors placement
    const canvasWrap = document.getElementById('waveform-canvas-wrapper');
    if (canvasWrap) {
      canvasWrap.addEventListener('click', (e) => {
        const rect = canvasWrap.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const frac = Math.max(0, Math.min(1, clickX / rect.width));
        const clip = engine.getClip(activeClipId);
        if (!clip) return;

        const targetTime = frac * clip.duration;
        clip.cutPosition = Math.round(targetTime * 100) / 100;
        drawPlaylistWaveform(clip, frac);
      });
    }

    // Scissors Tool Button
    document.getElementById('btn-tool-scissors')?.addEventListener('click', () => {
      const clip = engine.getClip(activeClipId);
      if (!clip) return;

      const res = engine.splitClip(activeClipId, clip.cutPosition);
      if (res) {
        activeClipId = res.part1.id;
        renderPlaylistClips(activePlaylistFilter);
        loadClipIntoEditor(res.part1.id);
        showToast(`✂️ Audio sliced at ${res.part1.trimEnd.toFixed(2)}s into Part 1 & Part 2!`, 'success');
      } else {
        showToast('Scissors slice must be positioned inside active audio region', 'info');
      }
    });

    // Trim Selection Button
    document.getElementById('btn-tool-trim')?.addEventListener('click', () => {
      const clip = engine.getClip(activeClipId);
      if (!clip) return;
      engine.trimClip(activeClipId, clip.trimStart, clip.trimEnd);
      showToast(`📐 Selection trimmed: ${clip.trimStart.toFixed(1)}s to ${clip.trimEnd.toFixed(1)}s!`, 'info');
      renderPlaylistClips(activePlaylistFilter);
      loadClipIntoEditor(activeClipId);
    });

    // Duplicate Clip Button
    document.getElementById('btn-tool-duplicate')?.addEventListener('click', () => {
      const dup = engine.duplicateClip(activeClipId);
      if (dup) {
        renderPlaylistClips(activePlaylistFilter);
        loadClipIntoEditor(dup.id);
        showToast(`📋 Duplicated "${dup.title}"!`, 'info');
      }
    });

    // Loop Toggle Button
    document.getElementById('btn-tool-loop')?.addEventListener('click', () => {
      const clip = engine.getClip(activeClipId);
      if (!clip) return;
      clip.loop = !clip.loop;
      const loopBtn = document.getElementById('btn-tool-loop');
      const loopText = document.getElementById('loop-state-text');
      if (loopBtn) loopBtn.classList.toggle('active', !!clip.loop);
      if (loopText) loopText.textContent = clip.loop ? 'ON' : 'OFF';
      showToast(`🔁 Loop mode: ${clip.loop ? 'ON' : 'OFF'}`, 'info');
    });

    // Reset Edits Button
    document.getElementById('btn-tool-reset')?.addEventListener('click', () => {
      engine.resetClip(activeClipId);
      renderPlaylistClips(activePlaylistFilter);
      loadClipIntoEditor(activeClipId);
      showToast('🔄 Edits reset to original waveform state', 'info');
    });

    // Delete Clip Button
    document.getElementById('btn-tool-delete')?.addEventListener('click', () => {
      const clips = engine.getPlaylistClips('all');
      if (clips.length <= 1) {
        showToast('Cannot delete the last remaining audio clip in the pool', 'info');
        return;
      }
      const removed = engine.deleteClip(activeClipId);
      if (removed) {
        const remaining = engine.getPlaylistClips(activePlaylistFilter);
        activeClipId = remaining[0]?.id || engine.playlistClips[0].id;
        renderPlaylistClips(activePlaylistFilter);
        loadClipIntoEditor(activeClipId);
        updateTrackAssignedBadges();
        showToast(`🗑️ Clip "${removed.title}" removed`, 'info');
      }
    });

    // Audition Controls
    document.getElementById('btn-tool-audition')?.addEventListener('click', () => {
      if (isAuditioning) {
        stopClipAudition();
      } else {
        startClipAudition();
      }
    });
    document.getElementById('btn-tool-stop-audition')?.addEventListener('click', stopClipAudition);

    // Trim Sliders
    document.getElementById('slider-trim-start')?.addEventListener('input', (e) => {
      const clip = engine.getClip(activeClipId);
      if (!clip) return;
      const pct = parseFloat(e.target.value);
      clip.trimStart = Math.min((pct / 100) * clip.duration, clip.trimEnd - 0.2);
      document.getElementById('val-trim-start').textContent = `${clip.trimStart.toFixed(2)}s`;
      drawPlaylistWaveform(clip, 0);
    });

    document.getElementById('slider-trim-end')?.addEventListener('input', (e) => {
      const clip = engine.getClip(activeClipId);
      if (!clip) return;
      const pct = parseFloat(e.target.value);
      clip.trimEnd = Math.max((pct / 100) * clip.duration, clip.trimStart + 0.2);
      document.getElementById('val-trim-end').textContent = `${clip.trimEnd.toFixed(2)}s`;
      drawPlaylistWaveform(clip, 0);
    });

    // Audio Curves: Fade In Duration Slider
    document.getElementById('slider-fade-in')?.addEventListener('input', (e) => {
      const clip = engine.getClip(activeClipId);
      if (!clip) return;
      const ms = parseInt(e.target.value);
      clip.fadeInDur = ms / 1000;
      document.getElementById('val-fade-in-dur').textContent = `${ms} ms`;
      drawPlaylistWaveform(clip, 0);
    });

    // Audio Curves: Fade Out Duration Slider
    document.getElementById('slider-fade-out')?.addEventListener('input', (e) => {
      const clip = engine.getClip(activeClipId);
      if (!clip) return;
      const ms = parseInt(e.target.value);
      clip.fadeOutDur = ms / 1000;
      document.getElementById('val-fade-out-dur').textContent = `${ms} ms`;
      drawPlaylistWaveform(clip, 0);
    });

    // Audio Curves: Shape Buttons
    document.querySelectorAll('#fadein-shapes .shape-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#fadein-shapes .shape-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const clip = engine.getClip(activeClipId);
        if (clip) {
          clip.fadeInCurve = e.currentTarget.getAttribute('data-shape');
          drawPlaylistWaveform(clip, 0);
          showToast(`Fade In Curve shape set to ${clip.fadeInCurve.toUpperCase()}`, 'info');
        }
      });
    });

    document.querySelectorAll('#fadeout-shapes .shape-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#fadeout-shapes .shape-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const clip = engine.getClip(activeClipId);
        if (clip) {
          clip.fadeOutCurve = e.currentTarget.getAttribute('data-shape');
          drawPlaylistWaveform(clip, 0);
          showToast(`Fade Out Curve shape set to ${clip.fadeOutCurve.toUpperCase()}`, 'info');
        }
      });
    });

    // Clip Gain Trim Slider
    document.getElementById('slider-clip-gain')?.addEventListener('input', (e) => {
      const clip = engine.getClip(activeClipId);
      if (!clip) return;
      const val = parseFloat(e.target.value);
      clip.gainDb = val;
      document.getElementById('val-clip-gain').textContent = `${val > 0 ? '+' : ''}${val.toFixed(1)} dB`;
      const gainStatus = document.getElementById('gain-status-label');
      if (gainStatus) {
        gainStatus.textContent = val === 0 ? 'Unity Gain (0.0 dB)' : (val > 0 ? `+${val.toFixed(1)} dB Boost` : `${val.toFixed(1)} dB Cut`);
      }
      drawPlaylistWaveform(clip, 0);
    });

    // 4-Track Routing Buttons
    for (let t = 1; t <= 4; t++) {
      document.getElementById(`btn-route-trk${t}`)?.addEventListener('click', () => {
        engine.assignClipToTrack(activeClipId, t);
        const clip = engine.getClip(activeClipId);
        showToast(`👉 "${clip?.title}" routed to Track ${t}!`, 'success');
        renderPlaylistClips(activePlaylistFilter);
        updateTrackAssignedBadges();
        updateRouteButtonsUI(clip);
      });
    }

    // Audio File Import
    document.getElementById('input-import-clip')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      showToast(`Importing "${file.name}"...`, 'info');
      const newClip = await engine.importAudioFile(file);
      if (newClip) {
        activeClipId = newClip.id;
        renderPlaylistClips(activePlaylistFilter);
        loadClipIntoEditor(newClip.id);
        showToast(`🎵 "${newClip.title}" imported into audio playlist!`, 'success');
      } else {
        showToast('Could not decode audio file', 'error');
      }
      e.target.value = '';
    });

    // Reset Pool Button
    document.getElementById('btn-reset-clips')?.addEventListener('click', () => {
      engine.resetAllClips();
      activeClipId = 'clip-sleng-teng';
      renderPlaylistClips('all');
      loadClipIntoEditor(activeClipId);
      updateTrackAssignedBadges();
      showToast('🔄 Audio pool restored to factory sound system clips', 'info');
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
    if (tabId.startsWith('artist-')) {
      state.activeArtistTab = tabId;
    } else {
      state.activeSoundTab = tabId;
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-pane-${tabId}`);
    });

    if (tabId === 'artist-booth') renderArtistBooth();
    if (tabId === 'artist-recorder') initFourTrackUI();
    if (tabId === 'artist-queue') renderArtistQueue();
    if (tabId === 'artist-escrow') renderArtistEscrow();
    if (tabId === 'artist-rates') renderArtistRates();
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

    // Audio Player Start & Stop Buttons
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', toggleStartStop);
    }
    document.getElementById('player-start-btn')?.addEventListener('click', startPlayback);
    document.getElementById('player-stop-btn')?.addEventListener('click', stopPlayback);

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

    // Profile Modal & Inbox Listeners
    document.getElementById('btn-nav-profile')?.addEventListener('click', () => openProfileModal('request'));
    document.getElementById('btn-nav-inbox')?.addEventListener('click', () => openProfileModal('inbox'));
    document.getElementById('btn-autofill-profile')?.addEventListener('click', applyProfileToOrderForm);
    document.getElementById('user-profile-form')?.addEventListener('submit', handleSaveProfile);

    // Profile Modal Tabs
    document.querySelectorAll('.profile-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-profile-tab');
        if (tab) switchProfileTab(tab);
      });
    });

    // Forward Request directly to artist button & selector
    document.getElementById('btn-forward-request-now')?.addEventListener('click', handleForwardRequestToArtist);
    document.getElementById('profile-forward-artist')?.addEventListener('change', updateForwardArtistPricing);
    document.getElementById('btn-mark-all-read')?.addEventListener('click', handleMarkAllNotificationsRead);

    // 4-Way Mode Toggle Listeners for User Profile (Dub Plate, Jingle, Drop-In, Shout Out)
    document.querySelectorAll('.profile-mode-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-profile-mode');
        if (mode) switchProfileMode(mode, true);
      });
    });

    // Live preview reactive updates on typing in profile fields
    ['profile-sound-name', 'profile-crew-members', 'profile-areas', 'profile-tagline', 'profile-suggestions'].forEach(fieldId => {
      document.getElementById(fieldId)?.addEventListener('input', () => {
        const currentMode = state.currentProfileMode || 'dubplate';
        const cfg = PROFILE_MODES[currentMode];
        if (fieldId === 'profile-suggestions' && cfg && state.userProfile) {
          state.userProfile[cfg.fieldProp] = document.getElementById(fieldId).value;
        }
        updateLiveSlatePreview();
      });
    });

    // =========================================================================
    // ARTIST STUDIO PORTAL EVENT LISTENERS
    // =========================================================================

    // Top Role Mode Switcher (Sound System ⇄ Artist Studio)
    document.getElementById('btn-role-selector')?.addEventListener('click', () => switchPortalRole('sound_system'));
    document.getElementById('btn-role-artist')?.addEventListener('click', () => switchPortalRole('artist'));

    // Booth: Change Active Artist
    document.getElementById('booth-artist-select')?.addEventListener('change', (e) => {
      state.activeArtistId = e.target.value;
      renderArtistStudioAll();
      const artist = getActiveArtist();
      showToast(`Operating Vocal Booth as ${artist.name} (${artist.city})`, 'info');
    });

    // Booth: Toggle Live Studio Status
    document.querySelectorAll('#booth-status-toggle .status-pill-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const status = e.currentTarget.getAttribute('data-status');
        const artist = getActiveArtist();
        if (artist) {
          artist.studioStatus = status;
          document.querySelectorAll('#booth-status-toggle .status-pill-btn').forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
          await window.GDP_API.updateArtist(artist.id, { studioStatus: status });
          renderLiveTicker();
          renderArtists();
          updateStatsDisplay();
          const label = status === 'in_studio' ? '🔴 LIVE IN STUDIO' : (status === 'in_session' ? '🟡 IN DUB SESSION' : '⚫ OFFLINE');
          showToast(`Studio status updated to ${label}!`, 'success');
        }
      });
    });

    // Booth: Change Target Order to Voice
    document.getElementById('booth-target-order-select')?.addEventListener('change', (e) => {
      state.activeBoothOrderId = e.target.value;
      updateTeleprompterData();
    });

    // Booth: Metronome Rhythm Clicker
    document.getElementById('btn-prompter-metronome')?.addEventListener('click', toggleBoothMetronome);

    // Booth: Main Voicing Action Button
    document.getElementById('btn-booth-voice-now')?.addEventListener('click', () => voiceActiveBoothOrder());

    // Queue: Filter Buttons
    document.querySelectorAll('#artist-queue-filter-buttons .filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#artist-queue-filter-buttons .filter-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        state.activeQueueFilter = e.currentTarget.getAttribute('data-queue-filter');
        renderArtistQueue();
      });
    });

    // Escrow: Payout Rail Selection
    document.querySelectorAll('#payout-rails-container .payout-rail-card').forEach(card => {
      card.addEventListener('click', (e) => {
        document.querySelectorAll('#payout-rails-container .payout-rail-card').forEach(c => c.classList.remove('selected'));
        const target = e.currentTarget;
        target.classList.add('selected');
        state.selectedPayoutRail = target.getAttribute('data-rail');
      });
    });

    // Escrow: Submit Payout Request
    document.getElementById('payout-request-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = Number(document.getElementById('payout-amount').value);
      const account = document.getElementById('payout-account').value.trim();
      const artist = getActiveArtist();
      if (!artist) return;

      const res = await window.GDP_API.requestArtistPayout(artist.id, {
        amount,
        method: state.selectedPayoutRail,
        accountDetails: account
      });

      showToast(res.message || `Payout request of $${amount} dispatched!`, 'success');
      engine.initContext();
      engine.triggerAirhorn();
    });

    // Rates: Save Rate Card & Studio Facility Info
    document.getElementById('artist-rates-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const artist = getActiveArtist();
      if (!artist) return;

      const dubplate = Number(document.getElementById('rate-fee-dubplate').value);
      const jingle = Number(document.getElementById('rate-fee-jingle').value);
      const dropIn = Number(document.getElementById('rate-fee-dropin').value);
      const shoutOut = Number(document.getElementById('rate-fee-shoutout').value);
      const videoCapture = Number(document.getElementById('rate-fee-video').value);
      const studioName = document.getElementById('rate-studio-name').value.trim();
      const sessionTitle = document.getElementById('rate-session-title').value.trim();
      const bio = document.getElementById('rate-bio').value.trim();

      const res = await window.GDP_API.updateArtist(artist.id, {
        pricing: { dubplate, jingle, dropIn, shoutOut, videoCapture },
        studioName,
        sessionTitle,
        bio
      });

      if (res.success) {
        Object.assign(artist, { studioName, sessionTitle, bio });
        artist.pricing = { dubplate, jingle, dropIn, shoutOut, videoCapture };
        showToast('✓ Rate card & studio pricing synced with live marketplace!', 'success');
        renderArtists();
        renderArtistBooth();
      }
    });

    // =========================================================================
    // DAW WORKSTATION & MULTITRACK MIXER EVENT LISTENERS
    // Modeled after modern digital audio workstation arrangement layout
    // Created by Adrian Anesu Mupemhi for Jahvisions, Benjamin Music & Terence Taona Technologies
    // =========================================================================

    // Jump from Vocal Booth to DAW Workstation
    document.getElementById('btn-open-4track-from-booth')?.addEventListener('click', () => {
      switchTab('artist-recorder');
      initFourTrackUI();
      showToast('🎚️ Global Dub Plate DAW Workstation & Multitrack Console Ready!', 'info');
    });

    // DAW Transport: Play
    document.getElementById('daw-btn-play')?.addEventListener('click', () => {
      engine.startFourTrack(false);
      updateFourTrackTransportUI();
      showToast('▶ DAW Playback Active (6 Channels Live)', 'info');
    });

    // DAW Transport: Stop
    document.getElementById('daw-btn-stop')?.addEventListener('click', () => {
      engine.stopFourTrack();
      updateFourTrackTransportUI();
      showToast('⏹ DAW Playback Stopped', 'info');
    });

    // DAW Transport: Record
    document.getElementById('daw-btn-rec')?.addEventListener('click', () => {
      const ft = engine.fourTrack;
      if (ft && ft.isRecording) {
        engine.stopFourTrack();
        updateFourTrackTransportUI();
        showToast('⏹ Recording Completed & Stored on Track 02 (Juno 106 Lead Vocal)!', 'success');
      } else {
        engine.toggleTrackRecArm(2);
        engine.startFourTrack(true);
        updateFourTrackTransportUI();
        showToast('⏺ RECORDING LIVE! Studio Vocal Toast Capture Active on Track 02!', 'error');
      }
    });

    // DAW Transport: Return to Zero
    document.getElementById('daw-btn-rtz')?.addEventListener('click', () => {
      engine.returnToZeroFourTrack();
      const playhead = document.getElementById('daw-playhead');
      if (playhead) playhead.style.left = '0%';
      const tc = document.getElementById('daw-timecode-display');
      if (tc) tc.textContent = '00:00:00';
      const bb = document.getElementById('daw-bar-beat-display');
      if (bb) bb.textContent = 'BAR 01 . 01';
      showToast('⏮ Returned to Bar 1 (00:00:00)', 'info');
    });

    // DAW Transport: Rewind & Fast Forward
    document.getElementById('daw-btn-rew')?.addEventListener('click', () => {
      engine.rewindFourTrack();
      showToast('◀ Rewound 4 Bars', 'info');
    });

    document.getElementById('daw-btn-ff')?.addEventListener('click', () => {
      engine.fastForwardFourTrack();
      showToast('▶▶ Fast-Forwarded 4 Bars', 'info');
    });

    // DAW Tempo Input
    const tempoInput = document.getElementById('daw-tempo-input');
    if (tempoInput) {
      tempoInput.addEventListener('change', (e) => {
        const bpm = parseInt(e.target.value) || 85;
        engine.bpm = Math.max(50, Math.min(180, bpm));
        showToast(`Dubplate Tempo: ${engine.bpm} BPM`, 'info');
      });
    }

    // Tap Tempo
    let lastTap = 0;
    let tapIntervals = [];
    document.getElementById('daw-btn-tap')?.addEventListener('click', () => {
      const now = performance.now();
      if (lastTap > 0) {
        const delta = now - lastTap;
        if (delta < 2000 && delta > 250) {
          tapIntervals.push(delta);
          if (tapIntervals.length > 4) tapIntervals.shift();
          const avg = tapIntervals.reduce((a, b) => a + b, 0) / tapIntervals.length;
          const calcBpm = Math.round(60000 / avg);
          engine.bpm = Math.max(60, Math.min(180, calcBpm));
          if (tempoInput) tempoInput.value = engine.bpm;
          showToast(`🥁 Tap Tempo: ${engine.bpm} BPM`, 'info');
        } else {
          tapIntervals = [];
        }
      }
      lastTap = now;
    });

    // Audio Pool Drawer Toggle & Close
    const drawerEl = document.getElementById('daw-playlist-drawer');
    document.getElementById('btn-toggle-playlist-drawer')?.addEventListener('click', () => {
      if (!drawerEl) return;
      const isOpen = drawerEl.style.display !== 'none';
      drawerEl.style.display = isOpen ? 'none' : 'flex';
      if (!isOpen) renderDawDrawerClips(dawSearchQuery);
    });

    document.getElementById('btn-close-playlist-drawer')?.addEventListener('click', () => {
      if (drawerEl) drawerEl.style.display = 'none';
    });

    // Audio Clip Search Filter
    document.getElementById('daw-clip-search')?.addEventListener('input', (e) => {
      dawSearchQuery = e.target.value;
      renderDawDrawerClips(dawSearchQuery);
    });

    // Import WAV Audio into Pool
    document.getElementById('daw-input-import')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      showToast(`Importing "${file.name}" into Audio Pool...`, 'info');
      const newClip = await engine.importAudioFile(file);
      if (newClip) {
        renderDawDrawerClips(dawSearchQuery);
        showToast(`🎵 "${newClip.title}" imported into Audio Pool!`, 'success');
      } else {
        showToast('Could not decode audio file', 'error');
      }
      e.target.value = '';
    });

    // Master Bounce WAV Button
    document.getElementById('daw-btn-bounce-master')?.addEventListener('click', exportFourTrackMasterWav);

    // Track 3 Quick Chant Pads
    document.getElementById('btn-pad-killsound')?.addEventListener('click', () => {
      engine.triggerFourTrackChant('killsound');
      showToast('🗣️ Chant Fired: "Kill sound boy dead!"', 'info');
    });
    document.getElementById('btn-pad-pullup')?.addEventListener('click', () => {
      engine.triggerFourTrackChant('pullup');
      showToast('🗣️ Chant Fired: "Pull up selecta!"', 'info');
    });
    document.getElementById('btn-pad-morefire')?.addEventListener('click', () => {
      engine.triggerFourTrackChant('morefire');
      showToast('🗣️ Chant Fired: "More fire!"', 'info');
    });
    document.getElementById('btn-pad-jahvisions')?.addEventListener('click', () => {
      engine.triggerFourTrackChant('jahvisions');
      showToast('🗣️ Chant Fired: "Jahvisions International Sound!"', 'info');
    });

    // Track 4 Quick Dub FX Buttons
    document.getElementById('btn-pad-siren')?.addEventListener('click', () => {
      engine.triggerFourTrackFX('siren');
      showToast('🚨 Dub Siren Sounded on Track 4!', 'info');
    });
    document.getElementById('btn-pad-horn')?.addEventListener('click', () => {
      engine.triggerFourTrackFX('horn');
      showToast('🎺 Sound System Airhorn Blasted!', 'info');
    });
    document.getElementById('btn-pad-laser')?.addEventListener('click', () => {
      engine.triggerFourTrackFX('laser');
      showToast('⚡ Sound Clash Laser Fired!', 'info');
    });
    document.getElementById('btn-pad-spring')?.addEventListener('click', () => {
      engine.triggerFourTrackFX('spring');
      showToast('🌊 King Tubby Spring Reverb Crashed!', 'info');
    });

    document.getElementById('btn-export-4track-wav')?.addEventListener('click', exportFourTrackMasterWav);
    document.getElementById('btn-sync-to-vault')?.addEventListener('click', () => {
      switchTab('vault');
      showToast('🚀 Dubplate stems committed to Sound System Vault!', 'success');
    });
  }

  init();
});
