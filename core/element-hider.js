// Universal Element Hider
// Hides ad elements using CSS selectors across all websites

/**
 * Universal ad selectors that work across most websites
 */
export const UNIVERSAL_SELECTORS = [
   // Generic ad containers
   '[class*="ad-container"]',
   '[class*="ad-wrapper"]',
   '[class*="ad-banner"]',
   '[class*="advertisement"]',
   '[class*="advert"]',
   '[id*="ad-container"]',
   '[id*="ad-wrapper"]',
   '[id*="google_ads"]',
   '[id*="google-ads"]',
   '[id*="ad-slot"]',
   '[id*="adslot"]',

   // Common ad classes
   ".ad",
   ".ads",
   ".advert",
   ".advertisement",
   ".sponsored",
   ".sponsor",
   ".ad-banner",
   ".ad-box",
   ".ad-frame",
   ".ad-space",
   ".banner-ad",
   ".text-ad",
   ".native-ad",

   // Direct image ads (harder to block)
   'img[src*="/ads/"]',
   'img[src*="/ad/"]',
   'img[src*="/banner/"]',
   'img[src*="/advert/"]',
   'img[src*="_ad."]',
   'img[src*="-ad."]',
   'img[alt*="advertisement"]',
   'img[alt*="sponsored"]',
   'a[href*="/ads/"] img',
   'a[href*="/ad/"] img',

   // Common ad sizes (IAB standard)
   '[width="728"][height="90"]', // Leaderboard
   '[width="300"][height="250"]', // Medium Rectangle
   '[width="160"][height="600"]', // Wide Skyscraper
   '[width="300"][height="600"]', // Half Page
   '[width="970"][height="90"]', // Large Leaderboard
   '[width="320"][height="50"]', // Mobile Banner
   '[width="468"][height="60"]', // Banner
   '[width="234"][height="60"]', // Half Banner

   // Ad network iframes
   'iframe[src*="doubleclick"]',
   'iframe[src*="googlesyndication"]',
   'iframe[src*="advertising"]',
   'iframe[src*="adservice"]',
   'iframe[src*="/ads/"]',
   'iframe[src*="ad."]',
   'iframe[id*="google_ads"]',

   // Tracking pixels
   'img[width="1"][height="1"]',
   'img[src*="/pixel"]',
   'img[src*="tracking"]',

   // Data attributes
   "[data-ad]",
   "[data-ad-slot]",
   "[data-ad-unit]",
   "[data-google-query-id]",

   // Error tracking services
   'script[src*="sentry"]',
   'script[src*="bugsnag"]',
   'script[src*="rollbar"]',
   'script[src*="raygun"]',
];

/**
 * Site-specific ad selectors
 */
export const SITE_SPECIFIC_SELECTORS = {
   // News sites
   "cnn.com": [".ad-wrapper", ".ad-slot", "[data-ad-type]"],
   "nytimes.com": [".ad", '[data-testid="ad-container"]'],
   "theguardian.com": [".ad-slot", '[data-component="ad"]'],

   // Social media
   "facebook.com": ['[data-pagelet*="FeedUnit"]', '[data-testid="story-subtilte"] span:contains("Sponsored")'],
   "twitter.com": ['[data-testid="placementTracking"]', 'div[data-testid="tweet"]:has(span:contains("Promoted"))'],
   "reddit.com": [".promotedlink", "[data-promoted]"],

   // Shopping
   "amazon.com": [".s-sponsored-header", '[data-component-type="sp-sponsored-result"]'],
};

/**
 * Aggressive selectors (only used in aggressive mode)
 */
export const AGGRESSIVE_SELECTORS = [
   // Analytics and tracking
   'script[src*="analytics"]',
   'script[src*="tracking"]',
   'script[src*="gtag"]',
   'script[src*="fbevents"]',

   // Social widgets
   ".fb-like",
   ".twitter-share-button",
   ".pinterest-share",
];

/**
 * Hide elements matching universal selectors
 * @param {boolean} removeCompletely - If true, removes from DOM. If false, just hides.
 */
export const hideUniversalAds = (removeCompletely = true) => {
   let hiddenCount = 0;

   UNIVERSAL_SELECTORS.forEach((selector) => {
      try {
         const elements = document.querySelectorAll(selector);
         elements.forEach((el) => {
            if (!el.dataset.uabHidden) {
               hideElement(el, removeCompletely);
               el.dataset.uabHidden = "true";
               hiddenCount++;
            }
         });
      } catch (e) {
         // Invalid selector, skip
      }
   });

   return hiddenCount;
};

/**
 * Hide elements matching site-specific selectors
 * @param {boolean} removeCompletely - If true, removes from DOM. If false, just hides.
 */
export const hideSiteSpecificAds = (removeCompletely = true) => {
   const hostname = window.location.hostname;
   let hiddenCount = 0;

   // Find matching site
   for (const [site, selectors] of Object.entries(SITE_SPECIFIC_SELECTORS)) {
      if (hostname.includes(site)) {
         selectors.forEach((selector) => {
            try {
               const elements = document.querySelectorAll(selector);
               elements.forEach((el) => {
                  if (!el.dataset.uabHidden) {
                     hideElement(el, removeCompletely);
                     el.dataset.uabHidden = "true";
                     hiddenCount++;
                  }
               });
            } catch (e) {
               // Invalid selector, skip
            }
         });
         break;
      }
   }

   return hiddenCount;
};

/**
 * Hide aggressive elements (analytics, tracking, social widgets)
 * @param {boolean} removeCompletely - If true, removes from DOM. If false, just hides.
 */
export const hideAggressiveElements = (removeCompletely = true) => {
   let hiddenCount = 0;

   AGGRESSIVE_SELECTORS.forEach((selector) => {
      try {
         const elements = document.querySelectorAll(selector);
         elements.forEach((el) => {
            if (!el.dataset.uabHidden) {
               hideElement(el, removeCompletely);
               el.dataset.uabHidden = "true";
               hiddenCount++;
            }
         });
      } catch (e) {
         // Invalid selector, skip
      }
   });

   return hiddenCount;
};

/**
 * Hide a single element - now REMOVES it completely instead of just hiding
 * @param {HTMLElement} element
 * @param {boolean} removeCompletely - If true, removes from DOM. If false, just hides.
 */
const hideElement = (element, removeCompletely = true) => {
   if (removeCompletely) {
      // COMPLETELY REMOVE from DOM (better for performance and cleaner)
      element.remove();
   } else {
      // Just hide (fallback for elements that might break layout)
      element.style.setProperty("display", "none", "important");
      element.style.setProperty("visibility", "hidden", "important");
      element.style.setProperty("opacity", "0", "important");
      element.style.setProperty("height", "0", "important");
      element.style.setProperty("width", "0", "important");
      element.style.setProperty("position", "absolute", "important");
      element.style.setProperty("top", "-9999px", "important");
   }
};

/**
 * Check if current site is whitelisted
 * @returns {Promise<boolean>}
 */
const isWhitelisted = async () => {
   try {
      const hostname = window.location.hostname;
      const response = await chrome.runtime.sendMessage({
         action: "IS_WHITELISTED",
         url: window.location.href,
      });
      return response?.isWhitelisted || false;
   } catch (e) {
      return false;
   }
};

/**
 * Initialize element hiding with MutationObserver
 * @param {string} blockingLevel - 'conservative', 'balanced', 'aggressive'
 */
export const initElementHiding = async (blockingLevel = "balanced") => {
   // Check whitelist first
   const whitelisted = await isWhitelisted();
   if (whitelisted) {
      console.log("[Element Hider] Site is whitelisted, skipping ad blocking");
      return null;
   }

   // Initial hide (REMOVE completely)
   let totalHidden = hideUniversalAds(true);
   totalHidden += hideSiteSpecificAds(true);

   if (blockingLevel === "aggressive") {
      totalHidden += hideAggressiveElements(true);
   }

   // Report to background
   if (totalHidden > 0) {
      chrome.runtime
         .sendMessage({
            action: "INCREMENT_STATS",
            domain: window.location.hostname,
            type: "element",
         })
         .catch(() => {});
   }

   // Watch for new elements
   const observer = new MutationObserver((mutations) => {
      let newHidden = hideUniversalAds(true);
      newHidden += hideSiteSpecificAds(true);

      if (blockingLevel === "aggressive") {
         newHidden += hideAggressiveElements(true);
      }

      if (newHidden > 0) {
         chrome.runtime
            .sendMessage({
               action: "INCREMENT_STATS",
               domain: window.location.hostname,
               type: "element",
            })
            .catch(() => {});
      }
   });

   // Observe document changes
   observer.observe(document.body, {
      childList: true,
      subtree: true,
   });

   console.log(`[Element Hider] Initialized (${blockingLevel} mode), removed ${totalHidden} elements`);

   return observer;
};

/**
 * Stop element hiding
 * @param {MutationObserver} observer
 */
export const stopElementHiding = (observer) => {
   if (observer) {
      observer.disconnect();
   }
};
