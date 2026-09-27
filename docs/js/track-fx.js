function TrackFX() {
  this.mode = 'off';

  AudioEngine.init();

  var ctx = AudioEngine.ctx;

  if (!ctx) {
    this.input = null;
    this.filter = null;
    this.delay = null;
    this.feedback = null;
    this.dry = null;
    this.wet = null;
    this.sum = null;
    this.muteSolo = null;
    this.panner = null;
    this.output = null;
    return;
  }

  this.input = ctx.createGain();
  this.filter = ctx.createBiquadFilter();
  this.delay = ctx.createDelay(2.0);
  this.feedback = ctx.createGain();
  this.dry = ctx.createGain();
  this.wet = ctx.createGain();
  this.sum = ctx.createGain();
  this.muteSolo = ctx.createGain();
  this.panner = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
  this.output = ctx.createGain();

  this.input.connect(this.filter);

  this.filter.connect(this.dry);
  this.dry.connect(this.sum);

  this.filter.connect(this.delay);
  this.delay.connect(this.wet);
  this.wet.connect(this.sum);

  this.delay.connect(this.feedback);
  this.feedback.connect(this.delay);

  this.sum.connect(this.muteSolo);
  this.muteSolo.connect(this.panner);
  this.panner.connect(this.output);
  this.output.connect(AudioEngine.bus);

  this.setFilterMode('off');
  this.setCutoff(1000);
  this.setQ(1);
  this.setDelayTime(0.25);
  this.setFeedback(0.3);
  this.setMix(0);
  this.setPan(0);
  this.setAudible(true);
}

TrackFX.prototype._time = function () {
  return AudioEngine.ctx ? AudioEngine.ctx.currentTime : 0;
};

TrackFX.prototype.setFilterMode = function (mode) {
  this.mode = mode;

  if (!this.filter) return;

  if (mode === 'lp') {
    this.filter.type = 'lowpass';
  } else if (mode === 'hp') {
    this.filter.type = 'highpass';
  } else if (mode === 'bp') {
    this.filter.type = 'bandpass';
  } else {
    this.filter.type = 'allpass';
  }

  if (mode === 'off') {
    this.filter.frequency.setTargetAtTime(20000, this._time(), 0.01);
    this.filter.Q.setTargetAtTime(0.0001, this._time(), 0.01);
  }
};

TrackFX.prototype.setCutoff = function (v) {
  if (!this.filter) return;

  this.filter.frequency.setTargetAtTime(
    clamp(v, 20, 20000),
    this._time(),
    0.01
  );
};

TrackFX.prototype.setQ = function (v) {
  if (!this.filter) return;

  this.filter.Q.setTargetAtTime(
    clamp(v, 0.0001, 30),
    this._time(),
    0.01
  );
};

TrackFX.prototype.setDelayTime = function (v) {
  if (!this.delay) return;

  this.delay.delayTime.setTargetAtTime(
    clamp(v, 0.01, 1.8),
    this._time(),
    0.01
  );
};

TrackFX.prototype.setFeedback = function (v) {
  if (!this.feedback) return;

  this.feedback.gain.setTargetAtTime(
    clamp(v, 0, 0.95),
    this._time(),
    0.01
  );
};

TrackFX.prototype.setMix = function (v) {
  if (!this.dry || !this.wet) return;

  v = clamp(v, 0, 1);

  this.dry.gain.setTargetAtTime(1 - v, this._time(), 0.01);
  this.wet.gain.setTargetAtTime(v, this._time(), 0.01);
};

TrackFX.prototype.setPan = function (v) {
  if (this.panner && this.panner.pan) {
    this.panner.pan.setTargetAtTime(
      clamp(v, -1, 1),
      this._time(),
      0.01
    );
  }
};

TrackFX.prototype.setAudible = function (audible) {
  if (!this.muteSolo) return;

  this.muteSolo.gain.setTargetAtTime(
    audible ? 1 : 0,
    this._time(),
    0.01
  );
};

TrackFX.prototype.dispose = function () {
  var nodes = [
    this.input,
    this.filter,
    this.delay,
    this.feedback,
    this.dry,
    this.wet,
    this.sum,
    this.muteSolo,
    this.panner,
    this.output
  ];

  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i]) {
      try {
        nodes[i].disconnect();
      } catch (e) {}
    }
  }
};
