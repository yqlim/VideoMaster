## *Deprecation notice*
*This is due to the added `playsinline` attribute of `<video>` element in iOS devices. Read more about it on [WebKit](https://webkit.org/blog/6784/new-video-policies-for-ios/) and [Apple](https://developer.apple.com/documentation/webkitjs/htmlvideoelement/2528111-playsinline).*

*This will still be useful for you to manipulate video playback with JavaScript, such as arrow keys seeking, spacebar play/pause, video loop, etc..*

## VideoMaster
#### A cross-platform video playing tool that enables creative interactions with videos.

### Browser support
All major browsers equivalent to IE9 and above.

### How to use it?
1. Include the javascript in your `<head></head>` section of your HTML, before your page-specific javascript.
```html
<script src="videomaster.js"></script>
```

2. Be sure to have an element that will contain your video. For example:
```html
<div id="myContainer"></div>
```

3. In your javascript, you can create a VideoMaster instance by:
```javascript
// Compulsory arguments
var container = document.getElementById('myContaienr'); // Or a querySelector string is good too
var videoSrc = '';                                      // Must have a valid video URL

// Optional configurations and their default values
var acceptedConfig = {
    loop: false,                // Loop video onended.
    muted: false,               // If true, video will not have any audio.
    volume: 1,                  // Value ranges from 0 to 1
    objectFit: 'contain',       // Accepted value: 'cover', 'contain'.
    useCanvas: false,           // If true, use canvas element as video for all platform.
    forceCanvasOniOS: true      // If false, iOS devices will use their native video player, which defeats the purpose of this tool.
    resetOnEnded: false,        // Reset video frame to first frame onended.
    trigger: 'click',           // Custom user gesture required to start/pause video.
    canPause: true,             // If false, video cannot be paused.
    shortcut: true,             // If false, keyboard shortcut will be disabled
    seekFactor: 5,              // Indidates the number of seconds the video will rewind/forward from keyboard shortcut
    onEnded: function(){}       // Adds extra onEnded call
}

var myVideo = new VideoMaster(container, videoSrc, acceptedConfig);
```

4. Useful methods:
    - `myVideo.play()`: Plays the video.
    - `myVideo.pause()`: Pauses the video.
    - `myVideo.togglePlay()`: Toggle video play/pause.
    - `myVideo.goTo(seconds)`: Change your video `currentTime` to specified time in seconds.
    - `myVideo.addEventListener()`: Attach events to it easily.
    - `myVideo.removeEventListener()`: Remove events from it easily.
    - `myVideo.on()`: alias to `.addEventListener()`.
    - `myVideo.off()`: alias to `.removeEventListener()`.
    - `myVideo.muted`: Get or set your video to muted or not muted. Accepts boolean value only.
    - `myVideo.volume`: Get or set your video's volume. Value range from 0 to 1.
    - `myVideo.currentTime`: Get your video's `currentTime`. Use `myVideo.currentTime = seconds` to achieve same effect as `myVideo.goTo(seconds)`.
    - `myVideo.paused`: Check if your video is paused. Returns true if paused.
    - `myVideo.duration`: Returns your video total duration in seconds.

5. Keyboard shortcuts:
    - `space` key: Toggle play/pause.
    - `left` arrow key: Rewind video to _n_ seconds before.
    - `right` arrow key: Forward video to _n_ seconds after.

### When can I use it?
You can use it when:
  1. You want to prevent videos from automatically go fullscreen (i.e. on iOS devices).
  2. You want to create an interactive video content (that actually requires user-induced gesture, i.e., swipe, tap, shake, etc.).
  3. You want your audiences to be able to keep scrolling the page while video plays.
  4. You want consistent video playing experience across different devices and platforms (i.e., iOS vs Android);

And more.

### Future Plans
1. Add video controls support.

### Appreciation
This project is inspired by:
1. [Stanko](https://github.com/Stanko/) for [CanvasVideoPlayer.js](https://github.com/Stanko/html-canvas-video-player).
