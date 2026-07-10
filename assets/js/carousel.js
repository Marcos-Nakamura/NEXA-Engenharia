/**
 * Nexa Engenharia — carousel.js
 * Carrossel que carrega AUTOMATICAMENTE todas as fotos da pasta
 * assets/carrossel/.
 *
 * Como ele descobre as imagens (nesta ordem):
 *   1. window.NEXA_GALLERY_IMAGES — definida em assets/carrossel/images.js,
 *      incluída como <script> normal no index.html. Esta é a fonte principal:
 *      funciona sempre, inclusive abrindo o index.html direto no navegador
 *      (file://), onde chamadas fetch() para arquivos locais são bloqueadas
 *      por política de CORS.
 *   2. Listagem de diretório via fetch — usada apenas como reforço quando o
 *      site é servido por um servidor HTTP com autoindex; permite detectar
 *      fotos novas mesmo sem regenerar o images.js.
 *   3. manifest.json via fetch — mesmo caso de uso do item 2.
 *
 * Para adicionar/remover fotos: coloque os arquivos em assets/carrossel/ e
 * rode assets/carrossel/gerar-manifest.ps1 para atualizar o images.js.
 */

(function () {
  'use strict';

  const FOLDER = 'assets/carrossel/';
  const IMAGE_RE = /\.(jpe?g|png|gif|webp|avif)$/i;
  const AUTOPLAY_MS = 8500;
  // Foto que abre o carrossel em destaque ao carregar a página.
  const INITIAL_IMAGE = 'projeto-03.jpg';

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    const root = document.getElementById('carousel');
    if (!root) return;

    const track   = document.getElementById('carousel-track');
    const dotsBox = document.getElementById('carousel-dots');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');

    let images = await discoverImages();

    if (!images.length) {
      showEmpty(root, track, dotsBox, prevBtn, nextBtn);
      return;
    }

    buildSlides(track, dotsBox, images);
    const initialIndex = Math.max(0, images.indexOf(INITIAL_IMAGE));
    startCarousel({ root, track, dotsBox, prevBtn, nextBtn, total: images.length, initialIndex });
  }

  /* ── Descoberta das imagens ─────────────────────────────── */
  async function discoverImages() {
    // 1) Fonte principal: lista embutida via <script> (sempre disponível,
    //    inclusive em file://).
    const inline = dedupeSort(
      Array.isArray(window.NEXA_GALLERY_IMAGES)
        ? window.NEXA_GALLERY_IMAGES.filter(n => typeof n === 'string' && IMAGE_RE.test(n))
        : []
    );
    if (inline.length) return inline;

    // 2) Reforço: listagem de diretório (só funciona em http/https).
    const fromDir = await tryDirectoryListing();
    if (fromDir.length) return fromDir;

    // 3) Reforço: manifest.json (só funciona em http/https).
    return await tryManifest();
  }

  async function tryDirectoryListing() {
    if (location.protocol === 'file:') return [];
    try {
      const res = await fetch(FOLDER, { headers: { Accept: 'text/html' } });
      if (!res.ok) return [];
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const names = Array.from(doc.querySelectorAll('a[href]'))
        .map(a => a.getAttribute('href'))
        .map(href => decodeURIComponent(href.split('/').pop().split('?')[0]))
        .filter(name => IMAGE_RE.test(name));
      return dedupeSort(names);
    } catch (_) {
      return [];
    }
  }

  async function tryManifest() {
    if (location.protocol === 'file:') return [];
    try {
      const res = await fetch(FOLDER + 'manifest.json', { cache: 'no-cache' });
      if (!res.ok) return [];
      const list = await res.json();
      if (!Array.isArray(list)) return [];
      return dedupeSort(list.filter(n => typeof n === 'string' && IMAGE_RE.test(n)));
    } catch (_) {
      return [];
    }
  }

  function dedupeSort(names) {
    return Array.from(new Set(names)).sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { numeric: true })
    );
  }

  /* ── Construção do DOM ──────────────────────────────────── */
  // Quantos slides duplicados (clones) colocamos em cada ponta da trilha
  // para o loop "infinito". Como sempre há um vizinho parcial visível de
  // cada lado do slide em destaque, precisamos de mais de 1 clone: assim,
  // ao dar a volta, o clone em destaque ainda tem vizinho para exibir e
  // não sobra um buraco vazio na lateral. 2 cobre o layout atual.
  const CLONES = 2;

  function makeSlide(name, i, isClone) {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    if (isClone) slide.dataset.clone = 'true';

    const img = document.createElement('img');
    img.src = FOLDER + encodeURIComponent(name);
    img.alt = 'Projeto Nexa Engenharia ' + (i + 1);
    img.loading = (!isClone && name === INITIAL_IMAGE) ? 'eager' : 'lazy';
    slide.appendChild(img);
    return slide;
  }

  function buildSlides(track, dotsBox, images) {
    track.innerHTML = '';
    dotsBox.innerHTML = '';

    const total = images.length;
    const k = total > 1 ? Math.min(CLONES, total) : 0;

    // Clones do fim, na frente (últimas k fotos, em ordem).
    for (let j = total - k; j < total; j++) {
      track.appendChild(makeSlide(images[j], j, true));
    }

    images.forEach((name, i) => {
      track.appendChild(makeSlide(name, i, false));

      const dot = document.createElement('button');
      dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      dot.type = 'button';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', 'Ir para a imagem ' + (i + 1));
      dot.dataset.index = String(i);
      dotsBox.appendChild(dot);
    });

    // Clones do começo, no fim (primeiras k fotos, em ordem).
    for (let j = 0; j < k; j++) {
      track.appendChild(makeSlide(images[j], j, true));
    }
  }

  /* ── Lógica do carrossel ────────────────────────────────── */
  function startCarousel(ctx) {
    const { root, track, dotsBox, prevBtn, nextBtn, total, initialIndex } = ctx;
    // Quantos clones existem em cada ponta (mesma conta do buildSlides).
    const k = total > 1 ? Math.min(CLONES, total) : 0;
    // A foto real i (0..total-1) mora no DOM na posição i + k. As k
    // posições antes de FIRST e as k depois de LAST são clones.
    const FIRST = k;
    const LAST  = k + total - 1;
    let pos = FIRST + (initialIndex || 0);
    let timer = null;

    const dots = Array.from(dotsBox.children);
    const slides = Array.from(track.children);
    const viewport = track.parentElement;

    function realIndex(p) {
      return ((p - k) % total + total) % total;
    }

    function render(withTransition) {
      // Sem transição, silenciamos tanto o deslize da trilha quanto o
      // zoom/opacidade dos slides, para o "salto" da costura ser
      // totalmente invisível (nada de pop no slide do centro).
      if (!withTransition) track.classList.add('no-anim');
      slides.forEach((s, i) => s.classList.toggle('carousel-slide--active', i === pos));
      const slideEl = slides[pos];
      if (slideEl) {
        const offset = slideEl.offsetLeft - (viewport.clientWidth - slideEl.offsetWidth) / 2;
        track.style.transform = 'translateX(' + (-offset) + 'px)';
      }
      if (!withTransition) {
        track.offsetHeight; // force reflow com o novo estado já aplicado
        track.classList.remove('no-anim');
      }
      const ri = realIndex(pos);
      dots.forEach((d, i) => d.classList.toggle('active', i === ri));
    }

    // Ao terminar a animação sobre um clone, salta sem transição para o
    // slide real equivalente na outra ponta — o usuário só vê o loop
    // contínuo, nunca a costura.
    track.addEventListener('transitionend', (e) => {
      if (e.target !== track || e.propertyName !== 'transform') return;
      if (pos > LAST) { pos -= total; render(false); }
      else if (pos < FIRST) { pos += total; render(false); }
    });

    window.addEventListener('resize', () => render(false));

    // Posiciona o primeiro slide sem animação de entrada. Como o slide em
    // destaque tem largura livre (definida pela proporção da própria
    // imagem), a centralização só fica correta depois que essa imagem
    // carrega — antes disso ela ainda não tem tamanho, e a conta de
    // centralização dá um valor errado (foto de abertura "deslocada").
    render(false);
    const heroImg = slides[pos] && slides[pos].querySelector('img');
    if (heroImg && !heroImg.complete) {
      heroImg.addEventListener('load', () => render(false), { once: true });
    }

    function go(newPos) { pos = newPos; render(true); }

    const next = () => go(pos + 1);
    const prev = () => go(pos - 1);

    prevBtn && prevBtn.addEventListener('click', () => { prev(); restart(); });
    nextBtn && nextBtn.addEventListener('click', () => { next(); restart(); });

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        go(Number(dot.dataset.index) + FIRST);
        restart();
      });
    });

    // Autoplay
    function start() { timer = window.setInterval(next, AUTOPLAY_MS); }
    function stop()  { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { stop(); start(); }

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);

    // Teclado
    root.tabIndex = 0;
    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { next(); restart(); }
      if (e.key === 'ArrowLeft')  { prev(); restart(); }
    });

    // Toque (swipe)
    let startX = 0;
    track.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; stop(); }, { passive: true });
    track.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
      start();
    }, { passive: true });

    // Só um slide? Esconde controles.
    if (total <= 1) {
      prevBtn && (prevBtn.style.display = 'none');
      nextBtn && (nextBtn.style.display = 'none');
      dotsBox.style.display = 'none';
      return;
    }

    start();
  }

  function showEmpty(root, track, dotsBox, prevBtn, nextBtn) {
    track.innerHTML =
      '<div class="carousel-empty">Nenhuma foto encontrada em <strong>' + FOLDER +
      '</strong>.<br>Adicione imagens (.jpg, .png, .webp…) nessa pasta e rode gerar-manifest.ps1.</div>';
    [dotsBox, prevBtn, nextBtn].forEach(el => el && (el.style.display = 'none'));
  }

})();
