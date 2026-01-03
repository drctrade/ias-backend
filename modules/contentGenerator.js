const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

async function chat({ system, user, temperature = 0.5, responseFormat = null }) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is missing');
  const body = {
    model: OPENAI_MODEL,
    temperature,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      { role: 'user', content: user },
    ],
  };
  if (responseFormat) body.response_format = responseFormat;

  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(()=> '');
    throw new Error(`OpenAI chat error: ${res.status} ${txt}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
}

function safeStr(x, fallback = '') {
  if (x === null || x === undefined) return fallback;
  if (typeof x === 'string') return x;
  try { return JSON.stringify(x); } catch { return fallback; }
}

export async function generatePackageContent({ companyName, websiteUrl, language, region, industry, siteMeta, headings }) {
  const lang = (language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  const locale = `${lang}-${region || (lang==='fr'?'CA':'US')}`;

  const context = {
    companyName: companyName || siteMeta?.title || 'Client',
    websiteUrl,
    language: lang,
    region: region || null,
    industry: industry || null,
    siteMeta: siteMeta || {},
    headings: (headings || []).slice(0, 12),
  };

  const sys = `You are a senior direct-response strategist and brand copywriter. Output must be professional, specific, and usable immediately. No fluff.`;
  const user = `
Create core deliverables for a client. Use the context below.

CONTEXT (JSON):
${JSON.stringify(context, null, 2)}

Return STRICT JSON with these keys:
- ai_system_prompt: string (system prompt for an assistant that helps the client grow)
- brand_kit_prompt: string (prompt to generate brand kit: voice, tone, colors, typography suggestions, do/don'ts)
- loom_script: string (a 2-4 min Loom video script explaining the audit and next steps)
- email_templates: object with keys: intro, follow_up_1, follow_up_2, breakup (each string)
Rules:
- Write in ${lang === 'fr' ? 'French' : 'English'}.
- Be specific to the industry and website signals.
- Avoid making up statistics or guarantees.
- Keep each email under 180 words.
`;

  // If OpenAI unavailable, return deterministic placeholders (so pipeline doesn't crash).
  if (!OPENAI_API_KEY) {
    return {
      ai_system_prompt: `You are an AI growth assistant for ${context.companyName}.`,
      brand_kit_prompt: `Create a brand kit for ${context.companyName} (${industry}).`,
      loom_script: `Hi ${context.companyName}... (placeholder)`,
      email_templates: {
        intro: `Hi ${context.companyName}, quick note...`,
        follow_up_1: `Just following up...`,
        follow_up_2: `One last nudge...`,
        breakup: `Closing the loop...`,
      },
    };
  }

  const raw = await chat({
    system: sys,
    user,
    temperature: 0.4,
    responseFormat: { type: 'json_object' },
  });

  let parsed;
  try { parsed = JSON.parse(raw); } catch { parsed = {}; }

  return {
    ai_system_prompt: safeStr(parsed.ai_system_prompt),
    brand_kit_prompt: safeStr(parsed.brand_kit_prompt),
    loom_script: safeStr(parsed.loom_script),
    email_templates: parsed.email_templates || {},
  };
}
