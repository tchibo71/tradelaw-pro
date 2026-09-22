import { useState, useEffect, useRef, useCallback } from 'react';

const VOICE_PREF_KEY = 'tradeprolaw_voice_mode';

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const onResultRef = useRef(null);

  const SpeechRecognition = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;
  const isSupported = typeof window !== 'undefined'
    && ('speechSynthesis' in window)
    && !!SpeechRecognition;

  // Load persisted preference
  const [voiceMode, setVoiceMode] = useState(() => {
    try { return localStorage.getItem(VOICE_PREF_KEY) === 'true'; } catch { return false; }
  });

  const toggleVoiceMode = useCallback(() => {
    setVoiceMode(prev => {
      const next = !prev;
      try { localStorage.setItem(VOICE_PREF_KEY, String(next)); } catch {}
      // Stop any active speech when turning off
      if (!next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  }, []);

  const speak = useCallback((text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
  }, []);

  const startListening = useCallback((onResult) => {
    if (!SpeechRecognition || isListening) return;
    onResultRef.current = onResult;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (onResultRef.current) onResultRef.current(transcript);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.onerror = () => {
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }, [SpeechRecognition, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  return {
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    isListening,
    isSupported,
    voiceMode,
    toggleVoiceMode,
  };
}