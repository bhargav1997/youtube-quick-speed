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

// Site Detection
const detectCurrentSite = () => {
   const hostname = window.location.hostname;
   const hasVideo = !!document.querySelector("video");

   // Check if YouTube (special handling for YouTube-specific features)
   if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      return { type: "youtube", hasVideo: true, hostname };
   }

   // All other sites get universal ad blocking
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

      // Generic popup containers (more specific)
      '[id*="popup" i][id*="ad" i]', // Popup + ad IDs
      '[class*="popup" i][class*="ad" i]', // Popup + ad classes
      '[class*="overlay" i][class*="ad" i]', // Overlay + ad classes
      '[class*="modal" i][class*="ad" i]', // Modal + ad classes
      '[id*="modal" i][id*="ad" i]', // Modal + ad IDs
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

// Skip ad blocking on Google productivity apps (Gmail, Drive, Docs, etc.)
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
   currentSite.hostname.includes("photos.google.com");

if (currentSite.type !== "youtube") {
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
         this.lastURL = null; // Track URL changes
         this.init();
      }

      init() {
         // Monitor URL changes for Shorts navigation
         this.observeURLChanges();
         // Check if already on Shorts
         this.checkForVideo();
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
         // Remove old listeners
         if (this.videoEndListener && this.currentVideo) {
            this.currentVideo.removeEventListener("ended", this.videoEndListener);
            this.currentVideo.removeEventListener("timeupdate", this.timeUpdateListener);
         }

         // Reset trigger flag
         this.hasTriggered = false;

         // Listener for video end
         this.videoEndListener = () => this.onVideoEnd();
         video.addEventListener("ended", this.videoEndListener);

         // Listener for timeupdate (for looping videos that don't fire 'ended')
         this.timeUpdateListener = () => {
            // Check if URL changed (new Short)
            const currentURL = window.location.pathname;
            if (currentURL !== this.lastURL) {
               this.lastURL = currentURL;
               this.hasTriggered = false; // Reset flag on new Short
               this.adSkipTriggered = false; // Reset ad skip flag
               console.log("[Auto-Scroll] New Short detected, flag reset");
            }

            if (this.hasTriggered) return;

            // Check if current Short is an ad and auto-skip
            if (this.state.isAutoScrollShortsEnabled && this.isAd()) {
               if (!this.adSkipTriggered) {
                  this.adSkipTriggered = true;
                  console.log("[Auto-Scroll] 🚫 Ad detected, skipping in 1s...");
                  setTimeout(() => {
                     this.scrollToNextShort();
                  }, 1000); // Wait 1s before skipping ad
               }
               return;
            }

            const video = this.currentVideo;
            if (!video || !video.duration) return;

            // Check if within 0.5 seconds of end
            const timeRemaining = video.duration - video.currentTime;
            if (timeRemaining > 0 && timeRemaining < 0.5) {
               this.hasTriggered = true;
               this.onVideoEnd();
            }
         };
         video.addEventListener("timeupdate", this.timeUpdateListener);

         console.log("[Auto-Scroll] Listeners attached to video");
      }

      onVideoEnd() {
         if (!this.state.isAutoScrollShortsEnabled) {
            console.log("[Auto-Scroll] Feature disabled");
            return;
         }

         console.log("[Auto-Scroll] Video ended, scrolling to next...");

         // Small delay for UI to update
         setTimeout(() => {
            this.scrollToNextShort();
         }, 500);
      }

      isAd() {
         // Check for Shorts ad indicators
         const adSelectors = [
            "reels-ad-card-buttoned-view-model",
            "ad-badge-view-model",
            "yt-ad-metadata-shape",
            ".ytwReelsAdCardButtonedViewModelHost",
            "badge-shape.yt-badge-shape--ad",
         ];

         for (const selector of adSelectors) {
            if (document.querySelector(selector)) {
               return true;
            }
         }

         // Check for "Sponsored" text
         const sponsoredBadge = document.querySelector("badge-shape .yt-badge-shape__text");
         if (sponsoredBadge && sponsoredBadge.textContent.includes("Sponsored")) {
            return true;
         }

         return false;
      }

      scrollToNextShort() {
         // Try multiple methods in order of reliability

         // Method 1: Click YouTube's next button (most reliable)
         if (this.clickNextButton()) {
            console.log("[Auto-Scroll] ✓ Clicked next button");
            return;
         }

         // Method 2: Simulate swipe gesture
         if (this.simulateSwipe()) {
            console.log("[Auto-Scroll] ✓ Simulated swipe");
            return;
         }

         // Method 3: Scroll container
         if (this.scrollContainer()) {
            console.log("[Auto-Scroll] ✓ Scrolled container");
            return;
         }

         // Method 4: Arrow key fallback
         this.simulateArrowKey();
         console.log("[Auto-Scroll] ✓ Simulated arrow key");
      }

      clickNextButton() {
         const selectors = [
            'button[aria-label="Next video"]',
            'button[aria-label*="Next"]',
            "#navigation-button-down button",
            "button.ytp-next-button",
            ".navigation-button.next",
         ];

         for (const selector of selectors) {
            const button = document.querySelector(selector);
            if (button && !button.disabled) {
               button.click();
               return true;
            }
         }

         return false;
      }

      simulateSwipe() {
         const container = document.querySelector("ytd-reel-video-renderer, #shorts-container");

         if (!container) return false;

         try {
            // Create touch events for swipe down
            const touch = new Touch({
               identifier: Date.now(),
               target: container,
               clientX: window.innerWidth / 2,
               clientY: window.innerHeight / 2,
               radiusX: 2.5,
               radiusY: 2.5,
               rotationAngle: 0,
               force: 0.5,
            });

            const touchStart = new TouchEvent("touchstart", {
               touches: [touch],
               targetTouches: [touch],
               changedTouches: [touch],
               bubbles: true,
               cancelable: true,
            });

            const touchEnd = new TouchEvent("touchend", {
               touches: [],
               targetTouches: [],
               changedTouches: [touch],
               bubbles: true,
               cancelable: true,
            });

            container.dispatchEvent(touchStart);
            setTimeout(() => container.dispatchEvent(touchEnd), 50);

            return true;
         } catch (e) {
            return false;
         }
      }

      scrollContainer() {
         const selectors = ["ytd-reel-video-renderer", "#shorts-container", "ytd-shorts", ".reel-video-in-sequence"];

         for (const selector of selectors) {
            const container = document.querySelector(selector);
            if (container) {
               container.scrollBy({
                  top: window.innerHeight,
                  behavior: "smooth",
               });
               return true;
            }
         }

         return false;
      }

      simulateArrowKey() {
         document.dispatchEvent(
            new KeyboardEvent("keydown", {
               key: "ArrowDown",
               code: "ArrowDown",
               keyCode: 40,
               which: 40,
               bubbles: true,
               cancelable: true,
            }),
         );
      }

      destroy() {
         if (this.urlObserver) {
            this.urlObserver.disconnect();
         }
         if (this.videoEndListener && this.currentVideo) {
            this.currentVideo.removeEventListener("ended", this.videoEndListener);
            this.currentVideo.removeEventListener("timeupdate", this.timeUpdateListener);
         }
      }
   }

   // Initialize auto-scroll (will be created after state is defined)
   let autoScrollManager = null;

   // State
   let state = {
      targetSpeed: 1.0,
      isAutoSkipEnabled: false, // Default: OFF (to avoid YouTube anti-adblock detection)
      isSpeedAdEnabled: true,
      isZenModeEnabled: false,
      isBoosterEnabled: true,
      isAutoScrollShortsEnabled: false, // Auto-scroll to next Short when finished (default: OFF)
      volume: 1.0,
      loop: { active: false, start: null, end: null },

      // Boost Settings (Configurable)
      boostKey: "Shift",
      boostSpeed: 2.5,

      // Focus Filter State
      isFocusModeEnabled: false, // Default: OFF
      isStrictModeEnabled: false,

      focusKeywords: [], // Array of lowercase strings
      activeCategories: [], // Array of active category IDs (e.g. ['food', 'tech'])
      customCategories: [], // Array of { id, name, keywords[], icon }
      isMirrored: false,

      // Internal state
      originalSpeed: 1.0,
      originalMuted: false,
      isAdSpeeding: false,
      adSkipClicked: false,
      isKeyBoosting: false,
   };

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
         case "TOGGLE_AUTO_SCROLL_SHORTS":
            state.isAutoScrollShortsEnabled = request.enabled;
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

         // KEYWORD HANDLERS
         case "TOGGLE_FOCUS_MODE":
            state.isFocusModeEnabled = request.enabled;
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
               runFocusFilter();
               needSave = true;
            }
            sendResponse({ success: true, keywords: state.focusKeywords });
            break;
         case "REMOVE_KEYWORD":
            state.focusKeywords = state.focusKeywords.filter((k) => k !== request.word);
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
               needSave = true;
            }
            sendResponse({ success: true, customCategories: state.customCategories });
            break;

         case "TOGGLE_MIRROR":
            toggleMirror(request.enabled);
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
      if (needSave) saveSettings();
      return true;
   });
} // End of YouTube-only code

// ============================================================================
// GLOBAL SCREENSHOT HANDLERS (Works on ALL pages)
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
   // Check if ScreenshotUtil is available
   if (!window.ScreenshotUtil) {
      console.error("[Screenshot] ScreenshotUtil not loaded");
      sendResponse({ success: false, error: "Screenshot utility not available" });
      return false;
   }

   switch (request.action) {
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
