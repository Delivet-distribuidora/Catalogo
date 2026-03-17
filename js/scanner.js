// Scanner de código de barras (GTIN/EAN) via câmera
// Usa a biblioteca html5-qrcode (CDN carregado no editor.html)

// ══════════════════════════════════════════
// BARCODE SCANNER
// ══════════════════════════════════════════

let _scanner = null;
let _scannerActive = false;

function openBarcodeScanner() {
  const overlay = document.getElementById('scannerOverlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Status
  const status = document.getElementById('scannerStatus');
  status.textContent = 'Iniciando câmera...';
  status.className = 'scanner-status';

  const readerEl = document.getElementById('scannerReader');
  readerEl.innerHTML = '';

  // Pequeno atraso para a animação do overlay
  setTimeout(() => {
    _startScanner();
  }, 300);
}

async function _startScanner() {
  const status = document.getElementById('scannerStatus');

  try {
    _scanner = new Html5Qrcode('scannerReader');
    _scannerActive = true;

    const config = {
      fps: 10,
      qrbox: { width: 280, height: 120 },
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.ITF,
      ]
    };

    await _scanner.start(
      { facingMode: 'environment' },
      config,
      _onScanSuccess,
      _onScanError
    );

    status.textContent = 'Aponte para o código de barras';
    status.className = 'scanner-status ready';

  } catch (err) {
    console.error('Erro ao iniciar scanner:', err);
    status.textContent = '⚠ Câmera não disponível. Verifique as permissões.';
    status.className = 'scanner-status error';
  }
}

function _onScanSuccess(decodedText, decodedResult) {
  // Vibrar se suportado (feedback tátil)
  if (navigator.vibrate) navigator.vibrate(100);

  // Preenche o campo GTIN
  const gtinInput = document.getElementById('prodGtin');
  if (gtinInput) gtinInput.value = decodedText;

  // Atualiza status visual
  const status = document.getElementById('scannerStatus');
  status.textContent = '✓ Código detectado: ' + decodedText;
  status.className = 'scanner-status success';

  // Fecha automaticamente após breve delay
  setTimeout(() => {
    closeBarcodeScanner();
    showToast('Código aplicado: ' + decodedText, 'success');
  }, 800);
}

function _onScanError(errorMessage) {
  // Silencia erros de "não encontrado" — são normais durante escaneamento
}

async function closeBarcodeScanner() {
  if (_scanner && _scannerActive) {
    try {
      await _scanner.stop();
      _scanner.clear();
    } catch (e) { /* ignorar */ }
    _scannerActive = false;
    _scanner = null;
  }

  const overlay = document.getElementById('scannerOverlay');
  overlay.classList.remove('open');

  // Só restaura overflow se nenhum outro modal estiver aberto
  if (!document.getElementById('modalOverlay').classList.contains('open')) {
    document.body.style.overflow = '';
  }
}

function scannerCloseOutside(e) {
  if (e.target === document.getElementById('scannerOverlay')) {
    closeBarcodeScanner();
  }
}
