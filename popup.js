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

      // New Boost Controls
      boostKeySelect: document.getElementById("boostKeySelect"),
      boostSpeedSlider: document.getElementById("boostSpeedSlider"),
      boostSpeedValue: document.getElementById("boostSpeedValue"),

      volSlider: document.getElementById("vol-slider"),
      volValue: document.getElementById("vol-value"),
      loopA: document.getElementById("btn-loop-a"),
      loopB: document.getElementById("btn-loop-b"),
      loopClear: document.getElementById("btn-loop-clear"),
      loopStatus: document.getElementById("loop-status"),
      timeA: document.getElementById("time-a"),
      timeB: document.getElementById("time-b"),
   };

   // Nav Items
   const navItems = document.querySelectorAll(".nav-item");
   const views = {
      "view-speed": document.getElementById("view-speed"),
      "view-tools": document.getElementById("view-tools"),
      "view-settings": document.getElementById("view-settings"),
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
});
