import { useState, useEffect } from 'react';

export default function Settings() {
  const [aiKey, setAiKey] = useState('');
  const [voicevoxUrl, setVoicevoxUrl] = useState('http://localhost:50021');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setAiKey(localStorage.getItem('aiKey') || '');
    setVoicevoxUrl(localStorage.getItem('voicevoxUrl') || 'http://localhost:50021');
  }, []);

  const handleSave = () => {
    localStorage.setItem('aiKey', aiKey);
    localStorage.setItem('voicevoxUrl', voicevoxUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">AI Integration</h2>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gemini / OpenAI API Key</label>
          <input 
            type="password"
            value={aiKey}
            onChange={(e) => setAiKey(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="sk-..."
          />
          <p className="text-xs text-gray-500 mt-1">Your key is stored locally in your browser.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Audio / Voicevox</h2>
          <label className="block text-sm font-medium text-gray-700 mb-1">Voicevox API URL</label>
          <input 
            type="text"
            value={voicevoxUrl}
            onChange={(e) => setVoicevoxUrl(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Default is localhost:50021 (make sure Voicevox is running locally).</p>
        </div>

        <button 
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
