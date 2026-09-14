import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Play } from 'lucide-react';
import { playVoicevox } from '../audio';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

export default function AiConversation() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'ai', content: 'こんにちは！今日はどんな練習をしますか？ (Hello! What kind of practice would you like to do today?)' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { id: Date.now().toString(), role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const apiKey = localStorage.getItem('aiKey');
      if (!apiKey) {
        throw new Error('API key not found. Please set it in the Settings page.');
      }
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [...messages, userMessage].map(m => ({
            role: m.role === 'ai' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          systemInstruction: {
            parts: [{ text: "You are a Japanese language conversation partner. You should converse naturally in Japanese, adapt to the user's level, and occasionally provide English translations in parentheses for difficult words. If the user makes a significant grammar error, gently correct them." }]
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate response. Check your API key.');
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
      
      const aiMessage = { 
        id: Date.now().toString(), 
        role: 'ai' as const, 
        content: text 
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
      
      // Auto-play the Japanese part of the AI response (stripping English translations inside parentheses if possible, but for now just send the whole thing)
      // Removing english in parentheses for better Japanese TTS
      const japaneseText = text.replace(/\(.*?\)/g, '').trim();
      if (japaneseText) {
        playVoicevox(japaneseText);
      }
      
    } catch (error: any) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: `Error: ${error.message}` }]);
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Conversation</h1>
          <p className="text-gray-500">Practice your Japanese in real-time.</p>
        </div>
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        {/* Chat window */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl p-4 flex gap-3 group ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                {msg.role === 'ai' && (
                  <button 
                    onClick={() => playVoicevox(msg.content.replace(/\(.*?\)/g, '').trim())}
                    className="mt-1 shrink-0 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Play size={16} />
                  </button>
                )}
                <div>{msg.content}</div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl p-4 rounded-bl-none">
                <div className="flex gap-1 items-center h-4">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <form onSubmit={handleSend} className="flex gap-2 relative">
            <button type="button" className="p-3 text-gray-500 hover:text-blue-600 transition-colors rounded-xl bg-white border border-gray-200 shadow-sm">
              <Mic size={20} />
            </button>
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your response in Japanese or Romaji..." 
              className="flex-1 p-3 rounded-xl border border-gray-200 shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="p-3 bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[3rem]"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
