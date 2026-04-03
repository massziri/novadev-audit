(() => {
  'use strict';

  // ─── Config ────────────────────────────────────────────────────────────────
  const API_ENDPOINT    = '/api/chat';
  const FORM_ENDPOINT   = 'https://formsubmit.co/ajax/admin@novatvhub.com';
  const AUTO_OPEN_DELAY = 9000; // ms

  // ─── DOM ───────────────────────────────────────────────────────────────────
  const bubble     = document.getElementById('ai-chat-bubble');
  const chatWindow = document.getElementById('ai-chat-window');
  const closeBtn   = document.getElementById('ai-chat-close');
  const messagesEl = document.getElementById('chat-messages');
  const inputEl    = document.getElementById('chat-input');
  const sendBtn    = document.getElementById('chat-send');
  const badge      = bubble?.querySelector('.chat-badge');

  if (!bubble || !chatWindow || !messagesEl) return;

  // ─── State ─────────────────────────────────────────────────────────────────
  let isOpen      = false;
  let isTyping    = false;
  let opened      = false;

  // Conversation history sent to the AI (role: user | assistant)
  const history   = [];

  // Lead info extracted progressively from conversation
  const lead      = { name: '', email: '', company: '', phone: '', service: '', message: '' };

  // ─── Lead extraction patterns ──────────────────────────────────────────────
  const emailRx   = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/;
  const phoneRx   = /(\+?\d[\d\s\-().]{7,15}\d)/;

  function extractLeadData(text) {
    const emailMatch = text.match(emailRx);
    if (emailMatch && !lead.email) {
      lead.email = emailMatch[0];
    }
    const phoneMatch = text.match(phoneRx);
    if (phoneMatch && !lead.phone) {
      lead.phone = phoneMatch[0];
    }
    // Service keywords
    if (!lead.service) {
      const lower = text.toLowerCase();
      if (lower.includes('mobile app') || lower.includes('ios') || lower.includes('android')) lead.service = 'Mobile app development';
      else if (lower.includes('e-commerce') || lower.includes('ecommerce') || lower.includes('shop')) lead.service = 'E-commerce';
      else if (lower.includes('redesign') || lower.includes('refonte')) lead.service = 'Website redesign';
      else if (lower.includes('landing')) lead.service = 'Landing page';
      else if (lower.includes('website') || lower.includes('site web')) lead.service = 'Website';
    }
  }

  // After AI response, try to pull name if AI greeted user
  function extractNameFromContext(botText, userText) {
    if (!lead.name) {
      // Look for patterns like "Nice to meet you, John" or "Great, John!"
      const nameFromBot = botText.match(/(?:nice to meet you|great to meet you|hello|hi),?\s+([A-Z][a-z]{1,20})/i);
      if (nameFromBot) lead.name = nameFromBot[1];
      // If user said "I'm John" or "My name is John"
      const nameFromUser = userText.match(/(?:i(?:'|')?m|my name is|call me|i am)\s+([A-Z][a-z]{1,20})/i);
      if (nameFromUser) lead.name = nameFromUser[1];
      // Single-word response that looks like a name (≤20 chars, capitalised)
      const single = userText.trim();
      if (!lead.name && /^[A-Z][a-z]{1,19}$/.test(single)) lead.name = single;
    }
  }

  function maybeSendLead() {
    if (lead.email && lead.name && !lead._sent) {
      lead._sent = true;
      sendLeadToFormSubmit().catch(() => {});
    }
  }

  async function sendLeadToFormSubmit() {
    const fd = new FormData();
    fd.append('_subject', `Nova Dev Chat Lead (EN) — ${lead.name || 'Unknown'}`);
    fd.append('_captcha', 'false');
    fd.append('_template', 'table');
    fd.append('Name',            lead.name    || '');
    fd.append('Email',           lead.email   || '');
    fd.append('Company',         lead.company || '');
    fd.append('Phone',           lead.phone   || 'Not provided');
    fd.append('Service Interest',lead.service || '');
    fd.append('Project Details', lead.message || '');
    fd.append('Source',          'AI Chat Widget — Nova Dev EN');
    await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: fd
    });
    if (typeof fbq === 'function') { try { fbq('track', 'Lead'); } catch(_){} }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const clock = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  const scrollDown = () => { messagesEl.scrollTop = messagesEl.scrollHeight; };

  function appendMsg(text, role) {
    const wrap = document.createElement('div');
    wrap.className = `chat-msg ${role}`;

    const bub = document.createElement('div');
    bub.className = 'chat-bubble';
    // Support line breaks in text
    bub.innerHTML = text.replace(/\n/g, '<br>');

    const ts = document.createElement('div');
    ts.className = 'chat-time';
    ts.textContent = clock();

    wrap.appendChild(bub);
    wrap.appendChild(ts);
    messagesEl.appendChild(wrap);
    scrollDown();
    return wrap;
  }

  let typingEl = null;
  function showTypingIndicator() {
    if (typingEl) return;
    typingEl = document.createElement('div');
    typingEl.className = 'chat-msg bot';
    typingEl.id = 'chat-typing-indicator';
    typingEl.innerHTML = '<div class="chat-typing"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(typingEl);
    scrollDown();
  }
  function hideTypingIndicator() {
    if (typingEl) { typingEl.remove(); typingEl = null; }
  }

  // ─── AI call ───────────────────────────────────────────────────────────────
  async function askAI(userMessage) {
    if (isTyping) return;
    isTyping = true;
    setInputEnabled(false);

    // Add user message to UI & history
    appendMsg(userMessage, 'user');
    history.push({ role: 'user', content: userMessage });

    // Extract lead data from user message
    extractLeadData(userMessage);

    // Show typing
    showTypingIndicator();

    try {
      const resp = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, lead })
      });

      let reply;
      if (resp.ok) {
        const data = await resp.json();
        reply = data.reply || "I'm having trouble responding right now. Please try the contact form below!";
      } else {
        reply = "I'm having a little technical hiccup. Please use the contact form below and we'll reach out shortly!";
      }

      hideTypingIndicator();
      appendMsg(reply, 'bot');
      history.push({ role: 'assistant', content: reply });

      // Extract name from context
      extractNameFromContext(reply, userMessage);
      // Also extract lead from bot reply (e.g. if bot echoes email)
      extractLeadData(reply);
      maybeSendLead();

    } catch (err) {
      hideTypingIndicator();
      const fallback = "Connection issue on my end. You can reach us directly via the contact form below — we respond fast!";
      appendMsg(fallback, 'bot');
      history.push({ role: 'assistant', content: fallback });
    } finally {
      isTyping = false;
      setInputEnabled(true);
      inputEl?.focus();
    }
  }

  // ─── Opening greeting (no API call) ────────────────────────────────────────
  function showGreeting() {
    setTimeout(() => {
      showTypingIndicator();
      setTimeout(() => {
        hideTypingIndicator();
        const msg = "Hi there! 👋 I'm the Nova Dev assistant.\n\nI can answer any questions about our web design, development and mobile app services — or help you get started on your project.\n\nWhat can I help you with today?";
        appendMsg(msg, 'bot');
        history.push({ role: 'assistant', content: msg });
      }, 900);
    }, 300);
  }

  // ─── UI controls ───────────────────────────────────────────────────────────
  function setInputEnabled(on) {
    if (inputEl) inputEl.disabled = !on;
    if (sendBtn) sendBtn.disabled = !on;
  }

  function openChat() {
    if (isOpen) return;
    isOpen = true;
    chatWindow.removeAttribute('hidden');
    bubble.setAttribute('aria-expanded', 'true');
    if (badge) badge.style.display = 'none';

    if (!opened) {
      opened = true;
      showGreeting();
    }
    inputEl?.focus();
  }

  function closeChat() {
    isOpen = false;
    chatWindow.setAttribute('hidden', '');
    bubble.setAttribute('aria-expanded', 'false');
  }

  function handleSend() {
    const val = inputEl?.value.trim();
    if (!val || isTyping) return;
    inputEl.value = '';
    askAI(val);
  }

  // ─── Events ────────────────────────────────────────────────────────────────
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

  // ─── Auto-open ─────────────────────────────────────────────────────────────
  setTimeout(() => {
    if (!isOpen && !opened) openChat();
  }, AUTO_OPEN_DELAY);

})();
