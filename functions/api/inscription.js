// =============================================================
// AVERNA — Cloudflare Pages Function : réception d'une inscription
// Route : POST /api/inscription
// -------------------------------------------------------------
// Reçoit le formulaire du site vitrine et l'enregistre dans
// Supabase (table « inscriptions »). Remplace l'ancien
// Netlify Forms (migration Cloudflare Pages du 20/06/2026).
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
    nom:        champ(d.nom),
    prenom:     champ(d.prenom),
    telephone:  champ(d.telephone),
    whatsapp:   champ(d.whatsapp),
    quartier:   champ(d.quartier),
    adresse:    champ(d.adresse),
    typeClient: champ(d.typeClient),
    taillebac:  champ(d.taillebac),
    frequence:  champ(d.frequence),
    message:    champ(d.message)
  };

  // --- Insertion via l'API REST de Supabase (clé service = contourne RLS) ---
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/inscriptions`, {
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

// -------------------------------------------------------------
// DIAGNOSTIC TEMPORAIRE (GET /api/inscription) — à retirer après.
// N'expose JAMAIS la clé : seulement présence + longueur + le
// résultat d'un test de lecture Supabase (statut + message).
// -------------------------------------------------------------
export async function onRequestGet(context) {
  const { env } = context;
  const diag = {
    hasUrl:      !!env.SUPABASE_URL,
    hasKey:      !!env.SUPABASE_SERVICE_KEY,
    hasAdminPwd: !!env.ADMIN_PASSWORD,
    keyLen:      env.SUPABASE_SERVICE_KEY ? env.SUPABASE_SERVICE_KEY.length : 0,
    keyDebut:    env.SUPABASE_SERVICE_KEY ? env.SUPABASE_SERVICE_KEY.slice(0, 6) : ''
  };
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
    try {
      const r = await fetch(`${env.SUPABASE_URL}/rest/v1/inscriptions?select=id&limit=1`, {
        headers: {
          apikey:        env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`
        }
      });
      diag.supabaseStatus = r.status;
      diag.supabaseBody   = (await r.text()).slice(0, 300);
    } catch (e) {
      diag.supabaseError = String(e);
    }
  }
  return new Response(JSON.stringify(diag, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
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
