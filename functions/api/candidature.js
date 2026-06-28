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
//
// 📧 NOTIFICATION : si la variable RESEND_API_KEY est présente,
// un email récapitulatif est envoyé à recrutement@avernacongo.com
// à chaque candidature (via le service Resend). L'envoi est en
// arrière-plan (waitUntil) : une panne d'email n'empêche JAMAIS
// l'enregistrement de la candidature.
// Variables optionnelles : RESEND_API_KEY · RECRUT_FROM · RECRUT_TO
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

  // --- 📧 Notification email (arrière-plan, sans bloquer la réponse) ---
  // Si Resend n'est pas configuré, on ne fait rien : la candidature
  // est déjà enregistrée et visible dans le CRM.
  if (env.RESEND_API_KEY) {
    context.waitUntil(envoyerNotifRecrutement(env, ligne).catch(() => {}));
  }

  return json({ ok: true });
}

// =============================================================
// Envoi de l'email de notification via Resend
// =============================================================
async function envoyerNotifRecrutement(env, c) {
  const from = env.RECRUT_FROM || 'AVERNA Recrutement <recrutement@avernacongo.com>';
  const to   = env.RECRUT_TO   || 'recrutement@avernacongo.com';

  const poste = c.poste || 'Candidature spontanée';
  const sujet = `🧑‍💼 Nouvelle candidature — ${poste}`;

  // Construit les lignes du tableau seulement pour les champs remplis
  const lignes = [
    ['Poste',            c.poste],
    ['Nom',              [c.prenom, c.nom].filter(Boolean).join(' ')],
    ['Téléphone',        c.telephone],
    ['WhatsApp',         c.whatsapp],
    ['Quartier',         c.quartier],
    ['Conduit le Kavaki', c.conduitTricycle],
    ['Permis A',         c.permisA],
    ['Expérience',       c.experience],
    ['Disponibilité',    c.disponibilite],
    ['Message',          c.message]
  ].filter(([, v]) => v);

  const rows = lignes.map(([k, v]) =>
    `<tr>
       <td style="padding:6px 12px;font-weight:600;color:#0b5d3b;white-space:nowrap;vertical-align:top">${echap(k)}</td>
       <td style="padding:6px 12px;color:#222">${echap(v).replace(/\n/g, '<br>')}</td>
     </tr>`
  ).join('');

  // Liens d'action rapides (appel + WhatsApp)
  const tel = (c.telephone || '').replace(/[^0-9+]/g, '');
  const wa  = (c.whatsapp || c.telephone || '').replace(/[^0-9]/g, '');
  const actions =
    `<p style="margin:18px 0 0">` +
    (tel ? `<a href="tel:${tel}" style="display:inline-block;margin-right:10px;background:#0b5d3b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">📞 Appeler</a>` : '') +
    (wa  ? `<a href="https://wa.me/${wa.startsWith('242') ? wa : '242' + wa}" style="display:inline-block;background:#25d366;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">💬 WhatsApp</a>` : '') +
    `</p>`;

  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;border:1px solid #e3e3e3;border-radius:12px;overflow:hidden">
       <div style="background:#0b5d3b;color:#fff;padding:18px 22px">
         <h2 style="margin:0;font-size:18px">AVERNA ETS — Nouvelle candidature</h2>
         <p style="margin:4px 0 0;opacity:.85;font-size:13px">Déposée sur www.avernacongo.com</p>
       </div>
       <div style="padding:18px 22px">
         <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
         ${actions}
         <p style="margin:22px 0 0;font-size:12px;color:#888">Retrouvez cette candidature dans le CRM → Personnel → Recrutement.</p>
       </div>
     </div>`;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from, to, subject: sujet, html })
  });

  // En cas d'échec, on log côté Cloudflare sans casser la réponse au site
  if (!resp.ok) {
    console.log('Resend KO', resp.status, await resp.text());
  }
}

// Échappe le HTML pour éviter toute injection dans l'email
function echap(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
