/* =====================================================================
   Altyn Therapy — Conversion enhancements (v2 — Apple-grade dark premium)
   1) Hides legacy fake text testimonials painted by the React bundle
   2) Injects a cinematic video testimonials section after the existing
      "Истории трансформации" heading (which we keep as a trust anchor)
   3) Inline-autoplay (muted) of the centered card — Reels-style hook
   4) Mounts a sticky mobile bottom CTA bar (Записаться + WhatsApp)
   ===================================================================== */
(function () {
  'use strict';

  // ---------- Configuration ----------
  var TG = 'https://t.me/altyntherapybot';
  var WA = 'https://wa.me/77077198561?text=' + encodeURIComponent(
    'Здравствуйте! Хочу записаться на бесплатный разбор'
  );

  var TESTIMONIALS = [
    { id: 1, label: 'Видеоотзыв клиента', caption: 'Спустя несколько сессий стало спокойнее' },
    { id: 2, label: 'История клиента',     caption: 'Увидела свой повторяющийся сценарий' },
    { id: 3, label: 'Опыт после разбора',  caption: 'Стало понятно, с чего начать' },
    { id: 4, label: 'Видеоотзыв клиента', caption: 'Тревога стала тише, появилась опора' },
    { id: 5, label: 'Короткий отзыв',      caption: 'Хочу поделиться своим опытом' },
    { id: 6, label: 'История клиента',     caption: 'Изменилось отношение к себе' },
    { id: 7, label: 'Подробный рассказ',   caption: 'Поделюсь, как прошла работа' }
  ];

  // ---------- Helpers ----------
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    if (html != null) e.innerHTML = html;
    return e;
  }
  function track(event, params) {
    try { if (typeof window.altynTrack === 'function') window.altynTrack(event, params || {}); } catch (e) {}
  }
  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ============================================================
  // 1. Hide legacy fake-quote testimonial cards (React-rendered)
  // ============================================================
  function hideFakeReviews() {
    // Find the legacy reviews section (heading "Истории трансформации")
    var sections = document.querySelectorAll('section');
    var reviewsSec = null;
    for (var i = 0; i < sections.length; i++) {
      var h = sections[i].querySelector('h1, h2, h3');
      if (h && /истории трансформации|^отзыв/i.test(h.innerText || '')) {
        reviewsSec = sections[i];
        break;
      }
    }
    if (!reviewsSec) return false;

    // Hide every fake quote card (.glass-card with italic quote text)
    var fakeCards = reviewsSec.querySelectorAll('.glass-card');
    var hiddenCount = 0;
    fakeCards.forEach(function (c) {
      if ((c.innerText || '').indexOf('«') !== -1) {
        c.style.setProperty('display', 'none', 'important');
        hiddenCount++;
      }
    });

    // Once we've successfully replaced the section, hide it entirely.
    // We mark the section so CSS finishes the job (covers reflows).
    if (hiddenCount > 0 || !reviewsSec.dataset.altynFakeHidden) {
      reviewsSec.dataset.altynFakeHidden = '1';
      // Hide the whole section. The video section we inject lives right
      // after it and carries its own beautiful header.
      reviewsSec.style.setProperty('display', 'none', 'important');
    }
    return reviewsSec;
  }

  // ============================================================
  // 2. Build video testimonials section
  // ============================================================
  function buildSection() {
    var sec = el('section', { class: 'altyn-vt', 'data-altyn-vt': '1', 'aria-labelledby': 'altyn-vt-title' });

    // Header
    var head = el('div', { class: 'altyn-vt__head' });
    head.appendChild(el('span', { class: 'altyn-vt__eyebrow' }, 'Истории трансформации'));
    head.appendChild(el('h2', { class: 'altyn-vt__title', id: 'altyn-vt-title' },
      'Голоса клиентов. <em>Без сценариев.</em>'));
    head.appendChild(el('p', { class: 'altyn-vt__sub' },
      'Короткие видео‑истории людей, которые прошли разбор и продолжили работу. Свайпните карусель — каждое видео начнёт играть тихо, нажмите, чтобы услышать.'));
    sec.appendChild(head);

    // Track wrap
    var trackWrap = el('div', { class: 'altyn-vt__track-wrap' });
    var trackEl = el('div', { class: 'altyn-vt__track', role: 'list' });

    TESTIMONIALS.forEach(function (t, idx) {
      var card = el('button', {
        class: 'altyn-vt__card',
        type: 'button',
        role: 'listitem',
        'aria-label': t.label + '. ' + t.caption + '. Открыть видео',
        'data-vt-id': String(t.id),
        'data-vt-index': String(idx)
      });

      // poster (always visible until inline preview begins)
      var poster = el('img', {
        class: 'altyn-vt__poster',
        src: '/testimonials/posters/testimonial-' + t.id + '.jpg',
        alt: t.label,
        loading: idx < 2 ? 'eager' : 'lazy',
        decoding: 'async',
        width: '540', height: '960'
      });
      card.appendChild(poster);

      // inline-preview <video> (lazy, hidden until activated)
      var media = el('video', {
        class: 'altyn-vt__media',
        playsinline: 'true',
        muted: 'true',
        loop: 'true',
        preload: 'none',
        'aria-hidden': 'true',
        tabindex: '-1'
      });
      media.muted = true;
      // src set lazily when card becomes active
      media.dataset.src = '/testimonials/testimonial-' + t.id + '.mp4';
      card.appendChild(media);

      card.appendChild(el('span', { class: 'altyn-vt__overlay' }));
      card.appendChild(el('span', { class: 'altyn-vt__play', 'aria-hidden': 'true' }));

      // Mute toggle (only relevant when inline preview is on)
      var mute = el('button', {
        class: 'altyn-vt__mute',
        type: 'button',
        'aria-label': 'Включить звук',
        'data-altyn-skip-track': '1'
      });
      mute.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
      mute.addEventListener('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
        var vid = card.querySelector('.altyn-vt__media');
        if (!vid) return;
        if (vid.muted) {
          vid.muted = false;
          mute.setAttribute('aria-label', 'Выключить звук');
          mute.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/></svg>';
          track('ViewContent', {
            content_name: 'inline_video_unmuted_' + t.id,
            content_category: 'video_testimonial',
            content_type: 'video'
          });
        } else {
          vid.muted = true;
          mute.setAttribute('aria-label', 'Включить звук');
          mute.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
        }
      });
      card.appendChild(mute);

      // meta
      var meta = el('span', { class: 'altyn-vt__meta' });
      meta.appendChild(el('span', { class: 'altyn-vt__label' }, t.label));
      meta.appendChild(el('p', { class: 'altyn-vt__caption' }, '«' + t.caption + '»'));
      card.appendChild(meta);

      card.addEventListener('click', function () { openModal(t); });
      trackEl.appendChild(card);
    });

    trackWrap.appendChild(trackEl);
    sec.appendChild(trackWrap);

    // Dots indicator
    var dotsEl = el('ul', { class: 'altyn-vt__dots', role: 'tablist', 'aria-label': 'Навигация по видеоотзывам' });
    TESTIMONIALS.forEach(function (t, idx) {
      var dot = el('button', {
        class: 'altyn-vt__dot',
        type: 'button',
        role: 'tab',
        'aria-label': 'Перейти к видео ' + (idx + 1),
        'data-altyn-skip-track': '1',
        'data-dot-index': String(idx)
      });
      dot.addEventListener('click', function () {
        var card = trackEl.querySelector('.altyn-vt__card[data-vt-index="' + idx + '"]');
        if (card) card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });
      dotsEl.appendChild(dot);
    });
    sec.appendChild(dotsEl);

    // CTA
    var ctaWrap = el('div', { class: 'altyn-vt__cta-wrap' });
    var cta = el('a', {
      class: 'altyn-vt__cta',
      href: TG,
      target: '_blank',
      rel: 'noopener',
      'data-altyn-cta': 'vt-section'
    }, 'Записаться на бесплатный разбор');
    ctaWrap.appendChild(cta);
    ctaWrap.appendChild(el('span', { class: 'altyn-vt__cta-note' }, '1 час · онлайн · без оплаты'));
    sec.appendChild(ctaWrap);

    return sec;
  }

  // ============================================================
  // 3. Carousel orchestration: active card detection, inline play,
  //    dots sync, reveal animation
  // ============================================================
  function wireCarousel(sec) {
    var trackEl = sec.querySelector('.altyn-vt__track');
    var cards = sec.querySelectorAll('.altyn-vt__card');
    var dots = sec.querySelectorAll('.altyn-vt__dot');
    if (!trackEl || !cards.length) return;

    var sectionInView = false;
    var currentActive = -1;
    var reduceMotion = prefersReducedMotion();

    function setActive(idx) {
      if (idx === currentActive) return;
      cards.forEach(function (c, i) {
        if (i === idx) c.dataset.active = '1'; else delete c.dataset.active;
      });
      dots.forEach(function (d, i) {
        if (i === idx) d.dataset.active = '1'; else delete d.dataset.active;
      });

      // Stop previous video
      if (currentActive >= 0 && cards[currentActive]) {
        var prevV = cards[currentActive].querySelector('.altyn-vt__media');
        if (prevV) {
          try { prevV.pause(); } catch (e) {}
          delete cards[currentActive].dataset.playing;
        }
      }

      currentActive = idx;

      // Start inline preview on the new active card if section is in view
      if (sectionInView && !reduceMotion && idx >= 0) {
        playInline(cards[idx]);
      }
    }

    function playInline(card) {
      if (!card) return;
      var vid = card.querySelector('.altyn-vt__media');
      if (!vid) return;
      if (!vid.src && vid.dataset.src) {
        vid.src = vid.dataset.src;
      }
      vid.muted = true;
      vid.playsInline = true;
      var p = vid.play();
      if (p && p.then) {
        p.then(function () {
          card.dataset.playing = '1';
        }).catch(function () { /* autoplay denied — no-op */ });
      } else {
        card.dataset.playing = '1';
      }
    }

    function stopAllInline() {
      cards.forEach(function (c) {
        var v = c.querySelector('.altyn-vt__media');
        if (v) { try { v.pause(); } catch (e) {} }
        delete c.dataset.playing;
      });
    }

    // Detect which card is centered in the track (for dots + active glow)
    var rafId = 0;
    function findCenteredCard() {
      if (rafId) return;
      rafId = requestAnimationFrame(function () {
        rafId = 0;
        var trackRect = trackEl.getBoundingClientRect();
        var centerX = trackRect.left + trackRect.width / 2;
        var bestIdx = 0;
        var bestDist = Infinity;
        for (var i = 0; i < cards.length; i++) {
          var r = cards[i].getBoundingClientRect();
          var d = Math.abs(r.left + r.width / 2 - centerX);
          if (d < bestDist) { bestDist = d; bestIdx = i; }
        }
        setActive(bestIdx);
      });
    }
    trackEl.addEventListener('scroll', findCenteredCard, { passive: true });
    window.addEventListener('resize', findCenteredCard);

    // IntersectionObserver — section enters/leaves viewport
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.target === sec) {
            if (entry.isIntersecting) {
              sec.dataset.revealed = '1';
              if (entry.intersectionRatio > 0.35) {
                sectionInView = true;
                if (currentActive >= 0 && !reduceMotion) playInline(cards[currentActive]);
              }
            } else {
              sectionInView = false;
              stopAllInline();
            }
          }
        });
      }, { threshold: [0, 0.35, 0.7] });
      io.observe(sec);
    } else {
      sec.dataset.revealed = '1';
    }

    // Initial active state
    setTimeout(findCenteredCard, 100);
  }

  // ============================================================
  // 4. Modal lightbox
  // ============================================================
  var modal, modalVideo, currentTId = null;
  function buildModal() {
    modal = el('div', { class: 'altyn-vt-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Видеоотзыв' });
    var inner = el('div', { class: 'altyn-vt-modal__inner' });

    modalVideo = el('video', {
      class: 'altyn-vt-modal__video',
      controls: 'true',
      playsinline: 'true',
      preload: 'metadata'
    });
    inner.appendChild(modalVideo);

    var close = el('button', { class: 'altyn-vt-modal__close', type: 'button', 'aria-label': 'Закрыть', 'data-altyn-skip-track': '1' }, '×');
    close.addEventListener('click', closeModal);
    inner.appendChild(close);

    var ctaRow = el('div', { class: 'altyn-vt-modal__cta' });
    ctaRow.appendChild(el('a', { class: 'primary', href: TG, target: '_blank', rel: 'noopener', 'data-altyn-cta': 'vt-modal-tg' }, 'Записаться'));
    ctaRow.appendChild(el('a', { class: 'secondary', href: WA, target: '_blank', rel: 'noopener', 'data-altyn-cta': 'vt-modal-wa' }, 'WhatsApp'));
    inner.appendChild(ctaRow);

    modal.appendChild(inner);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('altyn-vt-modal--open')) closeModal();
    });
    document.body.appendChild(modal);
  }
  function openModal(t) {
    if (!modal) buildModal();
    currentTId = t.id;
    modalVideo.src = '/testimonials/testimonial-' + t.id + '.mp4';
    modalVideo.poster = '/testimonials/posters/testimonial-' + t.id + '.jpg';
    modal.classList.add('altyn-vt-modal--open');
    document.body.classList.add('altyn-vt-locked');

    modalVideo.muted = false;
    var pp = modalVideo.play();
    if (pp && pp.catch) {
      pp.catch(function () {
        modalVideo.muted = true;
        modalVideo.play().catch(function () {});
      });
    }
    track('ViewContent', {
      content_name: 'video_testimonial_' + t.id,
      content_category: 'video_testimonial',
      content_type: 'video'
    });
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('altyn-vt-modal--open');
    document.body.classList.remove('altyn-vt-locked');
    try { modalVideo.pause(); } catch (e) {}
    setTimeout(function () { modalVideo.removeAttribute('src'); modalVideo.load && modalVideo.load(); }, 320);
    currentTId = null;
  }

  // ============================================================
  // 5. Inject into the page
  // ============================================================
  function findReviewsSection() {
    var sections = document.querySelectorAll('main section, body section');
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      if (s.dataset.altynVt) continue;
      var h = s.querySelector('h1, h2, h3');
      if (h && /истории трансформации|^отзыв/i.test(h.innerText || '')) return s;
    }
    return null;
  }
  var injected = false;
  function tryInject() {
    if (injected) return true;
    var anchor = findReviewsSection();
    if (!anchor) return false;
    var section = buildSection();
    if (anchor.nextSibling) anchor.parentNode.insertBefore(section, anchor.nextSibling);
    else anchor.parentNode.appendChild(section);
    document.body.classList.add('altyn-vt-mounted');
    wireCarousel(section);
    injected = true;
    return true;
  }

  // ============================================================
  // 6. Sticky mobile CTA bar
  // ============================================================
  function findReactBottomBar() {
    var fixedEls = document.querySelectorAll('div.fixed.bottom-0, [class*="fixed"][class*="bottom-0"]');
    for (var i = 0; i < fixedEls.length; i++) {
      var elx = fixedEls[i];
      if (elx.classList.contains('altyn-sticky-cta')) continue;
      var cls = (elx.className || '').toString();
      if (/bg-\[#6B2D3E\]|bg-\[#5A2434\]/.test(cls)) return elx;
      var rect = elx.getBoundingClientRect();
      if (rect.height > 0 && rect.height < 130 && elx.querySelector('a[href*="t.me"], a[href*="wa.me"]')) {
        return elx;
      }
    }
    return null;
  }
  function hideReactBar() {
    var bar = findReactBottomBar();
    if (bar && !bar.dataset.altynHidden) {
      bar.dataset.altynHidden = '1';
      bar.style.setProperty('display', 'none', 'important');
    }
  }
  function buildSticky() {
    var bar = el('div', { class: 'altyn-sticky-cta', role: 'navigation', 'aria-label': 'Быстрая запись' });
    bar.innerHTML =
      '<a href="' + TG + '" target="_blank" rel="noopener" class="primary" data-altyn-cta="sticky-tg">' +
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>' +
        '<span>Записаться</span>' +
      '</a>' +
      '<a href="' + WA + '" target="_blank" rel="noopener" class="wa" data-altyn-cta="sticky-wa" aria-label="WhatsApp">' +
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.74-.86-2.01-.96-.27-.1-.46-.15-.66.15-.2.3-.76.96-.93 1.16-.17.2-.34.22-.64.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.66-1.59-.9-2.18-.24-.57-.48-.49-.66-.5l-.56-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.21 5.08 4.5.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.74-.71 1.99-1.39.25-.69.25-1.27.17-1.39-.07-.13-.27-.2-.57-.35zM12 2C6.48 2 2 6.48 2 12c0 1.74.45 3.41 1.3 4.9L2 22l5.25-1.37A9.93 9.93 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/></svg>' +
        '<span>WhatsApp</span>' +
      '</a>';
    document.body.appendChild(bar);
    function onScroll() {
      var y = window.scrollY || window.pageYOffset || 0;
      if (y > 320) {
        bar.classList.add('altyn-sticky-cta--visible');
        document.body.classList.add('altyn-sticky-pad');
      } else if (y < 200) {
        bar.classList.remove('altyn-sticky-cta--visible');
        document.body.classList.remove('altyn-sticky-pad');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ============================================================
  // 7. Bootstrap
  // ============================================================
  function init() {
    var sectionInjected = tryInject();
    var fakeHidden = !!hideFakeReviews();
    var barHidden = false;
    var attempts = 0;

    function tick() {
      attempts++;
      if (!sectionInjected) sectionInjected = tryInject();
      if (!fakeHidden) fakeHidden = !!hideFakeReviews();
      if (!barHidden) {
        var b = findReactBottomBar();
        if (b) { hideReactBar(); barHidden = true; }
      }
      if ((sectionInjected && fakeHidden && barHidden) || attempts > 80) {
        clearInterval(iv);
        if (mo) mo.disconnect();
      }
    }
    var iv = setInterval(tick, 250);
    var mo = new MutationObserver(tick);
    mo.observe(document.body, { childList: true, subtree: true });

    buildSticky();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
