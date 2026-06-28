import React from "react";
import { User, Award, Shield, CheckCircle, ThumbsUp, Sparkles, AlertCircle, ArrowRight, LogOut } from "lucide-react";
import { UserProfile, IssueReport } from "../types";

interface ProfileScreenProps {
  profile: UserProfile;
  reports: IssueReport[];
  onViewInFeed: (reportId: string) => void;
  onLogout?: () => void;
}

export default function ProfileScreen({ profile, reports, onViewInFeed, onLogout }: ProfileScreenProps) {
  // Filter reports authored by this user
  const myReports = reports.filter(r => r.reporterId === profile.id);

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case "JanSetu Champion":
        return <Shield className="w-8 h-8 text-amber-500 fill-amber-100" />;
      case "Community Guardian":
        return <Award className="w-8 h-8 text-emerald-600 fill-emerald-50" />;
      default:
        return <User className="w-8 h-8 text-slate-500" />;
    }
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case "JanSetu Champion": return "from-amber-500 to-orange-600 text-white";
      case "Community Guardian": return "from-emerald-600 to-teal-500 text-white";
      default: return "from-slate-600 to-slate-700 text-white";
    }
  };

  // Level thresholds
  const currentPoints = profile.reputationPoints;
  let nextLevelPoints = 30;
  let nextLevelName = "Community Guardian";
  let progressPercentage = (currentPoints / 30) * 100;

  if (currentPoints >= 60) {
    nextLevelPoints = 150;
    nextLevelName = "Elite Guardian";
    progressPercentage = Math.min(((currentPoints - 60) / 90) * 100, 100);
  } else if (currentPoints >= 30) {
    nextLevelPoints = 60;
    nextLevelName = "JanSetu Champion";
    progressPercentage = ((currentPoints - 30) / 30) * 100;
  }

  const badges = [
    { name: "Civic Reporter", desc: "For submitting your first verified neighborhood concern.", unlocked: true, points: 10, icon: Sparkles, color: "text-blue-500 bg-blue-50" },
    { name: "Community Guardian", desc: "Earn 30 points to unlock. Solidified as a local guardian.", unlocked: currentPoints >= 30, points: 30, icon: Shield, color: "text-emerald-600 bg-emerald-50" },
    { name: "JanSetu Champion", desc: "Earn 60 points to unlock. Celebrated bridge of the people.", unlocked: currentPoints >= 60, points: 60, icon: Award, color: "text-amber-500 bg-amber-50" }
  ];

  return (
    <div id="profile-screen" className="flex flex-col flex-1 h-full bg-slate-50 overflow-y-auto pb-24">
      
      {/* Top Profile Banner */}
      <div id="profile-card-header" className="bg-white p-5 border-b border-slate-100 shadow-xs flex flex-col items-center text-center relative">
        <div className="relative">
          <img 
            src={profile.avatar} 
            alt={profile.name} 
            className="w-18 h-18 rounded-full object-cover border-4 border-emerald-50 shadow-md"
          />
          <span className="absolute bottom-0 right-0 p-1 bg-emerald-500 text-white rounded-full border-2 border-white shadow-xs">
            <CheckCircle className="w-3.5 h-3.5" />
          </span>
        </div>

        <h2 className="text-sm font-bold text-slate-800 mt-2.5">{profile.name}</h2>
        <span className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">{profile.isCoordinator ? "JANSETU COMMUNITY COORDINATOR" : "CIVIC CITIZEN"}</span>

        {/* Current Active Badge Badge & Logout option */}
        <div className="flex gap-2 mt-2 items-center justify-center">
          <span className={`text-[10px] font-bold px-3 py-1 rounded-full bg-gradient-to-tr shadow-xs ${getBadgeColor(profile.badge)}`}>
            {profile.badge}
          </span>
          {onLogout && (
            <button
              onClick={onLogout}
              className="text-[10px] font-bold px-3 py-1 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-full transition-all flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        
        {/* COORDINATOR EXTRA DETAILS CARD */}
        {profile.isCoordinator && (
          <div id="coordinator-dashboard-metrics" className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm border border-slate-800 space-y-3">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Coordinator Console</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 text-xs">
                <span className="text-[9px] text-slate-400 block uppercase font-bold">Community Managed</span>
                <span className="font-bold text-emerald-400 mt-1 block truncate">{profile.selectedCommunity}</span>
              </div>
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 text-xs">
                <span className="text-[9px] text-slate-400 block uppercase font-bold">Active Escalations</span>
                <span className="font-extrabold text-white mt-1 block font-mono">{reports.filter(r => r.community === profile.selectedCommunity && r.isEscalated).length} Issues</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 text-xs">
                <span className="text-[9px] text-slate-400 block uppercase font-bold">Highlighted Urgent</span>
                <span className="font-extrabold text-amber-400 mt-1 block font-mono">{reports.filter(r => r.community === profile.selectedCommunity && r.isHighlighted).length} Cases</span>
              </div>
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 text-xs">
                <span className="text-[9px] text-slate-400 block uppercase font-bold">Coordinator Status</span>
                <span className="font-bold text-emerald-400 mt-1 block uppercase text-[10px]">VERIFIED LEAD</span>
              </div>
            </div>
          </div>
        )}

        {/* Gamification Progress Meter */}
        <div id="gamification-meter" className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Reputation Level</span>
            </div>
            <span className="text-xs font-extrabold text-emerald-600 font-mono">{currentPoints} / {nextLevelPoints} PTS</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/50">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2.5">
            <span>Current Status: <strong className="text-slate-600">{profile.badge}</strong></span>
            <span>Next: <strong className="text-emerald-600">{nextLevelName}</strong></span>
          </div>
        </div>

        {/* Triple Counters Row */}
        <div id="reputation-stats-row" className="grid grid-cols-3 gap-2.5 text-center">
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs flex flex-col items-center">
            <CheckCircle className="w-4 h-4 text-emerald-600 mb-1" />
            <span className="text-xs font-extrabold text-slate-800 font-mono">{profile.reportsSubmittedCount}</span>
            <span className="text-[9px] text-slate-400 mt-0.5">Reported</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs flex flex-col items-center">
            <ThumbsUp className="w-4 h-4 text-emerald-600 mb-1" />
            <span className="text-xs font-extrabold text-slate-800 font-mono">{profile.verificationsCount}</span>
            <span className="text-[9px] text-slate-400 mt-0.5">Verified</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs flex flex-col items-center">
            <Award className="w-4 h-4 text-emerald-600 mb-1" />
            <span className="text-xs font-extrabold text-slate-800 font-mono">{profile.communityContributionsCount}</span>
            <span className="text-[9px] text-slate-400 mt-0.5">Actions</span>
          </div>
        </div>

        {/* Unlocked Badges closet */}
        <div id="badges-closet-container" className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3.5">My Medallions Closets</h3>
          
          <div className="flex flex-col gap-3">
            {badges.map((badge, idx) => {
              const Icon = badge.icon;
              return (
                <div 
                  key={idx} 
                  className={`flex gap-3 items-center p-2.5 rounded-xl border transition-all ${
                    badge.unlocked 
                      ? "bg-slate-50/50 border-slate-100 opacity-100" 
                      : "bg-slate-100/30 border-dashed border-slate-200 opacity-55 select-none"
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${badge.color}`}>
                    <Icon className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div className="flex-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">{badge.name}</span>
                      {badge.unlocked ? (
                        <span className="text-[9px] text-emerald-600 bg-emerald-50 font-semibold px-2 py-0.2 rounded">Unlocked</span>
                      ) : (
                        <span className="text-[9px] text-slate-400 font-semibold">Locked ({badge.points} pts)</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{badge.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* User's Submitted Issues Section */}
        <div id="my-reports-section" className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Submitted by Me ({myReports.length})</h3>

          {myReports.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-4">You haven't authored any civic reports yet. Submit an issue using the Camera tab to earn +10 points!</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {myReports.map((report) => (
                <div 
                  key={report.id} 
                  className="flex gap-2.5 items-center justify-between p-2.5 rounded-xl bg-slate-50/50 border border-slate-100 hover:border-emerald-200 transition-colors"
                >
                  <div className="flex gap-2 items-center min-w-0">
                    {(() => {
                      const reportImage = report.image || report.imageUrl || report.media;
                      if (!reportImage) return null;
                      const isVideo = reportImage.startsWith("data:video/") || reportImage.includes(".mp4") || reportImage.includes("video/upload");
                      return isVideo ? (
                        <video src={reportImage} className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                      ) : (
                        <img src={reportImage} alt={report.title} className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" referrerPolicy="no-referrer" />
                      );
                    })()}
                    <div className="min-w-0 text-xs">
                      <span className="font-semibold text-slate-800 truncate block">{report.title}</span>
                      <span className="text-[9px] text-slate-400 mt-0.5 font-mono block uppercase">{report.category} • {report.status}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onViewInFeed(report.id)}
                    className="text-emerald-600 hover:text-emerald-700 p-1 rounded hover:bg-emerald-50 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
