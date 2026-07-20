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
const totalLayers = 3;
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