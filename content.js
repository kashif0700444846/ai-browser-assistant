// Content script - runs on every page, bridges background <-> DOM

// Inject floating indicator when AI is working
function showWorkingIndicator(show) {
  let indicator = document.getElementById('ai-assistant-indicator');
  if (show) {
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'ai-assistant-indicator';
      indicator.style.cssText = `
        position: fixed; top: 12px; right: 12px; z-index: 2147483647;
        background: #6366f1; color: white; padding: 8px 14px;
        border-radius: 20px; font-family: sans-serif; font-size: 13px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.3); pointer-events: none;
        display: flex; align-items: center; gap: 8px;
      `;
      indicator.innerHTML = '<span style="animation: spin 1s linear infinite; display:inline-block">&#x27F3;</span> AI working...';
      const style = document.createElement('style');
      style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
      document.body.appendChild(indicator);
    }
  } else if (indicator) {
    indicator.remove();
  }
}

// Single unified message listener — handles all message types from background/sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SHOW_INDICATOR") {
    showWorkingIndicator(message.show);
    // No async response needed for this message type
    return false;
  }

  if (message.type === "HIGHLIGHT_ELEMENT") {
    const elements = Array.from(
      document.querySelectorAll('a, button, input, select, textarea, [role="button"]')
    ).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    // Remove old highlights
    document.querySelectorAll('.ai-assistant-highlight').forEach(el => {
      el.classList.remove('ai-assistant-highlight');
      el.style.outline = '';
    });

    const target = elements[message.index] ||
      elements.find(el => el.textContent?.toLowerCase().includes(message.target?.toLowerCase()));

    if (target) {
      target.style.outline = '3px solid #6366f1';
      target.classList.add('ai-assistant-highlight');
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      sendResponse({ found: true });
    } else {
      sendResponse({ found: false });
    }
    return true; // keep channel open for sendResponse
  }
});
