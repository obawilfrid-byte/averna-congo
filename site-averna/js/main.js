// =============================================
// AVERNA – Script principal v2
// =============================================

// ---- Header scroll ----
const header = document.getElementById('header');
if (header) {
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

// ---- Burger menu ----
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
if (burger && nav) {
  burger.addEventListener('click', () => {
    nav.classList.toggle('open');
  });
  nav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => nav.classList.remove('open'));
  });
  document.addEventListener('click', (e) => {
    if (!burger.contains(e.target) && !nav.contains(e.target)) {
      nav.classList.remove('open');
    }
  });
}

// ---- Compteurs animés ----
function animateCounter(el, target, duration = 1800) {
  let start = null;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
}

const statNums = document.querySelectorAll('.stat-num[data-target]');
if (statNums.length) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el     = entry.target;
        const target = parseInt(el.getAttribute('data-target'), 10);
        animateCounter(el, target);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  statNums.forEach(el => observer.observe(el));
}

// ---- Scroll reveal ----
const revealEls = document.querySelectorAll('.service-card, .temo-card, .q-card, .contact-card, .gallery-item');
if (revealEls.length && 'IntersectionObserver' in window) {
  revealEls.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = `opacity .5s ease ${i * 0.07}s, transform .5s ease ${i * 0.07}s`;
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealEls.forEach(el => revealObserver.observe(el));
}

// ---- Radio cards ----
function initRadioCards(selector) {
  document.querySelectorAll(selector).forEach(card => {
    const input = card.querySelector('input[type="radio"]');
    if (!input) return;
    if (input.checked) card.classList.add('selected');
    input.addEventListener('change', () => {
      document.querySelectorAll(selector).forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });
}
initRadioCards('.type-card');
initRadioCards('.bac-card');
initRadioCards('.freq-card');

// ---- Formulaire inscription ----
const form = document.getElementById('inscriptionForm');
if (form) {

  function showError(id, msg) {
    const err   = document.getElementById(id + '-err');
    const input = document.getElementById(id);
    if (err)   err.textContent = msg;
    if (input) input.classList.toggle('error', !!msg);
  }

  function clearErrors() {
    ['nom','prenom','telephone','quartier','adresse'].forEach(f => showError(f, ''));
    const ce = document.getElementById('consent-err');
    if (ce) ce.textContent = '';
  }

  function validate() {
    let ok = true;
    clearErrors();
    if (!form.nom.value.trim())       { showError('nom',       'Le nom est requis.');                          ok = false; }
    if (!form.prenom.value.trim())    { showError('prenom',    'Le prénom est requis.');                       ok = false; }
    if (!form.telephone.value.trim()) { showError('telephone', 'Le téléphone est requis.');                    ok = false; }
    if (!form.quartier.value)         { showError('quartier',  'Sélectionnez votre arrondissement.');           ok = false; }
    if (!form.adresse.value.trim())   { showError('adresse',   "L'adresse est requise.");                      ok = false; }
    const consent = document.getElementById('consent');
    if (consent && !consent.checked) {
      const ce = document.getElementById('consent-err');
      if (ce) ce.textContent = 'Vous devez accepter les conditions.';
      ok = false;
    }
    return ok;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const btnText   = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    const submitBtn = document.getElementById('submitBtn');
    const globalErr = document.getElementById('form-global-error');

    submitBtn.disabled = true;
    if (btnText)   btnText.style.display   = 'none';
    if (btnLoader) btnLoader.style.display = 'inline';
    if (globalErr) globalErr.style.display = 'none';

    const payload = {
      nom:        form.nom.value.trim(),
      prenom:     form.prenom.value.trim(),
      telephone:  form.telephone.value.trim(),
      whatsapp:   form.whatsapp.value.trim(),
      quartier:   form.quartier.value,
      adresse:    form.adresse.value.trim(),
      typeClient: (form.querySelector('input[name="typeClient"]:checked') || {}).value || '',
      taillebac:  (form.querySelector('input[name="taillebac"]:checked')  || {}).value || '',
      frequence:  (form.querySelector('input[name="frequence"]:checked')  || {}).value || '',
      message:    form.message.value.trim()
    };

    try {
      const res  = await fetch('http://localhost:3000/api/inscription', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        form.style.display = 'none';
        document.getElementById('form-success').style.display = 'block';
      } else {
        if (globalErr) {
          globalErr.textContent = data.message || 'Une erreur est survenue.';
          globalErr.style.display = 'block';
        }
      }
    } catch {
      if (globalErr) {
        globalErr.textContent = 'Impossible de contacter le serveur. Vérifiez que le serveur est démarré (npm start).';
        globalErr.style.display = 'block';
      }
    } finally {
      submitBtn.disabled = false;
      if (btnText)   btnText.style.display   = 'inline';
      if (btnLoader) btnLoader.style.display = 'none';
    }
  });
}
