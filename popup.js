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
      adblockGlobalToggle: document.getElementById("adblock-global-toggle"),

      // VIDEO ENHANCER (Cinema Mode)
      filterBrightness: document.getElementById("filter-brightness"),
      filterContrast: document.getElementById("filter-contrast"),
      filterSaturation: document.getElementById("filter-saturation"),
      filterGrayscale: document.getElementById("filter-grayscale"),
      filterInvert: document.getElementById("filter-invert"),
      btnRotate: document.getElementById("btn-rotate"),
      valBrightness: document.getElementById("val-brightness"),
      valContrast: document.getElementById("val-contrast"),
      valSaturation: document.getElementById("val-saturation"),
      btnResetFilters: document.getElementById("btn-reset-filters"),
      btnPip: document.getElementById("btn-pip"),

      // Collapsible
      headerCinemaMode: document.getElementById("header-cinema-mode"),
      contentCinemaMode: document.getElementById("content-cinema-mode"),

      // Page Eraser (Zapper)
      btnToggleZapper: document.getElementById("btn-toggle-zapper"),
      btnResetZaps: document.getElementById("btn-reset-zaps"),
      zapperStatus: document.getElementById("zapper-status"),
      zapperLight: document.getElementById("zapper-light"),
      zapperControls: document.getElementById("zapper-controls"),

      // Factory Reset
      btnFactoryReset: document.getElementById("btn-factory-reset"),

      // Timestamp Notes
      notesToggle: document.getElementById("notes-toggle"),
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
      if (tab && tab.id) {
         // Support all sites for universal tools
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

      // AdBlocker Global Toggle
      if (state.adblockEnabled !== undefined && elements.adblockGlobalToggle) {
         elements.adblockGlobalToggle.checked = state.adblockEnabled;
      }

      // Filters (Cinema Mode)
      if (state.filters) {
         if (elements.filterBrightness) {
            elements.filterBrightness.value = state.filters.brightness;
            elements.valBrightness.textContent = `${state.filters.brightness}%`;
         }
         if (elements.filterContrast) {
            elements.filterContrast.value = state.filters.contrast;
            elements.valContrast.textContent = `${state.filters.contrast}%`;
         }
         if (elements.filterSaturation) {
            elements.filterSaturation.value = state.filters.saturation;
            elements.valSaturation.textContent = `${state.filters.saturation}%`;
         }
         if (elements.filterGrayscale) elements.filterGrayscale.checked = state.filters.grayscale;
         if (elements.filterInvert) elements.filterInvert.checked = state.filters.invert;

         // Update Cinema Mode Header Active State
         if (elements.headerCinemaMode) {
            const isActive = checkCinemaModeActive(state.filters);
            if (isActive) {
               elements.headerCinemaMode.style.borderLeft = "3px solid var(--primary-color)";
               elements.headerCinemaMode.style.background = "rgba(255, 255, 255, 0.05)";
               if (elements.btnResetFilters) elements.btnResetFilters.style.display = "flex";
            } else {
               elements.headerCinemaMode.style.borderLeft = "none";
               elements.headerCinemaMode.style.background = "";
               if (elements.btnResetFilters) elements.btnResetFilters.style.display = "none";
            }
         }
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

         // 1. Load Local Storage First (Fastest, persists even if content script is asleep)
         const storageData = await chrome.storage.local.get([
            "boostKey",
            "boostSpeed",
            "isAutoSkipEnabled",
            "isSpeedAdEnabled",
            "isZenModeEnabled",
            "isBoosterEnabled",
            "isAutoScrollShortsEnabled",
            "activeCategories",
            "customCategories",
            "focusKeywords",
            "isFocusModeEnabled",
            "isStrictModeEnabled",
            "volume",
            "filters", // Load filters from storage
            "universal_ad_blocker_enabled",
         ]);

         // Map storage keys to UI state object
         const localState = {
            boostKey: storageData.boostKey,
            boostSpeed: storageData.boostSpeed,
            autoSkip: storageData.isAutoSkipEnabled,
            speedAds: storageData.isSpeedAdEnabled,
            zenMode: storageData.isZenModeEnabled,
            booster: storageData.isBoosterEnabled,
            autoScrollShorts: storageData.isAutoScrollShortsEnabled,
            activeCategories: storageData.activeCategories,
            customCategories: storageData.customCategories,
            keywords: storageData.focusKeywords,
            focusMode: storageData.isFocusModeEnabled,
            strictMode: storageData.isStrictModeEnabled,
            volume: storageData.volume,
            filters: storageData.filters,
            adblockEnabled: storageData.universal_ad_blocker_enabled,
         };

         // Apply local state immediately
         updateUI(localState);

         // 2. Then check active tab for real-time speed/content data
         if (tab && tab.url && (tab.url.includes("youtube.com") || tab.url.includes("youtu.be"))) {
            chrome.tabs.sendMessage(tab.id, { action: "GET_STATE" }, (response) => {
               elements.displayBadge.classList.remove("clickable", "error");
               if (chrome.runtime.lastError || !response) {
                  // Content script might be dead or not loaded, but we have local settings
                  // Only show error if we really need interaction
                  // console.log("Content script not ready:", chrome.runtime.lastError);
               } else {
                  elements.displayBadge.style = "";
                  // Merge: Local storage is truth for settings, Response is truth for runtime (speed, loop)
                  updateUI({ ...localState, ...response });
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

   // FILTER LISTENERS (DEBOUNCED)
   const sendFilterUpdate = async (filters) => {
      await sendMessage({ action: "SET_FILTERS", filters });
   };

   if (elements.filterBrightness) {
      elements.filterBrightness.addEventListener("input", (e) => {
         elements.valBrightness.textContent = `${e.target.value}%`;
         sendFilterUpdate({ brightness: parseInt(e.target.value) });
      });
   }
   if (elements.filterContrast) {
      elements.filterContrast.addEventListener("input", (e) => {
         elements.valContrast.textContent = `${e.target.value}%`;
         sendFilterUpdate({ contrast: parseInt(e.target.value) });
      });
   }
   if (elements.filterSaturation) {
      elements.filterSaturation.addEventListener("input", (e) => {
         elements.valSaturation.textContent = `${e.target.value}%`;
         sendFilterUpdate({ saturation: parseInt(e.target.value) });
      });
   }
   if (elements.filterGrayscale) {
      elements.filterGrayscale.addEventListener("change", (e) => {
         sendFilterUpdate({ grayscale: e.target.checked });
      });
   }
   if (elements.filterInvert) {
      elements.filterInvert.addEventListener("change", (e) => {
         sendFilterUpdate({ invert: e.target.checked });
      });
   }
   if (elements.btnRotate) {
      elements.btnRotate.addEventListener("click", () => {
         // We need current state to rotate increments.
         // Since we don't have local state easily sync'd here without reading UI, we can just send "INCREMENT_ROTATE" or manage it carefully.
         // Better: fetch current from UI (if we stored it) or rely on sync.
      });
   }
   // Improved Rotate Logic:
   // We rely on `updateUI` to keep `currentFilters` in scope?
   // No, simpler:
   elements.btnRotate.onclick = async () => {
      // Get current rotation from content script first to be safe? Or trust local storage?
      // Let's query state first.
      const current = await sendMessage({ action: "GET_STATE" });
      let deg = 0;
      if (current && current.filters) {
         deg = current.filters.rotate || 0;
      }
      deg = (deg + 90) % 360;
      await sendMessage({ action: "SET_FILTERS", filters: { rotate: deg } });
   };

   // --- Collapsible Logic ---
   if (elements.headerCinemaMode && elements.contentCinemaMode) {
      elements.headerCinemaMode.addEventListener("click", (e) => {
         // Don't toggle if clicking reset button
         if (e.target.closest("#btn-reset-filters")) return;

         const content = elements.contentCinemaMode;
         const chevron = elements.headerCinemaMode.querySelector(".chevron-icon");

         const isExpanded = content.style.display !== "none";
         content.style.display = isExpanded ? "none" : "block";
         if (chevron) {
            chevron.style.transform = isExpanded ? "rotate(0deg)" : "rotate(180deg)";
         }
      });

      // Initialize State based on whether filters are active
      // We do this inside updateUI or here if we have state access.
      // Handled in updateUI via a check.
   }

   // Helper function for Cinema Mode State
   const checkCinemaModeActive = (filters) => {
      if (!filters) return false;
      return (
         filters.brightness !== 100 ||
         filters.contrast !== 100 ||
         filters.saturation !== 100 ||
         filters.grayscale ||
         filters.invert ||
         (filters.rotate && filters.rotate !== 0)
      );
   };

   if (elements.btnPip) {
      elements.btnPip.addEventListener("click", async (e) => {
         e.stopPropagation();
         const res = await sendMessage({ action: "TOGGLE_PIP" });
         if (res && res.error) {
            console.error("PiP failed", res.error);
            elements.btnPip.textContent = "Error";
         } else {
            // Toggle active state
            const isActive = res && res.active;
            elements.btnPip.textContent = isActive ? "Close PiP" : "Open PiP";
            if (isActive) {
               elements.btnPip.style.background = "#ff5555";
               elements.btnPip.style.borderColor = "#ff5555";
               elements.btnPip.style.color = "white";
            } else {
               elements.btnPip.style.background = "rgba(255,255,255,0.1)";
               elements.btnPip.style.borderColor = "rgba(255,255,255,0.1)";
               elements.btnPip.style.color = "";
            }
         }
      });
   }

   if (elements.btnToggleZapper) {
      let isZapping = false;
      elements.btnToggleZapper.addEventListener("click", async () => {
         const nextState = !isZapping;
         const res = await sendMessage({ action: "TOGGLE_ZAPPER", enabled: nextState });

         if (!res) {
            alert(
               "Could not start Zapper. Please refresh the page and try again. (Note: It doesn't work on official browser pages like chrome://)",
            );
            return;
         }

         isZapping = nextState;

         if (isZapping) {
            elements.btnToggleZapper.innerHTML = `
                <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                    <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
                </svg>
                <span>Stop Magic Wipe</span>`;
            elements.btnToggleZapper.style.background = "#ff416c";
            elements.btnToggleZapper.style.boxShadow = "0 4px 15px rgba(255, 65, 108, 0.3)";

            if (elements.zapperStatus) {
               elements.zapperStatus.textContent = "MAGIC ACTIVE";
               elements.zapperStatus.style.color = "#00ff7f";
            }
            if (elements.zapperLight) {
               elements.zapperLight.style.background = "#00ff7f";
               elements.zapperLight.style.animation = "pulse-green 2s infinite";
            }
            elements.zapperControls.style.display = "block";
         } else {
            elements.btnToggleZapper.innerHTML = `
                <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                    <path d="M7.5,5.6L5,7L6.4,4.5L5,2L7.5,3.4L10,2L8.6,4.5L10,7L7.5,5.6M19.5,15.4L22,14L20.6,16.5L22,19L19.5,17.6L17,19L18.4,16.5L17,14L19.5,15.4M22,2L20.6,4.5L22,7L19.5,5.6L17,7L18.4,4.5L17,2L19.5,3.4L22,2M13.38,12.81L4.41,21.78C4.21,21.97 3.9,21.97 3.71,21.78L2.22,20.29C2.03,20.1 2.03,19.79 2.22,19.59L11.19,10.62L13.38,12.81M14.5,11.69L12.31,9.5L15.04,6.77C15.23,6.58 15.55,6.58 15.74,6.77L17.23,8.26C17.42,8.45 17.42,8.77 17.23,8.96L14.5,11.69Z" />
                </svg>
                <span>Start Magic Wipe</span>`;
            elements.btnToggleZapper.style.background = "linear-gradient(135deg, #6e8efb 0%, #a777e3 100%)";
            elements.btnToggleZapper.style.boxShadow = "0 4px 15px rgba(110, 142, 251, 0.2)";

            if (elements.zapperStatus) {
               elements.zapperStatus.textContent = "READY TO SLICE";
               elements.zapperStatus.style.color = "#ff416c";
            }
            if (elements.zapperLight) {
               elements.zapperLight.style.background = "#ff416c";
               elements.zapperLight.style.animation = "pulse-red 2s infinite";
            }
            elements.zapperControls.style.display = "none";
         }
      });
   }

   if (elements.btnResetZaps) {
      elements.btnResetZaps.addEventListener("click", async () => {
         if (confirm("Restore all hidden elements on this site?")) {
            const res = await sendMessage({ action: "CLEAR_ZAPS" });
            if (res && res.success) {
               alert("All elements restored! Page will reload to apply changes.");
               const tab = await getActiveTab();
               if (tab && tab.id) chrome.tabs.reload(tab.id);
            }
         }
      });
   }

   if (elements.btnFactoryReset) {
      elements.btnFactoryReset.addEventListener("click", async () => {
         const confirmReset = confirm(
            "⚠️ DANGER ZONE: This will wipe ALL settings, zaps, categories, and keywords. You cannot undo this.\n\nAre you absolutely sure?",
         );

         if (confirmReset) {
            elements.btnFactoryReset.textContent = "Wiping...";
            elements.btnFactoryReset.disabled = true;

            chrome.storage.local.clear(() => {
               setTimeout(() => {
                  alert("Factory Reset Complete! All settings have been restored to default.");
                  location.reload();
                  getActiveTab().then((tab) => {
                     if (tab && tab.id) chrome.tabs.reload(tab.id);
                  });
               }, 500); // Small delay for visual impact
            });
         }
      });
   }

   if (elements.btnResetFilters) {
      elements.btnResetFilters.addEventListener("click", async () => {
         const defaults = {
            brightness: 100,
            contrast: 100,
            saturation: 100,
            grayscale: false,
            invert: false,
            rotate: 0,
         };
         updateUI({ filters: defaults }); // Optimistic
         await sendMessage({ action: "SET_FILTERS", filters: defaults });
      });
   }

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
   /*
   if (elements.screenshotBtn) {
      elements.screenshotBtn.addEventListener("click", () => {
         sendMessage({ action: "TAKE_SNAPSHOT" });
         window.close(); // Close popup to see notification/download
      });
   }
   */

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

   // Handle Global Toggle
   if (elements.adblockGlobalToggle) {
      elements.adblockGlobalToggle.addEventListener("change", async (e) => {
         const isEnabled = e.target.checked;
         await chrome.runtime.sendMessage({
            action: "TOGGLE_ENABLED",
            enabled: isEnabled,
         });
         // Refresh stats/ui
         loadAdBlockerStats();
      });
   }

   // Load Ad Blocker Stats (Directly from storage for speed and reliability)
   async function loadAdBlockerStats() {
      try {
         // Try to get from storage first (Truth)
         const storageData = await chrome.storage.local.get(["universal_ad_blocker_stats"]);
         const stats = storageData.universal_ad_blocker_stats;

         if (stats && elements.statSession && elements.statTotal) {
            elements.statSession.textContent = stats.sessionBlocked || 0;
            elements.statTotal.textContent = stats.totalBlocked || 0;

            // Also update global toggle from storage if available
            if (stats.isEnabled !== undefined && elements.adblockGlobalToggle) {
               elements.adblockGlobalToggle.checked = stats.isEnabled;
            }
            return;
         }

         // Fallback to messaging if storage is empty (unlikely)
         const response = await chrome.runtime.sendMessage({ action: "GET_STATS" });
         if (response && elements.statSession && elements.statTotal) {
            elements.statSession.textContent = response.sessionBlocked || 0;
            elements.statTotal.textContent = response.totalBlocked || 0;

            if (response.isEnabled !== undefined && elements.adblockGlobalToggle) {
               elements.adblockGlobalToggle.checked = response.isEnabled;
            }
         }
      } catch (e) {
         // Silently handle if storage/worker is perfectly cold
         if (elements.statSession && elements.statTotal) {
            elements.statSession.textContent = "0";
            elements.statTotal.textContent = "0";
         }
      }
   }

   // Load Whitelist (Optimized for instant load)
   async function loadWhitelist() {
      try {
         // Storage is always faster than waking up the service worker
         const storageData = await chrome.storage.local.get(["universal_ad_blocker_whitelist"]);
         const whitelist = storageData.universal_ad_blocker_whitelist || [];

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
                     // Refresh UI
                     loadWhitelist();
                     updateToggleButton();
                  });
               });
            }
         }

         if (elements.whitelistCount) {
            elements.whitelistCount.textContent = whitelist.length;
         }
      } catch (e) {
         if (elements.whitelistContainer) {
            elements.whitelistContainer.innerHTML = '<div class="empty-state">No whitelisted sites</div>';
         }
         if (elements.whitelistCount) {
            elements.whitelistCount.textContent = "0";
         }
      }
   }

   // Update Toggle Button Text (Direct storage check to avoid worker delays)
   async function updateToggleButton() {
      try {
         // Check global state first
         const statsRes = await chrome.runtime.sendMessage({ action: "GET_STATS" });
         const isGlobalEnabled = statsRes?.isEnabled;

         const tab = await getActiveTab();
         if (!tab || !tab.url) return;

         const url = new URL(tab.url);
         const isInternalPage = url.protocol === "chrome:" || url.protocol === "about:" || url.protocol === "chrome-extension:";

         if (isInternalPage) {
            if (elements.toggleSiteText) elements.toggleSiteText.textContent = "Not Available";
            if (elements.btnToggleSite) {
               elements.btnToggleSite.disabled = true;
               elements.btnToggleSite.style.opacity = "0.5";
               elements.btnToggleSite.style.cursor = "not-allowed";
            }
            return;
         }

         // If global is OFF, we can't toggle per-site (it's all off)
         if (!isGlobalEnabled) {
            if (elements.toggleSiteText) elements.toggleSiteText.textContent = "Global Protection is OFF";
            if (elements.btnToggleSite) {
               elements.btnToggleSite.disabled = true;
               elements.btnToggleSite.style.opacity = "0.5";
               elements.btnToggleSite.style.cursor = "not-allowed";
            }
            return;
         }

         if (elements.btnToggleSite) {
            elements.btnToggleSite.disabled = false;
            elements.btnToggleSite.style.opacity = "1";
            elements.btnToggleSite.style.cursor = "pointer";
         }

         // Check storage for whitelist
         const storageData = await chrome.storage.local.get(["universal_ad_blocker_whitelist"]);
         const whitelist = storageData.universal_ad_blocker_whitelist || [];
         const isWhitelisted = whitelist.includes(url.hostname);

         if (elements.toggleSiteText) {
            if (isWhitelisted) {
               elements.toggleSiteText.textContent = "Enable on This Site";
               if (elements.btnToggleSite) elements.btnToggleSite.classList.add("secondary");
            } else {
               elements.toggleSiteText.textContent = "Disable on This Site";
               if (elements.btnToggleSite) elements.btnToggleSite.classList.remove("secondary");
            }
         }
      } catch (e) {
         // Silently handle
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
               // Service worker inactive
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
               // Silently handle
            }
         } catch (e) {
            // Silently handle
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

   // ============================================================================
   // TIMESTAMP NOTES
   // ============================================================================

   // Load notes toggle state
   chrome.storage.local.get(["notesEnabled"], (result) => {
      if (elements.notesToggle) {
         elements.notesToggle.checked = result.notesEnabled || false;
      }
   });

   // Handle notes toggle
   if (elements.notesToggle) {
      elements.notesToggle.addEventListener("change", async (e) => {
         const enabled = e.target.checked;

         // Save state
         await chrome.storage.local.set({ notesEnabled: enabled });

         // Send message to content script
         await sendMessage({
            action: "TOGGLE_NOTES_MODE",
            enabled: enabled,
         });
      });
   }
});
