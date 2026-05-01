

/* ================================
   EVO APP STORE — app.js
   ================================ */

const APPS_JSON_URL = './apps.json';

let allApps = [];
let installedApps = new Set(JSON.parse(localStorage.getItem('evo_installed') || '[]'));
let activeTab = 'Todos';
let searchQuery = '';

/* ── Fetch apps ── */
async function loadApps() {
  try {
    const res = await fetch(APPS_JSON_URL);
    allApps = await res.json();
  } catch (e) {
    console.error('Falha ao carregar apps.json', e);
    allApps = [];
  }
  render();
}

/* ── Filtering ── */
function getFilteredApps() {
  return allApps.filter(app => {
    const matchTab = activeTab === 'Todos' || app.category === activeTab || app.tags.map(t => t.toLowerCase()).includes(activeTab.toLowerCase());
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || app.name.toLowerCase().includes(q) || app.shortDescription.toLowerCase().includes(q) || app.tags.some(t => t.includes(q));
    return matchTab && matchSearch;
  });
}

function getFeaturedApps() {
  return allApps.filter(a => a.featured);
}

/* ── Render ── */
function render() {
  renderFeatured();
  renderAppList();
  updateTabCounts();
}

function renderFeatured() {
  const section = document.getElementById('featured-section');
  const featured = getFeaturedApps();
  if (!featured.length || searchQuery || activeTab !== 'Todos') {
    section.style.display = 'none';
    return;
  }
  section.style.display = '';
  const carousel = document.getElementById('carousel');
  carousel.innerHTML = '';
  featured.forEach(app => {
    const card = document.createElement('div');
    card.className = 'featured-card';
    card.innerHTML = `
      <img class="featured-card-logo" src="${app.logo}" alt="${app.name}">
      <div class="featured-card-badge">${app.category}</div>
      <div class="featured-card-name">${app.name}</div>
      <div class="featured-card-desc">${app.shortDescription}</div>
      <div class="featured-card-footer">
        <span class="rating-chip"><span class="star">★</span> ${app.rating} · ${formatReviews(app.reviews)}</span>
        <button class="install-btn ${installedApps.has(app.id) ? 'installed' : ''}"
          onclick="event.stopPropagation(); handleInstall(event, '${app.id}')">
          ${installedApps.has(app.id) ? 'Abrir' : 'Instalar'}
        </button>
      </div>
    `;
    card.addEventListener('click', () => openModal(app.id));
    carousel.appendChild(card);
  });
}

function renderAppList() {
  const list = document.getElementById('app-list');
  const noResults = document.getElementById('no-results');
  const apps = getFilteredApps();

  list.innerHTML = '';
  if (!apps.length) {
    noResults.classList.add('visible');
    list.style.display = 'none';
    return;
  }
  noResults.classList.remove('visible');
  list.style.display = '';

  apps.forEach(app => {
    const row = document.createElement('div');
    row.className = 'app-row';
    const installed = installedApps.has(app.id);
    row.innerHTML = `
      <img class="app-logo" src="${app.logo}" alt="${app.name}">
      <div class="app-info">
        <div class="app-name">${app.name}</div>
        <div class="app-short-desc">${app.shortDescription}</div>
        <div class="app-tags">
          ${app.tags.slice(0, 3).map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
      </div>
      <button class="install-btn ${installed ? 'installed' : ''}"
        onclick="event.stopPropagation(); handleInstall(event, '${app.id}')">
        ${installed ? 'Abrir' : app.price === 'Grátis' ? 'Instalar' : app.price}
      </button>
    `;
    row.addEventListener('click', () => openModal(app.id));
    list.appendChild(row);
  });
}

/* ── Tabs ── */
const CATEGORIES = ['Todos', 'Utilitários', 'Música', 'Segurança', 'Fotografia', 'Clima'];

function renderTabs() {
  const container = document.getElementById('tabs');
  container.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (cat === activeTab ? ' active' : '');
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      activeTab = cat;
      renderTabs();
      render();
    });
    container.appendChild(btn);
  });
}

function updateTabCounts() {}

/* ── Search ── */
function initSearch() {
  const input = document.getElementById('search-input');
  const clear = document.getElementById('search-clear');

  input.addEventListener('input', () => {
    searchQuery = input.value.trim();
    clear.classList.toggle('visible', !!searchQuery);
    render();
  });

  clear.addEventListener('click', () => {
    input.value = '';
    searchQuery = '';
    clear.classList.remove('visible');
    input.focus();
    render();
  });
}

/* ── Modal ── */
function openModal(appId) {
  const app = allApps.find(a => a.id === appId);
  if (!app) return;
  const overlay = document.getElementById('modal-overlay');
  const sheet = document.getElementById('modal-sheet');
  const installed = installedApps.has(app.id);

  document.getElementById('modal-logo').src = app.logo;
  document.getElementById('modal-app-name').textContent = app.name;
  document.getElementById('modal-developer').textContent = app.developer;
  document.getElementById('modal-category').textContent = app.category;
  document.getElementById('modal-rating').textContent = app.rating;
  document.getElementById('modal-reviews').textContent = formatReviews(app.reviews);
  document.getElementById('modal-version').textContent = app.version;
  document.getElementById('modal-size').textContent = app.size;
  document.getElementById('modal-android').textContent = app.minAndroid;
  document.getElementById('modal-desc').textContent = app.description;

  const tagsRow = document.getElementById('modal-tags');
  tagsRow.innerHTML = app.tags.map(t => `<span class="tag">${t}</span>`).join('');

  const installBtn = document.getElementById('modal-install-btn');
  installBtn.textContent = installed ? '✓ Instalado' : '⬇ Instalar APK';
  installBtn.className = 'modal-install-btn' + (installed ? ' installed' : '');
  installBtn.onclick = () => handleInstall(null, app.id, app.apkUrl, true);

  overlay.classList.add('open');
  sheet.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  const sheet = document.getElementById('modal-sheet');
  overlay.classList.remove('open');
  sheet.classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Install logic ── */
function handleInstall(event, appId, apkUrl, fromModal = false) {
  if (event) event.stopPropagation();
  const app = allApps.find(a => a.id === appId);
  if (!app) return;

  if (installedApps.has(appId)) {
    showToast('✅', `${app.name} já está instalado`);
    return;
  }

  // Start install animation
  if (!fromModal && event) {
    const btn = event.currentTarget;
    btn.classList.add('installing');
    btn.textContent = 'Baixando...';
    btn.disabled = true;
  }

  const url = apkUrl || app.apkUrl;

  // Simulate download progress
  showProgress(appId);
  
  setTimeout(() => {
    installedApps.add(appId);
    saveInstalled();
    hideProgress();
    showToast('🚀', `${app.name} instalado com sucesso!`);
    render();

    if (fromModal) {
      const btn = document.getElementById('modal-install-btn');
      btn.textContent = '✓ Instalado';
      btn.classList.add('installed');
    }

    // Re-enable any button that was disabled during install
    if (!fromModal && event && event.currentTarget) {
      event.currentTarget.disabled = false;
    }

    // Trigger real APK download
    triggerApkDownload(url, app.name);
  }, 2200);
}

function triggerApkDownload(url, name) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name + '.apk';
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ── Progress ── */
let progressInterval = null;
function showProgress(appId) {
  const row = [...document.querySelectorAll('.app-row')].find(r => r.querySelector(`[onclick*="${appId}"]`));
  if (!row) return;

  let wrap = row.querySelector('.progress-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'progress-wrap';
    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    wrap.appendChild(bar);
    row.querySelector('.app-info').appendChild(wrap);
  }
  wrap.classList.add('visible');
  const bar = wrap.querySelector('.progress-bar');
  bar.style.width = '0%';

  let p = 0;
  clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    p += Math.random() * 12 + 4;
    if (p >= 95) { bar.style.width = '95%'; return; }
    bar.style.width = p + '%';
  }, 80);
}

function hideProgress() {
  clearInterval(progressInterval);
  document.querySelectorAll('.progress-wrap').forEach(w => {
    const bar = w.querySelector('.progress-bar');
    if (bar) bar.style.width = '100%';
    setTimeout(() => w.classList.remove('visible'), 400);
  });
}

/* ── Toast ── */
let toastTimeout;
function showToast(icon, msg) {
  const toast = document.getElementById('toast');
  toast.querySelector('.toast-icon').textContent = icon;
  toast.querySelector('.toast-msg').textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ── Helpers ── */
function formatReviews(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}

function saveInstalled() {
  localStorage.setItem('evo_installed', JSON.stringify([...installedApps]));
}

/* ── Clock ── */
function updateClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/* ── Nav ── */
function initNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  renderTabs();
  initSearch();
  initNav();
  updateClock();
  setInterval(updateClock, 60000);
  loadApps();

  // Modal close
  document.getElementById('modal-overlay').addEventListener('click', closeModal);
  document.getElementById('close-modal').addEventListener('click', closeModal);
});
