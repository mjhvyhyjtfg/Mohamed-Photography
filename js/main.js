/* ============================================================
   MAIN JS — Mohamed Photography
   ============================================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  // ====== PRELOADER ======
  const preloader = document.getElementById('preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        preloader.classList.add('hidden');
        document.body.style.overflow = '';
        triggerHeroAnimations();
      }, 1800);
    });
    document.body.style.overflow = 'hidden';
  }

  // ====== SCROLL PROGRESS BAR ======
  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  document.body.appendChild(progressBar);

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrollTop / docHeight) * 100;
    progressBar.style.width = progress + '%';
  }, { passive: true });

  // ====== NAVBAR ======
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar?.classList.add('scrolled');
    } else {
      navbar?.classList.remove('scrolled');
    }
  }, { passive: true });

  navToggle?.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navLinks?.classList.toggle('open');
  });

  // Close nav on link click
  navLinks?.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navToggle?.classList.remove('active');
      navLinks?.classList.remove('open');
    });
  });

  // ====== THREE.JS HERO CANVAS ======
  const heroCanvas = document.getElementById('heroCanvas');
  if (heroCanvas && window.THREE) {
    initHeroThreeJS(heroCanvas);
  }

  // ====== HERO PARTICLES ======
  const heroParticles = document.getElementById('heroParticles');
  if (heroParticles) {
    createParticles(heroParticles, 35);
  }

  // ====== HERO ANIMATIONS ======
  function triggerHeroAnimations() {
    const reveals = document.querySelectorAll('.reveal-fade, .reveal-up');
    reveals.forEach((el, i) => {
      setTimeout(() => {
        el.classList.add('visible');
      }, i * 150);
    });
  }

  // ====== COUNTER ANIMATION ======
  const statNums = document.querySelectorAll('.stat-num');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target);
        animateCounter(el, 0, target, 2000);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  statNums.forEach(el => counterObserver.observe(el));

  function animateCounter(el, start, end, duration) {
    const startTime = performance.now();
    const update = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(update);
      else el.textContent = end;
    };
    requestAnimationFrame(update);
  }

  // ====== SCROLL REVEAL ======
  const scrollRevealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('.reveal-fade, .reveal-up').forEach(el => {
    if (!el.classList.contains('visible')) {
      scrollRevealObserver.observe(el);
    }
  });

  // ====== SKILL BARS ======
  const skillBars = document.querySelectorAll('.skill-fill');
  const skillObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const fill = entry.target;
        fill.style.width = fill.dataset.width + '%';
        skillObserver.unobserve(fill);
      }
    });
  }, { threshold: 0.5 });
  skillBars.forEach(bar => skillObserver.observe(bar));

  // ====== 3D TILT EFFECT ON CARDS ======
  document.querySelectorAll('.service-card, .testimonial-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const rotateX = (-y / rect.height) * 8;
      const rotateY = (x / rect.width) * 8;
      card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  // ====== GALLERY ITEMS STAGGER ======
  const galleryItems = document.querySelectorAll('.gallery-item');
  const galleryObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, i * 80);
        galleryObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  galleryItems.forEach(item => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(30px)';
    item.style.transition = 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    galleryObserver.observe(item);
  });

  // ====== SERVICE CARDS STAGGER ======
  const serviceCards = document.querySelectorAll('.service-card');
  const serviceObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const index = Array.from(serviceCards).indexOf(entry.target);
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, index * 100);
        serviceObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  serviceCards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(40px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.4,0,0.2,1)';
    serviceObserver.observe(card);
  });

  // ====== TESTIMONIALS DOTS ======
  const dots = document.querySelectorAll('.testimonials-dots .dot');
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      dots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      // Could implement carousel here if needed
    });
  });

  // ====== NOISE OVERLAY ======
  const noise = document.createElement('div');
  noise.className = 'noise-overlay';
  document.body.appendChild(noise);

  // ====== CUSTOM CURSOR ======
  if (window.matchMedia('(pointer: fine)').matches) {
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    const ring = document.createElement('div');
    ring.className = 'cursor-ring';
    document.body.appendChild(cursor);
    document.body.appendChild(ring);

    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursor.style.left = mouseX + 'px';
      cursor.style.top = mouseY + 'px';
    });

    const animateRing = () => {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      ring.style.left = ringX + 'px';
      ring.style.top = ringY + 'px';
      requestAnimationFrame(animateRing);
    };
    animateRing();

    // Cursor grow on hover
    const interactiveEls = document.querySelectorAll('a, button, .service-card, .gallery-item');
    interactiveEls.forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursor.style.width = '24px';
        cursor.style.height = '24px';
        ring.style.width = '60px';
        ring.style.height = '60px';
      });
      el.addEventListener('mouseleave', () => {
        cursor.style.width = '16px';
        cursor.style.height = '16px';
        ring.style.width = '44px';
        ring.style.height = '44px';
      });
    });
  }

  // ====== LIGHTBOX (simple) ======
  const galleryItemsAll = document.querySelectorAll('.gallery-item');
  galleryItemsAll.forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      if (!img) return;
      openLightbox(img.src, item.querySelector('h4')?.textContent || '');
    });
  });

  function openLightbox(src, title) {
    const lb = document.createElement('div');
    lb.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.95); z-index:99999;
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      animation: scaleIn 0.3s ease;
    `;
    lb.innerHTML = `
      <button style="position:absolute;top:20px;right:20px;width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:white;font-size:1.5rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .3s;z-index:2" id="lb-close">×</button>
      <img src="${src}" style="max-width:90vw;max-height:85vh;object-fit:contain;border-radius:8px;box-shadow:0 40px 80px rgba(0,0,0,0.8)" />
      <p style="margin-top:1rem;color:rgba(255,255,255,0.7);font-family:'Cairo',sans-serif;font-size:0.9rem">${title}</p>
    `;
    document.body.appendChild(lb);
    document.body.style.overflow = 'hidden';
    lb.querySelector('#lb-close').addEventListener('click', () => closeLightbox(lb));
    lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(lb); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { closeLightbox(lb); document.removeEventListener('keydown', esc); }
    });
  }

  function closeLightbox(lb) {
    lb.style.opacity = '0';
    lb.style.transition = 'opacity 0.3s ease';
    setTimeout(() => { lb.remove(); document.body.style.overflow = ''; }, 300);
  }

  // ====== SMOOTH ANCHOR SCROLL ======
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 75;
        window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
      }
    });
  });

  // ====== ACTIVE NAV LINK ======
  const sections = document.querySelectorAll('section[id]');
  const navLinksAll = document.querySelectorAll('.nav-link');

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinksAll.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === '#' + entry.target.id) {
            link.classList.add('active');
          }
        });
      }
    });
  }, { rootMargin: '-40% 0px -40% 0px' });

  sections.forEach(s => sectionObserver.observe(s));

});

// ====== THREE.JS 3D SCENE ======
function initHeroThreeJS(canvas) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });

  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  camera.position.z = 5;

  // Particle geometry
  const count = 150;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

    const isCrimson = Math.random() > 0.5;
    colors[i * 3] = isCrimson ? 0.75 : 1;
    colors[i * 3 + 1] = isCrimson ? 0.22 : 1;
    colors[i * 3 + 2] = isCrimson ? 0.17 : 1;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.7 });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // Floating rings
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ringGeo = new THREE.TorusGeometry(2 + i * 1.5, 0.015, 8, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: i === 0 ? 0xc0392b : i === 1 ? 0xe74c3c : 0x922b21,
      transparent: true,
      opacity: 0.3 - i * 0.08
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 4 + i * 0.3;
    ring.rotation.z = i * 0.5;
    scene.add(ring);
    rings.push(ring);
  }

  let mouseX = 0, mouseY = 0;
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
  });

  const clock = new THREE.Clock();
  const animate = () => {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    points.rotation.y = t * 0.05;
    points.rotation.x = t * 0.02;

    rings.forEach((ring, i) => {
      ring.rotation.y = t * (0.1 + i * 0.05);
      ring.rotation.z = t * (0.05 + i * 0.03);
    });

    camera.position.x += (mouseX * 1.5 - camera.position.x) * 0.03;
    camera.position.y += (mouseY * 1 - camera.position.y) * 0.03;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  };
  animate();

  // Resize
  window.addEventListener('resize', () => {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  });
}

// ====== HERO DOM PARTICLES ======
function createParticles(container, count) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      animation-duration: ${5 + Math.random() * 10}s;
      animation-delay: ${Math.random() * 8}s;
      width: ${1 + Math.random() * 3}px;
      height: ${1 + Math.random() * 3}px;
      opacity: ${0.3 + Math.random() * 0.7};
    `;
    container.appendChild(p);
  }
}

/* ====== DARK / LIGHT MODE TOGGLE ====== */
(function initThemeToggle() {
  const THEME_KEY = 'mp_theme';
  const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
  if (savedTheme === 'light') document.body.classList.add('light-mode');

  const btn = document.createElement('button');
  btn.className = 'theme-toggle';
  btn.id = 'themeToggle';
  btn.setAttribute('aria-label', 'تبديل الوضع');
  btn.innerHTML = savedTheme === 'light' ? '☀️' : '🌙';
  btn.title = savedTheme === 'light' ? 'المظلم' : 'الفاتح';
  document.body.appendChild(btn);

  btn.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-mode');
    btn.innerHTML = isLight ? '☀️' : '🌙';
    localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
    btn.style.transform = 'scale(1.4) rotate(30deg)';
    setTimeout(() => { btn.style.transform = ''; }, 350);
  });
})();
