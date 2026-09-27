var RenderLoop = {
  views: [],
  running: false,

  add: function (view) {
    if (this.views.indexOf(view) === -1) {
      this.views.push(view);
      this._ensure();
    }
  },

  remove: function (view) {
    var idx = this.views.indexOf(view);
    if (idx >= 0) {
      this.views.splice(idx, 1);
    }
  },

  _ensure: function () {
    if (this.running) return;

    this.running = true;

    var self = this;
    requestAnimationFrame(function () {
      self._tick();
    });
  },

  _tick: function () {
    for (var i = 0; i < this.views.length; i++) {
      var view = this.views[i];

      if (view.dirty) {
        view.render();
        view.dirty = false;
      }
    }

    if (this.views.length > 0) {
      var self = this;
      requestAnimationFrame(function () {
        self._tick();
      });
    } else {
      this.running = false;
    }
  }
};
