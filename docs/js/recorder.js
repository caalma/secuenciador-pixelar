var Recorder = {
  recording: false,
  mediaRecorder: null,
  chunks: [],

  isSupported: function () {
    return typeof MediaRecorder !== 'undefined';
  },

  start: function () {
    if (this.recording || !this.isSupported()) return;

    AudioEngine.resume();

    if (!AudioEngine.recDest) {
      alert('Audio no disponible.');
      return;
    }

    var stream = AudioEngine.recDest.stream;
    var options = {};

    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm')) {
      options.mimeType = 'audio/webm';
    }

    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(stream, options);

    var self = this;

    this.mediaRecorder.ondataavailable = function (e) {
      if (e.data && e.data.size > 0) {
        self.chunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = function () {
      self._finish();
    };

    this.mediaRecorder.start(250);
    this.recording = true;
  },

  stop: function () {
    if (!this.recording || !this.mediaRecorder) return;

    this.recording = false;

    try {
      this.mediaRecorder.stop();
    } catch (e) {}
  },

  _finish: function () {
    if (!AudioEngine.ctx) {
      alert('Audio no disponible.');
      return;
    }

    var mime = this.mediaRecorder && this.mediaRecorder.mimeType ? this.mediaRecorder.mimeType : 'audio/webm';
    var blob = new Blob(this.chunks, { type: mime });

    blob.arrayBuffer()
      .then(function (arrayBuffer) {
        return AudioEngine.ctx.decodeAudioData(arrayBuffer);
      })
      .then(function (audioBuffer) {
        var wavBlob = encodeWav(audioBuffer);
        downloadBlob(wavBlob, 'secuenciador-grabacion.wav');
      })
      .catch(function (err) {
        console.error(err);
        alert('No se pudo generar el archivo WAV.');
      });
  }
};
