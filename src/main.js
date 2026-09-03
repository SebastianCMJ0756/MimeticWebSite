// --- 0. FUNCIONES AUXILIARES PARA WEB THREADS ---
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ];
}

// Obtener OGL desde el objeto global (versión UMD expone Renderer, Program, etc. directamente en window)
// Obtener OGL global
function getOGL() {
  if (window.OGL) return window.OGL;
  if (typeof window.Renderer !== 'undefined') {
    return {
      Renderer: window.Renderer,
      Program: window.Program,
      Mesh: window.Mesh,
      Triangle: window.Triangle
    };
  }
  return null;
}

const webThreadsVertexShader = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const webThreadsFragmentShader = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uThreadCount;
uniform float uFrequency;
uniform float uSpread;
uniform float uTaper;
uniform float uPosition;
uniform float uFanMode;
uniform float uGlow;
uniform float uFalloff;
uniform float uThickness;
uniform float uBrightness;
uniform float uOpacity;
uniform float uMirror;
uniform float uShimmer;
uniform float uGrain;
uniform float uGrainIntensity;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform float uEnableMouse;
uniform float uMouseActive;
out vec4 fragColor;

#define TAU 6.28318530718
#define MAX_THREADS 10

float glow(float x, float str, float dist) {
  return dist / pow(max(x, 1e-4), str);
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float n = max(uThreadCount, 1.0);

  float pinchX = uFanMode < 0.5 ? 0.5 : (uFanMode < 1.5 ? 0.0 : 1.0);
  if (uEnableMouse > 0.5) {
    pinchX = mix(pinchX, uMouse.x, clamp(uMouseStrength, 0.0, 1.0) * uMouseActive);
  }

  float spreadDx = uSpread * abs(uv.x - pinchX);
  float baseT = iTime * uSpeed;
  float tauOverN = TAU / n;
  float mirror = uMirror > 0.5 ? sign(pinchX - uv.x) : 1.0;
  bool doShimmer = uShimmer > 0.5;
  float shimmerT = iTime * 1.7;
  float invThickness = 1.0 / max(uThickness, 0.01);
  float xFreq = uv.x * uFrequency;
  float yOff = uv.y - uPosition;
  float ciScale = n > 1.0 ? 1.0 / (n - 1.0) : 0.0;

  vec3 col = vec3(0.0);
  float gsum = 0.0;

  for (int idx = 0; idx < MAX_THREADS; idx++) {
    float i = float(idx);
    if (i >= n) break;

    float amplitude = spreadDx * (1.0 + i * uTaper);
    float shimmer = doShimmer ? sin(shimmerT + i * 1.3) * 0.35 : 0.0;
    float phase = (baseT + i * tauOverN) * mirror + shimmer;

    float sdf = abs(yOff + sin(xFreq + phase) * amplitude) * invThickness;

    float g = glow(sdf, uFalloff, uGlow);
    float ci = i * ciScale;
    vec3 threadCol = mix(uColor1, uColor2, ci);

    col += g * threadCol;
    gsum += g;
  }

  float coreAmt = smoothstep(0.5, 2.2, gsum);
  col = mix(col, uColor3 * gsum, coreAmt * 0.5);

  float bright = uBrightness;
  if (uEnableMouse > 0.5) {
    vec2 md = uv - uMouse;
    float d2 = dot(md, md);
    bright += clamp(uMouseStrength, 0.0, 1.0) * uMouseActive * exp(-d2 * 6.0) * 0.6;
  }
  col *= bright;

  float alpha = clamp(gsum, 0.0, 1.0) * uOpacity;
  vec3 outRgb = col * alpha;

  if (uGrain > 0.5) {
    float gv = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + iTime) * 43758.5453) - 0.5) * uGrainIntensity;
    outRgb = clamp(outRgb + gv, 0.0, 1.0);
    alpha = clamp(alpha + gv, 0.0, 1.0);
  }

  fragColor = vec4(outRgb, alpha);
}
`;

function initWebThreads(options = {}) {
  const container = document.getElementById('web-threads-bg');
  if (!container) {
    console.warn('Contenedor web-threads-bg no encontrado');
    return;
  }

  const OGL = getOGL();
  if (!OGL || !OGL.Renderer) {
    console.warn('OGL no está disponible. Reintentando...');
    setTimeout(() => initWebThreads(options), 100);
    return;
  }

  const { Renderer, Program, Mesh, Triangle } = OGL;

  // Opciones predeterminadas
  const config = {
    color1: options.color1 || '#5227FF',
    color2: options.color2 || '#FF9FFC',
    color3: options.color3 || '#FFFFFF',
    speed: options.speed ?? 0.2,
    threadCount: options.threadCount ?? 6,
    frequency: options.frequency ?? 5.0,
    spread: options.spread ?? 0.18,
    taper: options.taper ?? 1.0,
    position: options.position ?? 0.5,
    fanMode: options.fanMode || 'center',
    glow: options.glow ?? 0.02,
    falloff: options.falloff ?? 0.6,
    thickness: options.thickness ?? 1.1,
    brightness: options.brightness ?? 0.6,
    opacity: options.opacity ?? 1.0,
    mirror: options.mirror ?? true,
    shimmer: options.shimmer ?? false,
    grain: options.grain ?? true,
    grainIntensity: options.grainIntensity ?? 0.05,
    mouseInteraction: options.mouseInteraction ?? true,
    mouseStrength: options.mouseStrength ?? 0.3
  };

  try {
    const renderer = new Renderer({
      webgl: 2,
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 2)
    });

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas;
    container.appendChild(canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: webThreadsVertexShader,
      fragment: webThreadsFragmentShader,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uSpeed: { value: config.speed },
        uThreadCount: { value: config.threadCount },
        uFrequency: { value: config.frequency },
        uSpread: { value: config.spread },
        uTaper: { value: config.taper },
        uPosition: { value: config.position },
        uFanMode: { value: config.fanMode === 'left' ? 1 : config.fanMode === 'right' ? 2 : 0 },
        uGlow: { value: config.glow },
        uFalloff: { value: config.falloff },
        uThickness: { value: config.thickness },
        uBrightness: { value: config.brightness },
        uOpacity: { value: config.opacity },
        uMirror: { value: config.mirror ? 1.0 : 0.0 },
        uShimmer: { value: config.shimmer ? 1.0 : 0.0 },
        uGrain: { value: config.grain ? 1.0 : 0.0 },
        uGrainIntensity: { value: config.grainIntensity },
        uColor1: { value: new Float32Array(hexToRgb(config.color1)) },
        uColor2: { value: new Float32Array(hexToRgb(config.color2)) },
        uColor3: { value: new Float32Array(hexToRgb(config.color3)) },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uMouseStrength: { value: config.mouseStrength },
        uEnableMouse: { value: config.mouseInteraction ? 1.0 : 0.0 },
        uMouseActive: { value: 0 }
      }
    });

    const mesh = new Mesh(gl, { geometry, program });

    const setSize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      renderer.setSize(w, h);
      program.uniforms.iResolution.value[0] = gl.drawingBufferWidth;
      program.uniforms.iResolution.value[1] = gl.drawingBufferHeight;
    };

    window.addEventListener('resize', setSize);
    setSize();

    // Escuchar eventos del ratón
    const currentMouse = [0.5, 0.5];
    const targetMouse = [0.5, 0.5];
    let currentActive = 0;
    let targetActive = 0;

    window.addEventListener('mousemove', (e) => {
      targetMouse[0] = e.clientX / window.innerWidth;
      targetMouse[1] = 1.0 - (e.clientY / window.innerHeight);
      targetActive = 1;
    });

    const t0 = performance.now();
    function loop(t) {
      program.uniforms.iTime.value = (t - t0) * 0.001;
      currentMouse[0] += 0.05 * (targetMouse[0] - currentMouse[0]);
      currentMouse[1] += 0.05 * (targetMouse[1] - currentMouse[1]);
      currentActive += 0.05 * (targetActive - currentActive);

      program.uniforms.uMouse.value[0] = currentMouse[0];
      program.uniforms.uMouse.value[1] = currentMouse[1];
      program.uniforms.uMouseActive.value = currentActive;

      renderer.render({ scene: mesh });
      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
    console.log('✅ WebThreads inicializado correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar WebThreads:', error);
  }
}

// --- CONFIGURACIÓN GLOBAL (independiente del fondo) ---
const CONFIG = {
  cooldownScroll: 600, // Tiempo de espera entre cambios de capa
};

// --- DESHABILITADO: Usar WebThreads en su lugar ---
if (false) {

// --- 1. LEER CONFIGURACIÓN DESDE VARIABLES CSS ---
const cssVars = getComputedStyle(document.documentElement);
const CONFIG_LEGACY = {
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
    this.color = Math.random() > 0.5 ? CONFIG_LEGACY.colorPrimary : CONFIG_LEGACY.colorSecondary;
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
for (let i = 0; i < CONFIG_LEGACY.particleCount; i++) particles.push(new Particle());

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
      if (this.timer > CONFIG_LEGACY.crossVisibleDuration) this.state = 'fade-out';
    } else if (this.state === 'fade-out') {
      this.alpha -= 0.02;
      if (this.alpha <= 0) { this.alpha = 0; this.active = false; this.state = 'hidden'; }
    }
  }
  draw() {
    if (!this.active || this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.strokeStyle = CONFIG_LEGACY.colorCross;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 14;
    ctx.shadowColor = CONFIG_LEGACY.colorCross;
    ctx.translate(this.x, this.y);
    ctx.beginPath();
    ctx.moveTo(-this.size/2, 0); ctx.lineTo(this.size/2, 0);
    ctx.moveTo(0, -this.size/2); ctx.lineTo(0, this.size/2);
    ctx.stroke();
    ctx.restore();
  }
}

const neonCross = new NeonCross();
setInterval(() => { neonCross.spawn(); }, CONFIG_LEGACY.crossInterval);
setTimeout(() => { neonCross.spawn(); }, 1500);

// Bucle de Animación
function animate() {
  ctx.clearRect(0, 0, width, height);

  const grad = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, Math.max(width, height) * 0.75);
  grad.addColorStop(0, CONFIG_LEGACY.colorBgCenter);
  grad.addColorStop(0.35, CONFIG_LEGACY.colorBgMid);
  grad.addColorStop(0.7, CONFIG_LEGACY.colorBgOuter);
  grad.addColorStop(1, CONFIG_LEGACY.colorBgCenter);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  particles.forEach(p => { p.update(); p.draw(); });
  neonCross.update();
  neonCross.draw();

  requestAnimationFrame(animate);
}
animate();

} // FIN: Código anterior deshabilitado

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

function startWebThreads() {
  const OGL = getOGL();
  if (OGL && (OGL.Renderer || window.Renderer)) {
    console.log('✅ OGL cargado correctamente, inicializando WebThreads...');
    initWebThreads({
      color1: "#5227FF",
      color2: "#FF9FFC",
      color3: "#FFFFFF",
      speed: 0.2,
      threadCount: 6,
      frequency: 5.0,
      spread: 0.18,
      thickness: 1.1,
      brightness: 0.6,
      opacity: 0.8
    });
  } else {
    console.log('OGL aún no disponible, reintentando...');
    setTimeout(startWebThreads, 150);
  }
}
// Esperar a que el DOM esté completamente cargado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startWebThreads);
} else {
  startWebThreads();
}

// ==========================================
// LÓGICA INTERACTIVA CAPA 02 (MIMETIC & TRIAGE)
// ==========================================

function switchLayer1Tab(tabName) {
  const btnMimetic = document.getElementById('btn-tab-mimetic');
  const btnTriage = document.getElementById('btn-tab-triage');
  const viewMimetic = document.getElementById('view-mimetic-cards');
  const viewTriage = document.getElementById('view-triage-cards');

  if (tabName === 'mimetic') {
    btnMimetic.classList.add('active', 'text-white');
    btnMimetic.classList.remove('text-slate-400');
    btnTriage.classList.remove('active', 'text-white');
    btnTriage.classList.add('text-slate-400');

    viewMimetic.classList.remove('hidden');
    viewTriage.classList.add('hidden');
  } else if (tabName === 'triage') {
    btnTriage.classList.add('active', 'text-white');
    btnTriage.classList.remove('text-slate-400');
    btnMimetic.classList.remove('active', 'text-white');
    btnMimetic.classList.add('text-slate-400');

    viewTriage.classList.remove('hidden');
    viewMimetic.classList.add('hidden');
  }
}

// Selección visual de tarjetas estilo Raycast
function selectGlowCard(cardElement) {
  const parentContainer = cardElement.parentElement;
  const cards = parentContainer.querySelectorAll('.glow-card');
  
  cards.forEach(card => card.classList.remove('active'));
  cardElement.classList.add('active');
}

// Navegación por flechas (Ciclado de tarjetas activas)
function cycleCards(direction) {
  const activeView = document.querySelector('#view-mimetic-cards:not(.hidden), #view-triage-cards:not(.hidden)');
  if (!activeView) return;

  const cards = Array.from(activeView.querySelectorAll('.glow-card'));
  let currentIndex = cards.findIndex(card => card.classList.contains('active'));

  if (currentIndex === -1) currentIndex = 0;

  cards[currentIndex].classList.remove('active');

  if (direction === 'next') {
    currentIndex = (currentIndex + 1) % cards.length;
  } else {
    currentIndex = (currentIndex - 1 + cards.length) % cards.length;
  }

  cards[currentIndex].classList.add('active');
}

// ==========================================
// LÓGICA DE CAPTURA DE LEADS (CAPA 03)
// ==========================================

function validateLeadForm() {
  const fullnameInput = document.getElementById('lead-fullname');
  const emailInput = document.getElementById('lead-email');
  const submitBtn = document.getElementById('btn-lead-submit');

  const isFullnameValid = fullnameInput.value.trim().length > 0;
  const isEmailValid = emailInput.value.trim().length > 0 && emailInput.value.includes('@');

  if (isFullnameValid && isEmailValid) {
    submitBtn.disabled = false;
    submitBtn.classList.add('is-ready');
    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  } else {
    submitBtn.disabled = true;
    submitBtn.classList.remove('is-ready');
    submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
  }
}

function handleLeadSubmit(event) {
  event.preventDefault();

  const fullnameInput = document.getElementById('lead-fullname');
  const emailInput = document.getElementById('lead-email');
  const submitBtn = document.getElementById('btn-lead-submit');
  const btnText = document.getElementById('btn-text');

  // 1. Bloquear entradas y botón
  fullnameInput.disabled = true;
  emailInput.disabled = true;
  submitBtn.disabled = true;
  submitBtn.classList.remove('is-ready');
  submitBtn.classList.add('is-loading');

  // 2. Estado de carga dentro del mismo boton
  btnText.textContent = 'Cargando...';

  // 3. Simulación de envío por red (2 segundos)
  setTimeout(() => {
    btnText.textContent = '¡Gracias por suscribirte! ✓';
    submitBtn.classList.remove('is-loading');
    submitBtn.classList.add('is-success');
    submitBtn.style.backgroundColor = '#34d399';
    submitBtn.style.color = '#052e16';
    submitBtn.style.opacity = '1';
  }, 2000);
}
