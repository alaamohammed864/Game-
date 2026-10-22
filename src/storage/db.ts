import { GameState } from '../types';

const DB_NAME = 'GlobalCommandDB';
const DB_VERSION = 1;
const STORE_NAME = 'save_games';

export interface SaveMetadata {
  id: string;
  name: string;
  turn: number;
  date: string;
  playerCountryName: string;
  timestamp: number;
  isAutosave?: boolean;
}

class StorageManager {
  private db: IDBDatabase | null = null;
  private isIndexedDbAvailable: boolean = false;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      this.isIndexedDbAvailable = false;
      return;
    }

    try {
      this.db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      this.isIndexedDbAvailable = true;
    } catch {
      this.isIndexedDbAvailable = false;
    }
  }

  public async saveGame(slotId: string, name: string, state: GameState, isAutosave = false): Promise<boolean> {
    const playerCountry = state.countries[state.playerCountryId]?.name || 'Unknown';
    const metadata: SaveMetadata = {
      id: slotId,
      name,
      turn: state.currentTurn,
      date: state.currentDate,
      playerCountryName: playerCountry,
      timestamp: Date.now(),
      isAutosave
    };

    const payload = {
      id: slotId,
      metadata,
      state
    };

    if (this.isIndexedDbAvailable && this.db) {
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = this.db!.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(payload);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
        return true;
      } catch {
        // Fallback to localStorage
      }
    }

    try {
      localStorage.setItem(`gc_save_${slotId}`, JSON.stringify(payload));
      // update save index in localStorage
      const indexStr = localStorage.getItem('gc_saves_index') || '[]';
      const index: SaveMetadata[] = JSON.parse(indexStr).filter((item: SaveMetadata) => item.id !== slotId);
      index.unshift(metadata);
      localStorage.setItem('gc_saves_index', JSON.stringify(index));
      return true;
    } catch (e) {
      console.error('Save failed:', e);
      return false;
    }
  }

  public async loadGame(slotId: string): Promise<GameState | null> {
    if (this.isIndexedDbAvailable && this.db) {
      try {
        const record = await new Promise<any>((resolve, reject) => {
          const tx = this.db!.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(slotId);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        if (record && record.state) return record.state;
      } catch {
        // Fallback to localStorage
      }
    }

    try {
      const raw = localStorage.getItem(`gc_save_${slotId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.state || null;
    } catch {
      return null;
    }
  }

  public async listSaves(): Promise<SaveMetadata[]> {
    if (this.isIndexedDbAvailable && this.db) {
      try {
        const records = await new Promise<any[]>((resolve, reject) => {
          const tx = this.db!.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
        if (records.length > 0) {
          return records.map((r) => r.metadata).sort((a, b) => b.timestamp - a.timestamp);
        }
      } catch {
        // Fallback to localStorage
      }
    }

    try {
      const indexStr = localStorage.getItem('gc_saves_index') || '[]';
      return JSON.parse(indexStr);
    } catch {
      return [];
    }
  }

  public async deleteSave(slotId: string): Promise<boolean> {
    if (this.isIndexedDbAvailable && this.db) {
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = this.db!.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(slotId);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch {}
    }

    try {
      localStorage.removeItem(`gc_save_${slotId}`);
      const indexStr = localStorage.getItem('gc_saves_index') || '[]';
      const index: SaveMetadata[] = JSON.parse(indexStr).filter((item: SaveMetadata) => item.id !== slotId);
      localStorage.setItem('gc_saves_index', JSON.stringify(index));
      return true;
    } catch {
      return false;
    }
  }

  public exportSaveJson(state: GameState): string {
    return JSON.stringify(state, null, 2);
  }

  public importSaveJson(jsonString: string): GameState | null {
    try {
      const state = JSON.parse(jsonString);
      if (state && state.countries && state.provinces) {
        return state as GameState;
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const storage = new StorageManager();
