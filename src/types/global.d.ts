export interface ElectronAPI {
  startRecording(): Promise<MediaStream>;
  saveBuffer(buffer: ArrayBuffer): void;
  onSaveReplay(cb: () => void): void;
  onSaveComplete(cb: (event: any, args: { success: boolean; message?: string; filePath?: string }) => void): void;
  listRecordings(): Promise<{ name: string; path: string }[]>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
