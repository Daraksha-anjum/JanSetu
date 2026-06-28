import React, { useState, useEffect } from "react";
import { 
  Home, 
  MapPin, 
  Camera, 
  Users, 
  User, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  Bell,
  Layers,
  Building,
  Menu,
  ChevronDown,
  LogOut,
  MessageSquare
} from "lucide-react";
import dangerousPotholeImg from "./assets/images/dangerous_pothole_1782306016436.jpg";
import Navigation from "./components/Navigation";
import HomeFeed from "./components/HomeFeed";
import MapView from "./components/MapView";
import ReportIssue from "./components/ReportIssue";
import CommunitiesScreen from "./components/CommunitiesScreen";
import ProfileScreen from "./components/ProfileScreen";
import AuthScreen from "./components/AuthScreen";
import CommunityDiscussionSheet from "./components/CommunityDiscussionSheet";
import { IssueReport, UserProfile, Comment, TimelineUpdate } from "./types";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "./lib/firebase";
import { doc, getDoc, getDocs, setDoc, updateDoc, collection, onSnapshot, query, where, addDoc } from "firebase/firestore";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("feed");
  const [selectedCommunity, setSelectedCommunity] = useState<string>("Old Bowenpally");
  const [isDiscussionOpen, setIsDiscussionOpen] = useState(false);

  // Helper to trigger background insights refresh whenever reports are created or updated
  const triggerInsightsRefresh = async (communityName: string) => {
    if (!communityName) return;
    try {
      fetch(`/api/community-insights/${encodeURIComponent(communityName)}/refresh`, {
        method: "POST"
      }).then((res) => {
        if (res.ok) {
          console.log(`Successfully completed background insights refresh for: ${communityName}`);
        }
      }).catch((e) => {
        console.error("Background insights fetch call failed:", e);
      });
    } catch (e) {
      console.error("Failed to initiate insights refresh:", e);
    }
  };
  
  // User Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  
  // Computed values
  const isCoordinatorMode = !!currentUser?.isCoordinator;
  const currentUserId = currentUser?.id || "user_citizen_1";

  // Data State
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [communities, setCommunities] = useState<string[]>([
    "Old Bowenpally", 
    "New Bowenpally", 
    "Kukatpally", 
    "Madhapur",
    "Gachibowli",
    "Secunderabad"
  ]);

  // Loading indicator
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isReportsLoading, setIsReportsLoading] = useState(true);

  // Auto-login check on mount with resilient cache/API fallbacks
  useEffect(() => {
    setInitialLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profileDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (profileDoc.exists()) {
            const profileData = profileDoc.data() as UserProfile;
            setCurrentUser(profileData);
            setProfile(profileData);
            setSelectedCommunity(profileData.selectedCommunity || "Old Bowenpally");
            localStorage.setItem("jansetu_user_id", firebaseUser.uid);
            localStorage.setItem(`jansetu_profile_${firebaseUser.uid}`, JSON.stringify(profileData));
            setSessionReady(true);
          } else {
            // Check if we can load from API first
            try {
              const apiRes = await fetch(`/api/profile/${firebaseUser.uid}`);
              if (apiRes.ok) {
                const profileData = await apiRes.json() as UserProfile;
                setCurrentUser(profileData);
                setProfile(profileData);
                setSelectedCommunity(profileData.selectedCommunity || "Old Bowenpally");
                localStorage.setItem("jansetu_user_id", firebaseUser.uid);
                localStorage.setItem(`jansetu_profile_${firebaseUser.uid}`, JSON.stringify(profileData));
                setSessionReady(true);
                return;
              }
            } catch (apiE) {
              console.error("Express API fallback profile load failed:", apiE);
            }

            // No profile found on Firestore/API, logout
            await signOut(auth);
            setCurrentUser(null);
            setProfile(null);
            localStorage.removeItem("jansetu_user_id");
          }
        } catch (err) {
          console.warn("Firestore user profile fetch failed (offline mode):", err);
          
          // Recovery line 1: local cache
          const cached = localStorage.getItem(`jansetu_profile_${firebaseUser.uid}`);
          if (cached) {
            try {
              const profileData = JSON.parse(cached) as UserProfile;
              setCurrentUser(profileData);
              setProfile(profileData);
              setSelectedCommunity(profileData.selectedCommunity || "Old Bowenpally");
              setSessionReady(true);
              console.log("Successfully restored user profile from offline local storage cache.");
              return;
            } catch (parseErr) {
              console.error("Local storage cache parse failed:", parseErr);
            }
          }

          // Recovery line 2: local REST API fallback
          try {
            const apiRes = await fetch(`/api/profile/${firebaseUser.uid}`);
            if (apiRes.ok) {
              const profileData = await apiRes.json() as UserProfile;
              setCurrentUser(profileData);
              setProfile(profileData);
              setSelectedCommunity(profileData.selectedCommunity || "Old Bowenpally");
              localStorage.setItem("jansetu_user_id", firebaseUser.uid);
              localStorage.setItem(`jansetu_profile_${firebaseUser.uid}`, JSON.stringify(profileData));
              setSessionReady(true);
              return;
            }
          } catch (apiE) {
            console.error("Express API fallback profile load failed on connection error:", apiE);
          }

          // Recovery line 3: self-healing bootstrap for default demo accounts
          if (firebaseUser.email === "citizen@jansetu.org") {
            const mockProfile: UserProfile = {
              id: firebaseUser.uid,
              name: "Arun Kumar",
              email: "citizen@jansetu.org",
              mobile: "+91 98765 43210",
              selectedCommunity: "Old Bowenpally",
              isCoordinator: false,
              reputationPoints: 45,
              reportsSubmittedCount: 3,
              verificationsCount: 5,
              communityContributionsCount: 12,
              avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=Arun Kumar`,
              badge: "Civic Reporter"
            };
            setCurrentUser(mockProfile);
            setProfile(mockProfile);
            setSelectedCommunity("Old Bowenpally");
            localStorage.setItem(`jansetu_profile_${firebaseUser.uid}`, JSON.stringify(mockProfile));
            setSessionReady(true);
          } else if (firebaseUser.email === "coordinator@jansetu.org") {
            const mockProfile: UserProfile = {
              id: firebaseUser.uid,
              name: "Srinivas Raju",
              email: "coordinator@jansetu.org",
              mobile: "+91 90000 12345",
              selectedCommunity: "Old Bowenpally",
              isCoordinator: true,
              reputationPoints: 250,
              reportsSubmittedCount: 0,
              verificationsCount: 18,
              communityContributionsCount: 48,
              avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=Srinivas Raju`,
              badge: "JanSetu Champion"
            };
            setCurrentUser(mockProfile);
            setProfile(mockProfile);
            setSelectedCommunity("Old Bowenpally");
            localStorage.setItem(`jansetu_profile_${firebaseUser.uid}`, JSON.stringify(mockProfile));
            setSessionReady(true);
          }
        } finally {
          setInitialLoading(false);
        }
      } else {
        setCurrentUser(null);
        setProfile(null);
        localStorage.removeItem("jansetu_user_id");
        setInitialLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch reports from Express API fallback
  const fetchReportsFromAPI = async (communityName: string) => {
    try {
      console.log(`[fetchReports] Fetching from Express API fallback for "${communityName}"`);
      const res = await fetch(`/api/reports?community=${encodeURIComponent(communityName)}`);
      if (res.ok) {
        const data = await res.json() as IssueReport[];
        setSelectedCommunity(current => {
          if (current === communityName) {
            if (data && data.length > 0) {
              setReports(data);
            }
            setIsReportsLoading(false);
            console.log(`[fetchReports] Loaded ${data ? data.length : 0} reports from Express API fallback.`);
          }
          return current;
        });
      } else {
        setSelectedCommunity(current => {
          if (current === communityName) {
            setIsReportsLoading(false);
          }
          return current;
        });
      }
    } catch (apiErr) {
      console.error("[fetchReports] Express API fallback request failed:", apiErr);
      setSelectedCommunity(current => {
        if (current === communityName) {
          setIsReportsLoading(false);
        }
        return current;
      });
    }
  };

  // Fetch all reports from Firestore with dual-loading Express fallback
  const fetchReports = () => {
    if (!selectedCommunity) return () => {};
    
    // Proactively query local REST API so the feed is instantly populated
    fetchReportsFromAPI(selectedCommunity);

    const q = query(
      collection(db, "reports"),
      where("community", "==", selectedCommunity)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        console.log(`[fetchReports] Firestore snapshot fired with ${snapshot.size} reports for "${selectedCommunity}".`);
        setIsReportsLoading(false);
        if (snapshot.empty) {
          // If Firestore is empty (or lagging), fallback to REST API is already running
          return;
        }

        const reportsList: IssueReport[] = [];
        
        // Step 1: Map parent reports immediately so the UI renders the feed instantly!
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          reportsList.push({
            id: docSnap.id,
            ...data,
            comments: [],
            updates: []
          } as IssueReport);
        });
        
        // Sort reportsList in-memory by createdAt descending
        reportsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setReports([...reportsList]);
        
        // Step 2: Asynchronously fetch comments and updates for each report
        snapshot.docs.forEach(async (docSnap) => {
          try {
            const commentsCol = collection(db, "reports", docSnap.id, "comments");
            const updatesCol = collection(db, "reports", docSnap.id, "updates");
            
            const [commentsSnap, updatesSnap] = await Promise.all([
              getDocs(commentsCol),
              getDocs(updatesCol)
            ]);
            
            const comments = commentsSnap.docs.map(c => ({ id: c.id, ...c.data() })) as Comment[];
            const updates = updatesSnap.docs.map(u => ({ id: u.id, ...u.data() })) as TimelineUpdate[];
            
            comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            updates.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            
            setReports(prevReports => 
              prevReports.map(r => 
                r.id === docSnap.id 
                  ? { ...r, comments, updates }
                  : r
              )
            );
          } catch (subErr) {
            console.error(`[fetchReports] Error loading subcollections for ${docSnap.id}:`, subErr);
          }
        });
        
      } catch (err) {
        console.error("[fetchReports] Error in snapshot processing:", err);
      }
    }, (error) => {
      console.warn("[fetchReports] Firestore subscription offline or failed. Falling back to API...", error);
      // Ensure Express API fallback gets triggered immediately if subscription errors out
      fetchReportsFromAPI(selectedCommunity);
    });
    
    return unsubscribe;
  };

  // Fetch current profile details with offline local storage cache fallback
  const fetchProfile = async () => {
    if (!currentUser?.id) return;
    try {
      const profileSnap = await getDoc(doc(db, "users", currentUser.id));
      if (profileSnap.exists()) {
        const data = profileSnap.data() as UserProfile;
        setProfile(data);
        setCurrentUser(data);
        localStorage.setItem(`jansetu_profile_${currentUser.id}`, JSON.stringify(data));
      }
    } catch (e) {
      console.warn("Failed to fetch profile from Firestore, using cached backup:", e);
      const cached = localStorage.getItem(`jansetu_profile_${currentUser.id}`);
      if (cached) {
        try {
          const data = JSON.parse(cached) as UserProfile;
          setProfile(data);
          setCurrentUser(data);
        } catch (parseE) {
          console.error("Failed to parse cached profile:", parseE);
        }
      }
    }
  };

  // Sync profile options when community is swapped
  const updateProfileCommunity = async (comm: string) => {
    if (!currentUser?.id) return;
    try {
      await updateDoc(doc(db, "users", currentUser.id), {
        selectedCommunity: comm
      });
      fetchProfile();
    } catch (e) {
      console.warn("Failed to update profile community on Firestore, syncing locally:", e);
      // Sync locally to keep user interface interactive
      const cached = localStorage.getItem(`jansetu_profile_${currentUser.id}`);
      if (cached) {
        try {
          const data = JSON.parse(cached) as UserProfile;
          data.selectedCommunity = comm;
          setProfile(data);
          setCurrentUser(data);
          localStorage.setItem(`jansetu_profile_${currentUser.id}`, JSON.stringify(data));
        } catch (parseE) {
          console.error(parseE);
        }
      }
    }
  };

  useEffect(() => {
    if (currentUser) {
      setIsReportsLoading(true);
      const unsubscribe = fetchReports();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [selectedCommunity, currentUser?.id]);

  const handleAuthSuccess = (profileData: UserProfile) => {
    setCurrentUser(profileData);
    setProfile(profileData);
    setSelectedCommunity(profileData.selectedCommunity || "Old Bowenpally");
    localStorage.setItem("jansetu_user_id", profileData.id);
    setSessionReady(true);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Signout error:", err);
    }
    setCurrentUser(null);
    setProfile(null);
    setSessionReady(false);
    localStorage.removeItem("jansetu_user_id");
    setActiveTab("feed");
  };

  // Handler: Upvote / Verify report
  const handleVerify = async (reportId: string, type: 'confirm' | 'resolve') => {
    if (!currentUser?.id) return;
    try {
      const reportRef = doc(db, "reports", reportId);
      const reportSnap = await getDoc(reportRef);
      if (reportSnap.exists()) {
        const reportData = reportSnap.data() as IssueReport;
        
        let confirmedBy = reportData.confirmedBy || [];
        let resolvedBy = reportData.resolvedBy || [];
        let status = reportData.status;
        let verificationCount = reportData.verificationCount || 0;
        
        if (type === 'confirm') {
          if (!confirmedBy.includes(currentUser.id)) {
            confirmedBy.push(currentUser.id);
            verificationCount = confirmedBy.length;
            if (verificationCount >= 3 && status === 'Reported') {
              status = 'Verified';
            }
          }
        } else if (type === 'resolve') {
          if (!resolvedBy.includes(currentUser.id)) {
            resolvedBy.push(currentUser.id);
            if (resolvedBy.length >= 3 || currentUser.isCoordinator) {
              status = 'Resolved';
            }
          }
        }
        
        await updateDoc(reportRef, {
          confirmedBy,
          resolvedBy,
          status,
          verificationCount,
          updatedAt: new Date().toISOString()
        });
        
        // Update user's own statistics & reputation
        const userRef = doc(db, "users", currentUser.id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data() as UserProfile;
          await updateDoc(userRef, {
            verificationsCount: (userData.verificationsCount || 0) + 1,
            reputationPoints: (userData.reputationPoints || 0) + 5,
            communityContributionsCount: (userData.communityContributionsCount || 0) + 1
          });
          fetchProfile();
        }

        // Trigger background insights refresh
        triggerInsightsRefresh(selectedCommunity);
      }
    } catch (e) {
      console.error("Verification failed", e);
    }
  };

  // Handler: Add comment to discussion
  const handleComment = async (reportId: string, text: string) => {
    if (!currentUser?.id) return;
    try {
      const commentsCol = collection(db, "reports", reportId, "comments");
      const newComment = {
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${currentUser.name}`,
        userBadge: currentUser.badge || "Civic Reporter",
        text,
        createdAt: new Date().toISOString()
      };
      await addDoc(commentsCol, newComment);
      
      // Update user statistics & reputation
      const userRef = doc(db, "users", currentUser.id);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        await updateDoc(userRef, {
          reputationPoints: (userData.reputationPoints || 0) + 2,
          communityContributionsCount: (userData.communityContributionsCount || 0) + 1
        });
        fetchProfile();
      }

      // Trigger background insights and discussion summary refresh
      triggerInsightsRefresh(selectedCommunity);
      fetch(`/api/reports/${reportId}/summarize-discussion`, { method: "POST" }).catch(e => console.error(e));
    } catch (e) {
      console.error("Commenting failed", e);
    }
  };

  // Handler: Add Coordinator update
  const handleAddUpdate = async (reportId: string, status: string, message: string) => {
    if (!currentUser?.id) return;
    try {
      const updatesCol = collection(db, "reports", reportId, "updates");
      const newUpdate = {
        status,
        message,
        timestamp: new Date().toISOString(),
        actorName: currentUser.name,
        actorRole: currentUser.isCoordinator ? "Coordinator" : "Citizen"
      };
      await addDoc(updatesCol, newUpdate);
      
      // Update primary report status
      await updateDoc(doc(db, "reports", reportId), {
        status,
        updatedAt: new Date().toISOString()
      });

      // Trigger background insights and discussion summary refresh
      triggerInsightsRefresh(selectedCommunity);
      fetch(`/api/reports/${reportId}/summarize-discussion`, { method: "POST" }).catch(e => console.error(e));
    } catch (e) {
      console.error("Failed to post official status update", e);
    }
  };

  // Handler: Submit new visual report
  const handleSubmitReport = async (reportData: Partial<IssueReport>) => {
    if (!currentUser?.id) return;
    try {
      const reportId = `report_${Date.now()}`;
      const newReport = {
        ...reportData,
        id: reportId,
        reporterId: currentUser.id,
        reporterName: currentUser.name,
        reporterAvatar: currentUser.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${currentUser.name}`,
        status: reportData.status || "Reported",
        verificationCount: 0,
        confirmedBy: [],
        resolvedBy: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, "reports", reportId), newReport);
      
      // Store duplicate relationship if user bypassed check
      if (reportData.duplicateOf) {
        try {
          const relationshipId = `dup_${Date.now()}`;
          await setDoc(doc(db, "duplicateRelationships", relationshipId), {
            id: relationshipId,
            originalReportId: reportData.duplicateOf,
            duplicateReportId: reportId,
            userId: currentUser.id,
            type: "continue_as_new",
            timestamp: new Date().toISOString(),
            justification: "Citizen chose to publish anyway after a matching duplicate was detected."
          });
          console.log(`Stored duplicate relationship 'continue_as_new' in Firestore: ${relationshipId}`);
        } catch (dupErr) {
          console.error("Failed to store duplicate relationship:", dupErr);
        }
      }
      
      // Update user statistics & reputation
      const userRef = doc(db, "users", currentUser.id);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        await updateDoc(userRef, {
          reportsSubmittedCount: (userData.reportsSubmittedCount || 0) + 1,
          reputationPoints: (userData.reputationPoints || 0) + 10,
          communityContributionsCount: (userData.communityContributionsCount || 0) + 1
        });
        fetchProfile();
      }

      // Trigger background insights refresh
      triggerInsightsRefresh(reportData.community || selectedCommunity);
      
      setActiveTab("feed");
    } catch (e) {
      console.error("Report posting failed", e);
    }
  };

  const handleJumpToIssue = (reportId: string) => {
    setActiveTab("feed");
  };

  const handleCommunityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedCommunity(value);
    updateProfileCommunity(value);
  };

  // Compute dynamic stats for Left and Right sidebars
  const activeIssuesCount = reports.filter(r => r.status !== "Resolved").length;
  const resolvedIssuesCount = reports.filter(r => r.status === "Resolved").length;
  
  const resolutionRate = reports.length > 0 
    ? Math.round((resolvedIssuesCount / reports.length) * 100) 
    : 84;

  const categoriesCount = reports.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topConcern = Object.keys(categoriesCount).length > 0
    ? Object.keys(categoriesCount).reduce((a, b) => categoriesCount[a] > categoriesCount[b] ? a : b)
    : "Road Damage";

  const getAreaCode = (comm: string) => {
    switch (comm) {
      case "Banjara Hills": return "500034";
      case "Kukatpally": return "500072";
      case "Madhapur": return "500081";
      case "Gachibowli": return "500032";
      default: return "500011";
    }
  };

  const getCoordinatorDetails = (comm: string) => {
    if (currentUser && currentUser.isCoordinator && currentUser.selectedCommunity === comm) {
      return {
        name: currentUser.name,
        avatar: currentUser.avatar,
        quote: "Active community coordinator managing via JanSetu console. Submit reports, highlight issues, or pin announcements below."
      };
    }

    switch (comm) {
      case "Banjara Hills":
        return {
          name: "Meera Sen",
          avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=MeeraSen",
          quote: "Working with municipal water works to address high priority leakages. Please submit coordinates if you notice water pressure drop."
        };
      case "Kukatpally":
        return {
          name: "K. Venkatesh",
          avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=KVenkatesh",
          quote: "Road repairs on Metro highway are active. Report any loose gravel or broken footpaths immediately."
        };
      case "Madhapur":
        return {
          name: "Pranav Shah",
          avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=PranavShah",
          quote: "Hitec City lane optimization is underway. Your visual uploads help municipal teams dispatch repairs within 24 hours."
        };
      case "Gachibowli":
        return {
          name: "Aarav Sharma",
          avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=AaravSharma",
          quote: "Financial district traffic patrols are active tonight. Please verify if you notice any broken streetlights."
        };
      default:
        return {
          name: "Suresh Reddy",
          avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=SureshReddy",
          quote: "Verified the market pothole report. Escalating to Zonal Office today. Please add your confirmation to increase priority."
        };
    }
  };

  const coordInfo = getCoordinatorDetails(selectedCommunity);

  // Grab latest report details for dynamic Gemini AI Vision box
  const latestReport = reports[0];

  // If user is not logged in or onboarding/welcome is not complete, show only the mobile container holding the AuthScreen
  if (!currentUser || !sessionReady) {
    if (initialLoading) {
      return (
        <div id="jansetu-app-root" className="h-[100dvh] w-screen bg-slate-100 flex items-center justify-center p-4 lg:p-6 font-sans text-slate-900 antialiased overflow-hidden">
          <div className="flex flex-col items-center gap-3">
            <div className="w-9 h-9 rounded-full border-2 border-slate-200 border-t-emerald-600 animate-spin"></div>
            <span className="text-xs font-semibold font-mono text-slate-500 tracking-wider">Syncing JanSetu Core...</span>
          </div>
        </div>
      );
    }
    return (
      <div id="jansetu-app-root" className="h-[100dvh] w-screen bg-slate-100 flex items-center justify-center p-0 md:p-4 font-sans text-slate-900 antialiased overflow-hidden">
        <div 
          id="app-mobile-container"
          className="w-full max-w-md h-full md:h-[min(85vh,820px)] bg-white md:rounded-[36px] md:shadow-[0_20px_50px_rgba(0,0,0,0.25)] md:border-2 md:border-slate-300 flex flex-col overflow-hidden relative shrink-0"
        >
          <AuthScreen 
            onAuthSuccess={handleAuthSuccess} 
            availableCommunities={communities} 
            initialProfile={currentUser}
          />
        </div>
      </div>
    );
  }

  return (
    <div id="jansetu-app-root" className="h-[100dvh] w-screen bg-slate-100 flex flex-row items-center justify-center p-0 md:p-4 lg:p-6 gap-6 font-sans text-slate-900 antialiased overflow-hidden">
      
      {/* LEFT SIDEBAR: Community Insights (Desktop/Tablet view only) */}
      <div id="left-sidebar" className="hidden lg:flex w-72 xl:w-80 flex-col gap-4 shrink-0 justify-start select-none overflow-y-auto max-h-full pr-1 scrollbar-none">
        
        {/* Locality Header Card */}
        <div id="sidebar-locality-card" className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
          <h2 className="text-xs font-bold uppercase tracking-widest text-primary mb-1 font-display">My Community</h2>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight font-display">{selectedCommunity}</h1>
          <p className="text-xs text-slate-500 mt-1">Hyderabad, TS • Area Code {getAreaCode(selectedCommunity)}</p>
        </div>

        {/* Dynamic Community Insights Statistics */}
        <div id="sidebar-insights-card" className="flex-1 rounded-2xl bg-white p-5 shadow-sm border border-slate-200 flex flex-col justify-between min-h-[380px]">
          <div>
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-slate-800 font-display">
              <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse"></span>
              Community Insights
            </h3>
            <div className="space-y-3.5">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top Locality Concern</p>
                <p className="font-semibold text-xs text-slate-700 mt-0.5">{topConcern}</p>
                <span className="text-[9px] text-primary font-bold block mt-1">Active Tracking</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dynamic Resolution Rate</p>
                <p className="font-bold text-sm text-slate-800 mt-0.5">{resolutionRate}%</p>
                <span className="text-[9px] text-slate-400 block mt-0.5">Average fix speed: 6.2 Days</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Guardians</p>
                <p className="font-bold text-sm text-slate-800 mt-0.5">{reports.length * 4 + 112} Citizens Registered</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 border-t border-slate-100 pt-4">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Community Badges Unlocked</h4>
            <div className="flex gap-2">
              <div title="Civic Reporter Badge" className="h-10 w-10 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-lg shadow-xs hover:scale-110 transition-transform cursor-help">🏆</div>
              <div title="Community Guardian Badge" className="h-10 w-10 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center text-lg shadow-xs hover:scale-110 transition-transform cursor-help">🛡️</div>
              <div title="Citizen Advocate Badge" className="h-10 w-10 rounded-full bg-orange-50 border-2 border-orange-200 flex items-center justify-center text-lg shadow-xs hover:scale-110 transition-transform cursor-help">📸</div>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER: Smart Phone Container */}
      <div 
        id="app-mobile-container"
        className="w-full max-w-md h-full md:h-[min(85vh,820px)] bg-white md:rounded-[36px] md:shadow-[0_0_0_8px_#1e293b,0_20px_50px_rgba(0,0,0,0.25)] md:border-2 md:border-slate-300 flex flex-col overflow-hidden relative shrink-0"
      >
        
        {/* Dynamic Header */}
        <header id="app-header" className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between z-40 sticky top-0">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-white rounded-lg p-1.5 shadow-sm">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h1 id="app-logo-text" className="text-sm font-extrabold text-slate-900 tracking-tight leading-none font-display">JanSetu</h1>
              <span className="text-[8px] text-slate-400 font-bold block tracking-wider uppercase">{selectedCommunity}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Community Selector Dropdown */}
            <div className="relative flex items-center">
              <select
                id="header-community-select"
                value={selectedCommunity}
                onChange={handleCommunityChange}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-2.5 pr-7 py-1 text-[10px] font-bold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                {communities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>

            {/* Logout button */}
            <button
              id="header-logout-btn"
              onClick={handleLogout}
              title="Log Out"
              className="p-1 text-slate-400 hover:text-rose-600 transition-colors bg-slate-50 hover:bg-rose-50 border border-slate-200 rounded-lg"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Main Navigational Routing Screen Container */}
        <main id="app-main-view" className="flex-1 overflow-hidden relative flex flex-col">
          <>
            {activeTab === "feed" && (
              <HomeFeed 
                currentUserId={currentUserId}
                isCoordinator={isCoordinatorMode}
                selectedCommunity={selectedCommunity}
                reports={reports}
                onRefresh={fetchReports}
                onVerify={handleVerify}
                onComment={handleComment}
                onAddUpdate={handleAddUpdate}
                isLoading={isReportsLoading}
              />
            )}

            {activeTab === "map" && (
              <MapView 
                reports={reports}
                selectedCommunity={selectedCommunity}
                onViewInFeed={handleJumpToIssue}
              />
            )}

            {activeTab === "report" && (
              <ReportIssue 
                currentUserId={currentUserId}
                selectedCommunity={selectedCommunity}
                communities={communities}
                onSubmitReport={handleSubmitReport}
                onCancel={() => setActiveTab("feed")}
              />
            )}

            {activeTab === "community" && (
              <CommunitiesScreen 
                selectedCommunity={selectedCommunity}
                reports={reports}
                isCoordinator={isCoordinatorMode}
              />
            )}

            {activeTab === "profile" && profile && (
              <ProfileScreen 
                profile={profile}
                reports={reports}
                onViewInFeed={handleJumpToIssue}
                onLogout={handleLogout}
              />
            )}
          </>
        </main>

        {/* Floating Discussion Button */}
        {currentUser && (
          <button
            id="floating-discussion-btn"
            onClick={() => setIsDiscussionOpen(true)}
            className="absolute bottom-[72px] right-4 z-40 bg-emerald-600 text-white p-3.5 rounded-full shadow-[0_8px_20px_rgba(16,185,129,0.35)] hover:bg-emerald-500 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center border border-emerald-500/10"
            title="Open Community Discussion"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="absolute top-0 right-0 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          </button>
        )}

        {/* Community Discussion Sheet */}
        {currentUser && (
          <CommunityDiscussionSheet
            isOpen={isDiscussionOpen}
            onClose={() => setIsDiscussionOpen(false)}
            communityName={selectedCommunity}
            currentUser={currentUser}
          />
        )}

        {/* Bottom Tabbed Navigation */}
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      </div>

      {/* RIGHT SIDEBAR: AI Analysis Intelligence & Coordinator (Desktop/Tablet view only) */}
      <div id="right-sidebar" className="hidden lg:flex w-72 xl:w-80 flex-col gap-4 shrink-0 justify-start select-none overflow-y-auto max-h-full pr-1 scrollbar-none">
        
        {/* Gemini AI Vision Box */}
        <div id="sidebar-ai-box" className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-6 w-6 rounded bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
              <span className="text-[10px] font-bold">✦</span>
            </div>
            <h3 className="text-sm font-bold text-slate-800">Gemini AI Vision</h3>
          </div>
          
          {isReportsLoading && reports.length === 0 ? (
            <div className="space-y-4 animate-pulse">
              <div className="bg-slate-100 h-16 w-full rounded-xl"></div>
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between">
                  <div className="bg-slate-150 h-3 w-1/3 rounded"></div>
                  <div className="bg-slate-150 h-3 w-1/4 rounded"></div>
                </div>
                <div className="flex justify-between mt-2">
                  <div className="bg-slate-150 h-3 w-1/4 rounded"></div>
                  <div className="bg-slate-150 h-3 w-1/5 rounded"></div>
                </div>
                <div className="flex justify-between mt-2">
                  <div className="bg-slate-150 h-3 w-1/3 rounded"></div>
                  <div className="bg-slate-150 h-3 w-1/4 rounded"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {latestReport ? (
                <div className="text-xs bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-xl">
                  <p className="font-bold text-emerald-800 uppercase tracking-tighter text-[10px]">Latest Diagnostic Scan</p>
                  <p className="mt-1 text-slate-600 leading-relaxed font-medium">
                    {latestReport.summary ? `"${latestReport.summary}"` : `Analyzed "${latestReport.title}" with ${latestReport.confidence || 90}% structural confidence.`}
                  </p>
                </div>
              ) : (
                <div className="text-xs bg-indigo-50 border border-indigo-100 p-3.5 rounded-xl">
                  <p className="font-bold text-indigo-700 uppercase tracking-tighter text-[10px]">AI Diagnostic Status</p>
                  <p className="mt-1 text-slate-600 leading-relaxed">
                    No scan recorded in {selectedCommunity} yet. Upload an issue photograph to trigger automatic municipal categorizations!
                  </p>
                </div>
              )}
              
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Auto-Category</span>
                  <span className="font-bold text-slate-700">{latestReport?.category || "Road Maintenance"}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Safety Risk</span>
                  <span className={`font-bold ${latestReport?.severity === "Critical" || latestReport?.severity === "High" ? "text-rose-600 animate-pulse" : "text-slate-700"}`}>
                    {latestReport?.severity || "Moderate-High"}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Rec. Authority</span>
                  <span className="font-bold text-slate-700 truncate max-w-[130px]">{latestReport?.responsibleAuthority || "Municipal Roads Dept."}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Community Coordinator Contact Block */}
        <div id="sidebar-coordinator-box" className="flex-1 rounded-2xl bg-slate-800 p-5 shadow-sm text-white flex flex-col justify-between min-h-[300px]">
          <div>
            <h3 className="text-sm font-bold mb-4 tracking-tight flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
              Community Lead
            </h3>
            <div className="flex items-center gap-3 mb-5">
              <img 
                src={coordInfo.avatar} 
                alt={coordInfo.name} 
                className="w-11 h-11 rounded-full border-2 border-slate-700 bg-slate-700 object-cover shadow-sm"
              />
              <div>
                <p className="text-xs font-extrabold text-white tracking-tight">{coordInfo.name}</p>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold font-mono mt-0.5">Area Lead • {selectedCommunity}</p>
              </div>
            </div>
            
            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 shadow-inner">
              <p className="text-[11px] italic text-slate-300 leading-relaxed">
                "{coordInfo.quote}"
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-white/10 pt-4">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Citizen Reputation</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {profile ? `${profile.reputationPoints} PTS` : "0 PTS"}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)] transition-all duration-500"
                style={{ width: `${profile ? Math.min((profile.reputationPoints / 60) * 100, 100) : 10}%` }}
              ></div>
            </div>
            <p className="mt-1.5 text-[9px] text-slate-400 text-right">
              {profile && profile.reputationPoints >= 60 
                ? "Max Level Achieved 🏆" 
                : `${profile ? 60 - profile.reputationPoints : 60} pts to JanSetu Champion Badge`}
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
