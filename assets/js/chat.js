/* ============================================================
   Nova Dev AI Chat Widget v8.2  — English
   LLM: Pollinations.ai (FREE, no API key) via /api/chat
   Lead capture: FormSubmit + Brevo (server-side)
   WhatsApp: +212665103031
   ============================================================ */
(function () {
  'use strict';

  const API_ENDPOINT    = '/api/chat';
  const AUTO_OPEN_DELAY = 12000; // 12 seconds
  const WA_NUMBER       = '212665103031';
  const SITE_URL        = 'https://novadev-audit.vercel.app';

  /* ── Excluded words that are NOT names ── */
  const NOT_NAMES = new Set([
    'hello','hi','hey','ok','okay','yes','no','thanks','thank','please','sure',
    'good','great','fine','ready','done','set','back','here','lost','confused',
    'new','help','need','want','have','like','just','know','think','would',
    'could','should','can','will','get','go','see','do','make','use','take',
    'give','tell','show','let','say','ask','come','look','try','work','feel',
    'start','stop','wait','check','send','share','find','add','put','keep',
    'available','busy','free','maybe','not','none','nothing','something'
  ]);

  /* ── State ── */
  let messages  = [];
  let lead      = { name: '', email: '', phone: '', service: '', company: '' };
  let isOpen    = false;
  let isTyping  = false;
  let autoOpened = false;

  /* ── Build widget DOM ── */
  const styles = `
    #nd-chat-bubble{position:fixed;bottom:24px;right:24px;width:56px;height:56px;background:linear-gradient(135deg,#1e1b4b,#6366f1);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 20px rgba(99,102,241,.5);z-index:9998;transition:transform .2s,box-shadow .2s;border:none;}
    #nd-chat-bubble:hover{transform:scale(1.1);box-shadow:0 6px 28px rgba(99,102,241,.7);}
    #nd-chat-badge{position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;font-size:11px;font-weight:700;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;animation:nd-pulse 2s infinite;}
    @keyframes nd-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
    #nd-chat-win{position:fixed;bottom:90px;right:24px;width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.18);display:flex;flex-direction:column;z-index:9999;transform:scale(0.92) translateY(12px);opacity:0;pointer-events:none;transition:transform .25s cubic-bezier(.34,1.56,.64,1),opacity .2s;overflow:hidden;font-family:'Inter',sans-serif;}
    #nd-chat-win.nd-open{transform:scale(1) translateY(0);opacity:1;pointer-events:all;}
    .nd-hdr{background:linear-gradient(135deg,#1e1b4b,#4338ca);padding:14px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
    .nd-hdr-info{display:flex;align-items:center;gap:10px;}
    .nd-avatar{width:38px;height:38px;background:rgba(255,255,255,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    .nd-avatar svg{width:20px;height:20px;stroke:#fff;}
    .nd-hdr-text strong{color:#fff;font-size:.92rem;display:block;}
    .nd-status{color:#a5b4fc;font-size:.75rem;display:flex;align-items:center;gap:5px;}
    .nd-dot{width:7px;height:7px;background:#22c55e;border-radius:50%;display:inline-block;animation:nd-blink 2s infinite;}
    @keyframes nd-blink{0%,100%{opacity:1}50%{opacity:.4}}
    #nd-close-btn{background:none;border:none;cursor:pointer;padding:4px;color:rgba(255,255,255,.7);transition:color .15s;font-size:1.2rem;line-height:1;}
    #nd-close-btn:hover{color:#fff;}
    #nd-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth;}
    #nd-msgs::-webkit-scrollbar{width:4px;}
    #nd-msgs::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px;}
    .nd-msg{max-width:82%;padding:10px 13px;border-radius:14px;font-size:.855rem;line-height:1.55;animation:nd-fadeUp .2s ease;}
    @keyframes nd-fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .nd-msg.bot{background:#f1f5f9;color:#1e293b;border-bottom-left-radius:4px;align-self:flex-start;}
    .nd-msg.user{background:linear-gradient(135deg,#1e1b4b,#6366f1);color:#fff;border-bottom-right-radius:4px;align-self:flex-end;}
    .nd-typing{display:flex;gap:4px;padding:10px 13px;background:#f1f5f9;border-radius:14px;border-bottom-left-radius:4px;align-self:flex-start;width:fit-content;}
    .nd-typing span{width:7px;height:7px;background:#94a3b8;border-radius:50%;animation:nd-bounce 1.2s infinite;}
    .nd-typing span:nth-child(2){animation-delay:.2s;}
    .nd-typing span:nth-child(3){animation-delay:.4s;}
    @keyframes nd-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-7px)}}
    .nd-quick-btns{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 10px;}
    .nd-qbtn{background:#fff;border:1.5px solid #e2e8f0;color:#4338ca;padding:5px 10px;border-radius:20px;font-size:.78rem;cursor:pointer;transition:all .15s;font-weight:500;}
    .nd-qbtn:hover{background:#eef2ff;border-color:#6366f1;}
    .nd-input-row{display:flex;gap:8px;padding:10px 14px 14px;border-top:1px solid #f1f5f9;flex-shrink:0;}
    #nd-input{flex:1;border:1.5px solid #e2e8f0;border-radius:10px;padding:9px 12px;font-size:.855rem;outline:none;transition:border-color .15s;font-family:inherit;resize:none;height:38px;line-height:1.4;}
    #nd-input:focus{border-color:#6366f1;}
    #nd-send{background:linear-gradient(135deg,#1e1b4b,#6366f1);border:none;color:#fff;border-radius:10px;padding:0 14px;cursor:pointer;height:38px;display:flex;align-items:center;justify-content:center;transition:opacity .15s;flex-shrink:0;}
    #nd-send:hover{opacity:.88;}
    #nd-send svg{width:18px;height:18px;stroke:#fff;fill:none;}
    .nd-wa-hint{text-align:center;padding:6px 14px;font-size:.75rem;color:#94a3b8;}
    .nd-wa-hint a{color:#22c55e;font-weight:600;text-decoration:none;}
  `;

  const html = `
    <style>${styles}</style>
    <button id="nd-chat-bubble" aria-label="Chat with Nova Dev AI assistant">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span id="nd-chat-badge">1</span>
    </button>
    <div id="nd-chat-win" role="dialog" aria-modal="true" aria-label="Chat with Nova Dev assistant" hidden>
      <div class="nd-hdr">
        <div class="nd-hdr-info">
          <div class="nd-avatar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
          </div>
          <div class="nd-hdr-text">
            <strong>Nova Dev Assistant</strong>
            <span class="nd-status"><span class="nd-dot"></span> Online — replies in seconds</span>
          </div>
        </div>
        <button id="nd-close-btn" aria-label="Close chat">✕</button>
      </div>
      <div id="nd-msgs" aria-live="polite" aria-label="Chat messages"></div>
      <div class="nd-quick-btns" id="nd-quick-btns">
        <button class="nd-qbtn" data-q="How much does a website cost?">💶 Pricing</button>
        <button class="nd-qbtn" data-q="How long does it take?">⏱ Timeline</button>
        <button class="nd-qbtn" data-q="I need an e-commerce site">🛒 E-commerce</button>
        <button class="nd-qbtn" data-q="Tell me about your process">🔄 Process</button>
      </div>
      <div class="nd-wa-hint">Or chat directly: <a href="https://wa.me/${WA_NUMBER}" target="_blank" rel="noopener">WhatsApp +212 665 103 031</a></div>
      <div class="nd-input-row">
        <input type="text" id="nd-input" placeholder="Type your message…" autocomplete="off" aria-label="Chat message input" maxlength="500" />
        <button id="nd-send" aria-label="Send message">
          <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  `;

  /* ── Inject DOM ── */
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  const bubble  = document.getElementById('nd-chat-bubble');
  const win     = document.getElementById('nd-chat-win');
  const msgs    = document.getElementById('nd-msgs');
  const input   = document.getElementById('nd-input');
  const sendBtn = document.getElementById('nd-send');
  const badge   = document.getElementById('nd-chat-badge');
  const closeBtn = document.getElementById('nd-close-btn');
  const quickBtns = document.getElementById('nd-quick-btns');

  /* ── Helpers ── */
  function scrollBottom() { msgs.scrollTop = msgs.scrollHeight; }

  function addMessage(text, role) {
    const el = document.createElement('div');
    el.className = `nd-msg ${role}`;
    el.textContent = text;
    msgs.appendChild(el);
    scrollBottom();
    return el;
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'nd-typing';
    el.id = 'nd-typing-indicator';
    el.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(el);
    scrollBottom();
  }

  function removeTyping() {
    const el = document.getElementById('nd-typing-indicator');
    if (el) el.remove();
  }

  /* ── Lead extraction ── */
  function extractLead(text) {
    const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) lead.email = emailMatch[0];

    const phoneMatch = text.match(/(?:\+?\d[\d\s\-().]{7,14}\d)/);
    if (phoneMatch) lead.phone = phoneMatch[0].replace(/\s+/g, ' ').trim();

    const services = ['landing page','e-commerce','ecommerce','mobile app','application','website','redesign','seo','ui/ux','design'];
    services.forEach(s => { if (text.toLowerCase().includes(s)) lead.service = s; });

    // Careful name extraction
    const nameMatch = text.match(/(?:(?:i['\u2019]m|i am|my name is|je m['']appelle|je suis|c['']est)\s+)([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20})?)/i);
    if (nameMatch) {
      const candidate = nameMatch[1].trim();
      if (!NOT_NAMES.has(candidate.toLowerCase()) && candidate.length > 1) {
        lead.name = candidate;
      }
    }
  }

  /* ── Open / Close ── */
  function openChat() {
    isOpen = true;
    win.hidden = false;
    win.removeAttribute('hidden');
    requestAnimationFrame(() => win.classList.add('nd-open'));
    badge.style.display = 'none';
    input.focus();
    if (messages.length === 0) greet();
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('nd-open');
    setTimeout(() => { win.hidden = true; }, 260);
  }

  /* ── Greeting ── */
  function greet() {
    const greetings = [
      "👋 Hi! I'm the Nova Dev assistant. We build premium websites & apps from $200. What kind of project are you working on?",
      "👋 Hello! I help businesses get professional websites. Landing pages from $150, full sites from $150. What brings you here today?",
      "👋 Hi there! Nova Dev here — premium web & mobile development for businesses worldwide. E-commerce from $200, apps from $200. How can I help?"
    ];
    const msg = greetings[Math.floor(Math.random() * greetings.length)];
    addMessage(msg, 'bot');
    messages.push({ role: 'assistant', content: msg });
  }

  /* ── Send message ── */
  async function sendMessage(text) {
    text = text.trim();
    if (!text || isTyping) return;

    addMessage(text, 'user');
    messages.push({ role: 'user', content: text });
    quickBtns.style.display = 'none';
    input.value = '';
    isTyping = true;
    showTyping();

    extractLead(text);

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages.slice(-20), lead }),
        signal: AbortSignal.timeout(25000)
      });

      removeTyping();

      if (!res.ok) throw new Error('API error');

      const data = await res.json();
      const reply = data.reply || "I'm having a brief issue. Please fill the contact form below or WhatsApp us!";
      addMessage(reply, 'bot');
      messages.push({ role: 'assistant', content: reply });

    } catch (err) {
      removeTyping();
      addMessage("I'm having a brief technical issue. Please use the contact form below or reach us on WhatsApp: +212 665 103 031 — we'll respond within a few hours!", 'bot');
    } finally {
      isTyping = false;
      input.focus();
    }
  }

  /* ── Event listeners ── */
  bubble.addEventListener('click', () => isOpen ? closeChat() : openChat());
  bubble.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isOpen ? closeChat() : openChat(); }});
  closeBtn.addEventListener('click', closeChat);

  sendBtn.addEventListener('click', () => sendMessage(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input.value); }
  });

  document.querySelectorAll('.nd-qbtn').forEach(btn => {
    btn.addEventListener('click', () => { if (!isOpen) openChat(); sendMessage(btn.dataset.q); });
  });

  /* ── Auto-open after delay ── */
  setTimeout(() => {
    if (!isOpen && !autoOpened) {
      autoOpened = true;
      openChat();
    }
  }, AUTO_OPEN_DELAY);

})();
