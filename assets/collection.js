/* Page logic: manage the local Aniimo collection and reference code. */
(function() {
  'use strict';
  const A = window.AML, D = A.data;

  function filters() {
    const es = document.getElementById('collection-element'), rs = document.getElementById('collection-role');
    es.innerHTML = `<option value="">${A.t('allElements')}</option>` + D.elementOrder.map(e => `<option value="${e}">${A.elementName(e)}</option>`).join('');
    const roles = [...new Set(A.visibleAniimos.map(a => a.role))].sort();
    rs.innerHTML = `<option value="">${A.t('allRoles')}</option>` + roles.map(r => `<option value="${A.esc(r)}">${A.esc(r)}</option>`).join('')
  }

  function updateCode() {
    document.getElementById('reference-code').value = A.referenceCode();
    document.getElementById('copy-status').textContent = ''
  }

  function render() {
    const q = document.getElementById('collection-search').value.trim().toLocaleLowerCase(A.lang), ef = document.getElementById('collection-element').value, rf = document.getElementById('collection-role').value;
    const list = A.visibleAniimos.filter(a => (!q || A.nameOf(a).toLocaleLowerCase(A.lang).includes(q) || A.idOf(a).includes(q)) && (!ef || a.elements.includes(ef)) && (!rf || a.role === rf));
    document.getElementById('collection-grid').innerHTML = list.map(a => `<button class="ani-card ${A.owned.has(a.key)?'owned':''}" data-key="${a.key}">${A.owned.has(a.key)?'<span class="ownedmark">✓</span>':''}<div class="ani-card-head"><div>${A.iconGroup(a.elements,'md')}</div><div style="min-width:0"><div class="ani-card-name">${A.esc(A.nameOf(a))}</div><div class="ani-card-id">#${A.esc(A.idOf(a))}</div></div></div><div class="ani-card-bottom"><div class="element-pills">${a.elements.map(e=>`<span class="element-pill">${A.elementName(e)}</span>`).join('')}</div><span class="rolebadge">${A.esc(a.role)}</span></div></button>`).join('') || `<div class="empty">${A.t('noCandidate')}</div>`;
    document.querySelectorAll('.ani-card').forEach(b => b.onclick = () => {
      const k = b.dataset.key;
      if (A.owned.has(k)) A.owned.delete(k);
      else A.owned.add(k);
      A.saveOwned();
      render()
    });
    const n = A.visibleAniimos.filter(a => A.owned.has(a.key)).length;
    document.getElementById('collection-badge').textContent = `${n} / ${A.visibleAniimos.length}`;
    document.getElementById('collection-count').textContent = A.t('collectionCounter', n);
    updateCode()
  }
  async function copyCode() {
    const value = document.getElementById('reference-code').value, status = document.getElementById('copy-status');
    try {
      await navigator.clipboard.writeText(value);
      status.textContent = A.t('copied')
    } catch {
      const el = document.getElementById('reference-code');
      el.focus();
      el.select();
      try {
        document.execCommand('copy');
        status.textContent = A.t('copied')
      } catch {
        status.textContent = value
      }
    }
  }

  function restore() {
    const raw = document.getElementById('restore-code').value, set = A.decodeReference(raw), status = document.getElementById('restore-status');
    status.classList.remove('error');
    if (!set) {
      status.textContent = A.t('restoreInvalid');
      status.classList.add('error');
      return
    }
    if (A.owned.size && !confirm(A.t('restoreConfirm'))) return;
    A.replaceOwned(set);
    status.textContent = A.t('restoreSuccess', set.size);
    render()
  }
  filters();
  const collectionSearch = document.getElementById('collection-search');
  A.autocomplete(collectionSearch, aniimo => {
    collectionSearch.value = A.nameOf(aniimo);
    render();
  }, { openEmpty: false });
  collectionSearch.addEventListener('input', render);
  document.getElementById('collection-element').onchange = render;
  document.getElementById('collection-role').onchange = render;
  document.getElementById('collection-reset').onclick = () => {
    document.getElementById('collection-search').value = '';
    document.getElementById('collection-element').value = '';
    document.getElementById('collection-role').value = '';
    render()
  };
  document.getElementById('collection-clear').onclick = () => {
    A.owned.clear();
    A.saveOwned();
    render()
  };
  document.getElementById('copy-code').onclick = copyCode;
  document.getElementById('restore-button').onclick = restore;
  document.getElementById('restore-code').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      restore()
    }
  });
  document.addEventListener('aml:collection-changed', updateCode);
  render();
})();
