// Renderização da grade de produtos e filtros

// ══════════════════════════════════════════
// PRODUCT GRID
// ══════════════════════════════════════════
let dragProductId = null;
let suppressCardClick = false;

function renderGrid(list) {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';
  grid.classList.toggle('is-reorderable', list.length > 1);
  grid.ondragover = function(e) {
    if(!dragProductId) return;
    e.preventDefault();
  };
  grid.ondrop = function(e) {
    if(!dragProductId) return;
    e.preventDefault();
    clearDropIndicators();
    moveProductToEnd(dragProductId);
  };
  if(!list.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--muted)"><div style="font-size:3rem;margin-bottom:8px">🔍</div><p>Nenhum produto encontrado</p></div>';
    return;
  }
  list.forEach(p => {
    const idx = products.indexOf(p);
    const cfg = catConfig[p.categoria] || catConfig['Outros'];

    // card wrapper
    const card = document.createElement('div');
    card.className = 'prod-card';
    card.draggable = true;
    card.dataset.productId = p.id;
    if(p.ativo === false) {
      card.style.opacity = '0.45';
      card.style.filter = 'grayscale(60%)';
      card.title = 'Produto desativado';
    }
    // single click = view, edit button handled by CSS ::after
    card.onclick = (e) => {
      if(suppressCardClick) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // if clicking the ::after "Editar" zone (bottom 34px) open edit, else view
      const rect = card.getBoundingClientRect();
      if(e.clientY > rect.bottom - 34) { openEditModal(idx); }
      else { pvOpen(filteredProducts().indexOf(p) >= 0 ? filteredProducts().indexOf(p) : idx); }
    };
    card.ondragstart = function(e) {
      dragProductId = p.id;
      suppressCardClick = true;
      card.classList.add('is-dragging');
      if(e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(p.id));
      }
    };
    card.ondragend = function() {
      card.classList.remove('is-dragging');
      clearDropIndicators();
      dragProductId = null;
      setTimeout(function(){ suppressCardClick = false; }, 80);
    };
    card.ondragover = function(e) {
      if(!dragProductId || dragProductId === p.id) return;
      e.preventDefault();
      clearDropIndicators();
      card.classList.add('drop-target');
    };
    card.ondragleave = function() {
      card.classList.remove('drop-target');
    };
    card.ondrop = function(e) {
      if(!dragProductId || dragProductId === p.id) return;
      e.preventDefault();
      e.stopPropagation();
      clearDropIndicators();
      moveProductBefore(dragProductId, p.id);
    };

    // badge
    const badge = document.createElement('div');
    badge.className = 'prod-card-has-img ' + (p.img ? 'has-img-badge' : 'no-img-badge');
    badge.title = p.img ? 'Tem imagem' : 'Sem imagem';
    badge.textContent = p.img ? '✓' : '?';
    card.appendChild(badge);

    // image area
    const imgWrap = document.createElement('div');
    imgWrap.className = 'prod-card-img';
    imgWrap.style.background = `linear-gradient(${cfg.gradient})`;
    if(p.img) {
      const img = document.createElement('img');
      img.alt = p.nome;
      // p.img should be a plain base64 string; guard against legacy {b64,mime} objects
      const _imgB64  = (p.img && typeof p.img === 'object') ? p.img.b64  : p.img;
      const _imgMime = (p.img && typeof p.img === 'object') ? (p.img.mime || 'image/png') : 'image/png';
      img.src = `data:${_imgMime};base64,${_imgB64}`; // set via JS, not innerHTML
      imgWrap.appendChild(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'no-img-ph';
      ph.textContent = cfg.emoji;
      imgWrap.appendChild(ph);
    }
    card.appendChild(imgWrap);

    // overlay handled by CSS ::after pseudo-element

    // body
    const body = document.createElement('div');
    const activeTags = normalizeProductTags(p.tags).filter(function(tag){ return tag.active !== false; });
    body.className = 'prod-card-body';
    body.innerHTML = `
      <div class="prod-card-cat">${escHtml(p.categoria)}</div>
      <div class="prod-card-name">${escHtml(p.nome)}</div>
      ${p.codigo ? `<div class="prod-card-cod">#${escHtml(p.codigo)}</div>` : ''}
      ${activeTags.length ? `<div class="prod-card-tags">${activeTags.slice(0,3).map(function(tag){ return `<span class="prod-card-tag">${escHtml(tag.label)}</span>`; }).join('')}</div>` : ''}
      ${p.gtin ? `<div class="prod-card-cod" style="color:#8B7355;font-size:.58rem;margin-top:1px;" title="GTIN/EAN">⊟ ${escHtml(p.gtin)}</div>` : ''}
      ${p.ativo === false ? '<div style="color:#E53E3E;font-size:.65rem;font-weight:700;margin-top:2px;">⏸ DESATIVADO</div>' : ''}
    `;
    // Bolinhas de cores
    if(p.colors && p.colors.length) {
      const colorsWrap = document.createElement('div');
      colorsWrap.className = 'prod-card-colors';
      p.colors.slice(0, 8).forEach(hex => {
        const dot = document.createElement('div');
        dot.className = 'prod-card-color-dot';
        dot.style.background = hex;
        dot.title = hex;
        colorsWrap.appendChild(dot);
      });
      if(p.colors.length > 8) {
        const more = document.createElement('span');
        more.style.cssText = 'font-size:.58rem;color:var(--muted);line-height:12px;';
        more.textContent = '+' + (p.colors.length - 8);
        colorsWrap.appendChild(more);
      }
      body.appendChild(colorsWrap);
    }
    card.appendChild(body);

    // Indicador de múltiplas fotos
    if(p.gallery && p.gallery.length > 1) {
      const photosBadge = document.createElement('div');
      photosBadge.style.cssText = 'position:absolute;top:8px;left:8px;background:rgba(0,0,0,.5);color:#fff;font-size:.55rem;font-weight:600;padding:2px 6px;border-radius:4px;letter-spacing:.04em;backdrop-filter:blur(4px);';
      photosBadge.textContent = '📷 ' + p.gallery.length;
      card.appendChild(photosBadge);
    }

    grid.appendChild(card);
  });
}

function filterProducts() {
  const q = document.getElementById('prodSearch').value.toLowerCase();
  const cat = document.getElementById('catFilter').value;
  const img = document.getElementById('imgFilter').value;
  const status = document.getElementById('statusFilter').value;
  let filtered = products.filter(p => {
    const matchQ = !q || p.nome.toLowerCase().includes(q) || (p.codigo && p.codigo.toLowerCase().includes(q)) || (p.gtin && p.gtin.toLowerCase().includes(q));
    const matchCat = !cat || p.categoria === cat;
    const matchImg = !img || (img==='has' ? !!p.img : !p.img);
    const matchStatus = !status || (status === 'active' ? p.ativo !== false : p.ativo === false);
    return matchQ && matchCat && matchImg && matchStatus;
  });
  renderGrid(filtered);
}

function filterByCat(cat) {
  showPanel('produtos');
  document.getElementById('catFilter').value = cat;
  filterProducts();
  document.querySelectorAll('.nav-item').forEach(i=>i.classList.remove('active'));
  event.currentTarget.classList.add('active');
}

function clearDropIndicators() {
  document.querySelectorAll('.prod-card.drop-target').forEach(function(card) {
    card.classList.remove('drop-target');
  });
}

function moveProductBefore(draggedId, targetId) {
  const fromIndex = products.findIndex(function(p){ return String(p.id) === String(draggedId); });
  const toIndex = products.findIndex(function(p){ return String(p.id) === String(targetId); });
  if(fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

  const moved = products.splice(fromIndex, 1)[0];
  const nextIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
  products.splice(nextIndex, 0, moved);
  persistProductOrder();
}

function moveProductToEnd(draggedId) {
  const fromIndex = products.findIndex(function(p){ return String(p.id) === String(draggedId); });
  if(fromIndex < 0 || fromIndex === products.length - 1) return;
  const moved = products.splice(fromIndex, 1)[0];
  products.push(moved);
  persistProductOrder();
}

function persistProductOrder() {
  filterProducts();
  updateCount();
  dbSaveProducts();
  autoPersist();
  showToast('Ordem dos produtos atualizada', 'success');
}

