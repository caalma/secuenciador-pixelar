var App = {
  container: null,
  sequencers: [],
  views: [],
  focusedIndex: -1,
  autoSync: false,
  globalVolSlider: null,

  init: function () {
    this.container = document.getElementById('sequencers-container');

    var self = this;

    /* Global volume */

    var volHost = document.getElementById('global-volume');

    var volLabel = document.createElement('label');
    volLabel.textContent = 'VOL';

    this.globalVolSlider = new VSlider({
      min: 0,
      max: 1,
      step: 0.01,
      value: 0.9,
      below: true,
      format: function (v) {
        return Math.round(v * 100) + '%';
      },
      onChange: function (v) {
        AudioEngine.setGlobalVolume(v);
      }
    });

    volHost.appendChild(volLabel);
    volHost.appendChild(this.globalVolSlider.getElement());

    AudioEngine.setGlobalVolume(0.9);

    /* Toolbar */

    document.getElementById('add-sequencer').addEventListener('click', function () {
      self.addSequencer(null, false);
    });

    document.getElementById('global-play-btn').addEventListener('click', function () {
      self.globalToggle();
    });

    document.getElementById('sync-switch').addEventListener('change', function (e) {
      self.autoSync = !!e.target.checked;

      if (self.autoSync) {
        self.alignAllToZero();
      }
    });

    document.getElementById('export-btn').addEventListener('click', function () {
      self.exportProject();
    });

    document.getElementById('import-btn').addEventListener('click', function () {
      document.getElementById('import-file').click();
    });

    document.getElementById('import-file').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (file) self.importProject(file);
      e.target.value = '';
    });

    var recBtn = document.getElementById('rec-btn');

    recBtn.addEventListener('click', function () {
      if (Recorder.recording) {
        Recorder.stop();
        recBtn.classList.remove('recording');
        recBtn.textContent = 'REC';
      } else {
        if (!Recorder.isSupported()) {
          alert('La grabacion no esta soportada en este navegador.');
          return;
        }

        Recorder.start();
        recBtn.classList.add('recording');
        recBtn.textContent = 'REC grabando';
      }
    });

    HelpPanel.init();
    KeyboardManager.init();

    this.addSequencer(null, true);
    this.refreshGlobalTransport();
  },

  addSequencer: function (state, skipSync) {
    var width = state && state.width > 0 ? state.width : 10;
    var height = state && state.height > 0 ? state.height : 10;

    var data = null;

    if (state && Array.isArray(state.pixelData)) {
      data = new Uint8Array(width * height);

      for (var i = 0; i < data.length; i++) {
        var v = state.pixelData[i];
        data[i] = typeof v === 'number' ? clamp(Math.floor(v), 0, 255) : BG;
      }
    }

    var grid = new PixelGrid(width, height, data);
    var sequencer = new Sequencer(grid);

    if (state) {
      sequencer.isReversed = !!state.isReversed;
      sequencer.currentIndex = clamp(state.currentIndex || 0, 0, sequencer.getTotal() - 1);
      sequencer.mute = !!state.mute;
      sequencer.solo = !!state.solo;
    }

    var view = new SequencerView(this.container, sequencer, state);

    this.sequencers.push(sequencer);
    this.views.push(view);

    RenderLoop.add(view);

    this.setFocused(this.views.length - 1);
    this.updateTrackAudibilityAll();
    this.refreshGlobalTransport();

    if (this.autoSync && !skipSync) {
      this.alignAllToZero();
    }

    return sequencer;
  },

  removeSequencer: function (sequencer) {
    var idx = this.sequencers.indexOf(sequencer);
    if (idx === -1) return;

    sequencer.pause();
    sequencer.fx.dispose();

    var view = this.views[idx];
    view.destroy();

    this.sequencers.splice(idx, 1);
    this.views.splice(idx, 1);

    if (this.views.length === 0) {
      this.focusedIndex = -1;
    } else {
      this.setFocused(Math.min(idx, this.views.length - 1));
    }

    this.updateTrackAudibilityAll();
    this.refreshGlobalTransport();
  },

  clearAll: function () {
    var copy = this.sequencers.slice();

    for (var i = 0; i < copy.length; i++) {
      this.removeSequencer(copy[i]);
    }
  },

  focusView: function (view) {
    var idx = this.views.indexOf(view);
    if (idx >= 0) this.setFocused(idx);
  },

  setFocused: function (index) {
    if (this.views.length === 0) {
      this.focusedIndex = -1;
      return;
    }

    this.focusedIndex = ((index % this.views.length) + this.views.length) % this.views.length;

    for (var i = 0; i < this.views.length; i++) {
      this.views[i].element.classList.toggle('focused', i === this.focusedIndex);
    }
  },

  moveFocus: function (delta) {
    if (this.views.length === 0) return;
    this.setFocused(this.focusedIndex + delta);
  },

  globalToggle: function () {
    var anyPlaying = this.sequencers.some(function (s) {
      return s.isPlaying;
    });

    if (anyPlaying) {
      for (var i = 0; i < this.sequencers.length; i++) {
        this.sequencers[i].pause();
      }
    } else {
      if (this.autoSync) {
        this.alignAllToZero();
      }

      for (i = 0; i < this.sequencers.length; i++) {
        this.sequencers[i].start();
      }
    }

    this.refreshGlobalTransport();
  },

  alignAllToZero: function () {
    for (var i = 0; i < this.sequencers.length; i++) {
      this.sequencers[i].alignToZero();
    }
  },

  updateTrackAudibilityAll: function () {
    var anySolo = this.sequencers.some(function (s) {
      return s.solo;
    });

    for (var i = 0; i < this.sequencers.length; i++) {
      var s = this.sequencers[i];
      var audible = !s.mute && (!anySolo || s.solo);

      s.fx.setAudible(audible);
    }
  },

  refreshGlobalTransport: function () {
    var btn = document.getElementById('global-play-btn');
    if (!btn) return;

    var anyPlaying = this.sequencers.some(function (s) {
      return s.isPlaying;
    });

    btn.textContent = anyPlaying ? 'All Pause' : 'All Play';
  },

  exportProject: function () {
    var state = this.sequencers.map(function (seq) {
      return seq.getState();
    });

    var json = JSON.stringify(state, null, 2);
    var blob = new Blob([json], { type: 'application/json' });

    downloadBlob(blob, 'secuenciador-pixelar.json');
  },

  importProject: function (file) {
    var self = this;
    var reader = new FileReader();

    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);

        if (!Array.isArray(data)) {
          throw new Error('Formato invalido');
        }

        self.clearAll();

        for (var i = 0; i < data.length; i++) {
          self.addSequencer(data[i], true);
        }

        if (self.autoSync) {
          self.alignAllToZero();
        }

        if (self.views.length > 0) {
          self.setFocused(0);
        }

        self.updateTrackAudibilityAll();
        self.refreshGlobalTransport();
      } catch (err) {
        console.error(err);
        alert('Error al importar el archivo JSON.');
      }
    };

    reader.readAsText(file);
  }
};
