// Background Service Worker for Universal Ad Blocker
// Handles network-level blocking, statistics, and cross-tab communication

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEYS = {
   STATS: "universal_ad_blocker_stats",
   WHITELIST: "universal_ad_blocker_whitelist",
   SETTINGS: "universal_ad_blocker_settings",
   ENABLED: "universal_ad_blocker_enabled",
};

const DEFAULT_SETTINGS = {
   blockingLevel: "balanced", // 'conservative', 'balanced', 'aggressive'
   blockAnalytics: false,
   blockSocialTrackers: true,
   enabled: true,
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let stats = {
   totalBlocked: 0,
   sessionBlocked: 0,
   byDomain: {},
   byType: {},
   lastReset: Date.now(),
};

let whitelist = new Set();
let settings = { ...DEFAULT_SETTINGS };
let isEnabled = true;

// ============================================================================
// INITIALIZATION
// ============================================================================

const initialize = async () => {
   console.log("[Universal Ad Blocker] Background service worker initialized");

   // Load saved data
   await loadSettings();
   await loadStats();
   await loadWhitelist();

   // Set up listeners
   setupMessageListeners();
   setupRequestListeners();

   // Update badge
   updateBadge();
};

// ============================================================================
// STORAGE OPERATIONS
// ============================================================================

const loadSettings = async () => {
   try {
      const result = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS, STORAGE_KEYS.ENABLED]);
      if (result[STORAGE_KEYS.SETTINGS]) {
         settings = { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] };
      }
      if (result[STORAGE_KEYS.ENABLED] !== undefined) {
         isEnabled = result[STORAGE_KEYS.ENABLED];
      }
   } catch (e) {
      // Silently use defaults if storage fails (common on first load)
      // "No SW" error is expected when service worker is initializing
      if (e.message !== "No SW") {
         console.warn("[Universal Ad Blocker] Using default settings:", e.message);
      }
      settings = { ...DEFAULT_SETTINGS };
      isEnabled = true;
   }
};

const saveSettings = async () => {
   try {
      await chrome.storage.local.set({
         [STORAGE_KEYS.SETTINGS]: settings,
         [STORAGE_KEYS.ENABLED]: isEnabled,
      });
   } catch (e) {
      // Suppress "No SW" errors - they're expected during initialization
      if (e.message !== "No SW") {
         console.error("[Universal Ad Blocker] Failed to save settings:", e);
      }
   }
};

const loadStats = async () => {
   try {
      const result = await chrome.storage.local.get([STORAGE_KEYS.STATS]);
      if (result[STORAGE_KEYS.STATS]) {
         stats = { ...stats, ...result[STORAGE_KEYS.STATS] };
      }
   } catch (e) {
      if (e.message !== "No SW") {
         console.warn("[Universal Ad Blocker] Using default stats:", e.message);
      }
   }
};

const saveStats = async () => {
   try {
      await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: stats });
   } catch (e) {
      if (e.message !== "No SW") {
         console.error("[Universal Ad Blocker] Failed to save stats:", e);
      }
   }
};

const loadWhitelist = async () => {
   try {
      const result = await chrome.storage.local.get([STORAGE_KEYS.WHITELIST]);
      if (result[STORAGE_KEYS.WHITELIST]) {
         whitelist = new Set(result[STORAGE_KEYS.WHITELIST]);
      }
   } catch (e) {
      if (e.message !== "No SW") {
         console.warn("[Universal Ad Blocker] Using empty whitelist:", e.message);
      }
   }
};

const saveWhitelist = async () => {
   try {
      await chrome.storage.local.set({ [STORAGE_KEYS.WHITELIST]: Array.from(whitelist) });
   } catch (e) {
      if (e.message !== "No SW") {
         console.error("[Universal Ad Blocker] Failed to save whitelist:", e);
      }
   }
};

// ============================================================================
// STATISTICS TRACKING
// ============================================================================

const incrementStats = (domain, type = "unknown") => {
   if (!isEnabled) return;

   stats.totalBlocked++;
   stats.sessionBlocked++;

   // Track by domain
   if (!stats.byDomain[domain]) {
      stats.byDomain[domain] = 0;
   }
   stats.byDomain[domain]++;

   // Track by type
   if (!stats.byType[type]) {
      stats.byType[type] = 0;
   }
   stats.byType[type]++;

   // Update badge
   updateBadge();

   // Save periodically (every 10 blocks)
   if (stats.totalBlocked % 10 === 0) {
      saveStats();
   }
};

const resetStats = () => {
   stats = {
      totalBlocked: 0,
      sessionBlocked: 0,
      byDomain: {},
      byType: {},
      lastReset: Date.now(),
   };
   saveStats();
   updateBadge();
};

// ============================================================================
// BADGE MANAGEMENT
// ============================================================================

const updateBadge = async () => {
   try {
      // Badge disabled - users find it annoying
      // Just clear the badge completely
      await chrome.action.setBadgeText({ text: "" });
   } catch (e) {
      console.error("[Universal Ad Blocker] Failed to update badge:", e);
   }
};

// ============================================================================
// WHITELIST MANAGEMENT
// ============================================================================

const isWhitelisted = (url) => {
   try {
      const hostname = new URL(url).hostname;
      return whitelist.has(hostname);
   } catch (e) {
      return false;
   }
};

const addToWhitelist = async (hostname) => {
   whitelist.add(hostname);
   await saveWhitelist();
   return true;
};

const removeFromWhitelist = async (hostname) => {
   whitelist.delete(hostname);
   await saveWhitelist();
   return true;
};

// ============================================================================
// REQUEST BLOCKING
// ============================================================================

const setupRequestListeners = () => {
   // Listen for blocked requests (declarativeNetRequest)
   if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
      chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((details) => {
         try {
            const url = new URL(details.request.url);
            const domain = url.hostname;
            const type = details.request.type || "unknown";

            incrementStats(domain, type);

            console.log("[Universal Ad Blocker] Blocked:", domain, type);
         } catch (e) {
            console.error("[Universal Ad Blocker] Error processing blocked request:", e);
         }
      });
   }
};

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

const setupMessageListeners = () => {
   chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      handleMessage(request, sender)
         .then(sendResponse)
         .catch((error) => {
            console.error("[Universal Ad Blocker] Message handler error:", error);
            sendResponse({ success: false, error: error.message });
         });

      return true; // Keep channel open for async response
   });
};

const handleMessage = async (request, sender) => {
   const { action } = request;

   switch (action) {
      case "GET_STATS":
         return {
            success: true,
            sessionBlocked: stats.sessionBlocked,
            totalBlocked: stats.totalBlocked,
            byDomain: stats.byDomain,
            byType: stats.byType,
            isEnabled,
         };

      case "RESET_STATS":
         resetStats();
         return { success: true };

      case "GET_SETTINGS":
         return {
            success: true,
            settings,
            isEnabled,
         };

      case "UPDATE_SETTINGS":
         settings = { ...settings, ...request.settings };
         await saveSettings();
         return { success: true, settings };

      case "TOGGLE_ENABLED":
         isEnabled = request.enabled !== undefined ? request.enabled : !isEnabled;
         await saveSettings();
         updateBadge();
         return { success: true, isEnabled };

      case "ADD_TO_WHITELIST":
         if (!request.hostname) {
            return { success: false, error: "Hostname required" };
         }
         await addToWhitelist(request.hostname);
         return { success: true, whitelist: Array.from(whitelist) };

      case "REMOVE_FROM_WHITELIST":
         if (!request.hostname) {
            return { success: false, error: "Hostname required" };
         }
         await removeFromWhitelist(request.hostname);
         return { success: true, whitelist: Array.from(whitelist) };

      case "GET_WHITELIST":
         return { success: true, whitelist: Array.from(whitelist) };

      case "IS_WHITELISTED":
         if (!request.url) {
            return { success: false, error: "URL required" };
         }
         return { success: true, isWhitelisted: isWhitelisted(request.url) };

      case "INCREMENT_STATS":
         // Allow content scripts to manually report blocked elements
         incrementStats(request.domain || "unknown", request.type || "element");
         return { success: true };

      default:
         return { success: false, error: "Unknown action" };
   }
};

// ============================================================================
// TAB MANAGEMENT
// ============================================================================

// Reset session stats when browser starts
chrome.runtime.onStartup.addListener(() => {
   stats.sessionBlocked = 0;
   updateBadge();
});

// Update badge when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
   // This will open the popup by default
   // We can add custom behavior here if needed
});

// ============================================================================
// PERIODIC TASKS
// ============================================================================

// Save stats every 5 minutes
setInterval(() => {
   saveStats();
}, 5 * 60 * 1000);

// ============================================================================
// STARTUP
// ============================================================================

initialize();

console.log("[Universal Ad Blocker] Background service worker ready");
