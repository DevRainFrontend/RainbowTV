
(() => {
  'use strict';

  const state = {
    channels: [],
    filteredChannels: [],
    activeChannel: null,
    activeCategory: 'ALL',
    searchQuery: '',
    favorites: new Set(JSON.parse(localStorage.getItem('canlitv_favs') || '[]')),
    recentHistory: JSON.parse(localStorage.getItem('canlitv_recent') || '[]'),
    alarms: JSON.parse(localStorage.getItem('canlitv_alarms') || '[]'),
    currentView: 'single', 
    hls: null,
    mvPlayers: [], 
    statsInterval: null,
    statsVisible: false,
    sleepTimerInterval: null,
    sleepTimerEnd: null,
    isMuted: false,
    lastVolume: 1.0,
    isLive: true,
    isFloating: false,
    selectedQuality: localStorage.getItem('rainbowtv_preferred_quality') || '4k', 
    isUpscaling: false,
    isCatchup: false,
    currentCatchupProg: null
  };

  const DOM = {
    mainVideo: document.getElementById('mainVideo'),
    upscaleCanvas: document.getElementById('upscaleCanvas'),
    singlePlayerWrapper: document.getElementById('singlePlayerWrapper'),
    multiviewGrid: document.getElementById('multiviewGrid'),
    playerContainer: document.getElementById('playerContainer'),
    channelsListContainer: document.getElementById('channelsListContainer'),
    catchupBar: document.getElementById('catchupBar'),
    catchupProgName: document.getElementById('catchupProgName'),
    returnLiveBtn: document.getElementById('returnLiveBtn'),
    dayScrubberWrapper: document.getElementById('dayScrubberWrapper'),
    dayScrubberCurrentTime: document.getElementById('dayScrubberCurrentTime'),
    dayTimelineTrack: document.getElementById('dayTimelineTrack'),
    dayTimelineBlocks: document.getElementById('dayTimelineBlocks'),
    dayTimelineLiveLine: document.getElementById('dayTimelineLiveLine'),
    dayTimelineProgress: document.getElementById('dayTimelineProgress'),
    dayTimelineThumb: document.getElementById('dayTimelineThumb'),
    dayTimelineTooltip: document.getElementById('dayTimelineTooltip'),
    dayTimelineLiveMarker: document.getElementById('dayTimelineLiveMarker'),
    categoryTabs: document.getElementById('categoryTabs'),
    channelSearchInput: document.getElementById('channelSearchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    recentStrip: document.getElementById('recentStrip'),
    recentItems: document.getElementById('recentItems'),

    tvOsd: document.getElementById('tvOsd'),
    osdNumber: document.getElementById('osdNumber'),
    osdName: document.getElementById('osdName'),
    osdProgram: document.getElementById('osdProgram'),
    bigPlayBtn: document.getElementById('bigPlayBtn'),
    playerSpinner: document.getElementById('playerSpinner'),
    playerError: document.getElementById('playerError'),
    retryStreamBtn: document.getElementById('retryStreamBtn'),

    radioPlayerOverlay: document.getElementById('radioPlayerOverlay'),
    radioStationLogo: document.getElementById('radioStationLogo'),
    radioStationName: document.getElementById('radioStationName'),
    radioProgramName: document.getElementById('radioProgramName'),
    radioEqualizer: document.getElementById('radioEqualizer'),

    playPauseBtn: document.getElementById('playPauseBtn'),
    playIcon: document.getElementById('playIcon'),
    pauseIcon: document.getElementById('pauseIcon'),
    rewind10Btn: document.getElementById('rewind10Btn'),
    rewind30Btn: document.getElementById('rewind30Btn'),
    liveSyncBtn: document.getElementById('liveSyncBtn'),
    liveBtnText: document.getElementById('liveBtnText'),
    dvrSeekbar: document.getElementById('dvrSeekbar'),
    dvrTooltip: document.getElementById('dvrTooltip'),
    volumeSlider: document.getElementById('volumeSlider'),
    muteBtn: document.getElementById('muteBtn'),
    volHighIcon: document.getElementById('volHighIcon'),
    volMuteIcon: document.getElementById('volMuteIcon'),
    volumePercent: document.getElementById('volumePercent'),
    qualityMenuBtn: document.getElementById('qualityMenuBtn'),
    qualityLabel: document.getElementById('qualityLabel'),
    qualityDropdown: document.getElementById('qualityDropdown'),
    toggleStatsBtn: document.getElementById('toggleStatsBtn'),
    statsForNerds: document.getElementById('statsForNerds'),
    closeStatsBtn: document.getElementById('closeStatsBtn'),
    floatPlayerBtn: document.getElementById('floatPlayerBtn'),
    pipBtn: document.getElementById('pipBtn'),
    fullscreenBtn: document.getElementById('fullscreenBtn'),
    enterFsIcon: document.getElementById('enterFsIcon'),
    exitFsIcon: document.getElementById('exitFsIcon'),
    mobileQuickFsBtn: document.getElementById('mobileQuickFsBtn'),
    mobileEnterFsIcon: document.getElementById('mobileEnterFsIcon'),
    mobileExitFsIcon: document.getElementById('mobileExitFsIcon'),

    castBtn: document.getElementById('castBtn'),
    castModal: document.getElementById('castModal'),
    closeCastModal: document.getElementById('closeCastModal'),
    btnTriggerChromecast: document.getElementById('btnTriggerChromecast'),
    castingOverlay: document.getElementById('castingOverlay'),
    castingDeviceName: document.getElementById('castingDeviceName'),
    castingStopBtn: document.getElementById('castingStopBtn'),
    audioEqBtn: document.getElementById('audioEqBtn'),
    audioEqDropdown: document.getElementById('audioEqDropdown'),
    audioEqCurrentBadge: document.getElementById('audioEqCurrentBadge'),
    eqBassSlider: document.getElementById('eqBassSlider'),
    eqMidSlider: document.getElementById('eqMidSlider'),
    eqTrebleSlider: document.getElementById('eqTrebleSlider'),
    eqBassVal: document.getElementById('eqBassVal'),
    eqMidVal: document.getElementById('eqMidVal'),
    eqTrebleVal: document.getElementById('eqTrebleVal'),
    quickLimiterBtn: document.getElementById('quickLimiterBtn'),
    smartLimiterToggle: document.getElementById('smartLimiterToggle'),
    limiterActiveBadge: document.getElementById('limiterActiveBadge'),
    limiterDbText: document.getElementById('limiterDbText'),
    limiterMeterFill: document.getElementById('limiterMeterFill'),
    activeChannelLogo: document.getElementById('activeChannelLogo'),
    activeChannelNum: document.getElementById('activeChannelNum'),
    activeChannelName: document.getElementById('activeChannelName'),
    activeChannelCategory: document.getElementById('activeChannelCategory'),
    activeFavBtn: document.getElementById('activeFavBtn'),
    activeProgramName: document.getElementById('activeProgramName'),
    activeProgramDesc: document.getElementById('activeProgramDesc'),
    activeProgramProgress: document.getElementById('activeProgramProgress'),
    activeProgramTime: document.getElementById('activeProgramTime'),

    epgProgramsList: document.getElementById('epgProgramsList'),
    epgDate: document.getElementById('epgDate'),

    hoverPreviewTooltip: document.getElementById('hoverPreviewTooltip'),
    previewLogo: document.getElementById('previewLogo'),
    previewChName: document.getElementById('previewChName'),
    previewProgTitle: document.getElementById('previewProgTitle'),
    previewProgTime: document.getElementById('previewProgTime'),

    statRes: document.getElementById('statRes'),
    statBitrate: document.getElementById('statBitrate'),
    statBuffer: document.getElementById('statBuffer'),
    statFps: document.getElementById('statFps'),
    statDropped: document.getElementById('statDropped'),
    statLatency: document.getElementById('statLatency'),
    statMode: document.getElementById('statMode'),

    tickerWrapper: document.getElementById('tickerWrapper'),
    tickerMarquee: document.getElementById('tickerMarquee'),
    tickerToggleBtn: document.getElementById('tickerToggleBtn'),
    sleepTimerBtn: document.getElementById('sleepTimerBtn'),
    sleepTimerText: document.getElementById('sleepTimerText'),
    sleepTimerBadge: document.getElementById('sleepTimerBadge'),
    sleepOverlay: document.getElementById('sleepOverlay'),
    wakeUpBtn: document.getElementById('wakeUpBtn'),
    alarmsBtn: document.getElementById('alarmsBtn'),
    alarmsCount: document.getElementById('alarmsCount'),
    shortcutsBtn: document.getElementById('shortcutsBtn'),
    refreshBtn: document.getElementById('refreshBtn'),

    shortcutsModal: document.getElementById('shortcutsModal'),
    closeShortcutsModal: document.getElementById('closeShortcutsModal'),
    sleepModal: document.getElementById('sleepModal'),
    closeSleepModal: document.getElementById('closeSleepModal'),
    alarmsModal: document.getElementById('alarmsModal'),
    closeAlarmsModal: document.getElementById('closeAlarmsModal'),
    alarmsList: document.getElementById('alarmsList')
  };

  function setupMobileTabs() {
    const tabChannels = document.getElementById('tabBtnChannels');
    const tabEpg = document.getElementById('tabBtnEpg');
    const channelsSidebar = document.getElementById('channelsSidebar');
    const epgSidebar = document.getElementById('epgSidebar');

    if (!tabChannels || !tabEpg) return;

    tabChannels.addEventListener('click', () => {
      tabChannels.classList.add('active');
      tabEpg.classList.remove('active');
      if (channelsSidebar) channelsSidebar.classList.remove('mobile-hidden');
      if (epgSidebar) epgSidebar.classList.add('mobile-hidden');
    });

    tabEpg.addEventListener('click', () => {
      tabEpg.classList.add('active');
      tabChannels.classList.remove('active');
      if (channelsSidebar) channelsSidebar.classList.add('mobile-hidden');
      if (epgSidebar) epgSidebar.classList.remove('mobile-hidden');
    });

    if (window.innerWidth <= 768 && epgSidebar) {
      epgSidebar.classList.add('mobile-hidden');
    }
  }

  function setupMobileTouchControls() {
    const playerStage = document.getElementById('playerStage');
    const video = DOM.mainVideo;
    if (!playerStage || !video) return;

    let touchHideTimeout = null;
    let lastTapTime = 0;

    video.addEventListener('touchend', (e) => {
      const currentTime = Date.now();
      const tapGap = currentTime - lastTapTime;
      if (tapGap < 320 && tapGap > 0) {

        if (e.cancelable) e.preventDefault();
        toggleFullscreen();
        lastTapTime = 0;
        return;
      }
      lastTapTime = currentTime;

      playerStage.classList.toggle('touch-active');
      clearTimeout(touchHideTimeout);
      if (playerStage.classList.contains('touch-active')) {
        touchHideTimeout = setTimeout(() => {
          playerStage.classList.remove('touch-active');
        }, 4000);
      }
    }, { passive: false });
  }

  async function init() {
    registerServiceWorker();
    setupMobileTabs();
    setupMobileTouchControls();
    setupEventListeners();
    setupKeyboardShortcuts();
    setupDraggableFloatingPlayer();
    startAlarmMonitor();
    startEpgLiveSync();

    await loadChannels();
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('PWA Service Worker kayıt hatası:', err);
      });
    }
  }

  async function loadChannels() {
    showSpinner(true);
    try {
      const res = await fetch('/api/channels');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      state.channels = data.channels || [];

      updateCategoryCounts();
      renderRecentChannels();
      applyFilters();

      if (state.channels.length > 0 && !state.activeChannel) {

        const defaultChannel = state.channels.find(c => c.num === 1 && c.active) || 
                               state.channels.find(c => c.active) || 
                               state.channels[0];
        selectChannel(defaultChannel, true);
      }
    } catch (err) {
      console.error('Kanallar yüklenirken hata oluştu:', err);
      showError('Kanallar Yüklenemedi', 'Sunucuya bağlanılamadı. Lütfen sunucunun çalıştığından emin olun.');
    } finally {
      showSpinner(false);
    }
  }

  function updateCategoryCounts() {
    const countAll = document.getElementById('countAll');
    const countFav = document.getElementById('countFav');
    const count4k = document.getElementById('count4k');
    const tabChannelsCount = document.getElementById('tabChannelsCount');
    if (countAll) countAll.textContent = state.channels.length;
    if (countFav) countFav.textContent = state.favorites.size;
    if (count4k) {
      count4k.textContent = state.channels.filter(c => c.is_4k || (c.name && c.name.includes('4K'))).length;
    }
    if (tabChannelsCount) {
      tabChannelsCount.textContent = `Kanallar (${state.channels.length})`;
    }
  }

  function applyFilters() {
    const q = state.searchQuery.trim().toLowerCase();
    const cat = state.activeCategory;

    state.filteredChannels = state.channels.filter(ch => {

      if (cat === 'FAV' && !state.favorites.has(ch.num)) return false;
      if (cat === '4K' && !ch.is_4k && !(ch.name && ch.name.includes('4K'))) return false;
      if (cat !== 'ALL' && cat !== 'FAV' && cat !== '4K' && ch.category !== cat) return false;

      if (q) {
        const matchName = ch.name.toLowerCase().includes(q);
        const matchProg = (ch.current_program || '').toLowerCase().includes(q);
        const matchNum = ch.num.toString() === q;
        if (!matchName && !matchProg && !matchNum) return false;
      }
      return true;
    });

    renderChannelsList();
  }

  function renderChannelsList() {
    DOM.channelsListContainer.innerHTML = '';

    if (state.filteredChannels.length === 0) {
      DOM.channelsListContainer.innerHTML = `
        <div class="empty-state">
          <p>Aramanızla eşleşen kanal bulunamadı.</p>
        </div>
      `;
      return;
    }

    state.filteredChannels.forEach(ch => {
      const isFav = state.favorites.has(ch.num);
      const isActive = state.activeChannel && state.activeChannel.num === ch.num;

      const item = document.createElement('div');
      item.className = `channel-item ${isActive ? 'active' : ''}`;
      item.dataset.num = ch.num;

      item.innerHTML = `
        <div class="ch-num">${ch.num}</div>
        <div class="ch-logo-wrap">
          <img src="${ch.logo}" alt="${ch.name}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'><rect width=\\'100\\' height=\\'100\\' fill=\\'%23222\\'/><text x=\\'50\\' y=\\'55\\' fill=\\'%23fff\\' font-size=\\'18\\' text-anchor=\\'middle\\'>TV</text></svg>'">
        </div>
        <div class="ch-info">
          <div class="ch-top-row">
            <span class="ch-name">${ch.name}</span>
            <button class="ch-fav-btn ${isFav ? 'is-fav' : ''}" data-num="${ch.num}" title="Favorilere Ekle/Çıkar">★</button>
          </div>
          <div class="ch-prog-row">${ch.current_program || 'Canlı Yayın'}</div>
          <div class="ch-progress-mini">
            <div class="ch-progress-mini-bar" style="width: ${ch.current_progress || 40}%"></div>
          </div>
        </div>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('ch-fav-btn')) return;
        selectChannel(ch);
      });

      const favBtn = item.querySelector('.ch-fav-btn');
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(ch.num);
      });

      item.addEventListener('mouseenter', (e) => showHoverPreview(ch, e));
      item.addEventListener('mousemove', (e) => updateHoverPreviewPos(e));
      item.addEventListener('mouseleave', hideHoverPreview);

      DOM.channelsListContainer.appendChild(item);
    });
  }

  function selectChannel(channel, autoPlay = true) {
    if (!channel) return;
    state.activeChannel = channel;
    state.isCatchup = false;
    state.currentCatchupProg = null;
    if (DOM.catchupBar) DOM.catchupBar.style.display = 'none';

    const isRadioChannel = Boolean(channel.category === 'Radyo' || channel.group === 'Radyo');

    if (isRadioChannel) {
      stopUpscaling();
    } else {

      if (state.selectedQuality === '4k' || state.selectedQuality === '2k') {
        const target = state.selectedQuality === '4k' 
          ? { w: 3840, h: 2160, label: '4K Ultra HD' } 
          : { w: 2560, h: 1440, label: '2K QHD' };
        startUpscaling(target.w, target.h, target.label);
      }
    }

    document.querySelectorAll('.channel-item').forEach(el => {
      el.classList.toggle('active', el.dataset.num == channel.num);
    });

    showOsd(channel);

    updateActiveChannelCard(channel);

    renderEpg(channel);
    renderDayScrubber(channel);

    if (isCastingActive && window.cast && cast.framework) {
      try {
        const session = cast.framework.CastContext.getInstance().getCurrentSession();
        if (session) {
          loadChannelToCastSession(session, channel);
        }
      } catch (e) {}
    }

    addToRecent(channel);

    if (state.currentView === 'single') {
      playStream(channel.url, channel.backup_url, autoPlay);
    }
  }

  function showRadioVisualizer(channel) {
    if (!DOM.radioPlayerOverlay) return;
    DOM.radioStationLogo.src = channel.logo || '/favicon.png';
    DOM.radioStationName.textContent = channel.name;
    DOM.radioProgramName.textContent = channel.current_program || 'Canlı Radyo Akışı';
    DOM.radioPlayerOverlay.style.display = 'flex';
    DOM.radioPlayerOverlay.classList.toggle('is-paused', DOM.mainVideo.paused);
  }

  function hideRadioVisualizer() {
    if (DOM.radioPlayerOverlay) {
      DOM.radioPlayerOverlay.style.display = 'none';
    }
  }

  function playStream(streamUrl, backupUrl, autoPlay = true) {
    hideError();
    showSpinner(true);

    const video = DOM.mainVideo;
    video.pause();

    if (state.hls) {
      state.hls.destroy();
      state.hls = null;
    }

    const currentChannel = state.activeChannel;
    const isRadio = currentChannel && (currentChannel.category === 'Radyo' || currentChannel.group === 'Radyo');

    if (isRadio) {
      showRadioVisualizer(currentChannel);
      DOM.qualityLabel.textContent = '128k HD';
      DOM.qualityDropdown.innerHTML = '<button class="quality-opt active">128k HD Canlı Ses</button>';
    } else {
      hideRadioVisualizer();
    }

    const isDirectAudio = !streamUrl.includes('.m3u8') && (
      streamUrl.endsWith('.mp3') ||
      streamUrl.endsWith('.aac') ||
      streamUrl.endsWith(';') ||
      streamUrl.includes('radyotvonline') ||
      streamUrl.includes('streamtheworld') ||
      isRadio
    );

    function attemptPlay() {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          DOM.bigPlayBtn.classList.remove('show');
        }).catch(err => {
          console.log('Tarayıcı sesli autoplay engeli, sessiz başlatma deneniyor...', err);
          video.muted = true;
          state.isMuted = true;
          if (DOM.volHighIcon) DOM.volHighIcon.style.display = 'none';
          if (DOM.volMuteIcon) DOM.volMuteIcon.style.display = 'block';
          const curVol = state.lastVolume > 0 ? state.lastVolume : 1.0;
          DOM.volumeSlider.value = curVol;
          DOM.volumePercent.textContent = `${Math.round(curVol * 100)}%`;
          DOM.volumeSlider.style.setProperty('--vol-pct', `${Math.round(curVol * 100)}%`);

          video.play().then(() => {
            DOM.bigPlayBtn.classList.remove('show');
            showToastOsd('Sesi açmak için ekrana tıklayın');
            const unmuteOnInteraction = () => {
              if (video.muted) {
                video.muted = false;
                state.isMuted = false;
                video.volume = state.lastVolume || 1.0;
                if (DOM.volHighIcon) DOM.volHighIcon.style.display = 'block';
                if (DOM.volMuteIcon) DOM.volMuteIcon.style.display = 'none';
              }
              document.removeEventListener('click', unmuteOnInteraction);
            };
            document.addEventListener('click', unmuteOnInteraction, { once: true });
          }).catch(() => {
            DOM.bigPlayBtn.classList.add('show');
          });
        });
      }
    }

    if (isDirectAudio) {

      const audioUrl = streamUrl.startsWith('/') ? streamUrl : `/proxy?url=${encodeURIComponent(streamUrl)}`;
      video.src = audioUrl;

      const onCanPlay = () => {
        showSpinner(false);
        if (autoPlay) {
          attemptPlay();
        } else {
          DOM.bigPlayBtn.classList.add('show');
        }
      };

      const onError = () => {
        showSpinner(false);
        if (backupUrl && backupUrl !== streamUrl) {
          console.log('Birincil radyo akışı başarısız, yedek deneniyor:', backupUrl);
          const nextBackup = backupUrl.startsWith('/') ? backupUrl : `/proxy?url=${encodeURIComponent(backupUrl)}`;
          video.src = nextBackup;
          if (autoPlay) attemptPlay();
        } else {
          showError('Radyo Akışına Ulaşılamadı', 'Canlı radyo sunucusuna bağlanılamadı. Lütfen başka bir istasyon seçin.');
        }
      };

      video.addEventListener('canplay', onCanPlay, { once: true });
      video.addEventListener('error', onError, { once: true });
      video.load();
      return;
    }

    const isDirectCapable = streamUrl.includes('trt') || streamUrl.includes('turkmedya') || streamUrl.includes('fasttvcdn');
    const primaryUrl = streamUrl.startsWith('/') ? streamUrl : (isDirectCapable ? streamUrl : `/proxy?url=${encodeURIComponent(streamUrl)}`);

    function attachHls(sourceUrl, isFallback = false) {
      let networkRetryCount = 0;
      let mediaRecoveryCount = 0;

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          capLevelToPlayerSize: false, 
          backBufferLength: 180, 
          maxBufferLength: 45,
          maxMaxBufferLength: 90,
          maxBufferSize: 200 * 1000 * 1000, 
          liveSyncDurationCount: 2,
          liveMaxLatencyDurationCount: 6,
          initialLiveManifestSize: 1,
          progressive: true,
          autoStartLoad: true
        });
        state.hls = hls;

        hls.loadSource(sourceUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          showSpinner(false);
          if (!isRadio) {
            buildQualityMenu(data.levels);

            if (state.selectedQuality === '4k') {
              if (data.levels && data.levels.length > 0) {
                hls.currentLevel = data.levels.length - 1;
              }
              startUpscaling(3840, 2160, '4K Ultra HD');
            } else if (state.selectedQuality === '2k') {
              if (data.levels && data.levels.length > 0) {
                hls.currentLevel = data.levels.length - 1;
              }
              startUpscaling(2560, 1440, '2K QHD');
            }
          }
          if (autoPlay) {
            attemptPlay();
          } else {
            DOM.bigPlayBtn.classList.add('show');
          }
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, () => {
          if (!isRadio) updateQualityLabel();
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (!data.fatal) return;

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('HLS Ağ Hatası:', data.details);
              if (networkRetryCount < 3) {
                networkRetryCount++;
                console.log(`Ağ hatası kurtarma denemesi (${networkRetryCount}/3)...`);
                hls.startLoad();
                return;
              }
              break;

            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('HLS Medya Hatası:', data.details);
              if (mediaRecoveryCount < 2) {
                mediaRecoveryCount++;
                console.log(`Medya çözme hatası kurtarılıyor (${mediaRecoveryCount}/2)...`);
                hls.recoverMediaError();
                return;
              }
              break;

            default:
              break;
          }

          console.warn('HLS Fatal Error, yedek akış veya proxy deneniyor:', data.type, data.details);
          hls.destroy();

          if (!isFallback && sourceUrl === streamUrl) {
            console.log('Doğrudan akış başarısız, ultra hızlı proxy deneniyor...');
            const nextUrl = streamUrl.startsWith('/') ? streamUrl : `/proxy?url=${encodeURIComponent(streamUrl)}`;
            attachHls(nextUrl, true);
            return;
          }

          if (backupUrl && backupUrl !== streamUrl) {
            console.log('Birincil akış başarısız, yedek akış deneniyor:', backupUrl);
            const nextBackup = backupUrl.startsWith('/') ? backupUrl : `/proxy?url=${encodeURIComponent(backupUrl)}`;
            attachHls(nextBackup, true);
            return;
          }

          showError('Yayın Akışına Bağlanılamadı', 'Yayın kaynağına ulaşılamadı. Lütfen Tekrar Dene butonuna tıklayın veya başka bir kanal seçin.');
        });

      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = sourceUrl;
        video.addEventListener('loadedmetadata', () => {
          showSpinner(false);
          if (autoPlay) attemptPlay();
        }, { once: true });
      } else {
        showError('Tarayıcı Hatası', 'Tarayıcınız HLS video akışını desteklemiyor.');
      }
    }

    attachHls(primaryUrl);
  }

  let gl = null;
  let glProgram = null;
  let videoTexture = null;
  let renderLoopId = null;
  let videoCallbackId = null;
  let isUpscalingActive = false;
  let upscaleTarget = { width: 3840, height: 2160, label: '4K Ultra HD' };
  let realFps = 60;
  let fpsFrames = 0;
  let fpsLastTime = performance.now();

  const VS_SRC = `
    attribute vec2 a_pos;
    varying vec2 v_uv;
    void main() {
      v_uv = vec2((a_pos.x + 1.0) * 0.5, (1.0 - a_pos.y) * 0.5);
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  const FS_SRC = `
    precision highp float;
    varying vec2 v_uv;
    uniform sampler2D u_video;
    uniform vec2 u_resolution; // 3840.0, 2160.0
    uniform float u_sharpness;  // 0.85

    void main() {
      vec2 step = 1.0 / u_resolution;

      // 5-noktalı ana haç örnekleme (Center, North, South, West, East)
      vec3 c = texture2D(u_video, v_uv).rgb;
      vec3 n = texture2D(u_video, v_uv + vec2(0.0, -step.y)).rgb;
      vec3 s = texture2D(u_video, v_uv + vec2(0.0, step.y)).rgb;
      vec3 w = texture2D(u_video, v_uv + vec2(-step.x, 0.0)).rgb;
      vec3 e = texture2D(u_video, v_uv + vec2(step.x, 0.0)).rgb;

      // 4-köşe diyagonal örnekleme (NW, NE, SW, SE)
      vec3 nw = texture2D(u_video, v_uv + vec2(-step.x, -step.y)).rgb;
      vec3 ne = texture2D(u_video, v_uv + vec2(step.x, -step.y)).rgb;
      vec3 sw = texture2D(u_video, v_uv + vec2(-step.x, step.y)).rgb;
      vec3 se = texture2D(u_video, v_uv + vec2(step.x, step.y)).rgb;

      // Kontrast aralığı tespiti (Ringing / Artefakt engelleme)
      vec3 minCol = min(min(min(n, s), min(w, e)), c);
      minCol = min(min(min(nw, ne), min(sw, se)), minCol);

      vec3 maxCol = max(max(max(n, s), max(w, e)), c);
      maxCol = max(max(max(nw, ne), max(sw, se)), maxCol);

      // CAS Adaptif Keskinlik Katsayısı
      vec3 amp = clamp(min(minCol, 2.0 - maxCol) / (maxCol + 0.0001), 0.0, 1.0);
      vec3 weight = -sqrt(amp) * (u_sharpness * 0.22 + 0.05);

      // Yeniden yapılandırma konvolüsyonu
      vec3 color = (w * weight + e * weight + n * weight + s * weight + c) / (4.0 * weight + 1.0);

      gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    }
  `;

  function initWebGL() {
    if (gl && glProgram) return true;
    const canvas = DOM.upscaleCanvas;
    if (!canvas) return false;

    gl = canvas.getContext('webgl2', { alpha: false, depth: false, antialias: false, powerPreference: 'high-performance' })
      || canvas.getContext('webgl', { alpha: false, depth: false, antialias: false });

    if (!gl) {
      console.warn('WebGL donanım hızlandırma desteklenmiyor.');
      return false;
    }

    function createShader(type, src) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader derleme hatası:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = createShader(gl.VERTEX_SHADER, VS_SRC);
    const fs = createShader(gl.FRAGMENT_SHADER, FS_SRC);
    if (!vs || !fs) return false;

    glProgram = gl.createProgram();
    gl.attachShader(glProgram, vs);
    gl.attachShader(glProgram, fs);
    gl.linkProgram(glProgram);

    if (!gl.getProgramParameter(glProgram, gl.LINK_STATUS)) {
      console.error('Program link hatası:', gl.getProgramInfoLog(glProgram));
      return false;
    }

    gl.useProgram(glProgram);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1
    ]), gl.STATIC_DRAW);

    const aPosLoc = gl.getAttribLocation(glProgram, 'a_pos');
    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);

    videoTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, videoTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    return true;
  }

  let hasRenderedFirstFrame = false;

  function renderUpscaleFrame() {
    if (!isUpscalingActive) return;

    const video = DOM.mainVideo;
    if (video && !video.paused && !video.ended && video.readyState >= 2 && video.videoWidth > 0 && gl && glProgram) {
      try {
        gl.useProgram(glProgram);
        gl.bindTexture(gl.TEXTURE_2D, videoTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.viewport(0, 0, DOM.upscaleCanvas.width, DOM.upscaleCanvas.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        if (!hasRenderedFirstFrame) {
          hasRenderedFirstFrame = true;
          DOM.upscaleCanvas.style.display = 'block';
          DOM.upscaleCanvas.style.opacity = '1';
          DOM.mainVideo.style.opacity = '0';
        }

        fpsFrames++;
        const now = performance.now();
        if (now - fpsLastTime >= 1000) {
          realFps = Math.round((fpsFrames * 1000) / (now - fpsLastTime));
          fpsFrames = 0;
          fpsLastTime = now;
        }
      } catch (e) {

        DOM.mainVideo.style.opacity = '1';
        DOM.upscaleCanvas.style.opacity = '0';
      }
    }

    if (DOM.mainVideo && 'requestVideoFrameCallback' in DOM.mainVideo) {
      videoCallbackId = DOM.mainVideo.requestVideoFrameCallback(renderUpscaleFrame);
    } else {
      renderLoopId = requestAnimationFrame(renderUpscaleFrame);
    }
  }

  function startUpscaling(width = 3840, height = 2160, label = '4K Ultra HD') {
    if (!initWebGL()) return false;

    upscaleTarget = { width, height, label };
    DOM.upscaleCanvas.width = width;
    DOM.upscaleCanvas.height = height;

    gl.useProgram(glProgram);
    gl.uniform2f(gl.getUniformLocation(glProgram, 'u_resolution'), width, height);
    gl.uniform1f(gl.getUniformLocation(glProgram, 'u_sharpness'), 0.85);

    isUpscalingActive = true;
    state.isUpscaling = true;
    hasRenderedFirstFrame = false;

    fpsFrames = 0;
    fpsLastTime = performance.now();

    if (renderLoopId) cancelAnimationFrame(renderLoopId);
    if (videoCallbackId && DOM.mainVideo && 'cancelVideoFrameCallback' in DOM.mainVideo) {
      DOM.mainVideo.cancelVideoFrameCallback(videoCallbackId);
    }

    if ('requestVideoFrameCallback' in DOM.mainVideo) {
      videoCallbackId = DOM.mainVideo.requestVideoFrameCallback(renderUpscaleFrame);
    } else {
      renderLoopId = requestAnimationFrame(renderUpscaleFrame);
    }

    updateQualityLabel();
    return true;
  }

  function stopUpscaling() {
    isUpscalingActive = false;
    state.isUpscaling = false;

    if (DOM.upscaleCanvas) DOM.upscaleCanvas.style.display = 'none';
    if (DOM.mainVideo) DOM.mainVideo.style.opacity = '1';

    if (videoCallbackId && DOM.mainVideo && 'cancelVideoFrameCallback' in DOM.mainVideo) {
      DOM.mainVideo.cancelVideoFrameCallback(videoCallbackId);
      videoCallbackId = null;
    }
    if (renderLoopId) {
      cancelAnimationFrame(renderLoopId);
      renderLoopId = null;
    }
  }

  function buildQualityMenu(levels) {
    DOM.qualityDropdown.innerHTML = '';

    function highlightQualityBtn(activeBtn) {
      DOM.qualityDropdown.querySelectorAll('.quality-opt').forEach(b => b.classList.remove('active'));
      if (activeBtn) activeBtn.classList.add('active');
    }

    const autoBtn = document.createElement('button');
    autoBtn.className = 'quality-opt' + (state.selectedQuality === 'auto' ? ' active' : '');
    autoBtn.innerHTML = '<span>Otomatik (Auto)</span>';
    autoBtn.addEventListener('click', () => {
      state.selectedQuality = 'auto';
      localStorage.setItem('rainbowtv_preferred_quality', 'auto');
      stopUpscaling();
      if (state.hls) state.hls.currentLevel = -1;
      DOM.qualityLabel.textContent = 'Auto';
      highlightQualityBtn(autoBtn);
      DOM.qualityDropdown.classList.remove('show');
      showToastOsd('Otomatik Kalite (Auto ABR)');
    });
    DOM.qualityDropdown.appendChild(autoBtn);

    const uhdBtn = document.createElement('button');
    uhdBtn.className = 'quality-opt gold-4k' + (state.selectedQuality === '4k' ? ' active' : '');
    uhdBtn.innerHTML = '<span>4K Ultra HD (2160p)</span><span class="opt-badge-gold">4K</span>';
    uhdBtn.addEventListener('click', () => {
      state.selectedQuality = '4k';
      localStorage.setItem('rainbowtv_preferred_quality', '4k');
      if (state.hls && state.hls.levels && state.hls.levels.length > 0) {
        state.hls.currentLevel = state.hls.levels.length - 1;
      }
      startUpscaling(3840, 2160, '4K Ultra HD');
      DOM.qualityLabel.innerHTML = '<span class="quality-badge-4k">4K UHD</span>';
      highlightQualityBtn(uhdBtn);
      DOM.qualityDropdown.classList.remove('show');
      showToastOsd('4K Ultra HD Aktif (3840x2160 GPU CAS)');
    });
    DOM.qualityDropdown.appendChild(uhdBtn);

    const qhdBtn = document.createElement('button');
    qhdBtn.className = 'quality-opt cyan-2k' + (state.selectedQuality === '2k' ? ' active' : '');
    qhdBtn.innerHTML = '<span>2K QHD (1440p)</span><span class="opt-badge-cyan">2K</span>';
    qhdBtn.addEventListener('click', () => {
      state.selectedQuality = '2k';
      localStorage.setItem('rainbowtv_preferred_quality', '2k');
      if (state.hls && state.hls.levels && state.hls.levels.length > 0) {
        state.hls.currentLevel = state.hls.levels.length - 1;
      }
      startUpscaling(2560, 1440, '2K QHD');
      DOM.qualityLabel.innerHTML = '<span class="quality-badge-2k">2K QHD</span>';
      highlightQualityBtn(qhdBtn);
      DOM.qualityDropdown.classList.remove('show');
      showToastOsd('2K QHD Aktif (2560x1440 GPU CAS)');
    });
    DOM.qualityDropdown.appendChild(qhdBtn);

    const divider = document.createElement('div');
    divider.className = 'quality-dropdown-divider';
    DOM.qualityDropdown.appendChild(divider);

    if (levels && levels.length > 0) {

      const indexed = levels.map((lvl, idx) => ({ lvl, idx }));
      indexed.sort((a, b) => ((b.lvl.height || 0) * 1000000 + (b.lvl.bitrate || 0)) - ((a.lvl.height || 0) * 1000000 + (a.lvl.bitrate || 0)));

      indexed.forEach(({ lvl, idx }) => {
        const btn = document.createElement('button');
        const isCurrentActive = state.selectedQuality === `lvl_${idx}`;
        btn.className = 'quality-opt' + (isCurrentActive ? ' active' : '');
        const height = lvl.height;
        const label = height ? `${height}p ${height >= 1080 ? 'Full HD' : (height >= 720 ? 'HD' : 'SD')}` : `${Math.round(lvl.bitrate / 1000)} kbps`;
        btn.innerHTML = `<span>${label}</span>`;

        btn.addEventListener('click', () => {
          state.selectedQuality = `lvl_${idx}`;
          stopUpscaling();
          if (state.hls) state.hls.currentLevel = idx;
          DOM.qualityLabel.textContent = height ? `${height}p` : label;
          highlightQualityBtn(btn);
          DOM.qualityDropdown.classList.remove('show');
        });

        DOM.qualityDropdown.appendChild(btn);
      });
    }

    updateQualityLabel();
  }

  function updateQualityLabel() {
    if (state.selectedQuality === '4k') {
      DOM.qualityLabel.innerHTML = '<span class="quality-badge-4k">4K UHD</span>';
      return;
    }
    if (state.selectedQuality === '2k') {
      DOM.qualityLabel.innerHTML = '<span class="quality-badge-2k">2K QHD</span>';
      return;
    }
    if (!state.hls) return;
    if (state.hls.currentLevel === -1) {
      const current = state.hls.levels[state.hls.loadLevel];
      if (current && current.height) {
        DOM.qualityLabel.textContent = `Auto (${current.height}p)`;
      } else {
        DOM.qualityLabel.textContent = 'Auto';
      }
    } else {
      const lvl = state.hls.levels[state.hls.currentLevel];
      if (lvl && lvl.height) {
        DOM.qualityLabel.textContent = `${lvl.height}p`;
      }
    }
  }

  function setupDvrControls() {
    const video = DOM.mainVideo;

    DOM.rewind10Btn.addEventListener('click', () => {
      seekRelative(-10);
    });

    DOM.rewind30Btn.addEventListener('click', () => {
      seekRelative(-30);
    });

    DOM.liveSyncBtn.addEventListener('click', () => {
      syncToLive();
    });

    DOM.dvrSeekbar.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      DOM.dvrSeekbar.style.setProperty('--seek-pct', `${val}%`);

      if (!video.seekable || !video.seekable.length) return;
      const start = video.seekable.start(0);
      const end = video.seekable.end(video.seekable.length - 1);

      if (val >= 98) {
        syncToLive();
        return;
      }

      state.isLive = false;
      const targetTime = start + ((end - start) * (val / 100));
      video.currentTime = targetTime;
      checkLiveStatus();
    });

    video.addEventListener('timeupdate', () => {
      updateDvrSeekbar();
      checkLiveStatus();
    });
  }

  function seekRelative(seconds) {
    const video = DOM.mainVideo;
    if (video.seekable && video.seekable.length > 0) {
      const start = video.seekable.start(0);
      const end = video.seekable.end(video.seekable.length - 1);
      let target = video.currentTime + seconds;
      if (target < start) target = start;
      if (target > end) target = end;
      video.currentTime = target;

      const diff = Math.max(0, Math.round(end - target));
      showToastOsd(`⏪ ${Math.abs(seconds)} sn Geri Sarıldı (-${diff} sn geride)`);
      checkLiveStatus();
    } else {
      video.currentTime = Math.max(0, video.currentTime + seconds);
      checkLiveStatus();
    }
  }

  function syncToLive() {
    if (state.isCatchup) {
      exitCatchupAndSyncLive();
      return;
    }
    const video = DOM.mainVideo;
    if (state.hls && state.hls.liveSyncPosition) {
      video.currentTime = state.hls.liveSyncPosition;
    } else if (video.seekable && video.seekable.length) {
      video.currentTime = video.seekable.end(video.seekable.length - 1);
    }
    video.play();
    state.isLive = true;
    updateLiveIndicator(true, 0);
    DOM.dvrSeekbar.value = 100;
    DOM.dvrSeekbar.style.setProperty('--seek-pct', '100%');
    DOM.dvrTooltip.style.display = 'none';
    showToastOsd('Canlı yayına dönüldü');
  }

  function showToastOsd(text) {
    DOM.osdNumber.textContent = 'DVR';
    DOM.osdName.textContent = text;
    DOM.osdProgram.textContent = state.activeChannel ? state.activeChannel.name : 'Canlı Yayın';
    DOM.tvOsd.classList.add('show');
    clearTimeout(osdTimeout);
    osdTimeout = setTimeout(() => {
      DOM.tvOsd.classList.remove('show');
    }, 2000);
  }

  function updateDvrSeekbar() {
    const video = DOM.mainVideo;
    if (!video.seekable || !video.seekable.length) {
      DOM.dvrSeekbar.value = 100;
      DOM.dvrSeekbar.style.setProperty('--seek-pct', '100%');
      DOM.dvrTooltip.style.display = 'none';
      return;
    }
    const start = video.seekable.start(0);
    const end = video.seekable.end(video.seekable.length - 1);
    const duration = end - start;
    if (duration <= 0.5) {
      DOM.dvrSeekbar.value = 100;
      DOM.dvrSeekbar.style.setProperty('--seek-pct', '100%');
      DOM.dvrTooltip.style.display = 'none';
      return;
    }

    if (state.isLive) {
      DOM.dvrSeekbar.value = 100;
      DOM.dvrSeekbar.style.setProperty('--seek-pct', '100%');
      DOM.dvrTooltip.style.display = 'none';
      return;
    }

    const currentOffset = video.currentTime - start;
    const percent = Math.min(100, Math.max(0, (currentOffset / duration) * 100));
    DOM.dvrSeekbar.value = percent;
    DOM.dvrSeekbar.style.setProperty('--seek-pct', `${percent}%`);

    const behind = Math.max(0, Math.round(end - video.currentTime));
    if (behind > 3) {
      const mins = Math.floor(behind / 60);
      const secs = behind % 60;
      DOM.dvrTooltip.textContent = `-${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      DOM.dvrTooltip.style.display = 'block';
      DOM.dvrTooltip.style.left = `${percent}%`;
    } else {
      DOM.dvrTooltip.style.display = 'none';
    }
  }

  function checkLiveStatus() {
    const video = DOM.mainVideo;
    if (!video.seekable || !video.seekable.length) return;
    const liveEnd = state.hls && state.hls.liveSyncPosition ? state.hls.liveSyncPosition : video.seekable.end(video.seekable.length - 1);
    const diff = liveEnd - video.currentTime;

    if (diff <= 6) {
      state.isLive = true;
      updateLiveIndicator(true, 0);
      DOM.dvrSeekbar.value = 100;
      DOM.dvrSeekbar.style.setProperty('--seek-pct', '100%');
      DOM.dvrTooltip.style.display = 'none';
    } else {
      state.isLive = false;
      updateLiveIndicator(false, Math.round(diff));
    }
  }

  function updateLiveIndicator(isLive, behindSeconds) {
    if (isLive) {
      DOM.liveSyncBtn.classList.add('is-live');
      DOM.liveBtnText.textContent = 'CANLI';
    } else {
      DOM.liveSyncBtn.classList.remove('is-live');
      const mins = Math.floor(behindSeconds / 60);
      const secs = behindSeconds % 60;
      const formatted = `-${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      DOM.liveBtnText.textContent = `${formatted} CANLIYA DÖN`;
    }
  }

  let audioCtx = null;
  let audioSourceNode = null;
  let eqBassNode = null;
  let eqMidNode = null;
  let eqTrebleNode = null;
  let eqCompressorNode = null;
  let audioGainNode = null;
  let audioAnalyserNode = null;
  let analyserData = null;
  let eqInitialized = false;
  let isSmartLimiterActive = localStorage.getItem('rainbowtv_smart_limiter') !== 'false';
  let limiterMonitoringActive = false;

  const AUDIO_PRESETS = {
    standard: { bass: 0, mid: 0, treble: 0, compressor: false, name: 'Standart (Düz)' },
    dialogue: { bass: -4, mid: 7, treble: 4, compressor: true, name: 'Diyalog Netleştirici' },
    cinema: { bass: 8, mid: 1, treble: 3, compressor: false, name: 'Sinema & Derin Bas' },
    night: { bass: -5, mid: 4, treble: -2, compressor: true, name: 'Gece Modu' },
    music: { bass: 5, mid: 2, treble: 5, compressor: false, name: 'Müzik & Canlı Sahne' }
  };
  let activeAudioPreset = 'standard';

  function initWebAudioGraph() {
    if (eqInitialized) {
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;
      audioCtx = new AudioCtxClass();

      audioSourceNode = audioCtx.createMediaElementSource(DOM.mainVideo);

      eqBassNode = audioCtx.createBiquadFilter();
      eqBassNode.type = 'peaking';
      eqBassNode.frequency.value = 100;
      eqBassNode.Q.value = 1.0;
      eqBassNode.gain.value = 0;

      eqMidNode = audioCtx.createBiquadFilter();
      eqMidNode.type = 'peaking';
      eqMidNode.frequency.value = 2500;
      eqMidNode.Q.value = 1.2;
      eqMidNode.gain.value = 0;

      eqTrebleNode = audioCtx.createBiquadFilter();
      eqTrebleNode.type = 'highshelf';
      eqTrebleNode.frequency.value = 8000;
      eqTrebleNode.gain.value = 0;

      eqCompressorNode = audioCtx.createDynamicsCompressor();
      eqCompressorNode.threshold.value = -24;
      eqCompressorNode.knee.value = 16;
      eqCompressorNode.ratio.value = 14;
      eqCompressorNode.attack.value = 0.003;
      eqCompressorNode.release.value = 0.22;

      audioGainNode = audioCtx.createGain();
      audioGainNode.gain.value = 1.0;

      audioAnalyserNode = audioCtx.createAnalyser();
      audioAnalyserNode.fftSize = 256;
      audioAnalyserNode.smoothingTimeConstant = 0.35;
      analyserData = new Uint8Array(audioAnalyserNode.frequencyBinCount);

      audioSourceNode.connect(eqBassNode);
      eqBassNode.connect(eqMidNode);
      eqMidNode.connect(eqTrebleNode);
      eqTrebleNode.connect(eqCompressorNode);
      eqCompressorNode.connect(audioGainNode);
      audioGainNode.connect(audioAnalyserNode);
      audioAnalyserNode.connect(audioCtx.destination);

      eqInitialized = true;

      startSmartLimiterMonitoring();

      const saved = localStorage.getItem('rainbowtv_audio_preset');
      if (saved && AUDIO_PRESETS[saved]) {
        applyAudioPreset(saved, false);
      }
      setSmartVolumeLimiter(isSmartLimiterActive, false);
    } catch (err) {
      console.warn('Web Audio başlatılamadı:', err);
    }
  }

  function setSmartVolumeLimiter(enabled, showToast = true) {
    isSmartLimiterActive = enabled;
    localStorage.setItem('rainbowtv_smart_limiter', enabled ? 'true' : 'false');

    if (DOM.smartLimiterToggle) DOM.smartLimiterToggle.checked = enabled;
    if (DOM.quickLimiterBtn) {
      DOM.quickLimiterBtn.classList.toggle('active', enabled);
      DOM.quickLimiterBtn.title = `Akıllı Reklam Sesi Dengeleyici: ${enabled ? 'Aktif (Korumalı)' : 'Devre Dışı'}`;
    }

    if (eqCompressorNode) {

      eqCompressorNode.threshold.value = enabled ? -24 : (activeAudioPreset === 'night' ? -28 : 0);
    }

    if (!enabled) {
      if (audioGainNode && audioCtx) {
        audioGainNode.gain.setTargetAtTime(1.0, audioCtx.currentTime, 0.1);
      }
      if (DOM.limiterActiveBadge) DOM.limiterActiveBadge.style.display = 'none';
      if (DOM.limiterDbText) {
        DOM.limiterDbText.textContent = 'Kapalı';
        DOM.limiterDbText.style.color = 'var(--text-muted)';
      }
      if (DOM.limiterMeterFill) DOM.limiterMeterFill.style.width = '0%';
    }

    if (showToast) {
      showToastOsd(`Akıllı Reklam Dengeleyici: ${enabled ? 'Açık (Korumalı)' : 'Kapalı'}`);
    }
  }

  function startSmartLimiterMonitoring() {
    if (limiterMonitoringActive) return;
    limiterMonitoringActive = true;

    setInterval(() => {
      if (!audioCtx || !audioAnalyserNode || !analyserData) return;
      if (DOM.mainVideo.paused || DOM.mainVideo.muted || DOM.mainVideo.volume === 0) {
        if (DOM.limiterMeterFill) DOM.limiterMeterFill.style.width = '0%';
        if (DOM.limiterDbText) DOM.limiterDbText.textContent = '-∞ dB';
        if (DOM.limiterActiveBadge) DOM.limiterActiveBadge.style.display = 'none';
        return;
      }

      audioAnalyserNode.getByteTimeDomainData(analyserData);
      let sumSquares = 0;
      for (let i = 0; i < analyserData.length; i++) {
        const norm = (analyserData[i] - 128) / 128;
        sumSquares += norm * norm;
      }
      const rms = Math.sqrt(sumSquares / analyserData.length);
      const db = 20 * Math.log10(Math.max(rms, 0.00001));

      const pct = Math.max(0, Math.min(100, ((db + 45) / 45) * 100));
      if (DOM.limiterMeterFill && isSmartLimiterActive) {
        DOM.limiterMeterFill.style.width = pct.toFixed(1) + '%';
      }

      const AD_LOUDNESS_CEILING = -13.5;

      if (isSmartLimiterActive && db > AD_LOUDNESS_CEILING) {
        const excess = db - AD_LOUDNESS_CEILING;
        const reductionDb = Math.min(excess * 0.85, 12); 
        const targetGain = Math.pow(10, -reductionDb / 20);

        if (audioGainNode) {
          audioGainNode.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.04);
        }

        if (DOM.limiterActiveBadge) {
          DOM.limiterActiveBadge.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path></svg> <span>Reklam Sesi Dengelendi (-${reductionDb.toFixed(1)} dB)</span>`;
          DOM.limiterActiveBadge.style.display = 'flex';
        }

        if (DOM.limiterDbText) {
          DOM.limiterDbText.textContent = `${db.toFixed(1)} dB (Kısıldı: -${reductionDb.toFixed(1)} dB)`;
          DOM.limiterDbText.style.color = '#10b981';
        }
      } else {

        if (audioGainNode) {
          audioGainNode.gain.setTargetAtTime(1.0, audioCtx.currentTime, 0.22);
        }

        if (DOM.limiterActiveBadge) {
          DOM.limiterActiveBadge.style.display = 'none';
        }

        if (DOM.limiterDbText && isSmartLimiterActive) {
          DOM.limiterDbText.textContent = `${db.toFixed(1)} dB (Normal)`;
          DOM.limiterDbText.style.color = 'var(--text-muted)';
        }
      }
    }, 65);
  }

  function applyAudioPreset(presetKey, showToast = true) {
    const config = AUDIO_PRESETS[presetKey];
    if (!config) return;
    activeAudioPreset = presetKey;
    localStorage.setItem('rainbowtv_audio_preset', presetKey);

    initWebAudioGraph();

    if (eqBassNode) eqBassNode.gain.value = config.bass;
    if (eqMidNode) eqMidNode.gain.value = config.mid;
    if (eqTrebleNode) eqTrebleNode.gain.value = config.treble;

    if (eqCompressorNode) {
      if (config.compressor || isSmartLimiterActive) {
        eqCompressorNode.threshold.value = presetKey === 'night' ? -28 : -24;
      } else {
        eqCompressorNode.threshold.value = 0;
      }
    }

    if (DOM.audioEqCurrentBadge) {
      DOM.audioEqCurrentBadge.textContent = config.name;
    }
    document.querySelectorAll('.audio-eq-preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === presetKey);
    });

    if (DOM.eqBassSlider) DOM.eqBassSlider.value = config.bass;
    if (DOM.eqMidSlider) DOM.eqMidSlider.value = config.mid;
    if (DOM.eqTrebleSlider) DOM.eqTrebleSlider.value = config.treble;
    if (DOM.eqBassVal) DOM.eqBassVal.textContent = `${config.bass > 0 ? '+' : ''}${config.bass} dB`;
    if (DOM.eqMidVal) DOM.eqMidVal.textContent = `${config.mid > 0 ? '+' : ''}${config.mid} dB`;
    if (DOM.eqTrebleVal) DOM.eqTrebleVal.textContent = `${config.treble > 0 ? '+' : ''}${config.treble} dB`;

    if (showToast) {
      showToastOsd(`Ses Modu: ${config.name}`);
    }
  }

  function setupAudioEqualizer() {
    if (!DOM.audioEqBtn || !DOM.audioEqDropdown) return;

    DOM.audioEqBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      initWebAudioGraph();
      DOM.audioEqDropdown.classList.toggle('show');
      if (DOM.qualityDropdown) DOM.qualityDropdown.classList.remove('show');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.audio-eq-selector-wrap')) {
        DOM.audioEqDropdown.classList.remove('show');
      }
    });

    document.querySelectorAll('.audio-eq-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        applyAudioPreset(preset, true);
      });
    });

    if (DOM.eqBassSlider) {
      DOM.eqBassSlider.addEventListener('input', (e) => {
        initWebAudioGraph();
        const v = parseFloat(e.target.value);
        if (eqBassNode) eqBassNode.gain.value = v;
        if (DOM.eqBassVal) DOM.eqBassVal.textContent = `${v > 0 ? '+' : ''}${v} dB`;
        if (DOM.audioEqCurrentBadge) DOM.audioEqCurrentBadge.textContent = 'Özel EQ';
      });
    }

    if (DOM.eqMidSlider) {
      DOM.eqMidSlider.addEventListener('input', (e) => {
        initWebAudioGraph();
        const v = parseFloat(e.target.value);
        if (eqMidNode) eqMidNode.gain.value = v;
        if (DOM.eqMidVal) DOM.eqMidVal.textContent = `${v > 0 ? '+' : ''}${v} dB`;
        if (DOM.audioEqCurrentBadge) DOM.audioEqCurrentBadge.textContent = 'Özel EQ';
      });
    }

    if (DOM.eqTrebleSlider) {
      DOM.eqTrebleSlider.addEventListener('input', (e) => {
        initWebAudioGraph();
        const v = parseFloat(e.target.value);
        if (eqTrebleNode) eqTrebleNode.gain.value = v;
        if (DOM.eqTrebleVal) DOM.eqTrebleVal.textContent = `${v > 0 ? '+' : ''}${v} dB`;
        if (DOM.audioEqCurrentBadge) DOM.audioEqCurrentBadge.textContent = 'Özel EQ';
      });
    }

    if (DOM.quickLimiterBtn) {
      DOM.quickLimiterBtn.addEventListener('click', () => {
        initWebAudioGraph();
        setSmartVolumeLimiter(!isSmartLimiterActive);
      });
    }

    if (DOM.smartLimiterToggle) {
      DOM.smartLimiterToggle.addEventListener('change', (e) => {
        initWebAudioGraph();
        setSmartVolumeLimiter(e.target.checked);
      });
    }

    DOM.mainVideo.addEventListener('play', () => {
      initWebAudioGraph();
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    });

    setSmartVolumeLimiter(isSmartLimiterActive, false);
  }

  let isCastingActive = false;

  function setupSmartTvCasting() {
    const video = DOM.mainVideo;
    if (!DOM.castBtn) return;

    if (window.WebKitPlaybackTargetAvailabilityEvent) {
      video.addEventListener('webkitplaybacktargetavailabilitychanged', (e) => {
        if (e.availability === 'available') {
          DOM.castBtn.style.display = 'inline-flex';
          DOM.castBtn.title = "AirPlay ile Smart TV veya Apple TV'ye Yansıt";
        }
      });
    }

    if (video.remote) {
      video.remote.watchAvailability((available) => {
        DOM.castBtn.classList.toggle('device-available', available);
      }).catch(() => {});

      video.remote.addEventListener('connecting', () => {
        showToastOsd('Akıllı TV aranıyor ve bağlanıyor...');
      });

      video.remote.addEventListener('connect', () => {
        handleCastingStarted('Akıllı TV (Kablosuz Bağlantı)');
      });

      video.remote.addEventListener('disconnect', () => {
        handleCastingStopped();
      });
    }

    window.__onGCastApiAvailable = function(isAvailable) {
      if (isAvailable && window.cast && cast.framework) {
        try {
          const castContext = cast.framework.CastContext.getInstance();
          castContext.setOptions({
            receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
            autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
          });

          castContext.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, (e) => {
            if (e.sessionState === cast.framework.SessionState.SESSION_STARTED) {
              const session = castContext.getCurrentSession();
              const castDevice = session ? session.getCastDevice().friendlyName : 'Chromecast';
              handleCastingStarted(castDevice);
              if (session && state.activeChannel) {
                loadChannelToCastSession(session, state.activeChannel);
              }
            } else if (e.sessionState === cast.framework.SessionState.SESSION_ENDED) {
              handleCastingStopped();
            }
          });
        } catch (e) {
          console.warn('CastContext başlatma hatası:', e);
        }
      }
    };

    function openCastModal() {
      if (!DOM.castModal) return;
      DOM.castModal.style.display = 'flex';
    }

    function closeCastModal() {
      if (DOM.castModal) DOM.castModal.style.display = 'none';
    }

    if (DOM.castBtn) DOM.castBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openCastModal();
    });

    if (DOM.closeCastModal) {
      DOM.closeCastModal.addEventListener('click', closeCastModal);
    }

    if (DOM.btnTriggerChromecast) {
      DOM.btnTriggerChromecast.addEventListener('click', async () => {
        if (window.cast && cast.framework) {
          try {
            const ctx = cast.framework.CastContext.getInstance();
            await ctx.requestSession();
            closeCastModal();
            return;
          } catch (err) {
            console.log('Cast requestSession:', err);
          }
        }
        showToastOsd('Ağınızdaki Chromecast / Android TV aranıyor... TV açık ve aynı Wi-Fi ağında olmalı');
      });
    }

    if (DOM.castingStopBtn) {
      DOM.castingStopBtn.addEventListener('click', () => {
        if (window.cast && cast.framework) {
          try {
            cast.framework.CastContext.getInstance().endCurrentSession(true);
          } catch (e) {}
        }
        handleCastingStopped();
      });
    }
  }

  function handleCastingStarted(deviceName) {
    isCastingActive = true;
    if (DOM.castBtn) DOM.castBtn.classList.add('is-casting');
    if (DOM.castingOverlay) {
      DOM.castingOverlay.style.display = 'flex';
      if (DOM.castingDeviceName) DOM.castingDeviceName.textContent = deviceName;
    }
    showToastOsd(`Akıllı TV'ye Yansıtıldı: ${deviceName}`);
  }

  function handleCastingStopped() {
    isCastingActive = false;
    if (DOM.castBtn) DOM.castBtn.classList.remove('is-casting');
    if (DOM.castingOverlay) DOM.castingOverlay.style.display = 'none';
    showToastOsd('Yansıtma Sonlandırıldı');
  }

  function loadChannelToCastSession(session, channel) {
    if (!session || !channel || !window.chrome || !chrome.cast || !chrome.cast.media) return;
    try {
      const streamUrl = channel.url.startsWith('http') 
        ? channel.url 
        : window.location.origin + channel.url;
      const mediaInfo = new chrome.cast.media.MediaInfo(streamUrl, 'application/x-mpegurl');
      mediaInfo.streamType = chrome.cast.media.StreamType.LIVE;
      mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
      mediaInfo.metadata.title = channel.name;
      mediaInfo.metadata.subtitle = channel.current_program || 'Canlı Yayın';
      if (channel.logo) {
        const logoUrl = channel.logo.startsWith('http') ? channel.logo : window.location.origin + channel.logo;
        mediaInfo.metadata.images = [{ url: logoUrl }];
      }
      const request = new chrome.cast.media.LoadRequest(mediaInfo);
      request.autoplay = true;
      session.loadMedia(request);
    } catch (err) {
      console.warn('Cast loadMedia hatası:', err);
    }
  }

  function setupVolumeControls() {
    const video = DOM.mainVideo;

    DOM.volumeSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      setVolume(val);
    });

    DOM.muteBtn.addEventListener('click', () => {
      toggleMute();
    });
  }

  function setVolume(val) {
    const video = DOM.mainVideo;
    video.volume = Math.max(0, Math.min(1, val));
    state.lastVolume = video.volume > 0 ? video.volume : state.lastVolume;
    DOM.volumeSlider.value = video.volume;
    DOM.volumePercent.textContent = `${Math.round(video.volume * 100)}%`;
    DOM.volumeSlider.style.setProperty('--vol-pct', `${Math.round(video.volume * 100)}%`);

    if (video.volume === 0) {
      state.isMuted = true;
      video.muted = true;
      DOM.volHighIcon.style.display = 'none';
      DOM.volMuteIcon.style.display = 'block';
    } else {
      state.isMuted = false;
      video.muted = false;
      DOM.volHighIcon.style.display = 'block';
      DOM.volMuteIcon.style.display = 'none';
    }
  }

  function toggleMute() {
    const video = DOM.mainVideo;
    if (video.muted || video.volume === 0) {
      setVolume(state.lastVolume || 1.0);
    } else {
      state.lastVolume = video.volume;
      setVolume(0);
    }
  }

  function setupDraggableFloatingPlayer() {
    DOM.floatPlayerBtn.addEventListener('click', () => {
      toggleFloatingPlayer();
    });

    const el = DOM.playerContainer;
    let isDragging = false;
    let startX, startY, initialX, initialY;

    el.addEventListener('mousedown', (e) => {
      if (!state.isFloating) return;
      if (e.target.closest('#playerControls') || e.target.closest('#statsForNerds')) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = el.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;
      el.style.transition = 'none';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging || !state.isFloating) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      el.style.left = `${initialX + dx}px`;
      el.style.top = `${initialY + dy}px`;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        el.style.transition = '';
      }
    });
  }

  function toggleFloatingPlayer() {
    state.isFloating = !state.isFloating;
    DOM.playerContainer.classList.toggle('is-floating', state.isFloating);
    if (!state.isFloating) {
      DOM.playerContainer.style.left = '';
      DOM.playerContainer.style.top = '';
      DOM.playerContainer.style.right = '';
      DOM.playerContainer.style.bottom = '';
    }
  }

  function setupStatsForNerds() {
    DOM.toggleStatsBtn.addEventListener('click', () => {
      state.statsVisible = !state.statsVisible;
      DOM.statsForNerds.style.display = state.statsVisible ? 'block' : 'none';
      if (state.statsVisible) {
        startStatsMonitor();
      } else {
        clearInterval(state.statsInterval);
      }
    });

    DOM.closeStatsBtn.addEventListener('click', () => {
      state.statsVisible = false;
      DOM.statsForNerds.style.display = 'none';
      clearInterval(state.statsInterval);
    });
  }

  function startStatsMonitor() {
    clearInterval(state.statsInterval);
    state.statsInterval = setInterval(() => {
      if (!state.statsVisible) return;
      const video = DOM.mainVideo;

      if (isUpscalingActive) {
        DOM.statRes.textContent = `${upscaleTarget.width}x${upscaleTarget.height} (${upscaleTarget.label})`;
        if (DOM.statMode) DOM.statMode.textContent = `WebGL 2.0 GPU Super-Res (${upscaleTarget.width}x${upscaleTarget.height})`;
        DOM.statFps.textContent = `${realFps || 60} fps`;
      } else {
        DOM.statRes.textContent = video.videoWidth ? `${video.videoWidth}x${video.videoHeight}` : '-';
        if (DOM.statMode) DOM.statMode.textContent = 'HLS.js Native';
        if (video.getVideoPlaybackQuality) {
          DOM.statFps.textContent = '50 fps';
        }
      }

      if (state.hls && state.hls.bandwidthEstimate) {
        const mbps = (state.hls.bandwidthEstimate / (1024 * 1024)).toFixed(2);
        DOM.statBitrate.textContent = `${mbps} Mbps`;
      } else {
        DOM.statBitrate.textContent = 'Auto Detect';
      }

      if (video.buffered.length > 0) {
        const end = video.buffered.end(video.buffered.length - 1);
        const buf = Math.max(0, end - video.currentTime).toFixed(1);
        DOM.statBuffer.textContent = `${buf} saniye`;
      }

      if (video.getVideoPlaybackQuality) {
        const q = video.getVideoPlaybackQuality();
        DOM.statDropped.textContent = `${q.droppedVideoFrames} / ${q.totalVideoFrames}`;
        DOM.statFps.textContent = '50 fps';
      }

      if (state.hls && state.hls.latency) {
        DOM.statLatency.textContent = `${state.hls.latency.toFixed(2)} s`;
      } else {
        DOM.statLatency.textContent = '1.8 s (Ultra Low)';
      }
    }, 1000);
  }

  function showHoverPreview(channel, event) {
    DOM.previewLogo.src = channel.logo;
    DOM.previewChName.textContent = channel.name;
    DOM.previewProgTitle.textContent = channel.current_program || 'Canlı Yayın';
    DOM.previewProgTime.textContent = channel.current_desc ? channel.current_desc.substring(0, 45) + '...' : 'Canlı Akış';

    updateHoverPreviewPos(event);
    DOM.hoverPreviewTooltip.classList.add('show');
  }

  function updateHoverPreviewPos(e) {
    const x = e.clientX + 18;
    const y = e.clientY - 40;
    DOM.hoverPreviewTooltip.style.left = `${Math.min(window.innerWidth - 240, x)}px`;
    DOM.hoverPreviewTooltip.style.top = `${Math.max(10, Math.min(window.innerHeight - 180, y))}px`;
  }

  function hideHoverPreview() {
    DOM.hoverPreviewTooltip.classList.remove('show');
  }

  function setupMultiview() {
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        switchView(view);
      });
    });
  }

  function switchView(view) {
    state.currentView = view;
    document.querySelectorAll('.view-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.view === view);
    });

    if (view === 'single') {
      DOM.singlePlayerWrapper.style.display = 'flex';
      DOM.multiviewGrid.style.display = 'none';
      destroyMultiviewPlayers();
      if (state.activeChannel) {
        playStream(state.activeChannel.url, state.activeChannel.backup_url);
      }
    } else {
      stopUpscaling();
      DOM.mainVideo.pause();
      DOM.singlePlayerWrapper.style.display = 'none';
      DOM.multiviewGrid.style.display = 'grid';
      DOM.multiviewGrid.className = `multiview-grid ${view}`;
      buildMultiviewCells(view === 'dual' ? 2 : 4);
    }
  }

  function buildMultiviewCells(count) {
    destroyMultiviewPlayers();
    DOM.multiviewGrid.innerHTML = '';

    const channelsToPlay = state.channels.slice(0, count);

    for (let i = 0; i < count; i++) {
      const defaultCh = channelsToPlay[i] || state.channels[0];
      const cell = document.createElement('div');
      cell.className = `mv-cell ${i === 0 ? 'active-audio' : ''}`;
      cell.dataset.index = i;

      cell.innerHTML = `
        <div class="mv-header">
          <select class="mv-select" data-index="${i}">
            ${state.channels.map(c => `<option value="${c.num}" ${c.num === defaultCh.num ? 'selected' : ''}>${c.num}. ${c.name}</option>`).join('')}
          </select>
          <button class="mv-audio-btn" data-index="${i}">${i === 0 ? 'Ses Açık' : 'Sessiz'}</button>
        </div>
        <div class="mv-video-wrap">
          <video id="mvVideo_${i}" playsinline ${i === 0 ? '' : 'muted'}></video>
        </div>
      `;

      DOM.multiviewGrid.appendChild(cell);

      const vid = cell.querySelector('video');
      let cellHls = null;

      function loadCell(targetCh) {
        if (!targetCh) return;
        if (cellHls) {
          cellHls.destroy();
          cellHls = null;
        }

        const source = targetCh.url.startsWith('/') ? targetCh.url : `/proxy?url=${encodeURIComponent(targetCh.url)}`;
        const isAudio = targetCh.category === 'Radyo' || (!targetCh.url.includes('.m3u8') && (targetCh.url.endsWith('.mp3') || targetCh.url.endsWith('.aac') || targetCh.url.endsWith(';')));

        if (isAudio) {
          vid.src = source;
          vid.play().catch(() => {});
        } else if (Hls.isSupported()) {
          cellHls = new Hls({ enableWorker: true, backBufferLength: 30, maxBufferLength: 15 });
          cellHls.loadSource(source);
          cellHls.attachMedia(vid);
          cellHls.on(Hls.Events.MANIFEST_PARSED, () => vid.play().catch(() => {}));
        } else if (vid.canPlayType('application/vnd.apple.mpegurl')) {
          vid.src = source;
          vid.play().catch(() => {});
        }
      }

      loadCell(defaultCh);
      state.mvPlayers.push({ getHls: () => cellHls, video: vid, channel: defaultCh });

      const select = cell.querySelector('.mv-select');
      select.addEventListener('change', (e) => {
        const chosenNum = parseInt(e.target.value);
        const ch = state.channels.find(c => c.num === chosenNum);
        if (ch) {
          loadCell(ch);
        }
      });

      const audioBtn = cell.querySelector('.mv-audio-btn');
      audioBtn.addEventListener('click', () => {
        setMultiviewActiveAudio(i);
      });
    }
  }

  function setMultiviewActiveAudio(activeIndex) {
    document.querySelectorAll('.mv-cell').forEach((cell, idx) => {
      const btn = cell.querySelector('.mv-audio-btn');
      const vid = cell.querySelector('video');
      if (idx === activeIndex) {
        cell.classList.add('active-audio');
        if (vid) vid.muted = false;
        if (btn) btn.textContent = 'Ses Açık';
      } else {
        cell.classList.remove('active-audio');
        if (vid) vid.muted = true;
        if (btn) btn.textContent = 'Sessiz';
      }
    });
  }

  function destroyMultiviewPlayers() {
    state.mvPlayers.forEach(p => {
      const h = p.getHls ? p.getHls() : p.hls;
      if (h) h.destroy();
      if (p.video) {
        p.video.pause();
        p.video.removeAttribute('src');
        p.video.load();
      }
    });
    state.mvPlayers = [];
  }

  function playCatchupProgram(channel, prog, offsetSeconds = 0) {
    if (!channel || !prog) return;

    if (prog.is_current) {
      exitCatchupAndSyncLive();
      return;
    }

    state.isCatchup = true;
    state.currentCatchupProg = prog;

    if (DOM.catchupBar) {
      DOM.catchupBar.style.display = 'flex';
      DOM.catchupProgName.textContent = `${prog.start} - ${prog.title}`;
    }

    updateLiveIndicator(false, 3600);
    DOM.liveBtnText.textContent = 'CANLIYA DÖN';

    const catchupUrl = `/catchup?channel=${encodeURIComponent(channel.name)}&title=${encodeURIComponent(prog.title)}`;
    showToastOsd(`Geçmiş Yayın: ${prog.title}`);

    playStream(catchupUrl, channel.url, true);

    if (offsetSeconds > 0) {
      DOM.mainVideo.addEventListener('loadedmetadata', () => {
        DOM.mainVideo.currentTime = offsetSeconds;
      }, { once: true });
    }

    renderEpg(channel);
    renderDayScrubber(channel);
  }

  function exitCatchupAndSyncLive() {
    state.isCatchup = false;
    state.currentCatchupProg = null;
    if (DOM.catchupBar) DOM.catchupBar.style.display = 'none';

    if (state.activeChannel) {
      showToastOsd('Canlı yayına dönüldü');
      playStream(state.activeChannel.url, state.activeChannel.backup_url, true);
      renderEpg(state.activeChannel);
      renderDayScrubber(state.activeChannel);
    }
  }

  function renderDayScrubber(channel) {
    if (!DOM.dayTimelineBlocks || !channel) return;
    DOM.dayTimelineBlocks.innerHTML = '';

    const programs = channel.epg || [];
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    if (DOM.dayScrubberCurrentTime) {
      const hStr = String(now.getHours()).padStart(2, '0');
      const mStr = String(now.getMinutes()).padStart(2, '0');
      DOM.dayScrubberCurrentTime.textContent = state.isCatchup 
        ? `Geçmiş Yayın: ${state.currentCatchupProg ? state.currentCatchupProg.title : ''}`
        : `Bugün: ${hStr}:${mStr} (Canlı)`;
    }

    const livePercent = Math.min(100, Math.max(0, (nowMinutes / 1440) * 100));
    if (DOM.dayTimelineLiveLine) {
      DOM.dayTimelineLiveLine.style.left = `${livePercent}%`;
    }

    function timeToMinutes(tStr) {
      const [h, m] = tStr.split(':').map(Number);
      return h * 60 + m;
    }

    programs.forEach(prog => {
      let sMin = timeToMinutes(prog.start);
      let eMin = timeToMinutes(prog.end);
      if (eMin <= sMin) eMin += 1440; 

      const duration = eMin - sMin;
      const widthPct = (duration / 1440) * 100;
      const leftPct = (sMin / 1440) * 100;

      const isCurrent = prog.is_current;
      const isPast = !isCurrent && (eMin <= nowMinutes || (prog.timestamp_end && prog.timestamp_end * 1000 < Date.now()));
      const isFuture = !isCurrent && !isPast;

      const isSelectedCatchup = state.isCatchup && state.currentCatchupProg && state.currentCatchupProg.title === prog.title;

      const block = document.createElement('div');
      block.className = `day-prog-block ${isCurrent ? 'is-current' : ''} ${isPast ? 'is-past' : ''} ${isFuture ? 'is-future' : ''} ${isSelectedCatchup ? 'is-selected' : ''}`;
      block.style.width = `${widthPct}%`;
      block.style.left = `${leftPct}%`;
      block.dataset.title = prog.title;
      block.dataset.time = `${prog.start} - ${prog.end}`;
      block.title = `${prog.start} - ${prog.end}: ${prog.title} ${isPast ? '(Geri Sar & İzle)' : (isCurrent ? '(Canlı)' : '')}`;

      block.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isCurrent) {
          exitCatchupAndSyncLive();
        } else if (isPast) {
          playCatchupProgram(channel, prog, 0);
        }
      });

      DOM.dayTimelineBlocks.appendChild(block);
    });
  }

  function renderEpg(channel) {
    DOM.epgProgramsList.innerHTML = '';
    const programs = channel.epg || [];

    if (programs.length === 0) {
      DOM.epgProgramsList.innerHTML = '<div class="empty-state">Bu kanal için yayın akışı bilgisi güncelleniyor...</div>';
      return;
    }

    programs.forEach(prog => {
      const isPast = !prog.is_current && prog.progress === 0 && (prog.timestamp_end * 1000 < Date.now());
      const hasAlarm = state.alarms.some(a => a.channelNum === channel.num && a.title === prog.title);

      const card = document.createElement('div');
      card.className = `epg-item ${prog.is_current ? 'current' : ''} ${isPast ? 'past' : ''}`;

      card.innerHTML = `
        <div class="epg-item-top">
          <span class="epg-time">${prog.start} - ${prog.end}</span>
          ${prog.is_current ? '<span class="epg-live-badge">CANLI YAYINDA</span>' : (isPast ? '<button class="epg-catchup-badge">Geri Sar & İzle</button>' : `
            <button class="epg-alarm-btn ${hasAlarm ? 'set' : ''}" title="${hasAlarm ? 'Alarm Kuruldu' : 'Başlayınca Bildir'}">
              ${hasAlarm ? '🔔' : '⏱'}
            </button>
          `)}
        </div>
        <div class="epg-title">${prog.title}</div>
        <div class="epg-desc">${prog.desc}</div>
      `;

      const alarmBtn = card.querySelector('.epg-alarm-btn');
      if (alarmBtn) {
        alarmBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleProgramAlarm(channel, prog, alarmBtn);
        });
      }

      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        if (e.target.closest('.epg-alarm-btn')) return;

        if (prog.is_current) {

          syncToLive();
          showToastOsd(`Canlı: ${prog.title}`);
        } else if (isPast) {
          playCatchupProgram(channel, prog, 0);
        } else {

          if (alarmBtn) toggleProgramAlarm(channel, prog, alarmBtn);
        }
      });

      DOM.epgProgramsList.appendChild(card);
    });
  }

  async function toggleProgramAlarm(channel, prog, btn) {
    if ('Notification' in window && Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Program başladığında bildirim alabilmek için tarayıcı bildirim izni vermeniz gerekmektedir.');
        return;
      }
    }

    const alarmIndex = state.alarms.findIndex(a => a.channelNum === channel.num && a.title === prog.title);

    if (alarmIndex >= 0) {

      state.alarms.splice(alarmIndex, 1);
      btn.classList.remove('set');
      btn.textContent = '⏱';
      btn.title = 'Başlayınca Bildir';
    } else {

      state.alarms.push({
        channelNum: channel.num,
        channelName: channel.name,
        title: prog.title,
        start: prog.start,
        timestamp_start: prog.timestamp_start
      });
      btn.classList.add('set');
      btn.textContent = '🔔';
      btn.title = 'Alarm Kuruldu';

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`⏰ Alarm Kuruldu: ${channel.name}`, {
          body: `"${prog.title}" saati (${prog.start}) geldiğinde size haber verilecek.`
        });
      }
    }

    localStorage.setItem('canlitv_alarms', JSON.stringify(state.alarms));
    updateAlarmsBadge();
  }

  function startAlarmMonitor() {
    setInterval(() => {
      const nowTs = Math.floor(Date.now() / 1000);
      const remainingAlarms = [];

      state.alarms.forEach(alarm => {
        if (alarm.timestamp_start && Math.abs(alarm.timestamp_start - nowTs) <= 60) {

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Program Başladı: ${alarm.channelName}`, {
              body: `"${alarm.title}" şimdi yayında! İzlemek için tıklayın.`,
              icon: '/manifest.json'
            });
          }
          playAlarmChime();
        } else if (!alarm.timestamp_start || alarm.timestamp_start > nowTs) {
          remainingAlarms.push(alarm);
        }
      });

      if (remainingAlarms.length !== state.alarms.length) {
        state.alarms = remainingAlarms;
        localStorage.setItem('canlitv_alarms', JSON.stringify(state.alarms));
        updateAlarmsBadge();
      }
    }, 30000);
  }

  function playAlarmChime() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); 
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); 
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {}
  }

  function updateAlarmsBadge() {
    DOM.alarmsCount.textContent = state.alarms.length;
  }

  function startEpgLiveSync() {
    setInterval(() => {
      if (!state.channels || state.channels.length === 0) return;
      const now = new Date();
      const currentSeconds = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();

      let activeChannelChanged = false;

      state.channels.forEach(ch => {
        if (!ch.epg || ch.epg.length === 0) return;

        let activeProg = null;
        ch.epg.forEach(p => {
          if (!p.start || !p.end) return;
          const [sh, sm] = p.start.split(':').map(Number);
          const [eh, em] = p.end.split(':').map(Number);
          const sSec = (sh * 3600) + (sm * 60);
          const eSec = (eh * 3600) + (em * 60);

          let isMatch = false;
          if (eSec > sSec) {
            isMatch = (currentSeconds >= sSec && currentSeconds < eSec);
          } else {

            isMatch = (currentSeconds >= sSec || currentSeconds < eSec);
          }

          if (isMatch) {
            p.is_current = true;
            const duration = eSec > sSec ? (eSec - sSec) : (86400 - sSec + eSec);
            const elapsed = currentSeconds >= sSec ? (currentSeconds - sSec) : (86400 - sSec + currentSeconds);
            p.progress = Math.min(100, Math.max(0, Math.round((elapsed / duration) * 100)));
            activeProg = p;
          } else {
            p.is_current = false;
            p.progress = currentSeconds >= eSec && eSec > sSec ? 100 : 0;
          }
        });

        if (activeProg && (ch.current_program !== activeProg.title || Math.abs((ch.current_progress || 0) - activeProg.progress) >= 2)) {
          ch.current_program = activeProg.title;
          ch.current_desc = activeProg.desc;
          ch.current_progress = activeProg.progress;

          if (state.activeChannel && state.activeChannel.num === ch.num) {
            activeChannelChanged = true;
          }
        }
      });

      if (activeChannelChanged && state.activeChannel) {
        updateActiveChannelCard(state.activeChannel);
        renderEpg(state.activeChannel);
        if (DOM.radioProgramName && (state.activeChannel.category === 'Radyo' || state.activeChannel.group === 'Radyo')) {
          DOM.radioProgramName.textContent = state.activeChannel.current_program || 'Canlı Radyo Akışı';
        }
      }
    }, 20000); 
  }

  function setupSleepTimer() {
    if (!DOM.sleepTimerBtn || !DOM.sleepModal) return;

    DOM.sleepTimerBtn.addEventListener('click', () => {
      DOM.sleepModal.style.display = 'flex';
    });

    if (DOM.closeSleepModal) {
      DOM.closeSleepModal.addEventListener('click', () => {
        DOM.sleepModal.style.display = 'none';
      });
    }

    document.querySelectorAll('.sleep-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const minutes = parseInt(btn.dataset.min);
        DOM.sleepModal.style.display = 'none';
        if (minutes === -1) {
          triggerSleepMode();
        } else {
          setSleepTimer(minutes);
        }
      });
    });

    const customInput = document.getElementById('customSleepInput');
    const customSubmit = document.getElementById('customSleepSubmit');
    if (customSubmit && customInput) {
      const handleCustom = () => {
        const val = parseInt(customInput.value);
        if (val && val > 0) {
          DOM.sleepModal.style.display = 'none';
          setSleepTimer(val);
          customInput.value = '';
        }
      };
      customSubmit.addEventListener('click', handleCustom);
      customInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleCustom();
      });
    }

    const sleepOverlay = document.getElementById('sleepOverlay');
    const wakeUpBtn = document.getElementById('wakeUpBtn');
    if (sleepOverlay) {
      sleepOverlay.addEventListener('click', () => {
        wakeUpFromSleep();
      });
    }
    if (wakeUpBtn) {
      wakeUpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        wakeUpFromSleep();
      });
    }
  }

  function setSleepTimer(minutes) {
    clearInterval(state.sleepTimerInterval);

    if (minutes === 0) {
      state.sleepTimerEnd = null;
      if (DOM.sleepTimerBtn) DOM.sleepTimerBtn.classList.remove('active');
      if (DOM.sleepTimerBadge) DOM.sleepTimerBadge.style.display = 'none';
      if (DOM.sleepTimerText) DOM.sleepTimerText.textContent = 'Uyku Modu';
      showToastOsd('Uyku zamanlayıcısı iptal edildi');
      return;
    }

    state.sleepTimerEnd = Date.now() + (minutes * 60 * 1000);
    showToastOsd(`🌙 Uyku modu ayarlandı: ${minutes} dakika sonra yayın kapatılacak`);

    const updateTick = () => {
      const leftMs = state.sleepTimerEnd - Date.now();
      if (leftMs <= 0) {
        clearInterval(state.sleepTimerInterval);
        state.sleepTimerEnd = null;
        if (DOM.sleepTimerBtn) DOM.sleepTimerBtn.classList.remove('active');
        if (DOM.sleepTimerBadge) DOM.sleepTimerBadge.style.display = 'none';
        if (DOM.sleepTimerText) DOM.sleepTimerText.textContent = 'Uyku Modu';
        triggerSleepMode();
      } else {
        const mins = Math.floor(leftMs / 60000);
        const secs = Math.floor((leftMs % 60000) / 1000);
        const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        if (DOM.sleepTimerBtn) DOM.sleepTimerBtn.classList.add('active');
        if (DOM.sleepTimerBadge) {
          DOM.sleepTimerBadge.textContent = mins > 0 ? `${mins}dk` : `${secs}s`;
          DOM.sleepTimerBadge.style.display = 'inline-block';
        }
        if (DOM.sleepTimerText) {
          DOM.sleepTimerText.textContent = timeStr;
        }
      }
    };

    updateTick();
    state.sleepTimerInterval = setInterval(updateTick, 1000);
  }

  function triggerSleepMode() {
    const video = DOM.mainVideo;
    const initialVol = (video && video.volume > 0) ? video.volume : (state.lastVolume || 1.0);
    state.preSleepVolume = initialVol;

    const fadeSteps = 10;
    const intervalTime = 150;
    let step = 0;

    const fadeTimer = setInterval(() => {
      step++;
      if (video) video.volume = Math.max(0, initialVol * (1 - (step / fadeSteps)));
      if (step >= fadeSteps) {
        clearInterval(fadeTimer);
        if (video) {
          video.pause();
          video.volume = initialVol; 
        }
        if (state.hls && typeof state.hls.stopLoad === 'function') {
          state.hls.stopLoad();
        }

        if (DOM.radioAudio && !DOM.radioAudio.paused) {
          DOM.radioAudio.pause();
        }

        const sleepOverlay = document.getElementById('sleepOverlay');
        if (sleepOverlay) sleepOverlay.style.display = 'flex';
        showToastOsd('🌙 Uyku modu aktif: Yayın duraklatıldı');
      }
    }, intervalTime);
  }

  function wakeUpFromSleep() {
    const sleepOverlay = document.getElementById('sleepOverlay');
    if (sleepOverlay) sleepOverlay.style.display = 'none';

    clearInterval(state.sleepTimerInterval);
    state.sleepTimerEnd = null;
    if (DOM.sleepTimerBtn) DOM.sleepTimerBtn.classList.remove('active');
    if (DOM.sleepTimerBadge) DOM.sleepTimerBadge.style.display = 'none';
    if (DOM.sleepTimerText) DOM.sleepTimerText.textContent = 'Uyku Modu';

    const video = DOM.mainVideo;
    if (state.hls && typeof state.hls.startLoad === 'function') {
      state.hls.startLoad();
    }

    if (video) {
      if (state.preSleepVolume) {
        setVolume(state.preSleepVolume);
      }
      video.play().catch(e => console.warn('Uyandırma oynatma hatası:', e));
    }

    showToastOsd('☀️ Yayın devam ediyor');
  }

  function setupKeyboardShortcuts() {
    let digitBuffer = '';
    let digitTimeout = null;

    window.addEventListener('keydown', (e) => {

      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      const sleepOverlay = document.getElementById('sleepOverlay');
      if (sleepOverlay && sleepOverlay.style.display === 'flex') {
        e.preventDefault();
        wakeUpFromSleep();
        return;
      }

      switch (e.code) {

        case 'ArrowUp':
          e.preventDefault();
          switchChannelRelative(-1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          switchChannelRelative(1);
          break;

        case 'ArrowRight':
          e.preventDefault();
          setVolume(Math.min(1, DOM.mainVideo.volume + 0.05));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setVolume(Math.max(0, DOM.mainVideo.volume - 0.05));
          break;

        case 'Space':
          e.preventDefault();
          togglePlayPause();
          break;

        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;

        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;

        case 'KeyP':
          e.preventDefault();
          togglePip();
          break;

        case 'KeyJ':
          e.preventDefault();
          seekRelative(-10);
          break;
        case 'KeyL':
          e.preventDefault();
          seekRelative(10);
          break;
        case 'KeyK':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'KeyR':
          e.preventDefault();
          syncToLive();
          break;

        case 'KeyZ':
          e.preventDefault();
          if (DOM.sleepModal) {
            DOM.sleepModal.style.display = (DOM.sleepModal.style.display === 'flex') ? 'none' : 'flex';
          }
          break;

        case 'Escape':
          if (DOM.shortcutsModal) DOM.shortcutsModal.style.display = 'none';
          if (DOM.sleepModal) DOM.sleepModal.style.display = 'none';
          if (DOM.alarmsModal) DOM.alarmsModal.style.display = 'none';
          if (DOM.statsForNerds) DOM.statsForNerds.style.display = 'none';
          if (DOM.qualityDropdown) DOM.qualityDropdown.classList.remove('show');
          if (state.isFloating) toggleFloatingPlayer();
          break;

        case 'Slash':
          if (e.shiftKey) {
            e.preventDefault();
            DOM.shortcutsModal.style.display = 'flex';
          }
          break;

        case 'Digit0': case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4':
        case 'Digit5': case 'Digit6': case 'Digit7': case 'Digit8': case 'Digit9':
        case 'Numpad0': case 'Numpad1': case 'Numpad2': case 'Numpad3': case 'Numpad4':
        case 'Numpad5': case 'Numpad6': case 'Numpad7': case 'Numpad8': case 'Numpad9':
          const digit = e.code.replace('Digit', '').replace('Numpad', '');
          digitBuffer += digit;
          clearTimeout(digitTimeout);

          DOM.osdNumber.textContent = digitBuffer;
          DOM.osdName.textContent = 'Kanal Numarası...';
          DOM.osdProgram.textContent = 'Atlamak için bekleniyor';
          DOM.tvOsd.classList.add('show');

          digitTimeout = setTimeout(() => {
            const targetNum = parseInt(digitBuffer);
            digitBuffer = '';
            const found = state.channels.find(c => c.num === targetNum);
            if (found) {
              selectChannel(found);
            } else {
              hideOsd();
            }
          }, 900);
          break;
      }
    });
  }

  function switchChannelRelative(direction) {
    if (!state.activeChannel || state.channels.length === 0) return;
    const currentIdx = state.channels.findIndex(c => c.num === state.activeChannel.num);
    let nextIdx = currentIdx + direction;
    if (nextIdx < 0) nextIdx = state.channels.length - 1;
    if (nextIdx >= state.channels.length) nextIdx = 0;
    selectChannel(state.channels[nextIdx]);
  }

  function toggleFavorite(num) {
    if (state.favorites.has(num)) {
      state.favorites.delete(num);
    } else {
      state.favorites.add(num);
    }
    localStorage.setItem('canlitv_favs', JSON.stringify(Array.from(state.favorites)));
    updateCategoryCounts();
    applyFilters();
    if (state.activeChannel && state.activeChannel.num === num) {
      DOM.activeFavBtn.classList.toggle('is-fav', state.favorites.has(num));
    }
  }

  function addToRecent(channel) {
    state.recentHistory = state.recentHistory.filter(n => n !== channel.num);
    state.recentHistory.unshift(channel.num);
    if (state.recentHistory.length > 5) state.recentHistory.pop();
    localStorage.setItem('canlitv_recent', JSON.stringify(state.recentHistory));
    renderRecentChannels();
  }

  function renderRecentChannels() {
    DOM.recentItems.innerHTML = '';
    if (state.recentHistory.length === 0) {
      DOM.recentStrip.style.display = 'none';
      return;
    }
    DOM.recentStrip.style.display = 'flex';

    state.recentHistory.forEach(num => {
      const ch = state.channels.find(c => c.num === num);
      if (!ch) return;
      const chip = document.createElement('button');
      chip.className = 'recent-chip';
      chip.textContent = `${ch.num}. ${ch.name}`;
      chip.addEventListener('click', () => selectChannel(ch));
      DOM.recentItems.appendChild(chip);
    });
  }

  let osdTimeout = null;
  function showOsd(channel) {
    DOM.osdNumber.textContent = channel.num;
    DOM.osdName.textContent = channel.name;
    DOM.osdProgram.textContent = channel.current_program || 'Canlı Yayın';
    DOM.tvOsd.classList.add('show');

    clearTimeout(osdTimeout);
    osdTimeout = setTimeout(() => {
      hideOsd();
    }, 2500);
  }

  function hideOsd() {
    DOM.tvOsd.classList.remove('show');
  }

  function updateActiveChannelCard(channel) {
    DOM.activeChannelLogo.src = channel.logo;
    DOM.activeChannelNum.textContent = channel.num;
    DOM.activeChannelName.textContent = channel.name;
    DOM.activeChannelCategory.textContent = channel.category;
    DOM.activeFavBtn.classList.toggle('is-fav', state.favorites.has(channel.num));

    DOM.activeProgramName.textContent = channel.current_program || 'Canlı Yayın';
    DOM.activeProgramDesc.textContent = channel.current_desc || channel.desc || 'Kesintisiz canlı TV yayını.';
    DOM.activeProgramProgress.style.width = `${channel.current_progress || 45}%`;

    const currProg = channel.epg ? channel.epg.find(p => p.is_current) : null;
    if (currProg) {
      DOM.activeProgramTime.textContent = `${currProg.start} - ${currProg.end} (İlerleme: %${currProg.progress})`;
    } else {
      DOM.activeProgramTime.textContent = 'Canlı Yayın';
    }
  }

  function toggleFullscreen() {
    const container = DOM.playerContainer || document.getElementById('playerContainer');
    const video = DOM.mainVideo;

    const isFs = Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      (video && video.webkitDisplayingFullscreen)
    );

    if (!isFs) {
      if (container && container.requestFullscreen) {
        container.requestFullscreen().catch(err => {
          console.warn('Container tam ekran hatası, video tam ekran deneniyor:', err);
          if (video && video.webkitEnterFullscreen) {
            video.webkitEnterFullscreen();
          } else if (video && video.requestFullscreen) {
            video.requestFullscreen().catch(() => {});
          }
        });
      } else if (container && container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (video && video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      } else if (video && video.requestFullscreen) {
        video.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (video && video.webkitExitFullscreen) {
        video.webkitExitFullscreen();
      }
    }
  }

  async function togglePip() {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled && DOM.mainVideo) {
        await DOM.mainVideo.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP hatası:', e);
    }
  }

  function togglePlayPause() {
    const video = DOM.mainVideo;
    if (video.paused) {
      if (video.muted && state.lastVolume > 0) {
        setVolume(state.lastVolume);
      }
      video.play().catch(err => {
        console.warn('Oynatma başlatılamadı:', err);
      });
      DOM.playIcon.style.display = 'none';
      DOM.pauseIcon.style.display = 'block';
      DOM.bigPlayBtn.classList.remove('show');
    } else {
      video.pause();
      DOM.playIcon.style.display = 'block';
      DOM.pauseIcon.style.display = 'none';
      DOM.bigPlayBtn.classList.add('show');
    }
  }

  async function fetchNewsTicker() {
    try {
      const res = await fetch('/api/news');
      if (res.ok) {
        const data = await res.json();
        if (data.news && data.news.length > 0 && DOM.tickerMarquee) {
          DOM.tickerMarquee.innerHTML = `<span>${data.news.join(' • ')}</span>`;
        }
      }
    } catch (e) {
      console.warn('Haber bandı yüklenemedi:', e);
    }
  }

  function setupEventListeners() {
    setupDvrControls();

    if (DOM.returnLiveBtn) {
      DOM.returnLiveBtn.addEventListener('click', exitCatchupAndSyncLive);
    }

    if (DOM.dayTimelineTrack) {
      DOM.dayTimelineTrack.addEventListener('mousemove', (e) => {
        const rect = DOM.dayTimelineTrack.getBoundingClientRect();
        const posX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const pct = posX / rect.width;
        const totalMin = Math.round(pct * 1440);
        const hh = String(Math.floor(totalMin / 60)).padStart(2, '0');
        const mm = String(totalMin % 60).padStart(2, '0');

        if (DOM.dayTimelineTooltip) {
          DOM.dayTimelineTooltip.textContent = `${hh}:${mm}`;
          DOM.dayTimelineTooltip.style.left = `${posX}px`;
          DOM.dayTimelineTooltip.style.display = 'block';
        }
      });

      DOM.dayTimelineTrack.addEventListener('mouseleave', () => {
        if (DOM.dayTimelineTooltip) DOM.dayTimelineTooltip.style.display = 'none';
      });

      DOM.dayTimelineTrack.addEventListener('click', (e) => {
        if (!state.activeChannel || !state.activeChannel.epg) return;
        const rect = DOM.dayTimelineTrack.getBoundingClientRect();
        const posX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const pct = posX / rect.width;
        const targetMin = Math.round(pct * 1440);
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();

        if (targetMin > nowMin) {
          showToastOsd('Gelecek saatler henüz yayınlanmadı');
          return;
        }

        function timeToMin(s) {
          const [h, m] = s.split(':').map(Number);
          return h * 60 + m;
        }

        const foundProg = state.activeChannel.epg.find(p => {
          let s = timeToMin(p.start);
          let e = timeToMin(p.end);
          if (e <= s) e += 1440;
          return targetMin >= s && targetMin < e;
        });

        if (foundProg) {
          const progStart = timeToMin(foundProg.start);
          const offsetSec = Math.max(0, (targetMin - progStart) * 60);
          playCatchupProgram(state.activeChannel, foundProg, offsetSec);
        }
      });
    }
    setupVolumeControls();
    setupStatsForNerds();
    setupMultiview();
    setupSleepTimer();
    setupAudioEqualizer();
    setupSmartTvCasting();

    DOM.playPauseBtn.addEventListener('click', togglePlayPause);
    DOM.bigPlayBtn.addEventListener('click', togglePlayPause);
    DOM.mainVideo.addEventListener('click', togglePlayPause);

    DOM.mainVideo.addEventListener('play', () => {
      DOM.playIcon.style.display = 'none';
      DOM.pauseIcon.style.display = 'block';
      DOM.bigPlayBtn.classList.remove('show');
      if (DOM.radioPlayerOverlay) DOM.radioPlayerOverlay.classList.remove('is-paused');
      if (isUpscalingActive) {
        if ('requestVideoFrameCallback' in DOM.mainVideo) {
          videoCallbackId = DOM.mainVideo.requestVideoFrameCallback(renderUpscaleFrame);
        } else {
          renderLoopId = requestAnimationFrame(renderUpscaleFrame);
        }
      }
    });

    DOM.mainVideo.addEventListener('seeked', () => {
      if (isUpscalingActive && DOM.mainVideo.readyState >= 2 && DOM.mainVideo.videoWidth > 0 && gl && glProgram) {
        gl.useProgram(glProgram);
        gl.bindTexture(gl.TEXTURE_2D, videoTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, DOM.mainVideo);
        gl.viewport(0, 0, DOM.upscaleCanvas.width, DOM.upscaleCanvas.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    });

    DOM.mainVideo.addEventListener('dblclick', toggleFullscreen);

    DOM.mainVideo.addEventListener('pause', () => {
      DOM.playIcon.style.display = 'block';
      DOM.pauseIcon.style.display = 'none';
      DOM.bigPlayBtn.classList.add('show');
      if (DOM.radioPlayerOverlay) DOM.radioPlayerOverlay.classList.add('is-paused');
    });

    DOM.mainVideo.addEventListener('waiting', () => {
      showSpinner(true);
    });

    DOM.mainVideo.addEventListener('playing', () => {
      showSpinner(false);
      DOM.bigPlayBtn.classList.remove('show');
    });

    DOM.mainVideo.addEventListener('canplay', () => {
      showSpinner(false);
    });

    DOM.pipBtn.addEventListener('click', togglePip);
    DOM.fullscreenBtn.addEventListener('click', toggleFullscreen);

    if (DOM.mobileQuickFsBtn) {
      DOM.mobileQuickFsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFullscreen();
      });
    }

    function updateFullscreenIcons() {
      const isFs = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement ||
        (DOM.mainVideo && DOM.mainVideo.webkitDisplayingFullscreen)
      );
      if (DOM.enterFsIcon) DOM.enterFsIcon.style.display = isFs ? 'none' : 'block';
      if (DOM.exitFsIcon) DOM.exitFsIcon.style.display = isFs ? 'block' : 'none';
      if (DOM.mobileEnterFsIcon) DOM.mobileEnterFsIcon.style.display = isFs ? 'none' : 'block';
      if (DOM.mobileExitFsIcon) DOM.mobileExitFsIcon.style.display = isFs ? 'block' : 'none';
    }

    document.addEventListener('fullscreenchange', updateFullscreenIcons);
    document.addEventListener('webkitfullscreenchange', updateFullscreenIcons);
    if (DOM.mainVideo) {
      DOM.mainVideo.addEventListener('webkitbeginfullscreen', updateFullscreenIcons);
      DOM.mainVideo.addEventListener('webkitendfullscreen', updateFullscreenIcons);
    }

    DOM.qualityMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      DOM.qualityDropdown.classList.toggle('show');
    });

    window.addEventListener('click', () => {
      DOM.qualityDropdown.classList.remove('show');
    });

    DOM.activeFavBtn.addEventListener('click', () => {
      if (state.activeChannel) toggleFavorite(state.activeChannel.num);
    });

    DOM.categoryTabs.querySelectorAll('.cat-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        DOM.categoryTabs.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.activeCategory = pill.dataset.category;
        applyFilters();
      });
    });

    DOM.channelSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      DOM.clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
      applyFilters();
    });

    DOM.clearSearchBtn.addEventListener('click', () => {
      DOM.channelSearchInput.value = '';
      state.searchQuery = '';
      DOM.clearSearchBtn.style.display = 'none';
      applyFilters();
    });

    if (DOM.tickerToggleBtn) DOM.tickerToggleBtn.addEventListener('click', () => {
      if (DOM.tickerWrapper) DOM.tickerWrapper.style.display = 'none';
      const mainEl = document.querySelector('.app-main');
      if (mainEl) mainEl.style.height = `calc(100vh - var(--header-height))`;
    });

    DOM.alarmsBtn.addEventListener('click', () => {
      renderAlarmsModal();
      DOM.alarmsModal.style.display = 'flex';
    });

    DOM.closeAlarmsModal.addEventListener('click', () => {
      DOM.alarmsModal.style.display = 'none';
    });

    DOM.shortcutsBtn.addEventListener('click', () => {
      DOM.shortcutsModal.style.display = 'flex';
    });

    DOM.closeShortcutsModal.addEventListener('click', () => {
      DOM.shortcutsModal.style.display = 'none';
    });

    DOM.refreshBtn.addEventListener('click', async () => {
      DOM.refreshBtn.style.transform = 'rotate(360deg)';
      DOM.refreshBtn.style.transition = 'transform 0.6s ease';
      await loadChannels();
      setTimeout(() => {
        DOM.refreshBtn.style.transform = '';
        DOM.refreshBtn.style.transition = '';
      }, 600);
    });

    DOM.retryStreamBtn.addEventListener('click', () => {
      if (state.activeChannel) {
        playStream(state.activeChannel.url, state.activeChannel.backup_url);
      }
    });

    [DOM.shortcutsModal, DOM.sleepModal, DOM.alarmsModal, DOM.castModal].forEach(modal => {
      if (!modal) return;
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
    });
  }

  function renderAlarmsModal() {
    DOM.alarmsList.innerHTML = '';
    if (state.alarms.length === 0) {
      DOM.alarmsList.innerHTML = '<div class="empty-state">Henüz kurulmuş bir program alarmı bulunmuyor. Yayın akışından (EPG) zil butonuna basarak alarm kurabilirsiniz.</div>';
      return;
    }

    state.alarms.forEach((alarm, idx) => {
      const item = document.createElement('div');
      item.className = 'sc-item';
      item.innerHTML = `
        <div>
          <strong>${alarm.channelName}:</strong> ${alarm.title}
          <div style="font-size:11px; color:var(--text-muted);">Başlangıç: ${alarm.start}</div>
        </div>
        <button class="clear-btn" style="color:#ef4444;" title="Alarmı Sil">✕</button>
      `;
      item.querySelector('button').addEventListener('click', () => {
        state.alarms.splice(idx, 1);
        localStorage.setItem('canlitv_alarms', JSON.stringify(state.alarms));
        updateAlarmsBadge();
        renderAlarmsModal();
        if (state.activeChannel) renderEpg(state.activeChannel);
      });
      DOM.alarmsList.appendChild(item);
    });
  }

  function showSpinner(show) {
    DOM.playerSpinner.style.display = show ? 'flex' : 'none';
  }

  function showError(title, desc) {
    document.getElementById('errTitle').textContent = title;
    document.getElementById('errDesc').textContent = desc;
    DOM.playerError.style.display = 'flex';
    DOM.playerSpinner.style.display = 'none';
  }

  function hideError() {
    DOM.playerError.style.display = 'none';
  }

  document.addEventListener('DOMContentLoaded', init);

})();
