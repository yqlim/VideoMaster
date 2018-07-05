(function(){

    'use strict';

    // Polyfilling window.requestAnimationFrame
    // from: https://gist.github.com/paulirish/1579671
    (function() {
        var lastTime = 0;
        var vendors = ['ms', 'moz', 'webkit', 'o'];
        for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
            window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
            window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                                       || window[vendors[x]+'CancelRequestAnimationFrame'];
        }

        if (!window.requestAnimationFrame)
            window.requestAnimationFrame = function(callback, element) {
                var currTime = new Date().getTime();
                var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
                  timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };

        if (!window.cancelAnimationFrame)
            window.cancelAnimationFrame = function(id) {
                clearTimeout(id);
            };
    }());

    class VideoMaster {

        constructor(container, src, config = {}){
            const error = msg => `VideoMaster: ${msg}`;


            if (!container)
                throw new SyntaxError(error('Container is not specified.'));

            if (!src)
                throw new SyntaxError(error('Video source is not specified.'));


            this.container =
                typeof container === 'string'
                    ? document.querySelector(container)
                    : container;

            if (!this.container)
                throw new Error(error('Container is not found.'));

            if (Object.getPrototypeOf(this.container.constructor) !== HTMLElement)
                throw new TypeError(error('Container is not a DOM Element.'));


            if (typeof src !== 'string')
                throw new TypeError(error('Video source must be typeof string.'));

            this.source = src;


            this.config = {
                loop: false,
                muted: false,
                volume: 1,
                objectFit: 'contain',
                useCanvas: false,
                forceCanvasOniOS: true,
                resetOnEnded: false,
                trigger: 'click',
                canPause: true,
                shortcut: true,
                seekFactor: 5,
                onEnded: function(){}
            }

            for (const key in config)
                this.config[key] = config[key];


            // Type checking
            ((pair) => {
                for (const key in pair)
                    if (this.config[key] !== undefined
                        && this.config[key] !== null
                        && this.config[key].constructor !== pair[key])
                        throw new TypeError(error(`Invalid "${key}" property value. Only values of ${pair[key].toString().match(/[A-Z]\w{1,}/)[0]} constructor are accepted.`));
            })({
                loop: Boolean,
                muted: Boolean,
                volume: Number,
                useCanvas: Boolean,
                forceCanvasOniOS: Boolean,
                resetOnEnded: Boolean,
                trigger: String,
                canPause: Boolean,
                objectFit: String,
                onEnded: Function,
                shortcut: Boolean,
                seekFactor: Number
            });


            this.state = {
                inited: false,
                sized: false,
                resized: false,
                playing: false,
                ended: false,
                lastTime: 0,
                animationFrame: null
            };

            this.ctx = null;
            this.video = null;
            this.canvas = null;
            this.audio = null;
            this.width = 0;
            this.height = 0;


            if (this.config.forceCanvasOniOS){
                const isiOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
                this.config.useCanvas = isiOS || this.config.useCanvas;
            }


            // Force overflow: hidden to hide overflowing video/canvas edges
            this.container.style.overflow = 'hidden';

            // Force position to at least relative because video/canvas must use position: absolute
            if (window.getComputedStyle(this.container).position === 'static')
                this.container.style.position = 'relative';


            // Creates video
            const videoName = `${this.container.id ? `${this.container.id}-` : ''}VideoMaster`;

            this.video = document.createElement('video');
            this.video.setAttribute('id', videoName);
            this.video.style.position = 'absolute';
            this.video.innerHTML = `<source src="${this.source}">`;
            this.container.appendChild(this.video);


            // Creates canvas if needed
            if (this.config.useCanvas){
                // Canvas element to play frames
                const canvasName = `${videoName}-canvas`;
                this.canvas = document.createElement('canvas');
                this.canvas.setAttribute('id', canvasName);
                this.canvas.style.position = 'absolute';
                this.container.appendChild(this.canvas);

                // Audio element to play sound
                this.audio = document.createElement('audio');
                this.audio.innerHTML = this.video.innerHTML;
                this.container.appendChild(this.audio, this.video);

                this.audio.load();
                this.ctx = this.canvas.getContext('2d');

                // Event Listener to reflect video frame on canvas 
                this.video.addEventListener('timeupdate', this.drawFrame.bind(this));

                // Draw first frame (cover frame)
                this.video.addEventListener('loadeddata', this.drawFrame.bind(this));
            }


            this.volume = this.config.volume;


            this.video.addEventListener('loadedmetadata', this.updateSize.bind(this));
            this.video.addEventListener('ended', onEnded.bind(this));
            this.video.addEventListener('ended', this.config.onEnded.bind(this));

            this.container.addEventListener(this.config.trigger, this.init.bind(this));
            window.addEventListener('resize', this.updateSize.bind(this));

            // If needed to bind keyboard shortcut
            if (this.config.shortcut)
                window.addEventListener('keydown', onKeyPress.bind(this));


            this.video.load();


            function onEnded(){
                this.state.ended = true;

                if (this.config.loop)
                    this.play();

                else {
                    this.state.playing = false;
    
                    if (this.config.resetOnEnded)
                        this.goTo(0);
                }
            }

            function onKeyPress(e){
                // Keyboard cannot control video before video is triggered.
                if (!this.state.inited)
                    return;

                switch (e.which){
                    // Space bar
                    case 32:
                        this.togglePlay();
                        break;

                    // Left arrow
                    case 37:
                        this.goTo(this.currentTime - this.config.seekFactor);
                        break;

                    // Right arrow
                    case 39:
                        this.goTo(this.currentTime + this.config.seekFactor);
                        break;
                }
            }
        }

        init(){
            if (!this.state.sized)
                this.updateSize();

            if (this.config.canPause && this.state.inited)
                return this.togglePlay();

            if (this.config.useCanvas)
                this.video.style.display = 'none';

            this.state.inited = true;
            this.play();
        }

        // No comment because I lazy
        updateSize(){
            if (!this.video.videoHeight){
                this.state.resized = true;
                return;
            }

            let rw, rh, scale, t, l;
            const cw = this.container.clientWidth,
                  ch = this.container.clientHeight,
                  vw = this.video.videoWidth,
                  vh = this.video.videoHeight;

            let [adjustLeft, adjustTop] = [false, false];

            this.width = cw;
            this.height = 
                this.config.objectFit !== 'cover'
                    ? vh*(cw/vw)
                    : ch;

            this.video.setAttribute('width', this.width);
            this.video.setAttribute('height', this.height);
            if (this.config.useCanvas){
                this.canvas.setAttribute('width', this.width);
                this.canvas.setAttribute('height', this.height);
            }

            if (this.config.objectFit === 'cover'){
    
                scale = cw/vw;
                if (vh*scale < ch){
                    scale = ch/vh;
                    rw = vw*scale;
                    rh = ch;
                    t = 0;
                    adjustLeft = true;
                } else {
                    rw = cw;
                    rh = vh*scale;
                    l = 0;
                    adjustTop = true;
                }
    
            } else if (this.config.objectFit === 'contain'){
    
                scale = cw/vw;
                if (vh*scale > ch){
                    scale = ch/vh;
                    rw = vw*scale;
                    rh = ch;
                    t = 0;
                    adjustLeft = true;
                } else {
                    rw = cw;
                    rh = vh*scale;
                    l = 0;
                    adjustTop = true;
                }
    
            }
    
            if (adjustTop)
                t = (ch - rh)/2;
            else if (adjustLeft)
                l = (cw - rw)/2;

            if (!this.config.useCanvas)
                setSize.call(this, this.video);
            else {
                setSize.call(this, this.canvas);
                this.drawFrame();
                // Hide video element because it is not needed in layout anymore
                this.video.style.display = 'none';
            }

            this.state.sized = true;

            function setSize(element){
                element.style.top = t + 'px';
                element.style.left = l + 'px';
                if (this.config.objectFit === 'cover'){
                    element.style.width = rw + 'px';
                    element.style.height = rh + 'px';
                }
            }
        }

        play(){
            this.state.playing = true;

            if (!this.state.sized)
                this.updateSize();

            if (this.state.ended){
                this.state.ended = false;
                this.goTo(0);
            }

            if (this.config.useCanvas){

                this.state.lastTime = Date.now();
                this.roll();
                this.audio.play();
                this.audio.muted = this.config.muted;

            } else {

                this.video.play();
                this.video.muted = this.config.muted;

            }
        }

        pause(){
            if (!this.config.canPause)
                return;

            this.state.playing = false;

            if (!this.config.useCanvas)
                this.video.pause();
            else
                this.audio.pause();
        }

        togglePlay(){
            if (this.state.playing)
                this.pause();
            else
                this.play();
        }

        goTo(s){
            this.video.currentTime = s;
            if (this.config.useCanvas)
                this.sync();
        }

        // Roll as in roll the frames like a film
        roll(){
            const time = Date.now();
            const elapsed = (time - this.state.lastTime)/1000;

            // Move video frame forward
            if (elapsed >= (1/30)){
                this.video.currentTime += elapsed;
                this.state.lastTime = time;

                // Sync audio with current video frame
                if (Math.abs(this.audio.currentTime - this.video.currentTime) > 0.3)
                    this.sync();
            }

            // Loop this method to imitate video play
            if (this.state.playing)
                this.state.animationFrame = window.requestAnimationFrame(this.roll.bind(this));
            else
                window.cancelAnimationFrame(this.state.animationFrame);
        }

        sync(){
            this.audio.currentTime = this.video.currentTime;
        }

        drawFrame(){
            this.ctx.drawImage(this.video, 0, 0, this.width, this.height);
        }

        /**
         * To imitate event listener binding,
         * so you can call these methods directly on the instance
         */
        addEventListener(){
            const elem = this.config.useCanvas ? this.canvas : this.video;
            elem.addEventListener.apply(elem, arguments);
        }

        removeEventListener(){
            const elem = this.config.useCanvas ? this.canvas : this.video;
            elem.removeEventListener.apply(elem, arguments);
        }

        /**
         * Just to be convenient to jQuery or other library users
         */
        on(){
            this.addEventListener.apply(this, arguments);
        }

        off(){
            this.removeEventListener.apply(this, arguments);
        }

        get src(){
            return this.source;
        }

        set src(src){
            if (typeof src !== 'string')
                throw new TypeError('VideoMaster: Video source must be typeof string.');

            this.source = src;
            this.container.removeChild(this.video);
            const videoName = `${this.container.id ? `${this.container.id}-` : ''}VideoMaster`;
            this.video = document.createElement('video');
            this.video.setAttribute('id', videoName);
            this.video.style.position = 'absolute';
            this.video.innerHTML = `<source src="${this.source}">`;
            this.container.appendChild(this.video);

            if (this.canvas){
                this.container.removeChild(this.audio);
                this.audio = document.createElement('audio');
                this.audio.innerHTML = this.video.innerHTML;
                this.container.appendChild(this.audio, this.video);
                this.audio.load();
            }

            this.video.addEventListener('loadedmetadata', this.updateSize.bind(this));
            this.video.addEventListener('ended', onEnded.bind(this));
            this.video.addEventListener('ended', this.config.onEnded.bind(this));
            this.video.load();
            function onEnded(){
                this.state.ended = true;

                if (this.config.loop)
                    this.play();

                else {
                    this.state.playing = false;
    
                    if (this.config.resetOnEnded)
                        this.goTo(0);
                }
            }
        }

        get muted(){
            return this.config.useCanvas
                ? this.audio.muted
                : this.video.muted;
        }

        set muted(bool){
            if (typeof bool !== 'boolean')
                throw new TypeError('VideoMaster: Must use boolean to set ".muted" property.');

            if (this.config.useCanvas)
                this.audio.muted = bool;
            else
                this.video.muted = bool;
        }

        get volume(){
            return this.config.useCanvas
                ? this.audio.volume
                : this.video.volume;
        }

        set volume(vol){
            if (typeof vol !== 'number')
                throw new TypeError('VideoMaster: "volume" property must be a number between 0 to 1.');

            if (vol < 0 || vol > 1)
                throw new RangeError('VideoMaster: "volume" property must be a number between 0 to 1.');

            if (this.config.useCanvas)
                this.audio.volume = vol;
            else
                this.video.volume = vol;
        }

        get currentTime(){
            return this.video.currentTime;
        }

        set currentTime(s){
            if (typeof s !== 'number')
                throw new TypeError('VideoMaster: "currentTime" property must be a number.');

            if (s > this.video.duration)
                throw new RangeError('VideoMaster: New "currentTime" value exceeded video duration.');

            this.goTo(s);
        }

        get paused(){
            return !this.state.playing;
        }

        get duration(){
            return this.video.duration;
        }

    }

    window.VideoMaster = VideoMaster;

})();