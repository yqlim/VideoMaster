(function(){

    'use strict';

    var VideoMaster = function(config){

        var error = '';

        var i,
            paused,
            videoName,
            canvasName,
            elemRect,
            elemStyle,
            iOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

        this.inited = false;
        this.sizeSet = false;
        this.resized = false;
        this.playing = false;
        this.useCanvas = false;
        this.ctx = undefined;
        this.element = undefined;
        this.video = undefined;
        this.canvas = undefined;
        this.animationFrame = undefined;
        this.lastTime = 0;
        this.width = 0;
        this.height = 0;

        this.defaults = {
            container: undefined,       // {"type": "HTMLElement",          "description": "container element of VideoMaster"}
            src: undefined,             // {"type": "string",               "description": "video path"}
            loop: false,                // {"type": "boolean",              "description": "loop video onended"}
            delay: false,               // {"type": "number || boolean",    "description": "delay video start time in milliseconds"}
            audio: true,                // {"type": "boolean",              "description": "mute video, cannot be unmuted"}
            forceCanvas: false,         // {"type": "boolean",              "description": "force canvas element instead of video element on non-iOS devices"}
            resetOnEnded: false,        // {"type": "boolean",              "description": "if true set frame to first frame, else set frame to last frame"}
            initBy: 'click',            // {"type": "string",               "description": "custom mouse/touch event to start video"}
            canPause: true,             // {"type": "boolean",              "description": "if true, video pause on 'initBy' event, else video cannot be paused"}
            fps: 30,                    // {"type": "number",               "description": "frames per second"}
            objectFit: 'cover'          // {"type": "string",               "description": "accepted value: cover, contain, fill, scale-down, none"}
        };

        // Extending default values and user config
        this.config = function(out){
            var i = 1,
                len = arguments.length,
                key,
                obj;
            out = out || {};
            for (; i < len; i++){
                obj = arguments[i];
                if (!obj) continue;
                for (key in obj)
                    if (obj.hasOwnProperty(key))
                        out[key] = (typeof obj[key] === 'object' && !/(HTML(\w{0,})Element)|Array/i.test(obj[key].constructor)) ? extend(out[key], obj[key])
                                                                                                                                : obj[key];
            }
            return out;
        }({}, this.defaults, config);

        this.element = this.config.container && /HTML\w{0,}Element/i.test(this.config.container.constructor) ? this.config.container : document.querySelector(this.config.container);

        try {
            if (!this.element)
                error += 'Element is not set or not found.\n';
            if (!this.config.src)
                error += 'No video source detected.\n';
            if (typeof this.config.src !== 'string')
                error += 'Invalid video source value.\n';
            if (typeof this.config.loop !== 'boolean')
                error += 'Invalid "loop" value. Only boolean accepted.\n';
            if (typeof this.config.delay !== 'number' && this.config.delay !== false)
                error += 'Invalid "delay" value. Only value of type "number" or false boolean accepted.\n';
            if (typeof this.config.audio !== 'boolean')
                error += 'Invalid "audio" value. Only boolean accepted.\n';
            if (typeof this.config.forceCanvas !== 'boolean')
                error += 'Invalid "forceCanvas" value. Only boolean accepted.\n';
            if (typeof this.config.resetOnEnded !== 'boolean')
                error += 'Invalid "resetOnEnded" value. Only boolean accepted.\n';
            if (typeof this.config.initBy !== 'string')
                error += 'Invalid "initBy" value. Only string.accepted.\n';
            if (typeof this.config.canPause !== 'boolean')
                error += 'Invalid "canPause" value. Only boolean accepted.\n';
            if (error !== '')
                throw new Error(error);
        } catch(e){
            console.error(error.replace(/\n$/, ''));
            return;
        }

        // Force canvas on iOS
        this.useCanvas = this.config.forceCanvas || iOS;

        elemRect = this.element.getBoundingClientRect();
        elemStyle = window.getComputedStyle(this.element);

        this.element.style.overflow = 'hidden';
        if (elemStyle.position === 'static') this.element.style.position = 'relative';

        // Creating video element
        videoName = this.element.id + (this.element.id.length > 0 ? '-' : '') + 'VideoMaster';
        this.video = document.createElement('video');
        this.video.setAttribute('id', videoName);
        this.video.style.position = 'absolute';
        this.video.innerHTML = '<source src="' + this.config.src + '" type="video/mp4">';
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
        if (!this.sizeSet) this.updateSize();
        if (this.inited && this.config.canPause === true){
            this.togglePlay();
            return;
        }
        if (this.useCanvas) this.video.style.display = 'none';
        this.inited = true;
        this.play();
        if (this.config.audio === false) this.video.volume = 0;
    };

    VideoMaster.prototype.updateSize = function(){
        if (this.video.videoHeight == 0){
            this.resized = true;
            return;
        }
            
        var rw, rh, rt, rl, scale, t, l;
        var cw = this.element.clientWidth,
            ch = this.element.clientHeight,
            vw = this.video.videoWidth,
            vh = this.video.videoHeight;

        var adjustLeft = false,
            adjustTop = false;

        this.width = this.element.clientWidth;
        this.height = this.element.clientHeight;
        if (this.useCanvas){
            this.canvas.setAttribute('width', this.width);
            this.canvas.setAttribute('height', this.height);
        }

        if (this.config.objectFit == 'cover'){

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

        } else if (this.config.objectFit == 'contain'){

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
            t = (ch - rw)/2;

        if (adjustLeft)
            l = (cw - rw)/2;
        
        setSize(this.useCanvas ? this.canvas : this.video);

        this.sizeSet = true;

        function setSize(element){
            element.style.top = t + 'px';
            element.style.left = l + 'px';
            element.style.width = rw + 'px';
            element.style.height = rh + 'px';
        }
    };

    VideoMaster.prototype.play = function(){
        this.playing = true;

        if (!this.sizeSet) this.updateSize();

        if (!this.useCanvas)
            this.video.play();
        else {
            this.lastTime = Date.now();
            this.roll();
            if (this.config.audio !== false) this.canvas.audio.play();
        }
    };

    VideoMaster.prototype.pause = function(){
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

    VideoMaster.prototype.roll = function(){
        var ev,
            time = Date.now(),
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
            this.animationFrame = requestAnimationFrame(function(){
                this.roll();
            }.bind(this));
        else
            cancelAnimationFrame(this.animationFrame);
    };

    VideoMaster.prototype.sync = function(){
        this.audio.currentTime = this.video.currentTime;
    };

    VideoMaster.prototype.drawFrame = function(){
        if (parseInt(this.width) === 0) this.updateSize();
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