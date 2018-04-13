(function(){

    'use strict';

    // Works like Object.defineProperties
    const define = (obj, desc) => {
        for (const prop in desc)
            Object.defineProperty(obj, prop, desc[prop]);
    };

    // Create descriptor
    const describe = (value, writable = false, enumerable = false, configurable = false) => ({
        value, writable, enumerable, configurable
    });

    class VideoMaster {

        constructor(config){

            define(this, {
                state: describe({
                    inited: false,
                    sized: false,
                    resized: false,
                    playing: false,
                    ended: false,
                    lastTime: 0,
                    animationFrame: null
                }),
                config: describe({
                    container: null,
                    src: null,
                    loop: false,
                    delay: 0,
                    audio: true,
                    volume: 1,
                    useCanvas: false,
                    resetOnEnded: false,
                    trigger: 'click',
                    canPause: true,
                    objectFit: 'cover',
                    controls: true,
                    onended: function(){}
                }),
                ctx: describe(null, true),
                element: describe(null, true),
                video: describe(null, true),
                canvas: describe(null, true),
                width: describe(0, true),
                height: describe(0, true)
            });


            // Use custom config
            for (const key in config){
                this.config[key] = config[key];
            }


            try {

                let err = [];

                const error = string => {
                    err.push(string)
                };
                const checkType = pair => {
                    for (const key in pair)
                        if (typeof this.config[key] !== pair[key])
                            error(`Invalid "${key}" value. Only ${pair[key]} accepted.`);
                };

                this.element =
                    typeof this.config.container === 'string'
                        ? document.querySelector(this.config.container)
                        : this.config.container;

                if (!this.element)
                    error('Container is not set or not found.');
                else if (Object.getPrototypeOf(this.element.constructor) !== HTMLElement)
                    error('Container is not a DOM Element.');

                if (!this.config.src)
                    error('Video source is not set.');
                else if (typeof this.config.src !== 'string')
                    error('Video source must be a string.');

                checkType({
                    loop: 'boolean',
                    delay: 'number',
                    audio: 'boolean',
                    volume: 'number',
                    useCanvas: 'boolean',
                    resetOnEnded: 'boolean',
                    trigger: 'string',
                    canPause: 'boolean',
                    objectFit: 'string',
                    controls: 'boolean',
                    onended: 'function'
                });

                if (err.length)
                    throw err;

            } catch(err){
                for (const msg of err)
                    console.error(msg);
                return;
            }


            // Force canvas on iOS device
            const isiOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
            this.config.useCanvas = isiOS || this.config.useCanvas;


            // Force this.element overflow and position style
            this.element.style.overflow = 'hidden';
            if (window.getComputedStyle(this.element).position === 'static')
                this.element.style.position = 'relative';


            // Creates video element
            const videoName = `${this.element.id ? `${this.element.id}-` : ''}VideoMaster`;
            const videoFormat = this.config.src.split('.').pop();

            this.video = document.createElement('video');
            this.video.setAttribute('id', videoName);
            this.video.style.position = 'absolute';
            this.video.innerHTML = `<source src="${this.config.src}" type="video/${videoFormat}">`;
            this.element.appendChild(this.video);


            // Creates canvas element if needed
            // In some system (i.e. iOS), this will not trigger system default video playing behaviour (i.e. fullscreen)
            if (this.config.useCanvas){
                // Canvas element to play frames
                const canvasName = `${videoName}-canvas`;
                this.canvas = document.createElement('canvas');
                this.canvas.setAttribute('id', canvasName);
                this.canvas.style.position = 'absolute';
                this.element.appendChild(this.canvas);

                // Audio element to play sound
                this.canvas.audio = document.createElement('audio');
                this.canvas.audio.innerHTML = this.video.innerHTML;
                this.element.insertBefore(this.canvas.audio, this.video);

                this.canvas.audio.load();
                this.ctx = this.canvas.getContext('2d');

                // To play frames
                this.video.addEventListener('timeupdate', this.drawFrame.bind(this));
                this.video.addEventListener('canplay', this.drawFrame.bind(this));
                window.addEventListener('resize', this.drawFrame.bind(this));
            }


            this.volume = this.config.volume;


            this.video.addEventListener('loadedmetadata', onMetaLoaded.bind(this));
            this.video.addEventListener('ended', onVideoEnded.bind(this));
            this.video.addEventListener('ended', this.config.onended.bind(this));
            this.element.addEventListener(this.config.trigger, this.init.bind(this));
            window.addEventListener('resize', this.updateSize.bind(this));


            this.video.load();


            function onMetaLoaded(){
                this.updateSize();
            }

            function onVideoEnded(){
                this.state.playing = false;
                this.state.ended = true;

                if (this.config.loop === true){
                    this.goTo(0);
                    this.play();
                } else {
                    this.state.playing = false;
                    if (this.config.resetOnEnded === true)
                        this.goTo(0);
                }
            }

        }

        init(e){
            if (!this.state.sized)
                this.updateSize();

            if (this.config.canPause === true && this.state.inited){
                this.togglePlay();
                return;
            }

            if (this.config.useCanvas)
                this.video.style.display = 'none';

            this.state.inited = true;
            this.play();
        }

        updateSize(){
            if (this.video.videoHeight === 0){
                this.state.resized = true;
                return;
            }

            let rw, rh, rt, rl, scale, t, l;
            const cw = this.element.clientWidth,
                  ch = this.element.clientHeight,
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
    
            if (adjustLeft)
                l = (cw - rw)/2;

            if (!this.config.useCanvas)
                setSize.call(this, this.video);
            else {
                setSize.call(this, this.canvas);
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

            if (!this.config.useCanvas){

                this.video.play();
                if (this.config.audio === false)
                    this.video.muted = true;

            } else {

                this.state.lastTime = Date.now();
                this.roll();
                this.canvas.audio.play();
                if (this.config.audio === false)
                    this.canvas.audio.muted = true;

            }
        }

        pause(){
            if (this.config.canPause === false) return;

            this.state.playing = false;

            if (!this.config.useCanvas)
                this.video.pause();
            else
                this.canvas.audio.pause();
        }

        togglePlay(){
            if (!this.state.playing)
                this.play();
            else
                this.pause();
        }

        goTo(second){
            this.video.currentTime = second;
            if (this.config.useCanvas)
                this.canvas.audio.currentTime = second;
        }

        // Roll as in roll the frames like a movie film
        roll(){
            const time = Date.now(),
                  elapsed = (time - this.state.lastTime)/1000;

            // Move video frame forward
            if (elapsed >= (1/30)){
                this.video.currentTime += elapsed;
                this.state.lastTime = time;

                // Sync audio with current video frame
                if (
                    this.canvas.audio &&
                    Math.abs(this.canvas.audio.currentTime - this.video.currentTime) > 0.3
                )
                    this.sync();
            }

            // Loop this method to imitate video play
            if (this.state.playing)
                this.state.animationFrame = window.requestAnimationFrame(this.roll.bind(this));
            else
                window.cancelAnimationFrame(this.state.animationFrame);
        }

        sync(){
            this.canvas.audio.currentTime = this.video.currentTime;
        }

        drawFrame(){
            if (parseInt(this.width) === 0)
                this.updateSize();

            // Draw the current frame onto canvas
            this.ctx.drawImage(this.video, 0, 0, this.width, this.height);
        }

        // To imitate event listener binding, so you can call these methods to the instance instead of the object
        addEventListener(){
            const elem = this.config.useCanvas ? this.canvas : this.video;
            elem.addEventListener.apply(elem, arguments);
        }

        // Same reason as above
        removeEventListener(){
            const elem = this.config.useCanvas ? this.canvas : this.video;
            elem.removeEventListener.apply(elem, arguments);
        }

        // Just to be convenient to jQuery or other library users
        on(){
            this.addEventListener.apply(this, arguments);
        }

        // Same reason as above
        off(){
            this.removeEventListener.apply(this, arguments);
        }

        get volume(){
            return this.config.useCanvas ? this.canvas.audio.volume : this.video.volume;
        }

        set volume(vol){
            vol = parseFloat(vol);

            if (isNaN(vol) || vol > 1 || vol < 0)
                return console.error('Volume must be a number between 0 to 1');

            if (this.config.useCanvas)
                this.canvas.audio.volume = vol;
            else
                this.video.volume = vol;
        }

        get currentTime(){
            return this.video.currentTime;
        }

        set currentTime(second){
            this.goTo(second);
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