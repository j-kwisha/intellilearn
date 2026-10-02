# Chatbot Avatar Videos

Place your animated avatar videos in this directory.

## Required Videos:

### 1. `chatbot-peeking.mp4`
**Purpose:** Intro/peeking animation that plays once when the page loads.

**Specifications:**
- Duration: 2-3 seconds
- Shows avatar peeking from the side/bottom
- Ends in a position ready for idle animation
- Format: MP4 (H.264 codec recommended)
- Resolution: 200x200px or higher (will be scaled to 58x58px)
- File size: Keep under 500KB for fast loading

**Animation Flow:**
- Avatar enters from side/bottom (peeking motion)
- Settles into final position
- Should smoothly transition to idle state

---

### 2. `chatbot-idle.mp4`
**Purpose:** Looping idle animation that plays continuously after peeking.

**Specifications:**
- Duration: 2-4 seconds (will loop seamlessly)
- Subtle breathing/bobbing effect
- Should loop perfectly (last frame matches first frame)
- Format: MP4 (H.264 codec recommended)
- Resolution: 200x200px or higher (will be scaled to 58x58px)
- File size: Keep under 1MB

**Animation Ideas:**
- Gentle breathing motion
- Slight bobbing up and down
- Blinking eyes
- Small side-to-side movement

---

## Video Optimization Tips:

1. **Compress your videos** using HandBrake or FFmpeg:
   ```bash
   ffmpeg -i input.mp4 -vf scale=200:200 -c:v libx264 -crf 28 -preset slow output.mp4
   ```

2. **Remove audio** (not needed):
   ```bash
   ffmpeg -i input.mp4 -an -vcodec copy output.mp4
   ```

3. **Create seamless loops** for idle animation:
   - Ensure first and last frames are identical
   - Use video editing software to create smooth transitions

---

## Where to Get Avatar Animations:

### Option 1: Create Your Own
- Use character animation tools like:
  - **Adobe Character Animator**
  - **Blender** (3D animation)
  - **Moho (Anime Studio)**

### Option 2: Commission/Purchase
- **Fiverr** - Hire animators
- **Envato Elements** - Download pre-made animations
- **Mixamo** (Adobe) - Character animations

### Option 3: Use AI Avatar Tools
- **D-ID** - AI-powered avatar videos
- **Synthesia** - AI video generation
- **HeyGen** - AI avatar creation

### Option 4: Use Stock Animations
- Search for "chatbot avatar animation" on:
  - Envato Market
  - Motion Array
  - Pond5

---

## Fallback Behavior:

If videos fail to load, the chatbot will automatically fall back to the static image (`chatbot_avatar.png`).

---

## Testing:

After adding your videos, refresh the page and watch:
1. Peeking animation plays first (2-3 seconds)
2. Automatically transitions to idle loop
3. Clicking opens the chatbot interface

---

**Need help?** Check the console for any video loading errors.
