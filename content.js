// Helper to find the video element
const getVideo = () => document.querySelector("video");

// State
let targetSpeed = 1.0;
let isAutoSkipEnabled = true; // Default: ON

// ---------------------------------------------------------
// SPEED CONTROL LOGIC
// ---------------------------------------------------------
const enforceSpeed = () => {
   const video = getVideo();
   if (video && !Number.isNaN(targetSpeed)) {
      if (Math.abs(video.playbackRate - targetSpeed) > 0.01) {
         video.playbackRate = targetSpeed;
      }
   }
};

// Periodic check for speed (YouTube resets it often)
setInterval(() => {
   const video = getVideo();
   if (video) {
      enforceSpeed();
   }
}, 1000);

// Listen for navigation to re-enforce speed
document.addEventListener("yt-navigate-finish", () => {
   setTimeout(enforceSpeed, 500);
});

// ---------------------------------------------------------
// AUTO-SKIP ADS LOGIC
// ---------------------------------------------------------
const skipAd = () => {
   if (!isAutoSkipEnabled) return;

   // Common selectors for YouTube skip buttons
   const skipSelectors = [".ytp-ad-skip-button", ".ytp-ad-skip-button-modern", ".ytp-skip-ad-button"];

   const skipBtn = document.querySelector(skipSelectors.join(","));

   if (skipBtn) {
      skipBtn.click();
      // console.log('[SpeedController] Auto-skipped ad');
   }
};

// Observer to detect ad buttons appearing in the DOM
const adObserver = new MutationObserver((mutations) => {
   if (!isAutoSkipEnabled) return;

   // efficient check: only if nodes added
   let shouldCheck = false;
   for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
         shouldCheck = true;
         break;
      }
   }

   if (shouldCheck) {
      skipAd();
   }
});

// Start observing
adObserver.observe(document.body, {
   childList: true,
   subtree: true,
});

// ---------------------------------------------------------
// MESSAGE HANDLING
// ---------------------------------------------------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
   if (request.action === "SET_SPEED") {
      targetSpeed = parseFloat(request.speed);
      enforceSpeed();
      sendResponse({ success: true, speed: targetSpeed });
   } else if (request.action === "GET_STATE") {
      // Return both speed and skip setting
      const video = getVideo();
      const currentRate = video ? video.playbackRate : targetSpeed;
      sendResponse({
         speed: currentRate,
         autoSkip: isAutoSkipEnabled,
      });
   } else if (request.action === "TOGGLE_AUTO_SKIP") {
      isAutoSkipEnabled = request.enabled;
      if (isAutoSkipEnabled) skipAd(); // Try skipping immediately if turned on
      sendResponse({ success: true, autoSkip: isAutoSkipEnabled });
   }
});

console.log("[SpeedController] Loaded (Ad Skip Ready)");
