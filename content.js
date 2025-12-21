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
   return player && player.classList.contains("ad-showing");
};

const enforceSpeed = () => {
   const video = getVideo();
   if (!video) return;

   const adActive = isAdPlaying();

   // --- AD HANDLING ---
   if (adActive) {
      // If speed-up ads feature is ON
      if (state.isSpeedAdEnabled) {
         // If we just detected an ad and haven't sped it up yet
         if (!state.isAdSpeeding) {
            // Save original state before modifying
            state.originalSpeed = state.targetSpeed;
            state.originalMuted = video.muted;
            state.isAdSpeeding = true;

            // video.muted = true; // Mute
         }

         // Enforce 16x speed constant during ad
         // Using 16.0 as it's the max usually allowed/effective
         if (video.playbackRate !== 16.0) video.playbackRate = 16.0;
         if (!video.muted) video.muted = true;
      }

      // Also run skip logic if enabled (for skippable ads)
      if (state.isAutoSkipEnabled) skipAd();
   }

   // --- NORMAL VIDEO HANDLING ---
   else {
      // If we were speeding an ad and it just ended, restore state
      if (state.isAdSpeeding) {
         video.muted = state.originalMuted;
         video.playbackRate = state.originalSpeed;
         state.isAdSpeeding = false;
      }

      // Enforce user target speed if normal video
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
const skipAd = () => {
   const skipSelectors = [".ytp-ad-skip-button", ".ytp-ad-skip-button-modern", ".ytp-skip-ad-button"];
   const skipBtn = document.querySelector(skipSelectors.join(","));
   if (skipBtn) skipBtn.click();
};

// Observer to catch ad state changes quickly
const adObserver = new MutationObserver((mutations) => {
   // Check if player classlist changed (ad-showing)
   // Or if new nodes (skip button) added
   enforceSpeed();
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
