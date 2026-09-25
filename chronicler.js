/**
 * Kith & Kin - The Guild Chronicler (End-of-Night Recap & Discord Exporter)
 * Orchestrates AI and rule-based narrative generation for M+ events.
 */

(function () {
  let currentRecapMarkdown = '';
  let currentTone = 'xalatath';
  let isLoading = false;

  // Simple Markdown to HTML formatter for the modal preview
  function renderMarkdownToHtml(md) {
    if (!md) return '<p class="text-muted">No chronicle written yet.</p>';

    // Escape raw HTML except for what we generate
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h4 class="recap-h4">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 class="recap-h3">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 class="recap-h2">$1</h2>');

    // Blockquotes
    html = html.replace(/^&gt; (.*$)/gim, '<blockquote class="recap-quote">$1</blockquote>');

    // Bold & Italics
    html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

    // Unordered lists
    html = html.replace(/^\• (.*$)/gim, '<li class="recap-li">$1</li>');
    html = html.replace(/^\* (.*$)/gim, '<li class="recap-li">$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li class="recap-li">$1</li>');

    // Wrap list items
    html = html.replace(/(<li class="recap-li">.*<\/li>(\n|.)*?)(?=(<h|<blockquote|<p|$))/gim, '<ul class="recap-ul">$1</ul>');

    // Paragraphs / Newlines
    const paragraphs = html.split(/\n\n+/);
    html = paragraphs.map(p => {
      p = p.trim();
      if (!p) return '';
      if (p.startsWith('<h') || p.startsWith('<blockquote') || p.startsWith('<ul') || p.startsWith('<li')) {
        return p;
      }
      return `<p class="recap-p">${p.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return html;
  }

  // Open the chronicler modal and generate or display recap
  async function openChroniclerModal(forceRefresh = false) {
    const modal = document.getElementById('chroniclerModal');
    if (!modal) return;

    modal.classList.add('is-open');

    const toneSelect = document.getElementById('chroniclerToneSelect');
    if (toneSelect) {
      currentTone = toneSelect.value || 'xalatath';
    }

    const keyInput = document.getElementById('chroniclerGeminiKeyInput');
    const storedKey = localStorage.getItem('kk_gemini_key') || '';
    if (keyInput && !keyInput.value && storedKey) {
      keyInput.value = storedKey;
    }

    if (!currentRecapMarkdown || forceRefresh) {
      await generateRecap();
    }
  }

  function closeChroniclerModal() {
    const modal = document.getElementById('chroniclerModal');
    if (modal) {
      modal.classList.remove('is-open');
    }
  }

  async function generateRecap() {
    if (isLoading) return;
    isLoading = true;

    const contentBox = document.getElementById('chroniclerContentBox');
    const generatorBadge = document.getElementById('chroniclerGeneratorBadge');
    const generateBtn = document.getElementById('chroniclerGenerateBtn');
    const copyBtn = document.getElementById('chroniclerCopyBtn');

    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.innerHTML = '✨ Chronicling...';
    }
    if (copyBtn) {
      copyBtn.disabled = true;
    }

    if (contentBox) {
      contentBox.innerHTML = `
        <div class="chronicler-loading-state">
          <div class="chronicler-spinner">📜</div>
          <h4>The Chronicler is drafting tonight's annals...</h4>
          <p class="text-muted">Reviewing battle logs, key timers, party compositions, and heroic deeds.</p>
        </div>
      `;
    }

    if (generatorBadge) {
      generatorBadge.textContent = 'Gathering records...';
      generatorBadge.className = 'chronicler-badge badge-neutral';
    }

    const keyInput = document.getElementById('chroniclerGeminiKeyInput');
    const geminiKey = keyInput ? keyInput.value.trim() : (localStorage.getItem('kk_gemini_key') || '');
    if (keyInput && keyInput.value.trim()) {
      localStorage.setItem('kk_gemini_key', keyInput.value.trim());
    }

    let officerKey = '';
    try { officerKey = sessionStorage.getItem('kk_officer_key') || ''; } catch (e) {}
    if (!officerKey && typeof window.promptOfficerUnlock === 'function') {
      await window.promptOfficerUnlock();
      try { officerKey = sessionStorage.getItem('kk_officer_key') || ''; } catch (e) {}
    }

    try {
      const response = await fetch('/api/chronicler-recap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(officerKey ? { 'x-sync-secret': officerKey } : {}),
          ...(geminiKey ? { 'x-gemini-key': geminiKey } : {})
        },
        body: JSON.stringify({ tone: currentTone })
      });

      if (response.status === 401) {
        throw new Error('Officer passphrase required to write the chronicle.');
      }
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      currentRecapMarkdown = data.recap || '*(No narrative returned)*';

      if (contentBox) {
        contentBox.innerHTML = renderMarkdownToHtml(currentRecapMarkdown);
      }

      if (generatorBadge) {
        if (data.generator && data.generator.toLowerCase().includes('gemini')) {
          generatorBadge.textContent = `✨ Powered by ${data.generator.replace(/-/g, ' ').toUpperCase()}`;
          generatorBadge.className = 'chronicler-badge badge-gemini';
        } else if (data.generator === 'openai-mini') {
          generatorBadge.textContent = '✨ Powered by GPT-4o Mini';
          generatorBadge.className = 'chronicler-badge badge-openai';
        } else {
          generatorBadge.textContent = '📜 Guild Chronicler (Rule-Based)';
          generatorBadge.className = 'chronicler-badge badge-rule';
        }
      }

      if (copyBtn) copyBtn.disabled = false;
    } catch (err) {
      console.error('[chronicler] Generation failed:', err);
      if (contentBox) {
        contentBox.innerHTML = `
          <div class="recap-error">
            <p>⚠️ Failed to draft the chronicle: <strong>${err.message}</strong></p>
            <button type="button" class="btn btn-sm btn-secondary" onclick="window.generateRecap()">Try Again</button>
          </div>
        `;
      }
      if (generatorBadge) {
        generatorBadge.textContent = 'Generation Failed';
        generatorBadge.className = 'chronicler-badge badge-error';
      }
    } finally {
      isLoading = false;
      if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '✨ Re-Chronicle';
      }
    }
  }

  async function copyDiscordMarkdown() {
    if (!currentRecapMarkdown) return;

    const copyBtn = document.getElementById('chroniclerCopyBtn');
    try {
      await navigator.clipboard.writeText(currentRecapMarkdown);

      if (copyBtn) {
        const oldHtml = copyBtn.innerHTML;
        copyBtn.innerHTML = '✓ Copied to Clipboard!';
        copyBtn.classList.add('btn-success');
        setTimeout(() => {
          copyBtn.innerHTML = oldHtml;
          copyBtn.classList.remove('btn-success');
        }, 2500);
      }

      if (typeof window.showToast === 'function') {
        window.showToast('📋 Guild recap copied! Ready to paste into Discord.');
      }
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      alert('Could not copy automatically. You can manually copy the text from the preview.');
    }
  }

  // Initialize listeners
  function initChronicler() {
    const toneSelect = document.getElementById('chroniclerToneSelect');
    if (toneSelect) {
      toneSelect.addEventListener('change', (e) => {
        currentTone = e.target.value;
        generateRecap();
      });
    }

    const generateBtn = document.getElementById('chroniclerGenerateBtn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => generateRecap());
    }

    const copyBtn = document.getElementById('chroniclerCopyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', copyDiscordMarkdown);
    }

    const closeBtn1 = document.getElementById('closeChroniclerBtn');
    const closeBtn2 = document.getElementById('closeChroniclerBtn2');
    if (closeBtn1) closeBtn1.addEventListener('click', closeChroniclerModal);
    if (closeBtn2) closeBtn2.addEventListener('click', closeChroniclerModal);

    const triggerBtn = document.getElementById('chroniclerRecapBtn');
    if (triggerBtn) {
      triggerBtn.addEventListener('click', () => openChroniclerModal(false));
    }

    const playerTriggerBtn = document.getElementById('playerChroniclerRecapBtn');
    if (playerTriggerBtn) {
      playerTriggerBtn.addEventListener('click', () => openChroniclerModal(false));
    }

    // Toggle advanced settings (API key)
    const toggleKeyBtn = document.getElementById('chroniclerToggleKeyBtn');
    const keyWrap = document.getElementById('chroniclerKeyWrap');
    if (toggleKeyBtn && keyWrap) {
      toggleKeyBtn.addEventListener('click', () => {
        const isHidden = keyWrap.style.display === 'none';
        keyWrap.style.display = isHidden ? 'block' : 'none';
        toggleKeyBtn.textContent = isHidden ? '🔑 Hide API Key' : '🔑 Custom Gemini Key';
      });
    }
  }

  // Export functions to window
  window.openChroniclerModal = openChroniclerModal;
  window.closeChroniclerModal = closeChroniclerModal;
  window.generateRecap = generateRecap;
  window.copyDiscordMarkdown = copyDiscordMarkdown;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChronicler);
  } else {
    initChronicler();
  }
})();
