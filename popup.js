document.addEventListener("DOMContentLoaded", () => {
   const speedButtons = document.querySelectorAll(".speed-btn");
   const displayBadge = document.getElementById("current-speed-display");
   const resetBtn = document.getElementById("reset-btn");
   const autoSkipToggle = document.getElementById("auto-skip-toggle");

   // Helper to query active tab
   async function getActiveTab() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab;
   }

   // Update UI based on state
   function updateUI(speed, autoSkipEnabled) {
      // Update speed text
      if (speed) {
         displayBadge.textContent = `${speed}x`;
         // Update active button state
         speedButtons.forEach((btn) => {
            const btnSpeed = parseFloat(btn.dataset.speed);
            if (btnSpeed === speed) {
               btn.classList.add("active");
            } else {
               btn.classList.remove("active");
            }
         });
      }

      // Update toggle state
      if (autoSkipEnabled !== undefined) {
         autoSkipToggle.checked = autoSkipEnabled;
      }
   }

   // Initialize: Fetch state from content script
   (async () => {
      try {
         const tab = await getActiveTab();
         if (tab.url && (tab.url.includes("youtube.com") || tab.url.includes("youtu.be"))) {
            chrome.tabs.sendMessage(tab.id, { action: "GET_STATE" }, (response) => {
               displayBadge.classList.remove("clickable", "error");
               if (chrome.runtime.lastError) {
                  // Missing Content script
                  displayBadge.textContent = "Reload";
                  displayBadge.classList.add("error");
               } else if (response) {
                  displayBadge.style = "";
                  updateUI(response.speed, response.autoSkip);
               }
            });
         } else {
            // Not on YouTube -> Show Open YouTube Icon Button
            // Using innerHTML to inject SVG icons
            displayBadge.innerHTML = `
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.34 4.83-.18 1.03-.5 1.79-.96 2.28-.46.49-1.2.73-2.2.73L12 20c-3.15 0-5.09-.12-5.96-.34-.73-.23-1.4-.49-1.99-1.03-.49-.49-.81-1.25-.96-2.28L2.74 12c-.08-.76-.14-1.63-.14-2.6 0-3.35.4-5.32 1.3-6.23.49-.46 1.25-.79 2.28-.98 1.05-.22 3.03-.33 5.96-.33 3.65 0 5.86.17 6.64.4.92.27 1.63.53 2.12 1.02.49.49.81 1.25.96 2.29z"/>
                    </svg>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                `;
            displayBadge.classList.add("clickable");
            displayBadge.style = "";
         }
      } catch (e) {
         console.error("Error initializing popup:", e);
      }
   })();

   // Handle button clicks (Speed)
   speedButtons.forEach((btn) => {
      btn.addEventListener("click", async () => {
         const speed = parseFloat(btn.dataset.speed);
         const tab = await getActiveTab();

         if (tab && tab.id) {
            // Optimistic UI update for speed
            updateUI(speed, undefined);

            chrome.tabs.sendMessage(tab.id, {
               action: "SET_SPEED",
               speed: speed,
            });
         }
      });
   });

   // Handle reset
   resetBtn.addEventListener("click", async () => {
      const tab = await getActiveTab();
      if (tab && tab.id) {
         updateUI(1, undefined);
         chrome.tabs.sendMessage(tab.id, {
            action: "SET_SPEED",
            speed: 1,
         });
      }
   });

   // Handle Auto-Skip Toggle
   autoSkipToggle.addEventListener("change", async (e) => {
      const isEnabled = e.target.checked;
      const tab = await getActiveTab();
      if (tab && tab.id) {
         chrome.tabs.sendMessage(tab.id, {
            action: "TOGGLE_AUTO_SKIP",
            enabled: isEnabled,
         });
      }
   });

   // Handle badge click (to open YouTube)
   displayBadge.addEventListener("click", () => {
      // Check if it has the clickable class (Open YouTube mode)
      if (displayBadge.classList.contains("clickable")) {
         chrome.tabs.create({ url: "https://youtube.com" });
      }
   });
});
