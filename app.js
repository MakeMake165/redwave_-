(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const audio = $('audio');
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const state = {
    tracks: [], current: null, queue: [], view: 'home',
    favorites: new Set(read('rw-favorites', [])),
    playlists: read('rw-playlists', [{ id: 'liked', name: 'Любимые вайбы', tracks: [] }]),
    clientId: localStorage.getItem('rw-jamendo-client-id') || ''
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  const toast = message => { const el = $('toast'); if (!el) return; el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); };
  const persist = () => { localStorage.setItem('rw-favorites', JSON.stringify([...state.favorites])); localStorage.setItem('rw-playlists', JSON.stringify(state.playlists)); };
  const cover = track => track.artworkUrl100 || '';
  const normalize = track => ({
    id: String(track.id), title: track.name || 'Без названия', artist: track.artist_name || 'Неизвестный исполнитель',
    artworkUrl100: track.album_image || track.image || '', audioUrl: track.audio || '',
    genre: (track.musicinfo?.tags?.genres || []).join(', ') || 'Jamendo', duration: Number(track.duration) || 0,
    license: track.license_ccurl || '', shareUrl: track.shareurl || ''
  });
  function formatTime(seconds) {
    const n = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
  }
  async function search(term = 'electronic') {
    if (!state.clientId) {
      $('status').textContent = 'Подключи Jamendo: нажми значок профиля и введи свой Client ID.';
      $('trackList').innerHTML = '<div class="status">Для каталога полных треков нужен бесплатный Jamendo Client ID. Нажми значок профиля вверху.</div>';
      return;
    }
    $('status').textContent = 'Загружаем треки с полным потоковым аудио…';
    $('trackList').innerHTML = '';
    try {
      const params = new URLSearchParams({ client_id: state.clientId, format: 'json', limit: '50', search: term, audioformat: 'mp32', include: 'musicinfo', imagesize: '300', order: 'popularity_total' });
      const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.headers?.status === 'failed') throw new Error(data.headers.error_message || 'Jamendo API error');
      // Only show tracks with an audio stream and a meaningful full-track duration.
      state.tracks = (data.results || []).map(normalize).filter(track => track.audioUrl && track.duration >= 90);
      $('status').textContent = state.tracks.length
        ? `Найдено ${state.tracks.length} треков · Jamendo · отображаются треки от 1:30`
        : 'Треки не найдены. Проверь Client ID или попробуй другой запрос.';
      renderTracks();
    } catch (error) {
      console.error('REDWAVE catalogue error:', error);
      $('status').textContent = 'Не удалось загрузить каталог. Проверь Client ID и интернет.';
      $('trackList').innerHTML = '<div class="status">Ошибка подключения к Jamendo. Нажми значок профиля и проверь Client ID.</div>';
    }
  }
  function visibleTracks() {
    if (state.view === 'favorites') return state.tracks.filter(t => state.favorites.has(t.id));
    if (state.view === 'queue') return state.queue;
    if (state.view === 'playlists') return state.tracks.filter(t => state.playlists.some(p => p.tracks.includes(t.id)));
    return state.tracks;
  }
  function renderTracks() {
    const list = $('trackList'); const tracks = visibleTracks();
    if (!tracks.length) { list.innerHTML = `<div class="status">${state.view === 'favorites' ? 'Пока нет избранных треков.' : state.view === 'queue' ? 'Очередь пуста — добавь треки кнопкой ☷.' : 'Здесь пока пусто. Проверь подключение каталога или выполни поиск.'}</div>`; return; }
    list.innerHTML = tracks.map(t => `<article class="track-row"><img class="track-cover" src="${esc(cover(t))}" alt="" loading="lazy"><div class="track-info"><strong>${esc(t.title)}</strong><span>${esc(t.artist)} · ${esc(t.genre)} · ${formatTime(t.duration)}</span></div><div class="track-actions"><button class="small-icon" data-play="${esc(t.id)}" title="Слушать">▶</button><button class="small-icon" data-fav="${esc(t.id)}" title="Избранное">${state.favorites.has(t.id) ? '♥' : '♡'}</button><button class="small-icon" data-queue="${esc(t.id)}" title="В очередь">☷</button><button class="small-icon" data-addplaylist="${esc(t.id)}" title="В плейлист">＋</button></div></article>`).join('');
  }
  function updatePlayer() {
    const t = state.current; if (!t) return;
    $('playerTitle').textContent = t.title; $('playerArtist').textContent = t.artist; $('playerArt').src = cover(t);
    $('playerFavorite').textContent = state.favorites.has(t.id) ? '♥' : '♡'; $('playPause').textContent = audio.paused ? '▶' : 'Ⅱ';
  }
  async function play(track) {
    if (!track?.audioUrl) { toast('Для этого трека нет доступного потока'); return; }
    state.current = track;
    if (!state.queue.some(item => item.id === track.id)) state.queue.push(track);
    audio.src = track.audioUrl; audio.load();
    try { await audio.play(); updatePlayer(); }
    catch (error) { console.error('REDWAVE playback error:', error); updatePlayer(); toast('Браузер не запустил поток. Нажми ▶ ещё раз.'); }
  }
  function next() {
    if (!state.queue.length) { toast('Очередь пуста'); return; }
    const index = state.queue.findIndex(t => t.id === state.current?.id);
    play(state.queue[(index + 1 + state.queue.length) % state.queue.length]);
  }
  function toggleFavorite(id) {
    if (state.favorites.has(id)) state.favorites.delete(id); else state.favorites.add(id);
    persist(); renderTracks(); updatePlayer();
  }
  function renderPlaylists() {
    $('playlistGrid').innerHTML = state.playlists.map(p => `<div class="playlist-card" data-playlist="${esc(p.id)}"><div class="playlist-icon">♫</div><strong>${esc(p.name)}</strong><span>${p.tracks.length} треков</span></div>`).join('');
  }
  function setView(view) {
    state.view = view;
    document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === view));
    $('searchRow').classList.toggle('hidden', view !== 'search');
    $('viewTitle').textContent = ({ home: 'Новинки для тебя', search: 'Поиск музыки', favorites: 'Избранное', playlists: 'Треки в плейлистах', queue: 'Очередь воспроизведения' })[view] || 'Музыка';
    $('sidebar').classList.remove('open'); renderTracks(); if (view === 'search') $('searchInput').focus();
  }
  $('trackList').addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    const id = button.dataset.play || button.dataset.fav || button.dataset.queue || button.dataset.addplaylist;
    const track = [...state.tracks, ...state.queue].find(t => t.id === id); if (!track) return;
    if (button.dataset.play) play(track);
    if (button.dataset.fav) toggleFavorite(id);
    if (button.dataset.queue) { if (!state.queue.some(t => t.id === id)) state.queue.push(track); toast('Добавлено в очередь'); renderTracks(); }
    if (button.dataset.addplaylist) {
      const options = state.playlists.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
      const answer = prompt(`В какой плейлист добавить трек?\n${options}\n\nВведи 0, чтобы создать новый.`); if (answer === null) return;
      let index = Number(answer) - 1;
      if (Number(answer) === 0) { const name = prompt('Название плейлиста:'); if (!name?.trim()) return; state.playlists.push({ id: `p${Date.now()}`, name: name.trim(), tracks: [] }); index = state.playlists.length - 1; }
      const playlist = state.playlists[index]; if (!playlist) { toast('Неверный номер плейлиста'); return; }
      if (!playlist.tracks.includes(id)) playlist.tracks.push(id); persist(); renderPlaylists(); toast('Трек добавлен в плейлист');
    }
  });
  document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  $('menuToggle').addEventListener('click', () => $('sidebar').classList.toggle('open'));
  $('discoverBtn').addEventListener('click', () => $('genreSection').scrollIntoView({ behavior: 'smooth' }));
  $('seeAllBtn').addEventListener('click', () => search('electronic'));
  $('searchBtn').addEventListener('click', () => search($('searchInput').value.trim() || 'electronic'));
  $('searchInput').addEventListener('keydown', event => { if (event.key === 'Enter') search($('searchInput').value.trim() || 'electronic'); });
  document.querySelectorAll('[data-genre]').forEach(button => button.addEventListener('click', () => { setView('home'); search(button.dataset.genre); }));
  $('newPlaylistBtn').addEventListener('click', () => { const name = prompt('Название плейлиста:'); if (!name?.trim()) return; state.playlists.push({ id: `p${Date.now()}`, name: name.trim(), tracks: [] }); persist(); renderPlaylists(); toast('Плейлист создан'); });
  $('playlistGrid').addEventListener('click', event => {
    const card = event.target.closest('[data-playlist]'); if (!card) return;
    const playlist = state.playlists.find(p => p.id === card.dataset.playlist); if (!playlist) return;
    const tracks = state.tracks.filter(t => playlist.tracks.includes(t.id)); if (!tracks.length) { toast('В этом плейлисте пока нет треков'); return; }
    state.queue = tracks; play(tracks[0]);
  });
  $('playerFavorite').addEventListener('click', () => { if (state.current) toggleFavorite(state.current.id); });
  $('playPause').addEventListener('click', () => { if (!state.current) { toast('Сначала выбери трек'); return; } if (audio.paused) audio.play().then(updatePlayer).catch(() => toast('Не удалось начать воспроизведение')); else audio.pause(); updatePlayer(); });
  $('nextTrack').addEventListener('click', next);
  audio.addEventListener('play', updatePlayer); audio.addEventListener('pause', updatePlayer); audio.addEventListener('ended', next);
  audio.addEventListener('timeupdate', () => { if (audio.duration) $('seek').value = audio.currentTime / audio.duration * 100; });
  $('seek').addEventListener('input', () => { if (audio.duration) audio.currentTime = audio.duration * Number($('seek').value) / 100; });
  $('profileBtn').addEventListener('click', () => {
    const id = prompt('Введи свой Jamendo Client ID. Получить его можно на https://devportal.jamendo.com/', state.clientId);
    if (id?.trim()) { state.clientId = id.trim(); localStorage.setItem('rw-jamendo-client-id', state.clientId); search('electronic'); }
  });
  const telegram = window.Telegram?.WebApp;
  if (telegram) { telegram.ready(); telegram.expand(); try { telegram.setHeaderColor('#09090d'); telegram.setBackgroundColor('#09090d'); } catch {} }
  renderPlaylists();
  search('electronic');
})();
