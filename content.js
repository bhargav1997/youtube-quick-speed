// Helper to find the video element
const getVideo = () => document.querySelector("video");

// State
let state = {
   targetSpeed: 1.0,
   isAutoSkipEnabled: true, // Only clicks skip button
   isSpeedAdEnabled: true, // NEW: Speeds up ads to 16x & mutes
   volume: 1.0,
   loop: { active: false, start: null, end: null },

   // Internal state to track restoration
   originalSpeed: 1.0,
   originalMuted: false,
   isAdSpeeding: false,
};

// ---------------------------------------------------------
// AUDIO BOOSTER LOGIC
// ---------------------------------------------------------
let audioCtx;
let source;
let gainNode;

const initAudioBooster = () => {
   const video = getVideo();
   if (!video || audioCtx) return;

   try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
      source = audioCtx.createMediaElementSource(video);
      gainNode = audioCtx.createGain();
      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      gainNode.gain.value = state.volume;
   } catch (e) {
      // console.error("[SpeedController] Audio Init Failed", e);
   }
};

const setVolume = (val) => {
   state.volume = val;
   if (!audioCtx) initAudioBooster();
   if (gainNode) gainNode.gain.value = val;
};

// ---------------------------------------------------------
// SPEED & ADS LOGIC
// ---------------------------------------------------------

const isAdPlaying = () => {
   const player = document.querySelector(".html5-video-player");
   const adShowing = player && player.classList.contains("ad-showing");

   // Manage polling based on ad state
   manageAdInterval(adShowing);

   return adShowing;
};

const enforceSpeed = () => {
   const video = getVideo();
   if (!video) return;

   const adActive = isAdPlaying();

   // --- AD HANDLING ---
   if (adActive) {
      // PRIORITY 1: SKIP
      // User requested: "if button is visible then don't fast forward just skip"
      if (state.isAutoSkipEnabled) {
         const wasSkipped = skipAd();
         if (wasSkipped) {
            // If we found and clicked a button, stop processing this tick.
            // We don't want to enforce speed while clicking.
            return;
         }
      }

      // PRIORITY 2: SPEED UP (Only if we couldn't skip yet)
      if (state.isSpeedAdEnabled) {
         // Check if we are already in "Ad Speeding" mode
         if (!state.isAdSpeeding) {
            state.originalSpeed = state.targetSpeed;
            state.originalMuted = video.muted;
            state.isAdSpeeding = true;
         }

         // Enforce 16.0x
         if (video.playbackRate !== 16.0) video.playbackRate = 16.0;
         if (!video.muted) video.muted = true;
      }
   }

   // --- NORMAL VIDEO HANDLING ---
   else {
      // Restore state if we were speeding
      if (state.isAdSpeeding) {
         video.muted = state.originalMuted;
         video.playbackRate = state.originalSpeed;
         state.isAdSpeeding = false;
      }

      // Enforce user target speed
      if (!Number.isNaN(state.targetSpeed)) {
         if (Math.abs(video.playbackRate - state.targetSpeed) > 0.01) {
            video.playbackRate = state.targetSpeed;
         }
      }
   }
};

// ---------------------------------------------------------
// AB LOOP LOGIC
// ---------------------------------------------------------
const checkLoop = () => {
   if (!state.loop.active || state.loop.start === null || state.loop.end === null) return;
   // Don't loop during ads
   if (isAdPlaying()) return;

   const video = getVideo();
   if (!video) return;

   if (video.currentTime >= state.loop.end) {
      video.currentTime = state.loop.start;
   }
};

// ---------------------------------------------------------
// AUTO-SKIP ADS LOGIC (Button Clicker)
// ---------------------------------------------------------
const triggerClick = (el) => {
   if (!el) return;
   el.click(); // Native click
   // Synthetic fallback
   const mouseEvent = new MouseEvent("click", { bubbles: true, cancelable: true, view: window });
   el.dispatchEvent(mouseEvent);
};

const skipAd = () => {
   // 1. Standard Classes
   let skipBtn = document.querySelector(".ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern");

   // 2. ID Fallback (Based on user report "skip-button:jf")
   if (!skipBtn) {
      // Finds elements with ID starting with "skip-button"
      skipBtn = document.querySelector('button[id^="skip-button"]');
   }

   // 3. Text/Overlay Fallback (If logic obfuscated)
   if (!skipBtn) {
      // Look inside user-reported overlay container
      const overlay = document.querySelector(".ytp-ad-player-overlay-layout__skip-or-preview-container");
      if (overlay) {
         // Look for any button with text "Skip" in the specific ad container
         const btns = overlay.querySelectorAll("button");
         for (const btn of btns) {
            if (btn.textContent && btn.textContent.includes("Skip")) {
               skipBtn = btn;
               break;
            }
         }
      }
   }

   // 4. Final Safety: Check if it's visible
   if (skipBtn && (skipBtn.offsetParent !== null || skipBtn.style.display !== "none")) {
      triggerClick(skipBtn);
      return true; // Signal that we clicked
   }

   return false; // Did not click
};

// Aggressive Polling during Ads
// MutationObserver is fast, but sometimes fails if the node is already there but hidden.
// We use a short interval ONLY when an ad is actually detected.
let adInterval = null;

const manageAdInterval = (isAd) => {
   if (isAd && !adInterval) {
      adInterval = setInterval(() => {
         if (state.isAutoSkipEnabled) skipAd();
         // Also ensure 16x speed is enforced repeatedly
         enforceSpeed();
      }, 500); // Check every 500ms while ad is active
   } else if (!isAd && adInterval) {
      clearInterval(adInterval);
      adInterval = null;
   }
};

// Observer to catch ad state changes quickly
const adObserver = new MutationObserver((mutations) => {
   const adActive = isAdPlaying();
   manageAdInterval(adActive);

   // Check if we need to enforce speed (ad-showing class)
   // Or if the skip button appeared
   enforceSpeed();

   // Explicitly check for skip button on every mutation
   // This is cheap because querySelector is fast
   if (state.isAutoSkipEnabled) {
      skipAd();
   }
});

adObserver.observe(document.body, {
   attributes: true,
   attributeFilter: ["class"],
   childList: true,
   subtree: true,
});

// ---------------------------------------------------------
// MASTER LOOP & LISTENERS
// ---------------------------------------------------------
setInterval(() => {
   const video = getVideo();
   if (video) {
      enforceSpeed();
      checkLoop();
   }
}, 500);

document.addEventListener(
   "timeupdate",
   () => {
      checkLoop();
   },
   true,
);

document.addEventListener("yt-navigate-finish", () => {
   setTimeout(enforceSpeed, 500);
});

// ---------------------------------------------------------
// MESSAGE HANDLING
// ---------------------------------------------------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
   const video = getVideo();
   switch (request.action) {
      case "SET_SPEED":
         state.targetSpeed = parseFloat(request.speed);
         // If not in ad, apply immediately
         if (!state.isAdSpeeding) enforceSpeed();
         sendResponse({ success: true, speed: state.targetSpeed });
         break;

      case "TOGGLE_AUTO_SKIP":
         state.isAutoSkipEnabled = request.enabled;
         sendResponse({ success: true });
         break;

      case "TOGGLE_SPEED_ADS":
         state.isSpeedAdEnabled = request.enabled;
         sendResponse({ success: true });
         break;

      case "SET_VOLUME":
         setVolume(parseFloat(request.value));
         sendResponse({ success: true });
         break;

      case "SET_LOOP_POINT":
         if (!video) return;
         if (request.point === "start") {
            state.loop.start = video.currentTime;
            if (state.loop.end !== null && state.loop.end < state.loop.start) state.loop.end = null;
         } else if (request.point === "end") {
            state.loop.end = video.currentTime;
            if (state.loop.start === null) state.loop.start = 0;
            if (state.loop.end !== null && state.loop.end > state.loop.start) {
               state.loop.active = true;
               video.currentTime = state.loop.start;
            }
         }
         sendResponse({ success: true, loop: state.loop });
         break;

      case "CLEAR_LOOP":
         state.loop.active = false;
         state.loop.start = null;
         state.loop.end = null;
         sendResponse({ success: true, loop: state.loop });
         break;

      case "GET_STATE":
         const currentSpeed = video && !state.isAdSpeeding ? video.playbackRate : state.targetSpeed;
         sendResponse({
            speed: currentSpeed,
            autoSkip: state.isAutoSkipEnabled,
            speedAds: state.isSpeedAdEnabled,
            volume: state.volume,
            loop: state.loop,
            currentTime: video ? video.currentTime : 0,
         });
         break;
   }
   return true;
});

console.log("[SpeedController] Loaded (v3.0 - Speed Ads 16x)");
