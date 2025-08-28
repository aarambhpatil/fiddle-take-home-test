import React, { useEffect, useMemo, useRef, useState } from "react";

export default function TonePickerApp() {
  const [text, setText] = useState("Type here...");
  const [history, setHistory] = useState(["Type here..."]);
  const [index, setIndex] = useState(0);

  const boxRef = useRef(null);
  const draggingRef = useRef(false);
  const pointerIdRef = useRef(null);

  // handle position in pixels relative to center
  const [handlePos, setHandlePos] = useState({ x: 0, y: 0 });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Convert handle px -> scores (-50..50)
  const scores = useMemo(() => {
    const rect = boxRef.current?.getBoundingClientRect();
    const half = rect ? Math.min(rect.width, rect.height) / 2 : 120;
    const clamp = (v) => Math.max(-half, Math.min(half, v));
    const x = clamp(handlePos.x);
    const y = clamp(handlePos.y);
    const toScore = (v) => Math.round((v / half) * 50);
    return { conciseness: toScore(x), professionalism: toScore(y) };
  }, [handlePos]);

  // helper: set handle position from clientX/Y
  function setHandleFromClient(clientX, clientY) {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const half = Math.min(rect.width, rect.height) / 2;
    const rawX = clientX - cx;
    const rawY = clientY - cy;
    const clamp = (v) => Math.max(-half, Math.min(half, v));
    setHandlePos({ x: clamp(rawX), y: clamp(rawY) });
  }

  // pointermove/up handlers registered on window when dragging
  useEffect(() => {
    function onPointerMove(e) {
      // Only react to the pointer we captured (optional)
      if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) return;
      setHandleFromClient(e.clientX, e.clientY);
    }
    function onPointerUp(e) {
      if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) return;
      draggingRef.current = false;
      pointerIdRef.current = null;
      // apply tone when user lifts pointer
      applyTone(scores.conciseness, scores.professionalism);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    }
    // cleanup (if any)
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores.conciseness, scores.professionalism, text, history, index]);

  // start drag or move knob (called by pointerdown on box)
  function onBoxPointerDown(e) {
    // If right-click or not primary button, ignore
    if (e.button && e.button !== 0) return;
    e.preventDefault();
    // move handle to pointer
    setHandleFromClient(e.clientX, e.clientY);
    // start dragging
    draggingRef.current = true;
    pointerIdRef.current = e.pointerId ?? null;

    // attach global listeners
    function onPointerMoveGlobal(ev) {
      if (pointerIdRef.current != null && ev.pointerId !== pointerIdRef.current) return;
      setHandleFromClient(ev.clientX, ev.clientY);
    }
    function onPointerUpGlobal(ev) {
      if (pointerIdRef.current != null && ev.pointerId !== pointerIdRef.current) return;
      draggingRef.current = false;
      pointerIdRef.current = null;
      // apply tone
      applyTone(scores.conciseness, scores.professionalism);
      window.removeEventListener("pointermove", onPointerMoveGlobal);
      window.removeEventListener("pointerup", onPointerUpGlobal);
    }

    window.addEventListener("pointermove", onPointerMoveGlobal);
    window.addEventListener("pointerup", onPointerUpGlobal);
  }

  // Also allow handle to be dragged when pointerdown begins on handle.
  // But our box pointer handlers already capture that; handle element receives pointer events too.

  // === API call ===
  async function applyTone(cScore, pScore) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("https://fiddle-test-backend.onrender.com/api/tone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, conciseness: cScore, professionalism: pScore }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data?.error || `Mistral call failed (${res.status})`);
      }
      const newText = data.text;
      const newHistory = [...history.slice(0, index + 1), newText];
      setHistory(newHistory);
      setIndex(newHistory.length - 1);
      setText(newText);
    } catch {
      setError("Error Occured");
    } finally {
      setLoading(false);
    }
  }

  // Undo / Redo / Reset
  const undo = () => {
    if (index > 0) {
      const newIndex = index - 1;
      setIndex(newIndex);
      setText(history[newIndex]);
    }
  };
  const redo = () => {
    if (index < history.length - 1) {
      const newIndex = index + 1;
      setIndex(newIndex);
      setText(history[newIndex]);
    }
  };
  const reset = () => {
    const original = history[0] ?? "";
    setText(original);
    setHistory([original]);
    setIndex(0);
    setHandlePos({ x: 0, y: 0 });
    setError("");
  };

  // compute CSS transform from handlePos
  const handleStyle = {
    transform: `translate(${handlePos.x}px, ${handlePos.y}px)`,
    transition: draggingRef.current ? "none" : "transform 0.12s ease-out",
  };

  return (
    <div className="min-h-screen w-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8">
        {/* Header */}
        <div className="lg:col-span-2 flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold">Tone Picker — Draggable 2D Grid</h1>
          <div className="text-sm text-gray-400">Drag or click the square to set tone. Release to apply.</div>
        </div>

        {/* Left: Editor */}
        <div className="bg-white text-black rounded-2xl p-6 shadow-lg flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-2">Editor</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 p-4 rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Type or paste text here..."
            rows={12}
          />
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={undo}
              disabled={index === 0}
              className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-60"
            >
              Undo
            </button>
            <button
              onClick={redo}
              disabled={index === history.length - 1}
              className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-60"
            >
              Redo
            </button>
            <button onClick={reset} className="ml-auto px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200">
              Reset
            </button>
            {loading && <div className="ml-3 text-indigo-400 text-sm">Applying tone…</div>}
          </div>
          {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
        </div>

        {/* Right: Tone picker */}
        <div className="flex items-start justify-center">
          <div className="w-[420px]">
            <label className="block text-sm font-medium text-gray-300 mb-2">Tone Picker</label>

            <div
              ref={boxRef}
              onPointerDown={onBoxPointerDown}
              className="relative bg-gray-900 rounded-2xl border border-gray-700 h-[400px] select-none touch-none"
              role="presentation"
            >
              {/* inner square margin for labels */}
              <div className="absolute inset-6 rounded-lg border border-gray-800 bg-gradient-to-br from-gray-800 to-gray-900" />

              {/* axis lines (center) */}
              <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 border-t border-gray-700 pointer-events-none" />
              <div className="absolute left-1/2 top-6 bottom-6 -translate-x-1/2 border-l border-gray-700 pointer-events-none" />

              {/* quadrant labels */}
              <div className="absolute left-6 top-6 text-xs text-gray-400">Concise / Professional</div>
              <div className="absolute right-6 top-6 text-xs text-gray-400">Expanded / Professional</div>
              <div className="absolute left-6 bottom-6 text-xs text-gray-400">Concise / Casual</div>
              <div className="absolute right-6 bottom-6 text-xs text-gray-400">Expanded / Casual</div>

              {/* live scores pill */}
              <div className="absolute left-1/2 -translate-x-1/2 top-4 px-3 py-1 bg-black/60 border border-gray-600 rounded-full text-xs text-gray-200">
                C: {scores.conciseness} • P: {scores.professionalism}
              </div>

              {/* draggable knob */}
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-indigo-500 ring-4 ring-indigo-900 shadow-lg"
                style={handleStyle}
                // also allow pointerdown on the knob to start drag (delegates to onBoxPointerDown)
                onPointerDown={(e) => {
                  // prevent double handling; delegate to box handler
                  e.stopPropagation();
                  onBoxPointerDown(e);
                }}
              />

              {/* subtle grid lines (4x4) for guidance */}
              <div className="absolute left-6 right-6 top-6 bottom-6 grid grid-cols-4 grid-rows-4 gap-0 pointer-events-none">
                {Array.from({ length: 4 * 4 }).map((_, i) => (
                  <div key={i} className="border border-dashed border-transparent" />
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-sm text-gray-400">
              <div>Release to apply transformation</div>
              <div>
                <span className="text-gray-200 mr-2">C {scores.conciseness}</span>
                <span className="text-gray-200">P {scores.professionalism}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
