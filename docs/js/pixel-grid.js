function PixelGrid(width, height, data) {
  this.width = width;
  this.height = height;

  this.data = data && data.length === width * height
    ? data
    : new Uint8Array(width * height).fill(BG);
}

PixelGrid.prototype.getLength = function () {
  return this.data.length;
};

PixelGrid.prototype.get = function (index) {
  return this.data[index];
};

PixelGrid.prototype.set = function (index, value) {
  this.data[index] = value;
};

PixelGrid.prototype.clear = function () {
  this.data.fill(BG);
};

PixelGrid.prototype.fill = function (value) {
  this.data.fill(value);
};

PixelGrid.prototype.resize = function (newW, newH) {
  var newData = new Uint8Array(newW * newH);

  var oldW = this.width;
  var oldH = this.height;

  var copyW = Math.min(oldW, newW);
  var copyH = Math.min(oldH, newH);

  for (var y = 0; y < copyH; y++) {
    for (var x = 0; x < copyW; x++) {
      newData[y * newW + x] = this.data[y * oldW + x];
    }
  }

  this.width = newW;
  this.height = newH;
  this.data = newData;
};

PixelGrid.prototype.toJSON = function () {
  return Array.from(this.data);
};
