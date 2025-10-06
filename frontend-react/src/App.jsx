import { useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function App() {
  // State
  const [file, setFile] = useState(null);
  const [portion, setPortion] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState(null);
  

  // Camera refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const lastShotRef = useRef(null);

  const cap = (s) => (s ?? "").slice(0, 1).toUpperCase() + (s ?? "").slice(1);

  const setChosenFile = (f) => {
    if (!f) return;
    setFile(f);
    setMsg("");
    setResult(null);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) setChosenFile(f);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setMsg("");
    } catch (err) {
      setMsg(`Camera error: ${err.message}`);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks()?.forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    lastShotRef.current = null;
  };

  const snapPhoto = () => {
    if (!videoRef.current) return;
    const w = videoRef.current.videoWidth;
    const h = videoRef.current.videoHeight;
    if (!(w && h)) return;
    const canvas = canvasRef.current;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, w, h);
    canvas.toBlob(
      (b) => {
        lastShotRef.current = b;
        setMsg('Preview captured — click "Use Photo" to attach.');
      },
      "image/jpeg",
      0.92
    );
  };

  const usePhoto = () => {
    if (!lastShotRef.current) return;
    const f = new File([lastShotRef.current], "camera.jpg", { type: "image/jpeg" });
    setChosenFile(f);
    setMsg("Camera photo attached.");
  };

  const checkBackendHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`, { method: "GET", cache: "no-store" });
      return res.ok;
    } catch {
      return false;
    }
  };

  const analyze = async () => {
    setMsg("");
    setResult(null);
    if (!file) return setMsg("Choose or capture an image first.");
    const p = parseFloat(portion || "1");
    if (!(p > 0)) return setMsg("Portion must be > 0.");

    setLoading(true);
    setMsg("Checking server connection...");
    const ok = await checkBackendHealth();
    if (!ok) {
      setMsg(`Error: Cannot reach /health at ${API_BASE}.`);
      setLoading(false);
      return;
    }

    const form = new FormData();
    form.append("file", file);
    form.append("portion", String(p));
    setMsg("Analyzing image...");
    try {
      const res = await fetch(`${API_BASE}/analyze`, { method: "POST", body: form });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setResult(data);
      setMsg("Analysis complete!");
    } catch (e) {
      setMsg(e.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  

  useEffect(() => () => stopCamera(), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23e0e7ff%22%20fill-opacity%3D%220.3%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40" />
      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">ME</div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">AI Meal Estimator</h1>
                <p className="text-sm text-gray-500">Powered by Computer Vision</p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8">
            {/* Left */}
            <div className="space-y-6">
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 space-y-6">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <span className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm mr-3">IMG</span>
                  Upload Your Meal
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Custom file input for consistent sizing */}
                  <div className="space-y-2">
                    <label htmlFor="meal-file" className="text-sm font-medium text-gray-700">Upload Image</label>
                    <div className="relative group">
                      <input id="meal-file" type="file" accept="image/*" onChange={(e) => setChosenFile(e.target.files?.[0] || null)} className="hidden" />
                      <label htmlFor="meal-file" aria-label="Food image upload" className="h-12 w-full flex items-center justify-between px-4 rounded-xl border-2 border-gray-200 bg-white/50 cursor-pointer text-sm text-gray-600 group-hover:border-indigo-400 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100">
                        <span className="truncate mr-4">{file ? file.name : 'Choose an image...'}</span>
                        <span className="text-indigo-600 font-medium">Browse</span>
                      </label>
                    </div>
                  </div>
                  {/* Portion size input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Portion Size</label>
                    <div className="relative">
                      <input type="number" step="0.1" min="0.1" value={portion} onChange={(e) => setPortion(e.target.value)} className="h-12 w-full px-4 rounded-xl border-2 border-gray-200 bg-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 text-right pr-20" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium select-none">servings</span>
                    </div>
                  </div>
                </div>
                <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onDrop(e); }} className="border-2 border-dashed border-indigo-300 rounded-2xl p-8 text-center cursor-pointer bg-gradient-to-br from-indigo-50 to-purple-50">
                  <p className="text-lg font-semibold text-gray-700 mb-2">Drag & drop your food photo here</p>
                  <p className="text-gray-500 text-sm">or <span className="text-indigo-600 font-medium">click to browse</span></p>
                  <input type="file" accept="image/*" onChange={(e) => setChosenFile(e.target.files?.[0] || null)} className="hidden" />
                </div>
                {file && (
                  <div className="bg-white/50 rounded-2xl p-6 border border-white/20">
                    <div className="flex items-start space-x-4">
                      <div className="relative">
                        <img src={URL.createObjectURL(file)} alt="preview" className="w-24 h-24 object-cover rounded-xl border-2 border-white shadow-lg" />
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                      </div>
                      <div className="flex-1 space-y-2 text-sm">
                        <div>Selected: <span className="bg-gray-100 px-2 py-1 rounded-lg">{file.name || "camera.jpg"}</span></div>
                        <div>Size: {(file.size/1024/1024).toFixed(2)} MB</div>
                        <p className="text-xs text-gray-500">Adjust portion size if not one serving</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  <div className="flex gap-3 flex-wrap">
                    <button className="btn-primary" onClick={startCamera} disabled={streamRef.current}>{streamRef.current ? "Camera Active" : "Start Camera"}</button>
                    <button className="btn-secondary" onClick={snapPhoto} disabled={!streamRef.current}>Take Photo</button>
                    <button className="btn-success" onClick={usePhoto} disabled={!lastShotRef.current}>Use Photo</button>
                    <button className="btn-danger" onClick={stopCamera} disabled={!streamRef.current}>Stop</button>
                  </div>
                  <video ref={videoRef} playsInline muted className="w-full h-64 rounded-2xl border-2 border-gray-200 bg-black object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                <div>
                  <button className="w-full btn-analyze" onClick={analyze} disabled={loading}>
                    {loading ? "Analyzing..." : "Analyze Meal"}
                  </button>
                </div>
                {msg && <div className="p-4 rounded-xl text-sm bg-blue-50 text-blue-700 border border-blue-200">{msg}</div>}
              </div>
            </div>
            {/* Right */}
            <div className="space-y-6">
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                  <span className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white text-sm mr-3">RES</span>
                  Analysis Results
                </h2>
                {!result ? (
                  <div className="h-96 flex flex-col items-center justify-center text-center space-y-4 text-gray-500">Upload or capture a food image to begin.</div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-bold text-gray-800">{cap(result.food_name)}</h3>
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                        {(result.confidence * 100).toFixed(1)}% confidence
                      </div>
                      <p className="text-sm text-gray-600">Portion size: <span className="font-semibold">{result.portion_size}</span></p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <NutritionCard label="Calories" value={result.nutrition?.calories} unit="kcal" color="from-red-500 to-pink-500" icon="CAL" />
                      <NutritionCard label="Protein" value={result.nutrition?.protein} unit="g" color="from-blue-500 to-indigo-500" icon="PRO" />
                      <NutritionCard label="Carbs" value={result.nutrition?.carbs} unit="g" color="from-yellow-500 to-orange-500" icon="CAR" />
                      <NutritionCard label="Fat" value={result.nutrition?.fat} unit="g" color="from-purple-500 to-pink-500" icon="FAT" />
                    </div>
                    {result.ai_insights && (
                      <div className="min-h-40 p-6 rounded-2xl text-sm leading-relaxed bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 text-purple-700 flex items-start">
                        {result.ai_insights}
                      </div>
                    )}
                    {Array.isArray(result.top_k) && result.top_k.length > 1 && (
                      <div className="space-y-2 text-sm">
                        <h4 className="font-semibold text-gray-700">Other possible dishes:</h4>
                        <div className="flex flex-wrap gap-2">
                          {result.top_k.slice(1).map((t) => (
                            <span key={t.label} className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                              {cap(t.label)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="min-h-40 p-6 rounded-2xl text-sm leading-relaxed bg-white/60 border border-gray-200 text-gray-700 flex items-start">
                      <p>
                        This estimation is generated by an AI vision model based on the provided photo. It may be
                        inaccurate and should be treated as an approximation. For precise dietary guidance, consult
                        authoritative nutrition labels or a professional.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        <footer className="bg-white/50 backdrop-blur-sm border-t border-white/20 py-6">
          <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-600 flex items-center justify-center gap-4">
            <a href={`${API_BASE}/api/docs`} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-indigo-600">API Docs</a>
            <span className="text-gray-300">•</span>
            <span>Powered by AI & Computer Vision</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function NutritionCard({ label, value, unit, color, icon }) {
  return (
    <div className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl p-4 text-center">
      <div className="flex items-center justify-center mb-2">
        <div className={`w-8 h-8 bg-gradient-to-r ${color} rounded-lg flex items-center justify-center text-white text-sm`}>{icon}</div>
      </div>
      <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>
      <div className="text-xl font-bold text-gray-800 mb-1">{value ?? "—"}</div>
      <div className="text-xs text-gray-500">{unit}</div>
    </div>
  );
}