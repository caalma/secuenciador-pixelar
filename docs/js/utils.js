var BG = 0;

var WAVE_OPTIONS = [
  { value: 'sine', label: 'Sinusoidal' },
  { value: 'triangle', label: 'Triangular' },
  { value: 'square', label: 'Cuadrada' },
  { value: 'sawtooth', label: 'Diente de sierra' },
  { value: 'white', label: 'Ruido blanco' },
  { value: 'pink', label: 'Ruido rosa' },
  { value: 'brown', label: 'Ruido marron' }
];

var FILTER_OPTIONS = [
  { value: 'off', label: 'OFF' },
  { value: 'lp', label: 'LP' },
  { value: 'hp', label: 'HP' },
  { value: 'bp', label: 'BP' }
];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function isOscWave(type) {
  return type === 'sine' || type === 'triangle' || type === 'square' || type === 'sawtooth';
}

function downloadBlob(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1000);
}

function encodeWav(audioBuffer) {
  var numChannels = Math.min(audioBuffer.numberOfChannels, 2);
  var sampleRate = audioBuffer.sampleRate;
  var numFrames = audioBuffer.length;
  var bytesPerSample = 2;
  var blockAlign = numChannels * bytesPerSample;
  var dataSize = numFrames * blockAlign;
  var bufferLength = 44 + dataSize;

  var arrayBuffer = new ArrayBuffer(bufferLength);
  var view = new DataView(arrayBuffer);

  function writeString(offset, str) {
    for (var i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  var channels = [];
  for (var c = 0; c < numChannels; c++) {
    channels.push(audioBuffer.getChannelData(c));
  }

  var offset = 44;

  for (var i = 0; i < numFrames; i++) {
    for (c = 0; c < numChannels; c++) {
      var sample = clamp(channels[c][i], -1, 1);
      var intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}
