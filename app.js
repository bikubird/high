// app.js - 最新完全版（MP3発音対応 / 隠す / シャッフル / スキップ / 2回表示）
// ------------------------------------------------------------

let words = [];
let currentIndex = 0;
let showAnswer = false;
let repeatCount = 0;
let audio = null;

// 隠すフラグ
let hideEnglish = false;    // 英語 + IPA + カタカナ
let hideJapanese = false;   // 日本語

//------------------------------------------------------------
// 単語読み込み
//------------------------------------------------------------
async function loadWords() {
  try {
    const res = await fetch('words.json');
    words = await res.json();
    document.getElementById('count').textContent = words.length;
    document.getElementById('counter').textContent = '0 / ' + words.length;
  } catch (e) {
    alert("words.json が見つかりません。GitHub の配置位置を確認してください。");
  }
}

//------------------------------------------------------------
// ファイル名整形（MP3 用）
//------------------------------------------------------------
function sanitizeFilename(s) {
  return s.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
}

//------------------------------------------------------------
// 学習スタート
//------------------------------------------------------------
function startStudying() {
  if (words.length === 0) return alert("単語がありません");
  currentIndex = 0;
  showAnswer = false;
  repeatCount = 0;

  renderCard();
  document.getElementById('studyArea').style.display = 'block';
  document.getElementById('controls').style.display = 'flex';
}

//------------------------------------------------------------
// ⭐ カード描画（隠す処理 完全統合版）
//------------------------------------------------------------
function renderCard() {
  const w = words[currentIndex];

  document.getElementById('counter').textContent =
    (currentIndex + 1) + " / " + words.length + " (表示:" + (repeatCount + 1) + "/2)";

  // ⭐ 英語/IPA/カタカナ 隠す
  if (hideEnglish) {
    document.getElementById('english').textContent = "（隠れています）";
    document.getElementById('ipa').textContent = "";
    document.getElementById('katakana').textContent = "（隠れています）";
  } else {
    document.getElementById('english').textContent = w.english;
    document.getElementById('ipa').textContent = w.ipa;

    if (!showAnswer) {
      document.getElementById('katakana').textContent = w.katakana;
    } else {
      document.getElementById('katakana').textContent = "";
    }
  }

  // ⭐ 日本語は showAnswer のときだけ
  if (!showAnswer) {
    document.getElementById('japanese').textContent = "";
    document.getElementById('hint').textContent = "タップして答えを表示";

    // MP3 再生（英語が隠れてないときのみ）
    if (!hideEnglish) playAudioForWord(w.english);

  } else {
    document.getElementById('hint').textContent =
      "タップして " + (repeatCount === 0 ? "2回目へ" : "次へ");

    if (!hideJapanese) {
      document.getElementById('japanese').textContent = w.japanese;
    } else {
      document.getElementById('japanese').textContent = "（隠れています）";
    }
  }
}

//------------------------------------------------------------
// カードクリック
//------------------------------------------------------------
function cardClicked() {
  if (!showAnswer) {
    showAnswer = true;
    renderCard();
    return;
  }

  if (repeatCount === 0) {
    repeatCount = 1;
    showAnswer = false;
    renderCard();
    return;
  }

  nextWord();
}

//------------------------------------------------------------
// 次の単語へ
//------------------------------------------------------------
function nextWord() {
  if (currentIndex < words.length - 1) {
    currentIndex++;
    repeatCount = 0;
    showAnswer = false;
    renderCard();
  } else {
    alert("学習が終了しました！");
    document.getElementById('studyArea').style.display = 'none';
    document.getElementById('controls').style.display = 'none';
  }
}

//------------------------------------------------------------
// スキップ
//------------------------------------------------------------
function skipRepeat() {
  nextWord();
}

//------------------------------------------------------------
// シャッフル
//------------------------------------------------------------
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

//------------------------------------------------------------
// MP3 再生（audio_mp3 のみを使う）
//------------------------------------------------------------
function playAudioForWord(text) {
  const fname = sanitizeFilename(text);
  const mp3 = "audio_mp3/" + fname + ".mp3";

  fetch(mp3, { method: "HEAD" }).then(res => {
    if (res.ok) playAudio(mp3);
  });
}

function playAudio(url) {
  if (audio) audio.pause();
  audio = new Audio(url);
  audio.play().catch(e => console.log("音声エラー:", e));
}

//------------------------------------------------------------
// イベント登録
//------------------------------------------------------------
window.addEventListener("load", () => {
  loadWords();

  document.getElementById('startBtn').addEventListener('click', startStudying);
  document.getElementById('card').addEventListener('click', cardClicked);

  // ⭐ 発音ボタン → MP3再生へ変更済み
  document.getElementById('speakBtn').addEventListener('click', () => {
    playAudioForWord(words[currentIndex].english);
  });

  document.getElementById('nextBtn').addEventListener('click', cardClicked);

  // ⭐ 英語/IPA/カタカナ 隠す
  document.getElementById('toggleEnglishBtn').addEventListener('click', () => {
    hideEnglish = !hideEnglish;
    alert(hideEnglish ? "英語/IPA/カタカナを隠します" : "表示します");
    renderCard();
  });

  // ⭐ 日本語 隠す
  document.getElementById('toggleJapaneseBtn').addEventListener('click', () => {
    hideJapanese = !hideJapanese;
    alert(hideJapanese ? "日本語を隠します" : "表示します");
    renderCard();
  });

  // スキップ
  document.getElementById('skipBtn').addEventListener('click', skipRepeat);

  // シャッフル
  document.getElementById('shuffleBtn').addEventListener('click', shuffleWords);

  // 終了
  document.getElementById('stopBtn').addEventListener('click', () => {
    document.getElementById('studyArea').style.display = 'none';
    document.getElementById('controls').style.display = 'none';
  });
});
