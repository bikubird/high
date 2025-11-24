// app.js - with Shuffle + Skip functions
let words = [];
let currentIndex = 0;
let showAnswer = false;
let repeatCount = 0;
let audio = null;

// ---------- NEW: Shuffle function ----------
function shuffleWords() {
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  currentIndex = 0;
  repeatCount = 0;
  showAnswer = false;
  renderCard();
  alert("単語をシャッフルしました！");
}
// -------------------------------------------

async function loadWords() {
  try {
    const res = await fetch('words.json');
    words = await res.json();
    document.getElementById('count').textContent = words.length;
    document.getElementById('counter').textContent = '0 / ' + words.length;
  } catch (e) {
    console.error('words.json 読み込み失敗', e);
    alert('単語辞書の読み込みに失敗しました。words.json が同じフォルダにあることを確認してください。');
  }
}

function sanitizeFilename(s){
  return s.trim().toLowerCase().replace(/[^\w\s-]/g,'').replace(/\s+/g,'_');
}

function audioUrlForWord(text){
  const fname = sanitizeFilename(text);
  return 'audio_mp3/' + fname + '.mp3';
}

function startStudying(){
  if(words.length === 0){ alert('単語がありません'); return; }
  currentIndex = 0; showAnswer = false; repeatCount = 0;
  renderCard();
  document.getElementById('studyArea').style.display = 'block';
  document.getElementById('controls').style.display = 'block';
}

function renderCard(){
  const w = words[currentIndex];
  document.getElementById('counter').textContent =
    (currentIndex+1) + ' / ' + words.length + ' (表示:' + (repeatCount+1) + '/2)';

  if(!showAnswer){
    document.getElementById('english').textContent = w.english;
    document.getElementById('ipa').textContent = w.ipa;
    document.getElementById('katakana').textContent = w.katakana;
    document.getElementById('japanese').textContent = '';
    document.getElementById('hint').textContent = 'タップして答えを表示';
    playAudioForWord(w.english);
  } else {
    document.getElementById('english').textContent = w.english;
    document.getElementById('ipa').textContent = w.ipa;
    document.getElementById('katakana').textContent = '';
    document.getElementById('japanese').textContent = w.japanese || '（未登録）';
    document.getElementById('hint').textContent =
      'タップして' + (repeatCount === 0 ? '2回目へ' : '次へ');
  }
}

function cardClicked(){
  if(!showAnswer){ showAnswer = true; renderCard(); return; }
  if(repeatCount === 0){ repeatCount = 1; showAnswer = false; renderCard(); return; }
  nextWord();
}

// ---------- NEW: Skip function ----------
function skipRepeat(){
  nextWord();
}

function nextWord(){
  if(currentIndex < words.length - 1){
    currentIndex++;
    showAnswer = false;
    repeatCount = 0;
    renderCard();
  } else {
    alert('学習が終了しました');
    document.getElementById('studyArea').style.display='none';
    document.getElementById('controls').style.display='none';
  }
}
// -----------------------------------------

function playAudioForWord(text){
  const fname = sanitizeFilename(text);
  const mp3 = 'audio_mp3/' + fname + '.mp3';
  const wav = 'audio/' + fname + '.wav';
  fetch(mp3, {method:'HEAD'}).then(res=>{
    if(res.ok){ playAudio(mp3); }
    else {
      fetch(wav, {method:'HEAD'}).then(r2=>{
        if(r2.ok) playAudio(wav);
        else console.warn('no audio', text);
      });
    }
  });
}

function playAudio(url){
  try{
    if(audio){ audio.pause(); }
    audio = new Audio(url);
    audio.play().catch(err=>{ console.warn('audio play failed', err); });
  }catch(e){ console.error(e); }
}

function speakWithTTS(text){
  if('speechSynthesis' in window){
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.92;
    u.pitch = 1.0;
    speechSynthesis.speak(u);
  } else {
    alert('このブラウザは音声合成をサポートしていません。');
  }
}

window.addEventListener('load', ()=>{
  loadWords();

  document.getElementById('startBtn').addEventListener('click', startStudying);
  document.getElementById('card').addEventListener('click', ()=>{ cardClicked(); });
  document.getElementById('speakBtn').addEventListener('click', ()=>{ const w = words[currentIndex]; speakWithTTS(w.english); });
  document.getElementById('nextBtn').addEventListener('click', ()=>{ cardClicked(); });

  // NEW buttons:
  document.getElementById('shuffleBtn').addEventListener('click', shuffleWords);
  document.getElementById('skipBtn').addEventListener('click', skipRepeat);

  document.getElementById('stopBtn').addEventListener('click', ()=>{
    document.getElementById('studyArea').style.display='none';
    document.getElementById('controls').style.display='none';
  });
});
