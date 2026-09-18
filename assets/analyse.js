/* Page logic: analyze one Aniimo profile. */
(function() {
  'use strict';

  const A = window.AML;
  const D = A.data;
  const M = window.AML_MATCH;

  const state = {
    es: ['fire'],
    s: 'strike',
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
              ${elements.map(A.elementName).join(' + ')} ·
              ${D.spatials[spatial].icon}
              ${A.spatialName(spatial)}
            </div>

            ${meta ? `<div class="row-meta">${meta}</div>` : ''}
          </div>
        </div>

        <span class="tag ${kind}">
          ${label}
        </span>
      </div>
    `;
  }

  function elementRow(element, label, kind = 'warn', meta = '') {
    return `
      <div class="row">
        <div class="row-left">
          ${A.iconGroup([element])}

          <div>
            <div class="row-name">
              ${A.elementName(element)}
            </div>

            ${meta ? `<div class="row-meta">${meta}</div>` : ''}
          </div>
        </div>

        <span class="tag ${kind}">
          ${label}
        </span>
      </div>
    `;
  }

  function buildElementPicker() {
    const root = document.getElementById('a-elements');

    root.innerHTML = D.elementOrder.map(element => `
      <button
        class="epick ${state.es.includes(element) ? 'active' : ''}"
        data-k="${element}"
      >
        ${A.iconSvg(element, 'lg')}

        <span class="label">
          ${A.elementName(element)}
        </span>
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
          elements = [
            elements[1],
            element
          ];
        }

        state.es = elements;
        state.aniimo = null;

        document.getElementById('a-search').value = '';

        render();
      };
    });
  }

  function buildSpatialPicker() {
    const root = document.getElementById('a-spatials');

    root.innerHTML = D.spatialOrder.map(spatialKey => {
      const spatial = D.spatials[spatialKey];

      return `
        <button
          class="spick ${state.s === spatialKey ? 'active' : ''}"
          data-k="${spatialKey}"
        >
          <span class="spatial-icon">
            ${spatial.icon}
          </span>

          <span>
            <strong>
              ${A.spatialName(spatialKey)}
            </strong>

            <small>
              ${A.lang === 'fr'
                ? spatial.frHint
                : spatial.enHint}
            </small>
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
    const hit = document.getElementById('a-hit');

    if (!state.aniimo) {
      hit.classList.remove('show');
      hit.innerHTML = '';

      return;
    }

    hit.classList.add('show');

    hit.innerHTML = `
      <div>
        <div class="aniimo-id">
          #${A.esc(A.idOf(state.aniimo))} ·
          ${A.esc(state.aniimo.role)}
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

  function renderPerfectMatchups() {
    const targets = [];

    for (const element of D.elementOrder) {
      for (const spatial of D.spatialOrder) {
        const elementScore = Math.max(
          ...state.es.map(
            attacker => M.eMult(
              attacker,
              element
            )
          )
        );

        const spatialScore = M.sMult(
          state.s,
          spatial
        );

        targets.push({
          element,
          spatial,
          elementScore,
          spatialScore
        });
      }
    }

    const perfect = targets.filter(item => {
      return (
        item.elementScore > 1.001 &&
        item.spatialScore === 2
      );
    });

    document.getElementById('a-perfect-count').textContent =
      perfect.length;

    document.getElementById('a-perfect').innerHTML =
      perfect.length
        ? perfect.map(item => globalRow(
            [item.element],
            item.spatial,
            A.t('perfect'),
            'good'
          )).join('')
        : empty(A.t('noPerfect'));
  }

  function renderEffectiveElements() {
    const effective = D.elementOrder
      .map(element => ({
        element,
        score: Math.max(
          ...state.es.map(
            attacker => M.eMult(
              attacker,
              element
            )
          )
        )
      }))
      .filter(item => item.score > 1.001)
      .sort(
        (a, b) =>
          b.score - a.score
      );

    document.getElementById('a-effective-count').textContent =
      effective.length;

    document.getElementById('a-effective').innerHTML =
      effective.length
        ? effective.map(item => `
            <div class="row">
              <div class="row-left">
                ${A.iconGroup([item.element])}

                <div>
                  <div class="row-name">
                    ${A.elementName(item.element)}
                  </div>

                  <div class="row-meta">
                    ${A.t('advantageOff')}
                  </div>
                </div>
              </div>

              <span class="tag good">
                ${A.t('superEffective')}
              </span>
            </div>
          `).join('')
        : empty(A.t('noElementAdv'));
  }

  function getElementDanger(element) {
    const incoming = M.incomingThreatScore(
      state.es,
      element
    );

    const ownOffense = Math.max(
      ...state.es.map(
        attacker => M.eMult(
          attacker,
          element
        )
      )
    );

    let danger = 0;

    if (incoming > 1.001) {
      danger += 2;
    }

    if (incoming > 2.3) {
      danger += 2;
    }

    if (ownOffense < 0.999) {
      danger += 1;
    }

    return {
      element,
      incoming,
      ownOffense,
      danger
    };
  }

  function renderElementOnlyDangers() {
    const dangers = D.elementOrder
      .map(getElementDanger)
      .filter(item => item.danger >= 2)
      .sort((a, b) => {
        return (
          b.danger - a.danger ||
          b.incoming - a.incoming
        );
      });

    document.getElementById('a-danger-count').textContent =
      dangers.length;

    document.getElementById('a-danger').innerHTML =
      dangers.length
        ? dangers.map(item => elementRow(
            item.element,
            item.danger >= 4
              ? A.t('dangerMax')
              : A.t('toAvoid'),
            'bad',
            `${M.scoreLabel(item.incoming)} ${A.t('received')}`
          )).join('')
        : empty(A.t('noDanger'));

    return dangers;
  }

  function renderSpatialDangers() {
    const dangers = [];

    for (const element of D.elementOrder) {
      const elemental =
        getElementDanger(element);

      for (const spatial of D.spatialOrder) {
        const spatialScore = M.sMult(
          spatial,
          state.s
        );

        let danger =
          elemental.danger;

        if (spatialScore === 2) {
          danger += 1;
        }

        if (danger >= 3) {
          dangers.push({
            ...elemental,
            spatial,
            spatialScore,
            danger
          });
        }
      }
    }

    dangers.sort((a, b) => {
      return (
        b.danger - a.danger ||
        b.incoming - a.incoming
      );
    });

    document.getElementById('a-danger-count').textContent =
      dangers.length;

    document.getElementById('a-danger').innerHTML =
      dangers.length
        ? dangers
            .slice(0, 14)
            .map(item => globalRow(
              [item.element],
              item.spatial,
              item.danger >= 5
                ? A.t('dangerMax')
                : A.t('toAvoid'),
              'bad',
              `${M.scoreLabel(item.incoming)} ${A.t('received')}${
                item.spatialScore === 2
                  ? ` + ${A.t('spatialEnemy')}`
                  : ''
              }`
            ))
            .join('')
        : empty(A.t('noDanger'));

    return dangers;
  }

  function renderIdealPartner(dangers) {
    const threats = [
      ...new Set(
        dangers.map(
          item => item.element
        )
      )
    ];

    const partners = D.elementOrder
      .filter(
        element =>
          !state.es.includes(element)
      )
      .map(element => ({
        element,

        coverage: threats.reduce(
          (count, threat) =>
            count +
            (
              M.eMult(
                element,
                threat
              ) > 1.001
                ? 1
                : 0
            ),
          0
        ),

        safety: threats.reduce(
          (count, threat) =>
            count +
            (
              M.eMult(
                threat,
                element
              ) < 0.999
                ? 1
                : 0
            ),
          0
        )
      }))
      .sort(
        (a, b) =>
          b.coverage - a.coverage ||
          b.safety - a.safety
      );

    document.getElementById('a-duo').innerHTML =
      partners.length
        ? `
            <div class="duohero">
              <div class="element-pills">
                ${A.pills([partners[0].element])}
              </div>

              <strong>
                ${A.elementName(partners[0].element)}
              </strong>

              <p>
                ${A.t(
                  'covers',
                  partners[0].coverage
                )}
              </p>
            </div>
          `
        : empty(A.t('notEnough'));
  }

  function render() {
    buildElementPicker();
    buildSpatialPicker();
    renderAniimoHit();

    document.getElementById('a-use-spatial').checked =
      state.useSpatial;

    document.getElementById('a-spatial-section').hidden =
      !state.useSpatial;

    document.getElementById('a-perfect-card').hidden =
      !state.useSpatial;

    const spatialSummary = state.useSpatial
      ? `
          <div class="summary-spatial">
            ${D.spatials[state.s].icon}
            ${A.spatialName(state.s)}
          </div>
        `
      : '';

    document.getElementById('a-summary').innerHTML = `
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

    document.getElementById('a-context').textContent =
      state.es.map(A.elementName).join(' + ') +
      (
        state.useSpatial
          ? ` · ${A.spatialName(state.s)}`
          : ''
      );

    if (state.useSpatial) {
      renderPerfectMatchups();
    } else {
      document.getElementById('a-perfect-count').textContent =
        '0';

      document.getElementById('a-perfect').innerHTML =
        '';
    }

    renderEffectiveElements();

    const dangers = state.useSpatial
      ? renderSpatialDangers()
      : renderElementOnlyDangers();

    renderIdealPartner(dangers);
  }

  const input =
    document.getElementById('a-search');

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

  input.addEventListener(
    'change',
    () => {
      const aniimo =
        A.exactAniimo(input.value);

      if (aniimo) {
        state.aniimo = aniimo;
        state.es = [...aniimo.elements];

        render();
      }
    }
  );

  document.getElementById('a-clear').onclick =
    () => {
      input.value = '';
      state.aniimo = null;

      render();
    };

  document.getElementById('a-use-spatial').onchange =
    event => {
      state.useSpatial =
        event.target.checked;

      render();
    };

  render();
})();