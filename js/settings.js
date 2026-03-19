// Configurações de identidade visual

// ══════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════
function handleLogoUpload(e) {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    settings.logoImg = ev.target.result;
    const preview = document.getElementById('logoPreview');
    preview.src = ev.target.result;
    preview.style.display = 'block';
    document.querySelector('#logoUploadArea .upload-icon').style.display = 'none';
    document.querySelector('#logoUploadArea p').style.display = 'none';
    updatePreview();
  };
  reader.readAsDataURL(file);
}

function updatePreview() {
  const logo = document.querySelector('#sidebarLogo .sidebar-logo-img');
  const name = document.getElementById('siteName').value || 'DeliVet';
  if(logo) logo.alt = name;
}

function updateWatermarkPreview() {
  const slider = document.getElementById('watermarkOpacity');
  const valueEl = document.getElementById('watermarkOpacityValue');
  const raw = slider ? parseInt(slider.value, 10) || 0 : 18;
  const opacity = Math.max(0, Math.min(40, raw)) / 100;
  settings.watermarkOpacity = opacity;
  if(valueEl) valueEl.textContent = Math.round(opacity * 100) + '%';
  document.documentElement.style.setProperty('--wm-opacity', opacity.toFixed(2));
}

function updateColorPreview() {
  const v = document.getElementById('colorVerde').value;
  const l = document.getElementById('colorLaranja').value;
  const b = document.getElementById('colorBg').value;
  settings.colorVerde = v;
  settings.colorLaranja = l;
  settings.colorBg = b;
  document.getElementById('colorVerdeHex').value = v;
  document.getElementById('colorLaranjaHex').value = l;
  document.getElementById('colorBgHex').value = b;
  document.getElementById('sw1').style.background = v;
  document.getElementById('sw2').style.background = l;
  document.getElementById('sw3').style.background = b;
  document.documentElement.style.setProperty('--verde', v);
  document.documentElement.style.setProperty('--laranja', l);
  document.documentElement.style.setProperty('--bg', b);
  updateWatermarkPreview();
}

function syncColorFromText(colorId, textId) {
  const val = document.getElementById(textId).value;
  if(/^#[0-9A-Fa-f]{6}$/.test(val)) {
    document.getElementById(colorId).value = val;
    updateColorPreview();
  }
}

function saveSettings() {
  settings.siteName = document.getElementById('siteName').value;
  settings.siteTagline = document.getElementById('siteTagline').value;
  settings.colorVerde = document.getElementById('colorVerde').value;
  settings.colorLaranja = document.getElementById('colorLaranja').value;
  settings.colorBg = document.getElementById('colorBg').value;
  settings.watermarkOpacity = (parseInt(document.getElementById('watermarkOpacity').value, 10) || 0) / 100;
  settings.heroLine1 = document.getElementById('heroLine1').value;
  settings.heroLine2 = document.getElementById('heroLine2').value;
  settings.heroLine3 = document.getElementById('heroLine3').value;
  settings.heroDesc = document.getElementById('heroDesc').value;
  settings.contWhatsapp = document.getElementById('contWhatsapp').value;
  settings.contEmail = document.getElementById('contEmail').value;
  settings.contInsta = document.getElementById('contInsta').value;
  settings.contCopy = document.getElementById('contCopy').value;
  autoPersist();
  showToast('Configurações salvas ✓','success'); dbSaveSettings();
}

