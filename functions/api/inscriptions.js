// =============================================================
// AVERNA — Cloudflare Pages Function : liste des inscriptions
// Route : POST /api/inscriptions  (espace admin)
// -------------------------------------------------------------
// Renvoie toutes les inscriptions stockées dans Supabase.
// Protégé par mot de passe (variable d'environnement ADMIN_PASSWORD).
// Remplace l'ancienne Netlify Function get-inscriptions.js.
//
// Variables requises : SUPABASE_URL · SUPABASE_SERVICE_KEY · ADMIN_PASSWORD
// =============================================================

export async function onRequestPost(context) {
  const { request, env } = context;

  // --- Mot de passe admin ---
  let body = {};
  try { body = await request.json(); } catch { body = {}; }

  if (!env.ADMIN_PASSWORD || body.password !== env.ADMIN_PASSWORD) {
    return json({ error: 'Mot de passe incorrect.' }, 401);
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return json({ error: 'Configuration serveur manquante (SUPABASE_URL / SUPABASE_SERVICE_KEY / ADMIN_PASSWORD).' }, 500);
  }

  // --- Lecture des inscriptions (les plus récentes d'abord) ---
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/inscriptions?select=*&order=created_at.desc&limit=500`,
    {
      headers: {
        apikey:        env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`
      }
    }
  );

  if (!res.ok) {
    const txt = await res.text();
    return json({ error: 'Lecture impossible : ' + txt }, 502);
  }

  const rows = await res.json();

  // Même forme que l'ancienne réponse (compatible avec admin.js)
  const data = rows.map((r) => ({
    id:         r.id,
    date:       r.created_at,
    nom:        r.nom        || '',
    prenom:     r.prenom     || '',
    telephone:  r.telephone  || '',
    whatsapp:   r.whatsapp   || '',
    quartier:   r.quartier   || '',
    adresse:    r.adresse    || '',
    typeClient: r.typeClient || '',
    taillebac:  r.taillebac  || '',
    frequence:  r.frequence  || '',
    message:    r.message    || '',
    // État de conversion écrit par le CRM (module Facturation) quand la
    // demande devient un abonné : statut « Convertie » + code client MK.
    // Permet à l'admin du site d'afficher « Abonné » automatiquement.
    statutCrm:  r.statut     || '',
    clientCode: r.clientCode || ''
  }));

  return json(data);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
