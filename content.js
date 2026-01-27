// ============================================================================
// UNIVERSAL AD BLOCKER - Phase 1
// ============================================================================

// Import utilities (Note: Chrome extensions don't support ES6 imports in content scripts yet)
// We'll use inline code for now, can refactor to modules later

// Helper to check if extension context is still valid
const isExtensionContextValid = () => {
   try {
      return chrome.runtime && chrome.runtime.id;
   } catch (e) {
      return false;
   }
};

// Safe message sender that handles context invalidation
const safeSendMessage = (message) => {
   if (!isExtensionContextValid()) {
      console.log("[Extension] Context invalidated, skipping message");
      return Promise.resolve();
   }

   return chrome.runtime.sendMessage(message).catch((error) => {
      // Silently handle context invalidation errors
      if (error.message?.includes("Extension context invalidated")) {
         console.log("[Extension] Context invalidated during message send");
      }
   });
};

// ============================================================================
// GLOBAL STATE & TOOLS (Zapper, Screenshot, etc.)
// ============================================================================

let state = {
   targetSpeed: 1.0,
   isAutoSkipEnabled: false,
   isSpeedAdEnabled: true,
   isZenModeEnabled: false,
   isBoosterEnabled: true,
   isAutoScrollShortsEnabled: false,
   volume: 1.0,
   loop: { active: false, start: null, end: null },
   boostKey: "Shift",
   boostSpeed: 2.5,
   isFocusModeEnabled: false,
   isStrictModeEnabled: false,
   focusKeywords: [],
   activeCategories: [],
   customCategories: [],
   isMirrored: false,
   isZapperActive: false,
};

let zapperListeners = null;

// Inject Zapper CSS
const injectZapperStyles = () => {
   if (document.getElementById("yqs-zapper-styles")) return;
   const style = document.createElement("style");
   style.id = "yqs-zapper-styles";
   style.innerHTML = `
      .yqs-zapper-highlight {
         outline: 3px solid #ff416c !important;
         outline-offset: -3px !important;
         background-color: rgba(255, 65, 108, 0.1) !important;
         cursor: crosshair !important;
         transition: outline 0.1s ease !important;
      }
   `;
   document.head.appendChild(style);
};
injectZapperStyles();

const getSelector = (el) => {
   if (el.id) return `#${CSS.escape(el.id)}`;
   const parts = [];
   while (el && el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      if (el.className && typeof el.className === "string") {
         const classes = el.className
            .trim()
            .split(/\s+/)
            .filter((c) => c && !c.startsWith("yqs-"));
         if (classes.length) selector += "." + classes.map((c) => CSS.escape(c)).join(".");
      }
      const parent = el.parentNode;
      if (parent && parent.nodeType === Node.ELEMENT_NODE) {
         const siblings = Array.from(parent.children).filter((s) => s.nodeName === el.nodeName);
         if (siblings.length > 1) {
            const index = siblings.indexOf(el) + 1;
            selector += `:nth-of-type(${index})`;
         }
      }
      parts.unshift(selector);
      el = el.parentNode;
      if (parts.length > 3) break;
   }
   return parts.join(" > ");
};

const applyZaps = async () => {
   const hostname = window.location.hostname;
   const key = `zaps_${hostname}`;
   chrome.storage.local.get([key], (data) => {
      const selectors = data[key] || [];
      if (selectors.length) {
         const styleId = "yqs-zapper-persisted";
         let style = document.getElementById(styleId);
         if (!style) {
            style = document.createElement("style");
            style.id = styleId;
            document.head.appendChild(style);
         }
         style.textContent = selectors.map((s) => `${s} { display: none !important; }`).join("\n");
      }
   });
};

const toggleZapper = (active) => {
   state.isZapperActive = active;
   if (active) {
      const onMouseOver = (e) => {
         e.stopPropagation();
         e.target.classList.add("yqs-zapper-highlight");
      };
      const onMouseOut = (e) => {
         e.target.classList.remove("yqs-zapper-highlight");
      };
      const onClick = (e) => {
         e.preventDefault();
         e.stopPropagation();
         const el = e.target;
         const selector = getSelector(el);
         el.style.setProperty("display", "none", "important");
         const hostname = window.location.hostname;
         const key = `zaps_${hostname}`;
         chrome.storage.local.get([key], (data) => {
            const selectors = data[key] || [];
            if (!selectors.includes(selector)) {
               selectors.push(selector);
               chrome.storage.local.set({ [key]: selectors });
            }
         });
      };
      const onKeyDown = (e) => {
         if (e.key === "Escape") toggleZapper(false);
      };
      document.addEventListener("mouseover", onMouseOver, true);
      document.addEventListener("mouseout", onMouseOut, true);
      document.addEventListener("click", onClick, true);
      document.addEventListener("keydown", onKeyDown, true);
      zapperListeners = { onMouseOver, onMouseOut, onClick, onKeyDown };
      document.body.style.cursor = "crosshair";
   } else {
      if (zapperListeners) {
         document.removeEventListener("mouseover", zapperListeners.onMouseOver, true);
         document.removeEventListener("mouseout", zapperListeners.onMouseOut, true);
         document.removeEventListener("click", zapperListeners.onClick, true);
         document.removeEventListener("keydown", zapperListeners.onKeyDown, true);
         zapperListeners = null;
      }
      document.querySelectorAll(".yqs-zapper-highlight").forEach((el) => el.classList.remove("yqs-zapper-highlight"));
      document.body.style.cursor = "";
   }
};

// Run Zaps on every page immediately
applyZaps();

// Site Detection
const detectCurrentSite = () => {
   const hostname = window.location.hostname;
   const hasVideo = !!document.querySelector("video");

   // Check if YouTube (special handling for YouTube-specific features)
   if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      return { type: "youtube", hasVideo: true, hostname };
   }

   return {
      type: "generic",
      hasVideo,
      hostname,
   };
};

// Universal Element Hiding - COMPREHENSIVE
const hideUniversalAds = (removeCompletely = true) => {
   const selectors = [
      // Generic ad containers (specific patterns only)
      '[class*="ad-container"]',
      '[class*="ad-wrapper"]',
      '[class*="ad-banner"]',
      '[class*="advertisement"]',
      '[id*="ad-container"]',
      '[id*="ad-wrapper"]',
      '[id*="google_ads"]',
      '[id*="google-ads"]',
      '[id*="ad-slot"]',
      '[id*="adslot"]',

      // Common ad classes (more specific)
      ".advertisement",
      ".sponsored-content",
      ".sponsor-content",
      ".ad-banner",
      ".ad-box",
      ".ad-frame",
      ".ad-space",
      ".banner-ad",
      ".text-ad",

      // BuzzFeed specific (obfuscated classes)
      '[class*="img_ybfqurd"]',
      '[data-module="ad-"]',
      '[data-module*="ad"]',
      '[role="complementary"][aria-label="Advertisement"]',

      // Ad iframes
      'iframe[src*="doubleclick"]',
      'iframe[src*="googlesyndication"]',
      'iframe[src*="advertising"]',
      'iframe[src*="adservice"]',
      'iframe[src*="/ads/"]',
      'iframe[id*="google_ads"]',
      'iframe[title*="3rd party ad"]',
      'iframe[title*="Advertisement"]',

      // Standard ad sizes
      '[width="728"][height="90"]',
      '[width="300"][height="250"]',
      '[width="160"][height="600"]',
      '[width="300"][height="600"]',
      '[width="970"][height="90"]',
      '[width="320"][height="50"]',
      '[width="468"][height="60"]',

      // Data attributes - ONLY SPECIFIC ONES (removed generic [data-ad])
      "[data-ad-slot]",
      "[data-ad-unit]",
      "[data-google-query-id]",
      "[data-google-container-id]",
      "[data-ad-client]",

      // Image ads (GIF, PNG, JPG) - more specific paths
      'img[src*="/ad/"]',
      'img[src*="/ads/"]',
      'img[src*="banner"]',
      'img[src*="_ad."]',
      'img[src*="-ad."]',
      'img[alt*="advertisement"]',

      // AdBlock Tester specific
      'img[src*="d31qbv1cthcecs.cloudfront.net"]',
      'img[src*="pagead2.googlesyndication.com"]',
      '[class*="adsbygoogle"]',
      "ins.adsbygoogle",
      ".ad-unit",
      ".ad-block",
      ".ad-content",

      // Flash/SWF ads
      'object[data*=".swf"]',
      'object[data*="/ad"]',
      'object[data*="banner"]',
      'embed[src*=".swf"]',
      'embed[src*="/ad"]',
      'embed[src*="banner"]',
      'object[type="application/x-shockwave-flash"]',
      'embed[type="application/x-shockwave-flash"]',
      'object[classid*="D27CDB6E-AE6D-11cf-96B8-444553540000"]',

      // Video ads
      "lima-video",
      '[class*="video-ad"]',

      // Tracking pixels
      'img[width="1"][height="1"]',
      'img[src*="/pixel"]',
      'img[src*="tracking"]',

      // Universal popup & overlay patterns
      'iframe[title*="ad" i]', // Iframes with "ad" in title
      'iframe[title*="offer" i]', // Offer iframes
      'iframe[title*="popup" i]', // Popup iframes
      'iframe[src*="/ad/"]', // Ad path iframes
      'iframe[src*="/ads/"]', // Ads path iframes
      'iframe[src*="popunder"]', // Popunder iframes
      'iframe[src*="popup"]', // Popup iframes

      // Specific ad popup containers (exact matches only to avoid false positives)
      "#popup-ad",
      "#ad-popup",
      ".popup-ad",
      ".ad-popup",
      "#modal-ad",
      "#ad-modal",
      ".modal-ad",
      ".ad-modal",
      "#overlay-ad",
      "#ad-overlay",
      ".overlay-ad",
      ".ad-overlay",
   ];

   let hiddenCount = 0;
   selectors.forEach((selector) => {
      try {
         document.querySelectorAll(selector).forEach((el) => {
            // Don't remove if already marked or if it's inside a video player
            if (!el.dataset.uabHidden && !el.closest("video")) {
               if (removeCompletely) {
                  el.remove(); // COMPLETELY REMOVE from DOM
               } else {
                  // Aggressive hiding - make absolutely invisible
                  el.style.setProperty("display", "none", "important");
                  el.style.setProperty("visibility", "hidden", "important");
                  el.style.setProperty("opacity", "0", "important");
                  el.style.setProperty("height", "0px", "important");
                  el.style.setProperty("width", "0px", "important");
                  el.style.setProperty("max-height", "0px", "important");
                  el.style.setProperty("max-width", "0px", "important");
                  el.style.setProperty("overflow", "hidden", "important");
                  el.style.setProperty("position", "absolute", "important");
                  el.style.setProperty("left", "-9999px", "important");
                  el.style.setProperty("top", "-9999px", "important");
               }
               el.dataset.uabHidden = "true";
               hiddenCount++;
            }
         });
      } catch (e) {}
   });

   return hiddenCount;
};

// Check if site is whitelisted
const checkWhitelist = async () => {
   try {
      const response = await safeSendMessage({
         action: "IS_WHITELISTED",
         url: window.location.href,
      });
      return response?.isWhitelisted || false;
   } catch (e) {
      return false;
   }
};

// Block popups and redirects
const blockPopupsAndRedirects = () => {
   // Block window.open (popups)
   const originalOpen = window.open;
   window.open = function (...args) {
      return null;
   };

   // Block pop-unders (new window opening)
   window.addEventListener(
      "click",
      (e) => {
         // If a new window tries to open on click, block it
         const target = e.target.closest("a");
         if (target && target.target === "_blank") {
            const url = target.href;
            // Allow legitimate links, block suspicious ones
            if (
               url &&
               (url.includes("popup") ||
                  url.includes("redirect") ||
                  url.includes("track") ||
                  url.includes("click") ||
                  url.match(/^https?:\/\/[^\/]+\/?$/)) // Bare domain redirects
            ) {
               e.preventDefault();
               e.stopPropagation();
               return false;
            }
         }
      },
      true,
   );

   // Block beforeunload popups
   window.addEventListener(
      "beforeunload",
      (e) => {
         delete e.returnValue;
      },
      true,
   );
};

// Initialize Universal Ad Blocking
const currentSite = detectCurrentSite();

// Skip ad blocking on chrome:// and about: pages (New Tab, Settings, etc.)
const isInternalPage =
   window.location.protocol === "chrome:" || window.location.protocol === "about:" || window.location.protocol === "chrome-extension:";

// Skip ad blocking on Google productivity apps (Gmail, Drive, Docs, etc.) and professional sites
const isGoogleApp =
   currentSite.hostname.includes("mail.google.com") ||
   currentSite.hostname.includes("drive.google.com") ||
   currentSite.hostname.includes("docs.google.com") ||
   currentSite.hostname.includes("sheets.google.com") ||
   currentSite.hostname.includes("slides.google.com") ||
   currentSite.hostname.includes("calendar.google.com") ||
   currentSite.hostname.includes("meet.google.com") ||
   currentSite.hostname.includes("chat.google.com") ||
   currentSite.hostname.includes("keep.google.com") ||
   currentSite.hostname.includes("photos.google.com") ||
   currentSite.hostname.includes("linkedin.com"); // Protect LinkedIn job applications and professional features

if (currentSite.type !== "youtube" && !isInternalPage && !isGoogleApp) {
   // Activate popup & redirect blocking immediately
   blockPopupsAndRedirects();

   // Check whitelist first
   checkWhitelist().then((isWhitelisted) => {
      if (isWhitelisted) {
         return;
      }

      // For non-YouTube sites, run universal ad blocking
      const initialHidden = hideUniversalAds(true); // TRUE = remove completely
      if (initialHidden > 0) {
         safeSendMessage({
            action: "INCREMENT_STATS",
            domain: currentSite.hostname,
            type: "element",
         });
      }

      // Watch for new ads with MutationObserver
      const observer = new MutationObserver(() => {
         const newHidden = hideUniversalAds(true); // TRUE = remove completely
         if (newHidden > 0) {
            safeSendMessage({
               action: "INCREMENT_STATS",
               domain: currentSite.hostname,
               type: "element",
            });
         }
      });

      if (document.body) {
         observer.observe(document.body, { childList: true, subtree: true });
      } else {
         document.addEventListener("DOMContentLoaded", () => {
            observer.observe(document.body, { childList: true, subtree: true });
         });
      }

      // CONTINUOUS SCANNING - Run every 2 seconds to catch delayed ads
      setInterval(() => {
         const scannedHidden = hideUniversalAds(true);
         if (scannedHidden > 0) {
            safeSendMessage({
               action: "INCREMENT_STATS",
               domain: currentSite.hostname,
               type: "element",
            });
         }
      }, 2000); // Scan every 2 seconds
   });
}

// ============================================================================
// YOUTUBE-SPECIFIC CODE (Existing functionality preserved)
// ============================================================================

// Only run YouTube-specific features on YouTube
if (currentSite.type === "youtube") {
   // Helper to find the video element - using EXACT selectors from Shorts HTML
   const getVideo = () => {
      // For Shorts: Look for the exact video element structure
      let video = document.querySelector("#shorts-player video.html5-main-video");

      // For regular videos
      if (!video) {
         video = document.querySelector("#movie_player video.html5-main-video");
      }

      // Try other Shorts variations
      if (!video) {
         video = document.querySelector(".html5-video-player video");
      }

      // Final fallback
      if (!video) {
         video = document.querySelector("video");
      }

      return video;
   };

   // AGGRESSIVE Shorts speed enforcement - runs every 100ms
   let lastEnforcedSpeed = 1.0;
   const enforceShortsSpeed = () => {
      const video = getVideo();
      if (!video) return;

      const targetSpeed = state.targetSpeed || 1.0;

      // Only enforce if not in special modes
      if (!state.isAdSpeeding && !state.isKeyBoosting) {
         if (Math.abs(video.playbackRate - targetSpeed) > 0.01) {
            video.playbackRate = targetSpeed;
            lastEnforcedSpeed = targetSpeed;
         }
      }
   };

   // Run speed enforcement every 100ms (very aggressive)
   setInterval(enforceShortsSpeed, 100);

   // ============================================================================
   // SUPERIOR AUTO-SCROLL IMPLEMENTATION (Class-based, Event-driven)
   // ============================================================================

   class YouTubeShortsAutoScroll {
      constructor(stateRef) {
         this.state = stateRef;
         this.currentVideo = null;
         this.videoEndListener = null;
         this.urlObserver = null;
         this.lastURL = null;
         this.lastScrollTime = 0;
         this.scrolling = false; // Lock for race prevention
         this.bindingInterval = null;
         this.init();
      }

      init() {
         this.observeURLChanges();
         this.checkForVideo();
         // Periodic validation of video binding presence (fix for lost listeners)
         this.bindingInterval = setInterval(() => this.validateVideoBinding(), 500);
      }

      validateVideoBinding() {
         // If we are on shorts but have no video or video changed underneath us
         if (!window.location.pathname.includes("/shorts/")) return;
         const video = getVideo();
         if (!video) return;

         if (video !== this.currentVideo) {
            console.log("[Auto-Scroll] 🔄 Video element replaced, re-binding...");
            this.currentVideo = video;
            this.setupVideoListener(video);
         }
      }

      observeURLChanges() {
         // Detect SPA navigation
         this.urlObserver = new MutationObserver(() => {
            if (window.location.pathname.includes("/shorts/")) {
               this.checkForVideo();
            }
         });

         this.urlObserver.observe(document.body, {
            childList: true,
            subtree: true,
         });
      }

      checkForVideo() {
         if (!window.location.pathname.includes("/shorts/")) return;

         // Find current Shorts video
         const video = getVideo();

         if (video && video !== this.currentVideo) {
            this.currentVideo = video;
            this.setupVideoListener(video);
         }
      }

      setupVideoListener(video) {
         if (this.videoEndListener && this.currentVideo) {
            this.currentVideo.removeEventListener("ended", this.videoEndListener);
            this.currentVideo.removeEventListener("timeupdate", this.timeUpdateListener);
         }

         this.hasTriggered = false;
         this.adSkipTriggered = false;
         this.lastVideoTime = 0;

         this.videoEndListener = () => {
            if (this.canScroll()) {
               console.log("[Auto-Scroll] ✅ Ended event -> Scrolling");
               this.scrollToNextShort();
            }
         };

         this.timeUpdateListener = () => {
            if (this.currentVideo) {
               this.handleTimeUpdate(this.currentVideo);
            }
         };

         video.addEventListener("ended", this.videoEndListener);
         video.addEventListener("timeupdate", this.timeUpdateListener);
         console.log("[Auto-Scroll] Listeners active for", video.src);
      }

      _setupVideoListener_unused(video) {
         // Remove old listeners
         if (this.videoEndListener && this.currentVideo) {
            this.currentVideo.removeEventListener("ended", this.videoEndListener);
            this.currentVideo.removeEventListener("timeupdate", this.timeUpdateListener);
         }

         // Reset flags
         this.hasTriggered = false;
         this.adSkipTriggered = false;
         this.lastVideoTime = 0;

         // Unified scroll triggers
         this.videoEndListener = () => {
            if (this.canScroll()) {
               console.log("[Auto-Scroll] ✅ Ended event -> Scrolling");
               this.scrollToNextShort();
            }
         };
         video.addEventListener("ended", this.videoEndListener);

         // "Timeupdate" listener for looping Shorts
         // Strategy: Detect when video loops (timestamp resets) OR reaches very end
         this.timeUpdateListener = () => {
            const video = this.currentVideo;
            if (!video || !video.duration) return;

            // 1. Detect Ad and Skip
            if (this.state.isAutoScrollShortsEnabled && this.isAd()) {
               if (!this.adSkipTriggered) {
                  this.adSkipTriggered = true;
                  console.log("[Auto-Scroll] 🚫 Ad detected, scrolling...");
                  this.scrollToNextShort(true); // Force skip
               }
               return;
            }

            // 2. Logic for regular Shorts
            const currentTime = video.currentTime;
            const duration = video.duration;

            // Loop Detection Logic:
            // 1. Check for significant time reversal (current time is much less than last time)
            // This catches almost all loops regardless of duration percentages.
            // We ignore small seeks/scrubs (e.g. going back 1 second) by checking if we were relatively far in the video.
            if (this.lastVideoTime > 5.0 && currentTime < 1.0) {
               if (!this.hasTriggered && this.state.isAutoScrollShortsEnabled) {
                  console.log("[Auto-Scroll] 🔄 Loop detected (generic time reversal), scrolling...");
                  this.hasTriggered = true;
                  this.scrollToNextShort();
               }
            }

            // 2. Percentage based check (for shorter videos)
            const isNearEnd = this.lastVideoTime > duration * 0.85;
            const isNearStart = currentTime < duration * 0.15;

            if (isNearEnd && isNearStart) {
               if (!this.hasTriggered && this.state.isAutoScrollShortsEnabled) {
                  console.log("[Auto-Scroll] 🔄 Loop detected (percentage jump), scrolling...");
                  this.hasTriggered = true;
                  this.scrollToNextShort();
               }
            }

            // Fallback: If we are extremely close to the end (0.25s), trigger.
            // Some videos pause at the end instead of looping triggers.
            if (!this.hasTriggered && this.state.isAutoScrollShortsEnabled) {
               const timeRemaining = duration - currentTime;
               // Relaxed to 0.25s and removed !video.paused check as sometimes it reports paused right before end
               if (timeRemaining > 0 && timeRemaining < 0.25) {
                  console.log("[Auto-Scroll] ⏱️ Near end detected, scrolling...");
                  this.hasTriggered = true;
                  this.scrollToNextShort();
               }
            }

            this.lastVideoTime = currentTime;
         };

         video.addEventListener("timeupdate", this.timeUpdateListener);
         console.log("[Auto-Scroll] Listeners attached to video", video.src);
      }

      onVideoEnd() {
         // Deprecated in favor of inline listener above, but kept if needed for legacy calls.
         if (this.canScroll()) {
            console.log("[Auto-Scroll] ✅ Ended event (legacy) -> Scrolling");
            this.scrollToNextShort();
         }
      }

      handleTimeUpdate(video) {
         if (!this.state.isAutoScrollShortsEnabled) return;
         if (this.hasTriggered) return;

         if (!video || !video.duration) return;

         // 1. Ad Detection (Highest Priority)
         if (this.isAd()) {
            if (this.canScroll(true)) {
               // force=true for ads
               console.log("[Auto-Scroll] 🚫 Ad detected -> Skipping");
               this.scrollToNextShort(true);
            }
            return;
         }

         const currentTime = video.currentTime;
         const duration = video.duration;

         // 2. Loop Detection
         // Generic time reversal (catch-all for loops)
         if (this.lastVideoTime > 5.0 && currentTime < 1.0) {
            if (this.canScroll()) {
               console.log("[Auto-Scroll] 🔄 Loop (Time Jump) -> Scrolling");
               this.scrollToNextShort();
            }
         }
         // Percentage based loop (short videos)
         else if (this.lastVideoTime > duration * 0.85 && currentTime < duration * 0.15) {
            if (this.canScroll()) {
               console.log("[Auto-Scroll] 🔄 Loop (%) -> Scrolling");
               this.scrollToNextShort();
            }
         }
         // 3. Near End Detection (Fallback for pause-at-end)
         else {
            const timeRemaining = duration - currentTime;
            if (timeRemaining > 0 && timeRemaining < 0.25) {
               if (this.canScroll()) {
                  console.log("[Auto-Scroll] ⏱️ Near End -> Scrolling");
                  this.scrollToNextShort();
               }
            }
         }

         this.lastVideoTime = currentTime;
      }

      // CENTRAL GATEKEEPER
      canScroll(force = false) {
         if (!this.state.isAutoScrollShortsEnabled) return false;

         // Prevent double fires
         if (this.scrolling) return false;

         // Cooldown Check
         const now = Date.now();

         // Adaptive cooldown:
         // For very short videos (e.g. 5s), 1.5s cooldown is fine.
         // For ads (force=true), we want fast skip (0.3s).
         // Standard: 1.2s to prevent accidental double skips.
         let limit = force ? 300 : 1200;

         if (now - this.lastScrollTime < limit) {
            return false;
         }

         this.scrolling = true;
         this.lastScrollTime = now;
         // We do NOT set hasTriggered here, because hasTriggered is per-video for loops.
         // Wait, actually hasTriggered IS setting in setupVideoListener loop.
         // Let's rely on setupVideoListener logic to set hasTriggered=true when it scrolls.

         // Release lock after a bit (allow next video to scroll)
         setTimeout(() => {
            this.scrolling = false;
         }, 800);

         return true;
      }

      isAd() {
         const video = this.currentVideo;
         if (!video) return false;
         const container = video.closest("ytd-reel-video-renderer");
         if (!container) return false;

         let signals = 0;
         // Attribute check
         if (container.hasAttribute("is-ad")) signals += 2; // Strong signal
         if (container.querySelector("ytd-ad-slot-renderer")) signals += 2;

         // Badge text check
         const badges = container.querySelectorAll(
            ".badge-style-type-ad, .ytd-ad-badge-renderer, [aria-label='Ad'], [aria-label='Sponsored']",
         );
         if (badges.length > 0) signals++;

         // Text content check (Sponsored / Ad)
         const textContent = container.innerText.toLowerCase();
         if (textContent.includes("#ad") || textContent.includes("sponsored")) {
            // Weak signal on its own, stronger if combined
            signals += 0.5;
         }

         // Action buttons
         const button = container.querySelector("#action-button");
         if (button) {
            const txt = button.textContent.toLowerCase();
            if (txt.includes("install") || txt.includes("shop") || txt.includes("sign up")) signals++;
         }

         return signals >= 1.5; // Require at least one strong signal or multiple weak ones
      }

      scrollToNextShort(force = false) {
         // 1. Keyboard Navigation (Most Reliable)
         console.log("[Auto-Scroll] ⌨️ Sending ArrowDown");
         const downEvent = new KeyboardEvent("keydown", {
            key: "ArrowDown",
            code: "ArrowDown",
            keyCode: 40,
            bubbles: true,
            cancelable: true,
         });
         document.body.dispatchEvent(downEvent);

         // 2. Button Fallback (If keyboard blocked)
         setTimeout(() => {
            const navBtn = document.querySelector("#navigation-button-down button");
            if (navBtn) {
               navBtn.click();
            }
         }, 50);
      }

      destroy() {
         if (this.urlObserver) {
            this.urlObserver.disconnect();
         }
         if (this.bindingInterval) clearInterval(this.bindingInterval);
         if (this.videoEndListener && this.currentVideo) {
            this.currentVideo.removeEventListener("ended", this.videoEndListener);
            this.currentVideo.removeEventListener("timeupdate", this.timeUpdateListener);
         }
      }
   }

   // CATEGORY DEFINITIONS
   const PRESET_CATEGORIES = {
      food: ["food", "cooking", "recipe", "kitchen", "chef", "meal", "eating", "mukbang", "taste test", "street food", "restaurant"],
      tech: [
         "tech",
         "technology",
         "gadget",
         "smartphone",
         "iphone",
         "android",
         "review",
         "unboxing",
         "software",
         "coding",
         "programming",
         "computer",
         "pc build",
      ],
      ai: [
         "ai",
         "artificial intelligence",
         "chatgpt",
         "midjourney",
         "llm",
         "openai",
         "machine learning",
         "robot",
         "automation",
         "future tech",
      ],
      spiritual: [
         "spiritual",
         "meditation",
         "yoga",
         "chakra",
         "manifestation",
         "astrology",
         "tarot",
         "psychic",
         "healing",
         "guru",
         "awakening",
      ],
      gaming: [
         "gaming",
         "gameplay",
         "walkthrough",
         "streamer",
         "twitch",
         "esports",
         "minecraft",
         "roblox",
         "fortnite",
         "playstation",
         "xbox",
         "nintendo",
      ],
      shorts: ["#shorts", "shorts"], // Special handling might be needed for actual shorts shelf, but keywords help too
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
   // VIDEO ENHANCER LOGIC
   // ---------------------------------------------------------
   const applyVideoFilters = () => {
      const video = getVideo();
      if (!video) return;

      const { brightness, contrast, saturation, grayscale, invert, rotate } = state.filters || {};

      const filterString = `
         brightness(${brightness}%) 
         contrast(${contrast}%) 
         saturate(${saturation}%) 
         grayscale(${grayscale ? 1 : 0}) 
         invert(${invert ? 1 : 0})
      `;

      // Apply CSS transform and filter
      video.style.filter = filterString;

      // Handle Rotation
      if (rotate !== undefined && rotate !== 0) {
         // You might need to adjust scale to fit screen when rotated 90/270
         let scale = 1;
         if (rotate % 180 !== 0) {
            const rect = video.getBoundingClientRect();
            // Rudimentary scale to prevent black bars being too huge, user can adjust
            // scale = rect.width / rect.height; // Simplistic
            scale = 1; // Keeping simple for now
         }
         video.style.transform = `rotate(${rotate}deg) scale(${scale})`;
      } else {
         video.style.transform = "";
      }
   };

   // Ensure filters persist if video changes (hook into existing interval or observer)
   // We can add it to 'checkLoop' or similar periodic check if needed,
   // but primarily we trust the video element persistence.
   // However, YouTube re-renders video tags sometimes.
   setInterval(applyVideoFilters, 1000); // Low frequency check to ensure persistence

   // ---------------------------------------------------------
   // MESSAGE LISTENER
   // ---------------------------------------------------------
   chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      const video = getVideo();

      switch (request.action) {
         case "GET_STATE":
            sendResponse({
               speed: state.targetSpeed,
               loop: state.loop,
               boostKey: state.boostKey,
               boostSpeed: state.boostSpeed,
               isAutoSkipEnabled: state.isAutoSkipEnabled,
               isSpeedAdEnabled: state.isSpeedAdEnabled,
               isZenModeEnabled: state.isZenModeEnabled,
               isBoosterEnabled: state.isBoosterEnabled,
               isAutoScrollShortsEnabled: state.isAutoScrollShortsEnabled,
               activeCategories: state.activeCategories,
               customCategories: state.customCategories,
               focusKeywords: state.focusKeywords,
               isFocusModeEnabled: state.isFocusModeEnabled,
               isStrictModeEnabled: state.isStrictModeEnabled,
               volume: state.volume,
               filters: state.filters, // Send filters back
            });
            break;

         case "SET_FILTERS":
            if (request.filters) {
               state.filters = { ...state.filters, ...request.filters };
               applyVideoFilters();
            }
            sendResponse({ success: true, filters: state.filters });
            break;
         case "SET_SPEED":
            if (video) {
               video.playbackRate = request.speed;
               state.targetSpeed = request.speed;
               saveSettings();
            }
            sendResponse({ speed: state.targetSpeed });
            break;

         case "TOGGLE_AUTOSKIP":
            state.isAutoSkipEnabled = request.enabled;
            saveSettings();
            sendResponse({ isAutoSkipEnabled: state.isAutoSkipEnabled });
            break;

         case "TOGGLE_SPEED_ADS":
            state.isSpeedAdEnabled = request.enabled;
            saveSettings();
            sendResponse({ isSpeedAdEnabled: state.isSpeedAdEnabled });
            break;

         case "TOGGLE_ZEN_MODE":
            toggleZenMode(request.enabled);
            saveSettings();
            sendResponse({ isZenModeEnabled: state.isZenModeEnabled });
            break;

         case "TOGGLE_BOOSTER":
            state.isBoosterEnabled = request.enabled;
            saveSettings();
            sendResponse({ isBoosterEnabled: state.isBoosterEnabled });
            break;

         case "TOGGLE_AUTO_SCROLL_SHORTS":
            state.isAutoScrollShortsEnabled = request.enabled;
            if (state.isAutoScrollShortsEnabled && !autoScrollManager) {
               autoScrollManager = new AutoScrollManager();
            } else if (!state.isAutoScrollShortsEnabled && autoScrollManager) {
               autoScrollManager.destroy();
               autoScrollManager = null;
            }
            saveSettings();
            sendResponse({ isAutoScrollShortsEnabled: state.isAutoScrollShortsEnabled });
            break;

         case "SET_VOLUME":
            setVolume(request.volume);
            saveSettings();
            sendResponse({ volume: state.volume });
            break;

         case "SET_LOOP":
            state.loop = request.loop;
            saveSettings();
            sendResponse({ loop: state.loop });
            break;

         case "SET_BOOST_SETTINGS":
            state.boostKey = request.boostKey;
            state.boostSpeed = request.boostSpeed;
            saveSettings();
            sendResponse({ boostKey: state.boostKey, boostSpeed: state.boostSpeed });
            break;

         case "TOGGLE_FOCUS_MODE":
            state.isFocusModeEnabled = request.enabled;
            if (state.isFocusModeEnabled) {
               runFocusFilter();
            } else {
               clearFocusFilter();
            }
            saveSettings();
            sendResponse({ isFocusModeEnabled: state.isFocusModeEnabled });
            break;

         case "TOGGLE_STRICT_MODE":
            state.isStrictModeEnabled = request.enabled;
            if (state.isFocusModeEnabled) {
               runFocusFilter();
            }
            saveSettings();
            sendResponse({ isStrictModeEnabled: state.isStrictModeEnabled });
            break;

         case "SET_FOCUS_KEYWORDS":
            state.focusKeywords = request.keywords;
            if (state.isFocusModeEnabled) {
               runFocusFilter();
            }
            saveSettings();
            sendResponse({ focusKeywords: state.focusKeywords });
            break;

         case "SET_ACTIVE_CATEGORIES":
            state.activeCategories = request.categories;
            if (state.isFocusModeEnabled) {
               runFocusFilter();
            }
            saveSettings();
            sendResponse({ activeCategories: state.activeCategories });
            break;

         case "SET_CUSTOM_CATEGORIES":
            state.customCategories = request.categories;
            if (state.isFocusModeEnabled) {
               runFocusFilter();
            }
            saveSettings();
            sendResponse({ customCategories: state.customCategories });
            break;

         case "TAKE_SNAPSHOT":
            takeSnapshot();
            sendResponse({ success: true });
            break;

         case "TOGGLE_MIRROR":
            toggleMirror(request.enabled);
            saveSettings();
            sendResponse({ isMirrored: state.isMirrored });
            break;
      }
   });

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
         isAutoScrollShortsEnabled: state.isAutoScrollShortsEnabled,
         volume: state.volume,
         // Focus Persistence
         isFocusModeEnabled: state.isFocusModeEnabled,
         isStrictModeEnabled: state.isStrictModeEnabled,
         focusKeywords: state.focusKeywords,
         activeCategories: state.activeCategories,
         customCategories: state.customCategories,
         isMirrored: state.isMirrored,
         filters: state.filters, // Save filters
      };
      chrome.storage.local.set({ [STORAGE_KEY]: settings }, () => {
         console.log("[Settings] Saved - Auto-scroll:", state.isAutoScrollShortsEnabled);
      });
   };

   const loadSettings = () => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
         if (result[STORAGE_KEY]) {
            const saved = result[STORAGE_KEY];
            if (saved.targetSpeed) state.targetSpeed = saved.targetSpeed;
            if (saved.isAutoSkipEnabled !== undefined) state.isAutoSkipEnabled = saved.isAutoSkipEnabled;
            if (saved.isSpeedAdEnabled !== undefined) state.isSpeedAdEnabled = saved.isSpeedAdEnabled;
            if (saved.isBoosterEnabled !== undefined) state.isBoosterEnabled = saved.isBoosterEnabled;
            if (saved.isAutoScrollShortsEnabled !== undefined) {
               state.isAutoScrollShortsEnabled = saved.isAutoScrollShortsEnabled;
               console.log("[Settings] Loaded - Auto-scroll:", state.isAutoScrollShortsEnabled);
            }

            // Load Focus
            if (saved.isFocusModeEnabled !== undefined) state.isFocusModeEnabled = saved.isFocusModeEnabled;
            if (saved.isStrictModeEnabled !== undefined) state.isStrictModeEnabled = saved.isStrictModeEnabled;
            if (saved.focusKeywords !== undefined) state.focusKeywords = saved.focusKeywords;
            if (saved.activeCategories !== undefined) state.activeCategories = saved.activeCategories;
            if (saved.customCategories !== undefined) state.customCategories = saved.customCategories;

            if (saved.volume !== undefined) {
               state.volume = saved.volume;
               setVolume(state.volume);
            }

            // Visual settings
            if (saved.isZenModeEnabled !== undefined) {
               state.isZenModeEnabled = saved.isZenModeEnabled;
               toggleZenMode(state.isZenModeEnabled);
            }

            if (saved.isMirrored !== undefined) {
               state.isMirrored = saved.isMirrored;
               toggleMirror(state.isMirrored);
            }

            // Trigger filter on load
            if (state.isFocusModeEnabled) runFocusFilter();
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
                .ytd-ad-slot-renderer,
                ytd-rich-item-renderer:has(.ytd-ad-slot-renderer),
                ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
                #masthead-ad,
                ytd-banner-promo-renderer,
                ytd-statement-banner-renderer,
                ytd-in-feed-ad-layout-renderer,
                ytd-merch-shelf-renderer,
                ytd-display-ad-renderer,
                .ytd-display-ad-renderer,
                #player-ads,
                #offer-module,
                .video-ads,
                .ytp-ad-module {
                    display: none !important;
                    visibility: hidden !important;
                }
                
                ytd-watch-flexy[flexy] #primary.ytd-watch-flexy {
                    margin: 0 auto !important;
                    min-width: 0 !important;
                    flex: 1;
                    justify-content: center;
                }
                
                /* Ensure player is centered and focused */
                #player-container-outer {
                    max-width: 100% !important;
                    margin: 0 auto !important;
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

   const toggleMirror = (enabled) => {
      state.isMirrored = enabled;
      const video = getVideo();
      if (video) {
         if (enabled) {
            video.style.transform = "scaleX(-1)";
         } else {
            video.style.transform = "";
         }
      }
   };

   const takeSnapshot = () => {
      const video = getVideo();
      if (!video) return;

      try {
         const canvas = document.createElement("canvas");
         canvas.width = video.videoWidth;
         canvas.height = video.videoHeight;
         const ctx = canvas.getContext("2d");

         // If mirrored, flip the context too so screenshot matches view
         if (state.isMirrored) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
         }

         ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

         const dataURL = canvas.toDataURL("image/png");
         const link = document.createElement("a");
         link.download = `snapshot_${Date.now()}.png`;
         link.href = dataURL;
         link.click();
      } catch (e) {
         console.error("Snapshot failed", e);
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
      const hasSkipButton =
         document.querySelector(".ytp-ad-skip-button") !== null || document.querySelector(".ytp-skip-ad-button") !== null;
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

            // CRITICAL FIX: Ensure we don't accidentally keep high speeds
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
            // Force Speed: ENABLED as per user request (6x)
            // Note: Excessive speeds might trigger YouTube's "Ad blockers not allowed".
            // If user enables this, they accept the risk.
            if (video.playbackRate !== 4.0) video.playbackRate = 4.0;

            // Mute is usually safe and preferred
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
      // 1. SPECIFIC CHECK: YouTube "Ad blockers are not allowed" dialog
      // Strategy: Click dismiss if available, otherwise Nuke the popup from DOM and resume video.
      const enforcement = document.querySelector("ytd-enforcement-message-view-model") || document.querySelector("tp-yt-paper-dialog");

      if (enforcement) {
         // Verify it's the ad-block popup by checking text content if generic dialog
         if (enforcement.tagName === "TP-YT-PAPER-DIALOG" && !enforcement.innerText.includes("Ad blockers")) {
            // Not the droid we are looking for (probably playlist/share dialog)
         } else {
            console.log("[Auto-Skip] 🚫 Enforcement popup detected");
            const closeBtn =
               enforcement.querySelector("#dismiss-button button") ||
               enforcement.querySelector('button[aria-label="Close"]') ||
               enforcement.querySelector(".yt-spec-button-shape-next--filled"); // generic primary button fallback

            if (closeBtn) {
               console.log("[Auto-Skip] 👆 Clicking dismiss button");
               triggerClick(closeBtn);
            } else {
               console.log("[Auto-Skip] 🗑️ Removing enforcement popup from DOM");
               enforcement.remove(); // Aggressive removal

               // Also remove the backdrop (grey overlay)
               const backdrop = document.querySelector("tp-yt-iron-overlay-backdrop");
               if (backdrop) backdrop.remove();
            }

            // Force resume video (often paused by the popup)
            const video = getVideo();
            if (video && video.paused) {
               console.log("[Auto-Skip] ▶️ Resuming video");
               video.play();
            }

            popupCooldown = true;
            setTimeout(() => {
               popupCooldown = false;
            }, 1000);
            return;
         }
      }

      // 3. GENERIC TEXT SEARCH (Brute Force Fallback)
      // Only run this if we didn't find the specific enforcement element above, OR run it anyway.
      // We look for any dialogue that contains the forbidden words.
      if (!popupCooldown) {
         const dialogs = document.querySelectorAll(
            "tp-yt-paper-dialog, .ytd-popup-container, ytd-enforcement-message-view-model, [role='dialog']",
         );
         for (const dialog of dialogs) {
            if (
               dialog.innerText &&
               (dialog.innerText.includes("Ad blockers are not allowed") || dialog.innerText.includes("Video playback is blocked"))
            ) {
               console.log("[Auto-Skip] 🚨 Generic popup detection triggered");
               dialog.remove();
               const backdrop = document.querySelector("tp-yt-iron-overlay-backdrop");
               if (backdrop) backdrop.remove();

               // Resume
               const video = getVideo();
               if (video && video.paused) video.play();

               popupCooldown = true;
               setTimeout(() => {
                  popupCooldown = false;
               }, 1000);
               return; // Exit after handling
            }
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
   // FOCUS FILTER LOGIC (NEW)
   // ---------------------------------------------------------

   /**
    * Checks if a string contains any of the blocked keywords
    * @param {string} text
    * @returns {boolean}
    */
   const containsKeyword = (text) => {
      if (!text || typeof text !== "string") return false;
      const lowerText = text.toLowerCase();

      // Exact match word boundary check or simple includes?
      // Simple includes is safer for broad filtering initially requested (e.g. "politics").

      // 1. Check Custom Keywords
      if (state.focusKeywords.some((keyword) => lowerText.includes(keyword.toLowerCase()))) {
         return true;
      }

      // 2. Check Active Categories (Both Preset and Custom)
      if (state.activeCategories && state.activeCategories.length > 0) {
         for (const catId of state.activeCategories) {
            let keywords = [];

            // Check if it's a Preset
            if (PRESET_CATEGORIES[catId]) {
               keywords = PRESET_CATEGORIES[catId];
            }
            // Check if it's a Custom Category
            else {
               const customCat = state.customCategories.find((c) => c.id === catId);
               if (customCat && customCat.keywords) {
                  keywords = customCat.keywords;
               }
            }

            if (keywords && keywords.some((k) => lowerText.includes(k.toLowerCase()))) {
               return true;
            }
         }
      }

      return false;
   };

   /**
    * Main filtering function
    */
   const runFocusFilter = () => {
      if (!state.isFocusModeEnabled) return;

      // Proceed if we have keywords OR active categories
      const hasKeywords = state.focusKeywords && state.focusKeywords.length > 0;
      const hasCategories = state.activeCategories && state.activeCategories.length > 0;

      if (!hasKeywords && !hasCategories) return;

      // Selectors for Video Cards (Grid, List, Recommendations)
      // ytd-rich-item-renderer: Homepage grid items
      // ytd-compact-video-renderer: Sidebar recommendations
      // ytd-video-renderer: Search results
      // ytd-grid-video-renderer: Channel videos
      // ytm-video-with-context-renderer: Mobile/Modern grid
      // ytd-reel-item-renderer: Shorts in grid

      const cardSelectors = [
         "ytd-rich-item-renderer",
         "ytd-compact-video-renderer",
         "ytd-video-renderer",
         "ytd-grid-video-renderer",
         "ytd-reel-item-renderer",
         "ytm-video-with-context-renderer",
      ];

      const cards = document.querySelectorAll(cardSelectors.join(","));

      cards.forEach((card) => {
         // Skip if already processed
         if (card.dataset.yqsFiltered === "true") return;

         // Extract Text
         // Title selector tries to find the main text.
         // #video-title often holds the title text.
         const titleEl = card.querySelector("#video-title") || card.querySelector("h3") || card.querySelector(".title");
         const titleText = titleEl ? titleEl.textContent + " " + titleEl.getAttribute("title") : "";

         // Description/Snippet (for search results)
         // #description-text or specific metadata
         const descEl = card.querySelector("#description-text") || card.querySelector(".metadata-snippet-text");
         const descText = descEl ? descEl.textContent : "";

         const fullText = (titleText + " " + descText).trim();

         if (fullText && containsKeyword(fullText)) {
            applyFilterAction(card);
         }
      });

      // Shorts Shelf Special Handling (ytd-rich-shelf-renderer often holds shorts)
      // If strict on "shorts", we might want to hide the whole shelf if title matches or just items.
      // This is optional advanced logic, but good to have.
   };

   const applyFilterAction = (card) => {
      card.dataset.yqsFiltered = "true"; // Mark processed

      // Determine the container to blur (fallback to card if specific container not found)
      const targetContainer = card.querySelector("#content") || card.querySelector("#dismissible") || card;

      if (state.isStrictModeEnabled) {
         // STRICT MODE: Clean Removal
         // Use display: none !important to force removal from flow.
         card.style.setProperty("display", "none", "important");
         card.style.setProperty("visibility", "hidden", "important"); // Double tap
      } else {
         // DEFAULT MODE: "Premium Blur" Overlay
         // Instead of a grey box, we blur the content and show a minimal interactable overlay.

         // 1. Blur the content
         if (targetContainer) {
            targetContainer.style.filter = "blur(12px) grayscale(100%) opacity(0.4)";
            targetContainer.style.pointerEvents = "none"; // Prevent clicks on blurred video
            targetContainer.style.transition = "all 0.4s ease";
         }

         // 2. Add the minimalist overlay
         const overlay = document.createElement("div");
         overlay.className = "yqs-filter-overlay";

         // Centered overlay styling
         Object.assign(overlay.style, {
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            bottom: "0",
            zIndex: "10",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "auto", // Allow clicking the button
         });

         overlay.innerHTML = `
            <div style="
                background: rgba(0,0,0,0.8); 
                backdrop-filter: blur(8px);
                border-radius: 12px; 
                padding: 12px 20px;
                display:flex; flex-direction:column; align-items:center; justify-content:center;
                box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                border: 1px solid rgba(255,255,255,0.1);
            ">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="#aaa">
                         <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                    <span style="color:#eee; font-family:sans-serif; font-size:13px; font-weight:500;">Filtered</span>
                </div>
                <button class="yqs-reveal-btn" style="
                    background: rgba(62, 166, 255, 0.2); 
                    border: 1px solid rgba(62, 166, 255, 0.4); 
                    color: #fff; 
                    padding: 8px 16px; 
                    border-radius: 20px; 
                    cursor: pointer; 
                    font-size: 12px;
                    font-weight: 600;
                    transition: all 0.2s;
                ">Show Video</button>
            </div>
        `;

         // Hover Effect for Button
         const btn = overlay.querySelector(".yqs-reveal-btn");
         if (btn) {
            btn.onmouseover = () => {
               btn.style.background = "rgba(62, 166, 255, 0.4)";
               btn.style.borderColor = "#3ea6ff";
            };
            btn.onmouseout = () => {
               btn.style.background = "rgba(62, 166, 255, 0.2)";
               btn.style.borderColor = "rgba(62, 166, 255, 0.4)";
            };

            btn.onclick = (e) => {
               e.stopPropagation();
               e.preventDefault();

               // Reveal Animation
               overlay.style.opacity = "0";
               overlay.style.pointerEvents = "none";
               if (targetContainer) {
                  targetContainer.style.filter = "none";
                  targetContainer.style.pointerEvents = "auto";
                  targetContainer.style.opacity = "1";
               }
               // Remove after animation
               setTimeout(() => overlay.remove(), 400);
            };
         }

         // Ensure Card Positioning
         const computedPos = window.getComputedStyle(card).position;
         if (computedPos === "static") card.style.position = "relative";
         card.appendChild(overlay);
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

      // 3. Grid/Feed Observer for Focus Filter
      // Observe the main content container to detect new video loads (infinite scroll)
      // ytd-app combines almost everything. 'content' is usually the main wrapper.
      const contentApp = document.querySelector("ytd-app") || document.body;
      const contentObserver = new MutationObserver((mutations) => {
         // Throttle slightly
         if (state.isFocusModeEnabled) {
            runFocusFilter();
         }
      });
      contentObserver.observe(contentApp, { childList: true, subtree: true });
   };

   // Start Observers
   initObservers();

   setInterval(() => {
      const video = getVideo();
      handlePopups();
      if (state.isFocusModeEnabled) runFocusFilter();

      // Failsafe: Always try to skip if enabled, even if detection missed it
      if (state.isAutoSkipEnabled) skipAd();

      if (video) {
         updateAdState();
         if (!cachedIsAdPlaying && state.loop.active && state.loop.start !== null && state.loop.end !== null) {
            if (video.currentTime >= state.loop.end) video.currentTime = state.loop.start;
         }

         // Auto-scroll is now handled by dedicated 'ended' event listener above
         // (removed duplicate logic to prevent conflicts)

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

   // Aggressive speed enforcement - catch when YouTube changes speed
   let lastVideoElement = null;
   const attachSpeedListener = () => {
      const video = getVideo();
      if (video && video !== lastVideoElement) {
         lastVideoElement = video;

         // Listen for speed changes and enforce our speed
         video.addEventListener("ratechange", () => {
            if (!state.isAdSpeeding && !state.isKeyBoosting) {
               const expectedSpeed = state.targetSpeed || 1.0;
               if (Math.abs(video.playbackRate - expectedSpeed) > 0.01) {
                  // YouTube changed the speed, enforce ours
                  setTimeout(() => {
                     video.playbackRate = expectedSpeed;
                  }, 10);
               }
            }
         });

         // Also enforce immediately
         enforceSpeed();
      }
   };

   // Attach listener initially and on navigation
   attachSpeedListener();

   document.addEventListener("yt-navigate-finish", () => {
      setTimeout(() => {
         attachSpeedListener();
         enforceSpeed();
         initObservers(); // Re-bind if player DOM replaced
      }, 500);
   });

   // Monitor for video element changes (important for Shorts)
   const videoObserver = new MutationObserver(() => {
      attachSpeedListener();
   });

   videoObserver.observe(document.body, {
      childList: true,
      subtree: true,
   });

   loadSettings();

   // Initialize auto-scroll manager with state reference
   autoScrollManager = new YouTubeShortsAutoScroll(state);

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
            // Persist setting
            chrome.storage.local.set({ isAutoSkipEnabled: state.isAutoSkipEnabled });
            needSave = true;
            sendResponse({ success: true });
            break;
         case "TOGGLE_SPEED_ADS":
            state.isSpeedAdEnabled = request.enabled;
            chrome.storage.local.set({ isSpeedAdEnabled: state.isSpeedAdEnabled });
            needSave = true;
            sendResponse({ success: true });
            break;
         case "TOGGLE_ZEN_MODE":
            toggleZenMode(request.enabled);
            // Saved within toggleZenMode logic via state, but let's be explicit
            chrome.storage.local.set({ isZenModeEnabled: state.isZenModeEnabled });
            needSave = true;
            sendResponse({ success: true });
            break;
         case "TOGGLE_BOOSTER":
            state.isBoosterEnabled = request.enabled;
            chrome.storage.local.set({ isBoosterEnabled: state.isBoosterEnabled });
            needSave = true;
            sendResponse({ success: true });
            break;
         case "TOGGLE_AUTO_SCROLL_SHORTS":
            state.isAutoScrollShortsEnabled = request.enabled;
            chrome.storage.local.set({ isAutoScrollShortsEnabled: state.isAutoScrollShortsEnabled });
            needSave = true;
            sendResponse({ success: true });
            break;
         case "SET_VOLUME":
            setVolume(parseFloat(request.value));
            chrome.storage.local.set({ volume: state.volume });
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

         case "TOGGLE_PIP":
            (async () => {
               try {
                  const v = getVideo();
                  if (!v) throw new Error("No video found");

                  if (document.pictureInPictureElement) {
                     await document.exitPictureInPicture();
                     sendResponse({ active: false });
                  } else {
                     await v.requestPictureInPicture();

                     // Show instruction toast
                     const toast = document.createElement("div");
                     toast.textContent = "Pip Active: Drag window to move";
                     Object.assign(toast.style, {
                        position: "fixed",
                        bottom: "20px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "rgba(0,0,0,0.8)",
                        color: "white",
                        padding: "10px 20px",
                        borderRadius: "5px",
                        zIndex: "9999",
                        fontSize: "14px",
                        pointerEvents: "none",
                        transition: "opacity 0.5s",
                     });
                     document.body.appendChild(toast);
                     setTimeout(() => {
                        toast.style.opacity = "0";
                        setTimeout(() => toast.remove(), 500);
                     }, 3000);

                     sendResponse({ active: true });
                  }
               } catch (e) {
                  console.error("PiP Error:", e);
                  sendResponse({ error: e.message });
               }
            })();
            return true;

         // KEYWORD HANDLERS
         case "TOGGLE_FOCUS_MODE":
            state.isFocusModeEnabled = request.enabled;
            chrome.storage.local.set({ isFocusModeEnabled: state.isFocusModeEnabled });
            if (state.isFocusModeEnabled) {
               runFocusFilter();
            } else {
               // Optional: Un-hide everything? A reload is cleaner, but we can try to unhide.
               // For now, reload is easiest for "Show All" or just future items won't be blocked.
               location.reload();
            }
            needSave = true;
            sendResponse({ success: true });
            break;
         case "TOGGLE_STRICT_MODE":
            state.isStrictModeEnabled = request.enabled;
            chrome.storage.local.set({ isStrictModeEnabled: state.isStrictModeEnabled });
            // Rerun filter to update styles
            document.querySelectorAll("[data-yqs-filtered='true']").forEach((el) => {
               // Reset state and re-process
               el.style.visibility = "";
               const blocker = el.querySelector(".yqs-content-blocker");
               if (blocker) blocker.remove();
               delete el.dataset.yqsFiltered;
            });
            runFocusFilter();
            needSave = true;
            sendResponse({ success: true });
            break;
         case "ADD_KEYWORD":
            if (request.word && !state.focusKeywords.includes(request.word)) {
               state.focusKeywords.push(request.word);
               chrome.storage.local.set({ focusKeywords: state.focusKeywords });
               runFocusFilter();
               needSave = true;
            }
            sendResponse({ success: true, keywords: state.focusKeywords });
            break;
         case "REMOVE_KEYWORD":
            state.focusKeywords = state.focusKeywords.filter((k) => k !== request.word);
            chrome.storage.local.set({ focusKeywords: state.focusKeywords });
            // Rerun logic might be creating false negatives if we don't un-hide.
            // Simpler to reload or just let the user know changes apply on new content/reload.
            // Actually, let's just save.
            needSave = true;
            sendResponse({ success: true, keywords: state.focusKeywords });
            break;

         case "TOGGLE_CATEGORY":
            if (request.category) {
               if (request.enabled) {
                  if (!state.activeCategories.includes(request.category)) {
                     state.activeCategories.push(request.category);
                  }
               } else {
                  state.activeCategories = state.activeCategories.filter((c) => c !== request.category);
               }
               chrome.storage.local.set({ activeCategories: state.activeCategories });
               runFocusFilter();
               needSave = true;
            }
            sendResponse({ success: true, activeCategories: state.activeCategories });
            break;

         case "ADD_CATEGORY":
            if (request.category && request.category.id) {
               const exists = state.customCategories.find((c) => c.id === request.category.id);
               if (!exists) {
                  state.customCategories.push(request.category);
                  chrome.storage.local.set({ customCategories: state.customCategories });
                  needSave = true;
               }
            }
            sendResponse({ success: true, customCategories: state.customCategories });
            break;

         case "DELETE_CATEGORY":
            if (request.id) {
               state.customCategories = state.customCategories.filter((c) => c.id !== request.id);
               // Also remove from active
               state.activeCategories = state.activeCategories.filter((c) => c !== request.id);
               chrome.storage.local.set({
                  customCategories: state.customCategories,
                  activeCategories: state.activeCategories,
               });
               needSave = true;
            }
            sendResponse({ success: true, customCategories: state.customCategories });
            break;

         case "TOGGLE_MIRROR":
            toggleMirror(request.enabled);
            chrome.storage.local.set({ isMirrored: state.isMirrored });
            needSave = true;
            sendResponse({ success: true, isMirrored: state.isMirrored });
            break;

         case "TAKE_SNAPSHOT":
            takeSnapshot();
            sendResponse({ success: true });
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
               autoScrollShorts: state.isAutoScrollShortsEnabled,
               boostSpeed: state.boostSpeed,
               volume: state.volume,
               isMirrored: state.isMirrored,
               // Focus Response
               focusMode: state.isFocusModeEnabled,
               strictMode: state.isStrictModeEnabled,
               keywords: state.focusKeywords,
               activeCategories: state.activeCategories,
               customCategories: state.customCategories,

               currentTime: video ? video.currentTime : 0,
            });
            break;
      }
      if (needSave) {
         saveSettings();
         chrome.storage.local.set({
            isAutoSkipEnabled: state.isAutoSkipEnabled,
            isSpeedAdEnabled: state.isSpeedAdEnabled,
            isZenModeEnabled: state.isZenModeEnabled,
            isBoosterEnabled: state.isBoosterEnabled,
            isAutoScrollShortsEnabled: state.isAutoScrollShortsEnabled,
            boostSpeed: state.boostSpeed,
            boostKey: state.boostKey,
            volume: state.volume,
            isFocusModeEnabled: state.isFocusModeEnabled,
            isStrictModeEnabled: state.isStrictModeEnabled,
            focusKeywords: state.focusKeywords,
            activeCategories: state.activeCategories,
            customCategories: state.customCategories,
            isMirrored: state.isMirrored,
         });
      }
      return true;
   });
} // End of YouTube-only code

// ============================================================================
// GLOBAL SCREENSHOT HANDLERS (Works on ALL pages)
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
   // Verify screenshot utility only for screenshot actions
   if (request.action && request.action.includes("SCREENSHOT") && !window.ScreenshotUtil) {
      sendResponse({ success: false, error: "Screenshot utility not loaded" });
      return false;
   }

   switch (request.action) {
      case "TOGGLE_ZAPPER":
         toggleZapper(request.enabled);
         sendResponse({ success: true, active: state.isZapperActive });
         return true;

      case "CLEAR_ZAPS":
         const hostname = window.location.hostname;
         chrome.storage.local.remove([`zaps_${hostname}`], () => {
            // Remove the style tag if it exists
            const style = document.getElementById("yqs-zapper-persisted");
            if (style) style.remove();
            sendResponse({ success: true });
         });
         return true;

      case "CAPTURE_SCREENSHOT":
         (async () => {
            try {
               let dataUrl;
               if (request.mode === "visible") {
                  dataUrl = await window.ScreenshotUtil.captureVisible();
               } else if (request.mode === "full") {
                  dataUrl = await window.ScreenshotUtil.captureFullPage();
               }
               sendResponse({ success: true, dataUrl });
            } catch (error) {
               console.error("[Screenshot] Capture error:", error);
               sendResponse({ success: false, error: error.message });
            }
         })();
         return true; // Keep channel open for async

      case "CONVERT_SCREENSHOT":
         (async () => {
            try {
               const dataUrl = await window.ScreenshotUtil.convertFormat(request.dataUrl, request.format);
               sendResponse({ success: true, dataUrl });
            } catch (error) {
               console.error("[Screenshot] Convert error:", error);
               sendResponse({ success: false, error: error.message });
            }
         })();
         return true;

      case "COPY_SCREENSHOT":
         (async () => {
            try {
               const success = await window.ScreenshotUtil.copyToClipboard(request.dataUrl);
               sendResponse({ success });
            } catch (error) {
               console.error("[Screenshot] Copy error:", error);
               sendResponse({ success: false, error: error.message });
            }
         })();
         return true;

      case "PRINT_SCREENSHOT":
         try {
            window.ScreenshotUtil.printImage(request.dataUrl);
            sendResponse({ success: true });
         } catch (error) {
            console.error("[Screenshot] Print error:", error);
            sendResponse({ success: false, error: error.message });
         }
         break;

      default:
         // Not a screenshot action, ignore
         return false;
   }
});
