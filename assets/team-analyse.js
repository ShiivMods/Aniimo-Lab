/* Page logic: evaluate a manually selected four-member team. */
(function() {
  'use strict';

  const A = window.AML;
  const D = A.data;
  const T = window.AML_TEAM;
  const selected = [null, null, null, null];

  function slotMarkup(index) {
    return `
      <div class="team-slot" data-slot="${index}">
        <div class="team-slot-label">${A.t('memberNumber', index + 1)}</div>
        <div class="searchbox team-slot-search">
          <span class="searchicon">⌕</span>
          <input
            id="team-slot-input-${index}"
            autocomplete="off"
            placeholder="${A.esc(A.t('searchAniimo'))}"
          >
        </div>
        <div id="team-slot-selected-${index}" class="team-slot-selected"></div>
      </div>
    `;
  }

  function renderSlots() {
    document.getElementById('team-analysis-count').textContent = `${selected.filter(Boolean).length} / 4`;
    selected.forEach((aniimo, index) => {
      const root = document.getElementById(`team-slot-selected-${index}`);
      if (!root) return;
      if (!aniimo) {
        root.innerHTML = `<div class="team-slot-empty">${A.t('emptyTeamSlot')}</div>`;
        return;
      }
      root.innerHTML = `
        <div class="selected-aniimo">
          <div class="selected-aniimo-main">
            ${A.iconGroup(aniimo.elements, 'sm')}
            <div>
              <strong>${A.esc(A.nameOf(aniimo))}</strong>
              <small>#${A.esc(A.idOf(aniimo))} · ${A.esc(aniimo.role)}</small>
            </div>
          </div>
          <button type="button" class="mini-remove" data-clear-slot="${index}" aria-label="${A.esc(A.t('remove'))}">×</button>
        </div>
      `;
    });

    document.querySelectorAll('[data-clear-slot]').forEach(button => {
      button.onclick = () => {
        const index = Number(button.dataset.clearSlot);
        selected[index] = null;
        document.getElementById(`team-slot-input-${index}`).value = '';
        renderSlots();
        hideResults();
      };
    });
  }

  function pick(index, aniimo) {
    if (!aniimo) return;
    const duplicateIndex = selected.findIndex((a, i) => a?.key === aniimo.key && i !== index);
    if (duplicateIndex >= 0) {
      selected[duplicateIndex] = null;
      document.getElementById(`team-slot-input-${duplicateIndex}`).value = '';
    }
    selected[index] = aniimo;
    document.getElementById(`team-slot-input-${index}`).value = A.nameOf(aniimo);
    renderSlots();
    hideResults();
  }

  function hideResults() {
    document.getElementById('team-analysis-results').hidden = true;
    document.getElementById('team-analysis-empty').hidden = false;
  }

  function metricLabel(result) {
    return A.t(`teamGrade_${result.grade}`);
  }

  function renderStrengths(result) {
    const items = [];
    items.push(`<div class="analysis-item"><strong>${A.t('coverageLabel', result.coverage.length)}</strong><span>${result.coverage.map(A.elementName).join(', ') || A.t('none')}</span></div>`);
    if (result.resistances.length) {
      items.push(`<div class="analysis-item"><strong>${A.t('teamResistances')}</strong><span>${result.resistances.slice(0, 4).map(x => `${A.elementName(x.element)} ×${x.count}`).join(', ')}</span></div>`);
    }
    if (result.roles.hasDps && result.roles.hasBreak) {
      items.push(`<div class="analysis-item"><strong>${A.t('coreRolesCovered')}</strong><span>${A.t('coreRolesCoveredHint')}</span></div>`);
    }
    return items.join('');
  }

  function renderWeaknesses(result) {
    const items = [];
    if (result.sharedWeaknesses.length) {
      result.sharedWeaknesses.slice(0, 5).forEach(w => {
        items.push(`<div class="analysis-item"><strong>${A.elementName(w.element)}</strong><span>${A.t('membersWeakTo', w.count)}</span></div>`);
      });
    }
    if (!result.roles.hasDps) items.push(`<div class="analysis-item"><strong>DPS</strong><span>${A.t('missingRole')}</span></div>`);
    if (!result.roles.hasBreak) items.push(`<div class="analysis-item"><strong>BREAK</strong><span>${A.t('missingRole')}</span></div>`);
    if (!items.length) items.push(`<div class="analysis-item muted-analysis">${A.t('noMajorWeakness')}</div>`);
    return items.join('');
  }

  function renderImprovements(team, useRoles) {
    const suggestions = T.replacementSuggestions(team, useRoles, 4);
    const root = document.getElementById('team-analysis-improvements');
    if (!suggestions.length) {
      root.innerHTML = `<div class="quiet-suggestion">${A.t('noObviousReplacement')}</div>`;
      return;
    }
    root.innerHTML = suggestions.map(s => `
      <div class="quiet-suggestion">
        <div class="quiet-suggestion-main">
          <span>${A.t('replaceSuggestion')}</span>
          <strong>${A.esc(A.nameOf(s.out))}</strong>
          <span>→</span>
          <strong>${A.esc(A.nameOf(s.in))}</strong>
        </div>
        <div class="quiet-suggestion-meta">+${s.gain} ${A.t('analysisPoints')} · ${A.t('coverage', s.result.coverage.length)}</div>
      </div>
    `).join('');
  }

  function runAnalysis() {
    const team = selected.filter(Boolean);
    if (team.length !== 4) {
      document.getElementById('team-analysis-empty').hidden = false;
      document.getElementById('team-analysis-empty').innerHTML = `<div class="notice">${A.t('selectFourAniimo')}</div>`;
      document.getElementById('team-analysis-results').hidden = true;
      return;
    }

    const useRoles = document.getElementById('team-analysis-roles').checked;
    const result = T.evaluateTeam(team, useRoles);

    document.getElementById('team-analysis-empty').hidden = true;
    document.getElementById('team-analysis-results').hidden = false;
    document.getElementById('team-analysis-score').innerHTML = `<strong>${result.score}</strong><span>/ 100 · ${metricLabel(result)}</span>`;
    document.getElementById('team-analysis-coverage').textContent = `${result.coverage.length} / ${D.elementOrder.length}`;
    document.getElementById('team-analysis-diversity').textContent = `${result.elementDiversity}`;
    document.getElementById('team-analysis-roles-result').textContent = useRoles
      ? (result.roles.hasDps && result.roles.hasBreak ? A.t('rolesOk') : A.t('rolesPartial'))
      : A.t('rolesIgnored');
    document.getElementById('team-analysis-weakness-count').textContent = String(result.sharedWeaknesses.length);
    document.getElementById('team-analysis-strengths').innerHTML = renderStrengths(result);
    document.getElementById('team-analysis-weaknesses').innerHTML = renderWeaknesses(result);
    renderImprovements(team, useRoles);
  }

  const slotsRoot = document.getElementById('team-analysis-slots');
  slotsRoot.innerHTML = [0, 1, 2, 3].map(slotMarkup).join('');

  [0, 1, 2, 3].forEach(index => {
    const input = document.getElementById(`team-slot-input-${index}`);
    A.autocomplete(input, aniimo => pick(index, aniimo), { openEmpty: false });
    input.addEventListener('change', () => {
      const aniimo = A.exactAniimo(input.value);
      if (aniimo) pick(index, aniimo);
    });
  });

  document.getElementById('team-analysis-run').onclick = runAnalysis;
  document.getElementById('team-analysis-roles').onchange = () => {
    if (!document.getElementById('team-analysis-results').hidden) runAnalysis();
  };

  renderSlots();
})();
