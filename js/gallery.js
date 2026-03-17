// Galeria de fotos do produto

// ══════════════════════════════════════════
// GALERIA DE FOTOS
// ══════════════════════════════════════════
function renderGallery() {
  const grid  = document.getElementById('galleryGrid');
  const count = document.getElementById('galleryCount');
  count.textContent = currentGallery.length + ' mídia(s)';

  // Limpa preservando o botão de add
  const addBtn = document.getElementById('galleryAddBtn');
  grid.innerHTML = '';

  currentGallery.forEach((img, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'gallery-thumb' + (i === 0 ? ' main-photo' : '');
    wrap.title = i === 0 ? 'Foto principal' : 'Foto ' + (i+1);

    let el;
    if (img.mime === 'video/webm') {
      el = document.createElement('video');
      el.src = 'data:' + img.mime + ';base64,' + img.b64;
      el.muted = true; el.loop = true; el.autoplay = true; el.playsInline = true;
      el.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:6px;';
    } else {
      el = document.createElement('img');
      el.src = 'data:' + img.mime + ';base64,' + img.b64;
      el.alt = 'Foto ' + (i+1);
    }
    wrap.appendChild(el);

    if(i === 0) {
      const badge = document.createElement('div');
      badge.className = 'main-badge';
      badge.textContent = 'Principal';
      wrap.appendChild(badge);
    }

    const overlay = document.createElement('div');
    overlay.className = 'thumb-overlay';

    if(i !== 0) {
      const setMain = document.createElement('button');
      setMain.textContent = '⭐ Principal';
      setMain.onclick = (e) => { e.stopPropagation(); gallerySetMain(i); };
      overlay.appendChild(setMain);
    }

    const delBtn = document.createElement('button');
    delBtn.className = 'del-btn';
    delBtn.textContent = '✕ Remover';
    delBtn.onclick = (e) => { e.stopPropagation(); galleryRemove(i); };
    overlay.appendChild(delBtn);

    wrap.appendChild(overlay);
    grid.appendChild(wrap);
  });

  grid.appendChild(addBtn);
}

function handleGalleryAdd(e) {
  const files = Array.from(e.target.files);
  if(!files.length) return;
  e.target.value = '';
  let loaded = 0;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target.result;
      const b64  = result.split(',')[1];
      const mime = result.split(';')[0].split(':')[1] || 'image/png';
      currentGallery.push({ b64, mime });
      loaded++;
      if(loaded === files.length) renderGallery();
    };
    reader.readAsDataURL(file);
  });
}

function gallerySetMain(i) {
  const [item] = currentGallery.splice(i, 1);
  currentGallery.unshift(item);
  renderGallery();
}

function galleryRemove(i) {
  currentGallery.splice(i, 1);
  renderGallery();
}

