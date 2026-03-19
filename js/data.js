// Dados dos produtos, configurações e catConfig

// ══════════════════════════════════════════
// DATA
// ══════════════════════════════════════════
let products = [];

// Settings state
let settings = {
  siteName: 'DeliVet',
  siteTagline: 'Distribuidora Pet Shop',
  logoImg: null,
  colorVerde: '#3A8F62',
  colorLaranja: '#E8602A',
  colorBg: '#F7F3EE',
  watermarkOpacity: 0.18,
  heroLine1: 'Produtos para',
  heroLine2: 'quem ama de',
  heroLine3: 'verdade',
  heroDesc: 'Brinquedos, acessórios de passeio, higiene e muito mais — tudo pensado para o bem-estar e felicidade do seu pet.',
  contWhatsapp: '(11) 99999-0000',
  contEmail: 'vendas@delivet.com.br',
  contInsta: '@delivet.petshop',
  contCopy: '© 2025 DeliVet · Todos os direitos reservados',
};

let catConfig = {
  'Brinquedos':                  {color:'#FFF8E1',accent:'#FFD740',dark:'#C49A00',gradient:'135deg,#FFF8E1,#FFE082',emoji:'🎾',tag_bg:'#FFF3CD',tag_c:'#8A6500'},
  'Passeio (Guias e Peitorais)': {color:'#E8F8F0',accent:'#4CAF82',dark:'#2A7A50',gradient:'135deg,#E8F8F0,#A8DFBF',emoji:'🦮',tag_bg:'#C8EDD8',tag_c:'#1A5A38'},
  'Alimentação e Hidratação':    {color:'#FFF0E8',accent:'#FF7043',dark:'#BF360C',gradient:'135deg,#FFF0E8,#FFAB91',emoji:'🥣',tag_bg:'#FFD8C8',tag_c:'#8A2800'},
  'Higiene e Estética':          {color:'#F3EEF9',accent:'#9C6FD4',dark:'#6028A8',gradient:'135deg,#F3EEF9,#CEAFF0',emoji:'✂️',tag_bg:'#E2D4F4',tag_c:'#4A1880'},
  'Outros':                      {color:'#E8F4FF',accent:'#42A5F5',dark:'#0D6EFD',gradient:'135deg,#E8F4FF,#90CAF9',emoji:'🐾',tag_bg:'#CCE5FF',tag_c:'#084298'},
  'Utilidades e Acessórios':     {color:'#FBF5EC',accent:'#D4A054',dark:'#8A5010',gradient:'135deg,#FBF5EC,#F0D4A0',emoji:'🛍️',tag_bg:'#EDD8B0',tag_c:'#5A3000'},
};

