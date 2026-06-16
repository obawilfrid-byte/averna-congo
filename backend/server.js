const express    = require('express');
const cors       = require('cors');
const bodyParser = require('body-parser');
const fs         = require('fs');
const path       = require('path');
const { v4: uuidv4 } = require('uuid');

const app    = express();
const PORT   = 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// ---- Middleware ----
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..')));

// ---- Helpers ----
function readDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ---- Routes ----

// POST /api/inscription
app.post('/api/inscription', (req, res) => {
  const { nom, prenom, telephone, quartier, adresse, typeClient, taillebac, frequence } = req.body;

  if (!nom || !prenom || !telephone || !quartier || !adresse) {
    return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis.' });
  }

  const db = readDB();
  const entry = {
    id:         uuidv4(),
    date:       new Date().toISOString(),
    nom:        nom.trim(),
    prenom:     prenom.trim(),
    telephone:  telephone.trim(),
    whatsapp:   (req.body.whatsapp || '').trim(),
    quartier,
    adresse:    adresse.trim(),
    typeClient: typeClient || 'Particulier',
    taillebac:  taillebac  || '100L',
    frequence:  frequence  || '2 fois/semaine',
    message:    (req.body.message || '').trim(),
    statut:     'En attente'
  };

  db.push(entry);
  writeDB(db);

  res.status(201).json({ message: 'Inscription enregistrée avec succès.', id: entry.id });
});

// GET /api/inscriptions
app.get('/api/inscriptions', (req, res) => {
  const db = readDB();
  res.json(db);
});

// PUT /api/inscription/:id/statut
app.put('/api/inscription/:id/statut', (req, res) => {
  const { id } = req.params;
  const { statut } = req.body;

  const validStatuts = ['En attente', 'Contacté', 'Abonné'];
  if (!validStatuts.includes(statut)) {
    return res.status(400).json({ message: 'Statut invalide.' });
  }

  const db  = readDB();
  const idx = db.findIndex(e => e.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Inscription introuvable.' });

  db[idx].statut = statut;
  writeDB(db);

  res.json({ message: 'Statut mis à jour.', entry: db[idx] });
});

// GET /api/export-csv
app.get('/api/export-csv', (req, res) => {
  const db = readDB();

  const headers = ['Date', 'Nom', 'Prénom', 'Téléphone', 'WhatsApp', 'Arrondissement', 'Adresse', 'Type', 'Bac', 'Fréquence', 'Message', 'Statut'];
  const rows = db.map(e => [
    new Date(e.date).toLocaleDateString('fr-FR'),
    e.nom, e.prenom, e.telephone, e.whatsapp,
    e.quartier, e.adresse, e.typeClient,
    e.taillebac, e.frequence, e.message, e.statut
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'));

  const csv = '﻿' + [headers.join(';'), ...rows].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="averna-inscrits.csv"');
  res.send(csv);
});

// ---- Start ----
app.listen(PORT, () => {
  console.log(`\n✅ Serveur AVERNA démarré sur http://localhost:${PORT}`);
  console.log(`   → Page d'accueil : http://localhost:${PORT}/index.html`);
  console.log(`   → Inscription    : http://localhost:${PORT}/inscription.html`);
  console.log(`   → Admin          : http://localhost:${PORT}/admin.html\n`);
});
