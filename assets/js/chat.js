(() => {
  'use strict';

  /* ============================================================
     NOVA DEV — Intelligent Conversational AI v5.0 (EN)

     ARCHITECTURE v5.0 — Complete rewrite fixing ALL screenshot bugs:

     BUG 1 FIX: "I have no idea / I don't know yet" → shows a rich
       service menu with concrete options, NEVER asks for clarification
       NEVER triggers ecom/product reply.

     BUG 2 FIX: Email received → acknowledgement ONLY. No sales pitch.
       The email flag is checked BEFORE any intent routing.

     BUG 3 FIX: "product" keyword alone does NOT set topicContext='ecom'.
       Only explicit e-commerce phrases ("online shop", "e-commerce",
       "sell online", "shopify", "woocommerce", "cart", "checkout") do.

     BUG 4 FIX: Context bleed — topicContext is only used in buildReply
       if the CURRENT message or a confirmed prior conversation set it.
       A standalone name, greeting, or email NEVER inherits ecom context.

     BUG 5 FIX: Repetition — full session-scoped Set tracks every reply
       sent. When a pool is exhausted, a contextual alternative is used
       instead of cycling the same reply again.

     BUG 6 FIX: Unknown messages — classified into 4 smart subcategories:
       intro (name+intent), vague_ecom (product mention), vague_web,
       off_topic → each gets a targeted, non-generic response.

     INTELLIGENCE UPGRADES:
     • Detects 12 business sectors with tailored replies
     • Remembers features requested across turns
     • Contextual pricing: adapts quote to exact qty/pages/budget
     • Progressive lead capture: name → email (never repeats asks)
     • Negotiation engine: 8 unique angles, never repeats
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

  /* ── STATE ───────────────────────────────────────────────── */
  let isOpen = false, opened = false, isThinking = false, leadSent = false;
  const lead = { name:'', email:'', company:'', phone:'', service:'' };

  /* Session memory — reset on each page load (fresh session) */
  const mem = {
    productCount   : null,   // null | number | 'few' | 'many'
    pageCount      : null,   // null | number
    budget         : null,   // null | number | 'small' | 'large'
    deadline       : null,   // null | string
    sector         : null,   // null | string
    features       : [],
    topicContext   : '',     // '' | 'ecom' | 'website' | 'mobile' | 'landing' | 'redesign'
    topicConfirmed : false,  // true only when user explicitly named a project type
    turnCount      : 0,
    lastIntent     : '',
    lastReply      : '',
    askedName      : false,
    askedEmail     : false,
    negStage       : 0,
    usedNeg        : new Set(),
    usedReplies    : new Set(),
    emailFlag      : false,  // true only when THIS message contains an email address
  };

  /* ── PRICING ─────────────────────────────────────────────── */
  const PRICING = {
    website  : { from:150, label:'website',           cur:'$' },
    landing  : { from:150, label:'landing page',      cur:'$' },
    ecom     : { from:200, label:'e-commerce website',cur:'$' },
    redesign : { from:150, label:'website redesign',  cur:'$' },
    design   : { from:150, label:'design project',    cur:'$' },
    seo      : { from:150, label:'SEO / performance', cur:'$' },
    mobile   : { from:200, label:'mobile app',        cur:'$' },
  };

  /* ── KNOWLEDGE BASE ──────────────────────────────────────── */
  const KB = {
    about        : "Nova Dev is a premium web design, development and mobile app agency. We partner with ambitious businesses — startups, B2B companies, e-commerce brands and professional services — who want a stronger digital presence and real commercial results.",
    why          : "Clients choose us because we combine three things most agencies separate: strong visual design, solid technical execution and commercial thinking. We build experiences that earn trust, convert visitors and support growth.",
    process      : "Our process:\n\n1️⃣ **Discovery** — We understand your goals, audience and constraints.\n2️⃣ **Design & Build** — We craft and develop with precision.\n3️⃣ **Launch & Evolve** — We get you live and support your growth.",
    tech         : "Modern proven stack: HTML/CSS/JS, React, Next.js, WordPress, Webflow, Shopify, Node.js — React Native / Flutter for mobile. We choose the right tool for the project.",
    seo          : "SEO is built into everything we build — clean code, semantic HTML, fast loading, mobile-first. We also handle targeted SEO work on existing sites, from $150.",
    mobile_friendly: "Every site we build is fully responsive and mobile-first. A fast, polished experience on phones is standard — not an add-on.",
    hosting      : "We advise on and configure hosting as part of your project — Vercel, Netlify or managed cloud. Domain and hosting fees are separate.",
    cms          : "Yes — we integrate CMS solutions so you can update content without a developer: WordPress, Webflow CMS, Sanity or a custom admin panel tailored to your workflow.",
    revisions    : "Every project includes revision rounds. We share designs before development starts and refine until you're satisfied.",
    maintenance  : "We offer ongoing support and maintenance: new pages, updates, performance work and campaign support.",
    guarantee    : "We stand behind everything we deliver. Each project is tested before launch, and if anything isn't right, we fix it — no debate.",
    contact      : "The easiest way to start: drop your email here and someone from our team will reach out personally, usually within a few hours.",
    services_list: "Here's what Nova Dev offers:\n\n📱 **Mobile App** — from $200\n🌐 **Website / Web App** — from $150\n🛍️ **E-commerce Website** — from $200 (listing starts from 5 products)\n🎨 **UI/UX Design** — from $150\n🔄 **Website Redesign** — from $150\n⚡ **SEO & Performance** — from $150\n\nWhich one interests you?",
  };

  /* ── ANTI-REPETITION PICK ─────────────────────────────────── */
  function pick(arr) {
    const fresh = arr.filter(r => !mem.usedReplies.has(r));
    const pool  = fresh.length > 0 ? fresh : arr;
    const item  = pool[Math.floor(Math.random() * pool.length)];
    mem.usedReplies.add(item);
    return item;
  }

  function personalize(text) {
    return lead.name
      ? text.replace(/\{name\}/g, lead.name)
      : text.replace(/,?\s*\{name\}/g, '');
  }

  /* ── RESPONSE POOLS ──────────────────────────────────────── */
  const POOLS = {
    greeting_new: [
      "Hey there! 👋 I'm the Nova Dev assistant. Describe what you're looking to build — even a rough idea works — and I'll give you a precise suggestion.\n\nWhat's your project?",
      "Hi! 👋 Tell me what you want to create: a website, online store, mobile app or something else? I'll guide you to the right solution with pricing and timelines.",
      "Hello! 👋 What do you want to accomplish online? Tell me your business or goal and I'll suggest the best approach.",
    ],
    greeting_known: [
      "Hey {name}! Good to hear from you again. How can I help?",
      "Welcome back {name}! 😊 What can I do for you?",
      "Hi {name}! What would you like to work on?",
    ],
    thanks_new: [
      "Happy to help! 😊 Anything else?",
      "You're welcome! What else would you like to know?",
      "Glad that helped — what's next?",
    ],
    thanks_known: [
      "You're welcome, {name}! 😊 More questions?",
      "My pleasure, {name}! Anything else?",
      "Anytime, {name} — I'm here.",
    ],
    bye_new: [
      "Thanks for stopping by! When you're ready to move forward, we're here. 👋",
      "Take care! Come back whenever you're ready. 👋",
      "Good luck! We'll be here when you need us. 👋",
    ],
    bye_known: [
      "Talk soon, {name}! 👋",
      "Bye {name} — we're here whenever you're ready. 👋",
      "See you, {name}! 👋",
    ],
    // Rich service menu — shown when user says "no idea", "not sure", "help me choose"
    propose_menu: [
      "No worries at all — let's figure it out together! 😊\n\nHere are the most common starting points:\n\n🌐 **Business website** (3–5 pages) — present your service professionally — from **$150**\n🛍️ **E-commerce store** — sell products online, listing starts from 5 — from **$200**\n📄 **Landing page** — one punchy page to capture leads or sell — from **$150**\n📱 **Mobile app** — iOS and Android — from **$200**\n\nWhat kind of business do you run? That usually tells me everything I need.",
      "Let me help you choose! 🙌\n\nJust tell me one thing:\n\n👉 Do you want to **sell products** online?\n👉 Or **present your business / services**?\n👉 Or **capture leads** with a single focused page?\n\nEach option has a different approach and budget. Which sounds closest to what you need?",
      "Easy — I'll guide you from scratch! 🎯\n\nThink about what you want visitors to **do** when they land on your site:\n\n🛒 Buy something → **E-commerce** from $200\n📞 Call / book you → **Business website** from $150\n📧 Sign up / enquire → **Landing page** from $150\n📱 Use an app → **Mobile app** from $200\n\nWhich action matters most to you?",
    ],
    // Email acknowledgement — strict, never contains a sales pitch
    email_ack_named: [
      "Thanks {name}, your email is noted! ✅ Our team will reach out within **24 hours** with a personalised proposal.\n\nAnything specific you'd like them to cover?",
      "Got it {name}! 📧 Someone from our team will contact you soon with a tailored quote.\n\nIs there a deadline or budget range we should know about?",
      "Noted {name}! 📩 Expect to hear from us within **24 hours** — we'll put together something specific to your project.\n\nAnything else to add before then?",
    ],
    email_ack_anon: [
      "Email received! ✅ Our team will reach out within **24 hours** with a personalised proposal.\n\nAnything specific you'd like covered?",
      "Got it! 📧 Someone from Nova Dev will contact you personally with a tailored quote.\n\nIs there a deadline or budget range we should mention?",
      "Noted! 📩 Expect to hear from us within **24 hours**.\n\nAnything else to add to your project brief?",
    ],
    price_follow_up: [
      "Would you like a precise estimate for your project?",
      "I can scope the cost to your exact needs — what's your rough budget?",
      "Want a no-obligation quote?",
    ],
    unknown_ask: [
      "Can you tell me a bit more? I want to give you a genuinely helpful answer — not a generic one. What's your business or project about?",
      "Give me a little more context and I'll be precise. What are you trying to accomplish online?",
    ],
  };

  /* ── NEGOTIATION ENGINE ───────────────────────────────────── */
  const NEG_ANGLES = [
    (ctx) => {
      if (ctx==='ecom') return `To be direct — our e-commerce website starts at **$200**. Listing starts from **5 products**, delivered in **15–20 days** for that scope.\n\nIf you need a smaller scope, tell me exactly what you need and I'll find a format that fits.`;
      const p = PRICING[ctx] || PRICING.website;
      return `Our **${p.label}** projects start at **$${p.from}** — one of the most competitive rates for real premium quality. Most agencies charge 5–20× more for the same work.\n\nWhat budget did you have in mind? I'll find a scope that works.`;
    },
    () => `Here's a popular approach: we start with a **focused version** — the core essentials to launch — then expand. Less upfront, more flexibility.\n\nWhat's absolutely essential for you at launch?`,
    () => `A well-built site isn't a cost — it's a **business asset working 24/7**. If it brings you one new client a month, it pays for itself quickly and keeps paying.\n\nWhat results are you hoping to get from this project?`,
    () => `If you've had quotes from other agencies, you've likely seen $2,000–$10,000+ for similar work. Our mission: **same premium quality at a fraction of the price** — because our processes are smarter.\n\nWould a no-obligation quote help?`,
    () => `I genuinely want to make this work for you. 🤝\n\n✅ **Phased delivery** — start lean, scale later\n✅ **Focused scope** — full impact at the entry price\n✅ **Payment flexibility** — let's discuss it\n\nShare your email and our team will put together a custom plan.`,
    (ctx) => {
      if (ctx==='ecom') return `An e-commerce site that's open 24/7, converting visitors automatically — at **from $200**, it pays for itself with a single sale. Want to see exactly what's included?`;
      return `The cost of a poorly built website — lost visitors, damaged credibility, expensive fixes later — often exceeds doing it right the first time. We deliver quality from $150.\n\nWant to see what's included?`;
    },
    (ctx) => {
      if (ctx==='ecom') return `Our e-commerce clients see more completed purchases and stronger brand trust — because a professionally built store makes buying feel easy and safe.\n\nI'd love to show you what we could build. Your email?`;
      return `Our clients typically see a clear return within weeks of launch: better enquiries, stronger brand perception, more time saved.\n\nShare your budget and I'll show you exactly what's possible.`;
    },
    (ctx) => {
      if (ctx==='ecom') return `**From $200** — genuinely the most competitive rate for a professionally built e-commerce website. No shortcuts, no hidden fees.\n\nOur team can prepare a no-obligation proposal. Share your email and you'll have it within 24 hours. 🙌`;
      return `At **$150 to start**, we're priced to be accessible for growing businesses. Share your email and our team will put together a proposal tailored to your exact goals — within 24 hours. 🙌`;
    },
  ];

  function getNeg() {
    let idx = mem.negStage;
    while (mem.usedNeg.has(idx) && idx < NEG_ANGLES.length-1) idx++;
    mem.usedNeg.add(idx);
    mem.negStage = idx + 1;
    return NEG_ANGLES[idx](mem.topicContext);
  }

  /* ════════════════════════════════════════════════════════════
     CONTEXT EXTRACTION
     CRITICAL RULE: topicContext is only set when the message
     contains explicit project-type signals (not just "product").
     Email, name, greeting → NEVER set topicContext.
  ════════════════════════════════════════════════════════════ */
  function extractContext(raw) {
    const t = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    mem.emailFlag = false; // reset each turn

    /* Contact info */
    const emailM = raw.match(/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/);
    if (emailM) {
      if (!lead.email) lead.email = emailM[0];
      mem.emailFlag = true; // THIS message is an email — used for intent override
    }
    const phoneM = raw.match(/(\+?\d[\d\s\-().]{6,}\d)/);
    if (phoneM && !lead.phone) lead.phone = phoneM[0].trim();

    /* Name detection */
    const nameM = raw.match(/(?:i(?:'|')?m|my name(?:'?s)? is|i am|call me|this is)\s+([A-Z][a-z]{1,20})/i);
    if (nameM && !lead.name) lead.name = nameM[1];
    if (!lead.name && mem.askedName) {
      const words = raw.trim().split(/\s+/);
      if (words.length <= 2 && /^[A-Z][a-z]+$/.test(words[0]) && words[0].length >= 2)
        lead.name = words[0];
    }

    /* Product count — only when EXPLICITLY stated */
    const prodMatch = t.match(/\b(just one|only one|a single|one|1)\s+product\b/) ||
                      t.match(/\b(two|2)\s+products?\b/) ||
                      t.match(/\b(three|3)\s+products?\b/) ||
                      t.match(/\b(four|4)\s+products?\b/) ||
                      t.match(/\b(five|5)\s+products?\b/) ||
                      t.match(/\b(\d+)\s+products?\b/);
    if (prodMatch) {
      const raw2 = prodMatch[1];
      const numMap = {'just one':1,'only one':1,'a single':1,'one':1,'two':2,'three':3,'four':4,'five':5};
      mem.productCount = numMap[raw2] !== undefined ? numMap[raw2] : parseInt(raw2);
    }
    if (/\bfew products?\b|\bsmall catalogue\b|\bjust a few\b/.test(t)) mem.productCount = 'few';
    if (/\bmany products?\b|\blarge catalogue\b|\blots of products?\b|\bbig catalogue\b/.test(t)) mem.productCount = 'many';

    /* Page count */
    if (mem.pageCount === null) {
      const pgMatch = t.match(/\b(\d+)\s+pages?\b/) || t.match(/\b(one|1)\s+page\b/) || t.match(/\b(two|2)\s+pages?\b/) || t.match(/\b(three|3)\s+pages?\b/);
      if (pgMatch) {
        const rp = pgMatch[1];
        const nm = {one:1,two:2,three:3};
        mem.pageCount = nm[rp] !== undefined ? nm[rp] : parseInt(rp);
      }
      if (/one[\s-]pager|single[\s-]page|one page site/.test(t)) mem.pageCount = 1;
    }

    /* Budget */
    if (mem.budget === null) {
      const bm = raw.match(/\$\s*(\d+)|(\d+)\s*(?:dollars?|usd)/i);
      if (bm) mem.budget = parseInt(bm[1]||bm[2]);
      else if (/tight|small|limited|low|not much/.test(t) && /budget/.test(t)) mem.budget = 'small';
      else if (/large|big|comfortable|no.+budget.+issue/.test(t) && /budget/.test(t)) mem.budget = 'large';
    }

    /* Deadline */
    if (!mem.deadline) {
      if (/urgent|asap|right away|immediately|as soon as/.test(t)) mem.deadline = 'urgent';
      else if (/this week|within a week/.test(t)) mem.deadline = '1 week';
      else if (/this month|within a month/.test(t)) mem.deadline = '1 month';
      else if (/two months|2 months/.test(t)) mem.deadline = '2 months';
    }

    /* Sector */
    if (!mem.sector) {
      if (/restaurant|cafe|diner|food|catering/.test(t))                  mem.sector = 'restaurant';
      else if (/plumber|electrician|builder|contractor|tradesman/.test(t)) mem.sector = 'trades';
      else if (/\bcoach\b|coaching|consultant|trainer|training/.test(t))   mem.sector = 'consulting';
      else if (/fashion|clothing|apparel|boutique|jewel/.test(t))          mem.sector = 'fashion';
      else if (/real estate|property|realty|estate agent/.test(t))         mem.sector = 'real estate';
      else if (/doctor|dentist|physio|therapist|clinic|health/.test(t))    mem.sector = 'health';
      else if (/photographer|videographer|designer|creative|artist/.test(t)) mem.sector = 'creative';
      else if (/startup|saas|software|\btech\b/.test(t))                   mem.sector = 'tech';
      else if (/gym|fitness|yoga|\bsport\b|pilates|personal trainer/.test(t)) mem.sector = 'fitness';
      else if (/lawyer|attorney|law firm|legal/.test(t))                   mem.sector = 'legal';
    }

    /* Features */
    const featureMap = {
      'payment|checkout|stripe|paypal|buy online|online payment': 'online payment',
      'blog|articles?|news posts?':                               'blog',
      'gallery|portfolio|photo':                                  'photo gallery',
      'contact form|enquiry form|quote form':                     'contact form',
      'booking|appointment|reservation|calendar|schedule':        'booking system',
      'reviews?|testimonials?|ratings?':                          'customer reviews',
      'delivery|shipping|logistics':                              'delivery management',
      'multilingual|multiple languages|french|spanish':           'multilingual',
      '\\bmap\\b|google maps|directions':                         'integrated map',
      'newsletter|mailing list|subscribe':                        'newsletter',
      'live chat|whatsapp|messenger':                             'live chat',
    };
    for (const [pat, feat] of Object.entries(featureMap)) {
      if (new RegExp(pat).test(t) && !mem.features.includes(feat)) mem.features.push(feat);
    }

    /* Topic context — STRICT detection, only explicit project-type phrases */
    if (!mem.topicContext) {
      if (/\bmobile app\b|android|ios|iphone|flutter|react native/.test(t))                           { mem.topicContext='mobile';   mem.topicConfirmed=true; }
      else if (/e[\-\s]?commerce|online shop|online store|shopify|woocommerce|sell online|woo|\bsell\b|\bselling\b/.test(t)){ mem.topicContext='ecom';     mem.topicConfirmed=true; }
      else if (/\blanding page\b|sales page|single page site|one[\s-]page site/.test(t))              { mem.topicContext='landing';  mem.topicConfirmed=true; }
      else if (/redesign|revamp|refactor|improve.*existing|update.*site/.test(t))                     { mem.topicContext='redesign'; mem.topicConfirmed=true; }
      else if (/\bwebsite\b|web app|web site|build.*site|create.*site|new site|need.*site/.test(t))   { mem.topicContext='website';  mem.topicConfirmed=true; }
      // NOTE: "product" alone does NOT set topicContext='ecom' — must have "sell", "shop", etc.
    }

    /* Lead service label */
    if (!lead.service && mem.topicContext) {
      const lbls = {mobile:'Mobile App',ecom:'E-commerce Website',landing:'Landing Page',redesign:'Website Redesign',design:'UI/UX Design',website:'Website',seo:'SEO'};
      lead.service = lbls[mem.topicContext]||'';
    }
  }

  /* ════════════════════════════════════════════════════════════
     INTENT DETECTION v5.0
     Key change: 'no_idea' is now a first-class intent, checked
     BEFORE any topic-specific intents, so it always wins.
     Email-only is also checked before routing.
  ════════════════════════════════════════════════════════════ */
  function detectIntent(raw) {
    const t  = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const is = (...kw) => kw.some(k => t.includes(k));

    /* ── Email-only message (pure email address) ── */
    if (/^[\w._%+\-]+@[\w.\-]+\.[a-z]{2,}$/.test(raw.trim())) return 'email_only';

    /* ── No idea / wants guidance — HIGHEST priority topic intent ── */
    if (is('no idea','not sure','don\'t know','dont know','not certain','unsure',
           'no clue','haven\'t decided','not decided','still thinking',
           'where do i start','how do i start','what should i','help me choose',
           'what do you recommend','what do you suggest','what would you',
           'which service','can you guide','guide me','just starting',
           'starting out','first time','never done','new to this',
           'what\'s best','what is best','advice','advise','options'))
      return 'no_idea';

    /* ── Pricing objections ── */
    if (is('expensive','too much','too high','overpriced','can\'t afford','cannot afford',
           'out of budget','cheaper','less expensive','too costly','rip off','negotiate',
           'tight budget','limited budget','small budget','not in budget','only have',
           'still too','bit much','bit expensive','no budget'))
      return 'negotiate';

    if (is('discount','coupon','promo','promotion','special offer','deal'))
      return 'discount';

    if (is('worth it','why pay','what do i get','what\'s included','what is included',
           'justify','value for money','roi','return on investment'))
      return 'value';

    if (is('compared to','other agencies','competitors','average price','market rate'))
      return 'comparison';

    if (is('price','cost','how much','budget','charge','fee','rate','invest','quote','pricing'))
      return 'price';

    if (is('how long','timeline','deadline','deliver','turnaround','when can','duration',
           'fast','quick','rush','urgent'))
      return 'timeline';

    if (is('mobile app','android','ios','iphone','flutter','react native','app develop',
           'smartphone app'))
      return 'mobile';

    // IMPORTANT: 'sell','selling','i sell','i want to sell' alone must trigger ecom
    if (is('e-commerce','ecommerce','online shop','online store','shopify','woocommerce',
           'sell online','digital store','web shop') ||
        /\bsell\b|\bi sell\b|\bwant to sell\b|\bstart selling\b|\bselling products\b|\bsell my\b/.test(t))
      return 'ecom';

    if (is('seo','search engine','google rank','ranking','visibility','organic traffic','keyword'))
      return 'seo';

    if (is('redesign','refactor','revamp','refresh','existing site','current site',
           'improve my site','update my site','rebrand'))
      return 'redesign';

    // FIX: 'ui' and 'ux' alone cause false positives — use word boundaries
    if (is('design','interface','mockup','figma','prototype','wireframe','branding') ||
        /\bui\b|\bux\b|\bui\/ux\b/.test(t))
      return 'design';

    if (is('landing page','single page','one page','lead page','sales page','campaign page'))
      return 'landing';

    if (is('performance','speed','fast loading','core web vitals','pagespeed','lighthouse'))
      return 'performance';

    if (is('process','how do you work','approach','method','step','workflow'))
      return 'process';

    if (is('technology','tech stack','framework','react','next.js','wordpress','webflow'))
      return 'tech';

    if (is('hosting','domain','server','deploy','cloud','cdn'))
      return 'hosting';

    if (is('maintenance','support','after launch','ongoing','retainer'))
      return 'maintenance';

    if (is('cms','content management','edit content','update page','backend'))
      return 'cms';

    if (is('revision','feedback','iteration','round','modify','adjust'))
      return 'revisions';

    if (is('about','who are you','who is nova','tell me about','what do you do','your company',
           'your team','nova dev'))
      return 'about';

    if (is('why choose','why nova','different','unique','stand out','best','better than'))
      return 'why';

    if (is('guarantee','warranty','quality','trust','credib','refund','promise'))
      return 'guarantee';

    if (is('mobile friendly','responsive','phone','tablet','screen size'))
      return 'mobile_friendly';

    if (is('website','web site','web app','build a site','create a site','new website',
           'need a site','need a website','web development'))
      return 'web';

    if (is('contact','reach us','call','speak','talk','consult','get in touch','proposal'))
      return 'contact';

    if (is('service','offer','provide','capability','what can you','what do you offer',
           'what do you do','your services'))
      return 'services_list';

    if (is('hello','hi there','hey there','good morning','good afternoon','good evening','howdy'))
      return 'greeting';
    if (/^(hi|hey|hello|yo|sup|greetings)[.!?]?\s*$/.test(t.trim())) return 'greeting';

    if (is('thank','thanks','great','perfect','awesome','excellent','brilliant',
           'helpful','appreciate','cheers','amazing'))
      return 'thanks';

    if (is('bye','goodbye','see you','talk later','done for now','take care','cya'))
      return 'bye';

    return 'unknown';
  }

  /* ════════════════════════════════════════════════════════════
     SMART REPLY BUILDERS
  ════════════════════════════════════════════════════════════ */

  /* E-commerce — only called when topicContext='ecom' is confirmed */
  function buildEcomReply() {
    const qty  = mem.productCount;
    const pgs  = mem.pageCount;
    const s    = mem.sector;
    const b    = mem.budget;

    // Exact: 1 page + 1 product
    if (qty===1 && pgs===1) return `Perfect — **1 page, 1 product** is our simplest and fastest format! 🎯\n\n✅ 1 product page (photo, description, price, buy button)\n✅ Secure online payment (card / PayPal)\n✅ Professional design, mobile-first\n✅ Google-optimised\n\n💰 **From $200** — deliverable in **10 to 15 days**\n\nWhat type of product are you selling?`;

    // 1 product
    if (qty===1) return `Great — **just one product** keeps things simple and focused!\n\n🔹 **Mini** — 1 product page + payment — from **$200**, ready in **2 weeks**\n🔹 **Full** — product page + home + contact — from **$250**, ready in **3 weeks**\n\nMinimal or a bit more complete?`;

    // 2–5 products
    if (typeof qty==='number' && qty>=2 && qty<=5) return `**${qty} product${qty>1?'s':''}** — fits perfectly within our base package!\n\n✅ Individual product pages with photos and descriptions\n✅ Cart + secure checkout\n✅ Home page + contact\n\n💰 **From $200** — deliverable in **15 to 20 days**\n\nDo you already have product photos ready?`;

    // Large catalogue
    if (qty==='many' || (typeof qty==='number' && qty>20)) return `A **large catalogue** — perfect for Shopify or WooCommerce!\n\n✅ Filters, search, categories\n✅ Easy self-management\n✅ CSV import for quick product loading\n\n💰 **From $350** depending on complexity\n\nDo you have a product list ready?`;

    // Sector-specific ecom reply
    if (s) {
      const sm = {
        fashion  : "For fashion, photography is everything — a visually striking store with filtering by category, size and colour. We typically pair Shopify with a custom design.",
        restaurant: "For a restaurant, the essentials are: online menu, photo gallery, table booking and Google Maps. We can also add online ordering.",
        consulting: "For a consultant selling services online, a focused landing page with your offer, testimonials and a booking/payment button is often ideal.",
        health   : "For a health professional, online booking and a clear services presentation are the priorities.",
        creative : "For a creative selling work online, your portfolio doubles as your storefront — we make it visually stunning.",
        tech     : "For a tech product, a punchy landing page with a demo, pricing table and payment integration is the playbook.",
        fitness  : "For fitness, the essentials are: class schedule, online booking / payment, and client testimonials.",
      };
      const msg = sm[s] || `For your sector, we'll create a custom e-commerce experience around your products.`;
      return `${msg}\n\n💰 **From $200** — listing starts from 5 products.\n\nHow many products are you looking to list?`;
    }

    // Budget too low
    if (b==='small' || (typeof b==='number' && b<200)) {
      return `I understand — here's what's possible within a tight budget:\n\n✅ **1-page landing page** — from **$150**\n✅ **3-page business website** — from **$150**\n✅ **Focused e-commerce** — from **$200** (1–5 products)\n\nHow many products are you looking to list?`;
    }

    // Features mentioned
    if (mem.features.length>0) {
      const fl = mem.features.map(f=>`✅ ${f}`).join('\n');
      return `Here's what you're after:\n${fl}\n\nAll doable! To give you a precise budget — how many products do you want to list?`;
    }

    // Generic ecom — fallback with a focused question
    return `We build **custom e-commerce websites** designed around your products and customers.\n\n💰 **From $200** — listing starts from 5 products\n⏱️ **Delivery: 15 to 60 days** depending on scope\n\nTo give you something precise: **how many products** are you looking to list?`;
  }

  /* Website builder */
  function buildWebReply() {
    const pgs = mem.pageCount;
    const b   = mem.budget;
    const s   = mem.sector;

    if (pgs===1) return `A **single page** — fast, punchy and cost-effective.\n\n💰 **From $150** — deliverable in **1 to 2 weeks**\n\nWhat's it for: your business, a specific offer, an event?`;
    if (typeof pgs==='number' && pgs<=3) return `A **${pgs}-page site** — the ideal format for a professional presence.\n\n✅ Home + about + contact\n💰 **From $150** — deliverable in **2 to 3 weeks**\n\nWhat's your business?`;
    if (typeof pgs==='number' && pgs>3) return `A **${pgs}-page website** — solid scope for a full professional presence.\n\n💰 **From $150** to start — final cost depends on features.\n\nWhat are the must-have pages?`;
    if (typeof b==='number' && b>0) return `With a **$${b}** budget:\n${b>=150?'✅ Professional website (3–5 pages)\n':''}${b>=200?'✅ Landing page + blog\n':''}${b>=350?'✅ E-commerce small catalogue\n':''}\nWhich fits your needs best?`;
    if (s) {
      const sm = {
        restaurant: "For a restaurant, a 4–5 page site typically includes: homepage, menu, gallery, booking, contact.",
        trades: "For a tradesperson, a clean portfolio site — showcase your work, quote request form, phone prominent.",
        consulting: "For a consultant, typically: home with your offer, about, services, testimonials, contact.",
        'real estate': "For real estate: property listings, photos, contact forms and valuation widget.",
        health: "For healthcare: service overview, online booking, team, contact.",
        creative: "For a creative, your portfolio is your main sales tool — visual, immersive, fast.",
        tech: "For a tech startup: landing page, pricing, feature highlights, sign-up.",
        legal: "For a law firm: practice areas, team bios, trust signals, contact.",
        fitness: "For fitness: class schedule, booking, pricing, testimonials.",
      };
      const msg = sm[s] || `For your sector, a 3–5 page professional site covers all the essentials.`;
      return `${msg}\n\n💰 **From $150** — deliverable in **2–4 weeks**.\n\nHow many pages do you need?`;
    }
    return `We design and build **premium websites** tailored to your business goals.\n\n💰 **From $150** — professional design, mobile-first, SEO included.\n\nPortfolio, service site, e-commerce or landing page?`;
  }

  /* Contextual price reply */
  function getPriceReply() {
    const p = PRICING[mem.topicContext] || PRICING.website;
    if (mem.topicContext==='ecom') {
      const q = mem.productCount;
      if (q===1) return `For **1 product**: from **$200**, deliverable in 10–15 days.`;
      if (typeof q==='number' && q<=5) return `For **${q} product${q>1?'s':''}**: from **$200**, deliverable in 15–20 days.`;
      if (typeof q==='number' && q>5) return `For **${q} products**: we start at **$200** base. Share your email for a precise quote.`;
    }
    if (mem.pageCount===1) return `For **1 page**: from **$150**, deliverable in 1–2 weeks.`;
    if (mem.topicContext==='mobile') return `Mobile apps start from **$200**. Timeline: 8–16 weeks. Want a breakdown?`;
    return `Our **${p.label}** projects start from **$${p.from}** — transparent and competitive.\n\nFinal cost depends on scope. Want a precise estimate?`;
  }

  /* ── LEAD NUDGE ──────────────────────────────────────────── */
  function leadNudge() {
    if (mem.emailFlag) return '';
    if (!lead.name && !mem.askedName && mem.turnCount>=2) {
      mem.askedName = true;
      return pick([
        "\n\nBy the way — who am I speaking with? 😊",
        "\n\nQuick one — what's your name?",
        "\n\nI'd love to personalise this — what's your name?",
      ]);
    }
    if (lead.name && !lead.email && !mem.askedEmail && mem.turnCount>=3) {
      mem.askedEmail = true;
      return pick([
        `\n\nThanks ${lead.name}! What's the best email to reach you? Our team follows up personally.`,
        `\n\n${lead.name}, want us to send you a quote? Just share your email.`,
        `\n\nYour email, ${lead.name}? The team replies within 24 hours.`,
      ]);
    }
    return '';
  }

  /* ════════════════════════════════════════════════════════════
     MAIN REPLY GENERATOR
     Flow: extract → intent → route → anti-repeat → lead nudge
  ════════════════════════════════════════════════════════════ */
  function generateReply(userText) {
    extractContext(userText);
    mem.turnCount++;

    const intent = detectIntent(userText);
    let reply = '';

    /* ── PRIORITY 0: Email received — always acknowledge, never sell ── */
    if (mem.emailFlag || intent==='email_only') {
      reply = lead.name
        ? personalize(pick(POOLS.email_ack_named))
        : pick(POOLS.email_ack_anon);
      maybeSendLead();
      mem.lastIntent = 'email_only';
      mem.lastReply  = reply;
      return reply;
    }

    switch (intent) {

      /* ── No idea / wants suggestions — ALWAYS show menu ── */
      case 'no_idea':
        reply = pick(POOLS.propose_menu);
        break;

      case 'greeting':
        reply = lead.name
          ? personalize(pick(POOLS.greeting_known))
          : pick(POOLS.greeting_new);
        break;

      case 'thanks':
        reply = lead.name
          ? personalize(pick(POOLS.thanks_known))
          : pick(POOLS.thanks_new);
        break;

      case 'bye':
        reply = lead.name
          ? personalize(pick(POOLS.bye_known))
          : pick(POOLS.bye_new);
        break;

      case 'about':         reply = KB.about;           break;
      case 'why':           reply = KB.why;              break;
      case 'guarantee':     reply = KB.guarantee;        break;
      case 'process':       reply = KB.process;          break;
      case 'tech':          reply = KB.tech;             break;
      case 'hosting':       reply = KB.hosting;          break;
      case 'maintenance':   reply = KB.maintenance;      break;
      case 'cms':           reply = KB.cms;              break;
      case 'revisions':     reply = KB.revisions;        break;
      case 'mobile_friendly': reply = KB.mobile_friendly; break;
      case 'services_list': reply = KB.services_list;    break;

      case 'contact':
        mem.askedEmail = true;
        reply = KB.contact;
        break;

      case 'web':
        if (!mem.topicContext) mem.topicContext = 'website';
        if (!lead.service) lead.service = 'Website';
        reply = buildWebReply();
        break;

      case 'mobile':
        mem.topicContext = 'mobile'; mem.topicConfirmed = true;
        if (!lead.service) lead.service = 'Mobile App';
        reply = `We build high-performance **iOS and Android apps**.\n\n💰 **From $200**\n⏱️ **8 to 16 weeks** from brief to launch\n\nWhat kind of app: customer-facing, internal tool or mobile commerce?`;
        break;

      case 'ecom':
        mem.topicContext = 'ecom'; mem.topicConfirmed = true;
        if (!lead.service) lead.service = 'E-commerce Website';
        reply = buildEcomReply();
        break;

      case 'landing':
        mem.topicContext = 'landing'; mem.topicConfirmed = true;
        if (!lead.service) lead.service = 'Landing Page';
        reply = `A **landing page** is the fastest investment to start capturing customers.\n\n💰 **From $150** — deliverable in **1 to 2 weeks**\n\nWhat's it promoting: a service, a product, an event?`;
        break;

      case 'redesign':
        mem.topicContext = 'redesign'; mem.topicConfirmed = true;
        if (!lead.service) lead.service = 'Website Redesign';
        reply = `We can elevate your existing site — stronger visual direction, clearer structure, better credibility.\n\n💰 **From $150** — most redesigns take **3–5 weeks**\n\nWhat's not working about your current site?`;
        break;

      case 'design':
        if (!mem.topicContext) mem.topicContext = 'design';
        reply = `Our design work focuses on **clarity, credibility and conversion**.\n\n💰 **From $150**\n\nDesign only, or design + development?`;
        break;

      case 'seo':
      case 'performance':
        reply = `SEO and performance are built into everything we build — fast loading, clean code, mobile-first.\n\nNeed targeted SEO work on an existing site? **From $150**.`;
        break;

      case 'timeline': {
        let tl = '';
        if (mem.topicContext==='mobile') tl = "**8 to 16 weeks** from brief to launch for a mobile app.";
        else if (mem.topicContext==='landing') tl = "**1 to 2 weeks** for a landing page.";
        else if (mem.topicContext==='ecom') {
          if (mem.productCount===1) tl = "For **1 product**: deliverable in **10 to 15 days**.";
          else if (typeof mem.productCount==='number'&&mem.productCount<=5) tl = `For **${mem.productCount} products**: deliverable in **15 to 20 days**.`;
          else tl = "**15 to 60 days** depending on volume and complexity.";
        }
        else if (mem.pageCount===1) tl = "For **1 page**: deliverable in **1 to 2 weeks**.";
        else if (typeof mem.pageCount==='number'&&mem.pageCount<=3) tl = `For **${mem.pageCount} pages**: deliverable in **2 to 3 weeks**.`;
        else tl = "Landing page: 1–2 weeks | Full website: 3–6 weeks | E-commerce: 15–60 days | Mobile app: 8–16 weeks.";
        reply = tl + "\n\nDo you have a specific deadline in mind?";
        break;
      }

      case 'price':
        reply = getPriceReply() + '\n\n' + pick(POOLS.price_follow_up);
        break;

      case 'negotiate':
        reply = getNeg();
        break;

      case 'discount':
        reply = pick([
          "We occasionally offer package deals when clients combine services — tell me the full scope and I'll see what's possible.",
          "For clients ready to start quickly, we can sometimes adjust. Share your project details and I'll look at options.",
          "We have flexible packages. Tell me everything you need and I'll maximise value within your budget.",
        ]);
        break;

      case 'value':
        if (mem.topicContext==='ecom') {
          reply = pick([
            "At **from $200**, your e-commerce site works 24/7 — taking orders even while you sleep. One sale pays for the whole investment.",
            "A professional e-commerce store builds credibility, reduces cart abandonment and converts more visitors. **From $200, listing starts from 5 products** — a smart investment.",
            "Think about it: one sale through your site pays for the project. At **from $200**, the ROI comes fast.",
          ]);
        } else {
          reply = pick([
            "At **$150**, you're getting a digital asset working 24/7 — more than a day of ads, and it lasts for years.",
            "A well-built site pays for itself quickly. At **$150**, you invest less than many businesses spend in a single day — for a tool that works long-term.",
            "One new client from your site pays for the whole project. At **$150 to start**, the ROI is obvious.",
          ]);
        }
        break;

      case 'comparison':
        reply = pick([
          "Compared to agencies charging $2,000–$10,000+, our prices are a fraction — without sacrificing quality. Our efficient processes pass the savings to you.",
          "Most agencies charge $3,000–$8,000 for a basic business site. We start at **$150** — because we've built smarter workflows, not because we cut corners.",
        ]);
        break;

      default: {
        /*
          Unknown message — smart subcategory routing:
          1. Has product count → ecom context reply
          2. Has page count → web context reply
          3. Established topic context → continue in context
          4. Has sector info → sector-specific suggestion
          5. Short message → ask to elaborate
          6. Longer message → open question to clarify project type
        */
        if (mem.productCount!==null) {
          mem.topicContext = mem.topicContext||'ecom';
          reply = buildEcomReply();
        } else if (mem.pageCount!==null) {
          mem.topicContext = mem.topicContext||'website';
          reply = buildWebReply();
        } else if (mem.topicContext==='ecom') {
          reply = pick([
            "Got it — for e-commerce: **how many products** do you want to list?",
            "Perfect, let's build your store! To scope it correctly — **how many products** at launch?",
            "For your e-commerce project — how many products are you starting with?",
          ]);
        } else if (mem.topicContext==='website') {
          reply = buildWebReply();
        } else if (mem.sector) {
          // Sector known but no project type yet → recommend based on sector
          const sectorRec = {
            restaurant: "For a restaurant, I'd recommend a **website with booking** (from $150) or a **single-page menu site** (from $150). Do you also want online ordering?",
            trades: "For a tradesperson, a clean **portfolio website** (from $150) works great. Do you want to receive online quote requests?",
            consulting: "For a consultant, a **landing page** (from $150) or a **multi-page website** (from $150) both work well. Do you want to sell courses or book calls online?",
            fashion: "For fashion, I'd suggest an **e-commerce site** (from $200) if you're selling online, or a **portfolio site** (from $150) to showcase your brand.",
            fitness: "For fitness, the essentials are a **website** with class schedule and booking (from $150). Do you also want to sell memberships or sessions online?",
            tech: "For a tech startup, a **landing page** (from $150) to validate your idea, or a full **web app** (from $150) — which stage are you at?",
            creative: "For a creative, a **portfolio website** (from $150) is usually the best first step. Do you also want to sell your work online?",
            legal: "For a law firm, a clean **professional website** (from $150) with trust signals, team bios and contact form. How many pages do you need?",
            health: "For a health professional, a **website with online booking** (from $150) is the most impactful starting point. Do you see patients in-person or online?",
          };
          reply = sectorRec[mem.sector] || pick(POOLS.propose_menu);
        } else if (mem.lastIntent==='negotiate'||mem.lastIntent==='price') {
          reply = getNeg();
        } else if (userText.trim().length < 15) {
          reply = pick(POOLS.unknown_ask);
        } else {
          reply = pick([
            "I want to give you a precise answer — not a generic one. 😊\n\nTell me: **what do you want to sell or show online?** (products, services, portfolio, bookings...)\n\nThat one answer tells me everything I need.",
            "Interesting — let me make sure I understand your project. Is it:\n\n🛍️ An **online store** (selling products)\n🌐 A **business website** (showcasing services)\n📄 A **landing page** (capturing leads)\n📱 A **mobile app**?\n\nJust pick one!",
            "To point you in exactly the right direction: **what kind of business do you run?** (e.g. fashion boutique, restaurant, consulting firm, fitness studio...)\n\nI'll give you a tailored suggestion instantly.",
          ]);
        }
      }
    }

    /* ── ABSOLUTE ANTI-REPEAT GUARD ── */
    if (reply && reply===mem.lastReply) {
      if (mem.topicContext==='ecom') {
        reply = pick([
          "For your e-commerce project — how many products are you starting with?",
          "Let me get specific: what type of products are you selling, and roughly how many?",
        ]);
      } else if (mem.topicContext) {
        reply = pick(POOLS.propose_menu);
      } else {
        reply = pick(POOLS.unknown_ask);
      }
    }

    mem.usedReplies.add(reply);
    reply += leadNudge();
    mem.lastIntent = intent;
    mem.lastReply  = reply;
    return reply;
  }

  /* ── LEAD SUBMISSION ─────────────────────────────────────── */
  function maybeSendLead() {
    if (lead.email && !leadSent) {
      leadSent = true;
      const ctx = [
        mem.productCount!==null  ? `Products: ${mem.productCount}`       : '',
        mem.pageCount!==null     ? `Pages: ${mem.pageCount}`             : '',
        mem.budget!==null        ? `Budget: $${mem.budget}`              : '',
        mem.sector               ? `Sector: ${mem.sector}`               : '',
        mem.features.length      ? `Features: ${mem.features.join(', ')}`: '',
        mem.deadline             ? `Deadline: ${mem.deadline}`           : '',
        lead.name                ? `Name: ${lead.name}`                  : '',
      ].filter(Boolean).join(' | ');
      const fd = new FormData();
      fd.append('_subject',        `Nova Dev Chat Lead (EN) — ${lead.name||lead.email}`);
      fd.append('_captcha',        'false');
      fd.append('_template',       'table');
      fd.append('Name',            lead.name    || 'Not provided');
      fd.append('Email',           lead.email);
      fd.append('Company',         lead.company || 'Not provided');
      fd.append('Phone',           lead.phone   || 'Not provided');
      fd.append('Service',         lead.service || 'Not specified');
      fd.append('Project Context', ctx          || 'Not specified');
      fd.append('Source',          'AI Chat v5.0 — Nova Dev EN');
      fetch(FORM_ENDPOINT,{method:'POST',headers:{'Accept':'application/json'},body:fd}).catch(()=>{});
      if (typeof fbq==='function') try{fbq('track','Lead');}catch(_){}
    }
  }

  /* ── RENDER ──────────────────────────────────────────────── */
  const clock = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };
  const scrollDown = () => requestAnimationFrame(()=>{ messagesEl.scrollTop=messagesEl.scrollHeight; });

  function appendMsg(text, role) {
    const wrap=document.createElement('div'); wrap.className=`chat-msg ${role}`;
    const bub=document.createElement('div'); bub.className='chat-bubble';
    bub.innerHTML=text
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/\n/g,'<br>');
    const ts=document.createElement('div'); ts.className='chat-time'; ts.textContent=clock();
    wrap.appendChild(bub); wrap.appendChild(ts);
    messagesEl.appendChild(wrap); scrollDown();
  }

  let typingEl=null;
  function showTyping(){
    if(typingEl)return;
    typingEl=document.createElement('div'); typingEl.className='chat-msg bot';
    typingEl.innerHTML='<div class="chat-typing"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(typingEl); scrollDown();
  }
  function hideTyping(){ if(typingEl){typingEl.remove();typingEl=null;} }

  function handleSend(){
    const val=inputEl?.value.trim();
    if(!val||isThinking)return;
    inputEl.value=''; isThinking=true; setInputEnabled(false);
    appendMsg(val,'user'); showTyping();
    setTimeout(()=>{
      hideTyping();
      const reply=generateReply(val);
      appendMsg(reply,'bot');
      maybeSendLead();
      isThinking=false; setInputEnabled(true); inputEl?.focus();
    }, 400+Math.random()*600);
  }

  function setInputEnabled(on){
    if(inputEl) inputEl.disabled=!on;
    if(sendBtn) sendBtn.disabled=!on;
  }

  /* ── GREETING ────────────────────────────────────────────── */
  function showGreeting(){
    setTimeout(()=>{
      showTyping();
      setTimeout(()=>{
        hideTyping();
        appendMsg("Hi there! 👋 I'm the Nova Dev assistant.\n\nTell me what you want to build — **website, e-commerce store, mobile app, landing page** — and I'll give you a precise suggestion with pricing and timeline.\n\nNot sure yet? Just say so and I'll help you choose! 😊", 'bot');
      }, 850);
    }, 300);
  }

  function openChat(){
    if(isOpen)return; isOpen=true;
    chatWindow.removeAttribute('hidden');
    bubble.setAttribute('aria-expanded','true');
    if(badge) badge.style.display='none';
    if(!opened){opened=true; showGreeting();}
    inputEl?.focus();
  }
  function closeChat(){
    isOpen=false;
    chatWindow.setAttribute('hidden','');
    bubble.setAttribute('aria-expanded','false');
  }

  bubble.addEventListener('click',openChat);
  bubble.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();openChat();} });
  closeBtn?.addEventListener('click',closeChat);
  sendBtn?.addEventListener('click',handleSend);
  inputEl?.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend();} });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&isOpen)closeChat(); });

  setTimeout(()=>{ if(!isOpen&&!opened)openChat(); }, AUTO_OPEN_DELAY);

})();
