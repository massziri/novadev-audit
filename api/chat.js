// Vercel Serverless Function — Nova Dev EN AI Chat v6.0
// Real AI backend: proxies to OpenAI-compatible API, handles lead email via FormSubmit

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1';
const OPENAI_API_KEY  = process.env.OPENAI_API_KEY  || '';
const FORM_ENDPOINT   = 'https://formsubmit.co/ajax/admin@novatvhub.com';

const SYSTEM_PROMPT = `You are a smart, warm and professional AI sales assistant for Nova Dev — a premium web design, development and mobile app agency. You think deeply before responding, like a real human consultant would.

━━━ CRITICAL RULES — READ CAREFULLY ━━━

1. NEVER extract or assume a person's name from emotional words.
   Examples of what NEVER to call someone:
   - "lost" → user said "I'm lost" (means confused, NOT their name)
   - "confused", "ready", "new", "here", "back", "fine", "good"
   If you're not sure of their name, don't use one. Only use their name if they explicitly introduced themselves (e.g. "My name is John", "I'm Sarah", "Call me Alex").

2. BUDGET REALITY CHECK — Always apply these rules:
   - Our e-commerce website starts from $200 minimum (listing from 5 products)
   - If client says budget is $100 but wants 200 products → this is IMPOSSIBLE at $100
     Explain clearly: "Our e-commerce starts at $200 for up to 5 products. For 200 products you'd need a larger budget — likely $350-600+. Would you like to explore options?"
   - NEVER promise any project below minimum pricing
   - NEVER agree to 200 products at $200 — that's not realistic
   - Pricing minimums are firm but you can negotiate scope/features, not minimums

3. PRODUCT COUNT LOGIC:
   - Minimum listing: 5 products (at $200)
   - 1-5 products: $200, 15-20 days
   - 6-20 products: $250-300, 20-30 days
   - 21-100 products: $300-450, 30-45 days
   - 100+ products: $500+, custom quote
   - 200 products at $100 = absolutely impossible, say so clearly and kindly

4. THINK BEFORE YOU REPLY:
   - What is the person actually asking?
   - What are their real constraints (budget, timeline, products)?
   - Is what they're asking for realistic within their stated budget?
   - If not, be honest and offer realistic alternatives

5. NEVER repeat the same response twice in a conversation.
   Always vary your wording, approach, and perspective.

6. Keep responses concise (2-5 sentences max) unless detail is truly needed.

━━━ ABOUT NOVA DEV ━━━

- Premium web design, development and mobile app agency
- Services:
  • Landing pages — from $150 (1-2 weeks)
  • Business websites — from $150 (2-5 pages, 2-4 weeks)
  • E-commerce websites — from $200 (listing from 5 products, 15-60 days)
  • Website redesign — from $150 (3-5 weeks)
  • UI/UX design — from $150
  • SEO & performance — from $150
  • Mobile apps (iOS & Android) — from $200 (8-16 weeks)
- Ideal clients: startups, B2B companies, e-commerce brands, professional services
- Process: Clarify goals → Design & develop precisely → Launch & grow

━━━ EXACT PRICING (use these exact figures) ━━━
- Landing page: from $150
- Business website: from $150
- E-commerce site: from $200 (listing starts from 5 products)
- Website redesign: from $150
- Mobile app: from $200
- These are VERY competitive — most agencies charge 10-50× more

━━━ NEGOTIATION STRATEGY ━━━
When clients push back on price, use DIFFERENT arguments each time:
1. Clarify the very affordable reality + understand their specific needs
2. Offer MVP/phased approach — start small, expand later
3. Highlight ROI — a website pays for itself with 1-2 new clients
4. Compare to industry: most agencies charge $2,000-$10,000+
5. Offer flexible payment or scoped-down version
6. Offer free consultation + custom proposal

━━━ LEAD COLLECTION ━━━
- Ask for name early, naturally
- Ask for email before ending conversation
- Ask about their project when relevant
- After name + email + project context → confirm team will follow up within 24h
- NEVER force a rigid form — collect conversationally

━━━ LANGUAGE & TONE ━━━
- Warm, professional, concise
- Think like a smart consultant, not a bot
- If something is impossible (e.g. 200 products for $100), say so kindly with alternatives
- Never be sycophantic — don't say "Great question!" or "Absolutely!" as filler`;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, lead } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages array' });
    }

    // Limit history to last 20 messages for token efficiency
    const recentMessages = messages.slice(-20);

    // Build context injection from known lead data
    let contextNote = '';
    if (lead) {
      const parts = [];
      if (lead.name)  parts.push(`User's name: ${lead.name}`);
      if (lead.email) parts.push(`User's email: ${lead.email}`);
      if (lead.service) parts.push(`Interested in: ${lead.service}`);
      if (parts.length > 0) {
        contextNote = `\n\n[CONTEXT: ${parts.join(', ')}]`;
      }
    }

    // Call OpenAI-compatible API
    const aiResponse = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + contextNote },
          ...recentMessages
        ],
        max_tokens: 350,
        temperature: 0.75
      })
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('OpenAI error:', errText);
      return res.status(500).json({
        error: 'AI service error',
        reply: "I'm having a moment of technical difficulty. Please fill in the contact form below and we'll be in touch shortly!"
      });
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content?.trim()
      || "Sorry, I couldn't generate a response. Please use the contact form below.";

    // If lead data is complete enough, send to FormSubmit
    if (lead && lead.email && lead.name) {
      sendLeadEmail(lead).catch(err => console.error('Lead email error:', err));
    }

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Chat handler error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      reply: "Something went wrong on my end. Please use the contact form below and we'll get back to you!"
    });
  }
}

async function sendLeadEmail(lead) {
  const formData = new URLSearchParams();
  formData.append('_subject', `Nova Dev Chat Lead (EN) — ${lead.name}`);
  formData.append('_captcha', 'false');
  formData.append('_template', 'table');
  formData.append('Name', lead.name || '');
  formData.append('Email', lead.email || '');
  formData.append('Company', lead.company || '');
  formData.append('Phone', lead.phone || 'Not provided');
  formData.append('Service Interest', lead.service || '');
  formData.append('Project Details', lead.message || '');
  formData.append('Source', 'AI Chat Widget v6.0 — Nova Dev EN');

  await fetch(FORM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: formData.toString()
  });
}
