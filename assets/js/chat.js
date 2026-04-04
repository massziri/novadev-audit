(() => {
  'use strict';

  /* ============================================================
     NOVA DEV — Smart Conversational AI Brain v3.0 (EN)
     • Deep context memory: remembers everything the user says
       and adapts every single response accordingly
     • Detects precise details: quantities, budgets, deadlines,
       sector, features requested
     • Responds to WHAT the prospect says, not a generic script
     • Smart negotiation engine — 8 unique angles, no repetition
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
  let leadSent = false;
  const lead = { name:'', email:'', company:'', phone:'', service:'' };

  // Full conversational memory
  const memory = {
    productCount:   null,   // e.g. 1, 5, 20, "many"
    pageCount:      null,   // e.g. 1, 3, "several"
    budget:         null,   // e.g. 100, 200, 500, "small"
    deadline:       null,   // e.g. "urgent", "1 week", "2 months"
    sector:         null,   // e.g. "restaurant", "coach", "fashion"
    projectType:    null,
    features:       [],
    painPoints:     [],
    turnCount:      0,
    lastIntent:     '',
    lastBotReply:   '',
    topicContext:   '',
    askedName:      false,
    askedEmail:     false,
    negotiationStage: 0,
    clarifyPending: false,
    clarifyTopic:   '',
  };

  const usedTexts     = new Set();
  const usedNegAngles = new Set();

  /* ── PRICING ─────────────────────────────────────────────── */
  const PRICING = {
    website:  { from:150, label:'website',          currency:'$' },
    landing:  { from:150, label:'landing page',     currency:'$' },
    ecom:     { from:200, label:'e-commerce website', currency:'$' },
    redesign: { from:150, label:'website redesign', currency:'$' },
    design:   { from:150, label:'design project',   currency:'$' },
    seo:      { from:150, label:'SEO / performance', currency:'$' },
    mobile:   { from:200, label:'mobile app',       currency:'$' },
  };

  /* ── KNOWLEDGE BASE ──────────────────────────────────────── */
  const KB = {
    about:    "Nova Dev is a premium web design, development and mobile app agency. We partner with ambitious businesses — startups, B2B companies, e-commerce brands and professional services — who want a stronger digital presence and real commercial results.",
    why:      "Clients come to us because we bridge three things most agencies separate: strong visual design, solid technical execution and commercial thinking. We don't build sites that just look great — we build experiences that earn trust, convert visitors and support long-term growth.",
    process:  "Our process:\n\n1️⃣ **Discovery** — We understand your goals and situation.\n2️⃣ **Design & Build** — We craft and develop with precision.\n3️⃣ **Launch & Evolve** — We get you live and support your growth.",
    tech:     "Modern proven stack: HTML/CSS/JS, React, Next.js, WordPress, Webflow, Shopify, Node.js — and React Native / Flutter for mobile. We choose the right tool for the job.",
    seo:      "SEO is built into how we work — clean code, semantic HTML, fast loading, mobile-first. We can also handle targeted SEO work on existing sites.",
    mobile_friendly: "Every site we build is fully responsive and mobile-first. A fast, polished experience on phones is standard on every project.",
    hosting:  "We advise on and configure hosting as part of your project — typically Vercel, Netlify or managed cloud. Domain and hosting fees are separate.",
    cms:      "Yes — we integrate CMS solutions so you can update content without a developer: WordPress, Webflow CMS, Sanity or custom admin panels.",
    revisions: "Every project includes revision rounds. We share designs before development starts and refine until you're fully satisfied.",
    maintenance: "We offer ongoing support and maintenance packages — new pages, updates, performance work and campaign support.",
    guarantee: "We stand behind everything we deliver. Each project is thoroughly tested before launch, and if anything isn't right, we fix it.",
    contact:  "The easiest way to get started: drop your email here — someone from our team will reach out personally and quickly.",
    services_list: "Here's what we offer at Nova Dev:\n\n📱 **Mobile App Development** — from $200\n🌐 **Website / Web App** — from $150\n🛍️ **E-commerce Website** — from $200 (listing starts from 5 products)\n🎨 **UI/UX Design** — from $150\n🔄 **Website Redesign** — from $150\n⚡ **SEO & Performance** — from $150\n\nWhich one interests you most?",
  };

  /* ── UTILITIES ───────────────────────────────────────────── */
  function pickFresh(arr) {
    const available = arr.filter(r => !usedTexts.has(r));
    const pool = available.length > 0 ? available : arr;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    usedTexts.add(pick);
    return pick;
  }

  function personalize(text) {
    return lead.name
      ? text.replace(/\{name\}/g, lead.name)
      : text.replace(/,?\s*\{name\}/g, '');
  }

  /* ── RESPONSE POOLS ──────────────────────────────────────── */
  const POOLS = {
    greeting_new: [
      "Hey there! 👋 I'm the Nova Dev assistant. Tell me what you want to build — website, e-commerce, app — and I'll guide you precisely.",
      "Hi! 👋 What are you looking to create? Describe your project, even briefly, and I'll tailor my answer to you.",
      "Hello! 👋 Tell me about your project — industry, size, goal — and I'll suggest the most suitable solution.",
    ],
    greeting_known: [
      "Hey {name}! Good to hear from you. How can I help?",
      "Welcome back {name}! 😊 Picking up where we left off?",
      "Hi {name}! What can I do for you?",
    ],
    thanks_new: [
      "You're welcome! 😊 Anything else?",
      "Happy to help! More questions?",
      "Glad that's useful — what else?",
    ],
    thanks_known: [
      "You're welcome, {name}! Anything else?",
      "My pleasure, {name}! I'm listening.",
      "Anytime, {name}!",
    ],
    bye_new: [
      "Thanks for stopping by! When you're ready to move forward, we're here. 👋",
      "Take care! Come back anytime. 👋",
      "Good luck! We'll be here when you need us. 👋",
    ],
    bye_known: [
      "Talk soon {name}! 👋",
      "Bye {name} — we're here whenever you need us. 👋",
      "See you {name}! 👋",
    ],
    price_follow_up: [
      "Would you like a precise estimate for your project?",
      "I can help you scope the cost to your exact needs.",
      "Want a no-obligation quote?",
    ],
    unknown_short: [
      "Could you elaborate a little? I want to give you the most helpful answer. 😊",
      "Tell me a bit more — I'll tailor my response to your situation.",
    ],
    unknown_long: [
      "Interesting! To point you in the right direction — what kind of project is it and what are your main goals?",
      "Good question — give me a bit more context and I'll guide you precisely.",
    ],
  };

  /* ── NEGOTIATION ENGINE ───────────────────────────────────── */
  const NEG_ANGLES = [
    (ctx) => {
      if (ctx === 'ecom') return `To be clear — our e-commerce website starts at **$200**. The listing starts from **5 products**, delivered in **15–20 days** for that volume.\n\nNeed fewer products or a smaller scope? Tell me exactly what you need and I'll find the format that fits your budget.`;
      const p = PRICING[ctx] || PRICING.website;
      return `Our **${p.label}** projects start from just **$${p.from}** — one of the most competitive rates for genuine premium quality. Most agencies charge 5–20x more.\n\nWhat budget did you have in mind? I'll do my best to find a scope that works for you.`;
    },
    () => `Here's an approach many clients love: we start with a **focused version** — the core essentials to launch — then expand as your business grows. Less upfront investment, more flexibility.\n\nWhat's absolutely essential for you at launch?`,
    () => `A well-built website isn't a cost — it's a **business asset** working 24/7. If it brings you one new client a month, it pays for itself quickly and keeps paying.\n\nWhat kind of results are you hoping this project generates?`,
    () => `If you've had quotes from other agencies, you've probably seen $2,000–$10,000+ for similar projects. Our mission: **same premium quality at a fraction of the price** — thanks to efficient processes.\n\nWould a no-obligation custom quote help?`,
    () => `I genuinely want to make this work for you. 🤝\n\n✅ **Phased delivery** — start lean, scale later\n✅ **Focused scope** — impactful project at entry price\n✅ **Payment flexibility** — we can discuss it\n\nShare your email and the team will put together a custom plan within your budget.`,
    (ctx) => {
      if (ctx === 'ecom') return `An e-commerce site open 24/7, converting visitors into buyers and building trust automatically — at **from $200**, it pays for itself with a single sale.\n\nWould it help to see exactly what's included?`;
      return `The cost of a poorly built website is often higher than doing it right: lost visitors, damaged credibility, expensive fixes later. We deliver quality that holds up — starting at $150.\n\nWant to see what's included at that price?`;
    },
    (ctx) => {
      if (ctx === 'ecom') return `Our e-commerce clients typically see more completed purchases, a stronger brand image and better customer trust — because a professionally built store makes buying feel easy and safe.\n\nI'd love to show you what we could build. Your email?`;
      return `Our clients typically see a clear return within weeks of launch: better quality enquiries, stronger brand perception, more time saved thanks to a site that actually answers questions.\n\nWant to share your budget and we'll see exactly what we can do?`;
    },
    (ctx) => {
      if (ctx === 'ecom') return `**From $200** — genuinely the most competitive rate for a professionally built e-commerce website. No shortcuts, no hidden costs.\n\nOur team can put together a no-obligation proposal. Share your email and you'll have it within 24 hours. 🙌`;
      return `At **$150 to start**, we're already priced to be accessible for growing businesses. What I *can* do is have the team put together a proposal tailored exactly to your goals and budget — share your email and you'll have it within 24 hours. 🙌`;
    },
  ];

  function getNegotiationResponse() {
    let idx = memory.negotiationStage;
    while (usedNegAngles.has(idx) && idx < NEG_ANGLES.length - 1) idx++;
    usedNegAngles.add(idx);
    memory.negotiationStage = idx + 1;
    return NEG_ANGLES[idx](memory.topicContext);
  }

  /* ════════════════════════════════════════════════════════════
     DEEP DATA EXTRACTION
     Detects: quantities, budgets, deadlines, sector, features
  ════════════════════════════════════════════════════════════ */
  function extractDeepContext(text) {
    const t     = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const tOrig = text.toLowerCase();

    /* ── Contact ── */
    const emailM = text.match(/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/);
    if (emailM && !lead.email) lead.email = emailM[0];
    const phoneM = text.match(/(\+?\d[\d\s\-().]{6,}\d)/);
    if (phoneM && !lead.phone) lead.phone = phoneM[0].trim();
    const nameM = text.match(/(?:i(?:'|')?m|my name is|i am|call me|this is)\s+([A-Z][a-z]{1,20})/i);
    if (nameM && !lead.name) lead.name = nameM[1];
    if (!lead.name && memory.askedName) {
      const words = text.trim().split(/\s+/);
      if (words.length <= 2 && /^[A-Z][a-z]+$/.test(words[0])) lead.name = words[0];
    }

    /* ── Product count ── */
    if (memory.productCount === null) {
      if (/\b(?:just one|only one|a single|one|1)\s+product\b/.test(t)) memory.productCount = 1;
      else if (/\b(?:two|2)\s+products?\b/.test(t))  memory.productCount = 2;
      else if (/\b(?:three|3)\s+products?\b/.test(t)) memory.productCount = 3;
      else if (/\b(?:five|5)\s+products?\b/.test(t))  memory.productCount = 5;
      else if (/\b(\d+)\s+products?\b/.test(t)) {
        const m = t.match(/\b(\d+)\s+products?\b/);
        memory.productCount = parseInt(m[1]);
      }
      else if (/few products|small catalogue|just a few/.test(t)) memory.productCount = 'few';
      else if (/many products|large catalogue|lots of products|big catalogue/.test(t)) memory.productCount = 'many';
    }

    /* ── Page count ── */
    if (memory.pageCount === null) {
      if (/\b(?:just one|only one|a single|one|1)\s+page\b/.test(t)) memory.pageCount = 1;
      else if (/\b(?:two|2)\s+pages?\b/.test(t))   memory.pageCount = 2;
      else if (/\b(?:three|3)\s+pages?\b/.test(t)) memory.pageCount = 3;
      else if (/\b(\d+)\s+pages?\b/.test(t)) {
        const m = t.match(/\b(\d+)\s+pages?\b/);
        memory.pageCount = parseInt(m[1]);
      }
      else if (/one.page site|single.page|one pager/.test(t)) memory.pageCount = 1;
    }

    /* ── Budget ── */
    if (memory.budget === null) {
      const budgetM = tOrig.match(/\$\s*(\d+)|(\d+)\s*(?:dollars?|usd)/i);
      if (budgetM) memory.budget = parseInt(budgetM[1] || budgetM[2]);
      else if (/tight budget|small budget|limited budget|not much budget|low budget/.test(t)) memory.budget = 'small';
      else if (/large budget|big budget|comfortable budget|no budget issue/.test(t)) memory.budget = 'large';
    }

    /* ── Deadline ── */
    if (memory.deadline === null) {
      if (/urgent|asap|right away|immediately|as soon as possible/.test(t)) memory.deadline = 'urgent';
      else if (/this week|within a week|one week/.test(t)) memory.deadline = '1 week';
      else if (/this month|within a month|one month/.test(t)) memory.deadline = '1 month';
      else if (/two months|2 months/.test(t)) memory.deadline = '2 months';
    }

    /* ── Sector ── */
    if (!memory.sector) {
      if (/restaurant|cafe|diner|food|catering/.test(t))              memory.sector = 'restaurant';
      else if (/plumber|electrician|builder|contractor|tradesman/.test(t)) memory.sector = 'trades';
      else if (/coach|coaching|consultant|trainer|training/.test(t))  memory.sector = 'consulting';
      else if (/fashion|clothing|apparel|boutique|jewelry/.test(t))   memory.sector = 'fashion';
      else if (/real estate|property|realty|estate agent/.test(t))    memory.sector = 'real estate';
      else if (/doctor|dentist|physio|health|therapist|clinic/.test(t)) memory.sector = 'health';
      else if (/photographer|videographer|designer|creative|artist/.test(t)) memory.sector = 'creative';
      else if (/startup|saas|software|tech|app/.test(t))              memory.sector = 'tech';
      else if (/gym|fitness|yoga|sport|pilates|personal trainer/.test(t)) memory.sector = 'fitness';
      else if (/lawyer|attorney|law firm|legal/.test(t))              memory.sector = 'legal';
    }

    /* ── Features ── */
    const featureMap = {
      'payment|checkout|stripe|paypal|buy online|online payment': 'online payment',
      'blog|articles?|news|posts?':                               'blog',
      'gallery|photos?|portfolio|images?':                        'photo gallery',
      'contact form|enquiry form|quote form':                     'contact form',
      'booking|appointment|reservation|calendar|schedule':        'booking system',
      'reviews?|testimonials?|ratings?':                          'customer reviews',
      'delivery|shipping|logistics':                              'delivery management',
      'inventory|stock|product management':                       'stock management',
      'multilingual|multiple languages|french|spanish':           'multilingual',
      'map|google maps|location|address|directions':              'integrated map',
      'newsletter|mailing list|subscribe|subscribers?':           'newsletter',
      'chat|whatsapp|messenger|live chat':                        'live chat',
    };
    for (const [pattern, feature] of Object.entries(featureMap)) {
      if (new RegExp(pattern).test(t) && !memory.features.includes(feature)) {
        memory.features.push(feature);
      }
    }

    /* ── Pain points ── */
    if (/no website|don.t have a site|no online presence/.test(t) && !memory.painPoints.includes('no website'))
      memory.painPoints.push('no website');
    if (/old site|outdated|looks old|dated website/.test(t) && !memory.painPoints.includes('outdated site'))
      memory.painPoints.push('outdated site');
    if (/no sales|not selling|poor conversion/.test(t) && !memory.painPoints.includes('no sales'))
      memory.painPoints.push('no sales');
    if (/not ranking|invisible on google|no traffic/.test(t) && !memory.painPoints.includes('not visible'))
      memory.painPoints.push('not visible');

    /* ── Project type ── */
    if (!memory.topicContext) {
      if (/mobile app|android|ios|flutter|react native/.test(t)) memory.topicContext = 'mobile';
      else if (/e.commerce|online shop|shopify|woocommerce|sell online|products?|cart|checkout/.test(t)) memory.topicContext = 'ecom';
      else if (/landing page|sales page|single page site/.test(t)) memory.topicContext = 'landing';
      else if (/redesign|revamp|refactor|update.*site|existing site/.test(t)) memory.topicContext = 'redesign';
      else if (/website|web app|web site/.test(t)) memory.topicContext = 'website';
    }

    if (!lead.service && memory.topicContext) {
      const labels = {
        mobile:'Mobile App', ecom:'E-commerce Website', landing:'Landing Page',
        redesign:'Website Redesign', design:'UI/UX Design', website:'Website Development', seo:'SEO'
      };
      lead.service = labels[memory.topicContext] || '';
    }
  }

  /* ════════════════════════════════════════════════════════════
     SMART CONTEXTUAL REPLY GENERATORS
  ════════════════════════════════════════════════════════════ */
  function buildSmartEcomReply(userText) {
    const qty    = memory.productCount;
    const pages  = memory.pageCount;
    const feats  = memory.features;
    const sector = memory.sector;
    const budget = memory.budget;

    // 1 page + 1 product (exact case from screenshot)
    if ((qty === 1 || qty === 'few') && pages === 1) {
      return `Perfect — **1 page, 1 product** is actually our simplest and fastest format! 🎯\n\nHere's what we build:\n✅ **1 product page** (photo, description, price, buy button)\n✅ Secure online payment (card / PayPal)\n✅ Professional design matching your brand\n✅ Mobile-first and Google-optimised\n\n💰 **From $200** — deliverable in **10 to 15 days**\n\nWhat type of product are you selling?`;
    }

    // 1 product, no page count
    if (qty === 1) {
      return `Great — **just one product** keeps things simple and focused!\n\nHere are your options:\n🔹 **Mini option** — 1 product page + payment → from **$200**, ready in **2 weeks**\n🔹 **Full option** — product page + home + contact → from **$250**, ready in **3 weeks**\n\nWould you prefer the minimal version or something a bit more complete?`;
    }

    // 1 page, not ecom
    if (pages === 1 && memory.topicContext !== 'ecom') {
      return `A **single page** — great choice for speed and clarity! 🎯\n\nA well-built single page can:\n✅ Present your offer clearly\n✅ Capture contacts / bookings\n✅ Convert visitors into customers\n\n💰 **From $150** — deliverable in **1 to 2 weeks**\n\nWhat kind of business is it for?`;
    }

    // Small explicit budget
    if (budget === 'small' || (typeof budget === 'number' && budget < 200)) {
      const budgetStr = typeof budget === 'number' ? `$${budget}` : 'a tight budget';
      return `I understand — ${budgetStr} is workable. Here's what's possible:\n✅ **1-page landing page** — from **$150** (our entry tier)\n✅ **3-page website** — from **$150**\n\nFor e-commerce we start at **$200** with a focused scope. How many products are you looking to list?`;
    }

    // Few products (2–3)
    if (qty !== null && typeof qty === 'number' && qty <= 3) {
      return `**${qty} product${qty > 1 ? 's' : ''}** — totally manageable and within our base package!\n\n✅ Individual product pages with photos and descriptions\n✅ Cart + secure online checkout\n✅ Home page + contact\n💰 **From $200** — deliverable in **15 to 20 days**\n\nDo you already have product photos ready?`;
    }

    // Large catalogue
    if (qty === 'many' || (typeof qty === 'number' && qty > 20)) {
      return `A **large catalogue** — perfect for Shopify or WooCommerce!\n\nWith ${typeof qty === 'number' ? qty + ' products' : 'a large catalogue'}, we recommend:\n✅ Shopify or WooCommerce (easy self-management)\n✅ Filters, search, categories\n✅ CSV import to load products quickly\n💰 **From $350** depending on complexity\n\nDo you already have a product list ready?`;
    }

    // Features mentioned
    if (feats.length > 0) {
      const featList = feats.map(f => `✅ ${f}`).join('\n');
      return `Here's what you're after:\n${featList}\n\nAll doable! To refine the budget — how many products do you have, and do you have a timeline in mind?`;
    }

    // Sector-specific
    if (sector) {
      const sectorMsg = {
        restaurant: `For a restaurant, the essentials are: online menu, photo gallery, table booking and Google Maps integration. We can also add online ordering if needed.`,
        trades: `For a tradesperson, a clean portfolio site works great — showcase your work, online quote request, and a visible phone number. Simple and effective.`,
        consulting: `For a coach or consultant, a well-built landing page with your offer, testimonials and a booking button is often all you need to start.`,
        fashion: `For fashion, photography is everything — we'll build a visually striking e-commerce site with filtering by category, size and colour.`,
        'real estate': `For real estate, we can build a site with property listings, photos, contact forms and an online valuation tool.`,
        health: `For healthcare professionals, online booking and a clear presentation of your services are the priorities.`,
        creative: `For creatives, your portfolio is your best sales tool — we create a visual experience that truly showcases your work.`,
        tech: `For a tech startup, a punchy landing page with your value proposition, a demo or email capture, and a modern design is the playbook.`,
        fitness: `For a fitness professional or gym, the essentials are: class schedule, online booking and client testimonials.`,
        legal: `For a law firm, trust and clarity are everything — a clean, professional site with your practice areas, team bios and a contact form.`,
      };
      return `${sectorMsg[sector]}\n\n💰 **From $150** depending on scope.\n\nHow many pages do you need, and what's your rough budget?`;
    }

    // Generic enriched ecom (fallback)
    return `We build **custom e-commerce websites** — designed around your products and your customers.\n\n💰 **From $200**\n📦 **Listing starts from 5 products**\n⏱️ **Delivery: 15 to 60 days** depending on complexity\n\nTo give you something precise: how many products are you looking to list?`;
  }

  function buildSmartWebReply() {
    const pages  = memory.pageCount;
    const sector = memory.sector;
    const budget = memory.budget;

    if (pages === 1) {
      return `A **single page** — fast, punchy and cost-effective.\n\n💰 **From $150** — deliverable in **1 to 2 weeks**\n\nWhat's it for: your business, a specific offer, an event?`;
    }
    if (pages !== null && typeof pages === 'number' && pages <= 3) {
      return `A **${pages}-page site** — the ideal format for a professional presence without over-investing.\n\n✅ Home + about + contact\n💰 **From $150** — deliverable in **2 to 3 weeks**\n\nWhat's your business?`;
    }
    if (budget !== null && typeof budget === 'number') {
      return `With a **$${budget}** budget, here's what I can suggest:\n${budget >= 150 ? '✅ Professional website (3–5 pages)\n' : ''}${budget >= 200 ? '✅ Landing page + blog\n' : ''}${budget >= 350 ? '✅ E-commerce small catalogue\n' : ''}\nWhich one fits your needs best?`;
    }
    return `We design and build **premium websites** tailored to your business goals.\n\n💰 **From $150** — professional design, mobile-first, SEO included.\n\nWhat type of site are you after? (portfolio, service site, e-commerce, landing page?)`;
  }

  /* ── INTENT DETECTION ────────────────────────────────────── */
  function detectIntent(text) {
    const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const is = (...kw) => kw.some(k => t.includes(k));

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

    if (is('how long','timeline','deadline','deliver','time','week','month','turnaround',
            'when','duration','fast','quick','rush','urgent'))
      return 'timeline';

    if (is('mobile app','android','ios','iphone','flutter','react native','app develop',
            'application','smartphone'))
      return 'mobile';

    if (is('e-commerce','ecommerce','online shop','shopify','woocommerce','store','sell online',
            'product','cart','checkout','online store'))
      return 'ecom';

    if (is('seo','search engine','google rank','rank','visibility','organic','keyword'))
      return 'seo';

    if (is('redesign','refactor','revamp','refresh','improve existing','update existing',
            'rebrand','current site','existing website'))
      return 'redesign';

    if (is('design','ui ','ux ','interface','mockup','figma','prototype','wireframe','branding'))
      return 'design';

    if (is('landing page','single page','one page','lead page','sales page','campaign page',
            'one-page','onepager'))
      return 'landing';

    if (is('performance','speed','fast loading','core web vitals','pagespeed','lighthouse'))
      return 'performance';

    if (is('process','how do you work','approach','method','step','workflow'))
      return 'process';

    if (is('technology','tech stack','framework','react','next.js','wordpress','webflow'))
      return 'tech';

    if (is('hosting','domain','server','deploy','cloud','cdn'))
      return 'hosting';

    if (is('maintenance','support','after launch','update','ongoing','retainer'))
      return 'maintenance';

    if (is('cms','content management','edit content','update page','backend'))
      return 'cms';

    if (is('revision','change','feedback','iteration','round','modify','adjust'))
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
            'need a site','build website','web development'))
      return 'web';

    if (is('contact','email','reach','call','speak','talk','consult','get in touch','proposal'))
      return 'contact';

    if (is('service','offer','provide','capability','what can you','what do you offer'))
      return 'services_list';

    if (is('hello','hi ','hey ','greet','good morning','good afternoon','good evening'))
      return 'greeting';

    if (is('thank','thanks','great','perfect','awesome','excellent','brilliant','helpful',
            'appreciate','cheers','amazing'))
      return 'thanks';

    if (is('bye','goodbye','see you','talk later','that\'s all','done for now','take care'))
      return 'bye';

    return 'unknown';
  }

  /* ── CONTEXT-AWARE PRICE REPLY ───────────────────────────── */
  function getPriceReply() {
    const p = PRICING[memory.topicContext] || PRICING.website;
    if (memory.productCount !== null && memory.topicContext === 'ecom') {
      const qty = memory.productCount;
      if (qty === 1) return `For **just 1 product**, our e-commerce starts at **$200** — our simplest, fastest format (deliverable in 10–15 days).`;
      if (typeof qty === 'number' && qty <= 5) return `For **${qty} product${qty>1?'s':''}**, count from **$200** — deliverable in 15–20 days.`;
      if (typeof qty === 'number' && qty > 5) return `For **${qty} products**, budget depends on customisation level. We start at **$200** for the base. Share your email for a precise quote.`;
    }
    if (memory.pageCount === 1) return `For **just 1 page**, we start at **$150** — deliverable in 1–2 weeks.`;
    return `Our **${p.label}** projects start from **$${p.from}** — transparent and competitive.\n\nFinal cost depends on scope and features. Would you like a precise estimate?`;
  }

  /* ── LEAD NUDGE ──────────────────────────────────────────── */
  function leadNudge() {
    if (!lead.name && !memory.askedName && memory.turnCount >= 2) {
      memory.askedName = true;
      return pickFresh([
        "\n\nBy the way — who am I speaking with? 😊",
        "\n\nQuick one — what's your name?",
        "\n\nI'd love to personalise this — what's your name?",
      ]);
    }
    if (lead.name && !lead.email && !memory.askedEmail && memory.turnCount >= 3) {
      memory.askedEmail = true;
      return pickFresh([
        `\n\nThanks ${lead.name}! What's the best email to reach you? Our team will follow up personally.`,
        `\n\n${lead.name}, want us to send you a quote? Just share your email.`,
        `\n\nYour email, ${lead.name}? The team replies within 24 hours.`,
      ]);
    }
    return '';
  }

  /* ── MAIN REPLY GENERATOR ────────────────────────────────── */
  function generateReply(userText) {
    extractDeepContext(userText);
    memory.turnCount++;

    // If we were waiting for clarification, handle the response in context
    if (memory.clarifyPending) {
      memory.clarifyPending = false;
      const clarifyIntent = detectIntent(userText);
      if (clarifyIntent === 'unknown' || memory.turnCount <= 3) {
        if (memory.topicContext === 'ecom' || memory.productCount !== null) {
          return buildSmartEcomReply(userText) + leadNudge();
        }
        if (memory.topicContext === 'website' || memory.pageCount !== null) {
          return buildSmartWebReply() + leadNudge();
        }
      }
    }

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
        memory.askedEmail = true;
        reply = KB.contact;
        break;

      case 'services_list':
        reply = KB.services_list;
        break;

      case 'web':
        memory.topicContext = memory.topicContext || 'website';
        if (!lead.service) lead.service = 'Website Development';
        reply = buildSmartWebReply();
        break;

      case 'mobile':
        memory.topicContext = 'mobile';
        if (!lead.service) lead.service = 'Mobile App';
        reply = `We build high-performance **iOS and Android apps**.\n\n💰 **From $200** — one of the most competitive rates for quality mobile development.\n\nWhat kind of app do you have in mind? (customer app, internal tool, mobile commerce?)`;
        break;

      case 'ecom':
        memory.topicContext = 'ecom';
        if (!lead.service) lead.service = 'E-commerce Website';
        reply = buildSmartEcomReply(userText);
        break;

      case 'landing':
        memory.topicContext = 'landing';
        if (!lead.service) lead.service = 'Landing Page';
        reply = `A **landing page** is the fastest investment to start capturing customers.\n\n💰 **From $150** — deliverable in **1 to 2 weeks**.\n\nWhat's it promoting: a service, a product, an event?`;
        break;

      case 'redesign':
        memory.topicContext = 'redesign';
        if (!lead.service) lead.service = 'Website Redesign';
        reply = `We can elevate your existing site — stronger visual direction, clearer structure, better credibility.\n\n💰 **From $150**, most redesigns take **3–5 weeks**.\n\nWhat's not working about your current site?`;
        break;

      case 'design':
        memory.topicContext = memory.topicContext || 'design';
        reply = `Our design work focuses on **clarity, credibility and conversion**.\n\n💰 **From $150**.\n\nDesign only, or design + development?`;
        break;

      case 'seo':
      case 'performance':
        reply = `SEO and performance are built into everything we build — fast loading, clean code, mobile-first.\n\nNeed targeted SEO work on an existing site? **From $150**.`;
        break;

      case 'timeline': {
        let tl = '';
        if (memory.topicContext === 'mobile') tl = "**8 to 16 weeks** from brief to launch for a mobile app.";
        else if (memory.topicContext === 'landing') tl = "**1 to 2 weeks** for a landing page.";
        else if (memory.topicContext === 'ecom') {
          if (memory.productCount === 1) tl = "For **1 product**: deliverable in **10 to 15 days**.";
          else if (typeof memory.productCount === 'number' && memory.productCount <= 5)
            tl = `For **${memory.productCount} products**: deliverable in **15 to 20 days**.`;
          else tl = "**15 to 60 days** depending on volume and complexity.";
        }
        else if (memory.pageCount === 1) tl = "For **1 page**: deliverable in **1 to 2 weeks**.";
        else if (typeof memory.pageCount === 'number' && memory.pageCount <= 3)
          tl = `For **${memory.pageCount} pages**: deliverable in **2 to 3 weeks**.`;
        else tl = "Landing page: 1–2 weeks | Full website: 3–6 weeks | E-commerce: 15–60 days | Mobile app: 8–16 weeks.";
        reply = tl + "\n\nDo you have a specific deadline in mind?";
        break;
      }

      case 'price':
        reply = getPriceReply() + '\n\n' + pickFresh(POOLS.price_follow_up);
        break;

      case 'negotiate':
        reply = getNegotiationResponse();
        break;

      case 'discount':
        reply = pickFresh([
          "We occasionally offer package deals when clients combine services. Tell me the full scope of your needs and I'll see what we can optimise.",
          "For clients ready to start quickly, we can sometimes adjust. Share your project details.",
          "We have flexible packages. Tell me everything you need and I'll see how to maximise value within your budget.",
        ]);
        break;

      case 'value':
        if (memory.topicContext === 'ecom') {
          reply = pickFresh([
            "At **from $200**, your e-commerce site works 24/7 — open permanently, taking orders even while you sleep. One sale pays for the whole investment.",
            "A professional e-commerce site builds credibility, increases conversions and gives buyers confidence. **From $200, listing starts from 5 products** — one of the smartest investments for any seller.",
            "Think about it: one sale through your site pays for the whole project. At **from $200**, the ROI comes fast.",
          ]);
        } else {
          reply = pickFresh([
            "At **$150**, you're getting a digital asset working 24/7, building credibility and converting visitors into clients — more than a day of ads.",
            "A well-built site pays for itself quickly. At **$150**, you invest less than many businesses spend in a day — for a tool that lasts years.",
            "One new client from your site pays for the whole project — and it keeps working. At **$150 to start**, the ROI is obvious.",
          ]);
        }
        break;

      case 'comparison':
        reply = pickFresh([
          "Compared to agencies charging $2,000–$10,000+, our prices are a fraction — without sacrificing quality. Our efficient processes pass savings to you.",
          "Most agencies charge $3,000–$8,000 for a basic business website. We start at **$150** — because we've built smarter processes, not because we cut corners.",
        ]);
        break;

      default:
        if (memory.clarifyTopic === 'productCount' && /\d+/.test(userText)) {
          memory.topicContext = memory.topicContext || 'ecom';
          reply = buildSmartEcomReply(userText);
          memory.clarifyTopic = '';
        }
        else if (memory.lastIntent === 'negotiate' || memory.lastIntent === 'price') {
          reply = getNegotiationResponse();
        }
        else if (memory.topicContext === 'ecom' || memory.productCount !== null) {
          reply = buildSmartEcomReply(userText);
        }
        else if (memory.topicContext === 'website' || memory.pageCount !== null) {
          reply = buildSmartWebReply();
        }
        else if (userText.trim().length < 12) {
          reply = pickFresh(POOLS.unknown_short);
        }
        else {
          reply = pickFresh([
            "Interesting! To give you something truly tailored — is it a website, an e-commerce store, a mobile app or something else?",
            "I want to give you a precise answer. Tell me about your project in a few words: what do you want to sell or showcase, and to whom?",
            "Tell me more about your project — your industry, what you want online, and a rough budget idea?",
          ]);
          memory.clarifyPending = true;
        }
    }

    // Anti-repeat guard
    if (reply === memory.lastBotReply) {
      if (['price','negotiate','discount','value','comparison'].includes(intent)) {
        reply = getNegotiationResponse();
      } else {
        reply = pickFresh(POOLS.unknown_long);
      }
    }

    reply += leadNudge();
    memory.lastIntent   = intent;
    memory.lastBotReply = reply;
    return reply;
  }

  /* ── LEAD SUBMISSION ─────────────────────────────────────── */
  function maybeSendLead() {
    if (lead.email && lead.name && !leadSent) {
      leadSent = true;
      const fd = new FormData();
      const context = [
        memory.productCount !== null ? `Products: ${memory.productCount}` : '',
        memory.pageCount !== null    ? `Pages: ${memory.pageCount}` : '',
        memory.budget !== null       ? `Budget: $${memory.budget}` : '',
        memory.sector               ? `Sector: ${memory.sector}` : '',
        memory.features.length      ? `Features: ${memory.features.join(', ')}` : '',
        memory.deadline             ? `Deadline: ${memory.deadline}` : '',
      ].filter(Boolean).join(' | ');
      fd.append('_subject',         `Nova Dev Chat Lead (EN) — ${lead.name}`);
      fd.append('_captcha',         'false');
      fd.append('_template',        'table');
      fd.append('Name',             lead.name);
      fd.append('Email',            lead.email);
      fd.append('Company',          lead.company  || 'Not provided');
      fd.append('Phone',            lead.phone    || 'Not provided');
      fd.append('Service Interest', lead.service  || 'Not specified');
      fd.append('Project Context',  context       || 'Not specified');
      fd.append('Source',           'AI Chat v3 — Nova Dev EN');
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
    const delay = 400 + Math.random() * 600;
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
        appendMsg("Hi there! 👋 I'm the Nova Dev assistant.\n\nTell me what you want to build — **website, e-commerce, mobile app, landing page** — and I'll suggest exactly what you need, with a precise price and timeline.\n\nWhat's your project?", 'bot');
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
