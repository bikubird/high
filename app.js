// app.js — 完全修正版（index.html に合わせて調整済み）
// 以下は、提供された index.html の要素 ID と完全に一致するように書かれています。

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

function loadSettings(){
  try{
    const s = JSON.parse(localStorage.getItem(LS_SETTINGS) || '{}');
    Object.assign(settings, s);
    if(el('hideEnglishChk')) el('hideEnglishChk').checked = !!settings.hideEnglish;
    if(el('hideIPAChk')) el('hideIPAChk').checked = !!settings.hideIPA;
    if(el('hideKatakanaChk')) el('hideKatakanaChk').checked = !!settings.hideKatakana;
    if(el('hideJapaneseChk')) el('hideJapaneseChk').checked = !!settings.hideJapanese;
    if(el('repeatCountInput')) el('repeatCountInput').value = settings.repeatCount;
    if(el('ttsFallbackChk')) el('ttsFallbackChk').checked = !!settings.ttsFallback;
  }catch(e){ console.warn('loadSettings', e); }
}
function saveSettings(){ localStorage.setItem(LS_SETTINGS, JSON.stringify(settings)); }

function sanitizeFilename(s){
  // 正規表現にバックスラッシュを使わない形で安全化
  return (s||'').trim().toLowerCase().replace(/[^A-Za-z0-9 -]/g, '').replace(/ +/g, '_');
}

async function loadWords(){
  try{
    const res = await fetch('words.json');
    words = await res.json();
    if(el('count')) el('count').textContent = words.length;
    renderList(words);
  }catch(e){
    console.error('words.json load error', e);
    alert('words.json が読み込めません。ファイルが同階層にあることを確認してください。');
  }
}

function renderList(list){
  const container = el('wordList');
  if(!container) return;
  container.innerHTML = '';
  list.forEach((w, i) => {
    const div = document.createElement('div');
    div.className = 'word-item';
    div.innerHTML = `<div><div style="font-weight:700">${w.english}</div><div style="font-size:12px;color:#666">${w.katakana||''} ${w.japanese||''}</div></div><div style="display:flex;gap:8px"><button class="btn small" data-index="${i}">学習</button></div>`;
    container.appendChild(div);
  });
  container.querySelectorAll('button[data-index]').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      const idx = Number(btn.getAttribute('data-index'));
      const globalIndex = words.findIndex(x => x.english === list[idx].english && x.japanese === list[idx].japanese);
      if(globalIndex >= 0){
        currentIndex = globalIndex;
        showAnswer = false;
        repeatCount = 0;
        renderCard();
        if(el('studyArea')) el('studyArea').style.display = 'block';
        if(el('controls')) el('controls').style.display = 'flex';
      }
    });
  });
}

function onSearch(q){
  q = (q||'').trim().toLowerCase();
  if(!q){ renderList(words); return; }
  const filtered = words.filter(w => {
    return (w.english||'').toLowerCase().includes(q) ||
           (w.katakana||'').toLowerCase().includes(q) ||
           (w.japanese||'').toLowerCase().includes(q);
  });
  renderList(filtered);
}

function renderCard(){
  if(!words || words.length === 0) return;
  const w = words[currentIndex];
  if(!w) return;
  if(el('counter')) el('counter').textContent = `${currentIndex+1} / ${words.length} (表示:${repeatCount+1}/${settings.repeatCount})`;

  // English
  if(settings.hideEnglish){
    if(el('english')) el('english').textContent = '（隠れています）';
  } else {
    if(el('english')) el('english').textContent = w.english;
  }

  // IPA
  if(settings.hideIPA){ if(el('ipa')) el('ipa').textContent = ''; }
  else { if(el('ipa')) el('ipa').textContent = w.ipa || ''; }

  // Katakana
  if(settings.hideKatakana){
    if(el('katakana')) el('katakana').textContent = '';
  } else {
    if(el('katakana')) el('katakana').textContent = (!showAnswer ? (w.katakana || '') : '');
  }

  // Japanese / hint
  if(!showAnswer){
    if(el('japanese')) el('japanese').textContent = '';
    if(el('hint')) el('hint').textContent = 'タップして答えを表示';
    if(!settings.hideEnglish) playAudioForWord(w.english);
  } else {
    if(el('hint')) el('hint').textContent = 'タップして' + (repeatCount < settings.repeatCount-1 ? (repeatCount===0 ? '2回目へ' : '次へ') : '次へ');
    if(settings.hideJapanese){ if(el('japanese')) el('japanese').textContent = '（隠れています）'; }
    else { if(el('japanese')) el('japanese').textContent = w.japanese || '（未登録）'; }
  }
}

function cardClicked(){
  if(!showAnswer){ showAnswer = true; renderCard(); return; }
  repeatCount++;
  if(repeatCount < settings.repeatCount){ showAnswer = false; renderCard(); return; }
  nextWord();
}

function nextWord(){
  if(currentIndex < words.length - 1){ currentIndex++; showAnswer = false; repeatCount = 0; renderCard(); }
  else {
    alert('学習終了！');
    if(el('studyArea')) el('studyArea').style.display = 'none';
    if(el('controls')) el('controls').style.display = 'none';
  }
}

function skipRepeat(){ nextWord(); }

function shuffleWords(){
  for(let i = words.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  currentIndex = 0; repeatCount = 0; showAnswer = false;
  renderCard(); renderList(words);
  alert('シャッフルしました');
}

// Hard list
function getHardList(){ try{ return JSON.parse(localStorage.getItem(LS_HARD) || '[]'); }catch(e){ return []; } }
function saveHardList(list){ localStorage.setItem(LS_HARD, JSON.stringify(list)); }

function toggleHardCurrent(){
  const w = words[currentIndex]; if(!w) return;
  const list = getHardList();
  const key = w.english + '||||' + (w.japanese||'');
  const idx = list.indexOf(key);
  if(idx === -1) list.push(key); else list.splice(idx,1);
  saveHardList(list);
  updateStats();
  alert(idx===-1 ? '苦手に追加しました' : '苦手から削除しました');
}

function showHardOnly(){
  const list = getHardList();
  if(list.length===0) return alert('苦手単語がありません');
  const filtered = words.filter(w => list.includes(w.english + '||||' + (w.japanese||'')));
  renderList(filtered);
}

// history
function addHistory(word){
  try{
    const h = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
    h.push({ word: word.english, date: new Date().toISOString() });
    localStorage.setItem(LS_HISTORY, JSON.stringify(h));
    updateStats();
  }catch(e){ console.warn(e); }
}
function updateStats(){
  const h = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
  const today = (new Date()).toISOString().slice(0,10);
  if(el('todayCount')) el('todayCount').textContent = h.filter(x => x.date.slice(0,10)===today).length;
  if(el('totalCount')) el('totalCount').textContent = h.length;
  if(el('hardCount')) el('hardCount').textContent = getHardList().length;
}

// audio
function playAudioForWord(text){
  if(!text) return;
  const fname = sanitizeFilename(text);
  const mp3 = 'audio_mp3/' + fname + '.mp3';

  fetch(mp3, { method: 'HEAD' }).then(r => {
    if(r.ok){ playAudio(mp3); }
    else { if(settings.ttsFallback) speakText(text); }
  }).catch(e => { if(settings.ttsFallback) speakText(text); });
}
function playAudio(url){ try{ if(audio) audio.pause(); audio = new Audio(url); audio.play().catch(e=>console.warn('audio play failed', e)); }catch(e){ console.warn(e); } }
function speakText(text){ if('speechSynthesis' in window){ speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.95; u.pitch = 1.0; speechSynthesis.speak(u); } }

// swipe support
function addSwipe(elm){
  if(!elm) return;
  let startX=0,startT=0;
  elm.addEventListener('touchstart', e=>{ const t = e.touches[0]; startX = t.clientX; startT = Date.now(); }, {passive:true});
  elm.addEventListener('touchend', e=>{ const t = e.changedTouches[0]; const dx = t.clientX - startX; const dt = Date.now() - startT; if(Math.abs(dx)>50 && dt<500){ if(dx<0) nextWord(); else { if(currentIndex>0){ currentIndex--; renderCard(); } } } });
}

window.addEventListener('load', ()=>{
  loadSettings(); loadWords(); updateStats();

  // list handlers
  if(el('searchInput')) el('searchInput').addEventListener('input', e=> onSearch(e.target.value));
  if(el('showAllBtn')) el('showAllBtn').addEventListener('click', ()=> renderList(words));
  if(el('shuffleListBtn')) el('shuffleListBtn').addEventListener('click', ()=> shuffleWords());
  if(el('showHardBtn')) el('showHardBtn').addEventListener('click', ()=> showHardOnly());

  // card
  if(el('card')) el('card').addEventListener('click', ()=>{ cardClicked(); addHistory(words[currentIndex] || {}); });

  if(el('startBtn')) el('startBtn').addEventListener('click', ()=>{ settings.repeatCount = Number(el('repeatCountInput')?.value || 2); renderCard(); });

  if(el('nextBtn')) el('nextBtn').addEventListener('click', ()=> cardClicked());
  if(el('skipBtn')) el('skipBtn').addEventListener('click', ()=> skipRepeat());
  if(el('shuffleBtn')) el('shuffleBtn').addEventListener('click', ()=> shuffleWords());
  if(el('speakBtn')) el('speakBtn').addEventListener('click', ()=> playAudioForWord((words[currentIndex]||{}).english));
  if(el('hardBtn')) el('hardBtn').addEventListener('click', ()=> toggleHardCurrent());

  // settings modal
  if(el('openSettingsBtn')) el('openSettingsBtn').addEventListener('click', ()=> el('settingsModal').setAttribute('aria-hidden','false'));
  if(el('closeSettingsBtn')) el('closeSettingsBtn').addEventListener('click', ()=> el('settingsModal').setAttribute('aria-hidden','true'));
  if(el('saveSettingsBtn')) el('saveSettingsBtn').addEventListener('click', ()=>{
    settings.hideEnglish = !!(el('hideEnglishChk') && el('hideEnglishChk').checked);
    settings.hideIPA = !!(el('hideIPAChk') && el('hideIPAChk').checked);
    settings.hideKatakana = !!(el('hideKatakanaChk') && el('hideKatakanaChk').checked);
    settings.hideJapanese = !!(el('hideJapaneseChk') && el('hideJapaneseChk').checked);
    settings.repeatCount = Number(el('repeatCountInput')?.value || 2);
    settings.ttsFallback = !!(el('ttsFallbackChk') && el('ttsFallbackChk').checked);
    saveSettings();
    el('settingsModal').setAttribute('aria-hidden','true');
    renderCard();
  });

  // quick toggles
  if(el('toggleEnglishBtn')) el('toggleEnglishBtn').addEventListener('click', ()=>{
    settings.hideEnglish = !settings.hideEnglish;
    settings.hideIPA = settings.hideEnglish ? true : settings.hideIPA;
    settings.hideKatakana = settings.hideEnglish ? true : settings.hideKatakana;
    saveSettings(); renderCard();
  });
  if(el('toggleJapaneseBtn')) el('toggleJapaneseBtn').addEventListener('click', ()=>{
    settings.hideJapanese = !settings.hideJapanese; saveSettings(); renderCard();
  });

  addSwipe(el('card'));

  // keyboard
  window.addEventListener('keydown', (e)=>{
    if(e.key === ' '){ e.preventDefault(); cardClicked(); }
    if(e.key === 'ArrowRight') cardClicked();
    if(e.key === 'ArrowLeft'){ if(currentIndex>0){ currentIndex--; renderCard(); } }
  });

});
