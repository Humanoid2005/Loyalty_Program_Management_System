import React, { useState, useRef } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Camera, Hash } from "lucide-react";
import { scanTeamQR } from "../../service/api";

interface QRScannerProps {
  eventToken: string;
  eventName: string;
}

const QRScanner: React.FC<QRScannerProps> = ({ eventToken, eventName }) => {
  const [scanResult, setScanResult] = useState<string>("");
  const [message, setMessage] = useState<string>("Ready to scan");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [manualId, setManualId] = useState("");
  const lastScanRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);

  const processTeamId = async (teamId: string) => {
    if (!teamId || loading) return;

    const now = Date.now();
    if (teamId === lastScanRef.current && now - lastScanTimeRef.current < 3000) {
      return;
    }

    lastScanRef.current = teamId;
    lastScanTimeRef.current = now;
    setLoading(true);
    setScanResult(teamId);

    try {
      const res = await scanTeamQR(teamId, eventToken) as any;
      setMessage(`✅ ${res.message} | Team Points: ${res.team_points}`);
      
      setTimeout(() => {
        lastScanRef.current = "";
      }, 3000);
    } catch (err: any) {
      setMessage(`❌ ${err.response?.data?.detail || "Failed to scan team QR"}`);
      lastScanRef.current = "";
    } finally {
      setLoading(false);
      if (mode === "manual") setManualId("");
    }
  };

  const handleScanResult = (result: any) => {
    if (result && result[0]?.rawValue) {
      processTeamId(result[0].rawValue);
    }
  };

  const handleError = (error: any) => {
    if (error?.name !== "NotFoundException") {
      console.error("Scan error:", error);
      setMessage("Scanner error. Check camera permissions.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 cyber-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="cyber-section-header mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-cyan-400 uppercase tracking-wider mb-2">
            Team Scanner
          </h1>
          <p className="text-gray-400">Event: {eventName}</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setMode("scan")}
            className={`flex-1 py-3 px-6 uppercase tracking-wider font-semibold transition-all ${
              mode === "scan"
                ? "cyber-button-primary"
                : "cyber-button-secondary"
            }`}
          >
            <Camera className="inline mr-2" size={18} />
            QR Scan
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 py-3 px-6 uppercase tracking-wider font-semibold transition-all ${
              mode === "manual"
                ? "cyber-button-primary"
                : "cyber-button-secondary"
            }`}
          >
            <Hash className="inline mr-2" size={18} />
            Manual
          </button>
        </div>

        {mode === "scan" ? (
          /* QR Scanner Mode */
          <div className="cyber-card p-4 mb-6">
            <div className="relative border-2 border-cyan-400/50 rounded-lg overflow-hidden bg-black">
              <Scanner
                onScan={handleScanResult}
                onError={handleError}
                constraints={{
                  facingMode: "environment"
                }}
                styles={{
                  container: {
                    width: "100%",
                    maxHeight: "500px"
                  },
                  video: {
                    width: "100%",
                    height: "auto",
                    objectFit: "cover"
                  }
                }}
                components={{
                  finder: false
                }}
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-cyan-400 animate-pulse" 
                     style={{ boxShadow: "0 0 10px #22d3ee" }} />
              </div>
            </div>
          </div>
        ) : (
          /* Manual Input Mode */
          <div className="cyber-card p-6 mb-6">
            <label className="block text-sm font-medium text-cyan-400 uppercase tracking-wider mb-3">
              Enter Team ID
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && manualId.trim() && !loading) {
                    processTeamId(manualId.trim());
                  }
                }}
                placeholder="TEAM_ID_XXXX"
                className="cyber-input flex-1"
                disabled={loading}
              />
              <button
                onClick={() => manualId.trim() && processTeamId(manualId.trim())}
                disabled={loading || !manualId.trim()}
                className="cyber-button-primary px-6 uppercase tracking-wider whitespace-nowrap"
              >
                {loading ? "Processing..." : "Submit"}
              </button>
            </div>
          </div>
        )}

        {/* Status Popup */}
        {(loading || message !== "Ready to scan") && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
            <div className="relative max-w-md w-full">
              <div className="cyber-card p-8 transform animate-scale-in">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 mb-6 relative">
                      <div className="absolute inset-0 border-4 border-cyan-400/30 rounded-full animate-ping" />
                      <div className="absolute inset-0 border-4 border-transparent border-t-cyan-400 rounded-full animate-spin" />
                    </div>
                    <p className="text-cyan-400 text-xl uppercase tracking-wider font-semibold animate-pulse">
                      Processing...
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    {/* Success icon */}
                    {message.includes("✅") && (
                      <div className="inline-flex items-center justify-center w-20 h-20 mb-6 relative">
                        <div className="absolute inset-0 bg-green-400/20 rounded-full animate-ping" />
                        <div className="text-6xl animate-bounce-in">✅</div>
                      </div>
                    )}
                    
                    {/* Error icon */}
                    {message.includes("❌") && (
                      <div className="inline-flex items-center justify-center w-20 h-20 mb-6 relative">
                        <div className="absolute inset-0 bg-red-400/20 rounded-full animate-ping" />
                        <div className="text-6xl animate-shake">❌</div>
                      </div>
                    )}

                    {scanResult && (
                      <div className="mb-6 pb-6 border-b border-cyan-400/30">
                        <p className="text-xs text-cyan-400 uppercase tracking-wider mb-2 font-semibold">Team ID</p>
                        <p className="text-white font-mono text-xl">{scanResult}</p>
                      </div>
                    )}

                    <p className={`text-lg md:text-xl font-semibold mb-8 ${
                      message.includes("✅")
                        ? "text-green-400"
                        : message.includes("❌")
                        ? "text-red-400"
                        : "text-gray-300"
                    }`}>
                      {message.replace("✅ ", "").replace("❌ ", "")}
                    </p>

                    <button
                      onClick={() => {
                        setMessage("Ready to scan");
                        setScanResult("");
                      }}
                      className="cyber-button-primary w-full py-4 text-lg uppercase tracking-wider font-semibold"
                    >
                      Continue Scanning
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes bounce-in {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          10%, 30%, 50%, 70%, 90% {
            transform: translateX(-5px);
          }
          20%, 40%, 60%, 80% {
            transform: translateX(5px);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }

        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default QRScanner;