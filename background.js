// Background Service Worker - handles AI API calls and tab management

// Configure side panel to open when the extension icon is clicked.
// This works alongside the popup: the popup can also call sidePanel.open().
// setPanelBehavior ensures the side panel icon behavior is registered.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});

// Open side panel when extension icon is clicked.
// NOTE: chrome.action.onClicked only fires when NO default_popup is set.
// Since manifest.json defines a popup, the user opens the side panel via the popup button.
// This listener is kept as a fallback for any future manifest changes.
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id }).catch((e) => {
    console.warn('sidePanel.open failed:', e.message);
  });
});

// Listen for messages from popup/sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_PAGE_CONTENT") {
    getPageContent(message.tabId).then(sendResponse);
    return true; // keep channel open for async
  }

  if (message.type === "TAKE_SCREENSHOT") {
    takeScreenshot(message.tabId).then(sendResponse);
    return true;
  }

  if (message.type === "ASK_AI") {
    askClaude(message.prompt, message.pageContent, message.screenshot, message.apiKey, message.model)
      .then(sendResponse);
    return true;
  }

  if (message.type === "EXECUTE_ACTION") {
    executeAction(message.action, message.tabId).then(sendResponse);
    return true;
  }

  if (message.type === "GET_ALL_TABS") {
    chrome.tabs.query({}, (tabs) => {
      sendResponse(tabs.map(t => ({ id: t.id, title: t.title, url: t.url })));
    });
    return true;
  }
});

// Extract clean page content via content script
async function getPageContent(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const getVisibleText = () => {
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: (node) => {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                const style = window.getComputedStyle(parent);
                if (style.display === 'none' || style.visibility === 'hidden') {
                  return NodeFilter.FILTER_REJECT;
                }
                const tag = parent.tagName.toLowerCase();
                if (['script', 'style', 'noscript'].includes(tag)) {
                  return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
              }
            }
          );

          let text = '';
          let node;
          while ((node = walker.nextNode())) {
            text += node.textContent.trim() + ' ';
          }
          return text.replace(/\s+/g, ' ').trim().slice(0, 8000);
        };

        const getInteractiveElements = () => {
          const elements = [];
          document.querySelectorAll('a, button, input, select, textarea, [role="button"]').forEach((el, i) => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              elements.push({
                index: i,
                tag: el.tagName.toLowerCase(),
                text: el.textContent?.trim().slice(0, 100) || '',
                placeholder: el.placeholder || '',
                href: el.href || '',
                type: el.type || '',
                id: el.id || '',
                name: el.name || '',
                ariaLabel: el.getAttribute('aria-label') || '',
              });
            }
          });
          return elements.slice(0, 50); // top 50 interactive elements
        };

        return {
          url: window.location.href,
          title: document.title,
          text: getVisibleText(),
          interactive: getInteractiveElements(),
          meta: {
            description: document.querySelector('meta[name="description"]')?.content || '',
          }
        };
      }
    });
    return { success: true, data: results[0].result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Take a screenshot of the visible tab
async function takeScreenshot(tabId) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'jpeg', quality: 70 });
    return { success: true, dataUrl };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Ask Claude AI with page context
async function askClaude(userPrompt, pageContent, screenshotDataUrl, apiKey, model) {
  if (!apiKey) return { success: false, error: "No API key set. Please add your Anthropic API key in settings." };
  // Fall back to a known-good default if no model is specified
  const modelToUse = (model && model.trim()) ? model.trim() : "claude-opus-4-5";

  const messages = [];
  const contentParts = [];

  // Add screenshot if available
  if (screenshotDataUrl) {
    const base64 = screenshotDataUrl.split(',')[1];
    contentParts.push({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: base64 }
    });
  }

  // Build context text
  let contextText = `You are a helpful browser assistant. The user is on this page:\n`;
  if (pageContent) {
    contextText += `URL: ${pageContent.url}\nTitle: ${pageContent.title}\n`;
    contextText += `Page Content (excerpt):\n${pageContent.text}\n\n`;
    if (pageContent.interactive?.length) {
      contextText += `Interactive Elements:\n`;
      pageContent.interactive.slice(0, 20).forEach(el => {
        contextText += `- [${el.tag}] "${el.text || el.placeholder || el.ariaLabel || el.id}" ${el.href ? `(link: ${el.href})` : ''}\n`;
      });
    }
  }
  contextText += `\nUser request: ${userPrompt}\n\nIf the user wants you to perform an action on the page, respond with JSON in this format:\n{"thought":"your reasoning","action":{"type":"click|type|scroll|navigate","target":"element description or index","value":"text to type or URL"},"response":"human readable explanation"}\n\nOtherwise respond normally.`;

  contentParts.push({ type: "text", text: contextText });
  messages.push({ role: "user", content: contentParts });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: modelToUse,
        max_tokens: 1024,
        messages
      })
    });

    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: err.error?.message || `API error ${res.status}` };
    }

    const data = await res.json();
    const rawText = data.content[0]?.text || '';

    // Try to parse as action JSON
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.action) {
          return { success: true, type: "action", action: parsed.action, response: parsed.response, thought: parsed.thought };
        }
      }
    } catch {}

    return { success: true, type: "text", response: rawText };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Execute DOM actions via content script
async function executeAction(action, tabId) {
  try {
    // Handle navigate without injecting a DOM script — just update the tab URL directly
    if (action.type === 'navigate') {
      await chrome.tabs.update(tabId, { url: action.value });
      return { success: true, message: `Navigating to ${action.value}` };
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (act) => {
        const findElement = (description, index) => {
          const interactives = Array.from(
            document.querySelectorAll('a, button, input, select, textarea, [role="button"]')
          ).filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });

          if (typeof index === 'number' && interactives[index]) return interactives[index];

          // Search by text/label
          const desc = description?.toLowerCase() || '';
          return interactives.find(el =>
            el.textContent?.toLowerCase().includes(desc) ||
            el.placeholder?.toLowerCase().includes(desc) ||
            el.getAttribute('aria-label')?.toLowerCase().includes(desc) ||
            el.id?.toLowerCase().includes(desc) ||
            el.name?.toLowerCase().includes(desc)
          );
        };

        if (act.type === 'click') {
          const el = findElement(act.target, act.index);
          if (el) { el.click(); return { success: true, message: `Clicked: ${el.textContent?.trim().slice(0,50)}` }; }
          return { success: false, message: `Element not found: ${act.target}` };
        }

        if (act.type === 'type') {
          const el = findElement(act.target, act.index);
          if (el) {
            el.focus();
            el.value = act.value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return { success: true, message: `Typed "${act.value}" into ${act.target}` };
          }
          return { success: false, message: `Input not found: ${act.target}` };
        }

        if (act.type === 'scroll') {
          window.scrollBy(0, act.value || 400);
          return { success: true, message: 'Scrolled' };
        }

        return { success: false, message: `Unknown action: ${act.type}` };
      },
      args: [action]
    });

    return results[0].result;
  } catch (e) {
    return { success: false, error: e.message };
  }
}
