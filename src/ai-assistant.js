// ─── AI Assistant — Gemini-powered form filler ────────────────────────────────
// This file is completely standalone. It only READS form fields and fills them.
// It does not modify any existing admin.js logic.

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`

// ─── Inject HTML ───────────────────────────────────────────────────────────────
function injectAssistantUI() {
  const style = document.createElement('style')
  style.textContent = `
    #ai-fab {
      position: fixed;
      bottom: 28px;
      right: 28px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4f8ef7 0%, #a259ff 100%);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      box-shadow: 0 4px 24px rgba(79,142,247,0.45);
      z-index: 9999;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #ai-fab:hover { transform: scale(1.08); box-shadow: 0 6px 32px rgba(79,142,247,0.6); }
    #ai-fab.open { background: linear-gradient(135deg, #a259ff 0%, #4f8ef7 100%); }

    #ai-panel {
      position: fixed;
      bottom: 96px;
      right: 28px;
      width: 380px;
      max-width: calc(100vw - 40px);
      background: #16192a;
      border: 1px solid rgba(79,142,247,0.25);
      border-radius: 18px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.5);
      z-index: 9998;
      display: none;
      flex-direction: column;
      overflow: hidden;
      font-family: 'Inter', sans-serif;
      animation: aiSlideIn 0.25s ease;
    }
    #ai-panel.visible { display: flex; }

    @keyframes aiSlideIn {
      from { opacity: 0; transform: translateY(16px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    #ai-panel-header {
      padding: 14px 18px;
      background: linear-gradient(135deg, rgba(79,142,247,0.15) 0%, rgba(162,89,255,0.15) 100%);
      border-bottom: 1px solid rgba(79,142,247,0.15);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    #ai-panel-header .ai-icon { font-size: 1.2rem; }
    #ai-panel-header .ai-title { font-weight: 700; font-size: 0.95rem; color: #e0e8ff; flex: 1; }
    #ai-panel-header .ai-subtitle { font-size: 0.72rem; color: #8899cc; margin-top: 1px; }
    #ai-close-btn {
      background: none; border: none; cursor: pointer;
      color: #8899cc; font-size: 1.1rem; padding: 2px 6px; border-radius: 6px;
      transition: color 0.15s, background 0.15s;
    }
    #ai-close-btn:hover { color: #fff; background: rgba(255,255,255,0.08); }

    #ai-messages {
      flex: 1;
      max-height: 260px;
      overflow-y: auto;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      scrollbar-width: thin;
      scrollbar-color: rgba(79,142,247,0.3) transparent;
    }

    .ai-msg {
      max-width: 90%;
      padding: 9px 13px;
      border-radius: 12px;
      font-size: 0.83rem;
      line-height: 1.5;
      animation: aiFadeIn 0.2s ease;
    }
    @keyframes aiFadeIn { from { opacity:0; transform: translateY(4px); } to { opacity:1; transform: translateY(0); } }
    .ai-msg.bot { background: rgba(79,142,247,0.13); color: #c8d8ff; border-bottom-left-radius: 4px; align-self: flex-start; border: 1px solid rgba(79,142,247,0.2); }
    .ai-msg.user { background: linear-gradient(135deg, rgba(79,142,247,0.25), rgba(162,89,255,0.2)); color: #e0e8ff; border-bottom-right-radius: 4px; align-self: flex-end; }
    .ai-msg.error { background: rgba(255,61,87,0.12); color: #ff9aaa; border: 1px solid rgba(255,61,87,0.2); }
    .ai-msg.success { background: rgba(0,200,120,0.1); color: #7effd4; border: 1px solid rgba(0,200,120,0.2); }

    #ai-typing {
      display: none;
      align-self: flex-start;
      padding: 8px 14px;
      background: rgba(79,142,247,0.1);
      border-radius: 12px;
      border-bottom-left-radius: 4px;
      border: 1px solid rgba(79,142,247,0.2);
    }
    #ai-typing span {
      display: inline-block; width: 7px; height: 7px;
      background: #4f8ef7; border-radius: 50%; margin: 0 2px;
      animation: aiDot 1.2s infinite;
    }
    #ai-typing span:nth-child(2) { animation-delay: 0.2s; }
    #ai-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes aiDot { 0%,60%,100% { transform: translateY(0); opacity:0.5; } 30% { transform: translateY(-5px); opacity:1; } }

    #ai-input-area {
      padding: 12px 14px;
      border-top: 1px solid rgba(79,142,247,0.12);
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    #ai-input {
      flex: 1;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(79,142,247,0.2);
      border-radius: 10px;
      padding: 9px 12px;
      color: #e0e8ff;
      font-size: 0.82rem;
      font-family: 'Inter', sans-serif;
      resize: none;
      outline: none;
      max-height: 90px;
      min-height: 38px;
      line-height: 1.4;
      transition: border-color 0.2s;
    }
    #ai-input::placeholder { color: #556088; }
    #ai-input:focus { border-color: rgba(79,142,247,0.5); }
    #ai-send-btn {
      background: linear-gradient(135deg, #4f8ef7, #a259ff);
      border: none; border-radius: 10px;
      width: 38px; height: 38px; min-width: 38px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      color: white; font-size: 1rem;
      transition: opacity 0.2s, transform 0.15s;
    }
    #ai-send-btn:hover { opacity: 0.85; transform: scale(1.05); }
    #ai-send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

    #ai-no-key-warning {
      margin: 10px 14px;
      padding: 10px 12px;
      background: rgba(255,180,0,0.1);
      border: 1px solid rgba(255,180,0,0.25);
      border-radius: 8px;
      font-size: 0.78rem;
      color: #ffd580;
      display: none;
    }
    #ai-no-key-warning a { color: #ffa040; }
  `
  document.head.appendChild(style)

  const html = `
    <!-- AI FAB button -->
    <button id="ai-fab" title="AI Event Assistant" aria-label="Open AI Assistant">✨</button>

    <!-- AI Panel -->
    <div id="ai-panel" role="dialog" aria-label="AI Event Assistant" aria-modal="true">
      <div id="ai-panel-header">
        <span class="ai-icon">🤖</span>
        <div>
          <div class="ai-title">AI Event Assistant</div>
          <div class="ai-subtitle">Powered by Gemini · Fill form with natural language</div>
        </div>
        <button id="ai-close-btn" aria-label="Close AI Assistant">✕</button>
      </div>

      <div id="ai-no-key-warning">
        ⚠️ <strong>VITE_GEMINI_API_KEY</strong> not set. Add it to your <code>.env</code> and Vercel env vars.
        <a href="https://aistudio.google.com/app/apikey" target="_blank">Get a free key →</a>
      </div>

      <div id="ai-messages">
        <div class="ai-msg bot">
          👋 Hi! Describe the match and I'll fill the form for you.<br><br>
          <em style="opacity:0.7">Example: "Brazil vs France, July 15 2026, 8pm, MetLife Stadium, New York, USA, World Cup Final, hottest"</em>
        </div>
      </div>

      <div id="ai-typing"><span></span><span></span><span></span></div>

      <div id="ai-input-area">
        <textarea id="ai-input" placeholder="Describe the match…" rows="1" aria-label="Describe the match"></textarea>
        <button id="ai-send-btn" aria-label="Send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  `
  document.body.insertAdjacentHTML('beforeend', html)
}

// ─── Form field helpers ────────────────────────────────────────────────────────
function fillForm(data) {
  const set = (id, val) => {
    const el = document.getElementById(id)
    if (el && val !== undefined && val !== null && val !== '') el.value = val
  }

  set('f-team1',      data.team1)
  set('f-team2',      data.team2)
  set('f-match-type', data.match_type)
  set('f-date',       data.match_date)   // YYYY-MM-DD
  set('f-time',       data.match_time)   // HH:MM
  set('f-country',    data.country)
  set('f-city',       data.city)
  set('f-stadium',    data.stadium)

  // Badges — uncheck all first, then check the ones AI returned
  document.querySelectorAll('input[name="badge"]').forEach(cb => cb.checked = false)
  if (Array.isArray(data.badges)) {
    data.badges.forEach(b => {
      const cb = document.querySelector(`input[name="badge"][value="${b}"]`)
      if (cb) cb.checked = true
    })
  }
}

// ─── Gemini call ──────────────────────────────────────────────────────────────
async function callGemini(userText) {
  const today = new Date().toISOString().slice(0, 10)

  const prompt = `
You are a JSON extraction assistant for a World Cup 2026 ticket management app.
Today's date is ${today}.

Extract match event details from the user's text and return ONLY a valid JSON object with these exact keys:
- team1 (string) — first team name
- team2 (string) — second team name
- match_type (string) — e.g. "World Cup - Group A", "World Cup - Final", "World Cup - Quarter Final"
- match_date (string) — format YYYY-MM-DD, infer year as 2026 if not given
- match_time (string) — format HH:MM in 24-hour, convert if needed
- country (string) — must be exactly one of: "US", "Canada", "Mexico"
- city (string) — city name e.g. "New York, NY"
- stadium (string) — stadium name
- badges (array of strings) — from: ["hottest", "best_value", "low_stock"], pick any that match words like "hottest", "best value", "low stock", "2%". Return empty array if none.

Rules:
- If a field cannot be determined, use an empty string "" (not null).
- Return ONLY the JSON object, no markdown, no explanation.
- For country: if city is in USA/United States return "US"; Canada → "Canada"; Mexico → "Mexico".

User text: "${userText.replace(/"/g, "'")}"
`

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 512 }
    })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `HTTP ${res.status}`)
  }

  const json = await res.json()
  const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // Strip markdown code fences if present
  const cleaned = raw.replace(/```json?/gi, '').replace(/```/g, '').trim()
  return JSON.parse(cleaned)
}

// ─── Message helpers ───────────────────────────────────────────────────────────
function addMessage(text, type = 'bot') {
  const msgs = document.getElementById('ai-messages')
  const div = document.createElement('div')
  div.className = `ai-msg ${type}`
  div.innerHTML = text
  msgs.appendChild(div)
  msgs.scrollTop = msgs.scrollHeight
  return div
}

function setTyping(visible) {
  const t = document.getElementById('ai-typing')
  t.style.display = visible ? 'block' : 'none'
  if (visible) {
    const msgs = document.getElementById('ai-messages')
    msgs.scrollTop = msgs.scrollHeight
  }
}

// ─── Main send handler ────────────────────────────────────────────────────────
async function handleSend() {
  const input = document.getElementById('ai-input')
  const sendBtn = document.getElementById('ai-send-btn')
  const text = input.value.trim()
  if (!text) return

  addMessage(text, 'user')
  input.value = ''
  input.style.height = 'auto'
  sendBtn.disabled = true
  setTyping(true)

  try {
    const data = await callGemini(text)
    setTyping(false)

    // Make sure we're on the Events tab
    const eventsTab = document.querySelector('[data-tab="events"]')
    if (eventsTab && !eventsTab.classList.contains('active')) eventsTab.click()

    fillForm(data)

    // Build a readable summary
    const filled = []
    if (data.team1 && data.team2) filled.push(`⚽ <strong>${data.team1} vs ${data.team2}</strong>`)
    if (data.match_date)          filled.push(`📅 ${data.match_date}${data.match_time ? ' at ' + data.match_time : ''}`)
    if (data.stadium)             filled.push(`🏟️ ${data.stadium}`)
    if (data.city)                filled.push(`📍 ${data.city}`)
    if (data.match_type)          filled.push(`🏆 ${data.match_type}`)
    if (data.badges?.length)      filled.push(`🏷️ ${data.badges.join(', ')}`)

    addMessage(
      `✅ Form filled!<br><br>${filled.join('<br>')}` +
      `<br><br><em style="opacity:0.65;font-size:0.78rem">Review and click <strong>Save Event</strong> when ready.</em>`,
      'success'
    )

    // Scroll the form into view
    const card = document.querySelector('.admin-card')
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' })

  } catch (err) {
    setTyping(false)
    console.error('[AI Assistant]', err)
    addMessage(
      `❌ <strong>Error:</strong> ${err.message}<br><br>` +
      `<em style="opacity:0.65;font-size:0.78rem">Check your VITE_GEMINI_API_KEY or try rephrasing.</em>`,
      'error'
    )
  } finally {
    sendBtn.disabled = false
    input.focus()
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
function init() {
  injectAssistantUI()

  const fab     = document.getElementById('ai-fab')
  const panel   = document.getElementById('ai-panel')
  const closeBtn = document.getElementById('ai-close-btn')
  const input   = document.getElementById('ai-input')
  const sendBtn = document.getElementById('ai-send-btn')
  const warning = document.getElementById('ai-no-key-warning')

  // Show API key warning if not configured
  if (!GEMINI_API_KEY) warning.style.display = 'block'

  // Toggle panel
  fab.addEventListener('click', () => {
    const isOpen = panel.classList.contains('visible')
    panel.classList.toggle('visible', !isOpen)
    fab.classList.toggle('open', !isOpen)
    fab.setAttribute('aria-expanded', String(!isOpen))
    if (!isOpen) input.focus()
  })

  closeBtn.addEventListener('click', () => {
    panel.classList.remove('visible')
    fab.classList.remove('open')
    fab.setAttribute('aria-expanded', 'false')
  })

  // Send on button click or Enter (Shift+Enter = new line)
  sendBtn.addEventListener('click', handleSend)
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  })

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto'
    input.style.height = Math.min(input.scrollHeight, 90) + 'px'
  })
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
