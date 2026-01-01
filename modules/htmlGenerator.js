// ================================
// MODULE HTML GENERATOR - Site modernisé (v5.0)
// - Multilingue (bilingue EN/FR ou EN/ES avec toggle)
// - Langue par défaut = langue du site détectée (si compatible)
// - Compatible GHL (HTML/CSS/JS simple, Tailwind CDN ok)
// ================================

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function generateModernHTML(companyName, siteUrl, colors = [], sections = [], logoUrl = null, websiteCopy = null) {
  const primaryColor = colors?.[0] || '#2D7A8F';
  const secondaryColor = colors?.[1] || '#0f204b';

  // If no AI copy provided, fallback to FR (legacy-ish)
  const defaultLang = websiteCopy?.default_lang || 'fr';
  const secondaryLang = websiteCopy?.secondary_lang || (defaultLang === 'en' ? 'fr' : 'en');
  const toggleLabel = websiteCopy?.toggle_label || 'LANG';

  const copy = websiteCopy?.copy || {};
  const C1 = copy[defaultLang] || {};
  const C2 = copy[secondaryLang] || {};

  // fallback copy blocks
  const fallbackNav = (lang) => {
    if (lang === 'fr') return { home:'Accueil', services:'Services', about:'À propos', contact:'Contact', cta_button:'Nous contacter' };
    if (lang === 'es') return { home:'Inicio', services:'Servicios', about:'Acerca de', contact:'Contacto', cta_button:'Contáctanos' };
    return { home:'Home', services:'Services', about:'About', contact:'Contact', cta_button:'Contact us' };
  };

  const nav1 = C1.nav || fallbackNav(defaultLang);
  const nav2 = C2.nav || fallbackNav(secondaryLang);

  const hero1 = C1.hero || {};
  const hero2 = C2.hero || {};

  const services1 = (C1.services || []).slice(0, 6);
  const services2 = (C2.services || []).slice(0, 6);

  const about1 = C1.about || {};
  const about2 = C2.about || {};

  const trust1 = C1.trust || {};
  const trust2 = C2.trust || {};

  const contact1 = C1.contact || {};
  const contact2 = C2.contact || {};

  const logoHTML = logoUrl
    ? `<img src="${esc(logoUrl)}" alt="${esc(companyName)} Logo" class="h-10 md:h-12 object-contain">`
    : `<span class="text-xl md:text-2xl font-bold">${esc(companyName)}</span>`;

  // Services fallback from scraped sections if AI didn't provide
  const sectionTitles = (sections || []).map(s => s.title).filter(Boolean).slice(0, 6);
  const buildServiceCards = (svcs, fallbackTitles) => {
    const list = (svcs && svcs.length) ? svcs : fallbackTitles.map(t => ({ title: t, desc: '' }));
    return list.slice(0, 6).map((sec, i) => `
      <div class="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-shadow">
        <div class="w-14 h-14 bg-gradient-to-br from-[${primaryColor}] to-[${secondaryColor}] rounded-xl mb-6 flex items-center justify-center text-white text-xl font-bold">
          ${i + 1}
        </div>
        <h3 class="text-xl font-bold mb-3" data-i18n="services.${i}.title">${esc(sec.title || ('Service ' + (i+1)))}</h3>
        <p class="text-gray-600" data-i18n="services.${i}.desc">${esc(sec.desc || '')}</p>
      </div>
    `).join('\n');
  };

  const servicesCardsHTML = buildServiceCards(services1, sectionTitles);

  // JSON dictionaries embedded (for toggle)
  const dict = {
    [defaultLang]: {
      nav: nav1,
      hero: {
        headline: hero1.headline || companyName,
        subheadline: hero1.subheadline || '',
        primary_cta: hero1.primary_cta || nav1.cta_button,
        secondary_cta: hero1.secondary_cta || nav1.services
      },
      about: {
        title: about1.title || '',
        body: about1.body || ''
      },
      trust: {
        title: trust1.title || '',
        bullets: trust1.bullets || []
      },
      contact: {
        title: contact1.title || nav1.contact,
        body: contact1.body || '',
        cta: contact1.cta || nav1.cta_button,
        note: contact1.note || ''
      },
      services: services1.length ? services1 : sectionTitles.map(t => ({ title: t, desc: '' }))
    },
    [secondaryLang]: {
      nav: nav2,
      hero: {
        headline: hero2.headline || companyName,
        subheadline: hero2.subheadline || '',
        primary_cta: hero2.primary_cta || nav2.cta_button,
        secondary_cta: hero2.secondary_cta || nav2.services
      },
      about: {
        title: about2.title || '',
        body: about2.body || ''
      },
      trust: {
        title: trust2.title || '',
        bullets: trust2.bullets || []
      },
      contact: {
        title: contact2.title || nav2.contact,
        body: contact2.body || '',
        cta: contact2.cta || nav2.cta_button,
        note: contact2.note || ''
      },
      services: services2.length ? services2 : sectionTitles.map(t => ({ title: t, desc: '' }))
    }
  };

  return `<!DOCTYPE html>
<html lang="${esc(defaultLang)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(companyName)} - Modern Website</title>
  <meta name="description" content="${esc(C1.meta_description || '')}">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <style>
    :root { --primary:${primaryColor}; --secondary:${secondaryColor}; }
    .gradient-bg { background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%); }
    .btn-primary { background: var(--primary); color:#fff; padding: 0.9rem 1.4rem; border-radius: 0.85rem; font-weight: 700; transition: .2s; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,.18); }
    .btn-ghost { border: 2px solid rgba(255,255,255,.85); color:#fff; padding:0.9rem 1.4rem; border-radius:0.85rem; font-weight:700; transition:.2s; }
    .btn-ghost:hover { background:#fff; color: var(--primary); }
    .lang-toggle { border:1px solid rgba(0,0,0,.12); border-radius:999px; padding: 6px 10px; font-weight:700; }
  </style>
</head>
<body class="font-sans antialiased bg-white text-gray-900">

  <!-- Nav -->
  <nav class="bg-white/95 backdrop-blur border-b border-gray-100 sticky top-0 z-50">
    <div class="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        ${logoHTML}
      </div>

      <div class="hidden md:flex items-center gap-7 text-sm font-semibold">
        <a href="#home" class="hover:text-[${primaryColor}] transition" data-i18n="nav.home">${esc(nav1.home)}</a>
        <a href="#services" class="hover:text-[${primaryColor}] transition" data-i18n="nav.services">${esc(nav1.services)}</a>
        <a href="#about" class="hover:text-[${primaryColor}] transition" data-i18n="nav.about">${esc(nav1.about)}</a>
        <a href="#contact" class="hover:text-[${primaryColor}] transition" data-i18n="nav.contact">${esc(nav1.contact)}</a>
      </div>

      <div class="flex items-center gap-3">
        <button class="lang-toggle text-xs" id="langToggle">${esc(toggleLabel)}</button>
        <a href="#contact" class="btn-primary hidden sm:inline-flex items-center gap-2">
          <i class="fa-solid fa-calendar-check"></i>
          <span data-i18n="nav.cta_button">${esc(nav1.cta_button)}</span>
        </a>
      </div>
    </div>
  </nav>

  <!-- Hero -->
  <section id="home" class="gradient-bg text-white">
    <div class="max-w-6xl mx-auto px-5 py-16 md:py-24 text-center">
      <p class="inline-flex items-center gap-2 text-xs md:text-sm bg-white/15 px-4 py-2 rounded-full mb-6">
        <i class="fa-solid fa-sparkles"></i>
        <span>Premium • Conversion • Trust</span>
      </p>

      <h1 class="text-4xl md:text-6xl font-extrabold tracking-tight mb-5" data-i18n="hero.headline">${esc(hero1.headline || companyName)}</h1>
      <p class="text-lg md:text-2xl opacity-90 max-w-3xl mx-auto mb-10" data-i18n="hero.subheadline">${esc(hero1.subheadline || '')}</p>

      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <a href="#contact" class="btn-primary" data-i18n="hero.primary_cta">${esc(hero1.primary_cta || nav1.cta_button)}</a>
        <a href="#services" class="btn-ghost" data-i18n="hero.secondary_cta">${esc(hero1.secondary_cta || nav1.services)}</a>
      </div>
    </div>
  </section>

  <!-- Services -->
  <section id="services" class="py-16 md:py-20 bg-gray-50">
    <div class="max-w-6xl mx-auto px-5">
      <div class="text-center mb-12">
        <h2 class="text-3xl md:text-4xl font-extrabold" data-i18n="nav.services">${esc(nav1.services)}</h2>
        <p class="text-gray-600 mt-3 max-w-2xl mx-auto">High-quality services adapted to your needs.</p>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
        ${servicesCardsHTML}
      </div>
    </div>
  </section>

  <!-- About -->
  <section id="about" class="py-16 md:py-20 bg-white">
    <div class="max-w-6xl mx-auto px-5 grid md:grid-cols-2 gap-10 items-center">
      <div>
        <h2 class="text-3xl md:text-4xl font-extrabold mb-4" data-i18n="about.title">${esc(about1.title || '')}</h2>
        <p class="text-gray-700 leading-relaxed" data-i18n="about.body">${esc(about1.body || '')}</p>

        <div class="mt-7 rounded-2xl border border-gray-100 bg-gray-50 p-6">
          <h3 class="font-bold mb-3" data-i18n="trust.title">${esc(trust1.title || '')}</h3>
          <ul class="space-y-2 text-gray-700">
            ${(trust1.bullets || []).slice(0,3).map((b, i) => `<li class="flex gap-2"><i class="fa-solid fa-check text-[${primaryColor}] mt-1"></i><span data-i18n="trust.bullets.${i}">${esc(b)}</span></li>`).join('')}
          </ul>
        </div>
      </div>

      <div class="rounded-3xl h-80 md:h-96 gradient-bg opacity-95"></div>
    </div>
  </section>

  <!-- Contact -->
  <section id="contact" class="py-16 md:py-20 bg-gray-950 text-white">
    <div class="max-w-6xl mx-auto px-5 text-center">
      <h2 class="text-3xl md:text-4xl font-extrabold mb-4" data-i18n="contact.title">${esc(contact1.title || nav1.contact)}</h2>
      <p class="text-white/80 max-w-2xl mx-auto mb-8" data-i18n="contact.body">${esc(contact1.body || '')}</p>

      <a href="#" class="inline-flex items-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-2xl font-extrabold hover:opacity-90 transition" data-i18n="contact.cta">
        <i class="fa-solid fa-arrow-right"></i>
        ${esc(contact1.cta || nav1.cta_button)}
      </a>

      <p class="text-white/60 text-sm mt-6" data-i18n="contact.note">${esc(contact1.note || '')}</p>

      <p class="text-white/40 text-xs mt-10">
        © ${new Date().getFullYear()} ${esc(companyName)} • Original site: <a class="underline" href="${esc(siteUrl)}">${esc(siteUrl)}</a>
      </p>
    </div>
  </section>

  <script>
    const DICT = ${JSON.stringify(dict)};
    let currentLang = "${defaultLang}";
    const secondaryLang = "${secondaryLang}";

    function getByPath(obj, path) {
      return path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : null, obj);
    }

    function applyLang(lang) {
      const data = DICT[lang] || DICT["${defaultLang}"];
      document.documentElement.lang = lang;

      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const value = getByPath(data, key);
        if (value !== null && value !== undefined && String(value).length) {
          el.textContent = value;
        }
      });

      // Services titles/descs
      (data.services || []).slice(0, 6).forEach((svc, i) => {
        const tEl = document.querySelector('[data-i18n="services.' + i + '.title"]');
        const dEl = document.querySelector('[data-i18n="services.' + i + '.desc"]');
        if (tEl && svc.title) tEl.textContent = svc.title;
        if (dEl) dEl.textContent = svc.desc || '';
      });

      currentLang = lang;
    }

    document.getElementById('langToggle').addEventListener('click', () => {
      const next = (currentLang === "${defaultLang}") ? secondaryLang : "${defaultLang}";
      applyLang(next);
    });

    // Init
    applyLang(currentLang);
  </script>

</body>
</html>`;
}

module.exports = { generateModernHTML };