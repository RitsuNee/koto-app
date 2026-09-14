import { Link } from 'react-router-dom';

export default function Learn() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Learn New Content</h1>
      <p className="text-gray-600 mb-6">Dive into new vocabulary, grammar, or reading materials.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-blue-300 cursor-pointer transition-colors">
          <h2 className="text-xl font-semibold text-blue-600">Vocabulary & Kanji</h2>
          <p className="text-gray-500 mt-2">Learn words in context with mnemonics.</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-blue-300 cursor-pointer transition-colors">
          <h2 className="text-xl font-semibold text-blue-600">Reading & Immersion</h2>
          <p className="text-gray-500 mt-2">Read graded articles with native audio.</p>
        </div>
        
        <Link to="/ai-chat" className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-blue-300 cursor-pointer transition-colors md:col-span-2 block">
          <h2 className="text-xl font-semibold text-blue-600">AI Conversation Partner</h2>
          <p className="text-gray-500 mt-2">Practice speaking and writing in realistic roleplay scenarios.</p>
        </Link>
      </div>
    </div>
  );
}
