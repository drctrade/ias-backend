const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_MODEL = process.env.HTML_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';

const REFERENCE_GHL_HTML_EXCERPT = "<!DOCTYPE html>\n<html lang=\"fr\" class=\"scroll-smooth\">\n<head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>Clinique Muva | Excellence M\u00e9dico-Esth\u00e9tique</title>\n    <script src=\"https://cdn.tailwindcss.com\"></script>\n    <script src=\"https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js\"></script>\n    <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css\" />\n    <link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Space+Grotesk:wght@500;700&display=swap\" rel=\"stylesheet\">\n    \n    <script>\n        tailwind.config = {\n            theme: {\n                extend: {\n                    colors: {\n                        muvaGold: '#D4AF37',\n                        muvaDark: '#0A0A0A',\n                        muvaSurface: '#161616',\n                        iasGreen: '#5bc236'\n                    },\n                    fontFamily: {\n                        sans: ['Inter', 'sans-serif'],\n                        display: ['Space Grotesk', 'sans-serif']\n                    }\n                }\n            }\n        }\n    </script>\n    <style>\n        /* For\u00e7age Radical pour GHL */\n        html, body { \n            background-color: #0A0A0A !important; \n            margin: 0 !important; \n            padding: 0 !important; \n            overflow-x: hidden;\n        }\n\n        #ghl-wrapper { \n            background-color: #0A0A0A !important; \n            min-height: 100vh;\n            width: 100%;\n            margin: 0 auto !important;\n        }\n        \n        /* Tue le fond blanc des sections GHL */\n        section { \n            background-color: #0A0A0A !important; \n            width: 100% !important;\n        }\n        \n        .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(15px); border: 1px solid rgba(255, 255, 255, 0.08); }\n        .hero-gradient { background: radial-gradient(circle at center, rgba(212, 175, 55, 0.08) 0%, transparent 70%); }\n        .text-glow { text-shadow: 0 0 20px rgba(212, 175, 55, 0.3); }\n        [x-cloak] { display: none !important; }\n        \n        /* Centrage forc\u00e9 des conteneurs */\n        .ghl-container {\n            max-width: 1200px !important;\n            margin-left: auto !important;\n            margin-right: auto !important;\n            width: 100% !important;\n            padding-left: 20px;\n            padding-right: 20px;\n        }\n\n        /* Fix pour la Nav GHL */\n        nav.fixed {\n            left: 0 !important;\n            right: 0 !important;\n            width: 100% !important;\n            display: flex !important;\n            justify-content: center !important;\n        }\n    </style>\n</head>\n<body \n    x-data=\"{ \n        lang: 'fr',\n        mobileMenu: false,\n        translations: {\n            fr: {\n                nav_home: 'Accueil',\n                nav_services: 'Services',\n                nav_reviews: 'T\u00e9moignages',\n                nav_contact: 'Contact',\n                btn_book: 'R\u00c9SERVER',\n                hero_badge: 'L\\'IA AU SERVICE DE VOTRE BEAUT\u00c9',\n                hero_title: 'R\u00e9v\u00e9lez votre',\n                hero_title_accent: '\u00e9clat naturel.',\n                hero_sub: 'Expertise m\u00e9dico-esth\u00e9tique de pointe \u00e0 Qu\u00e9bec. Vivez une exp\u00e9rience transformatrice o\u00f9 la technologie rencontre l\\'art du soin.',\n                hero_btn_main: 'CONSULTATION GRATUITE',\n                hero_btn_sub: 'NOS TRAITEMENTS',\n              ";

async function chatHtml({ system, user, temperature = 0.4 }) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is missing');
  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=> '');
    throw new Error(`OpenAI HTML error: ${res.status} ${txt}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
}

function stripNonHtml(s) {
  if (!s) return '';
  // Remove markdown fences if any
  return s.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim();
}

function isProbablyHtml(s) {
  const t = (s || '').toLowerCase();
  return t.includes('<!doctype') && t.includes('<html') && t.includes('</html>');
}

function fallbackTemplate({ companyName, language, primaryColor }) {
  const lang = (language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  const name = companyName || 'Votre entreprise';
  const c = primaryColor || '#0b3a5a';
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name} | Site réhaussé</title>
  <style>
    :root { --brand:${c}; }
    body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:#0b1220; color:#e7eefc; }
    .wrap { max-width:1100px; margin:0 auto; padding:40px 18px; }
    .card { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:24px; }
    .btn { display:inline-block; background:var(--brand); color:white; padding:14px 18px; border-radius:12px; text-decoration:none; font-weight:700; }
    h1 { font-size:42px; margin:0 0 12px; }
    p { line-height:1.6; opacity:.9; }
    .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-top:20px; }
    .pill { background:rgba(255,255,255,0.08); border-radius:14px; padding:14px; }
    @media(max-width:900px){ .grid{grid-template-columns:1fr;} h1{font-size:34px;} }
  </style>
</head>
<body>
  <section class="wrap">
    <div class="card">
      <h1>${name}</h1>
      <p>${lang==='fr' ? 'Une expérience premium, claire et orientée conversion — pensée pour GoHighLevel.' : 'A premium, conversion-first experience — built for GoHighLevel.'}</p>
      <a class="btn" href="#booking">${lang==='fr' ? 'Réserver une consultation' : 'Book a consultation'}</a>
      <div class="grid">
        <div class="pill"><strong>${lang==='fr'?'Preuve':'Proof'}</strong><br/>${lang==='fr'?'Avis, avant/après, confiance.':'Reviews, before/after, trust.'}</div>
        <div class="pill"><strong>${lang==='fr'?'Offre':'Offer'}</strong><br/>${lang==='fr'?'Service phare + bénéfices concrets.':'Hero service + clear benefits.'}</div>
        <div class="pill"><strong>${lang==='fr'?'CTA':'CTA'}</strong><br/>${lang==='fr'?'Un seul objectif: prendre RDV.':'One goal: booking.'}</div>
      </div>
    </div>
  </section>

  <section class="wrap" id="booking">
    <div class="card">
      <h2 style="margin-top:0;">${lang==='fr'?'Réservation':'Booking'}</h2>
      <p>${lang==='fr'?'Intégrez ici votre calendrier GHL / formulaire.':'Embed your GHL calendar / form here.'}</p>
      <!-- GHL custom code embed placeholder -->
      <div style="height:420px; border-radius:14px; border:1px dashed rgba(255,255,255,0.22); display:flex; align-items:center; justify-content:center;">
        <span style="opacity:.7;">GHL Calendar / Form Embed</span>
      </div>
    </div>
  </section>
</body>
</html>`;
}

export async function generateGHLHtml({
  companyName,
  websiteUrl,
  language,
  region,
  industry,
  colors,
  headings,
  siteMeta,
}) {
  const primaryColor = Array.isArray(colors) && colors.length ? colors[0] : null;
  const lang = (language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';

  // If no model key, return fallback so pipeline completes.
  if (!OPENAI_API_KEY) {
    return fallbackTemplate({ companyName, language: lang, primaryColor });
  }

  const context = {
    companyName: companyName || siteMeta?.title || 'Client',
    websiteUrl,
    language: lang,
    region: region || null,
    industry: industry || null,
    colors: (colors || []).slice(0, 6),
    headings: (headings || []).slice(0, 10),
    siteMeta: siteMeta || {},
  };

  const system = `You are a senior web designer + conversion copywriter. You output ONLY valid HTML (no markdown). Your HTML must work inside GoHighLevel custom code blocks: no external JS frameworks, minimal JS, prefer inline CSS, responsive, fast.`;
  const user = `
Create a professional upgraded 1-page website in HTML for GoHighLevel.

HARD CONSTRAINTS:
- Output ONLY HTML, starting with <!DOCTYPE html> and ending with </html>.
- Must be responsive and look premium.
- Must match the client industry and audience.
- Must include: hero (headline + subheadline + CTA), benefits, services, social proof section, FAQ, booking section placeholder, footer.
- Avoid exaggerated claims and fake statistics.
- Language: ${lang==='fr' ? 'French' : 'English'}.
- Visual style: premium / luxury / clean.

REFERENCE: The following excerpt is from an HTML that renders correctly in GoHighLevel. Use it as structural inspiration (head meta, typography, section spacing):
${REFERENCE_GHL_HTML_EXCERPT}

CLIENT CONTEXT (JSON):
${JSON.stringify(context, null, 2)}

Now generate the full upgraded HTML.
`;

  // Try 1
  let html = stripNonHtml(await chatHtml({ system, user, temperature: 0.35 }));
  if (isProbablyHtml(html)) return html;

  // Try 2 (tighten)
  const user2 = `
Output ONLY HTML. Do not explain. If you cannot comply, still output a minimal valid HTML using the same sections.
Context JSON:
${JSON.stringify(context, null, 2)}
`;
  html = stripNonHtml(await chatHtml({ system, user: user2, temperature: 0.2 }));
  if (isProbablyHtml(html)) return html;

  // Fallback
  return fallbackTemplate({ companyName: context.companyName, language: lang, primaryColor });
}
