// app.js — 完全修正版（自動再生 + 音声同期 + index.html 完全対応）
// このままコピーペーストして使用できます

let words = [];
let currentIndex = 0;
let showAnswer = false;
let repeatCount = 0;
let audio = null;

let settings = {
  hideEnglish: false,
  hideIPA: false,
  hideKatakana: false,
  hideJapanese: false,
  repeatCount: 2,
  ttsFallback: true
};

const LS_HARD = 'flash_hard_list_v1';
const LS_HISTORY = 'flash_history_v1';
const LS_SETTINGS = 'flash_settings_v1';

const el = id => document.getElementById(id);

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_SETTINGS) || '{}');
    Object.assign(settings, s);
    if (el('hideEnglishChk')) el('hideEnglishChk').checked = !!settings.hideEnglish;
    if (el('hideIPAChk')) el('hideIPAChk').checked = !!settings.hideIPA;
    if (el('hideKatakanaChk')) el('hideKatakanaChk').checked = !!settings.hideKatakana;
    if (el('hideJapaneseChk')) el('hideJapaneseChk').checked = !!settings.hideJapanese;
    if (el('repeatCountInput')) el('repeatCountInput').value = settings.repeatCount;
    if (el('ttsFallbackChk')) el('ttsFallbackChk').checked = !!settings.ttsFallback;
  } catch (e) { console.warn('loadSettings', e); }
}

function saveSettings() {
  localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
}

function sanitizeFilename(s) {
  return (s || '').trim().toLowerCase().replace(/[^A-Za-z0-9 -]/g, '').replace(/ +/g, '_');
}

async function loadWords() {
  try {
    const res = await fetch('words.json');
    words = await res.json();
    if (el('count')) el('count').textContent = words.length;
    renderList(words);
  } catch (e) {
    console.error('words.json load error', e);
    alert('words.json が読み込めません。');
  }
}

function renderList(list) {
  const container = el('wordList');
  if (!container) return;

  container.innerHTML = '';
  list.forEach((w, i) => {
    const div = document.createElement('div');
    div.className = 'word-item';
    div.innerHTML = `
      <div>
        <div style="font-weight:700">${w.english}</div>
        <div style="font-size:12px;color:#666">${w.katakana || ''} ${w.japanese || ''}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn small" data-index="${i}">学習</button>
      </div>
    `;
    container.appendChild(div);
  });

  container.querySelectorAll('button[data-index]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-index'));
      const globalIndex = words.findIndex(x => x.english === list[idx].english && x.japanese === list[idx].japanese);
      if (globalIndex >= 0) {
        currentIndex = globalIndex;
        showAnswer = false;
        repeatCount = 0;
        renderCard();
        el('studyArea').style.display = 'block';
        el('controls').style.display = 'flex';
      }
    });
  });
}

function onSearch(q) {
  q = (q || '').trim().toLowerCase();
  if (!q) { renderList(words); return; }

  const filtered = words.filter(w =>
    (w.english || '').toLowerCase().includes(q) ||
    (w.katakana || '').toLowerCase().includes(q) ||
    (w.japanese || '').toLowerCase().includes(q)
  );

  renderList(filtered);
}

function renderCard() {
  if (!words.length) return;
  const w = words[currentIndex];
  if (!w) return;

  el('counter').textContent = `${currentIndex + 1} / ${words.length} (表示:${repeatCount + 1}/${settings.repeatCount})`;

  el('english').textContent = settings.hideEnglish ? '（隠れています）' : w.english;
  el('ipa').textContent = settings.hideIPA ? '' : (w.ipa || '');
  el('katakana').textContent = settings.hideKatakana ? '' : (!showAnswer ? (w.katakana || '') : '');

  if (!showAnswer) {
    el('japanese').textContent = '';
    el('hint').textContent = 'タップして答えを表示';
  } else {
    el('hint').textContent = 'タップして次へ';
    el('japanese').textContent = settings.hideJapanese ? '（隠れています）' : (w.japanese || '（未登録）');
  }
}

function cardClicked() {
  if (!showAnswer) {
    showAnswer = true;
    renderCard();
    return;
  }

  repeatCount++;

  if (repeatCount < settings.repeatCount) {
    showAnswer = false;
    renderCard();
    
    // ★追加：繰り返し時も音声再生
    playAudioForWord(words[currentIndex].english);

    return;
  }

  nextWord();
}

function nextWord() {
  if (currentIndex < words.length - 1) {
    currentIndex++;
    showAnswer = false;
    repeatCount = 0;
    renderCard();

    // ★追加：次の単語で必ず音声再生
    playAudioForWord(words[currentIndex].english);

  } else {
    alert('学習終了！');
    el('studyArea').style.display = 'none';
    el('controls').style.display = 'none';
  }
}

function skipRepeat() {
  nextWord();
}

function shuffleWords() {
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }

  currentIndex = 0;
  repeatCount = 0;
  showAnswer = false;

  renderCard();
  renderList(words);
  alert('シャッフルしました');
}

function getHardList() {
  try { return JSON.parse(localStorage.getItem(LS_HARD) || '[]'); }
  catch { return []; }
}

function saveHardList(list) {
  localStorage.setItem(LS_HARD, JSON.stringify(list));
}

function toggleHardCurrent() {
  const w = words[currentIndex];
  const list = getHardList();
  const key = w.english + '||||' + (w.japanese || '');
  const idx = list.indexOf(key);

  if (idx === -1) list.push(key);
  else list.splice(idx, 1);

  saveHardList(list);
  updateStats();

  alert(idx === -1 ? '苦手に追加しました' : '苦手から削除しました');
}

function showHardOnly() {
  const list = getHardList();
  if (!list.length) return alert('苦手単語がありません');

  const filtered = words.filter(w => list.includes(w.english + '||||' + (w.japanese || '')));
  renderList(filtered);
}

function addHistory(word) {
  try {
    const h = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
    h.push({ word: word.english, date: new Date().toISOString() });
    localStorage.setItem(LS_HISTORY, JSON.stringify(h));
    updateStats();
  } catch {}
}

function updateStats() {
  const h = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
  const today = new Date().toISOString().slice(0, 10);

  el('todayCount').textContent = h.filter(x => x.date.slice(0, 10) === today).length;
  el('totalCount').textContent = h.length;
  el('hardCount').textContent = getHardList().length;
}

function playAudioForWord(text) {
  if (!text) return;

  const fname = sanitizeFilename(text);
  const mp3 = 'audio_mp3/' + fname + '.mp3';

  fetch(mp3, { method: 'HEAD' })
    .then(r => { if (r.ok) playAudio(mp3); else if (settings.ttsFallback) speakText(text); })
    .catch(() => { if (settings.ttsFallback) speakText(text); });
}

function playAudio(url) {
  try {
    if (audio) audio.pause();
    audio = new Audio(url);
    audio.play().catch(()=>{});
  } catch {}
}

function speakText(text) {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
