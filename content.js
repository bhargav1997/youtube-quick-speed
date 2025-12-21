// Helper to find the video element
const getVideo = () => document.querySelector("video");

// State to track desired speed
let targetSpeed = 1.0;

// Function to apply speed
const enforceSpeed = () => {
   const video = getVideo();
   if (video && !Number.isNaN(targetSpeed)) {
      // Only update if difference is significant to avoid floating point loops
      if (Math.abs(video.playbackRate - targetSpeed) > 0.01) {
         video.playbackRate = targetSpeed;
         // console.log(`[SpeedController] Applied speed: ${targetSpeed}x`);
      }
   }
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
   if (request.action === "SET_SPEED") {
      targetSpeed = parseFloat(request.speed);
      enforceSpeed();
      sendResponse({ success: true, speed: targetSpeed });
   } else if (request.action === "GET_SPEED") {
      // If we have a video, verify its actual speed, otherwise return target
      const video = getVideo();
      const currentRate = video ? video.playbackRate : targetSpeed;
      sendResponse({ speed: currentRate });
   }
});

// Periodic check to handle SPA navigation and AD interruptions
// YouTube often resets playback rate or replaces the video element
setInterval(() => {
   const video = getVideo();
   if (video) {
      // If the video exists, ensure it matches our target speed
      // This handles cases where YouTube resets it or a new video loads
      enforceSpeed();
   }
}, 1000);

// Also listen for SPA navigation events specifically to be more responsive
document.addEventListener("yt-navigate-finish", () => {
   // console.log('[SpeedController] Navigation finished, re-enforcing speed');
   setTimeout(enforceSpeed, 500); // Small delay to let video load
});

console.log("[SpeedController] Loaded");
