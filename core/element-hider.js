// Enhanced Universal Element Hider
// Blocks all types of ads, banners, and tracking elements

/**
 * Comprehensive ad detection strategies
 */
export const AD_SELECTORS = {
   // 1. CLASS-BASED SELECTORS (Most Common)
   classSelectors: [
      // Generic ad patterns
      '[class*="ad"]',
      '[class*="ads"]',
      '[class*="advert"]',
      '[class*="advertisement"]',
      '[class*="sponsor"]',
      '[class*="sponsored"]',
      '[class*="banner"]',
      '[class*="promo"]',
      '[class*="promoted"]',
      '[class*="commercial"]',
      '[class*="marketing"]',
      '[class*="widget"]',
      '[class*="popup"]',
      '[class*="pop-up"]',
      '[class*="modal"]',
      '[class*="overlay"]',
      '[class*="interstitial"]',
      '[class*="float"]',
      '[class*="sticky"]',
      '[class*="fixed"]',
      '[class*="sidebar"]',
      '[class*="side-bar"]',
      '[class*="skyscraper"]',
      '[class*="leaderboard"]',
      '[class*="rectangle"]',
      '[class*="billboard"]',
      '[class*="teaser"]',
      '[class*="recommend"]',
      '[class*="suggest"]',

      // Specific ad networks
      '[class*="doubleclick"]',
      '[class*="google-ads"]',
      '[class*="adsense"]',
      '[class*="adchoices"]',
      '[class*="outbrain"]',
      '[class*="taboola"]',
      '[class*="revcontent"]',
      '[class*="contentad"]',
      '[class*="infolinks"]',
      '[class*="mgid"]',
      '[class*="zedo"]',
      '[class*="criteo"]',
      '[class*="openx"]',
      '[class*="pubmatic"]',
      '[class*="rubicon"]',
      '[class*="smartads"]',
      '[class*="connatix"]',
   ],

   // 2. ID-BASED SELECTORS
   idSelectors: [
      '[id*="ad"]',
      '[id*="ads"]',
      '[id*="banner"]',
      '[id*="sponsor"]',
      '[id*="promo"]',
      '[id*="popup"]',
      '[id*="modal"]',
      '[id*="overlay"]',
      '[id*="google_ads"]',
      '[id*="ad-wrapper"]',
      '[id*="ad-container"]',
      '[id*="ad-slot"]',
      '[id*="ad-frame"]',
      '[id*="ad-unit"]',
      '[id*="ad-placement"]',
   ],

   // 3. DATA ATTRIBUTE SELECTORS
   dataSelectors: [
      "[data-ad]",
      "[data-ad-slot]",
      "[data-ad-unit]",
      "[data-ad-client]",
      "[data-ad-id]",
      "[data-ad-name]",
      "[data-ad-type]",
      "[data-ad-target]",
      "[data-ad-position]",
      "[data-ad-status]",
      "[data-ad-rendered]",
      "[data-ad-fallback]",
      "[data-ad-breakpoint]",
      "[data-sponsor]",
      "[data-sponsored]",
      "[data-promo]",
      "[data-banner]",
      "[data-popup]",
      "[data-overlay]",
      "[data-teaser]",
      "[data-recommendation]",
      "[data-widget]",
      "[data-taboola]",
      "[data-outbrain]",
      "[data-revcontent]",
      "[data-native-ad]",
   ],

   // 4. ELEMENT SELECTORS
   elementSelectors: [
      'iframe[src*="ads"]',
      'iframe[src*="ad."]',
      'iframe[src*="doubleclick"]',
      'iframe[src*="googlesyndication"]',
      'iframe[src*="googleads"]',
      'iframe[src*="adservice"]',
      'iframe[src*="advertising"]',
      'iframe[src*="adnxs"]',
      'iframe[src*="pubmatic"]',
      'iframe[src*="rubicon"]',
      'iframe[src*="openx"]',
      'iframe[src*="criteo"]',
      'iframe[src*="outbrain"]',
      'iframe[src*="taboola"]',
      'iframe[src*="revcontent"]',
      'iframe[src*="mgid"]',

      'img[src*="/ads/"]',
      'img[src*="/ad/"]',
      'img[src*="ad."]',
      'img[src*="_ad."]',
      'img[src*="-ad."]',
      'img[src*="banner"]',
      'img[src*="sponsor"]',
      'img[src*="promo"]',
      'img[alt*="ad"]',
      'img[alt*="sponsor"]',
      'img[alt*="banner"]',
      'img[alt*="promo"]',
      'img[title*="ad"]',
      'img[title*="sponsor"]',

      'script[src*="ads"]',
      'script[src*="ad."]',
      'script[src*="doubleclick"]',
      'script[src*="googlesyndication"]',
      'script[src*="google-analytics"]',
      'script[src*="analytics"]',
      'script[src*="tracking"]',
      'script[src*="facebook.com/tr"]',
      'script[src*="fbevents"]',
      'script[src*="gtag"]',
      'script[src*="googletagmanager"]',
   ],

   // 5. POSITION & SIZE BASED SELECTORS
   positionalSelectors: [
      'div[style*="position: fixed"]',
      'div[style*="position:absolute"]',
      'div[style*="z-index: 999"]',
      'div[style*="z-index:1000"]',
      'div[style*="bottom:0"]',
      'div[style*="top:0"]',
      'div[style*="width: 100%"]',
      'div[style*="height: 90px"]',
      'div[style*="height: 250px"]',
      'div[style*="height: 600px"]',
      'div[style*="background-color"][style*="width: 100%"]',
   ],

   // 6. LINK SELECTORS
   linkSelectors: [
      'a[href*="doubleclick"]',
      'a[href*="googleads"]',
      'a[href*="googlesyndication"]',
      'a[href*="/ads/"]',
      'a[href*="/ad/"]',
      'a[href*="utm_source"]',
      'a[href*="utm_campaign"]',
      'a[href*="utm_medium"]',
      'a[href*="ref="]',
      'a[href*="affiliate"]',
      'a[href*="partner"]',
      'a[href*="click"]',
      'a[href*="redirect"]',
   ],
};

/**
 * Social media specific selectors
 */
export const SOCIAL_MEDIA_SELECTORS = {
   "facebook.com": [
      '[aria-label*="Sponsored"]',
      '[data-pagelet*="FeedUnit"]',
      "[data-ad-id]",
      "[data-ad-preview]",
      'div[role="article"][aria-label*="Sponsored"]',
      'div[data-testid*="story"] span:contains("Sponsored")',
      'div[data-testid*="fbfeed"] div:has(> span:contains("Sponsored"))',
   ],

   "twitter.com": [
      '[data-testid*="placementTracking"]',
      '[data-testid*="cellInnerDiv"]:has([data-testid*="socialContext"])',
      'div[data-testid="tweet"]:has(span:contains("Promoted"))',
      'article:has([data-testid="socialContext"])',
      'div[role="group"][aria-label*="Timeline"] [data-testid="tweet"]:has([data-testid="socialContext"])',
   ],

   "instagram.com": [
      'article:has([aria-label*="Sponsored"])',
      'div[role="dialog"] [aria-label*="Sponsored"]',
      'a[href*="/p/"]:has([aria-label*="Sponsored"])',
      'div[data-testid*="feed"] [aria-label*="Sponsored"]',
   ],

   "youtube.com": [
      "ytd-ad-slot-renderer",
      "ytd-promoted-sparkles-web-renderer",
      "ytd-display-ad-renderer",
      "ytd-action-companion-ad-renderer",
      "ytd-in-feed-ad-layout-renderer",
      "ytd-banner-promo-renderer",
      "ytd-compact-promoted-video-renderer",
      "ytd-promoted-sparkles-text-search-renderer",
      "#player-ads",
      ".video-ads",
      ".ytp-ad-module",
      ".ytp-ad-image-overlay",
      ".ytp-ad-text-overlay",
      'div[class*="ad"]',
      'div[id*="ad"]',
      "div[data-ad]",
   ],

   "reddit.com": [
      '[data-promoted="true"]',
      "[data-adclicklocation]",
      ".promoted",
      ".promotedlink",
      ".ad-container",
      ".ads",
      'div[data-test-id*="ad"]',
      'div[data-testid*="ad"]',
      'a[href*="/promoted/"]',
      'span:contains("promoted")',
      'span:contains("Promoted")',
      'span:contains("sponsored")',
   ],

   "linkedin.com": [
      '[data-urn*="sponsored"]',
      '[data-id*="urn:li:sponsored"]',
      ".feed-shared-update--is-sponsored",
      ".ads",
      ".ad-banner-container",
      'li[data-urn*="sponsoredJob"]',
      'div[data-test*="ad"]',
      'div[data-test-id*="ad"]',
   ],

   "tiktok.com": [
      '[data-e2e*="ad"]',
      '[data-e2e*="ads"]',
      '[data-e2e*="banner"]',
      '[data-e2e*="sponsor"]',
      'div[class*="ad"]',
      'div[class*="ads"]',
      'div[class*="Ad"]',
   ],
};

/**
 * News & media site selectors
 */
export const NEWS_SITE_SELECTORS = {
   "cnn.com": [
      ".ad-slot",
      ".ad-container",
      ".ad-banner",
      "[data-ad]",
      "[data-ad-slot]",
      "[data-ad-unit]",
      ".cnn-ad",
      ".cnn_ad",
      ".advertisement",
      ".advert",
      ".sponsored",
      ".partner",
   ],

   "nytimes.com": [
      '[data-testid*="ad"]',
      '[data-testid*="Ad"]',
      ".ad",
      ".advertisement",
      ".ad-container",
      ".ad-wrapper",
      ".ad-slot",
      ".paid-post",
      ".sponsor",
      ".partner-content",
      ".partner-logo",
   ],

   "theguardian.com": [
      '[data-component*="ad"]',
      '[data-component*="Ad"]',
      ".ad-slot",
      ".ad-container",
      ".advertisement",
      ".advert",
      ".commercial",
      ".commercial-component",
      ".paid-for",
      ".paid-content",
   ],

   "bbc.com": [
      ".ad",
      ".advert",
      ".advertisement",
      ".ad-slot",
      ".ad-container",
      ".bbccom_advert",
      ".bbccom-advert",
      ".promo",
      ".promotional",
      ".partner",
   ],

   "wsj.com": [
      ".ad",
      ".advertisement",
      ".ad-container",
      ".ad-slot",
      ".ad-wrapper",
      ".wsj-ad",
      ".wsj_ad",
      ".partner-content",
      ".sponsored",
      ".promo",
   ],
};

/**
 * Shopping site selectors
 */
export const SHOPPING_SITE_SELECTORS = {
   "amazon.com": [
      '[data-component-type*="sponsored"]',
      '[data-component-type*="s-sponsored"]',
      ".s-sponsored",
      ".sponsored",
      ".ad",
      ".advertisement",
      "[data-ad]",
      "[data-ad-slot]",
      "[data-ad-unit]",
      ".a-carousel-col[data-ad]",
      ".a-section[data-ad]",
      '.s-result-item[data-component-type*="sponsored"]',
   ],

   "ebay.com": [
      ".ad",
      ".advertisement",
      ".ad-container",
      ".ad-slot",
      "[data-ad]",
      "[data-ad-slot]",
      "[data-ad-unit]",
      ".s-item[data-ad]",
      ".s-item__ad",
      ".s-item__sponsored",
      ".ad-thumb",
      ".ad-tile",
   ],

   "aliexpress.com": [
      ".ad",
      ".advertisement",
      ".ad-container",
      ".ad-slot",
      "[data-ad]",
      "[data-ad-slot]",
      "[data-ad-unit]",
      ".ad-item",
      ".ad-product",
      ".ad-banner",
      ".ad-list",
   ],
};

/**
 * Advanced ad detection using multiple strategies
 */
export class AdvancedAdDetector {
   constructor() {
      this.processedElements = new Set();
      this.adKeywords = [
         "advertisement",
         "sponsored",
         "promoted",
         "commercial",
         "marketing",
         "banner",
         "popup",
         "modal",
         "overlay",
         "interstitial",
         "adchoices",
         "adchoice",
         "adsbygoogle",
         "doubleclick",
         "adsense",
         "outbrain",
         "taboola",
         "revcontent",
         "mgid",
         "criteo",
         "pubmatic",
         "rubicon",
         "openx",
         "smartads",
         "connatix",
         "infolinks",
         "zedo",
         "chitika",
         "sharethrough",
         "triplelift",
         "teads",
         "districtm",
         "sonobi",
         "indexexchange",
         "appnexus",
         "a9.com",
         "amazon-adsystem",
      ];
   }

   /**
    * Check if element is an ad using multiple detection methods
    */
   isAdElement(element) {
      if (!element || this.processedElements.has(element)) {
         return false;
      }

      // Method 1: Check for ad keywords in class/id
      const elementString = (element.className + " " + element.id).toLowerCase();
      for (const keyword of this.adKeywords) {
         if (elementString.includes(keyword)) {
            return true;
         }
      }

      // Method 2: Check common ad dimensions
      const rect = element.getBoundingClientRect();
      const commonAdSizes = [
         [728, 90], // Leaderboard
         [970, 250], // Billboard
         [300, 250], // Medium Rectangle
         [300, 600], // Half Page
         [160, 600], // Wide Skyscraper
         [120, 600], // Skyscraper
         [320, 50], // Mobile Leaderboard
         [300, 50], // Mobile Banner
         [320, 100], // Large Mobile Banner
      ];

      for (const [width, height] of commonAdSizes) {
         if (Math.abs(rect.width - width) < 5 && Math.abs(rect.height - height) < 5) {
            return true;
         }
      }

      // Method 3: Check for ad-like content
      const text = element.textContent.toLowerCase();
      const adPhrases = [
         "advertisement",
         "sponsored",
         "promoted",
         "partner",
         "affiliate",
         "click here",
         "learn more",
         "shop now",
         "buy now",
         "limited time",
         "special offer",
         "discount",
         "sale",
         "deal",
         "coupon",
         "offer",
      ];

      for (const phrase of adPhrases) {
         if (text.includes(phrase)) {
            return true;
         }
      }

      // Method 4: Check if element contains common ad network scripts
      const scripts = element.querySelectorAll("script[src]");
      for (const script of scripts) {
         const src = script.src.toLowerCase();
         if (src.includes("ads") || src.includes("ad.") || src.includes("doubleclick")) {
            return true;
         }
      }

      // Method 5: Check for iframes with ad sources
      const iframes = element.querySelectorAll("iframe");
      for (const iframe of iframes) {
         const src = iframe.src?.toLowerCase() || "";
         if (src.includes("ads") || src.includes("ad.") || src.includes("doubleclick")) {
            return true;
         }
      }

      return false;
   }

   /**
    * Block elements by heuristic analysis
    */
   blockByHeuristics() {
      let blockedCount = 0;

      // Block elements with common ad-like patterns
      const allElements = document.querySelectorAll("div, span, iframe, img, script, ins");

      for (const element of allElements) {
         if (this.processedElements.has(element)) continue;

         if (this.isAdElement(element)) {
            this.blockElement(element);
            this.processedElements.add(element);
            blockedCount++;
         }
      }

      return blockedCount;
   }

   /**
    * Block an element and its children
    */
   blockElement(element) {
      if (!element || element.dataset.uabBlocked) return;

      // Mark as blocked
      element.dataset.uabBlocked = "true";

      // For iframes, replace with placeholder
      if (element.tagName === "IFRAME") {
         element.style.cssText = "display: none !important; visibility: hidden !important;";
         element.src = "about:blank";
         return;
      }

      // For scripts, remove entirely
      if (element.tagName === "SCRIPT") {
         element.remove();
         return;
      }

      // For other elements, hide completely
      element.style.cssText = `
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      height: 0 !important;
      width: 0 !important;
      position: absolute !important;
      top: -9999px !important;
      left: -9999px !important;
      overflow: hidden !important;
      pointer-events: none !important;
      z-index: -9999 !important;
    `;

      // Remove all children
      while (element.firstChild) {
         element.firstChild.remove();
      }
   }
}

/**
 * Enhanced element hiding with multiple strategies
 */
export const initAdvancedElementHiding = async (blockingLevel = "aggressive") => {
   // Check whitelist
   const whitelisted = await isWhitelisted();
   if (whitelisted) {
      console.log("[Advanced Ad Blocker] Site is whitelisted");
      return null;
   }

   const detector = new AdvancedAdDetector();
   let totalBlocked = 0;

   // Strategy 1: Block by selectors
   totalBlocked += blockBySelectors(blockingLevel);

   // Strategy 2: Block by heuristics (if aggressive mode)
   if (blockingLevel === "aggressive") {
      totalBlocked += detector.blockByHeuristics();
   }

   // Strategy 3: Block social media ads
   totalBlocked += blockSocialMediaAds();

   // Strategy 4: Block popups and overlays
   totalBlocked += blockPopupsAndOverlays();

   // Report to background
   if (totalBlocked > 0) {
      reportBlocked(totalBlocked);
   }

   // Set up MutationObserver with debounce
   const observer = setupMutationObserver(detector, blockingLevel);

   console.log(`[Advanced Ad Blocker] Initialized, blocked ${totalBlocked} elements`);
   return observer;
};

/**
 * Block elements using all selector categories
 */
function blockBySelectors(blockingLevel) {
   let blocked = 0;
   const allSelectors = getAllSelectors(blockingLevel);

   allSelectors.forEach((selector) => {
      try {
         document.querySelectorAll(selector).forEach((element) => {
            if (!element.dataset.uabBlocked) {
               element.remove();
               element.dataset.uabBlocked = "true";
               blocked++;
            }
         });
      } catch (e) {
         // Skip invalid selectors
      }
   });

   return blocked;
}

/**
 * Get all selectors for current site and blocking level
 */
function getAllSelectors(blockingLevel) {
   const hostname = window.location.hostname;
   const selectors = [...AD_SELECTORS.classSelectors];

   // Add site-specific selectors
   const siteSelectors = {
      ...SOCIAL_MEDIA_SELECTORS,
      ...NEWS_SITE_SELECTORS,
      ...SHOPPING_SITE_SELECTORS,
   };

   for (const [site, siteSelectorList] of Object.entries(siteSelectors)) {
      if (hostname.includes(site)) {
         selectors.push(...siteSelectorList);
         break;
      }
   }

   // Add aggressive selectors if needed
   if (blockingLevel === "aggressive") {
      selectors.push(...AD_SELECTORS.positionalSelectors);
      selectors.push(...AD_SELECTORS.linkSelectors);
   }

   return [...new Set(selectors)]; // Remove duplicates
}

/**
 * Block social media ads
 */
function blockSocialMediaAds() {
   let blocked = 0;
   const hostname = window.location.hostname;

   const socialSelectors = SOCIAL_MEDIA_SELECTORS[hostname.replace("www.", "")];
   if (!socialSelectors) return 0;

   socialSelectors.forEach((selector) => {
      try {
         if (selector.includes(":contains(")) {
            // Handle text content selectors
            const elements = document.querySelectorAll(selector.split(":contains")[0]);
            elements.forEach((el) => {
               const text = el.textContent.toLowerCase();
               const match = selector.match(/:contains\("([^"]+)"\)/);
               if (match && text.includes(match[1].toLowerCase())) {
                  if (!el.dataset.uabBlocked) {
                     el.remove();
                     el.dataset.uabBlocked = "true";
                     blocked++;
                  }
               }
            });
         } else {
            // Regular selector
            document.querySelectorAll(selector).forEach((el) => {
               if (!el.dataset.uabBlocked) {
                  el.remove();
                  el.dataset.uabBlocked = "true";
                  blocked++;
               }
            });
         }
      } catch (e) {
         // Skip invalid selectors
      }
   });

   return blocked;
}

/**
 * Block popups and overlays
 */
function blockPopupsAndOverlays() {
   let blocked = 0;

   const popupSelectors = [
      ".popup",
      ".modal",
      ".overlay",
      ".lightbox",
      '[role="dialog"]',
      '[aria-modal="true"]',
      'div[style*="position: fixed"]',
      'div[style*="z-index: 999"]',
      'div[style*="background: rgba"]',
      'div[style*="background-color: rgba"]',
   ];

   popupSelectors.forEach((selector) => {
      try {
         document.querySelectorAll(selector).forEach((el) => {
            if (!el.dataset.uabBlocked) {
               const rect = el.getBoundingClientRect();
               const isFullscreen = rect.width > window.innerWidth * 0.8 && rect.height > window.innerHeight * 0.8;

               if (isFullscreen || el.style.zIndex > "900") {
                  el.remove();
                  el.dataset.uabBlocked = "true";
                  blocked++;
               }
            }
         });
      } catch (e) {
         // Skip invalid selectors
      }
   });

   return blocked;
}

/**
 * Set up MutationObserver with debouncing
 */
function setupMutationObserver(detector, blockingLevel) {
   let timeout;

   const observer = new MutationObserver((mutations) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
         let blocked = 0;

         // Process mutations
         mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
               if (node.nodeType === 1) {
                  // Element node
                  blocked += processNewElement(node, detector, blockingLevel);
               }
            });
         });

         // Additional scan for new ads
         blocked += blockBySelectors(blockingLevel);

         if (blocked > 0) {
            reportBlocked(blocked);
         }
      }, 100); // 100ms debounce
   });

   observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "id", "style", "src"],
   });

   return observer;
}

/**
 * Process new element for ads
 */
function processNewElement(element, detector, blockingLevel) {
   let blocked = 0;

   // Check if element itself is an ad
   if (detector.isAdElement(element) && !element.dataset.uabBlocked) {
      detector.blockElement(element);
      blocked++;
   }

   // Check children
   const children = element.querySelectorAll("*");
   children.forEach((child) => {
      if (!child.dataset.uabBlocked && detector.isAdElement(child)) {
         detector.blockElement(child);
         blocked++;
      }
   });

   return blocked;
}

/**
 * Report blocked elements to background
 */
function reportBlocked(count) {
   chrome.runtime
      .sendMessage({
         action: "INCREMENT_STATS",
         domain: window.location.hostname,
         type: "element",
         count: count,
      })
      .catch(() => {});
}

/**
 * Additional: Block ads by modifying CSS
 */
export const injectBlockingCSS = () => {
   const css = `
    /* Block common ad patterns */
    [class*="ad"]:not([data-uab-whitelisted]),
    [id*="ad"]:not([data-uab-whitelisted]),
    [data-ad]:not([data-uab-whitelisted]),
    [data-ad-slot]:not([data-uab-whitelisted]),
    [data-ad-unit]:not([data-uab-whitelisted]),
    [aria-label*="Sponsored"]:not([data-uab-whitelisted]),
    [data-testid*="ad"]:not([data-uab-whitelisted]) {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      height: 0 !important;
      width: 0 !important;
      position: absolute !important;
      top: -9999px !important;
      left: -9999px !important;
      overflow: hidden !important;
      pointer-events: none !important;
    }
    
    /* Block common ad sizes */
    div[style*="width: 300px"][style*="height: 250px"]:not([data-uab-whitelisted]),
    div[style*="width: 728px"][style*="height: 90px"]:not([data-uab-whitelisted]),
    div[style*="width: 970px"][style*="height: 250px"]:not([data-uab-whitelisted]) {
      display: none !important;
    }
    
    /* Block popups and overlays */
    .popup:not([data-uab-whitelisted]),
    .modal:not([data-uab-whitelisted]),
    .overlay:not([data-uab-whitelisted]),
    [role="dialog"]:not([data-uab-whitelisted]),
    [aria-modal="true"]:not([data-uab-whitelisted]) {
      display: none !important;
    }
  `;

   const style = document.createElement("style");
   style.textContent = css;
   style.dataset.uabBlocking = "true";
   document.head.appendChild(style);
};

/**
 * Stop element hiding
 */
export const stopElementHiding = (observer) => {
   if (observer) {
      observer.disconnect();
   }

   // Remove injected CSS
   document.querySelectorAll("style[data-uab-blocking]").forEach((style) => {
      style.remove();
   });

   // Remove markers from elements
   document.querySelectorAll("[data-uab-blocked]").forEach((el) => {
      delete el.dataset.uabBlocked;
   });
};
