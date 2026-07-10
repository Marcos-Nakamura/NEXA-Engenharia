/**
 * Nexa Engenharia — main.js
 * Header scroll + mobile menu + scroll suave + animações de entrada
 */

document.addEventListener('DOMContentLoaded', function () {

  /* ── Ano do rodapé ─────────────────────────────────── */
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ── Header scroll ─────────────────────────────────── */
  const header = document.getElementById('site-header');
  if (header) {
    const onScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── Mobile menu (dropdown) ─────────────────────────── */
  const toggle = document.getElementById('menu-toggle');
  const nav    = document.getElementById('main-nav');

  if (toggle && nav) {
    const setOpen = (open) => {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open);

      // Animação das barras → X
      const bars = toggle.querySelectorAll('span');
      if (open) {
        bars[0].style.cssText = 'transform: translateY(7px) rotate(45deg)';
        bars[1].style.cssText = 'opacity: 0';
        bars[2].style.cssText = 'transform: translateY(-7px) rotate(-45deg)';
      } else {
        bars.forEach(b => b.removeAttribute('style'));
      }
    };

    toggle.addEventListener('click', () => {
      setOpen(!nav.classList.contains('open'));
    });

    // Fechar ao clicar em link
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => setOpen(false));
    });

    // Fechar ao clicar fora do dropdown
    document.addEventListener('click', (e) => {
      if (nav.classList.contains('open') && !nav.contains(e.target) && !toggle.contains(e.target)) {
        setOpen(false);
      }
    });

    // Fechar com Esc
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('open')) setOpen(false);
    });
  }

  /* ── Scroll suave para âncoras internas ────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  /* ── Intersection Observer — animação de entrada ───── */
  const animEls = document.querySelectorAll(
    '.diferencial-card, .servico-card, .sobre-grid, .hero-content, .servico-detail-grid, .outras-solucoes-item'
  );

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity    = '1';
          entry.target.style.transform  = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    animEls.forEach((el, i) => {
      el.style.opacity   = '0';
      el.style.transform = 'translateY(28px)';
      el.style.transition = `opacity 0.5s ease ${i * 0.07}s, transform 0.5s ease ${i * 0.07}s`;
      observer.observe(el);
    });
  }

  /* ── Hero parallax leve ────────────────────────────── */
  const heroBg = document.querySelector('.hero-bg');
  if (heroBg) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY * 0.3;
      heroBg.style.transform = `scale(1.05) translateY(${y}px)`;
    }, { passive: true });
  }

  /* ── Parallax leve nas fotos de Diferenciais/Serviços ─ */
  const parallaxEls = document.querySelectorAll('.parallax-bg');
  if (parallaxEls.length) {
    const updateParallax = () => {
      parallaxEls.forEach(el => {
        const rect = el.parentElement.getBoundingClientRect();
        const center = rect.top + rect.height / 2 - window.innerHeight / 2;
        const shift = Math.max(-40, Math.min(40, center * -0.05));
        el.style.transform = `translateY(${shift}px)`;
      });
    };
    window.addEventListener('scroll', updateParallax, { passive: true });
    window.addEventListener('resize', updateParallax);
    updateParallax();
  }

});
