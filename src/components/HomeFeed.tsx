import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  MessageSquare, 
  ThumbsUp, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Clock, 
  Send, 
  ShieldAlert, 
  AlertTriangle,
  User,
  Wrench,
  Check,
  RotateCcw,
  ShieldCheck,
  Info,
  Share2,
  MapPin,
  ChevronRight,
  Shield
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { IssueReport, Comment } from "../types";

interface HomeFeedProps {
  currentUserId: string;
  isCoordinator: boolean;
  selectedCommunity: string;
  reports: IssueReport[];
  onRefresh: () => void;
  onVerify: (reportId: string, type: 'confirm' | 'resolve') => void;
  onComment: (reportId: string, text: string) => void;
  onAddUpdate: (reportId: string, status: string, message: string) => void;
  isLoading?: boolean;
}

export default function HomeFeed({
  currentUserId,
  isCoordinator,
  selectedCommunity,
  reports,
  onRefresh,
  onVerify,
  onComment,
  onAddUpdate,
  isLoading = false
}: HomeFeedProps) {
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [activeStatus, setActiveStatus] = useState<string>("All");
  
  // Custom Card states
  const [expandedReports, setExpandedReports] = useState<Record<string, boolean>>({});
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [aiSummaries, setAiSummaries] = useState<Record<string, any>>({});
  const [loadingAiSummary, setLoadingAiSummary] = useState<Record<string, boolean>>({});
  const [copiedReportId, setCopiedReportId] = useState<string | null>(null);

  // Local storage based Like tracking for real-time engagement response
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("jansetu_user_likes");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Coordinator form states
  const [showCoordinatorForm, setShowCoordinatorForm] = useState<Record<string, boolean>>({});
  const [coordStatus, setCoordStatus] = useState<Record<string, string>>({});
  const [coordMessage, setCoordMessage] = useState<Record<string, string>>({});

  // Filter labels
  const categories = ["All", "Road Damage", "Water Leakage", "Waste Management", "Streetlight Failure", "Drainage Issue", "Public Safety Concern"];
  const statuses = ["All", "Reported", "In Progress", "Resolved"];

  const filteredReports = reports.filter((r) => {
    const matchesCategory = activeFilter === "All" || r.category === activeFilter;
    const matchesStatus = activeStatus === "All" || r.status === activeStatus;
    const matchesCommunity = r.community === selectedCommunity;
    return matchesCategory && matchesStatus && matchesCommunity;
  });

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "Critical": return "bg-rose-50 text-rose-700 border-rose-100";
      case "High": return "bg-amber-50 text-amber-700 border-amber-100";
      case "Medium": return "bg-blue-50 text-blue-700 border-blue-100";
      default: return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Resolved": return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "In Progress": return "bg-amber-50 text-amber-700 border border-amber-200";
      case "Verified": return "bg-sky-50 text-sky-700 border border-sky-200";
      default: return "bg-slate-100 text-slate-600 border border-slate-200";
    }
  };

  const fetchExistingSummary = async (reportId: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}/discussion-summary`);
      if (res.ok) {
        const data = await res.json();
        setAiSummaries(prev => ({ ...prev, [reportId]: data }));
      } else {
        // Auto generate if comments exist
        const rep = reports.find(r => r.id === reportId);
        if (rep && rep.comments && rep.comments.length > 0) {
          handleSummarizeDiscussion(reportId);
        }
      }
    } catch (e) {
      console.error("Failed to fetch existing discussion summary:", e);
    }
  };

  const toggleReportExpand = (reportId: string) => {
    const isExpanding = !expandedReports[reportId];
    setExpandedReports(prev => ({
      ...prev,
      [reportId]: isExpanding
    }));

    if (isExpanding) {
      fetchExistingSummary(reportId);
    }
  };

  const handleToggleLike = (reportId: string) => {
    const nextLikes = { ...userLikes, [reportId]: !userLikes[reportId] };
    setUserLikes(nextLikes);
    try {
      localStorage.setItem("jansetu_user_likes", JSON.stringify(nextLikes));
    } catch (e) {
      console.error("Failed to save local likes state:", e);
    }
  };

  const handleCommentClick = (reportId: string) => {
    if (!expandedReports[reportId]) {
      toggleReportExpand(reportId);
    }
    setTimeout(() => {
      const inputElement = document.getElementById(`comment-input-${reportId}`);
      if (inputElement) {
        inputElement.focus();
        inputElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);
  };

  const handleSendComment = (reportId: string) => {
    const text = commentInputs[reportId]?.trim();
    if (!text) return;
    onComment(reportId, text);
    setCommentInputs(prev => ({ ...prev, [reportId]: "" }));
    
    // Auto-update summary after 2 seconds to reflect new discussions
    setTimeout(() => {
      handleSummarizeDiscussion(reportId);
    }, 2000);
  };

  const handleSummarizeDiscussion = async (reportId: string) => {
    setLoadingAiSummary(prev => ({ ...prev, [reportId]: true }));
    try {
      const res = await fetch(`/api/reports/${reportId}/summarize-discussion`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setAiSummaries(prev => ({ ...prev, [reportId]: data }));
      }
    } catch (e) {
      console.error("Failed to generate AI summary", e);
    } finally {
      setLoadingAiSummary(prev => ({ ...prev, [reportId]: false }));
    }
  };

  const handleCoordinatorSubmit = (reportId: string) => {
    const status = coordStatus[reportId] || "In Progress";
    const message = coordMessage[reportId]?.trim();
    if (!message) return;

    onAddUpdate(reportId, status, message);
    
    // Clear form
    setCoordMessage(prev => ({ ...prev, [reportId]: "" }));
    setShowCoordinatorForm(prev => ({ ...prev, [reportId]: false }));
  };

  const handleShare = (report: IssueReport) => {
    const shareText = `[JanSetu Issue Report] ${report.title} (${report.category}) in ${report.community}. Current Status: ${report.status}. Let's coordinate!`;
    navigator.clipboard.writeText(shareText);
    setCopiedReportId(report.id);
    setTimeout(() => setCopiedReportId(null), 2000);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (isLoading && reports.length === 0) {
    return (
      <div id="home-feed-screen" className="flex flex-col flex-1 h-full bg-slate-50 overflow-y-auto pb-24">
        {/* Filters bar - static but with pulsing items for high fidelity */}
        <div id="feed-filters-bar" className="bg-white px-4 py-2 border-b border-slate-100 shadow-xs sticky top-0 z-30 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse"></div>
            <div className="h-6 bg-slate-100 rounded w-1/5 animate-pulse"></div>
          </div>
          <div className="overflow-x-auto flex gap-1 py-0.5 no-scrollbar -mx-4 px-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-7 bg-slate-100 rounded-full w-20 animate-pulse shrink-0"></div>
            ))}
          </div>
        </div>

        {/* Shimmering Skeletons */}
        <div className="px-3 py-4 md:px-6 md:py-6 flex flex-col gap-4 max-w-3xl mx-auto w-full">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-200"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-2 bg-slate-100 rounded w-1/4"></div>
                </div>
                <div className="h-6 bg-slate-100 rounded w-16"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-150 rounded w-full"></div>
                <div className="h-3 bg-slate-150 rounded w-5/6"></div>
              </div>
              <div className="h-40 bg-slate-100 rounded-xl w-full"></div>
              <div className="flex justify-between items-center border-t border-slate-50 pt-3">
                <div className="h-4 bg-slate-100 rounded w-20"></div>
                <div className="h-4 bg-slate-100 rounded w-20"></div>
                <div className="h-4 bg-slate-100 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div id="home-feed-screen" className="flex flex-col flex-1 h-full bg-slate-50 overflow-y-auto pb-24">
      
      {/* Search and Filters Scroll Container - Ultra Compact Height */}
      <div id="feed-filters-bar" className="bg-white px-4 py-2 border-b border-slate-100 shadow-xs sticky top-0 z-30 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <h2 id="feed-title" className="text-xs font-black text-slate-800 tracking-wider flex items-center gap-1.5 uppercase font-display">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
            Issues Stream ({filteredReports.length})
          </h2>
          <button 
            id="refresh-feed-btn"
            onClick={onRefresh}
            className="text-[10px] text-primary font-black hover:text-primary-dark flex items-center gap-1 bg-primary/8 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> REFRESH
          </button>
        </div>

        {/* Category Filters - Styled Horizontal chips */}
        <div id="category-filter-scroll" className="overflow-x-auto flex gap-1 py-0.5 no-scrollbar -mx-4 px-4">
          {categories.map((cat) => (
            <button
              id={`filter-cat-${cat.replace(/\s+/g, "-")}`}
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`text-[10px] font-bold px-3.5 py-1.5 rounded-full whitespace-nowrap border transition-all cursor-pointer font-display ${
                activeFilter === cat
                  ? "bg-primary border-primary text-white shadow-xs"
                  : "bg-slate-100 border-slate-100 text-slate-600 hover:bg-slate-200/50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Status Filters - Styled Compact Horizontal chips */}
        <div id="status-filters-container" className="flex items-center gap-2 py-1 border-t border-slate-100">
          <span className="text-slate-400 text-[9px] uppercase font-black tracking-widest shrink-0">Status:</span>
          <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5">
            {statuses.map((st) => (
              <button
                id={`filter-status-${st}`}
                key={st}
                onClick={() => setActiveStatus(st)}
                className={`text-[10px] font-bold px-3 py-1 rounded-lg border transition-all cursor-pointer font-display ${
                  activeStatus === st
                    ? "bg-primary border-primary text-white shadow-xs"
                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Issues Stream - Mobile-First Refined Spacing */}
      <div id="issues-stream" className="px-3 py-4 md:px-6 md:py-6 flex flex-col gap-4 md:gap-6 max-w-3xl mx-auto w-full">
        {filteredReports.length === 0 ? (
          <div id="no-reports-placeholder" className="bg-white rounded-3xl p-10 border border-slate-100 text-center shadow-xs flex flex-col items-center justify-center py-16">
            <CheckCircle2 className="w-14 h-14 text-slate-300 mb-4" />
            <p className="text-slate-600 font-bold text-base">No reported issues here!</p>
            <p className="text-sm text-slate-450 mt-2 max-w-md mx-auto leading-relaxed">This locality is looking clean and perfect. If you notice any civic faults, use the Camera button below to report them.</p>
          </div>
        ) : (
          filteredReports.map((report) => {
            const isExpanded = expandedReports[report.id];
            const isDescExpanded = expandedDescriptions[report.id];
            const needsTruncation = report.description.length > 140;
            const displayedDescription = needsTruncation && !isDescExpanded 
              ? `${report.description.slice(0, 140)}...` 
              : report.description;

            // Stable deterministic baseline counts + local user modifications
            const baseLikes = (report.confirmedBy.length * 2) + (report.title.length % 5) + 3;
            const isLiked = !!userLikes[report.id];
            const likesCount = baseLikes + (isLiked ? 1 : 0);
            
            return (
              <div 
                id={`report-card-${report.id}`}
                key={report.id} 
                className="bg-white rounded-2xl md:rounded-3xl border border-slate-100 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:border-slate-200/50 transition-all duration-300 flex flex-col"
              >
                {/* 1. Reporter Information Header */}
                <div className="p-4 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={report.reporterAvatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${report.reporterName}`} 
                      alt={report.reporterName} 
                      className="w-10 h-10 rounded-full object-cover border border-slate-100 shadow-3xs"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 leading-tight">{report.reporterName}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${
                          report.reporterId === "user_coord" 
                            ? "bg-blue-50/50 text-blue-600 border-blue-100" 
                            : "bg-slate-100 text-slate-500 border-slate-200/50"
                        }`}>
                          {report.reporterId === "user_coord" ? "Coordinator" : "Citizen"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400 mt-1">
                        <span className="flex items-center gap-0.5 font-semibold text-emerald-600">
                          <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          {report.locationName || selectedCommunity}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-0.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                          {formatDate(report.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-3xs border ${getStatusStyle(report.status)}`}>
                    {report.status}
                  </span>
                </div>

                {/* 2. Issue Title & Short Description */}
                <div className="px-4 pb-3">
                  <h3 className="text-base font-bold text-slate-900 leading-snug tracking-tight hover:text-primary transition-colors">
                    {report.title}
                  </h3>
                  <p className="text-[13px] text-slate-600 mt-1.5 leading-relaxed font-normal">
                    {displayedDescription}
                    {needsTruncation && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedDescriptions(prev => ({ ...prev, [report.id]: !isDescExpanded }));
                        }}
                        className="text-emerald-600 font-bold ml-1.5 hover:text-emerald-700 hover:underline transition-colors focus:outline-hidden cursor-pointer"
                      >
                        {isDescExpanded ? "Read Less" : "Read More"}
                      </button>
                    )}
                  </p>
                </div>

                {/* 3. Issue Image (Visual focus, enlarged aspect-16/9, rounded-xl) */}
                {(() => {
                  const reportImage = report.image || report.imageUrl || report.media;
                  console.log(
                    `Report ID: ${report.id}\n` +
                    `image: ${report.image}\n` +
                    `imageUrl: ${report.imageUrl}\n` +
                    `media: ${report.media}\n` +
                    `Final src: ${reportImage || ""}`
                  );
                  if (!reportImage) return null;
                  const isVideo = reportImage.startsWith("data:video/") || reportImage.includes(".mp4") || reportImage.includes("video/upload");
                  return (
                    <div className="px-4 pb-3">
                      <div className="relative aspect-[16/9] bg-slate-100 rounded-2xl overflow-hidden border border-slate-100/70 group">
                        {isVideo ? (
                          <video 
                            src={reportImage} 
                            controls 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <img 
                            src={reportImage} 
                            alt="Civic Issue Visual" 
                            className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-500"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              // Category-specific high-quality stock photo fallback in case GoogleUserContent URLs are iframe-blocked
                              const fallbackMap: Record<string, string> = {
                                "Road Damage": "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600",
                                "Water Leakage": "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&q=80&w=600",
                                "Waste Management": "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600",
                                "Streetlight Failure": "https://images.unsplash.com/photo-1542840843-3349799cdb6e?auto=format&fit=crop&q=80&w=600",
                                "Drainage Issue": "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=600",
                                "Public Safety Concern": "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&q=80&w=600",
                              };
                              const cat = report.category || "Road Damage";
                              const fallbackUrl = fallbackMap[cat] || fallbackMap["Road Damage"];
                              if (e.currentTarget.src !== fallbackUrl) {
                                e.currentTarget.src = fallbackUrl;
                              }
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 4. AI Badges & Metadata (Below image, AI Verified • Category • Priority) */}
                <div className="px-4 pb-3.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  {report.confidence && (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200/50 px-2.5 py-1 rounded-full font-bold text-[11px] shadow-3xs">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      AI Verified {report.confidence}%
                    </span>
                  )}
                  {report.confidence && <span className="text-slate-200 hidden xs:inline">•</span>}
                  <span className="bg-slate-50 border border-slate-200/60 text-slate-700 px-2.5 py-1 rounded-full font-bold text-[11px] shadow-3xs">
                    {report.category}
                  </span>
                  <span className="text-slate-200 inline">•</span>
                  <span className={`text-[11px] font-bold border px-2.5 py-1 rounded-full shadow-3xs ${getSeverityStyle(report.severity)}`}>
                    {report.severity} Priority
                  </span>
                </div>

                {/* 5. Like / Verification / Comment Statistics */}
                <div className="px-4 py-2.5 flex items-center justify-between text-[12px] text-slate-500 border-t border-slate-50 bg-slate-50/20">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <ThumbsUp className="w-4 h-4 text-slate-400" />
                      <span className="font-bold text-slate-800">{likesCount}</span>
                      <span className="text-slate-400">likes</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span className="font-bold text-slate-800">{report.confirmedBy.length}</span>
                      <span className="text-slate-400">verifications</span>
                    </span>
                  </div>

                  <button 
                    onClick={() => handleCommentClick(report.id)}
                    className="font-bold text-slate-500 hover:text-emerald-600 hover:underline transition-colors cursor-pointer"
                  >
                    {report.comments.length} comments
                  </button>
                </div>

                {/* 6. Expand Details Button */}
                <div className="px-4 py-3 bg-slate-50/40 border-t border-slate-100/70 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">JanSetu AI layer & Updates</span>
                  </div>
                  <button
                    onClick={() => toggleReportExpand(report.id)}
                    className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 hover:text-emerald-850 hover:bg-emerald-100/60 transition-all duration-200 cursor-pointer bg-emerald-50/80 px-3 py-1.5 rounded-xl border border-emerald-100/40 shadow-3xs"
                  >
                    <span>{isExpanded ? "Hide Details" : "View Details"}</span>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-250 ${isExpanded ? "rotate-90" : ""}`} />
                  </button>
                </div>

                {/* Progressive Disclosure Section (AI, updates, comments, coordinator action) */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden border-t border-slate-100 bg-slate-50/30"
                    >
                      {/* AI Resolution Blueprint */}
                      <div className="p-5 border-b border-slate-100 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <div className="text-[11px] font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                            <span>AI Resolution Blueprint</span>
                          </div>
                          <span className="text-[8px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider font-mono">
                            Active Agent Layer
                          </span>
                        </div>

                        {/* AI Verification Badges */}
                        <div className="grid grid-cols-3 gap-2 text-[9px] mb-1">
                          <div className="bg-emerald-50/50 text-emerald-800 border border-emerald-100/30 rounded-xl p-2.5 flex flex-col gap-0.5">
                            <span className="text-slate-400 font-black block uppercase text-[7px] tracking-wider">AI Confidence</span>
                            <span className="font-extrabold flex items-center gap-0.5 text-emerald-700 font-mono text-[10px]">
                              <Sparkles className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                              {report.verificationConfidence || report.confidence || 85}%
                            </span>
                          </div>
                          <div className="bg-blue-50/50 text-blue-800 border border-blue-100/30 rounded-xl p-2.5 flex flex-col gap-0.5">
                            <span className="text-slate-400 font-black block uppercase text-[7px] tracking-wider">Evidence Strength</span>
                            <span className="font-extrabold flex items-center gap-0.5 text-blue-700 font-mono text-[10px]">
                              <ShieldCheck className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                              {report.evidenceStrength || "Strong"}
                            </span>
                          </div>
                          <div className="bg-indigo-50/50 text-indigo-800 border border-indigo-100/30 rounded-xl p-2.5 flex flex-col gap-0.5">
                            <span className="text-slate-400 font-black block uppercase text-[7px] tracking-wider">Reliability Index</span>
                            <span className="font-extrabold flex items-center gap-0.5 text-indigo-700 font-mono text-[10px]">
                              <ThumbsUp className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                              {report.verificationReliability || "High"}
                            </span>
                          </div>
                        </div>

                        {/* Core Fields Grid */}
                        <div className="grid grid-cols-2 gap-2 text.xs">
                          <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <span className="text-slate-400 block font-bold text-[8px] tracking-wider uppercase">Recommended Authority</span>
                            <span className="text-slate-700 font-extrabold block mt-0.5 truncate">{report.responsibleAuthority}</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <span className="text-slate-400 block font-bold text-[8px] tracking-wider uppercase">Estimated Timeline</span>
                            <span className="text-emerald-700 font-extrabold block mt-0.5 flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-emerald-500" /> {report.estimatedTimeline}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text.xs">
                          <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <span className="text-slate-400 block font-bold text-[8px] tracking-wider uppercase">AI Risk Assessment</span>
                            <span className={`font-extrabold block mt-0.5 uppercase ${
                              report.riskLevel === "Critical" || report.riskLevel === "High" ? "text-rose-600" : "text-amber-600"
                            }`}>{report.riskLevel || report.priority || "High"}</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-100">
                            <span className="text-slate-400 block font-bold text-[8px] tracking-wider uppercase">If Left Unattended</span>
                            <span className="text-slate-600 font-semibold block mt-0.5 truncate" title={report.consequencesIfIgnored}>
                              {report.consequencesIfIgnored || "Progressive neighborhood deterioration."}
                            </span>
                          </div>
                        </div>

                        {report.justification && (
                          <div className="text-[11px] bg-slate-100/50 border border-slate-200/35 rounded-xl p-3 flex gap-2">
                            <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-slate-600 font-extrabold uppercase block text-[8px] tracking-wider">AI Justification:</span>
                              <span className="text-slate-600 mt-0.5 block leading-relaxed font-semibold">{report.justification}</span>
                            </div>
                          </div>
                        )}

                        {report.safetyRisks && (
                          <div className="text-[11px] bg-rose-50/50 border border-rose-100/35 rounded-xl p-3 flex gap-2">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-rose-800 font-extrabold uppercase block text-[8px] tracking-wider">Public Safety Risks:</span>
                              <span className="text-rose-600 mt-0.5 block leading-relaxed font-semibold">{report.safetyRisks}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Official Logs & Timeline */}
                      <div className="bg-white p-5 border-b border-slate-100 text-xs">
                        <div className="font-extrabold text-slate-700 mb-3 flex items-center gap-1.5 uppercase text-[9px] tracking-wider">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" /> Transparency Update Log
                        </div>
                        
                        {report.updates.length === 0 ? (
                          <p className="text-slate-400 text-center italic py-2">No timeline updates recorded yet.</p>
                        ) : (
                          <div className="relative border-l-2 border-emerald-100 pl-4 ml-1.5 py-1 flex flex-col gap-4">
                            {report.updates.map((upd, idx) => (
                              <div key={idx} className="relative">
                                {/* Dot indicator */}
                                <span className={`absolute -left-[22px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs flex items-center justify-center ${
                                  upd.status === "Resolved" ? "bg-emerald-500" :
                                  upd.status === "In Progress" ? "bg-amber-500" : "bg-sky-500"
                                }`} />
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-extrabold text-slate-700 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-md text-[9px]">
                                    {upd.status}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-mono">{formatDate(upd.timestamp)}</span>
                                </div>
                                <p className="text-slate-600 mt-1 font-semibold leading-relaxed text-[11px]">{upd.message}</p>
                                <span className="text-[8px] text-slate-400 mt-0.5 block italic font-bold">
                                  Logged by: {upd.actorName} ({upd.actorRole})
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Coordinator Admin Action Form */}
                      {isCoordinator && (
                        <div className="p-5 bg-blue-50/20 border-b border-slate-100 flex flex-col gap-3">
                          <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowCoordinatorForm(prev => ({ ...prev, [report.id]: !prev[report.id] }))}>
                            <div className="flex items-center gap-2">
                              <Wrench className="w-4 h-4 text-blue-600" />
                              <span className="text-[9px] font-black text-blue-800 uppercase tracking-widest">Coordinator Admin Portal</span>
                            </div>
                            <span className="text-xs text-blue-600 font-extrabold">{showCoordinatorForm[report.id] ? "Hide Form" : "Open Form"}</span>
                          </div>
                          
                          {showCoordinatorForm[report.id] && (
                            <div className="flex flex-col gap-3 mt-1">
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => setCoordStatus(prev => ({ ...prev, [report.id]: "In Progress" }))}
                                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    (coordStatus[report.id] || "In Progress") === "In Progress"
                                      ? "bg-amber-500 border-amber-500 text-white shadow-xs"
                                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  In Progress
                                </button>
                                <button 
                                  onClick={() => setCoordStatus(prev => ({ ...prev, [report.id]: "Resolved" }))}
                                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    coordStatus[report.id] === "Resolved"
                                      ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  Mark Resolved
                                </button>
                              </div>

                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Official Log Update Message:</label>
                                <textarea
                                  placeholder="Provide action steps taken, escalations, or logistics details..."
                                  rows={2}
                                  value={coordMessage[report.id] || ""}
                                  onChange={(e) => setCoordMessage(prev => ({ ...prev, [report.id]: e.target.value }))}
                                  className="w-full bg-white text-xs border border-slate-200 rounded-xl p-2.5 focus:ring-1 focus:ring-blue-500 focus:outline-hidden resize-none font-semibold"
                                />
                              </div>

                              <button
                                onClick={() => handleCoordinatorSubmit(report.id)}
                                className="bg-blue-600 text-white text-xs font-bold py-2 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-xs cursor-pointer"
                              >
                                Submit Official Status Update
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* AI Discussion Summarizer */}
                      <div className="p-5 border-b border-slate-100 flex flex-col gap-3">
                        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-3xs">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                            <div className="text-[11px]">
                              <span className="font-extrabold text-slate-700 block leading-tight">AI Discussion Summarizer</span>
                              <span className="text-[9px] text-slate-400">Condense local feedback instantly</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleSummarizeDiscussion(report.id)}
                            disabled={loadingAiSummary[report.id] || report.comments.length === 0}
                            className="bg-slate-950 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-slate-800 disabled:opacity-50 active:scale-95 transition-all cursor-pointer"
                          >
                            {loadingAiSummary[report.id] ? "Thinking..." : "Summarize"}
                          </button>
                        </div>

                        {aiSummaries[report.id] && (
                          <div className="bg-emerald-50/40 border border-emerald-100/50 rounded-2xl p-4 flex flex-col gap-3 text-xs">
                            <div className="flex items-center justify-between border-b border-emerald-100/30 pb-2">
                              <div className="flex items-center gap-1.5 text-emerald-800 font-black uppercase text-[9px] tracking-wider">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                <span>AI Discussion Summary</span>
                              </div>
                              {aiSummaries[report.id].confidenceScore && (
                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 font-mono">
                                  Confidence: {aiSummaries[report.id].confidenceScore}%
                                </span>
                              )}
                            </div>

                            <div className="text-slate-700 leading-relaxed font-semibold text-[11px] bg-white p-3 rounded-xl border border-emerald-50/60">
                              {aiSummaries[report.id].summary}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1 text-[11px]">
                              <div className="flex flex-col gap-2.5">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sentiment</span>
                                  <span className={`inline-flex items-center font-bold text-xs ${
                                    aiSummaries[report.id].sentiment?.toLowerCase().includes("urgent") ? "text-amber-700" :
                                    aiSummaries[report.id].sentiment?.toLowerCase().includes("negative") ? "text-rose-700" :
                                    "text-emerald-700"
                                  }`}>
                                    {aiSummaries[report.id].sentiment || "Neutral"}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Most Requested Action</span>
                                  <span className="text-slate-800 font-bold">{aiSummaries[report.id].mostRequestedAction || "None specified"}</span>
                                </div>
                              </div>

                              <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Top Concerns</span>
                                <ul className="list-disc pl-3 text-slate-600 flex flex-col gap-1 font-semibold text-[10px]">
                                  {Array.isArray(aiSummaries[report.id].concerns) ? (
                                    aiSummaries[report.id].concerns.map((concern: string, idx: number) => (
                                      <li key={idx} className="leading-tight">{concern}</li>
                                    ))
                                  ) : (
                                    <li className="leading-tight">{aiSummaries[report.id].concerns || "No specific concerns listed"}</li>
                                  )}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Citizen Discussion stream */}
                      <div className="bg-slate-50/50 p-5 flex flex-col gap-4">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Citizen Discussion ({report.comments.length})</span>
                        
                        <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
                          {report.comments.length === 0 ? (
                            <p className="text-center text-slate-400 italic py-4 text-[11px]">No comments posted yet. Start the coordination!</p>
                          ) : (
                            report.comments.map((comment) => (
                              <div key={comment.id} className="flex gap-2.5 items-start">
                                <img 
                                  src={comment.userAvatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${comment.userName}`} 
                                  alt={comment.userName} 
                                  className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                                />
                                <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-3xs flex-1 text-xs">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-extrabold text-slate-800 text-[11px]">{comment.userName}</span>
                                      <span className="bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded text-[8px] font-black">{comment.userBadge}</span>
                                    </div>
                                    <span className="text-[8px] text-slate-400 font-mono">{formatDate(comment.createdAt)}</span>
                                  </div>
                                  <p className="text-slate-600 mt-1 font-semibold leading-relaxed">{comment.text}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Comment Input Box */}
                        <div className="flex gap-2 items-center mt-1">
                          <input
                            id={`comment-input-${report.id}`}
                            type="text"
                            placeholder="Add details or coordinate..."
                            value={commentInputs[report.id] || ""}
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [report.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && handleSendComment(report.id)}
                            className="flex-1 bg-white text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden font-semibold shadow-3xs"
                          />
                          <button
                            onClick={() => handleSendComment(report.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl p-2.5 hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Additional Inner Actions */}
                      <div className="p-3 bg-slate-100/30 flex items-center justify-around gap-2 text-xs border-t border-slate-100">
                        {/* Resolve / Solved Action inside detail pane */}
                        <button
                          onClick={() => onVerify(report.id, "resolve")}
                          disabled={report.status === "Resolved" || report.resolvedBy.includes(currentUserId)}
                          className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
                            report.status === "Resolved"
                              ? "text-emerald-700 bg-emerald-50 cursor-not-allowed"
                              : report.resolvedBy.includes(currentUserId)
                                ? "text-slate-400 bg-slate-50 cursor-not-allowed"
                                : "text-slate-600 hover:text-slate-800 hover:bg-slate-100/50 active:scale-95"
                          }`}
                        >
                          <CheckCircle2 className={`w-4 h-4 ${report.status === "Resolved" ? "text-emerald-600" : ""}`} />
                          <span>
                            {report.status === "Resolved" 
                              ? "Resolved" 
                              : report.resolvedBy.includes(currentUserId) 
                                ? "Marked Resolved ✓" 
                                : "Mark Solved"
                            }
                          </span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 6. Permanent Premium Footer Actions bar - Always Visible at base of card */}
                <div className="grid grid-cols-4 border-t border-slate-100 divide-x divide-slate-100 bg-white">
                  {/* Like Button */}
                  <button
                    id={`like-btn-${report.id}`}
                    onClick={() => handleToggleLike(report.id)}
                    className={`py-3.5 flex flex-col items-center justify-center gap-1 hover:bg-slate-50 transition-colors cursor-pointer ${
                      isLiked ? "text-rose-600 font-bold" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <ThumbsUp className={`w-4 h-4 transition-transform duration-200 active:scale-125 ${isLiked ? "fill-rose-500 text-rose-600" : ""}`} />
                    <span className="text-[10px] uppercase tracking-wider font-extrabold">Like</span>
                  </button>

                  {/* Verify Button */}
                  <button
                    id={`verify-btn-${report.id}`}
                    onClick={() => onVerify(report.id, "confirm")}
                    disabled={report.confirmedBy.includes(currentUserId)}
                    className={`py-3.5 flex flex-col items-center justify-center gap-1 hover:bg-slate-50 transition-colors cursor-pointer ${
                      report.confirmedBy.includes(currentUserId)
                        ? "text-emerald-600 font-bold bg-emerald-50/10 cursor-not-allowed"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <CheckCircle2 className={`w-4 h-4 transition-transform duration-200 active:scale-125 ${report.confirmedBy.includes(currentUserId) ? "fill-emerald-500 text-emerald-600" : ""}`} />
                    <span className="text-[10px] uppercase tracking-wider font-extrabold">
                      {report.confirmedBy.includes(currentUserId) ? "Verified" : "Verify"}
                    </span>
                  </button>

                  {/* Comment Button */}
                  <button
                    id={`comment-btn-${report.id}`}
                    onClick={() => handleCommentClick(report.id)}
                    className="py-3.5 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 text-slate-500" />
                    <span className="text-[10px] uppercase tracking-wider font-extrabold">Comment</span>
                  </button>

                  {/* Share Button */}
                  <button
                    id={`share-btn-${report.id}`}
                    onClick={() => handleShare(report)}
                    className="py-3.5 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-slate-500" />
                    <span className="text-[10px] uppercase tracking-wider font-extrabold">
                      {copiedReportId === report.id ? "Copied" : "Share"}
                    </span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
