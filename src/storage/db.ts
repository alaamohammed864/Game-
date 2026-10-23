import { GameState, Country, Province } from '../types';

export const SAVE_SCHEMA_VERSION = '2.0.0';
const DB_NAME = 'GlobalCommandDB';
const DB_VERSION = 2;
const STORE_NAME = 'save_games';

export interface SaveMetadata {
  id: string;
  name: string;
  turn: number;
  date: string;
  playerCountryName: string;
  timestamp: number;
  isAutosave?: boolean;
  version: string;
}

export interface SaveRecord {
  id: string;
  metadata: SaveMetadata;
  state: GameState;
}

export interface StorageOperationResult<T = void> {
  success: boolean;
  data?: T;
  errorKey?: string;
  message?: string;
}

class StorageManager {
  private db: IDBDatabase | null = null;
  private isIndexedDbAvailable: boolean = false;
  private initPromise: Promise<void>;
  private isSaving: boolean = false;

  constructor() {
    this.initPromise = this.init();
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
        req.onblocked = () => reject(new Error('IndexedDB blocked by open connection'));
      });
      this.isIndexedDbAvailable = true;
    } catch (e) {
      this.isIndexedDbAvailable = false;
      console.warn('IndexedDB unavailable, utilizing localStorage fallback:', e);
    }
  }

  private async ensureReady(): Promise<void> {
    await this.initPromise;
  }

  /**
   * Deep validation of game state before saving or loading
   */
  public validateGameState(state: any): { valid: boolean; sanitized?: GameState; error?: string } {
    if (!state || typeof state !== 'object') {
      return { valid: false, error: 'Invalid or empty game state object.' };
    }

    if (!state.countries || typeof state.countries !== 'object' || Object.keys(state.countries).length === 0) {
      return { valid: false, error: 'Save file contains no sovereign countries.' };
    }

    if (!state.provinces || typeof state.provinces !== 'object' || Object.keys(state.provinces).length === 0) {
      return { valid: false, error: 'Save file contains no territorial provinces.' };
    }

    if (!state.playerCountryId || !state.countries[state.playerCountryId]) {
      return { valid: false, error: 'Player country identifier missing or invalid.' };
    }

    if (typeof state.currentTurn !== 'number' || isNaN(state.currentTurn) || state.currentTurn < 1) {
      state.currentTurn = 1;
    }

    // Sanitize resource numeric bounds across all countries to prevent NaN / Infinity
    Object.values(state.countries as Record<string, Country>).forEach(c => {
      if (c && c.resources) {
        (['money', 'oil', 'steel', 'food', 'energy', 'rareMaterials', 'techPoints', 'manpower', 'gold'] as const).forEach(key => {
          const val = c.resources[key];
          if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
            c.resources[key] = 0;
          } else {
            c.resources[key] = Math.max(0, Math.round(val));
          }
        });
      }
    });

    return { valid: true, sanitized: state as GameState };
  }

  public async saveGame(
    slotId: string, 
    name: string, 
    state: GameState, 
    isAutosave = false
  ): Promise<StorageOperationResult> {
    await this.ensureReady();

    if (this.isSaving) {
      return { success: false, errorKey: 'save_in_progress', message: 'A save operation is currently writing to disk.' };
    }
    this.isSaving = true;

    try {
      const validation = this.validateGameState(state);
      if (!validation.valid || !validation.sanitized) {
        return { success: false, errorKey: 'invalid_state', message: validation.error || 'Failed integrity check.' };
      }

      const validState = validation.sanitized;
      const playerCountry = validState.countries[validState.playerCountryId]?.name || 'Unknown';
      const metadata: SaveMetadata = {
        id: slotId,
        name,
        turn: validState.currentTurn,
        date: validState.currentDate || 'Unknown',
        playerCountryName: playerCountry,
        timestamp: Date.now(),
        isAutosave,
        version: validState.version || SAVE_SCHEMA_VERSION
      };

      const record: SaveRecord = {
        id: slotId,
        metadata,
        state: validState
      };

      let idbSucceeded = false;
      if (this.isIndexedDbAvailable && this.db) {
        try {
          await new Promise<void>((resolve, reject) => {
            const tx = this.db!.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(record);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });
          idbSucceeded = true;
        } catch (e) {
          console.warn('IDB write failed, attempting fallback:', e);
        }
      }

      // Keep localStorage synchronized as secondary persistence or fallback
      try {
        const serialized = JSON.stringify(record);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`gc_save_${slotId}`, serialized);
          const indexStr = localStorage.getItem('gc_saves_index') || '[]';
          const index: SaveMetadata[] = JSON.parse(indexStr).filter((item: SaveMetadata) => item.id !== slotId);
          index.unshift(metadata);
          localStorage.setItem('gc_saves_index', JSON.stringify(index));
        }
      } catch (lsError: any) {
        if (!idbSucceeded) {
          const isQuota = lsError && (lsError.name === 'QuotaExceededError' || lsError.code === 22);
          return {
            success: false,
            errorKey: isQuota ? 'quota_exceeded' : 'storage_failed',
            message: isQuota ? 'Storage quota exceeded. Free space or remove older saves.' : 'Local storage write failed.'
          };
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, errorKey: 'unknown', message: err?.message || 'Unexpected save failure.' };
    } finally {
      this.isSaving = false;
    }
  }

  public async loadGame(slotId: string): Promise<GameState | null> {
    await this.ensureReady();

    let loadedRecord: SaveRecord | null = null;

    if (this.isIndexedDbAvailable && this.db) {
      try {
        loadedRecord = await new Promise<SaveRecord | null>((resolve, reject) => {
          const tx = this.db!.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(slotId);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        });
      } catch (e) {
        console.warn('IndexedDB read failed:', e);
      }
    }

    if (!loadedRecord && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(`gc_save_${slotId}`);
        if (raw) {
          loadedRecord = JSON.parse(raw);
        }
      } catch (e) {
        console.warn('localStorage read failed:', e);
      }
    }

    if (loadedRecord && loadedRecord.state) {
      const validation = this.validateGameState(loadedRecord.state);
      if (validation.valid && validation.sanitized) {
        return validation.sanitized;
      }
    }

    return null;
  }

  /**
   * Unified save listing merging IndexedDB and localStorage without hiding valid saves
   */
  public async listSaves(): Promise<SaveMetadata[]> {
    await this.ensureReady();
    const saveMap = new Map<string, SaveMetadata>();

    // 1. Fetch from IndexedDB
    if (this.isIndexedDbAvailable && this.db) {
      try {
        const records = await new Promise<SaveRecord[]>((resolve, reject) => {
          const tx = this.db!.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
        records.forEach(r => {
          if (r && r.metadata) {
            saveMap.set(r.metadata.id, r.metadata);
          }
        });
      } catch (e) {
        console.warn('Error reading saves from IndexedDB:', e);
      }
    }

    // 2. Fetch from localStorage fallback and merge
    if (typeof localStorage !== 'undefined') {
      try {
        const indexStr = localStorage.getItem('gc_saves_index') || '[]';
        const lsSaves: SaveMetadata[] = JSON.parse(indexStr);
        lsSaves.forEach(meta => {
          if (!saveMap.has(meta.id)) {
            saveMap.set(meta.id, meta);
          }
        });
      } catch (e) {
        console.warn('Error reading saves from localStorage:', e);
      }
    }

    return Array.from(saveMap.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  public async deleteSave(slotId: string): Promise<boolean> {
    await this.ensureReady();

    if (this.isIndexedDbAvailable && this.db) {
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = this.db!.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(slotId);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch (e) {
        console.warn('IDB deletion error:', e);
      }
    }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(`gc_save_${slotId}`);
        const indexStr = localStorage.getItem('gc_saves_index') || '[]';
        const index: SaveMetadata[] = JSON.parse(indexStr).filter((item: SaveMetadata) => item.id !== slotId);
        localStorage.setItem('gc_saves_index', JSON.stringify(index));
      } catch (e) {
        console.warn('localStorage deletion error:', e);
      }
    }

    return true;
  }

  public exportSaveJson(state: GameState): string {
    const payload = {
      version: SAVE_SCHEMA_VERSION,
      timestamp: Date.now(),
      state
    };
    return JSON.stringify(payload, null, 2);
  }

  public importSaveJson(jsonString: string): { success: boolean; state?: GameState; error?: string } {
    if (!jsonString || typeof jsonString !== 'string') {
      return { success: false, error: 'Empty or non-string file content.' };
    }

    if (jsonString.length > 25 * 1024 * 1024) { // 25 MB safety limit
      return { success: false, error: 'Save archive exceeds safe maximum file size (25MB).' };
    }

    try {
      const parsed = JSON.parse(jsonString);
      // Support both wrapped export format { state: ... } and direct GameState
      const candidateState = parsed.state || parsed;
      const validation = this.validateGameState(candidateState);
      if (!validation.valid || !validation.sanitized) {
        return { success: false, error: validation.error || 'Invalid game archive structure.' };
      }
      return { success: true, state: validation.sanitized };
    } catch {
      return { success: false, error: 'Corrupt or non-JSON formatted text.' };
    }
  }
}

export const storage = new StorageManager();
