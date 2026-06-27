// =============================================================
// AVERNA — Formulaire de candidature (page recrutement.html)
// -------------------------------------------------------------
// Envoie la candidature vers la Cloudflare Pages Function
// /api/candidature (stockage Supabase, table « candidatures »).
// Le header, le menu burger et l'animation des cartes radio
// sont gérés par main.js (chargé avant ce script).
// =============================================================

// ---- Sélection visuelle des cartes « poste » ----
document.querySelectorAll('#posteGrid .type-card').forEach(card => {
  const input = card.querySelector('input[type="radio"]');
  if (!input) return;
  if (input.checked) card.classList.add('selected');
  input.addEventListener('change', () => {
    document.querySelectorAll('#posteGrid .type-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
  });
});

// ---- Formulaire candidature ----
const candForm = document.getElementById('candidatureForm');
if (candForm) {

  function showCandError(id, msg) {
    const err   = document.getElementById(id + '-err');
    const input = document.getElementById(id);
    if (err)   err.textContent = msg;
    if (input) input.classList.toggle('error', !!msg);
  }

  function clearCandErrors() {
    ['nom','prenom','telephone'].forEach(f => showCandError(f, ''));
    const ce = document.getElementById('consent-err');
    if (ce) ce.textContent = '';
  }

  function validateCand() {
    let ok = true;
    clearCandErrors();
    if (!candForm.nom.value.trim())       { showCandError('nom',       'Le nom est requis.');         ok = false; }
    if (!candForm.prenom.value.trim())    { showCandError('prenom',    'Le prénom est requis.');      ok = false; }
    if (!candForm.telephone.value.trim()) { showCandError('telephone', 'Le téléphone est requis.');   ok = false; }
    const consent = document.getElementById('consent');
    if (consent && !consent.checked) {
      const ce = document.getElementById('consent-err');
      if (ce) ce.textContent = 'Vous devez accepter les conditions.';
      ok = false;
    }
    return ok;
  }

  candForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateCand()) return;

    const btnText   = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    const submitBtn = document.getElementById('submitBtn');
    const globalErr = document.getElementById('form-global-error');

    submitBtn.disabled = true;
    if (btnText)   btnText.style.display   = 'none';
    if (btnLoader) btnLoader.style.display = 'inline';
    if (globalErr) globalErr.style.display = 'none';

    // Envoi vers la Cloudflare Pages Function (application/x-www-form-urlencoded)
    const body = new URLSearchParams({
      'bot-field':     (candForm.querySelector('[name="bot-field"]') || {}).value || '',
      nom:             candForm.nom.value.trim(),
      prenom:          candForm.prenom.value.trim(),
      telephone:       candForm.telephone.value.trim(),
      whatsapp:        candForm.whatsapp.value.trim(),
      poste:           (candForm.querySelector('input[name="poste"]:checked') || {}).value || '',
      quartier:        candForm.quartier.value.trim(),
      conduitTricycle: candForm.conduitTricycle.value,
      permisA:         candForm.permisA.value,
      experience:      candForm.experience.value,
      disponibilite:   candForm.disponibilite.value,
      message:         candForm.message.value.trim()
    });

    try {
      const res = await fetch('/api/candidature', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    body.toString()
      });

      if (res.ok) {
        candForm.style.display = 'none';
        document.getElementById('form-success').style.display = 'block';
      } else {
        if (globalErr) {
          globalErr.textContent = "Une erreur est survenue lors de l'envoi. Veuillez réessayer ou nous appeler directement.";
          globalErr.style.display = 'block';
        }
      }
    } catch {
      if (globalErr) {
        globalErr.textContent = 'Connexion impossible. Vérifiez votre connexion internet et réessayez.';
        globalErr.style.display = 'block';
      }
    } finally {
      submitBtn.disabled = false;
      if (btnText)   btnText.style.display   = 'inline';
      if (btnLoader) btnLoader.style.display = 'none';
    }
  });
}
