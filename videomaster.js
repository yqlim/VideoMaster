(function(){

    'use strict';

    var VideoMaster = function(custom){

        var err = '',
            error,
            typeOf;

        var i,
            key,
            paused,
            videoName,
            canvasName,
            elemRect,
            elemStyle,
            iOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

        this.__hasInit = false;
        this.__sizeIsSet = false;
        this.__isResized = false;
        this.playing = false;
        this.useCanvas = false;
        this.ctx = undefined;
        this.element = undefined;
        this.video = undefined;
        this.canvas = undefined;
        this.animationFrame = null;
        this.lastTime = 0;
        this.width = 0;
        this.height = 0;
        this.config = {};

        this.defaults = {
            container: document.body,   // {"type": "HTMLElement",          "description": "container element of VideoMaster"}
            src: undefined,             // {"type": "string",               "description": "video path"}
            format: 'mp4',              // {"type": "string",               "description": "video format (e.g., mp4, flv, mkv, etc)"}
            loop: false,                // {"type": "boolean",              "description": "loop video onended"}
            delay: 0,                   // {"type": "number || boolean",    "description": "delay video start time in milliseconds"}
            audio: true,                // {"type": "boolean",              "description": "mute video, cannot be unmuted"}
            forceCanvas: false,         // {"type": "boolean",              "description": "force canvas element instead of video element on non-iOS devices"}
            resetOnEnded: false,        // {"type": "boolean",              "description": "if true set frame to first frame, else set frame to last frame"}
            initBy: 'click',            // {"type": "string",               "description": "custom mouse/touch event to start video"}
            canPause: true,             // {"type": "boolean",              "description": "if true, video pauses on 'initBy' event, else video cannot be paused"}
            fps: 30,                    // {"type": "number",               "description": "frames per second"}
            objectFit: 'cover'          // {"type": "string",               "description": "accepted value: cover, contain, fill, scale-down, none"}
        };

        for (key in this.defaults)
            this.config[key] = custom[key] || this.defaults[key];

        this.element = typeof this.config.container === 'string' ? document.querySelector(this.config.container) : this.config.container;

        try {
            error = function(string){
                err += string + '\n';
            };
            typeOf = function(pair){
                var key;
                for (key in pair)
                    if (typeof this.config[key] !== pair[key])
                        error('Invalid "' + key + '" value. Only ' + pair[key] + ' accepted.');
            }.bind(this);

            if (!this.element)
                err += 'Element is not set or not found.\n';
            else if (!/HTML\w*Element/i.test(this.element))
                err += 'Container is not a DOM Element.\n';

            if (!this.config.src || typeof this.config.src !== 'string')
                err += 'Video source is either not found, invalid, or not set.\n';

            typeOf({
                format: 'string',
                loop: 'boolean',
                delay: 'number',
                audio: 'boolean',
                forceCanvas: 'boolean',
                resetOnEnded: 'boolean',
                initBy: 'string',
                canPause: 'boolean',
                fps: 'number',
                objectFit: 'string',
            });

            if (err !== '')
                throw new Error(err);
        } catch(e){
            console.error(err.replace(/\n$/, ''));
            return;
        }

        // Force canvas on iOS
        this.useCanvas = this.config.forceCanvas || iOS;

        elemRect = this.element.getBoundingClientRect();
        elemStyle = window.getComputedStyle(this.element);

        this.element.style.overflow = 'hidden';
        if (elemStyle.position === 'static')
            this.element.style.position = 'relative';

        // Creating video element
        videoName = this.element.id + (!this.element.id ? '' : '-') + 'VideoMaster';
        this.video = document.createElement('video');
        this.video.setAttribute('id', videoName);
        this.video.style.position = 'absolute';
        this.video.innerHTML = '<source src="' + this.config.src + '" type="video/' + this.config.format + '">';
        this.element.appendChild(this.video);

        // Creating canvas element
        if (this.useCanvas){
            canvasName = videoName + '-canvas';
            this.canvas = document.createElement('canvas');
            this.canvas.setAttribute('id', canvasName);
            this.canvas.style.position = 'absolute';
            this.element.appendChild(this.canvas);

            this.canvas.audio = document.createElement('audio');
            this.canvas.audio.innerHTML = this.video.innerHTML;
            this.element.insertBefore(this.canvas.audio, this.video);

            this.canvas.audio.load();
            this.ctx = this.canvas.getContext('2d');
            
            this.video.addEventListener('timeupdate', this.drawFrame.bind(this));
            this.video.addEventListener('canplay', onCanPlay.bind(this));
        }

        this.video.addEventListener('loadedmetadata', onMetaLoaded.bind(this));
        this.video.addEventListener('ended', onVideoEnded.bind(this));
        this.element.addEventListener(this.config.initBy, this.init.bind(this));
        window.addEventListener('resize', this.updateSize.bind(this));

        this.video.load();

        function onMetaLoaded(){
            this.updateSize();
            this.video.removeEventListener('loadedmetadata', onMetaLoaded);
        }

        function onVideoEnded(){
            var ev;
            
            if (this.config.loop === true)
                this.video.play();
            else {
                this.playing = false;
                if (this.config.resetOnEnded ===  true)
                    this.video.currentTime = 0;
            }
        }
        
        function onCanPlay(){
            this.drawFrame();
            this.video.removeEventListener('canplay', onCanPlay);
        }

    };

    VideoMaster.prototype.init = function(){
        if (!this.__sizeIsSet)
            this.updateSize();

        if (this.__hasInit && this.config.canPause === true){
            this.togglePlay();
            return;
        }

        if (this.useCanvas)
            this.video.style.display = 'none';

        this.__hasInit = true;
        this.play();

        if (this.config.audio === false)
            this.video.volume = 0;
    };

    VideoMaster.prototype.updateSize = function(){
        if (this.video.videoHeight === 0){
            this.__isResized = true;
            return;
        }
            
        var rw, rh, rt, rl, scale, t, l;
        var cw = this.element.clientWidth,
            ch = this.element.clientHeight,
            vw = this.video.videoWidth,
            vh = this.video.videoHeight;

        var adjustLeft = false,
            adjustTop = false;

        this.width = cw;
        this.height = this.config.objectFit ==='cover' ? ch : vh*(cw/vw);

        this.video.setAttribute('width', this.width);
        this.video.setAttribute('height', this.height);
        if (this.useCanvas){
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

        if (!this.useCanvas)
            setSize.call(this, this.video);
        else {
            setSize.call(this, this.canvas);
            // Hide video element after finished using its width and height
            this.video.style.display = 'none';
        }

        this.__sizeIsSet = true;

        function setSize(element){
            element.style.top = t + 'px';
            element.style.left = l + 'px';
            if (this.config.objectFit === 'cover'){
                element.style.width = rw + 'px';
                element.style.height = rh + 'px';
            }
        };
    };

    VideoMaster.prototype.play = function(){
        this.playing = true;

        if (!this.__sizeIsSet)
            this.updateSize();

        if (!this.useCanvas)
            this.video.play();
        else {
            this.lastTime = Date.now();
            this.roll();
            if (this.config.audio !== false)
                this.canvas.audio.play();
        }
    };

    VideoMaster.prototype.pause = function(){
        if (this.config.canPause === false) return;

        this.playing = false;

        if (!this.useCanvas)
            this.video.pause();
        else
            this.canvas.audio.pause();
    };

    VideoMaster.prototype.togglePlay = function(){
        if (this.paused)
            this.play();
        else
            this.pause();
    };

    VideoMaster.prototype.goTo = function(second){
        this.video.currentTime = second;
        if (this.useCanvas)
            this.canvas.audio.currentTime = second;
    };

    // Roll as in roll the frames like a movie
    VideoMaster.prototype.roll = function(){
        var time = Date.now(),
            elapsed = (time - this.lastTime)/1000;

        // Move video frame forward
        if (elapsed >= (1/this.config.fps)){
            this.video.currentTime = this.video.currentTime + elapsed;
            this.lastTime = time;

            // Sync audio with current video frame
            if (this.canvas.audio && Math.abs(this.canvas.audio.currentTime - this.video.currentTime) > 0.3)
                this.sync();
        }

        // Loop this method to imitate video play
        if (this.playing)
            this.animationFrame = window.requestAnimationFrame(this.roll.bind(this));
        else
            window.cancelAnimationFrame(this.animationFrame);
    };

    VideoMaster.prototype.sync = function(){
        this.canvas.audio.currentTime = this.video.currentTime;
    };

    VideoMaster.prototype.drawFrame = function(){
        if (parseInt(this.width) === 0)
            this.updateSize();

        this.ctx.drawImage(this.video, 0, 0, this.width, this.height);
    };
    
    Object.defineProperties(VideoMaster.prototype, {
        currentTime: {
            get: function(){
                return this.video.currentTime;
            },
            set: function(second){
                this.goTo(second);
            }
        },
        paused: {
            get: function(){
                return !this.playing;
            }
        },
        duration: {
            get: function(){
                return this.video.duration;
            }
        }
    });

    window.VideoMaster = VideoMaster;

})();