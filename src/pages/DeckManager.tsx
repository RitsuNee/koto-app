import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Trash2, Plus } from 'lucide-react';

export default function DeckManager() {
  const [deckName, setDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);

  const decks = useLiveQuery(() => db.decks.toArray());
  const flashcards = useLiveQuery(
    () => (selectedDeckId ? db.flashcards.where({ deckId: selectedDeckId }).toArray() : []),
    [selectedDeckId]
  );

  const addDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckName) return;
    await db.decks.add({ name: deckName, description: deckDescription });
    setDeckName('');
    setDeckDescription('');
  };

  const addFlashcard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!front || !back || !selectedDeckId) return;
    await db.flashcards.add({
      deckId: selectedDeckId,
      front,
      back,
      interval: 0,
      repetition: 0,
      efactor: 2.5,
      dueDate: new Date().toISOString()
    });
    setFront('');
    setBack('');
  };

  const deleteDeck = async (id: number) => {
    await db.decks.delete(id);
    await db.flashcards.where({ deckId: id }).delete();
    if (selectedDeckId === id) setSelectedDeckId(null);
  };

  const deleteFlashcard = async (id: number) => {
    await db.flashcards.delete(id);
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <h1 className="text-3xl font-bold mb-6">Custom Decks</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1">
        
        {/* Left Column: Decks */}
        <div className="md:col-span-1 border-r border-gray-200 pr-8 flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Your Decks</h2>
          
          <form onSubmit={addDeck} className="mb-6 space-y-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <input 
              className="w-full p-2 border border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500" 
              placeholder="Deck Name" 
              value={deckName} 
              onChange={e => setDeckName(e.target.value)} 
              required
            />
            <input 
              className="w-full p-2 border border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500" 
              placeholder="Description (Optional)" 
              value={deckDescription} 
              onChange={e => setDeckDescription(e.target.value)} 
            />
            <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2">
              <Plus size={16} /> Create Deck
            </button>
          </form>

          <div className="space-y-2 overflow-y-auto flex-1">
            {decks?.length === 0 && <p className="text-gray-400 text-sm">No decks created yet.</p>}
            {decks?.map(deck => (
              <div 
                key={deck.id} 
                onClick={() => setSelectedDeckId(deck.id!)}
                className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center transition-colors ${selectedDeckId === deck.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-blue-300'}`}
              >
                <div>
                  <h3 className="font-medium text-gray-800">{deck.name}</h3>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteDeck(deck.id!); }}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Cards */}
        <div className="md:col-span-2 flex flex-col">
          {!selectedDeckId ? (
            <div className="flex items-center justify-center h-full text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
              Select a deck to manage its flashcards.
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-4">
                Flashcards in {decks?.find(d => d.id === selectedDeckId)?.name}
              </h2>
              
              <form onSubmit={addFlashcard} className="mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex gap-4">
                <input 
                  className="flex-1 p-2 border border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Front (e.g. 食べる)" 
                  value={front} 
                  onChange={e => setFront(e.target.value)} 
                  required
                />
                <input 
                  className="flex-1 p-2 border border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Back (e.g. to eat)" 
                  value={back} 
                  onChange={e => setBack(e.target.value)} 
                  required
                />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 shrink-0">
                  Add Card
                </button>
              </form>

              <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="overflow-y-auto flex-1 p-4">
                  {flashcards?.length === 0 && <p className="text-gray-400 text-sm text-center mt-4">No cards in this deck yet.</p>}
                  <div className="grid grid-cols-1 gap-3">
                    {flashcards?.map(card => (
                      <div key={card.id} className="p-3 border border-gray-100 bg-gray-50 rounded-lg flex justify-between items-center">
                        <div className="flex gap-4">
                          <div className="font-bold text-gray-800 w-32">{card.front}</div>
                          <div className="text-gray-600">{card.back}</div>
                        </div>
                        <button onClick={() => deleteFlashcard(card.id!)} className="text-red-400 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
