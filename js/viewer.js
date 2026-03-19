// Modal de visualização de produto (preview)

// ══════════════════════════════════════════
// PRODUCT VIEWER MODAL
// ══════════════════════════════════════════
let pvList  = [];
let pvIndex = 0;

function pvOpen(idx) {
  pvList  = filteredProducts();
  pvIndex = Math.max(0, Math.min(pvList.length - 1, idx));
  pvRender();
  document.getElementById('pvOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function pvClose() {
  document.getElementById('pvOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function pvCloseOutside(e) {
  if (e.target === document.getElementById('pvOverlay')) pvClose();
}

function pvNav(dir) {
  pvIndex = Math.max(0, Math.min(pvList.length - 1, pvIndex + dir));
  pvRender();
}

function filteredProducts() {
  const q   = (document.getElementById('prodSearch').value || '').toLowerCase();
  const cat = document.getElementById('catFilter').value;
  const img = document.getElementById('imgFilter').value;
  return products.filter(p => {
    const mQ   = !q   || p.nome.toLowerCase().includes(q) || (p.codigo && p.codigo.toLowerCase().includes(q)) || (p.gtin && p.gtin.toLowerCase().includes(q));
    const mCat = !cat || p.categoria === cat;
    const mImg = !img || (img === 'has' ? !!p.img : !p.img);
    return mQ && mCat && mImg;
  });
}

// imagem ativa no viewer
let pvActiveImgIdx  = 0;
let pvCurrentGallery = [];

function pvRender() {
  const p = pvList[pvIndex];
  if (!p) return;
  pvActiveImgIdx = 0;
  const cfg   = catConfig[p.categoria] || catConfig['Outros'];
  const modal = document.getElementById('pvModal');
  const side  = document.getElementById('pvImgSide');

  side.style.background = 'linear-gradient(' + cfg.gradient + ')';
  modal.style.setProperty('--pv-acc',    cfg.accent);
  modal.style.setProperty('--pv-tag-bg', cfg.tag_bg);
  modal.style.setProperty('--pv-tag-c',  cfg.tag_c);

  // Galeria
  pvCurrentGallery = (p.gallery && p.gallery.length) ? p.gallery
    : p.img ? [{ b64: p.img, mime: 'image/png' }] : [];

  pvShowGalleryImg(pvCurrentGallery, 0, cfg.gradient);
  pvUpdateGalleryNav();

  // Cores do produto
  const pvColorsSection = document.getElementById('pvColorsSection');
  if(p.colors && p.colors.length) {
    pvColorsSection.innerHTML = '<div class="pv-colors-label">Cores disponíveis</div><div class="pv-colors" id="pvColorDots"></div>';
    const dotsWrap = pvColorsSection.querySelector('#pvColorDots');
    p.colors.forEach(hex => {
      const dot = document.createElement('div');
      dot.className = 'pv-color-dot';
      dot.style.background = hex;
      dot.title = hex;
      dotsWrap.appendChild(dot);
    });
  } else {
    pvColorsSection.innerHTML = '';
  }

  // Text + specs
  const activeTags = normalizeProductTags(p.tags).filter(tag => tag.active !== false);
  const pvImgBadge = document.getElementById('pvImgBadge');
  if(activeTags.length) {
    pvImgBadge.textContent = activeTags[0].label;
    pvImgBadge.style.display = 'inline-flex';
  } else {
    pvImgBadge.textContent = '';
    pvImgBadge.style.display = 'none';
  }
  document.getElementById('pvBadge').textContent = cfg.emoji + ' ' + p.categoria;
  document.getElementById('pvName').textContent  = p.nome;
  document.getElementById('pvCod').innerHTML   = (p.codigo ? '#' + p.codigo : '') + (p.gtin ? '<span style="display:block;font-size:.65rem;color:#8B7355;margin-top:2px;" title="GTIN/EAN">⊟ ' + p.gtin + '</span>' : '');
  const specs = document.getElementById('pvSpecs');
  const dets  = p.detalhes || [];
  specs.innerHTML = dets.length
    ? dets.map(d => '<li>' + d + '</li>').join('')
    : '<li class="pv-empty">Sem especificações cadastradas.</li>';

  // Nav entre produtos
  document.getElementById('pvCounter').textContent = (pvIndex + 1) + ' / ' + pvList.length;
  document.getElementById('pvPrev').disabled = pvIndex === 0;
  document.getElementById('pvNext').disabled = pvIndex === pvList.length - 1;
}

function pvUpdateGalleryNav() {
  const n    = pvCurrentGallery.length;
  const prev = document.getElementById('pvGalleryPrev');
  const next = document.getElementById('pvGalleryNext');
  const dots = document.getElementById('pvDots');

  // Setas — visíveis só se mais de 1 foto
  if(prev) { prev.style.display = n > 1 ? '' : 'none'; prev.disabled = pvActiveImgIdx === 0; }
  if(next) { next.style.display = n > 1 ? '' : 'none'; next.disabled = pvActiveImgIdx === n - 1; }

  // Dots
  if(dots) {
    dots.innerHTML = '';
    if(n > 1) {
      pvCurrentGallery.forEach((_, i) => {
        const d = document.createElement('div');
        d.className = 'pv-dot' + (i === pvActiveImgIdx ? ' active' : '');
        dots.appendChild(d);
      });
    }
  }
}

function pvGalleryNav(dir) {
  const n = pvCurrentGallery.length;
  pvActiveImgIdx = Math.max(0, Math.min(n - 1, pvActiveImgIdx + dir));
  const p   = pvList[pvIndex];
  const cfg = catConfig[p.categoria] || catConfig['Outros'];
  pvShowGalleryImg(pvCurrentGallery, pvActiveImgIdx, cfg.gradient);
  pvUpdateGalleryNav();
}

// Swipe touch na lateral de imagem
(function() {
  let tx = 0;
  const side = () => document.getElementById('pvImgSide');
  document.addEventListener('touchstart', e => {
    if(!side() || !side().contains(e.target)) return;
    tx = e.touches[0].clientX;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if(!side() || !side().contains(e.target)) return;
    const dx = e.changedTouches[0].clientX - tx;
    if(Math.abs(dx) > 40) pvGalleryNav(dx < 0 ? 1 : -1);
  }, { passive: true });
})();

function pvShowGalleryImg(gallery, i, gradient) {
  const imgEl = document.getElementById('pvImg');
  const phEl  = document.getElementById('pvPh');
  imgEl.style.display = 'none';
  phEl.style.display  = 'none';
  if(gallery.length > 0) {
    const img = gallery[i] || gallery[0];
    requestAnimationFrame(() => {
      const pvContainer = imgEl.parentElement;
      // Remove any lingering preview video
      const oldVid = pvContainer.querySelector('.pv-video-el');
      if (oldVid) oldVid.remove();
      if (img.mime === 'video/webm') {
        imgEl.style.display = 'none';
        imgEl.classList.remove('has-zoom');
        imgEl.onclick = null;
        const vid = document.createElement('video');
        vid.className = 'pv-video-el';
        vid.src = 'data:video/webm;base64,' + img.b64;
        vid.muted = true; vid.loop = true; vid.autoplay = true; vid.playsInline = true;
        vid.controls = true;
        vid.style.cssText = 'max-width:90%;max-height:60vh;border-radius:12px;display:block;margin:auto;';
        pvContainer.appendChild(vid);
      } else {
        imgEl.src           = 'data:' + img.mime + ';base64,' + img.b64;
        imgEl.style.display = 'block';
        imgEl.classList.add('has-zoom');
        imgEl.onclick = function(e){ e.stopPropagation(); pvZoomImg(imgEl.src, gradient); };
      }
    });
  } else {
    const cfg = catConfig['Outros'];
    phEl.textContent   = cfg.emoji;
    phEl.style.display = 'block';
    imgEl.classList.remove('has-zoom');
    imgEl.onclick = null;
  }
}

// Keyboard navigation
document.addEventListener('keydown', function(e) {
  if (!document.getElementById('pvOverlay').classList.contains('open')) return;
  if (e.key === 'Escape')     pvClose();
  if (e.key === 'ArrowRight') pvNav(1);
  if (e.key === 'ArrowLeft')  pvNav(-1);
});

// ── IMAGE LIGHTBOX (imersivo) ──
function pvZoomImg(src, gradient) {
  var lb  = document.getElementById('imgLightbox');
  var img = document.getElementById('imgLightboxImg');
  var bg  = document.getElementById('imgLightboxBg');
  img.src = src;
  // Aplica gradiente da categoria como fundo
  var grad = gradient || '135deg,#2a2a2a,#111';
  bg.style.background = 'linear-gradient(' + grad + ')';
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function pvZoomClose() {
  var lb = document.getElementById('imgLightbox');
  lb.classList.remove('open');
  if(!document.getElementById('pvOverlay').classList.contains('open')) {
    document.body.style.overflow = '';
  }
}
document.addEventListener('keydown', function(e) {
  if(e.key === 'Escape' && document.getElementById('imgLightbox').classList.contains('open')) {
    pvZoomClose();
  }
});


