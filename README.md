<div align="center">

# ✦ AI Browser Assistant — Chrome Extension

**The open-source AI-powered Chrome extension that reads, understands, and controls your browser — just like Comet, but free and fully yours.**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://github.com/kashif0700444846/ai-browser-assistant)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green?style=for-the-badge)](https://developer.chrome.com/docs/extensions/mv3/)
[![Claude AI](https://img.shields.io/badge/Powered%20by-Claude%20AI-orange?style=for-the-badge)](https://anthropic.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
[![Stars](https://img.shields.io/github/stars/kashif0700444846/ai-browser-assistant?style=for-the-badge)](https://github.com/kashif0700444846/ai-browser-assistant/stargazers)

> 🤖 **Chat with any webpage. Click buttons. Fill forms. Summarize content. All with natural language.**

[📦 Install](#-installation) • [🚀 Features](#-features) • [🛠️ How It Works](#️-how-it-works) • [🤝 Contributing](#-contributing)

</div>

---

## 🌟 What Is AI Browser Assistant?

**AI Browser Assistant** is a free, open-source Chrome extension that brings the power of **Claude AI** directly into your browser's side panel. Describe what you want in plain English, and the extension reads your current page, takes screenshots, clicks elements, fills forms, and navigates — all hands-free.

Think of it as your own **Comet browser alternative** — without switching browsers, without subscriptions, and with full control over your data.

> Inspired by Comet browser. Built inside Chrome. Free forever.

---

## 🚀 Features

### 🧠 AI That Understands Your Page
- Reads the **full visible text** of any webpage (up to 8,000 characters)
- Detects all **interactive elements** — links, buttons, inputs, dropdowns
- Understands **page structure, titles, URLs, and metadata**

### 👁️ Vision Mode — Screenshot Analysis
- Takes a **live screenshot** of your current tab using Chrome's native API
- Sends it to Claude's **vision model** alongside your question
- Claude can see and describe what's on screen, even for image-heavy pages

### ⚡ Page Actions — AI Controls Your Browser

Claude can perform real actions on your page:

| Action | Example Prompt |
|--------|----------------|
| **Click** | *"Click the Sign In button"* |
| **Type** | *"Search for Claude AI in the search box"* |
| **Scroll** | *"Scroll down to see more content"* |
| **Navigate** | *"Go to the pricing page"* |

### 💬 Conversational Side Panel
- Beautiful **dark-mode chat UI** in Chrome's native side panel
- **Quick suggestion buttons** for instant common tasks
- Animated thinking indicator while Claude processes
- **Visual indicator badge** on the page when AI is working
- Auto-resizing textarea for longer prompts

### ⚙️ Flexible Settings
- Bring your own **Anthropic API key** — your key, your data
- Switch between any Claude model (claude-opus-4-6, claude-sonnet, etc.)
- Toggle **Read Page**, **Screenshot**, and **Actions** modes independently
- Settings panel built directly into the side panel

### 🔒 Privacy First
- **No external data storage** — API calls go directly from your browser to Anthropic
- Your API key is stored locally in `chrome.storage.local` only
- No tracking, no analytics, no third-party servers
- Fully open-source — audit every single line

---

## 📸 Preview

```
┌─────────────────────────────────┐
│  ✦ AI Browser Assistant     ⚙  │
│  ● github.com                   │
├─────────────────────────────────┤
│                                 │
│           ✦                     │
│     AI Browser Assistant        │
│  I can read your page, take     │
│  screenshots, and perform       │
│  actions. Ask me anything!      │
│                                 │
│  ┌──────────────────────────┐   │
│  │  Summarize this page     │   │
│  ├──────────────────────────┤   │
│  │  What are the main links?│   │
│  ├──────────────────────────┤   │
│  │  Click the search button │   │
│  ├──────────────────────────┤   │
│  │  Scroll & tell me more   │   │
│  └──────────────────────────┘   │
│                                 │
├─────────────────────────────────┤
│ [📄 Read] [📸 Screenshot] [⚡]  │
│ ┌───────────────────────┐  [↑]  │
│ │ Ask about this page.. │       │
│ └───────────────────────┘       │
└─────────────────────────────────┘
```

---

## 📦 Installation

### Method 1: Load Unpacked (Developer Mode)

1. **Clone** this repository:
   ```bash
   git clone https://github.com/kashif0700444846/ai-browser-assistant.git
   ```

2. Open Chrome and go to:
   ```
   chrome://extensions/
   ```

3. Enable **Developer Mode** (toggle in the top-right corner)

4. Click **"Load unpacked"** → select the `ai-browser-assistant` folder

5. The **✦ icon** appears in your Chrome toolbar — you're ready!

### Method 2: Download ZIP

1. Click [Code → Download ZIP](https://github.com/kashif0700444846/ai-browser-assistant/archive/refs/heads/main.zip)
2. Extract the ZIP
3. Follow steps 2–5 above

---

## 🔑 Setup Your API Key

1. Click the **✦ extension icon** in Chrome toolbar
2. Click **"Open Side Panel"**
3. Click **⚙ Settings** (top-right of the panel)
4. Paste your **Anthropic API key** (starts with `sk-ant-...`)
5. Click **Save Settings**

> Get your API key free at [console.anthropic.com](https://console.anthropic.com)

---

## 🛠️ How It Works

```
User types a message
        │
        ▼
sidepanel.js gathers context
  ├── Page text  (chrome.scripting.executeScript)
  └── Screenshot (chrome.tabs.captureVisibleTab)
        │
        ▼
background.js calls Claude API
  └── Sends: page text + screenshot + user message
        │
   ┌────┴────┐
   │         │
 Text      Action JSON
 reply     {type, target, value}
   │         │
   │    User clicks "Execute Action"
   │         │
   └────┬────┘
        ▼
content.js executes DOM action
  ├── click  → el.click()
  ├── type   → el.value + dispatchEvent
  ├── scroll → window.scrollBy()
  └── navigate → chrome.tabs.update()
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension Platform | Chrome Manifest V3 |
| AI Model | Claude (Anthropic API) |
| Page Reading | `chrome.scripting.executeScript` |
| Screenshots | `chrome.tabs.captureVisibleTab` |
| Side Panel | `chrome.sidePanel` API (Chrome 114+) |
| Dependencies | **Zero** — pure HTML/CSS/JS |

---

## 📁 Project Structure

```
ai-browser-assistant/
├── manifest.json     # MV3 extension configuration
├── background.js     # Service worker: Claude API calls, tab management
├── content.js        # Injected script: DOM actions + working indicator
├── popup.html        # Toolbar popup UI
├── popup.js          # Popup logic (CSP-compliant external file)
├── sidepanel.html    # Main chat interface
├── sidepanel.js      # Chat logic, settings, message passing
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🗺️ Roadmap

- [ ] Multi-step task chaining — *"Fill the form, then submit it"*
- [ ] Voice input — speak your commands
- [ ] Tab switching — AI navigates between open tabs
- [ ] Web scraping mode — extract structured data from any page
- [ ] Keyboard shortcut to open/close side panel
- [ ] Conversation history saved per site
- [ ] Chrome Web Store listing

---

## 📊 Comparison

| Feature | AI Browser Assistant | Comet Browser | Other AI Extensions |
|---------|:-------------------:|:-------------:|:-------------------:|
| Works inside Chrome | ✅ | ❌ Separate browser | ✅ |
| Open Source | ✅ | ❌ | Rarely |
| Bring Your Own Key | ✅ | ❌ | Rarely |
| Page Action Control | ✅ | ✅ | Limited |
| Vision / Screenshot | ✅ | ✅ | Limited |
| Free to Use | ✅ | Paid | Mixed |
| Zero Tracking | ✅ | Unknown | Varies |
| No Dependencies | ✅ | N/A | Varies |

---

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

```bash
# 1. Fork the repo
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/ai-browser-assistant.git

# 3. Make your changes
# 4. Load unpacked in Chrome to test
# 5. Open a Pull Request
```

Please open an **Issue** before submitting large changes.

---

## ❓ FAQ

**Does it work on every website?**
Yes — content scripts inject into all `<all_urls>`. Restricted Chrome pages (`chrome://`, extensions) are excluded by Chrome's policy.

**Is my API key safe?**
Your key is stored only in `chrome.storage.local` on your device and sent exclusively to Anthropic's API. No third-party server ever sees it.

**How much does it cost to use?**
The extension is free. You pay Anthropic for API tokens — typically **$0.001–$0.02 per conversation turn** depending on page size.

**What Claude model does it use?**
Default is `claude-opus-4-6`. You can change it in the Settings panel to any model you have access to.

**Can it work without internet?**
No — it requires an internet connection to call the Claude API.

---

## 📜 License

[MIT](LICENSE) — free to use, fork, modify, and distribute.

---

<div align="center">

**Made with ❤️ by [M Kashif](https://github.com/kashif0700444846)**

⭐ **Star this repo** if it helped you — it helps others find it!

[![Share on X](https://img.shields.io/badge/Share%20on%20X-000000?style=for-the-badge&logo=x&logoColor=white)](https://twitter.com/intent/tweet?text=%F0%9F%A4%96+AI+Browser+Assistant+-+Free+open-source+Chrome+extension+powered+by+Claude+AI%21+Chat+with+any+webpage%2C+click+buttons%2C+fill+forms+with+natural+language.+Like+Comet+browser+but+FREE+%26+open-source%21&url=https%3A%2F%2Fgithub.com%2Fkashif0700444846%2Fai-browser-assistant&hashtags=AI%2CChromeExtension%2CClaudeAI%2COpenSource%2CWebAutomation%2CBrowserAI)
[![Share on LinkedIn](https://img.shields.io/badge/Share%20on%20LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fgithub.com%2Fkashif0700444846%2Fai-browser-assistant)

</div>
