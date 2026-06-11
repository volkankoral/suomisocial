/**
 * Occaly Reviews Widget v1.0
 * https://occaly.com
 *
 * Usage:
 *   <div id="occaly-reviews"></div>
 *   <script src="https://occaly.com/widget/reviews.js"
 *           data-org-id="YOUR_ORG_ID">
 *   </script>
 *
 * Optional attributes:
 *   data-target    CSS selector for the mount element (default: #occaly-reviews)
 *   data-theme     "dark" | "light"  (overrides server setting)
 *   data-lang      "tr" | "en" | "fi"  (UI strings, default: browser language)
 */
;(function () {
  'use strict';

  /* ── 1. Locate own <script> tag ──────────────────────────────────────────── */
  var script = document.currentScript || (function () {
    var tags = document.getElementsByTagName('script');
    return tags[tags.length - 1];
  })();

  var orgId          = script.getAttribute('data-org-id');
  var targetSelector = script.getAttribute('data-target') || '#occaly-reviews';
  var themeOverride  = script.getAttribute('data-theme');
  var langAttr       = script.getAttribute('data-lang');

  if (!orgId) return;

  /* ── 2. i18n strings ─────────────────────────────────────────────────────── */
  var browserLang = (navigator.language || 'en').slice(0, 2).toLowerCase();
  var lang = langAttr || (browserLang === 'tr' ? 'tr' : browserLang === 'fi' ? 'fi' : 'en');
  var i18n = {
    tr: { poweredBy: 'ile desteklenmektedir', noReviews: 'Henüz yorum yok' },
    fi: { poweredBy: 'palvelulla', noReviews: 'Ei vielä arvosteluja' },
    en: { poweredBy: 'powered by', noReviews: 'No reviews yet' },
  };
  var t = i18n[lang] || i18n.en;

  /* ── 3. Fetch reviews ────────────────────────────────────────────────────── */
  var API = 'https://occaly.com/api/widget/reviews/' + orgId;

  fetch(API)
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || data.disabled || !data.reviews || data.reviews.length === 0) return;
      mount(data);
    })
    .catch(function () { /* silent fail */ });

  /* ── 4. Mount widget ─────────────────────────────────────────────────────── */
  function mount(data) {
    var reviews      = data.reviews;
    var businessName = data.businessName || '';
    var isDark       = (themeOverride || data.theme || 'dark') === 'dark';
    var prefix       = 'ocw'; /* short namespace for all CSS classes */

    injectStyles(prefix, isDark);

    /* find / create target element */
    var target = document.querySelector(targetSelector);
    if (!target) {
      target = document.createElement('div');
      if (script.parentNode) script.parentNode.insertBefore(target, script.nextSibling);
    }

    target.innerHTML = buildHTML(prefix, reviews, businessName, isDark);
    initCarousel(prefix, target);
  }

  /* ── 5. Helpers ──────────────────────────────────────────────────────────── */
  function stars(rating) {
    if (!rating) return '';
    var s = '';
    for (var i = 1; i <= 5; i++) s += i <= rating ? '★' : '☆';
    return s;
  }

  function platformBadge(platform) {
    if (platform === 'google_business') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>';
    if (platform === 'facebook')        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="#1877F2" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>';
    if (platform === 'instagram')       return '<svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="ig" cx="30%" cy="107%" r="150%"><stop offset="0%" stop-color="#fdf497"/><stop offset="5%" stop-color="#fdf497"/><stop offset="45%" stop-color="#fd5949"/><stop offset="60%" stop-color="#d6249f"/><stop offset="90%" stop-color="#285AEB"/></radialGradient></defs><path fill="url(#ig)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>';
    return '';
  }

  function formatDate(str) {
    if (!str) return '';
    try { return new Date(str).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }); }
    catch (e) { return ''; }
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function truncate(str, n) {
    if (!str) return '';
    return str.length > n ? str.slice(0, n) + '…' : str;
  }

  /* ── 6. HTML builder ─────────────────────────────────────────────────────── */
  function buildHTML(p, reviews, businessName, isDark) {
    var themeClass = isDark ? p + '--dark' : p + '--light';

    var cards = reviews.map(function (r) {
      var initial = esc((r.authorName || '?').charAt(0).toUpperCase());
      var avatar  = r.authorAvatar
        ? '<img src="' + esc(r.authorAvatar) + '" alt="' + esc(r.authorName || '') + '" class="' + p + '__avatar-img">'
        : '<span class="' + p + '__avatar-init">' + initial + '</span>';

      var badge = platformBadge(r.platform);
      var pUrl  = r.platformUrl
        ? '<a href="' + esc(r.platformUrl) + '" target="_blank" rel="noopener noreferrer" class="' + p + '__platform" title="View on Google">' + badge + '</a>'
        : (badge ? '<span class="' + p + '__platform">' + badge + '</span>' : '');

      return '<div class="' + p + '__card" role="article">'
        + '<div class="' + p + '__card-top">'
        + '<div class="' + p + '__avatar">' + avatar + '</div>'
        + '<div class="' + p + '__meta">'
        + '<div class="' + p + '__name">' + esc(r.authorName || 'Anonymous') + '</div>'
        + '<div class="' + p + '__stars" aria-label="' + (r.rating || 0) + ' out of 5 stars">' + stars(r.rating) + '</div>'
        + '</div>'
        + pUrl
        + '</div>'
        + '<p class="' + p + '__text">' + esc(truncate(r.comment || '', 220)) + '</p>'
        + '<div class="' + p + '__date">' + formatDate(r.createdAt) + '</div>'
        + '</div>';
    }).join('');

    var header = businessName
      ? '<div class="' + p + '__header">'
        + '<span class="' + p + '__biz">' + esc(businessName) + '</span>'
        + '<a href="https://occaly.com" target="_blank" rel="noopener" class="' + p + '__powered">'
        + t.poweredBy + ' <strong>Occaly</strong></a>'
        + '</div>'
      : '';

    return '<div class="' + p + ' ' + themeClass + '" role="region" aria-label="Customer reviews">'
      + header
      + '<div class="' + p + '__viewport">'
      + '<button class="' + p + '__btn ' + p + '__btn--prev" aria-label="Previous reviews">&#8249;</button>'
      + '<div class="' + p + '__outer">'
      + '<div class="' + p + '__track">' + cards + '</div>'
      + '</div>'
      + '<button class="' + p + '__btn ' + p + '__btn--next" aria-label="Next reviews">&#8250;</button>'
      + '</div>'
      + '</div>';
  }

  /* ── 7. Carousel logic ───────────────────────────────────────────────────── */
  function initCarousel(p, container) {
    var outer   = container.querySelector('.' + p + '__outer');
    var track   = container.querySelector('.' + p + '__track');
    var btnPrev = container.querySelector('.' + p + '__btn--prev');
    var btnNext = container.querySelector('.' + p + '__btn--next');
    if (!track || !outer) return;

    var cards     = Array.prototype.slice.call(track.children);
    var total     = cards.length;
    var idx       = 0;
    var autoTimer = null;

    function getVisible() {
      var w = outer.offsetWidth;
      if (w >= 760) return Math.min(3, total);
      if (w >= 480) return Math.min(2, total);
      return 1;
    }

    function sizeCards() {
      var vis = getVisible();
      var w   = Math.floor(outer.offsetWidth / vis);
      cards.forEach(function (c) { c.style.width = w + 'px'; c.style.flexShrink = '0'; });
    }

    function maxIdx() { return Math.max(0, total - getVisible()); }

    function go(n) {
      idx = Math.max(0, Math.min(n, maxIdx()));
      var cardW = cards[0] ? cards[0].offsetWidth : 0;
      track.style.transform = 'translateX(-' + (idx * cardW) + 'px)';
      if (btnPrev) btnPrev.style.opacity = idx <= 0         ? '0.35' : '1';
      if (btnNext) btnNext.style.opacity = idx >= maxIdx()  ? '0.35' : '1';
    }

    function startAuto() {
      clearInterval(autoTimer);
      if (total <= getVisible()) return;
      autoTimer = setInterval(function () {
        go(idx >= maxIdx() ? 0 : idx + 1);
      }, 4500);
    }

    /* Button clicks */
    if (btnNext) btnNext.addEventListener('click', function () { go(idx + 1); });
    if (btnPrev) btnPrev.addEventListener('click', function () { go(idx - 1); });

    /* Pause on hover */
    container.addEventListener('mouseenter', function () { clearInterval(autoTimer); });
    container.addEventListener('mouseleave', startAuto);

    /* Touch / swipe */
    var touchX = 0;
    track.addEventListener('touchstart', function (e) {
      touchX = e.touches[0].clientX;
    }, { passive: true });
    track.addEventListener('touchend', function (e) {
      var dx = touchX - e.changedTouches[0].clientX;
      if (Math.abs(dx) > 40) go(dx > 0 ? idx + 1 : idx - 1);
    }, { passive: true });

    /* Resize */
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        sizeCards();
        go(0);
        startAuto();
      }, 120);
    });

    sizeCards();
    go(0);
    startAuto();
  }

  /* ── 8. CSS injection ────────────────────────────────────────────────────── */
  function injectStyles(p, isDark) {
    if (document.getElementById('occaly-widget-styles')) return;
    var style = document.createElement('style');
    style.id  = 'occaly-widget-styles';

    /* colour tokens */
    var D = {
      bg:      '#0f0f0f',
      card:    '#1a1a1a',
      border:  '#2a2a2a',
      text:    '#e4e4e7',
      sub:     '#a1a1aa',
      stars:   '#f59e0b',
      link:    '#f97316',
      btn:     '#2a2a2a',
      btnHov:  '#3a3a3a',
      btnText: '#e4e4e7',
    };
    var L = {
      bg:      '#f4f4f5',
      card:    '#ffffff',
      border:  '#e4e4e7',
      text:    '#18181b',
      sub:     '#71717a',
      stars:   '#d97706',
      link:    '#ea580c',
      btn:     '#e4e4e7',
      btnHov:  '#d4d4d8',
      btnText: '#18181b',
    };

    function tok(t, key) { return t[key]; }

    style.textContent = [
      /* wrapper */
      '.' + p + '{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-sizing:border-box;width:100%;padding:20px 0;}',
      '.' + p + ' *{box-sizing:border-box;}',

      /* themes */
      '.' + p + '--dark{background:' + D.bg + ';}',
      '.' + p + '--light{background:' + L.bg + ';}',

      /* header */
      '.' + p + '__header{display:flex;align-items:center;justify-content:space-between;padding:0 12px 16px;}',
      '.' + p + '__biz{font-size:15px;font-weight:700;}',
      '.' + p + '--dark .' + p + '__biz{color:' + D.text + ';}',
      '.' + p + '--light .' + p + '__biz{color:' + L.text + ';}',
      '.' + p + '__powered{font-size:11px;text-decoration:none;opacity:.6;}',
      '.' + p + '__powered:hover{opacity:1;}',
      '.' + p + '--dark .' + p + '__powered{color:' + D.sub + ';}',
      '.' + p + '--light .' + p + '__powered{color:' + L.sub + ';}',

      /* viewport */
      '.' + p + '__viewport{display:flex;align-items:center;gap:6px;overflow:hidden;}',

      /* outer + track */
      '.' + p + '__outer{flex:1;overflow:hidden;}',
      '.' + p + '__track{display:flex;transition:transform .35s ease;}',

      /* card */
      '.' + p + '__card{padding:18px;border-radius:14px;border:1px solid;display:flex;flex-direction:column;gap:10px;min-height:160px;}',
      '.' + p + '--dark .' + p + '__card{background:' + D.card + ';border-color:' + D.border + ';}',
      '.' + p + '--light .' + p + '__card{background:' + L.card + ';border-color:' + L.border + ';box-shadow:0 1px 4px rgba(0,0,0,.08);}',

      /* card top row */
      '.' + p + '__card-top{display:flex;align-items:center;gap:10px;}',

      /* avatar */
      '.' + p + '__avatar{width:38px;height:38px;border-radius:50%;overflow:hidden;flex-shrink:0;}',
      '.' + p + '__avatar-img{width:38px;height:38px;object-fit:cover;border-radius:50%;}',
      '.' + p + '__avatar-init{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;background:linear-gradient(135deg,#f97316,#ec4899);color:#fff;}',

      /* meta */
      '.' + p + '__meta{flex:1;min-width:0;}',
      '.' + p + '__name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.' + p + '--dark .' + p + '__name{color:' + D.text + ';}',
      '.' + p + '--light .' + p + '__name{color:' + L.text + ';}',
      '.' + p + '__stars{font-size:13px;letter-spacing:.5px;color:' + D.stars + ';}',
      '.' + p + '--light .' + p + '__stars{color:' + L.stars + ';}',

      /* platform icon */
      '.' + p + '__platform{flex-shrink:0;display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;text-decoration:none;}',
      '.' + p + '--dark .' + p + '__platform{background:' + D.border + ';}',
      '.' + p + '--light .' + p + '__platform{background:' + L.border + ';}',

      /* review text */
      '.' + p + '__text{font-size:13px;line-height:1.6;flex:1;margin:0;}',
      '.' + p + '--dark .' + p + '__text{color:' + D.sub + ';}',
      '.' + p + '--light .' + p + '__text{color:' + L.sub + ';}',

      /* date */
      '.' + p + '__date{font-size:11px;opacity:.5;}',
      '.' + p + '--dark .' + p + '__date{color:' + D.sub + ';}',
      '.' + p + '--light .' + p + '__date{color:' + L.sub + ';}',

      /* nav buttons */
      '.' + p + '__btn{flex-shrink:0;width:34px;height:34px;border-radius:50%;border:none;cursor:pointer;font-size:22px;line-height:1;display:flex;align-items:center;justify-content:center;transition:background .2s,opacity .2s;}',
      '.' + p + '--dark .' + p + '__btn{background:' + D.btn + ';color:' + D.btnText + ';}',
      '.' + p + '--dark .' + p + '__btn:hover{background:' + D.btnHov + ';}',
      '.' + p + '--light .' + p + '__btn{background:' + L.btn + ';color:' + L.btnText + ';}',
      '.' + p + '--light .' + p + '__btn:hover{background:' + L.btnHov + ';}',
    ].join('\n');

    document.head.appendChild(style);
  }

})();
