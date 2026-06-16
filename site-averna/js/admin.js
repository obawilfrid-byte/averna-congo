// =============================================
// AVERNA – Script admin
// =============================================

const ADMIN_PASSWORD = 'averna2025';
const API_BASE = 'http://localhost:3000/api';

let allData = [];

// ---- LOGIN ----
const loginBtn = document.getElementById('loginBtn');
const loginOverlay = document.getElementById('loginOverlay');
const dashboard = document.getElementById('dashboard');

if (loginBtn) {
  loginBtn.addEventListener('click', () => {
    const pwd = document.getElementById('adminPassword').value;
    if (pwd === ADMIN_PASSWORD) {
      loginOverlay.style.display = 'none';
      dashboard.style.display = 'block';
      loadInscriptions();
    } else {
      const err = document.getElementById('login-err');
      if (err) err.textContent = 'Mot de passe incorrect.';
    }
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
    dashboard.style.display = 'none';
    document.getElementById('adminPassword').value = '';
    document.getElementById('login-err').textContent = '';
  });
}

// ---- LOAD DATA ----
async function loadInscriptions() {
  try {
    const res = await fetch(`${API_BASE}/inscriptions`);
    allData = await res.json();
    updateStats(allData);
    renderTable(allData);
  } catch {
    document.getElementById('tableBody').innerHTML =
      '<tr><td colspan="8" class="table-empty">Erreur de connexion au serveur. Vérifiez que le serveur tourne sur le port 3000.</td></tr>';
  }
}

// ---- STATS ----
function updateStats(data) {
  document.getElementById('totalCount').textContent    = data.length;
  document.getElementById('enAttenteCount').textContent = data.filter(d => d.statut === 'En attente').length;
  document.getElementById('contacteCount').textContent  = data.filter(d => d.statut === 'Contacté').length;
  document.getElementById('abonneCount').textContent    = data.filter(d => d.statut === 'Abonné').length;
}

// ---- RENDER TABLE ----
function renderTable(data) {
  const tbody = document.getElementById('tableBody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Aucun inscrit pour le moment.</td></tr>';
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

// ---- UPDATE STATUT ----
async function updateStatut(select) {
  const id = select.getAttribute('data-id');
  const statut = select.value;

  try {
    const res = await fetch(`${API_BASE}/inscription/${id}/statut`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ statut })
    });

    if (res.ok) {
      const idx = allData.findIndex(d => d.id === id);
      if (idx !== -1) allData[idx].statut = statut;
      updateStats(allData);
      // Refresh badge in row
      const row = select.closest('tr');
      if (row) {
        const badge = row.querySelector('.status-badge');
        if (badge) {
          badge.textContent = statut;
          badge.className = 'status-badge';
          if (statut === 'En attente') badge.classList.add('attente');
          else if (statut === 'Contacté') badge.classList.add('contacte');
          else badge.classList.add('abonne');
        }
      }
    }
  } catch {
    alert('Erreur lors de la mise à jour du statut.');
  }
}

// ---- FILTRES ----
const filterQ = document.getElementById('filterQuartier');
const filterS = document.getElementById('filterStatut');
const resetF  = document.getElementById('resetFilters');

function applyFilters() {
  const q = filterQ ? filterQ.value : '';
  const s = filterS ? filterS.value : '';
  const filtered = allData.filter(d => {
    return (!q || d.quartier === q) && (!s || d.statut === s);
  });
  renderTable(filtered);
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

// ---- EXPORT CSV ----
const exportBtn = document.getElementById('exportCSV');
if (exportBtn) {
  exportBtn.addEventListener('click', async () => {
    try {
      const res = await fetch(`${API_BASE}/export-csv`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `averna-inscrits-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Erreur lors de l\'export CSV. Vérifiez que le serveur est démarré.');
    }
  });
}
