/* Global feedback and translation-contribution dialogs. Submissions use Supabase when configured. */
(function() {
  'use strict';

  const A = window.AML;
  const config = window.AML_COMMUNITY_CONFIG || {};
  const remote = Boolean(config.supabaseUrl && config.anonKey);
  const maxScreenshots = 4;
  const maxScreenshotBytes = 8 * 1024 * 1024;
  const maxTranslationBytes = 12 * 1024 * 1024;

  function headers(extra = {}) {
    return {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      ...extra
    };
  }

  function randomId(prefix) {
    const id = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}-${id}`;
  }

  function cleanFilename(name) {
    return String(name || 'file')
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 100);
  }

  async function uploadFile(file, folder) {
    const path = `${folder}/${randomId('upload')}-${cleanFilename(file.name)}`;
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const response = await fetch(`${config.supabaseUrl}/storage/v1/object/feedback-uploads/${encodedPath}`, {
      method: 'POST',
      headers: headers({
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'false'
      }),
      body: file
    });
    if (!response.ok) throw new Error(`UPLOAD_${response.status}`);
    return path;
  }

  async function insertRow(table, payload) {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/${table}`, {
      method: 'POST',
      headers: headers({
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      }),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`INSERT_${response.status}`);
  }

  function languageOptions(includeAll = false) {
    const options = [];
    if (includeAll) options.push(`<option value="all">${A.t('reportAllLanguages')}</option>`);
    for (const code of A.supportedLanguages) {
      options.push(`<option value="${A.esc(code)}">${A.esc(A.languageName(code))}</option>`);
    }
    return options.join('');
  }

  function dialogMarkup() {
    return `
      <dialog id="report-dialog" class="aml-dialog">
        <form id="report-form" class="dialog-card" method="dialog">
          <div class="dialog-head">
            <div>
              <span class="dialog-kicker">Aniimo Lab</span>
              <h2>${A.t('reportTitle')}</h2>
            </div>
            <button class="dialog-close" type="button" data-close-dialog="report-dialog" aria-label="${A.esc(A.t('close'))}">×</button>
          </div>

          <div class="dialog-grid">
            <label class="field-label">
              <span>${A.t('reportObject')}</span>
              <select id="report-object" class="select" required>
                <option value="data_issue">${A.t('reportDataIssue')}</option>
                <option value="other">${A.t('reportOther')}</option>
              </select>
            </label>

            <label class="field-label">
              <span>${A.t('reportLanguage')}</span>
              <select id="report-language" class="select" required>
                ${languageOptions(true)}
              </select>
            </label>
          </div>

          <label class="field-label">
            <span>${A.t('reportDescription')}</span>
            <textarea id="report-description" rows="7" maxlength="3000" placeholder="${A.esc(A.t('reportDescriptionHint'))}" required></textarea>
          </label>

          <label class="field-label file-field">
            <span>${A.t('reportScreenshots')}</span>
            <input id="report-screenshots" type="file" accept="image/png,image/jpeg,image/webp" multiple>
            <small>${A.t('reportScreenshotsHint')}</small>
          </label>

          <div id="report-status" class="dialog-status"></div>

          <div class="dialog-actions">
            <button class="actionbtn" type="button" data-close-dialog="report-dialog">${A.t('cancel')}</button>
            <button id="report-submit" class="actionbtn primary" type="submit">${A.t('reportSend')}</button>
          </div>
        </form>
      </dialog>

      <dialog id="translation-dialog" class="aml-dialog">
        <form id="translation-form" class="dialog-card" method="dialog">
          <div class="dialog-head">
            <div>
              <span class="dialog-kicker">Aniimo Lab</span>
              <h2>${A.t('translationProposalTitle')}</h2>
            </div>
            <button class="dialog-close" type="button" data-close-dialog="translation-dialog" aria-label="${A.esc(A.t('close'))}">×</button>
          </div>

          <label class="field-label">
            <span>${A.t('translationLanguage')}</span>
            <input id="translation-language" list="translation-language-list" maxlength="80" placeholder="${A.esc(A.t('translationLanguagePlaceholder'))}" required>
            <datalist id="translation-language-list">
              <option value="Español"></option>
              <option value="Deutsch"></option>
              <option value="Italiano"></option>
              <option value="Português"></option>
              <option value="Nederlands"></option>
              <option value="Polski"></option>
              <option value="Türkçe"></option>
              <option value="Русский"></option>
              <option value="Українська"></option>
              <option value="日本語"></option>
              <option value="한국어"></option>
              <option value="中文"></option>
              <option value="العربية"></option>
            </datalist>
          </label>

          <div class="translation-template-box">
            <div>
              <strong>${A.t('translationTemplate')}</strong>
              <small>${A.t('translationTemplateHint')}</small>
            </div>
            <a class="actionbtn" href="assets/downloads/Aniimo_Lab_translation_template.xlsx" download>${A.t('downloadTemplate')}</a>
          </div>

          <label class="field-label file-field">
            <span>${A.t('translationUpload')}</span>
            <input id="translation-file" type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" required>
          </label>

          <label class="field-label">
            <span>${A.t('translationNotes')}</span>
            <textarea id="translation-notes" rows="4" maxlength="1500" placeholder="${A.esc(A.t('translationNotesHint'))}"></textarea>
          </label>

          <div id="translation-status" class="dialog-status"></div>

          <div class="dialog-actions">
            <button class="actionbtn" type="button" data-close-dialog="translation-dialog">${A.t('cancel')}</button>
            <button id="translation-submit" class="actionbtn primary" type="submit">${A.t('translationSubmit')}</button>
          </div>
        </form>
      </dialog>
    `;
  }

  function setStatus(id, text, kind = '') {
    const root = document.getElementById(id);
    if (!root) return;
    root.className = `dialog-status ${kind}`.trim();
    root.textContent = text;
  }

  function openDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function closeDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  async function submitReport(event) {
    event.preventDefault();
    const submit = document.getElementById('report-submit');
    const files = [...document.getElementById('report-screenshots').files];
    const description = document.getElementById('report-description').value.trim();

    if (!remote) {
      setStatus('report-status', A.t('reportNeedsBackend'), 'error');
      return;
    }
    if (!description) return;
    if (files.length > maxScreenshots || files.some(file => file.size > maxScreenshotBytes)) {
      setStatus('report-status', A.t('reportFileLimit'), 'error');
      return;
    }

    submit.disabled = true;
    setStatus('report-status', A.t('reportSending'));
    try {
      const screenshotPaths = [];
      for (const file of files) screenshotPaths.push(await uploadFile(file, 'reports'));

      await insertRow('site_reports', {
        category: document.getElementById('report-object').value,
        language: document.getElementById('report-language').value,
        description,
        screenshot_paths: screenshotPaths,
        page_path: `${location.pathname}${location.search}`,
        ui_language: A.lang
      });

      event.currentTarget.reset();
      setStatus('report-status', A.t('reportSent'), 'success');
      setTimeout(() => closeDialog('report-dialog'), 1000);
    } catch {
      setStatus('report-status', A.t('feedbackSendError'), 'error');
    } finally {
      submit.disabled = false;
    }
  }

  async function submitTranslation(event) {
    event.preventDefault();
    const submit = document.getElementById('translation-submit');
    const language = document.getElementById('translation-language').value.trim();
    const file = document.getElementById('translation-file').files[0];

    if (!remote) {
      setStatus('translation-status', A.t('translationNeedsBackend'), 'error');
      return;
    }
    if (!language || !file) {
      setStatus('translation-status', A.t('translationFileRequired'), 'error');
      return;
    }
    if (file.size > maxTranslationBytes) {
      setStatus('translation-status', A.t('translationFileTooLarge'), 'error');
      return;
    }

    submit.disabled = true;
    setStatus('translation-status', A.t('translationSending'));
    try {
      const filePath = await uploadFile(file, 'translations');
      await insertRow('translation_proposals', {
        language,
        notes: document.getElementById('translation-notes').value.trim(),
        file_path: filePath,
        page_path: `${location.pathname}${location.search}`,
        ui_language: A.lang
      });

      event.currentTarget.reset();
      setStatus('translation-status', A.t('translationSent'), 'success');
      setTimeout(() => closeDialog('translation-dialog'), 1000);
    } catch {
      setStatus('translation-status', A.t('feedbackSendError'), 'error');
    } finally {
      submit.disabled = false;
    }
  }

  document.body.insertAdjacentHTML('beforeend', dialogMarkup());

  document.getElementById('open-report')?.addEventListener('click', () => openDialog('report-dialog'));
  document.getElementById('open-translation-proposal')?.addEventListener('click', () => openDialog('translation-dialog'));
  document.querySelectorAll('[data-close-dialog]').forEach(button => {
    button.addEventListener('click', () => closeDialog(button.dataset.closeDialog));
  });
  document.getElementById('report-form')?.addEventListener('submit', submitReport);
  document.getElementById('translation-form')?.addEventListener('submit', submitTranslation);

  document.querySelectorAll('.aml-dialog').forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target === dialog) closeDialog(dialog.id);
    });
  });
})();
