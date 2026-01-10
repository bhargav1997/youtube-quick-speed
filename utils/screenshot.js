// ============================================================================
// SCREENSHOT UTILITY - Advanced Capture System
// ============================================================================

(function () {
   "use strict";

   /**
    * Capture visible viewport
    * @returns {Promise<string>} Base64 image data URL
    */
   const captureVisible = async () => {
      return new Promise((resolve) => {
         chrome.runtime.sendMessage({ action: "CAPTURE_VISIBLE_TAB" }, (response) => {
            if (response && response.dataUrl) {
               resolve(response.dataUrl);
            } else {
               resolve(null);
            }
         });
      });
   };

   const forceRepaint = async () => {
      return new Promise((resolve) => {
         requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
         });
      });
   };

   const disableFixedElements = () => {
      const fixedElements = [];

      // Check ALL elements for fixed/sticky positioning
      document.querySelectorAll("*").forEach((el) => {
         try {
            const style = getComputedStyle(el);
            if (style.position === "fixed" || style.position === "sticky") {
               fixedElements.push({
                  el,
                  originalDisplay: el.style.display,
                  originalVisibility: el.style.visibility,
                  originalPosition: el.style.position,
               });

               // HIDE the element completely during capture
               el.style.setProperty("display", "none", "important");
            }
         } catch (e) {
            // Ignore errors
         }
      });

      console.log(`[Screenshot] Hiding ${fixedElements.length} fixed/sticky elements`);
      return fixedElements;
   };

   const restoreFixedElements = (elements) => {
      elements.forEach(({ el, originalDisplay, originalVisibility, originalPosition }) => {
         // Restore original styles
         if (originalDisplay) {
            el.style.display = originalDisplay;
         } else {
            el.style.removeProperty("display");
         }
         if (originalVisibility) {
            el.style.visibility = originalVisibility;
         }
         if (originalPosition) {
            el.style.position = originalPosition;
         }
      });
      console.log(`[Screenshot] Restored ${elements.length} fixed/sticky elements`);
   };

   const captureFullPage = async () => {
      const originalScrollX = window.scrollX;
      const originalScrollY = window.scrollY;

      try {
         // Disable fixed / sticky elements safely
         const fixedEls = disableFixedElements();

         // Measure full document size
         const totalHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
         const totalWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);

         // Go to top and let layout settle
         window.scrollTo(0, 0);
         await new Promise((r) => setTimeout(r, 400));
         await forceRepaint();

         // First capture (source of truth)
         const firstShot = await captureVisible();
         if (!firstShot) throw new Error("Initial capture failed");

         const firstImg = new Image();
         await new Promise((res) => {
            firstImg.onload = res;
            firstImg.src = firstShot;
         });

         const viewportCSSWidth = window.innerWidth;
         const viewportCSSHeight = window.innerHeight;

         const capturedWidth = firstImg.width;
         const capturedHeight = firstImg.height;

         // REAL device pixel ratio
         const pixelRatio = capturedWidth / viewportCSSWidth;

         // REAL CSS height per capture
         const cssCaptureHeight = capturedHeight / pixelRatio;

         // Canvas
         const canvas = document.createElement("canvas");
         canvas.width = Math.ceil(totalWidth * pixelRatio);
         canvas.height = Math.ceil(totalHeight * pixelRatio);

         const ctx = canvas.getContext("2d");

         console.log("[Screenshot] DPR:", pixelRatio);
         console.log("[Screenshot] CSS Capture Height:", cssCaptureHeight);

         let y = 0;
         let shots = 0;

         while (y < totalHeight) {
            window.scrollTo(0, y);

            // Chrome-safe delay
            await new Promise((r) => setTimeout(r, 350));
            await forceRepaint();

            const shot = await captureVisible();
            if (!shot) {
               y += cssCaptureHeight;
               continue;
            }

            const img = new Image();
            await new Promise((res) => {
               img.onload = res;
               img.src = shot;
            });

            const drawHeightCSS = Math.min(cssCaptureHeight, totalHeight - y);
            const drawHeightPX = Math.floor(drawHeightCSS * pixelRatio);

            ctx.drawImage(img, 0, 0, capturedWidth, drawHeightPX, 0, Math.floor(y * pixelRatio), capturedWidth, drawHeightPX);

            shots++;
            y += cssCaptureHeight;
         }

         console.log(`[Screenshot] Captured ${shots} slices`);

         restoreFixedElements(fixedEls);
         window.scrollTo(originalScrollX, originalScrollY);

         return canvas.toDataURL("image/png");
      } catch (err) {
         console.error("[Screenshot] Full page capture failed:", err);
         window.scrollTo(originalScrollX, originalScrollY);
         throw err;
      }
   };

   /**
    * Capture selected area
    * @returns {Promise<string>} Base64 image data URL
    */
   const captureSelection = async () => {
      return new Promise((resolve) => {
         // Create selection overlay
         const overlay = document.createElement("div");
         overlay.id = "screenshot-selection-overlay";
         overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.5);
            z-index: 2147483647;
            cursor: crosshair;
         `;

         const selectionBox = document.createElement("div");
         selectionBox.style.cssText = `
            position: absolute;
            border: 2px dashed #3aa6ff;
            background: rgba(58, 166, 255, 0.1);
            pointer-events: none;
         `;
         overlay.appendChild(selectionBox);

         let startX,
            startY,
            isDrawing = false;

         overlay.addEventListener("mousedown", (e) => {
            startX = e.clientX;
            startY = e.clientY;
            isDrawing = true;
            selectionBox.style.left = startX + "px";
            selectionBox.style.top = startY + "px";
            selectionBox.style.width = "0px";
            selectionBox.style.height = "0px";
         });

         overlay.addEventListener("mousemove", (e) => {
            if (!isDrawing) return;
            const currentX = e.clientX;
            const currentY = e.clientY;
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);
            const left = Math.min(startX, currentX);
            const top = Math.min(startY, currentY);

            selectionBox.style.left = left + "px";
            selectionBox.style.top = top + "px";
            selectionBox.style.width = width + "px";
            selectionBox.style.height = height + "px";
         });

         overlay.addEventListener("mouseup", async (e) => {
            if (!isDrawing) return;
            isDrawing = false;

            const endX = e.clientX;
            const endY = e.clientY;

            const left = Math.min(startX, endX);
            const top = Math.min(startY, endY);
            const width = Math.abs(endX - startX);
            const height = Math.abs(endY - startY);

            overlay.remove();

            if (width < 10 || height < 10) {
               resolve(null);
               return;
            }

            // Capture and crop
            const dataUrl = await captureVisible();
            if (!dataUrl) {
               resolve(null);
               return;
            }

            const img = new Image();
            img.onload = () => {
               const canvas = document.createElement("canvas");
               canvas.width = width;
               canvas.height = height;
               const ctx = canvas.getContext("2d");
               ctx.drawImage(img, left, top, width, height, 0, 0, width, height);
               resolve(canvas.toDataURL("image/png"));
            };
            img.src = dataUrl;
         });

         // ESC to cancel
         const handleEscape = (e) => {
            if (e.key === "Escape") {
               overlay.remove();
               document.removeEventListener("keydown", handleEscape);
               resolve(null);
            }
         };
         document.addEventListener("keydown", handleEscape);

         document.body.appendChild(overlay);
      });
   };

   /**
    * Convert data URL to different format
    * @param {string} dataUrl - Source data URL
    * @param {string} format - Target format (png, jpeg, gif, bmp)
    * @param {number} quality - JPEG quality (0-1)
    * @returns {string} Converted data URL
    */
   const convertFormat = (dataUrl, format, quality = 0.92) => {
      return new Promise((resolve) => {
         const img = new Image();
         img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);

            let mimeType;
            switch (format.toLowerCase()) {
               case "jpeg":
               case "jpg":
                  mimeType = "image/jpeg";
                  break;
               case "gif":
                  mimeType = "image/gif";
                  break;
               case "bmp":
                  mimeType = "image/bmp";
                  break;
               default:
                  mimeType = "image/png";
            }

            resolve(canvas.toDataURL(mimeType, quality));
         };
         img.src = dataUrl;
      });
   };

   /**
    * Download image
    * @param {string} dataUrl - Image data URL
    * @param {string} filename - Download filename
    */
   const downloadImage = (dataUrl, filename) => {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      link.click();
   };

   /**
    * Copy image to clipboard
    * @param {string} dataUrl - Image data URL
    */
   const copyToClipboard = async (dataUrl) => {
      try {
         // Method 1: Copy as image blob (best for pasting into apps)
         const blob = await (await fetch(dataUrl)).blob();
         await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
         console.log("[Screenshot] ✓ Copied to clipboard successfully");
         return true;
      } catch (e) {
         console.warn("[Screenshot] Image copy failed, trying text fallback:", e.message);

         // Method 2: Copy as data URL text (fallback)
         try {
            await navigator.clipboard.writeText(dataUrl);
            console.log("[Screenshot] ✓ Copied data URL as text");
            return true;
         } catch (e2) {
            console.error("[Screenshot] ✗ Clipboard access denied:", e2.message);
            console.log("[Screenshot] Tip: Use the download buttons (PNG, JPEG, etc.) instead");
            return false;
         }
      }
   };

   /**
    * Print image
    * @param {string} dataUrl - Image data URL
    */
   const printImage = (dataUrl) => {
      try {
         // Create a temporary image element
         const img = document.createElement("img");
         img.src = dataUrl;
         img.style.maxWidth = "100%";
         img.style.height = "auto";
         img.className = "screenshot-print-image";

         // Create a print-specific div
         const printDiv = document.createElement("div");
         printDiv.className = "screenshot-print-container";
         printDiv.style.position = "fixed";
         printDiv.style.top = "0";
         printDiv.style.left = "0";
         printDiv.style.width = "100%";
         printDiv.style.height = "100%";
         printDiv.style.backgroundColor = "white";
         printDiv.style.zIndex = "999999";
         printDiv.style.display = "none";
         printDiv.style.justifyContent = "center";
         printDiv.style.alignItems = "center";
         printDiv.appendChild(img);

         // Add print-specific styles
         const style = document.createElement("style");
         style.textContent = `
            @media print {
               body > *:not(.screenshot-print-container) {
                  display: none !important;
               }
               .screenshot-print-container {
                  position: static !important;
                  display: flex !important;
                  width: 100% !important;
                  height: auto !important;
                  background: white !important;
                  page-break-after: avoid !important;
               }
               .screenshot-print-image {
                  max-width: 100% !important;
                  height: auto !important;
                  display: block !important;
                  margin: 0 auto !important;
               }
            }
         `;

         document.head.appendChild(style);
         document.body.appendChild(printDiv);

         // Wait for image to load
         img.onload = () => {
            printDiv.style.display = "flex";

            // Small delay to ensure rendering
            setTimeout(() => {
               // Print
               window.print();

               // Clean up after print dialog closes
               setTimeout(() => {
                  document.body.removeChild(printDiv);
                  document.head.removeChild(style);
               }, 1000);
            }, 100);
         };

         img.onerror = () => {
            console.error("[Screenshot] Failed to load image for printing");
            if (printDiv.parentNode) document.body.removeChild(printDiv);
            if (style.parentNode) document.head.removeChild(style);
         };
      } catch (e) {
         console.error("[Screenshot] Print error:", e);
      }
   };

   // Expose to global scope
   window.ScreenshotUtil = {
      captureVisible,
      captureFullPage,
      captureSelection,
      convertFormat,
      downloadImage,
      copyToClipboard,
      printImage,
   };

   console.log("[ScreenshotUtil] Loaded successfully ✓");
})();
