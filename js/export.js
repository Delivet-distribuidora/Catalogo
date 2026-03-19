// Exportação do catálogo + compressão de imagens

// ══════════════════════════════════════════
// EXPORT CATALOG
// ══════════════════════════════════════════

// ══════════════════════════════════════════
// IMAGE COMPRESSION UTILITY
// ══════════════════════════════════════════
// Compressão sempre em PNG para preservar transparência.
// A redução de tamanho vem do redimensionamento (largura/altura máxima).
function compressImageB64(b64, maxPx) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth  || img.width;
      let h = img.naturalHeight || img.height;
      if (w === 0 || h === 0) { resolve(b64); return; }

      // Se já é menor que o limite, devolve sem alterar
      if (w <= maxPx && h <= maxPx) { resolve(b64); return; }

      // Reduz proporcionalmente mantendo aspecto
      const ratio = Math.min(maxPx / w, maxPx / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);

      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      // Fundo transparente — não preenche com cor, preserva canal alpha
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      // Sempre PNG para manter transparência
      const dataUrl = canvas.toDataURL('image/png');
      const compressed = dataUrl.split(',')[1];
      resolve(compressed || b64);
    };
    img.onerror = () => resolve(b64);
    img.src = 'data:image/png;base64,' + b64;
  });
}

async function compressAllProducts(maxPx, onProgress) {
  let totalImages = 0;
  products.forEach(p => {
    if (p.gallery && p.gallery.length > 0) {
      totalImages += p.gallery.length;
    } else if (p.img) {
      totalImages += 1;
    }
  });

  let done = 0;
  const result = [];

  for (const p of products) {
    const newP = { ...p };
    const sourceImages = p.gallery && p.gallery.length > 0 ? p.gallery : (p.img ? [{ b64: p.img, mime: 'image/png' }] : []);
    
    if (sourceImages.length > 0) {
      const newGallery = [];
      for (const item of sourceImages) {
        // gallery items are objects {b64, mime}; fall back gracefully if plain string
        const rawB64 = (item && typeof item === 'object') ? item.b64 : item;
        const mime   = (item && typeof item === 'object') ? (item.mime || 'image/png') : 'image/png';
        if (mime === 'video/webm') {
          // Videos are not compressed — keep as-is
          newGallery.push({ b64: rawB64, mime });
        } else {
          try {
            const compressedB64 = await compressImageB64(rawB64, maxPx);
            newGallery.push({ b64: compressedB64, mime });
          } catch (e) {
            console.error(`Falha ao comprimir imagem para produto ${p.id}`, e);
            newGallery.push({ b64: rawB64, mime }); // fallback to original if compression fails
          }
        }
        done++;
        if (onProgress) onProgress(done, totalImages);
      }
      newP.gallery = newGallery;
      newP.img = newGallery[0].b64;
    }
    
    result.push(newP);
  }
  return result;
}

function assetToDataUrl(path) {
  return fetch(path)
    .then(resp => {
      if (!resp.ok) throw new Error(`Falha ao carregar ${path}`);
      return resp.blob();
    })
    .then(blob => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error(`Falha ao ler ${path}`));
      reader.readAsDataURL(blob);
    }));
}

async function getDefaultBrandAsset() {
  if (settings.logoImg) return settings.logoImg;

  const sidebarLogo = document.querySelector('#sidebarLogo .sidebar-logo-img');
  if (sidebarLogo) {
    const sidebarSrc = sidebarLogo.currentSrc || sidebarLogo.src || '';
    if (sidebarSrc.startsWith('data:')) return sidebarSrc;
  }

  try {
    return await assetToDataUrl('d-dog.png');
  } catch (e) {
    console.error('Erro ao carregar ativo padrao da marca', e);
  }

  return '';
}

function exportCatalog() {
  // Calcular tamanho estimado — todos os produtos, incluindo desativados
  const totalImgs = products.filter(p => p.img).length;
  const rawKB = products.reduce((acc, p) => acc + (p.img ? Math.round(p.img.length * 0.75 / 1024) : 0), 0);
  showExportModal(totalImgs, rawKB);
}

function showExportModal(totalImgs, rawKB) {
  const existing = document.getElementById('exportOptModal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'exportOptModal';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(0,0,0,.65);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:20px;';

  overlay.innerHTML = `
  <div style="background:#fff;border-radius:20px;width:100%;max-width:460px;box-shadow:0 32px 80px rgba(0,0,0,.3);overflow:hidden;">
    <div style="padding:22px 26px 0;border-bottom:1px solid #E5DDD4;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="width:40px;height:40px;border-radius:50%;background:#E8F5EE;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">📦</div>
        <div>
          <h3 style="font-family:'Playfair Display',serif;font-size:1.05rem;font-weight:600;color:#1E1A16;">Exportar Catálogo</h3>
          <p style="font-size:.72rem;color:#A89E94;margin-top:2px;">${totalImgs} imagem${totalImgs!==1?'s':''} · ${rawKB > 1024 ? (rawKB/1024).toFixed(1)+' MB' : rawKB+' KB'} bruto</p>
        </div>
      </div>
    </div>
    <div style="padding:20px 26px;">
      <p style="font-size:.78rem;color:#6B5F54;margin-bottom:6px;">As imagens são exportadas em <strong>PNG com transparência preservada</strong>. A redução de tamanho é feita por redimensionamento &mdash; quanto menor o limite, menor o arquivo.</p>
      <div style="display:flex;align-items:center;gap:6px;background:#E8F5EE;border-radius:8px;padding:8px 12px;margin-bottom:16px;"><span style="font-size:.9rem;">&#9989;</span><span style="font-size:.71rem;color:#2e7a52;font-weight:500;">Transparência preservada. Nenhum pixel é eliminado, apenas redimensionado.</span></div>

      <!-- Presets -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:18px;" id="exportPresets">
        <button onclick="selectExportPreset(this,'web')" data-preset="web"
          style="padding:10px 8px;border-radius:10px;border:2px solid #E5DDD4;background:#F9F6F2;cursor:pointer;text-align:center;transition:all .18s;font-family:'DM Sans',sans-serif;">
          <div style="font-size:1.2rem;margin-bottom:4px;">🌐</div>
          <div style="font-size:.73rem;font-weight:600;color:#1E1A16;">Web</div>
          <div style="font-size:.64rem;color:#A89E94;margin-top:2px;">máx 800px</div>
          <div style="font-size:.6rem;color:#3A8F62;font-weight:600;margin-top:4px;">Recomendado</div>
        </button>
        <button onclick="selectExportPreset(this,'print')" data-preset="print"
          style="padding:10px 8px;border-radius:10px;border:2px solid #E5DDD4;background:#F9F6F2;cursor:pointer;text-align:center;transition:all .18s;font-family:'DM Sans',sans-serif;">
          <div style="font-size:1.2rem;margin-bottom:4px;">🖨️</div>
          <div style="font-size:.73rem;font-weight:600;color:#1E1A16;">Alta Qualidade</div>
          <div style="font-size:.64rem;color:#A89E94;margin-top:2px;">máx 1200px</div>
          <div style="font-size:.6rem;color:#A89E94;font-weight:600;margin-top:4px;">Maior arquivo</div>
        </button>
        <button onclick="selectExportPreset(this,'mobile')" data-preset="mobile"
          style="padding:10px 8px;border-radius:10px;border:2px solid #E5DDD4;background:#F9F6F2;cursor:pointer;text-align:center;transition:all .18s;font-family:'DM Sans',sans-serif;">
          <div style="font-size:1.2rem;margin-bottom:4px;">📱</div>
          <div style="font-size:.73rem;font-weight:600;color:#1E1A16;">Leve</div>
          <div style="font-size:.64rem;color:#A89E94;margin-top:2px;">máx 500px</div>
          <div style="font-size:.6rem;color:#E8602A;font-weight:600;margin-top:4px;">Menor arquivo</div>
        </button>
      </div>

      <!-- Custom controls -->
      <div style="background:#F9F6F2;border-radius:12px;padding:14px 16px;border:1.5px solid #E5DDD4;">
        <div style="font-size:.65rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#A89E94;margin-bottom:12px;">Ajuste Manual</div>
        <div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
            <label style="font-size:.75rem;font-weight:600;color:#6B5F54;">Tamanho máximo</label>
            <span id="sizeLabel" style="font-size:.72rem;color:#3A8F62;font-weight:600;">800 px</span>
          </div>
          <input type="range" id="sizeSlider" min="300" max="1600" step="100" value="800"
            oninput="document.getElementById('sizeLabel').textContent=this.value+' px';clearPresetSelection();"
            style="width:100%;accent-color:#3A8F62;">
          <div style="display:flex;justify-content:space-between;font-size:.6rem;color:#A89E94;margin-top:2px;"><span>300px (menor)</span><span>1600px (maior)</span></div>
        </div>

      </div>

      <!-- Progress (hidden initially) -->
      <div id="exportProgress" style="display:none;margin-top:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:.75rem;color:#6B5F54;font-weight:500;">Comprimindo imagens...</span>
          <span id="exportProgressTxt" style="font-size:.72rem;color:#3A8F62;font-weight:600;">0 / ${totalImgs}</span>
        </div>
        <div style="background:#E5DDD4;border-radius:50px;height:6px;overflow:hidden;">
          <div id="exportProgressBar" style="height:100%;background:#3A8F62;border-radius:50px;width:0%;transition:width .3s;"></div>
        </div>
      </div>
    </div>

    <div style="padding:14px 26px 20px;display:flex;gap:10px;justify-content:flex-end;border-top:1px solid #E5DDD4;">
      <button onclick="document.getElementById('exportOptModal').remove()"
        style="padding:9px 20px;border-radius:50px;border:1.5px solid #E5DDD4;background:none;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:600;color:#6B5F54;cursor:pointer;">
        Cancelar
      </button>
      <button id="btnPreviewExport" onclick="previewExportCatalog()"
        style="padding:9px 20px;border-radius:50px;border:1.5px solid #3A8F62;background:#E8F5EE;color:#2E7A52;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:7px;transition:background .15s;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.06 12a10.94 10.94 0 0 1 19.88 0 10.94 10.94 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/></svg>
        Preview
      </button>
      <button id="btnDoExport" onclick="doExportCatalog()"
        style="padding:9px 22px;border-radius:50px;border:none;background:#3A8F62;color:#fff;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:7px;transition:background .15s;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Exportar Catálogo
      </button>
    </div>
  </div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  // Select "Web" preset by default
  const webBtn = overlay.querySelector('[data-preset="web"]');
  if (webBtn) selectExportPreset(webBtn, 'web');
}

function selectExportPreset(btn, preset) {
  // Clear all
  document.querySelectorAll('#exportPresets button').forEach(b => {
    b.style.borderColor = '#E5DDD4';
    b.style.background  = '#F9F6F2';
  });
  // Highlight selected
  btn.style.borderColor = '#3A8F62';
  btn.style.background  = '#E8F5EE';

  const presets = {
    web:    { size: 800  },
    print:  { size: 1200 },
    mobile: { size: 500  },
  };
  const p = presets[preset] || presets.web;
  document.getElementById('sizeSlider').value = p.size;
  document.getElementById('sizeLabel').textContent = p.size + ' px';
}

function clearPresetSelection() {
  document.querySelectorAll('#exportPresets button').forEach(b => {
    b.style.borderColor = '#E5DDD4';
    b.style.background  = '#F9F6F2';
  });
}

function setExportBusyState(isBusy) {
  const progWrap = document.getElementById('exportProgress');
  const exportBtn = document.getElementById('btnDoExport');
  const previewBtn = document.getElementById('btnPreviewExport');
  if (progWrap) progWrap.style.display = isBusy ? 'block' : 'none';
  if (exportBtn) {
    exportBtn.disabled = isBusy;
    exportBtn.style.opacity = isBusy ? '0.6' : '1';
  }
  if (previewBtn) {
    previewBtn.disabled = isBusy;
    previewBtn.style.opacity = isBusy ? '0.6' : '1';
  }
}

async function buildExportPayload(maxPx, options = {}) {
  const progBar  = document.getElementById('exportProgressBar');
  const progTxt  = document.getElementById('exportProgressTxt');
  const inlineAssets = options.inlineAssets === true;

  // Compress images
  const origProducts = products;
  const compressed = await compressAllProducts(maxPx, (done, total) => {
    const pct = total > 0 ? Math.round(done / total * 100) : 100;
    if (progBar) progBar.style.width = pct + '%';
    if (progTxt) progTxt.textContent = done + ' / ' + total;
  });

  // Build HTML with compressed product data (but buildCard uses relative paths)
  products = compressed;
  try {
    const brandAsset = await getDefaultBrandAsset();
    const html = buildCatalogHTML(brandAsset || '', brandAsset || '', { inlineAssets });
    return { html, compressed, origProducts };
  } finally {
    products = origProducts;
  }
}

async function previewExportCatalog() {
  const maxPx = parseInt(document.getElementById('sizeSlider').value) || 800;
  const previewWin = window.open('', '_blank');
  if (!previewWin) {
    showToast('Nao foi possivel abrir a pre-visualizacao. Libere pop-ups do navegador.', 'error');
    return;
  }

  previewWin.document.write('<title>Preview do Catalogo</title><body style="font-family:Arial,sans-serif;padding:24px;">Gerando preview...</body>');
  previewWin.document.close();

  setExportBusyState(true);
  try {
    const { html } = await buildExportPayload(maxPx, { inlineAssets: true });
    previewWin.document.open();
    previewWin.document.write(html);
    previewWin.document.close();
  } catch (err) {
    console.error(err);
    previewWin.close();
    showToast('Erro ao gerar preview: ' + err.message, 'error');
  } finally {
    setExportBusyState(false);
  }
}

async function doExportCatalog() {
  const maxPx   = parseInt(document.getElementById('sizeSlider').value) || 800;

  setExportBusyState(true);

  let payload;
  try {
    payload = await buildExportPayload(maxPx, { inlineAssets: false });
  } catch (err) {
    showToast('Erro ao comprimir imagens: ' + err.message, 'error');
    setExportBusyState(false);
    return;
  }

  const { html, compressed, origProducts } = payload;

  // Create ZIP
  const zip = new JSZip();
  const imgFolder = zip.folder("img");

  // Add HTML
  zip.file("index.html", html);

  // Helper to convert base64 to Uint8Array
  // Accepts both plain base64 and data-URL strings (data:image/...;base64,XXX)
  function b64ToUint8(b64) {
    if (!b64) return null;
    const parts = b64.split(',');
    const raw = parts.length >= 2 ? parts[1] : parts[0]; // handle both formats
    if (!raw) return null;
    const bin = atob(raw);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  // Add logo if exists
  if (settings.logoImg) {
    try {
      const u8 = b64ToUint8(settings.logoImg);
      if (u8) imgFolder.file("logo.png", u8);
    } catch(e) { console.error("Erro ao adicionar logo ao ZIP", e); }
  }

  // Add images to ZIP
  compressed.forEach(p => {
    const safeId = String(p.id).replace(/\./g, '_');
    if (p.gallery && p.gallery.length > 0) {
      p.gallery.forEach((imgItem, i) => {
        if (!imgItem) return; // Pular imagens nulas ou vazias
        try {
          // gallery items may be {b64, mime} objects or plain base64 strings
          const imgB64 = (imgItem && typeof imgItem === 'object') ? imgItem.b64 : imgItem;
          const ext = ((imgItem && typeof imgItem === 'object' && imgItem.mime) || 'image/png').split('/')[1] || 'png';
          const u8 = b64ToUint8(imgB64);
          if (u8) {
            imgFolder.file(`${safeId}_${i}.${ext}`, u8);
          }
        } catch(e) { 
          console.error(`Erro ao processar imagem [${i}] do produto ${p.id}:`, e);
        }
      });
    }
  });

  // Close modal
  const modal = document.getElementById('exportOptModal');
  if (modal) modal.remove();

  // Generate and Save ZIP
  try {
    const content = await zip.generateAsync({type:"blob"});
    saveAs(content, "delivet-catalogo.zip");

    // Success Message
    const totalImgs = compressed.filter(p => p.img).length;
    const inactiveCount = compressed.filter(p => p.ativo === false).length;
    const origKB = origProducts.reduce((acc, p) => acc + (p.img ? Math.round(p.img.length * 0.75 / 1024) : 0), 0);
    const newKB  = compressed.reduce((acc, p)  => acc + (p.img ? Math.round(p.img.length * 0.75 / 1024) : 0), 0);
    const saved  = origKB - newKB;
    const pct    = origKB > 0 ? Math.round(saved / origKB * 100) : 0;
    
    const msg = totalImgs > 0
      ? `Catálogo exportado (ZIP)! ✓ Imagens: ${origKB > 1024 ? (origKB/1024).toFixed(1)+'MB' : origKB+'KB'} → ${newKB > 1024 ? (newKB/1024).toFixed(1)+'MB' : newKB+'KB'} (−${pct}%)${inactiveCount ? ' · '+inactiveCount+' desativado(s) preservado(s)' : ''}`
      : `Catálogo exportado (ZIP)! ✓${inactiveCount ? ' · '+inactiveCount+' desativado(s) preservado(s)' : ''}`;
    showToast(msg, 'success');
  } catch (err) {
    console.error(err);
    showToast('Erro ao gerar arquivo ZIP: ' + err.message, 'error');
  } finally {
    setExportBusyState(false);
  }
}

function showDownloadPanel(html) {
  // Remove existing panel if any
  const existing = document.getElementById('downloadPanel');
  if(existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'downloadPanel';
  panel.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:24px;';
  panel.innerHTML = '<div style="background:#fff;border-radius:20px;padding:28px;max-width:500px;width:100%;box-shadow:0 32px 80px rgba(0,0,0,.3);">'
    + '<h3 style="font-family:\'Playfair Display\',serif;font-size:1.2rem;margin-bottom:8px;">Salvar Cat\u00e1logo</h3>'
    + '<p style="font-size:.82rem;color:#6B5F54;margin-bottom:16px;">Selecione todo o conte\u00fado abaixo, copie e cole em um arquivo <strong>.html</strong> no seu computador.</p>'
    + '<textarea id="htmlOutput" style="width:100%;height:160px;font-size:.7rem;font-family:monospace;border:1.5px solid #E5DDD4;border-radius:8px;padding:10px;resize:none;outline:none;" readonly></textarea>'
    + '<div style="display:flex;gap:10px;margin-top:14px;">'
    + '<button onclick="document.getElementById(\'htmlOutput\').select();document.execCommand(\'copy\');this.textContent=\'Copiado! \u2713\';" style="flex:1;background:#3A8F62;color:#fff;border:none;padding:10px;border-radius:50px;font-weight:600;cursor:pointer;font-size:.82rem;">Copiar HTML</button>'
    + '<button onclick="document.getElementById(\'downloadPanel\').remove();" style="background:none;border:1.5px solid #E5DDD4;padding:10px 18px;border-radius:50px;cursor:pointer;font-size:.82rem;">Fechar</button>'
    + '</div></div>';
  document.body.appendChild(panel);
  // Set textarea content after append (large strings)
  document.getElementById('htmlOutput').value = html;
  panel.addEventListener('click', e => { if(e.target === panel) panel.remove(); });
}

function buildCatalogHTML(watermarkAsset = 'img/d-dog.png', defaultLogoAsset = 'img/d-dog.png', options = {}) {
  const s        = settings;
  const verde    = s.colorVerde;
  const laranja  = s.colorLaranja;
  const bg       = s.colorBg;
  const wmOpacity = Math.max(0, Math.min(0.4, Number(s.watermarkOpacity != null ? s.watermarkOpacity : 0.18)));
  const safeLogoAsset = defaultLogoAsset || '';
  const safeWatermarkAsset = watermarkAsset || '';
  const inlineAssets = options.inlineAssets === true;
  const exportedLogoAsset = inlineAssets ? (s.logoImg || safeLogoAsset) : 'img/logo.png';
  const catOrder = Object.keys(catConfig).filter(c => catConfig[c].active !== false);

  const bycat = {};
  catOrder.forEach(c => bycat[c]=[]);
  products.forEach(p => {
    if(bycat[p.categoria]) bycat[p.categoria].push(p);
    else bycat['Outros'].push(p);
  });

  // Build sections
  const logoHtml = s.logoImg
    ? `<img src="${exportedLogoAsset}" alt="${s.siteName}" style="height:40px;object-fit:contain;">`
    : (safeLogoAsset
      ? `<img src="${safeLogoAsset}" alt="${s.siteName}" style="height:40px;object-fit:contain;">`
      : `<span class="nav-logo" style="color:${verde}">${s.siteName}<span style="color:${laranja}">.</span></span>`);

  const totalProds = products.filter(p => p.ativo !== false).length; // visíveis no catálogo
  const totalCats  = catOrder.filter(c => bycat[c] && bycat[c].length > 0).length;

  // ── Card building ──
  function buildInlineMediaSrc(item, fallbackMime = 'image/png') {
    if (!item) return '';
    if (typeof item === 'string') {
      return item.startsWith('data:') ? item : `data:${fallbackMime};base64,${item}`;
    }
    const mime = item.mime || fallbackMime;
    const raw = item.b64 || '';
    if (!raw) return '';
    return raw.startsWith('data:') ? raw : `data:${mime};base64,${raw}`;
  }

  function buildCard(p, cfg, cat) {
    const dets = (p.detalhes || []).map(d => `<li>${d}</li>`).join('');
    const activeTags = normalizeProductTags(p.tags).filter(tag => tag.active !== false);
    const tagBadges = activeTags.length
      ? `<div class="prod-tags">${activeTags.map(tag => `<span class="prod-tag">${escHtml(tag.label)}</span>`).join('')}</div>`
      : '';
    
    const safeId = String(p.id).replace(/\./g, '_');

    // Caminho da imagem no ZIP (img/id_0.png)
    const hasImages = (p.gallery && p.gallery.length) || p.img;
    const mainItem = p.gallery && p.gallery.length ? p.gallery[0] : null;
    const mainMime = (mainItem && typeof mainItem === 'object' && mainItem.mime) || 'image/png';
    const mainExt  = mainMime.split('/')[1] || 'png';
    const imgPath  = hasImages
      ? (inlineAssets
          ? buildInlineMediaSrc(mainItem || { b64: p.img, mime: mainMime }, mainMime)
          : `img/${safeId}_0.${mainExt}`)
      : null;

    const imgTag = imgPath
      ? (mainMime === 'video/webm'
          ? `<video class="pcard-real-img" src="${imgPath}" muted loop autoplay playsinline style="max-height:168px;max-width:82%;object-fit:contain;"></video>`
          : `<img class="pcard-real-img" src="${imgPath}" alt="${p.nome}">`)
      : '';
    const phTag = hasImages ? '' : `<div class="placeholder-emoji">${cfg.emoji}</div>`;

    // Galeria extra — se houver mais de uma foto
    let galleryData = '';
    if (p.gallery && p.gallery.length > 1) {
      galleryData = p.gallery.slice(1).map((g, i) => {
        const ext = ((g && typeof g === 'object' && g.mime) || 'image/png').split('/')[1] || 'png';
        const mediaSrc = inlineAssets
          ? buildInlineMediaSrc(g, (g && g.mime) || 'image/png')
          : `img/${safeId}_${i+1}.${ext}`;
        if (g && g.mime === 'video/webm') {
          return `<video class="pcard-extra-img" src="${inlineAssets ? mediaSrc : `img/${safeId}_${i+1}.webm`}" data-idx="${i+1}" style="display:none" muted loop autoplay playsinline></video>`;
        }
        return `<img class="pcard-extra-img" src="${mediaSrc}" data-idx="${i+1}" alt="${p.nome} ${i+2}" style="display:none">`;
      }).join('');
    }

    // Dots de cor
    const colorDots = (p.colors && p.colors.length)
      ? `<div class="card-colors">${p.colors.map(hex => `<div class="card-color-dot" style="background:${hex}" title="${hex}"></div>`).join('')}</div>`
      : '';

    // Badge de múltiplas fotos — removido do catálogo exportado (discreto)
    const photoBadge = '';

    const inactiveAttr = p.ativo === false ? ' data-inactive="true"' : '';
    return `<div class="card" data-cat="${cat}"${inactiveAttr} onclick="openViewer(this)"
      style="--g:${cfg.gradient};--acc:${cfg.accent};--dark:${cfg.dark};--tag-bg:${cfg.tag_bg};--tag-c:${cfg.tag_c}">
  ${photoBadge}
  <div class="card-img ${hasImages ? 'has-img' : 'no-img'}">
    <div class="img-glow"></div>
    ${imgTag}${phTag}${galleryData}
  </div>
  <div class="card-body">
    <div class="card-top">
      <span class="cat-tag">${cfg.emoji} ${cat}</span>
      ${p.codigo ? `<span class="cod">#${p.codigo}</span>` : ''}
    </div>
    <h3>${p.nome}</h3>
    ${tagBadges}
    ${colorDots}
    ${dets ? `<ul class="details">${dets}</ul>` : ''}
  </div>
</div>`;
  }

  // ── Sections ──
  const sections = catOrder.map(cat => {
    const prods = bycat[cat];
    if (!prods || !prods.length) return '';
    const cfg   = catConfig[cat];
    const cards = prods.map(p => buildCard(p, cfg, cat)).join('\n');
    return `<section class="cat-section" id="cat-${catOrder.indexOf(cat)}" data-cat="${cat}">
  <div class="section-head">
    <div class="section-label">
      <div class="section-emoji">${cfg.emoji}</div>
      <div><p class="section-eyebrow">Categoria</p><h2 class="section-title">${cat}</h2></div>
    </div>
    <div class="section-count">${prods.length} produto${prods.length !== 1 ? 's' : ''}</div>
  </div>
  <div class="grid">${cards}</div>
</section>`;
  }).join('\n');

  // ── Viewer CSS ──
  const viewerCSS = `
/* ── PRODUCT VIEWER ── */
.card{cursor:pointer;}
.card-img img.pcard-real-img{max-height:168px;max-width:82%;object-fit:contain;position:relative;z-index:1;filter:drop-shadow(0 10px 22px rgba(0,0,0,.18));transition:transform .3s;}
.card:hover .card-img img.pcard-real-img{transform:scale(1.07) translateY(-4px);}
.pv-overlay{position:fixed;inset:0;z-index:500;background:rgba(10,8,6,.78);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;pointer-events:none;transition:opacity .26s;}
.pv-overlay.open{opacity:1;pointer-events:all;}
.pv-modal{background:#fff;border-radius:26px;width:100%;max-width:740px;max-height:90vh;overflow:hidden;display:flex;box-shadow:0 40px 100px rgba(0,0,0,.35);transform:scale(.95) translateY(16px);transition:transform .3s cubic-bezier(.2,.8,.2,1);position:relative;}
.pv-overlay.open .pv-modal{transform:scale(1) translateY(0);}
.pv-img-side{width:300px;flex-shrink:0;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;padding:28px;background:linear-gradient(var(--pv-g,135deg,#f0f0f0,#e0e0e0));}
.pv-img-side::before{content:'';position:absolute;inset:18px;background:${safeWatermarkAsset ? `url('${safeWatermarkAsset}') center/64% no-repeat` : 'none'};opacity:${wmOpacity};filter:grayscale(1);pointer-events:none;z-index:0;}
.pv-img-badge{position:absolute;top:14px;left:14px;z-index:5;display:inline-flex;align-items:center;min-height:28px;max-width:calc(100% - 72px);padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.9);color:var(--pv-tag-c,#666);border:1px solid rgba(255,255,255,.7);backdrop-filter:blur(10px);box-shadow:0 10px 24px rgba(0,0,0,.12);font-size:.62rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pv-glow{position:absolute;width:240px;height:240px;background:radial-gradient(circle,rgba(255,255,255,.6) 0%,transparent 68%);border-radius:50%;pointer-events:none;}
.pv-img-side img{max-width:100%;max-height:250px;object-fit:contain;position:relative;z-index:1;filter:drop-shadow(0 14px 30px rgba(0,0,0,.22));animation:pvFloat 4s ease-in-out infinite;}
.pv-img-side .pv-ph{font-size:7rem;opacity:.22;position:relative;z-index:1;}
@keyframes pvFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);}}
.pv-info{flex:1;padding:28px 28px 24px;display:flex;flex-direction:column;overflow-y:auto;}
.pv-close{position:absolute;top:14px;right:14px;z-index:10;width:34px;height:34px;border-radius:50%;background:rgba(0,0,0,.07);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.85rem;color:#555;transition:background .15s;}
.pv-close:hover{background:rgba(0,0,0,.14);}
.pv-badge{display:inline-flex;align-items:center;gap:6px;font-size:.62rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;background:var(--pv-tag-bg,#eee);color:var(--pv-tag-c,#666);padding:4px 12px;border-radius:50px;align-self:flex-start;margin-bottom:14px;}
.pv-name{font-family:'Playfair Display',serif;font-size:1.6rem;font-weight:700;line-height:1.15;color:#1E1A16;margin-bottom:6px;}
.pv-cod{font-size:.7rem;color:#A89E94;letter-spacing:.1em;margin-bottom:20px;}
.pv-sep{height:1px;background:rgba(0,0,0,.07);margin-bottom:16px;}
.pv-specs-label{font-size:.62rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#A89E94;margin-top:4px;margin-bottom:10px;}
.pv-specs{list-style:none;flex:1;}
.pv-specs li{display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid rgba(0,0,0,.05);font-size:.85rem;color:#6B5F54;line-height:1.5;}
.pv-specs li:last-child{border-bottom:none;}
.pv-specs li::before{content:'';display:block;width:6px;height:6px;border-radius:50%;background:var(--pv-acc,#ccc);flex-shrink:0;margin-top:7px;}
.pv-empty{font-size:.85rem;color:#A89E94;font-style:italic;}
.pv-nav{display:flex;align-items:center;justify-content:space-between;margin-top:20px;padding-top:16px;border-top:1px solid rgba(0,0,0,.07);}
.pv-nav-btn{display:inline-flex;align-items:center;gap:5px;background:none;border:1.5px solid rgba(0,0,0,.1);border-radius:50px;padding:6px 14px;font-family:'DM Sans',sans-serif;font-size:.74rem;font-weight:500;color:#6B5F54;cursor:pointer;transition:border-color .15s,color .15s;}
.pv-nav-btn:hover{border-color:${verde};color:${verde};}
.pv-nav-btn:disabled{opacity:.28;cursor:default;pointer-events:none;}
.pv-counter{font-size:.7rem;color:#A89E94;letter-spacing:.06em;}
@media(max-width:600px){.pv-modal{flex-direction:column;}.pv-img-side{width:100%;height:220px;}.pv-name{font-size:1.25rem;}}
.pv-img-arrow{position:absolute;top:50%;transform:translateY(-50%);z-index:4;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.18);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.28);color:#fff;font-size:.75rem;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;transition:opacity .2s,background .15s;pointer-events:none;}
.pv-img-arrow.prev{left:10px;}.pv-img-arrow.next{right:10px;}
.pv-img-arrow:hover{background:rgba(255,255,255,.32);}
.pv-img-arrow:disabled{opacity:0!important;pointer-events:none;}
.pv-img-side:hover .pv-img-arrow:not(:disabled){opacity:1;pointer-events:all;}
.pv-dots{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:5px;align-items:center;z-index:4;pointer-events:none;}
.pv-dot{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.4);transition:background .2s,transform .2s;}
.pv-dot.active{background:#fff;transform:scale(1.35);}
@media(max-width:600px){.pv-img-arrow{opacity:.7!important;pointer-events:all!important;width:28px;height:28px;}.pv-img-arrow.prev{left:6px;}.pv-img-arrow.next{right:6px;}}
.img-lightbox{position:fixed;inset:0;z-index:900;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .3s;cursor:zoom-out;overflow:hidden;}
.img-lightbox.open{opacity:1;pointer-events:all;}
.img-lightbox-bg{position:absolute;inset:0;transition:background .3s;}
.img-lightbox-glow{position:absolute;width:60vw;height:60vw;max-width:700px;max-height:700px;background:radial-gradient(circle,rgba(255,255,255,.18) 0%,transparent 68%);border-radius:50%;pointer-events:none;}
.img-lightbox img{max-width:82vw;max-height:82vh;object-fit:contain;position:relative;z-index:1;filter:drop-shadow(0 28px 60px rgba(0,0,0,.35));transform:scale(.88) translateY(20px);transition:transform .38s cubic-bezier(.2,.8,.2,1);cursor:default;animation:none;}
.img-lightbox.open img{transform:scale(1) translateY(0);animation:lbFloat 5s ease-in-out infinite;}
@keyframes lbFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-14px);}}
.img-lightbox-close{position:absolute;top:20px;right:20px;z-index:10;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.15);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.2);color:#fff;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;}
.img-lightbox-close:hover{background:rgba(255,255,255,.28);}
.img-lightbox-hint{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);font-size:.68rem;color:rgba(255,255,255,.35);letter-spacing:.1em;pointer-events:none;white-space:nowrap;}
.pv-img-side img.has-zoom{cursor:zoom-in;transition:transform .3s,filter .3s;}
.pv-img-side img.has-zoom:hover{transform:scale(1.08) translateY(-6px);filter:drop-shadow(0 22px 44px rgba(0,0,0,.32));}`;

  // ── Viewer JS ──
  const viewerJS = `
// As imagens já são carregadas via src relativo (img/)
var pvAllCards = [];
var pvIdx = 0;
var pvActiveImg = 0;
var pvCurImgs   = [];

function openViewer(cardEl) {
  pvAllCards = Array.from(document.querySelectorAll('.card:not(.hidden)'));
  pvIdx = pvAllCards.indexOf(cardEl);
  if (pvIdx < 0) pvIdx = 0;
  pvActiveImg = 0;
  pvRenderModal();
  document.getElementById('pvOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function pvClose() {
  document.getElementById('pvOverlay').classList.remove('open');
  document.body.style.overflow = '';
}
function pvCloseOutside(e) { if (e.target.id === 'pvOverlay') pvClose(); }
function pvNav(dir) {
  pvIdx = Math.max(0, Math.min(pvAllCards.length - 1, pvIdx + dir));
  pvActiveImg = 0;
  pvRenderModal();
}
function pvGalleryNav(dir) {
  pvActiveImg = Math.max(0, Math.min(pvCurImgs.length - 1, pvActiveImg + dir));
  pvSetImg(pvActiveImg);
  pvUpdateNav();
}
function pvSetImg(i) {
  var pvImg = document.getElementById('pvImg');
  var pvPh  = document.getElementById('pvPh');
  var side  = document.getElementById('pvImgSide');
  pvImg.style.display = 'none'; pvPh.style.display = 'none';
  // Remove any previous video inserted by viewer
  var oldVid = side.querySelector('.pv-vid-embed');
  if (oldVid) oldVid.remove();
  var card = pvAllCards[pvIdx];
  var g    = card.style.getPropertyValue('--g') || '135deg,#f0f0f0,#e0e0e0';
  if (pvCurImgs.length > 0) {
    var srcEl = pvCurImgs[i] || pvCurImgs[0];
    if (srcEl.tagName === 'VIDEO') {
      // Render video in viewer
      var vid = document.createElement('video');
      vid.className = 'pv-vid-embed';
      vid.src = srcEl.src;
      vid.muted = true; vid.loop = true; vid.autoplay = true; vid.playsInline = true;
      vid.controls = true;
      vid.style.cssText = 'max-width:90%;max-height:60vh;border-radius:12px;display:block;margin:auto;';
      side.appendChild(vid);
      pvImg.className = ''; pvImg.onclick = null;
    } else {
      pvImg.src = srcEl.src;
      pvImg.style.display = 'block';
      pvImg.className = 'has-zoom';
      pvImg.onclick = function(e){ e.stopPropagation(); pvImgZoom(pvImg.src, g); };
    }
  } else {
    pvImg.className = ''; pvImg.onclick = null;
  }
}
function pvUpdateNav() {
  var n    = pvCurImgs.length;
  var prev = document.getElementById('pvGalleryPrev');
  var next = document.getElementById('pvGalleryNext');
  var dots = document.getElementById('pvDots');
  if (prev) { prev.style.display = n > 1 ? '' : 'none'; prev.disabled = pvActiveImg === 0; }
  if (next) { next.style.display = n > 1 ? '' : 'none'; next.disabled = pvActiveImg === n - 1; }
  if (dots) {
    dots.innerHTML = '';
    if (n > 1) for (var i = 0; i < n; i++) {
      var d = document.createElement('div');
      d.className = 'pv-dot' + (i === pvActiveImg ? ' active' : '');
      dots.appendChild(d);
    }
  }
}
function pvRenderModal() {
  var card  = pvAllCards[pvIdx];
  var modal = document.getElementById('pvModal');
  var side  = document.getElementById('pvImgSide');
  var g     = card.style.getPropertyValue('--g')      || '135deg,#f0f0f0,#e0e0e0';
  var acc   = card.style.getPropertyValue('--acc')    || '#ccc';
  var tagBg = card.style.getPropertyValue('--tag-bg') || '#eee';
  var tagC  = card.style.getPropertyValue('--tag-c')  || '#555';
  side.style.background = 'linear-gradient(' + g + ')';
  modal.style.setProperty('--pv-acc',    acc);
  modal.style.setProperty('--pv-tag-bg', tagBg);
  modal.style.setProperty('--pv-tag-c',  tagC);

  pvCurImgs   = Array.from(card.querySelectorAll('.card-img img, .card-img video'));
  pvActiveImg = 0;
  pvSetImg(0);
  pvUpdateNav();

  var cardTags = Array.from(card.querySelectorAll('.prod-tag'));
  var pvImgBadge = document.getElementById('pvImgBadge');
  if (cardTags.length) {
    pvImgBadge.textContent = cardTags[0].textContent.trim();
    pvImgBadge.style.display = 'inline-flex';
  } else {
    pvImgBadge.textContent = '';
    pvImgBadge.style.display = 'none';
  }

  // Placeholder sem imagem
  if (!pvCurImgs.length) {
    var pvPh = document.getElementById('pvPh');
    var ph = card.querySelector('.placeholder-emoji');
    pvPh.textContent = ph ? ph.textContent : '📦';
    pvPh.style.display = 'block';
  }

  document.getElementById('pvBadge').textContent = card.querySelector('.cat-tag').textContent.trim();
  document.getElementById('pvName').textContent  = card.querySelector('h3').textContent.trim();
  var codEl = card.querySelector('.cod');
  document.getElementById('pvCod').textContent = codEl ? codEl.textContent.trim() : '';

  // Cores do produto
  var pvColorsSection = document.getElementById('pvColorsSection');
  var colorDots = Array.from(card.querySelectorAll('.card-color-dot'));
  if (colorDots.length) {
    pvColorsSection.innerHTML = '<div class="pv-colors-label">Cores disponíveis</div><div class="pv-colors"></div>';
    var dotsWrap = pvColorsSection.querySelector('.pv-colors');
    colorDots.forEach(function(d) {
      var dot = document.createElement('div');
      dot.className = 'pv-color-dot';
      dot.style.background = d.style.background;
      dot.title = d.title;
      dotsWrap.appendChild(dot);
    });
  } else { pvColorsSection.innerHTML = ''; }

  // Specs
  var dets = Array.from(card.querySelectorAll('.details li'));
  var specs = document.getElementById('pvSpecs');
  specs.innerHTML = dets.length
    ? dets.map(function(li){ return '<li>' + li.textContent.trim() + '</li>'; }).join('')
    : '<li class="pv-empty">Sem especificações cadastradas.</li>';

  document.getElementById('pvCounter').textContent = (pvIdx + 1) + ' / ' + pvAllCards.length;
  document.getElementById('pvPrev').disabled = pvIdx === 0;
  document.getElementById('pvNext').disabled = pvIdx === pvAllCards.length - 1;
}
document.addEventListener('keydown', function(e) {
  if (!document.getElementById('pvOverlay').classList.contains('open')) return;
  if (e.key === 'Escape')     pvClose();
  if (e.key === 'ArrowRight') pvNav(1);
  if (e.key === 'ArrowLeft')  pvNav(-1);
});
// Swipe touch
(function(){
  var tx = 0;
  var side = function(){ return document.getElementById('pvImgSide'); };
  document.addEventListener('touchstart', function(e){
    if(!side()||!side().contains(e.target)) return;
    tx = e.touches[0].clientX;
  },{passive:true});
  document.addEventListener('touchend', function(e){
    if(!side()||!side().contains(e.target)) return;
    var dx = e.changedTouches[0].clientX - tx;
    if(Math.abs(dx) > 40) pvGalleryNav(dx < 0 ? 1 : -1);
  },{passive:true});
})();
// ── IMAGE LIGHTBOX ──
function pvImgZoom(src, gradient) {
  var lb  = document.getElementById('imgLightbox');
  var img = document.getElementById('imgLightboxImg');
  var bg  = document.getElementById('imgLightboxBg');
  img.src = src;
  bg.style.background = 'linear-gradient(' + (gradient || '135deg,#1a1a2e,#16213e') + ')';
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function pvImgZoomClose() {
  document.getElementById('imgLightbox').classList.remove('open');
  if(!document.getElementById('pvOverlay').classList.contains('open')) {
    document.body.style.overflow = '';
  }
}
document.addEventListener('keydown', function(e) {
  if(e.key === 'Escape' && document.getElementById('imgLightbox').classList.contains('open')) pvImgZoomClose();
});`;

  // ── Full HTML ──
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${s.siteName} — Catálogo 2025</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=Pacifico&display=swap" rel="stylesheet">
<style>
:root{--bg:${bg};--surface:#fff;--text:#1E1A16;--mid:#6B5F54;--muted:#A89E94;--verde:${verde};--laranja:${laranja};--radius:20px;}
*{margin:0;padding:0;box-sizing:border-box;}html{scroll-behavior:smooth;}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);font-size:15px;line-height:1.6;}
nav{position:sticky;top:0;z-index:100;background:rgba(247,243,238,.92);backdrop-filter:blur(18px);border-bottom:1px solid rgba(0,0,0,.07);padding:0 48px;display:flex;align-items:center;gap:32px;height:64px;}
.nav-logo{font-family:'Pacifico',cursive;font-size:1.6rem;color:var(--verde);white-space:nowrap;margin-right:auto;}
.nav-logo span{color:var(--laranja);}
.nav-cats{display:flex;gap:6px;list-style:none;overflow-x:auto;scrollbar-width:none;padding:8px 0;}
.nav-cats::-webkit-scrollbar{display:none;}
.nav-cats a{display:flex;align-items:center;gap:5px;white-space:nowrap;padding:6px 14px;border-radius:50px;font-size:.78rem;font-weight:500;color:var(--mid);text-decoration:none;transition:background .18s,color .18s;}
.nav-cats a:hover{background:rgba(0,0,0,.05);}
.nav-cats a.active{background:var(--verde);color:#fff;}
.nav-search{display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.05);border-radius:50px;padding:7px 16px;min-width:200px;}
.nav-search input{border:none;background:none;outline:none;font-family:'DM Sans',sans-serif;font-size:.82rem;color:var(--text);width:100%;}
.hero{padding:72px 48px 60px;position:relative;overflow:hidden;background:linear-gradient(135deg,${verde} 0%,#4CAF82 60%,#80D8A8 100%);}
.hero-blob1{position:absolute;width:500px;height:500px;background:rgba(255,255,255,.10);border-radius:62% 38% 55% 45%/48% 58% 42% 52%;top:-150px;right:-100px;pointer-events:none;}
.hero-blob2{position:absolute;width:300px;height:300px;background:rgba(255,200,50,.15);border-radius:48% 52% 65% 35%/40% 60% 50% 50%;bottom:-80px;left:30%;pointer-events:none;}
.hero-content{position:relative;z-index:1;max-width:600px;}
.hero-eyebrow{display:inline-flex;align-items:center;gap:10px;font-size:.72rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.75);margin-bottom:18px;}
.hero-eyebrow::before{content:'';display:block;width:28px;height:1.5px;background:rgba(255,255,255,.6);}
.hero h1{font-family:'Playfair Display',serif;font-size:clamp(2.8rem,5vw,4.2rem);line-height:1.05;color:#fff;margin-bottom:18px;}
.hero h1 em{font-style:italic;color:#FFE082;}
.hero-desc{font-size:1rem;color:rgba(255,255,255,.8);line-height:1.7;max-width:440px;margin-bottom:32px;}
.hero-pills{display:flex;gap:10px;flex-wrap:wrap;}
.hero-pill{background:rgba(255,255,255,.18);color:#fff;padding:7px 16px;border-radius:50px;font-size:.76rem;font-weight:500;border:1px solid rgba(255,255,255,.25);}
.hero-stats{position:absolute;bottom:40px;right:48px;display:flex;gap:32px;z-index:1;}
.hstat-num{font-family:'Playfair Display',serif;font-size:2.2rem;color:#fff;font-weight:700;line-height:1;}
.hstat-label{font-size:.64rem;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.55);margin-top:2px;}
.main{max-width:1400px;margin:0 auto;padding:60px 48px 80px;}
.cat-section{margin-bottom:72px;}
.section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid rgba(0,0,0,.06);}
.section-label{display:flex;align-items:center;gap:16px;}
.section-emoji{font-size:2.4rem;width:54px;height:54px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.04);border-radius:14px;flex-shrink:0;}
.section-eyebrow{font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-bottom:3px;}
.section-title{font-family:'Playfair Display',serif;font-size:1.8rem;font-weight:700;color:var(--text);}
.section-count{font-size:.78rem;font-weight:600;color:var(--muted);}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px;}
.card{background:var(--surface);border-radius:var(--radius);overflow:hidden;transition:transform .28s cubic-bezier(.2,.8,.2,1),box-shadow .28s;display:flex;flex-direction:column;position:relative;}
.card:hover{transform:translateY(-7px) scale(1.012);box-shadow:0 24px 56px rgba(0,0,0,.13);}
.card::after{content:'Ver detalhes';position:absolute;bottom:0;left:0;right:0;background:var(--verde);color:#fff;font-size:.7rem;font-weight:600;letter-spacing:.06em;text-align:center;padding:8px 0;transform:translateY(100%);transition:transform .22s cubic-bezier(.2,.8,.2,1);}
.card:hover::after{transform:translateY(0);}
.card-img{height:200px;display:flex;align-items:center;justify-content:center;background:linear-gradient(var(--g));position:relative;overflow:hidden;}
.card-img::before{content:'';position:absolute;inset:10px;background:${safeWatermarkAsset ? `url('${safeWatermarkAsset}') center/62% no-repeat` : 'none'};opacity:${wmOpacity};filter:grayscale(1);pointer-events:none;z-index:0;}
.img-glow{position:absolute;width:160px;height:160px;background:radial-gradient(circle,rgba(255,255,255,.55) 0%,transparent 70%);border-radius:50%;pointer-events:none;}
.placeholder-emoji{font-size:5rem;position:relative;z-index:1;opacity:.4;user-select:none;}
.card-body{padding:16px 18px 20px;flex:1;display:flex;flex-direction:column;gap:8px;}
.card-top{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.cat-tag{font-size:.62rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;background:var(--tag-bg);color:var(--tag-c);padding:3px 9px;border-radius:50px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;}
.cod{font-size:.6rem;color:var(--muted);letter-spacing:.06em;white-space:nowrap;flex-shrink:0;}
.card-body h3{font-family:'Playfair Display',serif;font-size:1.02rem;font-weight:600;line-height:1.3;color:var(--text);}
.prod-tags{display:flex;gap:6px;flex-wrap:wrap;padding-top:2px;}
.prod-tag{display:inline-flex;align-items:center;min-height:24px;padding:4px 10px;border-radius:999px;background:rgba(0,0,0,.06);color:var(--text);font-size:.62rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;}
.details{list-style:none;margin-top:auto;border-top:1px solid rgba(0,0,0,.05);padding-top:8px;}
.details li{font-size:.71rem;color:var(--mid);line-height:1.5;padding:3px 0;border-bottom:1px solid rgba(0,0,0,.04);display:flex;align-items:flex-start;gap:6px;}
.details li:last-child{border-bottom:none;}
.details li::before{content:'·';color:var(--acc);font-weight:700;font-size:.9rem;line-height:1.4;flex-shrink:0;}
.card.hidden{display:none;}.cat-section.all-hidden{display:none;}.card[data-inactive]{display:none;}
/* ── Cores e badge de fotos nos cards ── */
.card-colors{display:flex;gap:5px;flex-wrap:wrap;padding:8px 0 0;}
.card-color-dot{width:13px;height:13px;border-radius:50%;border:1.5px solid rgba(0,0,0,.09);flex-shrink:0;transition:transform .15s;}
.card-color-dot:hover{transform:scale(1.25);}
.card-photos-badge{display:none;}
/* ── Galeria no viewer — setas ghost + dots ── */
.pv-img-arrow{position:absolute;top:50%;transform:translateY(-50%);z-index:4;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.18);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.28);color:#fff;font-size:.75rem;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;transition:opacity .2s,background .15s;pointer-events:none;}
.pv-img-arrow.prev{left:10px;}.pv-img-arrow.next{right:10px;}
.pv-img-arrow:hover{background:rgba(255,255,255,.32);}
.pv-img-arrow:disabled{opacity:0!important;pointer-events:none;}
.pv-img-side:hover .pv-img-arrow:not(:disabled){opacity:1;pointer-events:all;}
.pv-dots{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:5px;align-items:center;z-index:4;pointer-events:none;}
.pv-dot{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.4);transition:background .2s,transform .2s;}
.pv-dot.active{background:#fff;transform:scale(1.35);}
@media(max-width:600px){.pv-img-arrow{opacity:.7!important;pointer-events:all!important;width:28px;height:28px;}.pv-img-arrow.prev{left:6px;}.pv-img-arrow.next{right:6px;}}
.pv-colors-label{font-size:.6rem;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#A89E94;margin-top:16px;margin-bottom:6px;}
.pv-colors{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px;}
.pv-color-dot{width:20px;height:20px;border-radius:50%;border:2px solid rgba(0,0,0,.08);transition:transform .15s;cursor:default;}
.pv-color-dot:hover{transform:scale(1.18);}
footer{background:var(--text);color:#fff;padding:48px 48px 32px;}
.footer-inner{max-width:1400px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;}
.footer-logo{font-family:'Pacifico',cursive;font-size:1.8rem;color:#fff;}
.footer-logo span{color:${laranja};}
.footer-contact{display:flex;gap:20px;flex-wrap:wrap;margin-top:12px;}
.footer-contact span{font-size:.78rem;color:rgba(255,255,255,.5);}
.footer-copy{font-size:.72rem;color:rgba(255,255,255,.3);margin-top:16px;}
@media(max-width:768px){nav{padding:0 20px;}.hero{padding:48px 20px 100px;}.main{padding:40px 20px 60px;}.grid{grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;}.card-img{height:160px;}footer{padding:32px 20px;}}
${viewerCSS}
</style>
</head>
<body>
<nav>
  <div>${logoHtml}</div>
  <ul class="nav-cats" id="navCats">
    <li><a href="#" class="active" data-filter="all">Todos</a></li>
    ${catOrder.filter(c => bycat[c] && bycat[c].length > 0).map((c,i) => `<li><a href="#cat-${i}" data-filter="${c}">${catConfig[c].emoji} ${c.split(' ')[0]}</a></li>`).join('')}
  </ul>
  <div class="nav-search">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
    <input type="text" id="searchInput" placeholder="Buscar produto...">
  </div>
</nav>
<div class="hero">
  <div class="hero-blob1"></div><div class="hero-blob2"></div>
  <div class="hero-content">
    <p class="hero-eyebrow">Catálogo 2025</p>
    <h1>${s.heroLine1}<br>${s.heroLine2}<br><em>${s.heroLine3}</em></h1>
    <p class="hero-desc">${s.heroDesc}</p>
    <div class="hero-pills">
      ${catOrder.filter(c => bycat[c] && bycat[c].length > 0).slice(0,4).map(c => `<span class="hero-pill">${catConfig[c].emoji} ${c.split(' ')[0]}</span>`).join('')}
    </div>
  </div>
  <div class="hero-stats">
    <div><div class="hstat-num">${totalProds}</div><div class="hstat-label">Produtos</div></div>
    <div><div class="hstat-num">${totalCats}</div><div class="hstat-label">Categorias</div></div>
  </div>
</div>
<div class="main">${sections}</div>
<footer>
  <div class="footer-inner">
    <div>
      ${s.logoImg
        ? `<img src="${exportedLogoAsset}" alt="${s.siteName}" style="height:48px;object-fit:contain;">`
        : (safeLogoAsset
          ? `<img src="${safeLogoAsset}" alt="${s.siteName}" style="height:48px;object-fit:contain;">`
          : `<div class="footer-logo">${s.siteName}<span>.</span></div>`)}
      <div class="footer-contact">
        ${s.contWhatsapp ? `<span>📱 ${s.contWhatsapp}</span>` : ''}
        ${s.contEmail    ? `<span>✉️ ${s.contEmail}</span>`    : ''}
        ${s.contInsta    ? `<span>📸 ${s.contInsta}</span>`    : ''}
      </div>
    </div>
  </div>
  <div style="max-width:1400px;margin:16px auto 0;padding:16px 0 0;border-top:1px solid rgba(255,255,255,.08);">
    <div class="footer-copy">${s.contCopy}</div>
  </div>
</footer>

<!-- PRODUCT VIEWER -->
<div class="pv-overlay" id="pvOverlay" onclick="pvCloseOutside(event)">
  <div class="pv-modal" id="pvModal">
    <button class="pv-close" onclick="pvClose()">✕</button>
    <div class="pv-img-side" id="pvImgSide">
      <div class="pv-glow"></div>
      <div class="pv-img-badge" id="pvImgBadge" style="display:none"></div>
      <img id="pvImg" src="" alt="" style="display:none">
      <div class="pv-ph" id="pvPh" style="display:none"></div>
      <button class="pv-img-arrow prev" id="pvGalleryPrev" onclick="pvGalleryNav(-1)">&#8249;</button>
      <button class="pv-img-arrow next" id="pvGalleryNext" onclick="pvGalleryNav(1)">&#8250;</button>
      <div class="pv-dots" id="pvDots"></div>
    </div>
    <div class="pv-info">
      <div class="pv-badge" id="pvBadge"></div>
      <div class="pv-name"  id="pvName"></div>
      <div class="pv-cod"   id="pvCod"></div>
      <div class="pv-sep"></div>
      <div id="pvColorsSection"></div>
      <div class="pv-specs-label">Especificações</div>
      <ul class="pv-specs" id="pvSpecs"></ul>
      <div class="pv-nav">
        <button class="pv-nav-btn" id="pvPrev" onclick="pvNav(-1)">← Anterior</button>
        <span class="pv-counter" id="pvCounter"></span>
        <button class="pv-nav-btn" id="pvNext" onclick="pvNav(1)">Próximo →</button>
      </div>
    </div>
  </div>
</div>

<script>
// ── SEARCH ──
const searchInput = document.getElementById('searchInput');
const cards       = document.querySelectorAll('.card');
const sections    = document.querySelectorAll('.cat-section');
searchInput.addEventListener('input', function(){
  const q = this.value.toLowerCase().trim();
  let total = 0;
  cards.forEach(c => {
    const m = !q || c.querySelector('h3').textContent.toLowerCase().includes(q) || (c.querySelector('.cod') && c.querySelector('.cod').textContent.toLowerCase().includes(q));
    c.classList.toggle('hidden', !m);
    if(m) total++;
  });
  sections.forEach(s => {
    s.classList.toggle('all-hidden', [...s.querySelectorAll('.card:not(.hidden)')].length === 0);
  });
  setTimeout(function(){ pvAllCards = Array.from(document.querySelectorAll('.card:not(.hidden)')); }, 50);
});
// ── NAV FILTER ──
document.querySelectorAll('[data-filter]').forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    const filter = btn.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if(filter === 'all') {
      cards.forEach(c => c.classList.remove('hidden'));
      sections.forEach(s => s.classList.remove('all-hidden'));
      searchInput.value = '';
      window.scrollTo({top:0,behavior:'smooth'});
      return;
    }
    const targetSection = document.querySelector('.cat-section[data-cat="' + CSS.escape(filter) + '"]');
    if(targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if(e.isIntersecting){
      const cat = e.target.dataset.cat;
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b.dataset.filter === cat));
    }
  });
},{threshold:0.3});
sections.forEach(s => obs.observe(s));
// ── VIEWER ──
${viewerJS}
<\/script>
<!-- IMAGE LIGHTBOX -->
<div class="img-lightbox" id="imgLightbox" onclick="pvImgZoomClose()">
  <div class="img-lightbox-bg" id="imgLightboxBg"></div>
  <div class="img-lightbox-glow"></div>
  <button class="img-lightbox-close" onclick="event.stopPropagation();pvImgZoomClose()">&#x2715;</button>
  <img id="imgLightboxImg" src="" alt="" onclick="event.stopPropagation()">
  <div class="img-lightbox-hint">Clique em qualquer lugar para fechar &middot; ESC</div>
</div>
</body></html>`;
}
