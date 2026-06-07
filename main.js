'use strict';

let cards = [];
let currentCardId = null;

/* ─── Init ───────────────────────────────────────────────────── */
async function init() {
  try {
    const res = await fetch('cards.json');
    cards = await res.json();
  } catch (e) {
    console.error('Could not load cards.json:', e);
    return;
  }

  renderCardGrid();
  renderMoodGrid();
  setupNav();
  setupModal();
  setupDrawView();
  handleDeepLink();
}

/* ─── Card HTML factory ──────────────────────────────────────── */
function buildCardHTML(card) {
  return `
    <div class="card"
         data-id="${card.id}"
         tabindex="0"
         role="button"
         aria-label="Open blueprint: ${card.title}">
      <div class="card-bg" style="background: ${card.gradient};"></div>
      <img
        class="card-img"
        src="images/${String(card.id).padStart(2,'0')}.jpg"
        alt=""
        loading="lazy"
        aria-hidden="true"
        onerror="this.style.display='none'"
      >
      <div class="card-vignette"></div>
      <div class="card-badge">${card.id}</div>
      <div class="card-body">
        <div class="card-label">Blueprint ${String(card.id).padStart(2,'0')}</div>
        <div class="card-title">${card.title}</div>
        <div class="card-source">${card.sourceText}</div>
      </div>
    </div>`;
}

/* ─── Grid ───────────────────────────────────────────────────── */
function renderCardGrid() {
  const grid = document.getElementById('cardsGrid');
  grid.innerHTML = cards.map(buildCardHTML).join('');

  grid.querySelectorAll('.card').forEach(el => {
    el.addEventListener('click', () => openModal(+el.dataset.id));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(+el.dataset.id);
      }
    });
  });
}

/* ─── Mood Grid ──────────────────────────────────────────────── */
function renderMoodGrid() {
  const grid = document.getElementById('moodGrid');
  grid.innerHTML = cards.map(card => `
    <div class="mood-chip"
         data-id="${card.id}"
         tabindex="0"
         role="button"
         aria-label="I feel ${card.mood} — open ${card.title}">
      <span class="mood-chip-feeling">${card.mood}</span>
      <span class="mood-chip-title">→ ${card.title}</span>
    </div>`).join('');

  grid.querySelectorAll('.mood-chip').forEach(el => {
    const openFn = () => openModal(+el.dataset.id);
    el.addEventListener('click', openFn);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFn(); }
    });
  });
}

/* ─── Navigation ─────────────────────────────────────────────── */
function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      document.getElementById(`view-${btn.dataset.view}`).classList.add('active');
    });
  });
}

/* ─── Modal ──────────────────────────────────────────────────── */
function setupModal() {
  const overlay = document.getElementById('modalOverlay');
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalPrev').addEventListener('click', () => navigateModal(-1));
  document.getElementById('modalNext').addEventListener('click', () => navigateModal(1));

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape')      closeModal();
    if (e.key === 'ArrowLeft')   navigateModal(-1);
    if (e.key === 'ArrowRight')  navigateModal(1);
  });
}

function openModal(id) {
  const card = cards.find(c => c.id === id);
  if (!card) return;
  currentCardId = id;

  // Build image panel
  document.getElementById('modalImagePanel').innerHTML = `
    <div class="modal-img-bg" style="background: ${card.gradient};"></div>
    <img
      class="modal-img"
      src="images/${String(card.id).padStart(2,'0')}.jpg"
      alt="${card.title}"
      onerror="this.style.display='none'"
    >
    <div class="modal-img-overlay"></div>
    <div class="modal-img-info">
      <div class="modal-number">Blueprint ${String(card.id).padStart(2,'0')} of 25</div>
      <h2 class="modal-title">${card.title}</h2>
      <p class="modal-source">${card.sourceText}</p>
    </div>`;

  // Build content panel
  document.getElementById('modalContentPanel').innerHTML = `
    <p class="modal-hook">${card.hook}</p>

    <div class="modal-section">
      <div class="modal-section-label">When to use it</div>
      <p class="modal-section-text">${card.when}</p>
    </div>

    <div class="modal-section">
      <div class="modal-section-label">The Neuroscience</div>
      <p class="modal-section-text">${card.neuroscience}</p>
    </div>

    <div class="modal-section">
      <div class="modal-section-label">In Everyday Life</div>
      <p class="modal-section-text">${card.everyday}</p>
    </div>

    <div class="modal-practice">
      <div class="modal-practice-label">Try It Now</div>
      <p class="modal-practice-text">${card.practice}</p>
    </div>

    ${card.imageCredit
      ? `<p class="modal-image-credit">Image source: ${card.imageCredit}</p>`
      : ''}`;

  document.getElementById('modalContentPanel').scrollTop = 0;
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';

  // Deep link
  history.pushState(null, '', `#card/${id}`);
  document.getElementById('modalClose').focus();
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
  history.pushState(null, '', window.location.pathname + window.location.search);
}

function navigateModal(dir) {
  const idx = cards.findIndex(c => c.id === currentCardId);
  const next = cards[(idx + dir + cards.length) % cards.length];
  openModal(next.id);
}

/* ─── Draw View ──────────────────────────────────────────────── */
function setupDrawView() {
  document.getElementById('drawBtn').addEventListener('click', drawCard);
}

function drawCard() {
  const card = cards[Math.floor(Math.random() * cards.length)];
  const drawArea = document.getElementById('drawArea');

  drawArea.innerHTML = `
    <div class="drawn-state">
      <div class="drawn-card-wrap">
        ${buildCardHTML(card)}
      </div>
      <div class="draw-actions">
        <button class="btn-open" data-id="${card.id}">Open This Blueprint</button>
        <button class="btn-again">Draw Again</button>
      </div>
    </div>`;

  const cardEl = drawArea.querySelector('.card');
  cardEl.addEventListener('click', () => openModal(card.id));
  cardEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(card.id); }
  });

  drawArea.querySelector('.btn-open').addEventListener('click', () => openModal(card.id));
  drawArea.querySelector('.btn-again').addEventListener('click', drawCard);
}

/* ─── Deep Link ──────────────────────────────────────────────── */
function handleDeepLink() {
  const match = window.location.hash.match(/^#card\/(\d+)$/);
  if (match) openModal(+match[1]);
}

/* ─── Start ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', init);
