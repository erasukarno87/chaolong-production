/**
 * Voice Input Hook
 * Hands-free operation untuk Input Laporan Shift
 */

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

// Types untuk voice input
interface VoiceCommand {
  type: 'target' | 'ng' | 'downtime' | 'operator' | 'next' | 'previous' | 'help';
  confidence: number;
  transcript: string;
  data?: any;
}

interface VoiceInputState {
  isListening: boolean;
  isSupported: boolean;
  lastCommand?: VoiceCommand;
  error?: string;
}

/**
 * Hook untuk voice input functionality
 */
export function useVoiceInput() {
  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    isSupported: false,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Initialize speech recognition
  const initializeRecognition = useCallback(() => {
    if (typeof window === 'undefined') return false;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setState(prev => ({ ...prev, isSupported: false }));
      return false;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'id-ID'; // Bahasa Indonesia

    recognition.onstart = () => {
      setState(prev => ({ ...prev, isListening: true, error: undefined }));
    };

    recognition.onend = () => {
      setState(prev => ({ ...prev, isListening: false }));
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessage = event.error === 'no-speech' ? 
        'Tidak ada suara terdeteksi' : 
        `Error: ${event.error}`;
      
      setState(prev => ({ 
        ...prev, 
        isListening: false, 
        error: errorMessage 
      }));
      
      toast.error(errorMessage);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      const confidence = event.results[0][0].confidence;

      const command = parseVoiceCommand(transcript);
      
      setState(prev => ({ 
        ...prev, 
        lastCommand: { ...command, confidence, transcript }
      }));

      // Execute command if confidence is high enough
      if (confidence > 0.7) {
        executeCommand(command);
      } else {
        toast.warning('Perintah tidak jelas, coba ulangi');
      }
    };

    recognitionRef.current = recognition;
    setState(prev => ({ ...prev, isSupported: true }));
    return true;
  }, []);

  // Show voice help
  const showVoiceHelp = useCallback(() => {
    toast.info('Voice Commands: "Target 150", "NG 5 scratch", "Downtime 10 machine", "Lanjut", "Kembali", "Bantuan"');
  }, []);

  // Parse voice command
  const parseVoiceCommand = useCallback((transcript: string): VoiceCommand => {
    const text = transcript.toLowerCase();

    // Target commands
    if (text.includes('target') || text.includes('sasaran')) {
      const numbers = text.match(/\d+/);
      if (numbers) {
        return {
          type: 'target',
          confidence: 0.9,
          transcript,
          data: { target: parseInt(numbers[0]) }
        };
      }
    }

    // NG commands
    if (text.includes('ng') || text.includes('cacat') || text.includes('defect')) {
      const numbers = text.match(/\d+/);
      const defectTypes = ['scratch', 'dent', 'chip', 'crack', 'misalignment'];
      const defectType = defectTypes.find(type => text.includes(type));

      return {
        type: 'ng',
        confidence: 0.8,
        transcript,
        data: { 
          quantity: numbers ? parseInt(numbers[0]) : 1,
          defectType: defectType || 'other'
        }
      };
    }

    // Downtime commands
    if (text.includes('downtime') || text.includes('berhenti') || text.includes('mati')) {
      const numbers = text.match(/\d+/);
      const categories = ['machine', 'material', 'quality', 'utility'];
      const category = categories.find(cat => text.includes(cat));

      return {
        type: 'downtime',
        confidence: 0.8,
        transcript,
        data: { 
          duration: numbers ? parseInt(numbers[0]) : 10,
          category: category || 'other'
        }
      };
    }

    // Operator commands
    if (text.includes('operator') || text.includes('pegawai')) {
      const names = text.match(/[a-z]+/g);
      return {
        type: 'operator',
        confidence: 0.7,
        transcript,
        data: { name: names?.[0] || 'unknown' }
      };
    }

    // Navigation commands
    if (text.includes('lanjut') || text.includes('next') || text.includes('berikutnya')) {
      return { type: 'next', confidence: 0.9, transcript };
    }

    if (text.includes('kembali') || text.includes('previous') || text.includes('sebelumnya')) {
      return { type: 'previous', confidence: 0.9, transcript };
    }

    // Help command
    if (text.includes('bantuan') || text.includes('help') || text.includes('tolong')) {
      return { type: 'help', confidence: 0.9, transcript };
    }

    // Default
    return {
      type: 'help',
      confidence: 0.5,
      transcript
    };
  }, []);

  // Execute voice command
  const executeCommand = useCallback((command: VoiceCommand) => {
    switch (command.type) {
      case 'target':
        toast.success(`Target diset: ${command.data.target} pcs`);
        // Trigger callback untuk update target
        break;
      
      case 'ng':
        toast.success(`NG ${command.data.quantity} pcs - ${command.data.defectType}`);
        // Trigger callback untuk add NG entry
        break;
      
      case 'downtime':
        toast.success(`Downtime ${command.data.duration} menit - ${command.data.category}`);
        // Trigger callback untuk add downtime
        break;
      
      case 'operator':
        toast.success(`Operator: ${command.data.name}`);
        // Trigger callback untuk assign operator
        break;
      
      case 'next':
        toast.success('Lanjut ke tahap berikutnya');
        // Trigger callback untuk next step
        break;
      
      case 'previous':
        toast.success('Kembali ke tahap sebelumnya');
        // Trigger callback untuk previous step
        break;
      
      case 'help':
        showVoiceHelp();
        break;
    }
  }, [showVoiceHelp]);

  // Start listening
  const startListening = useCallback(() => {
    if (!state.isSupported) {
      toast.error('Voice input tidak didukung di browser ini');
      return;
    }

    if (!recognitionRef.current) {
      if (!initializeRecognition()) {
        return;
      }
    }

    try {
      recognitionRef.current?.start();
      toast.success('Mendengarkan perintah suara...');
    } catch {
      toast.error('Gagal memulai voice input');
    }
  }, [state.isSupported, initializeRecognition]);

  // Stop listening
  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    toast.success('Voice input dihentikan');
  }, []);

  // Initialize on mount
  useState(() => {
    initializeRecognition();
  });

  return {
    ...state,
    startListening,
    stopListening,
    lastCommand: state.lastCommand,
  };
}

/**
 * Hook untuk barcode scanner integration
 */
export function useBarcodeScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);

  const startScanning = useCallback(async () => {
    setIsScanning(true);
    
    try {
      // Check if camera is available
      await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });

      // Initialize barcode scanner (using QuaggaJS or similar)
      // This is a placeholder for actual barcode scanner implementation
      toast.success('Scanner siap, arahkan ke barcode');
      
      // Simulate scan for demo
      setTimeout(() => {
        const mockBarcode = 'PROD-001-2024';
        setLastScan(mockBarcode);
        setIsScanning(false);
        toast.success(`Barcode terdeteksi: ${mockBarcode}`);
      }, 3000);

    } catch {
      setIsScanning(false);
      toast.error('Tidak dapat mengakses kamera');
    }
  }, []);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    toast.info('Scanner dihentikan');
  }, []);

  return {
    isScanning,
    lastScan,
    startScanning,
    stopScanning,
  };
}

/**
 * Hook untuk photo capture
 */
export function usePhotoCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);

  const capturePhoto = useCallback(async () => {
    setIsCapturing(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });

      // Create video element for capture
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Wait for video to be ready
      await new Promise(resolve => {
        video.onloadedmetadata = resolve;
      });

      // Capture photo
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setLastPhoto(url);
          toast.success('Foto berhasil diambil');
        }
        setIsCapturing(false);
        
        // Stop stream
        stream.getTracks().forEach(track => track.stop());
      }, 'image/jpeg', 0.8);

    } catch {
      setIsCapturing(false);
      toast.error('Tidak dapat mengakses kamera');
    }
  }, []);

  const clearPhoto = useCallback(() => {
    setLastPhoto(null);
  }, []);

  return {
    isCapturing,
    lastPhoto,
    capturePhoto,
    clearPhoto,
  };
}

/**
 * Hook untuk AI-powered suggestions
 */
export function useAISuggestions() {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const generateSuggestions = useCallback(async (context: {
    currentStep: string;
    data: any;
    historical?: any;
  }) => {
    setIsLoading(true);

    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newSuggestions: string[] = [];

      // Generate contextual suggestions
      switch (context.currentStep) {
        case 'setup':
          if (context.data.target > 1000) {
            newSuggestions.push('Target tinggi, pastikan material cukup');
          }
          if (context.data.lineId) {
            newSuggestions.push('Verifikasi skill operator sebelum mulai');
          }
          break;

        case 'output':
          if (context.data.actual < context.data.target * 0.8) {
            newSuggestions.push('Produksi rendah, perlu investigasi penyebab');
          }
          if (context.data.ng > context.data.actual * 0.1) {
            newSuggestions.push('NG rate tinggi, perlu quality check');
          }
          break;

        case 'ng':
          if (context.data.ngEntries.length > 5) {
            newSuggestions.push('NG terlalu banyak, perlu root cause analysis');
          }
          break;

        case 'downtime':
          if (context.data.totalDowntime > 60) {
            newSuggestions.push('Downtime tinggi, perlu maintenance check');
          }
          break;
      }

      setSuggestions(newSuggestions);

    } catch {
      toast.error('Gagal generate suggestions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    suggestions,
    isLoading,
    generateSuggestions,
  };
}
