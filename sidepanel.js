// Side Panel Logic

let currentTabId = null;
let pendingAction = null;
let usePageRead = true;
let useScreenshot = false;
let allowActions = true;
let isLoading = false;

// Load settings on open
chrome.storage.local.get(['apiKey', 'model'], (data) => {
  if (data.apiKey) document.getElementById('apiKeyInput').value = data.apiKey;
  // Use stored model or fall back to the default shown in the HTML
  if (data.model) document.getElementById('modelInput').value = data.model;
});

// Get current active tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) {
    currentTabId = tabs[0].id;
    document.getElementById('pageTitle').textContent = tabs[0].title || tabs[0].url;
  }
});

// Listen for tab changes
chrome.tabs.onActivated.addListener((info) => {
  currentTabId = info.tabId;
  chrome.tabs.get(info.tabId, (tab) => {
    document.getElementById('pageTitle').textContent = tab.title || tab.url;
  });
});

// Settings toggle
document.getElementById('settingsToggle').addEventListener('click', () => {
  const chatPanel = document.getElementById('chatPanel');
  const settingsPanel = document.getElementById('settingsPanel');
  const btn = document.getElementById('settingsToggle');

  if (settingsPanel.classList.contains('active')) {
    settingsPanel.classList.remove('active');
    chatPanel.classList.remove('hidden');
    btn.textContent = '⚙';
  } else {
    settingsPanel.classList.add('active');
    chatPanel.classList.add('hidden');
    btn.textContent = '✕';
  }
});

// Save settings
document.getElementById('saveSettings').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKeyInput').value.trim();
  const model = document.getElementById('modelInput').value.trim();
  chrome.storage.local.set({ apiKey, model }, () => {
    showStatus('settingsStatus', 'Saved!', 'success');
    setTimeout(() => showStatus('settingsStatus', '', ''), 2000);
  });
});

// Option toggles
document.getElementById('togglePageRead').addEventListener('click', function() {
  usePageRead = !usePageRead;
  this.classList.toggle('active', usePageRead);
});

document.getElementById('toggleScreenshot').addEventListener('click', function() {
  useScreenshot = !useScreenshot;
  this.classList.toggle('active', useScreenshot);
});

document.getElementById('toggleActions').addEventListener('click', function() {
  allowActions = !allowActions;
  this.classList.toggle('active', allowActions);
});

// Send on Enter (not Shift+Enter)
document.getElementById('userInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

document.getElementById('sendBtn').addEventListener('click', sendMessage);

// Wire up suggestion buttons via data-suggestion attribute (no inline onclick needed)
document.querySelectorAll('.suggestion-btn[data-suggestion]').forEach(btn => {
  btn.addEventListener('click', () => useSuggestion(btn.dataset.suggestion));
});

// Auto-resize textarea
document.getElementById('userInput').addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

function useSuggestion(text) {
  document.getElementById('userInput').value = text;
  sendMessage();
}

async function sendMessage() {
  if (isLoading) return;

  const input = document.getElementById('userInput');
  const text = input.value.trim();
  if (!text) return;

  const { apiKey } = await new Promise(r => chrome.storage.local.get(['apiKey'], r));
  if (!apiKey) {
    showStatus('statusMsg', 'Please set your API key in settings (⚙)', 'error');
    return;
  }

  hideWelcome();
  appendMessage('user', text);
  input.value = '';
  input.style.height = 'auto';

  isLoading = true;
  document.getElementById('sendBtn').disabled = true;
  showStatus('statusMsg', '');

  const thinkingEl = appendThinking();

  // Show indicator on page
  if (currentTabId) {
    chrome.tabs.sendMessage(currentTabId, { type: 'SHOW_INDICATOR', show: true }).catch(() => {});
  }

  try {
    // Gather context
    let pageContent = null;
    let screenshotDataUrl = null;

    if (usePageRead && currentTabId) {
      const result = await sendToBackground({ type: 'GET_PAGE_CONTENT', tabId: currentTabId });
      if (result.success) pageContent = result.data;
    }

    if (useScreenshot && currentTabId) {
      const result = await sendToBackground({ type: 'TAKE_SCREENSHOT', tabId: currentTabId });
      if (result.success) screenshotDataUrl = result.dataUrl;
    }

    // Read model from storage (may have been updated in settings)
    const { model: storedModel } = await new Promise(r => chrome.storage.local.get(['model'], r));

    // Ask Claude
    const response = await sendToBackground({
      type: 'ASK_AI',
      prompt: text,
      pageContent,
      screenshot: screenshotDataUrl,
      apiKey,
      model: storedModel || 'claude-opus-4-5'
    });

    thinkingEl.remove();

    if (!response.success) {
      appendMessage('assistant', `Error: ${response.error}`);
    } else if (response.type === 'action' && allowActions) {
      // Show response text
      if (response.response) appendMessage('assistant', response.response);

      // Show action card with execute button
      appendActionCard(response.action, response.thought);
    } else {
      appendMessage('assistant', response.response || response.message || 'Done.');
    }
  } catch (e) {
    thinkingEl.remove();
    appendMessage('assistant', `Unexpected error: ${e.message}`);
  }

  // Hide indicator
  if (currentTabId) {
    chrome.tabs.sendMessage(currentTabId, { type: 'SHOW_INDICATOR', show: false }).catch(() => {});
  }

  isLoading = false;
  document.getElementById('sendBtn').disabled = false;
}

function appendActionCard(action, thought) {
  const messages = document.getElementById('messages');
  const card = document.createElement('div');
  card.className = 'action-card';

  const iconMap = { click: '👆', type: '⌨️', scroll: '↕️', navigate: '🔗' };
  const icon = iconMap[action.type] || '⚡';

  // Build card DOM safely without innerHTML to avoid XSS
  const title = document.createElement('div');
  title.className = 'action-title';
  title.textContent = `${icon} Proposed Action: ${action.type.toUpperCase()}`;
  card.appendChild(title);

  const detail = document.createElement('div');
  detail.className = 'action-detail';
  if (action.target) {
    detail.textContent = `Target: ${action.target}`;
    if (action.value) {
      detail.textContent += ` | Value: ${action.value}`;
    }
  }
  card.appendChild(detail);

  if (thought) {
    const reasonEl = document.createElement('div');
    reasonEl.className = 'action-detail';
    reasonEl.style.cssText = 'color:#64748b;font-size:11px;';
    reasonEl.textContent = `Reasoning: ${thought}`;
    card.appendChild(reasonEl);
  }

  const runBtn = document.createElement('button');
  runBtn.className = 'run-action-btn';
  runBtn.textContent = 'Execute Action';
  card.appendChild(runBtn);

  messages.appendChild(card);
  scrollToBottom();

  runBtn.addEventListener('click', async function() {
    this.disabled = true;
    this.textContent = 'Running...';

    const result = await sendToBackground({
      type: 'EXECUTE_ACTION',
      action,
      tabId: currentTabId
    });

    if (result.success) {
      this.textContent = '✓ Done';
      this.style.background = '#16a34a';
      appendMessage('assistant', `Action completed: ${result.message}`);
    } else {
      this.textContent = '✕ Failed';
      this.style.background = '#dc2626';
      appendMessage('assistant', `Action failed: ${result.message || result.error}`);
    }
  });
}

function appendMessage(role, text) {
  const messages = document.getElementById('messages');
  const msg = document.createElement('div');
  msg.className = `message ${role}`;

  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = role === 'user' ? 'You' : 'Assistant';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = text;

  msg.appendChild(label);
  msg.appendChild(bubble);
  messages.appendChild(msg);
  scrollToBottom();
  return msg;
}

function appendThinking() {
  const messages = document.getElementById('messages');
  const wrapper = document.createElement('div');
  wrapper.className = 'message assistant';

  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = 'Assistant';

  const thinking = document.createElement('div');
  thinking.className = 'thinking';
  thinking.innerHTML = '<span></span><span></span><span></span>';

  wrapper.appendChild(label);
  wrapper.appendChild(thinking);
  messages.appendChild(wrapper);
  scrollToBottom();
  return wrapper;
}

function hideWelcome() {
  const w = document.getElementById('welcomeMsg');
  if (w) w.remove();
}

function scrollToBottom() {
  const messages = document.getElementById('messages');
  messages.scrollTop = messages.scrollHeight;
}

function showStatus(id, msg, type = '') {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = 'status-msg' + (type ? ` ${type}` : '');
}

function sendToBackground(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        // Background service worker may be inactive; return a structured error
        resolve({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response);
    });
  });
}
