class VideoMaster {

    constructor(container, config = {}){

        // Adds an identified in error handling
        const err = m => `VideoMaster: ${m}`;


        /* Find container */
        if (!container)
            throw new SyntaxError(err('Container is not specified.'));

        this.container =
            typeof container === 'string'
                ? document.querySelector(string)
                : container;

        if (!this.container)
            throw new TypeError(err(`Container ${container} is not found.`));

        if (Object.getPrototypeOf(this.container.constructor) !== HTMLElement)
            throw new TypeError(err('Container is not a DOM Element.'));


        /* Validate configuration */
        this.config = Object.assign({

            // Default config
            loop: false,
            muted: false,
            volume: 1,
            useCanvas: false,
            forceCanvasOniOS: true, // DEPRECIATED
            resetOnEnded: true,
            trigger: 'click',
            canPause: true,
            shortcut: true,
            seekFactor: 5,
            playsInline: true,
            controls: true,
            allowFullscreen: false,
            src: ''

        }, config);

        // Type checking
        (pair => {
            for (const key in pair)
                if (this.config[key] !== undefined && this.config[key] !== null && this.config[key].constructor !== pair[key])
                    throw new TypeError(err(`Invalid "${key}" property value. Only values of ${pair[key].toString().match(/[A-Z]\w{1,}/)[0]} constructor are accepted.`));
        })({
            loop: Boolean,
            muted: Boolean,
            volume: Number,
            useCanvas: Boolean,
            forceCanvasOniOS: Boolean,
            resetOnEnded: Boolean,
            trigger: String,
            canPause: Boolean,
            shortcut: Boolean,
            seekFactor: Number,
            playsInline: Boolean,
            controls: Boolean,
            allowFullscreen: Boolean,
            src: String
        });


        /* DEPRECIATED: Forcing canvas when appropriate */
        if (this.config.forceCanvasOniOS){
            const isiOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
            this.config.useCanvas = isiOS || this.config.useCanvas;
        }


        /* Initialisation */
        this.__initState();
        this.__tuneEnv();

        this.__createSource();
        this.__createVideo();
        this.__createCanvas();

        this.target = this.audio || this.video;

        this.__createControls();

    }

    __createAudio(){
        if (this.audio) return;
        
        this.audio = document.createElement('audio');
        this.audio.muted = this.state.muted;
        this.audio.volume = this.state.volume;

        this.audio.appendChild(this.source.audio);
        this.container.appendChild(this.audio);

        this.audio.load();
    }

    __createCanvas(){
        if (!this.config.useCanvas || this.canvas) return;

        this.canvas = document.createElement('canvas');
        this.canvas.id = `${this.container.id ? `${this.container.id}-` : ''}VideoMaster`;
        this.canvas.width = this.state.width;
        this.canvas.height = this.state.height;

        this.canvas.style.display = 'block';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '50%';
        this.canvas.style.left = '50%';
        this.canvas.style.webkitTransform = 'translate(-50%, -50%)';
        this.canvas.style.mozTransform = 'translate(-50%, -50%)';
        this.canvas.style.msTransform = 'translate(-50%, -50%)';
        this.canvas.style.oTransform = 'translate(-50%, -50%)';
        this.canvas.style.transform = 'translate(-50%, -50%)';

        this.container.appendChild(this.canvas);

        // { alpha: false } to internally optimize rendering 
        this.ctx = this.canvas.getContext('2d', { alpha: false });

        // Event listener to reflect video frame on canvas
        this.video.addEventListener('timeupdate', this.__drawFrame.bind(this));

        // Draw first frame (cover frame)
        this.video.addEventListener('loadeddata', this.__drawFrame.bind(this));

        this.__createAudio();
    }

    __createControls(){
        if (!this.config.controls || this.controls) return;
        new VideoControls(this);
    }

    __createSource(){
        if (this.source) return;

        this.source = {};
        this.source.video = document.createElement('source');
        this.source.video.src = this.config.src;

        if (!this.config.useCanvas) return;

        this.source.audio = document.createElement('source');
        this.source.audio.src = this.config.src;
    }

    __createStyleSheet(css, scope){
        let style = '';

        for (const tag in css){
            let props = '';

            for (const prop in css[tag])
                props += `${hyphenate(prop)}:${css[tag][prop]};`;

            style += `${scope} ${tag}{${props}}`;
        }

        const sheet = document.createElement('style');
        sheet.setAttribute('rel', 'stylesheet');
        sheet.setAttribute('type', 'text/css');
        sheet.textContent = style;
        document.head.appendChild(sheet);

        // Convert "camelCase" to "camel-case"
        function hyphenate(str){
            const len = str.length;

            let ret = '';

            for (let i = 0; i < len; i++)
                if (isUpperCase(str[i]))
                    ret += `-${str[i].toLowerCase()}`;
                else
                    ret += str[i];

            return ret;
        }

        function isUpperCase(char){
            const code = char.charCodeAt(0);
            return code > 64 && code < 91;
        }
    }

    __createVideo(){
        if (this.video) return;

        this.video = document.createElement('video');
        this.video.volume = this.state.volume;

        if (this.config.useCanvas){

            // Hide video element because it only need to work in background
            this.video.style.display = 'none';
            this.video.muted = true;

        } else {

            // Only apply id to video if no canvas
            // else apply it to canvas
            this.video.id = `${this.container.id ? `${this.container.id}-` : ''}VideoMaster`;

            if (this.state.muted)
                this.video.muted = this.state.muted;

            if (this.config.playsInline)
                this.video.setAttribute('playsinline', '');

            this.video.style.display = 'block';
            this.video.style.width = '100%';
            this.video.style.height = '100%';
            this.video.style.position = 'absolute';
            this.video.style.top = '50%';
            this.video.style.left = '50%';
            this.video.style.webkitTransform = 'translate(-50%, -50%)';
            this.video.style.mozTransform = 'translate(-50%, -50%)';
            this.video.style.msTransform = 'translate(-50%, -50%)';
            this.video.style.oTransform = 'translate(-50%, -50%)';
            this.video.style.transform = 'translate(-50%, -50%)';

        }

        this.video.appendChild(this.source.video);
        this.container.appendChild(this.video);
        
        this.video.addEventListener('ended', this.__onEnded.bind(this));
        this.video.load();
    }

    __drawFrame(){
        this.ctx.drawImage(this.video, 0, 0, this.state.width, this.state.height);
    }

    __initState(){
        this.state = {
            animationFrame: null,
            ended: false,
            height: Math.floor(this.container.clientHeight),
            lastTime: 0,
            muted: this.config.muted,
            playing: false,
            triggered: false,
            tuned: false,
            volume: this.config.volume,
            width: Math.floor(this.container.clientWidth)
        }
    }

    // Only reset what's necessary
    __recalibrateState(){
        this.state.animationFrame = null;
        this.state.ended = false;
        this.state.height = Math.floor(this.container.clientHeight);
        this.state.lastTime = 0;
        this.state.playing = false;
        this.state.triggerd = false;
        this.state.width = Math.floor(this.container.clientWidth);
    }

    __keyboardShortcut(e){
        // Keyboard should not control video before video is triggered.
        if (!this.state.triggered)
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

    __onEnded(e){
        if (e.target !== this.video)
            throw new TypeError('VideoMaster.prototype.onEnded cannot be called out of context.');

        if (this.config.loop)
            this.play();

        else {
            this.state.ended = true;
            this.state.playing = false;

            if (this.config.resetOnEnded)
                this.goTo(0);
        }
    }

    // Roll as in roll the frames like a film
    __roll(){
        const time = Date.now();
        const elapse = (time - this.state.lastTime)/1000;

        // Move video frame forward
        if (elapse >= (1/30)){
            this.video.currentTime += elapse;
            this.state.lastTime = time;

            // Sync audio with current video frame
            if (Math.abs(this.audio.currentTime - this.video.currentTime) > 0.3)
                this.__sync();
        }

        // Loop this method to imitate video play
        if (this.state.playing)
            this.state.animationFrame = window.requestAnimationFrame(this.__roll.bind(this));
        else
            window.cancelAnimationFrame(this.state.animationFrame);
    }

    __sync(){
        this.audio.currentTime = this.video.currentTime;
    }

    __tuneEnv(){
        if (this.state.tuned) return;

        // Make container a positioned element if it's not
        if (window.getComputedStyle(this.container).position === 'static')
            this.container.style.position = 'relative';

        if (this.config.shortcut)
            window.addEventListener('keydown', this.__keyboardShortcut.bind(this));

        this.container.addEventListener(this.config.trigger, this.trigger.bind(this));

        if (this.config.useCanvas)
            window.addEventListener('resize', this.__updateSize.bind(this));
    }

    __updateSize(){
        // These values are used in .__drawFrame()
        this.state.width = Math.floor(this.container.clientWidth);
        this.state.height = Math.floor(this.container.clientHeight);
        if (this.canvas){
            this.canvas.width = this.state.width;
            this.canvas.height = this.state.height;
        }
    }

    goTo(s){
        this.video.currentTime = s;
        if (this.audio)
            this.__sync();
    }

    load(src, forcePause = false){
        if (typeof src !== 'string' || !src)
            throw new TypeError('Video source must be a valid string.');

        const playing = this.state.playing;

        this.__recalibrateState();

        // Update this.source
        // And .load() as appropriate
        for (const type in this.source){
            this.source[type].src = src;
            this[type].load();

            // Autoplay new video only when appropriate
            if (!forcePause && playing)
                this.play();
        }
    }

    pause(){
        if (!this.config.canPause)
            return;

        this.state.playing = false;

        this.target.pause();
    }

    play(){
        this.state.playing = true;

        if (this.state.ended){
            this.state.ended = false;
            this.goTo(0);
        }

        if (this.audio){
            this.state.lastTime = Date.now();
            this.__roll();
        }

        this.target.play();
    }

    togglePlay(){
        if (!this.state.triggered) return;

        return this.state.playing
            ? this.pause()
            : this.play();
    }

    trigger(){
        if (this.state.triggered && this.config.canPause)
            return this.togglePlay();

        this.state.triggered = true;
        this.play();
    }


    get currentTime(){
        return this.video.currentTime;
    }

    set currentTime(s){
        if (typeof s !== 'number')
            throw new TypeError('Property "currentTime" must be type of number.');

        if (s > this.video.duration)
            throw new RangeError('Value of property "currentTime" has exceeded video duration.');

        this.goTo(s);
    }

    get duration(){
        return this.video.duration;
    }

    get muted(){
        return this.state.muted;
    }

    set muted(bool){
        if (typeof bool !== 'boolean')
            throw new TypeError('Property "muted" must be type of boolean.');

        this.state.muted = bool;
        this.target.muted = bool;
    }

    get paused(){
        return !this.state.playing;
    }

    get src(){
        return this.source.video.src;
    }

    set src(str){
        return this.load(str);
    }

    get volume(){
        return this.state.volume;
    }

    set volume(n){
        if (typeof n !== 'number')
            throw new TypeError('Volume must be type of number.');

        if (n < 0 || n > 1)
            throw new RangeError('Volume must be a number between 0 to 1 (inclusive).');

        this.state.volume = n;
        this.target.volume = n;
    }


    /**
     * To imitate event listener binding,
     * so you can call these methods directly on the instance
     */
    addEventListener(){
        this.target.addEventListener.apply(this.target, arguments);
    }

    removeEventListener(){
        this.target.removeEventListener.apply(this.target, arguments);
    }

    on(){
        return this.addEventListener.apply(this, arguments);
    }

    off(){
        return this.removeEventListener.apply(this, arguments);
    }

}

class VideoControls {

    constructor(master){
        this.master = master;
        this.fragment = document.createDocumentFragment();
        this.size = '20px';

        this.__createBackdrop();
        this.__createContainer();
        this.__createTrigger();
        this.__createSeeker();
        this.__createTrack();
        //this.__createVolume();
        this.__createFullscreen();

        this.master.container.appendChild(this.fragment);
    }

    __createBackdrop(){
        this.backdrop = document.createElement('div');

        this.backdrop.style.width = '100%';
        this.backdrop.style.height = '100%';
        this.backdrop.style.position = 'absolute';
        this.backdrop.style.top = '0';
        this.backdrop.style.left = '0';
        this.backdrop.style.backgroundColor = 'rgba(0,0,0,0)';

        this.backdrop.addEventListener('click', this.master.togglePlay.bind(this.master));

        this.fragment.appendChild(this.backdrop);
    }

    __createContainer(){
        this.container = document.createElement('div');

        this.container.style.width = '100%';
        this.container.style.height = this.size;
        this.container.style.backgroundColor = 'rgba(0,0,0,0.5)';
        this.container.style.position = 'absolute';
        this.container.style.bottom = '0';
        this.container.style.left = '0';

        this.backdrop.appendChild(this.container);
    }

    __createTrigger(){
        this.trigger = document.createElement('div');

        this.trigger.style.display = 'inline-block';
        this.trigger.style.verticalAlign = 'middle';
        this.trigger.style.width = this.size;
        this.trigger.style.height = '100%';
        this.trigger.style.lineHeight = this.size;
        this.trigger.style.color = '#fff';
        this.trigger.style.textAlign = 'center';
        this.trigger.style.backgroundColor = 'red';

        this.trigger.addEventListener('click', this.master.togglePlay.bind(this.master));

        this.container.appendChild(this.trigger);
    }

    __createSeeker(){
        this.backward = document.createElement('div');
        this.forward = document.createElement('div');

        this.backward.style.display = 'inline-block';
        this.backward.style.verticalAlign = 'middle';
        this.backward.style.width = this.size;
        this.backward.style.height = '100%';
        this.backward.style.lineHeight = this.size;
        this.backward.style.color = '#fff';
        this.backward.style.textAlign = 'center';
        this.backward.style.backgroundColor = 'green';

        this.forward.style.display = 'inline-block';
        this.forward.style.verticalAlign = 'middle';
        this.forward.style.width = this.size;
        this.forward.style.height = '100%';
        this.forward.style.lineHeight = this.size;
        this.forward.style.color = '#fff';
        this.forward.style.textAlign = 'center';
        this.forward.style.backgroundColor = 'blue';

        this.backward.addEventListener('click', this.master.__keyboardShortcut.bind(this.master, { which: 37 }));
        this.forward.addEventListener('click', this.master.__keyboardShortcut.bind(this.master, { which: 39 }));

        this.container.appendChild(this.backward);
        this.container.appendChild(this.forward);
    }

    __createTrack(){
        this.track = document.createElement('div');
        this.elapsed = document.createElement('div');

        this.track.style.display = 'inline-block';
        this.track.style.verticalAlign = 'middle';
        this.track.style.width = `calc(100% - ${this.size}*${this.master.config.allowFullscreen ? 4 : 3})`;
        this.track.style.height = '100%';
        this.track.style.backgroundColor = 'rgba(0,0,0,0.75)';
        this.track.style.position = 'relative';
        this.container.appendChild(this.track);

        this.elapsed.style.width = '0';
        this.elapsed.style.height = '100%';
        this.elapsed.style.backgroundColor = 'rgba(255,255,255,0.5)';
        this.track.appendChild(this.elapsed);

        this.track.addEventListener('click', e => {
            const width = parseFloat(window.getComputedStyle(this.track).width);
            const eWidth = e.offsetX;
            const perc = eWidth/width;

            this.elapsed.style.width = `${eWidth}px`;
            this.master.currentTime = this.master.duration*perc;
        });

        this.master.addEventListener('timeupdate', e => {
            const perc = this.master.currentTime/this.master.duration;
            this.elapsed.style.width = `${perc*100}%`;
        });
    }

    __createVolume(){
        this.volume = document.createElement('div');
        this.volumeTrack = document.createElement('div');

        this.volume.style.display = 'inline-block';
        this.volume.style.verticalAlign = 'middle';
        this.volume.style.width = this.size;
        this.volume.style.height = '100%';
        this.volume.style.lineHeight = this.size;
        this.volume.style.color = '#fff';
        this.volume.style.textAlign = 'center';
        this.volume.style.backgroundColor = 'purple';
        this.container.appendChild(this.volume);

        this.volumeTrack.style.width = this.size;
    }

    __createFullscreen(){
        if (!this.master.config.allowFullscreen) return;

        this.master.state.fullscreen = false;

        this.fullscreen = document.createElement('div');

        this.fullscreen.style.display = 'inline-block';
        this.fullscreen.style.verticalAlign = 'middle';
        this.fullscreen.style.width = this.size;
        this.fullscreen.style.height = '100%';
        this.fullscreen.style.lineHeight = this.size;
        this.fullscreen.style.color = '#fff';
        this.fullscreen.style.textAlign = 'center';
        this.fullscreen.style.backgroundColor = 'yellow';

        this.master.container.addEventListener('fullscreenchange', () => {
            this.master.state.fullscreen = true;
            this.master.play();
        });
        this.master.container.addEventListener('fullscreenerror', () => {
            console.error('fullscreen error.');
            this.master.state.fullscreen = false;
            this.master.play();
        });

        this.fullscreen.addEventListener('click', () => {
            this.master.pause();

            if (this.master.state.fullscreen)
                document.webkitExitFullscreen();
            else
                this.master.container.requestFullscreen();
        });

        this.container.appendChild(this.fullscreen);
    }

}

module.exports = VideoMaster;