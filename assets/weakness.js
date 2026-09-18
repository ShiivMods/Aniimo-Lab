/* Page logic: find weaknesses and favorable counters. */
(function() {
  'use strict';
  const A = window.AML, D = A.data, M = window.AML_MATCH;
  const state = {
    es: ['fire'], s: 'fly', aniimo: null
  };
  const empty = x => `<div class="empty">${x}</div>`;

  function globalRow(es, s, label, kind = 'warn', meta = '') {
    return `<div class="row"><div class="row-left">${A.iconGroup(es)}<div><div class="row-name">${es.map(A.elementName).join(' + ')} · ${D.spatials[s].icon} ${A.spatialName(s)}</div>${meta?`<div class="row-meta">${meta}</div>`:''}</div></div><span class="tag ${kind}">${label}</span></div>`
  }

  function aniimoRow(a, score) {
    return `<div class="row"><div class="row-left">${A.iconGroup(a.elements)}<div><div class="row-name">${A.esc(A.nameOf(a))}</div><div class="row-meta">#${A.esc(A.idOf(a))} · ${a.elements.map(A.elementName).join(' + ')} · ${A.esc(a.role)}</div></div></div><span class="tag ${M.scoreKind(score)}">${M.scoreLabel(score)}</span></div>`
  }

  function buildPicker() {
    const root = document.getElementById('w-elements');
    root.innerHTML = D.elementOrder.map(k => `<button class="epick ${state.es.includes(k)?'active':''}" data-k="${k}">${A.iconSvg(k,'lg')}<span class="label">${A.elementName(k)}</span></button>`).join('');
    root.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
      const k = b.dataset.k;
      let es = [...state.es];
      if (es.includes(k)) {
        if (es.length > 1) es = es.filter(x => x !== k)
      } else if (es.length < 2) es.push(k);
      else es = [es[1], k];
      state.es = es;
      state.aniimo = null;
      document.getElementById('w-search').value = '';
      render()
    })
  }

  function buildSpatial() {
    const root = document.getElementById('w-spatials');
    root.innerHTML = D.spatialOrder.map(k => {
      const x = D.spatials[k];
      return `<button class="spick ${state.s===k?'active':''}" data-k="${k}"><span class="spatial-icon">${x.icon}</span><span><strong>${A.spatialName(k)}</strong><small>${A.lang==='fr'?x.frHint:x.enHint}</small></span></button>`
    }).join('');
    root.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
      state.s = b.dataset.k;
      render()
    })
  }

  function hit() {
    const el = document.getElementById('w-hit');
    if (!state.aniimo) {
      el.classList.remove('show');
      el.innerHTML = '';
      return
    }
    el.classList.add('show');
    el.innerHTML = `<div><div class="aniimo-id">#${A.esc(A.idOf(state.aniimo))} · ${A.esc(state.aniimo.role)}</div><div class="aniimo-name">${A.esc(A.nameOf(state.aniimo))}</div></div><div class="element-pills">${A.pills(state.aniimo.elements)}</div>`
  }

  function render() {
    buildPicker();
    buildSpatial();
    hit();
    document.getElementById('w-summary').innerHTML = `<div class="summary-left"><strong>${state.aniimo?A.esc(A.nameOf(state.aniimo)):A.t('manual')}</strong>${A.pills(state.es)}</div><div class="summary-spatial">${D.spatials[state.s].icon} ${A.spatialName(state.s)}</div>`;
    document.getElementById('w-context').textContent = `${state.es.map(A.elementName).join(' + ')} · ${A.spatialName(state.s)}`;
    const combos = [];
    for (const e of D.elementOrder) for (const s of['distance', 'strike']) {
      const em = M.defenseElementScore(e, state.es), sm = M.sMult(s, state.s);
      combos.push({
        e, s, em, sm, total: em * sm
      })
    }
    combos.sort((a, b) => b.total - a.total || b.em - a.em);
    const best = combos.filter(x => x.total > 1.001).slice(0, 12);
    document.getElementById('w-best-count').textContent = best.length;
    document.getElementById('w-best').innerHTML = best.length ? best.map(x => globalRow([x.e], x.s, x.em > 1.001 && x.sm === 2 ? A.t('perfect'): M.scoreLabel(x.total), x.em > 1.001 && x.sm === 2 ? 'good': 'warn', `${A.elementName(x.e)} · ${M.scoreLabel(x.em)}`)).join(''): empty(A.t('noAdvantage'));
    const cand = A.visibleAniimos.map(a => ({
      a, score: M.bestOffenseScore(a.elements, state.es)
    })).filter(x => x.score > 1.001).sort((x, y) => y.score - x.score || A.nameOf(x.a).localeCompare(A.nameOf(y.a), A.lang)).slice(0, 18);
    document.getElementById('w-candidates-count').textContent = cand.length;
    document.getElementById('w-candidates').innerHTML = cand.length ? cand.map(x => aniimoRow(x.a, x.score)).join(''): empty(A.t('noCandidate'));
    const avoid = combos.filter(x => x.total < .999).sort((a, b) => a.total - b.total).slice(0, 12);
    document.getElementById('w-avoid-count').textContent = avoid.length;
    document.getElementById('w-avoid').innerHTML = avoid.length ? avoid.map(x => globalRow([x.e], x.s, M.scoreLabel(x.total), 'bad')).join(''): empty(A.t('noBad'))
  }
  const input = document.getElementById('w-search');
  A.autocomplete(input, a => {
    state.aniimo = a;
    state.es = [...a.elements];
    render()
  }, {
    openEmpty: false
  });
  input.addEventListener('change', () => {
    const a = A.exactAniimo(input.value);
    if (a) {
      state.aniimo = a;
      state.es = [...a.elements];
      render()
    }
  });
  document.getElementById('w-clear').onclick = () => {
    input.value = '';
    state.aniimo = null;
    render()
  };
  render();
})();
