/**
 * YouTube Quick Speed - Professional Research Toolkit
 * Minimal, clean design for serious researchers
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

      this.init();
   }

   init() {
      if (document.readyState === "loading") {
         document.addEventListener("DOMContentLoaded", () => this.initNotes());
      } else {
         this.initNotes();
      }

      this.observeNavigation();
   }

   initNotes() {
      chrome.storage.local.get(["videoNotes", "videoBookmarks", "notesEnabled"], (result) => {
         this.notes = result.videoNotes || {};
         this.bookmarks = result.videoBookmarks || {};
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
      const titleElement = document.querySelector("h1.ytd-watch-metadata yt-formatted-string");
      return titleElement ? titleElement.textContent.trim() : "YouTube Video";
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

   enable() {
      if (!this.isYouTubeWatch()) return;

      this.isEnabled = true;
      this.currentVideoId = this.getVideoId();
      this.currentVideoTitle = this.getVideoTitle();

      this.injectUI();
      this.setupEventListeners();

      chrome.storage.local.set({ notesEnabled: true });
   }

   disable() {
      this.isEnabled = false;
      this.removeUI();
      chrome.storage.local.set({ notesEnabled: false });
   }

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
      this.floatingBtn.className = "yqs-floating-btn";
      this.floatingBtn.title = "Research Notes";
      this.floatingBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
        `;
      document.body.appendChild(this.floatingBtn);

      chrome.storage.local.get(["floatingBtnPosition"], (result) => {
         if (result.floatingBtnPosition) {
            this.floatingBtn.style.right = result.floatingBtnPosition.right;
            this.floatingBtn.style.bottom = result.floatingBtnPosition.bottom;
         }
      });
   }

   createPanel() {
      // Create overlay
      this.overlay = document.createElement("div");
      this.overlay.className = "yqs-panel-overlay";
      this.overlay.id = "yqs-panel-overlay";
      document.body.appendChild(this.overlay);

      this.panel = document.createElement("div");
      this.panel.id = "yqs-notes-panel";
      this.panel.className = "yqs-panel";
      this.panel.innerHTML = `
            <div class="yqs-panel-header">
                <h3>Research Notes</h3>
                <button class="yqs-close-btn" id="yqs-close-panel">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>

            <div class="yqs-panel-tabs">
                <button class="yqs-tab active" data-tab="notes">Notes</button>
                <button class="yqs-tab" data-tab="bookmarks">Bookmarks</button>
            </div>

            <div class="yqs-panel-content">
                <!-- NOTES TAB -->
                <div id="yqs-tab-notes" class="yqs-tab-pane active">
                    <div class="yqs-note-form">
                        <div class="yqs-form-row">
                            <label>Timestamp</label>
                            <span id="yqs-current-time" class="yqs-timestamp">00:00</span>
                        </div>
                        <textarea id="yqs-note-input" placeholder="Enter your note..." rows="3"></textarea>
                        <div class="yqs-form-actions">
                            <input type="text" id="yqs-tags-input" placeholder="Tags (comma separated)">
                            <button id="yqs-save-note" class="yqs-btn-primary">Save Note</button>
                        </div>
                        
                        <div class="yqs-form-options">
                            <label class="yqs-checkbox-label">
                                <input type="checkbox" id="yqs-pause-typing" class="yqs-checkbox">
                                <span class="yqs-checkbox-text">Pause video while typing</span>
                            </label>
                        </div>
                    </div>

                    <div class="yqs-notes-header">
                        <h4>Notes (<span id="yqs-notes-count">0</span>)</h4>
                        <button id="yqs-export-notes" class="yqs-btn-secondary">Export</button>
                    </div>

                    <div id="yqs-notes-list" class="yqs-list">
                        <div class="yqs-empty">
                            <p>No notes yet</p>
                        </div>
                    </div>
                </div>

                <!-- BOOKMARKS TAB -->
                <div id="yqs-tab-bookmarks" class="yqs-tab-pane">
                    <button id="yqs-add-bookmark" class="yqs-btn-primary yqs-btn-block">
                        Add Bookmark at Current Time
                    </button>

                    <div id="yqs-bookmarks-list" class="yqs-list">
                        <div class="yqs-empty">
                            <p>No bookmarks yet</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
      document.body.appendChild(this.panel);

      setInterval(() => {
         const timeEl = document.getElementById("yqs-current-time");
         if (timeEl) {
            timeEl.textContent = this.formatTime(this.getCurrentTime());
         }
      }, 1000);

      this.renderNotes();
      this.renderBookmarks();
      this.renderProgressMarkers();
   }

   renderProgressMarkers(retryCount = 0) {
      if (!this.isEnabled) return;

      // Remove existing markers
      document.querySelectorAll(".yqs-progress-marker").forEach((el) => el.remove());
      const tooltip = document.getElementById("yqs-marker-tooltip");
      if (tooltip) tooltip.remove();

      const videoNotes = this.notes[this.currentVideoId] || [];
      const videoBookmarks = this.bookmarks[this.currentVideoId] || [];

      if (videoNotes.length === 0 && videoBookmarks.length === 0) return;

      // Wait for YouTube progress bar to be available
      const progressBar = document.querySelector(".ytp-progress-bar-container");
      if (!progressBar) {
         if (retryCount < 10) {
            setTimeout(() => this.renderProgressMarkers(retryCount + 1), 500);
         }
         return;
      }

      const video = document.querySelector("video");
      if (!video) {
         if (retryCount < 10) {
            setTimeout(() => this.renderProgressMarkers(retryCount + 1), 500);
         }
         return;
      }

      // Check if duration is valid (not 0, not Infinity, not NaN)
      const duration = video.duration;
      if (!duration || !isFinite(duration) || duration === 0) {
         if (retryCount < 10) {
            setTimeout(() => this.renderProgressMarkers(retryCount + 1), 500);
         }
         return;
      }

      // Create tooltip container if it doesn't exist
      let newTooltip = document.getElementById("yqs-marker-tooltip");
      if (!newTooltip) {
         newTooltip = document.createElement("div");
         newTooltip.id = "yqs-marker-tooltip";
         newTooltip.className = "yqs-marker-tooltip";
         document.body.appendChild(newTooltip);
      }

      // Add note markers
      videoNotes.forEach((note) => {
         const marker = this.createMarker(note.timestamp, duration, "note", note.text, progressBar, newTooltip);
         progressBar.appendChild(marker);
      });

      // Add bookmark markers
      videoBookmarks.forEach((bookmark) => {
         const marker = this.createMarker(bookmark.timestamp, duration, "bookmark", "Bookmark", progressBar, newTooltip);
         progressBar.appendChild(marker);
      });
   }

   createMarker(timestamp, duration, type, text, progressBar, tooltip) {
      const marker = document.createElement("div");
      marker.className = `yqs-progress-marker yqs-marker-${type}`;

      const position = (timestamp / duration) * 100;
      marker.style.left = `${position}%`;

      // Click to seek
      marker.addEventListener("click", (e) => {
         e.stopPropagation();
         this.seekTo(timestamp);
      });

      // Hover preview
      marker.addEventListener("mouseenter", (e) => {
         const rect = marker.getBoundingClientRect();
         const progressRect = progressBar.getBoundingClientRect();

         tooltip.innerHTML = `
                <div class="yqs-tooltip-time">${this.formatTime(timestamp)}</div>
                <div class="yqs-tooltip-text">${this.escapeHtml(text.substring(0, 100))}${text.length > 100 ? "..." : ""}</div>
            `;
         tooltip.classList.add("visible");

         // Position tooltip above marker
         const tooltipRect = tooltip.getBoundingClientRect();
         const left = rect.left + rect.width / 2 - tooltipRect.width / 2;
         const top = rect.top - tooltipRect.height - 8;

         tooltip.style.left = `${Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10))}px`;
         tooltip.style.top = `${top}px`;
      });

      marker.addEventListener("mouseleave", () => {
         tooltip.classList.remove("visible");
      });

      return marker;
   }

   setupEventListeners() {
      if (!this.floatingBtn || !this.panel) return;

      // Floating button click
      this.floatingBtn.addEventListener("click", () => this.togglePanel());

      // Close panel
      const closeBtn = document.getElementById("yqs-close-panel");
      if (closeBtn) {
         closeBtn.addEventListener("click", () => this.closePanel());
      }

      // Close panel when clicking overlay
      if (this.overlay) {
         this.overlay.addEventListener("click", () => this.closePanel());
      }

      // Tab switching
      document.querySelectorAll(".yqs-tab").forEach((tab) => {
         tab.addEventListener("click", () => this.switchTab(tab.dataset.tab));
      });

      // Save note
      const saveBtn = document.getElementById("yqs-save-note");
      if (saveBtn) {
         saveBtn.addEventListener("click", () => this.saveNote());
      }

      // Add bookmark
      const bookmarkBtn = document.getElementById("yqs-add-bookmark");
      if (bookmarkBtn) {
         bookmarkBtn.addEventListener("click", () => this.addBookmark());
      }

      // Export notes
      const exportBtn = document.getElementById("yqs-export-notes");
      if (exportBtn) {
         exportBtn.addEventListener("click", () => this.exportNotes());
      }

      // Pause while typing functionality
      const noteInput = document.getElementById("yqs-note-input");
      const pauseCheckbox = document.getElementById("yqs-pause-typing");

      if (noteInput && pauseCheckbox) {
         let wasPlaying = false;

         noteInput.addEventListener("focus", () => {
            if (pauseCheckbox.checked) {
               const video = document.querySelector("video");
               if (video && !video.paused) {
                  wasPlaying = true;
                  video.pause();
               }
            }
         });

         noteInput.addEventListener("blur", () => {
            if (pauseCheckbox.checked && wasPlaying) {
               const video = document.querySelector("video");
               if (video) {
                  video.play();
               }
               wasPlaying = false;
            }
         });
      }

      // Load pause preference
      chrome.storage.local.get(["pauseWhileTyping"], (result) => {
         const pauseCheckbox = document.getElementById("yqs-pause-typing");
         if (pauseCheckbox) {
            pauseCheckbox.checked = result.pauseWhileTyping || false;
         }
      });

      // Save pause preference
      const pauseCheckbox2 = document.getElementById("yqs-pause-typing");
      if (pauseCheckbox2) {
         pauseCheckbox2.addEventListener("change", (e) => {
            chrome.storage.local.set({ pauseWhileTyping: e.target.checked });
         });
      }

      // Keyboard shortcuts
      this.handleGlobalKeydown = (e) => {
         if (e.ctrlKey && e.key === "Enter") {
            this.saveNote();
         }
      };
      document.addEventListener("keydown", this.handleGlobalKeydown);

      // Listen for video metadata loaded (duration becomes available)
      const video = document.querySelector("video");
      if (video) {
         this.handleMetadataLoaded = () => {
            // Re-render markers when video duration is available
            setTimeout(() => this.renderProgressMarkers(), 500);
         };
         video.addEventListener("loadedmetadata", this.handleMetadataLoaded);
      }
   }

   togglePanel() {
      if (!this.panel || !this.overlay) return;
      this.panel.classList.toggle("visible");
      this.overlay.classList.toggle("visible");
   }

   closePanel() {
      if (!this.panel || !this.overlay) return;
      this.panel.classList.remove("visible");
      this.overlay.classList.remove("visible");

      // Blur any active element inside the panel to prevent focus trapping
      if (document.activeElement && this.panel.contains(document.activeElement)) {
         document.activeElement.blur();
      }
   }

   switchTab(tabName) {
      document.querySelectorAll(".yqs-tab").forEach((tab) => {
         tab.classList.toggle("active", tab.dataset.tab === tabName);
      });

      document.querySelectorAll(".yqs-tab-pane").forEach((pane) => {
         pane.classList.toggle("active", pane.id === `yqs-tab-${tabName}`);
      });
   }

   saveNote() {
      const noteInput = document.getElementById("yqs-note-input");
      const tagsInput = document.getElementById("yqs-tags-input");

      if (!noteInput) return;

      const noteText = noteInput.value.trim();
      if (!noteText) return;

      const note = {
         id: Date.now(),
         text: noteText,
         timestamp: this.getCurrentTime(),
         tags: tagsInput
            ? tagsInput.value
                 .split(",")
                 .map((t) => t.trim())
                 .filter((t) => t)
            : [],
         videoId: this.currentVideoId,
         videoTitle: this.currentVideoTitle,
         createdAt: new Date().toISOString(),
      };

      if (!this.notes[this.currentVideoId]) {
         this.notes[this.currentVideoId] = [];
      }
      this.notes[this.currentVideoId].push(note);

      chrome.storage.local.set({ videoNotes: this.notes }, () => {
         noteInput.value = "";
         if (tagsInput) tagsInput.value = "";
         this.renderNotes();
         this.renderProgressMarkers();
      });
   }

   addBookmark() {
      const bookmark = {
         id: Date.now(),
         timestamp: this.getCurrentTime(),
         videoId: this.currentVideoId,
         videoTitle: this.currentVideoTitle,
         createdAt: new Date().toISOString(),
      };

      if (!this.bookmarks[this.currentVideoId]) {
         this.bookmarks[this.currentVideoId] = [];
      }
      this.bookmarks[this.currentVideoId].push(bookmark);

      chrome.storage.local.set({ videoBookmarks: this.bookmarks }, () => {
         this.renderBookmarks();
      });
   }

   renderNotes() {
      const notesList = document.getElementById("yqs-notes-list");
      const notesCount = document.getElementById("yqs-notes-count");

      if (!notesList) return;

      const videoNotes = this.notes[this.currentVideoId] || [];

      if (notesCount) {
         notesCount.textContent = videoNotes.length;
      }

      if (videoNotes.length === 0) {
         notesList.innerHTML = '<div class="yqs-empty"><p>No notes yet</p></div>';
         return;
      }

      notesList.innerHTML = videoNotes
         .map(
            (note) => `
            <div class="yqs-note-item" data-id="${note.id}">
                <div class="yqs-note-header">
                    <span class="yqs-note-time">${this.formatTime(note.timestamp)}</span>
                    <button class="yqs-note-delete" data-id="${note.id}">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
                <p class="yqs-note-text">${this.escapeHtml(note.text)}</p>
                ${note.tags.length > 0 ? `<div class="yqs-note-tags">${note.tags.map((tag) => `<span class="yqs-tag">${this.escapeHtml(tag)}</span>`).join("")}</div>` : ""}
            </div>
        `,
         )
         .join("");

      // Add delete handlers
      notesList.querySelectorAll(".yqs-note-delete").forEach((btn) => {
         btn.addEventListener("click", (e) => {
            const noteId = parseInt(e.currentTarget.dataset.id);
            this.deleteNote(noteId);
         });
      });

      // Add click to seek handlers
      notesList.querySelectorAll(".yqs-note-time").forEach((timeEl) => {
         timeEl.addEventListener("click", (e) => {
            const noteItem = e.currentTarget.closest(".yqs-note-item");
            const noteId = parseInt(noteItem.dataset.id);
            const note = videoNotes.find((n) => n.id === noteId);
            if (note) {
               this.seekTo(note.timestamp);
            }
         });
      });
   }

   renderBookmarks() {
      const bookmarksList = document.getElementById("yqs-bookmarks-list");
      if (!bookmarksList) return;

      const videoBookmarks = this.bookmarks[this.currentVideoId] || [];

      if (videoBookmarks.length === 0) {
         bookmarksList.innerHTML = '<div class="yqs-empty"><p>No bookmarks yet</p></div>';
         return;
      }

      bookmarksList.innerHTML = videoBookmarks
         .map(
            (bookmark) => `
            <div class="yqs-bookmark-item" data-id="${bookmark.id}">
                <span class="yqs-bookmark-time">${this.formatTime(bookmark.timestamp)}</span>
                <button class="yqs-bookmark-delete" data-id="${bookmark.id}">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
            </div>
        `,
         )
         .join("");

      // Add delete handlers
      bookmarksList.querySelectorAll(".yqs-bookmark-delete").forEach((btn) => {
         btn.addEventListener("click", (e) => {
            const bookmarkId = parseInt(e.currentTarget.dataset.id);
            this.deleteBookmark(bookmarkId);
         });
      });

      // Add click to seek handlers
      bookmarksList.querySelectorAll(".yqs-bookmark-time").forEach((timeEl) => {
         timeEl.addEventListener("click", (e) => {
            const bookmarkItem = e.currentTarget.closest(".yqs-bookmark-item");
            const bookmarkId = parseInt(bookmarkItem.dataset.id);
            const bookmark = videoBookmarks.find((b) => b.id === bookmarkId);
            if (bookmark) {
               this.seekTo(bookmark.timestamp);
            }
         });
      });
   }

   deleteNote(noteId) {
      if (!this.notes[this.currentVideoId]) return;

      this.notes[this.currentVideoId] = this.notes[this.currentVideoId].filter((n) => n.id !== noteId);
      chrome.storage.local.set({ videoNotes: this.notes }, () => {
         this.renderNotes();
         this.renderProgressMarkers();
      });
   }

   deleteBookmark(bookmarkId) {
      if (!this.bookmarks[this.currentVideoId]) return;

      this.bookmarks[this.currentVideoId] = this.bookmarks[this.currentVideoId].filter((b) => b.id !== bookmarkId);
      chrome.storage.local.set({ videoBookmarks: this.bookmarks }, () => {
         this.renderBookmarks();
         this.renderProgressMarkers();
      });
   }

   seekTo(seconds) {
      const video = document.querySelector("video");
      if (video) {
         video.currentTime = seconds;
      }
   }

   exportNotes() {
      const videoNotes = this.notes[this.currentVideoId] || [];
      if (videoNotes.length === 0) return;

      let text = `Notes for: ${this.currentVideoTitle}\n`;
      text += `Video ID: ${this.currentVideoId}\n`;
      text += `Exported: ${new Date().toLocaleString()}\n\n`;
      text += "=".repeat(60) + "\n\n";

      videoNotes.forEach((note, index) => {
         text += `[${index + 1}] ${this.formatTime(note.timestamp)}\n`;
         text += `${note.text}\n`;
         if (note.tags.length > 0) {
            text += `Tags: ${note.tags.join(", ")}\n`;
         }
         text += "\n";
      });

      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `notes-${this.currentVideoId}.txt`;
      a.click();
      URL.revokeObjectURL(url);
   }

   escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
   }

   removeUI() {
      if (this.floatingBtn) {
         this.floatingBtn.remove();
         this.floatingBtn = null;
      }
      if (this.panel) {
         this.panel.remove();
         this.panel = null;
      }
      if (this.overlay) {
         this.overlay.remove();
         this.overlay = null;
      }

      // Remove markers and tooltip
      document.querySelectorAll(".yqs-progress-marker").forEach((el) => el.remove());
      const tooltip = document.getElementById("yqs-marker-tooltip");
      if (tooltip) tooltip.remove();

      // Remove global listeners
      if (this.handleGlobalKeydown) {
         document.removeEventListener("keydown", this.handleGlobalKeydown);
         this.handleGlobalKeydown = null;
      }

      if (this.handleMetadataLoaded) {
         const video = document.querySelector("video");
         if (video) {
            video.removeEventListener("loadedmetadata", this.handleMetadataLoaded);
         }
         this.handleMetadataLoaded = null;
      }
   }

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
            this.renderNotes();
            this.renderBookmarks();
            this.renderProgressMarkers();
         }
      } else if (this.isEnabled && !this.isYouTubeWatch()) {
         this.removeUI();
      } else if (!this.isEnabled && this.isYouTubeWatch()) {
         chrome.storage.local.get(["notesEnabled"], (result) => {
            if (result.notesEnabled) {
               this.enable();
            }
         });
      }
   }
}

// Initialize
if (typeof window.timestampNotes === "undefined") {
   window.timestampNotes = new TimestampNotes();
}

// Listen for messages from popup
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
