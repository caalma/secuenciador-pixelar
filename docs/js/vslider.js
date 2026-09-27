function VSlider(options) {
  this.min = options.min !== undefined ? options.min : 0;
  this.max = options.max !== undefined ? options.max : 1;
  this.step = options.step !== undefined ? options.step : 0;
  this.log = !!options.log;

  this.format = options.format || function (v) {
    return String(Math.round(v));
  };

  this.onChange = options.onChange || function () {};

  this.value = this._sanitize(options.value !== undefined ? options.value : this.min);
  this.opened = false;
  this.dragging = false;

  this._build(!!options.below);
  this._updateUI();

  var self = this;

  this._docHandler = function (e) {
    if (self.opened && !self.el.contains(e.target)) {
      self.close();
    }
  };

  document.addEventListener('mousedown', this._docHandler, true);
}

VSlider.prototype.getElement = function () {
  return this.el;
};

VSlider.prototype._sanitize = function (v) {
  v = parseFloat(v);

  if (!isFinite(v)) {
    v = this.min;
  }

  if (this.log && v <= 0) {
    v = Math.max(this.min, 0.000001);
  }

  v = clamp(v, this.min, this.max);

  if (this.step > 0) {
    v = Math.round(v / this.step) * this.step;
  }

  return v;
};

VSlider.prototype._normToValue = function (norm) {
  norm = clamp(norm, 0, 1);

  if (this.log && this.min > 0 && this.max > 0) {
    var a = Math.log(this.min);
    var b = Math.log(this.max);
    return Math.exp(a + (b - a) * norm);
  }

  return this.min + (this.max - this.min) * norm;
};

VSlider.prototype._valueToNorm = function (value) {
  if (this.log && this.min > 0 && this.max > 0 && value > 0) {
    return (Math.log(value) - Math.log(this.min)) / (Math.log(this.max) - Math.log(this.min));
  }

  if (this.max === this.min) {
    return 0;
  }

  return (value - this.min) / (this.max - this.min);
};

VSlider.prototype._build = function (below) {
  var self = this;

  this.el = document.createElement('div');
  this.el.className = 'vslider';

  this.btn = document.createElement('button');
  this.btn.type = 'button';
  this.btn.className = 'vslider-btn';
  this.btn.title = 'Click para ajustar';

  this.popup = document.createElement('div');
  this.popup.className = 'vslider-popup' + (below ? ' below' : '');

  this.track = document.createElement('div');
  this.track.className = 'vtrack';

  this.fill = document.createElement('div');
  this.fill.className = 'vfill';

  this.handle = document.createElement('div');
  this.handle.className = 'vhandle';

  this.num = document.createElement('input');
  this.num.type = 'number';
  this.num.className = 'vnum';
  this.num.min = String(this.min);
  this.num.max = String(this.max);
  this.num.step = this.step > 0 ? String(this.step) : 'any';

  this.track.appendChild(this.fill);
  this.track.appendChild(this.handle);
  this.popup.appendChild(this.track);
  this.popup.appendChild(this.num);
  this.el.appendChild(this.btn);
  this.el.appendChild(this.popup);

  this.popup.classList.add('hidden');

  this.btn.addEventListener('click', function () {
    self.toggle();
  });

  this.track.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    self.dragging = true;

    try {
      self.track.setPointerCapture(e.pointerId);
    } catch (err) {}

    self._updateFromPointer(e);
  });

  this.track.addEventListener('pointermove', function (e) {
    if (self.dragging) {
      self._updateFromPointer(e);
    }
  });

  this.track.addEventListener('pointerup', function (e) {
    self.dragging = false;

    try {
      self.track.releasePointerCapture(e.pointerId);
    } catch (err) {}
  });

  this.track.addEventListener('pointercancel', function () {
    self.dragging = false;
  });

  this.num.addEventListener('input', function () {
    var v = parseFloat(self.num.value);
    if (isFinite(v)) {
      self.setValue(v, true);
    }
  });

  this.num.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      self.close();
      self.btn.focus();
      e.preventDefault();
    } else if (e.key === 'Escape') {
      self.close();
      e.preventDefault();
    }
  });
};

VSlider.prototype._updateFromPointer = function (e) {
  var rect = this.track.getBoundingClientRect();
  if (rect.height <= 0) return;

  var norm = 1 - ((e.clientY - rect.top) / rect.height);
  this.setValue(this._normToValue(norm), true);
};

VSlider.prototype.setValue = function (v, notify) {
  v = this._sanitize(v);
  this.value = v;
  this._updateUI();

  if (notify !== false) {
    this.onChange(this.value);
  }
};

VSlider.prototype._updateUI = function () {
  this.btn.textContent = this.format(this.value);

  if (document.activeElement !== this.num) {
    this.num.value = String(Math.round(this.value * 1000) / 1000);
  }

  var norm = this._valueToNorm(this.value);
  if (!isFinite(norm)) norm = 0;

  var pct = clamp(norm * 100, 0, 100);

  this.fill.style.height = pct + '%';
  this.handle.style.bottom = pct + '%';
};

VSlider.prototype.open = function () {
  if (this.opened) return;

  this.opened = true;
  this.popup.classList.remove('hidden');
  this.num.focus();
  this.num.select();
};

VSlider.prototype.close = function () {
  if (!this.opened) return;

  this.opened = false;
  this.popup.classList.add('hidden');
};

VSlider.prototype.toggle = function () {
  if (this.opened) {
    this.close();
  } else {
    this.open();
  }
};

VSlider.prototype.focus = function () {
  this.open();
  this.btn.focus();
};

VSlider.prototype.destroy = function () {
  document.removeEventListener('mousedown', this._docHandler, true);
};
