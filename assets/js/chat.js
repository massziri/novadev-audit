(() => {
  'use strict';

  /* ============================================================
     NOVA DEV — Smart AI Chat with Negotiation Intelligence
     Handles questions, negotiates pricing, captures leads
     Never repeats the same response twice
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

  /* ── Conversation Memory (anti-repetition) ───────────────── */
  const usedResponses = new Set();
  const conversationHistory = [];  // track intents sequence
  let negotiationStage = 0;        // 0=none, 1=first objection, 2=second, 3=final offer
  let lastIntent = '';
  let lastBotReply = '';
  let priceDiscussedFor = '';      // which service price was discussed

  function pickFresh(arr) {
    // Pick a response not used before; if all used, clear and start over
    const available = arr.filter(r => !usedResponses.has(r));
    if (available.length === 0) {
      arr.forEach(r => usedResponses.delete(r));
      return arr[Math.floor(Math.random() * arr.length)];
    }
    const pick = available[Math.floor(Math.random() * available.length)];
    usedResponses.add(pick);
    return pick;
  }

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
      general: "Our pricing is designed to be accessible for businesses of all sizes. A professional website starts from just $150, with options to scale based on your specific needs. Mobile apps start from $200. We always provide a detailed, transparent quote after understanding your project — no surprises.",
      landing: "A landing page starts from $150, depending on design complexity and integrations needed. It's a smart, affordable way to start generating leads.",
      website: "A full business website starts from $150 and scales based on the number of pages, features and custom functionality you need. We work with every budget to deliver the best possible result.",
      mobile:  "Mobile app development starts from $200 depending on platform (iOS, Android or both), features and back-end requirements. We'll scope it precisely during your free consultation.",
      ecom:    "E-commerce projects start from $300 depending on the platform, product volume and custom integrations. We'll find the best solution within your budget.",
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

  /* ── NEGOTIATION RESPONSES (multi-stage, never repeats) ──── */
  const NEGOTIATION = {
    // Stage 1: First time client says expensive/too much
    firstObjection: {
      general: [
        "I completely understand — budget is important. The good news is we're actually one of the most affordable premium agencies out there. Our websites start from just $150, which is significantly lower than industry average. What kind of project do you have in mind? I can give you a more specific idea.",
        "That's a fair concern! Many clients are surprised by how affordable we are. We start at $150 for websites and $200 for mobile apps — much less than most agencies. What's your budget range? I'd love to find a solution that works for you.",
        "I appreciate the honesty! Let me clarify — our pricing is actually very competitive. Professional websites start from $150 and mobile apps from $200. Most of our clients are pleasantly surprised. Tell me about your project and I'll give you a tailored estimate.",
      ],
      web: [
        "I hear you! But here's the thing — our websites actually start from just $150. That's far more affordable than most agencies charging $2,000+. We keep costs low without cutting corners on quality. What features are most important for your project?",
        "Budget matters, absolutely. Our website development starts at $150 — that includes professional design, responsive development and testing. We can work within your budget. What are you looking to build?",
        "I understand the concern! But at $150 starting price for a full website, we're actually very budget-friendly. Many agencies charge 10x that. What's your ideal budget? Let's see what we can create for you.",
      ],
      mobile: [
        "I get it — apps can sound pricey. But our mobile app development starts from just $200, which is incredibly competitive. Most agencies charge $5,000+. What kind of app are you thinking about?",
        "Totally fair concern! Our mobile apps start at $200 — that's a fraction of what most studios charge. We believe quality shouldn't be expensive. Tell me about your app idea and I'll scope it out for you.",
        "I understand! But our app development actually starts from $200 — way below industry rates. We've made premium development accessible. What features does your app need?",
      ],
    },

    // Stage 2: Client pushes back again
    secondObjection: [
      "I really want to make this work for you. How about this — tell me exactly what you need, and I'll put together a custom quote that fits your budget. We're flexible and we genuinely want to help your business grow. What's a comfortable budget range for you?",
      "Let's find a middle ground. We can always start with an MVP — a lean version with the core features — and expand from there. This way you get online faster, spend less upfront, and grow the project over time. What are the must-have features for you?",
      "I want to be transparent — we're already among the most affordable agencies with premium quality. But I understand every dollar counts. If you share your budget, I can design a package that maximizes value within it. We've done this many times for our clients.",
      "Here's what many smart clients do: start with a focused first phase — the essentials — then add features as the business generates revenue. This way the project pays for itself. Would that approach work for you?",
    ],

    // Stage 3: Final offer / closing
    finalOffer: [
      "Alright, let me do something special. If you're ready to get started, I can connect you directly with our project lead for a free consultation. We'll find the absolute best solution for your budget — we've never turned away a serious client. Share your email and we'll set it up today.",
      "Here's what I'll do — I'll have our team prepare a no-obligation custom proposal specifically for your budget and needs. We always find a way to make it work. Just share your email and we'll send it within 24 hours.",
      "I respect that you know your budget. Let me connect you with our team directly — they can offer flexible payment plans and phased delivery options that make it very manageable. What's the best email to reach you?",
    ],

    // Specific price comparison responses
    comparison: [
      "Compared to other agencies, we're genuinely one of the most affordable. Most charge $2,000–$10,000+ for what we deliver starting at $150. We've optimized our process to pass savings to our clients without sacrificing quality.",
      "If you've been quoted by other agencies, you'll see we're a fraction of the cost. Our $150 starting price for websites is possible because we've streamlined our workflow — not because we cut corners. Same premium quality, much lower price.",
      "Let me put it in perspective: a freelancer might charge similar, but without the strategic thinking, testing and support we include. And other agencies charge 5-20x more. We're the sweet spot of quality and affordability.",
    ],

    // Value justification
    value: [
      "What you're getting at $150 isn't just a website — it's a strategic digital asset designed to attract customers and grow your business. That's an investment that can generate thousands in return.",
      "Think of it this way: a well-built website pays for itself many times over. At $150, you're investing less than a single day's revenue for most businesses, but getting a tool that works 24/7 for months and years.",
      "For context, a single Google ad click can cost $5–50. Your website at $150 is a permanent asset that keeps bringing in customers without ongoing ad spend. It's one of the smartest investments you can make.",
    ],

    // Discount hints
    discount: [
      "We sometimes offer package deals when clients bundle multiple services. For example, a website + landing page combo could come with a discount. Want me to explore that?",
      "For clients who are ready to start quickly, we occasionally offer early-commitment pricing. Share your project details and I'll see what we can do.",
      "We do offer flexible packages. If we know your full project scope, we can often find ways to deliver more value within your budget. What exactly do you need?",
    ],
  };

  /* ── INTENT DETECTION (enhanced with negotiation) ────────── */
  function detectIntent(text) {
    const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const is = (...kw) => kw.some(k => t.includes(k));

    // Negotiation & price objections (check FIRST, before general price)
    if (is('expensive','too much','too high','overpriced','can\'t afford','cannot afford',
           'out of budget','over budget','lower price','reduce','discount','cheaper',
           'less','too costly','pricey','not worth','rip off','ripoff','way too',
           'that\'s a lot','thats a lot','are you kidding','seriously?','no way',
           'i can get','someone else','other agency','competitor','freelancer',
           'fiverr','upwork','lower','negotiate','deal','offer','bargain',
           'money','tight budget','limited budget','small budget','not in budget',
           'budget is','my budget','only have','can only','afford')) return 'negotiate';

    // Asking for discount specifically
    if (is('discount','coupon','promo','promotion','special offer','special price','deal')) return 'discount';

    // Value question
    if (is('worth it','why pay','what do i get','what\'s included','included','justify','value for money','roi','return on investment')) return 'value';

    // Price comparison
    if (is('compared to','other agencies','competitors','average price','market rate','industry','benchmark','how do you compare')) return 'comparison';

    if (is('price','cost','how much','budget','charge','fee','rate','invest','quote','pricing')) return 'price';
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

  /* ── RESPONSE GENERATION (with variety & negotiation) ────── */
  let askedName = false, askedEmail = false, turnCount = 0;

  // Multi-response pools for common intents (anti-repetition)
  const RESPONSE_POOLS = {
    greeting_new: [
      "Hey there! 👋 Great to chat — what can I help you with today? Feel free to ask anything about our services, pricing, timelines or how we work.",
      "Hi! 👋 Welcome to Nova Dev. I'm here to help with anything — web design, app development, pricing, timelines... What's on your mind?",
      "Hello! 👋 Nice to have you here. Whether you're exploring options or ready to start a project, I'm here to help. What would you like to know?",
    ],
    greeting_known: [
      "Hey {name}! Great to hear from you again. What can I help you with?",
      "Welcome back, {name}! 😊 How can I assist you today?",
      "Hi {name}! Good to see you. What's on your mind?",
    ],
    thanks_new: [
      "You're welcome! 😊 Is there anything else you'd like to know?",
      "Happy to help! 😊 Let me know if you have more questions.",
      "Glad I could help! Anything else on your mind?",
    ],
    thanks_known: [
      "You're very welcome, {name}! 😊 Anything else I can help you with?",
      "My pleasure, {name}! 😊 Feel free to ask anything else.",
      "Anytime, {name}! What else can I do for you?",
    ],
    bye_new: [
      "Thanks for stopping by! When you're ready to discuss your project, we'd love to hear from you. 👋",
      "It was great chatting! Come back anytime you're ready to move forward. 👋",
      "Take care! We're always here when you need us. 👋",
    ],
    bye_known: [
      "Talk soon, {name}! If you ever want to kick off a project, we're just a message away. 👋",
      "See you soon, {name}! Don't hesitate to reach out when you're ready. 👋",
      "Bye {name}! Wishing you the best — we'd love to work with you soon. 👋",
    ],
    unknown_short: [
      "Could you tell me a bit more? I want to make sure I give you the most helpful answer. 😊",
      "I'd love to help — can you give me a little more detail on what you're looking for?",
      "Can you elaborate a bit? I want to give you the best possible answer.",
    ],
    unknown_long: [
      "That's a great question! To give you the most accurate answer, could you share a bit more context about your project? I'm here to help with anything — services, pricing, timelines, technology or how we work.",
      "Interesting! I want to make sure I point you in the right direction. Could you share more about what you're looking for? I can help with services, pricing, project planning and more.",
      "I'd love to help you with that. For the best answer, could you tell me a bit more about your project needs? I cover everything from web development to mobile apps.",
    ],
    price_follow_up: [
      "Would you like a specific quote for your project?",
      "Want me to help you estimate the cost for your specific needs?",
      "I can help you get a precise quote — just tell me more about what you need.",
      "Shall I connect you with our team for a detailed, no-obligation quote?",
    ],
  };

  function personalize(text) {
    return lead.name ? text.replace(/\{name\}/g, lead.name) : text;
  }

  function pickFromPool(poolKey) {
    return personalize(pickFresh(RESPONSE_POOLS[poolKey]));
  }

  function extractData(text) {
    const emailMatch = text.match(/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/);
    if (emailMatch && !lead.email) lead.email = emailMatch[0];

    const phoneMatch = text.match(/(\+?\d[\d\s\-().]{7,}\d)/);
    if (phoneMatch && !lead.phone) lead.phone = phoneMatch[0].trim();

    const nameMatch = text.match(/(?:i(?:'|')?m|my name is|i am|this is|call me)\s+([A-Z][a-z]{1,20})/i);
    if (nameMatch && !lead.name) lead.name = nameMatch[1];

    if (!lead.name && askedName) {
      const single = text.trim().split(/\s+/);
      if (single.length <= 2 && /^[A-Z][a-z]+/.test(single[0])) lead.name = single[0];
    }

    const compMatch = text.match(/(?:company(?:\s+is)?|work(?:ing)? (?:at|for)|from|at)\s+([A-Za-z0-9 &.,'-]{2,30})/i);
    if (compMatch && !lead.company) lead.company = compMatch[1].trim();

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

  function leadNudge() {
    if (!lead.name && !askedName && turnCount >= 2) {
      askedName = true;
      return pickFresh([
        "\n\nBy the way, I didn't catch your name — who am I speaking with?",
        "\n\nI'd love to make this more personal — what's your name?",
        "\n\nBy the way, who do I have the pleasure of chatting with?",
      ]);
    }
    if (lead.name && !lead.email && !askedEmail && turnCount >= 3) {
      askedEmail = true;
      return pickFresh([
        `\n\nThanks, ${lead.name}! If you'd like us to follow up personally, what's the best email to reach you?`,
        `\n\n${lead.name}, if you'd like a detailed quote, just share your email and we'll send one over.`,
        `\n\nBy the way ${lead.name}, want us to email you some more details? What's your best email?`,
      ]);
    }
    return '';
  }

  function getNegotiationResponse() {
    negotiationStage++;
    const serviceKey = lead.service?.toLowerCase().includes('mobile') ? 'mobile' :
                       lead.service?.toLowerCase().includes('app') ? 'mobile' : 'general';

    if (negotiationStage === 1) {
      // First objection — clarify actual low price
      const pool = serviceKey === 'mobile' ?
        NEGOTIATION.firstObjection.mobile :
        (serviceKey === 'web' ? NEGOTIATION.firstObjection.web : NEGOTIATION.firstObjection.general);
      return pickFresh(pool);
    } else if (negotiationStage === 2) {
      // Second pushback — offer flexibility
      return pickFresh(NEGOTIATION.secondObjection);
    } else {
      // Third+ — final offer, try to close
      return pickFresh(NEGOTIATION.finalOffer);
    }
  }

  function generateReply(userText) {
    extractData(userText);
    turnCount++;

    const intent = detectIntent(userText);
    conversationHistory.push(intent);
    let reply = '';

    switch (intent) {
      case 'greeting':
        reply = lead.name ? pickFromPool('greeting_known') : pickFromPool('greeting_new');
        break;

      case 'thanks':
        reply = lead.name ? pickFromPool('thanks_known') : pickFromPool('thanks_new');
        break;

      case 'bye':
        reply = lead.name ? pickFromPool('bye_known') : pickFromPool('bye_new');
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
        if (!lead.service) lead.service = 'Website Development';
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
          + "\n\nMost redesigns start from $150 depending on scope and take 3–5 weeks.";
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
        if (lead.service?.includes('Mobile')) reply = KB.pricing.mobile;
        else if (lead.service?.includes('E-commerce')) reply = KB.pricing.ecom;
        else if (lead.service?.includes('Landing')) reply = KB.pricing.landing;
        else if (lead.service?.includes('Website') || lead.service?.includes('Redesign')) reply = KB.pricing.website;
        else reply = KB.pricing.general;
        reply += '\n\n' + pickFresh(RESPONSE_POOLS.price_follow_up);
        priceDiscussedFor = lead.service || 'general';
        break;

      case 'negotiate':
        reply = getNegotiationResponse();
        break;

      case 'discount':
        reply = pickFresh(NEGOTIATION.discount);
        break;

      case 'value':
        reply = pickFresh(NEGOTIATION.value);
        break;

      case 'comparison':
        reply = pickFresh(NEGOTIATION.comparison);
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
        // Check if it looks like a repeated question or follow-up argument
        if (lastIntent === 'negotiate' || lastIntent === 'price') {
          // Treat continued conversation after price/negotiate as further negotiation
          reply = getNegotiationResponse();
        } else if (userText.length < 15) {
          reply = pickFromPool('unknown_short');
        } else {
          reply = pickFromPool('unknown_long');
        }
    }

    // Avoid exact repetition of last bot reply
    if (reply === lastBotReply && intent !== 'greeting') {
      // Force a different angle
      if (['price','negotiate','discount','value','comparison'].includes(intent)) {
        reply = getNegotiationResponse();
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
