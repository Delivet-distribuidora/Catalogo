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
  const name = document.getElementById('siteName').value || 'DeliVet';
  document.getElementById('sidebarLogo').innerHTML = name + '<span>.</span>';
}

function updateColorPreview() {
  const v = document.getElementById('colorVerde').value;
  const l = document.getElementById('colorLaranja').value;
  const b = document.getElementById('colorBg').value;
  document.getElementById('colorVerdeHex').value = v;
  document.getElementById('colorLaranjaHex').value = l;
  document.getElementById('colorBgHex').value = b;
  document.getElementById('sw1').style.background = v;
  document.getElementById('sw2').style.background = l;
  document.getElementById('sw3').style.background = b;
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

