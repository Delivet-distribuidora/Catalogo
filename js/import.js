// Motor de importação seletiva

// ══════════════════════════════════════════
// IMPORTAÇÃO SELETIVA — Motor completo
// ══════════════════════════════════════════

var _simpBackup       = null;   // backup carregado
var _simpSelProds     = {};     // { id: true/false } — produtos selecionados
var _simpVisibleIds   = [];     // ids atualmente visíveis após filtros
var _simpCatFilter    = 'all';  // categoria ativa no chip
var _simpSections     = { prod: true, cfg: true, cat: true };

// Abre a modal a partir de um arquivo
function openSelectiveImport(e) {
  var file = e.target.files[0];
  if(!file) return;
  e.target.value = '';
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var backup = JSON.parse(ev.target.result);
      if(!backup._meta || !backup.products) throw new Error('Arquivo não é um backup DeliVet válido');
      _simpBackup = backup;
      _simpBuildModal(backup);
      document.getElementById('simpOverlay').classList.add('open');
      document.body.style.overflow = 'hidden';
    } catch(err) {
      showToast('Erro ao ler backup: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

// Constrói estado inicial da modal
function _simpBuildModal(backup) {
  // Meta
  var exportedDate = backup._meta.exportedAt
    ? new Date(backup._meta.exportedAt).toLocaleString('pt-BR') : '?';
  document.getElementById('simpHeaderDesc').textContent =
    '"' + (backup._meta.siteName||'?') + '" · v' + (backup._meta.version||'?') + ' · ' + exportedDate;
  document.getElementById('simpTotalProds').textContent = backup.products.length;

  // Seleciona todos por padrão (backup completo = padrão ativo)
  _simpSelProds = {};
  backup.products.forEach(function(p){ _simpSelProds[p.id || p.nome] = true; });
  _simpSections = { prod: true, cfg: true, cat: true };

  // Categorias nos chips
  var cats = {};
  backup.products.forEach(function(p){ if(p.categoria) cats[p.categoria] = true; });
  var catChips = document.getElementById('simpCatChips');
  catChips.innerHTML = '<span class="simp-chip chip-all active" data-cat="all" onclick="simpCatChip(this)">Todas</span>';
  Object.keys(cats).sort().forEach(function(c){
    var ch = document.createElement('span');
    ch.className = 'simp-chip';
    ch.setAttribute('data-cat', c);
    ch.textContent = c;
    ch.onclick = function(){ simpCatChip(ch); };
    catChips.appendChild(ch);
  });
  _simpCatFilter = 'all';

  // Limpa busca e filtros
  document.getElementById('simpSearch').value = '';
  document.getElementById('simpImgFilter').value = '';

  // Seções visualmente ativas
  ['prod','cfg','cat'].forEach(function(k){ _simpSetSection(k, true); });

  // Renderiza lista e summary
  simpUpdateProdList();
  simpUpdateSummary();
}

// Toggle de seção (checkbox principal)
function simpToggleSection(key) {
  _simpSections[key] = !_simpSections[key];
  _simpSetSection(key, _simpSections[key]);
  simpUpdateSummary();
}
function _simpSetSection(key, active) {
  _simpSections[key] = active;
  var secId = { prod:'simpSecProd', cfg:'simpSecCfg', cat:'simpSecCat' }[key];
  var el = document.getElementById(secId);
  if(!el) return;
  if(active) el.classList.add('active-section');
  else el.classList.remove('active-section');
  var badge = { prod:'simpProdBadge', cfg:'simpCfgBadge', cat:'simpCatBadge' }[key];
  if(key !== 'prod') {
    document.getElementById(badge).textContent = active ? 'Incluído' : 'Ignorado';
  }
}

// Chip de categoria
function simpCatChip(el) {
  document.querySelectorAll('#simpCatChips .simp-chip').forEach(function(c){ c.classList.remove('active'); });
  el.classList.add('active');
  _simpCatFilter = el.getAttribute('data-cat');
  simpUpdateProdList();
}

// Atualiza a lista de produtos visíveis conforme filtros
function simpUpdateProdList() {
  if(!_simpBackup) return;
  var q      = (document.getElementById('simpSearch').value || '').toLowerCase().trim();
  var imgF   = document.getElementById('simpImgFilter').value;
  var catF   = _simpCatFilter;

  var filtered = _simpBackup.products.filter(function(p){
    var mQ   = !q   || (p.nome||'').toLowerCase().includes(q) || (p.codigo||'').toLowerCase().includes(q);
    var mCat = catF === 'all' || p.categoria === catF;
    var mImg = !imgF || (imgF === 'has' ? !!p.img : !p.img);
    return mQ && mCat && mImg;
  });

  _simpVisibleIds = filtered.map(function(p){ return p.id || p.nome; });

  // Renderiza linhas
  var list = document.getElementById('simpProdList');
  list.innerHTML = '';
  if(!filtered.length) {
    list.innerHTML = '<div style="padding:16px;text-align:center;font-size:.76rem;color:var(--muted);">Nenhum produto encontrado com esses filtros</div>';
  } else {
    filtered.forEach(function(p){
      var pid    = p.id || p.nome;
      var sel    = !!_simpSelProds[pid];
      var row    = document.createElement('div');
      row.className = 'simp-prod-row';
      row.innerHTML =
        '<input type="checkbox" ' + (sel ? 'checked' : '') + ' onchange="_simpToggleProd(\'' + pid.replace(/'/g,"'") + '\',this.checked)">'
        + '<span>' + (p.nome||'—') + '</span>'
        + (p.codigo ? '<span class="simp-prod-row-cod">#' + p.codigo + '</span>' : '')
        + (p.img ? '<span style="font-size:.65rem;">📷</span>' : '')
        + '<span class="simp-prod-row-cat">' + (p.categoria||'Outros') + '</span>';
      row.onclick = function(e){
        if(e.target.tagName === 'INPUT') return;
        var cb = row.querySelector('input[type=checkbox]');
        cb.checked = !cb.checked;
        _simpToggleProd(pid, cb.checked);
      };
      list.appendChild(row);
    });
  }

  // Atualiza contadores
  var checkedCount = Object.keys(_simpSelProds).filter(function(k){ return _simpSelProds[k]; }).length;
  document.getElementById('simpVisibleCount').textContent = _simpVisibleIds.length;
  document.getElementById('simpCheckedCount').textContent = checkedCount;
  document.getElementById('simpProdBadge').textContent    = checkedCount + ' selecionado' + (checkedCount !== 1 ? 's' : '');

  // Estado do "selecionar todos"
  var allChecked = _simpVisibleIds.length > 0 && _simpVisibleIds.every(function(id){ return _simpSelProds[id]; });
  document.getElementById('simpSelectAll').checked = allChecked;
  document.getElementById('simpSelectAll').indeterminate = !allChecked && _simpVisibleIds.some(function(id){ return _simpSelProds[id]; });

  simpUpdateSummary();
}

function _simpToggleProd(pid, checked) {
  _simpSelProds[pid] = checked;
  simpUpdateProdList();
}

function simpSelectAllToggle(checked) {
  _simpVisibleIds.forEach(function(id){ _simpSelProds[id] = checked; });
  simpUpdateProdList();
}

// Modo de merge UI
function simpUpdateMergeUI() {
  var val = document.querySelector('input[name=simpMerge]:checked').value;
  document.getElementById('simpMergeOpt1').classList.toggle('active', val === 'replace');
  document.getElementById('simpMergeOpt2').classList.toggle('active', val === 'merge');
  document.getElementById('simpMergeOpt3').classList.toggle('active', val === 'fields');
  var panel = document.getElementById('simpFieldsPanel');
  panel.style.display = val === 'fields' ? 'block' : 'none';
  simpUpdateSummary();
}

// Checkbox de campo individual
function simpFieldChange(cb) {
  var opt = cb.closest('.simp-field-opt');
  opt.classList.toggle('active', cb.checked);
  simpUpdateSummary();
}

// Match mode UI
function simpMatchChange() {
  var val = document.querySelector('input[name=simpMatch]:checked').value;
  document.getElementById('simpMatchOpt1').classList.toggle('active', val === 'nome');
  document.getElementById('simpMatchOpt2').classList.toggle('active', val === 'codigo');
  document.getElementById('simpMatchOpt3').classList.toggle('active', val === 'nome+cat');
}

// Presets de campos
function simpPreset(preset) {
  var map = {
    'only-titles':  { nome:1, codigo:1, categoria:0, tags:0, detalhes:0, colors:0, img:0, gallery:0 },
    'only-colors':  { nome:0, codigo:0, categoria:0, tags:0, detalhes:0, colors:1, img:0, gallery:0 },
    'only-info':    { nome:0, codigo:0, categoria:0, tags:1, detalhes:1, colors:0, img:0, gallery:0 },
    'only-images':  { nome:0, codigo:0, categoria:0, tags:0, detalhes:0, colors:0, img:1, gallery:1 },
    'no-images':    { nome:1, codigo:1, categoria:1, tags:1, detalhes:1, colors:1, img:0, gallery:0 },
    'all':          { nome:1, codigo:1, categoria:1, tags:1, detalhes:1, colors:1, img:1, gallery:1 }
  };
  var cfg = map[preset];
  if(!cfg) return;
  document.querySelectorAll('input[name=simpField]').forEach(function(cb){
    cb.checked = !!cfg[cb.value];
    cb.closest('.simp-field-opt').classList.toggle('active', cb.checked);
  });
  simpUpdateSummary();
}

// Retorna lista de campos ativos
function _simpActiveFields() {
  var fields = [];
  document.querySelectorAll('input[name=simpField]:checked').forEach(function(cb){ fields.push(cb.value); });
  return fields;
}

// Resumo dinâmico
function simpUpdateSummary() {
  var selCount = Object.keys(_simpSelProds).filter(function(k){ return _simpSelProds[k]; }).length;
  var anything = (_simpSections.prod && selCount > 0) || _simpSections.cfg || _simpSections.cat;

  var titleEl = document.getElementById('simpSummaryTitle');
  var descEl  = document.getElementById('simpSummaryDesc');
  var chips   = document.getElementById('simpSummaryChips');
  var warnEl  = document.getElementById('simpWarn');
  var applyBtn= document.getElementById('simpApplyBtn');

  chips.innerHTML = '';
  if(!anything) {
    titleEl.textContent = 'Nada selecionado';
    descEl.textContent  = 'Ative pelo menos uma seção para importar';
    applyBtn.disabled   = true;
    warnEl.style.display = 'none';
    return;
  }
  applyBtn.disabled = false;

  var parts = [];
  var merge = document.querySelector('input[name=simpMerge]:checked');
  var mergeMode = merge ? merge.value : 'replace';

  if(_simpSections.prod && selCount > 0) {
    parts.push(selCount + ' produto' + (selCount !== 1 ? 's' : ''));
    var modeLabel = mergeMode === 'replace' ? 'substituir' : mergeMode === 'merge' ? 'acrescentar' : 'atualizar campos';
    var c1 = document.createElement('span'); c1.className='simp-sum-chip';
    c1.textContent = '📦 ' + selCount + ' produtos (' + modeLabel + ')';
    chips.appendChild(c1);

    if(mergeMode === 'fields') {
      var fields = _simpActiveFields();
      var fieldLabels = { nome:'Títulos', codigo:'Códigos', categoria:'Categorias', detalhes:'Informações', colors:'Cores', img:'Imagem', gallery:'Galeria' };
      fieldLabels.tags = 'Tags';
      if(fields.length === 0) {
        var cf = document.createElement('span'); cf.className='simp-sum-chip';
        cf.style.background='rgba(229,62,62,.12)'; cf.style.color='var(--danger)';
        cf.textContent = '⚠️ Nenhum campo selecionado';
        chips.appendChild(cf);
        applyBtn.disabled = true;
      } else {
        fields.forEach(function(f){
          var cf = document.createElement('span'); cf.className='simp-sum-chip'; cf.textContent='🔹 '+fieldLabels[f]; chips.appendChild(cf);
        });
      }
    }
  }
  if(_simpSections.cfg) {
    parts.push('identidade visual');
    var c2 = document.createElement('span'); c2.className='simp-sum-chip'; c2.textContent='🎨 Configurações'; chips.appendChild(c2);
  }
  if(_simpSections.cat) {
    parts.push('categorias');
    var c3 = document.createElement('span'); c3.className='simp-sum-chip'; c3.textContent='🏷️ Categorias'; chips.appendChild(c3);
  }

  var modeDesc = {
    replace: 'Os dados atuais marcados serão substituídos pelos do backup',
    merge:   'Os dados do backup serão adicionados sem apagar os atuais',
    fields:  'Apenas os campos selecionados serão atualizados nos produtos correspondentes'
  };
  titleEl.textContent = 'Serão importados: ' + parts.join(', ');
  descEl.textContent  = modeDesc[mergeMode] || '';
  warnEl.style.display = (_simpSections.prod && selCount > 0 && mergeMode === 'replace') ? '' : 'none';
}

// Aplica a importação seletiva
function simpApply() {
  if(!_simpBackup) return;

  var mergeMode = document.querySelector('input[name=simpMerge]:checked').value;

  var imported = _simpBackup.products.filter(function(p){
    return _simpSelProds[p.id || p.nome];
  }).map(function(p){ return Object.assign({}, p); });

  // ── PRODUTOS ──
  if(_simpSections.prod) {

    if(mergeMode === 'replace') {
      products = imported;
      showToast('✓ ' + imported.length + ' produto(s) substituídos', 'success');

    } else if(mergeMode === 'merge') {
      var existingKeys = {};
      products.forEach(function(p){ existingKeys[(p.nome||'')+'|'+(p.categoria||'')] = true; });
      var added = 0;
      imported.forEach(function(p){
        var key = (p.nome||'')+'|'+(p.categoria||'');
        if(!existingKeys[key]) {
          products.push(Object.assign({}, p, { id: Date.now().toString(36) + Math.random().toString(36).slice(2) }));
          existingKeys[key] = true;
          added++;
        }
      });
      showToast('✓ ' + added + ' produto(s) adicionados por mesclagem', 'success');

    } else if(mergeMode === 'fields') {
      var fields    = _simpActiveFields();
      var matchBy   = document.querySelector('input[name=simpMatch]:checked').value;
      var updated   = 0;
      var skipped   = 0;

      // Monta índice de correspondência sobre produtos atuais
      function makeKey(p, by) {
        if(by === 'nome')     return (p.nome||'').toLowerCase().trim();
        if(by === 'codigo')   return (p.codigo||'').toLowerCase().trim();
        if(by === 'nome+cat') return ((p.nome||'')+'|'+(p.categoria||'')).toLowerCase().trim();
        return '';
      }
      var existIdx = {};
      products.forEach(function(cur, i){
        var k = makeKey(cur, matchBy);
        if(k) existIdx[k] = i;
      });

      imported.forEach(function(bkp){
        var k = makeKey(bkp, matchBy);
        if(!k || existIdx[k] === undefined) { skipped++; return; }
        var target = products[existIdx[k]];
        fields.forEach(function(f){
          if(f === 'gallery') {
            // galeria: mescla sem duplicar
            var existGal = target.gallery || [];
            var bkpGal   = bkp.gallery   || [];
            var merged   = existGal.slice();
            bkpGal.forEach(function(item){
              var dup = merged.some(function(m){ return m.b64 && m.b64 === item.b64; });
              if(!dup) merged.push(item);
            });
            target.gallery = merged;
          } else if(bkp[f] !== undefined) {
            target[f] = bkp[f];
          }
        });
        updated++;
      });

      var msg = '✓ ' + updated + ' produto(s) atualizados';
      if(skipped) msg += ' · ' + skipped + ' sem correspondência (ignorados)';
      showToast(msg, 'success');
    }
  }

  // ── CONFIGURAÇÕES ──
  if(_simpSections.cfg && _simpBackup.settings) {
    Object.assign(settings, _simpBackup.settings);
    applySettingsToUI();
  }

  // ── CATEGORIAS ──
  if(_simpSections.cat && _simpBackup.catConfig) {
    Object.assign(catConfig, _simpBackup.catConfig);
  }

  renderGrid(products);
  updateCount();
  dbSaveProducts();
  dbSaveSettings();
  simpClose();
}

function simpClose() {
  document.getElementById('simpOverlay').classList.remove('open');
  document.body.style.overflow = '';
  _simpBackup = null;
}
function simpCloseOutside(e) {
  if(e.target === document.getElementById('simpOverlay')) simpClose();
}

// Mantém a função original para uso interno se precisar
function importBackupJSON(e) {
  openSelectiveImport(e);
}

// ══════════════════════════════════════════
// IMPORTAÇÃO DO GITHUB PAGES
// ══════════════════════════════════════════

var GITHUB_PAGES_URL = 'https://delivet-distribuidora.github.io/Catalogo/';

async function importFromGitHubPages() {
  showToast('Conectando ao GitHub Pages...', '');

  // ── 1. Buscar o index.html ──
  var html;
  try {
    var res = await fetch(GITHUB_PAGES_URL + 'index.html');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    html = await res.text();
  } catch(err) {
    showToast('Erro ao acessar o GitHub Pages: ' + err.message, 'error');
    return;
  }

  // ── 2. Parsear DOM ──
  var parser = new DOMParser();
  var doc = parser.parseFromString(html, 'text/html');

  var cards = doc.querySelectorAll('.card');
  if (!cards.length) {
    showToast('Nenhum produto encontrado no catálogo publicado.', 'error');
    return;
  }

  // ── 3. Extrair produtos + coletar URLs de imagens ──
  var imported = [];
  cards.forEach(function(card) {
    var nomeEl    = card.querySelector('h3');
    var catEl     = card.querySelector('.cat-tag');
    var codEl     = card.querySelector('.cod');
    var tagEls    = card.querySelectorAll('.prod-tag');
    var detsEl    = card.querySelectorAll('.details li');
    var colorDots = card.querySelectorAll('.card-color-dot');

    var nome = nomeEl ? nomeEl.textContent.trim() : '';
    if (!nome) return;

    var catRaw    = catEl ? catEl.textContent.trim() : 'Outros';
    var categoria = catRaw.replace(/^[\u{1F000}-\u{1FFFF}\u2600-\u27FF✂️🛍️🥣🦮🎾🐾\s]+/u, '').trim() || 'Outros';
    var codigo    = codEl ? codEl.textContent.trim().replace(/^#/, '') : '';

    var detalhes = [];
    detsEl.forEach(function(li) { var t = li.textContent.trim(); if (t) detalhes.push(t); });

    var tags = [];
    tagEls.forEach(function(tagEl) {
      var text = tagEl.textContent.trim();
      if(text) tags.push({ label: text, active: true });
    });

    var colors = [];
    colorDots.forEach(function(dot) { if (dot.style.background) colors.push(dot.style.background); });

    // Todas as mídias do card (principal + extras)
    var allImgEls = Array.from(card.querySelectorAll('.card-img img.pcard-real-img, .card-img img.pcard-extra-img'));
    var allVidEls = Array.from(card.querySelectorAll('.card-img video'));
    var mediaSrcs = allImgEls.concat(allVidEls).map(function(el) {
      return { src: el.getAttribute('src') || '', isVideo: el.tagName === 'VIDEO' };
    }).filter(function(m) { return !!m.src; });

    var inactive = card.getAttribute('data-inactive') === 'true';
    imported.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      nome: nome, codigo: codigo, categoria: categoria,
      tags: tags, detalhes: detalhes, colors: colors,
      img: null, gallery: [],
      ativo: inactive ? false : true,
      _mediaSrcs: mediaSrcs
    });
  });

  if (!imported.length) {
    showToast('Nenhum produto pôde ser extraído.', 'error');
    return;
  }

  // ── 4. Extrair settings ──
  var extractedSettings = {};
  var titleEl = doc.querySelector('title');
  if (titleEl) {
    var titleText = titleEl.textContent.replace(/\s*—.*$/, '').trim();
    if (titleText) extractedSettings.siteName = titleText;
  }
  var heroH1 = doc.querySelector('.hero h1');
  if (heroH1) {
    var lines = heroH1.innerHTML.split(/<br\s*\/?>/i).map(function(s) { return s.replace(/<[^>]+>/g, '').trim(); });
    if (lines[0]) extractedSettings.heroLine1 = lines[0];
    if (lines[1]) extractedSettings.heroLine2 = lines[1];
    if (lines[2]) extractedSettings.heroLine3 = lines[2];
  }
  var heroDesc = doc.querySelector('.hero-desc');
  if (heroDesc) extractedSettings.heroDesc = heroDesc.textContent.trim();
  doc.querySelectorAll('.footer-contact span').forEach(function(sp) {
    var t = sp.textContent.trim();
    if (t.startsWith('📱')) extractedSettings.contWhatsapp = t.replace('📱', '').trim();
    if (t.startsWith('✉️')) extractedSettings.contEmail    = t.replace('✉️', '').trim();
    if (t.startsWith('📸')) extractedSettings.contInsta    = t.replace('📸', '').trim();
  });
  var footCopy = doc.querySelector('.footer-copy');
  if (footCopy) extractedSettings.contCopy = footCopy.textContent.trim();
  doc.querySelectorAll('style').forEach(function(styleEl) {
    var css = styleEl.textContent;
    var vm = css.match(/--verde\s*:\s*(#[0-9a-fA-F]{3,6})/);
    var lm = css.match(/--laranja\s*:\s*(#[0-9a-fA-F]{3,6})/);
    var bm = css.match(/--bg\s*:\s*(#[0-9a-fA-F]{3,6})/);
    if (vm) extractedSettings.colorVerde   = vm[1];
    if (lm) extractedSettings.colorLaranja = lm[1];
    if (bm) extractedSettings.colorBg      = bm[1];
  });

  // ── 5. Buscar logo ──
  try {
    var logoRes = await fetch(GITHUB_PAGES_URL + 'img/logo.png');
    if (logoRes.ok) {
      var logoB64 = await _blobToBase64DataUrl(await logoRes.blob());
      extractedSettings.logoImg = logoB64;
    }
  } catch(e) { /* logo opcional */ }

  // ── 6. Buscar imagens de cada produto ──
  var totalMedia = imported.reduce(function(acc, p) { return acc + p._mediaSrcs.length; }, 0);
  var doneFetches = 0;
  if (totalMedia > 0) showToast('Baixando imagens... 0/' + totalMedia, '');

  for (var i = 0; i < imported.length; i++) {
    var p = imported[i];
    var gallery = [];
    for (var j = 0; j < p._mediaSrcs.length; j++) {
      var media = p._mediaSrcs[j];
      try {
        var imgRes = await fetch(GITHUB_PAGES_URL + media.src);
        if (imgRes.ok) {
          var blob = await imgRes.blob();
          var mime = blob.type || (media.isVideo ? 'video/webm' : 'image/png');
          var dataUrl = await _blobToBase64DataUrl(blob);
          gallery.push({ b64: dataUrl.split(',')[1], mime: mime });
        }
      } catch(e) { /* imagem falhou, pula */ }
      doneFetches++;
      if (doneFetches % 5 === 0 || doneFetches === totalMedia) {
        showToast('Baixando imagens... ' + doneFetches + '/' + totalMedia, '');
      }
    }
    p.gallery = gallery;
    p.img     = gallery.length ? gallery[0].b64 : null;
    delete p._mediaSrcs;
  }

  // ── 7. Abrir importação seletiva ──
  var backup = {
    _meta: {
      version: '1.0', app: 'DeliVet Editor',
      siteName: extractedSettings.siteName || 'DeliVet',
      exportedAt: new Date().toISOString(),
      totalProducts: imported.length,
      source: 'github-pages'
    },
    settings: Object.assign({}, settings, extractedSettings),
    catConfig: JSON.parse(JSON.stringify(catConfig)),
    products: imported
  };

  _simpBackup = backup;
  _simpBuildModal(backup);
  document.getElementById('simpOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  showToast('✓ ' + imported.length + ' produtos carregados do GitHub Pages', 'success');
}

// Helpers blob → base64
function _blobToBase64DataUrl(blob) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload  = function() { resolve(reader.result); };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
