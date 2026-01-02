/**
 * imageGenerator.js — v5.3 (Luxury Clinic Social Assets)
 *
 * Goals:
 * - Generate premium, luxury, clinic-specific social creatives (NOT agency visuals)
 * - Avoid placeholders like [object Object]
 * - Provide backward-compatible function names:
 *    - generateVisuals(...)  (used by server.js in some versions)
 *    - generateSocialAssets(...)
 *
 * Notes:
 * - This module does NOT require changing the rest of the pipeline.
 * - It produces an array of assets with {type, size, prompt, base64?, url?}
 * - The caller is responsible for calling the image API and storing results.
 */

const DEFAULT_BRAND = {
  // Luxury palette defaults: deep navy + warm white + gold accent
  primary: "#0B1F33",
  secondary: "#F6F2EA",
  accent: "#C8A451",
};

const SAFE_SIZES = {
  square: "1024x1024",
  story: "1024x1536",
};

function isHexColor(v) {
  return typeof v === "string" && /^#?[0-9a-fA-F]{6}$/.test(v.trim());
}

function normalizeHex(v) {
  if (!isHexColor(v)) return null;
  const s = v.trim();
  return s.startsWith("#") ? s.toUpperCase() : ("#" + s.toUpperCase());
}

/**
 * Extract a clean palette from scraper output.
 * Expected shapes:
 * - colors: ["#123456", ...]
 * - colors: [{hex:"#123456"}, ...]
 */
function pickPalette(colors) {
  const list = Array.isArray(colors) ? colors : [];
  const hexes = [];

  for (const c of list) {
    if (typeof c === "string") {
      const h = normalizeHex(c);
      if (h) hexes.push(h);
    } else if (c && typeof c === "object") {
      const maybe = c.hex || c.color || c.value;
      const h = normalizeHex(String(maybe || ""));
      if (h) hexes.push(h);
    }
  }

  // Prefer a dark primary if present; otherwise fallback to luxury default.
  const primary =
    hexes.find(h => {
      // crude "dark-ish" check
      const n = parseInt(h.slice(1), 16);
      return n < 0x555555;
    }) || DEFAULT_BRAND.primary;

  const accent =
    hexes.find(h => h !== primary) || DEFAULT_BRAND.accent;

  return {
    primary,
    secondary: DEFAULT_BRAND.secondary,
    accent,
  };
}

function sanitizeText(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  // Prevent [object Object]
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/**
 * Build on-brand, clinic-specific copy for laser hair removal (FR/EN).
 * Keep it compliant: no guaranteed results, no invented stats, no medical claims.
 */
function buildCopy({ companyName, language }) {
  const name = sanitizeText(companyName) || "Votre clinique";
  const lang = (sanitizeText(language) || "fr").toLowerCase();

  if (lang.startsWith("en")) {
    return {
      offer_service: {
        headline: "Luxury Laser Hair Removal",
        subhead: `${name}`,
        body: "Smooth skin, modern technology, discreet experience.",
        cta: "Book a free consultation",
      },
      why_us: {
        headline: "Why choose us?",
        bullets: [
          "Medical-grade equipment",
          "Trained professionals",
          "Private, premium setting",
        ],
        cta: "Get your consultation",
      },
      faq_pain: {
        headline: "Does it hurt?",
        body: "Most clients describe a quick warm snap. We adapt settings to your comfort.",
        cta: "Ask us your questions",
      },
      limited_offer: {
        headline: "Limited spots this month",
        body: "Reserve your consultation to discuss your ideal plan.",
        cta: "Reserve now",
      },
      cta_booking: {
        headline: "Ready to start?",
        body: "Choose a time that works for you.",
        cta: "Book online",
      },
      before_after: {
        headline: "A cleaner routine",
        body: "Less shaving. More comfort. Results vary by person.",
        cta: "Discover the process",
      },
    };
  }

  // Default: French (Canada-friendly)
  return {
    offer_service: {
      headline: "Épilation laser premium",
      subhead: `${name}`,
      body: "Expérience discrète • Technologie moderne • Confort d’abord",
      cta: "Réserver une consultation gratuite",
    },
    why_us: {
      headline: "Pourquoi nous choisir",
      bullets: [
        "Équipement de qualité médicale",
        "Professionnels formés",
        "Cadre privé et haut de gamme",
      ],
      cta: "Obtenir ma consultation",
    },
    faq_pain: {
      headline: "Est-ce que ça fait mal ?",
      body: "La sensation ressemble souvent à un petit « claquement chaud ». On ajuste selon votre confort.",
      cta: "Poser une question",
    },
    limited_offer: {
      headline: "Places limitées ce mois-ci",
      body: "Réservez votre consultation pour bâtir un plan adapté à votre peau.",
      cta: "Réserver maintenant",
    },
    cta_booking: {
      headline: "Prête à commencer ?",
      body: "Choisissez une plage horaire qui vous convient.",
      cta: "Réserver en ligne",
    },
    before_after: {
      headline: "Routine simplifiée",
      body: "Moins de rasage. Plus de confort. Les résultats varient selon chaque personne.",
      cta: "Voir comment ça marche",
    },
  };
}

/**
 * Premium art direction prompt (model-agnostic).
 * We explicitly forbid “agency / growth / charts / generic business” visuals.
 */
function baseStylePrompt({ palette }) {
  return [
    "Create a premium luxury social media creative for a high-end laser hair removal clinic.",
    "Aesthetic: modern, minimal, editorial, high-end skincare/spa vibe, soft lighting, clean composition.",
    `Color palette: deep navy (${palette.primary}), warm off-white (${palette.secondary}), subtle gold accent (${palette.accent}).`,
    "Typography: elegant sans-serif, high contrast, perfectly centered/aligned, no pixelation, no random gradients.",
    "Imagery: tasteful, clinic-related (modern treatment room, laser device, clinician with gloves, calm client), or clean abstract luxury background.",
    "Avoid: marketing agency visuals, business suits, charts, “digital growth” clichés, random icons, [object Object], lorem ipsum.",
    "No fake statistics, no medical claims, no exaggerated before/after claims. If showing before/after, keep it subtle and non-graphic.",
  ].join(" ");
}

function buildPrompt({ type, copy, palette, sizeKind }) {
  const style = baseStylePrompt({ palette });
  const C = copy[type];

  // guard: if missing
  if (!C) {
    return `${style} Create a clean premium clinic social post for ${sanitizeText(copy?.offer_service?.subhead || "a clinic")}.`;
  }

  const headline = sanitizeText(C.headline);
  const subhead = sanitizeText(C.subhead || "");
  const body = sanitizeText(C.body || "");
  const cta = sanitizeText(C.cta || "");
  const bullets = Array.isArray(C.bullets) ? C.bullets.map(sanitizeText).filter(Boolean) : [];

  // Layout directives by asset type
  const layoutByType = {
    offer_service: "Layout: hero headline top-left, subhead smaller under it, body one line, CTA button at bottom. Include subtle clinic imagery background.",
    why_us: "Layout: headline at top, 3 bullet points with minimal icons, CTA button bottom. Background: modern clinic interior blur.",
    faq_pain: "Layout: big question headline, short reassuring body, CTA button. Background: soft off-white with minimal gold accent line.",
    before_after: "Layout: split-card concept 'Avant / Après' as minimal text labels only; do NOT show body close-ups. Use abstract texture or elegant clinic detail. Add disclaimer small: 'Résultats variables'.",
    limited_offer: "Layout: bold headline, short body, CTA button. Add small 'Sur rendez-vous' note. Background: premium abstract gradient (subtle).",
    cta_booking: "Layout: headline, body, CTA button. Background: tasteful reception / booking moment, not business sales.",
  };

  const layout = layoutByType[type] || "Layout: headline, body, CTA button. Minimal and premium.";

  const languageInstruction =
    (headline + " " + body).match(/[éèêàçù]/i) ? "All on-image text must be in French." : "All on-image text must be in English.";

  const bulletText = bullets.length ? `Bullets: ${bullets.join(" • ")}.` : "";
  const sub = subhead ? `Subhead: ${subhead}.` : "";

  // Size guidance
  const sizeHint = sizeKind === "story"
    ? "Format: vertical story 4:5-ish, keep safe margins for UI overlays."
    : "Format: square, keep generous margins.";

  return [
    style,
    sizeHint,
    languageInstruction,
    layout,
    `Headline: "${headline}".`,
    sub,
    body ? `Body: "${body}".` : "",
    bulletText,
    cta ? `CTA button text: "${cta}".` : "",
    "Render as a polished finished social creative ready to post.",
  ].filter(Boolean).join(" ");
}

function planAssets({ companyName, language, palette }) {
  const copy = buildCopy({ companyName, language });

  // 6 assets: 4 square + 2 story (balanced for IG)
  return [
    { type: "offer_service", sizeKind: "square" },
    { type: "why_us", sizeKind: "square" },
    { type: "faq_pain", sizeKind: "square" },
    { type: "before_after", sizeKind: "square" },
    { type: "limited_offer", sizeKind: "story" },
    { type: "cta_booking", sizeKind: "story" },
  ].map(a => ({
    ...a,
    size: SAFE_SIZES[a.sizeKind],
    prompt: buildPrompt({ type: a.type, copy, palette, sizeKind: a.sizeKind }),
  }));
}

/**
 * Main entrypoint — used by server.js in some branches.
 * @param {Object} params
 * @param {string} params.companyName
 * @param {string} params.language
 * @param {Array}  params.colors
 * @param {function} params.imageClient optional: async ({prompt,size}) => ({base64,url})
 */
async function generateVisuals(params = {}) {
  const companyName = sanitizeText(params.companyName);
  const language = sanitizeText(params.language) || "fr";
  const palette = pickPalette(params.colors);

  const assets = planAssets({ companyName, language, palette });

  // If no image client, return planned prompts (so pipeline can still save something)
  if (typeof params.imageClient !== "function") {
    return assets.map(a => ({ ...a, base64: null, url: null }));
  }

  // Generate sequentially to reduce rate-limit spikes
  const out = [];
  for (const a of assets) {
    const res = await params.imageClient({ prompt: a.prompt, size: a.size });
    out.push({ ...a, base64: res?.base64 || null, url: res?.url || null });
  }
  return out;
}

// Alias for compatibility
async function generateSocialAssets(params = {}) {
  return generateVisuals(params);
}

module.exports = {
  generateVisuals,
  generateSocialAssets,
  // exposed for unit tests / debugging
  _internals: { pickPalette, buildCopy, buildPrompt, planAssets },
};
