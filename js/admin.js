// =============================================
// AVERNA – Script admin (Netlify Forms)
// Les inscriptions sont récupérées via la Netlify Function get-inscriptions.js
// Les statuts sont conservés dans localStorage (persistance locale)
// =============================================

let allData = [];
let adminPassword = '';

// Clé localStorage pour les statuts
const STATUTS_KEY = 'averna_admin_statuts';

function loadStatuts() {
  try { return JSON.parse(localStorage.getItem(STATUTS_KEY) || '{}'); } catch { return {}; }
}
function saveStatut(id, statut) {
  const map = loadStatuts();
  map[id] = statut;
  localStorage.setItem(STATUTS_KEY, JSON.stringify(map));
}

// ---- LOGIN ----
const loginBtn     = document.getElementById('loginBtn');
const loginOverlay = document.getElementById('loginOverlay');
const dashboard    = document.getElementById('dashboard');

if (loginBtn) {
  loginBtn.addEventListener('click', () => {
    adminPassword = document.getElementById('adminPassword').value;
    if (!adminPassword) {
      const err = document.getElementById('login-err');
      if (err) err.textContent = 'Entrez le mot de passe.';
      return;
    }
    // On tente de charger les données pour valider le mot de passe
    loadInscriptions();
  });

  document.getElementById('adminPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') loginBtn.click();
  });
}

// ---- LOGOUT ----
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    loginOverlay.style.display = 'flex';
    dashboard.style.display    = 'none';
    document.getElementById('adminPassword').value = '';
    document.getElementById('login-err').textContent = '';
    adminPassword = '';
    allData = [];
  });
}

// ---- LOAD DATA via Netlify Function ----
async function loadInscriptions() {
  const loginErr = document.getElementById('login-err');
  const tbody    = document.getElementById('tableBody');

  if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Chargement...</td></tr>';

  try {
    const res  = await fetch('/.netlify/functions/get-inscriptions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password: adminPassword })
    });
    const data = await res.json();

    if (res.status === 401) {
      if (loginErr) loginErr.textContent = data.error || 'Mot de passe incorrect.';
      if (tbody) tbody.innerHTML = '';
      return;
    }

    if (!res.ok) {
      throw new Error(data.error || 'Erreur serveur');
    }

    // Connexion réussie : afficher le dashboard
    loginOverlay.style.display = 'none';
    dashboard.style.display    = 'block';

    // Fusionner avec les statuts sauvegardés localement
    const statuts = loadStatuts();
    allData = data.map(d => ({ ...d, statut: statuts[d.id] || 'En attente' }));

    updateStats(allData);
    renderTable(allData);

  } catch (err) {
    if (loginErr) loginErr.textContent = '';
    if (dashboard.style.display === 'block') {
      // Déjà connecté — afficher l'erreur dans le tableau
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="table-empty">
        Erreur : ${err.message}<br/>
        <small>Vérifiez les variables d'environnement NETLIFY_SITE_ID, NETLIFY_API_TOKEN et ADMIN_PASSWORD dans le dashboard Netlify.</small>
      </td></tr>`;
    } else {
      if (loginErr) loginErr.textContent = 'Connexion impossible. Vérifiez votre connexion internet.';
    }
  }
}

// ---- STATS ----
function updateStats(data) {
  document.getElementById('totalCount').textContent     = data.length;
  document.getElementById('enAttenteCount').textContent = data.filter(d => d.statut === 'En attente').length;
  document.getElementById('contacteCount').textContent  = data.filter(d => d.statut === 'Contacté').length;
  document.getElementById('abonneCount').textContent    = data.filter(d => d.statut === 'Abonné').length;
}

// ---- RENDER TABLE ----
function renderTable(data) {
  const tbody = document.getElementById('tableBody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Aucune inscription reçue pour le moment.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(row => {
    const date = new Date(row.date).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
    const badgeClass = row.statut === 'En attente' ? 'attente' : row.statut === 'Contacté' ? 'contacte' : 'abonne';
    return `
      <tr>
        <td>${date}</td>
        <td><strong>${row.nom} ${row.prenom}</strong></td>
        <td>${row.telephone}</td>
        <td>${row.quartier}</td>
        <td>${row.taillebac}</td>
        <td>${row.frequence}</td>
        <td><span class="status-badge ${badgeClass}">${row.statut}</span></td>
        <td>
          <select class="status-select" data-id="${row.id}" onchange="updateStatut(this)">
            <option value="En attente" ${row.statut === 'En attente' ? 'selected' : ''}>En attente</option>
            <option value="Contacté"   ${row.statut === 'Contacté'   ? 'selected' : ''}>Contacté</option>
            <option value="Abonné"     ${row.statut === 'Abonné'     ? 'selected' : ''}>Abonné</option>
          </select>
        </td>
      </tr>
    `;
  }).join('');
}

// ---- UPDATE STATUT (localStorage) ----
function updateStatut(select) {
  const id     = select.getAttribute('data-id');
  const statut = select.value;

  // Sauvegarder localement
  saveStatut(id, statut);

  // Mettre à jour allData
  const idx = allData.findIndex(d => d.id === id);
  if (idx !== -1) allData[idx].statut = statut;

  // Actualiser les stats et le badge
  updateStats(allData);
  const row = select.closest('tr');
  if (row) {
    const badge = row.querySelector('.status-badge');
    if (badge) {
      badge.textContent = statut;
      badge.className   = 'status-badge';
      if (statut === 'En attente') badge.classList.add('attente');
      else if (statut === 'Contacté') badge.classList.add('contacte');
      else badge.classList.add('abonne');
    }
  }
}

// ---- FILTRES ----
const filterQ = document.getElementById('filterQuartier');
const filterS = document.getElementById('filterStatut');
const resetF  = document.getElementById('resetFilters');

function applyFilters() {
  const q = filterQ ? filterQ.value : '';
  const s = filterS ? filterS.value : '';
  renderTable(allData.filter(d => (!q || d.quartier === q) && (!s || d.statut === s)));
}

if (filterQ) filterQ.addEventListener('change', applyFilters);
if (filterS) filterS.addEventListener('change', applyFilters);
if (resetF) {
  resetF.addEventListener('click', () => {
    if (filterQ) filterQ.value = '';
    if (filterS) filterS.value = '';
    renderTable(allData);
  });
}

// ---- EXPORT CSV (généré côté client) ----
const exportBtn = document.getElementById('exportCSV');
if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    if (!allData.length) { alert('Aucune donnée à exporter.'); return; }

    const header = ['Date','Nom','Prénom','Téléphone','WhatsApp','Arrondissement','Adresse','Type client','Taille bac','Fréquence','Message','Statut'];
    const rows   = allData.map(d => [
      new Date(d.date).toLocaleDateString('fr-FR'),
      d.nom, d.prenom, d.telephone, d.whatsapp,
      d.quartier, d.adresse, d.typeClient, d.taillebac, d.frequence,
      (d.message || '').replace(/"/g, '""'),
      d.statut
    ].map(v => `"${v}"`).join(','));

    const csv  = [header.join(','), ...rows].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `averna-inscrits-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}
