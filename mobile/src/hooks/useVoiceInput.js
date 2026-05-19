import { useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import Voice from '@react-native-voice/voice';
import Audio from '../services/audio';

const VOICE_START_TIMEOUT_MS = 4000;

export function useVoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    return () => {
      Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
    };
  }, []);

  const startListening = async (onResult) => {
    setError(null);
    setPartialText('');

    // Request mic permission before touching the Voice API.
    // On iOS the permission dialog only appears once; subsequent calls
    // return the cached result. Without this, Voice.start() silently
    // does nothing when permission hasn't been granted yet.
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(
          'Microphone access required',
          'Go to Settings → AI Expense Tracker and enable Microphone.',
        );
        return;
      }
    } catch (permErr) {
      // Non-fatal: some environments don't expose the permission API.
      console.warn('[useVoiceInput] permission request failed:', permErr.message);
    }

    let didStart = false;

    Voice.onSpeechStart = () => {
      didStart = true;
      setIsListening(true);
    };
    Voice.onSpeechEnd = () => setIsListening(false);
    Voice.onSpeechPartialResults = (e) => setPartialText(e.value?.[0] || '');
    Voice.onSpeechResults = (e) => {
      const text = e.value?.[0] || '';
      setPartialText('');
      setIsListening(false);
      if (text) onResult(text);
    };
    Voice.onSpeechError = (e) => {
      const code = e.error?.code;
      setPartialText('');
      setIsListening(false);
      // code 5 = no speech detected (user silence) — not worth surfacing
      if (code !== '5' && code !== 5) {
        setError(e.error?.message || 'Speech recognition failed');
      }
    };

    try {
      const available = await Voice.isAvailable();
      if (!available) {
        if (__DEV__ && Platform.OS === 'ios') {
          setError('Voice input is not supported on the iOS Simulator. Test on a real device.');
        } else {
          Alert.alert('Not available', 'Speech recognition is not available on this device.');
        }
        return;
      }

      await Voice.start('en-US');

      // If onSpeechStart never fires, the native layer silently dropped the
      // request — common on simulator even when isAvailable() returns true.
      setTimeout(() => {
        if (!didStart) {
          Voice.cancel().catch(() => {});
          if (__DEV__) {
            setError('Voice did not start — try a real device. Simulator has limited speech support.');
          } else {
            setError('Could not start recording. Please try again.');
          }
        }
      }, VOICE_START_TIMEOUT_MS);
    } catch (e) {
      setError(e.message || 'Could not start voice recognition');
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
    } catch (e) {
      setError(e.message || 'Could not stop');
      setIsListening(false);
    }
  };

  return { isListening, partialText, error, startListening, stopListening };
}
