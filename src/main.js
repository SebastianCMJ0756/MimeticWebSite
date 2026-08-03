// src/main.js

// --- 1. LEER CONFIGURACIÓN DESDE VARIABLES CSS ---
const cssVars = getComputedStyle(document.documentElement);
const CONFIG = {
  colorBgCenter: cssVars.getPropertyValue('--color-bg-center').trim() || '#000000',
  colorBgMid: cssVars.getPropertyValue('--color-bg-mid').trim() || '#020b1e',
  colorBgOuter: cssVars.getPropertyValue('--color-bg-outer').trim() || '#1e0a2b',
  colorPrimary: cssVars.getPropertyValue('--color-primary').trim() || '#06b6d4',
  colorSecondary: cssVars.getPropertyValue('--color-secondary').trim() || '#a855f7',
  colorCross: cssVars.getPropertyValue('--color-accent-cross').trim() || '#06b6d4',
  
  cooldownScroll: parseInt(cssVars.getPropertyValue('--cooldown-scroll')) || 600,
  crossInterval: parseInt(cssVars.getPropertyValue('--cross-interval-ms')) || 10000,
  crossVisibleDuration: parseInt(cssVars.getPropertyValue('--cross-visible-duration')) || 150,
  particleCount: parseInt(cssVars.getPropertyValue('--particle-count')) || 80,
};

// --- 2. CONFIGURACIÓN DEL CANVAS Y PARTÍCULAS ---
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let width, height, centerX, centerY;

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  centerX = width / 2;
  centerY = height / 2;
}
window.addEventListener('resize', resize);
resize();

// Clase de Partículas
class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x = centerX + (Math.random() - 0.5) * 15;
    this.y = centerY + (Math.random() - 0.5) * 15;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 1.8 + 0.4;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.size = Math.random() * 2 + 0.8;
    this.alpha = 0;
    this.maxAlpha = Math.random() * 0.6 + 0.3;
    this.color = Math.random() > 0.5 ? CONFIG.colorPrimary : CONFIG.colorSecondary;
    this.dist = 0;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.dist = Math.hypot(this.x - centerX, this.y - centerY);
    if (this.dist < 250) this.alpha = Math.min(this.maxAlpha, this.dist / 70);
    else this.alpha -= 0.008;

    if (this.alpha <= 0 || this.x < 0 || this.x > width || this.y < 0 || this.y > height) this.reset();
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 6;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

const particles = [];
for (let i = 0; i < CONFIG.particleCount; i++) particles.push(new Particle());

// Clase de la Cruz Neón
class NeonCross {
  constructor() {
    this.active = false;
    this.alpha = 0;
    this.state = 'hidden';
    this.timer = 0;
    this.size = 28;
  }
  spawn() {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * (Math.min(width, height) * 0.3) + 160;
    this.x = centerX + Math.cos(angle) * dist;
    this.y = centerY + Math.sin(angle) * dist;
    this.alpha = 0;
    this.state = 'fade-in';
    this.timer = 0;
    this.active = true;
  }
  update() {
    if (!this.active) return;
    if (this.state === 'fade-in') {
      this.alpha += 0.03;
      if (this.alpha >= 0.85) { this.alpha = 0.85; this.state = 'flicker'; }
    } else if (this.state === 'flicker') {
      this.timer++;
      if (Math.random() < 0.12) this.alpha = Math.random() * 0.3 + 0.2;
      else this.alpha = 0.85;
      if (this.timer > CONFIG.crossVisibleDuration) this.state = 'fade-out';
    } else if (this.state === 'fade-out') {
      this.alpha -= 0.02;
      if (this.alpha <= 0) { this.alpha = 0; this.active = false; this.state = 'hidden'; }
    }
  }
  draw() {
    if (!this.active || this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.strokeStyle = CONFIG.colorCross;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 14;
    ctx.shadowColor = CONFIG.colorCross;
    ctx.translate(this.x, this.y);
    ctx.beginPath();
    ctx.moveTo(-this.size/2, 0); ctx.lineTo(this.size/2, 0);
    ctx.moveTo(0, -this.size/2); ctx.lineTo(0, this.size/2);
    ctx.stroke();
    ctx.restore();
  }
}

const neonCross = new NeonCross();
setInterval(() => { neonCross.spawn(); }, CONFIG.crossInterval);
setTimeout(() => { neonCross.spawn(); }, 1500);

// Bucle de Animación
function animate() {
  ctx.clearRect(0, 0, width, height);

  const grad = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, Math.max(width, height) * 0.75);
  grad.addColorStop(0, CONFIG.colorBgCenter);
  grad.addColorStop(0.35, CONFIG.colorBgMid);
  grad.addColorStop(0.7, CONFIG.colorBgOuter);
  grad.addColorStop(1, CONFIG.colorBgCenter);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  particles.forEach(p => { p.update(); p.draw(); });
  neonCross.update();
  neonCross.draw();

  requestAnimationFrame(animate);
}
animate();

// --- 3. NAVEGACIÓN Y CAMBIO DE CAPAS ---
let currentLayer = 0;
const totalLayers = 4; // Cambiado a 4 capas
let isAnimating = false;

function changeLayer(nextLayer) {
  if (nextLayer === currentLayer || isAnimating) return;
  isAnimating = true;

  const currentEl = document.getElementById(`layer-${currentLayer}`);
  if (currentEl) {
    currentEl.classList.remove('opacity-100', 'scale-100', 'pointer-events-auto');
    currentEl.classList.add('opacity-0', 'scale-90', 'pointer-events-none');
  }
  
  const currentDot = document.getElementById(`dot-${currentLayer}`);
  if (currentDot) {
    currentDot.classList.remove('bg-cyan-400', 'ring-4', 'ring-cyan-500/20');
    currentDot.classList.add('bg-slate-700');
  }

  currentLayer = nextLayer;
  const nextEl = document.getElementById(`layer-${currentLayer}`);
  if (nextEl) {
    nextEl.classList.remove('opacity-0', 'scale-90', 'pointer-events-none');
    nextEl.classList.add('opacity-100', 'scale-100', 'pointer-events-auto');
  }

  const nextDot = document.getElementById(`dot-${currentLayer}`);
  if (nextDot) {
    nextDot.classList.remove('bg-slate-700');
    nextDot.classList.add('bg-cyan-400', 'ring-4', 'ring-cyan-500/20');
  }

  setTimeout(() => { isAnimating = false; }, CONFIG.cooldownScroll);
}

// Escuchar eventos de entrada
window.addEventListener('wheel', (e) => {
  if (isAnimating || Math.abs(e.deltaY) < 10) return;
  if (e.deltaY > 0 && currentLayer < totalLayers - 1) changeLayer(currentLayer + 1);
  else if (e.deltaY < 0 && currentLayer > 0) changeLayer(currentLayer - 1);
}, { passive: true });

window.addEventListener('keydown', (e) => {
  if (isAnimating) return;
  if (e.key === 'ArrowDown' || e.key === 'PageDown') {
    if (currentLayer < totalLayers - 1) changeLayer(currentLayer + 1);
  } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
    if (currentLayer > 0) changeLayer(currentLayer - 1);
  }
});

let touchStartY = 0;
window.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
window.addEventListener('touchend', (e) => {
  if (isAnimating) return;
  const diffY = touchStartY - e.changedTouches[0].clientY;
  if (Math.abs(diffY) > 50) {
    if (diffY > 0 && currentLayer < totalLayers - 1) changeLayer(currentLayer + 1);
    else if (diffY < 0 && currentLayer > 0) changeLayer(currentLayer - 1);
  }
}, { passive: true });

// Hacer la función accesible globalmente para los clics en las viñetas (dots)
window.changeLayer = changeLayer;

// --- 4. DATOS Y LÓGICA DE INTEGRANTES (CAPA 04) ---
const teamMembers = [
  {
    name: "Julian Andres Correa Cuevas",
    desc: "Descripcion pendiente",
    img: "Images/profiletest.png",
    links: [
      { url: "#", icon: "github", label: "GitHub" },
      { url: "#", icon: "linkedin", label: "LinkedIn" },
      { url: "#", icon: "website", label: "Sitio web" }
    ]
  },
  {
    name: "Jose Camilo Ortegon",
    desc: "Descripcion pendiente",
    img: "Images/member2.png",
    links: [
      { url: "#", icon: "github", label: "GitHub" },
      { url: "#", icon: "twitter", label: "Twitter" }
    ]
  },
  {
    name: "Juan Sebastian Calderon Martinez",
    desc: "Descripcion pendiente",
    img: "Images/member3.png",
    links: [
      { url: "#", icon: "github", label: "GitHub" },
      { url: "#", icon: "linkedin", label: "LinkedIn" },
      { url: "#", icon: "email", label: "Email" }
    ]
  },
  {
    name: "Manuel Jose Rivera Guzman",
    desc: "Descripcion pendiente",
    img: "Images/member4.png",
    links: [
      { url: "#", icon: "github", label: "GitHub" },
      { url: "#", icon: "website", label: "Portafolio" }
    ]
  },
  {
    name: "Esteban Morales",
    desc: "Descripcion pendiente",
    img: "Images/member5.png",
    links: [
      { url: "#", icon: "linkedin", label: "LinkedIn" },
      { url: "#", icon: "email", label: "Email" },
      { url: "#", icon: "website", label: "Sitio web" }
    ]
  },
  {
    name: "Juan Carlos Gonzales",
    desc: "Descripcion pendiente",
    img: "Images/member6.png",
    links: [
      { url: "#", icon: "github", label: "GitHub" },
      { url: "#", icon: "twitter", label: "Twitter" }
    ]
  }
];

let currentMemberIndex = 0;

function getLinkIcon(type) {
  switch (type) {
    case 'github':
      return `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.372 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.238 1.84 1.238 1.07 1.835 2.807 1.305 3.492.997.108-.775.418-1.305.762-1.605-2.665-.3-5.466-1.335-5.466-5.932 0-1.31.468-2.38 1.235-3.22-.124-.303-.535-1.523.117-3.176 0 0 1.007-.322 3.3 1.23A11.49 11.49 0 0112 5.802c1.02.005 2.045.138 3.004.404 2.29-1.552 3.295-1.23 3.295-1.23.654 1.653.243 2.873.12 3.176.77.84 1.233 1.91 1.233 3.22 0 4.61-2.803 5.628-5.475 5.922.43.37.815 1.096.815 2.21 0 1.595-.015 2.88-.015 3.27 0 .32.216.694.825.576C20.565 21.796 24 17.3 24 12c0-6.628-5.373-12-12-12z" /></svg>`;
    case 'linkedin':
      return `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452H17.31v-5.569c0-1.328-.026-3.038-1.852-3.038-1.853 0-2.136 1.446-2.136 2.941v5.666H9.172V9h2.98v1.561h.042c.415-.788 1.432-1.618 2.948-1.618 3.153 0 3.737 2.075 3.737 4.776v6.733zM5.337 7.433a1.73 1.73 0 110-3.46 1.73 1.73 0 010 3.46zm1.162 13.019H4.175V9h2.324v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.226.792 24 1.771 24h20.451C23.205 24 24 23.226 24 22.271V1.729C24 .774 23.205 0 22.225 0z"/></svg>`;
    case 'twitter':
      return `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.954 4.569a10 10 0 01-2.825.775 4.932 4.932 0 002.163-2.724 9.864 9.864 0 01-3.127 1.195 4.918 4.918 0 00-8.384 4.482A13.95 13.95 0 011.671 3.149a4.822 4.822 0 001.523 6.573 4.9 4.9 0 01-2.229-.616v.06a4.926 4.926 0 003.946 4.827 4.934 4.934 0 01-2.224.085 4.936 4.936 0 004.604 3.417A9.867 9.867 0 010 19.54a13.94 13.94 0 007.548 2.212c9.142 0 14.307-7.721 13.995-14.646a9.936 9.936 0 002.411-2.534z"/></svg>`;
    case 'email':
      return `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 2v.511l-8 5.333-8-5.333V6h16zM4 18V8.511l7.446 4.96c.315.21.708.21 1.023 0L20 8.511V18H4z"/></svg>`;
    case 'website':
      return `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 2c1.012 0 1.958.197 2.82.55A12.044 12.044 0 0118.72 6.8c-1.25.515-2.452 1.025-3.67 1.61-.88-.4-1.82-.66-2.82-.66s-1.94.26-2.82.66A20.134 20.134 0 015.28 6.8 12.05 12.05 0 019.18 4.55C10.042 4.197 10.988 4 12 4zm-4.5 9.5h9A4.502 4.502 0 0112 17a4.502 4.502 0 01-4.5-3.5z"/></svg>`;
    default:
      return `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="10"/></svg>`;
  }
}

function updateMemberCard() {
  const member = teamMembers[currentMemberIndex];
  
  const imgEl = document.getElementById('member-img');
  const nameEl = document.getElementById('member-name');
  const descEl = document.getElementById('member-desc');
  const linksEl = document.getElementById('member-links');

  if (imgEl) {
    imgEl.src = member.img;
    imgEl.alt = `Foto de ${member.name}`;
    imgEl.onerror = function() {
      this.onerror = null;
      this.src = 'Images/profiletest.png';
    };
  }
  
  if (nameEl) nameEl.textContent = member.name;
  if (descEl) descEl.textContent = member.desc;

  if (linksEl) {
    linksEl.innerHTML = member.links.map(link => `
      <a href="${link.url}" target="_blank" rel="noopener noreferrer" aria-label="${link.label}" style="display: inline-flex !important;" class="w-10 h-10 rounded-full bg-slate-100 text-slate-900 items-center justify-center hover:bg-cyan-400 transition-colors shadow-md shrink-0">
        ${getLinkIcon(link.icon)}
      </a>
    `).join('');
  }
}

function nextMember() {
  currentMemberIndex = (currentMemberIndex + 1) % teamMembers.length;
  updateMemberCard();
}

function prevMember() {
  currentMemberIndex = (currentMemberIndex - 1 + teamMembers.length) % teamMembers.length;
  updateMemberCard();
}

window.nextMember = nextMember;
window.prevMember = prevMember;

// Cargar el primer participante por defecto
document.addEventListener('DOMContentLoaded', updateMemberCard);
updateMemberCard();