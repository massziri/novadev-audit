(() => {
  'use strict';

  /* ============================================================
     NOVA DEV — AI Chat Widget v6.0 (EN)
     
     ARCHITECTURE v6.0 — Full AI backend integration:
     - All replies come from a real LLM via /api/chat
     - No more keyword matching or hardcoded reply pools
     - Context (name, email, budget, products) extracted
       client-side and sent with every request
     - Lead captured client-side, sent to FormSubmit when email known
     - Typing indicator while waiting for AI response
     - Full conversation history kept in-memory per session
  ============================================================ */

  const FORM_ENDPOINT   = 'https://formsubmit.co/ajax/admin@novatvhub.com';
  const AUTO_OPEN_DELAY = 9000;
  const API_ENDPOINT    = '/api/chat';

  /* ── DOM ─────────────────────────────────────────────────── */
  const bubble     = document.getElementById('ai-chat-bubble');
  const chatWindow = document.getElementById('ai-chat-window');
  const closeBtn   = document.getElementById('ai-chat-close');
  const messagesEl = document.getElementById('chat-messages');
  const inputEl    = document.getElementById('chat-input');
  const sendBtn    = document.getElementById('chat-send');
  const badge      = bubble?.querySelector('.chat-badge');
  if (!bubble || !chatWindow) return;

  /* ── STATE ───────────────────────────────────────────────── */
  let isOpen = false, opened = false, isThinking = false, leadSent = false;

  // Lead data — extracted progressively from conversation
  const lead = { name: '', email: '', company: '', phone: '', service: '' };

  // Conversation history sent to the AI
  const history = [];

  /* ── CONTEXT EXTRACTION (client-side, for lead capture) ───── */
  function extractLead(text) {
    // Email
    const emailM = text.match(/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/);
    if (emailM && !lead.email) lead.email = emailM[0];

    // Phone
    const phoneM = text.match(/(\+?\d[\d\s\-().]{6,}\d)/);
    if (phoneM && !lead.phone) lead.phone = phoneM[0].trim();

    // Name — only from explicit introduction patterns
    // IMPORTANT: "I'm lost" must NOT extract "lost" as a name
    // Only extract if person says "I'm [Name]" where Name is a proper noun
    const nameM = text.match(/(?:i(?:'|')?m|my name(?:'?s)? is|i am|call me|this is)\s+([A-Z][a-z]{2,20})(?:\s|$|,|\.)/i);
    if (nameM && !lead.name) {
      // Exclude common non-name words
      const notNames = ['lost','confused','ready','here','back','good','fine','set','done','new','not','just','still','already'];
      if (!notNames.includes(nameM[1].toLowerCase())) {
        lead.name = nameM[1];
      }
    }
  }

  /* ── AI CALL ─────────────────────────────────────────────── */
  async function askAI(userMessage) {
    history.push({ role: 'user', content: userMessage });

    const payload = {
      messages: history.slice(-20),
      lead: {
        name:    lead.name    || '',
        email:   lead.email   || '',
        company: lead.company || '',
        phone:   lead.phone   || '',
        service: lead.service || ''
      }
    };

    try {
      const res = await fetch(API_ENDPOINT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      });

      const data = await res.json();
      const reply = data.reply || "Sorry, something went wrong. Please use the contact form below.";
      history.push({ role: 'assistant', content: reply });
      return reply;

    } catch (err) {
      const fallback = "I'm having a connection issue. Please fill in the contact form below and we'll get back to you!";
      history.push({ role: 'assistant', content: fallback });
      return fallback;
    }
  }

  /* ── LEAD SUBMISSION ─────────────────────────────────────── */
  function maybeSendLead() {
    if (lead.email && !leadSent) {
      leadSent = true;
      const fd = new FormData();
      fd.append('_subject',  `Nova Dev Chat Lead (EN) — ${lead.name || lead.email}`);
      fd.append('_captcha',  'false');
      fd.append('_template', 'table');
      fd.append('Name',      lead.name    || 'Not provided');
      fd.append('Email',     lead.email);
      fd.append('Company',   lead.company || 'Not provided');
      fd.append('Phone',     lead.phone   || 'Not provided');
      fd.append('Service',   lead.service || 'Not specified');
      fd.append('Source',    'AI Chat v6.0 — Nova Dev EN');
      fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Accept': 'application/json' }, body: fd })
        .catch(() => {});
      if (typeof fbq === 'function') try { fbq('track', 'Lead'); } catch (_) {}
    }
  }

  /* ── RENDER ──────────────────────────────────────────────── */
  const clock = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };
  const scrollDown = () => requestAnimationFrame(() => { messagesEl.scrollTop = messagesEl.scrollHeight; });

  function appendMsg(text, role) {
    const wrap = document.createElement('div');
    wrap.className = `chat-msg ${role}`;
    const bub = document.createElement('div');
    bub.className = 'chat-bubble';
    bub.innerHTML = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    const ts = document.createElement('div');
    ts.className = 'chat-time';
    ts.textContent = clock();
    wrap.appendChild(bub);
    wrap.appendChild(ts);
    messagesEl.appendChild(wrap);
    scrollDown();
  }

  let typingEl = null;
  function showTyping() {
    if (typingEl) return;
    typingEl = document.createElement('div');
    typingEl.className = 'chat-msg bot';
    typingEl.innerHTML = '<div class="chat-typing"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(typingEl);
    scrollDown();
  }
  function hideTyping() {
    if (typingEl) { typingEl.remove(); typingEl = null; }
  }

  /* ── SEND HANDLER ─────────────────────────────────────────── */
  async function handleSend() {
    const val = inputEl?.value.trim();
    if (!val || isThinking) return;
    inputEl.value = '';
    isThinking = true;
    setInputEnabled(false);

    // Extract lead data from user message
    extractLead(val);

    // Display user message
    appendMsg(val, 'user');
    showTyping();

    // Call AI
    const reply = await askAI(val);
    hideTyping();
    appendMsg(reply, 'bot');

    // Try to capture lead from AI reply too (AI might mention collecting email)
    extractLead(reply);
    maybeSendLead();

    isThinking = false;
    setInputEnabled(true);
    inputEl?.focus();
  }

  function setInputEnabled(on) {
    if (inputEl) inputEl.disabled = !on;
    if (sendBtn) sendBtn.disabled = !on;
  }

  /* ── GREETING ────────────────────────────────────────────── */
  async function showGreeting() {
    setTimeout(() => {
      showTyping();
      setTimeout(async () => {
        hideTyping();
        // Add the opening greeting to history so AI has context
        const greeting = "Hi there! 👋 I'm the Nova Dev assistant.\n\nTell me what you want to build — **website, e-commerce store, mobile app, landing page** — and I'll give you a precise suggestion with pricing and timeline.\n\nNot sure yet? Just say so and I'll help you choose! 😊";
        history.push({ role: 'assistant', content: greeting });
        appendMsg(greeting, 'bot');
      }, 850);
    }, 300);
  }

  /* ── CHAT OPEN / CLOSE ───────────────────────────────────── */
  function openChat() {
    if (isOpen) return;
    isOpen = true;
    chatWindow.removeAttribute('hidden');
    bubble.setAttribute('aria-expanded', 'true');
    if (badge) badge.style.display = 'none';
    if (!opened) { opened = true; showGreeting(); }
    inputEl?.focus();
  }

  function closeChat() {
    isOpen = false;
    chatWindow.setAttribute('hidden', '');
    bubble.setAttribute('aria-expanded', 'false');
  }

  /* ── EVENT LISTENERS ─────────────────────────────────────── */
  bubble.addEventListener('click', openChat);
  bubble.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openChat(); }
  });
  closeBtn?.addEventListener('click', closeChat);
  sendBtn?.addEventListener('click', handleSend);
  inputEl?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) closeChat();
  });

  setTimeout(() => { if (!isOpen && !opened) openChat(); }, AUTO_OPEN_DELAY);

})();
