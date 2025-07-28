const { useEffect, useRef, useState } = React;

function App() {
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const [isCapturing, setCapturing] = useState(false);
  const [bufferSeconds, setBufferSeconds] = useState(300);
  const [recordings, setRecordings] = useState([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    loadRecordings();
    window.electronAPI.onSaveReplay(async () => {
      if (!isCapturing) return;
      setStatus('Saving…');
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const arrayBuffer = await blob.arrayBuffer();
      window.electronAPI.saveBuffer(arrayBuffer);
    });

    window.electronAPI.onSaveComplete(({ success, filePath, message }) => {
      if (success) {
        setStatus('Saved ✔');
        loadRecordings();
      } else {
        setStatus('Error: ' + (message || 'Unknown'));
      }
    });
  }, [isCapturing]);

  function loadRecordings() {
    window.electronAPI.listRecordings().then((files) => setRecordings(files));
  }

  async function startCapture() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (evt) => {
        chunksRef.current.push(evt.data);
        let duration = chunksRef.current.reduce((acc, blob) => acc + blob.duration || 0, 0);
        // Maintain buffer size ~ naive (10MB per minute approx) or simple trimming by size
        while (chunksRef.current.length > bufferSeconds * 2) {
          chunksRef.current.shift();
        }
      };

      mediaRecorder.start(1000); // collect in 1s chunks
      setCapturing(true);
      setStatus('Recording started');
    } catch (err) {
      console.error(err);
      setStatus('Error: ' + err.message);
    }
  }

  function stopCapture() {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCapturing(false);
    setStatus('Recording stopped');
  }

  function playRecording(path) {
    const video = document.createElement('video');
    video.src = path;
    video.controls = true;
    video.autoplay = true;
    const w = window.open('', '_blank', 'width=800,height=450');
    w.document.write('<title>Playback</title>');
    w.document.body.appendChild(video);
  }

  return (
    <>
      <div style={{ margin: '16px' }}>
        <button onClick={startCapture} disabled={isCapturing} id="btn-start">
          Start Capture
        </button>
        <button onClick={stopCapture} disabled={!isCapturing} id="btn-stop" className="secondary">
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
          <div key={rec.path} className="thumb" onClick={() => playRecording(rec.path)}>
            <video src={rec.path} muted preload="metadata" />
          </div>
        ))}
      </div>

      {status && (
        <div
          style={{
            position: 'fixed',
            bottom: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#333',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '4px',
            boxShadow: '0 0 6px rgba(0,0,0,0.3)',
            zIndex: 1000,
          }}
        >
          {status}
        </div>
      )}
    </>
  );
}

ReactDOM.render(<App />, document.getElementById('gallery').parentElement);
