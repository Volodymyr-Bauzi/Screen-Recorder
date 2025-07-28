import {useEffect, useRef, useState} from 'react';
import {StatusNotification} from './components/StatusNotification';
import React from 'react';

export function App() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isCapturing, setCapturing] = useState(false);
  const [bufferSeconds, setBufferSeconds] = useState(300);
  const [recordings, setRecordings] = useState<{name: string; path: string}[]>(
    []
  );
  const [status, setStatus] = useState('');

  /** Load existing recordings & register IPC listeners */
  useEffect(() => {
    loadRecordings();

    // Listener from global shortcut (main process)
    const saveReplayHandler = async () => {
      if (!isCapturing) return;
      setStatus('Saving…');
      const blob = new Blob(chunksRef.current, {type: 'video/webm'});
      const buffer = await blob.arrayBuffer();
      window.electronAPI.saveBuffer(buffer);
    };
    window.electronAPI.onSaveReplay(saveReplayHandler);

    // Listen save completion
    window.electronAPI.onSaveComplete(({success, message}: any) => {
      if (success) {
        setStatus('Saved ✔');
        loadRecordings();
      } else {
        setStatus(`Error: ${message}`);
      }
    });

    return () => {
      window.electronAPI.removeSaveReplay?.(saveReplayHandler);
      // Ideally remove listeners, ipcRenderer.removeListener etc.
    };
  }, [isCapturing]);

  /** Fetch files list from backend */
  function loadRecordings() {
    window.electronAPI
      .listRecordings()
      .then((files: any) => setRecordings(files));
  }

  /** Start screen capture */
  async function startCapture() {
    try {
      setStatus('Requesting screen…');
      const stream = await window.electronAPI.startRecording();
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });
      mediaRecorderRef.current = mediaRecorder;
      const CHUNK_MS = 1000;

      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        chunksRef.current.push(e.data);
        // Trim chunks to stay within bufferSeconds
        const maxChunks = Math.ceil((bufferSeconds * 1000) / CHUNK_MS);
        if (chunksRef.current.length > maxChunks) {
          chunksRef.current.splice(0, chunksRef.current.length - maxChunks);
        }
      };

      mediaRecorder.start(CHUNK_MS);
      setCapturing(true);
      setStatus('Recording…');
    } catch (err: any) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    }
  }

  /** Stop capture */
  function stopCapture() {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    setCapturing(false);
    setStatus('Recording stopped');
  }

  /** Playback */
  function playRecording(path: string) {
    const vidWin = window.open('', '_blank', 'width=800,height=450');
    if (!vidWin) return;
    vidWin.document.write('<title>Playback</title>');
    const video = vidWin.document.createElement('video');
    video.src = path;
    video.controls = true;
    video.autoplay = true;
    video.style.width = '100%';
    vidWin.document.body.appendChild(video);
  }

  return (
    <>
      <div style={{margin: '16px'}}>
        <button onClick={startCapture} disabled={isCapturing} id="btn-start">
          Start Capture
        </button>
        <button
          onClick={stopCapture}
          disabled={!isCapturing}
          id="btn-stop"
          className="secondary"
        >
          Stop Capture
        </button>
        <select
          id="buffer-select"
          value={bufferSeconds}
          onChange={(e) => setBufferSeconds(Number(e.target.value))}
        >
          <option value={120}>Last 2 mins</option>
          <option value={300}>Last 5 mins</option>
          <option value={600}>Last 10 mins</option>
        </select>
      </div>

      <div className="gallery" id="gallery">
        {recordings.map((rec) => (
          <div
            key={rec.path}
            className="thumb"
            onClick={() => playRecording(rec.path)}
          >
            <video src={rec.path} muted preload="metadata" />
          </div>
        ))}
      </div>

      <StatusNotification status={status} />
    </>
  );
}
