/**
 * YouTube Quick Speed — Quick Notes
 * Redesigned: unified panel, live composer, animated note cards,
 * inline edit/delete, kbd shortcuts, active-timestamp tracking,
 * export popover, toast feedback.
 */

class TimestampNotes {
   constructor() {
      this.isEnabled = false;
      this.currentVideoId = null;
      this.currentVideoTitle = null;
      this.notes = {};
      this.bookmarks = {};
      this.floatingBtn = null;
      this.panel = null;
      this.overlay = null;

      // Composer state
      this._pendingTags = [];       // tags added in the composer before saving
      this._pauseEnabled = false;   // "pause while typing" toggle
      this._wasPlaying = false;
      this._draftKey = null;        // storage key for draft text

      // Active-timestamp tracking
      this._tsTrackInterval = null;

      // Export popover open?
      this._exportOpen = false;

      this.init();
   }

   // ═══════════════════════════════════════════════════════════════
   // Bootstrap
   // ═══════════════════════════════════════════════════════════════

   init() {
      if (document.readyState === "loading") {
         document.addEventListener("DOMContentLoaded", () => this.initNotes());
      } else {
         this.initNotes();
      }
      this.observeNavigation();
   }

   initNotes() {
      chrome.storage.local.get(["videoNotes", "videoBookmarks", "notesEnabled", "pauseWhileTyping"], (result) => {
         this.notes = result.videoNotes || {};
         this.bookmarks = result.videoBookmarks || {};
         this._pauseEnabled = result.pauseWhileTyping || false;
         const isEnabled = result.notesEnabled || false;

         if (isEnabled && this.isYouTubeWatch()) {
            setTimeout(() => this.enable(), 1000);
         }
      });
   }

   isYouTubeWatch() {
      return window.location.href.includes("youtube.com/watch");
   }

   getVideoId() {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("v");
   }

   getVideoTitle() {
      const el = document.querySelector("h1.ytd-watch-metadata yt-formatted-string");
      return el ? el.textContent.trim() : "YouTube Video";
   }

   getCurrentTime() {
      const video = document.querySelector("video");
      return video ? Math.floor(video.currentTime) : 0;
   }

   formatTime(seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      if (h > 0) {
         return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
      }
      return `${m}:${s.toString().padStart(2, "0")}`;
   }

   // ═══════════════════════════════════════════════════════════════
   // Enable / Disable
   // ═══════════════════════════════════════════════════════════════

   enable() {
      if (!this.isYouTubeWatch()) return;

      this.isEnabled = true;
      this.currentVideoId = this.getVideoId();
      this.currentVideoTitle = this.getVideoTitle();
      this._draftKey = `draft_${this.currentVideoId}`;

      this.injectUI();
      this.setupEventListeners();
      this.startTimestampTrack();

      chrome.storage.local.set({ notesEnabled: true });
   }

   disable() {
      this.isEnabled = false;
      this.stopTimestampTrack();
      this.removeUI();
      chrome.storage.local.set({ notesEnabled: false });
   }

   // ═══════════════════════════════════════════════════════════════
   // UI Injection
   // ═══════════════════════════════════════════════════════════════

   injectUI() {
      if (this.floatingBtn || this.panel) return;
      this.injectStyles();
      this.createFloatingButton();
      this.createPanel();
   }

   injectStyles() {
      if (document.getElementById("yqs-notes-styles")) return;
      const link = document.createElement("link");
      link.id = "yqs-notes-styles";
      link.rel = "stylesheet";
      link.href = chrome.runtime.getURL("notes-styles.css");
      document.head.appendChild(link);
   }

   createFloatingButton() {
      this.floatingBtn = document.createElement("button");
      this.floatingBtn.id = "yqs-floating-note-btn";
      this.floatingBtn.title = "Quick Notes";
      this.floatingBtn.innerHTML = `
         <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
         </svg>`;
      document.body.appendChild(this.floatingBtn);
   }

   createPanel() {
      // Overlay
      this.overlay = document.createElement("div");
      this.overlay.id = "yqs-panel-overlay";
      document.body.appendChild(this.overlay);

      // Panel
      this.panel = document.createElement("div");
      this.panel.id = "yqs-notes-panel";
      this.panel.innerHTML = this._panelHTML();
      document.body.appendChild(this.panel);

      // Start timestamp interval
      this._composerTsInterval = setInterval(() => this._refreshComposerTimestamp(), 1000);

      // Restore draft
      this._restoreDraft();

      // Render existing notes
      this.renderNotes();
      this.renderProgressMarkers();
   }

   _panelHTML() {
      const truncatedTitle = this.currentVideoTitle.length > 34
         ? this.currentVideoTitle.slice(0, 32) + "…"
         : this.currentVideoTitle;

      return `
      <!-- HEADER -->
      <div class="yqs-panel-header">
         <div class="yqs-header-left">
            <div class="yqs-header-title">
               <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
               </svg>
               <span>Quick Notes</span>
            </div>
            <div class="yqs-header-subtitle" id="yqs-video-title-sub">${this.escapeHtml(truncatedTitle)}</div>
         </div>
         <div class="yqs-header-actions">
            <button class="yqs-icon-btn" id="yqs-close-panel" aria-label="Close panel">
               <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
               </svg>
            </button>
         </div>
      </div>

      <!-- COMPOSER -->
      <div class="yqs-composer">
         <div class="yqs-composer-timestamp">
            <button class="yqs-ts-badge" id="yqs-ts-badge" aria-label="Current timestamp">
               <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
               </svg>
               <span id="yqs-current-time">0:00</span>
            </button>
            <button class="yqs-pause-toggle" id="yqs-pause-toggle" aria-label="Toggle pause while typing">
               <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
               </svg>
               <span id="yqs-pause-label">pause while writing</span>
            </button>
         </div>

         <textarea
            id="yqs-note-input"
            class="yqs-note-textarea"
            placeholder="Write something worth remembering at this moment…"
            rows="3"
            aria-label="Write a note at current timestamp"
         ></textarea>

         <div class="yqs-composer-footer">
            <div class="yqs-tags-row" id="yqs-tags-row">
               <button class="yqs-add-tag-btn" id="yqs-add-tag-btn" aria-label="Add a tag">
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
                     <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/>
                  </svg>
                  # tag this moment
               </button>
            </div>
            <button class="yqs-save-btn" id="yqs-save-note" aria-label="Save note (Enter)">
               <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
               </svg>
               ↵ Save
            </button>
         </div>
      </div>

      <!-- SECTION DIVIDER -->
      <div class="yqs-section-divider" id="yqs-section-divider">
         <div class="yqs-divider-line"></div>
         <span class="yqs-divider-label" id="yqs-divider-label">notes</span>
         <div class="yqs-divider-line"></div>
      </div>

      <!-- NOTES LIST -->
      <div class="yqs-notes-list-wrap" id="yqs-notes-list-wrap">
         <div class="yqs-notes-inner" id="yqs-notes-list"></div>
      </div>

      <!-- FOOTER -->
      <div class="yqs-panel-footer">
         <button class="yqs-footer-btn" id="yqs-copy-all-btn" aria-label="Copy all notes">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
               <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
            Copy all
         </button>
         <button class="yqs-footer-btn" id="yqs-export-btn" aria-label="Export notes">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
               <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"/>
            </svg>
            ↓ Export
            <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
               <path d="M7 10l5 5 5-5z"/>
            </svg>
         </button>

         <!-- Export Popover -->
         <div class="yqs-export-popover" id="yqs-export-popover" role="menu">
            <button class="yqs-export-item" data-format="txt" role="menuitem">
               <span class="yqs-export-icon">📄</span> Export as .txt
            </button>
            <button class="yqs-export-item" data-format="md" role="menuitem">
               <span class="yqs-export-icon">✍️</span> Export as Markdown
            </button>
            <button class="yqs-export-item" data-format="json" role="menuitem">
               <span class="yqs-export-icon">{}</span> Export as JSON
            </button>
         </div>
      </div>`;
   }

   // ═══════════════════════════════════════════════════════════════
   // Timestamp Composer Badge
   // ═══════════════════════════════════════════════════════════════

   _refreshComposerTimestamp() {
      const badge = document.getElementById("yqs-current-time");
      if (badge) badge.textContent = this.formatTime(this.getCurrentTime());
   }

   // ═══════════════════════════════════════════════════════════════
   // Draft restore / save
   // ═══════════════════════════════════════════════════════════════

   _restoreDraft() {
      if (!this._draftKey) return;
      chrome.storage.local.get([this._draftKey], (result) => {
         const draft = result[this._draftKey];
         if (draft) {
            const ta = document.getElementById("yqs-note-input");
            if (ta && draft.trim()) {
               ta.value = draft;
               this._showToast("Draft restored", "📝");
            }
         }
      });
   }

   _saveDraft(text) {
      if (!this._draftKey) return;
      if (text.trim()) {
         chrome.storage.local.set({ [this._draftKey]: text });
      } else {
         chrome.storage.local.remove(this._draftKey);
      }
   }

   _clearDraft() {
      if (this._draftKey) chrome.storage.local.remove(this._draftKey);
   }

   // ═══════════════════════════════════════════════════════════════
   // Tags (Composer)
   // ═══════════════════════════════════════════════════════════════

   _renderComposerTags() {
      const row = document.getElementById("yqs-tags-row");
      if (!row) return;

      // Remove existing chips (keep the add-tag-btn)
      row.querySelectorAll(".yqs-tag-chip, .yqs-tag-inline-input").forEach(el => el.remove());

      // Re-insert chips before the button
      const addBtn = document.getElementById("yqs-add-tag-btn");
      this._pendingTags.forEach((tag, idx) => {
         const chip = document.createElement("span");
         chip.className = "yqs-tag-chip";
         chip.innerHTML = `${this.escapeHtml(tag)}<button class="yqs-tag-chip-remove" aria-label="Remove tag" data-idx="${idx}">×</button>`;
         row.insertBefore(chip, addBtn);
      });

      // Remove-chip listeners
      row.querySelectorAll(".yqs-tag-chip-remove").forEach(btn => {
         btn.addEventListener("click", (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx);
            this._pendingTags.splice(idx, 1);
            this._renderComposerTags();
         });
      });
   }

   _openTagInput() {
      const row = document.getElementById("yqs-tags-row");
      const addBtn = document.getElementById("yqs-add-tag-btn");
      if (!row || !addBtn) return;

      // Prevent duplicates
      if (row.querySelector(".yqs-tag-inline-input")) return;

      const input = document.createElement("input");
      input.className = "yqs-tag-inline-input";
      input.placeholder = "tag name…";
      input.maxLength = 24;
      row.insertBefore(input, addBtn);
      input.focus();

      const commit = () => {
         const val = input.value.replace(/^#+/, "").trim();
         if (val && !this._pendingTags.includes(val)) {
            this._pendingTags.push(val);
         }
         input.remove();
         this._renderComposerTags();
      };

      input.addEventListener("keydown", (e) => {
         if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); }
         if (e.key === "Escape") { input.remove(); }
      });

      input.addEventListener("blur", commit);
   }

   // ═══════════════════════════════════════════════════════════════
   // Event Listeners
   // ═══════════════════════════════════════════════════════════════

   setupEventListeners() {
      if (!this.floatingBtn || !this.panel) return;

      // Floating button
      this.floatingBtn.addEventListener("click", () => this.togglePanel());

      // Close
      const closeBtn = document.getElementById("yqs-close-panel");
      if (closeBtn) closeBtn.addEventListener("click", () => this.closePanel());

      if (this.overlay) this.overlay.addEventListener("click", () => this.closePanel());

      // Save button
      const saveBtn = document.getElementById("yqs-save-note");
      if (saveBtn) saveBtn.addEventListener("click", () => this.saveNote());

      // Textarea — Enter saves, draft auto-saved on input
      const noteInput = document.getElementById("yqs-note-input");
      if (noteInput) {
         // Auto-resize
         noteInput.addEventListener("input", () => {
            noteInput.style.height = "auto";
            noteInput.style.height = Math.min(noteInput.scrollHeight, 200) + "px";
            this._saveDraft(noteInput.value);
         });

         noteInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
               e.preventDefault();
               this.saveNote();
            }
            if (e.key === "Escape") {
               noteInput.value = "";
               this._pendingTags = [];
               this._renderComposerTags();
               this._clearDraft();
            }
         });

         // Pause-while-typing
         noteInput.addEventListener("focus", () => {
            if (this._pauseEnabled) {
               const video = document.querySelector("video");
               if (video && !video.paused) { this._wasPlaying = true; video.pause(); }
            }
         });

         noteInput.addEventListener("blur", () => {
            if (this._pauseEnabled && this._wasPlaying) {
               const video = document.querySelector("video");
               if (video) video.play();
               this._wasPlaying = false;
            }
         });
      }

      // Pause toggle
      const pauseToggle = document.getElementById("yqs-pause-toggle");
      if (pauseToggle) {
         this._updatePauseToggleUI();
         pauseToggle.addEventListener("click", () => {
            this._pauseEnabled = !this._pauseEnabled;
            chrome.storage.local.set({ pauseWhileTyping: this._pauseEnabled });
            this._updatePauseToggleUI();
         });
      }

      // Add tag button
      const addTagBtn = document.getElementById("yqs-add-tag-btn");
      if (addTagBtn) addTagBtn.addEventListener("click", () => this._openTagInput());

      // Timestamp badge copies timestamp
      const tsBadge = document.getElementById("yqs-ts-badge");
      if (tsBadge) {
         tsBadge.addEventListener("click", () => {
            const time = this.formatTime(this.getCurrentTime());
            navigator.clipboard.writeText(time).catch(() => {});
            this._showToast(`Copied ${time}`, "⏱");
         });
      }

      // Copy all
      const copyAllBtn = document.getElementById("yqs-copy-all-btn");
      if (copyAllBtn) copyAllBtn.addEventListener("click", () => this._copyAllNotes());

      // Export button + popover
      const exportBtn = document.getElementById("yqs-export-btn");
      const exportPopover = document.getElementById("yqs-export-popover");
      if (exportBtn && exportPopover) {
         exportBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this._exportOpen = !this._exportOpen;
            exportPopover.classList.toggle("open", this._exportOpen);
         });

         exportPopover.querySelectorAll(".yqs-export-item").forEach(item => {
            item.addEventListener("click", () => {
               const fmt = item.dataset.format;
               this.exportNotes(fmt);
               this._exportOpen = false;
               exportPopover.classList.remove("open");
            });
         });

         document.addEventListener("click", () => {
            if (this._exportOpen) {
               this._exportOpen = false;
               exportPopover.classList.remove("open");
            }
         });
      }

      // Global keyboard shortcuts
      this.handleGlobalKeydown = (e) => {
         if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            this.saveNote();
         }
         if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "C") {
            this._copyAllNotes();
         }
      };
      document.addEventListener("keydown", this.handleGlobalKeydown);

      // Video metadata for markers
      const video = document.querySelector("video");
      if (video) {
         this.handleMetadataLoaded = () => {
            setTimeout(() => this.renderProgressMarkers(), 500);
         };
         video.addEventListener("loadedmetadata", this.handleMetadataLoaded);
      }
   }

   _updatePauseToggleUI() {
      const btn = document.getElementById("yqs-pause-toggle");
      if (!btn) return;
      btn.classList.toggle("active", this._pauseEnabled);
      const label = btn.querySelector("#yqs-pause-label");
      if (label) label.textContent = this._pauseEnabled ? "pause: on" : "pause while writing";
   }

   // ═══════════════════════════════════════════════════════════════
   // Panel Open / Close / Toggle
   // ═══════════════════════════════════════════════════════════════

   togglePanel() {
      if (!this.panel || !this.overlay) return;
      const isOpen = this.panel.classList.contains("visible");
      if (isOpen) {
         this.closePanel();
      } else {
         this.openPanel();
      }
   }

   openPanel() {
      if (!this.panel || !this.overlay) return;
      this.panel.classList.add("visible");
      this.overlay.classList.add("visible");

      // Auto-focus composer
      setTimeout(() => {
         const ta = document.getElementById("yqs-note-input");
         if (ta) ta.focus();
      }, 300);
   }

   closePanel() {
      if (!this.panel || !this.overlay) return;
      this.panel.classList.remove("visible");
      this.overlay.classList.remove("visible");

      if (document.activeElement && this.panel.contains(document.activeElement)) {
         document.activeElement.blur();
      }
   }

   // ═══════════════════════════════════════════════════════════════
   // Save Note
   // ═══════════════════════════════════════════════════════════════

   saveNote() {
      const noteInput = document.getElementById("yqs-note-input");
      if (!noteInput) return;

      const noteText = noteInput.value.trim();
      if (!noteText) {
         // Shake the textarea
         noteInput.style.animation = "none";
         noteInput.getBoundingClientRect();
         noteInput.style.animation = "";
         return;
      }

      const note = {
         id: Date.now(),
         text: noteText,
         timestamp: this.getCurrentTime(),
         tags: [...this._pendingTags],
         videoId: this.currentVideoId,
         videoTitle: this.currentVideoTitle,
         createdAt: new Date().toISOString(),
      };

      if (!this.notes[this.currentVideoId]) {
         this.notes[this.currentVideoId] = [];
      }
      this.notes[this.currentVideoId].unshift(note); // newest first

      chrome.storage.local.set({ videoNotes: this.notes }, () => {
         // Animate save button
         const saveBtn = document.getElementById("yqs-save-note");
         if (saveBtn) {
            saveBtn.style.transform = "scale(0.94)";
            setTimeout(() => { saveBtn.style.transform = ""; }, 120);
         }

         // Clear composer
         noteInput.value = "";
         noteInput.style.height = "auto";
         this._pendingTags = [];
         this._renderComposerTags();
         this._clearDraft();

         this._showToast("Note saved", "✓");
         this.renderNotes();
         this.renderProgressMarkers();
      });
   }

   // ═══════════════════════════════════════════════════════════════
   // Render Notes
   // ═══════════════════════════════════════════════════════════════

   renderNotes() {
      const list = document.getElementById("yqs-notes-list");
      const dividerLabel = document.getElementById("yqs-divider-label");
      const dividerEl = document.getElementById("yqs-section-divider");
      const copyBtn = document.getElementById("yqs-copy-all-btn");
      const exportBtn = document.getElementById("yqs-export-btn");

      if (!list) return;

      const videoNotes = this.notes[this.currentVideoId] || [];

      // Divider count
      if (dividerLabel) {
         dividerLabel.textContent = videoNotes.length === 0
            ? "notes"
            : videoNotes.length === 1 ? "1 note in this video" : `${videoNotes.length} notes in this video`;
      }

      // Footer disabled state
      if (copyBtn) copyBtn.disabled = videoNotes.length === 0;
      if (exportBtn) exportBtn.disabled = videoNotes.length === 0;

      if (videoNotes.length === 0) {
         list.innerHTML = this._emptyStateHTML();
         const cta = list.querySelector(".yqs-empty-cta");
         if (cta) {
            cta.addEventListener("click", () => {
               const ta = document.getElementById("yqs-note-input");
               if (ta) ta.focus();
            });
         }
         return;
      }

      // Build cards
      list.innerHTML = videoNotes
         .map(note => this._noteCardHTML(note))
         .join("");

      // Wire up card interactions
      list.querySelectorAll(".yqs-note-card").forEach(card => {
         const noteId = parseInt(card.dataset.id);
         const note = videoNotes.find(n => n.id === noteId);
         if (!note) return;

         // Timestamp seek
         const tsBtn = card.querySelector(".yqs-card-ts");
         if (tsBtn) tsBtn.addEventListener("click", () => this.seekTo(note.timestamp));

         // Expand long notes
         const expandBtn = card.querySelector(".yqs-expand-btn");
         if (expandBtn) {
            expandBtn.addEventListener("click", () => {
               const textEl = card.querySelector(".yqs-card-text");
               if (textEl.classList.contains("clamped")) {
                  textEl.classList.remove("clamped");
                  expandBtn.textContent = "Show less";
               } else {
                  textEl.classList.add("clamped");
                  expandBtn.textContent = "Show more";
               }
            });
         }

         // Copy note
         const copyBtn = card.querySelector(".yqs-card-btn.copy");
         if (copyBtn) {
            copyBtn.addEventListener("click", () => {
               const text = `[${this.formatTime(note.timestamp)}] ${note.text}`;
               navigator.clipboard.writeText(text).catch(() => {});
               this._showToast("Copied!", "⎘");
            });
         }

         // Edit note
         const editBtn = card.querySelector(".yqs-card-btn.edit");
         if (editBtn) editBtn.addEventListener("click", () => this._enterEditMode(card, note));

         // Delete note (inline confirm)
         const deleteBtn = card.querySelector(".yqs-card-btn.delete");
         if (deleteBtn) deleteBtn.addEventListener("click", () => this._showDeleteConfirm(card, note.id));
      });
   }

   _emptyStateHTML() {
      return `
      <div class="yqs-empty-state">
         <div class="yqs-empty-icon">📋</div>
         <p class="yqs-empty-title">Start capturing key moments from this video</p>
         <p class="yqs-empty-body">Press ↵ Enter after writing to save a note at the current timestamp</p>
         <button class="yqs-empty-cta">
            Write your first note
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
               <path d="M8 5v14l11-7z"/>
            </svg>
         </button>
      </div>`;
   }

   _noteCardHTML(note) {
      const isLong = note.text.length > 220;
      const tagsHTML = note.tags && note.tags.length > 0
         ? `<div class="yqs-card-tags">${note.tags.slice(0, 5).map(t => `<span class="yqs-card-tag">#${this.escapeHtml(t)}</span>`).join("")}${note.tags.length > 5 ? `<span class="yqs-card-tag">+${note.tags.length - 5}</span>` : ""}</div>`
         : "";

      return `
      <div class="yqs-note-card" data-id="${note.id}" data-ts="${note.timestamp}">
         <div class="yqs-card-header">
            <button class="yqs-card-ts" aria-label="Jump to ${this.formatTime(note.timestamp)}">
               <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
               </svg>
               ${this.escapeHtml(this.formatTime(note.timestamp))}
               <span class="yqs-card-ts-play">▶</span>
            </button>
            <div class="yqs-card-actions">
               <button class="yqs-card-btn edit" aria-label="Edit note" title="Edit">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                     <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
               </button>
               <button class="yqs-card-btn copy" aria-label="Copy note" title="Copy">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                     <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                  </svg>
               </button>
               <button class="yqs-card-btn delete" aria-label="Delete note" title="Delete">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                     <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
               </button>
            </div>
         </div>
         <p class="yqs-card-text${isLong ? " clamped" : ""}">${this.escapeHtml(note.text)}</p>
         ${isLong ? `<button class="yqs-expand-btn">Show more</button>` : ""}
         ${tagsHTML}
      </div>`;
   }

   // ── Edit mode ──────────────────────────────────────────────────

   _enterEditMode(card, note) {
      const textEl = card.querySelector(".yqs-card-text");
      const expandBtn = card.querySelector(".yqs-expand-btn");
      if (!textEl) return;

      // Hide static elements
      textEl.style.display = "none";
      if (expandBtn) expandBtn.style.display = "none";

      // Hide card actions
      const actions = card.querySelector(".yqs-card-actions");
      if (actions) actions.style.visibility = "hidden";

      const editArea = document.createElement("textarea");
      editArea.className = "yqs-edit-textarea";
      editArea.value = note.text;
      editArea.rows = 3;
      // Auto-height
      editArea.style.height = "auto";
      card.insertBefore(editArea, card.querySelector(".yqs-card-tags") || null);
      setTimeout(() => {
         editArea.style.height = Math.min(editArea.scrollHeight, 180) + "px";
         editArea.focus();
         editArea.selectionStart = editArea.selectionEnd = editArea.value.length;
      }, 10);

      editArea.addEventListener("input", () => {
         editArea.style.height = "auto";
         editArea.style.height = Math.min(editArea.scrollHeight, 180) + "px";
      });

      const actionsRow = document.createElement("div");
      actionsRow.className = "yqs-edit-actions";
      actionsRow.innerHTML = `
         <button class="yqs-edit-save">Save</button>
         <button class="yqs-edit-cancel">Cancel</button>`;
      card.insertBefore(actionsRow, editArea.nextSibling);

      const cancelEdit = () => {
         editArea.remove();
         actionsRow.remove();
         textEl.style.display = "";
         if (expandBtn) expandBtn.style.display = "";
         if (actions) actions.style.visibility = "";
      };

      actionsRow.querySelector(".yqs-edit-cancel").addEventListener("click", cancelEdit);
      editArea.addEventListener("keydown", (e) => { if (e.key === "Escape") cancelEdit(); });

      actionsRow.querySelector(".yqs-edit-save").addEventListener("click", () => {
         const newText = editArea.value.trim();
         if (!newText) return;

         const videoNotes = this.notes[this.currentVideoId] || [];
         const idx = videoNotes.findIndex(n => n.id === note.id);
         if (idx !== -1) {
            videoNotes[idx].text = newText;
            chrome.storage.local.set({ videoNotes: this.notes }, () => {
               this._showToast("Note updated", "✎");
               this.renderNotes();
            });
         }
      });
   }

   // ── Delete confirm ─────────────────────────────────────────────

   _showDeleteConfirm(card, noteId) {
      // Avoid double confirms
      if (card.querySelector(".yqs-delete-confirm")) return;

      const confirm = document.createElement("div");
      confirm.className = "yqs-delete-confirm";
      confirm.innerHTML = `
         <span>Delete this note?</span>
         <button class="yqs-confirm-cancel">Cancel</button>
         <button class="yqs-confirm-delete">Delete</button>`;
      card.appendChild(confirm);

      let timeout = setTimeout(() => confirm.remove(), 4000);

      confirm.querySelector(".yqs-confirm-cancel").addEventListener("click", () => {
         clearTimeout(timeout);
         confirm.remove();
      });

      confirm.querySelector(".yqs-confirm-delete").addEventListener("click", () => {
         clearTimeout(timeout);
         this.deleteNote(noteId, card);
      });
   }

   // ═══════════════════════════════════════════════════════════════
   // Active Timestamp Tracking
   // ═══════════════════════════════════════════════════════════════

   startTimestampTrack() {
      this.stopTimestampTrack();
      this._tsTrackInterval = setInterval(() => this._trackActiveTimestamp(), 500);
   }

   stopTimestampTrack() {
      if (this._tsTrackInterval) {
         clearInterval(this._tsTrackInterval);
         this._tsTrackInterval = null;
      }
   }

   _trackActiveTimestamp() {
      const video = document.querySelector("video");
      if (!video) return;

      const currentTime = video.currentTime;
      const cards = document.querySelectorAll(".yqs-note-card");
      let anyActive = false;

      cards.forEach(card => {
         const ts = parseInt(card.dataset.ts);
         const isActive = Math.abs(ts - currentTime) <= 2;
         card.classList.toggle("active-ts", isActive);
         if (isActive && !anyActive) {
            anyActive = true;
            // Smooth scroll into view if out of viewport
            const wrap = document.getElementById("yqs-notes-list-wrap");
            if (wrap) {
               const cardRect = card.getBoundingClientRect();
               const wrapRect = wrap.getBoundingClientRect();
               if (cardRect.top < wrapRect.top || cardRect.bottom > wrapRect.bottom) {
                  card.scrollIntoView({ behavior: "smooth", block: "nearest" });
               }
            }
         }
      });
   }

   // ═══════════════════════════════════════════════════════════════
   // Progress Bar Markers (unchanged logic, updated colours)
   // ═══════════════════════════════════════════════════════════════

   renderProgressMarkers(retryCount = 0) {
      if (!this.isEnabled) return;

      document.querySelectorAll(".yqs-progress-marker").forEach(el => el.remove());
      const tooltip = document.getElementById("yqs-marker-tooltip");
      if (tooltip) tooltip.remove();

      const videoNotes = this.notes[this.currentVideoId] || [];
      const videoBookmarks = this.bookmarks[this.currentVideoId] || [];

      if (videoNotes.length === 0 && videoBookmarks.length === 0) return;

      const progressBar = document.querySelector(".ytp-progress-bar-container");
      if (!progressBar) {
         if (retryCount < 10) setTimeout(() => this.renderProgressMarkers(retryCount + 1), 500);
         return;
      }

      const video = document.querySelector("video");
      if (!video) {
         if (retryCount < 10) setTimeout(() => this.renderProgressMarkers(retryCount + 1), 500);
         return;
      }

      const duration = video.duration;
      if (!duration || !isFinite(duration) || duration === 0) {
         if (retryCount < 10) setTimeout(() => this.renderProgressMarkers(retryCount + 1), 500);
         return;
      }

      let newTooltip = document.getElementById("yqs-marker-tooltip");
      if (!newTooltip) {
         newTooltip = document.createElement("div");
         newTooltip.id = "yqs-marker-tooltip";
         newTooltip.className = "yqs-marker-tooltip";
         document.body.appendChild(newTooltip);
      }

      videoNotes.forEach(note => {
         progressBar.appendChild(this.createMarker(note.timestamp, duration, "note", note.text, progressBar, newTooltip));
      });

      videoBookmarks.forEach(bookmark => {
         progressBar.appendChild(this.createMarker(bookmark.timestamp, duration, "bookmark", "Bookmark", progressBar, newTooltip));
      });
   }

   createMarker(timestamp, duration, type, text, progressBar, tooltip) {
      const marker = document.createElement("div");
      marker.className = `yqs-progress-marker yqs-marker-${type}`;
      marker.style.left = `${(timestamp / duration) * 100}%`;

      marker.addEventListener("click", (e) => { e.stopPropagation(); this.seekTo(timestamp); });

      marker.addEventListener("mouseenter", () => {
         tooltip.innerHTML = `
            <div class="yqs-tooltip-time">${this.formatTime(timestamp)}</div>
            <div class="yqs-tooltip-text">${this.escapeHtml(text.substring(0, 100))}${text.length > 100 ? "…" : ""}</div>`;
         tooltip.classList.add("visible");

         const rect = marker.getBoundingClientRect();
         const tooltipRect = tooltip.getBoundingClientRect();
         const left = rect.left + rect.width / 2 - tooltipRect.width / 2;
         tooltip.style.left = `${Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10))}px`;
         tooltip.style.top = `${rect.top - tooltipRect.height - 8}px`;
      });

      marker.addEventListener("mouseleave", () => tooltip.classList.remove("visible"));

      return marker;
   }

   // ═══════════════════════════════════════════════════════════════
   // Bookmarks (unchanged, kept for backward compat)
   // ═══════════════════════════════════════════════════════════════

   addBookmark() {
      const bookmark = {
         id: Date.now(),
         timestamp: this.getCurrentTime(),
         videoId: this.currentVideoId,
         videoTitle: this.currentVideoTitle,
         createdAt: new Date().toISOString(),
      };

      if (!this.bookmarks[this.currentVideoId]) this.bookmarks[this.currentVideoId] = [];
      this.bookmarks[this.currentVideoId].push(bookmark);

      chrome.storage.local.set({ videoBookmarks: this.bookmarks }, () => {
         this.renderProgressMarkers();
      });
   }

   deleteBookmark(bookmarkId) {
      if (!this.bookmarks[this.currentVideoId]) return;
      this.bookmarks[this.currentVideoId] = this.bookmarks[this.currentVideoId].filter(b => b.id !== bookmarkId);
      chrome.storage.local.set({ videoBookmarks: this.bookmarks }, () => {
         this.renderProgressMarkers();
      });
   }

   // ═══════════════════════════════════════════════════════════════
   // Delete Note
   // ═══════════════════════════════════════════════════════════════

   deleteNote(noteId, cardEl) {
      if (!this.notes[this.currentVideoId]) return;
      this.notes[this.currentVideoId] = this.notes[this.currentVideoId].filter(n => n.id !== noteId);

      chrome.storage.local.set({ videoNotes: this.notes }, () => {
         if (cardEl) {
            cardEl.style.transition = "opacity 0.18s ease, transform 0.18s ease";
            cardEl.style.opacity = "0";
            cardEl.style.transform = "scale(0.97)";
            setTimeout(() => {
               this.renderNotes();
               this.renderProgressMarkers();
            }, 200);
         } else {
            this.renderNotes();
            this.renderProgressMarkers();
         }
      });
   }

   // ═══════════════════════════════════════════════════════════════
   // Seek
   // ═══════════════════════════════════════════════════════════════

   seekTo(seconds) {
      const video = document.querySelector("video");
      if (video) video.currentTime = seconds;
   }

   // ═══════════════════════════════════════════════════════════════
   // Export
   // ═══════════════════════════════════════════════════════════════

   exportNotes(format = "txt") {
      const videoNotes = this.notes[this.currentVideoId] || [];
      if (videoNotes.length === 0) {
         this._showToast("No notes to export", "⚠");
         return;
      }

      let content = "";
      let filename = `notes-${this.currentVideoId}`;
      let mimeType = "text/plain";

      if (format === "txt") {
         content = `Notes for: ${this.currentVideoTitle}\n`;
         content += `URL: https://youtu.be/${this.currentVideoId}\n`;
         content += `Exported: ${new Date().toLocaleString()}\n`;
         content += "─".repeat(50) + "\n\n";
         videoNotes.forEach((note, i) => {
            content += `[${i + 1}] ${this.formatTime(note.timestamp)}\n`;
            content += `${note.text}\n`;
            if (note.tags && note.tags.length > 0) content += `Tags: ${note.tags.join(", ")}\n`;
            content += "\n";
         });
         filename += ".txt";
      } else if (format === "md") {
         content = `# ${this.currentVideoTitle}\n\n`;
         content += `**URL:** https://youtu.be/${this.currentVideoId}  \n`;
         content += `**Exported:** ${new Date().toLocaleString()}\n\n---\n\n`;
         videoNotes.forEach(note => {
            content += `### ⏱ ${this.formatTime(note.timestamp)}\n\n`;
            content += `${note.text}\n\n`;
            if (note.tags && note.tags.length > 0) content += `**Tags:** ${note.tags.map(t => `\`#${t}\``).join(" ")}\n\n`;
            content += "---\n\n";
         });
         filename += ".md";
         mimeType = "text/markdown";
      } else if (format === "json") {
         const data = {
            videoId: this.currentVideoId,
            videoTitle: this.currentVideoTitle,
            exportedAt: new Date().toISOString(),
            notes: videoNotes,
         };
         content = JSON.stringify(data, null, 2);
         filename += ".json";
         mimeType = "application/json";
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      this._showToast(`Exported as ${format.toUpperCase()}`, "↓");
   }

   // ═══════════════════════════════════════════════════════════════
   // Copy All Notes
   // ═══════════════════════════════════════════════════════════════

   _copyAllNotes() {
      const videoNotes = this.notes[this.currentVideoId] || [];
      if (videoNotes.length === 0) { this._showToast("No notes to copy", "⚠"); return; }

      const text = videoNotes
         .map(n => `[${this.formatTime(n.timestamp)}] ${n.text}${n.tags && n.tags.length ? " — " + n.tags.map(t => "#" + t).join(" ") : ""}`)
         .join("\n");

      navigator.clipboard.writeText(text)
         .then(() => this._showToast("Copied all notes!", "⎘"))
         .catch(() => this._showToast("Copy failed", "✗"));
   }

   // ═══════════════════════════════════════════════════════════════
   // Toast
   // ═══════════════════════════════════════════════════════════════

   _showToast(message, icon = "") {
      const existing = document.querySelector(".yqs-toast");
      if (existing) existing.remove();

      const toast = document.createElement("div");
      toast.className = "yqs-toast";
      toast.innerHTML = icon ? `<span>${icon}</span> ${this.escapeHtml(message)}` : this.escapeHtml(message);
      document.body.appendChild(toast);

      setTimeout(() => {
         toast.classList.add("fade-out");
         setTimeout(() => toast.remove(), 320);
      }, 1800);
   }

   // ═══════════════════════════════════════════════════════════════
   // Utility
   // ═══════════════════════════════════════════════════════════════

   escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
   }

   // ═══════════════════════════════════════════════════════════════
   // Remove UI
   // ═══════════════════════════════════════════════════════════════

   removeUI() {
      if (this._composerTsInterval) { clearInterval(this._composerTsInterval); this._composerTsInterval = null; }
      this.stopTimestampTrack();

      if (this.floatingBtn) { this.floatingBtn.remove(); this.floatingBtn = null; }
      if (this.panel)       { this.panel.remove();       this.panel = null; }
      if (this.overlay)     { this.overlay.remove();     this.overlay = null; }

      document.querySelectorAll(".yqs-progress-marker").forEach(el => el.remove());
      const tooltip = document.getElementById("yqs-marker-tooltip");
      if (tooltip) tooltip.remove();
      const toast = document.querySelector(".yqs-toast");
      if (toast) toast.remove();

      if (this.handleGlobalKeydown) {
         document.removeEventListener("keydown", this.handleGlobalKeydown);
         this.handleGlobalKeydown = null;
      }

      if (this.handleMetadataLoaded) {
         const video = document.querySelector("video");
         if (video) video.removeEventListener("loadedmetadata", this.handleMetadataLoaded);
         this.handleMetadataLoaded = null;
      }
   }

   // ═══════════════════════════════════════════════════════════════
   // Navigation Observer
   // ═══════════════════════════════════════════════════════════════

   observeNavigation() {
      let lastUrl = location.href;
      new MutationObserver(() => {
         const url = location.href;
         if (url !== lastUrl) {
            lastUrl = url;
            this.handleNavigation();
         }
      }).observe(document, { subtree: true, childList: true });
   }

   handleNavigation() {
      if (this.isEnabled && this.isYouTubeWatch()) {
         const newVideoId = this.getVideoId();
         if (newVideoId !== this.currentVideoId) {
            this.currentVideoId = newVideoId;
            this.currentVideoTitle = this.getVideoTitle();
            this._draftKey = `draft_${this.currentVideoId}`;
            this._pendingTags = [];

            // Update subtitle
            const sub = document.getElementById("yqs-video-title-sub");
            if (sub) sub.textContent = this.currentVideoTitle.slice(0, 34) + (this.currentVideoTitle.length > 34 ? "…" : "");

            this._restoreDraft();
            this.renderNotes();
            this.renderProgressMarkers();
         }
      } else if (this.isEnabled && !this.isYouTubeWatch()) {
         this.removeUI();
      } else if (!this.isEnabled && this.isYouTubeWatch()) {
         chrome.storage.local.get(["notesEnabled"], (result) => {
            if (result.notesEnabled) this.enable();
         });
      }
   }
}

// ─── Bootstrap ───────────────────────────────────────────────────
if (typeof window.timestampNotes === "undefined") {
   window.timestampNotes = new TimestampNotes();
}

// ─── Popup messages ──────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
   if (request.action === "TOGGLE_NOTES_MODE") {
      if (request.enabled) {
         window.timestampNotes.enable();
      } else {
         window.timestampNotes.disable();
      }
      sendResponse({ success: true });
   }
   return true;
});
