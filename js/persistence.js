// Persistência IndexedDB + backup JSON

// ════════════════════════════════════════
// PERSISTÊNCIA — IndexedDB
// ════════════════════════════════════════
const DB_NAME    = 'delivet_editor';
const DB_VERSION = 1;
const STORE_PROD = 'products_v1';
const STORE_CFG  = 'settings_v1';
let   db         = null;

function dbOpen() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function(e) {
      var d = e.target.result;
      if(!d.objectStoreNames.contains(STORE_PROD))
        d.createObjectStore(STORE_PROD, {keyPath:'_rowid'});
      if(!d.objectStoreNames.contains(STORE_CFG))
        d.createObjectStore(STORE_CFG,  {keyPath:'_key'});
    };
    req.onsuccess = function(e) { db = e.target.result; resolve(db); };
    req.onerror   = function(e) { reject(e.target.error); };
  });
}

function autoPersist() {
  dbSaveProducts();
  dbSaveSettings();
}

function dbSaveProducts() {
  if(!db) return;
  var tx    = db.transaction(STORE_PROD, 'readwrite');
  var store = tx.objectStore(STORE_PROD);
  var clearReq = store.clear();
  clearReq.onsuccess = function() {
    products.forEach(function(p, i) {
      store.put(Object.assign({}, p, {_rowid: i}));
    });
  };
  tx.oncomplete = function() { showSaveIndicator(); };
}

function dbSaveSettings() {
  if(!db) return;
  var tx    = db.transaction(STORE_CFG, 'readwrite');
  var store = tx.objectStore(STORE_CFG);
  store.put(Object.assign({}, settings,  {_key: 'main'}));
  store.put(Object.assign({}, catConfig, {_key: 'catConfig'}));
  tx.oncomplete = function() { showSaveIndicator(); };
}

function dbLoad() {
  return new Promise(function(resolve) {
    if(!db) { resolve(false); return; }
    var tx        = db.transaction([STORE_PROD, STORE_CFG], 'readonly');
    var prodStore = tx.objectStore(STORE_PROD);
    var cfgStore  = tx.objectStore(STORE_CFG);
    var prods = null, cfgRows = null;
    prodStore.getAll().onsuccess = function(e) { prods   = e.target.result; };
    cfgStore.getAll().onsuccess  = function(e) { cfgRows = e.target.result; };
    tx.oncomplete = function() {
      var loaded = false;
      if(prods && prods.length > 0) {
        products = prods.map(function(p) {
          var r = Object.assign({}, p); delete r._rowid; return r;
        });
        loaded = true;
      }
      if(cfgRows && cfgRows.length > 0) {
        var mainCfg = cfgRows.find(function(c){ return c._key === 'main'; });
        if(mainCfg) {
          var s = Object.assign({}, mainCfg); delete s._key;
          Object.assign(settings, s);
          applySettingsToUI();
        }
        var catCfg = cfgRows.find(function(c){ return c._key === 'catConfig'; });
        if(catCfg) {
          var cc = Object.assign({}, catCfg); delete cc._key;
          Object.assign(catConfig, cc);
        }
      }
      resolve(loaded);
    };
  });
}

function applySettingsToUI() {
  var s = settings;
  function sv(id, val) { var el=document.getElementById(id); if(el) el.value=val||''; }
  sv('siteName',       s.siteName);
  sv('siteTagline',    s.siteTagline);
  sv('heroLine1',      s.heroLine1);
  sv('heroLine2',      s.heroLine2);
  sv('heroLine3',      s.heroLine3);
  sv('heroDesc',       s.heroDesc);
  sv('contWhatsapp',   s.contWhatsapp);
  sv('contEmail',      s.contEmail);
  sv('contInsta',      s.contInsta);
  sv('contCopy',       s.contCopy);
  sv('colorVerde',     s.colorVerde);    sv('colorVerdeHex',  s.colorVerde);
  sv('colorLaranja',   s.colorLaranja);  sv('colorLaranjaHex',s.colorLaranja);
  sv('colorBg',        s.colorBg);       sv('colorBgHex',     s.colorBg);
  var wm=document.getElementById('watermarkOpacity');
  if(wm) wm.value = Math.round((s.watermarkOpacity != null ? s.watermarkOpacity : 0.18) * 100);
  var sw1=document.getElementById('sw1'),
      sw2=document.getElementById('sw2'),
      sw3=document.getElementById('sw3');
  if(sw1&&s.colorVerde)   sw1.style.background=s.colorVerde;
  if(sw2&&s.colorLaranja) sw2.style.background=s.colorLaranja;
  if(sw3&&s.colorBg)      sw3.style.background=s.colorBg;
  var logoImg=document.querySelector('#sidebarLogo .sidebar-logo-img');
  if(logoImg) logoImg.alt = s.siteName || 'DeliVet';
  if(s.logoImg) {
    var p=document.getElementById('logoPreview');
    if(p){p.src=s.logoImg;p.style.display='block';}
  }
  // Sincroniza swatches e inputs de cor
  if(typeof updateColorPreview === 'function') updateColorPreview();
  if(typeof updateWatermarkPreview === 'function') updateWatermarkPreview();
}

function showSaveIndicator() {
  var ind = document.getElementById('saveIndicator');
  if(!ind) return;
  ind.textContent = '✓ Salvo';
  ind.style.opacity = '1';
  clearTimeout(ind._t);
  ind._t = setTimeout(function(){ ind.style.opacity='0'; }, 2400);
}

function dbClearAll() {
  if(!confirm('Apagar todos os dados salvos e voltar ao catálogo original?')) return;
  var req = indexedDB.deleteDatabase(DB_NAME);
  req.onsuccess = function() {
    showToast('Dados apagados — recarregando...','');
    setTimeout(function(){ location.reload(); }, 1200);
  };
}

// keyboard for viewer modal
document.addEventListener('keydown', function(e) {
  if(!document.getElementById('pvOverlay').classList.contains('open')) return;
  if(e.key === 'Escape')     pvClose();
  if(e.key === 'ArrowRight') pvNav(1);
  if(e.key === 'ArrowLeft')  pvNav(-1);
});


// ══════════════════════════════════════════
// BACKUP & PORTABILIDADE
// ══════════════════════════════════════════

// Versão do formato de backup — incrementar se mudar a estrutura
var BACKUP_VERSION = '1.0';

function getBackupFilename() {
  var d = new Date();
  var pad = function(n){ return String(n).padStart(2,'0'); };
  var stamp = d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate())
    + '_' + pad(d.getHours()) + pad(d.getMinutes());
  var name = (settings.siteName || 'delivet').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'');
  return name + '-backup-' + stamp + '.json';
}

function exportBackupJSON() {
  var backup = {
    _meta: {
      version: BACKUP_VERSION,
      app: 'DeliVet Editor',
      siteName: settings.siteName || 'DeliVet',
      exportedAt: new Date().toISOString(),
      totalProducts: products.length
    },
    settings: Object.assign({}, settings),
    catConfig: JSON.parse(JSON.stringify(catConfig)),
    products: products.map(function(p){ return Object.assign({}, p); })
  };

  var json = JSON.stringify(backup, null, 2);
  var blob = new Blob([json], {type: 'application/json;charset=utf-8'});
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = getBackupFilename();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  showToast('Backup salvo: ' + a.download, 'success');
}

