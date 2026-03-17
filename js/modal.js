// Modal de editar/adicionar produto

// ══════════════════════════════════════════
// MODAL EDIT/ADD
// ══════════════════════════════════════════
let editingIdx = -1;
// gallery: array of { b64: string, mime: string }
let currentGallery = [];
let currentColors  = [];

// Presets de cores comuns para produtos pet
const COLOR_PRESETS = [
  '#E53E3E','#F6AD55','#F6E05E','#68D391','#4FD1C5',
  '#63B3ED','#B794F4','#FC8181','#FEFCBF','#C6F6D5',
  '#1E1A16','#FFFFFF','#A0AEC0','#ED64A6','#76E4F7'
];

function openEditModal(idx) {
  editingIdx = idx;
  const p = products[idx];
  document.getElementById('modalTitle').textContent = 'Editar Produto';
  document.getElementById('btnDelete').style.display = 'flex';
  document.getElementById('btnDuplicate').style.display = 'flex';
  document.getElementById('btnToggleActive').style.display = 'flex';
  if(p.ativo === false) {
    document.getElementById('btnToggleActive').textContent = '▶ Ativar';
    document.getElementById('btnToggleActive').style.backgroundColor = '#38A169';
  } else {
    document.getElementById('btnToggleActive').textContent = '⏸ Desativar';
    document.getElementById('btnToggleActive').style.backgroundColor = '#D69E2E';
  }
  document.getElementById('prodNome').value = p.nome;
  document.getElementById('prodCodigo').value = p.codigo || '';
  document.getElementById('prodGtin').value = p.gtin || '';
  document.getElementById('prodCategoria').value = p.categoria;
  // Migração: se produto antigo só tem p.img, converte para galeria
  if(p.gallery && p.gallery.length) {
    currentGallery = p.gallery.map(g => Object.assign({}, g));
  } else if(p.img) {
    currentGallery = [{ b64: p.img, mime: 'image/png' }];
  } else {
    currentGallery = [];
  }
  currentColors = p.colors ? p.colors.slice() : [];
  renderGallery();
  renderProdColors();
  renderColorPresets();
  renderDetailsList(p.detalhes || []);
  openModal();
}

function openAddModal() {
  editingIdx = -1;
  document.getElementById('modalTitle').textContent = 'Novo Produto';
  document.getElementById('btnDelete').style.display = 'none';
  document.getElementById('btnDuplicate').style.display = 'none';
  document.getElementById('btnToggleActive').style.display = 'none';
  document.getElementById('prodNome').value = '';
  document.getElementById('prodCodigo').value = '';
  document.getElementById('prodGtin').value = '';
  document.getElementById('prodCategoria').value = 'Brinquedos';
  currentGallery = [];
  currentColors  = [];
  renderGallery();
  renderProdColors();
  renderColorPresets();
  renderDetailsList([]);
  openModal();
}

function openModal() {
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function closeModalOutside(e) {
  if(e.target === document.getElementById('modalOverlay')) closeModal();
}

