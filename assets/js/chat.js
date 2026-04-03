(() => {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  const LANG = 'en';
  const FORM_ENDPOINT = 'https://formsubmit.co/ajax/admin@novatvhub.com';

  // ── Lead state ────────────────────────────────────────────────────────────
  const lead = { name: '', email: '', company: '', phone: '', service: '', message: '' };

  // ── Conversation flow ─────────────────────────────────────────────────────
  // Each step: { key, question, validate, quickReplies, type }
  const STEPS = [
    {
      key: 'name',
      question: "Hi there! 👋 I'm the Nova Dev assistant.\n\nI'd love to learn a bit about your project so the right person can follow up with you.\n\nWhat's your first name?",
      validate: v => v.trim().length >= 2,
      errorMsg: "Please enter your name (at least 2 characters)."
    },
    {
      key: 'service',
      question: name => `Nice to meet you, ${name}! 😊\n\nWhat type of project are you looking to get help with?`,
      validate: v => v.trim().length >= 2,
      quickReplies: [
        "Premium website",
        "Website redesign",
        "Mobile app",
        "E-commerce",
        "Landing page",
        "Not sure yet"
      ]
    },
    {
      key: 'company',
      question: "Great choice! What's the name of your company or brand?",
      validate: v => v.trim().length >= 2,
      errorMsg: "Please enter your company or brand name."
    },
    {
      key: 'email',
      question: "What's the best email address to reach you?",
      validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
      errorMsg: "Please enter a valid email address."
    },
    {
      key: 'phone',
      question: "And your phone number? (optional — you can type 'skip' to continue)",
      validate: () => true // optional
    },
    {
      key: 'message',
      question: "Last one! Briefly describe your project or what you'd like to achieve — even a sentence or two helps.",
      validate: v => v.trim().length >= 3,
      errorMsg: "Please share a few words about your project."
    }
  ];

  // ── DOM elements ──────────────────────────────────────────────────────────
  const bubble = document.getElementById('ai-chat-bubble');
  const chatWindow = document.getElementById('ai-chat-window');
  const closeBtn = document.getElementById('ai-chat-close');
  const messagesEl = document.getElementById('chat-messages');
  const inputEl = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const badge = bubble?.querySelector('.chat-badge');

  if (!bubble || !chatWindow) return;

  // ── State ─────────────────────────────────────────────────────────────────
  let isOpen = false;
  let stepIndex = 0;
  let waitingForInput = false;
  let submitted = false;
  let opened = false;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const now = () => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  };

  const scrollToBottom = () => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const createMsg = (text, type) => {
    const wrapper = document.createElement('div');
    wrapper.className = `chat-msg ${type}`;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = text;

    const time = document.createElement('div');
    time.className = 'chat-time';
    time.textContent = now();

    wrapper.appendChild(bubble);
    wrapper.appendChild(time);
    return wrapper;
  };

  const addMsg = (text, type, delay = 0) => {
    return new Promise(resolve => {
      setTimeout(() => {
        const msg = createMsg(text, type);
        messagesEl.appendChild(msg);
        scrollToBottom();
        resolve();
      }, delay);
    });
  };

  const showTyping = () => {
    const el = document.createElement('div');
    el.className = 'chat-msg bot';
    el.id = 'chat-typing-indicator';
    el.innerHTML = `<div class="chat-typing"><span></span><span></span><span></span></div>`;
    messagesEl.appendChild(el);
    scrollToBottom();
    return el;
  };

  const hideTyping = () => {
    const el = document.getElementById('chat-typing-indicator');
    if (el) el.remove();
  };

  const botSay = (text, delay = 600) => {
    return new Promise(resolve => {
      const typing = showTyping();
      setTimeout(async () => {
        typing.remove();
        await addMsg(text, 'bot');
        resolve();
      }, delay);
    });
  };

  const addQuickReplies = (replies) => {
    const existing = messagesEl.querySelector('.chat-quick-btns');
    if (existing) existing.remove();

    const row = document.createElement('div');
    row.className = 'chat-quick-btns';
    replies.forEach(label => {
      const btn = document.createElement('button');
      btn.className = 'chat-quick-btn';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        row.remove();
        handleUserInput(label);
      });
      row.appendChild(btn);
    });
    messagesEl.appendChild(row);
    scrollToBottom();
  };

  // ── Form submission ───────────────────────────────────────────────────────
  const submitLead = async () => {
    const formData = new FormData();
    formData.append('_subject', 'Nova Dev Chat Lead (EN)');
    formData.append('_captcha', 'false');
    formData.append('_template', 'table');
    formData.append('fname', lead.name);
    formData.append('company', lead.company);
    formData.append('email', lead.email);
    formData.append('phone', lead.phone || 'Not provided');
    formData.append('service', lead.service);
    formData.append('message', lead.message);
    formData.append('source', 'AI Chat Widget');

    try {
      await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: formData
      });
    } catch (_) { /* silent — still thank user */ }

    // Try pixel if available
    if (typeof fbq === 'function') {
      try { fbq('track', 'Lead'); } catch (_) {}
    }
  };

  // ── Conversation engine ───────────────────────────────────────────────────
  const askStep = async (index) => {
    if (index >= STEPS.length) {
      // All collected — submit
      await botSay("Perfect, thank you! 🎉 Let me send your details to our team…", 700);
      await submitLead();
      submitted = true;
      setInputEnabled(false);
      await botSay(`We've received everything, ${lead.name}. 📬\n\nA member of the Nova Dev team will be in touch with you at ${lead.email} very soon.\n\nIn the meantime, feel free to browse the site — there's plenty to explore!`, 900);
      return;
    }

    const step = STEPS[index];
    const questionText = typeof step.question === 'function'
      ? step.question(lead.name || 'there')
      : step.question;

    await botSay(questionText, index === 0 ? 400 : 700);

    if (step.quickReplies) {
      addQuickReplies(step.quickReplies);
    }

    waitingForInput = true;
    inputEl?.focus();
  };

  const handleUserInput = async (rawValue) => {
    if (!waitingForInput || submitted) return;
    const value = rawValue.trim();
    if (!value) return;

    // Remove quick replies
    const qr = messagesEl.querySelector('.chat-quick-btns');
    if (qr) qr.remove();

    // Add user message
    await addMsg(value, 'user');
    inputEl.value = '';
    waitingForInput = false;

    const step = STEPS[stepIndex];

    // Handle skip for optional fields
    const isSkip = value.toLowerCase() === 'skip';

    if (!isSkip && step.validate && !step.validate(value)) {
      const errMsg = step.errorMsg || "That doesn't look quite right. Could you try again?";
      await botSay(errMsg, 500);
      waitingForInput = true;
      if (step.quickReplies) addQuickReplies(step.quickReplies);
      return;
    }

    // Store value
    lead[step.key] = isSkip ? '' : value;
    stepIndex++;
    await askStep(stepIndex);
  };

  // ── UI controls ───────────────────────────────────────────────────────────
  const setInputEnabled = (enabled) => {
    if (inputEl) inputEl.disabled = !enabled;
    if (sendBtn) sendBtn.disabled = !enabled;
  };

  const openChat = async () => {
    if (isOpen) return;
    isOpen = true;
    chatWindow.removeAttribute('hidden');
    bubble.setAttribute('aria-expanded', 'true');
    if (badge) badge.style.display = 'none';

    if (!opened) {
      opened = true;
      // Small delay before first bot message
      await askStep(0);
    }
    inputEl?.focus();
  };

  const closeChat = () => {
    isOpen = false;
    chatWindow.setAttribute('hidden', '');
    bubble.setAttribute('aria-expanded', 'false');
  };

  // ── Event listeners ───────────────────────────────────────────────────────
  bubble.addEventListener('click', openChat);
  bubble.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openChat(); } });
  closeBtn?.addEventListener('click', closeChat);

  sendBtn?.addEventListener('click', () => {
    if (inputEl?.value.trim()) handleUserInput(inputEl.value);
  });

  inputEl?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputEl.value.trim()) handleUserInput(inputEl.value);
    }
  });

  // Close on ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) closeChat();
  });

  // ── Auto-open after 8 seconds ─────────────────────────────────────────────
  setTimeout(() => {
    if (!isOpen && !opened) openChat();
  }, 8000);

})();
