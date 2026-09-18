/* Page logic: find weaknesses and favorable counters. */
(function() {
  'use strict';

  const A = window.AML;
  const D = A.data;
  const M = window.AML_MATCH;

  const state = {
    es: ['fire'],
    s: 'fly',
    useSpatial: false,
    aniimo: null
  };

  const empty = text => `<div class="empty">${text}</div>`;

  function globalRow(elements, spatial, label, kind = 'warn', meta = '') {
    return `
      <div class="row">
        <div class="row-left">
          ${A.iconGroup(elements)}
          <div>
            <div class="row-name">
              ${elements.map(A.elementName).join(' + ')} · ${D.spatials[spatial].icon} ${A.spatialName(spatial)}
            </div>
            ${meta ? `<div class="row-meta">${meta}</div>` : ''}
          </div>
        </div>
        <span class="tag ${kind}">${label}</span>
      </div>
    `;
  }

  function elementRow(element, label, kind = 'warn', meta = '') {
    return `
      <div class="row">
        <div class="row-left">
          ${A.iconGroup([element])}
          <div>
            <div class="row-name">${A.elementName(element)}</div>
            ${meta ? `<div class="row-meta">${meta}</div>` : ''}
          </div>
        </div>
        <span class="tag ${kind}">${label}</span>
      </div>
    `;
  }

  function aniimoRow(aniimo, score) {
    return `
      <div class="row">
        <div class="row-left">
          ${A.iconGroup(aniimo.elements)}
          <div>
            <div class="row-name">${A.esc(A.nameOf(aniimo))}</div>
            <div class="row-meta">
              #${A.esc(A.idOf(aniimo))} · ${aniimo.elements.map(A.elementName).join(' + ')} · ${A.esc(aniimo.role)}
            </div>
          </div>
        </div>
        <span class="tag ${M.scoreKind(score)}">${M.scoreLabel(score)}</span>
      </div>
    `;
  }

  function buildElementPicker() {
    const root = document.getElementById('w-elements');

    root.innerHTML = D.elementOrder.map(element => `
      <button class="epick ${state.es.includes(element) ? 'active' : ''}" data-k="${element}">
        ${A.iconSvg(element, 'lg')}
        <span class="label">${A.elementName(element)}</span>
      </button>
    `).join('');

    root.querySelectorAll('[data-k]').forEach(button => {
      button.onclick = () => {
        const element = button.dataset.k;
        let elements = [...state.es];

        if (elements.includes(element)) {
          if (elements.length > 1) {
            elements = elements.filter(item => item !== element);
          }
        } else if (elements.length < 2) {
          elements.push(element);
        } else {
          elements = [elements[1], element];
        }

        state.es = elements;
        state.aniimo = null;

        document.getElementById('w-search').value = '';

        render();
      };
    });
  }

  function buildSpatialPicker() {
    const root = document.getElementById('w-spatials');

    root.innerHTML = D.spatialOrder.map(spatialKey => {
      const spatial = D.spatials[spatialKey];

      return `
        <button class="spick ${state.s === spatialKey ? 'active' : ''}" data-k="${spatialKey}">
          <span class="spatial-icon">${spatial.icon}</span>
          <span>
            <strong>${A.spatialName(spatialKey)}</strong>
            <small>${A.lang === 'fr' ? spatial.frHint : spatial.enHint}</small>
          </span>
        </button>
      `;
    }).join('');

    root.querySelectorAll('[data-k]').forEach(button => {
      button.onclick = () => {
        state.s = button.dataset.k;
        render();
      };
    });
  }

  function renderAniimoHit() {
    const hit = document.getElementById('w-hit');

    if (!state.aniimo) {
      hit.classList.remove('show');
      hit.innerHTML = '';
      return;
    }

    hit.classList.add('show');

    hit.innerHTML = `
      <div>
        <div class="aniimo-id">
          #${A.esc(A.idOf(state.aniimo))} · ${A.esc(state.aniimo.role)}
        </div>
        <div class="aniimo-name">
          ${A.esc(A.nameOf(state.aniimo))}
        </div>
      </div>

      <div class="element-pills">
        ${A.pills(state.aniimo.elements)}
      </div>
    `;
  }

  function renderElementOnlyResults() {
    const elements = D.elementOrder
      .map(element => ({
        element,
        score: M.defenseElementScore(element, state.es)
      }))
      .sort((a, b) => b.score - a.score);

    const best = elements.filter(item => item.score > 1.001);

    document.getElementById('w-best-count').textContent = best.length;

    document.getElementById('w-best').innerHTML = best.length
      ? best.map(item => elementRow(
          item.element,
          M.scoreLabel(item.score),
          'good'
        )).join('')
      : empty(A.t('noAdvantage'));

    const avoid = elements
      .filter(item => item.score < 0.999)
      .sort((a, b) => a.score - b.score);

    document.getElementById('w-avoid-count').textContent = avoid.length;

    document.getElementById('w-avoid').innerHTML = avoid.length
      ? avoid.map(item => elementRow(
          item.element,
          M.scoreLabel(item.score),
          'bad'
        )).join('')
      : empty(A.t('noBad'));
  }

  function renderSpatialResults() {
    const combinations = [];

    for (const element of D.elementOrder) {
      for (const spatial of ['distance', 'strike']) {
        const elementScore = M.defenseElementScore(
          element,
          state.es
        );

        const spatialScore = M.sMult(
          spatial,
          state.s
        );

        combinations.push({
          element,
          spatial,
          elementScore,
          spatialScore,
          total: elementScore * spatialScore
        });
      }
    }

    combinations.sort(
      (a, b) =>
        b.total - a.total ||
        b.elementScore - a.elementScore
    );

    const best = combinations
      .filter(item => item.total > 1.001)
      .slice(0, 12);

    document.getElementById('w-best-count').textContent = best.length;

    document.getElementById('w-best').innerHTML = best.length
      ? best.map(item => {
          const perfect =
            item.elementScore > 1.001 &&
            item.spatialScore === 2;

          return globalRow(
            [item.element],
            item.spatial,
            perfect
              ? A.t('perfect')
              : M.scoreLabel(item.total),
            perfect
              ? 'good'
              : 'warn',
            `${A.elementName(item.element)} · ${M.scoreLabel(item.elementScore)}`
          );
        }).join('')
      : empty(A.t('noAdvantage'));

    const avoid = combinations
      .filter(item => item.total < 0.999)
      .sort((a, b) => a.total - b.total)
      .slice(0, 12);

    document.getElementById('w-avoid-count').textContent = avoid.length;

    document.getElementById('w-avoid').innerHTML = avoid.length
      ? avoid.map(item => globalRow(
          [item.element],
          item.spatial,
          M.scoreLabel(item.total),
          'bad'
        )).join('')
      : empty(A.t('noBad'));
  }

  function renderCandidates() {
    const candidates = A.visibleAniimos
      .map(aniimo => ({
        aniimo,
        score: M.bestOffenseScore(
          aniimo.elements,
          state.es
        )
      }))
      .filter(item => item.score > 1.001)
      .sort((a, b) => {
        return (
          b.score - a.score ||
          A.nameOf(a.aniimo).localeCompare(
            A.nameOf(b.aniimo),
            A.lang
          )
        );
      })
      .slice(0, 18);

    document.getElementById('w-candidates-count').textContent =
      candidates.length;

    document.getElementById('w-candidates').innerHTML =
      candidates.length
        ? candidates.map(item => aniimoRow(
            item.aniimo,
            item.score
          )).join('')
        : empty(A.t('noCandidate'));
  }

  function render() {
    buildElementPicker();
    buildSpatialPicker();
    renderAniimoHit();

    document.getElementById('w-use-spatial').checked =
      state.useSpatial;

    document.getElementById('w-spatial-section').hidden =
      !state.useSpatial;

    const spatialSummary = state.useSpatial
      ? `
          <div class="summary-spatial">
            ${D.spatials[state.s].icon}
            ${A.spatialName(state.s)}
          </div>
        `
      : '';

    document.getElementById('w-summary').innerHTML = `
      <div class="summary-left">
        <strong>
          ${state.aniimo
            ? A.esc(A.nameOf(state.aniimo))
            : A.t('manual')}
        </strong>

        ${A.pills(state.es)}
      </div>

      ${spatialSummary}
    `;

    document.getElementById('w-context').textContent =
      state.es.map(A.elementName).join(' + ') +
      (
        state.useSpatial
          ? ` · ${A.spatialName(state.s)}`
          : ''
      );

    if (state.useSpatial) {
      renderSpatialResults();
    } else {
      renderElementOnlyResults();
    }

    renderCandidates();
  }

  const input = document.getElementById('w-search');

  A.autocomplete(
    input,
    aniimo => {
      state.aniimo = aniimo;
      state.es = [...aniimo.elements];

      render();
    },
    {
      openEmpty: false
    }
  );

  input.addEventListener('change', () => {
    const aniimo = A.exactAniimo(input.value);

    if (aniimo) {
      state.aniimo = aniimo;
      state.es = [...aniimo.elements];

      render();
    }
  });

  document.getElementById('w-clear').onclick = () => {
    input.value = '';
    state.aniimo = null;

    render();
  };

  document.getElementById('w-use-spatial').onchange = event => {
    state.useSpatial = event.target.checked;

    render();
  };

  render();
})();