var AudioEngine = {
  ctx: null,
  bus: null,
  globalGain: null,
  recDest: null,
  noiseBuffers: null,

  init: function () {
    if (this.ctx) return;

    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    this.ctx = new AC();

    this.bus = this.ctx.createGain();
    this.bus.gain.value = 1;

    this.globalGain = this.ctx.createGain();
    this.globalGain.gain.value = 0.9;

    this.bus.connect(this.globalGain);
    this.globalGain.connect(this.ctx.destination);

    this.recDest = this.ctx.createMediaStreamDestination();
    this.globalGain.connect(this.recDest);

    this._makeNoiseBuffers();
  },

  resume: function () {
    this.init();

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  now: function () {
    this.init();
    return this.ctx ? this.ctx.currentTime : 0;
  },

  setGlobalVolume: function (v) {
    this.init();

    if (!this.globalGain || !this.ctx) return;

    this.globalGain.gain.setTargetAtTime(
      clamp(v, 0, 1),
      this.ctx.currentTime,
      0.01
    );
  },

  createGain: function () {
    this.init();
    if (!this.ctx) return null;
    return this.ctx.createGain();
  },

  createSource: function (type, freq) {
    this.init();
    if (!this.ctx) return null;

    if (!isOscWave(type)) {
      var buffer = this.noiseBuffers[type] || this.noiseBuffers.white;

      var src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;

      var filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = Math.max(20, freq || 440);
      filter.Q.value = 1.0;

      src.connect(filter);

      return {
        out: filter,
        start: function (t) {
          src.start(t);
        },
        stop: function (t) {
          try {
            src.stop(t);
          } catch (e) {}
        }
      };
    }

    var osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = Math.max(1, freq || 440);

    return {
      out: osc,
      start: function (t) {
        osc.start(t);
      },
      stop: function (t) {
        try {
          osc.stop(t);
        } catch (e) {}
      }
    };
  },

  _makeNoiseBuffers: function () {
    var sr = this.ctx.sampleRate;
    var len = Math.floor(sr * 2);

    this.noiseBuffers = {};

    var white = this.ctx.createBuffer(1, len, sr);
    var wd = white.getChannelData(0);

    for (var i = 0; i < len; i++) {
      wd[i] = Math.random() * 2 - 1;
    }

    this.noiseBuffers.white = white;

    var brown = this.ctx.createBuffer(1, len, sr);
    var bd = brown.getChannelData(0);
    var last = 0;

    for (i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      bd[i] = last * 3.5;
    }

    this.noiseBuffers.brown = brown;

    var pink = this.ctx.createBuffer(1, len, sr);
    var pd = pink.getChannelData(0);

    var b0 = 0;
    var b1 = 0;
    var b2 = 0;
    var b3 = 0;
    var b4 = 0;
    var b5 = 0;
    var b6 = 0;

    for (i = 0; i < len; i++) {
      var whiteNoise = Math.random() * 2 - 1;

      b0 = 0.99886 * b0 + whiteNoise * 0.0555179;
      b1 = 0.99332 * b1 + whiteNoise * 0.0750759;
      b2 = 0.96900 * b2 + whiteNoise * 0.1538520;
      b3 = 0.86650 * b3 + whiteNoise * 0.3104856;
      b4 = 0.55000 * b4 + whiteNoise * 0.5329522;
      b5 = -0.7616 * b5 - whiteNoise * 0.0168980;

      pd[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + whiteNoise * 0.5362) * 0.11;

      b6 = whiteNoise * 0.115926;
    }

    this.noiseBuffers.pink = pink;
  }
};
