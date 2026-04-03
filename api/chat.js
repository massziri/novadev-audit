// Vercel Serverless Function — Nova Dev EN AI Chat
// Proxies to OpenAI-compatible API and handles lead email via FormSubmit

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1';
const OPENAI_API_KEY  = process.env.OPENAI_API_KEY  || '';
const FORM_ENDPOINT   = 'https://formsubmit.co/ajax/admin@novatvhub.com';

const SYSTEM_PROMPT = `You are a knowledgeable, friendly and professional AI assistant for Nova Dev, a premium web design, web development and mobile app development agency.

Your goals:
1. Answer any question visitors have about web design, web development, mobile apps, SEO, digital strategy, pricing, timelines, technology stacks, or any other topic related to the agency's work.
2. Naturally and conversationally collect the visitor's lead information (name, email, company, service interest, phone, project details) throughout the conversation — do NOT force a rigid questionnaire. Collect it organically when appropriate.
3. Always be helpful, concise and professional. Reflect Nova Dev's premium brand voice.
4. BE A SMART NEGOTIATOR. When clients say the price is too high, expensive, or push back on pricing, use different arguments each time. Never repeat the same response.

About Nova Dev:
- Premium web design and development agency
- Services: Strategic project direction, Premium interface design, Corporate & business websites, Conversion-focused e-commerce, Performance & SEO foundations, Mobile app development (iOS & Android), Long-term digital evolution
- Ideal clients: Professional services, Corporate teams, Growing B2B companies, E-commerce brands, Consultants, Local businesses with ambition
- Process: 1) Clarify business objective → 2) Design & develop with precision → 3) Launch with room to grow
- Strong focus on brand credibility, conversion, and long-term digital growth

CRITICAL PRICING INFORMATION (use these exact figures):
- Landing pages start from $150
- Full business websites start from $150 (scales based on scope)
- Mobile app development starts from $200
- E-commerce projects start from $300
- These are VERY competitive prices — most agencies charge 10-50x more

NEGOTIATION GUIDELINES:
- When a client says it's expensive or pushes back on price, NEVER repeat the same response
- Stage 1: Clarify actual prices (they're very affordable), ask about their specific needs
- Stage 2: Offer MVP/phased approach, flexible packages, find middle ground
- Stage 3: Offer free consultation, custom proposal, flexible payment plans
- Always highlight VALUE: ROI, 24/7 business tool, competitive advantage
- Compare favorably to industry: most agencies charge $2,000-$10,000+
- Be empathetic but confident in the value delivered
- Use different angles each time: value, comparison, flexibility, ROI, packages

Lead collection guidance:
- Ask for name early in a natural way
- Collect email before ending the conversation
- Ask about their project/company when relevant
- After collecting name + email + some project context, confirm you'll have the team reach out

When a visitor seems ready to move forward or you have their name + email, mention that the Nova Dev team will follow up.

Keep responses concise (2-4 sentences max unless a detailed answer is truly needed). Be warm but professional. NEVER give the same response twice in a conversation — always vary your wording and approach.`;

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
          { role: 'system', content: SYSTEM_PROMPT },
          ...recentMessages
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('OpenAI error:', errText);
      return res.status(500).json({ error: 'AI service error', reply: "I'm having a moment of technical difficulty. Please fill in the contact form below and we'll be in touch shortly!" });
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response. Please use the contact form below.";

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
  formData.append('Source', 'AI Chat Widget — Nova Dev EN');

  await fetch(FORM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: formData.toString()
  });
}
