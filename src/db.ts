import Dexie, { type EntityTable } from 'dexie';

export interface Flashcard {
  id?: number;
  deckId: number;
  front: string;
  back: string;
  interval: number; // SRS interval in days
  repetition: number;
  efactor: number; // Easiness factor
  dueDate: string; // ISO date string
}

export interface Deck {
  id?: number;
  name: string;
  description: string;
}

export interface Progress {
  id?: number;
  date: string; // ISO date string YYYY-MM-DD
  minutesStudied: number;
  cardsReviewed: number;
}

export const db = new Dexie('NihongoFastDB') as Dexie & {
  flashcards: EntityTable<Flashcard, 'id'>;
  decks: EntityTable<Deck, 'id'>;
  progress: EntityTable<Progress, 'id'>;
};

// Schema declaration
db.version(1).stores({
  flashcards: '++id, deckId, dueDate', // Primary key and indexed props
  decks: '++id, name',
  progress: '++id, date'
});
