import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Mic, MicOff, Image, Send, Loader2, Volume2, VolumeX, Bot, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getAIAdvice, AI_SYSTEM_PROMPT } from '../api/ai';

function Message({ msg, onSpeak }) {
  const { isRTL } = useApp();
  const isUser = msg.role === 'user';

  return (
    <div className={`flex flex-col max-w-[80%] ${isUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
      <div
        className={`p-4 rounded-2xl shadow-sm ${
          isUser
            ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white rounded-br-none'
            : 'bg-white border border-stone-200 text-stone-800 rounded-bl-none'
        }`}
      >
        {msg.image && (
          <img src={msg.image} alt="Uploaded crop" className="w-full max-w-sm rounded-xl mb-3 object-cover" />
        )}
        {msg.text && (
          <p
            className={`whitespace-pre-wrap leading-relaxed text-sm ${!isUser ? 'text-right' : ''}`}
            dir={!isUser ? 'rtl' : 'auto'}
          >
            {msg.text}
          </p>
        )}
      </div>
      {!isUser && (
        <button
          onClick={() => onSpeak(msg.text)}
          className="mt-2 p-1.5 text-stone-400 hover:text-emerald-600 transition-colors rounded-full hover:bg-emerald-50"
          title="Listen"
        >
          <Volume2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function AIAdvisor() {
  const { t, isRTL } = useApp();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  // Initialize speech recognition - runs once
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'ur-PK';
      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setInput(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      };
      rec.onerror = () => {
        setIsListening(false);
        toast.error('Voice recognition failed. Please try again.');
      };
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
    }

    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      stopSpeaking();
    };
  }, []); // Only run once - no deps

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.stop();
      synthRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speakText = useCallback(async (text) => {
    stopSpeaking();
    if (!text) return;
    setIsSpeaking(true);
    try {
      const cleaned = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = 'ur-PK';
      utterance.rate = 0.9;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      synthRef.current = window.speechSynthesis;
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  }, [stopSpeaking]);

  const toggleMic = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      try { recognitionRef.current.stop(); } catch {}
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        // If already started, abort and restart
        try {
          recognitionRef.current.abort();
          setTimeout(() => {
            try { recognitionRef.current.start(); setIsListening(true); } catch {}
          }, 200);
        } catch {}
      }
    }
  }, [isListening]);

  const handleImageUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result);
    reader.readAsDataURL(file);
    // Reset file input so same file can be selected again
    e.target.value = '';
  }, []);

  const handleSend = useCallback(async (e) => {
    e?.preventDefault();
    if (!input.trim() && !image) return;

    const userMsg = { role: 'user', text: input, image: image || undefined };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setImage(null);
    setLoading(true);

    try {
      const apiMessages = [
        { role: 'system', content: AI_SYSTEM_PROMPT },
      ];

      if (image) {
        apiMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: input || 'Please analyze this crop image and identify any diseases.' },
            { type: 'image_url', image_url: { url: image } },
          ],
        });
      } else {
        apiMessages.push({ role: 'user', content: input });
      }

      const reply = await getAIAdvice({ messages: apiMessages });
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      speakText(reply);
    } catch (err) {
      console.error('AI Advisor Error:', err);
      const errorMsg = isRTL
        ? 'معذرت، اس وقت سروس دستیاب نہیں ہے۔ براہ کرم بعد میں دوبارہ کوشش کریں۔'
        : 'Sorry, the service is currently unavailable. Please try again later.';
      toast.error('AI service failed: ' + (err.message || 'Unknown error'));
      setMessages(prev => [...prev, { role: 'assistant', text: errorMsg }]);
    } finally {
      setLoading(false);
    }
  }, [input, image, speakText, isRTL]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-900">{t('aiAdvisor')}</h2>
          <p className="text-xs text-stone-500">
            {isRTL ? 'فصلوں کی بیماری اور علاج کی گائیڈ' : 'Crop Disease & Treatment Guide'}
          </p>
        </div>
        {isSpeaking && (
          <button
            onClick={stopSpeaking}
            className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors flex items-center gap-2"
          >
            <VolumeX className="w-4 h-4" />
            <span className="text-xs font-bold">{isRTL ? 'آڈیو روکیں' : 'Stop Audio'}</span>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-stone-50/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <p className="font-bold text-stone-700">
                {isRTL ? 'میں آج آپ کی کیا مدد کر سکتا ہوں؟' : 'How can I help you today?'}
              </p>
              <p className="text-sm text-stone-500 max-w-xs mx-auto mt-2">
                {isRTL
                  ? 'اپنی فصل کی تصویر اپ لوڈ کریں، سوال لکھیں، یا اردو میں بولنے کے لیے مائیکروفون استعمال کریں۔'
                  : 'Upload a crop picture, type a question, or use the microphone to speak in Urdu.'}
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <Message key={i} msg={msg} onSpeak={speakText} />
          ))
        )}

        {loading && (
          <div className="flex items-center gap-2 text-stone-500 bg-white p-4 rounded-2xl rounded-bl-none border border-stone-200 w-fit shadow-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Analyzing...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-stone-100">
        {/* Image preview */}
        {image && (
          <div className="mb-3 relative inline-block">
            <img src={image} alt="Preview" className="h-20 w-20 object-cover rounded-xl border-2 border-emerald-500" />
            <button
              onClick={() => setImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-end gap-2">
          {/* Hidden file input */}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageUpload}
          />

          {/* Image button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-stone-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors shrink-0"
          >
            <Image className="w-6 h-6" />
          </button>

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('typeMessage')}
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
              rows={1}
              dir="auto"
            />
            {/* Mic button inside input */}
            <button
              type="button"
              onClick={toggleMic}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-colors ${
                isListening
                  ? 'text-red-500 bg-red-50 animate-pulse'
                  : 'text-stone-400 hover:text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={(!input.trim() && !image) || loading}
            className="p-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-md"
          >
            <Send className="w-6 h-6" />
          </button>
        </form>
      </div>
    </div>
  );
}
