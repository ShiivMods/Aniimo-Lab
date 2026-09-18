/* Shared UI, localisation, source-aware Aniimo identities, collection storage and portable collection codes. */
(function() {
  'use strict';
  const D = window.AML_DATA, I = window.AML_I18N;
  const safeGet = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback: value
    } catch {
      return fallback
    }
  };
  const safeSet = (key, value) => {
    try {
      localStorage.setItem(key, value)
    } catch {
    }
  };
  let lang = new URLSearchParams(location.search).get('lang') || safeGet('aml_lang', 'fr');
  if (!['fr', 'en'].includes(lang)) lang = 'fr';
  safeSet('aml_lang', lang);
  let owned;
  try {
    owned = new Set(JSON.parse(safeGet('aml_collection', '[]')))
  } catch {
    owned = new Set()
  };
  owned = new Set([...owned].filter(key => D.aniimos.some(a => a.key === key)));
  const page = document.body.dataset.page || 'weakness';
  const t = (key, ...args) => {
    const value = I[lang][key];
    return typeof value === 'function' ? value(...args): (value ?? key)
  };
  const sourceOf = a => a?.sources?.[lang] || null;
  const nameOf = a => sourceOf(a)?.name || '';
  const idOf = a => sourceOf(a)?.id || '';
  const visibleAniimos = D.aniimos.filter(a => sourceOf(a)).sort((a, b) => Number(idOf(a)) - Number(idOf(b)) || nameOf(a).localeCompare(nameOf(b), lang));
  const elementName = key => D.elements[key][lang];
  const spatialName = key => D.spatials[key][lang];

  function esc(value) {
    return String(value).replace(/[&<>'"]/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }
    [c]))
  }

  function iconSvg(key, size = 'md') {
    return `<span class="eicon ${size}" title="${esc(elementName(key))}"><img src="assets/icons/elements/${key}.png" alt="" aria-hidden="true"></span>`
  }
  const iconGroup = (elements, size = 'md') => `<div class="row-icons">${elements.map(e=>iconSvg(e,size)).join('')}</div>`;
  const pills = elements => elements.map(e => `<span class="element-pill">${iconSvg(e,'sm')}${esc(elementName(e))}</span>`).join('');

  function renderSidebar() {
    const root = document.getElementById('sidebar');
    if (!root) return;
    const q = `?lang=${lang}`;
    const items = [['weakness', 'index.html', t('navWeak'), '⌖'], ['analyse', 'analyse.html', t('navAnalyse'), '◈'], ['team', 'team.html', t('navTeam'), '♟'], ['collection', 'collection.html', t('navCollection'), '▦']];
    root.className = 'sidebar';
    root.innerHTML = `<div class="brand"><div class="brandmark">✦</div><div><strong>Aniimo Matchup Lab</strong><small>${t('brandSub')}</small></div></div><div class="navtitle">${t('tools')}</div><nav class="nav">${items.map(([key,href,label,icon])=>`<a class="${page===key?'active':''}" href="${href}${q}"><span>${icon}</span>${label}</a>`).join('')}</nav><div class="sidebottom"><div class="lang"><button id="lang-fr" class="${lang==='fr'?'active':''}">FR</button><button id="lang-en" class="${lang==='en'?'active':''}">EN</button></div><div class="prototype">${t('prototype')}</div></div>`;
    document.getElementById('lang-fr').onclick = () => switchLang('fr');
    document.getElementById('lang-en').onclick = () => switchLang('en')
  }

  function switchLang(next) {
    safeSet('aml_lang', next);
    const url = new URL(location.href);
    url.searchParams.set('lang', next);
    location.href = url.href
  }

  function applyStaticText() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => el.placeholder = t(el.dataset.i18nPlaceholder));
    document.querySelectorAll('[data-aniimo-count]').forEach(el => el.textContent = `${visibleAniimos.length} Aniimo`);
    const titleKey = {
      weakness: 'pageWeakTitle', analyse: 'pageAnalyseTitle', team: 'pageTeamTitle', collection: 'pageCollectionTitle'
    }
    [page];
    if (titleKey) document.title = t(titleKey)
  }

  function suggestions(query, limit = 8) {
    const q = query.trim().toLocaleLowerCase(lang);
    const base = q ? visibleAniimos.filter(a => nameOf(a).toLocaleLowerCase(lang).includes(q) || idOf(a).toLocaleLowerCase(lang).includes(q)): visibleAniimos;
    return base.sort((a, b) => {
      if (!q) return Number(idOf(a)) - Number(idOf(b));
      const an = nameOf(a).toLocaleLowerCase(lang), bn = nameOf(b).toLocaleLowerCase(lang), ae = an.startsWith(q) ? 0: 1, be = bn.startsWith(q) ? 0: 1;
      return ae - be || an.localeCompare(bn, lang)
    }).slice(0, limit)
  }

  function autocomplete(input, onSelect, opts = {
  }) {
    const menu = document.createElement('div');
    menu.className = 'autocomplete-menu';
    menu.setAttribute('role', 'listbox');
    input.parentElement.appendChild(menu);
    let active = - 1, current = [];
    const close = () => {
      menu.classList.remove('show');
      menu.innerHTML = '';
      active = - 1
    };
    const paint = () => {
      const q = input.value;
      current = suggestions(q, opts.limit || 8);
      if (!q.trim() && opts.openEmpty === false) {
        close();
        return
      }
      menu.innerHTML = current.length ? current.map((a, i) => `<button type="button" class="autocomplete-item ${i===active?'active':''}" data-i="${i}" role="option"><span class="autocomplete-main">${iconGroup(a.elements,'sm')}<span><strong>${esc(nameOf(a))}</strong><small>#${esc(idOf(a))} · ${esc(a.role)}</small></span></span><span class="autocomplete-elements">${a.elements.map(e=>esc(elementName(e))).join(' + ')}</span></button>`).join(''): `<div class="autocomplete-empty">${t('searchNoResult')}</div>`;
      menu.classList.add('show');
      menu.querySelectorAll('[data-i]').forEach(button => button.onmousedown = event => {
        event.preventDefault();
        choose(Number(button.dataset.i))
      })
    };
    const choose = index => {
      const a = current[index];
      if (!a) return;
      input.value = nameOf(a);
      close();
      onSelect(a)
    };
    input.addEventListener('input', () => {
      active = - 1;
      paint()
    });
    input.addEventListener('focus', paint);
    input.addEventListener('blur', () => setTimeout(close, 120));
    input.addEventListener('keydown', event => {
      if (!menu.classList.contains('show') && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) paint();
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        active = Math.min(active + 1, current.length - 1);
        paint()
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        active = Math.max(active - 1, 0);
        paint()
      } else if (event.key === 'Enter' && active >= 0) {
        event.preventDefault();
        choose(active)
      } else if (event.key === 'Escape') close()
    });
    return {
      close, refresh: paint
    }
  }

  function exactAniimo(value) {
    const q = value.trim().toLocaleLowerCase(lang);
    return visibleAniimos.find(a => nameOf(a).toLocaleLowerCase(lang) === q || idOf(a).toLocaleLowerCase(lang) === q) || null
  }

  function saveOwned() {
    safeSet('aml_collection', JSON.stringify([...owned]));
    document.dispatchEvent(new CustomEvent('aml:collection-changed'))
  }

  function fnv(bytes) {
    let h = 0x811c9dc5;
    for (const b of bytes) {
      h ^= b;
      h = Math.imul(h, 0x01000193) >>> 0
    }
    return h >>> 0
  }

  function toB64(bytes) {
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  function fromB64(value) {
    let s = value.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const raw = atob(s), out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out
  }

  function referenceCode(set = owned) {
    const n = D.aniimos.length, bytes = new Uint8Array(3 + Math.ceil(n / 8));
    bytes[0] = 1;
    bytes[1] = (n >> 8) & 255;
    bytes[2] = n & 255;
    D.aniimos.forEach((a, i) => {
      if (set.has(a.key)) bytes[3 + (i >> 3)] |= 1 << (i & 7)
    });
    return `AML1-${toB64(bytes)}-${fnv(bytes).toString(16).padStart(8,'0').toUpperCase()}`
  }

  function decodeReference(code) {
    try {
      const m = String(code).trim().match(/^AML1-([A-Z0-9_-]+)-([0-9A-F]{8})$/i);
      if (!m) return null;
      const bytes = fromB64(m[1]);
      if (fnv(bytes).toString(16).padStart(8, '0').toUpperCase() !== m[2].toUpperCase() || bytes.length < 3 || bytes[0] !== 1) return null;
      const n = (bytes[1] << 8) | bytes[2];
      if (n > D.aniimos.length || bytes.length !== 3 + Math.ceil(n / 8)) return null;
      const set = new Set();
      for (let i = 0; i < n; i++) if (bytes[3 + (i >> 3)] & (1 << (i & 7))) set.add(D.aniimos[i].key);
      return set
    } catch {
      return null
    }
  }

  function replaceOwned(set) {
    owned.clear();
    set.forEach(key => owned.add(key));
    saveOwned()
  }
  renderSidebar();
  applyStaticText();
  window.AML = {
    data: D, lang, page, t, sourceOf, nameOf, idOf, visibleAniimos, elementName, spatialName, iconSvg, iconGroup, pills, esc, autocomplete, exactAniimo, owned, saveOwned, replaceOwned, referenceCode, decodeReference, safeSet, safeGet
  };
})();
