(() => {
  'use strict';

  /* ============================================================
     NOVA DEV — Intelligent AI Chat (client-side, no API key)
     Handles any question about the agency + captures leads
  ============================================================ */

  const FORM_ENDPOINT   = 'https://formsubmit.co/ajax/admin@novatvhub.com';
  const AUTO_OPEN_DELAY = 9000;

  /* ── DOM ─────────────────────────────────────────────────── */
  const bubble     = document.getElementById('ai-chat-bubble');
  const chatWindow = document.getElementById('ai-chat-window');
  const closeBtn   = document.getElementById('ai-chat-close');
  const messagesEl = document.getElementById('chat-messages');
  const inputEl    = document.getElementById('chat-input');
  const sendBtn    = document.getElementById('chat-send');
  const badge      = bubble?.querySelector('.chat-badge');
  if (!bubble || !chatWindow) return;

  /* ── State ───────────────────────────────────────────────── */
  let isOpen = false, opened = false, isThinking = false;
  const lead = { name:'', email:'', company:'', phone:'', service:'', message:'' };
  let leadSent = false;

  /* ── KNOWLEDGE BASE ──────────────────────────────────────── */
  const KB = {
    services: [
      { id:'web',    label:'Web Design & Development',       desc:'We design and build premium, high-performance websites tailored to your business goals — from corporate sites and landing pages to full web applications. Every project starts with strategic direction and ends with a polished, conversion-focused result.' },
      { id:'mobile', label:'Mobile App Development',         desc:'We build high-performance iOS and Android applications that extend your brand and engage your audience. Whether you need a customer-facing app, an internal tool or an e-commerce mobile experience, we design and develop it end to end.' },
      { id:'ecom',   label:'E-commerce Development',         desc:'We build conversion-focused online stores that present products beautifully, earn trust and reduce friction across the buying journey. We work with Shopify, WooCommerce and custom solutions.' },
      { id:'design', label:'Premium Interface Design (UI/UX)',desc:'Our design process is focused on clarity, credibility and conversion. We create clean, sophisticated interfaces that make your brand feel more established and guide visitors toward the right next step.' },
      { id:'seo',    label:'Performance & SEO Foundations',  desc:'We improve page speed, technical structure and SEO foundations so your website loads fast, ranks better and delivers a smooth experience on every device.' },
      { id:'rebrand',label:'Website Redesign',               desc:'We can elevate your existing website — stronger visual direction, clearer structure, improved credibility — without losing what already works for your brand.' },
      { id:'strategy',label:'Digital Strategy',              desc:'We begin every project by understanding your business, your audience and your goals. We define structure, priorities and content flow so the website supports your commercial objectives from day one.' },
    ],

    pricing: {
      general: "Our pricing varies by scope and complexity. A landing page typically starts from £800–£1,500. A full business website ranges from £2,500–£8,000+. Mobile apps start from £5,000 depending on features. We provide detailed quotes after a free consultation — no guesswork.",
      landing: "A landing page project typically starts from £800–£1,500 depending on design complexity and integrations.",
      website: "A full business website generally ranges from £2,500 to £8,000+, depending on the number of pages, features and custom functionality required.",
      mobile:  "Mobile app development typically starts from £5,000–£15,000+ depending on platform (iOS, Android or both), feature set and back-end requirements.",
      ecom:    "E-commerce projects typically start from £3,000–£10,000+ depending on the platform, product volume and custom integrations needed.",
    },

    timeline: {
      general: "Timelines depend on project scope. A landing page can be delivered in 1–2 weeks. A full website typically takes 3–6 weeks. Mobile apps generally take 8–16 weeks from brief to launch. We'll give you a precise timeline during your consultation.",
      landing: "Landing pages are typically delivered within 1–2 weeks.",
      website: "Full business websites typically take 3–6 weeks from kick-off to launch.",
      mobile:  "Mobile app development usually takes 8–16 weeks depending on complexity.",
    },

    process: "Our process has three clear stages:\n\n1️⃣ Clarify the business objective — We start by understanding your company, audience, current position and the outcome you want.\n\n2️⃣ Design & develop with precision — We shape the interface, content structure and build with attention to quality, speed and clarity.\n\n3️⃣ Launch with room to grow — Once live, your site becomes a stronger platform for your brand, marketing and future growth.",

    tech: "We work with a modern, proven tech stack: HTML/CSS/JavaScript, React, Next.js, Shopify, WordPress, Webflow, Node.js and React Native / Flutter for mobile. We choose the right tools for your specific project — not the trendiest ones.",

    contact: "The best way to start is to fill in the contact form on this page, or just tell me about your project right here — I'll make sure the right person gets back to you. You can also share your email and we'll reach out directly.",

    about: "Nova Dev is a premium web design and development agency. We work with ambitious businesses — from professional service firms and B2B companies to e-commerce brands and startups — that want a stronger digital presence, clearer communication and measurable growth. We're focused on quality, strategy and long-term results.",

    why: "Clients choose Nova Dev because we combine strong visual design with solid technical execution and commercial thinking. We don't just build websites that look good — we build digital experiences that strengthen credibility, improve conversions and support real business growth.",

    guarantee: "We stand behind the quality of our work. Every project goes through thorough review and testing before launch. If something isn't right, we fix it. We aim to deliver work that exceeds expectations — that's why most of our clients come back for more.",

    maintenance: "Yes, we offer ongoing support and maintenance packages. As your business grows, we help evolve the site — new pages, updated content, performance improvements and campaign support.",

    seo: "Yes, SEO is part of how we build. We structure every website with clean code, fast loading, proper heading hierarchy, semantic HTML and mobile-first responsiveness — the technical foundations that give your site the best chance to rank and perform well in search.",

    mobile_friendly: "Absolutely. All our websites are fully responsive and built mobile-first. A seamless, polished experience on phones and tablets is non-negotiable for us.",

    hosting: "We can advise on and set up hosting as part of your project. We typically recommend Vercel, Netlify, Cloudflare Pages or managed hosting depending on your needs. Domain and hosting costs are separate from development fees.",

    cms: "Yes, we integrate content management systems so you or your team can update content without needing a developer. We work with Sanity, WordPress, Webflow CMS and custom solutions.",

    revisions: "Absolutely. Our projects include revision rounds built in. We share designs and prototypes for your feedback before development begins, and we refine until you're satisfied.",
  };

  /* ── INTENT DETECTION ────────────────────────────────────── */
  function detectIntent(text) {
    const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const is = (...kw) => kw.some(k => t.includes(k));

    if (is('price','cost','how much','budget','charge','fee','rate','invest','afford','expensive','cheap','quote','pricing')) return 'price';
    if (is('how long','timeline','deadline','deliver','time','week','month','turnaround','when','duration','fast','quick')) return 'timeline';
    if (is('mobile app','android','ios','iphone','flutter','react native','app develop','application','smartphone','tablet app')) return 'mobile';
    if (is('e-commerce','ecommerce','online shop','shopify','woocommerce','store','sell online','product','cart','checkout')) return 'ecom';
    if (is('seo','search engine','google rank','rank','visibility','organic','keyword','search traffic')) return 'seo';
    if (is('redesign','refactor','revamp','refresh','improve','update existing','rebrand','current site','existing website')) return 'redesign';
    if (is('design','ui','ux','interface','mockup','figma','prototype','wireframe','visual','look and feel','aesthetic')) return 'design';
    if (is('landing page','single page','one page','lead page','sales page','campaign page')) return 'landing';
    if (is('corporate','business website','company site','professional site','b2b','brochure site')) return 'corporate';
    if (is('performance','speed','fast','core web vitals','loading','pagespeed','lighthouse','optimis')) return 'performance';
    if (is('process','how do you work','approach','method','step','start','begin','workflow','phase')) return 'process';
    if (is('technology','tech stack','framework','react','next','wordpress','webflow','platform','built with')) return 'tech';
    if (is('hosting','domain','server','deploy','cloud','cdn','infrastructure')) return 'hosting';
    if (is('maintenance','support','after launch','update','ongoing','retainer','manage')) return 'maintenance';
    if (is('cms','content management','edit content','update page','backend')) return 'cms';
    if (is('revision','change','feedback','iteration','round','modify','adjust')) return 'revisions';
    if (is('about','who are you','who is nova dev','your agency','tell me about','what do you do','your company','your team')) return 'about';
    if (is('why choose','why nova','different','unique','stand out','best','better than','versus','vs ','competitor')) return 'why';
    if (is('guarantee','warranty','quality','assur','trust','credib','refund','promise')) return 'guarantee';
    if (is('mobile friendly','responsive','phone','tablet','screen size')) return 'mobile_friendly';
    if (is('web design','web develop','website','web app','build a site','create a site','new website','need a site','build website')) return 'web';
    if (is('contact','email','reach','call','speak','talk','consult','get in touch','quote','proposal')) return 'contact';
    if (is('service','offer','provide','capability','what can you','what do you')) return 'services_list';
    if (is('hello','hi ','hey ','greet','good morning','good afternoon','good evening','howdy','sup')) return 'greeting';
    if (is('thank','thanks','great','perfect','awesome','excellent','brilliant','helpful','appreciate','cheers')) return 'thanks';
    if (is('bye','goodbye','see you','talk later','cya','that\'s all','done for now')) return 'bye';

    return 'unknown';
  }

  /* ── RESPONSE GENERATION ─────────────────────────────────── */
  const nameList  = [];   // track conversation turns
  let askedName   = false;
  let askedEmail  = false;
  let turnCount   = 0;

  // Extract email & phone from text
  function mineData(text) {
    const emailMatch = text.match(/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/);
    if (emailMatch && !lead.email) lead.email = emailMatch[0];

    const phoneMatch = text.match(/(\+?\d[\d\s\-().]{7,}\d)/);
    if (phoneMatch && !lead.phone) lead.phone = phoneMatch[0].trim();

    // Name: "I'm X" / "my name is X" / "this is X" / "call me X"
    const nameMatch = text.match(/(?:i(?:'|')?m|my name is|i am|this is|call me)\s+([A-Z][a-z]{1,20})/i);
    if (nameMatch && !lead.name) lead.name = nameMatch[1];

    // Single capitalised word as name (if we asked)
    if (!lead.name && askedName) {
      const single = text.trim().split(/\s+/);
      if (single.length <= 2 && /^[A-Z][a-z]+/.test(single[0])) lead.name = single[0];
    }

    // Company: "company is X" / "work at X" / "from X"
    const compMatch = text.match(/(?:company(?:\s+is)?|work(?:ing)? (?:at|for)|from|at)\s+([A-Za-z0-9 &.,'-]{2,30})/i);
    if (compMatch && !lead.company) lead.company = compMatch[1].trim();

    // Service keywords for form
    if (!lead.service) {
      const lower = text.toLowerCase();
      if (lower.includes('mobile app') || lower.includes('android') || lower.includes('ios')) lead.service = 'Mobile App Development';
      else if (lower.includes('e-commerce') || lower.includes('shopify') || lower.includes('shop')) lead.service = 'E-commerce';
      else if (lower.includes('redesign')) lead.service = 'Website Redesign';
      else if (lower.includes('landing')) lead.service = 'Landing Page';
      else if (lower.includes('website') || lower.includes('web site') || lower.includes('web app')) lead.service = 'Website Development';
      else if (lower.includes('design')) lead.service = 'UI/UX Design';
    }
  }

  // Build a natural follow-up nudge
  function leadNudge() {
    if (!lead.name && !askedName && turnCount >= 2) {
      askedName = true;
      return "\n\nBy the way, I didn't catch your name — who am I speaking with?";
    }
    if (lead.name && !lead.email && !askedEmail && turnCount >= 3) {
      askedEmail = true;
      return `\n\nThanks, ${lead.name}! If you'd like us to follow up personally, what's the best email to reach you?`;
    }
    return '';
  }

  function generateReply(userText) {
    mineData(userText);
    turnCount++;

    const intent = detectIntent(userText);
    let reply = '';

    switch (intent) {
      case 'greeting':
        reply = lead.name
          ? `Hey ${lead.name}! Great to hear from you again. What can I help you with?`
          : "Hey there! 👋 Great to chat — what can I help you with today? Feel free to ask anything about our services, pricing, timelines or how we work.";
        break;

      case 'thanks':
        reply = lead.name
          ? `You're very welcome, ${lead.name}! 😊 Anything else I can help you with?`
          : "You're welcome! 😊 Is there anything else you'd like to know?";
        break;

      case 'bye':
        reply = lead.name
          ? `Talk soon, ${lead.name}! If you ever want to kick off a project, we're just a message away. 👋`
          : "Thanks for stopping by! When you're ready to discuss your project, we'd love to hear from you. 👋";
        break;

      case 'about':
        reply = KB.about;
        break;

      case 'why':
        reply = KB.why;
        break;

      case 'guarantee':
        reply = KB.guarantee;
        break;

      case 'services_list':
        reply = "Here's what we offer at Nova Dev:\n\n"
          + KB.services.map((s, i) => `${i + 1}. **${s.label}**`).join('\n')
          + "\n\nWhich of these are you most interested in? I can give you more details on any of them.";
        break;

      case 'web':
        reply = KB.services.find(s => s.id === 'web').desc;
        break;

      case 'mobile':
        reply = KB.services.find(s => s.id === 'mobile').desc
          + '\n\n' + KB.pricing.mobile;
        if (!lead.service) lead.service = 'Mobile App Development';
        break;

      case 'ecom':
        reply = KB.services.find(s => s.id === 'ecom').desc
          + '\n\n' + KB.pricing.ecom;
        if (!lead.service) lead.service = 'E-commerce';
        break;

      case 'design':
        reply = KB.services.find(s => s.id === 'design').desc;
        break;

      case 'redesign':
        reply = KB.services.find(s => s.id === 'rebrand').desc
          + "\n\nMost redesigns take 3–5 weeks and start from £2,000 depending on scope.";
        if (!lead.service) lead.service = 'Website Redesign';
        break;

      case 'landing':
        reply = "We specialise in high-converting landing pages — fast to build, strategically structured and visually on-brand.\n\n"
          + KB.pricing.landing + "\n\n" + KB.timeline.landing;
        if (!lead.service) lead.service = 'Landing Page';
        break;

      case 'corporate':
        reply = KB.services.find(s => s.id === 'web').desc;
        break;

      case 'seo':
        reply = KB.seo;
        break;

      case 'performance':
        reply = KB.services.find(s => s.id === 'seo').desc;
        break;

      case 'price':
        // Try to be specific based on what's been mentioned
        if (lead.service?.includes('Mobile')) reply = KB.pricing.mobile;
        else if (lead.service?.includes('E-commerce')) reply = KB.pricing.ecom;
        else if (lead.service?.includes('Landing')) reply = KB.pricing.landing;
        else if (lead.service?.includes('Website') || lead.service?.includes('Redesign')) reply = KB.pricing.website;
        else reply = KB.pricing.general;
        reply += "\n\nWould you like a specific quote for your project?";
        break;

      case 'timeline':
        if (lead.service?.includes('Mobile')) reply = KB.timeline.mobile;
        else if (lead.service?.includes('Landing')) reply = KB.timeline.landing;
        else if (lead.service?.includes('Website') || lead.service?.includes('Redesign')) reply = KB.timeline.website;
        else reply = KB.timeline.general;
        break;

      case 'process':
        reply = KB.process;
        break;

      case 'tech':
        reply = KB.tech;
        break;

      case 'hosting':
        reply = KB.hosting;
        break;

      case 'maintenance':
        reply = KB.maintenance;
        break;

      case 'cms':
        reply = KB.cms;
        break;

      case 'revisions':
        reply = KB.revisions;
        break;

      case 'mobile_friendly':
        reply = KB.mobile_friendly;
        break;

      case 'contact':
        reply = KB.contact;
        askedEmail = true;
        break;

      default:
        // Smart fallback — try to give something relevant
        if (userText.length < 15) {
          reply = "Could you tell me a bit more? I want to make sure I give you the most helpful answer. 😊";
        } else {
          reply = "That's a great question! To give you the most accurate answer, could you share a bit more context about your project? I'm here to help with anything — services, pricing, timelines, technology or how we work.";
        }
    }

    reply += leadNudge();
    return reply;
  }

  /* ── LEAD SUBMISSION ─────────────────────────────────────── */
  function maybeSendLead() {
    if (lead.email && lead.name && !leadSent) {
      leadSent = true;
      const fd = new FormData();
      fd.append('_subject',        `Nova Dev Chat Lead (EN) — ${lead.name}`);
      fd.append('_captcha',        'false');
      fd.append('_template',       'table');
      fd.append('Name',            lead.name);
      fd.append('Email',           lead.email);
      fd.append('Company',         lead.company || 'Not provided');
      fd.append('Phone',           lead.phone   || 'Not provided');
      fd.append('Service Interest',lead.service || 'Not specified');
      fd.append('Source',          'AI Chat Widget — Nova Dev EN');
      fetch(FORM_ENDPOINT, {
        method:'POST',
        headers:{ 'Accept':'application/json' },
        body: fd
      }).catch(() => {});
      if (typeof fbq === 'function') { try { fbq('track','Lead'); } catch(_){} }
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
    // Convert **bold** markdown and \n to HTML
    bub.innerHTML = text
      .replace(/</g, '&lt;').replace(/>/g, '&gt;')
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

  /* ── SEND FLOW ───────────────────────────────────────────── */
  function handleSend() {
    const val = inputEl?.value.trim();
    if (!val || isThinking) return;
    inputEl.value = '';
    isThinking = true;
    setInputEnabled(false);

    appendMsg(val, 'user');
    showTyping();

    // Simulate realistic thinking delay (400–900ms)
    const delay = 400 + Math.random() * 500;
    setTimeout(() => {
      hideTyping();
      const reply = generateReply(val);
      appendMsg(reply, 'bot');
      maybeSendLead();
      isThinking = false;
      setInputEnabled(true);
      inputEl?.focus();
    }, delay);
  }

  function setInputEnabled(on) {
    if (inputEl) inputEl.disabled = !on;
    if (sendBtn) sendBtn.disabled = !on;
  }

  /* ── GREETING ────────────────────────────────────────────── */
  function showGreeting() {
    setTimeout(() => {
      showTyping();
      setTimeout(() => {
        hideTyping();
        appendMsg("Hi there! 👋 I'm the Nova Dev assistant.\n\nI can answer any question about our web design, development and mobile app services — pricing, timelines, tech, process or anything else.\n\nWhat can I help you with today?", 'bot');
      }, 900);
    }, 300);
  }

  /* ── OPEN / CLOSE ────────────────────────────────────────── */
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

  /* ── EVENTS ──────────────────────────────────────────────── */
  bubble.addEventListener('click', openChat);
  bubble.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' '){e.preventDefault();openChat();} });
  closeBtn?.addEventListener('click', closeChat);
  sendBtn?.addEventListener('click', handleSend);
  inputEl?.addEventListener('keydown', e => { if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend();} });
  document.addEventListener('keydown', e => { if (e.key==='Escape'&&isOpen) closeChat(); });

  /* ── AUTO-OPEN ───────────────────────────────────────────── */
  setTimeout(() => { if (!isOpen && !opened) openChat(); }, AUTO_OPEN_DELAY);

})();
