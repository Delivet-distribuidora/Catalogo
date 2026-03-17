// Toast, helpers, utilitários de UI

// ══════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════
function showToast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type?' '+type:'');
  setTimeout(() => t.className='toast', 2800);
}


// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════

