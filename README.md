## VideoMaster
##### A cross-platform video playing tool for interactive contents.


### How to use it?
1. Include the javascript in your `<head></head>` section of your HTML, before your page-specific javascript.
```
<script src="videomaster.js"></script>
```
2. Be sure to have an element that will hold your video. For example:
```
<div id="myVideoParent"></div>
```
3. In your javascript, you can create a VideoMaster instance by:
```
var myVideo = new VideoMaster({
    // compulsory
    src: '',                                                 // Path to video.
    container: '#myVideoParent',                             // Either Selector of parent element
    // container: document.getElementById('myVideoParent'),  // Or a DOM Element Node
    
    /* OPTIONAL */
    loop: false,                // Loop video onended.
    audio: true,                // Mute video (can't be unmuted').
    objectFit: 'cover',         // Accepted value: 'cover', 'contain'.
    forceCanvas: false,         // If true, use canvas element as video for all platform. This is always true on iOS device regardless of the option.
    resetOnEnded: false,        // Reset video frame to first frame onended.
    endedEventName: 'complete', // Custom video ended event name.
    initBy: 'click',            // Custom user gesture required to start/pause video.
    canPause: true              // If false, video cannot be paused.
});
```
4. Useful methods:
- `myVideo.play()`: Plays the video.
- `myVideo.pause()`: Pauses the video.
- `myVideo.togglePlay()`: Toggle video play/pause.
- `myVideo.goTo(seconds)`: Change your video `currentTime` to specified time in seconds.
- `myVideo.currentTime`: Get your video's `currentTime`. Use `myVideo.currentTime = seconds` to achieve same effect as `myVideo.goTo(seconds)`.
- `myVideo.paused`: Check if your video is paused. Returns true if paused.
- `myVideo.duration`: Returns your video total duration in seconds.


### When can I use it?
You can use it when:
  1. You want to create an interactive video content (that actually requires user-induced gesture, i.e., swipe, tap, shake, etc.);
  2. You want your audiences to be able to keep scrolling the page while video plays;
  3. You want consistent video playing experience across different devices and platforms (i.e., iOS vs Android);

And more.


### Appreciation
This project is inspired by:
1. [Stanko](https://github.com/Stanko/) for [CanvasVideoPlayer.js](https://github.com/Stanko/html-canvas-video-player).