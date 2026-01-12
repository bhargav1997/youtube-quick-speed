// Safe Universal Ad Blocker
// Conservative approach - only blocks confirmed ads, never breaks functionality

/**
 * CRITICAL PROTECTION - Elements that must NEVER be hidden
 */
const PROTECTED_ELEMENTS = {
   // Tag-based protection
   tags: [
      "HEADER",
      "NAV",
      "MAIN",
      "ARTICLE",
      "ASIDE",
      "FOOTER",
      "FORM",
      "INPUT",
      "BUTTON",
      "SELECT",
      "TEXTAREA",
      "LABEL",
      "VIDEO",
      "AUDIO",
   ],

   // Role-based protection
   roles: ["navigation", "banner", "main", "search", "form", "button", "link", "menuitem", "tab", "tablist", "dialog", "alertdialog"],

   // Critical selectors that indicate important content
   selectors: [
      '[role="search"]',
      '[role="navigation"]',
      '[role="main"]',
      '[role="banner"]',
      '[type="search"]',
      '[aria-label*="search" i]',
      '[aria-label*="menu" i]',
      '[aria-label*="navigation" i]',
      "form",
      "nav",
      "header",
      "main",
      "article",
      ".search",
      ".nav",
      ".menu",
      ".header",
      ".content",
      ".main",
      ".article",
      "#search",
      "#searchform",
      "#navigation",
      "#nav",
      "#menu",
      "#header",
      "#main",
      "#content",
   ],

   // Keywords in text that indicate important content
   textKeywords: ["search", "navigation", "menu", "login", "sign in", "cart", "checkout"],
};

/**
 * CONFIRMED AD PATTERNS - Only block when we're absolutely sure it's an ad
 */
const CONFIRMED_AD_PATTERNS = {
   // Ad network iframes (most reliable indicator)
   adIframes: [
      "doubleclick.net",
      "googlesyndication.com",
      "googleadservices.com",
      "adservice.google",
      "adnxs.com", // AppNexus
      "advertising.com",
      "adsafeprotected.com",
      "moatads.com",
      "scorecardresearch.com",
      "outbrain.com",
      "taboola.com",
      "revcontent.com",
      "mgid.com",
      "criteo.com",
      "pubmatic.com",
      "rubiconproject.com",
      "openx.net",
      "indexww.com",
      "casalemedia.com",
      "amazon-adsystem.com",
      "serving-sys.com",
   ],

   // Ad network scripts
   adScripts: [
      "doubleclick.net",
      "googlesyndication.com",
      "googletagmanager.com/gtag",
      "google-analytics.com/analytics",
      "adservice.google",
      "pagead2.googlesyndication.com",
      "outbrain.com/outbrain.js",
      "taboola.com/libtrc",
      "revcontent.com/api",
   ],

   // Specific ad container classes (must be exact matches or very specific)
   adContainerClasses: [
      "adsbygoogle",
      "ad-container",
      "ad-slot",
      "ad-wrapper",
      "ad-unit",
      "ad-placement",
      "advertisement-banner",
      "google-ad",
      "sponsored-content",
      "promoted-content",
      "native-ad",
   ],

   // Specific ad IDs
   adIds: ["google_ads", "google-ads", "ad-banner", "ad-slot", "sponsored-ad"],
};

/**
 * Multi-layered safety check before hiding any element
 */
class SafeAdDetector {
   constructor() {
      this.processedElements = new WeakSet();
      this.whitelistedElements = new WeakSet();
   }

   /**
    * PRIMARY SAFETY CHECK - Is this element protected?
    */
   isProtectedElement(element) {
      if (!element || !element.tagName) return true;

      // Check if already whitelisted
      if (this.whitelistedElements.has(element)) return true;

      // 1. Protected by tag name
      if (PROTECTED_ELEMENTS.tags.includes(element.tagName)) {
         this.whitelistedElements.add(element);
         return true;
      }

      // 2. Protected by role
      const role = element.getAttribute("role");
      if (role && PROTECTED_ELEMENTS.roles.includes(role.toLowerCase())) {
         this.whitelistedElements.add(element);
         return true;
      }

      // 3. Protected by critical selectors
      for (const selector of PROTECTED_ELEMENTS.selectors) {
         try {
            if (element.matches(selector)) {
               this.whitelistedElements.add(element);
               return true;
            }
         } catch (e) {
            // Invalid selector, skip
         }
      }

      // 4. Check if element or parent is protected
      let parent = element.parentElement;
      let depth = 0;
      while (parent && depth < 5) {
         if (PROTECTED_ELEMENTS.tags.includes(parent.tagName)) {
            this.whitelistedElements.add(element);
            return true;
         }
         parent = parent.parentElement;
         depth++;
      }

      // 5. Contains important form elements
      if (element.querySelector("input, button, select, textarea, form")) {
         this.whitelistedElements.add(element);
         return true;
      }

      // 6. Has important ARIA labels
      const ariaLabel = element.getAttribute("aria-label")?.toLowerCase() || "";
      for (const keyword of PROTECTED_ELEMENTS.textKeywords) {
         if (ariaLabel.includes(keyword)) {
            this.whitelistedElements.add(element);
            return true;
         }
      }

      // 7. Check for data-testid (often used for important UI elements)
      const testId = element.getAttribute("data-testid");
      if (testId && !testId.includes("ad") && !testId.includes("sponsor")) {
         return true;
      }

      return false;
   }

   /**
    * CONSERVATIVE AD DETECTION - Only mark as ad if we have strong evidence
    */
   isConfirmedAd(element) {
      if (!element || this.processedElements.has(element)) {
         return false;
      }

      // SAFETY FIRST: If protected, it's NOT an ad
      if (this.isProtectedElement(element)) {
         return false;
      }

      let adScore = 0;
      const requiredScore = 2; // Need multiple indicators to confirm it's an ad

      // 1. Check for ad network iframes (STRONGEST indicator)
      if (element.tagName === "IFRAME") {
         const src = element.src?.toLowerCase() || "";
         for (const adNetwork of CONFIRMED_AD_PATTERNS.adIframes) {
            if (src.includes(adNetwork)) {
               return true; // Iframes from ad networks are definite ads
            }
         }
      }

      // 2. Check for ad network scripts
      if (element.tagName === "SCRIPT") {
         const src = element.src?.toLowerCase() || "";
         for (const adScript of CONFIRMED_AD_PATTERNS.adScripts) {
            if (src.includes(adScript)) {
               return true; // Ad scripts are definite ads
            }
         }
      }

      // 3. Check for specific ad container classes (exact matches only)
      const classList = Array.from(element.classList || []);
      for (const adClass of CONFIRMED_AD_PATTERNS.adContainerClasses) {
         if (classList.includes(adClass)) {
            adScore += 2; // Strong indicator
         }
      }

      // 4. Check for specific ad IDs
      const elementId = element.id?.toLowerCase() || "";
      for (const adId of CONFIRMED_AD_PATTERNS.adIds) {
         if (elementId === adId) {
            adScore += 2; // Strong indicator
         }
      }

      // 5. Check for Google AdSense specific patterns
      if (element.classList.contains("adsbygoogle") || (element.tagName === "INS" && element.classList.contains("adsbygoogle"))) {
         adScore += 3; // Very strong indicator
      }

      // 6. Check for sponsored content indicators (but be conservative)
      const ariaLabel = element.getAttribute("aria-label")?.toLowerCase() || "";
      if (ariaLabel === "sponsored" || ariaLabel === "advertisement") {
         adScore += 1;
      }

      // 7. Check for data-ad-* attributes (but only specific ones)
      if (element.hasAttribute("data-ad-slot") || element.hasAttribute("data-ad-unit") || element.hasAttribute("data-ad-client")) {
         adScore += 1;
      }

      // 8. Check parent container context
      const parent = element.parentElement;
      if (parent) {
         const parentClass = parent.className?.toLowerCase() || "";
         const parentId = parent.id?.toLowerCase() || "";

         if (parentClass.includes("ad-container") || parentClass.includes("ad-wrapper") || parentId.includes("ad-container")) {
            adScore += 1;
         }
      }

      // 9. Check for common ad dimensions (weak indicator, only add small score)
      const rect = element.getBoundingClientRect();
      const commonAdDimensions = [
         [728, 90],
         [970, 250],
         [300, 250],
         [300, 600],
         [160, 600],
         [320, 50],
         [320, 100],
      ];

      for (const [w, h] of commonAdDimensions) {
         if (Math.abs(rect.width - w) < 2 && Math.abs(rect.height - h) < 2) {
            adScore += 0.5; // Weak indicator alone
            break;
         }
      }

      // FINAL DECISION: Require strong evidence
      return adScore >= requiredScore;
   }

   /**
    * Safe element blocking - with multiple verification steps
    */
   safelyBlockElement(element) {
      if (!element || element.dataset.safeAdBlockerHidden) return false;

      // Triple-check protection
      if (this.isProtectedElement(element)) {
         return false;
      }

      // Verify it's actually an ad
      if (!this.isConfirmedAd(element)) {
         return false;
      }

      // Mark as processed
      this.processedElements.add(element);
      element.dataset.safeAdBlockerHidden = "true";

      // Different blocking strategies based on element type
      if (element.tagName === "SCRIPT") {
         element.type = "text/plain"; // Prevent execution
         element.remove();
      } else if (element.tagName === "IFRAME") {
         element.style.cssText = "display: none !important;";
         element.src = "about:blank";
      } else {
         // For other elements, just hide visually
         element.style.cssText = `
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      `;
      }

      return true;
   }
}

/**
 * Site-specific safe blocking rules
 */
const SITE_SPECIFIC_RULES = {
   "youtube.com": {
      adSelectors: [
         "ytd-ad-slot-renderer",
         "ytd-display-ad-renderer",
         "ytd-promoted-sparkles-web-renderer",
         ".video-ads",
         ".ytp-ad-module",
      ],
   },
   "reddit.com": {
      adSelectors: ['[data-promoted="true"]', "[data-adclicklocation]"],
   },
   "facebook.com": {
      adSelectors: ['[data-ad-preview="true"]', "[data-ad-id]"],
   },
};

/**
 * Initialize safe ad blocking
 */
export async function initSafeAdBlocking(options = {}) {
   const detector = new SafeAdDetector();
   let blockedCount = 0;

   console.log("[Safe Ad Blocker] Starting safe initialization...");

   // Block confirmed ads
   function blockConfirmedAds() {
      let blocked = 0;

      // 1. Block ad network iframes
      document.querySelectorAll("iframe[src]").forEach((iframe) => {
         if (detector.safelyBlockElement(iframe)) blocked++;
      });

      // 2. Block ad network scripts
      document.querySelectorAll("script[src]").forEach((script) => {
         if (detector.safelyBlockElement(script)) blocked++;
      });

      // 3. Block confirmed ad containers
      CONFIRMED_AD_PATTERNS.adContainerClasses.forEach((className) => {
         document.querySelectorAll(`.${className}`).forEach((el) => {
            if (detector.safelyBlockElement(el)) blocked++;
         });
      });

      // 4. Site-specific blocking
      const hostname = window.location.hostname.replace("www.", "");
      const siteRules = SITE_SPECIFIC_RULES[hostname];
      if (siteRules) {
         siteRules.adSelectors.forEach((selector) => {
            try {
               document.querySelectorAll(selector).forEach((el) => {
                  if (detector.safelyBlockElement(el)) blocked++;
               });
            } catch (e) {
               console.warn("[Safe Ad Blocker] Invalid selector:", selector);
            }
         });
      }

      return blocked;
   }

   // Initial blocking
   blockedCount = blockConfirmedAds();

   // Setup observer for dynamic content
   const observer = new MutationObserver((mutations) => {
      let newBlocked = 0;

      mutations.forEach((mutation) => {
         mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
               // Element node
               if (detector.safelyBlockElement(node)) {
                  newBlocked++;
               }

               // Check children
               if (node.querySelectorAll) {
                  node.querySelectorAll("iframe[src], script[src]").forEach((child) => {
                     if (detector.safelyBlockElement(child)) newBlocked++;
                  });
               }
            }
         });
      });

      if (newBlocked > 0) {
         blockedCount += newBlocked;
         console.log(`[Safe Ad Blocker] Blocked ${newBlocked} new ads (total: ${blockedCount})`);
      }
   });

   observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
   });

   console.log(`[Safe Ad Blocker] Initialized - blocked ${blockedCount} confirmed ads`);

   return {
      observer,
      detector,
      blockedCount,
      stop: () => {
         observer.disconnect();
         console.log("[Safe Ad Blocker] Stopped");
      },
   };
}

// DO NOT auto-initialize - this should only be called when user enables ad blocking
// Auto-running causes issues with legitimate content (Google Search, Udemy courses, etc.)

export { SafeAdDetector, PROTECTED_ELEMENTS, CONFIRMED_AD_PATTERNS, initSafeAdBlocking };
