/* Community teams page: browse, publish, translate descriptions and toggle upvotes. */
(function() {
  'use strict';

  const A = window.AML;
  const C = window.AML_COMMUNITY;
  const selected = [null, null, null, null];
  const translatedDescriptions = new Map();
  let teams = [];
  let currentTab = 'browse';

  function switchTab(tab) {
    currentTab = tab;
    const browse = tab === 'browse';
    document.getElementById('community-browse-panel').hidden = !browse;
    document.getElementById('community-create-panel').hidden = browse;
    document.getElementById('community-tab-browse').classList.toggle('active', browse);
    document.getElementById('community-tab-create').classList.toggle('active', !browse);
  }

  function aniimoByKey(key) {
    return A.getAniimoByKey(key);
  }

  function slotMarkup(index) {
    return `
      <div class="team-slot" data-slot="${index}">
        <div class="team-slot-label">${A.t('memberNumber', index + 1)}</div>
        <div class="searchbox team-slot-search">
          <span class="searchicon">⌕</span>
          <input
            id="community-slot-input-${index}"
            autocomplete="off"
            placeholder="${A.esc(A.t('searchAniimo'))}"
          >
        </div>
        <div id="community-slot-selected-${index}" class="team-slot-selected"></div>
      </div>
    `;
  }

  function renderCreateSlots() {
    document.getElementById('community-create-count').textContent = `${selected.filter(Boolean).length} / 4`;
    selected.forEach((aniimo, index) => {
      const root = document.getElementById(`community-slot-selected-${index}`);
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
          <button type="button" class="mini-remove" data-community-clear-slot="${index}" aria-label="${A.esc(A.t('remove'))}">×</button>
        </div>
      `;
    });

    document.querySelectorAll('[data-community-clear-slot]').forEach(button => {
      button.onclick = () => {
        const index = Number(button.dataset.communityClearSlot);
        selected[index] = null;
        document.getElementById(`community-slot-input-${index}`).value = '';
        renderCreateSlots();
      };
    });
  }

  function pick(index, aniimo) {
    if (!aniimo) return;
    const duplicateIndex = selected.findIndex((item, i) => item?.key === aniimo.key && i !== index);
    if (duplicateIndex >= 0) {
      selected[duplicateIndex] = null;
      document.getElementById(`community-slot-input-${duplicateIndex}`).value = '';
    }
    selected[index] = aniimo;
    document.getElementById(`community-slot-input-${index}`).value = A.nameOf(aniimo);
    renderCreateSlots();
  }

  function seasonOptions() {
    const select = document.getElementById('community-season');
    const seasons = [...new Set(teams.map(team => team.season).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, A.lang));
    const current = select.value;
    select.innerHTML = `<option value="">${A.t('allSeasons')}</option>` + seasons
      .map(season => `<option value="${A.esc(season)}">${A.esc(season)}</option>`)
      .join('');
    if (seasons.includes(current)) select.value = current;
  }

  function memberStrip(team) {
    return team.aniimos.map(key => {
      const aniimo = aniimoByKey(key);
      if (!aniimo || !A.sourceOf(aniimo)) return '';
      return `
        <div class="community-member">
          ${A.iconGroup(aniimo.elements, 'sm')}
          <div>
            <strong>${A.esc(A.nameOf(aniimo))}</strong>
            <small>${A.esc(aniimo.role)}</small>
          </div>
        </div>
      `;
    }).join('');
  }

  function languageOptions(selectedLanguage) {
    return A.supportedLanguages.map(code => `
      <option value="${A.esc(code)}" ${code === selectedLanguage ? 'selected' : ''}>
        ${A.esc(A.languageName(code))}
      </option>
    `).join('');
  }

  function teamCard(team) {
    const translated = translatedDescriptions.get(String(team.id));
    const displayedDescription = translated?.text || team.description;
    const description = team.description
      ? `<p class="community-description" data-description-id="${A.esc(team.id)}">${A.esc(displayedDescription)}</p>`
      : `<p class="community-description empty-description">${A.t('noDescription')}</p>`;

    return `
      <article class="community-card" data-team-id="${A.esc(team.id)}">
        <div class="community-card-head">
          <div>
            <span class="community-season">${A.esc(team.season)}</span>
            <h3>${A.esc(team.name)}</h3>
          </div>
          <button
            class="upvote-button ${team.voted ? 'voted' : ''}"
            type="button"
            data-upvote="${A.esc(team.id)}"
            title="${A.esc(team.voted ? A.t('removeUpvote') : A.t('upvote'))}"
            aria-pressed="${team.voted ? 'true' : 'false'}"
          >
            ▲ <span>${team.votes}</span>
          </button>
        </div>

        <div class="community-members">${memberStrip(team)}</div>
        ${description}

        ${team.description ? `
          <div class="community-card-actions translation-actions">
            <label class="translation-target-label">
              <span>${A.t('translationTarget')}</span>
              <select class="translation-target" data-translation-target="${A.esc(team.id)}">
                ${languageOptions(translated?.target || A.lang)}
              </select>
            </label>
            <button
              class="text-action"
              type="button"
              data-translate="${A.esc(team.id)}"
            >
              ${A.t('translateDescription')}
            </button>
            <button
              class="text-action subtle-text-action"
              type="button"
              data-original="${A.esc(team.id)}"
              ${translated ? '' : 'hidden'}
            >
              ${A.t('showOriginal')}
            </button>
          </div>
        ` : ''}
      </article>
    `;
  }

  function renderBrowse() {
    const search = document.getElementById('community-search').value.trim().toLocaleLowerCase(A.lang);
    const season = document.getElementById('community-season').value;
    const filtered = teams.filter(team => {
      const names = team.aniimos.map(key => {
        const aniimo = aniimoByKey(key);
        return aniimo && A.sourceOf(aniimo) ? A.nameOf(aniimo) : '';
      }).join(' ');
      const haystack = `${team.name} ${team.season} ${team.description} ${names}`.toLocaleLowerCase(A.lang);
      return (!search || haystack.includes(search)) && (!season || team.season === season);
    });

    document.getElementById('community-list').innerHTML = filtered.length
      ? filtered.map(teamCard).join('')
      : `<div class="notice subtle-notice">${A.t('noCommunityTeams')}</div>`;

    document.querySelectorAll('[data-upvote]').forEach(button => {
      button.onclick = async () => {
        button.disabled = true;
        try {
          await C.toggleVote(button.dataset.upvote);
          await loadTeams();
        } catch {
          button.disabled = false;
        }
      };
    });

    document.querySelectorAll('[data-translate]').forEach(button => {
      button.onclick = async () => {
        const team = teams.find(item => String(item.id) === button.dataset.translate);
        if (!team?.description) return;

        const targetSelect = document.querySelector(`[data-translation-target="${CSS.escape(String(team.id))}"]`);
        const target = targetSelect?.value || A.lang;
        const description = document.querySelector(`[data-description-id="${CSS.escape(String(team.id))}"]`);
        if (!description) return;

        button.disabled = true;
        const originalLabel = button.textContent;
        button.textContent = A.t('translating');

        try {
          const translated = await C.translateDescription(team.description, team.language, target);
          translatedDescriptions.set(String(team.id), { target, text: translated });
          description.textContent = translated;
          const originalButton = document.querySelector(`[data-original="${CSS.escape(String(team.id))}"]`);
          if (originalButton) originalButton.hidden = false;
          button.textContent = A.t('translated');
        } catch {
          button.textContent = A.t('translationUnavailable');
          setTimeout(() => {
            button.textContent = originalLabel;
            button.disabled = false;
          }, 1800);
          return;
        }

        setTimeout(() => {
          button.textContent = originalLabel;
          button.disabled = false;
        }, 1200);
      };
    });

    document.querySelectorAll('[data-original]').forEach(button => {
      button.onclick = () => {
        const team = teams.find(item => String(item.id) === button.dataset.original);
        if (!team) return;
        const description = document.querySelector(`[data-description-id="${CSS.escape(String(team.id))}"]`);
        if (description) description.textContent = team.description;
        translatedDescriptions.delete(String(team.id));
        button.hidden = true;
      };
    });
  }

  async function loadTeams() {
    const list = document.getElementById('community-list');
    list.innerHTML = `<div class="notice subtle-notice">${A.t('loading')}</div>`;
    try {
      teams = await C.listTeams();
      seasonOptions();
      renderBrowse();
    } catch {
      list.innerHTML = `<div class="notice">${A.t('communityLoadError')}</div>`;
    }
  }

  async function publish() {
    const notice = document.getElementById('community-create-notice');
    const button = document.getElementById('community-publish');
    const season = document.getElementById('community-create-season').value.trim();
    const name = document.getElementById('community-create-name').value.trim();
    const description = document.getElementById('community-create-description').value.trim();
    const aniimos = selected.filter(Boolean).map(aniimo => aniimo.key);
    notice.innerHTML = '';

    if (!season || !name || aniimos.length !== 4) {
      notice.innerHTML = `<div class="notice">${A.t('communityFormIncomplete')}</div>`;
      return;
    }

    button.disabled = true;
    try {
      await C.createTeam({ season, name, description, aniimos });
      document.getElementById('community-create-season').value = '';
      document.getElementById('community-create-name').value = '';
      document.getElementById('community-create-description').value = '';
      selected.fill(null);
      [0, 1, 2, 3].forEach(index => {
        document.getElementById(`community-slot-input-${index}`).value = '';
      });
      renderCreateSlots();
      await loadTeams();
      switchTab('browse');
    } catch {
      notice.innerHTML = `<div class="notice">${A.t('communityPublishError')}</div>`;
    } finally {
      button.disabled = false;
    }
  }

  document.getElementById('community-mode').textContent = C.remote ? A.t('communityOnline') : A.t('communityLocal');
  document.getElementById('community-tab-browse').onclick = () => switchTab('browse');
  document.getElementById('community-tab-create').onclick = () => switchTab('create');

  const communitySearch = document.getElementById('community-search');
  A.autocomplete(communitySearch, aniimo => {
    communitySearch.value = A.nameOf(aniimo);
    renderBrowse();
  }, { openEmpty: false });
  communitySearch.addEventListener('input', renderBrowse);

  document.getElementById('community-season').onchange = renderBrowse;
  document.getElementById('community-publish').onclick = publish;

  const slotsRoot = document.getElementById('community-create-slots');
  slotsRoot.innerHTML = [0, 1, 2, 3].map(slotMarkup).join('');
  [0, 1, 2, 3].forEach(index => {
    const input = document.getElementById(`community-slot-input-${index}`);
    A.autocomplete(input, aniimo => pick(index, aniimo), { openEmpty: false });
    input.addEventListener('change', () => {
      const aniimo = A.exactAniimo(input.value);
      if (aniimo) pick(index, aniimo);
    });
  });

  renderCreateSlots();
  switchTab(currentTab);
  loadTeams();
})();
