// =============================================
// Netlify Function — Récupération des inscriptions AVERNA
// Appel Netlify Forms API côté serveur (token sécurisé via env vars)
// =============================================

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Méthode non autorisée' };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { body = {}; }

  // Vérification du mot de passe admin
  if (body.password !== process.env.ADMIN_PASSWORD) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Mot de passe incorrect.' })
    };
  }

  const siteId = process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_API_TOKEN;

  if (!siteId || !token) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Variables d\'environnement manquantes. Configurez NETLIFY_SITE_ID et NETLIFY_API_TOKEN dans le dashboard Netlify.'
      })
    };
  }

  try {
    // 1. Lister les formulaires du site pour trouver "inscription-averna"
    const formsRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/forms`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const forms = await formsRes.json();
    const form  = Array.isArray(forms) && forms.find(f => f.name === 'inscription-averna');

    if (!form) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([])
      };
    }

    // 2. Récupérer les soumissions (max 100)
    const subRes = await fetch(
      `https://api.netlify.com/api/v1/forms/${form.id}/submissions?per_page=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const subs = await subRes.json();

    const data = subs.map(s => ({
      id:         s.id,
      date:       s.created_at,
      nom:        s.data.nom        || '',
      prenom:     s.data.prenom     || '',
      telephone:  s.data.telephone  || '',
      whatsapp:   s.data.whatsapp   || '',
      quartier:   s.data.quartier   || '',
      adresse:    s.data.adresse    || '',
      typeClient: s.data.typeClient || '',
      taillebac:  s.data.taillebac  || '',
      frequence:  s.data.frequence  || '',
      message:    s.data.message    || ''
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erreur serveur : ' + err.message })
    };
  }
};
