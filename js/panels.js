// Navegação entre painéis

// ══════════════════════════════════════════
// PANELS
// ══════════════════════════════════════════
function showPanel(name) {
  ['Produtos','Settings','Categorias'].forEach(p => {
    document.getElementById('panel'+p).style.display = 'none';
  });
  document.getElementById('panel'+name.charAt(0).toUpperCase()+name.slice(1)).style.display = 'block';
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  event.currentTarget.classList.add('active');
  if(name === 'categorias') renderCatEditor();
}

