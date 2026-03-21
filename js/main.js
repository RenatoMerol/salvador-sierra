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


  // ── 3. GALLERY FILTER ───────────────────────────────────────────

  const filterBtns = document.querySelectorAll('.filter-btn');
  const obraCards  = document.querySelectorAll('.obra-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      obraCards.forEach(card => {
        const match = filter === 'all' || card.dataset.category === filter;

        if (match) {
          card.style.display = '';
          // small delay so display:'' registers before opacity transition
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

  const revealEls = document.querySelectorAll('.reveal');
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  revealEls.forEach(el => revealObs.observe(el));


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

});
