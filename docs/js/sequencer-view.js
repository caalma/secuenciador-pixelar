function SequencerView(container, sequencer, state) {
  this.container = container;
  this.sequencer = sequencer;

  sequencer.attachView(this);

  this.element = null;
  this.canvas = null;
  this.ctx = null;
  this.dirty = true;
  this.sliders = [];

  this.zoom = state && state.zoom ? state.zoom : 15;

  this._buildDOM(state);
  this._bindEvents();
  this.applyAudioSettings();
  this.updateTransportUI();
  this.updateStepIndicator();
  this.markDirty();
}

SequencerView.prototype._el = function (tag, className, text) {
  var el = document.createElement(tag);

  if (className) {
    el.className = className;
  }

  if (text !== undefined) {
    el.textContent = text;
  }

  return el;
};

SequencerView.prototype.getFreq = function () {
  return this.freqSlider.value;
};

SequencerView.prototype.getWave = function () {
  var v = this.waveSelect.value;

  for (var i = 0; i < WAVE_OPTIONS.length; i++) {
    if (WAVE_OPTIONS[i].value === v) return v;
  }

  return 'sine';
};

SequencerView.prototype.getCycle = function () {
  return this.cycleSlider.value;
};

SequencerView.prototype.getGray = function () {
  return Math.round(this.graySlider.value);
};

SequencerView.prototype.getBrush = function () {
  return Math.round(this.brushSlider.value);
};

SequencerView.prototype.getFade = function () {
  return Math.round(this.fadeSlider.value);
};

SequencerView.prototype.getPan = function () {
  return this.panSlider.value;
};

SequencerView.prototype.getFilterMode = function () {
  var v = this.filterSelect.value;

  for (var i = 0; i < FILTER_OPTIONS.length; i++) {
    if (FILTER_OPTIONS[i].value === v) return v;
  }

  return 'off';
};

SequencerView.prototype.getCutoff = function () {
  return this.cutSlider.value;
};

SequencerView.prototype.getQ = function () {
  return this.qSlider.value;
};

SequencerView.prototype.getDelayTime = function () {
  return this.timeSlider.value;
};

SequencerView.prototype.getFeedback = function () {
  return this.fdbkSlider.value;
};

SequencerView.prototype.getDelayMix = function () {
  return this.mixSlider.value;
};

SequencerView.prototype.ctrlHidden = function () {
  return this.controlsDiv.classList.contains('hidden');
};

SequencerView.prototype.markDirty = function () {
  this.dirty = true;
};

SequencerView.prototype.updateStepDurationFromCycle = function () {
  var cycle = this.getCycle();
  var width = this.sequencer.grid.width;
  var ms = width > 0 ? (cycle / width) * 1000 : 100;

  this.sequencer.setStepDuration(ms);
};

SequencerView.prototype.applyAudioSettings = function () {
  this.updateStepDurationFromCycle();

  var fx = this.sequencer.fx;

  fx.setFilterMode(this.getFilterMode());
  fx.setCutoff(this.getCutoff());
  fx.setQ(this.getQ());
  fx.setDelayTime(this.getDelayTime());
  fx.setFeedback(this.getFeedback());
  fx.setMix(this.getDelayMix());
  fx.setPan(this.getPan());
};

SequencerView.prototype._makeSliderGroup = function (labelText, options) {
  var group = this._el('div', 'control-group');
  group.appendChild(this._el('label', '', labelText));

  var slider = new VSlider(options);
  this.sliders.push(slider);

  group.appendChild(slider.getElement());

  return {
    group: group,
    slider: slider
  };
};

SequencerView.prototype._createSelectGroup = function (labelText, options, selected) {
  var group = this._el('div', 'control-group');
  group.appendChild(this._el('label', '', labelText));

  var select = document.createElement('select');

  for (var i = 0; i < options.length; i++) {
    var opt = document.createElement('option');
    opt.value = options[i].value;
    opt.textContent = options[i].label;

    if (options[i].value === selected) {
      opt.selected = true;
    }

    select.appendChild(opt);
  }

  group.appendChild(select);

  return {
    group: group,
    select: select
  };
};

SequencerView.prototype._buildDOM = function (state) {
  var self = this;
  var grid = this.sequencer.grid;

  var dimsValue = grid.width + 'x' + grid.height;

  var grayValue = state && state.gray !== undefined ? state.gray : 255;
  var brushValue = state && state.brush !== undefined ? state.brush : 1;
  var zoomValue = state && state.zoom !== undefined ? state.zoom : this.zoom;
  var freqValue = state && state.freq !== undefined ? state.freq : 220;
  var waveValue = state && state.wave !== undefined ? state.wave : 'sine';
  var cycleValue = state && state.cycle !== undefined ? state.cycle : 2.0;
  var fadeValue = state && state.fade !== undefined ? state.fade : 50;
  var panValue = state && state.pan !== undefined ? state.pan : 0;
  var filterValue = state && state.filterMode !== undefined ? state.filterMode : 'off';
  var cutValue = state && state.cutoff !== undefined ? state.cutoff : 1000;
  var qValue = state && state.q !== undefined ? state.q : 1;
  var timeValue = state && state.delayTime !== undefined ? state.delayTime : 0.25;
  var fdbkValue = state && state.feedback !== undefined ? state.feedback : 0.3;
  var mixValue = state && state.delayMix !== undefined ? state.delayMix : 0;

  this.element = this._el('div', 'grp-sequencer');

  this.deleteBtn = this._el('button', 'delete-btn', 'x');
  this.deleteBtn.title = 'Eliminar pista';
  this.element.appendChild(this.deleteBtn);

  this.ctrlShowBtn = this._el('button', 'ctrlConmute-btn', '=');
  this.ctrlShowBtn.title = 'Mostrar u ocultar controles';
  this.element.appendChild(this.ctrlShowBtn);

  this.miniPlayBtn = this._el('button', 'mini-play-btn', '>');
  this.miniPlayBtn.title = 'Play/Pause';
  this.element.appendChild(this.miniPlayBtn);

  this.controlsDiv = this._el('div', 'grp-control');

  if (state && state.ctrlHidden) {
    this.controlsDiv.classList.add('hidden');
    this.element.classList.add('minimized');
  }

  /* Matrix controls */

  var matrixControls = this._el('div', 'controls');

  var dimsGroup = this._el('div', 'control-group');
  dimsGroup.appendChild(this._el('label', '', 'WxH'));

  this.dimsInput = document.createElement('input');
  this.dimsInput.type = 'text';
  this.dimsInput.value = dimsValue;
  dimsGroup.appendChild(this.dimsInput);

  var zoomG = this._makeSliderGroup('ZOOM', {
    min: 10,
    max: 30,
    step: 1,
    value: zoomValue,
    format: function (v) {
      return Math.round(v) + 'x';
    },
    onChange: function (v) {
      self.zoom = Math.round(v);
      self.markDirty();
    }
  });

  var grayG = this._makeSliderGroup('GRIS', {
    min: 0,
    max: 255,
    step: 1,
    value: grayValue,
    format: function (v) {
      return String(Math.round(v));
    }
  });

  var brushG = this._makeSliderGroup('PINCEL', {
    min: 1,
    max: 10,
    step: 1,
    value: brushValue,
    format: function (v) {
      return String(Math.round(v));
    }
  });

  var matrixButtonsGroup = this._el('div', 'control-group');
  matrixButtonsGroup.appendChild(this._el('label', '', 'MATRIZ'));

  var matrixRow = this._el('div', 'btn-row');

  this.clearBtn = this._el('button', 'small-btn', 'Limpiar');
  this.clearBtn.title = 'Pintar todo de negro';

  this.fillBtn = this._el('button', 'small-btn', 'Rellenar');
  this.fillBtn.title = 'Rellenar con el gris actual';

  matrixRow.appendChild(this.clearBtn);
  matrixRow.appendChild(this.fillBtn);
  matrixButtonsGroup.appendChild(matrixRow);

  matrixControls.appendChild(dimsGroup);
  matrixControls.appendChild(zoomG.group);
  matrixControls.appendChild(grayG.group);
  matrixControls.appendChild(brushG.group);
  matrixControls.appendChild(matrixButtonsGroup);

  /* Sound controls */

  var soundControls = this._el('div', 'controls');

  var waveGroup = this._createSelectGroup('ONDA', WAVE_OPTIONS, waveValue);
  this.waveSelect = waveGroup.select;
  this.waveSelect.title = 'Onda';

  var freqG = this._makeSliderGroup('FREQ', {
    min: 20,
    max: 20000,
    step: 1,
    log: true,
    value: freqValue,
    format: function (v) {
      v = Math.round(v);
      return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(v);
    }
  });

  var cycleG = this._makeSliderGroup('CICLO', {
    min: 0.01,
    max: 20,
    step: 0.01,
    value: cycleValue,
    format: function (v) {
      return v.toFixed(2) + 's';
    },
    onChange: function () {
      self.updateStepDurationFromCycle();
    }
  });

  var fadeG = this._makeSliderGroup('FADE', {
    min: 0,
    max: 100,
    step: 1,
    value: fadeValue,
    format: function (v) {
      return Math.round(v) + '%';
    }
  });

  var panG = this._makeSliderGroup('PAN', {
    min: -1,
    max: 1,
    step: 0.01,
    value: panValue,
    format: function (v) {
      return v.toFixed(2);
    },
    onChange: function (v) {
      self.sequencer.fx.setPan(v);
    }
  });

  var transportGroup = this._el('div', 'control-group');
  transportGroup.appendChild(this._el('label', '', 'TRANSPORTE'));

  var transportRow = this._el('div', 'btn-row');

  this.playPauseBtn = this._el('button', '', 'Play');
  this.playPauseBtn.title = 'Play/Pause';

  this.reverseBtn = this._el('button', '', 'Rev');
  this.reverseBtn.title = 'Invertir direccion';

  this.stopBtn = this._el('button', '', 'Stop');
  this.stopBtn.title = 'Detener y volver al inicio';

  this.muteBtn = this._el('button', 'small-btn', 'M');
  this.muteBtn.title = 'Mute';

  this.soloBtn = this._el('button', 'small-btn', 'S');
  this.soloBtn.title = 'Solo';

  transportRow.appendChild(this.playPauseBtn);
  transportRow.appendChild(this.reverseBtn);
  transportRow.appendChild(this.stopBtn);
  transportRow.appendChild(this.muteBtn);
  transportRow.appendChild(this.soloBtn);
  transportGroup.appendChild(transportRow);

  soundControls.appendChild(waveGroup.group);
  soundControls.appendChild(freqG.group);
  soundControls.appendChild(cycleG.group);
  soundControls.appendChild(fadeG.group);
  soundControls.appendChild(panG.group);
  soundControls.appendChild(transportGroup);

  /* FX controls */

  var fxControls = this._el('div', 'controls');

  var filterGroup = this._createSelectGroup('FILTRO', FILTER_OPTIONS, filterValue);
  this.filterSelect = filterGroup.select;
  this.filterSelect.title = 'Modo de filtro';

  var cutG = this._makeSliderGroup('CUT', {
    min: 20,
    max: 20000,
    step: 1,
    log: true,
    value: cutValue,
    format: function (v) {
      v = Math.round(v);
      return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(v);
    },
    onChange: function (v) {
      self.sequencer.fx.setCutoff(v);
    }
  });

  var qG = this._makeSliderGroup('Q', {
    min: 0.1,
    max: 20,
    step: 0.1,
    log: true,
    value: qValue,
    format: function (v) {
      return v.toFixed(1);
    },
    onChange: function (v) {
      self.sequencer.fx.setQ(v);
    }
  });

  var timeG = this._makeSliderGroup('TIME', {
    min: 0.01,
    max: 1.8,
    step: 0.01,
    value: timeValue,
    format: function (v) {
      return v.toFixed(2) + 's';
    },
    onChange: function (v) {
      self.sequencer.fx.setDelayTime(v);
    }
  });

  var fdbkG = this._makeSliderGroup('FDBK', {
    min: 0,
    max: 0.95,
    step: 0.01,
    value: fdbkValue,
    format: function (v) {
      return Math.round(v * 100) + '%';
    },
    onChange: function (v) {
      self.sequencer.fx.setFeedback(v);
    }
  });

  var mixG = this._makeSliderGroup('MIX', {
    min: 0,
    max: 1,
    step: 0.01,
    value: mixValue,
    format: function (v) {
      return Math.round(v * 100) + '%';
    },
    onChange: function (v) {
      self.sequencer.fx.setMix(v);
    }
  });

  fxControls.appendChild(filterGroup.group);
  fxControls.appendChild(cutG.group);
  fxControls.appendChild(qG.group);
  fxControls.appendChild(timeG.group);
  fxControls.appendChild(fdbkG.group);
  fxControls.appendChild(mixG.group);

  /* Status */

  this.statusLine = this._el('div', 'status-line', '');

  this.controlsDiv.appendChild(matrixControls);
  this.controlsDiv.appendChild(soundControls);
  this.controlsDiv.appendChild(fxControls);
  this.controlsDiv.appendChild(this.statusLine);

  /* Canvas */

  var canvasDiv = this._el('div', 'grp-canvas');

  this.canvas = document.createElement('canvas');
  canvasDiv.appendChild(this.canvas);

  this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

  this.element.appendChild(this.controlsDiv);
  this.element.appendChild(canvasDiv);
  this.container.appendChild(this.element);

  /* References */

  this.zoomSlider = zoomG.slider;
  this.graySlider = grayG.slider;
  this.brushSlider = brushG.slider;
  this.freqSlider = freqG.slider;
  this.cycleSlider = cycleG.slider;
  this.fadeSlider = fadeG.slider;
  this.panSlider = panG.slider;
  this.cutSlider = cutG.slider;
  this.qSlider = qG.slider;
  this.timeSlider = timeG.slider;
  this.fdbkSlider = fdbkG.slider;
  this.mixSlider = mixG.slider;
};

SequencerView.prototype._bindEvents = function () {
  var self = this;
  var drawing = false;
  var erasing = false;

  this.element.addEventListener('click', function () {
    App.focusView(self);
  });

  this.deleteBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    App.removeSequencer(self.sequencer);
  });

  this.ctrlShowBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    self.toggleControls();
  });

  this.miniPlayBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    self.sequencer.togglePlay();
  });

  this.dimsInput.addEventListener('keypress', function (e) {
    if (e.key !== 'Enter') return;

    var value = self.dimsInput.value.trim();
    var match = value.match(/^(\d+)x(\d+)$/);

    if (!match) {
      alert('Formato invalido. Usa WxH, por ejemplo 10x10');
      return;
    }

    var w = parseInt(match[1], 10);
    var h = parseInt(match[2], 10);

    if (w < 1 || h < 1 || w > 100 || h > 100) {
      alert('Las dimensiones deben estar entre 1 y 100.');
      return;
    }

    self.applyResize(w, h);
  });

  this.clearBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    self.sequencer.grid.clear();
    self.markDirty();
  });

  this.fillBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    self.sequencer.grid.fill(self.getGray());
    self.markDirty();
  });

  this.playPauseBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    self.sequencer.togglePlay();
  });

  this.reverseBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    self.sequencer.toggleReverse();
  });

  this.stopBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    self.sequencer.stop();
  });

  this.muteBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    self.sequencer.setMute(!self.sequencer.mute);
  });

  this.soloBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    self.sequencer.setSolo(!self.sequencer.solo);
  });

  this.filterSelect.addEventListener('change', function () {
    self.sequencer.fx.setFilterMode(self.getFilterMode());
  });

  this.canvas.addEventListener('contextmenu', function (e) {
    e.preventDefault();
  });

  this.canvas.addEventListener('mousedown', function (e) {
    e.preventDefault();

    App.focusView(self);
    AudioEngine.resume();

    drawing = true;
    erasing = e.button === 2;

    self.paintAtEvent(e, erasing);
  });

  this.canvas.addEventListener('mousemove', function (e) {
    if (!drawing) return;
    self.paintAtEvent(e, erasing);
  });

  window.addEventListener('mouseup', function () {
    drawing = false;
    erasing = false;
  });

  this.canvas.addEventListener('mouseleave', function () {
    drawing = false;
    erasing = false;
  });
};

SequencerView.prototype.toggleControls = function () {
  this.controlsDiv.classList.toggle('hidden');

  var hidden = this.controlsDiv.classList.contains('hidden');
  this.element.classList.toggle('minimized', hidden);
};

SequencerView.prototype.paintAtEvent = function (e, erase) {
  var rect = this.canvas.getBoundingClientRect();

  if (rect.width === 0 || rect.height === 0) return;

  var scaleX = this.canvas.width / rect.width;
  var scaleY = this.canvas.height / rect.height;

  var displayX = (e.clientX - rect.left) * scaleX;
  var displayY = (e.clientY - rect.top) * scaleY;

  var logicalX = Math.floor(displayX / this.zoom);
  var logicalY = Math.floor(displayY / this.zoom);

  var value = erase ? 0 : this.getGray();

  this.paintAtLogical(logicalX, logicalY, value);
};

SequencerView.prototype.paintAtLogical = function (x, y, value) {
  var grid = this.sequencer.grid;
  var brush = this.getBrush();
  var half = Math.floor(brush / 2);

  for (var dy = -half; dy <= half; dy++) {
    for (var dx = -half; dx <= half; dx++) {
      var nx = x + dx;
      var ny = y + dy;

      if (nx >= 0 && nx < grid.width && ny >= 0 && ny < grid.height) {
        grid.set(ny * grid.width + nx, value);
      }
    }
  }

  this.markDirty();
};

SequencerView.prototype.applyResize = function (newW, newH) {
  var seq = this.sequencer;

  seq.grid.resize(newW, newH);

  var total = seq.getTotal();

  if (total > 0) {
    seq.currentIndex = clamp(seq.currentIndex, 0, total - 1);
  } else {
    seq.currentIndex = 0;
  }

  this.dimsInput.value = newW + 'x' + newH;

  this.updateStepDurationFromCycle();
  this.updateStepIndicator();
  this.markDirty();
};

SequencerView.prototype.updateTransportUI = function () {
  var seq = this.sequencer;
  var text = seq.isPlaying ? '||' : '|>';

  this.playPauseBtn.textContent = text;
  this.miniPlayBtn.textContent = text;

  this.reverseBtn.classList.toggle('active', seq.isReversed);
  this.muteBtn.classList.toggle('active', seq.mute);
  this.soloBtn.classList.toggle('active', seq.solo);
};

SequencerView.prototype.updateStepIndicator = function () {
  var seq = this.sequencer;
  var total = seq.getTotal();
  var current = total > 0 ? seq.currentIndex + 1 : 0;

  this.statusLine.textContent = 'paso ' + current + ' / ' + total;
};

SequencerView.prototype.render = function () {
  var grid = this.sequencer.grid;
  var seq = this.sequencer;

  var w = grid.width;
  var h = grid.height;
  var z = this.zoom;

  var displayWidth = w * z;
  var displayHeight = h * z;

  if (this.canvas.width !== displayWidth) {
    this.canvas.width = displayWidth;
  }

  if (this.canvas.height !== displayHeight) {
    this.canvas.height = displayHeight;
  }

  var ctx = this.ctx;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, displayWidth, displayHeight);

  var playing = seq.isPlaying;
  var activeIndex = seq.activeIndex;
  var currentIndex = seq.currentIndex;

  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var idx = y * w + x;
      var gray = grid.get(idx);

      if (playing && idx === activeIndex) {
        ctx.fillStyle = '#0f0';
      } else if (!playing && idx === currentIndex) {
        ctx.fillStyle = '#06f';
      } else {
        ctx.fillStyle = 'rgb(' + gray + ',' + gray + ',' + gray + ')';
      }

      ctx.fillRect(x * z, y * z, z, z);
    }
  }
};

SequencerView.prototype.destroy = function () {
  RenderLoop.remove(this);

  for (var i = 0; i < this.sliders.length; i++) {
    this.sliders[i].destroy();
  }

  if (this.element && this.element.parentNode) {
    this.element.parentNode.removeChild(this.element);
  }
};
