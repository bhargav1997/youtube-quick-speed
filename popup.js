document.addEventListener("DOMContentLoaded", () => {
   // Elements
   const elements = {
      speedButtons: document.querySelectorAll(".speed-btn"),
      displayBadge: document.getElementById("current-speed-display"),
      resetBtn: document.getElementById("reset-btn"),
      autoSkipToggle: document.getElementById("auto-skip-toggle"),
      speedAdsToggle: document.getElementById("speed-ads-toggle"),
      zenModeToggle: document.getElementById("zen-mode-toggle"),
      boosterToggle: document.getElementById("booster-toggle"),
      autoScrollShortsToggle: document.getElementById("auto-scroll-shorts-toggle"),

      // New Boost Controls
      boostKeySelect: document.getElementById("boostKeySelect"),
      boostSpeedSlider: document.getElementById("boostSpeedSlider"),
      boostSpeedValue: document.getElementById("boostSpeedValue"),

      // Tools
      volSlider: document.getElementById("vol-slider"),
      volValue: document.getElementById("vol-value"),
      loopA: document.getElementById("btn-loop-a"),
      loopB: document.getElementById("btn-loop-b"),
      loopClear: document.getElementById("btn-loop-clear"),
      loopStatus: document.getElementById("loop-status"),
      timeA: document.getElementById("time-a"),
      timeB: document.getElementById("time-b"),
      screenshotBtn: document.getElementById("btn-screenshot"),

      // FOCUS FILTER
      focusToggle: document.getElementById("focus-filter-toggle"),
      strictModeToggle: document.getElementById("strict-mode-toggle"),
      keywordInput: document.getElementById("keyword-input"),
      addKeywordBtn: document.getElementById("add-keyword-btn"),
      keywordsList: document.getElementById("keywords-list"),

      // Category Modal Elements
      createCatBtn: document.getElementById("create-category-btn"),
      categoryModal: document.getElementById("category-modal"),
      closeModalBtn: document.getElementById("close-modal-btn"),
      saveCatBtn: document.getElementById("save-category-btn"),
      newCatName: document.getElementById("new-cat-name"),
      newCatKeywords: document.getElementById("new-cat-keywords"),
      iconPicker: document.getElementById("icon-picker"),
      categoryGrid: document.querySelector(".category-grid"),

      // AD BLOCKER TAB
      statSession: document.getElementById("stat-session"),
      statTotal: document.getElementById("stat-total"),
      btnToggleSite: document.getElementById("btn-toggle-site"),
      toggleSiteText: document.getElementById("toggle-site-text"),
      btnResetStats: document.getElementById("btn-reset-stats"),
      whitelistContainer: document.getElementById("whitelist-container"),
      whitelistCount: document.getElementById("whitelist-count"),
   };

   // Nav Items
   const navItems = document.querySelectorAll(".nav-item");
   const views = {
      "view-speed": document.getElementById("view-speed"),
      "view-tools": document.getElementById("view-tools"),
      "view-settings": document.getElementById("view-settings"),
      "view-focus": document.getElementById("view-focus"),
      "view-adblocker": document.getElementById("view-adblocker"),
   };

   // Helper: Switch Tabs
   const switchTab = (targetId) => {
      navItems.forEach((item) => {
         if (item.dataset.target === targetId) item.classList.add("active");
         else item.classList.remove("active");
      });

      for (const id in views) {
         if (id === targetId) views[id].style.display = "block";
         else views[id].style.display = "none";
      }
   };

   navItems.forEach((item) => {
      item.addEventListener("click", () => {
         switchTab(item.dataset.target);
      });
   });

   // Helper: Format seconds
   const formatTime = (seconds) => {
      if (seconds === null || seconds === undefined) return "Set";
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s.toString().padStart(2, "0")}`;
   };

   // Helper: Get Active Tab
   async function getActiveTab() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab;
   }

   // Helper: Send Message safely
   async function sendMessage(payload) {
      const tab = await getActiveTab();
      if (tab && tab.id && (tab.url.includes("youtube.com") || tab.url.includes("youtu.be"))) {
         return new Promise((resolve) => {
            chrome.tabs.sendMessage(tab.id, payload, (response) => {
               if (chrome.runtime.lastError) {
                  resolve(null);
               } else {
                  resolve(response);
               }
            });
         });
      }
      return null;
   }

   // Render Keywords List
   function renderKeywordsList(keywords) {
      elements.keywordsList.innerHTML = "";
      if (!keywords || keywords.length === 0) {
         elements.keywordsList.innerHTML = '<div class="empty-state">No keywords added</div>';
         return;
      }

      keywords.forEach((word) => {
         const div = document.createElement("div");
         div.className = "keyword-tag";
         div.innerHTML = `
            <span>${word}</span>
            <button class="delete-tag-btn" data-word="${word}">
               <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
               </svg>
            </button>
         `;
         elements.keywordsList.appendChild(div);
      });

      // Bind delete events
      document.querySelectorAll(".delete-tag-btn").forEach((btn) => {
         btn.addEventListener("click", async () => {
            const wordToRemove = btn.dataset.word;
            await sendMessage({ action: "REMOVE_KEYWORD", word: wordToRemove });
            // Optimistic update
            const newKeywords = keywords.filter((k) => k !== wordToRemove);
            renderKeywordsList(newKeywords);
         });
      });
   }

   // Update UI
   function updateUI(state) {
      if (!state) return;

      // Speed
      if (state.speed) {
         elements.displayBadge.textContent = `${state.speed}x`;
         elements.speedButtons.forEach((btn) => {
            const btnSpeed = parseFloat(btn.dataset.speed);
            btn.classList.toggle("active", btnSpeed === state.speed);
         });
      }

      // Toggles
      if (state.autoSkip !== undefined && elements.autoSkipToggle) elements.autoSkipToggle.checked = state.autoSkip;
      if (state.speedAds !== undefined && elements.speedAdsToggle) elements.speedAdsToggle.checked = state.speedAds;
      if (state.zenMode !== undefined && elements.zenModeToggle) elements.zenModeToggle.checked = state.zenMode;
      if (state.booster !== undefined && elements.boosterToggle) elements.boosterToggle.checked = state.booster;
      if (state.autoScrollShorts !== undefined && elements.autoScrollShortsToggle)
         elements.autoScrollShortsToggle.checked = state.autoScrollShorts;

      // Focus Settings
      if (state.focusMode !== undefined && elements.focusToggle) elements.focusToggle.checked = state.focusMode;
      if (state.strictMode !== undefined && elements.strictModeToggle) elements.strictModeToggle.checked = state.strictMode;
      if (state.keywords !== undefined) renderKeywordsList(state.keywords);

      if (state.activeCategories) {
         // Render Custom Categories first if not already there
         if (state.customCategories) {
            renderCustomCategories(state.customCategories);
         }

         document.querySelectorAll(".category-btn").forEach((btn) => {
            // Skip the "Create" button
            if (btn.id === "create-category-btn") return;

            const cat = btn.dataset.category;
            if (state.activeCategories.includes(cat)) {
               btn.classList.add("active");
            } else {
               btn.classList.remove("active");
            }
         });
      }

      // Boost Settings (New)
      if (state.boostKey && elements.boostKeySelect) elements.boostKeySelect.value = state.boostKey;
      if (state.boostSpeed && elements.boostSpeedSlider) {
         elements.boostSpeedSlider.value = state.boostSpeed;
         elements.boostSpeedValue.textContent = `${state.boostSpeed}x`;
      }

      // Volume
      if (state.volume !== undefined) {
         elements.volSlider.value = state.volume;
         elements.volValue.textContent = `${Math.round(state.volume * 100)}%`;
         if (state.volume > 1.0) elements.volValue.style.color = "var(--primary-color)";
         else elements.volValue.style.color = "";
      }

      // Loop
      if (state.loop) {
         elements.timeA.textContent = formatTime(state.loop.start);
         elements.timeB.textContent = formatTime(state.loop.end);
         elements.loopA.classList.toggle("active", state.loop.start !== null);
         elements.loopB.classList.toggle("active", state.loop.end !== null);
         elements.loopStatus.textContent = state.loop.active ? "ON" : "OFF";
         elements.loopStatus.className = `value-tag ${state.loop.active ? "on" : "off"}`;
         elements.loopClear.disabled = state.loop.start === null && state.loop.end === null;
      }
   }

   // Initialize
   (async () => {
      try {
         const tab = await getActiveTab();
         if (tab && tab.url && (tab.url.includes("youtube.com") || tab.url.includes("youtu.be"))) {
            chrome.tabs.sendMessage(tab.id, { action: "GET_STATE" }, (response) => {
               elements.displayBadge.classList.remove("clickable", "error");
               if (chrome.runtime.lastError || !response) {
                  elements.displayBadge.textContent = "Reload Tab";
                  elements.displayBadge.classList.add("error");
               } else {
                  elements.displayBadge.style = "";
                  updateUI(response);
               }
            });
         } else {
            elements.displayBadge.innerHTML = "Open YouTube";
            elements.displayBadge.classList.add("clickable");
            elements.displayBadge.onclick = () => {
               chrome.tabs.create({ url: "https://youtube.com" });
            };
         }
      } catch (e) {
         console.error(e);
      }
   })();

   // --- EVENT LISTENERS ---

   elements.speedButtons.forEach((btn) => {
      btn.addEventListener("click", async () => {
         const speed = parseFloat(btn.dataset.speed);
         updateUI({ speed });
         await sendMessage({ action: "SET_SPEED", speed });
      });
   });

   elements.resetBtn.addEventListener("click", async () => {
      updateUI({ speed: 1.0 });
      await sendMessage({ action: "SET_SPEED", speed: 1 });
   });

   if (elements.autoSkipToggle) {
      elements.autoSkipToggle.addEventListener("change", async (e) => {
         await sendMessage({ action: "TOGGLE_AUTO_SKIP", enabled: e.target.checked });
      });
   }

   // --- Helper for Custom Categories ---
   function renderCustomCategories(customCats) {
      // Remove existing custom buttons to prevent duplicates
      // We identify them by a special class or attribute, but simply checking ID helps

      // Strategy: Only append if not exists
      customCats.forEach((cat) => {
         if (!document.querySelector(`.category-btn[data-category="${cat.id}"]`)) {
            // Insert before the "Create" button
            const btn = document.createElement("button");
            btn.className = "category-btn custom-cat-btn"; // Add custom class
            btn.dataset.category = cat.id;
            btn.innerHTML = `<span>${cat.icon || "📁"}</span> ${cat.name}`;

            // Add click listener immediately
            btn.addEventListener("click", async () => {
               btn.classList.toggle("active");
               const isActive = btn.classList.contains("active");
               await sendMessage({
                  action: "TOGGLE_CATEGORY",
                  category: cat.id,
                  enabled: isActive,
               });
            });

            // Add Right Click to Delete
            btn.addEventListener("contextmenu", async (e) => {
               e.preventDefault();
               if (confirm(`Delete category "${cat.name}"?`)) {
                  await sendMessage({ action: "DELETE_CATEGORY", id: cat.id });
                  btn.remove();
               }
            });

            if (elements.createCatBtn && elements.categoryGrid) {
               elements.categoryGrid.insertBefore(btn, elements.createCatBtn);
            }
         }
      });
   }

   // Modal Logic
   if (elements.createCatBtn) {
      elements.createCatBtn.addEventListener("click", () => {
         elements.categoryModal.style.display = "flex";
         elements.newCatName.focus();
      });
   }

   if (elements.closeModalBtn) {
      elements.closeModalBtn.addEventListener("click", () => {
         elements.categoryModal.style.display = "none";
      });
   }

   // Close on outside click
   if (elements.categoryModal) {
      elements.categoryModal.addEventListener("click", (e) => {
         if (e.target === elements.categoryModal) {
            elements.categoryModal.style.display = "none";
         }
      });
   }

   // Icon Picker Logic
   // Icon Picker Logic
   // Default to Folder SVG
   let selectedIcon =
      '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>';

   if (elements.iconPicker) {
      elements.iconPicker.querySelectorAll(".picker-item").forEach((item) => {
         item.addEventListener("click", () => {
            elements.iconPicker.querySelectorAll(".picker-item").forEach((i) => i.classList.remove("selected"));
            item.classList.add("selected");
            // Set SVG string from data attribute
            selectedIcon = item.dataset.icon;
         });
      });
   }

   // Save Category
   if (elements.saveCatBtn) {
      elements.saveCatBtn.addEventListener("click", async () => {
         const name = elements.newCatName.value.trim();
         const keywordsRaw = elements.newCatKeywords.value.trim();

         if (!name) {
            alert("Please enter a category name");
            return;
         }
         if (!keywordsRaw) {
            alert("Please add at least one keyword");
            return;
         }

         const keywords = keywordsRaw
            .split(",")
            .map((k) => k.trim())
            .filter((k) => k);
         const id = "custom_" + Date.now();

         const newCat = { id, name, keywords, icon: selectedIcon };

         // Send to content script
         const res = await sendMessage({ action: "ADD_CATEGORY", category: newCat });

         if (res && res.success) {
            // UI Update
            renderCustomCategories([newCat]);
            elements.categoryModal.style.display = "none";
            elements.newCatName.value = "";
            elements.newCatKeywords.value = "";
         }
      });
   }

   if (elements.speedAdsToggle) {
      elements.speedAdsToggle.addEventListener("change", async (e) => {
         await sendMessage({ action: "TOGGLE_SPEED_ADS", enabled: e.target.checked });
      });
   }

   if (elements.zenModeToggle) {
      elements.zenModeToggle.addEventListener("change", async (e) => {
         await sendMessage({ action: "TOGGLE_ZEN_MODE", enabled: e.target.checked });
      });
   }

   if (elements.boosterToggle) {
      elements.boosterToggle.addEventListener("change", async (e) => {
         await sendMessage({ action: "TOGGLE_BOOSTER", enabled: e.target.checked });
      });
   }

   if (elements.autoScrollShortsToggle) {
      elements.autoScrollShortsToggle.addEventListener("change", async (e) => {
         await sendMessage({ action: "TOGGLE_AUTO_SCROLL_SHORTS", enabled: e.target.checked });
      });
   }

   // Focus Mode Listeners
   if (elements.focusToggle) {
      elements.focusToggle.addEventListener("change", async (e) => {
         await sendMessage({ action: "TOGGLE_FOCUS_MODE", enabled: e.target.checked });
      });
   }

   if (elements.strictModeToggle) {
      elements.strictModeToggle.addEventListener("change", async (e) => {
         await sendMessage({ action: "TOGGLE_STRICT_MODE", enabled: e.target.checked });
      });
   }

   if (elements.addKeywordBtn && elements.keywordInput) {
      elements.addKeywordBtn.addEventListener("click", async () => {
         const word = elements.keywordInput.value.trim();
         if (word) {
            const res = await sendMessage({ action: "ADD_KEYWORD", word });
            if (res && res.keywords) {
               renderKeywordsList(res.keywords);
               elements.keywordInput.value = "";
            }
         }
      });

      elements.keywordInput.addEventListener("keydown", async (e) => {
         if (e.key === "Enter") {
            const word = elements.keywordInput.value.trim();
            if (word) {
               const res = await sendMessage({ action: "ADD_KEYWORD", word });
               if (res && res.keywords) {
                  renderKeywordsList(res.keywords);
                  elements.keywordInput.value = "";
               }
            }
         }
      });
   }

   // Category Button Listeners
   document.querySelectorAll(".category-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
         const category = btn.dataset.category;
         const isActive = btn.classList.contains("active");

         // Toggle visual state immediately for responsiveness
         btn.classList.toggle("active");

         await sendMessage({
            action: "TOGGLE_CATEGORY",
            category: category,
            enabled: !isActive,
         });
      });
   });

   // Video Utility Listeners
   if (elements.screenshotBtn) {
      elements.screenshotBtn.addEventListener("click", () => {
         sendMessage({ action: "TAKE_SNAPSHOT" });
         window.close(); // Close popup to see notification/download
      });
   }

   if (elements.mirrorBtn) {
      elements.mirrorBtn.addEventListener("click", async () => {
         elements.mirrorBtn.classList.toggle("active");
         const isMirrored = elements.mirrorBtn.classList.contains("active");
         await sendMessage({ action: "TOGGLE_MIRROR", enabled: isMirrored });
      });
   }

   // Boost Settings Listeners
   if (elements.boostKeySelect) {
      elements.boostKeySelect.addEventListener("change", async (e) => {
         await sendMessage({ action: "SET_BOOST_KEY", key: e.target.value });
      });
   }

   if (elements.boostSpeedSlider) {
      elements.boostSpeedSlider.addEventListener("input", (e) => {
         elements.boostSpeedValue.textContent = `${e.target.value}x`;
      });
      elements.boostSpeedSlider.addEventListener("change", async (e) => {
         await sendMessage({ action: "SET_BOOST_SPEED", speed: parseFloat(e.target.value) });
      });
   }

   elements.volSlider.addEventListener("input", (e) => {
      updateUI({ volume: parseFloat(e.target.value) });
   });
   elements.volSlider.addEventListener("change", async (e) => {
      await sendMessage({ action: "SET_VOLUME", value: e.target.value });
   });

   elements.loopA.addEventListener("click", async () => {
      const res = await sendMessage({ action: "SET_LOOP_POINT", point: "start" });
      if (res) updateUI({ loop: res.loop });
   });
   elements.loopB.addEventListener("click", async () => {
      const res = await sendMessage({ action: "SET_LOOP_POINT", point: "end" });
      if (res) updateUI({ loop: res.loop });
   });
   elements.loopClear.addEventListener("click", async () => {
      const res = await sendMessage({ action: "CLEAR_LOOP" });
      if (res) updateUI({ loop: res.loop });
   });

   elements.displayBadge.addEventListener("click", () => {
      if (elements.displayBadge.classList.contains("clickable")) {
         chrome.tabs.create({ url: "https://youtube.com" });
      }
   });

   // ========================================
   // AD BLOCKER TAB FUNCTIONALITY
   // ========================================

   // Load Ad Blocker Stats
   async function loadAdBlockerStats() {
      try {
         const response = await chrome.runtime.sendMessage({ action: "GET_STATS" });
         if (response && elements.statSession && elements.statTotal) {
            elements.statSession.textContent = response.sessionBlocked || 0;
            elements.statTotal.textContent = response.totalBlocked || 0;
         }
      } catch (e) {
         // Service worker might be inactive - show defaults
         console.warn("[AdBlocker] Service worker not ready, using defaults");
         if (elements.statSession && elements.statTotal) {
            elements.statSession.textContent = "0";
            elements.statTotal.textContent = "0";
         }
      }
   }

   // Load Whitelist
   async function loadWhitelist() {
      try {
         const response = await chrome.runtime.sendMessage({ action: "GET_WHITELIST" });
         const whitelist = response?.whitelist || [];

         if (elements.whitelistContainer) {
            if (whitelist.length === 0) {
               elements.whitelistContainer.innerHTML = '<div class="empty-state">No whitelisted sites</div>';
            } else {
               elements.whitelistContainer.innerHTML = whitelist
                  .map(
                     (hostname) => `
                  <div class="whitelist-item">
                     <span class="whitelist-item-domain">${hostname}</span>
                     <button class="whitelist-item-remove" data-hostname="${hostname}">Remove</button>
                  </div>
               `,
                  )
                  .join("");

               // Add remove listeners
               document.querySelectorAll(".whitelist-item-remove").forEach((btn) => {
                  btn.addEventListener("click", async () => {
                     const hostname = btn.dataset.hostname;
                     await chrome.runtime.sendMessage({
                        action: "REMOVE_FROM_WHITELIST",
                        hostname,
                     });
                     await loadWhitelist();
                     await updateToggleButton();
                  });
               });
            }
         }

         if (elements.whitelistCount) {
            elements.whitelistCount.textContent = whitelist.length;
         }
      } catch (e) {
         // Service worker might be inactive - show empty state
         console.warn("[AdBlocker] Service worker not ready for whitelist");
         if (elements.whitelistContainer) {
            elements.whitelistContainer.innerHTML = '<div class="empty-state">No whitelisted sites</div>';
         }
         if (elements.whitelistCount) {
            elements.whitelistCount.textContent = "0";
         }
      }
   }

   // Update Toggle Button Text
   async function updateToggleButton() {
      try {
         const tab = await getActiveTab();
         if (!tab || !tab.url) return;

         // Check if it's an internal page
         const url = new URL(tab.url);
         const isInternalPage = url.protocol === "chrome:" || url.protocol === "about:" || url.protocol === "chrome-extension:";

         if (isInternalPage) {
            // Disable button for internal pages
            if (elements.toggleSiteText) {
               elements.toggleSiteText.textContent = "Not Available";
            }
            if (elements.btnToggleSite) {
               elements.btnToggleSite.disabled = true;
               elements.btnToggleSite.style.opacity = "0.5";
               elements.btnToggleSite.style.cursor = "not-allowed";
            }
            return;
         }

         // Re-enable button for normal pages
         if (elements.btnToggleSite) {
            elements.btnToggleSite.disabled = false;
            elements.btnToggleSite.style.opacity = "1";
            elements.btnToggleSite.style.cursor = "pointer";
         }

         // Try to communicate with service worker, handle if inactive
         let response;
         try {
            response = await chrome.runtime.sendMessage({
               action: "IS_WHITELISTED",
               url: tab.url,
            });
         } catch (e) {
            // Service worker is inactive - use default state
            console.log("[AdBlocker] Service worker inactive, using default state");
            response = { isWhitelisted: false };
         }

         if (elements.toggleSiteText) {
            if (response?.isWhitelisted) {
               elements.toggleSiteText.textContent = "Enable on This Site";
               if (elements.btnToggleSite) {
                  elements.btnToggleSite.classList.add("secondary");
               }
            } else {
               elements.toggleSiteText.textContent = "Disable on This Site";
               if (elements.btnToggleSite) {
                  elements.btnToggleSite.classList.remove("secondary");
               }
            }
         }
      } catch (e) {
         // Silently handle errors - don't spam console
         console.log("[AdBlocker] Toggle button update skipped:", e.message);
      }
   }

   // Toggle Site Whitelist
   if (elements.btnToggleSite) {
      elements.btnToggleSite.addEventListener("click", async () => {
         try {
            const tab = await getActiveTab();
            if (!tab || !tab.url) return;

            const hostname = new URL(tab.url).hostname;

            // Check if whitelisted - with error handling
            let response;
            try {
               response = await chrome.runtime.sendMessage({
                  action: "IS_WHITELISTED",
                  url: tab.url,
               });
            } catch (e) {
               console.log("[AdBlocker] Service worker inactive, assuming not whitelisted");
               response = { isWhitelisted: false };
            }

            // Toggle whitelist status
            try {
               if (response?.isWhitelisted) {
                  // Remove from whitelist
                  await chrome.runtime.sendMessage({
                     action: "REMOVE_FROM_WHITELIST",
                     hostname,
                  });
               } else {
                  // Add to whitelist
                  await chrome.runtime.sendMessage({
                     action: "ADD_TO_WHITELIST",
                     hostname,
                  });
               }

               // Update UI
               await updateToggleButton();
               await loadWhitelist();

               // Show feedback
               const originalText = elements.toggleSiteText.textContent;
               elements.toggleSiteText.textContent = "✓ Updated!";
               setTimeout(() => {
                  updateToggleButton();
               }, 1000);
            } catch (e) {
               // Show error to user
               if (elements.toggleSiteText) {
                  elements.toggleSiteText.textContent = "⚠ Error - Reload";
                  setTimeout(() => {
                     updateToggleButton();
                  }, 2000);
               }
               console.log("[AdBlocker] Failed to toggle whitelist:", e.message);
            }
         } catch (e) {
            console.log("[AdBlocker] Toggle whitelist error:", e.message);
         }
      });
   }

   // Reset Statistics
   if (elements.btnResetStats) {
      elements.btnResetStats.addEventListener("click", async () => {
         if (confirm("Reset all ad blocking statistics?")) {
            try {
               await chrome.runtime.sendMessage({ action: "RESET_STATS" });

               // Update UI
               if (elements.statSession) elements.statSession.textContent = "0";
               if (elements.statTotal) elements.statTotal.textContent = "0";

               // Show feedback
               const btn = elements.btnResetStats;
               const originalHTML = btn.innerHTML;
               btn.innerHTML = "<span>✓ Reset!</span>";
               setTimeout(() => {
                  btn.innerHTML = originalHTML;
               }, 1500);
            } catch (e) {
               console.error("Error resetting stats:", e);
            }
         }
      });
   }

   // Initialize Ad Blocker Tab on popup open
   loadAdBlockerStats();
   loadWhitelist();
   updateToggleButton();

   // Listen for stats updates (optional - for real-time updates)
   chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "STATS_UPDATED") {
         loadAdBlockerStats();
      }
   });

   // ========================================
   // SCREENSHOT FUNCTIONALITY
   // ========================================

   let currentScreenshotMode = "visible";
   let capturedImageData = null;

   // Screenshot Elements
   const screenshotElements = {
      modeButtons: document.querySelectorAll(".screenshot-mode-btn"),
      captureBtn: document.getElementById("btn-capture"),
      exportPanel: document.getElementById("screenshot-export"),
      formatButtons: document.querySelectorAll(".export-format-btn"),
      copyBtn: document.getElementById("btn-copy-clipboard"),
      printBtn: document.getElementById("btn-print"),
   };

   // Mode Selection
   screenshotElements.modeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
         screenshotElements.modeButtons.forEach((b) => b.classList.remove("active"));
         btn.classList.add("active");
         currentScreenshotMode = btn.dataset.mode;
      });
   });

   // Capture Screenshot
   if (screenshotElements.captureBtn) {
      screenshotElements.captureBtn.addEventListener("click", async () => {
         const btn = screenshotElements.captureBtn;
         const originalHTML = btn.innerHTML;

         try {
            // Show loading state
            btn.classList.add("loading");
            btn.innerHTML = "<span>Capturing...</span>";

            const tab = await getActiveTab();
            if (!tab || !tab.id) {
               throw new Error("No active tab");
            }

            // Send capture request to content script
            const response = await new Promise((resolve) => {
               chrome.tabs.sendMessage(
                  tab.id,
                  {
                     action: "CAPTURE_SCREENSHOT",
                     mode: currentScreenshotMode,
                  },
                  (response) => {
                     if (chrome.runtime.lastError) {
                        resolve(null);
                     } else {
                        resolve(response);
                     }
                  },
               );
            });

            if (response && response.dataUrl) {
               capturedImageData = response.dataUrl;
               screenshotElements.exportPanel.style.display = "block";
               btn.innerHTML =
                  '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg><span>Captured!</span>';
               setTimeout(() => {
                  btn.innerHTML = originalHTML;
                  btn.classList.remove("loading");
               }, 1500);
            } else {
               // More specific error message
               const errorMsg = response?.error || "Reload page first";
               console.error("Screenshot failed:", errorMsg);

               // Show helpful message if it's likely a reload issue
               if (!response || errorMsg.includes("not available") || errorMsg.includes("Reload")) {
                  btn.innerHTML = '<span style="font-size: 11px;">↻ Reload Page</span>';
                  btn.style.cursor = "pointer";
                  btn.onclick = () => {
                     chrome.tabs.reload(tab.id);
                     setTimeout(() => {
                        btn.innerHTML = originalHTML;
                        btn.style.cursor = "";
                        btn.onclick = null;
                     }, 1000);
                  };
                  setTimeout(() => {
                     if (btn.onclick) {
                        btn.innerHTML = originalHTML;
                        btn.style.cursor = "";
                        btn.onclick = null;
                     }
                  }, 5000);
                  return;
               }

               throw new Error(errorMsg);
            }
         } catch (error) {
            console.error("Screenshot error:", error);
            btn.innerHTML = `<span>❌ ${error.message || "Failed"}</span>`;
            btn.classList.remove("loading");
            setTimeout(() => {
               btn.innerHTML = originalHTML;
            }, 2500);
         }
      });
   }

   // Export Format Buttons
   screenshotElements.formatButtons.forEach((btn) => {
      btn.addEventListener("click", async () => {
         if (!capturedImageData) return;

         const format = btn.dataset.format;
         const tab = await getActiveTab();

         try {
            // Send conversion request
            const response = await new Promise((resolve) => {
               chrome.tabs.sendMessage(
                  tab.id,
                  {
                     action: "CONVERT_SCREENSHOT",
                     dataUrl: capturedImageData,
                     format: format,
                  },
                  (response) => {
                     if (chrome.runtime.lastError) {
                        resolve(null);
                     } else {
                        resolve(response);
                     }
                  },
               );
            });

            if (response && response.dataUrl) {
               // Download
               const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
               const filename = `screenshot_${timestamp}.${format}`;

               const link = document.createElement("a");
               link.href = response.dataUrl;
               link.download = filename;
               link.click();

               // Visual feedback
               const originalText = btn.textContent;
               btn.textContent = "✓";
               setTimeout(() => {
                  btn.textContent = originalText;
               }, 1000);
            }
         } catch (error) {
            console.error("Export error:", error);
         }
      });
   });

   // Copy to Clipboard
   if (screenshotElements.copyBtn) {
      screenshotElements.copyBtn.addEventListener("click", async () => {
         if (!capturedImageData) return;

         const originalHTML = screenshotElements.copyBtn.innerHTML;

         try {
            // Copy directly in popup (where document is focused)
            // Method 1: Try copying as image blob
            try {
               const blob = await (await fetch(capturedImageData)).blob();
               await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);

               screenshotElements.copyBtn.innerHTML =
                  '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Copied!';
               setTimeout(() => {
                  screenshotElements.copyBtn.innerHTML = originalHTML;
               }, 2000);
               return;
            } catch (e) {
               console.warn("Image copy failed, trying text:", e.message);
            }

            // Method 2: Try copying as text (fallback)
            try {
               await navigator.clipboard.writeText(capturedImageData);

               screenshotElements.copyBtn.innerHTML =
                  '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Copied!';
               setTimeout(() => {
                  screenshotElements.copyBtn.innerHTML = originalHTML;
               }, 2000);
               return;
            } catch (e2) {
               console.error("Text copy also failed:", e2.message);
            }

            // Both methods failed
            screenshotElements.copyBtn.innerHTML = '<span style="font-size: 10px;">Use PNG/JPEG</span>';
            setTimeout(() => {
               screenshotElements.copyBtn.innerHTML = originalHTML;
            }, 3000);
         } catch (error) {
            console.error("Copy error:", error);
            screenshotElements.copyBtn.innerHTML = '<span style="font-size: 10px;">Use PNG/JPEG</span>';
            setTimeout(() => {
               screenshotElements.copyBtn.innerHTML = originalHTML;
            }, 3000);
         }
      });
   }

   // Print
   if (screenshotElements.printBtn) {
      screenshotElements.printBtn.addEventListener("click", async () => {
         if (!capturedImageData) return;

         const tab = await getActiveTab();

         try {
            chrome.tabs.sendMessage(tab.id, {
               action: "PRINT_SCREENSHOT",
               dataUrl: capturedImageData,
            });
         } catch (error) {
            console.error("Print error:", error);
         }
      });
   }

   // ============================================================================
   // THUMBNAIL DOWNLOADER
   // ============================================================================

   const thumbnailElements = {
      qualityBtns: document.querySelectorAll(".thumbnail-quality-btn"),
      downloadBtn: document.getElementById("btn-download-thumbnail"),
      preview: document.getElementById("thumbnail-preview"),
      img: document.getElementById("thumbnail-img"),
      status: document.getElementById("thumbnail-status"),
   };

   let selectedQuality = "maxresdefault";
   let currentVideoId = null;

   // Extract YouTube video ID from URL
   function getYouTubeVideoId(url) {
      const patterns = [
         /youtube\.com\/watch\?v=([^&\n?#]+)/,
         /youtu\.be\/([^&\n?#]+)/,
         /youtube\.com\/embed\/([^&\n?#]+)/,
         /youtube\.com\/v\/([^&\n?#]+)/,
         /youtube\.com\/shorts\/([^&\n?#]+)/,
      ];

      for (const pattern of patterns) {
         const match = url.match(pattern);
         if (match && match[1]) {
            return match[1];
         }
      }
      return null;
   }

   // Get thumbnail URL
   function getThumbnailUrl(videoId, quality) {
      return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
   }

   // Show status message
   function showThumbnailStatus(message, isError = false) {
      if (thumbnailElements.status) {
         thumbnailElements.status.textContent = message;
         thumbnailElements.status.style.display = "block";
         thumbnailElements.status.style.backgroundColor = isError ? "rgba(255, 59, 48, 0.1)" : "rgba(52, 199, 89, 0.1)";
         thumbnailElements.status.style.color = isError ? "#ff3b30" : "#34c759";

         setTimeout(() => {
            thumbnailElements.status.style.display = "none";
         }, 3000);
      }
   }

   // Load and preview thumbnail
   async function loadThumbnailPreview() {
      try {
         await new Promise((r) => setTimeout(r, 300)); // ⬅ allow popup to stabilize

         const [tab] = await chrome.tabs.query({
            active: true,
            lastFocusedWindow: true,
         });

         if (!tab?.url || (!tab.url.includes("youtube.com") && !tab.url.includes("youtu.be"))) {
            showThumbnailStatus("Open a YouTube video tab", true);
            return;
         }

         currentVideoId = getYouTubeVideoId(tab.url);

         if (!currentVideoId) {
            showThumbnailStatus("Video ID not found", true);
            return;
         }

         const thumbnailUrl = getThumbnailUrl(currentVideoId, selectedQuality);
         thumbnailElements.img.src = thumbnailUrl;
         thumbnailElements.preview.style.display = "block";
      } catch (err) {
         console.error(err);
         showThumbnailStatus("Failed to detect video", true);
      }
   }

   // Quality button selection
   if (thumbnailElements.qualityBtns) {
      thumbnailElements.qualityBtns.forEach((btn) => {
         btn.addEventListener("click", () => {
            // Update active state
            thumbnailElements.qualityBtns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");

            // Update selected quality
            selectedQuality = btn.dataset.quality;

            // Reload preview
            if (currentVideoId) {
               loadThumbnailPreview();
            }
         });
      });
   }

   // Download thumbnail
   if (thumbnailElements.downloadBtn) {
      thumbnailElements.downloadBtn.addEventListener("click", async () => {
         if (!currentVideoId) {
            showThumbnailStatus("No video detected", true);
            return;
         }

         try {
            const thumbnailUrl = getThumbnailUrl(currentVideoId, selectedQuality);

            // Fetch the image as blob
            const response = await fetch(thumbnailUrl);
            const blob = await response.blob();

            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `youtube_thumbnail_${currentVideoId}_${selectedQuality}.jpg`;
            link.click();

            // Cleanup
            URL.revokeObjectURL(url);

            // Show success
            showThumbnailStatus("✓ Thumbnail downloaded!");

            // Visual feedback on button
            const originalHTML = thumbnailElements.downloadBtn.innerHTML;
            thumbnailElements.downloadBtn.innerHTML = `
               <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
               </svg>
               <span>Downloaded!</span>
            `;

            setTimeout(() => {
               thumbnailElements.downloadBtn.innerHTML = originalHTML;
            }, 2000);
         } catch (error) {
            console.error("Download error:", error);
            showThumbnailStatus("Download failed", true);
         }
      });
   }

   // Auto-load thumbnail when Tools tab is opened
   const toolsTab = document.querySelector('[data-target="view-tools"]');

   if (toolsTab) {
      toolsTab.addEventListener("click", () => {
         setTimeout(() => {
            loadThumbnailPreview();
         }, 300);
      });
   }

   // Initial load if already on Tools tab
   const viewTools = document.getElementById("view-tools");
   if (viewTools && viewTools.style.display !== "none") {
      setTimeout(() => {
         loadThumbnailPreview();
      }, 500);
   }

   // ============================================================================
   // CUSTOM SPEED PRESETS
   // ============================================================================

   const presetElements = {
      addBtn: document.getElementById("btn-add-preset"),
      modal: document.getElementById("preset-modal"),
      closeBtn: document.getElementById("close-preset-modal"),
      saveBtn: document.getElementById("save-preset-btn"),
      nameInput: document.getElementById("preset-name-input"),
      speedInput: document.getElementById("preset-speed-input"),
      presetsList: document.getElementById("presets-list"),
      emojiButtons: document.querySelectorAll(".emoji-btn"),
   };

   let selectedEmoji = "⚡";
   let presets = [];

   // Load presets from storage
   async function loadPresets() {
      const result = await chrome.storage.local.get(["speedPresets"]);
      presets = result.speedPresets || [];
      renderPresets();
   }

   // Save presets to storage
   async function savePresets() {
      await chrome.storage.local.set({ speedPresets: presets });
   }

   // Render presets list
   function renderPresets() {
      if (presets.length === 0) {
         presetElements.presetsList.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 20px; color: var(--text-secondary); font-size: 11px;">
               No presets yet. Click + to add one!
            </div>
         `;
         return;
      }

      presetElements.presetsList.innerHTML = presets
         .map(
            (preset, index) => `
         <div class="preset-item" data-index="${index}">
            <div class="preset-info">
               <span class="preset-emoji">${preset.emoji}</span>
               <span class="preset-name">${preset.name}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
               <span class="preset-speed">${preset.speed}x</span>
               <button class="preset-delete" data-index="${index}">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                     <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
               </button>
            </div>
         </div>
      `,
         )
         .join("");

      // Add click handlers
      document.querySelectorAll(".preset-item").forEach((item) => {
         item.addEventListener("click", (e) => {
            if (!e.target.closest(".preset-delete")) {
               const index = parseInt(item.dataset.index);
               applyPreset(presets[index]);
            }
         });
      });

      // Add delete handlers
      document.querySelectorAll(".preset-delete").forEach((btn) => {
         btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            deletePreset(index);
         });
      });
   }

   // Apply preset speed
   async function applyPreset(preset) {
      const tab = await getActiveTab();
      chrome.tabs.sendMessage(tab.id, {
         action: "SET_SPEED",
         speed: preset.speed,
      });

      // Update UI
      elements.displayBadge.textContent = `${preset.speed}x`;

      // Visual feedback
      const presetItem = document.querySelector(`[data-index]`);
      if (presetItem) {
         presetItem.style.transform = "scale(0.95)";
         setTimeout(() => {
            presetItem.style.transform = "";
         }, 200);
      }
   }

   // Delete preset
   function deletePreset(index) {
      presets.splice(index, 1);
      savePresets();
      renderPresets();
   }

   // Open modal
   if (presetElements.addBtn) {
      presetElements.addBtn.addEventListener("click", () => {
         presetElements.modal.style.display = "flex";
         presetElements.nameInput.value = "";
         presetElements.speedInput.value = "1.5";
         selectedEmoji = "⚡";
         presetElements.emojiButtons.forEach((btn) => btn.classList.remove("selected"));
      });
   }

   // Close modal
   if (presetElements.closeBtn) {
      presetElements.closeBtn.addEventListener("click", () => {
         presetElements.modal.style.display = "none";
      });
   }

   // Close modal on outside click
   if (presetElements.modal) {
      presetElements.modal.addEventListener("click", (e) => {
         if (e.target === presetElements.modal) {
            presetElements.modal.style.display = "none";
         }
      });
   }

   // Emoji selection
   if (presetElements.emojiButtons) {
      presetElements.emojiButtons.forEach((btn) => {
         btn.addEventListener("click", () => {
            presetElements.emojiButtons.forEach((b) => b.classList.remove("selected"));
            btn.classList.add("selected");
            selectedEmoji = btn.dataset.emoji;
         });
      });
   }

   // Save preset
   if (presetElements.saveBtn) {
      presetElements.saveBtn.addEventListener("click", () => {
         const name = presetElements.nameInput.value.trim();
         const speed = parseFloat(presetElements.speedInput.value);

         if (!name) {
            presetElements.nameInput.style.borderColor = "#ff3b30";
            setTimeout(() => {
               presetElements.nameInput.style.borderColor = "";
            }, 1000);
            return;
         }

         if (isNaN(speed) || speed < 0.25 || speed > 16) {
            presetElements.speedInput.style.borderColor = "#ff3b30";
            setTimeout(() => {
               presetElements.speedInput.style.borderColor = "";
            }, 1000);
            return;
         }

         // Add preset
         presets.push({
            name,
            speed,
            emoji: selectedEmoji,
         });

         savePresets();
         renderPresets();
         presetElements.modal.style.display = "none";

         // Visual feedback
         const originalHTML = presetElements.saveBtn.innerHTML;
         presetElements.saveBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
               <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <span>Saved!</span>
         `;
         setTimeout(() => {
            presetElements.saveBtn.innerHTML = originalHTML;
         }, 1000);
      });
   }

   // Load presets on startup
   loadPresets();
});
