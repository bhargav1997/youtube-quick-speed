// Helper to find the video element
const getVideo = () => document.querySelector("video");

// State
let state = {
   targetSpeed: 1.0,
   isAutoSkipEnabled: true,
   isSpeedAdEnabled: true,
   isZenModeEnabled: false,
   isBoosterEnabled: true,
   volume: 1.0,
   loop: { active: false, start: null, end: null },

   // Boost Settings (Configurable)
   boostKey: "Shift",
   boostSpeed: 2.5,

   // Internal state
   originalSpeed: 1.0,
   originalMuted: false,
   isAdSpeeding: false,
   adSkipClicked: false,
   isKeyBoosting: false,
};

let cachedIsAdPlaying = false;
let fundingChoicesHandled = false;

// ---------------------------------------------------------
// UI OVERLAYS (Visual Feedback)
// ---------------------------------------------------------
const createBoostOverlay = () => {
   if (document.getElementById("yqs-boost-overlay")) return;

   const overlay = document.createElement("div");
   overlay.id = "yqs-boost-overlay";
   // Sleek minimal design
   overlay.innerHTML = `<span style="font-size:20px; margin-right:6px">⚡</span> <span id="yqs-boost-text" style="font-family:'Roboto','Segoe UI',sans-serif; font-weight:700; font-size:18px;">2.5x</span>`;

   Object.assign(overlay.style, {
      position: "fixed",
      top: "12%",
      left: "50%",
      transform: "translateX(-50%) scale(0.8)",

      // Glassmorphism
      backgroundColor: "rgba(20, 20, 30, 0.75)",
      backdropFilter: "blur(12px)",
      webkitBackdropFilter: "blur(12px)",

      color: "#fff",
      padding: "8px 20px",
      borderRadius: "99px",
      zIndex: "2147483647",
      pointerEvents: "none",

      boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 1px 1px rgba(255,255,255,0.1) inset",
      opacity: "0",
      transition: "all 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28)", // Bouncy pop

      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: "80px",
   });

   document.body.appendChild(overlay);
};

const showBoostOverlay = () => {
   const el = document.getElementById("yqs-boost-overlay");
   if (!el) createBoostOverlay();

   const overlay = document.getElementById("yqs-boost-overlay");
   const textSpan = document.getElementById("yqs-boost-text");

   if (overlay) {
      if (textSpan) textSpan.textContent = `${state.boostSpeed}x`;

      overlay.style.opacity = "1";
      overlay.style.transform = "translateX(-50%) scale(1)";
      overlay.style.top = "12%";
   }
};

const hideBoostOverlay = () => {
   const overlay = document.getElementById("yqs-boost-overlay");
   if (overlay) {
      overlay.style.opacity = "0";
      overlay.style.transform = "translateX(-50%) scale(0.8)";
   }
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
      isBoosterEnabled: state.isBoosterEnabled,
      volume: state.volume,
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
         if (saved.isBoosterEnabled !== undefined) state.isBoosterEnabled = saved.isBoosterEnabled;
         if (saved.volume !== undefined) {
            state.volume = saved.volume;
            setVolume(state.volume);
         }
         if (saved.isZenModeEnabled !== undefined) {
            state.isZenModeEnabled = saved.isZenModeEnabled;
            toggleZenMode(state.isZenModeEnabled);
         }
      }
   });
};

// ---------------------------------------------------------
// ZEN MODE LOGIC
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
                #comments,
                ytd-engagement-panel-section-list-renderer,
                panel-ad-header-image-lockup-view-model,
                ytd-ad-slot-renderer,
                .ytd-ad-slot-renderer {
                    display: none !important;
                    visibility: hidden !important;
                }
                
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
// SPEED & BOOST HANDLERS
// ---------------------------------------------------------
const isInputActive = () => {
   const el = document.activeElement;
   if (!el) return false;
   const tagName = el.tagName;

   if (tagName === "INPUT" || tagName === "TEXTAREA") return true;
   if (el.isContentEditable) return true;

   // Check specific YouTube search/comment inputs
   const id = el.id || "";
   if (id === "contenteditable-root") return true;
   if (id === "search") return true;

   return false;
};

document.addEventListener(
   "keydown",
   (e) => {
      if (!state.isBoosterEnabled) return;
      if (isInputActive()) return;
      if (fundingChoicesHandled) return;

      // Check for Configured Boost Key
      const keyMap = {
         Shift: ["Shift", "ShiftLeft", "ShiftRight"],
         Control: ["Control", "ControlLeft", "ControlRight"],
         Alt: ["Alt", "AltLeft", "AltRight"],
      };

      const allowedKeys = keyMap[state.boostKey] || keyMap["Shift"];

      if (allowedKeys.includes(e.key) || allowedKeys.includes(e.code)) {
         if (!state.isKeyBoosting) {
            state.isKeyBoosting = true;
            if (!cachedIsAdPlaying) {
               showBoostOverlay();
               enforceSpeed();
            }
         }
      }
   },
   true,
);

document.addEventListener(
   "keyup",
   (e) => {
      if (!state.isBoosterEnabled) return;

      const keyMap = {
         Shift: ["Shift", "ShiftLeft", "ShiftRight"],
         Control: ["Control", "ControlLeft", "ControlRight"],
         Alt: ["Alt", "AltLeft", "AltRight"],
      };

      const allowedKeys = keyMap[state.boostKey] || keyMap["Shift"];

      if (allowedKeys.includes(e.key) || allowedKeys.includes(e.code)) {
         state.isKeyBoosting = false;
         hideBoostOverlay();
         enforceSpeed();
      }
   },
   true,
);

window.addEventListener("blur", () => {
   if (state.isKeyBoosting) {
      state.isKeyBoosting = false;
      hideBoostOverlay();
      enforceSpeed();
   }
});

// ---------------------------------------------------------
// AD DETECTION
// ---------------------------------------------------------
const detectAdState = () => {
   const player = document.querySelector(".html5-video-player");
   const hasAdClass = player && (player.classList.contains("ad-showing") || player.classList.contains("ad-interrupting"));

   // Check specific ad module content
   const adModule = document.querySelector(".ytp-ad-module");
   const hasAdModuleContent = adModule && adModule.children.length > 0 && adModule.querySelector('[class*="ad-player-overlay"]');

   const hasAdOverlay = document.querySelector(".ytp-ad-player-overlay") !== null;
   const hasSkipButton = document.querySelector(".ytp-ad-skip-button") !== null || document.querySelector(".ytp-skip-ad-button") !== null;
   const hasPreview = document.querySelector(".ytp-preview-ad") !== null;

   return hasAdClass || hasAdOverlay || hasSkipButton || hasPreview || !!hasAdModuleContent;
};

// ---------------------------------------------------------
// STATE MANAGEMENT
// ---------------------------------------------------------
let adInterval = null;

const updateAdState = () => {
   const isAdNow = detectAdState();

   // NO CHANGE -> EXIT
   if (isAdNow === cachedIsAdPlaying) {
      if (cachedIsAdPlaying) enforceSpeed();
      return;
   }

   // STATE CHANGE: FALSE -> TRUE (Ad Started)
   if (isAdNow && !cachedIsAdPlaying) {
      cachedIsAdPlaying = true;
      hideBoostOverlay();

      // Start Ad Ad Loop - NO FORCE PLAY, NO COMPLEX CLICKS
      if (!adInterval) {
         skipAd();

         let lastSrc = "";
         const video = getVideo();
         if (video) lastSrc = video.src;

         adInterval = setInterval(() => {
            // Consecutive Ad Check: If src changes, reset skip state
            const currentVideo = getVideo();
            if (currentVideo && currentVideo.src !== lastSrc) {
               lastSrc = currentVideo.src;
               state.adSkipClicked = false; // Reset for Ad 2
               // console.log("[SpeedController] Ad Source Changed (Sequential Ad)");
            }

            // Gentle Play Enforcement: If ad pauses (buffer/glitch), nudge it
            if (currentVideo && currentVideo.paused && !currentVideo.ended) {
               try {
                  currentVideo.play().catch(() => {}); // Silent catch
               } catch (e) {}
            }

            if (state.isAutoSkipEnabled) skipAd();
            enforceSpeed();
         }, 100);
      }
   }

   // STATE CHANGE: TRUE -> FALSE (Ad Ended)
   else if (!isAdNow && cachedIsAdPlaying) {
      // Graceful Exit: Ensure no skip button is lingering
      // If skipAd() returns TRUE, it means a button was found and clicked, so we are logically still "In Ad" for the user.
      // We keep the loop alive.
      if (state.isAutoSkipEnabled && skipAd()) {
         // console.log("[SpeedController] Ad signal away, but Skip Button found. Keeping loop.");
         return;
      }

      cachedIsAdPlaying = false;

      if (adInterval) {
         clearInterval(adInterval);
         adInterval = null;
      }

      state.isAdSpeeding = false;
      state.adSkipClicked = false;

      // Restore and Sanity Check
      const video = getVideo();
      if (video) {
         if (state.isSpeedAdEnabled && state.originalMuted !== undefined) {
            video.muted = state.originalMuted;
         }

         // CRITICAL FIX: Ensure we don't accidentally keep 16x speed
         // If speed is excessively high and we are not boosting, force reset.
         if (video.playbackRate > 8.0) {
            video.playbackRate = state.targetSpeed || 1.0;
         } else {
            enforceSpeed();
         }
      }

      if (state.isKeyBoosting && !fundingChoicesHandled) {
         showBoostOverlay();
      }
   }
};

// ---------------------------------------------------------
// SPEED ENFORCER
// ---------------------------------------------------------
const enforceSpeed = () => {
   const video = getVideo();
   if (!video) return;

   // CRITICAL: Double-check Ad State before enforcement
   // This prevents "stuck" Ad Mode if the observer missed the transition
   const isActuallyAd = detectAdState();

   if (cachedIsAdPlaying && !isActuallyAd) {
      // We thought it was an ad, but it's not. Correct state immediately.
      cachedIsAdPlaying = false;
   }

   // AD MODE
   if (isActuallyAd || cachedIsAdPlaying) {
      if (!cachedIsAdPlaying) cachedIsAdPlaying = true; // Sync
      hideBoostOverlay();

      if (state.isSpeedAdEnabled) {
         if (!state.isAdSpeeding) {
            state.originalSpeed = state.targetSpeed;
            state.originalMuted = video.muted;
            state.isAdSpeeding = true;
         }
         // Force 16x
         if (video.playbackRate !== 16.0) video.playbackRate = 16.0;
         if (!video.muted) video.muted = true;
      }
      return;
   }

   // CONTENT MODE (Correction)
   if (state.isAdSpeeding) {
      video.muted = state.originalMuted || false;
      video.playbackRate = state.originalSpeed || state.targetSpeed;
      state.isAdSpeeding = false;
   }

   // Key Boosting
   if (state.isKeyBoosting) {
      if (Math.abs(video.playbackRate - state.boostSpeed) > 0.1) {
         video.playbackRate = state.boostSpeed;
      }
      return;
   }

   // Normal Speed
   if (!Number.isNaN(state.targetSpeed) && state.targetSpeed > 0) {
      if (Math.abs(video.playbackRate - state.targetSpeed) > 0.01) {
         video.playbackRate = state.targetSpeed;
      }
   }
};

// ---------------------------------------------------------
// PRECISE SKIP LOGIC (Gold Standard)
// ---------------------------------------------------------
// const skipAd = () => {
//    // 1. STANDARD SELECTORS
//    const selectors = [
//       ".ytp-skip-ad-button",
//       ".ytp-ad-skip-button",
//       ".ytp-ad-skip-button-modern",
//       ".ytp-ad-overlay-close-button",
//       ".video-ad-label",
//       "button[id^='skip-button']",
//    ];

//    const candidates = Array.from(document.querySelectorAll(selectors.join(",")));

//    // 2. TEXT-BASED SEARCH (Nuclear Option)
//    try {
//       // Specific structure from user: <button><div>Skip</div></button>
//       const specificXpath = "//button[descendant::div[text()='Skip']]";
//       const specificCandidates = document.evaluate(specificXpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
//       for (let i = 0; i < specificCandidates.snapshotLength; i++) {
//          candidates.push(specificCandidates.snapshotItem(i));
//       }

//       // General text fallback
//       const xpath = "//button[contains(., 'Skip') or contains(., 'Ad')]";
//       const textCandidates = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
//       for (let i = 0; i < textCandidates.snapshotLength; i++) {
//          candidates.push(textCandidates.snapshotItem(i));
//       }

//       // Check for div-based buttons
//       const divXpath = "//div[contains(., 'Skip Ad')]";
//       const divCandidates = document.evaluate(divXpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
//       for (let i = 0; i < divCandidates.snapshotLength; i++) {
//          const node = divCandidates.snapshotItem(i);
//          if (node.getAttribute("role") === "button" || node.className.includes("button") || node.className.includes("btn")) {
//             candidates.push(node);
//          }
//       }
//    } catch (e) {}

//    const isFullscreen = document.fullscreenElement !== null;
//    const player = document.querySelector(".html5-video-player");
//    const controlsHidden = player && player.classList.contains("ytp-autohide");

//    for (const btn of candidates) {
//       if (!btn) continue;

//       const style = window.getComputedStyle(btn);
//       let visible = style.display !== "none" && style.visibility !== "hidden" && !btn.disabled;

//       if (visible && !isFullscreen) {
//          if (btn.getBoundingClientRect().width === 0) visible = false;
//       }

//       // Relax checks in fullscreen OR if controls hidden OR found via text
//       //   if (visible && !isFullscreen && !controlsHidden) {
//       //      if (btn.getBoundingClientRect().width === 0) visible = false;
//       //   }

//       if (visible) {
//          // console.log("[SpeedController] Clicking Skip Button");
//          btn.click();

//          //  const commonProps = { bubbles: true, cancelable: true, view: window };
//          //  btn.dispatchEvent(new MouseEvent("mousedown", commonProps));
//          //  btn.dispatchEvent(new MouseEvent("mouseup", commonProps));
//          //  btn.dispatchEvent(new MouseEvent("click", commonProps));

//          state.adSkipClicked = true;
//          return true;
//       }
//    }
//    return false;
// };

const skipAd = () => {
   const selectors = [".ytp-skip-ad-button", ".ytp-ad-skip-button", ".ytp-ad-skip-button-modern", "button[id^='skip-button']"];

   const candidates = document.querySelectorAll(selectors.join(","));

   for (const btn of candidates) {
      if (!btn || btn.disabled) continue;

      const style = window.getComputedStyle(btn);
      let visible = style.display !== "none" && style.visibility !== "hidden";

      const isFullscreen = document.fullscreenElement !== null;
      if (visible && !isFullscreen) {
         if (btn.getBoundingClientRect().width === 0) continue;
      }

      btn.click(); // ONE real click
      state.adSkipClicked = true;
      return true;
   }
   return false;
};

// Helper for other popups (still needed for generic overlays)
const triggerClick = (el) => {
   if (el && typeof el.click === "function") el.click();
};

// ---------------------------------------------------------
// POPUP HANDLER (Enforcement & Funding Choices)
// ---------------------------------------------------------
let popupCooldown = false;

const handlePopups = () => {
   if (popupCooldown) return;

   // 1. SPECIFIC CHECK: YouTube "Ad blockers are not allowed" dialog (Repeated handling allowed with cooldown)
   const enforcement = document.querySelector("ytd-enforcement-message-view-model");
   if (enforcement) {
      const closeBtn = enforcement.querySelector("#dismiss-button button") || enforcement.querySelector('button[aria-label="Close"]');

      if (closeBtn) {
         triggerClick(closeBtn);
         popupCooldown = true;
         setTimeout(() => {
            popupCooldown = false;
         }, 1000);
         return;
      }
   }

   // 2. FUNDING CHOICES CHECK (Strict One-Time Refresh)
   if (fundingChoicesHandled) return; // Stop if already handled funding choices

   const fundingSelectors = ['c-wiz[jsrenderer="TmgpI"]', ".SSPGKf", 'iframe[src*="fundingchoices.google.com"]'];

   let popup = null;
   for (const sel of fundingSelectors) {
      const el = document.querySelector(sel);
      if (el && (el.offsetWidth > 0 || el.offsetHeight > 0)) {
         popup = el;
         break;
      }
   }

   if (popup) {
      const buttons = popup.querySelectorAll('button, div[role="button"], a[role="button"]');
      for (const btn of buttons) {
         const text = (btn.innerText || "").toLowerCase();
         const label = (btn.getAttribute("aria-label") || "").toLowerCase();

         if (text.includes("refresh") || label.includes("refresh")) {
            triggerClick(btn);
            fundingChoicesHandled = true; // STRICT ONE-TIME
            if (adInterval) clearInterval(adInterval);
            return;
         }
      }
   }
};

// ---------------------------------------------------------
// LOOP LOGIC
// ---------------------------------------------------------
const checkLoop = () => {
   if (!state.loop.active || state.loop.start === null || state.loop.end === null) return;
   if (cachedIsAdPlaying) return;

   const video = getVideo();
   if (!video) return;

   if (video.currentTime >= state.loop.end) {
      video.currentTime = state.loop.start;
   }
};

// ---------------------------------------------------------
// OPTIMIZED OBSERVERS & PASSIVE LISTENERS
// ---------------------------------------------------------
const initObservers = () => {
   // 1. Popup Observer (Targeted: ytd-popup-container)
   const popupContainer = document.querySelector("ytd-popup-container");
   if (popupContainer) {
      const popupObserver = new MutationObserver(() => {
         handlePopups();
      });
      popupObserver.observe(popupContainer, { childList: true, subtree: true });
   } else {
      // Fallback: Check body but polling will cover us mostly
      // Retry finding container, as it might load late
      setTimeout(initObservers, 2000);
   }

   // 2. Player Observer (Specific, Attributes only)
   const player = document.querySelector(".html5-video-player");
   if (player) {
      const playerObserver = new MutationObserver(() => {
         updateAdState();
      });
      playerObserver.observe(player, { attributes: true, attributeFilter: ["class"] });
   }
};

// Start Observers
initObservers();

setInterval(() => {
   const video = getVideo();
   handlePopups();

   // Failsafe: Always try to skip if enabled, even if detection missed it
   if (state.isAutoSkipEnabled) skipAd();

   if (video) {
      updateAdState();
      if (!cachedIsAdPlaying && state.loop.active && state.loop.start !== null && state.loop.end !== null) {
         if (video.currentTime >= state.loop.end) video.currentTime = state.loop.start;
      }
      if (state.isZenModeEnabled) updateZenStyle(state.isZenModeEnabled);
   }
}, 1000);

// Passive listener to avoid violation warnings from YouTube base.js
document.addEventListener(
   "timeupdate",
   () => {
      if (!cachedIsAdPlaying) checkLoop();
   },
   { capture: true, passive: true },
);
document.addEventListener("yt-navigate-finish", () => {
   setTimeout(() => {
      enforceSpeed();
      initObservers(); // Re-bind if player DOM replaced
   }, 500);
});

loadSettings();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
   const video = getVideo();
   let needSave = false;

   switch (request.action) {
      case "SET_SPEED":
         state.targetSpeed = parseFloat(request.speed);
         if (!state.isAdSpeeding && !state.isKeyBoosting) enforceSpeed();
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
      case "TOGGLE_BOOSTER":
         state.isBoosterEnabled = request.enabled;
         needSave = true;
         sendResponse({ success: true });
         break;
      case "SET_VOLUME":
         setVolume(parseFloat(request.value));
         needSave = true;
         sendResponse({ success: true });
         break;
      // NEW HANDLERS
      case "SET_BOOST_KEY":
         state.boostKey = request.key;
         chrome.storage.local.set({ boostKey: state.boostKey }); // Auto save immediately
         sendResponse({ success: true });
         break;
      case "SET_BOOST_SPEED":
         state.boostSpeed = parseFloat(request.speed);
         chrome.storage.local.set({ boostSpeed: state.boostSpeed }); // Auto save
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
         let currentSpeed = state.targetSpeed;
         if (video) {
            if (state.isAdSpeeding) currentSpeed = 16.0;
            else if (state.isKeyBoosting) currentSpeed = BOOST_SPEED || state.boostSpeed;
            else currentSpeed = video.playbackRate;
         }
         sendResponse({
            speed: state.targetSpeed,
            autoSkip: state.isAutoSkipEnabled,
            speedAds: state.isSpeedAdEnabled,
            zenMode: state.isZenModeEnabled,
            booster: state.isBoosterEnabled,
            boostSpeed: state.boostSpeed,
            volume: state.volume,
            loop: state.loop,
            currentTime: video ? video.currentTime : 0,
         });
         break;
   }
   if (needSave) saveSettings();
   return true;
});

console.log("[SpeedController] Loaded (v9.3 - Performance OK)");
