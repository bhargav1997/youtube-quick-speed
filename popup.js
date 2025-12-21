document.addEventListener("DOMContentLoaded", () => {
   const speedButtons = document.querySelectorAll(".speed-btn");
   const displayBadge = document.getElementById("current-speed-display");
   const resetBtn = document.getElementById("reset-btn");

   // Helper to query active tab
   async function getActiveTab() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab;
   }

   // Update UI based on speed
   function updateUI(speed) {
      // Update text
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

   // Initialize: Fetch current speed from content script
   (async () => {
      try {
         const tab = await getActiveTab();
         if (tab.url && (tab.url.includes("youtube.com") || tab.url.includes("youtu.be"))) {
            displayBadge.classList.remove("clickable"); // Remove clickable style if on valid page
            chrome.tabs.sendMessage(tab.id, { action: "GET_SPEED" }, (response) => {
               if (chrome.runtime.lastError) {
                  // Content script is missing (likely extension was reloaded but page wasn't)
                  displayBadge.textContent = "Reload Page";
                  displayBadge.style.backgroundColor = "rgba(255, 78, 69, 0.1)";
                  displayBadge.style.color = "#ff4e45";
                  displayBadge.style.borderColor = "rgba(255, 78, 69, 0.3)";
               } else if (response && response.speed) {
                  displayBadge.style = ""; // Reset inline styles
                  updateUI(response.speed);
               }
            });
         } else {
            displayBadge.textContent = "Open YouTube";
            displayBadge.classList.add("clickable"); // Add clickable cursor and hover effect
            displayBadge.style = ""; // Reset specific inline styles to let class take over
         }
      } catch (e) {
         console.error("Error initializing popup:", e);
      }
   })();

   // Handle badge click (to open YouTube)
   displayBadge.addEventListener("click", () => {
      if (displayBadge.textContent === "Open YouTube") {
         chrome.tabs.create({ url: "https://youtube.com" });
      }
   });

   // Handle button clicks
   speedButtons.forEach((btn) => {
      btn.addEventListener("click", async () => {
         const speed = parseFloat(btn.dataset.speed);
         const tab = await getActiveTab();

         if (tab && tab.id) {
            // Optimistic UI update
            updateUI(speed);

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
         updateUI(1);
         chrome.tabs.sendMessage(tab.id, {
            action: "SET_SPEED",
            speed: 1,
         });
      }
   });
});
