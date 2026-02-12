// Lightweight wrapper that prefers `expo-audio` and falls back to `expo-av`.
// Exposes the small subset of `Audio` we use: permission request, setAudioMode,
// `Recording` class and `RECORDING_OPTIONS_PRESET_HIGH_QUALITY`.

let Module = null;
let source = null;
let Constants = null;
try {
  // eslint-disable-next-line global-require
  Constants = require('expo-constants');
} catch (e) {
  Constants = null;
}
const isExpoGo = Constants && Constants.appOwnership === 'expo';

// If running in Expo Go prefer `expo-av` (bundled). Otherwise prefer `expo-audio`.
if (isExpoGo) {
  try {
    // eslint-disable-next-line global-require
    Module = require('expo-av');
    source = 'expo-av';
  } catch (e) {
    try {
      // eslint-disable-next-line global-require
      Module = require('expo-audio');
      source = 'expo-audio';
    } catch (err) {
      Module = null;
      source = null;
    }
  }
} else {
  try {
    // eslint-disable-next-line global-require
    Module = require('expo-audio');
    source = 'expo-audio';
  } catch (e) {
    try {
      // eslint-disable-next-line global-require
      Module = require('expo-av');
      source = 'expo-av';
    } catch (err) {
      Module = null;
      source = null;
    }
  }
}

const noModuleError = () => new Error('No native audio module available. Install expo-audio (or expo-av) and rebuild dev client.');

// Find Recording constructor and preset options across module shapes
const Recording = Module && (Module.Recording || (Module.Audio && Module.Audio.Recording) || null);
const RECORDING_OPTIONS_PRESET_HIGH_QUALITY = Module && (Module.RECORDING_OPTIONS_PRESET_HIGH_QUALITY || (Module.Audio && Module.Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY)) || {
  android: { extension: '.wav', outputFormat: 2, audioEncoder: 2, sampleRate: 44100, numberOfChannels: 1, bitRate: 128000 },
  ios: { extension: '.m4a', outputFormat: 0, audioQuality: 0, sampleRate: 44100, numberOfChannels: 1, bitRate: 128000 },
};

module.exports = {
  _source: source,
  requestPermissionsAsync: async () => {
    if (!Module) throw noModuleError();
    if (typeof Module.requestPermissionsAsync === 'function') return Module.requestPermissionsAsync();
    if (typeof Module.requestRecordingPermissionsAsync === 'function') return Module.requestRecordingPermissionsAsync();
    if (typeof Module.requestMicrophonePermissionsAsync === 'function') return Module.requestMicrophonePermissionsAsync();
    return { granted: true };
  },
  setAudioModeAsync: async (opts) => {
    if (!Module) throw noModuleError();
    if (typeof Module.setAudioModeAsync === 'function') return Module.setAudioModeAsync(opts);
    if (Module.Audio && typeof Module.Audio.setAudioModeAsync === 'function') return Module.Audio.setAudioModeAsync(opts);
    return null;
  },
  Recording: Recording || (function StubRecording() {
    throw noModuleError();
  }),
  RECORDING_OPTIONS_PRESET_HIGH_QUALITY,
};
