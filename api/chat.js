// Vercel Serverless Function — Nova Dev EN AI Chat v8.1
// LLM: Pollinations.ai (100% FREE, no API key needed, OpenAI-compatible)
// Fallback: graceful error message
// Lead capture: FormSubmit → admin@novatvhub.com
// Brevo: set BREVO_API_KEY env var to activate email automation

const POLLINATIONS_URL = 'https://text.pollinations.ai/openai';
const FORM_ENDPOINT    = 'https://formsubmit.co/ajax/admin@novatvhub.com';
const BREVO_API_KEY    = process.env.BREVO_API_KEY || '';
const BREVO_LIST_ID    = parseInt(process.env.BREVO_LIST_ID || '2', 10);

const SYSTEM_PROMPT = `You are a smart, warm and professional AI sales assistant for Nova Dev — a premium web design, development and mobile app agency based in France. You think deeply before responding, like a real human consultant would.

━━━ CRITICAL RULES — READ CAREFULLY ━━━

1. NEVER extract or assume a person's name from emotional words.
   Examples of what NEVER to call someone:
   - "lost" → user said "I'm lost" (means confused, NOT their name)
   - "confused", "ready", "here", "back", "good", "fine", "set", "done"
   Only use their name if they explicitly introduced themselves.

2. BUDGET REALITY CHECK — Always apply these rules:
   - Landing pages from $200 / websites from $990 / e-commerce from $200 / mobile apps from $2,000
   - Be honest about budget constraints but always offer alternatives
   - NEVER promise below minimum pricing
   - ALWAYS use $ (dollar sign), NEVER use € (euro sign) in this English version

3. THINK BEFORE YOU REPLY:
   - What is the person actually asking?
   - What are their real constraints (budget, timeline, type of project)?
   - Is what they're asking realistic? If not, say so kindly and offer alternatives.

4. Keep responses concise (2-4 sentences max) unless detail is truly needed.
5. NEVER repeat the same response twice in a conversation.

━━━ ABOUT NOVA DEV ━━━

- Premium web design, development and mobile app agency serving France and Europe
- Services:
  • Landing pages — from $200 (1-2 weeks)
  • Business/corporate websites — from $990 (2-5 pages, 2-4 weeks)
  • E-commerce websites — from $200 (15-60 days)
  • Website redesign — from $990 (3-5 weeks)
  • UI/UX design — from $500
  • SEO & performance — from $300
  • Mobile apps (iOS & Android) — from $2,000 (8-16 weeks)
- Ideal clients: startups, B2B companies, e-commerce brands, professional services, French businesses
- Process: Clarify goals → Design & develop precisely → Launch & grow
- GDPR / RGPD compliant, mobile-first, France & Europe focused

━━━ PRICING (use these exact figures — ALWAYS in $ dollars) ━━━
- Landing page: from $200
- Business website: from $990
- E-commerce site: from $200 (starter), up to $1,500 (full-featured)
- Website redesign: from $990
- Mobile app: from $2,000
- These are very competitive — most agencies charge 3-10× more
- IMPORTANT: Always say $ not €. This is the English/international site.

━━━ LEAD COLLECTION ━━━
- Ask for name early, naturally
- Ask for email before ending the conversation
- Ask about their project type and timeline
- After collecting name + email → confirm team will follow up within 24 hours
- NEVER force a rigid form — collect conversationally and warmly

━━━ LANGUAGE & TONE ━━━
- Warm, professional, concise
- Think like a smart consultant, not a bot
- If something is impossible at their budget, say so kindly with alternatives
- Never be sycophantic — don't say "Great question!" or "Absolutely!" as filler`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, lead } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages array' });
    }

    const recentMessages = messages.slice(-20);

    // Build context from known lead data
    let contextNote = '';
    if (lead) {
      const parts = [];
      if (lead.name)    parts.push(`User's name: ${lead.name}`);
      if (lead.email)   parts.push(`User's email: ${lead.email}`);
      if (lead.service) parts.push(`Interested in: ${lead.service}`);
      if (lead.phone)   parts.push(`Phone: ${lead.phone}`);
      if (parts.length > 0) contextNote = `\n\n[CONTEXT: ${parts.join(', ')}]`;
    }

    // ── Call Pollinations.ai (FREE, no API key) ──
    const aiResponse = await fetch(POLLINATIONS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + contextNote },
          ...recentMessages
        ],
        max_tokens: 350,
        temperature: 0.75,
        seed: 42,
        private: true
      })
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('LLM error:', errText);
      return res.status(200).json({
        reply: "I'm having a brief technical issue. Please fill in the contact form below and our team will be in touch within 24 hours!"
      });
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content?.trim()
      || "I couldn't generate a response right now. Please use the contact form below and we'll get back to you shortly!";

    // ── Lead capture: FormSubmit + Brevo ──
    if (lead && lead.email) {
      Promise.all([
        sendLeadFormSubmit(lead),
        sendLeadToBrevo(lead)
      ]).catch(err => console.error('Lead capture error:', err));
    }

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Chat handler error:', err);
    return res.status(200).json({
      reply: "Something went wrong on my end. Please use the contact form below and we'll get back to you!"
    });
  }
}

// ── FormSubmit lead notification ──
async function sendLeadFormSubmit(lead) {
  const formData = new URLSearchParams();
  formData.append('_subject', `Nova Dev Chat Lead (EN) — ${lead.name || lead.email}`);
  formData.append('_captcha', 'false');
  formData.append('_template', 'table');
  formData.append('Name',    lead.name    || 'Not provided');
  formData.append('Email',   lead.email);
  formData.append('Company', lead.company || 'Not provided');
  formData.append('Phone',   lead.phone   || 'Not provided');
  formData.append('Service', lead.service || 'Not specified');
  formData.append('Source',  'AI Chat v8.1 — Pollinations.ai — Nova Dev EN');

  await fetch(FORM_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: formData.toString()
  });
}

// ── Brevo CRM: add contact to list + send welcome email ──
async function sendLeadToBrevo(lead) {
  if (!BREVO_API_KEY) return; // Skip if not configured

  // 1. Create/update contact in Brevo
  await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      email: lead.email,
      attributes: {
        FIRSTNAME: lead.name    || '',
        LASTNAME:  lead.company || '',
        SMS:       lead.phone   || '',
        COMPANY:   lead.company || '',
        SOURCE:    'AI Chat - Nova Dev EN'
      },
      listIds: [BREVO_LIST_ID],
      updateEnabled: true
    })
  });

  // 2. Send welcome transactional email via Brevo
  if (lead.name && lead.email) {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'Nova Dev', email: 'admin@novatvhub.com' },
        to: [{ email: lead.email, name: lead.name || 'there' }],
        replyTo: { email: 'admin@novatvhub.com' },
        subject: 'Thank you for chatting with Nova Dev 🚀',
        htmlContent: `
          <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;color:#1e1b4b;">
            <div style="background:linear-gradient(135deg,#1e1b4b,#4338ca);padding:32px;text-align:center;border-radius:12px 12px 0 0;">
              <h1 style="color:#fff;margin:0;font-size:1.6rem;">&lt;/&gt; Nova<em>Dev</em></h1>
              <p style="color:#c7d2fe;margin:8px 0 0;font-size:.9rem;">Premium Web & Mobile Agency</p>
            </div>
            <div style="padding:32px;background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
              <h2 style="color:#1e1b4b;">Hi ${lead.name || 'there'} 👋</h2>
              <p style="color:#475569;line-height:1.7;">Thank you for reaching out to <strong>Nova Dev</strong>! We've received your enquiry and our team will review your project details shortly.</p>
              <p style="color:#475569;line-height:1.7;">We typically respond <strong>within 24 hours</strong> with a tailored proposal for your project.</p>
              ${lead.service ? `<p style="background:#f0f9ff;border-left:4px solid #6366f1;padding:12px 16px;border-radius:4px;color:#1e1b4b;"><strong>Your project:</strong> ${lead.service}</p>` : ''}
              <div style="text-align:center;margin:28px 0;">
                <a href="https://novadev-audit.vercel.app/#contact" style="background:#6366f1;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">View Our Portfolio →</a>
              </div>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
              <p style="font-size:.82rem;color:#94a3b8;text-align:center;">Nova Dev · admin@novatvhub.com · WhatsApp: <a href="https://wa.me/212665103031" style="color:#6366f1;">+212 665 103 031</a></p>
            </div>
          </div>
        `
      })
    });
  }
}
