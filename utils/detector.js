// Site Detection Utility
// Detects the current website type and capabilities

/**
 * Detects the type of website and its capabilities
 * @returns {Object} Site information
 */
export const detectSite = () => {
   const hostname = window.location.hostname;
   const hasVideo = !!document.querySelector("video");

   return {
      type: getSiteType(hostname),
      hostname,
      hasVideo,
      isVideoSite: isVideoSite(hostname),
      isNewsSite: isNewsSite(hostname),
      isSocialMedia: isSocialMedia(hostname),
      isShoppingSite: isShoppingSite(hostname),
   };
};

/**
 * Determines the specific site type
 * @param {string} hostname
 * @returns {string} Site type identifier
 */
const getSiteType = (hostname) => {
   // Video platforms
   if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return "youtube";
   if (hostname.includes("twitch.tv")) return "twitch";
   if (hostname.includes("vimeo.com")) return "vimeo";
   if (hostname.includes("dailymotion.com")) return "dailymotion";
   if (hostname.includes("netflix.com")) return "netflix";
   if (hostname.includes("hulu.com")) return "hulu";
   if (hostname.includes("primevideo.com")) return "primevideo";

   // News sites
   if (isNewsSite(hostname)) return "news";

   // Social media
   if (isSocialMedia(hostname)) return "social";

   // Shopping
   if (isShoppingSite(hostname)) return "shopping";

   return "generic";
};

/**
 * Check if hostname is a video platform
 * @param {string} hostname
 * @returns {boolean}
 */
const isVideoSite = (hostname) => {
   const videoSites = [
      "youtube.com",
      "youtu.be",
      "twitch.tv",
      "vimeo.com",
      "dailymotion.com",
      "netflix.com",
      "hulu.com",
      "primevideo.com",
      "disneyplus.com",
      "hbomax.com",
      "peacocktv.com",
      "paramountplus.com",
   ];

   return videoSites.some((site) => hostname.includes(site));
};

/**
 * Check if hostname is a news site
 * @param {string} hostname
 * @returns {boolean}
 */
const isNewsSite = (hostname) => {
   const newsSites = [
      "cnn.com",
      "bbc.com",
      "nytimes.com",
      "theguardian.com",
      "washingtonpost.com",
      "wsj.com",
      "reuters.com",
      "apnews.com",
      "nbcnews.com",
      "abcnews.go.com",
      "cbsnews.com",
      "foxnews.com",
      "usatoday.com",
      "latimes.com",
      "forbes.com",
      "bloomberg.com",
      "techcrunch.com",
      "theverge.com",
      "wired.com",
      "arstechnica.com",
   ];

   return newsSites.some((site) => hostname.includes(site));
};

/**
 * Check if hostname is a social media platform
 * @param {string} hostname
 * @returns {boolean}
 */
const isSocialMedia = (hostname) => {
   const socialSites = [
      "facebook.com",
      "twitter.com",
      "x.com",
      "instagram.com",
      "linkedin.com",
      "reddit.com",
      "pinterest.com",
      "tiktok.com",
      "snapchat.com",
      "tumblr.com",
   ];

   return socialSites.some((site) => hostname.includes(site));
};

/**
 * Check if hostname is a shopping site
 * @param {string} hostname
 * @returns {boolean}
 */
const isShoppingSite = (hostname) => {
   const shoppingSites = [
      "amazon.com",
      "ebay.com",
      "walmart.com",
      "target.com",
      "bestbuy.com",
      "etsy.com",
      "aliexpress.com",
      "alibaba.com",
      "shopify.com",
   ];

   return shoppingSites.some((site) => hostname.includes(site));
};

/**
 * Get site-specific configuration
 * @param {string} siteType
 * @returns {Object} Configuration object
 */
export const getSiteConfig = (siteType) => {
   const configs = {
      youtube: {
         enableSpeedControl: true,
         enableVolumeBoost: true,
         enableAdSkip: true,
         enableZenMode: true,
         enableFocusFilter: true,
         enableSnapshot: true,
         enableLoop: true,
      },
      twitch: {
         enableSpeedControl: true,
         enableVolumeBoost: true,
         enableAdSkip: false,
         enableZenMode: false,
         enableFocusFilter: false,
         enableSnapshot: true,
         enableLoop: false,
      },
      vimeo: {
         enableSpeedControl: true,
         enableVolumeBoost: true,
         enableAdSkip: false,
         enableZenMode: false,
         enableFocusFilter: false,
         enableSnapshot: true,
         enableLoop: true,
      },
      news: {
         enableSpeedControl: false,
         enableVolumeBoost: false,
         enableAdSkip: false,
         enableZenMode: false,
         enableFocusFilter: false,
         enableSnapshot: false,
         enableLoop: false,
      },
      social: {
         enableSpeedControl: false,
         enableVolumeBoost: false,
         enableAdSkip: false,
         enableZenMode: false,
         enableFocusFilter: false,
         enableSnapshot: false,
         enableLoop: false,
      },
      generic: {
         enableSpeedControl: false,
         enableVolumeBoost: false,
         enableAdSkip: false,
         enableZenMode: false,
         enableFocusFilter: false,
         enableSnapshot: false,
         enableLoop: false,
      },
   };

   return configs[siteType] || configs.generic;
};

/**
 * Check if site should be excluded from ad blocking
 * @param {string} hostname
 * @returns {boolean}
 */
export const shouldExcludeFromBlocking = (hostname) => {
   const excludedSites = ["chrome.google.com", "chromewebstore.google.com", "chrome://extensions", "localhost", "127.0.0.1"];

   return excludedSites.some((site) => hostname.includes(site));
};
