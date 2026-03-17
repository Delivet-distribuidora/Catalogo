// Cores do produto (seleção, presets)

// ══════════════════════════════════════════
// CORES DO PRODUTO
// ══════════════════════════════════════════
function renderProdColors() {
  const row = document.getElementById('prodColorsRow');
  row.innerHTML = '';
  if(!currentColors.length) {
    row.innerHTML = '<span style="font-size:.76rem;color:var(--muted);font-style:italic;">Nenhuma cor adicionada</span>';
    return;
  }
  currentColors.forEach((hex, i) => {
    const swatch = document.createElement('div');
    swatch.className = 'prod-color-swatch';
    swatch.style.background = hex;
    swatch.title = hex;

    const del = document.createElement('button');
    del.className = 'swatch-del';
    del.innerHTML = '✕';
    del.onclick = (e) => { e.stopPropagation(); currentColors.splice(i,1); renderProdColors(); };
    swatch.appendChild(del);
    row.appendChild(swatch);
  });
}

function renderColorPresets() {
  const container = document.getElementById('colorPresets');
  container.innerHTML = '';
  COLOR_PRESETS.forEach(hex => {
    const dot = document.createElement('div');
    dot.className = 'color-preset';
    dot.style.background = hex;
    dot.title = hex;
    // borda especial para branco
    if(hex === '#FFFFFF') dot.style.border = '2px solid #e0e0e0';
    dot.onclick = () => {
      document.getElementById('newColorPicker').value = hex;
      document.getElementById('newColorHex').value   = hex;
    };
    container.appendChild(dot);
  });
  // Sincroniza picker e text
  document.getElementById('newColorPicker').oninput = function() {
    document.getElementById('newColorHex').value = this.value;
  };
  document.getElementById('newColorHex').oninput = function() {
    const v = this.value.trim();
    if(/^#[0-9A-Fa-f]{6}$/.test(v)) document.getElementById('newColorPicker').value = v;
  };
}

function addProdColor() {
  const hex = document.getElementById('newColorHex').value.trim() ||
              document.getElementById('newColorPicker').value;
  if(!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    showToast('Digite um código hexadecimal válido (ex: #3A8F62)', 'error'); return;
  }
  if(currentColors.includes(hex)) {
    showToast('Essa cor já foi adicionada', ''); return;
  }
  currentColors.push(hex);
  renderProdColors();
}

// Details list
function renderDetailsList(items) {
  const list = document.getElementById('detailsList');
  list.innerHTML = items.map((item,i) => `
    <div class="detail-item">
      <input type="text" value="${escHtml(item)}" placeholder="Ex: Medidas: 10 x 5 cm" id="det_${i}">
      <button class="btn-icon remove" onclick="removeDetail(${i})">✕</button>
    </div>`).join('');
}

function addDetail() {
  const list = document.getElementById('detailsList');
  const count = list.children.length;
  const div = document.createElement('div');
  div.className = 'detail-item';
  div.innerHTML = `<input type="text" placeholder="Ex: Material: borracha natural" id="det_${count}"><button class="btn-icon remove" onclick="this.parentElement.remove()">✕</button>`;
  list.appendChild(div);
}

function removeDetail(i) {
  document.getElementById('det_'+i).parentElement.remove();
}

function getDetails() {
  return [...document.getElementById('detailsList').querySelectorAll('input')]
    .map(i => i.value.trim()).filter(Boolean);
}

function saveProduct() {
  const nome = document.getElementById('prodNome').value.trim();
  if(!nome) { showToast('Digite o nome do produto','error'); return; }
  const prod = {
    id: Date.now().toString(),
    nome,
    codigo: document.getElementById('prodCodigo').value.trim(),
    gtin: document.getElementById('prodGtin').value.trim(),
    categoria: document.getElementById('prodCategoria').value,
    detalhes: getDetails(),
    // Galeria: salva array completo; img = primeira foto (retrocompatibilidade)
    gallery: currentGallery.map(g => Object.assign({}, g)),
    img: currentGallery.length ? currentGallery[0].b64 : null,
    colors: currentColors.slice(),
    ativo: (editingIdx >= 0 && products[editingIdx].ativo === false) ? false : true,
  };
  if(editingIdx >= 0) {
    products[editingIdx] = prod;
    showToast('Produto atualizado ✓','success'); dbSaveProducts();
  } else {
    products.unshift(prod);
    showToast('Produto adicionado ✓','success'); dbSaveProducts();
  }
  closeModal();
  filterProducts();
  updateCount();
  renderSidebarCats();
  updateCatDropdowns();
  autoPersist();
}

function duplicateProduct() {
  if(editingIdx < 0) return;
  const original = products[editingIdx];
  const duplicated = JSON.parse(JSON.stringify(original));
  duplicated.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  duplicated.nome = original.nome + ' (Cópia)';
  products.unshift(duplicated);
  showToast('Produto duplicado ✓','success');
  dbSaveProducts();
  closeModal();
  filterProducts();
  updateCount();
  autoPersist();
}

function toggleProductActive() {
  if(editingIdx < 0) return;
  const p = products[editingIdx];
  p.ativo = p.ativo === false ? true : false;
  const isActive = p.ativo !== false;
  showToast(isActive ? 'Produto ativado ✓' : 'Produto desativado', isActive ? 'success' : 'error');
  dbSaveProducts();
  closeModal();
  filterProducts();
  updateCount();
  autoPersist();
}

function deleteProduct() {
  if(!confirm('Excluir "' + products[editingIdx].nome + '"?')) return;
  products.splice(editingIdx, 1);
  closeModal();
  filterProducts();
  updateCount();
  autoPersist();
  showToast('Produto excluído','error'); dbSaveProducts();
}

function updateCount() {
  document.getElementById('countAll').textContent = products.length;
  renderSidebarCats();
}

function renderSidebarCats() {
  const container = document.getElementById('sidebarCatList');
  if(!container) return;
  const cats = Object.keys(catConfig);
  container.innerHTML = cats.filter(cat => {
    const cfg = catConfig[cat];
    return cfg.active !== false;
  }).map(cat => {
    const cfg = catConfig[cat];
    const count = products.filter(p => p.categoria === cat).length;
    return '<div class="nav-item" onclick="filterByCat(\'' + cat.replace(/'/g, "\\'") + '\')">' +
      '<span class="icon">' + cfg.emoji + '</span> ' + cat.split(' ')[0] +
      '<span class="count">' + count + '</span>' +
    '</div>';
  }).join('');
}

