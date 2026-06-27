// =============================================================
// AVERNA — Cloudflare Pages Function : réception d'une candidature
// Route : POST /api/candidature
// -------------------------------------------------------------
// Reçoit le formulaire de recrutement du site et l'enregistre
// dans Supabase (table « candidatures »). Même mécanisme que
// /api/inscription.
//
// La clé Supabase est lue dans les variables d'environnement
// Cloudflare (côté serveur) → JAMAIS exposée au navigateur.
// Variables requises : SUPABASE_URL · SUPABASE_SERVICE_KEY
// =============================================================

export async function onRequestPost(context) {
  const { request, env } = context;

  // --- Lecture du corps (formulaire urlencoded OU JSON) ---
  let d = {};
  const ct = request.headers.get('content-type') || '';
  try {
    if (ct.includes('application/json')) {
      d = await request.json();
    } else {
      const form = await request.formData();
      for (const [cle, val] of form.entries()) d[cle] = val;
    }
  } catch {
    return json({ error: 'Données illisibles.' }, 400);
  }

  // --- Anti-robot : si le champ piège « bot-field » est rempli,
  //     c'est un bot → on répond OK sans rien enregistrer. ---
  if (d['bot-field']) return json({ ok: true });

  // --- Champs obligatoires ---
  if (!champ(d.nom) || !champ(d.telephone)) {
    return json({ error: 'Le nom et le téléphone sont obligatoires.' }, 400);
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return json({ error: 'Configuration serveur manquante (SUPABASE_URL / SUPABASE_SERVICE_KEY).' }, 500);
  }

  // --- Ligne à insérer ---
  const ligne = {
    nom:             champ(d.nom),
    prenom:          champ(d.prenom),
    telephone:       champ(d.telephone),
    whatsapp:        champ(d.whatsapp),
    poste:           champ(d.poste),
    quartier:        champ(d.quartier),
    conduitTricycle: champ(d.conduitTricycle),
    permisA:         champ(d.permisA),
    experience:      champ(d.experience),
    disponibilite:   champ(d.disponibilite),
    message:         champ(d.message)
  };

  // --- Insertion via l'API REST de Supabase (clé service = contourne RLS) ---
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/candidatures`, {
    method: 'POST',
    headers: {
      apikey:        env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer:        'return=minimal'
    },
    body: JSON.stringify(ligne)
  });

  if (!res.ok) {
    const txt = await res.text();
    return json({ error: 'Enregistrement impossible : ' + txt }, 502);
  }

  return json({ ok: true });
}

// Nettoie une valeur (chaîne, sans espaces superflus)
function champ(v) {
  return (v == null ? '' : String(v)).trim();
}

// Réponse JSON standardisée
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
