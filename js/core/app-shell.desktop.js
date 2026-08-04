// app-shell.desktop.js — Desktop App Shell B: nav2 + slim topbar (≥1280).
// Icon-rail (#app-sidebar) остаётся отдельно (≥768, style.css).
// Mobile / tablet 768–1279: rail + bottom-nav, без nav2.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  /** Порог Shell B (nav2 / desk topbar). Согласован с Analytics DESKTOP_MIN. */
  var NAV2_MIN = 1280;

  var MODE_LABELS = {
    quality: 'Качество',
    construction: 'Стройконтроль',
    'construction-v2': 'СК в2'
  };

  function fillNav2(html, modeId) {
    var nav2 = document.getElementById('app-nav2');
    if (!nav2) return;

    if (html) {
      var label = MODE_LABELS[modeId] || modeId || '';
      var nav2Html = String(html)
        .replace(/\bclass="nav-item"/g, 'class="app-nav2-item"')
        .replace(/<span class="nav-text">БЗ<\/span>/g, '<span class="app-nav2-text">База знаний</span>')
        .replace(/<span class="nav-text">/g, '<span class="app-nav2-text">');
      nav2.innerHTML = '<div class="app-nav2-label">' + label + '</div>' + nav2Html;
      nav2.hidden = false;
    } else {
      nav2.innerHTML = '';
      nav2.hidden = true;
    }

    setModeChip(modeId);
  }

  function setModeChip(modeId) {
    var modeChip = document.getElementById('desk-mode-chip');
    if (!modeChip) return;
    modeChip.textContent = 'Модуль · ' + (MODE_LABELS[modeId] || modeId || '—');
  }

  function updateChrome() {
    var nav2El = document.getElementById('app-nav2');
    var wideEnough = window.innerWidth >= NAV2_MIN;
    var hasNav2 = !!nav2El && wideEnough && !nav2El.hidden &&
      getComputedStyle(nav2El).display !== 'none';
    document.body.classList.toggle('has-app-nav2', hasNav2);

    var deskTopbar = document.getElementById('app-desk-topbar');
    var hasDeskTopbar = hasNav2 && !!deskTopbar;
    if (deskTopbar) deskTopbar.hidden = !hasDeskTopbar;
    document.body.classList.toggle('has-desk-topbar', hasDeskTopbar);

    return { hasNav2: hasNav2, hasDeskTopbar: hasDeskTopbar };
  }

  function renderDeskUser(userContext) {
    if (!userContext) return;
    var deskName = document.getElementById('desk-user-name');
    var deskAvatar = document.getElementById('desk-user-avatar');
    if (deskName) deskName.textContent = userContext.name || '';
    if (deskAvatar) {
      var parts = String(userContext.name || '').trim().split(/\s+/);
      var initials = parts.length >= 2
        ? (parts[0].charAt(0) + parts[1].charAt(0))
        : String(userContext.name || '?').slice(0, 2);
      deskAvatar.textContent = initials.toUpperCase();
    }
  }

  window.RBI = window.RBI || {};
  window.RBI.shellDesktop = {
    NAV2_MIN: NAV2_MIN,
    MODE_LABELS: MODE_LABELS,
    fillNav2: fillNav2,
    setModeChip: setModeChip,
    updateChrome: updateChrome,
    renderDeskUser: renderDeskUser
  };
})();
