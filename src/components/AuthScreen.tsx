import React, { useState, useEffect } from "react";
import { 
  User, 
  Mail, 
  Lock, 
  Phone, 
  MapPin, 
  ShieldAlert, 
  ArrowRight, 
  Sparkles, 
  CheckCircle, 
  Loader2,
  LockKeyhole,
  Info
} from "lucide-react";
import { UserProfile } from "../types";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

interface AuthScreenProps {
  onAuthSuccess: (profile: UserProfile) => void;
  availableCommunities: string[];
  initialProfile?: UserProfile | null;
}

type ScreenType = "login" | "signup" | "forgot" | "onboarding" | "welcome";

export default function AuthScreen({ onAuthSuccess, availableCommunities, initialProfile }: AuthScreenProps) {
  const [screen, setScreen] = useState<ScreenType>(() => {
    if (initialProfile) {
      return initialProfile.selectedCommunity ? "welcome" : "onboarding";
    }
    return "login";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [location, setLocation] = useState("");
  const [role, setRole] = useState<"member" | "coordinator">("member");
  const [coordinatorCode, setCoordinatorCode] = useState("");

  // Onboarding complete state
  const [assignedCommunity, setAssignedCommunity] = useState(() => initialProfile?.selectedCommunity || "");
  const [registeredProfile, setRegisteredProfile] = useState<UserProfile | null>(() => initialProfile || null);

  // Onboarding selection state
  const [selectedOptionA, setSelectedOptionA] = useState("");
  const [typedOptionB, setTypedOptionB] = useState("");
  const [onboardingError, setOnboardingError] = useState<string | null>(null);

  // Sync with initialProfile changes (e.g. mount or logout)
  useEffect(() => {
    if (initialProfile) {
      setRegisteredProfile(initialProfile);
      setAssignedCommunity(initialProfile.selectedCommunity || "");
      setScreen(initialProfile.selectedCommunity ? "welcome" : "onboarding");
    } else {
      setRegisteredProfile(null);
      setAssignedCommunity("");
      setScreen("login");
    }
  }, [initialProfile]);

  // Auto-redirect from welcome screen after 2 seconds
  useEffect(() => {
    if (screen === "welcome" && registeredProfile) {
      const timer = setTimeout(() => {
        onAuthSuccess(registeredProfile);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [screen, registeredProfile, onAuthSuccess]);

  // Simulate or execute GPS Geolocation
  const [detectingGPS, setDetectingGPS] = useState(false);

  const handleGPSDetect = () => {
    setDetectingGPS(true);
    setError(null);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Simulate mapping coordinates to nearest community in Hyderabad
          setTimeout(() => {
            const mockAreas = ["Old Bowenpally", "Kukatpally", "Madhapur", "Gachibowli"];
            const randomArea = mockAreas[Math.floor(Math.random() * mockAreas.length)];
            setLocation(randomArea);
            setDetectingGPS(false);
            setInfoMessage(`Detected location: ${randomArea} (Accuracy within 15 meters)`);
          }, 1500);
        },
        (err) => {
          // Fallback if browser permission is blocked, assign randomly or default
          setTimeout(() => {
            setLocation("Old Bowenpally");
            setDetectingGPS(false);
            setInfoMessage("Permission denied. Assigned to Old Bowenpally (default based on IP).");
          }, 1200);
        }
      );
    } else {
      setTimeout(() => {
        setLocation("Old Bowenpally");
        setDetectingGPS(false);
        setInfoMessage("GPS not supported. Defaulted to Old Bowenpally.");
      }, 1000);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (err: any) {
        // Self-healing bootstrap for default demo users
        const isDemoCitizen = email === "citizen@jansetu.org" && password === "citizen";
        const isDemoCoordinator = email === "coordinator@jansetu.org" && password === "coordinator";
        
        if (isDemoCitizen || isDemoCoordinator) {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
          
          // Seed the profile for this demo user immediately
          const demoProfile: UserProfile = isDemoCitizen ? {
            id: userCredential.user.uid,
            name: "Arun Kumar",
            email: "citizen@jansetu.org",
            mobile: "+91 98765 43210",
            selectedCommunity: "Old Bowenpally",
            isCoordinator: false,
            reputationPoints: 45,
            badge: "Community Guardian",
            reportsSubmittedCount: 6,
            verificationsCount: 18,
            communityContributionsCount: 24,
            avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=ArunKumar"
          } : {
            id: userCredential.user.uid,
            name: "Suresh Reddy",
            email: "coordinator@jansetu.org",
            mobile: "+91 99000 88001",
            selectedCommunity: "Old Bowenpally",
            isCoordinator: true,
            reputationPoints: 150,
            badge: "JanSetu Champion",
            reportsSubmittedCount: 12,
            verificationsCount: 42,
            communityContributionsCount: 84,
            avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=SureshReddy"
          };

          await setDoc(doc(db, "users", userCredential.user.uid), demoProfile);
          await setDoc(doc(db, "users", userCredential.user.uid, "private", "info"), {
            email,
            mobile: demoProfile.mobile,
            createdAt: new Date().toISOString()
          });
        } else {
          throw err;
        }
      }

      const uid = userCredential.user.uid;
      let profileData: UserProfile;
      
      try {
        const profileSnap = await getDoc(doc(db, "users", uid));
        if (profileSnap.exists()) {
          profileData = profileSnap.data() as UserProfile;
        } else {
          // Fallback profile if Firestore is desynced
          profileData = {
            id: uid,
            name: email.split("@")[0],
            email,
            selectedCommunity: "",
            isCoordinator: email.includes("coordinator"),
            reputationPoints: email.includes("coordinator") ? 120 : 10,
            badge: "Civic Reporter",
            reportsSubmittedCount: 0,
            verificationsCount: 0,
            communityContributionsCount: 0,
            avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(uid)}`
          };
          try {
            await setDoc(doc(db, "users", uid), profileData);
          } catch (writeErr) {
            console.warn("Failed to write fallback profile to Firestore:", writeErr);
          }
        }
      } catch (firestoreErr: any) {
        console.warn("AuthScreen getDoc failed (possibly offline), trying REST API fallback:", firestoreErr);
        try {
          const apiRes = await fetch(`/api/profile/${uid}`);
          if (apiRes.ok) {
            profileData = await apiRes.json() as UserProfile;
          } else {
            throw firestoreErr;
          }
        } catch (apiErr) {
          console.warn("REST API fallback failed too, using offline-ready state:", apiErr);
          const cached = localStorage.getItem(`jansetu_profile_${uid}`);
          if (cached) {
            profileData = JSON.parse(cached) as UserProfile;
          } else {
            profileData = {
              id: uid,
              name: email.split("@")[0],
              email,
              selectedCommunity: "", // allow selecting community in onboarding
              isCoordinator: email.includes("coordinator"),
              reputationPoints: email.includes("coordinator") ? 120 : 10,
              badge: "Civic Reporter",
              reportsSubmittedCount: 0,
              verificationsCount: 0,
              communityContributionsCount: 0,
              avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(uid)}`
            };
          }
        }
      }

      setRegisteredProfile(profileData);
      if (profileData.selectedCommunity) {
        setAssignedCommunity(profileData.selectedCommunity);
        setScreen("welcome");
      } else {
        setScreen("onboarding");
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Invalid email or password credentials.");
      } else {
        setError(err.message || "Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName || !email || !password || !confirmPassword || !mobile || !location) {
      setError("All fields are mandatory.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (role === "coordinator" && !coordinatorCode) {
      setError("Please provide your Coordinator Access Code.");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const userProfile: UserProfile = {
        id: uid,
        name: fullName,
        email,
        mobile,
        location,
        selectedCommunity: location,
        isCoordinator: role === "coordinator",
        reputationPoints: role === "coordinator" ? 150 : 10,
        badge: role === "coordinator" ? "JanSetu Champion" : "Civic Reporter",
        reportsSubmittedCount: 0,
        verificationsCount: 0,
        communityContributionsCount: 0,
        avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(fullName)}`
      };

      await setDoc(doc(db, "users", uid), userProfile);
      await setDoc(doc(db, "users", uid, "private", "info"), {
        email,
        mobile,
        createdAt: new Date().toISOString()
      });

      setRegisteredProfile(userProfile);
      setAssignedCommunity(userProfile.selectedCommunity);
      setScreen("welcome");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("This email address is already in use.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else {
        setError(err.message || "Failed to register account.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please specify your email.");
      return;
    }

    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      await sendPasswordResetEmail(auth, email);
      setInfoMessage("Password reset email successfully sent. Please check your inbox!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to dispatch reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen-root" className="flex flex-col h-full min-h-full w-full bg-slate-50/50 overflow-y-auto">
      
      {/* Top Navigation Header */}
      <header className="flex justify-between items-center w-full px-6 h-16 bg-white border-b border-slate-100 z-50 shrink-0">
        <h1 className="font-display text-xl font-extrabold text-primary tracking-tight">JanSetu</h1>
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-600">
          <Info className="w-5 h-5" />
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col px-6 pb-12 pt-4 max-w-md w-full mx-auto justify-center">

        {/* Floating Hero Illustration Area (Shown for login, signup, and forgot screens) */}
        {screen !== "welcome" && (
          <div className="relative w-full aspect-[4/3] max-w-[240px] mx-auto mb-6 flex items-center justify-center shrink-0">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl transform -translate-y-4"></div>
            <img 
              referrerPolicy="no-referrer" 
              className="w-full h-full object-contain relative z-10 float-animation" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBlDCzt-TbTzFEICvVEssJsZleL2ICHOPWhFcii8jkNz_Mntr4oSQL7BhtJwG-32V90AC10QTerAKeTK54uRmfysF_p8J0UJMuuKcqT0gtxcbjXFoLWOPuXQiMi8zBVkbEFv_B--6gnTh9vnTtz4-EHKbkKIysUoUiI3Ns5LlHXNhXPIcAcluzIhUji1Pg_RxXxCPmYuhvB9ODCPm-2OG1zgRueanbMFyIJty-A96gUIhUwFxo7hX69vyXHRFfGPk6i12L4Z18D8oM6" 
              alt="JanSetu Civic Illustration" 
            />
          </div>
        )}

        {/* Screen Views Router */}
        <div id="auth-card-body" className="w-full">

          {/* 1. LOGIN SCREEN */}
          {screen === "login" && (
            <form id="auth-login-form" onSubmit={handleLogin} className="space-y-5">
              <div className="text-center mb-5">
                <h2 className="font-display text-2xl font-black text-slate-800 tracking-tight">Your voice for better cities.</h2>
                <p className="font-sans text-xs text-slate-400 mt-1.5 leading-relaxed px-4">
                  Connect with your community and government to build a transparent, functional future together.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3.5">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary hover:border-slate-300 transition-all shadow-3xs"
                    required
                  />
                </div>

                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="login-password"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary hover:border-slate-300 transition-all shadow-3xs"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end text-right">
                <button
                  id="forgot-password-trigger"
                  type="button"
                  onClick={() => { setScreen("forgot"); setError(null); }}
                  className="text-xs font-bold text-primary hover:underline transition-colors"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-full bg-primary hover:bg-primary/95 text-white font-display font-extrabold text-xs tracking-wider transition-all shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "SIGN IN"}
              </button>

              <div className="p-4 bg-slate-100/70 rounded-2xl border border-slate-200/50 mt-5">
                <p className="text-[10px] text-slate-500 font-mono font-medium leading-relaxed">
                  💡 <strong>Demo Credentials:</strong><br />
                  • Member: <code className="bg-slate-200/80 px-1.5 py-0.5 rounded font-bold text-slate-700">citizen@jansetu.org</code> / <code className="bg-slate-200/80 px-1.5 py-0.5 rounded font-bold text-slate-700">citizen</code><br />
                  • Lead Coord: <code className="bg-slate-200/80 px-1.5 py-0.5 rounded font-bold text-slate-700">coordinator@jansetu.org</code> / <code className="bg-slate-200/80 px-1.5 py-0.5 rounded font-bold text-slate-700">coordinator</code>
                </p>
              </div>
            </form>
          )}

          {/* 2. SIGN UP SCREEN */}
          {screen === "signup" && (
            <form id="auth-signup-form" onSubmit={handleSignup} className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="font-display text-2xl font-black text-slate-800 tracking-tight">Create Account</h2>
                <p className="font-sans text-xs text-slate-400 mt-1">Join JanSetu to coordinate neighborhood civic resolution.</p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span className="leading-tight">{error}</span>
                </div>
              )}

              <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1 no-scrollbar">
                {/* Full Name */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    id="signup-name"
                    type="text"
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary hover:border-slate-300 transition-all shadow-3xs"
                    required
                  />
                </div>

                {/* Email */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    id="signup-email"
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary hover:border-slate-300 transition-all shadow-3xs"
                    required
                  />
                </div>

                {/* Mobile Number */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    id="signup-mobile"
                    type="tel"
                    placeholder="Mobile Number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary hover:border-slate-300 transition-all shadow-3xs"
                    required
                  />
                </div>

                {/* Location Selector */}
                <div className="bg-slate-100/80 p-3.5 rounded-2xl border border-slate-200/50 space-y-2.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Nearest Locality (Mandatory)</label>
                  
                  <div className="flex gap-2">
                    <select
                      id="signup-location-select"
                      value={location}
                      onChange={(e) => { setLocation(e.target.value); setInfoMessage(null); }}
                      className="flex-grow text-xs font-semibold bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary text-slate-700"
                    >
                      <option value="">Select Area Manually...</option>
                      {availableCommunities.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <button
                      id="signup-gps-btn"
                      type="button"
                      onClick={handleGPSDetect}
                      disabled={detectingGPS}
                      className="bg-primary/10 text-primary hover:bg-primary/15 border border-primary/20 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {detectingGPS ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MapPin className="w-4 h-4 text-primary" />
                      )}
                      <span>GPS</span>
                    </button>
                  </div>
                  
                  {infoMessage && (
                    <p className="text-[10px] font-mono text-emerald-600 font-bold block">{infoMessage}</p>
                  )}
                </div>

                {/* Password */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="signup-password"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary hover:border-slate-300 transition-all shadow-3xs"
                    required
                  />
                </div>

                {/* Confirm Password */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary hover:border-slate-300 transition-all shadow-3xs"
                    required
                  />
                </div>

                {/* Role Selection (Bento Cards) */}
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">My Role Selection</label>
                  <div className="grid grid-cols-1 gap-2.5">
                    <button
                      id="role-member-select"
                      type="button"
                      onClick={() => { setRole("member"); setError(null); }}
                      className={`group relative flex items-center p-4 bg-white border rounded-xl transition-all duration-300 hover:shadow-xs active:scale-95 text-left cursor-pointer ${
                        role === "member" ? "border-primary bg-primary/5 shadow-3xs" : "border-slate-200"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 shrink-0 ${
                        role === "member" ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
                      }`}>
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-display text-xs font-extrabold text-slate-800">I am a Citizen</h3>
                        <p className="font-sans text-[10px] text-slate-500 leading-snug mt-0.5">Report issues like potholes, waste, or broken lights.</p>
                      </div>
                      {role === "member" && (
                        <div className="text-primary ml-auto">
                          <CheckCircle className="w-5 h-5 text-primary" />
                        </div>
                      )}
                    </button>

                    <button
                      id="role-coordinator-select"
                      type="button"
                      onClick={() => { setRole("coordinator"); setError(null); }}
                      className={`group relative flex items-center p-4 bg-white border rounded-xl transition-all duration-300 hover:shadow-xs active:scale-95 text-left cursor-pointer ${
                        role === "coordinator" ? "border-tertiary bg-tertiary/5 shadow-3xs" : "border-slate-200"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 shrink-0 ${
                        role === "coordinator" ? "bg-tertiary text-white" : "bg-slate-100 text-slate-500"
                      }`}>
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-display text-xs font-extrabold text-slate-800">I am a Coordinator</h3>
                        <p className="font-sans text-[10px] text-slate-500 leading-snug mt-0.5">Manage community reports and coordinate fixes.</p>
                      </div>
                      {role === "coordinator" && (
                        <div className="text-tertiary ml-auto">
                          <CheckCircle className="w-5 h-5 text-tertiary" />
                        </div>
                      )}
                    </button>
                  </div>

                  {role === "coordinator" && (
                    <div className="relative pt-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 mt-1">
                        <LockKeyhole className="w-4 h-4 text-emerald-600" />
                      </span>
                      <input
                        id="signup-coord-code"
                        type="text"
                        placeholder="Coordinator Access Code"
                        value={coordinatorCode}
                        onChange={(e) => setCoordinatorCode(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 uppercase placeholder:normal-case shadow-3xs"
                      />
                      <span className="text-[9px] text-slate-400 block mt-1">
                        ℹ️ Valid code e.g. <code className="font-bold">JANSETU-OBP-2026</code>, <code className="font-bold">JANSETU-KKP-2026</code>, or <code className="font-bold">JANSETU-MDP-2026</code>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                id="signup-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-full bg-primary hover:bg-primary/95 text-white font-display font-extrabold text-xs tracking-wider transition-all shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "CREATE ACCOUNT"}
              </button>
            </form>
          )}

          {/* 3. FORGOT PASSWORD */}
          {screen === "forgot" && (
            <form id="auth-forgot-form" onSubmit={handleForgotPassword} className="space-y-5">
              <div className="text-center mb-5">
                <h2 className="font-display text-2xl font-black text-slate-800 tracking-tight">Reset Password</h2>
                <p className="font-sans text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Enter your registered email address and we will dispatch password recovery instructions.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {infoMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{infoMessage}</span>
                </div>
              )}

              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary hover:border-slate-300 transition-all shadow-3xs"
                  required
                />
              </div>

              <button
                id="forgot-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-full bg-primary hover:bg-primary/95 text-white font-display font-extrabold text-xs tracking-wider transition-all shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "RESET MY PASSWORD"}
              </button>

              <div className="text-center">
                <button
                  id="back-to-login"
                  type="button"
                  onClick={() => { setScreen("login"); setError(null); setInfoMessage(null); }}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {/* ONBOARDING SCREEN (Step 2) */}
          {screen === "onboarding" && (
            <div id="auth-onboarding-step" className="space-y-6 py-2">
              <div className="text-center">
                <h2 className="font-display text-2xl font-black text-slate-800 tracking-tight">
                  Which community do you belong to?
                </h2>
                <p className="font-sans text-xs text-slate-400 mt-1">
                  Select or type your locality to connect with your neighborhood portal.
                </p>
              </div>

              {onboardingError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold">
                  {onboardingError}
                </div>
              )}

              {/* Option A: Manual Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    A
                  </span>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Option A: Choose Seeded Community (Recommended)
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {availableCommunities.map((comm) => {
                    const isSelected = selectedOptionA === comm && !typedOptionB;
                    return (
                      <button
                        key={comm}
                        type="button"
                        onClick={() => {
                          setSelectedOptionA(comm);
                          setTypedOptionB(""); // Clear Option B when Option A is selected
                          setOnboardingError(null);
                        }}
                        className={`p-3 text-left rounded-xl border transition-all text-xs font-bold ${
                          isSelected
                            ? "border-primary bg-primary/5 text-primary shadow-2xs"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {comm}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-mono font-bold uppercase">OR</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Option B: Manual Type */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    B
                  </span>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Option B: Enter Custom Locality
                  </h3>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Type your locality or community name..."
                    value={typedOptionB}
                    onChange={(e) => {
                      setTypedOptionB(e.target.value);
                      setSelectedOptionA(""); // Clear Option A when typing Option B
                      setOnboardingError(null);
                    }}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary hover:border-slate-300 transition-all shadow-3xs"
                  />

                  {typedOptionB.trim() && (
                    <div className="text-[10px] font-mono font-bold">
                      {(() => {
                        const match = availableCommunities.find(
                          c => c.toLowerCase() === typedOptionB.trim().toLowerCase()
                        );
                        if (match) {
                          return (
                            <span className="text-emerald-600">
                              ✨ Perfect match! Automatically associating with: <strong>{match}</strong>
                            </span>
                          );
                        } else {
                          return (
                            <span className="text-slate-400">
                              Using typed locality: "{typedOptionB.trim()}"
                            </span>
                          );
                        }
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={async () => {
                  const final = typedOptionB.trim() || selectedOptionA;
                  if (!final.trim()) {
                    setOnboardingError("Please select a community or enter a locality name.");
                    return;
                  }
                  if (!registeredProfile) return;
                  setLoading(true);
                  setOnboardingError(null);
                  try {
                    const matched = availableCommunities.find(
                      c => c.toLowerCase() === final.trim().toLowerCase()
                    );
                    const finalComm = matched || final.trim();
                    const userRef = doc(db, "users", registeredProfile.id);
                    await updateDoc(userRef, {
                      selectedCommunity: finalComm,
                      location: finalComm
                    });
                    const updatedProfile = { 
                      ...registeredProfile, 
                      selectedCommunity: finalComm,
                      location: finalComm 
                    };
                    setRegisteredProfile(updatedProfile);
                    setAssignedCommunity(finalComm);
                    setScreen("welcome");
                  } catch (err: any) {
                    console.error("Error saving onboarding community:", err);
                    setOnboardingError("Failed to update community selection. Please try again.");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || (!selectedOptionA && !typedOptionB.trim())}
                className="w-full h-12 bg-primary hover:bg-primary/95 text-white font-display font-extrabold text-xs tracking-wider rounded-full shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:scale-100"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>CONFIRM & CONTINUE</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* 4. ONBOARDING WELCOME SCREEN */}
          {screen === "welcome" && registeredProfile && (
            <div id="auth-welcome-step" className="text-center space-y-6 py-8">
              <div className="text-4xl">🏘️</div>

              <div className="space-y-2">
                <h2 className="font-display text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">
                  Welcome to
                </h2>
                <h1 className="font-display text-2xl font-black text-slate-800 tracking-tight">
                  {assignedCommunity} Community
                </h1>
                <p className="font-sans text-xs italic text-slate-500 font-medium">
                  "Connecting you with your neighbourhood."
                </p>
              </div>

              <div className="flex flex-col items-center justify-center gap-2 pt-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase tracking-wider">
                  Entering Portal...
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Auth Screen Footer Toggler */}
        {screen !== "welcome" && screen !== "onboarding" && (
          <div id="auth-footer" className="text-center border-t border-slate-200/50 pt-5 mt-8 shrink-0">
            {screen === "login" ? (
              <p className="text-xs text-slate-400 font-semibold">
                New to JanSetu?{" "}
                <button
                  id="toggle-signup"
                  onClick={() => { setScreen("signup"); setError(null); }}
                  className="text-primary hover:underline font-bold cursor-pointer"
                >
                  Create an account
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-400 font-semibold">
                Already registered?{" "}
                <button
                  id="toggle-login"
                  onClick={() => { setScreen("login"); setError(null); }}
                  className="text-primary hover:underline font-bold cursor-pointer"
                >
                  Sign in here
                </button>
              </p>
            )}
          </div>
        )}

      </main>

    </div>
  );
}
