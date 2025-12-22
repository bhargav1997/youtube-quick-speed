document.addEventListener("DOMContentLoaded", () => {
   // Elements
   const elements = {
      speedButtons: document.querySelectorAll(".speed-btn"),
      displayBadge: document.getElementById("current-speed-display"),
      resetBtn: document.getElementById("reset-btn"),
      autoSkipToggle: document.getElementById("auto-skip-toggle"),
      speedAdsToggle: document.getElementById("speed-ads-toggle"),
      zenModeToggle: document.getElementById("zen-mode-toggle"), // NEW
      volSlider: document.getElementById("vol-slider"),
      volValue: document.getElementById("vol-value"),
      loopA: document.getElementById("btn-loop-a"),
      loopB: document.getElementById("btn-loop-b"),
      loopClear: document.getElementById("btn-loop-clear"),
      loopStatus: document.getElementById("loop-status"),
      timeA: document.getElementById("time-a"),
      timeB: document.getElementById("time-b"),
   };

   // Helper: Format seconds to MM:SS
   const formatTime = (seconds) => {
      if (seconds === null || seconds === undefined) return "Set";
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s.toString().padStart(2, "0")}`;
   };

   // Helper: Query active tab
   async function getActiveTab() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab;
   }

   // Helper: Send Message safely
   async function sendMessage(payload) {
      const tab = await getActiveTab();
      if (tab && tab.id && (tab.url.includes("youtube.com") || tab.url.includes("youtu.be"))) {
         return new Promise((resolve) => {
            chrome.tabs.sendMessage(tab.id, payload, resolve);
         });
      }
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
      if (state.autoSkip !== undefined) elements.autoSkipToggle.checked = state.autoSkip;
      if (state.speedAds !== undefined) elements.speedAdsToggle.checked = state.speedAds;
      if (state.zenMode !== undefined) elements.zenModeToggle.checked = state.zenMode; // NEW

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
         if (tab.url && (tab.url.includes("youtube.com") || tab.url.includes("youtu.be"))) {
            chrome.tabs.sendMessage(tab.id, { action: "GET_STATE" }, (response) => {
               elements.displayBadge.classList.remove("clickable", "error");
               if (chrome.runtime.lastError) {
                  elements.displayBadge.textContent = "Reload";
                  elements.displayBadge.classList.add("error");
               } else {
                  elements.displayBadge.style = "";
                  updateUI(response);
               }
            });
         } else {
            elements.displayBadge.innerHTML = `
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.34 4.83-.18 1.03-.5 1.79-.96 2.28-.46.49-1.2.73-2.2.73L12 20c-3.15 0-5.09-.12-5.96-.34-.73-.23-1.4-.49-1.99-1.03-.49-.49-.81-1.25-.96-2.28L2.74 12c-.08-.76-.14-1.63-.14-2.6 0-3.35.4-5.32 1.3-6.23.49-.46 1.25-.79 2.28-.98 1.05-.22 3.03-.33 5.96-.33 3.65 0 5.86.17 6.64.4.92.27 1.63.53 2.12 1.02.49.49.81 1.25.96 2.29z"/>
                    </svg>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                `;
            elements.displayBadge.classList.add("clickable");
            elements.displayBadge.style = "";
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

   elements.autoSkipToggle.addEventListener("change", async (e) => {
      await sendMessage({ action: "TOGGLE_AUTO_SKIP", enabled: e.target.checked });
   });

   elements.speedAdsToggle.addEventListener("change", async (e) => {
      await sendMessage({ action: "TOGGLE_SPEED_ADS", enabled: e.target.checked });
   });

   // NEW: Zen Mode Toggle
   elements.zenModeToggle.addEventListener("change", async (e) => {
      await sendMessage({ action: "TOGGLE_ZEN_MODE", enabled: e.target.checked });
   });

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
