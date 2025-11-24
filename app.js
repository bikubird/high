// app.js - 完全統合版（隠す機能＋シャッフル＋スキップ）
// ----------------------------------------------

let words = [];
let currentIndex = 0;
let showAnswer = false;
let repeatCount = 0;
let audio = null;

// 🔽 新機能：隠すフラグ
let hideEnglish = false;   // 英語+IPA+カタカナを隠す
let hideJapanese = false;  // 日本語を隠す

// ----------------------------------------------
// 単語読み込み
// ----------------------------------------------
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

// ----------------------------------------------
// ファイル名整形
// ----------------------------------------------
function sanitizeFilename(s){
  return s.trim().toLowerCase().replace(/[^\w\s-]/g,'').replace(/\s+/g,'_');
}

// ----------------------------------------------
// 学習スタート
// ----------------------------------------------
function startStudying(){
  if(words.length === 0){ alert('単語がありません'); return; }
  currentIndex = 0;
  showAnswer = false;
  repeatCount = 0;

  renderCard();
  document.getElementById('studyArea').style.display = 'block';
  document.getElementById('controls').style.display = 'block';
}

// ----------------------------------------------
// ⭐ カード描画（隠す処理完全統合版）
// ----------------------------------------------
function renderCard(){
  const w = words[currentIndex];
  document.getElementById('counter').textContent =
    (currentIndex + 1) + ' / ' + words.length + ' (表示:' + (repeatCount + 1) + '/2)';

  // ⭐ 英語＋IPA＋カタカナ を完全隠し
  if (hideEnglish) {
    document.getElementById('english').textContent = "（隠されています）";
    document.getElementById('ipa').textContent = "";
    document.getElementById('katakana').textContent = "（隠されています）";
  } else {
    document.getElementById('english').textContent = w.english;
    document.getElementById('ipa').textContent = w.ipa;

    if (!showAnswer) {
      document.getElementById('katakana').textContent = w.katakana;
    } else {
      document.getElementById('katakana').textContent = "";
    }
  }

  // ⭐ 日本語は showAnswer のときだけ制御
  if (!showAnswer){
    document.getElementById('japanese').textContent = "";
    document.getElementById('hint').textContent = "タップして答えを表示";

    if (!hideEnglish) {
      playAudioForWord(w.english);
    }

  } else {
    if (!hideJapanese){
      document.getElementById('japanese').textContent = w.japanese || "（未登録）";
    } else {
      document.getElementById('japanese').textContent = "（隠されています）";
    }

    document.getElementById('hint').textContent =
      "タップして" + (repeatCount === 0 ? "2回目へ" : "次へ");
  }
}

// ----------------------------------------------
// カードクリックで進む
// ----------------------------------------------
function cardClicked(){
  if(!showAnswer){
    showAnswer = true;
    renderCard();
    return;
  }

  if(repeatCount === 0){
    repeatCount = 1;
    showAnswer = false;
    renderCard();
    return;
  }

  nextWord();
}

// ----------------------------------------------
// 次の単語へ
// ----------------------------------------------
function nextWord(){
  if(currentIndex < words.length - 1){
    currentIndex++;
    showAnswer = false;
    repeatCount = 0;
    renderCard();
  } else {
    alert('学習が終了しました');
    document.getElementById('studyArea').style.display = 'none';
    document.getElementById('controls').style.display = 'none';
  }
}

// ----------------------------------------------
// スキップ（2回目の繰り返しを飛ばす）
// ----------------------------------------------
function skipRepeat(){
  nextWord();
}

// ----------------------------------------------
// シャッフル
// ----------------------------------------------
function shuffleWords(){
  for(let i = words.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  currentIndex = 0;
  repeatCount = 0;
  showAnswer = false;
  renderCard();
  alert("単語をシャッフルしました！");
}

// ----------------------------------------------
// 音声再生
// ----------------------------------------------
function playAudioForWord(text){
  const fname = sanitizeFilename(text);
  const mp3 = "audio_mp3/" + fname + ".mp3";

  fetch(mp3, {method:"HEAD"}).then(res=>{
    if(res.ok){ playAudio(mp3); }
  });
}

function playAudio(url){
  try {
    if(audio){ audio.pause(); }
    audio = new Audio(url);
    audio.play().catch(err=>console.warn("play error", err));
  } catch(e){
    console.error(e);
  }
}

// ----------------------------------------------
// SpeechSynthesis（英語読み上げ）
// ----------------------------------------------
function speakWithTTS(text){
  if("speechSynthesis" in window){
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.92;
    u.pitch = 1.0;
    speechSynthesis.speak(u);
  } else {
    alert("このブラウザは音声合成に対応していません");
  }
}

// ----------------------------------------------
// イベント
// ----------------------------------------------
window.addEventListener('load', ()=>{
  loadWords();

  document.getElementById('startBtn').addEventListener('click', startStudying);
  document.getElementById('card').addEventListener('click', ()=>{ cardClicked(); });
  document.getElementById('speakBtn').addEventListener('click', ()=>{
    const w = words[currentIndex];
    speakWithTTS(w.english);
  });
  document.getElementById('nextBtn').addEventListener('click', ()=>{ cardClicked(); });

  // 🔽 英語＋IPA＋カタカナ 隠す
  document.getElementById('toggleEnglishBtn').addEventListener('click', ()=>{
    hideEnglish = !hideEnglish;
    alert(hideEnglish ? "英語＋IPA＋カタカナを隠します" : "表示します");
    renderCard();
  });

  // 🔽 日本語 隠す
  document.getElementById('toggleJapaneseBtn').addEventListener('click', ()=>{
    hideJapanese = !hideJapanese;
    alert(hideJapanese ? "日本語を隠します" : "表示します");
    renderCard();
  });

  // 🔽 スキップ
  document.getElementById('skipBtn').addEventListener('click', skipRepeat);

  // 🔽 シャッフル
  document.getElementById('shuffleBtn').addEventListener('click', shuffleWords);

  document.getElementById('stopBtn').addEventListener('click', ()=>{
    document.getElementById('studyArea').style.display = 'none';
    document.getElementById('controls').style.display = 'none';
  });
});
