import React, { useState, useEffect } from "react";
import { 
  Users, CheckCircle, AlertCircle, Sparkles, Megaphone, TrendingUp, Calendar, Info, 
  RefreshCw, Plus, Edit2, Trash2, ShieldAlert, Heart, MapPin, ShieldCheck, Activity, 
  Flame, ArrowUpRight, ArrowDownRight, Shield, Zap, Clock, Building2, FileText, 
  CheckSquare, Square, Copy, ExternalLink, ChevronDown, ChevronUp, Lock, Award
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CommunityInfo, CommunityAIInsights, IssueReport, PredictedInsight, CoordinatorInsights } from "../types";

interface CommunitiesScreenProps {
  selectedCommunity: string;
  reports: IssueReport[];
  isCoordinator: boolean;
}

export default function CommunitiesScreen({ selectedCommunity, reports, isCoordinator }: CommunitiesScreenProps) {
  const [communityMeta, setCommunityMeta] = useState<CommunityInfo | null>(null);
  const [insights, setInsights] = useState<CommunityAIInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);

  // Predictive Trend Agent States (Agent 5)
  const [prediction, setPrediction] = useState<PredictedInsight | null>(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [actionStatuses, setActionStatuses] = useState<Record<string, 'Pending' | 'In Progress' | 'Completed'>>({});

  // Coordinator Assistant States (Agent 6)
  const [coordinatorInsights, setCoordinatorInsights] = useState<CoordinatorInsights | null>(null);
  const [loadingCoordInsights, setLoadingCoordInsights] = useState(false);
  const [generatingBulletin, setGeneratingBulletin] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [refreshingActions, setRefreshingActions] = useState(false);
  const [selectedWeeklyReportIdx, setSelectedWeeklyReportIdx] = useState<number>(0);

  // Quick Dashboard state
  const [selectedModuleId, setSelectedModuleId] = useState<string>("insights");

  // Accordion state (Used for Bulletin and Other modules)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    bulletins: true, // Coordinator Bulletin open by default
    insights: false,
    trends: false,
    growth: false,
    infrastructure: false,
    safety: false,
    priorities: false,
    preventive: false,
    weekly: false,
    forecasts: false,
    assistant: false,
    metrics: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const dashboardTabs = [
    { id: "insights", title: "AI Insights", subtitle: "Civic health summary", icon: Sparkles, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
    { id: "trends", title: "Predictive Trends", subtitle: "Incident volume forecast", icon: TrendingUp, color: "text-blue-600 bg-blue-50 border-blue-100" },
    { id: "infrastructure", title: "Infrastructure Health", subtitle: "Utility threat indices", icon: Building2, color: "text-purple-600 bg-purple-50 border-purple-100" },
    { id: "safety", title: "Safety Index", subtitle: "Seasonal threat hazards", icon: ShieldCheck, color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
    { id: "growth", title: "Growth Areas", subtitle: "Bottlenecks & key faults", icon: Flame, color: "text-rose-600 bg-rose-50 border-rose-100" },
    { id: "priorities", title: "Priorities", subtitle: "Civic focal targets", icon: CheckCircle, color: "text-cyan-600 bg-cyan-50 border-cyan-100" },
    { id: "preventive", title: "Preventive Actions", subtitle: "Early warning workflows", icon: ShieldAlert, color: "text-red-600 bg-red-50 border-red-100" },
    { id: "weekly", title: "Weekly Report", subtitle: "Progressive formal memos", icon: FileText, color: "text-amber-600 bg-amber-50 border-amber-100" },
    { id: "forecasts", title: "AI Forecasts", subtitle: "7-day hotspot predictions", icon: Calendar, color: "text-pink-600 bg-pink-50 border-pink-100" },
    { id: "assistant", title: "Coordinator AI", subtitle: "Task roadmaps & escalations", icon: Users, color: "text-teal-600 bg-teal-50 border-teal-100" },
    { id: "metrics", title: "Impact Metrics", subtitle: "Resolution rate metrics", icon: Activity, color: "text-orange-600 bg-orange-50 border-orange-100" },
  ];

  const fetchCoordinatorInsights = async (communityName: string) => {
    setLoadingCoordInsights(true);
    try {
      const res = await fetch(`/api/coordinator-insights/${encodeURIComponent(communityName)}`);
      if (res.ok) {
        const data = await res.json();
        setCoordinatorInsights(data);
      }
    } catch (e) {
      console.error("Failed to fetch coordinator insights:", e);
    } finally {
      setLoadingCoordInsights(false);
    }
  };

  const handleGenerateAIBulletin = async () => {
    setGeneratingBulletin(true);
    try {
      const res = await fetch(`/api/coordinator-insights/${encodeURIComponent(selectedCommunity)}/generate-bulletin`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        await fetchCoordinatorInsights(selectedCommunity);
        // Pre-fill the bulletin form
        setEditingBulletin(null);
        setBulletinTitle(data.title);
        setBulletinContent(data.content);
        setBulletinPriority(data.priority);
        setShowForm(true);
        // Expand the bulletins section to show the form
        setOpenSections(prev => ({ ...prev, bulletins: true }));
        
        setTimeout(() => {
          const element = document.getElementById("coordinator-announcements");
          if (element) {
            element.scrollIntoView({ behavior: "smooth" });
          }
        }, 150);
      }
    } catch (e) {
      console.error("Failed to generate AI bulletin:", e);
    } finally {
      setGeneratingBulletin(false);
    }
  };

  const handleGenerateWeeklyReport = async () => {
    setGeneratingReport(true);
    try {
      const res = await fetch(`/api/coordinator-insights/${encodeURIComponent(selectedCommunity)}/generate-weekly-report`, {
        method: "POST"
      });
      if (res.ok) {
        await fetchCoordinatorInsights(selectedCommunity);
        setSelectedWeeklyReportIdx(0);
      }
    } catch (e) {
      console.error("Failed to generate weekly report:", e);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleRefreshActionsAndEscalations = async () => {
    setRefreshingActions(true);
    try {
      const res = await fetch(`/api/coordinator-insights/${encodeURIComponent(selectedCommunity)}/refresh-actions-and-escalations`, {
        method: "POST"
      });
      if (res.ok) {
        await fetchCoordinatorInsights(selectedCommunity);
      }
    } catch (e) {
      console.error("Failed to refresh actions and escalations:", e);
    } finally {
      setRefreshingActions(false);
    }
  };

  const handleToggleAction = async (actionId: string) => {
    try {
      const res = await fetch(`/api/coordinator-insights/${encodeURIComponent(selectedCommunity)}/toggle-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId })
      });
      if (res.ok) {
        const data = await res.json();
        setCoordinatorInsights(data);
      }
    } catch (e) {
      console.error("Failed to toggle action status:", e);
    }
  };

  // Bulletin management states
  const [showForm, setShowForm] = useState(false);
  const [editingBulletin, setEditingBulletin] = useState<any | null>(null);
  const [bulletinTitle, setBulletinTitle] = useState("");
  const [bulletinContent, setBulletinContent] = useState("");
  const [bulletinPriority, setBulletinPriority] = useState("Normal");
  const [submittingBulletin, setSubmittingBulletin] = useState(false);

  const handleOpenCreate = () => {
    setEditingBulletin(null);
    setBulletinTitle("");
    setBulletinContent("");
    setBulletinPriority("Normal");
    setShowForm(true);
  };

  const handleOpenEdit = (ann: any) => {
    setEditingBulletin(ann);
    setBulletinTitle(ann.title);
    setBulletinContent(ann.text || ann.content || "");
    setBulletinPriority(ann.priority || "Normal");
    setShowForm(true);
  };

  const handleSaveBulletin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulletinTitle.trim() || !bulletinContent.trim()) return;

    setSubmittingBulletin(true);
    try {
      const url = editingBulletin 
        ? `/api/communities/${encodeURIComponent(selectedCommunity)}/bulletins/${editingBulletin.id}`
        : `/api/communities/${encodeURIComponent(selectedCommunity)}/announcements`;
      const method = editingBulletin ? "PUT" : "POST";
      const payload = editingBulletin
        ? { title: bulletinTitle, content: bulletinContent, priority: bulletinPriority }
        : { title: bulletinTitle, text: bulletinContent, content: bulletinContent, priority: bulletinPriority };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowForm(false);
        setEditingBulletin(null);
        setBulletinTitle("");
        setBulletinContent("");
        setBulletinPriority("Normal");
        fetchCommunityMeta();
      }
    } catch (e) {
      console.error("Failed to save bulletin", e);
    } finally {
      setSubmittingBulletin(false);
    }
  };

  const handleDeleteBulletin = async (bulletinId: string) => {
    if (!confirm("Are you sure you want to delete this bulletin?")) return;
    try {
      const res = await fetch(`/api/communities/${encodeURIComponent(selectedCommunity)}/bulletins/${bulletinId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchCommunityMeta();
      }
    } catch (e) {
      console.error("Failed to delete bulletin", e);
    }
  };

  const fetchCommunityMeta = async () => {
    setLoadingMeta(true);
    try {
      const res = await fetch("/api/communities");
      if (res.ok) {
        const data: CommunityInfo[] = await res.json();
        const active = data.find(c => c.name === selectedCommunity);
        if (active) {
          const activeIssues = reports.filter(r => r.community === selectedCommunity && r.status !== "Resolved").length;
          const resolvedIssues = reports.filter(r => r.community === selectedCommunity && r.status === "Resolved").length;
          setCommunityMeta({
            ...active,
            activeIssuesCount: activeIssues,
            resolvedIssuesCount: resolvedIssues
          });
        }
      }
    } catch (e) {
      console.error("Failed to load community meta", e);
    } finally {
      setLoadingMeta(false);
    }
  };

  const fetchPrediction = async (communityName: string) => {
    setLoadingPrediction(true);
    try {
      const res = await fetch(`/api/predictive-insights/${encodeURIComponent(communityName)}`);
      if (res.ok) {
        const data = await res.json();
        setPrediction(data);
      }
      
      const statusRes = await fetch(`/api/predictive-insights/${encodeURIComponent(communityName)}/action-status`);
      if (statusRes.ok) {
        const data = await statusRes.json();
        setActionStatuses(data.statuses || {});
      }
    } catch (e) {
      console.error("Failed to load predictive insights", e);
    } finally {
      setLoadingPrediction(false);
    }
  };

  const fetchCachedInsights = async (communityName: string) => {
    setLoadingInsights(true);
    try {
      const res = await fetch(`/api/community-insights/${encodeURIComponent(communityName)}`);
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
        await fetchPrediction(communityName);
      } else {
        setInsights(null);
        setPrediction(null);
      }
    } catch (e) {
      console.error("Failed to load cached AI insights:", e);
    } finally {
      setLoadingInsights(false);
    }
  };

  const generateAIInsights = async () => {
    setLoadingInsights(true);
    setLoadingPrediction(true);
    try {
      const res = await fetch(`/api/community-insights/${encodeURIComponent(selectedCommunity)}/refresh`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
        
        const predRes = await fetch(`/api/predictive-insights/${encodeURIComponent(selectedCommunity)}/refresh`, {
          method: "POST"
        });
        if (predRes.ok) {
          const predData = await predRes.json();
          setPrediction(predData);
        }

        const statusRes = await fetch(`/api/predictive-insights/${encodeURIComponent(selectedCommunity)}/action-status`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setActionStatuses(statusData.statuses || {});
        }
      }
    } catch (e) {
      console.error("Failed to load AI insights", e);
    } finally {
      setLoadingInsights(false);
      setLoadingPrediction(false);
    }
  };

  const handleUpdateActionStatus = async (recommendationText: string, newStatus: 'Pending' | 'In Progress' | 'Completed') => {
    try {
      const res = await fetch(`/api/predictive-insights/${encodeURIComponent(selectedCommunity)}/action-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendationText, status: newStatus })
      });
      if (res.ok) {
        const data = await res.json();
        setActionStatuses(data.statuses || {});
      }
    } catch (e) {
      console.error("Failed to update action status:", e);
    }
  };

  useEffect(() => {
    fetchCommunityMeta();
    fetchCachedInsights(selectedCommunity);
    if (isCoordinator) {
      fetchCoordinatorInsights(selectedCommunity);
    }
  }, [selectedCommunity, reports, isCoordinator]);

  // Shared Accordion Shell Component
  const AccordionItem = ({ 
    id, 
    title, 
    summary, 
    icon: Icon, 
    badge,
    badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100",
    children 
  }: { 
    id: string; 
    title: string; 
    summary: string; 
    icon: any; 
    badge?: string;
    badgeColor?: string;
    children: React.ReactNode;
    key?: string;
  }) => {
    const isOpen = openSections[id];
    return (
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200">
        <button
          onClick={() => toggleSection(id)}
          className="w-full text-left p-4 flex items-center justify-between gap-3 focus:outline-hidden hover:bg-slate-50/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
              <Icon className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-800 tracking-tight leading-snug">{title}</span>
                {badge && (
                  <span className={`text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold border ${badgeColor}`}>
                    {badge}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{summary}</p>
            </div>
          </div>
          <div className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
            {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <div className="p-4 pt-0 border-t border-slate-50">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Helper to render modules content
  const renderModuleContent = (id: string) => {
    switch (id) {
      case "insights":
        if (loadingInsights) {
          return (
            <div className="space-y-4 animate-pulse py-2">
              <div className="bg-slate-100 h-16 w-full rounded-xl"></div>
              <div className="bg-slate-100 h-10 w-full rounded-xl mt-3"></div>
            </div>
          );
        }
        return (
          <div className="text-xs flex flex-col gap-3">
            {insights ? (
              <div className="flex flex-col gap-3">
                <p className="text-slate-700 font-medium leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100 italic">
                  "{insights.summaryText || "No general summary compiled."}"
                </p>
                <div className="bg-emerald-50/50 text-emerald-800 p-3 rounded-xl border border-emerald-100 text-[10px] italic flex items-start gap-2 leading-relaxed">
                  <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>This narrative represents a dynamic AI-orchestrated analysis of active logs and discussion forums in {selectedCommunity}.</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-400 italic text-xs">Locality not audited yet. Start Civic Audit above to generate.</p>
              </div>
            )}
          </div>
        );
      case "trends":
        if (loadingPrediction) {
          return (
            <div className="space-y-4 animate-pulse py-2">
              <div className="bg-slate-100 h-10 w-full rounded-xl"></div>
              <div className="bg-slate-100 h-16 w-full rounded-xl"></div>
              <div className="bg-slate-100 h-24 w-full rounded-xl"></div>
            </div>
          );
        }
        return (
          <div className="text-xs flex flex-col gap-3">
            {prediction ? (
              <div className="flex flex-col gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Growth Trajectory</span>
                  <div className="flex items-center gap-1.5">
                    {prediction.issueGrowthTrend === "Increasing" ? (
                      <>
                        <ArrowUpRight className="w-4 h-4 text-rose-500" />
                        <span className="font-extrabold text-rose-600">Increasing Velocity</span>
                      </>
                    ) : prediction.issueGrowthTrend === "Decreasing" ? (
                      <>
                        <ArrowDownRight className="w-4 h-4 text-emerald-500" />
                        <span className="font-extrabold text-emerald-600">Decreasing / Stable</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="font-extrabold text-slate-700">Stable</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-1">
                  <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Predictive Reasoning</span>
                  <p className="text-slate-600 font-medium leading-relaxed italic">
                    "{prediction.predictionSummary}"
                  </p>
                </div>

                <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 border-l-4 border-l-slate-800">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Explainable AI Justification</span>
                  <p className="text-slate-600 leading-relaxed">
                    {prediction.explanation}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-400 italic text-xs">Audit required to forecast trends.</p>
              </div>
            )}
          </div>
        );
      case "growth":
        if (loadingInsights) {
          return (
            <div className="space-y-4 animate-pulse py-2">
              <div className="bg-slate-100 h-14 w-full rounded-xl"></div>
              <div className="bg-slate-100 h-14 w-full rounded-xl mt-2"></div>
            </div>
          );
        }
        return (
          <div className="text-xs flex flex-col gap-3">
            {insights ? (
              <div className="flex flex-col gap-2.5">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-2.5">
                  <Flame className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Rising Category of Concern:</span>
                    <span className="text-slate-700 font-bold block mt-0.5">{insights.risingCategories || insights.mostCommonCategory || "None"}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Emerging Infrastructure Faults:</span>
                    <span className="text-slate-700 font-medium block mt-0.5 leading-relaxed">{insights.emergingProblems || "No new failure streams detected."}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-2.5">
                  <Activity className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Recurring Locality Challenges:</span>
                    <span className="text-slate-700 font-medium block mt-0.5 leading-relaxed">{insights.recurringProblems || "None recorded."}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-400 italic text-xs">Audit required to trace growth areas.</p>
              </div>
            )}
          </div>
        );
      case "infrastructure":
        if (loadingInsights || loadingPrediction) {
          return (
            <div className="space-y-4 animate-pulse py-2">
              <div className="bg-slate-100 h-16 w-full rounded-xl"></div>
              <div className="bg-slate-100 h-10 w-full rounded-xl mt-3"></div>
            </div>
          );
        }
        return (
          <div className="text-xs flex flex-col gap-3">
            {insights && prediction ? (
              <div className="flex flex-col gap-3">
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-full border-4 flex flex-col items-center justify-center shrink-0 ${
                    insights.healthScore >= 80 
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800" 
                      : insights.healthScore >= 60 
                        ? "border-amber-500 bg-amber-50 text-amber-800" 
                        : "border-rose-500 bg-rose-50 text-rose-800"
                  }`}>
                    <span className="text-base font-black font-mono leading-none">{insights.healthScore}</span>
                    <span className="text-[7px] font-bold uppercase text-slate-400">Score</span>
                  </div>
                  
                  <div className="flex-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ward Utility Health Score</span>
                    <p className="text-slate-600 font-medium leading-relaxed mt-0.5 italic">
                      "{insights.healthScoreExplanation || "Health status is updated in real-time."}"
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Physical Utility Threat</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                    prediction.infrastructureRiskLevel === "Critical" || prediction.infrastructureRiskLevel === "High"
                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                  }`}>{prediction.infrastructureRiskLevel} Threat Level</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-400 italic text-xs">Audit required to fetch infrastructure indices.</p>
              </div>
            )}
          </div>
        );
      case "safety":
        if (loadingPrediction) {
          return (
            <div className="space-y-4 animate-pulse py-2">
              <div className="bg-slate-100 h-16 w-full rounded-xl"></div>
              <div className="bg-slate-100 h-14 w-full rounded-xl mt-3"></div>
            </div>
          );
        }
        return (
          <div className="text-xs flex flex-col gap-3">
            {prediction ? (
              <div className="flex flex-col gap-3">
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-full border-4 flex flex-col items-center justify-center shrink-0 ${
                    prediction.riskScore >= 70 
                      ? "border-rose-500 bg-rose-50 text-rose-800" 
                      : prediction.riskScore >= 40 
                        ? "border-amber-500 bg-amber-50 text-amber-800" 
                        : "border-emerald-500 bg-emerald-50 text-emerald-800"
                  }`}>
                    <span className="text-base font-black font-mono leading-none">{prediction.riskScore}</span>
                    <span className="text-[7px] font-bold uppercase text-slate-400">Risk %</span>
                  </div>

                  <div className="flex-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cumulative Safety Risk Ratio</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[8px] font-bold uppercase mt-1 ${
                      prediction.riskScore >= 70 
                        ? "bg-rose-100 text-rose-800" 
                        : prediction.riskScore >= 40 
                          ? "bg-amber-100 text-amber-800" 
                          : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {prediction.riskScore >= 70 ? "Elevated Warning" : prediction.riskScore >= 40 ? "Moderate Safety" : "Highly Secure"}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Seasonal & Climatic Risk Factors:</span>
                    <p className="text-slate-600 font-medium leading-relaxed mt-0.5">{prediction.seasonalRiskIndicators}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-400 italic text-xs">Audit required to check community safety parameters.</p>
              </div>
            )}
          </div>
        );
      case "priorities":
        if (loadingInsights) {
          return (
            <div className="space-y-3 animate-pulse py-2">
              <div className="bg-slate-100 h-10 w-full rounded-xl"></div>
              <div className="bg-slate-100 h-10 w-full rounded-xl"></div>
              <div className="bg-slate-100 h-10 w-full rounded-xl"></div>
            </div>
          );
        }
        return (
          <div className="text-xs flex flex-col gap-3">
            {insights && insights.recommendedPriorities && insights.recommendedPriorities.length > 0 ? (
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Top-Recommended Actions</span>
                <ul className="flex flex-col gap-2">
                  {insights.recommendedPriorities.map((priority: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2.5 text-slate-700 font-medium leading-relaxed bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <span className="flex items-center justify-center w-5 h-5 rounded-lg bg-slate-900 text-white text-[9px] font-black shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{priority}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-400 italic text-xs">Audit required to populate neighborhood priority tasks.</p>
              </div>
            )}
          </div>
        );
      case "preventive":
        if (loadingPrediction) {
          return (
            <div className="space-y-3 animate-pulse py-2">
              <div className="bg-slate-100 h-14 w-full rounded-xl"></div>
              <div className="bg-slate-100 h-14 w-full rounded-xl mt-2"></div>
            </div>
          );
        }
        return (
          <div className="text-xs flex flex-col gap-3">
            {prediction ? (
              <div className="flex flex-col gap-2.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Preventive Maintenance Tasks</span>
                {prediction.preventiveActions.map((action, idx) => {
                  const status = actionStatuses[action] || "Pending";
                  const authority = prediction.recommendedAuthorities[idx] || "Municipal Administration";
                  return (
                    <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2 sm:flex-row sm:items-center justify-between shadow-2xs">
                      <div className="flex items-start gap-2.5">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[9px] font-black shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="text-slate-700 font-semibold block leading-relaxed">{action}</span>
                          <span className="text-[9px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>Dept: {authority}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        {isCoordinator ? (
                          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-white shadow-2xs">
                            <button
                              onClick={() => handleUpdateActionStatus(action, "Pending")}
                              className={`text-[8px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer ${
                                status === "Pending" ? "bg-slate-100 text-slate-700" : "text-slate-400"
                              }`}
                            >
                              Pending
                            </button>
                            <button
                              onClick={() => handleUpdateActionStatus(action, "In Progress")}
                              className={`text-[8px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer ${
                                status === "In Progress" ? "bg-amber-100 text-amber-800" : "text-slate-400"
                              }`}
                            >
                              In Progress
                            </button>
                            <button
                              onClick={() => handleUpdateActionStatus(action, "Completed")}
                              className={`text-[8px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer ${
                                status === "Completed" ? "bg-emerald-100 text-emerald-800" : "text-slate-400"
                              }`}
                            >
                              Done
                            </button>
                          </div>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase flex items-center gap-1 ${
                            status === "Completed" ? "bg-emerald-100 text-emerald-800" :
                            status === "In Progress" ? "bg-amber-100 text-amber-800 animate-pulse" :
                            "bg-slate-100 text-slate-500"
                          }`}>
                            {status}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-400 italic text-xs">Audit required to check preventive task cards.</p>
              </div>
            )}
          </div>
        );
      case "weekly":
        if (loadingCoordInsights) {
          return (
            <div className="space-y-4 animate-pulse py-2">
              <div className="bg-slate-100 h-14 w-full rounded-xl"></div>
              <div className="bg-slate-100 h-32 w-full rounded-xl mt-3"></div>
            </div>
          );
        }
        return (
          <div className="text-xs flex flex-col gap-3">
            {isCoordinator && (
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Coordinator Dispatch</span>
                <button
                  onClick={handleGenerateWeeklyReport}
                  disabled={generatingReport}
                  className="text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 py-1.5 px-3 rounded-xl border border-emerald-100 cursor-pointer flex items-center gap-1 transition-all shadow-2xs"
                >
                  <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                  <span>{generatingReport ? "COMPILING..." : "COMPILE REPORT"}</span>
                </button>
              </div>
            )}

            {coordinatorInsights?.weeklyReports && coordinatorInsights.weeklyReports.length > 0 ? (
              <div className="flex flex-col gap-3">
                {coordinatorInsights.weeklyReports.length > 1 && (
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-[8px] text-slate-400 font-bold uppercase">Select Report:</span>
                    <select
                      value={selectedWeeklyReportIdx}
                      onChange={(e) => setSelectedWeeklyReportIdx(Number(e.target.value))}
                      className="bg-white border border-slate-200 text-[10px] font-semibold text-slate-700 px-2.5 py-1 rounded-lg"
                    >
                      {coordinatorInsights.weeklyReports.map((rep, idx) => (
                        <option key={idx} value={idx}>
                          {new Date(rep.generatedAt).toLocaleDateString()} (Score: {rep.communityHealthScore})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {(() => {
                  const rep = coordinatorInsights.weeklyReports[selectedWeeklyReportIdx] || coordinatorInsights.weeklyReports[0];
                  if (!rep) return null;
                  return (
                    <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 flex flex-col gap-3 shadow-2xs">
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-3xs">
                          <span className="text-[7px] text-slate-400 block uppercase font-extrabold leading-none">Total</span>
                          <span className="text-[11px] font-extrabold text-slate-700 font-mono mt-1 block">{rep.totalReports}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-3xs">
                          <span className="text-[7px] text-slate-400 block uppercase font-extrabold leading-none">Resolved</span>
                          <span className="text-[11px] font-extrabold text-emerald-600 font-mono mt-1 block">{rep.resolvedReports}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-3xs">
                          <span className="text-[7px] text-slate-400 block uppercase font-extrabold leading-none">Active</span>
                          <span className="text-[11px] font-extrabold text-amber-600 font-mono mt-1 block">{rep.activeReports}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-3xs">
                          <span className="text-[7px] text-slate-400 block uppercase font-extrabold leading-none">Health</span>
                          <span className="text-[11px] font-extrabold text-indigo-600 font-mono mt-1 block">{rep.communityHealthScore}</span>
                        </div>
                      </div>

                      <div className="text-[10px] leading-relaxed text-slate-600">
                        <strong className="text-slate-800 block text-[10px] font-bold mb-0.5">Weekly Analysis:</strong>
                        {rep.trendAnalysis}
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 relative mt-1 shadow-3xs">
                        <span className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Official Memo Draft:</span>
                        <div className="text-[9.5px] text-slate-700 font-sans leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto bg-slate-50/50 p-2 rounded border border-slate-100 font-mono">
                          {rep.fullReportText}
                        </div>
                        
                        <button
                          id={`copy-rep-btn`}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(rep.fullReportText);
                            const btn = document.getElementById(`copy-rep-btn`);
                            if (btn) {
                              const orig = btn.innerHTML;
                              btn.innerHTML = "<span>Copied!</span>";
                              setTimeout(() => { btn.innerHTML = orig; }, 2000);
                            }
                          }}
                          className="absolute top-2 right-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[8px] py-1 px-2 rounded-md flex items-center gap-1 border border-slate-200 cursor-pointer"
                        >
                          <Copy className="w-2.5 h-2.5" />
                          <span>COPY DRAFT</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-400 italic">No weekly report compiled. Click 'Compile' or load as coordinator.</p>
              </div>
            )}
          </div>
        );
      case "forecasts":
        if (loadingPrediction) {
          return (
            <div className="space-y-4 animate-pulse py-2">
              <div className="bg-slate-100 h-16 w-full rounded-xl"></div>
              <div className="bg-slate-100 h-14 w-full rounded-xl mt-3"></div>
            </div>
          );
        }
        return (
          <div className="text-xs flex flex-col gap-3">
            {prediction ? (
              <div className="flex flex-col gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="text-slate-400 text-[9px] font-bold uppercase block tracking-wider">7-Day Incident Forecast</span>
                    <span className="text-slate-500 text-[10px] block mt-0.5 font-medium">Predicted incoming alerts</span>
                  </div>
                  <span className="text-lg font-black text-rose-600 font-mono block">+{prediction.predictedNewIssuesCount} Cases</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col gap-1.5 shadow-2xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Predicted Hotspots (GPS Clusters)</span>
                  <div className="flex flex-wrap gap-1.5">
                    {prediction.hotspotLocations.map((loc, i) => (
                      <span key={i} className="bg-rose-50 text-rose-700 text-[9px] font-extrabold px-2.5 py-1 rounded-lg border border-rose-100 shadow-3xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{loc}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-400 italic text-xs">Audit required to forecast incoming hazards.</p>
              </div>
            )}
          </div>
        );
      case "assistant":
        if (loadingCoordInsights) {
          return (
            <div className="space-y-4 animate-pulse py-2">
              <div className="bg-slate-100 h-8 w-1/3 rounded"></div>
              <div className="bg-slate-100 h-16 w-full rounded-xl mt-3"></div>
              <div className="bg-slate-100 h-16 w-full rounded-xl mt-2"></div>
              <div className="bg-slate-100 h-16 w-full rounded-xl mt-2"></div>
            </div>
          );
        }
        return (
          <div className="text-xs flex flex-col gap-3">
            {!isCoordinator ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center flex flex-col items-center justify-center gap-3">
                <Lock className="w-6 h-6 text-slate-400" />
                <div>
                  <h5 className="text-xs font-bold text-slate-700">🔒 Ward Coordinator Mode Required</h5>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-1 max-w-xs mx-auto">
                    To execute administrative actions, generate official community bulletins, and draft official department memos, please toggle coordinator role in the **Profile Tab**.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">AI Task Dispatch Center</span>
                  <button
                    onClick={() => handleRefreshActionsAndEscalations()}
                    disabled={refreshingActions || loadingCoordInsights}
                    className="text-[9px] font-bold text-slate-500 hover:text-slate-700 bg-slate-50 py-1.5 px-2.5 rounded-lg border border-slate-200 cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${refreshingActions ? "animate-spin" : ""}`} />
                    <span>REFRESH ROADMAP</span>
                  </button>
                </div>

                {/* 1. AI Action Recommendations */}
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Prioritized Roadmap</span>
                  {coordinatorInsights?.actionRecommendations && coordinatorInsights.actionRecommendations.length > 0 ? (
                    coordinatorInsights.actionRecommendations.map((act) => (
                      <div
                        key={act.id}
                        onClick={() => handleToggleAction(act.id)}
                        className={`p-3 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer hover:bg-slate-50 shadow-3xs ${
                          act.isCompleted ? "bg-slate-50/70 opacity-60" : "bg-white border-slate-150"
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {act.isCompleted ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <div className="w-4 h-4 rounded border border-slate-300 bg-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <span className={`text-[11px] font-bold ${act.isCompleted ? "text-slate-400 line-through" : "text-slate-800"}`}>
                              {act.title}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[7.5px] font-black uppercase ${
                              act.urgency === "Critical" ? "bg-rose-50 text-rose-700 border border-rose-150" : "bg-slate-100 text-slate-600"
                            }`}>
                              {act.urgency}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{act.description}</p>
                          <div className="mt-1 text-[8px] text-emerald-600 font-semibold uppercase tracking-wider">
                            🎯 Expected Impact: {act.expectedImpact}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 italic py-2 text-center text-[10px]">No active actions compiled.</p>
                  )}
                </div>

                {/* 2. AI Escalation suggestions */}
                <div className="flex flex-col gap-2 mt-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">AI Escalation Assistant</span>
                  {coordinatorInsights?.escalationSuggestions && coordinatorInsights.escalationSuggestions.length > 0 ? (
                    coordinatorInsights.escalationSuggestions.map((esc, i) => (
                      <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2 shadow-2xs">
                        <div className="flex justify-between items-start border-b border-slate-150 pb-2">
                          <div>
                            <span className="text-[8px] text-slate-400 font-bold block uppercase">Escalation Candidate</span>
                            <span className="text-[10px] font-bold text-slate-800 leading-snug">{esc.reportTitle}</span>
                          </div>
                          <span className="bg-rose-50 text-rose-700 text-[8px] font-extrabold px-1.5 py-0.2 rounded border border-rose-150">
                            {esc.priorityLevel || "HIGH"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[9px]">
                          <div>
                            <span className="text-slate-400 text-[7.5px] uppercase font-bold block">Target Department</span>
                            <span className="text-slate-700 font-bold">{esc.recommendedDepartment}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[7.5px] uppercase font-bold block">Impact Estimate</span>
                            <span className="text-slate-700 font-bold">{esc.expectedPublicImpact}</span>
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-150">
                          <span className="text-slate-400 text-[7.5px] uppercase font-bold block mb-0.5">Escalation Grounds</span>
                          <p className="text-slate-600 italic leading-relaxed font-medium">{esc.reasonForEscalation}</p>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-250 relative">
                          <span className="text-slate-400 text-[7.5px] uppercase font-bold block mb-1">Message Memo Draft</span>
                          <pre className="text-[9px] text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto bg-slate-50 p-2 rounded border border-slate-100">
                            {esc.suggestedEscalationMessage}
                          </pre>
                          <button
                            id={`copy-esc-btn-${i}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(esc.suggestedEscalationMessage);
                              const btn = document.getElementById(`copy-esc-btn-${i}`);
                              if (btn) {
                                btn.innerHTML = "<span>Copied!</span>";
                                setTimeout(() => { btn.innerHTML = "<span>COPY MEMO</span>"; }, 2000);
                              }
                            }}
                            className="absolute top-2 right-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[8px] py-1 px-2 rounded-md flex items-center gap-1 border border-slate-200 cursor-pointer"
                          >
                            <Copy className="w-2.5 h-2.5" />
                            <span>COPY MEMO</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 italic text-center py-2 text-[10px]">No immediate escalation guidelines needed.</p>
                  )}
                </div>

                {/* 3. AI Bulletin Trigger */}
                <div className="bg-gradient-to-tr from-slate-900 to-emerald-950 text-white p-4 rounded-xl flex flex-col gap-2.5 mt-2 shadow-sm">
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <Megaphone className="w-4 h-4 shrink-0" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">AI Bulletin Compiler</span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    Instantly compose a cohesive neighborhood safety memo summarizing recent incident logs, maintenance items, and active hazards.
                  </p>
                  <button
                    onClick={handleGenerateAIBulletin}
                    disabled={generatingBulletin}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-[10px] py-2 px-3 rounded-lg shadow-xs self-start transition-all cursor-pointer active:scale-95 border border-emerald-500/10"
                  >
                    <span>{generatingBulletin ? "COMPILING..." : "✨ GENERATE ACCORDING TO Live data"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      case "metrics":
        if (loadingInsights) {
          return (
            <div className="grid grid-cols-2 gap-3 animate-pulse py-2">
              <div className="bg-slate-100 h-16 rounded-xl"></div>
              <div className="bg-slate-100 h-16 rounded-xl"></div>
              <div className="bg-slate-100 h-16 rounded-xl"></div>
              <div className="bg-slate-100 h-16 rounded-xl"></div>
            </div>
          );
        }
        return (
          <div className="text-xs flex flex-col gap-3">
            {insights ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col justify-between shadow-3xs">
                  <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Total Logs Compiled</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-lg font-black text-slate-800 font-mono">{insights.totalIssuesCount || 0}</span>
                    <span className="text-[9px] text-emerald-600 font-semibold uppercase">Logged</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col justify-between shadow-3xs">
                  <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Active Pipeline</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-lg font-black text-slate-800 font-mono">{insights.activeIssuesCount || 0}</span>
                    <span className="text-[9px] text-amber-600 font-semibold uppercase">Pending</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col justify-between shadow-3xs">
                  <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Resolved Cases</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-lg font-black text-slate-800 font-mono">{insights.resolvedIssuesCount || 0}</span>
                    <span className="text-[9px] text-emerald-600 font-extrabold font-mono">({insights.resolutionRate || "100%"})</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col justify-between shadow-3xs">
                  <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">Critical Hazards</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className={`text-lg font-black font-mono ${insights.criticalIssuesCount > 0 ? "text-rose-600 animate-pulse" : "text-slate-800"}`}>
                      {insights.criticalIssuesCount || 0}
                    </span>
                    <span className="text-[9px] text-rose-500 font-semibold uppercase">Alerts</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-400 italic text-xs">Audit required to check live counters.</p>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div id="communities-screen" className="flex flex-col flex-1 h-full bg-slate-50 overflow-y-auto pb-24">
      
      <div className="p-4 md:p-6 flex flex-col gap-6">
        
        {/* Compact Analytics Header */}
        <div id="community-header" className="bg-slate-900 text-white rounded-2xl p-4 md:p-6 shadow-md border border-slate-800 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>

          {/* Community Info */}
          <div className="flex flex-col gap-2 min-w-0 z-10">
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md font-extrabold border border-emerald-500/10">
                Locality Analytics
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">{selectedCommunity} Neighborhood</h2>
            {communityMeta && (
              <p className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                <span>{communityMeta.memberCount} Citizens Active</span>
                <span className="text-slate-700">•</span>
                <span className="text-slate-300">Led by {communityMeta.coordinatorName}</span>
              </p>
            )}
            
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={generateAIInsights}
                disabled={loadingInsights}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[11px] font-bold py-1.5 px-3.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingInsights ? 'animate-spin' : ''}`} />
                <span>{loadingInsights ? "Auditing..." : "Re-Audit Locality"}</span>
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 z-10 w-full md:w-auto shrink-0">
            {/* Health Score */}
            <div className="bg-slate-850 border border-slate-800 p-3 rounded-xl flex flex-col items-center justify-center min-w-[100px] text-center">
              <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider leading-none">Health Score</span>
              <span className="text-lg font-black text-emerald-400 font-mono mt-1.5">
                {insights ? `${insights.healthScore}` : "--"}
              </span>
              <span className="text-[8px] text-slate-500 font-medium mt-0.5">out of 100</span>
            </div>

            {/* Open Issues */}
            <div className="bg-slate-850 border border-slate-800 p-3 rounded-xl flex flex-col items-center justify-center min-w-[100px] text-center">
              <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider leading-none">Open Issues</span>
              <span className="text-lg font-black text-amber-500 font-mono mt-1.5">
                {communityMeta ? communityMeta.activeIssuesCount : "0"}
              </span>
              <span className="text-[8px] text-slate-500 font-medium mt-0.5">Active Logs</span>
            </div>

            {/* Resolved Issues */}
            <div className="bg-slate-850 border border-slate-800 p-3 rounded-xl flex flex-col items-center justify-center min-w-[100px] text-center">
              <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider leading-none">Resolved</span>
              <span className="text-lg font-black text-blue-400 font-mono mt-1.5">
                {communityMeta ? communityMeta.resolvedIssuesCount : "0"}
              </span>
              <span className="text-[8px] text-slate-500 font-medium mt-0.5">Fixed Logs</span>
            </div>

            {/* Community Risk Level */}
            <div className="bg-slate-850 border border-slate-800 p-3 rounded-xl flex flex-col items-center justify-center min-w-[100px] text-center">
              <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider leading-none">Risk Level</span>
              <span className={`text-[10px] font-extrabold uppercase mt-2.5 px-2 py-0.5 rounded-md ${
                prediction?.infrastructureRiskLevel === "Critical" || prediction?.infrastructureRiskLevel === "High"
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  : prediction?.infrastructureRiskLevel === "Medium"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              }`}>
                {prediction ? prediction.infrastructureRiskLevel : "Stable"}
              </span>
            </div>
          </div>
        </div>

        {/* 1. COORDINATOR BULLETIN - Kept at the top, expanded by default */}
        <AccordionItem 
          id="bulletins" 
          title="Coordinator Bulletin" 
          summary="Official notifications, active alerts, and ward guidelines"
          icon={Megaphone}
          badge={communityMeta && communityMeta.announcements.length > 0 ? `${communityMeta.announcements.length} Active` : undefined}
          badgeColor="bg-amber-50 text-amber-800 border-amber-100"
        >
          <div id="coordinator-announcements" className="flex flex-col gap-4 mt-3">
            {isCoordinator && (
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Coordinator Controls</span>
                <button
                  id="create-bulletin-btn"
                  onClick={handleOpenCreate}
                  className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 py-1.5 px-3 rounded-xl flex items-center gap-1 cursor-pointer transition-all border border-emerald-100"
                >
                  <Plus className="w-3 h-3" />
                  <span>CREATE BULLETIN</span>
                </button>
              </div>
            )}

            {/* Bulletin Creation / Editing Form */}
            {showForm && (
              <form onSubmit={handleSaveBulletin} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col gap-3 shadow-2xs">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {editingBulletin ? "Edit Bulletin" : "New Community Bulletin"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-[11px] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Bulletin Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Scheduled Ward Power Grid Maintenance"
                    value={bulletinTitle}
                    onChange={(e) => setBulletinTitle(e.target.value)}
                    className="bg-white text-xs border border-slate-250 rounded-lg p-2.5 focus:ring-1 focus:ring-slate-400 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Priority Level</label>
                    <select
                      value={bulletinPriority}
                      onChange={(e) => setBulletinPriority(e.target.value)}
                      className="bg-white text-xs border border-slate-250 rounded-lg p-2.5 focus:ring-1 focus:ring-slate-400 focus:outline-hidden"
                    >
                      <option value="Normal">📢 Normal</option>
                      <option value="Important">⚠️ Important</option>
                      <option value="Urgent">🚨 Urgent</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Posting Area</label>
                    <input
                      type="text"
                      disabled
                      value={selectedCommunity}
                      className="bg-slate-100 text-xs border border-slate-200 rounded-lg p-2.5 text-slate-400"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Message Content</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide details about duration, expected impact, and emergency contacts..."
                    value={bulletinContent}
                    onChange={(e) => setBulletinContent(e.target.value)}
                    className="bg-white text-xs border border-slate-250 rounded-lg p-2.5 focus:ring-1 focus:ring-slate-400 focus:outline-hidden resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingBulletin}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {submittingBulletin ? "Saving..." : editingBulletin ? "Update Bulletin" : "Publish Bulletin"}
                </button>
              </form>
            )}

            {communityMeta && communityMeta.announcements.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">No announcement bulletins posted yet.</p>
            ) : (
              communityMeta && (
                <div className="flex flex-col gap-3">
                  {communityMeta.announcements.map((ann: any) => {
                    const priority = ann.priority || "Normal";
                    let borderStyle = "border-l-slate-400";
                    let bgStyle = "bg-slate-50/50";
                    let badgeStyles = "bg-slate-100 text-slate-600";
                    let badgeText = "Normal";

                    if (priority === "Urgent") {
                      borderStyle = "border-l-rose-500 border-l-4";
                      bgStyle = "bg-rose-50/30";
                      badgeStyles = "bg-rose-100 text-rose-700 font-extrabold animate-pulse";
                      badgeText = "🚨 Urgent";
                    } else if (priority === "Important") {
                      borderStyle = "border-l-amber-500 border-l-4";
                      bgStyle = "bg-amber-50/30";
                      badgeStyles = "bg-amber-100 text-amber-700 font-bold";
                      badgeText = "⚠️ Important";
                    }

                    return (
                      <div key={ann.id} className={`p-4 rounded-r-xl border border-y-slate-100 border-r-slate-100 flex flex-col gap-1.5 transition-all ${borderStyle} ${bgStyle}`}>
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-800 leading-snug">{ann.title}</span>
                              <span className={`text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-md font-mono ${badgeStyles}`}>
                                {badgeText}
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-400 flex items-center gap-0.5 mt-1 font-mono">
                              <Calendar className="w-2.5 h-2.5" /> {ann.date}
                            </span>
                          </div>
                          
                          {isCoordinator && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(ann)}
                                className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBulletin(ann.id)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-sans">{ann.text || ann.content}</p>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </AccordionItem>

        {/* Quick Access Dashboard */}
        <div id="quick-ai-dashboard" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider font-display">Quick AI Dashboard</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {dashboardTabs.map((tab) => {
              const isSelected = selectedModuleId === tab.id;
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedModuleId(tab.id);
                    // Smooth scroll to selected container
                    setTimeout(() => {
                      const el = document.getElementById("selected-module-container");
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    }, 100);
                  }}
                  className={`flex flex-col items-start text-left p-3 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? "bg-primary border-primary text-white shadow-md ring-4 ring-primary/10"
                      : "bg-white hover:bg-slate-50/50 border-slate-100 text-slate-700 hover:shadow-xs"
                  }`}
                >
                  <div className={`p-2 rounded-xl mb-2 flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-white/10 text-white" : tab.color
                  }`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold tracking-tight line-clamp-1 font-display">
                    {tab.title}
                  </span>
                  <span className={`text-[9px] mt-0.5 line-clamp-1 ${isSelected ? "text-white/70" : "text-slate-400"}`}>
                    {tab.subtitle}
                  </span>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected AI Module Section */}
        {selectedModuleId && (
          <div id="selected-module-container" className="bg-white rounded-2xl border-t-4 border-t-primary border-x border-b border-slate-150 p-5 shadow-xs mt-1 transition-all duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  dashboardTabs.find(t => t.id === selectedModuleId)?.color || "bg-slate-50 text-slate-700"
                }`}>
                  {React.createElement(dashboardTabs.find(t => t.id === selectedModuleId)?.icon || Sparkles, { className: "w-5 h-5" })}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight font-display">
                    {dashboardTabs.find(t => t.id === selectedModuleId)?.title}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {dashboardTabs.find(t => t.id === selectedModuleId)?.subtitle}
                  </p>
                </div>
              </div>
              <span className="text-[9px] uppercase tracking-wider bg-primary text-white font-mono px-2.5 py-1 rounded-md font-bold">
                Active Suite
              </span>
            </div>

            {/* Render selected module content */}
            {renderModuleContent(selectedModuleId)}
          </div>
        )}

      </div>
    </div>
  );
}
