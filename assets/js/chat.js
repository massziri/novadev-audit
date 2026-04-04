(() => {
  'use strict';

  /* ============================================================
     NOVA DEV — Elite AI Chat Engine (EN)
     • Intelligent negotiation with multi-stage memory
     • Never repeats the same sentence
     • Context-aware responses based on conversation flow
     • Correct pricing: website from $150, mobile from $200
     • Lead capture → admin@novatvhub.com via FormSubmit
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
  const lead = { name:'', email:'', company:'', phone:'', service:'' };
  let leadSent = false;

  // Anti-repetition memory
  const usedTexts = new Set();
  // Conversation intelligence
  let negotiationStage  = 0;
  let lastIntent        = '';
  let lastBotReply      = '';
  let topicContext      = '';   // remembered service topic
  let turnCount         = 0;
  let askedName         = false;
  let askedEmail        = false;
  // Track what negotiation angles were already used
  const usedNegAngles   = new Set();

  /* ── PRICING ─────────────────────────────────────────────── */
  const PRICING = {
    website:  { from:150, label:'website',             currency:'$' },
    landing:  { from:150, label:'landing page',        currency:'$' },
    ecom:     { from:150, label:'e-commerce store',    currency:'$' },
    redesign: { from:150, label:'website redesign',    currency:'$' },
    design:   { from:150, label:'design project',      currency:'$' },
    seo:      { from:150, label:'SEO / performance',   currency:'$' },
    mobile:   { from:200, label:'mobile app',          currency:'$' },
  };

  /* ── KNOWLEDGE BASE ──────────────────────────────────────── */
  const KB = {
    about:    "Nova Dev is a premium web design, development and mobile app agency. We partner with ambitious businesses — startups, B2B companies, e-commerce brands and professional services — who want a stronger digital presence and real commercial results. We're small enough to care and skilled enough to deliver.",

    why:      "Clients come to us because we bridge three things most agencies separate: strong visual design, solid technical execution and commercial thinking. We don't build sites that just look great — we build experiences that earn trust, convert visitors and support long-term growth.",

    process:  "Our process is straightforward:\n\n1️⃣ **Discovery** — We understand your goals, audience and current situation.\n\n2️⃣ **Design & Build** — We craft the interface and develop with precision and quality.\n\n3️⃣ **Launch & Evolve** — We get you live and support your growth from there.",

    tech:     "We use a modern, proven tech stack: HTML/CSS/JavaScript, React, Next.js, WordPress, Webflow, Shopify, Node.js — and React Native / Flutter for mobile apps. We choose the right tool for the job, not the trendiest one.",

    seo:      "SEO is built into how we work — clean code, semantic HTML, fast loading, mobile-first, proper structure. These are the technical foundations Google rewards. We can also handle targeted SEO work on existing sites.",

    mobile_friendly: "Every site we build is fully responsive and mobile-first. A fast, polished experience on phones isn't optional — it's standard on every project.",

    hosting:  "We advise on and configure hosting as part of your project. We typically recommend Vercel, Netlify or managed cloud hosting. Domain and hosting fees are separate from development.",

    cms:      "Yes — we integrate CMS solutions so you can update content without a developer. We work with WordPress, Webflow CMS, Sanity and custom admin panels depending on your needs.",

    revisions: "Every project includes revision rounds. We share designs before development starts, gather your feedback and refine until you're fully satisfied.",

    maintenance: "We offer ongoing support and maintenance packages. As your business evolves, we keep your site evolving too — new pages, updates, performance work and campaign support.",

    guarantee: "We stand behind everything we deliver. Each project is thoroughly tested before launch, and if anything isn't right, we fix it. Most of our clients come back — that's the best indicator of our commitment to quality.",

    contact:  "The easiest way to get started is to drop your email here — someone from our team will reach out personally and quickly. Or use the contact form below if you prefer.",

    services_list: "Here's what we offer at Nova Dev:\n\n📱 **Mobile App Development** — from $200\n🌐 **Website / Web App** — from $150\n🛍️ **E-commerce Store** — from $150\n🎨 **UI/UX Design** — from $150\n🔄 **Website Redesign** — from $150\n⚡ **SEO & Performance** — from $150\n\nAll prices depend on scope. Which one interests you most?",
  };

  /* ── PICK FRESH (no repetition) ──────────────────────────── */
  function pickFresh(arr) {
    const available = arr.filter(r => !usedTexts.has(r));
    const pool = available.length > 0 ? available : arr;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    usedTexts.add(pick);
    return pick;
  }

  function personalize(text) {
    return lead.name ? text.replace(/\{name\}/g, lead.name) : text.replace(/,?\s*\{name\}/g, '');
  }

  /* ── RESPONSE POOLS ──────────────────────────────────────── */
  const POOLS = {
    greeting_new: [
      "Hey there! 👋 Welcome to Nova Dev. I can answer anything — services, pricing, timelines, tech. What would you like to know?",
      "Hi! 👋 Great to meet you. Whether you're exploring options or ready to start, I'm here to help. What's on your mind?",
      "Hello! 👋 I'm the Nova Dev assistant. Ask me anything about web design, app development, pricing or how we work.",
    ],
    greeting_known: [
      "Hey {name}! Good to see you again. What can I help you with?",
      "Welcome back, {name}! 😊 How can I assist you today?",
      "Hi {name}! What would you like to know?",
    ],
    thanks_new: [
      "You're welcome! 😊 Anything else I can help with?",
      "Happy to help! Let me know if you have more questions.",
      "Glad that's useful — what else would you like to know?",
    ],
    thanks_known: [
      "You're welcome, {name}! 😊 Anything else on your mind?",
      "My pleasure, {name}! Feel free to ask anything else.",
      "Anytime, {name}! What else can I do for you?",
    ],
    bye_new: [
      "Thanks for stopping by! When you're ready to discuss a project, we'd love to hear from you. 👋",
      "Take care! We're here whenever you want to move forward. 👋",
      "It was great chatting! Come back anytime. 👋",
    ],
    bye_known: [
      "Talk soon, {name}! We'd love to work with you. 👋",
      "See you soon, {name}! Just message when you're ready. 👋",
      "Bye {name}! We're here when you want to kick things off. 👋",
    ],
    unknown_short: [
      "Could you elaborate a little? I want to give you the most helpful answer. 😊",
      "I'd love to help — could you share a bit more context?",
      "Can you tell me a bit more about what you're looking for?",
    ],
    unknown_long: [
      "That's an interesting point! To give you the most accurate answer, could you share a bit more about your project? I'm here to help with services, pricing, timelines and more.",
      "Good question — could you give me a little more context? I want to make sure I point you in the right direction.",
      "I want to give you a precise answer. Could you elaborate a bit on your situation? Whether it's about budget, timelines or services, I've got you covered.",
    ],
    price_follow_up: [
      "Would you like a more specific estimate for your project?",
      "Want me to help scope this out for your exact needs?",
      "I can connect you with the team for a detailed, no-obligation quote — shall I?",
    ],
  };

  /* ── NEGOTIATION ENGINE ───────────────────────────────────── */
  // 8 distinct negotiation angles — bot cycles through without repeating
  const NEG_ANGLES = [
    // Angle 0 — Price clarification (always first)
    (ctx) => {
      const p = PRICING[ctx] || PRICING.website;
      return `Just to be clear — our ${p.label} projects start from just **$${p.from}**. That's already one of the most competitive rates you'll find for genuine premium quality. Most agencies charge 5–20x more for the same level of work.\n\nWhat's the budget range you had in mind? I'll do my best to find a scope that fits.`;
    },
    // Angle 1 — MVP / phased approach
    () => `Here's an approach many of our clients love: we start with a **lean, focused version** — the core pages and features that matter most right now. Once the site is live and generating results, we expand it. This way you invest less upfront and grow the project as your business grows.\n\nWhat are the absolute must-haves for you at launch?`,
    // Angle 2 — ROI perspective
    () => `Let me reframe this for a moment. A well-built website isn't a cost — it's a **business asset** that works 24/7, 365 days a year. If it brings in even one new client a month, it pays for itself quickly and keeps paying. Compare that to a month of ads with nothing lasting.\n\nWhat kind of results are you hoping the project generates for your business?`,
    // Angle 3 — Comparison angle
    () => `If you've explored other agencies, you may have seen quotes of $2,000–$10,000+ for similar projects. We've made it our mission to offer **the same premium quality at a fraction of the price** — without cutting corners, because we've built efficient processes that pass savings to our clients.\n\nWould a no-obligation custom quote help? I can arrange that.`,
    // Angle 4 — Flexibility offer
    () => `I genuinely want to make this work for you. 🤝 We have a few options:\n\n✅ **Phased delivery** — start lean, scale later\n✅ **Focused scope** — tight, impactful project at entry price\n✅ **Payment flexibility** — we can discuss spreading the cost\n\nIf you share your email, I'll have the team put together a custom plan within your budget — no pressure.`,
    // Angle 5 — Value of professional quality
    () => `I understand budget sensitivity — but I'd also gently point out: **the cost of a poorly built website is often higher** than the cost of doing it right. Poorly built sites lose visitors, harm credibility and often need expensive fixes later.\n\nWe deliver quality that holds up — and at $150 to start, you're getting genuine value. Would it help to see what's included at that price?`,
    // Angle 6 — Client success angle
    () => `Our clients — businesses just like yours — typically see a **clear return within weeks** of launch: better enquiry quality, stronger brand perception, more time saved thanks to a site that actually answers questions.\n\nI'd love to show you what we could build for your specific budget. Want to share what you're working with?`,
    // Angle 7 — Final soft close
    () => `I respect your position, and I want to be honest: at **$150 to start**, we're already priced to be accessible for growing businesses. I can't go lower in good conscience and still deliver the quality you deserve.\n\nWhat I *can* do is have our team put together a no-obligation proposal tailored exactly to your goals and budget. Share your email and we'll have it to you within 24 hours. 🙌`,
  ];

  function getNegotiationResponse() {
    // Find an angle we haven't used yet
    let idx = negotiationStage;
    while (usedNegAngles.has(idx) && idx < NEG_ANGLES.length - 1) idx++;
    usedNegAngles.add(idx);
    negotiationStage = idx + 1;
    return NEG_ANGLES[idx](topicContext);
  }

  /* ── INTENT DETECTION ────────────────────────────────────── */
  function detectIntent(text) {
    const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const is = (...kw) => kw.some(k => t.includes(k));

    // Price objections (check FIRST)
    if (is('expensive','too much','too high','overpriced','can\'t afford','cannot afford',
           'out of budget','over budget','lower price','reduce','cheaper','less expensive',
           'too costly','pricey','not worth','rip off','ripoff','way too','that\'s a lot',
           'thats a lot','are you serious','seriously?','no way','i can get','someone else',
           'other agency','freelancer','fiverr','upwork','negotiate','tight budget',
           'limited budget','small budget','not in budget','my budget is','only have',
           'can only','afford it','still expensive','still too','bit much','bit expensive',
           'quite a lot','quite expensive','too dear','bit pricey','no budget'))
      return 'negotiate';

    // Discount-specific
    if (is('discount','coupon','promo','promotion','special offer','special price','deal','offer me'))
      return 'discount';

    // Value questions
    if (is('worth it','why pay','what do i get','what\'s included','what is included','justify',
            'value for money','roi','return on investment','what do you deliver'))
      return 'value';

    // Comparison
    if (is('compared to','other agencies','competitors','average price','market rate',
            'industry average','how do you compare','benchmark'))
      return 'comparison';

    // Standard intents
    if (is('price','cost','how much','budget','charge','fee','rate','invest','quote','pricing','tariff'))
      return 'price';
    if (is('how long','timeline','deadline','deliver','time','week','month','turnaround',
            'when','duration','fast','quick','rush','urgent'))
      return 'timeline';
    if (is('mobile app','android','ios','iphone','flutter','react native','app develop',
            'application','smartphone','tablet app','cross-platform'))
      return 'mobile';
    if (is('e-commerce','ecommerce','online shop','shopify','woocommerce','store','sell online',
            'product','cart','checkout','online store'))
      return 'ecom';
    if (is('seo','search engine','google rank','rank','visibility','organic','keyword',
            'search traffic','google search'))
      return 'seo';
    if (is('redesign','refactor','revamp','refresh','improve existing','update existing',
            'rebrand','current site','existing website','existing site'))
      return 'redesign';
    if (is('design','ui ','ux ','interface','mockup','figma','prototype','wireframe',
            'visual','look and feel','aesthetic','branding'))
      return 'design';
    if (is('landing page','single page','one page','lead page','sales page','campaign page'))
      return 'landing';
    if (is('performance','speed','fast loading','core web vitals','pagespeed','lighthouse',
            'optimis','page speed'))
      return 'performance';
    if (is('process','how do you work','approach','method','step','workflow','how it work',
            'how does it work','your method'))
      return 'process';
    if (is('technology','tech stack','framework','react','next.js','wordpress','webflow',
            'platform','built with','what technology'))
      return 'tech';
    if (is('hosting','domain','server','deploy','cloud','cdn','infrastructure'))
      return 'hosting';
    if (is('maintenance','support','after launch','update','ongoing','retainer','manage site'))
      return 'maintenance';
    if (is('cms','content management','edit content','update page','backend','back-office'))
      return 'cms';
    if (is('revision','change','feedback','iteration','round','modify','adjust','amend'))
      return 'revisions';
    if (is('about','who are you','who is nova','tell me about','what do you do','your company',
            'your team','your agency','nova dev'))
      return 'about';
    if (is('why choose','why nova','different','unique','stand out','best','better than',
            'versus','vs ','what makes'))
      return 'why';
    if (is('guarantee','warranty','quality assur','trust','credib','refund','promise','confident'))
      return 'guarantee';
    if (is('mobile friendly','responsive','phone','tablet','screen size','on mobile'))
      return 'mobile_friendly';
    if (is('website','web site','web app','build a site','create a site','new website',
            'need a site','build website','web development','corporate site','business site'))
      return 'web';
    if (is('contact','email','reach','call','speak','talk','consult','get in touch',
            'proposal','reach out'))
      return 'contact';
    if (is('service','offer','provide','capability','what can you','what do you offer'))
      return 'services_list';
    if (is('hello','hi ','hey ','greet','good morning','good afternoon','good evening','howdy','sup'))
      return 'greeting';
    if (is('thank','thanks','great','perfect','awesome','excellent','brilliant','helpful',
            'appreciate','cheers','amazing'))
      return 'thanks';
    if (is('bye','goodbye','see you','talk later','cya','that\'s all','done for now','take care'))
      return 'bye';

    return 'unknown';
  }

  /* ── CONTEXT-AWARE PRICE REPLY ───────────────────────────── */
  function getPriceReply() {
    const p = PRICING[topicContext] || PRICING.website;
    return `Our **${p.label}** projects start from just **$${p.from}** — transparent, competitive and designed to give you real quality without the inflated agency price tag.\n\nThe final cost depends on scope, features and timeline. Would you like a more specific estimate?`;
  }

  /* ── DATA EXTRACTION ─────────────────────────────────────── */
  function extractData(text) {
    const emailM = text.match(/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/);
    if (emailM && !lead.email) lead.email = emailM[0];

    const phoneM = text.match(/(\+?\d[\d\s\-().]{6,}\d)/);
    if (phoneM && !lead.phone) lead.phone = phoneM[0].trim();

    const nameM = text.match(/(?:i(?:'|')?m|my name is|i am|call me|this is)\s+([A-Z][a-z]{1,20})/i);
    if (nameM && !lead.name) lead.name = nameM[1];
    if (!lead.name && askedName) {
      const words = text.trim().split(/\s+/);
      if (words.length <= 2 && /^[A-Z][a-z]+$/.test(words[0])) lead.name = words[0];
    }

    const compM = text.match(/(?:company(?:\s+is)?|work(?:ing)? (?:at|for)|at|from)\s+([A-Za-z0-9 &.,'-]{2,30})/i);
    if (compM && !lead.company) lead.company = compM[1].trim();

    // Topic context detection
    if (!topicContext) {
      const low = text.toLowerCase();
      if (low.includes('mobile') || low.includes('android') || low.includes('ios') || low.includes(' app ')) topicContext = 'mobile';
      else if (low.includes('ecommerce') || low.includes('e-commerce') || low.includes('shop') || low.includes('store')) topicContext = 'ecom';
      else if (low.includes('landing')) topicContext = 'landing';
      else if (low.includes('redesign') || low.includes('revamp') || low.includes('refactor')) topicContext = 'redesign';
      else if (low.includes('design') || low.includes('ui') || low.includes('ux')) topicContext = 'design';
      else if (low.includes('website') || low.includes('web')) topicContext = 'website';
    }
    if (!lead.service && topicContext) {
      const labels = { mobile:'Mobile App', ecom:'E-commerce', landing:'Landing Page', redesign:'Website Redesign', design:'UI/UX Design', website:'Website Development', seo:'SEO & Performance' };
      lead.service = labels[topicContext] || '';
    }
  }

  /* ── LEAD NUDGE ──────────────────────────────────────────── */
  function leadNudge() {
    if (!lead.name && !askedName && turnCount >= 2) {
      askedName = true;
      return pickFresh([
        "\n\nBy the way — who am I speaking with? 😊",
        "\n\nI'd love to personalise this — what's your name?",
        "\n\nQuick one — who do I have the pleasure of chatting with?",
      ]);
    }
    if (lead.name && !lead.email && !askedEmail && turnCount >= 3) {
      askedEmail = true;
      return pickFresh([
        `\n\nThanks ${lead.name}! What's the best email to reach you? Our team will follow up personally.`,
        `\n\n${lead.name}, want us to send you more info or a quote? Just share your email.`,
        `\n\nIf you'd like us to follow up, ${lead.name}, what's your email?`,
      ]);
    }
    return '';
  }

  /* ── GENERATE REPLY ──────────────────────────────────────── */
  function generateReply(userText) {
    extractData(userText);
    turnCount++;
    const intent = detectIntent(userText);
    let reply = '';

    switch (intent) {

      case 'greeting':
        reply = lead.name
          ? personalize(pickFresh(POOLS.greeting_known))
          : pickFresh(POOLS.greeting_new);
        break;

      case 'thanks':
        reply = lead.name
          ? personalize(pickFresh(POOLS.thanks_known))
          : pickFresh(POOLS.thanks_new);
        break;

      case 'bye':
        reply = lead.name
          ? personalize(pickFresh(POOLS.bye_known))
          : pickFresh(POOLS.bye_new);
        break;

      case 'about':       reply = KB.about;       break;
      case 'why':         reply = KB.why;          break;
      case 'guarantee':   reply = KB.guarantee;    break;
      case 'process':     reply = KB.process;      break;
      case 'tech':        reply = KB.tech;         break;
      case 'hosting':     reply = KB.hosting;      break;
      case 'maintenance': reply = KB.maintenance;  break;
      case 'cms':         reply = KB.cms;          break;
      case 'revisions':   reply = KB.revisions;    break;
      case 'mobile_friendly': reply = KB.mobile_friendly; break;
      case 'contact':
        askedEmail = true;
        reply = KB.contact;
        break;

      case 'services_list':
        reply = KB.services_list;
        break;

      case 'web':
        topicContext = topicContext || 'website';
        if (!lead.service) lead.service = 'Website Development';
        reply = `We design and build **premium websites** tailored to your business goals — corporate sites, web apps, portfolios, service pages and more.\n\n💰 **Starting from just $150** — real quality at a price that makes sense.\n\nWhat kind of website do you need?`;
        break;

      case 'mobile':
        topicContext = 'mobile';
        if (!lead.service) lead.service = 'Mobile App';
        reply = `We build high-performance **iOS and Android apps** that extend your brand and engage your audience — customer apps, internal tools, e-commerce mobile experiences and more.\n\n💰 **Starting from $200** — one of the most competitive rates for quality mobile development.\n\nWhat kind of app do you have in mind?`;
        break;

      case 'ecom':
        topicContext = 'ecom';
        if (!lead.service) lead.service = 'E-commerce';
        reply = `We create conversion-focused **online stores** that present your products beautifully, build trust and reduce buying friction.\n\n💰 **Starting from $150** — we work with Shopify, WooCommerce and custom solutions.\n\nWhat products are you selling?`;
        break;

      case 'landing':
        topicContext = 'landing';
        if (!lead.service) lead.service = 'Landing Page';
        reply = `A well-crafted **landing page** is one of the smartest investments for any campaign — fast to deliver and built to convert.\n\n💰 **Starting from $150** — strategically structured, visually sharp, delivered in 1–2 weeks.\n\nWhat's the goal of your landing page?`;
        break;

      case 'redesign':
        topicContext = 'redesign';
        if (!lead.service) lead.service = 'Website Redesign';
        reply = `We can elevate your existing site — stronger visual direction, clearer structure, better credibility — while keeping what already works.\n\n💰 **Starting from $150**, most redesigns take 3–5 weeks.\n\nWhat's not working about your current site?`;
        break;

      case 'design':
        topicContext = topicContext || 'design';
        reply = `Our design work is focused on **clarity, credibility and conversion** — clean, sophisticated interfaces that make your brand feel premium and guide visitors toward action.\n\n💰 **Starting from $150**.\n\nDo you need design only, or design + development?`;
        break;

      case 'seo':
      case 'performance':
        reply = `SEO and performance are baked into everything we build — fast loading, clean semantic code, mobile-first, correct structure. These aren't extras, they're standard.\n\nNeed specific SEO work on an existing site? We handle that too — **from $150**.`;
        break;

      case 'timeline':
        if (topicContext === 'mobile') reply = "Mobile apps typically take **8–16 weeks** from brief to launch, depending on features and complexity.";
        else if (topicContext === 'landing') reply = "Landing pages are usually ready in **1–2 weeks** — fast, focused and effective.";
        else if (topicContext === 'ecom') reply = "E-commerce stores typically take **4–8 weeks** depending on platform and product volume.";
        else reply = "Timelines vary by project:\n\n📄 **Landing page** — 1–2 weeks\n🌐 **Full website** — 3–6 weeks\n🛍️ **E-commerce** — 4–8 weeks\n📱 **Mobile app** — 8–16 weeks\n\nWe'll give you a precise timeline during your consultation.";
        break;

      case 'price':
        reply = getPriceReply() + '\n\n' + pickFresh(POOLS.price_follow_up);
        break;

      case 'negotiate':
        reply = getNegotiationResponse();
        break;

      case 'discount':
        reply = pickFresh([
          "We occasionally offer package deals when clients combine multiple services — like a website + landing page bundle. Want me to explore what's possible for your project?",
          "For clients ready to start quickly, we sometimes offer early-commitment pricing. Share your project details and I'll see what we can put together.",
          "We work with flexible packages. Tell me what you need in full and I'll see where we can add more value within your budget.",
        ]);
        break;

      case 'value':
        reply = pickFresh([
          "At $150, you're not just getting a website — you're getting a **strategic digital asset** designed to attract customers and grow your business. That's an investment that typically returns many times over.",
          "Think of it this way: a well-built website pays for itself quickly. At $150, you're investing less than many businesses spend in a single day — but getting a tool that works 24/7 for years.",
          "One new client from your website pays for the whole project — and then it keeps working. That's the power of a well-built digital presence. At $150 to start, the ROI potential is enormous.",
        ]);
        break;

      case 'comparison':
        reply = pickFresh([
          "Compared to other agencies, we're genuinely among the most competitive. Most charge $2,000–$10,000+ for what we deliver from $150. We've built efficient processes that let us pass real savings to clients without sacrificing quality.",
          "If you've had quotes from other agencies, you'll see we're a fraction of the cost. Our $150 starting price is possible because we've optimised our workflow — not because we cut corners. Same premium quality, much lower price.",
          "Here's the honest comparison: most design agencies charge $3,000–$8,000 for a basic business website. We start at $150. That's not because we're a discount shop — it's because we've built smarter, leaner processes.",
        ]);
        break;

      default:
        // If previously negotiating, continue that thread
        if (lastIntent === 'negotiate' || lastIntent === 'price') {
          reply = getNegotiationResponse();
        } else if (userText.trim().length < 12) {
          reply = pickFresh(POOLS.unknown_short);
        } else {
          reply = pickFresh(POOLS.unknown_long);
        }
    }

    // Hard guard: never send the same reply twice in a row
    if (reply === lastBotReply) {
      if (['price','negotiate','discount','value','comparison'].includes(intent)) {
        reply = getNegotiationResponse();
      } else {
        reply = pickFresh(POOLS.unknown_long);
      }
    }

    reply += leadNudge();
    lastIntent = intent;
    lastBotReply = reply;
    return reply;
  }

  /* ── LEAD SUBMISSION ─────────────────────────────────────── */
  function maybeSendLead() {
    if (lead.email && lead.name && !leadSent) {
      leadSent = true;
      const fd = new FormData();
      fd.append('_subject',         `Nova Dev Chat Lead (EN) — ${lead.name}`);
      fd.append('_captcha',         'false');
      fd.append('_template',        'table');
      fd.append('Name',             lead.name);
      fd.append('Email',            lead.email);
      fd.append('Company',          lead.company  || 'Not provided');
      fd.append('Phone',            lead.phone    || 'Not provided');
      fd.append('Service Interest', lead.service  || 'Not specified');
      fd.append('Source',           'AI Chat — Nova Dev EN');
      fetch(FORM_ENDPOINT, { method:'POST', headers:{'Accept':'application/json'}, body:fd }).catch(()=>{});
      if (typeof fbq === 'function') try { fbq('track','Lead'); } catch(_){}
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
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/\n/g,'<br>');
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
  function hideTyping() { if (typingEl) { typingEl.remove(); typingEl = null; } }

  /* ── SEND FLOW ───────────────────────────────────────────── */
  function handleSend() {
    const val = inputEl?.value.trim();
    if (!val || isThinking) return;
    inputEl.value = '';
    isThinking = true;
    setInputEnabled(false);
    appendMsg(val, 'user');
    showTyping();
    // Realistic variable delay
    const delay = 450 + Math.random() * 650;
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
        appendMsg("Hi there! 👋 I'm the Nova Dev assistant.\n\nI can answer any question about our services — **websites from $150**, **mobile apps from $200**, timelines, tech, process and more.\n\nWhat are you looking to build?", 'bot');
      }, 850);
    }, 300);
  }

  /* ── OPEN / CLOSE ────────────────────────────────────────── */
  function openChat() {
    if (isOpen) return;
    isOpen = true;
    chatWindow.removeAttribute('hidden');
    bubble.setAttribute('aria-expanded','true');
    if (badge) badge.style.display = 'none';
    if (!opened) { opened = true; showGreeting(); }
    inputEl?.focus();
  }
  function closeChat() {
    isOpen = false;
    chatWindow.setAttribute('hidden','');
    bubble.setAttribute('aria-expanded','false');
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
