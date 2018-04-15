(function(){

    'use strict';
    
    var classCallCheck = function(inst, constr){
        if (!(inst instanceof constr))
            throw new TypeError('Constructor VideoMaster cannot be invoked without \'new\'');
    };

    var describe = function(value, writable, enumerable, configurable){
        return {
            value: value,
            writable: writable || false,
            enumerable: enumerable || false,
            configurable: configurable || false
        };
    };

    var freeze = function(value){
        return describe(value)
    };

    var reserve = function(value){
        return describe(value, true);
    };

    var prototype = function(value){
        return typeof value === 'function'
            ? describe(value, true, false, true)
            : {
                enumerable: false,
                get: value.get,
                set: value.set
            };
    };

    function VideoMaster(config){

        var key,
            videoName,
            videoFormat,
            canvasName,
            isiOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);


        var err = [],
            error = function(string){
                err.push(string);
            },
            checkType = function(pair){
                var key;
                for (key in pair)
                    if (typeof this.config[key] !== pair[key])
                        error('Invalid ' + key + ' value. Only ' + pair[key] + ' accepted.');
            }.bind(this);


        classCallCheck(this, VideoMaster);


        Object.defineProperties(this, {
            state: freeze({
                inited: false,
                sized: false,
                resized: false,
                playing: false,
                ended: false,
                lastTime: 0,
                animationFrame: null
            }),
            config: freeze({
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
                onended: function(){},
                keyboard: true,
                keyboardFactor: 5
            }),
            ctx: reserve(null),
            element: reserve(null),
            video: reserve(null),
            canvas: reserve(null),
            width: reserve(0),
            height: reserve(0)
        });


        // Use custom config
        for (key in config)
            this.config[key] = config[key];


        try {

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
                onended: 'function',
                keyboard: 'boolean',
                keyboardFactor: 'number'
            });

            if (err.length)
                throw err;

        } catch(err){
            for (key in err)
                console.error(err[key]);
            return;
        }


        // Force canvas on iOS device
        this.config.useCanvas = isiOS || this.config.useCanvas;


        // Force this.element overflow and position style
        this.element.style.overflow = 'hidden';
        if (window.getComputedStyle(this.element).position === 'static')
            this.element.style.position = 'relative';


        // Creates video element
        videoName = (this.element.id ? this.element.id + '-' : '') + 'VideoMaster';
        videoFormat = this.config.src.split('.').pop();

        this.video = document.createElement('video');
        this.video.setAttribute('id', videoName);
        this.video.style.position = 'absolute';
        this.video.innerHTML = '<source src="' + this.config.src + '" type="video/' + videoFormat + '">';
        this.element.appendChild(this.video);


        // Creates canvas element if needed
        // In some system (i.e. iOS), this will not trigger system default video playing behaviour
        if (this.config.useCanvas){
            // Canvas element to play frames
            canvasName = videoName + '-canvas';
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
        }


        this.volume = this.config.volume;


        this.video.addEventListener('loadedmetadata', onMetaLoaded.bind(this));
        this.video.addEventListener('ended', onVideoEnded.bind(this));
        this.video.addEventListener('ended', this.config.onended.bind(this));
        this.element.addEventListener(this.config.trigger, this.init.bind(this));
        window.addEventListener('resize', this.updateSize.bind(this));

        if (this.config.keyboard === true)
            document.body.addEventListener('keydown', onKeyPress.bind(this));


        this.video.load();


        function onMetaLoaded(){
            this.updateSize();
        }

        function onVideoEnded(){
            this.state.playing = false;
            this.state.ended = true;

            if (this.config.loop === true){
                // Do not replay video if it is paused and progress is controlled by keyboard
                if (this.state.playing !== true)
                    return;

                this.goTo(0);
                this.play();
            } else {
                this.state.playing = false;
                if (this.config.resetOnEnded === true)
                    this.goTo(0);
            }
        }

        function onKeyPress(e){
            // Keyboard cannot control video before video is triggered.
            if (this.state.inited !== true)
                return;

            if (e.which === 32)
                this.togglePlay();
            else if (e.which === 37)
                this.goTo(this.currentTime - this.config.keyboardFactor);
            else if (e.which === 39)
                this.goTo(this.currentTime + this.config.keyboardFactor);
        }

    }

    Object.defineProperties(VideoMaster.prototype, {

        init: prototype(function(){
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
        }),

        updateSize: prototype(function(){
            var rw, rh, rt, rl, scale, t, l;

            var cw = this.element.clientWidth,
                ch = this.element.clientHeight,
                vw = this.video.videoWidth,
                vh = this.video.videoHeight;

            var adjustLeft = false,
                adjustTop = false;

            if (this.video.videoHeight === 0){
                this.state.resized = true;
                return;
            }

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
        }),

        play: prototype(function(){
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
        }),

        pause: prototype(function(){
            if (this.config.canPause === false) return;

            this.state.playing = false;

            if (!this.config.useCanvas)
                this.video.pause();
            else
                this.canvas.audio.pause();
        }),

        togglePlay: prototype(function(){
            if (!this.state.playing)
                this.play();
            else
                this.pause();
        }),

        goTo: prototype(function(second){
            this.video.currentTime = second;
            if (this.config.useCanvas)
                this.sync();
        }),

        // Roll as in roll the frames like a movie film
        roll: prototype(function(){
            var time = Date.now(),
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
        }),

        sync: prototype(function(){
            this.canvas.audio.currentTime = this.video.currentTime;
        }),

        drawFrame: prototype(function(){
            // Draw the current frame onto canvas
            this.ctx.drawImage(this.video, 0, 0, this.width, this.height);
        }),

        // To imitate event listener binding, so you can call these methods to the instance instead of the object
        addEventListener: prototype(function(){
            var elem = this.config.useCanvas ? this.canvas : this.video;
            elem.addEventListener.apply(elem, arguments);
        }),

        // Same reason as above
        removeEventListener: prototype(function(){
            var elem = this.config.useCanvas ? this.canvas : this.video;
            elem.removeEventListener.apply(elem, arguments);
        }),

        // Just to be convenient to jQuery or other library users
        on: prototype(function(){
            this.addEventListener.apply(this, arguments);
        }),

        // Same reason as above
        off: prototype(function(){
            this.removeEventListener.apply(this, arguments);
        }),

        volume: prototype({
            get: function(){
                return this.config.useCanvas
                    ? this.canvas.audio.volume
                    : this.video.volume;
            },
            set: function(vol){
                vol = parseFloat(vol);
    
                if (isNaN(vol) || vol > 1 || vol < 0)
                    return console.error('Volume must be a number between 0 to 1');
    
                if (this.config.useCanvas)
                    this.canvas.audio.volume = vol;
                else
                    this.video.volume = vol;
            }
        }),

        currentTime: prototype({
            get: function(){
                return this.video.currentTime;
            },
            set: function(second){
                this.goTo(second);
            }
        }),

        paused: prototype({
            get: function(){
                return !this.state.playing;
            }
        }),

        duration: prototype({
            get: function(){
                return this.video.duration;
            }
        })

    });

    window.VideoMaster = VideoMaster;

})();