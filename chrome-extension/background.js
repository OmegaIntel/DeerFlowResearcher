const TAVILY_API_KEY = 'YOUR_TAVILY_API_KEY';
const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY';
let mediaRecorder;
let chunks = [];

async function runCommand(name, args = {}, tabId) {
  if (name === 'open') {
    const url = args.url || '';
    if (url) chrome.tabs.create({url});
    return `Opened ${url}`;
  }
  if (name === 'search') {
    const query = args.query || '';
    if (TAVILY_API_KEY && TAVILY_API_KEY !== 'YOUR_TAVILY_API_KEY') {
      const data = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({api_key: TAVILY_API_KEY, query, max_results: 5})
      }).then(r => r.json());
      return JSON.stringify(data, null, 2);
    }
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    chrome.tabs.create({url});
    return `Searching for ${query}`;
  }
  if (name === 'click' && tabId) {
    const selector = args.selector || '';
    await chrome.scripting.executeScript({
      target: {tabId},
      func: sel => { const el = document.querySelector(sel); if (el) el.click(); },
      args: [selector]
    });
    return `Clicked ${selector}`;
  }
  if (name === 'fill' && tabId) {
    const selector = args.selector || '';
    const text = args.text || '';
    await chrome.scripting.executeScript({
      target: {tabId},
      func: (sel, val) => {
        const el = document.querySelector(sel);
        if (el) { el.value = val; el.dispatchEvent(new Event('input', {bubbles:true})); }
      },
      args: [selector, text]
    });
    return `Filled ${selector}`;
  }
  if (name === 'scrape') {
    const selector = args.selector || '';
    if (tabId) {
      const res = await chrome.scripting.executeScript({
        target: {tabId},
        func: sel => { const el = document.querySelector(sel); return el ? el.innerText : document.body.innerText; },
        args: [selector]
      });
      return res && res[0] ? res[0].result : '';
    }
    return 'No active tab';
  }
  if (name === 'screenshot') {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {format: 'png'});
    chrome.runtime.sendMessage({type: 'screenshot', dataUrl});
    return 'Screenshot taken';
  }
  return 'Unknown command';
}

async function runAgent(task, sender) {
  let messages = [
    {role: 'system', content: 'You are an automation agent controlling the browser using functions.'},
    {role: 'user', content: task}
  ];
  const functions = [
    {name: 'open', parameters: {type: 'object', properties: {url: {type: 'string'}}, required: ['url']}},
    {name: 'search', parameters: {type: 'object', properties: {query: {type: 'string'}}, required: ['query']}},
    {name: 'click', parameters: {type: 'object', properties: {selector: {type: 'string'}}, required: ['selector']}},
    {name: 'fill', parameters: {type: 'object', properties: {selector: {type: 'string'}, text: {type: 'string'}}, required: ['selector','text']}},
    {name: 'scrape', parameters: {type: 'object', properties: {selector: {type: 'string'}}, required: []}},
    {name: 'screenshot', parameters: {type: 'object', properties: {}, required: []}}
  ];
  while (true) {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}`},
      body: JSON.stringify({model: 'gpt-4o', messages, functions})
    }).then(r => r.json());
    const msg = resp.choices[0].message;
    if (msg.function_call) {
      const {name, arguments: argStr} = msg.function_call;
      let args;
      try { args = JSON.parse(argStr || '{}'); } catch { args = {}; }
      const result = await runCommand(name, args, sender.tab ? sender.tab.id : null);
      messages.push(msg);
      messages.push({role: 'function', name, content: result});
      chrome.runtime.sendMessage({type: 'status', text: `${name} executed`});
    } else {
      chrome.runtime.sendMessage({type: 'prompt-result', text: msg.content});
      chrome.runtime.sendMessage({type: 'status', text: 'Done'});
      break;
    }
  }
}

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.type === 'start-record') {
    if (!mediaRecorder) {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, {type: 'audio/webm'});
        chunks = [];
        chrome.runtime.sendMessage({type: 'status', text: 'Transcribing...'});
        if (OPENAI_API_KEY && OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY') {
          const formData = new FormData();
          formData.append('file', blob, 'audio.webm');
          formData.append('model', 'whisper-1');
          fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
            body: formData
          }).then(r => r.json()).then(data => {
            chrome.runtime.sendMessage({type: 'transcript', text: data.text});
            chrome.runtime.sendMessage({type: 'status', text: 'Done'});
          }).catch(() => {
            chrome.runtime.sendMessage({type: 'status', text: 'Error'});
          });
        } else {
          const arrayBuffer = await blob.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          fetch('http://localhost:3001/transcribe', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({audio: base64})
          }).then(r => r.json()).then(data => {
            chrome.runtime.sendMessage({type: 'transcript', text: data.text});
            chrome.runtime.sendMessage({type: 'status', text: 'Done'});
          }).catch(() => {
            chrome.runtime.sendMessage({type: 'status', text: 'Error'});
          });
        }
      };
    }
    mediaRecorder.start();
  } else if (msg.type === 'stop-record') {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  } else if (msg.type === 'run-prompt') {
    chrome.runtime.sendMessage({type: 'status', text: 'Running...'});
    const p = msg.prompt.trim();
    if (p.startsWith('open:')) {
      const url = p.slice(5).trim();
      chrome.tabs.create({url});
      chrome.runtime.sendMessage({type: 'prompt-result', text: `Opened ${url}`});
      chrome.runtime.sendMessage({type: 'status', text: 'Done'});
      return;
    }
    if (p.startsWith('search:')) {
      const query = p.slice(7).trim();
      if (TAVILY_API_KEY && TAVILY_API_KEY !== 'YOUR_TAVILY_API_KEY') {
        fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({api_key: TAVILY_API_KEY, query, max_results: 5})
        }).then(r => r.json()).then(data => {
          chrome.runtime.sendMessage({type: 'prompt-result', text: JSON.stringify(data, null, 2)});
          chrome.runtime.sendMessage({type: 'status', text: 'Done'});
        }).catch(() => {
          chrome.runtime.sendMessage({type: 'status', text: 'Error'});
        });
      } else {
        const q = encodeURIComponent(query);
        const url = `https://www.google.com/search?q=${q}`;
        chrome.tabs.create({url});
        chrome.runtime.sendMessage({type: 'prompt-result', text: `Searching for ${query}`});
        chrome.runtime.sendMessage({type: 'status', text: 'Done'});
      }
      return;
    }
    if (p.startsWith('click:')) {
      const selector = p.slice(6).trim();
      if (sender.tab && sender.tab.id) {
        chrome.scripting.executeScript({
          target: {tabId: sender.tab.id},
          func: sel => {
            const el = document.querySelector(sel);
            if (el) el.click();
          },
          args: [selector]
        });
      }
      chrome.runtime.sendMessage({type: 'prompt-result', text: `Clicked ${selector}`});
      chrome.runtime.sendMessage({type: 'status', text: 'Done'});
      return;
    }
    if (p.startsWith('fill:')) {
      const parts = p.slice(5).split('|');
      const selector = (parts[0] || '').trim();
      const value = (parts[1] || '').trim();
      if (sender.tab && sender.tab.id) {
        chrome.scripting.executeScript({
          target: {tabId: sender.tab.id},
          func: (sel, val) => {
            const el = document.querySelector(sel);
            if (el) {
              el.value = val;
              el.dispatchEvent(new Event('input', {bubbles: true}));
            }
          },
          args: [selector, value]
        });
      }
      chrome.runtime.sendMessage({type: 'prompt-result', text: `Filled ${selector}`});
      chrome.runtime.sendMessage({type: 'status', text: 'Done'});
      return;
    }
    if (p.startsWith('scrape:')) {
      const selector = p.slice(7).trim();
      if (sender.tab && sender.tab.id) {
        chrome.scripting.executeScript({
          target: {tabId: sender.tab.id},
          func: sel => {
            const el = document.querySelector(sel);
            return el ? el.innerText : document.body.innerText;
          },
          args: [selector]
        }, res => {
          const text = res && res[0] ? res[0].result : '';
          chrome.runtime.sendMessage({type: 'prompt-result', text});
          chrome.runtime.sendMessage({type: 'status', text: 'Done'});
        });
      } else {
        chrome.runtime.sendMessage({type: 'prompt-result', text: 'No active tab'});
        chrome.runtime.sendMessage({type: 'status', text: 'Done'});
      }
      return;
    }
    if (p === 'screenshot') {
      chrome.tabs.captureVisibleTab(null, {format: 'png'}, dataUrl => {
        chrome.runtime.sendMessage({type: 'screenshot', dataUrl});
        chrome.runtime.sendMessage({type: 'prompt-result', text: 'Screenshot taken'});
        chrome.runtime.sendMessage({type: 'status', text: 'Done'});
      });
      return;
    }
    fetch('http://localhost:3001/prompt', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({prompt: msg.prompt, url: sender.tab ? sender.tab.url : ''})
    }).then(r => r.json()).then(data => {
      chrome.runtime.sendMessage({type: 'prompt-result', text: data.text});
      chrome.runtime.sendMessage({type: 'status', text: 'Done'});
    }).catch(() => {
      chrome.runtime.sendMessage({type: 'status', text: 'Error'});
    });
  } else if (msg.type === 'run-agent') {
    chrome.runtime.sendMessage({type: 'status', text: 'Running agent...'});
    if (OPENAI_API_KEY && OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY') {
      await runAgent(msg.prompt.trim(), sender);
    } else {
      chrome.runtime.sendMessage({type: 'status', text: 'OPENAI_API_KEY not set'});
    }
  }
});
