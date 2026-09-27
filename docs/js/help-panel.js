var HelpPanel = {
  panel: null,

  init: function () {
    this.panel = document.getElementById('help-panel');

    var self = this;

    document.getElementById('help-btn').addEventListener('click', function () {
      self.toggle();
    });

    document.getElementById('help-close').addEventListener('click', function () {
      self.hide();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        self.hide();
      }
    });
  },

  toggle: function () {
    if (this.panel.classList.contains('hidden')) {
      this.show();
    } else {
      this.hide();
    }
  },

  show: function () {
    this.panel.classList.remove('hidden');
  },

  hide: function () {
    this.panel.classList.add('hidden');
  }
};
