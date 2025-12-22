// Helper to find the video element
const getVideo = () => document.querySelector("video");

// State
let state = {
   targetSpeed: 1.0,
   isAutoSkipEnabled: true,
   isSpeedAdEnabled: true,
   isZenModeEnabled: false,
   volume: 1.0,
   loop: { active: false, start: null, end: null },

   // Internal state
   originalSpeed: 1.0,
   originalMuted: false,
   isAdSpeeding: false,
};

// ---------------------------------------------------------
// STORAGE & PERSISTENCE
// ---------------------------------------------------------
const STORAGE_KEY = "yt_quick_speed_settings";

const saveSettings = () => {
   const settings = {
      targetSpeed: state.targetSpeed,
      isAutoSkipEnabled: state.isAutoSkipEnabled,
      isSpeedAdEnabled: state.isSpeedAdEnabled,
      isZenModeEnabled: state.isZenModeEnabled,
      volume: state.volume,
      // We don't save 'loop' as it's video specific usually
   };
   chrome.storage.local.set({ [STORAGE_KEY]: settings });
};

const loadSettings = () => {
   chrome.storage.local.get([STORAGE_KEY], (result) => {
      if (result[STORAGE_KEY]) {
         const saved = result[STORAGE_KEY];
         if (saved.targetSpeed) state.targetSpeed = saved.targetSpeed;
         if (saved.isAutoSkipEnabled !== undefined) state.isAutoSkipEnabled = saved.isAutoSkipEnabled;
         if (saved.isSpeedAdEnabled !== undefined) state.isSpeedAdEnabled = saved.isSpeedAdEnabled;
         if (saved.volume !== undefined) {
            state.volume = saved.volume;
            setVolume(state.volume);
         }
         // Load Zen Mode LAST to ensure body exists (though strict script injection is usually fine)
         if (saved.isZenModeEnabled !== undefined) {
            state.isZenModeEnabled = saved.isZenModeEnabled;
            toggleZenMode(state.isZenModeEnabled);
         }
      }
   });
};

// ---------------------------------------------------------
// ZEN MODE LOGIC (Hide Distractions)
// ---------------------------------------------------------
const updateZenStyle = (enabled) => {
   const styleId = "yqs-zen-mode-style";
   let style = document.getElementById(styleId);

   if (enabled) {
      if (!style) {
         style = document.createElement("style");
         style.id = styleId;
         style.textContent = `
                ytd-watch-flexy #secondary, 
                ytd-watch-flexy #related,
                ytd-comments,
                #comments {
                    display: none !important;
                    visibility: hidden !important;
                }
                
                /* Center the video player container */
                ytd-watch-flexy[flexy] #primary.ytd-watch-flexy {
                    margin: 0 auto !important;
                    min-width: 0 !important;
                    flex: 1;
                }
            `;
         (document.head || document.documentElement).appendChild(style);
      }
   } else {
      if (style) {
         style.remove();
      }
   }
};

const toggleZenMode = (enabled) => {
   state.isZenModeEnabled = enabled;
   updateZenStyle(enabled);
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

   manageAdInterval(adShowing);

   return adShowing;
};

const enforceSpeed = () => {
   const video = getVideo();
   if (!video) return;

   const adActive = isAdPlaying();

   if (adActive) {
      if (state.isAutoSkipEnabled) {
         const wasSkipped = skipAd();
         if (wasSkipped) return;
      }

      if (state.isSpeedAdEnabled) {
         if (!state.isAdSpeeding) {
            state.originalSpeed = state.targetSpeed;
            state.originalMuted = video.muted;
            state.isAdSpeeding = true;
         }
         if (video.playbackRate !== 16.0) video.playbackRate = 16.0;
         if (!video.muted) video.muted = true;
      }
   } else {
      if (state.isAdSpeeding) {
         video.muted = state.originalMuted;
         video.playbackRate = state.originalSpeed;
         state.isAdSpeeding = false;
      }

      if (!Number.isNaN(state.targetSpeed)) {
         if (Math.abs(video.playbackRate - state.targetSpeed) > 0.01) {
            video.playbackRate = state.targetSpeed;
         }
      }
   }
};

// ---------------------------------------------------------
// AUTO-SKIP ADS LOGIC (Button Clicker)
// ---------------------------------------------------------
const triggerClick = (el) => {
   if (!el) return;
   el.click();
   const mouseEvent = new MouseEvent("click", { bubbles: true, cancelable: true, view: window });
   el.dispatchEvent(mouseEvent);
};

const skipAd = () => {
   let skipBtn = document.querySelector(".ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern");
   if (!skipBtn) skipBtn = document.querySelector('button[id^="skip-button"]');

   if (!skipBtn) {
      const overlay = document.querySelector(".ytp-ad-player-overlay-layout__skip-or-preview-container");
      if (overlay) {
         const btns = overlay.querySelectorAll("button");
         for (const btn of btns) {
            if (btn.textContent && btn.textContent.includes("Skip")) {
               skipBtn = btn;
               break;
            }
         }
      }
   }

   if (skipBtn && (skipBtn.offsetParent !== null || skipBtn.style.display !== "none")) {
      triggerClick(skipBtn);
      return true;
   }
   return false;
};

let adInterval = null;
const manageAdInterval = (isAd) => {
   if (isAd && !adInterval) {
      adInterval = setInterval(() => {
         if (state.isAutoSkipEnabled) skipAd();
         enforceSpeed();
      }, 500);
   } else if (!isAd && adInterval) {
      clearInterval(adInterval);
      adInterval = null;
   }
};

const adObserver = new MutationObserver((mutations) => {
   const adActive = isAdPlaying();
   manageAdInterval(adActive);
   enforceSpeed();
   if (state.isAutoSkipEnabled) skipAd();
});

adObserver.observe(document.body, { attributes: true, attributeFilter: ["class"], childList: true, subtree: true });

// ---------------------------------------------------------
// AB LOOP LOGIC
// ---------------------------------------------------------
const checkLoop = () => {
   if (!state.loop.active || state.loop.start === null || state.loop.end === null) return;
   if (isAdPlaying()) return;

   const video = getVideo();
   if (!video) return;

   if (video.currentTime >= state.loop.end) {
      video.currentTime = state.loop.start;
   }
};

setInterval(() => {
   const video = getVideo();
   if (video) {
      enforceSpeed();
      checkLoop();
      // Force re-apply Zen mode class intermittently to handle navigation/DOM refreshes
      if (state.isZenModeEnabled) updateZenStyle(state.isZenModeEnabled);
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

// Load settings on startup
loadSettings();

// ---------------------------------------------------------
// MESSAGE HANDLING
// ---------------------------------------------------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
   const video = getVideo();
   let needSave = false;

   switch (request.action) {
      case "SET_SPEED":
         state.targetSpeed = parseFloat(request.speed);
         if (!state.isAdSpeeding) enforceSpeed();
         needSave = true;
         sendResponse({ success: true, speed: state.targetSpeed });
         break;

      case "TOGGLE_AUTO_SKIP":
         state.isAutoSkipEnabled = request.enabled;
         needSave = true;
         sendResponse({ success: true });
         break;

      case "TOGGLE_SPEED_ADS":
         state.isSpeedAdEnabled = request.enabled;
         needSave = true;
         sendResponse({ success: true });
         break;

      case "TOGGLE_ZEN_MODE":
         toggleZenMode(request.enabled);
         needSave = true;
         sendResponse({ success: true });
         break;

      case "SET_VOLUME":
         setVolume(parseFloat(request.value));
         needSave = true;
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
            zenMode: state.isZenModeEnabled,
            volume: state.volume,
            loop: state.loop,
            currentTime: video ? video.currentTime : 0,
         });
         break;
   }

   if (needSave) {
      saveSettings();
   }

   return true;
});

console.log("[SpeedController] Loaded (v5.0 - Persistent Settings)");
