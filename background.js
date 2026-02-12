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
   enabled: false,
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
let isEnabled = false;

// ============================================================================
// INITIALIZATION
// ============================================================================

const initialize = async () => {
   // Load saved data
   await loadSettings();
   await loadStats();
   await loadWhitelist();
   await updateBlockingRules();

   // Set up listeners
   setupMessageListeners();
   setupRequestListeners();

   // CLEAR ALL DYNAMIC RULES (Fix for YouTube detection)
   // We want to ensure no stale rules are blocking ads
   if (chrome.declarativeNetRequest) {
      const dynamicRules = await chrome.declarativeNetRequest.getDynamicRules();
      const dynamicIds = dynamicRules.map((rule) => rule.id);
      await chrome.declarativeNetRequest.updateDynamicRules({
         removeRuleIds: dynamicIds,
      });
      // console.log("[Universal Ad Blocker] Cleared all dynamic rules.");
   }

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
         // Silently handle
      }
      settings = { ...DEFAULT_SETTINGS };
      isEnabled = false;
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
         // Silently handle
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
         // Silently handle
      }
   }
};

const saveStats = async () => {
   try {
      await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: stats });
   } catch (e) {
      if (e.message !== "No SW") {
         // Silently handle
      }
   }
};

const loadWhitelist = async () => {
   try {
      const result = await chrome.storage.local.get([STORAGE_KEYS.WHITELIST]);
      if (result[STORAGE_KEYS.WHITELIST]) {
         whitelist = new Set(result[STORAGE_KEYS.WHITELIST]);
      } else {
         // Default whitelist - satisfying user request
         whitelist = new Set(["youtube.com", "www.youtube.com"]);
         await saveWhitelist();
      }
   } catch (e) {
      if (e.message !== "No SW") {
         // Silently handle
      }
      whitelist = new Set(["youtube.com", "www.youtube.com"]);
   }
};

const saveWhitelist = async () => {
   try {
      await chrome.storage.local.set({ [STORAGE_KEYS.WHITELIST]: Array.from(whitelist) });
   } catch (e) {
      if (e.message !== "No SW") {
         // Silently handle
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
      // Silently handle
   }
};

// ============================================================================
// RULESET MANAGEMENT
// ============================================================================

const updateBlockingRules = async () => {
   if (!chrome.declarativeNetRequest) return;

   try {
      const rulesetId = "ad_blocking_rules";
      if (isEnabled) {
         await chrome.declarativeNetRequest.updateEnabledRulesets({
            enableRulesetIds: [rulesetId],
         });
      } else {
         await chrome.declarativeNetRequest.updateEnabledRulesets({
            disableRulesetIds: [rulesetId],
         });
      }
   } catch (e) {
      // Silently handle
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
         } catch (e) {
            // Silently handle
         }
      });
   }
};

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

const setupMessageListeners = () => {
   chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      // Return true immediately to indicate async response
      handleMessage(request, sender)
         .then((response) => {
            // Send response only if the port is still open (implicit check)
            sendResponse(response);
         })
         .catch((error) => {
            // Silently handle
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
         await updateBlockingRules();
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

      case "CAPTURE_VISIBLE_TAB":
         // Capture visible tab for screenshots
         try {
            const dataUrl = await chrome.tabs.captureVisibleTab(null, {
               format: "png",
               quality: 100,
            });
            return { success: true, dataUrl };
         } catch (error) {
            return { success: false, error: error.message };
         }

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
setInterval(
   () => {
      saveStats();
   },
   5 * 60 * 1000,
);

// ============================================================================
// STARTUP
// ============================================================================

initialize();
