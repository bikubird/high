// app.js - フル機能版（詳細コメント付き）
// Features: 詳細隠しモード / 検索 / 辞書ビュー / 苦手管理 / 履歴 / MP3優先 + TTS fallback / SR基礎

let words = [];
let currentIndex = 0;
let showAnswer = false;
let repeatCount = 0;
let audio = null;

// settings and state
let settings = {
  hideEnglish: false,
  hideIPA: false,
  hideKatakana: false,
  hideJapanese: false,
  repeatCount: 2,
  ttsFallback: true
};

// localStorage keys
const LS_HARD = 'flash_hard_list_v1';
const LS_HISTORY = 'flash_history_v1';
const LS_SETTINGS = 'flash_settings_v1';

// UI refs
const el = (id) => document.getElementById(id);

// load saved settings
function loadSettings(){
  try {
    const s = JSON.parse(localStorage.getItem(LS_SETTINGS) || '{}');
    Object.assign(settings, s);
    // hydrate checkboxes if present
    if (el('hideEnglishChk')) el('hideEnglishChk').checked = !!settings.hideEnglish;
    if (el('hideIPAChk')) el('hideIPAChk').checked = !!settings.hideIPA;
    if (el('hideKatakanaChk')) el('hideKatakanaChk').checked = !!settings.hideKatakana;
    if (el('hideJapaneseChk')) el('hideJapaneseChk').checked = !!settings.hideJapanese;
    if (el('repeatCountInput')) el('repeatCountInput').value = settings.repeatCount;
    if (el('ttsFallbackChk')) el('ttsFallbackChk').checked = !!settings.ttsFallback;
  } catch(e){ console.warn('loadSettings', e); }
}

// save settings
function saveSettings(){
  localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
}

// helper for filename
function sanitizeFilename(s){
  return (s||'').trim().toLowerCase().replace(/[^\w\s-]/g,'').replace(/\s+/g,'_');
}

// load words.json
async function loadWords(){
  try{
    const res = await fetch('words.json');
    words = await res.json();
    el('count').textContent = words.length;
    renderList(words);
  }catch(e){
    console.error('words.json load error', e);
    alert('words.json が読み込めません。ファイルが同階層にあることを確認してください。');
  }
}

// render list (search / list view)
function renderList(list){
  const container = el('wordList');
  container.innerHTML = '';
  for(let i=0;i<list.length;i++){
    const w = list[i];
    const div = document.createElement('div');
    div.className = 'word-item';
    div.innerHTML = `<div>
        <div style="font-weight:700">${w.english}</div>
        <div style="font-size:12px;color:#666">${w.katakana || ''} ${w.japanese || ''}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn small" data-index="${i}">学習</button>
      </div>`;
    container.appendChild(div);
  }
  // attach click events to "学習" buttons
  container.querySelectorAll('button[data-index]').forEach(btn=>{
    btn.addEventListener('click', (ev)=>{
      const idx = Number(btn.getAttribute('data-index'));
      // find global index of this item
      const globalIndex = words.findIndex(x=>x.english===list[idx].english && x.japanese===list[idx].japanese);
      if(globalIndex>=0){
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

// search input handler
function onSearch(q){
  q = (q||'').trim().toLowerCase();
  if(!q){ renderList(words); return; }
  const filtered = words.filter(w=>{
    return (w.english||'').toLowerCase().includes(q) ||
           (w.katakana||'').toLowerCase().includes(q) ||
           (w.japanese||'').toLowerCase().includes(q);
  });
  renderList(filtered);
}

// render card
function renderCard(){
  if(!words || words.length===0) return;
  const w = words[currentIndex];
  el('counter').textContent = `${currentIndex+1} / ${words.length} (表示:${repeatCount+1}/${settings.repeatCount})`;

  // english / ipa / katakana control (individual)
  if(settings.hideEnglish){
    el('english').textContent = "（隠れています）";
  } else {
    el('english').textContent = w.english;
  }
  if(settings.hideIPA){
    el('ipa').textContent = "";
  } else {
    el('ipa').textContent = w.ipa || '';
  }
  if(settings.hideKatakana){
    el('katakana').textContent = settings.hideEnglish ? "（隠れています）" : '';
    // if english hidden we already set katakana to hidden message; otherwise show when not showAnswer
    if(!settings.hideEnglish && !showAnswer) el('katakana').textContent = w.katakana || '';
  } else {
    if(!showAnswer) el('katakana').textContent = w.katakana || '';
    else el('katakana').textContent = '';
  }

  // japanese
  if(!showAnswer){
    el('japanese').textContent = '';
    el('hint').textContent = 'タップして答えを表示';

    // play MP3 automatically if present and not hideEnglish
    if(!settings.hideEnglish) playAudioForWord(w.english);
  } else {
    el('hint').textContent = 'タップして' + (repeatCount < settings.repeatCount-1 ? (repeatCount===0 ? '2回目へ' : '次へ') : '次へ');
    if(settings.hideJapanese){
      el('japanese').textContent = '（隠れています）';
    } else {
      el('japanese').textContent = w.japanese || '（未登録）';
    }
  }
}

// card click flow
function cardClicked(){
  if(!showAnswer){
    showAnswer = true;
    renderCard();
    return;
  }
  // increase repeat count
  repeatCount++;
  if(repeatCount < settings.repeatCount){
    showAnswer = false;
    renderCard();
    return;
  }
  // move next
  nextWord();
}

// next word
function nextWord(){
  if(currentIndex < words.length -1){
    currentIndex++;
    showAnswer = false;
    repeatCount = 0;
    renderCard();
  } else {
    alert('学習終了！');
    el('studyArea').style.display = 'none';
    el('controls').style.display = 'none';
  }
}

// skip
function skipRepeat(){
  nextWord();
}

// shuffle (Fisher-Yates) - shuffles the words array in-place
function shuffleWords(){
  for(let i=words.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  currentIndex = 0;
  repeatCount = 0;
  showAnswer = false;
  renderCard();
  renderList(words);
  alert('シャッフルしました');
}

// --- hard list (苦手) management
function getHardList(){
  try{
    return JSON.parse(localStorage.getItem(LS_HARD) || '[]');
  }catch(e){ return []; }
}
function saveHardList(list){
  localStorage.setItem(LS_HARD, JSON.stringify(list));
}
function toggleHardCurrent(){
  const w = words[currentIndex];
  if(!w) return;
  const list = getHardList();
  const key = w.english + '||||' + (w.japanese||'');
  const idx = list.indexOf(key);
  if(idx === -1){
    list.push(key);
  } else {
    list.splice(idx,1);
  }
  saveHardList(list);
  updateStats();
  alert(idx===-1 ? '苦手に追加しました' : '苦手から削除しました');
}
function showHardOnly(){
  const list = getHardList();
  if(list.length===0) return alert('苦手単語がありません');
  const filtered = words.filter(w=> list.includes(w.english + '||||' + (w.japanese||'')));
  renderList(filtered);
}

// --- history tracking
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
  const todayCount = h.filter(x=> x.date.slice(0,10)===today).length;
  el('todayCount').textContent = todayCount;
  el('totalCount').textContent = h.length;
  el('hardCount').textContent = getHardList().length;
}

// MP3 play (with HEAD check). If not found and fallback enabled -> TTS
function playAudioForWord(text){
  if(!text) return;
  const fname = sanitizeFilename(text);
  const mp3 = 'audio_mp3/' + fname + '.mp3';

  fetch(mp3, { method: 'HEAD' }).then(r=>{
    if(r.ok){
      playAudio(mp3);
    } else {
      if(settings.ttsFallback) speakText(text);
    }
  }).catch(e=>{
    if(settings.ttsFallback) speakText(text);
  });
}
function playAudio(url){
  if(audio) audio.pause();
  audio = new Audio(url);
  audio.play().catch(e=>console.warn('audio play failed', e));
}

// simple TTS fallback
function speakText(text){
  if('speechSynthesis' in window){
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.95;
    u.pitch = 1.0;
    speechSynthesis.speak(u);
  }
}

// swipe support for mobile
function addSwipe(elm){
  let startX = 0, startY = 0, startT = 0;
  elm.addEventListener('touchstart', (e)=>{
    const t = e.touches[0];
    startX = t.clientX; startY = t.clientY; startT = Date.now();
  }, {passive:true});
  elm.addEventListener('touchend', (e)=>{
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dt = Date.now() - startT;
    if(Math.abs(dx)>50 && dt<500){
      if(dx<0) nextWord(); else { if(currentIndex>0){ currentIndex--; renderCard(); } }
    }
  });
}

// init UI and events
window.addEventListener('load', ()=>{

  loadSettings();
  loadWords();
  updateStats();

  // list search
  el('searchInput').addEventListener('input',(e)=> onSearch(e.target.value));
  el('showAllBtn').addEventListener('click', ()=> renderList(words));
  el('shuffleListBtn').addEventListener('click', ()=> { shuffleWords(); });

  el('showHardBtn').addEventListener('click', ()=> showHardOnly());

  // card events
  el('card').addEventListener('click', ()=> { cardClicked(); addHistory(words[currentIndex] || {}); } );

  el('startBtn').addEventListener('click', ()=> {
    settings.repeatCount = Number(el('repeatCountInput')?.value || 2);
    startStudying();
  });

  el('nextBtn').addEventListener('click', ()=> cardClicked());
  el('skipBtn').addEventListener('click', ()=> skipRepeat());
  el('shuffleBtn').addEventListener('click', ()=> shuffleWords());
  el('speakBtn').addEventListener('click', ()=> playAudioForWord(words[currentIndex].english));
  el('hardBtn').addEventListener('click', ()=> toggleHardCurrent());

  // modal settings
  el('openSettingsBtn').addEventListener('click', ()=> {
    el('settingsModal').setAttribute('aria-hidden','false');
  });
  el('closeSettingsBtn').addEventListener('click', ()=> {
    el('settingsModal').setAttribute('aria-hidden','true');
  });
  el('saveSettingsBtn').addEventListener('click', ()=>{
    // sync settings from controls
    settings.hideEnglish = !!el('hideEnglishChk').checked;
    settings.hideIPA = !!el('hideIPAChk').checked;
    settings.hideKatakana = !!el('hideKatakanaChk').checked;
    settings.hideJapanese = !!el('hideJapaneseChk').checked;
    settings.repeatCount = Number(el('repeatCountInput').value || 2);
    settings.ttsFallback = !!el('ttsFallbackChk').checked;
    saveSettings();
    el('settingsModal').setAttribute('aria-hidden','true');
    renderCard();
  });

  // quick toggle buttons (legacy convenience)
  el('toggleEnglishBtn').addEventListener('click', ()=>{
    // toggle three flags together for compatibility
    settings.hideEnglish = !settings.hideEnglish;
    settings.hideIPA = settings.hideEnglish ? true : settings.hideIPA;
    settings.hideKatakana = settings.hideEnglish ? true : settings.hideKatakana;
    saveSettings();
    renderCard();
  });
  el('toggleJapaneseBtn').addEventListener('click', ()=>{
    settings.hideJapanese = !settings.hideJapanese;
    saveSettings();
    renderCard();
  });

  addSwipe(el('card'));

  // keyboard shortcuts
  window.addEventListener('keydown',(e)=>{
    if(e.key===' '){ e.preventDefault(); cardClicked(); }
    if(e.key==='ArrowRight') cardClicked();
    if(e.key==='ArrowLeft'){ if(currentIndex>0){ currentIndex--; renderCard(); } }
  });

});
