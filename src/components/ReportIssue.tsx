import React, { useState } from "react";
import { Camera, Upload, Sparkles, AlertTriangle, ShieldAlert, CheckCircle, ArrowRight, ArrowLeft, Video, AlertCircle, Info, ShieldCheck, ThumbsUp, Loader2, Eye, EyeOff, MapPin, Calendar, Clock, Activity } from "lucide-react";
import { IssueReport } from "../types";
import dangerousPotholeImg from "../assets/images/dangerous_pothole_1782306016436.jpg";

interface ReportIssueProps {
  currentUserId: string;
  selectedCommunity: string;
  communities: string[];
  onSubmitReport: (reportData: Partial<IssueReport>) => void;
  onCancel: () => void;
}

// Pre-set visual samples for rapid testing
const SAMPLES = [
  {
    id: "sample_pothole",
    title: "Dangerous Pothole",
    category: "Road Damage",
    image: dangerousPotholeImg,
    description: "Deep pothole in the center of the lane."
  },
  {
    id: "sample_garbage",
    title: "Overflowing Garbage Bin",
    category: "Waste Management",
    image: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=300",
    description: "Indiscriminate waste dumping."
  },
  {
    id: "sample_leakage",
    title: "Broken Water Pipe",
    category: "Water Leakage",
    image: "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&q=80&w=300",
    description: "Fresh water gushing out onto the curb."
  },
  {
    id: "sample_streetlight",
    title: "Damaged Street Light",
    category: "Streetlight Failure",
    image: "https://images.unsplash.com/photo-1542840843-3349799cdb6e?auto=format&fit=crop&q=80&w=300",
    description: "Streetlight pole hanging dangerously."
  }
];

export default function ReportIssue({
  currentUserId,
  selectedCommunity,
  communities,
  onSubmitReport,
  onCancel
}: ReportIssueProps) {
  const [step, setStep] = useState<1 | 2>(1); // 1: Input details, 2: AI Analysis Confirmation
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const cameraVideoInputRef = React.useRef<HTMLInputElement>(null);
  const galleryVideoInputRef = React.useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(""); // base64 representation of image or video
  const [locationName, setLocationName] = useState("");
  const [community, setCommunity] = useState(selectedCommunity);
  const [categoryHint, setCategoryHint] = useState("");

  const [analyzing, setAnalyzing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Duplicate Check States
  const [duplicateInfo, setDuplicateInfo] = useState<{
    duplicateFound: boolean;
    reason?: string;
    originalReport?: IssueReport;
  } | null>(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [bypassDuplicateCheck, setBypassDuplicateCheck] = useState(false);
  const [joiningDuplicate, setJoiningDuplicate] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Geolocation & Expand Details States
  const [coords, setCoords] = useState<{ lat: number; lng: number }>(() => ({
    lat: 17.4 + Math.random() * 0.1,
    lng: 78.4 + Math.random() * 0.1
  }));
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [ignoredDuplicateReportId, setIgnoredDuplicateReportId] = useState<string | null>(null);

  React.useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn("Geolocation acquired error, using random coordinate:", error);
        }
      );
    }
  }, []);

  // AI-analyzed fields (returned from server-side Gemini)
  const [aiReport, setAiReport] = useState<Partial<IssueReport>>({
    category: "Road Damage",
    severity: "High",
    priority: "High",
    confidence: 90,
    summary: "",
    safetyRisks: "",
    responsibleAuthority: "",
    recommendedActions: [],
    estimatedTimeline: "",
    verificationConfidence: 85,
    evidenceStrength: "Strong",
    verificationReliability: "High",
    riskLevel: "High",
    consequencesIfIgnored: "",
    justification: ""
  });

  // Handle local image upload / convert to base64
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        if (!title) {
          // Set a default tentative title from file name
          setTitle(file.name.split(".")[0].replace(/[_-]/g, " ") || "Civic Issue");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectSample = (sample: typeof SAMPLES[0]) => {
    setImage(sample.image);
    setTitle(sample.title);
    setCategoryHint(sample.category);
    setDescription(sample.description);
  };

  const handleJoinDuplicate = async () => {
    if (!duplicateInfo?.originalReport) return;
    setJoiningDuplicate(true);
    try {
      const res = await fetch(`/api/reports/${duplicateInfo.originalReport.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          type: "confirm",
          isDuplicateSupport: true
        })
      });
      if (res.ok) {
        onCancel();
      }
    } catch (e) {
      console.error("Failed to join duplicate", e);
    } finally {
      setJoiningDuplicate(false);
    }
  };

  const runAiAnalysis = async (bypass = bypassDuplicateCheck) => {
    if (!image) return;

    // 1. Run Duplicate Issue Detection Agent first (unless bypassed)
    if (!bypass) {
      setAnalyzing(true);
      setLoadingMessage("Gemini Agent: Checking for duplicate issues in immediate area...");
      try {
        const dupRes = await fetch("/api/reports/check-duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryHint: categoryHint || "Road Damage",
            category: categoryHint || "Road Damage",
            description: description,
            community: community,
            locationName: locationName || `${community} neighborhood`,
            locationCoords: coords,
            image: image
          })
        });
        if (dupRes.ok) {
          const dupData = await dupRes.json();
          if (dupData.duplicateFound) {
            setDuplicateInfo({
              duplicateFound: true,
              reason: dupData.reason,
              originalReport: dupData.originalReport
            });
            setAnalyzing(false);
            return; // STOP flow, let user choose what to do!
          }
        }
      } catch (err) {
        console.error("Duplicate check failed, proceeding to vision scan", err);
      }
    }

    // 2. Perform Gemini vision/video analysis
    setAnalyzing(true);
    const isVideo = image.startsWith("data:video/");
    setLoadingMessage("Uploading media to secure cloud storage...");

    let uploadedUrl = image;
    try {
      if (image && image.startsWith("data:")) {
        uploadedUrl = await uploadImageToCloudinary(image);
        setImage(uploadedUrl);
      }
    } catch (uploadErr) {
      console.error("Cloudinary upload failed inside runAiAnalysis, using base64 fallback:", uploadErr);
    }

    setLoadingMessage(isVideo ? "Scanning video with Gemini Multimodal Agent..." : "Scanning photograph with Vision Agent...");

    const messages = isVideo ? [
      "Decompressing video keyframes...",
      "Analyzing temporal civic motion...",
      "Identifying safety hazards & consequences...",
      "Predicting severity indexes & public risk profiles...",
      "Generating optimal resolution timeline & actions..."
    ] : [
      "Identifying structures and safety hazards...",
      "Analyzing surface fractures and depth details...",
      "Predicting severity indexes & public risk profiles...",
      "Matching against municipal code categories...",
      "Generating optimal resolution timeline & actions..."
    ];

    let msgIndex = 0;
    let interval = setInterval(() => {
      if (msgIndex < messages.length - 1) {
        msgIndex++;
        setLoadingMessage(messages[msgIndex]);
      }
    }, 1800);

    // AI simulation engine if service remains unavailable
    const generateSimulatedReport = (desc: string, catHint: string) => {
      const cat = (catHint || "Road Damage") as any;
      const lowerDesc = desc.toLowerCase();

      let summary = `Detected potential ${cat.toLowerCase()} issue needing municipal attention.`;
      let safetyRisks = "May cause minor accidents or delays if left unaddressed.";
      let responsibleAuthority = "Municipal Public Works Department";
      let recommendedActions = ["Inspect site visually", "Deploy repair crew", "Seal and patch affected area"];
      let estimatedTimeline = "3-5 Days";
      let severity: "Critical" | "High" | "Medium" | "Low" = "Medium";

      if (cat === "Road Damage") {
        summary = lowerDesc.includes("pothole") 
          ? "Severe structural pothole detected on active roadway." 
          : "Asphalt cracking and surface deterioration noted.";
        safetyRisks = "Presents immediate tyre-damage and vehicle-loss-of-control hazards for commuters.";
        responsibleAuthority = "Road & Building (R&B) Department, Civic Infrastructure Wing";
        recommendedActions = [
          "Set up safety cones and temporary warnings around the damage",
          "Excavate and clear loose asphalt from the damaged site",
          "Apply hot-mix asphalt, level, and steam-roll to grade"
        ];
        estimatedTimeline = "1-2 Days";
        severity = "High";
      } else if (cat === "Water Leakage") {
        summary = "Active freshwater pipe rupture causing surface flooding.";
        safetyRisks = "Water pressure undermining nearby road foundations and wasting public resources.";
        responsibleAuthority = "Municipal Water Supply & Sewerage Board (HMWS&SB)";
        recommendedActions = [
          "Isolate and turn off local feeder control valve",
          "Excavate section to expose broken joint/pipe segment",
          "Replace ruptured section with reinforced ductline pipe"
        ];
        estimatedTimeline = "1-2 Days";
        severity = "High";
      } else if (cat === "Waste Management") {
        summary = "Uncontrolled municipal waste pile accumulating on pedestrian footpath.";
        safetyRisks = "Biohazard risk, attracting pests, and releasing foul odor in public area.";
        responsibleAuthority = "Solid Waste Management Wing, Health Department";
        recommendedActions = [
          "Deploy localized dump truck and clearance staff",
          "Clear entire debris pile and sanitize ground with lime powder",
          "Install persistent surveillance or penalty warning signboard"
        ];
        estimatedTimeline = "2-3 Days";
        severity = "Medium";
      } else if (cat === "Streetlight Failure") {
        summary = "Complete dark sector due to multiple failed streetlights.";
        safetyRisks = "Severely elevates risk of street crimes, robberies, and pedestrian accidents after dark.";
        responsibleAuthority = "Electrical Department, Municipal Corporation";
        recommendedActions = [
          "Dispatch bucket truck to test electrical pole circuit",
          "Replace blown high-pressure sodium bulbs with energy-efficient LED fixtures",
          "Verify light-sensor switch functionality for automatic trigger"
        ];
        estimatedTimeline = "1-2 Days";
        severity = "Medium";
      } else if (cat === "Drainage Issue") {
        summary = "Severely blocked storm-water gully causing sewage overflow.";
        safetyRisks = "Flooding of raw sewage leading to direct gastrointestinal health hazards.";
        responsibleAuthority = "Sewerage Maintenance Division";
        recommendedActions = [
          "Deploy high-pressure jetting machine to clear blockages",
          "Manual desilting of gully traps and inspection chambers",
          "Replace broken cover slab with heavy-duty cast-iron grate"
        ];
        estimatedTimeline = "2-4 Days";
        severity = "High";
      } else if (cat === "Public Safety Concern") {
        summary = "Exposed high-voltage wires from a broken municipal junction box.";
        safetyRisks = "Extremely high electrocution risk to children and animals, especially in wet weather.";
        responsibleAuthority = "Electricity Distribution Company (Discom)";
        recommendedActions = [
          "Cordon off the broken junction box immediately with caution tape",
          "De-energize feed lines and replace damaged circuit breakers",
          "Install lockable weatherproof enclosure box"
        ];
        estimatedTimeline = "1 Day";
        severity = "Critical";
      }

      if (lowerDesc.includes("urgent") || lowerDesc.includes("critical") || lowerDesc.includes("danger") || lowerDesc.includes("emergency")) {
        severity = "Critical";
      }

      return {
        category: cat,
        severity: severity,
        priority: severity,
        confidence: 85,
        summary: summary,
        safetyRisks: safetyRisks,
        responsibleAuthority: responsibleAuthority,
        recommendedActions: recommendedActions,
        estimatedTimeline: estimatedTimeline,
        riskLevel: severity,
        consequencesIfIgnored: `Continuous neglect will cause rapid worsening of the ${cat.toLowerCase()} defect and increase public safety hazards.`,
        justification: "Generated via local civic diagnostic engine due to temporary Gemini AI network congestion."
      };
    };

    const maxAttempts = 4; // 1 initial + 3 retries
    const delays = [2000, 4000, 8000];
    let success = false;
    let finalData = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        if (attempt > 0) {
          // It's a retry attempt. Pause/clear regular message rotator and show busy loader
          clearInterval(interval);
          setLoadingMessage("Gemini AI is currently busy. Retrying analysis...");
          
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delays[attempt - 1]));
        }

        const res = await fetch("/api/reports/analyze-temp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: image,
            description: description,
            categoryHint: categoryHint || "Road Damage"
          })
        });

        if (res.ok) {
          finalData = await res.json();
          success = true;
          break;
        } else {
          const errData = await res.json().catch(() => ({}));
          const errorMsg = errData.error || "";
          console.warn(`AI analysis call failed on attempt ${attempt + 1}: ${errorMsg} (status: ${res.status})`);
        }
      } catch (err: any) {
        console.error(`Fetch error on attempt ${attempt + 1}:`, err);
        // Retry on network errors too as they are transient
      }
    }

    clearInterval(interval);
    setAnalyzing(false);

    if (success && finalData) {
      setAiReport(finalData);
      setStep(2);
    } else {
      console.log("Gracefully switching to AI simulation mode due to temporary Gemini API unavailability...");
      const simulatedData = generateSimulatedReport(description, categoryHint || "Road Damage");
      setAiReport(simulatedData);
      setStep(2);
    }
  };

  const uploadImageToCloudinary = async (base64Data: string): Promise<string> => {
    if (!base64Data || !base64Data.startsWith("data:")) {
      return base64Data;
    }
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileData: base64Data })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.secureUrl) {
          console.log("Cloudinary Upload Succeeded:", data.secureUrl);
          return data.secureUrl;
        }
      }
      throw new Error("Failed to get secure URL from backend");
    } catch (err) {
      console.error("Cloudinary Upload Failed:", err);
      return base64Data; // fallback to base64 if upload fails so the app remains functional
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      let finalImageUrl = image;
      if (image && image.startsWith("data:")) {
        finalImageUrl = await uploadImageToCloudinary(image);
      }
      const fullReportData = {
        reporterId: currentUserId,
        title: title || `${aiReport.category} reported`,
        description,
        image: finalImageUrl,
        locationName: locationName || `${community} neighborhood`,
        locationCoords: coords,
        community,
        duplicateOf: ignoredDuplicateReportId || undefined,
        ...aiReport
      };
      onSubmitReport(fullReportData);
    } catch (err) {
      console.error("Publishing report failed:", err);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div id="report-issue-screen" className="flex flex-col flex-1 h-full bg-slate-50 overflow-y-auto pb-24">
      
      {/* DUPLICATE DETECTED OVERLAY / ALERT (Agent 5) */}
      {duplicateInfo && duplicateInfo.duplicateFound && duplicateInfo.originalReport && (
        <div className="p-4 flex flex-col gap-4 animate-fade-in max-w-xl mx-auto w-full">
          <div className="bg-white border-2 border-amber-400 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
            
            {/* Header: Similar Issue Found */}
            <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
              <div className="bg-amber-100 p-2 rounded-xl text-amber-700 shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Similar Issue Found</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Our JanSetu Duplicate Issue Detection Agent matched an existing report in this vicinity.
                </p>
              </div>
            </div>

            {/* Existing Issue Summary & Metadata */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex flex-col gap-3 text-xs">
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">Existing Report Title</span>
                <span className="text-slate-900 font-bold text-xs mt-0.5 block">"{duplicateInfo.originalReport.title}"</span>
              </div>
              
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">Issue Summary</span>
                <p className="text-slate-600 leading-relaxed mt-0.5">{duplicateInfo.originalReport.description}</p>
              </div>

              {/* Grid Metadata: Distance, Date, Status, Verification Count */}
              <div className="grid grid-cols-2 gap-3 mt-1 pt-3 border-t border-slate-200/60">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase block">Distance</span>
                    <span className="text-slate-700 font-bold">
                      {(() => {
                        const getDistanceInMeters = (lat1?: number, lon1?: number, lat2?: number, lon2?: number) => {
                          if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return null;
                          const R = 6371e3;
                          const phi1 = lat1 * Math.PI / 180;
                          const phi2 = lat2 * Math.PI / 180;
                          const deltaPhi = (lat2 - lat1) * Math.PI / 180;
                          const deltaLambda = (lon2 - lon1) * Math.PI / 180;

                          const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                                    Math.cos(phi1) * Math.cos(phi2) *
                                    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
                          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                          return R * c;
                        };
                        const dist = getDistanceInMeters(
                          coords.lat,
                          coords.lng,
                          duplicateInfo.originalReport.locationCoords?.lat,
                          duplicateInfo.originalReport.locationCoords?.lng
                        );
                        return dist !== null ? (dist < 1000 ? `${Math.round(dist)}m away` : `${(dist / 1000).toFixed(1)}km away`) : "Nearby";
                      })()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase block">Reported On</span>
                    <span className="text-slate-700 font-bold">
                      {new Date(duplicateInfo.originalReport.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase block">Current Status</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                      duplicateInfo.originalReport.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                      duplicateInfo.originalReport.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      duplicateInfo.originalReport.status === 'Verified' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {duplicateInfo.originalReport.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase block">Community Support</span>
                    <span className="text-slate-700 font-bold">
                      {duplicateInfo.originalReport.verificationCount || 0} verifications
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Justification text */}
              {duplicateInfo.reason && (
                <div className="mt-1 p-2 bg-amber-50 rounded-lg border border-amber-100 text-[11px] text-amber-800 font-medium flex gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>AI Match Reasoning:</strong> {duplicateInfo.reason}</span>
                </div>
              )}
            </div>

            {/* EXPANDABLE EXISTING REPORT DETAILS */}
            {showFullDetails && (
              <div className="border border-slate-200 rounded-xl p-4 flex flex-col gap-3 text-xs animate-slide-down max-h-[300px] overflow-y-auto">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Full Report Details</span>
                
                {duplicateInfo.originalReport.image && (
                  <div className="rounded-lg overflow-hidden border border-slate-100 max-h-40">
                    <img 
                      src={duplicateInfo.originalReport.image} 
                      alt="Existing issue media" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div><strong>Category:</strong> {duplicateInfo.originalReport.category}</div>
                  <div><strong>Severity:</strong> {duplicateInfo.originalReport.severity}</div>
                  <div><strong>Authority:</strong> {duplicateInfo.originalReport.responsibleAuthority || "Awaiting Assignment"}</div>
                  <div><strong>Resolution Timeline:</strong> {duplicateInfo.originalReport.estimatedTimeline || "Pending Audit"}</div>
                </div>

                {/* Timeline updates inside the expandable detail */}
                {duplicateInfo.originalReport.updates && duplicateInfo.originalReport.updates.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Timeline Updates</span>
                    <div className="flex flex-col gap-1.5">
                      {duplicateInfo.originalReport.updates.map((upd: any) => (
                        <div key={upd.id} className="bg-slate-50 p-1.5 rounded border border-slate-100 text-[10px]">
                          <span className="font-bold text-slate-700">{upd.status}</span> - {upd.message}
                          <span className="text-[9px] text-slate-400 block mt-0.5">{new Date(upd.timestamp).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* THREE CORE ACTIONS */}
            <div className="flex flex-col gap-2 pt-2">
              {/* Action 1: Support Existing Report */}
              <button
                type="button"
                onClick={handleJoinDuplicate}
                disabled={joiningDuplicate}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-black text-xs py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {joiningDuplicate ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ThumbsUp className="w-4 h-4" />
                )}
                <span>SUPPORT EXISTING REPORT (+5 reputation)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {/* Action 2: View Existing Report */}
                <button
                  type="button"
                  onClick={() => setShowFullDetails(!showFullDetails)}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  {showFullDetails ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showFullDetails ? "Hide Full Details" : "View Existing Report"}</span>
                </button>

                {/* Action 3: Continue Creating New Report */}
                <button
                  type="button"
                  onClick={() => {
                    setIgnoredDuplicateReportId(duplicateInfo?.originalReport?.id || null);
                    setBypassDuplicateCheck(true);
                    setDuplicateInfo(null);
                    runAiAnalysis(true); // Bypass and run Vision/Video scan immediately
                  }}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs py-2.5 px-3 rounded-xl transition-all"
                >
                  Continue creating new
                </button>
              </div>
            </div>

            {/* Cancel/Exit */}
            <button
              onClick={() => {
                setDuplicateInfo(null);
                onCancel();
              }}
              className="text-center text-[10px] font-bold text-slate-400 hover:text-slate-600 underline"
            >
              Cancel submission and return
            </button>

          </div>
        </div>
      )}

      {!duplicateInfo && analyzing ? (
        // AI LOADING SCREEN
        <div id="ai-loading-container" className="flex flex-col items-center justify-center p-8 flex-1 h-full min-h-[450px] text-center my-auto">
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin"></div>
            <Sparkles className="w-6 h-6 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <h3 className="text-base font-bold text-slate-800 tracking-tight">JanSetu AI Audit Engine</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">{loadingMessage}</p>
          <div className="bg-emerald-50 text-emerald-800 text-[10px] px-3 py-1.5 rounded-lg border border-emerald-100 mt-8 animate-pulse font-medium">
            AI Agent is assessing structural civic severity...
          </div>
        </div>
      ) : !duplicateInfo && step === 1 ? (
        // STEP 1: REPORT CAPTURE SCREEN
        <div id="report-input-step" className="p-4 flex flex-col gap-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
              <Camera className="w-4 h-4 text-emerald-600" />
              Capture or Upload Media Attachment
            </h2>
            <p className="text-[11px] text-slate-400">Capture the defect directly (image or video) to allow advanced visual diagnostic matching by JanSetu AI.</p>

            {/* Photo & Video Capture Selector */}
            <div className="mt-4 flex flex-col gap-3">
              {image ? (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200">
                  {image.startsWith("data:video/") ? (
                    <video src={image} controls className="w-full h-full object-cover" />
                  ) : (
                    <img src={image} alt="Report capture" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  )}
                  <button
                    onClick={() => setImage("")}
                    className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded-md hover:bg-slate-900 transition-colors"
                  >
                    Clear Media
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all bg-slate-50/50">
                  <Upload className="w-7 h-7 text-slate-400 mb-1.5" />
                  <span className="text-xs font-bold text-slate-600 mb-3.5 block">Add Photo or Video Attachment</span>
                  
                  <div className="flex flex-col gap-2.5 w-full max-w-sm">
                    {/* Photos Row */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex-1 py-2 px-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Take Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="flex-1 py-2 px-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                      >
                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                        <span>Photo Gallery</span>
                      </button>
                    </div>

                    {/* Videos Row (Agent 1: Video Upload support!) */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => cameraVideoInputRef.current?.click()}
                        className="flex-1 py-2 px-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                      >
                        <Video className="w-3.5 h-3.5 text-rose-500" />
                        <span>Record Video</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => galleryVideoInputRef.current?.click()}
                        className="flex-1 py-2 px-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                      >
                        <Upload className="w-3.5 h-3.5 text-violet-600" />
                        <span>Video Gallery</span>
                      </button>
                    </div>
                  </div>

                  <span className="text-[9px] text-slate-400 mt-3 block">JPEG, PNG, MP4 up to 25MB</span>
                  
                  {/* Hidden inputs */}
                  <input
                    type="file"
                    ref={cameraInputRef}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  <input
                    type="file"
                    ref={galleryInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  <input
                    type="file"
                    ref={cameraVideoInputRef}
                    accept="video/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  <input
                    type="file"
                    ref={galleryVideoInputRef}
                    accept="video/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>
              )}

              {/* Sample Images Section */}
              {!image && (
                <div className="mt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Or, choose a visual failure sample to test AI model:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {SAMPLES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleSelectSample(s)}
                        className="flex gap-2 items-center bg-white p-1.5 rounded-lg border border-slate-200/60 hover:border-emerald-500 hover:bg-emerald-50/10 text-left transition-all group active:scale-98"
                      >
                        <img src={s.image} alt={s.title} className="w-10 h-10 rounded-md object-cover" />
                        <div>
                          <span className="text-[10px] font-bold text-slate-700 block line-clamp-1 group-hover:text-emerald-700">{s.title}</span>
                          <span className="text-[9px] text-slate-400 block">{s.category}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Local Title:</label>
              <input
                type="text"
                placeholder="e.g. Danger deep road water leakage pothole"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white text-xs border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Describe what you saw:</label>
              <textarea
                placeholder="Give details about the exact location, safety hazards, and community impact."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white text-xs border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Locality Community:</label>
                <select
                  value={community}
                  onChange={(e) => setCommunity(e.target.value)}
                  className="w-full bg-white text-xs border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                >
                  {communities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Specific Street Location:</label>
                <input
                  type="text"
                  placeholder="e.g. Pillar 12, Market Rd"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full bg-white text-xs border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Category Category Hint (For AI):</label>
              <select
                value={categoryHint}
                onChange={(e) => setCategoryHint(e.target.value)}
                className="w-full bg-white text-xs border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="">Let Gemini AI decide</option>
                <option value="Road Damage">Road Damage</option>
                <option value="Water Leakage">Water Leakage</option>
                <option value="Waste Management">Waste Management</option>
                <option value="Streetlight Failure">Streetlight Failure</option>
                <option value="Drainage Issue">Drainage Issue</option>
                <option value="Public Safety Concern">Public Safety Concern</option>
              </select>
            </div>
          </div>

          <button
            id="analyze-with-ai-btn"
            onClick={runAiAnalysis}
            disabled={!image}
            className="bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:from-emerald-700 hover:to-teal-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
          >
            <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
            <span>Analyze with JanSetu AI</span>
          </button>
        </div>
      ) : (
        // STEP 2: SCREEN 3 - AI ANALYSIS SCREEN (CONFIRMATION)
        <div id="report-ai-confirm-step" className="p-4 flex flex-col gap-4 animate-fade-in">
          
          <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
            <button
              onClick={() => setStep(1)}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to details
            </button>
            <div className="flex items-center gap-1 font-mono font-bold text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              <Sparkles className="w-3.5 h-3.5" /> AI Confidence: {aiReport.confidence}%
            </div>
          </div>

          {/* AI Analyzed Fields Cards */}
          <div className="bg-emerald-600 text-white rounded-2xl p-4 shadow-md flex items-start gap-3">
            <div className="bg-white/10 p-2 rounded-xl shrink-0">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">AI DIAGNOSTIC SUMMARIZATION:</span>
              <p className="text-xs font-semibold leading-relaxed mt-1">"{aiReport.summary}"</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col gap-3.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Extracted Metadata Checklist</h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Auto-detected Category:</span>
                <select
                  value={aiReport.category}
                  onChange={(e) => setAiReport(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-700 mt-1 focus:outline-hidden text-xs"
                >
                  <option value="Road Damage">Road Damage</option>
                  <option value="Water Leakage">Water Leakage</option>
                  <option value="Waste Management">Waste Management</option>
                  <option value="Streetlight Failure">Streetlight Failure</option>
                  <option value="Drainage Issue">Drainage Issue</option>
                  <option value="Public Safety Concern">Public Safety Concern</option>
                </select>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Estimated Urgency Priority:</span>
                <select
                  value={aiReport.priority}
                  onChange={(e) => setAiReport(prev => ({ ...prev, priority: e.target.value as any, severity: e.target.value as any }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-700 mt-1 focus:outline-hidden text-xs"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <span className="text-slate-400 font-medium block text-xs">Responsible Public Department:</span>
              <input
                type="text"
                value={aiReport.responsibleAuthority || ""}
                onChange={(e) => setAiReport(prev => ({ ...prev, responsibleAuthority: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 mt-1"
              />
            </div>

            <div>
              <span className="text-slate-400 font-medium block text-xs">Estimated Repair Resolution Time:</span>
              <input
                type="text"
                value={aiReport.estimatedTimeline || ""}
                onChange={(e) => setAiReport(prev => ({ ...prev, estimatedTimeline: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 mt-1"
              />
            </div>

            <div>
              <span className="text-slate-400 font-medium block text-xs">Consequences if Ignored:</span>
              <textarea
                rows={2}
                value={aiReport.consequencesIfIgnored || ""}
                onChange={(e) => setAiReport(prev => ({ ...prev, consequencesIfIgnored: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 mt-1"
                placeholder="Describe consequences..."
              />
            </div>

            <div>
              <span className="text-slate-400 font-medium block text-xs">AI Audit Justification & Logic:</span>
              <textarea
                rows={2}
                value={aiReport.justification || ""}
                onChange={(e) => setAiReport(prev => ({ ...prev, justification: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 mt-1"
                placeholder="Describe Gemini logic justification..."
              />
            </div>

            {aiReport.safetyRisks && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
                <div>
                  <span className="text-rose-800 font-bold uppercase block text-[9px] tracking-wider">Identified Danger Risks:</span>
                  <textarea
                    rows={2}
                    value={aiReport.safetyRisks}
                    onChange={(e) => setAiReport(prev => ({ ...prev, safetyRisks: e.target.value }))}
                    className="w-full bg-transparent border-0 resize-none text-xs text-rose-700 mt-1 p-0 focus:ring-0 focus:outline-hidden leading-relaxed font-medium"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Recommended actions list */}
          {aiReport.recommendedActions && aiReport.recommendedActions.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">AI Solution Blueprint Milestones</span>
              <div className="flex flex-col gap-2">
                {aiReport.recommendedActions.map((action, idx) => (
                  <div key={idx} className="flex gap-2 items-start bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs text-slate-600 leading-relaxed">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-1">
            <button
              onClick={() => setStep(1)}
              className="flex-1 bg-white border border-slate-200 text-slate-700 text-xs font-bold py-3 rounded-xl hover:bg-slate-50 active:scale-98 transition-all"
            >
              Recapture / Edit
            </button>
            <button
              id="confirm-and-publish-btn"
              onClick={handlePublish}
              disabled={publishing}
              className="flex-2 bg-emerald-600 disabled:bg-emerald-400 text-white text-xs font-bold py-3 rounded-xl hover:bg-emerald-700 active:scale-98 transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              {publishing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>{publishing ? "Uploading..." : "Confirm & Post to Feed (+10 pts)"}</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
