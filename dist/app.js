const KEY = 'hitokoto-drive-v1';
const $ = id => document.getElementById(id);
let counts = Array(30).fill(0); counts[0] = counts[1] = 100;
let selected = 2;
try {
  const data = JSON.parse(localStorage.getItem(KEY));
  if (data && Array.isArray(data.counts)) {
    counts = counts.map((fallback, i) => Number.isFinite(data.counts[i]) ? Math.min(100, Math.max(0, Math.floor(data.counts[i]))) : fallback);
    if (Number.isInteger(data.selected) && data.selected >= 0 && data.selected < 30) selected = data.selected;
  }
} catch { $('saveStatus').textContent = 'このブラウザでは進捗を読み込めませんでした。'; }
function save() {
  try {localStorage.setItem(KEY, JSON.stringify({counts, selected})); $('saveStatus').textContent = '';}
  catch { $('saveStatus').textContent = '進捗を保存できません。ブラウザの保存設定をご確認ください。'; }
}
function render() {
  const [pattern, sentence, translation, category] = lessons[selected];
  $('dayLabel').textContent = `DAY ${String(selected + 1).padStart(2, '0')}`;
  $('category').textContent = category;
  $('pattern').textContent = pattern;
  $('sentence').textContent = sentence;
  $('translation').textContent = translation;
  const n = counts[selected];
  $('number').textContent = n;
  $('ring').style.strokeDashoffset = 452.39 * (1 - n / 100);
  $('count').disabled = n === 100;
  $('count').setAttribute('aria-label', `${n}回練習済み。タップして1回追加`);
  $('undo').disabled = n === 0;
  $('countStatus').textContent = n === 100 ? '今日のひとこと、身につきました。' : n >= 50 ? '折り返しを過ぎました。その調子！' : '少しずつ、あなたの言葉に。';
  $('prev').disabled = selected === 0;
  $('next').disabled = selected === 29;
  const completed = counts.filter(n => n === 100).length;
  $('total').textContent = `${completed} / 30 日 完了`;
  $('overall').style.width = `${completed / 30 * 100}%`;
}
function switchTab(list) {
  $('list').hidden = !list; $('practice').hidden = list;
  $('listTab').classList.toggle('active', list); $('practiceTab').classList.toggle('active', !list);
  if(list) {stopAuto(); renderList();}
}
function renderList() {
  $('lessonList').replaceChildren(...lessons.map((lesson, i) => {
    const button = document.createElement('button'); button.className = 'row';
    const day = document.createElement('span'); day.className = 'day'; day.innerHTML = `DAY<b>${String(i+1).padStart(2,'0')}</b>`;
    const text = document.createElement('span'); text.className = 'rowtext';
    const title = document.createElement('strong'); title.textContent = lesson[0];
    const subtitle = document.createElement('small'); subtitle.textContent = lesson[2]; text.append(title,subtitle);
    const status = document.createElement('span'); status.className = counts[i] === 100 ? 'done' : 'partial'; status.textContent = counts[i] === 100 ? '✓' : `${counts[i]} / 100`;
    button.setAttribute('aria-label', `DAY ${i+1} ${lesson[0]} ${counts[i]}回練習済み`);
    button.append(day,text,status); button.onclick = () => {select(i);switchTab(false);window.scrollTo({top:0,behavior:'smooth'});}; return button;
  }));
}
function select(i) { stopAuto(); stopModelAudio(); if ('speechSynthesis' in window) speechSynthesis.cancel(); selected = i; $('audioStatus').textContent = ''; save(); render(); }
function increment() { if(counts[selected] < 100) {counts[selected]++;save();render();} }
$('count').onclick = increment;
$('undo').onclick = () => {counts[selected] = Math.max(0,counts[selected]-1);save();render();};
$('prev').onclick = () => select(Math.max(0,selected-1));
$('next').onclick = () => select(Math.min(29,selected+1));
$('practiceTab').onclick = () => switchTab(false); $('listTab').onclick = () => switchTab(true);
// One bundled voice for every device; never silently fall back to browser TTS.
let modelAudio = null;
function stopModelAudio() {
  if (modelAudio) {
    modelAudio.pause();
    modelAudio.onended = null;
    modelAudio.onerror = null;
    modelAudio = null;
  }
  $('audioStatus').textContent = '';
}
$('speak').onclick = async () => {
  stopAuto('お手本の再生のため自動カウントを停止しました。');
  stopModelAudio();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  const audio = new Audio(`audio/day-${String(selected + 1).padStart(2, '0')}.wav`);
  modelAudio = audio;
  audio.playbackRate = 1;
  audio.onended = () => {if(modelAudio === audio) stopModelAudio();};
  audio.onerror = () => {if(modelAudio === audio) $('audioStatus').textContent = 'お手本を読み込めませんでした。もう一度お試しください。';};
  $('audioStatus').textContent = 'お手本を再生中…';
  try {await audio.play();}
  catch {if(modelAudio === audio) $('audioStatus').textContent = '再生できませんでした。もう一度ボタンを押してください。';}
};

render();

let micSession = null;
let micGeneration = 0;
function stopAuto(message = '自動カウントを停止しました。') {
  micGeneration++;
  const session = micSession;
  micSession = null;
  if (session) {
    cancelAnimationFrame(session.frame);
    session.stream?.getTracks().forEach(track => track.stop());
    session.context?.close().catch(() => {});
  }
  $('autoStart').textContent = 'マイクで自動カウントを開始';
  $('autoStart').setAttribute('aria-pressed', 'false');
  $('micLevel').style.width = '0%';
  if (session) $('micStatus').textContent = message;
}
$('autoStart').onclick = async () => {
  if (micSession) {stopAuto();return;}
  if (counts[selected] >= 100) {$('micStatus').textContent = 'この日は100回達成済みです。';return;}
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!navigator.mediaDevices?.getUserMedia || !AudioEngine) {
    $('micStatus').textContent = 'マイクを利用できません。HTTPSのページ、またはlocalhostで開いてください。';return;
  }
  stopModelAudio();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  const generation = ++micGeneration;
  const session = {frame:0}; micSession = session;
  $('autoStart').textContent = '自動カウントを停止';
  $('autoStart').setAttribute('aria-pressed','true');
  $('micStatus').textContent = 'マイクの許可を待っています…';
  try {
    session.context = new AudioEngine();
    await session.context.resume();
    if (generation !== micGeneration) return;
    const stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    if (generation !== micGeneration) {stream.getTracks().forEach(t=>t.stop());return;}
    session.stream = stream;
    stream.getAudioTracks().forEach(track => track.onended = () => {if(micSession === session) stopAuto('マイクとの接続が終了しました。');});
    const analyser = session.context.createAnalyser(); analyser.fftSize = 2048;
    session.source = session.context.createMediaStreamSource(stream);
    session.source.connect(analyser);
    session.silentGain = session.context.createGain();
    session.silentGain.gain.value = 0;
    analyser.connect(session.silentGain);
    session.silentGain.connect(session.context.destination);
    await session.context.resume();
    if (generation !== micGeneration) return;
    const data = new Float32Array(analyser.fftSize);
    const detector = new VoiceCounter(800); session.detector = detector;
    const noiseSamples = [];
    let threshold = .004;
    let inputSeen = false;
    const calibrationEnd = performance.now() + 1000;
    $('micStatus').textContent = '1秒ほど静かにしてください。周囲の音を確認中…';
    function frame(now) {
      if (micSession !== session) return;
      analyser.getFloatTimeDomainData(data);
      const rms = Math.sqrt(data.reduce((sum,x)=>sum+x*x,0)/data.length);
      $('micLevel').style.width = `${Math.min(100,rms*700)}%`;
      if (rms > .00001) inputSeen = true;
      if (now < calibrationEnd) {noiseSamples.push(rms); threshold = voiceThreshold(noiseSamples);}
      else {
        if (session.context.state !== 'running') {
          stopAuto('マイクが一時停止しました。開始ボタンを押し直してください。');return;
        }
        const loud = rms >= (detector.armed ? threshold : threshold*.7);
        if (detector.sample(loud,now)) {
          increment();
          if (counts[selected] >= 100) {stopAuto('100回達成！ 自動カウントを終了しました。');return;}
        }
        $('micStatus').textContent = !inputSeen && now > calibrationEnd + 3000 ? 'マイクの入力が届いていません。端末のマイク設定を確認してください。' : loud ? '声を検知中。ひと続きの発話は1回です。' : detector.armed ? '準備OK。次の例文を話してください。' : 'ひと息あけてください…';
      }
      session.frame = requestAnimationFrame(frame);
    }
    session.frame = requestAnimationFrame(frame);
  } catch (error) {
    if (generation !== micGeneration) return;
    stopAuto();
    $('micStatus').textContent = error.name === 'NotAllowedError' ? 'マイクが許可されていません。ブラウザの設定から許可してください。' : 'マイクを開始できませんでした。接続を確認して再度お試しください。';
  }
};
document.addEventListener('visibilitychange',()=>{if(document.hidden) stopAuto('画面を閉じたため停止しました。再開するには開始を押してください。');});
window.addEventListener('pagehide',()=>stopAuto());
