const recordBtn = document.getElementById('recordBtn');
const statusEl = document.getElementById('status');
const transcriptEl = document.getElementById('transcript');
const summaryEl = document.getElementById('summary');
const historyEl = document.getElementById('history');
const downloadBtn = document.getElementById('downloadSummary');
const downloadTranscriptBtn = document.getElementById('downloadTranscript');
const screenshotImg = document.getElementById('screenshotImg');
const downloadScreenshotBtn = document.getElementById('downloadScreenshot');
const clearHistoryBtn = document.getElementById('clearHistory');
const downloadHistoryBtn = document.getElementById('downloadHistory');
let history = [];

function loadHistory() {
  const saved = localStorage.getItem('df_history');
  if (saved) {
    history = JSON.parse(saved);
    history.forEach(addHistoryElement);
  }
}

function saveHistory() {
  localStorage.setItem('df_history', JSON.stringify(history));
}

function addHistoryElement(item) {
  const div = document.createElement('div');
  div.textContent = `[${item.type}] ${item.text}`;
  historyEl.prepend(div);
}

function addHistory(type, text) {
  const item = {type, text};
  history.push(item);
  addHistoryElement(item);
  saveHistory();
}

loadHistory();
let recording = false;

recordBtn.addEventListener('click', () => {
  if (!recording) {
    chrome.runtime.sendMessage({type: 'start-record'});
    recordBtn.textContent = 'Stop Recording';
    recording = true;
  } else {
    chrome.runtime.sendMessage({type: 'stop-record'});
    recordBtn.textContent = 'Start Recording';
    recording = false;
  }
});

const summarizeBtn = document.getElementById('summarizeBtn');
summarizeBtn.addEventListener('click', async () => {
  const text = transcriptEl.value;
  if (!text) return;
  statusEl.textContent = 'Sending for summary...';
  addHistory('transcript', text);
  try {
    const resp = await fetch('http://localhost:3001/process-transcript', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        text,
        model: 'gpt-4o',
        model_name: 'gpt-4o',
        meeting_id: 'browser-meeting'
      })
    });
    const data = await resp.json();
    const meetingId = data.meeting_id || 'browser-meeting';
    statusEl.textContent = 'Processing...';
    // poll for summary
    const poll = setInterval(async () => {
      const r = await fetch(`http://localhost:3001/get-summary/${meetingId}`);
      const d = await r.json();
      if (d.status === 'completed') {
        clearInterval(poll);
        const res = JSON.stringify(d.data, null, 2);
        summaryEl.value = res;
        statusEl.textContent = 'Done';
        addHistory('summary', res);
      } else if (d.status === 'error') {
        clearInterval(poll);
        statusEl.textContent = 'Error';
      }
    }, 3000);
  } catch (e) {
    statusEl.textContent = 'Error';
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'transcript') {
    transcriptEl.value = msg.text;
    addHistory('transcript', msg.text);
  } else if (msg.type === 'status') {
    statusEl.textContent = msg.text;
  } else if (msg.type === 'screenshot') {
    screenshotImg.style.display = 'block';
    screenshotImg.src = msg.dataUrl;
    downloadScreenshotBtn.style.display = 'block';
    addHistory('screenshot', 'Image captured');
  }
});

const runBtn = document.getElementById('runPrompt');
const promptEl = document.getElementById('prompt');
const resultEl = document.getElementById('result');
runBtn.addEventListener('click', () => {
  const text = promptEl.value;
  if (text.trim().startsWith('agent:')) {
    const task = text.replace(/^agent:/i, '').trim();
    chrome.runtime.sendMessage({type: 'run-agent', prompt: task});
    addHistory('agent', task);
  } else {
    chrome.runtime.sendMessage({type: 'run-prompt', prompt: text});
    addHistory('prompt', text);
  }
  screenshotImg.style.display = 'none';
  downloadScreenshotBtn.style.display = 'none';
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'prompt-result') {
    resultEl.textContent = msg.text;
    addHistory('prompt', msg.text);
  }
});

downloadBtn.addEventListener('click', () => {
  const blob = new Blob([summaryEl.value], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'meeting_summary.json';
  a.click();
  URL.revokeObjectURL(url);
});

downloadTranscriptBtn.addEventListener('click', () => {
  const blob = new Blob([transcriptEl.value], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'meeting_transcript.json';
  a.click();
  URL.revokeObjectURL(url);
});

clearHistoryBtn.addEventListener('click', () => {
  history = [];
  historyEl.innerHTML = '';
  saveHistory();
});

downloadHistoryBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(history, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'history.json';
  a.click();
  URL.revokeObjectURL(url);
});

downloadScreenshotBtn.addEventListener('click', () => {
  const url = screenshotImg.src;
  const a = document.createElement('a');
  a.href = url;
  a.download = 'screenshot.png';
  a.click();
});
