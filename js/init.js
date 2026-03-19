// Inicialização

// ══ Script Block 3 ══

function init() {
  dbOpen().then(function() {
    return dbLoad();
  }).then(function() {
    filterProducts();
    updateCount();
    applySettingsToUI();
    renderCatEditor();
  });
}

init();
