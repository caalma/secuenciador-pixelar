function Sequencer(grid) {
  this.grid = grid;
  this.view = null;
  this.fx = new TrackFX();

  this.isPlaying = false;
  this.isReversed = false;
  this.currentIndex = 0;
  this.stepDuration = 100;
  this.timeout = null;
  this.activeIndex = -1;
  this.currentVoice = null;

  this.mute = false;
  this.solo = false;
}

Sequencer.prototype.attachView = function (view) {
  this.view = view;
};

Sequencer.prototype.getTotal = function () {
  return this.grid.getLength();
};

Sequencer.prototype.setStepDuration = function (ms) {
  this.stepDuration = Math.max(10, ms);
};

Sequencer.prototype._killCurrent = function () {
  if (!this.currentVoice) return;

  var voice = this.currentVoice;
  this.currentVoice = null;

  try {
    voice.src.stop(AudioEngine.now() + 0.001);
  } catch (e) {}

  try {
    voice.src.out.disconnect();
  } catch (e) {}

  try {
    voice.gain.disconnect();
  } catch (e) {}
};

Sequencer.prototype.playStep = function (index) {
  if (index < 0 || index >= this.getTotal()) return;

  AudioEngine.resume();
  this._killCurrent();

  var gray = this.grid.get(index);
  var volume = Math.max(gray / 255, 0.0001);

  var freq = this.view ? this.view.getFreq() : 440;
  var type = this.view ? this.view.getWave() : 'sine';
  var fadePct = this.view ? this.view.getFade() : 50;
  var fade = clamp(fadePct / 100, 0, 1);

  var stepSecs = Math.max(this.stepDuration / 1000, 0.01);
  var now = AudioEngine.now() + 0.005;
  var stepEnd = now + stepSecs;

  var src = AudioEngine.createSource(type, freq);
  if (!src) return;

  var gain = AudioEngine.createGain();
  if (!gain) return;

  src.out.connect(gain);

  if (this.fx.input) {
    gain.connect(this.fx.input);
  } else if (AudioEngine.ctx) {
    gain.connect(AudioEngine.ctx.destination);
  }

  var attack = Math.max(stepSecs * fade * 0.5, 0.002);
  var release = Math.max(stepSecs * fade * 0.5, 0.005);

  var attackEnd = now + attack;
  var releaseStart = stepEnd - release;
  var minValue = 0.0001;

  var g = gain.gain;

  g.setValueAtTime(minValue, now);

  if (releaseStart > attackEnd) {
    g.exponentialRampToValueAtTime(volume, attackEnd);
    g.setValueAtTime(volume, releaseStart);
    g.exponentialRampToValueAtTime(minValue, stepEnd);
  } else {
    var peakTime = now + stepSecs * 0.3;
    g.exponentialRampToValueAtTime(volume, peakTime);
    g.exponentialRampToValueAtTime(minValue, stepEnd);
  }

  src.start(now);
  src.stop(stepEnd);

  this.currentVoice = {
    src: src,
    gain: gain
  };

  this.activeIndex = index;

  if (this.view) {
    this.view.updateStepIndicator();
    this.view.markDirty();
  }
};

Sequencer.prototype._advance = function () {
  var total = this.getTotal();
  if (total <= 0) return;

  if (this.isReversed) {
    this.currentIndex = this.currentIndex <= 0 ? total - 1 : this.currentIndex - 1;
  } else {
    this.currentIndex = this.currentIndex >= total - 1 ? 0 : this.currentIndex + 1;
  }
};

Sequencer.prototype._schedule = function () {
  if (!this.isPlaying) return;

  this.playStep(this.currentIndex);
  this._advance();

  var self = this;

  this.timeout = setTimeout(function () {
    self._schedule();
  }, this.stepDuration);
};

Sequencer.prototype.start = function () {
  if (this.isPlaying || this.getTotal() === 0) return;

  AudioEngine.resume();

  this.isPlaying = true;
  this.activeIndex = this.currentIndex;

  if (this.view) {
    this.view.updateTransportUI();
  }

  if (typeof App !== 'undefined' && App.refreshGlobalTransport) {
    App.refreshGlobalTransport();
  }

  this._schedule();
};

Sequencer.prototype.pause = function () {
  if (!this.isPlaying) return;

  this.isPlaying = false;

  if (this.timeout) {
    clearTimeout(this.timeout);
    this.timeout = null;
  }

  this._killCurrent();
  this.activeIndex = -1;

  if (this.view) {
    this.view.updateTransportUI();
    this.view.updateStepIndicator();
    this.view.markDirty();
  }

  if (typeof App !== 'undefined' && App.refreshGlobalTransport) {
    App.refreshGlobalTransport();
  }
};

Sequencer.prototype.togglePlay = function () {
  if (this.isPlaying) {
    this.pause();
  } else {
    this.start();
  }
};

Sequencer.prototype.stop = function () {
  this.pause();

  this.currentIndex = this.isReversed ? this.getTotal() - 1 : 0;

  if (this.view) {
    this.view.updateStepIndicator();
    this.view.markDirty();
  }
};

Sequencer.prototype.toggleReverse = function () {
  this.isReversed = !this.isReversed;

  if (!this.isPlaying) {
    this.currentIndex = this.isReversed ? this.getTotal() - 1 : 0;
  }

  if (this.view) {
    this.view.updateTransportUI();
    this.view.updateStepIndicator();
    this.view.markDirty();
  }
};

Sequencer.prototype.alignToZero = function () {
  var wasPlaying = this.isPlaying;

  if (this.timeout) {
    clearTimeout(this.timeout);
    this.timeout = null;
  }

  this.currentIndex = 0;
  this._killCurrent();

  if (wasPlaying) {
    this.isPlaying = true;
    this.activeIndex = 0;
    this._schedule();
  } else {
    this.activeIndex = -1;
  }

  if (this.view) {
    this.view.updateStepIndicator();
    this.view.updateTransportUI();
    this.view.markDirty();
  }
};

Sequencer.prototype.setMute = function (value) {
  this.mute = !!value;

  if (typeof App !== 'undefined' && App.updateTrackAudibilityAll) {
    App.updateTrackAudibilityAll();
  }

  if (this.view) {
    this.view.updateTransportUI();
  }
};

Sequencer.prototype.setSolo = function (value) {
  this.solo = !!value;

  if (typeof App !== 'undefined' && App.updateTrackAudibilityAll) {
    App.updateTrackAudibilityAll();
  }

  if (this.view) {
    this.view.updateTransportUI();
  }
};

Sequencer.prototype.getState = function () {
  var view = this.view;

  return {
    width: this.grid.width,
    height: this.grid.height,
    pixelData: this.grid.toJSON(),
    zoom: view ? view.zoom : 15,
    isReversed: this.isReversed,
    currentIndex: this.currentIndex,
    gray: view ? view.getGray() : 255,
    brush: view ? view.getBrush() : 1,
    freq: view ? view.getFreq() : 220,
    wave: view ? view.getWave() : 'sine',
    cycle: view ? view.getCycle() : 2.0,
    fade: view ? view.getFade() : 50,
    pan: view ? view.getPan() : 0,
    filterMode: view ? view.getFilterMode() : 'off',
    cutoff: view ? view.getCutoff() : 1000,
    q: view ? view.getQ() : 1,
    delayTime: view ? view.getDelayTime() : 0.25,
    feedback: view ? view.getFeedback() : 0.3,
    delayMix: view ? view.getDelayMix() : 0,
    mute: this.mute,
    solo: this.solo,
    ctrlHidden: view ? view.ctrlHidden() : false
  };
};
