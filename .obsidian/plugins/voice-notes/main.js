/*
 * Voice Notes — Obsidian Community Plugin
 * Uses the Web Speech API to transcribe voice in real-time
 * and saves the result as a markdown note.
 */

'use strict';

const { Plugin, Modal, Setting, PluginSettingTab, Notice, moment } = require('obsidian');

// ─────────────────────────────────────────────
// Default settings
// ─────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  saveFolder: '04 - Notes/Voice Notes',
  language: 'en-US',
  autoOpen: true,
  filenameTemplate: 'Voice Note - YYYY-MM-DD HH-mm',
  addTags: true,
};

// ─────────────────────────────────────────────
// Helper: pad number
// ─────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

function getNow() {
  const d = new Date();
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}-${pad(d.getMinutes())}`,
    iso:  d.toISOString(),
    display: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

// ─────────────────────────────────────────────
// Recording Modal
// ─────────────────────────────────────────────
class VoiceRecordingModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.recognition = null;
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.isRecording = false;
    this.timerInterval = null;
    this.elapsed = 0;
    this.startedAt = null;
    this.modalEl.addClass('voice-notes-modal');
  }

  onOpen() {
    this.buildUI();
    this.startRecording();
  }

  onClose() {
    this.stopRecording();
    clearInterval(this.timerInterval);
    document.body.removeClass('voice-notes-recording');
  }

  // ── Build the modal DOM ──────────────────────
  buildUI() {
    const { contentEl } = this;
    contentEl.empty();

    // Header
    const header = contentEl.createDiv('vn-header');
    header.createDiv('vn-header-icon').setText('🎤');
    const ht = header.createDiv('vn-header-text');
    ht.createEl('h2', { text: 'Voice Notes' });
    ht.createEl('p', { text: 'Speak clearly — your words will be transcribed below.' });

    // Status bar
    this.statusBar = contentEl.createDiv('vn-status');
    this.statusDot = this.statusBar.createDiv('vn-status-dot');
    this.statusLabel = this.statusBar.createEl('span', { cls: 'vn-status-label', text: 'Initializing…' });
    this.timerEl = this.statusBar.createEl('span', { cls: 'vn-timer', text: '00:00' });

    // Waveform
    this.waveformEl = contentEl.createDiv('vn-waveform');
    for (let i = 0; i < 12; i++) {
      const bar = this.waveformEl.createDiv('vn-bar');
      bar.style.height = '6px';
    }

    // Transcript
    const wrap = contentEl.createDiv('vn-transcript-wrap');
    wrap.createDiv('vn-transcript-label').setText('Transcript');
    this.transcriptEl = wrap.createDiv('vn-transcript');
    this.placeholderEl = this.transcriptEl.createEl('span', {
      cls: 'vn-transcript-placeholder',
      text: 'Start speaking…',
    });

    // Settings row (language)
    const settingsRow = contentEl.createDiv('vn-settings-row');
    const langItem = settingsRow.createDiv('vn-setting-item');
    langItem.createEl('span', { text: '🌐 Language:' });
    this.langSelect = langItem.createEl('select');
    const langs = [
      ['en-US', 'English (US)'],
      ['en-GB', 'English (UK)'],
      ['es-ES', 'Spanish'],
      ['fr-FR', 'French'],
      ['de-DE', 'German'],
      ['pt-BR', 'Portuguese (BR)'],
      ['ja-JP', 'Japanese'],
      ['zh-CN', 'Chinese (Simplified)'],
      ['hi-IN', 'Hindi'],
      ['ar-SA', 'Arabic'],
    ];
    langs.forEach(([val, label]) => {
      const opt = this.langSelect.createEl('option', { value: val, text: label });
      if (val === this.plugin.settings.language) opt.selected = true;
    });
    this.langSelect.addEventListener('change', () => {
      this.plugin.settings.language = this.langSelect.value;
      this.plugin.saveSettings();
      if (this.isRecording) this.restartRecognition();
    });

    // Saved banner
    this.savedBanner = contentEl.createDiv('vn-saved-banner');
    this.savedBanner.createEl('span', { text: '✅' });
    this.savedBannerText = this.savedBanner.createEl('span', { text: 'Note saved!' });

    // Action buttons
    const actions = contentEl.createDiv('vn-actions');

    this.cancelBtn = actions.createEl('button', { cls: 'vn-btn vn-btn-cancel', text: 'Cancel' });
    this.cancelBtn.addEventListener('click', () => this.close());

    this.recordBtn = actions.createEl('button', { cls: 'vn-btn vn-btn-record is-recording' });
    this.recordBtn.createEl('span', { text: '⏹' });
    this.recordBtn.createEl('span', { text: ' Stop' });
    this.recordBtn.addEventListener('click', () => this.toggleRecording());

    this.saveBtn = actions.createEl('button', { cls: 'vn-btn vn-btn-save', text: '💾 Save Note' });
    this.saveBtn.disabled = true;
    this.saveBtn.addEventListener('click', () => this.saveNote());
  }

  // ── Timer ────────────────────────────────────
  startTimer() {
    this.elapsed = 0;
    this.timerEl.setText('00:00');
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.elapsed++;
      this.timerEl.setText(formatDuration(this.elapsed));
    }, 1000);
  }

  // ── Web Speech API ───────────────────────────
  initRecognition() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.setStatus('error', '❌ Speech API not supported');
      new Notice('Voice Notes: Your Obsidian version does not support the Web Speech API.', 6000);
      return null;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = this.plugin.settings.language;

    rec.onstart = () => {
      this.isRecording = true;
      this.setStatus('recording', '● Recording');
      this.waveformEl.addClass('active');
      document.body.addClass('voice-notes-recording');
    };

    rec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          this.finalTranscript += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      this.interimTranscript = interim;
      this.renderTranscript();
    };

    rec.onerror = (event) => {
      if (event.error === 'no-speech') return; // benign, just keep going
      if (event.error === 'aborted')  return;
      console.error('[VoiceNotes] Speech recognition error:', event.error);
      this.setStatus('error', `⚠️ Error: ${event.error}`);
    };

    rec.onend = () => {
      // Auto-restart if we're still supposed to be recording
      if (this.isRecording) {
        try { rec.start(); } catch(e) { /* already started */ }
      } else {
        this.waveformEl.removeClass('active');
        document.body.removeClass('voice-notes-recording');
      }
    };

    return rec;
  }

  startRecording() {
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.recognition = this.initRecognition();
    if (!this.recognition) return;
    this.startedAt = getNow();
    this.startTimer();
    try {
      this.recognition.start();
    } catch(e) {
      console.error('[VoiceNotes] Could not start recognition:', e);
    }
  }

  stopRecording() {
    this.isRecording = false;
    clearInterval(this.timerInterval);
    if (this.recognition) {
      try { this.recognition.stop(); } catch(e) {}
      this.recognition = null;
    }
    this.waveformEl.removeClass('active');
    document.body.removeClass('voice-notes-recording');
    this.setStatus('paused', '⏸ Stopped');

    // Update record button
    this.recordBtn.empty();
    this.recordBtn.createEl('span', { text: '🔴' });
    this.recordBtn.createEl('span', { text: ' Record Again' });
    this.recordBtn.removeClass('is-recording');

    // Enable save if there's something to save
    const hasContent = this.finalTranscript.trim().length > 0;
    this.saveBtn.disabled = !hasContent;
    if (!hasContent) {
      this.setStatus('paused', '⏸ Nothing transcribed yet');
    }
  }

  toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      // Restart
      this.recognition = this.initRecognition();
      if (!this.recognition) return;
      this.isRecording = true;
      this.startTimer();
      this.recordBtn.empty();
      this.recordBtn.createEl('span', { text: '⏹' });
      this.recordBtn.createEl('span', { text: ' Stop' });
      this.recordBtn.addClass('is-recording');
      try { this.recognition.start(); } catch(e) {}
    }
  }

  restartRecognition() {
    if (this.recognition) {
      try { this.recognition.stop(); } catch(e) {}
    }
    this.recognition = this.initRecognition();
    if (this.recognition && this.isRecording) {
      try { this.recognition.start(); } catch(e) {}
    }
  }

  // ── Render transcript ─────────────────────────
  renderTranscript() {
    this.transcriptEl.empty();
    const combined = this.finalTranscript + this.interimTranscript;
    if (!combined.trim()) {
      this.transcriptEl.createEl('span', {
        cls: 'vn-transcript-placeholder',
        text: 'Start speaking…',
      });
      this.saveBtn.disabled = true;
      return;
    }
    if (this.finalTranscript.trim()) {
      this.transcriptEl.createEl('span', { text: this.finalTranscript });
    }
    if (this.interimTranscript) {
      this.transcriptEl.createEl('span', {
        cls: 'vn-transcript-interim',
        text: this.interimTranscript,
      });
    }
    // Enable save if there's final content
    this.saveBtn.disabled = this.finalTranscript.trim().length === 0;
    // Auto-scroll to bottom
    this.transcriptEl.scrollTop = this.transcriptEl.scrollHeight;
  }

  // ── Status helpers ────────────────────────────
  setStatus(type, text) {
    this.statusLabel.setText(text);
    this.statusDot.className = 'vn-status-dot';
    if (type === 'recording') this.statusDot.addClass('recording');
    if (type === 'paused')    this.statusDot.addClass('paused');
    if (type === 'saved')     this.statusDot.addClass('saved');
  }

  // ── Save note ────────────────────────────────
  async saveNote() {
    const transcript = this.finalTranscript.trim();
    if (!transcript) {
      new Notice('Nothing to save — speak first!');
      return;
    }

    // Stop any active recording first
    if (this.isRecording) this.stopRecording();

    const ts = this.startedAt || getNow();
    const duration = formatDuration(this.elapsed);

    // Build filename
    const filename = `Voice Note - ${ts.date} ${ts.time}.md`;
    const folder = this.plugin.settings.saveFolder;
    const filepath = `${folder}/${filename}`;

    // Build note content
    const wordCount = transcript.split(/\s+/).filter(Boolean).length;
    const tags = this.plugin.settings.addTags ? 'tags:\n  - voice-note' : '';
    const content = [
      '---',
      `created: "${ts.display}"`,
      `source: voice`,
      `duration: "${duration}"`,
      `words: ${wordCount}`,
      tags,
      '---',
      '',
      `# 🎤 Voice Note — ${ts.display}`,
      '',
      transcript,
      '',
      '---',
      `*Recorded via Voice Notes plugin · Duration: ${duration} · ${wordCount} words*`,
    ].join('\n');

    try {
      // Ensure folder exists
      const folderExists = this.app.vault.getAbstractFileByPath(folder);
      if (!folderExists) {
        await this.app.vault.createFolder(folder);
      }

      // Check if file already exists (collision guard)
      let finalPath = filepath;
      let counter = 1;
      while (this.app.vault.getAbstractFileByPath(finalPath)) {
        finalPath = `${folder}/Voice Note - ${ts.date} ${ts.time} (${counter}).md`;
        counter++;
      }

      const file = await this.app.vault.create(finalPath, content);

      // Show saved banner
      this.setStatus('saved', '✅ Saved!');
      this.savedBannerText.setText(`Saved to ${finalPath}`);
      this.savedBanner.addClass('visible');
      this.saveBtn.disabled = true;
      this.cancelBtn.setText('Close');

      new Notice(`🎤 Voice note saved!`, 3000);

      // Auto-open if configured
      if (this.plugin.settings.autoOpen) {
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(file);
        this.close();
      }

    } catch(err) {
      console.error('[VoiceNotes] Failed to save note:', err);
      new Notice(`Voice Notes: Failed to save — ${err.message}`, 5000);
    }
  }
}

// ─────────────────────────────────────────────
// Settings Tab
// ─────────────────────────────────────────────
class VoiceNotesSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    const hdr = containerEl.createDiv('vn-settings-header');
    hdr.createEl('span', { cls: 'vn-icon', text: '🎤' });
    hdr.createEl('h2', { text: 'Voice Notes Settings' });

    new Setting(containerEl)
      .setName('Save folder')
      .setDesc('Folder where voice notes will be saved (relative to vault root).')
      .addText(text => text
        .setPlaceholder('04 - Notes/Voice Notes')
        .setValue(this.plugin.settings.saveFolder)
        .onChange(async (value) => {
          this.plugin.settings.saveFolder = value.trim() || DEFAULT_SETTINGS.saveFolder;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Default language')
      .setDesc('Language used for speech recognition.')
      .addDropdown(drop => {
        const langs = {
          'en-US': 'English (US)',
          'en-GB': 'English (UK)',
          'es-ES': 'Spanish',
          'fr-FR': 'French',
          'de-DE': 'German',
          'pt-BR': 'Portuguese (BR)',
          'ja-JP': 'Japanese',
          'zh-CN': 'Chinese (Simplified)',
          'hi-IN': 'Hindi',
          'ar-SA': 'Arabic',
        };
        Object.entries(langs).forEach(([val, label]) => drop.addOption(val, label));
        drop.setValue(this.plugin.settings.language);
        drop.onChange(async (value) => {
          this.plugin.settings.language = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Auto-open after saving')
      .setDesc('Automatically open the saved note when you click "Save Note".')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoOpen)
        .onChange(async (value) => {
          this.plugin.settings.autoOpen = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Add voice-note tag')
      .setDesc('Automatically add the "voice-note" tag to saved notes.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.addTags)
        .onChange(async (value) => {
          this.plugin.settings.addTags = value;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl('hr');

    new Setting(containerEl)
      .setName('How to use')
      .setDesc(createFragment(frag => {
        frag.appendText('Click the 🎤 icon in the left ribbon, or open the Command Palette (Ctrl+P) and search for ');
        frag.createEl('strong', { text: 'Voice Notes: Start Recording' });
        frag.appendText('. You can also bind a custom hotkey in Settings → Hotkeys.');
      }));
  }
}

// ─────────────────────────────────────────────
// Main Plugin Class
// ─────────────────────────────────────────────
class VoiceNotesPlugin extends Plugin {
  async onload() {
    console.log('[VoiceNotes] Loading Voice Notes plugin');
    await this.loadSettings();

    // Load styles
    this.registerStyles();

    // Ribbon icon
    this.addRibbonIcon('microphone', 'Voice Notes', () => {
      new VoiceRecordingModal(this.app, this).open();
    });

    // Command
    this.addCommand({
      id: 'start-recording',
      name: 'Start Recording',
      callback: () => {
        new VoiceRecordingModal(this.app, this).open();
      },
    });

    // Settings tab
    this.addSettingTab(new VoiceNotesSettingTab(this.app, this));

    console.log('[VoiceNotes] Voice Notes plugin loaded ✓');
  }

  onunload() {
    console.log('[VoiceNotes] Voice Notes plugin unloaded');
  }

  registerStyles() {
    // Inject styles.css via a <style> tag since Obsidian loads plugin CSS automatically
    // when `styles.css` is present in the plugin folder (Obsidian ≥ 0.9.x)
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

module.exports = VoiceNotesPlugin;
