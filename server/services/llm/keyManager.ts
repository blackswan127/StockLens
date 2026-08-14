import dotenv from 'dotenv';
dotenv.config();

export class GeminiKeyManager {
  private keys: string[] = [];
  private currentIndex: number = 0;

  constructor() {
    this.refreshKeys();
  }

  public refreshKeys(): void {
    const keysStr = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
    this.keys = keysStr
      .split(/[,;\n]/)
      .map(k => k.trim().replace(/^["']|["']$/g, ''))
      .filter(k => k.length > 0);
    
    if (this.keys.length === 0) {
      console.warn('No Gemini API keys found in environment variables.');
    }
  }

  public getNextKey(): string {
    if (this.keys.length === 0) {
      this.refreshKeys();
    }
    if (this.keys.length === 0) return '';
    const key = this.keys[this.currentIndex % this.keys.length];
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return key;
  }

  public getKeyCount(): number {
    if (this.keys.length === 0) {
      this.refreshKeys();
    }
    return this.keys.length;
  }

  public hasKeys(): boolean {
    return this.getKeyCount() > 0;
  }
}

export const geminiKeyManager = new GeminiKeyManager();

