var KeyboardManager = {
  init: function () {
    var self = this;

    document.addEventListener('keydown', function (e) {
      self.handle(e);
    });
  },

  handle: function (e) {
    var tag = e.target.tagName;

    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
      return;
    }

    if (e.key === 'ArrowUp') {
      App.moveFocus(-1);
      e.preventDefault();
      return;
    }

    if (e.key === 'ArrowDown') {
      App.moveFocus(1);
      e.preventDefault();
      return;
    }

    var idx = App.focusedIndex;
    if (idx < 0) return;

    var seq = App.sequencers[idx];
    if (!seq) return;

    var view = seq.view;

    switch (e.key.toLowerCase()) {
      case 'p':
        seq.togglePlay();
        e.preventDefault();
        break;

      case 'r':
        seq.toggleReverse();
        e.preventDefault();
        break;

      case 's':
        seq.stop();
        e.preventDefault();
        break;

      case 'delete':
      case 'backspace':
        App.removeSequencer(seq);
        e.preventDefault();
        break;

      case 'o':
        view.waveSelect.focus();
        e.preventDefault();
        break;

      case 'f':
        view.freqSlider.focus();
        e.preventDefault();
        break;

      case 'c':
        view.cycleSlider.focus();
        e.preventDefault();
        break;

      case 'd':
        view.dimsInput.focus();
        e.preventDefault();
        break;

      case 'l':
        view.graySlider.focus();
        e.preventDefault();
        break;

      case 'a':
        view.brushSlider.focus();
        e.preventDefault();
        break;

      case 'z':
        view.zoomSlider.focus();
        e.preventDefault();
        break;
    }
  }
};
