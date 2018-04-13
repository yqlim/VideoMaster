'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {

    'use strict';

    // Works like Object.defineProperties

    var define = function define(obj, desc) {
        for (var prop in desc) {
            Object.defineProperty(obj, prop, desc[prop]);
        }
    };

    // Create descriptor
    var describe = function describe(value) {
        var writable = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
        var enumerable = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        var configurable = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
        return {
            value: value, writable: writable, enumerable: enumerable, configurable: configurable
        };
    };

    var VideoMaster = function () {
        function VideoMaster(config) {
            var _this = this;

            _classCallCheck(this, VideoMaster);

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
                    onended: function onended() {}
                }),
                ctx: describe(null, true),
                element: describe(null, true),
                video: describe(null, true),
                canvas: describe(null, true),
                width: describe(0, true),
                height: describe(0, true)
            });

            // Use custom config
            for (var key in config) {
                this.config[key] = config[key];
            }

            try {

                var err = [];

                var error = function error(string) {
                    err.push(string);
                };
                var checkType = function checkType(pair) {
                    for (var _key in pair) {
                        if (_typeof(_this.config[_key]) !== pair[_key]) error('Invalid "' + _key + '" value. Only ' + pair[_key] + ' accepted.');
                    }
                };

                this.element = typeof this.config.container === 'string' ? document.querySelector(this.config.container) : this.config.container;

                if (!this.element) error('Container is not set or not found.');else if (Object.getPrototypeOf(this.element.constructor) !== HTMLElement) error('Container is not a DOM Element.');

                if (!this.config.src) error('Video source is not set.');else if (typeof this.config.src !== 'string') error('Video source must be a string.');

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

                if (err.length) throw err;
            } catch (err) {
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = err[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var msg = _step.value;

                        console.error(msg);
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator.return) {
                            _iterator.return();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }

                return;
            }

            // Force canvas on iOS device
            var isiOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
            this.config.useCanvas = isiOS || this.config.useCanvas;

            // Force this.element overflow and position style
            this.element.style.overflow = 'hidden';
            if (window.getComputedStyle(this.element).position === 'static') this.element.style.position = 'relative';

            // Creates video element
            var videoName = (this.element.id ? this.element.id + '-' : '') + 'VideoMaster';
            var videoFormat = this.config.src.split('.').pop();

            this.video = document.createElement('video');
            this.video.setAttribute('id', videoName);
            this.video.style.position = 'absolute';
            this.video.innerHTML = '<source src="' + this.config.src + '" type="video/' + videoFormat + '">';
            this.element.appendChild(this.video);

            // Creates canvas element if needed
            // In some system (i.e. iOS), this will not trigger system default video playing behaviour (i.e. fullscreen)
            if (this.config.useCanvas) {
                // Canvas element to play frames
                var canvasName = videoName + '-canvas';
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

            function onMetaLoaded() {
                this.updateSize();
            }

            function onVideoEnded() {
                this.state.playing = false;
                this.state.ended = true;

                if (this.config.loop === true) {
                    this.goTo(0);
                    this.play();
                } else {
                    this.state.playing = false;
                    if (this.config.resetOnEnded === true) this.goTo(0);
                }
            }
        }

        _createClass(VideoMaster, [{
            key: 'init',
            value: function init(e) {
                if (!this.state.sized) this.updateSize();

                if (this.config.canPause === true && this.state.inited) {
                    this.togglePlay();
                    return;
                }

                if (this.config.useCanvas) this.video.style.display = 'none';

                this.state.inited = true;
                this.play();
            }
        }, {
            key: 'updateSize',
            value: function updateSize() {
                if (this.video.videoHeight === 0) {
                    this.state.resized = true;
                    return;
                }

                var rw = void 0,
                    rh = void 0,
                    rt = void 0,
                    rl = void 0,
                    scale = void 0,
                    t = void 0,
                    l = void 0;
                var cw = this.element.clientWidth,
                    ch = this.element.clientHeight,
                    vw = this.video.videoWidth,
                    vh = this.video.videoHeight;

                var adjustLeft = false,
                    adjustTop = false;


                this.width = cw;
                this.height = this.config.objectFit !== 'cover' ? vh * (cw / vw) : ch;

                this.video.setAttribute('width', this.width);
                this.video.setAttribute('height', this.height);
                if (this.config.useCanvas) {
                    this.canvas.setAttribute('width', this.width);
                    this.canvas.setAttribute('height', this.height);
                }

                if (this.config.objectFit === 'cover') {

                    scale = cw / vw;
                    if (vh * scale < ch) {
                        scale = ch / vh;
                        rw = vw * scale;
                        rh = ch;
                        t = 0;
                        adjustLeft = true;
                    } else {
                        rw = cw;
                        rh = vh * scale;
                        l = 0;
                        adjustTop = true;
                    }
                } else if (this.config.objectFit === 'contain') {

                    scale = cw / vw;
                    if (vh * scale > ch) {
                        scale = ch / vh;
                        rw = vw * scale;
                        rh = ch;
                        t = 0;
                        adjustLeft = true;
                    } else {
                        rw = cw;
                        rh = vh * scale;
                        l = 0;
                        adjustTop = true;
                    }
                }

                if (adjustTop) t = (ch - rh) / 2;

                if (adjustLeft) l = (cw - rw) / 2;

                if (!this.config.useCanvas) setSize.call(this, this.video);else {
                    setSize.call(this, this.canvas);
                    // Hide video element because it is not needed in layout anymore
                    this.video.style.display = 'none';
                }

                this.state.sized = true;

                function setSize(element) {
                    element.style.top = t + 'px';
                    element.style.left = l + 'px';
                    if (this.config.objectFit === 'cover') {
                        element.style.width = rw + 'px';
                        element.style.height = rh + 'px';
                    }
                }
            }
        }, {
            key: 'play',
            value: function play() {
                this.state.playing = true;

                if (!this.state.sized) this.updateSize();

                if (this.state.ended) {
                    this.state.ended = false;
                    this.goTo(0);
                }

                if (!this.config.useCanvas) {

                    this.video.play();
                    if (this.config.audio === false) this.video.muted = true;
                } else {

                    this.state.lastTime = Date.now();
                    this.roll();
                    this.canvas.audio.play();
                    if (this.config.audio === false) this.canvas.audio.muted = true;
                }
            }
        }, {
            key: 'pause',
            value: function pause() {
                if (this.config.canPause === false) return;

                this.state.playing = false;

                if (!this.config.useCanvas) this.video.pause();else this.canvas.audio.pause();
            }
        }, {
            key: 'togglePlay',
            value: function togglePlay() {
                if (!this.state.playing) this.play();else this.pause();
            }
        }, {
            key: 'goTo',
            value: function goTo(second) {
                this.video.currentTime = second;
                if (this.config.useCanvas) this.canvas.audio.currentTime = second;
            }

            // Roll as in roll the frames like a movie film

        }, {
            key: 'roll',
            value: function roll() {
                var time = Date.now(),
                    elapsed = (time - this.state.lastTime) / 1000;

                // Move video frame forward
                if (elapsed >= 1 / 30) {
                    this.video.currentTime += elapsed;
                    this.state.lastTime = time;

                    // Sync audio with current video frame
                    if (this.canvas.audio && Math.abs(this.canvas.audio.currentTime - this.video.currentTime) > 0.3) this.sync();
                }

                // Loop this method to imitate video play
                if (this.state.playing) this.state.animationFrame = window.requestAnimationFrame(this.roll.bind(this));else window.cancelAnimationFrame(this.state.animationFrame);
            }
        }, {
            key: 'sync',
            value: function sync() {
                this.canvas.audio.currentTime = this.video.currentTime;
            }
        }, {
            key: 'drawFrame',
            value: function drawFrame() {
                if (parseInt(this.width) === 0) this.updateSize();

                // Draw the current frame onto canvas
                this.ctx.drawImage(this.video, 0, 0, this.width, this.height);
            }

            // To imitate event listener binding, so you can call these methods to the instance instead of the object

        }, {
            key: 'addEventListener',
            value: function addEventListener() {
                var elem = this.config.useCanvas ? this.canvas : this.video;
                elem.addEventListener.apply(elem, arguments);
            }

            // Same reason as above

        }, {
            key: 'removeEventListener',
            value: function removeEventListener() {
                var elem = this.config.useCanvas ? this.canvas : this.video;
                elem.removeEventListener.apply(elem, arguments);
            }

            // Just to be convenient to jQuery or other library users

        }, {
            key: 'on',
            value: function on() {
                this.addEventListener.apply(this, arguments);
            }

            // Same reason as above

        }, {
            key: 'off',
            value: function off() {
                this.removeEventListener.apply(this, arguments);
            }
        }, {
            key: 'volume',
            get: function get() {
                return this.config.useCanvas ? this.canvas.audio.volume : this.video.volume;
            },
            set: function set(vol) {
                vol = parseFloat(vol);

                if (isNaN(vol) || vol > 1 || vol < 0) return console.error('Volume must be a number between 0 to 1');

                if (this.config.useCanvas) this.canvas.audio.volume = vol;else this.video.volume = vol;
            }
        }, {
            key: 'currentTime',
            get: function get() {
                return this.video.currentTime;
            },
            set: function set(second) {
                this.goTo(second);
            }
        }, {
            key: 'paused',
            get: function get() {
                return !this.state.playing;
            }
        }, {
            key: 'duration',
            get: function get() {
                return this.video.duration;
            }
        }]);

        return VideoMaster;
    }();

    window.VideoMaster = VideoMaster;
})();
