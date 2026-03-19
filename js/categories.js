// Editor de categorias (ativar/desativar/excluir/adicionar)

// ══════════════════════════════════════════
// CATEGORY EDITOR
// ══════════════════════════════════════════
function renderCatEditor() {
  const cats = Object.keys(catConfig);
  const listEl = document.getElementById('catEditorList');
  listEl.innerHTML = cats.map(cat => {
    const cfg = catConfig[cat];
    const count = products.filter(p=>p.categoria===cat).length;
    const isActive = cfg.active !== false;
    const opacity = isActive ? '1' : '0.5';
    const statusLabel = isActive ? '✅ Ativa' : '⛔ Desativada';
    const toggleLabel = isActive ? 'Desativar' : 'Ativar';
    const toggleColor = isActive ? '#E53E3E' : '#38A169';
    return `
    <div class="settings-card" style="margin-bottom:16px;opacity:${opacity};transition:opacity .3s;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
        <div style="font-size:1.8rem">${cfg.emoji}</div>
        <div style="flex:1">
          <h3 style="margin:0">${cat}</h3>
          <p class="hint" style="margin:2px 0 0">${count} produto${count!==1?'s':''} · ${statusLabel}</p>
        </div>
        <div style="display:flex;gap:6px;">
          <button onclick="toggleCategory('${cat.replace(/'/g, "\\'")}')" style="padding:4px 10px;border-radius:6px;border:1px solid ${toggleColor};color:${toggleColor};background:transparent;cursor:pointer;font-size:.72rem;font-weight:600;" title="${toggleLabel}">${toggleLabel}</button>
          <button onclick="deleteCategory('${cat.replace(/'/g, "\\'")}')" style="padding:4px 10px;border-radius:6px;border:1px solid #E53E3E;color:#E53E3E;background:transparent;cursor:pointer;font-size:.72rem;font-weight:600;" title="Excluir categoria">🗑</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="field">
          <label>Cor de Fundo</label>
          <div class="color-row">
            <input type="color" value="${cfg.color}" onchange="updateCategoryColor('${cat.replace(/'/g, "\\'")}', 'color', this.value)">
            <input type="text" value="${cfg.color}" oninput="updateCategoryColor('${cat.replace(/'/g, "\\'")}', 'color', this.value)">
          </div>
        </div>
        <div class="field">
          <label>Cor de Destaque</label>
          <div class="color-row">
            <input type="color" value="${cfg.accent}" onchange="updateCategoryColor('${cat.replace(/'/g, "\\'")}', 'accent', this.value)">
            <input type="text" value="${cfg.accent}" oninput="updateCategoryColor('${cat.replace(/'/g, "\\'")}', 'accent', this.value)">
          </div>
        </div>
        <div class="field">
          <label>Emoji da Categoria</label>
          <input type="text" value="${cfg.emoji}" maxlength="4"
            oninput="catConfig['${cat}'].emoji=this.value;renderCatEditor();renderSidebarCats()">
        </div>
      </div>
    </div>`;
  }).join('');
  // Add "New Category" button at the bottom
  listEl.innerHTML += `
    <div style="text-align:center;margin:20px 0;">
      <button onclick="addCategory()" style="padding:10px 28px;border-radius:8px;border:2px dashed var(--border);color:var(--muted);background:transparent;cursor:pointer;font-size:.85rem;font-weight:600;transition:all .2s;" onmouseenter="this.style.borderColor='var(--verde)';this.style.color='var(--verde)'" onmouseleave="this.style.borderColor='var(--border)';this.style.color='var(--muted)'">
        ＋ Adicionar Categoria
      </button>
    </div>`;
  // Also update the catFilter dropdown and prodCategoria dropdown
  updateCatDropdowns();
}

function updateCategoryColor(cat, field, value) {
  if(!catConfig[cat]) return;
  if(!/^#[0-9A-Fa-f]{6}$/.test(value || '')) return;
  catConfig[cat][field] = value;
  refreshCategoryDerivedColors(cat);
  renderCatEditor();
  filterProducts();
  dbSaveSettings();
}

function refreshCategoryDerivedColors(cat) {
  const cfg = catConfig[cat];
  if(!cfg) return;
  const base = cfg.color || '#F0F0F0';
  const accent = cfg.accent || '#666666';
  cfg.dark = shiftHex(accent, -38);
  cfg.gradient = '135deg,' + base + ',' + shiftHex(base, -18);
  cfg.tag_bg = shiftHex(base, -10);
  cfg.tag_c = shiftHex(accent, -42);
}

function shiftHex(hex, amount) {
  const clean = String(hex || '').replace('#', '');
  if(!/^[0-9A-Fa-f]{6}$/.test(clean)) return hex;
  const parts = [0, 2, 4].map(function(i) {
    const n = parseInt(clean.slice(i, i + 2), 16);
    return Math.max(0, Math.min(255, n + amount));
  });
  return '#' + parts.map(function(n) {
    return n.toString(16).padStart(2, '0');
  }).join('').toUpperCase();
}

function toggleCategory(cat) {
  if(!catConfig[cat]) return;
  catConfig[cat].active = catConfig[cat].active === false ? true : false;
  renderCatEditor();
  renderSidebarCats();
  dbSaveSettings();
  autoPersist();
  showToast(catConfig[cat].active !== false ? 'Categoria ativada ✓' : 'Categoria desativada', catConfig[cat].active !== false ? 'success' : 'error');
}

function deleteCategory(cat) {
  const count = products.filter(p => p.categoria === cat).length;
  let msg = 'Excluir a categoria "' + cat + '"?';
  if(count > 0) msg += '\n\n⚠️ ' + count + ' produto(s) serão movidos para "Outros".';
  if(!confirm(msg)) return;
  if(count > 0) {
    products.forEach(p => { if(p.categoria === cat) p.categoria = 'Outros'; });
    dbSaveProducts();
  }
  delete catConfig[cat];
  renderCatEditor();
  renderSidebarCats();
  filterProducts();
  updateCount();
  dbSaveSettings();
  autoPersist();
  showToast('Categoria excluída','error');
}

function addCategory() {
  const nome = prompt('Nome da nova categoria:');
  if(!nome || !nome.trim()) return;
  const trimmed = nome.trim();
  if(catConfig[trimmed]) { showToast('Essa categoria já existe','error'); return; }
  const emoji = prompt('Emoji para a categoria (ex: 🐶):') || '📁';
  catConfig[trimmed] = {
    color: '#F0F0F0',
    accent: '#666666',
    dark: '#333333',
    gradient: '135deg,#F0F0F0,#D0D0D0',
    emoji: emoji.trim(),
    tag_bg: '#E0E0E0',
    tag_c: '#333333',
    active: true
  };
  renderCatEditor();
  renderSidebarCats();
  updateCatDropdowns();
  dbSaveSettings();
  autoPersist();
  showToast('Categoria adicionada ✓','success');
}

function updateCatDropdowns() {
  const cats = Object.keys(catConfig).filter(c => catConfig[c].active !== false);
  // Update catFilter (product search)
  const catFilter = document.getElementById('catFilter');
  if(catFilter) {
    const currentVal = catFilter.value;
    catFilter.innerHTML = '<option value="">Todas as categorias</option>' +
      cats.map(c => '<option' + (c === currentVal ? ' selected' : '') + '>' + c + '</option>').join('');
  }
  // Update prodCategoria (product edit modal)
  const prodCat = document.getElementById('prodCategoria');
  if(prodCat) {
    const currentVal = prodCat.value;
    prodCat.innerHTML = cats.map(c => '<option' + (c === currentVal ? ' selected' : '') + '>' + c + '</option>').join('');
  }
}

