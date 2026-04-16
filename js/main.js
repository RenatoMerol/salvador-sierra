/* ================================================================
   SALVADOR SIERRA — main.js
   Merol Media · 2026
================================================================ */

// ── 0. THEME — aplicar antes del DOMContentLoaded para evitar flash ──
(function () {
  const saved  = localStorage.getItem('ss-theme');
  const system = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', saved || system);
})();

document.addEventListener('DOMContentLoaded', function () {

  // ── 0b. THEME TOGGLE ────────────────────────────────────────────

  const html       = document.documentElement;
  const themeBtns  = document.querySelectorAll('#themeToggle, #themeToggleMobile');
  const systemPref = window.matchMedia('(prefers-color-scheme: light)');

  function applyTheme(theme, save) {
    html.setAttribute('data-theme', theme);
    if (save) localStorage.setItem('ss-theme', theme);
  }

  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next, true);
    });
  });

  // Si el usuario cambia la preferencia del OS y no había elegido manualmente
  systemPref.addEventListener('change', e => {
    if (!localStorage.getItem('ss-theme')) {
      applyTheme(e.matches ? 'light' : 'dark', false);
    }
  });


  // ── 1. NAV — scroll state ───────────────────────────────────────

  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });


  // ── 2. HAMBURGER / MOBILE MENU ──────────────────────────────────

  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  let menuOpen = false;

  function toggleMenu(force) {
    menuOpen = typeof force === 'boolean' ? force : !menuOpen;
    mobileMenu.classList.toggle('open', menuOpen);
    hamburger.classList.toggle('open', menuOpen);
    document.body.style.overflow = menuOpen ? 'hidden' : '';
  }

  hamburger.addEventListener('click', () => toggleMenu());
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));


  // ── 3. GALLERY — fetch from API + render + filter ────────────────

  const filterBtns = document.querySelectorAll('.filter-btn');
  const galleryGrid = document.getElementById('galleryGrid');
  let obraCards = [];

  function buildCard(artwork, index) {
    const statusMap = { available: 'avail', featured: 'feat', sold: 'sold' };
    const badgeClass = 'badge-' + (statusMap[artwork.status] || 'avail');
    const badgeLabel = { available: 'Disponible', featured: 'Destacada', sold: 'Vendida' }[artwork.status] || 'Disponible';
    const badgeI18n = { available: 'badge.avail', featured: 'badge.feat', sold: 'badge.sold' }[artwork.status] || 'badge.avail';
    const meta = [artwork.technique, artwork.dimensions, artwork.year].filter(Boolean).join(' · ');
    const delay = index < 3 ? ' reveal-delay-' + index : '';
    const dataAttrs = ' data-category="' + (artwork.category || '') + '"'
      + ' data-title="' + escHtml(artwork.title || '') + '"'
      + ' data-year="' + (artwork.year || '') + '"'
      + ' data-dimensions="' + escHtml(artwork.dimensions || '') + '"'
      + ' data-technique="' + escHtml(artwork.technique || '') + '"'
      + ' data-series="' + escHtml(artwork.series || '') + '"'
      + ' data-location="' + escHtml(artwork.location || '') + '"';

    return '<article class="obra-card reveal' + delay + '"' + dataAttrs + '>'
      + '<div class="obra-img"><div class="obra-img-inner">'
      + '<img src="' + escHtml(artwork.image_url) + '" alt="' + escHtml(artwork.alt || artwork.title) + '" loading="lazy">'
      + '</div></div>'
      + '<div class="obra-info"><div>'
      + '<div class="obra-title">' + escHtml(artwork.title) + '</div>'
      + '<div class="obra-meta">' + escHtml(meta) + '</div>'
      + '</div>'
      + '<span class="badge ' + badgeClass + '" data-i18n="' + badgeI18n + '">' + badgeLabel + '</span>'
      + '</div></article>';
  }

  function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function loadGallery() {
    try {
      const res = await fetch('/api/artworks/public');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const artworks = await res.json();
      galleryGrid.innerHTML = artworks.map(buildCard).join('');
      obraCards = document.querySelectorAll('#galleryGrid .obra-card');
      // Init reveal observer on new cards
      obraCards.forEach(el => revealObs.observe(el));
    } catch (err) {
      console.error('Error loading gallery:', err);
    }
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      obraCards.forEach(card => {
        const match = filter === 'all' || card.dataset.category === filter;

        if (match) {
          card.style.display = '';
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              card.classList.remove('hiding');
            });
          });
        } else {
          card.classList.add('hiding');
          setTimeout(() => {
            if (card.classList.contains('hiding')) card.style.display = 'none';
          }, 320);
        }
      });
    });
  });


  // ── 4. IDIOMA (ES / EN) ─────────────────────────────────────────

  const T = {
    es: {
      'nav.obras':     'Obras',
      'nav.sobre':     'Sobre mí',
      'nav.contacto':  'Contacto',
      'hero.eyebrow':  'Arquitecto · Artista Visual · México',
      'hero.desc':     'Obra original en acrílico, aerosol y técnica mixta.',
      'hero.cta1':     'Ver obras',
      'hero.cta2':     'Contactar',
      'hero.img':      '[ Obra destacada ]',
      'gallery.title': 'Obras',
      'filter.all':    'Todo',
      'filter.pinturas':  'Pinturas',
      'filter.murales':   'Murales',
      'filter.colab':     'Colaboraciones',
      'filter.interv':    'Intervenciones',
      'badge.avail':   'Disponible',
      'badge.sold':    'Vendida',
      'badge.feat':    'Destacada',
      'about.eyebrow': 'Sobre el artista',
      'about.img':     '[ Foto del artista ]',
      'about.p1':      'Arquitecto y artista visual mexicano con base en Ciudad de México. Su obra integra el rigor del diseño espacial con la expresión pictórica libre, influenciada por el Pop Art, el Impresionismo y el Op Art.',
      'about.p2':      'Trabaja en acrílico, aerosol y técnica mixta. Ha realizado murales e intervenciones en desarrollos en Playa del Carmen, Tulum, Puerto Morelos y Ciudad de México.',
      'about.p3':      'Como arquitecto, reconoce cómo el arte transforma el valor y la narrativa de los espacios. Cada pieza crea una identidad que trasciende la decoración.',
      'about.cta':     'Contactar',
      'contact.title': 'Contacto',
      'contact.sub':   'Para obra original, murales, commissions y proyectos.',
      'contact.email': 'Email',
      'footer.copy':   '© 2026. Todos los derechos reservados.',
      'lightbox.technique':  'Técnica',
      'lightbox.dimensions': 'Dimensiones',
      'lightbox.year':       'Año',
      'lightbox.series':     'Serie',
      'lightbox.location':   'Ubicación',
      'lightbox.cta':        'Pedir informes',
    },
    en: {
      'nav.obras':     'Works',
      'nav.sobre':     'About',
      'nav.contacto':  'Contact',
      'hero.eyebrow':  'Architect · Visual Artist · Mexico',
      'hero.desc':     'Original artwork in acrylic, aerosol and mixed media.',
      'hero.cta1':     'View works',
      'hero.cta2':     'Contact',
      'hero.img':      '[ Featured work ]',
      'gallery.title': 'Works',
      'filter.all':    'All',
      'filter.pinturas':  'Paintings',
      'filter.murales':   'Murals',
      'filter.colab':     'Collaborations',
      'filter.interv':    'Interventions',
      'badge.avail':   'Available',
      'badge.sold':    'Sold',
      'badge.feat':    'Featured',
      'about.eyebrow': 'About the artist',
      'about.img':     '[ Artist photo ]',
      'about.p1':      'Mexican architect and visual artist based in Mexico City. His work integrates spatial design with free pictorial expression, influenced by Pop Art, Impressionism, and Op Art.',
      'about.p2':      'Working in acrylic, aerosol and mixed media. Has created murals and interventions in Playa del Carmen, Tulum, Puerto Morelos, and Mexico City.',
      'about.p3':      'As an architect, he understands how art transforms the value and narrative of spaces. Each piece creates an identity beyond decoration.',
      'about.cta':     'Contact',
      'contact.title': 'Contact',
      'contact.sub':   'For original artwork, murals, commissions and projects.',
      'contact.email': 'Email',
      'footer.copy':   '© 2026. All rights reserved.',
      'lightbox.technique':  'Technique',
      'lightbox.dimensions': 'Dimensions',
      'lightbox.year':       'Year',
      'lightbox.series':     'Series',
      'lightbox.location':   'Location',
      'lightbox.cta':        'Inquire',
    }
  };

  let currentLang = 'es';

  function applyLang(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const val = T[lang][el.dataset.i18n];
      if (val !== undefined) el.textContent = val;
    });
    document.title = lang === 'en'
      ? 'Salvador Sierra — Painter & Visual Artist'
      : 'Salvador Sierra — Pintor y Artista Visual';
    document.querySelector('meta[name="description"]').content = lang === 'en'
      ? 'Original artwork by Salvador Sierra López — Mexican architect and visual artist. Paintings, murals and interventions in acrylic, aerosol and mixed media.'
      : 'Obra original de Salvador Sierra López — arquitecto y artista visual mexicano. Pinturas, murales e intervenciones en acrílico, aerosol y técnica mixta.';
  }

  ['langToggle', 'langToggleMobile'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => applyLang(currentLang === 'es' ? 'en' : 'es'));
  });


  // ── 5. REVEAL ON SCROLL ─────────────────────────────────────────

  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  // Observe non-gallery reveal elements (hero, bio, etc.)
  document.querySelectorAll('.reveal:not(.obra-card)').forEach(el => revealObs.observe(el));

  // Load gallery from API (cards get observed inside loadGallery)
  loadGallery();


  // ── 6. SMOOTH SCROLL (fallback for older browsers) ──────────────

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });


  // ── 7. LIGHTBOX ──────────────────────────────────────────────────

  const lightbox = document.getElementById('lightbox');
  let currentCardIndex = 0;
  let visibleCards = [];

  function getVisibleCards() {
    return [...document.querySelectorAll('#galleryGrid .obra-card')].filter(
      c => !c.classList.contains('hiding') && c.style.display !== 'none'
    );
  }

  function populateLightbox(card) {
    const img = card.querySelector('img');
    const lbImg = document.getElementById('lightboxImg');
    lbImg.src = img ? img.src : '';
    lbImg.alt = img ? img.alt : '';

    document.getElementById('lightboxTitle').textContent = card.dataset.title || '';
    document.getElementById('lightboxTechnique').textContent = card.dataset.technique || '';

    const dims = card.dataset.dimensions;
    const dimsDt = document.getElementById('lightboxDimensions').previousElementSibling;
    const dimsDd = document.getElementById('lightboxDimensions');
    if (dims) {
      dimsDt.classList.remove('hidden'); dimsDd.classList.remove('hidden');
      dimsDd.textContent = dims;
    } else {
      dimsDt.classList.add('hidden'); dimsDd.classList.add('hidden');
    }

    document.getElementById('lightboxYear').textContent = card.dataset.year || '';

    const series = card.dataset.series;
    const seriesDt = document.getElementById('lightboxSeries').previousElementSibling;
    const seriesDd = document.getElementById('lightboxSeries');
    if (series) {
      seriesDt.classList.remove('hidden'); seriesDd.classList.remove('hidden');
      seriesDd.textContent = series;
    } else {
      seriesDt.classList.add('hidden'); seriesDd.classList.add('hidden');
    }

    const location = card.dataset.location;
    const locDt = document.getElementById('lightboxLocation').previousElementSibling;
    const locDd = document.getElementById('lightboxLocation');
    if (location) {
      locDt.classList.remove('hidden'); locDd.classList.remove('hidden');
      locDd.textContent = location;
    } else {
      locDt.classList.add('hidden'); locDd.classList.add('hidden');
    }

    // WhatsApp CTA
    const title = card.dataset.title || '';
    const tech  = card.dataset.technique || '';
    const dimStr = card.dataset.dimensions || '';
    const msgText = currentLang === 'en'
      ? `Hi, I'm interested in the artwork "${title}" (${tech}${dimStr ? ', ' + dimStr : ''})`
      : `Hola, me interesa la obra "${title}" (${tech}${dimStr ? ', ' + dimStr : ''})`;
    document.getElementById('lightboxCta').href =
      'https://wa.me/525531873825?text=' + encodeURIComponent(msgText);

    // Update prev/next visibility
    document.getElementById('lightboxPrev').style.visibility = currentCardIndex > 0 ? '' : 'hidden';
    document.getElementById('lightboxNext').style.visibility = currentCardIndex < visibleCards.length - 1 ? '' : 'hidden';
  }

  function openLightbox(card) {
    visibleCards = getVisibleCards();
    const title = card.dataset.title;
    currentCardIndex = visibleCards.findIndex(c => c.dataset.title === title);
    if (currentCardIndex === -1) currentCardIndex = 0;

    populateLightbox(visibleCards[currentCardIndex]);
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  galleryGrid.addEventListener('click', e => {
    const card = e.target.closest('.obra-card');
    if (card) openLightbox(card);
  });

  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });

  document.getElementById('lightboxPrev').addEventListener('click', () => {
    if (currentCardIndex > 0) {
      currentCardIndex--;
      populateLightbox(visibleCards[currentCardIndex]);
    }
  });

  document.getElementById('lightboxNext').addEventListener('click', () => {
    if (currentCardIndex < visibleCards.length - 1) {
      currentCardIndex++;
      populateLightbox(visibleCards[currentCardIndex]);
    }
  });

  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft')  document.getElementById('lightboxPrev').click();
    if (e.key === 'ArrowRight') document.getElementById('lightboxNext').click();
  });

});
