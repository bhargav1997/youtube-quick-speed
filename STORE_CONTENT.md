# Chrome Web Store Description

## Description

Elevate your video watching experience with YouTube Quick Speed. This productivity extension gives you full control over video playback, allowing you to manage speed settings with precision and automate repetitive actions to save valuable time.

YouTube Quick Speed is designed for learners, researchers, and anyone who wants to watch content more efficiently. It enhances the native YouTube player without disrupting the core functionality, focusing purely on playback optimization and user convenience.

Key Features:

-  Precise Speed Control: Set playback speeds beyond the default limits, up to 4x.
-  Smart Persistence: Your chosen speed automatically applies to the next video, even when navigating playlists.
-  Automated Interactions: Automatically clicks the "Skip" button on video player overlays as soon as they become clickable.
-  Playback Acceleration: Intelligently detects promotional segments and temporarily increases playback speed to 16x while muting audio, restoring your preferred settings immediately after.
-  Volume Boost: Increase audio output up to 600% for videos with low volume.
-  A-B Loop: Easily set start and end points to loop specific sections of a video, perfect for tutorials and learning.

How it works:

1. Install the extension.
2. Open any YouTube video.
3. Use the popup menu to select your desired speed or volume.
4. Enable automated features like "Auto-skip" or "Speed up ads" to let the extension handle playback transitions for you.

This extension operates entirely locally on your device to ensure maximum privacy and performance.

---

## Short Description

(Max 132 chars)

Control YouTube video speed up to 4x, auto-skip skippable segments, and boost volume. A simple tool for efficient watching.

---

## Feature Bullets

-  Control playback speed from 0.25x up to 4x.
-  Automatically clicks "Skip" buttons on player overlays.
-  Temporarily speeds up promotional content to 16x.
-  Boost volume up to 600% for quiet videos.
-  Repeat loops (A-B repeat) for studying or music.
-  Settings persist across video navigation.

---

## Permissions Justification

1. "activeTab" and "scripting":
   This permission is required to inject a lightweight content script into the current tab. This script interacts with the HTML5 video player to adjust playback rate (speed) and volume levels based on your input.

2. "Host Permission: _://_.youtube.com/\*":
   The extension needs access to YouTube.com to detect the video player element and listen for navigation events (like moving to the next video in a playlist). This ensures that your chosen speed settings are re-applied correctly when the video changes without reloading the entire page.

   Note: This extension ONLY runs on youtube.com domains.

---

## Privacy Policy

**Privacy Policy for YouTube Quick Speed**

**Last Updated:** [Current Date]

YouTube Quick Speed ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how our Chrome Extension operates regarding your data.

**1. Data Collection and Usage**
We do not collect, store, or transmit any personal data, browsing history, or user usage statistics.

-  The extension operates entirely locally on your device.
-  No data is sent to external servers.
-  No cookies or tracking pixels are used.

**2. Permissions**
The extension requires access to `youtube.com` solely to interact with the video player elements (HTML5 Video) to perform the functions you request, such as changing playback speed or clicking specific player buttons.

**3. Third-Party Services**
This extension does not integrate with any third-party analytics or advertising services.

**4. Changes to This Policy**
We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.

**5. Contact Us**
If you have any questions about this Privacy Policy, please contact us via the support link on the Chrome Web Store listing.
