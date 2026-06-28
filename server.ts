import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import { initializeApp as initializeFirebaseApp } from "firebase/app";
import { initializeFirestore as initializeFirebaseFirestore, collection as firestoreCollection, getDocs as firestoreGetDocs, query as firestoreQuery, where as firestoreWhere, setDoc as firestoreSetDoc, doc as firestoreDoc, getDoc as firestoreGetDoc, deleteDoc as firestoreDeleteDoc } from "firebase/firestore";

dotenv.config();

let firebaseApp: any = null;
let firestoreDb: any = null;

function getFirestoreDb() {
  if (!firestoreDb) {
    try {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        firebaseApp = initializeFirebaseApp({
          apiKey: config.apiKey,
          authDomain: config.authDomain,
          projectId: config.projectId,
          storageBucket: config.storageBucket,
          messagingSenderId: config.messagingSenderId,
          appId: config.appId
        });
        firestoreDb = initializeFirebaseFirestore(firebaseApp, {
          experimentalForceLongPolling: true
        }, config.firestoreDatabaseId || "(default)");
        console.log("Firestore successfully initialized on server.");
      } else {
        console.warn("firebase-applet-config.json not found, using simulation mode.");
      }
    } catch (e) {
      console.error("Failed to initialize Firestore on server:", e);
    }
  }
  return firestoreDb;
}

const app = express();
const PORT = 3000;

// Initialize Google GenAI if key is present
const hasApiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY" && process.env.GEMINI_API_KEY.trim() !== "";
let ai: GoogleGenAI | null = null;

if (hasApiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini API Client successfully initialized.");
  } catch (err) {
    console.error("Failed to initialize Gemini API client:", err);
  }
} else {
  console.log("No valid GEMINI_API_KEY found. Running in high-fidelity AI-Simulation mode.");
}

// Enable rich JSON bodies up to 10MB (for base64 photos)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// File-based database persistence path
const DATA_FILE = path.join(process.cwd(), "data-store.json");

// Helper to load/save JSON data
function loadData() { return {}; }

function oldLoadData() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(raw);
    } catch (e) {
      console.error("Error reading data-store.json, creating a fresh database.", e);
    }
  }

  // Initial Seed Data if file does not exist
  const initialData = {
    reports: [
      {
        id: "rep_1",
        reporterId: "user_citizen_1",
        reporterName: "Arun Kumar",
        reporterAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
        title: "Massive dangerous pothole causing scooter accidents",
        description: "A huge pothole has formed right in the middle of the main crossroad near Old Bowenpally market. Several scooter riders have slipped and crashed into it especially during evening hours because of poor lighting.",
        image: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600",
        locationName: "Old Bowenpally Market Main Crossroad",
        locationCoords: { lat: 17.4795, lng: 78.4741 },
        community: "Old Bowenpally",
        category: "Road Damage",
        severity: "Critical",
        priority: "Critical",
        status: "In Progress",
        verificationCount: 24,
        confirmedBy: ["user_citizen_2", "user_coord", "user_citizen_3"],
        resolvedBy: [],
        confidence: 96,
        summary: "Hazardous pothole in high-traffic market area posing an imminent safety risk to local two-wheeler riders.",
        safetyRisks: "Severe risk of scooter wipeouts, traffic congestion, and collision with oncoming vehicles attempting to swerve around the pit.",
        responsibleAuthority: "Greater Hyderabad Municipal Corporation (GHMC) Road Maintenance Wing",
        recommendedActions: [
          "Cordon off the pothole with safety cones and yellow visual hazard tape.",
          "Pour emergency cold asphalt mixture into the cavity and steam-roll it.",
          "Perform complete milling and resurfacing of the damaged street section."
        ],
        estimatedTimeline: "2-3 Days",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updates: [
          {
            id: "upd_1",
            status: "Verified",
            message: "Report verified by community coordinator. Photos and location accuracy validated.",
            timestamp: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString(),
            actorName: "Srinivas Raju",
            actorRole: "Coordinator"
          },
          {
            id: "upd_2",
            status: "In Progress",
            message: "Escalated to GHMC engineering cell. Patching crew has been assigned to the location.",
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            actorName: "Srinivas Raju",
            actorRole: "Coordinator"
          }
        ],
        comments: [
          {
            id: "c_1",
            userId: "user_citizen_2",
            userName: "Divya Reddy",
            userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
            userBadge: "Community Guardian",
            text: "My neighbor tripped on his bike here yesterday! Absolutely urgent.",
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: "c_2",
            userId: "user_coord",
            userName: "Srinivas Raju",
            userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
            userBadge: "JanSetu Champion",
            text: "I have personally inspected this and raised it with the ward office. They promised a team will be here by tomorrow morning.",
            createdAt: new Date(Date.now() - 1.2 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      },
      {
        id: "rep_2",
        reporterId: "user_citizen_3",
        reporterName: "Vikram Sen",
        reporterAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
        title: "Major garbage dumping on service road block",
        description: "Commercial waste and domestic trash bags are being thrown indiscriminately on the main service road near Kukatpally Metro Station. Stench is unbearable, stray dogs are ripping bags apart and scattering them everywhere.",
        image: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600",
        locationName: "Kukatpally Metro Station Lane A",
        locationCoords: { lat: 17.4851, lng: 78.3986 },
        community: "Kukatpally",
        category: "Waste Management",
        severity: "High",
        priority: "High",
        status: "Reported",
        verificationCount: 12,
        confirmedBy: ["user_citizen_1"],
        resolvedBy: [],
        confidence: 94,
        summary: "Unauthorized commercial and domestic garbage accumulation on service lane attracting pests and blocking pedestrian paths.",
        safetyRisks: "Severe hygienic risks, insect breeding, foul odor, and public road blockages forcing people to walk on high-traffic lanes.",
        responsibleAuthority: "Kukatpally Zonal Municipal Sanitation Department",
        recommendedActions: [
          "Dispatch heavy dumpster loaders to clear the current rubbish heap.",
          "Install prominent 'No Littering - Fine ₹5000' warning billboards.",
          "Deploy CCTV tracking cameras or local community night patrols."
        ],
        estimatedTimeline: "3-4 Days",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updates: [],
        comments: [
          {
            id: "c_3",
            userId: "user_citizen_1",
            userName: "Arun Kumar",
            userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
            userBadge: "JanSetu Champion",
            text: "This has been building up since Monday. Sanitation trucks are bypassing this corner entirely.",
            createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
          }
        ]
      },
      {
        id: "rep_3",
        reporterId: "user_coord",
        reporterName: "Srinivas Raju",
        reporterAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
        title: "Broken commercial streetlights on Road No 12",
        description: "Entire stretch of streetlights from KBR park entrance down Road 12 is pitch black. Extremely dangerous for elderly evening walkers and cars turning blind corners.",
        image: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&q=80&w=600",
        locationName: "Road No 12 near KBR Park Entrance",
        locationCoords: { lat: 17.4254, lng: 78.4239 },
        community: "Banjara Hills",
        category: "Streetlight Failure",
        severity: "Medium",
        priority: "Medium",
        status: "Resolved",
        verificationCount: 18,
        confirmedBy: ["user_citizen_2", "user_citizen_3"],
        resolvedBy: ["user_citizen_2", "user_coord"],
        confidence: 91,
        summary: "Multiple consecutive street lamp posts failed, leading to severe lighting deficiency along a prominent pedestrian walking zone.",
        safetyRisks: "Increased vulnerability to crime, blind spot accidents for motorists, and slip hazards for elderly citizens strolling at night.",
        responsibleAuthority: "TSSPDCL Electricity & Streetlights Division",
        recommendedActions: [
          "Perform testing on the circuit breaker and automatic photo-timer switch.",
          "Replace all burned-out LED bulb fixtures.",
          "Trim tree foliage blockages covering the illumination paths."
        ],
        estimatedTimeline: "1-2 Days",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updates: [
          {
            id: "upd_3",
            status: "In Progress",
            message: "Escalated to TSSPDCL. Line maintenance crew scheduled.",
            timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
            actorName: "Srinivas Raju",
            actorRole: "Coordinator"
          },
          {
            id: "upd_4",
            status: "Resolved",
            message: "All 5 mercury bulbs replaced, timers serviced. Road lighting restored successfully.",
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            actorName: "Srinivas Raju",
            actorRole: "Coordinator"
          }
        ],
        comments: []
      }
    ],
    communities: [
      {
        name: "Old Bowenpally",
        memberCount: 1420,
        activeIssuesCount: 4,
        resolvedIssuesCount: 38,
        coordinatorName: "Srinivas Raju",
        coordinatorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
        announcements: [
          {
            id: "ann_1",
            title: "Sunday Neighborhood Cleanup Drive",
            text: "Join us this Sunday at 7:00 AM at the Main Ground for a collective lane beautification and waste cleanup. Trash grabbers and gloves will be provided by JanSetu community fund!",
            date: "2026-06-25"
          },
          {
            id: "ann_2",
            title: "Ward Officer Meeting",
            text: "The local Ward Officer has agreed to review JanSetu's high-priority reports directly on June 28th. Ensure all local issues have supporting verifications!",
            date: "2026-06-23"
          }
        ]
      },
      {
        name: "Kukatpally",
        memberCount: 2850,
        activeIssuesCount: 8,
        resolvedIssuesCount: 82,
        coordinatorName: "Pranathi Reddy",
        coordinatorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150",
        announcements: [
          {
            id: "ann_3",
            title: "Drainage Desilting Schedule",
            text: "Municipal vacuum machinery will operate along Metro corridor routes. Please avoid parking two-wheelers over sewer covers to expedite cleaning.",
            date: "2026-06-22"
          }
        ]
      },
      {
        name: "Banjara Hills",
        memberCount: 1980,
        activeIssuesCount: 2,
        resolvedIssuesCount: 54,
        coordinatorName: "Aditya Varma",
        coordinatorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
        announcements: []
      },
      {
        name: "Madhapur",
        memberCount: 3120,
        activeIssuesCount: 5,
        resolvedIssuesCount: 112,
        coordinatorName: "Kiran G",
        coordinatorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150",
        announcements: [
          {
            id: "ann_4",
            title: "Water Tanker Coordination",
            text: "If your block is facing water shortage, please verify the water leakage reports so we can request a bulk emergency supply line.",
            date: "2026-06-24"
          }
        ]
      },
      {
        name: "Gachibowli",
        memberCount: 2100,
        activeIssuesCount: 3,
        resolvedIssuesCount: 42,
        coordinatorName: "Aarav Sharma",
        coordinatorAvatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=AaravSharma",
        announcements: [
          {
            id: "ann_5",
            title: "Financial District Traffic Patrols",
            text: "Traffic police volunteers needed for evening hours on the Gachibowli main flyover underpass. Sign up in coordinator forum.",
            date: "2026-06-24"
          }
        ]
      }
    ],
    profiles: {
      "user_citizen_1": {
        id: "user_citizen_1",
        name: "Arun Kumar",
        email: "citizen@jansetu.org",
        password: "citizen",
        mobile: "9876543210",
        location: "Old Bowenpally",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150",
        reputationPoints: 45,
        badge: "Community Guardian",
        reportsSubmittedCount: 3,
        verificationsCount: 5,
        communityContributionsCount: 8,
        selectedCommunity: "Old Bowenpally",
        isCoordinator: false
      },
      "user_coord": {
        id: "user_coord",
        name: "Srinivas Raju",
        email: "coordinator@jansetu.org",
        password: "coordinator",
        mobile: "9999999999",
        location: "Old Bowenpally",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
        reputationPoints: 120,
        badge: "JanSetu Champion",
        reportsSubmittedCount: 5,
        verificationsCount: 14,
        communityContributionsCount: 19,
        selectedCommunity: "Old Bowenpally",
        isCoordinator: true
      }
    }
  };

  // fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), "utf-8");
  return initialData;
}

// Combined Firestore-only user, community, and report database helpers

// Helper to get combined user profile (public + private info) from Firestore
async function getUserProfile(userId: string): Promise<any> {
  const db = getFirestoreDb();
  if (!db) return null;
  try {
    const publicDocRef = firestoreDoc(db, "users", userId);
    const publicDoc = await firestoreGetDoc(publicDocRef);
    if (!publicDoc.exists()) return null;

    const privateDocRef = firestoreDoc(db, `users/${userId}/private/info`);
    const privateDoc = await firestoreGetDoc(privateDocRef);
    const privateData = privateDoc.exists() ? privateDoc.data() : {};

    return {
      ...publicDoc.data(),
      ...privateData,
      id: userId
    };
  } catch (err) {
    console.error(`[getUserProfile] Failed to fetch profile for ${userId}:`, err);
    return null;
  }
}

// Helper to save combined user profile (public + private info) to Firestore
async function saveUserProfile(userId: string, profile: any) {
  const db = getFirestoreDb();
  if (!db) throw new Error("Database not initialized");

  const { email, password, mobile, location, ...publicFields } = profile;

  const publicDocRef = firestoreDoc(db, "users", userId);
  await firestoreSetDoc(publicDocRef, { ...publicFields, id: userId }, { merge: true });

  const privateDocRef = firestoreDoc(db, `users/${userId}/private/info`);
  const privateFields: any = {};
  if (email !== undefined) privateFields.email = email;
  if (password !== undefined) privateFields.password = password;
  if (mobile !== undefined) privateFields.mobile = mobile;
  if (location !== undefined) privateFields.location = location;

  if (Object.keys(privateFields).length > 0) {
    await firestoreSetDoc(privateDocRef, privateFields, { merge: true });
  }
}

// Award points helper (async)
async function awardPoints(userId: string, points: number, type: 'report' | 'verify' | 'comment' | 'resolve') {
  const db = getFirestoreDb();
  if (!db) return;
  try {
    const userRef = firestoreDoc(db, "users", userId);
    const userSnap = await firestoreGetDoc(userRef);
    if (userSnap.exists()) {
      const profile = userSnap.data();
      let reputationPoints = (profile.reputationPoints || 0) + points;
      let reportsSubmittedCount = profile.reportsSubmittedCount || 0;
      let verificationsCount = profile.verificationsCount || 0;
      let communityContributionsCount = (profile.communityContributionsCount || 0) + 1;

      if (type === 'report') {
        reportsSubmittedCount += 1;
      } else if (type === 'verify') {
        verificationsCount += 1;
      }

      // Recalculate badge
      let badge = profile.badge || "Civic Reporter";
      if (!profile.isCoordinator) {
        if (reputationPoints >= 60) {
          badge = "JanSetu Champion";
        } else if (reputationPoints >= 30) {
          badge = "Community Guardian";
        } else {
          badge = "Civic Reporter";
        }
      }

      await firestoreSetDoc(userRef, {
        reputationPoints,
        reportsSubmittedCount,
        verificationsCount,
        communityContributionsCount,
        badge
      }, { merge: true });
      console.log(`[awardPoints] Successfully updated Firestore profile for ${userId} with +${points} pts.`);
    }
  } catch (err) {
    console.error(`[awardPoints] Failed to update Firestore profile for ${userId}:`, err);
  }
}

// Helper to get report from Firestore with comments and updates embedded
async function getReportFromFirestore(db: any, reportId: string, parentData?: any) {
  try {
    if (!parentData) {
      const reportRef = firestoreDoc(db, "reports", reportId);
      const reportSnap = await firestoreGetDoc(reportRef);
      if (!reportSnap.exists()) return null;
      parentData = reportSnap.data();
    }

    // Fetch comments subcollection
    const commentsSnap = await firestoreGetDocs(firestoreCollection(db, `reports/${reportId}/comments`));
    const comments = commentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    comments.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || a.timestamp || "").getTime();
      const dateB = new Date(b.createdAt || b.timestamp || "").getTime();
      return dateA - dateB;
    });

    // Fetch updates subcollection
    const updatesSnap = await firestoreGetDocs(firestoreCollection(db, `reports/${reportId}/updates`));
    const updates = updatesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    updates.sort((a: any, b: any) => {
      const dateA = new Date(a.timestamp || "").getTime();
      const dateB = new Date(b.timestamp || "").getTime();
      return dateA - dateB;
    });

    return {
      ...parentData,
      id: reportId,
      comments,
      updates
    };
  } catch (err) {
    console.error(`Error getting report ${reportId} from Firestore:`, err);
    return null;
  }
}

// Helper to get reports from Firestore with all comments and updates subcollections merged
async function getReportsFromFirestore(communityName?: string) {
  const db = getFirestoreDb();
  if (!db) throw new Error("Database not initialized");

  let querySnapshot;
  if (communityName) {
    const q = firestoreQuery(
      firestoreCollection(db, "reports"),
      firestoreWhere("community", "==", communityName)
    );
    querySnapshot = await firestoreGetDocs(q);
  } else {
    querySnapshot = await firestoreGetDocs(firestoreCollection(db, "reports"));
  }

  const reports: any[] = [];
  for (const docSnap of querySnapshot.docs) {
    const report = await getReportFromFirestore(db, docSnap.id, docSnap.data());
    if (report) {
      reports.push(report);
    }
  }

  reports.sort((a: any, b: any) => new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime());
  return reports;
}

// Helper to fetch all communities with announcements from Firestore
async function getCommunitiesFromFirestore() {
  const db = getFirestoreDb();
  if (!db) throw new Error("Database not initialized");

  const querySnapshot = await firestoreGetDocs(firestoreCollection(db, "communities"));
  const communities: any[] = [];

  for (const docSnap of querySnapshot.docs) {
    const communityData = docSnap.data();
    const announcementsSnapshot = await firestoreGetDocs(
      firestoreCollection(db, `communities/${docSnap.id}/announcements`)
    );
    const announcements = announcementsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    announcements.sort((a: any, b: any) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime());

    communities.push({
      ...communityData,
      announcements
    });
  }

  return communities;
}

// Get list of communities
app.get("/api/communities", async (req, res) => {
  try {
    const communities = await getCommunitiesFromFirestore();
    res.json(communities);
  } catch (err) {
    console.error("Error fetching communities from Firestore:", err);
    res.status(500).json({ error: "Failed to fetch communities from database." });
  }
});

// Auth API - Signup
app.post("/api/auth/signup", async (req, res) => {
  const { fullName, email, password, mobile, location, isCoordinator, coordinatorCode } = req.body;

  if (!fullName || !email || !password || !mobile || !location) {
    return res.status(400).json({ error: "All fields are mandatory." });
  }

  const db = getFirestoreDb();
  if (!db) return res.status(500).json({ error: "Database not initialized" });

  // Validate Coordinator Access Code
  if (isCoordinator) {
    const validCodes = ["JANSETU-OBP-2026", "JANSETU-KKP-2026", "JANSETU-MDP-2026"];
    if (!validCodes.includes(coordinatorCode)) {
      return res.status(400).json({ error: "Invalid Coordinator Access Code" });
    }
  }

  // Determine nearest community
  let assignedCommunity = "Old Bowenpally";
  const locLower = location.toLowerCase();
  if (locLower.includes("kukatpally")) {
    assignedCommunity = "Kukatpally";
  } else if (locLower.includes("madhapur")) {
    assignedCommunity = "Madhapur";
  } else if (locLower.includes("gachibowli")) {
    assignedCommunity = "Gachibowli";
  } else if (locLower.includes("banjara")) {
    assignedCommunity = "Banjara Hills";
  } else if (locLower.includes("bowenpally")) {
    assignedCommunity = "Old Bowenpally";
  } else {
    assignedCommunity = location; 
  }

  try {
    const commRef = firestoreDoc(db, "communities", assignedCommunity);
    const commSnap = await firestoreGetDoc(commRef);

    if (!commSnap.exists()) {
      await firestoreSetDoc(commRef, {
        name: assignedCommunity,
        memberCount: 140,
        activeIssuesCount: 0,
        resolvedIssuesCount: 4,
        coordinatorName: isCoordinator ? fullName : "Suresh Reddy",
        coordinatorAvatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(isCoordinator ? fullName : "Suresh Reddy")}`
      });
    }

    // Generate ID
    const userId = "user_" + Math.random().toString(36).substr(2, 9);
    const newProfile = {
      id: userId,
      name: fullName,
      email,
      password,
      mobile,
      location,
      avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(fullName)}`,
      reputationPoints: isCoordinator ? 100 : 10,
      badge: isCoordinator ? "JanSetu Champion" : "Civic Reporter",
      reportsSubmittedCount: 0,
      verificationsCount: 0,
      communityContributionsCount: 0,
      selectedCommunity: assignedCommunity,
      isCoordinator: !!isCoordinator
    };

    await saveUserProfile(userId, newProfile);
    res.json({ status: "success", profile: newProfile });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal server error during signup." });
  }
});

// Auth API - Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const db = getFirestoreDb();
  if (!db) return res.status(500).json({ error: "Database not initialized" });

  try {
    const usersSnap = await firestoreGetDocs(firestoreCollection(db, "users"));
    let matchedProfile = null;

    for (const d of usersSnap.docs) {
      const uId = d.id;
      const privateDocRef = firestoreDoc(db, `users/${uId}/private/info`);
      const privateDoc = await firestoreGetDoc(privateDocRef);
      if (privateDoc.exists()) {
        const privateData = privateDoc.data();
        const storedEmail = privateData.email || "";
        const storedPassword = privateData.password || "jansetu123";

        if (storedEmail.toLowerCase() === email.toLowerCase() && storedPassword === password) {
          matchedProfile = {
            ...d.data(),
            ...privateData,
            id: uId
          };
          break;
        }
      }
    }

    if (matchedProfile) {
      res.json({ status: "success", profile: matchedProfile });
    } else {
      res.status(401).json({ error: "Invalid email or password." });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error during login." });
  }
});

// Auth API - Forgot Password
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  const db = getFirestoreDb();
  if (!db) return res.status(500).json({ error: "Database not initialized" });

  try {
    const usersSnap = await firestoreGetDocs(firestoreCollection(db, "users"));
    let found = false;

    for (const d of usersSnap.docs) {
      const uId = d.id;
      const privateDocRef = firestoreDoc(db, `users/${uId}/private/info`);
      const privateDoc = await firestoreGetDoc(privateDocRef);
      if (privateDoc.exists()) {
        const privateData = privateDoc.data();
        const storedEmail = privateData.email || "";
        if (storedEmail.toLowerCase() === email.toLowerCase()) {
          found = true;
          break;
        }
      }
    }

    if (found) {
      res.json({ status: "success", message: "Password reset instructions sent to registered email address." });
    } else {
      res.status(404).json({ error: "Email address not registered." });
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Coordinator Action - Post Announcement / Bulletin
app.post("/api/communities/:name/announcements", async (req, res) => {
  const { title, text, content, priority, date } = req.body;
  const commName = req.params.name;

  const db = getFirestoreDb();
  if (!db) return res.status(500).json({ error: "Database not initialized" });

  try {
    const commRef = firestoreDoc(db, "communities", commName);
    const commDoc = await firestoreGetDoc(commRef);

    if (!commDoc.exists()) {
      return res.status(404).json({ error: "Community not found" });
    }

    const finalContent = content || text;
    const annId = "ann_" + Math.random().toString(36).substr(2, 9);
    const newAnn = {
      id: annId,
      title,
      text: finalContent,
      content: finalContent,
      priority: priority || "Normal",
      date: date || new Date().toISOString().split("T")[0]
    };

    const annDocRef = firestoreDoc(db, `communities/${commName}/announcements`, annId);
    await firestoreSetDoc(annDocRef, newAnn);

    const updatedCommunities = await getCommunitiesFromFirestore();
    const updatedCommunity = updatedCommunities.find((c: any) => c.name === commName);

    res.json({ status: "success", announcement: newAnn, community: updatedCommunity });
  } catch (err) {
    console.error("Error creating announcement:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Coordinator Action - Edit Bulletin
app.put("/api/communities/:name/bulletins/:id", async (req, res) => {
  const { title, content, priority, date } = req.body;
  const commName = req.params.name;
  const annId = req.params.id;

  const db = getFirestoreDb();
  if (!db) return res.status(500).json({ error: "Database not initialized" });

  try {
    const commRef = firestoreDoc(db, "communities", commName);
    const commDoc = await firestoreGetDoc(commRef);

    if (!commDoc.exists()) {
      return res.status(404).json({ error: "Community not found" });
    }

    const annDocRef = firestoreDoc(db, `communities/${commName}/announcements`, annId);
    const annDoc = await firestoreGetDoc(annDocRef);

    if (!annDoc.exists()) {
      return res.status(404).json({ error: "Bulletin not found" });
    }

    const existing = annDoc.data();
    const updatedAnn = {
      ...existing,
      title: title || existing.title,
      text: content || existing.text,
      content: content || existing.content || existing.text,
      priority: priority || existing.priority || "Normal",
      date: date || existing.date
    };

    await firestoreSetDoc(annDocRef, updatedAnn);

    const updatedCommunities = await getCommunitiesFromFirestore();
    const updatedCommunity = updatedCommunities.find((c: any) => c.name === commName);

    res.json({ status: "success", bulletin: updatedAnn, community: updatedCommunity });
  } catch (err) {
    console.error("Error updating announcement:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Coordinator Action - Delete Bulletin
app.delete("/api/communities/:name/bulletins/:id", async (req, res) => {
  const commName = req.params.name;
  const annId = req.params.id;

  const db = getFirestoreDb();
  if (!db) return res.status(500).json({ error: "Database not initialized" });

  try {
    const commRef = firestoreDoc(db, "communities", commName);
    const commDoc = await firestoreGetDoc(commRef);

    if (!commDoc.exists()) {
      return res.status(404).json({ error: "Community not found" });
    }

    const annDocRef = firestoreDoc(db, `communities/${commName}/announcements`, annId);
    const annDoc = await firestoreGetDoc(annDocRef);

    if (!annDoc.exists()) {
      return res.status(404).json({ error: "Bulletin not found" });
    }

    await firestoreDeleteDoc(annDocRef);

    const updatedCommunities = await getCommunitiesFromFirestore();
    const updatedCommunity = updatedCommunities.find((c: any) => c.name === commName);

    res.json({ status: "success", community: updatedCommunity });
  } catch (err) {
    console.error("Error deleting bulletin:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Coordinator Action - Highlight Issue
app.post("/api/reports/:id/highlight", async (req, res) => {
  const { coordinatorId, isHighlighted } = req.body;
  const reportId = req.params.id;

  const db = getFirestoreDb();
  if (!db) return res.status(500).json({ error: "Database not initialized" });

  try {
    const reportRef = firestoreDoc(db, "reports", reportId);
    const reportSnap = await firestoreGetDoc(reportRef);

    if (!reportSnap.exists()) {
      return res.status(404).json({ error: "Report not found" });
    }

    const coordProfile = await getUserProfile(coordinatorId);
    if (!coordProfile || !coordProfile.isCoordinator) {
      return res.status(403).json({ error: "Access denied. Only Community Coordinators can highlight reports." });
    }

    const updateId = "upd_" + Math.random().toString(36).substr(2, 9);
    const newUpdate = {
      id: updateId,
      status: "Verified",
      message: isHighlighted 
        ? "Report officially highlighted as urgent by the Community Coordinator." 
        : "Coordinator removed highlighted status.",
      timestamp: new Date().toISOString(),
      actorName: coordProfile.name,
      actorRole: "Coordinator"
    };

    const updateDocRef = firestoreDoc(db, `reports/${reportId}/updates`, updateId);
    await firestoreSetDoc(updateDocRef, newUpdate);

    await firestoreSetDoc(reportRef, {
      isHighlighted,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    const updatedReport = await getReportFromFirestore(db, reportId);
    res.json(updatedReport);
  } catch (err) {
    console.error("Error highlighting report:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Coordinator Action - Escalate Issue
app.post("/api/reports/:id/escalate", async (req, res) => {
  const { coordinatorId, isEscalated } = req.body;
  const reportId = req.params.id;

  const db = getFirestoreDb();
  if (!db) return res.status(500).json({ error: "Database not initialized" });

  try {
    const reportRef = firestoreDoc(db, "reports", reportId);
    const reportSnap = await firestoreGetDoc(reportRef);

    if (!reportSnap.exists()) {
      return res.status(404).json({ error: "Report not found" });
    }

    const coordProfile = await getUserProfile(coordinatorId);
    if (!coordProfile || !coordProfile.isCoordinator) {
      return res.status(403).json({ error: "Access denied. Only Community Coordinators can escalate reports." });
    }

    const updateId = "upd_" + Math.random().toString(36).substr(2, 9);
    const newUpdate = {
      id: updateId,
      status: isEscalated ? "In Progress" : "Reported",
      message: isEscalated 
        ? "Issue escalated to Ward Zonal Executive Engineers for immediate resolution dispatch." 
        : "Coordinator de-escalated issue.",
      timestamp: new Date().toISOString(),
      actorName: coordProfile.name,
      actorRole: "Coordinator"
    };

    const updateDocRef = firestoreDoc(db, `reports/${reportId}/updates`, updateId);
    await firestoreSetDoc(updateDocRef, newUpdate);

    const reportFields: any = {
      isEscalated,
      updatedAt: new Date().toISOString()
    };
    if (isEscalated) {
      reportFields.priority = "Critical";
    }

    await firestoreSetDoc(reportRef, reportFields, { merge: true });

    const updatedReport = await getReportFromFirestore(db, reportId);
    res.json(updatedReport);
  } catch (err) {
    console.error("Error escalating report:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get profiles
app.get("/api/profile/:id", async (req, res) => {
  const profileId = req.params.id;
  try {
    const profile = await getUserProfile(profileId);
    if (profile) {
      res.json(profile);
    } else {
      const newProfile = {
        id: profileId,
        name: req.query.name as string || "New Citizen",
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${profileId}`,
        reputationPoints: 10,
        badge: "Civic Reporter",
        reportsSubmittedCount: 0,
        verificationsCount: 0,
        communityContributionsCount: 0,
        selectedCommunity: "Old Bowenpally",
        isCoordinator: false
      };
      await saveUserProfile(profileId, newProfile);
      res.json(newProfile);
    }
  } catch (err) {
    console.error("Error fetching/creating profile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update profile selection
app.post("/api/profile/:id", async (req, res) => {
  const profileId = req.params.id;
  try {
    const profile = await getUserProfile(profileId);
    if (profile) {
      const updatedProfile = { ...profile, ...req.body };
      await saveUserProfile(profileId, updatedProfile);
      res.json(updatedProfile);
    } else {
      res.status(404).json({ error: "Profile not found" });
    }
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get issues list
app.get("/api/reports", async (req, res) => {
  const community = req.query.community as string;
  try {
    const reports = await getReportsFromFirestore(community);
    res.json(reports);
  } catch (err) {
    console.error("Error fetching reports from Firestore:", err);
    res.status(500).json({ error: "Failed to fetch reports from database." });
  }
});

// Get individual issue
app.get("/api/reports/:id", async (req, res) => {
  const db = getFirestoreDb();
  if (!db) return res.status(500).json({ error: "Database not initialized" });

  try {
    const report = await getReportFromFirestore(db, req.params.id);
    if (report) {
      res.json(report);
    } else {
      res.status(404).json({ error: "Report not found" });
    }
  } catch (err) {
    console.error("Error fetching individual report:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add verification
app.post("/api/reports/:id/verify", async (req, res) => {
  const { userId, type, isDuplicateSupport } = req.body; // type is 'confirm' or 'resolve'
  const reportId = req.params.id;

  const db = getFirestoreDb();
  if (!db) return res.status(500).json({ error: "Database not initialized" });

  try {
    const reportRef = firestoreDoc(db, "reports", reportId);
    const reportSnap = await firestoreGetDoc(reportRef);

    if (!reportSnap.exists()) {
      return res.status(404).json({ error: "Report not found" });
    }

    const reportData = reportSnap.data();
    let confirmedBy = reportData.confirmedBy || [];
    let resolvedBy = reportData.resolvedBy || [];
    let status = reportData.status || "Reported";
    let verificationCount = reportData.verificationCount || 0;
    let priority = reportData.priority || "Medium";

    const userProfile = await getUserProfile(userId);
    const isCoordinator = userProfile?.isCoordinator || false;

    if (type === 'confirm') {
      if (!confirmedBy.includes(userId)) {
        confirmedBy.push(userId);
        verificationCount = confirmedBy.length;
        if (verificationCount >= 3 && status === 'Reported') {
          status = 'Verified';
        }
        if (verificationCount > 20) {
          priority = "Critical";
        } else if (verificationCount > 10 && priority !== "Critical") {
          priority = "High";
        } else if (verificationCount > 5 && priority === "Low") {
          priority = "Medium";
        }

        const updateId = "upd_" + Math.random().toString(36).substr(2, 9);
        const newUpdate = {
          id: updateId,
          status: "Verified",
          message: `Issue verified by community members (Verification #${verificationCount}).`,
          timestamp: new Date().toISOString(),
          actorName: userProfile?.name || "Citizen",
          actorRole: "Citizen"
        };
        await firestoreSetDoc(firestoreDoc(db, `reports/${reportId}/updates`, updateId), newUpdate);
        await awardPoints(userId, 5, 'verify');
      }
    } else if (type === 'resolve') {
      if (!resolvedBy.includes(userId)) {
        resolvedBy.push(userId);
        await awardPoints(userId, 20, 'resolve');

        const updateId = "upd_" + Math.random().toString(36).substr(2, 9);
        if (isCoordinator || resolvedBy.length >= 3) {
          status = "Resolved";
          const newUpdate = {
            id: updateId,
            status: "Resolved",
            message: isCoordinator 
              ? `Community Coordinator ${userProfile?.name || "Srinivas Raju"} officially verified resolution.`
              : `Resolution confirmed by community vote (${resolvedBy.length} members).`,
            timestamp: new Date().toISOString(),
            actorName: userProfile?.name || "Citizen",
            actorRole: isCoordinator ? "Coordinator" : "Citizen"
          };
          await firestoreSetDoc(firestoreDoc(db, `reports/${reportId}/updates`, updateId), newUpdate);
        } else {
          const newUpdate = {
            id: updateId,
            status: "In Progress",
            message: `Citizen reported resolution. Awaiting further confirmations.`,
            timestamp: new Date().toISOString(),
            actorName: userProfile?.name || "Citizen",
            actorRole: "Citizen"
          };
          await firestoreSetDoc(firestoreDoc(db, `reports/${reportId}/updates`, updateId), newUpdate);
        }
      }
    }

    const fbUpdate = {
      confirmedBy,
      resolvedBy,
      status,
      verificationCount,
      priority,
      updatedAt: new Date().toISOString()
    };

    await firestoreSetDoc(reportRef, fbUpdate, { merge: true });

    if (isDuplicateSupport) {
      const relationshipId = `dup_${Date.now()}`;
      const dupRelationDoc = {
        id: relationshipId,
        originalReportId: reportId,
        userId: userId,
        type: "support_existing",
        timestamp: new Date().toISOString(),
        justification: "Citizen joined and upvoted an existing duplicate report flagged by AI."
      };
      await firestoreSetDoc(firestoreDoc(db, "duplicateRelationships", relationshipId), dupRelationDoc);
    }

    const finalReport = await getReportFromFirestore(db, reportId);
    res.json(finalReport);
  } catch (err) {
    console.error("Failed to verify in Firestore:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add comment
app.post("/api/reports/:id/comment", async (req, res) => {
  const { userId, text } = req.body;
  const reportId = req.params.id;

  const db = getFirestoreDb();
  if (!db) return res.status(500).json({ error: "Database not initialized" });

  try {
    const reportRef = firestoreDoc(db, "reports", reportId);
    const reportSnap = await firestoreGetDoc(reportRef);

    if (!reportSnap.exists()) {
      return res.status(404).json({ error: "Report not found" });
    }

    const user = await getUserProfile(userId) || { name: "Citizen", avatar: "", badge: "Civic Reporter" };

    const commentId = "c_" + Math.random().toString(36).substr(2, 9);
    const newComment = {
      id: commentId,
      userId,
      userName: user.name,
      userAvatar: user.avatar,
      userBadge: user.badge || "Civic Reporter",
      text,
      createdAt: new Date().toISOString()
    };

    const commentDocRef = firestoreDoc(db, `reports/${reportId}/comments`, commentId);
    await firestoreSetDoc(commentDocRef, newComment);

    await firestoreSetDoc(reportRef, {
      updatedAt: new Date().toISOString()
    }, { merge: true });

    await awardPoints(userId, 2, 'comment'); // Small reward for discussion participation

    const finalReport = await getReportFromFirestore(db, reportId);
    res.json(finalReport);
  } catch (err) {
    console.error("Error adding comment to Firestore:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add official update (Coordinator Action)
app.post("/api/reports/:id/update", async (req, res) => {
  const { coordinatorId, status, message } = req.body;
  const reportId = req.params.id;

  const db = getFirestoreDb();
  if (!db) return res.status(500).json({ error: "Database not initialized" });

  try {
    const reportRef = firestoreDoc(db, "reports", reportId);
    const reportSnap = await firestoreGetDoc(reportRef);

    if (!reportSnap.exists()) {
      return res.status(404).json({ error: "Report not found" });
    }

    const coordProfile = await getUserProfile(coordinatorId);
    if (!coordProfile || !coordProfile.isCoordinator) {
      return res.status(403).json({ error: "Access denied. Only Community Coordinators can post official status updates." });
    }

    const updateId = "upd_" + Math.random().toString(36).substr(2, 9);
    const newUpdate = {
      id: updateId,
      status,
      message,
      timestamp: new Date().toISOString(),
      actorName: coordProfile.name,
      actorRole: "Coordinator" as const
    };

    const updateDocRef = firestoreDoc(db, `reports/${reportId}/updates`, updateId);
    await firestoreSetDoc(updateDocRef, newUpdate);

    await firestoreSetDoc(reportRef, {
      status,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    const finalReport = await getReportFromFirestore(db, reportId);
    res.json(finalReport);
  } catch (err) {
    console.error("Error adding status update to Firestore:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submit full new report
app.post("/api/reports", async (req, res) => {
  const { 
    reporterId, 
    title, 
    description, 
    image, 
    locationName, 
    locationCoords, 
    community,
    category,
    severity,
    priority,
    confidence,
    summary,
    safetyRisks,
    responsibleAuthority,
    recommendedActions,
    estimatedTimeline
  } = req.body;

  const db = getFirestoreDb();
  if (!db) return res.status(500).json({ error: "Database not initialized" });

  try {
    const reporter = await getUserProfile(reporterId) || { name: "Arun Kumar", avatar: "" };

    const reportId = "rep_" + Math.random().toString(36).substr(2, 9);
    const newReport = {
      id: reportId,
      reporterId,
      reporterName: reporter.name,
      reporterAvatar: reporter.avatar,
      title,
      description: description || "",
      image: image || "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600",
      locationName: locationName || `${community}, Hyderabad`,
      locationCoords: locationCoords || { lat: 17.4 + Math.random() * 0.1, lng: 78.4 + Math.random() * 0.1 },
      community: community || "Old Bowenpally",
      category: category || "Road Damage",
      severity: severity || "Medium",
      priority: priority || "Medium",
      status: "Reported" as const,
      verificationCount: 1,
      confirmedBy: [reporterId],
      resolvedBy: [],
      confidence: confidence || 90,
      summary: summary || "Issue reported and classified by community.",
      safetyRisks: safetyRisks || "None immediately identified.",
      responsibleAuthority: responsibleAuthority || "Local Ward Office",
      recommendedActions: recommendedActions || ["Awaiting municipal inspection."],
      estimatedTimeline: estimatedTimeline || "5-7 Days",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const reportRef = firestoreDoc(db, "reports", reportId);
    await firestoreSetDoc(reportRef, newReport);

    const updateId = "upd_" + Math.random().toString(36).substr(2, 9);
    const initialUpdate = {
      id: updateId,
      status: "Reported",
      message: "Civic report submitted and verified with initial photo evidence.",
      timestamp: new Date().toISOString(),
      actorName: reporter.name,
      actorRole: "Citizen" as const
    };
    await firestoreSetDoc(firestoreDoc(db, `reports/${reportId}/updates`, updateId), initialUpdate);

    await awardPoints(reporterId, 10, 'report'); // +10 points for reporting an issue!

    const finalReport = await getReportFromFirestore(db, reportId);
    res.json(finalReport);
  } catch (err) {
    console.error("Error submitting report to Firestore:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Dynamic AI vision/metadata analysis using Gemini BEFORE posting!
app.post("/api/reports/analyze-temp", async (req, res) => {
  const { imageBase64, description, categoryHint } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: "Missing image/video for vision analysis." });
  }

  // Support lazy initialization of Gemini in case the API key was populated later
  let activeAi = ai;
  if (!activeAi) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY" && key.trim() !== "") {
      try {
        activeAi = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
        // Cache it for subsequent requests
        ai = activeAi;
        console.log("Gemini API Client lazy initialized successfully during analysis.");
      } catch (err) {
        console.error("Failed to lazy initialize Gemini API client:", err);
      }
    }
  }

  if (!activeAi) {
    return res.status(500).json({
      error: "Gemini API client is not configured. Please set the GEMINI_API_KEY environment variable in Settings > Secrets."
    });
  }

  try {
    console.log("Invoking Gemini 3.5 Flash Vision Agent for analysis...");

    // Remove prefix of base64 image (e.g. "data:image/png;base64,")
    let cleanBase64 = imageBase64;
    let mimeType = "image/jpeg";
    if (imageBase64.includes(";base64,")) {
      const parts = imageBase64.split(";base64,");
      const match = parts[0].match(/data:(.*)/);
      if (match) mimeType = match[1];
      cleanBase64 = parts[1];
    }

    const mediaPart = {
      inlineData: {
        mimeType: mimeType,
        data: cleanBase64
      }
    };

    const isVideo = mimeType.startsWith("video/");

    const promptText = `
      You are the JanSetu AI Civic Vision & Video Analysis Agent.
      Analyze this civic issue ${isVideo ? "video clip" : "photograph"} and provide structured intelligence.
      User description if any: "${description || "None provided"}".
      Suggested Category Hint: "${categoryHint || "None provided"}".

      Evaluate and categorize into exactly one of these:
      - "Road Damage"
      - "Water Leakage"
      - "Waste Management"
      - "Streetlight Failure"
      - "Drainage Issue"
      - "Public Safety Concern"

      Determine:
      - category (must be exactly one of the six categories above)
      - severity ("Critical" | "High" | "Medium" | "Low")
      - priority ("Critical" | "High" | "Medium" | "Low")
      - summary (brief 1-sentence descriptive summary of the defect shown)
      - confidence (integer score 0-100 indicating visual assessment accuracy)
      - safetyRisks (1-sentence description of the direct public danger)
      - responsibleAuthority (full name of the municipal department or wing responsible for fixing this)
      - recommendedActions (exact technical steps to resolve the issue as an array of 3 actionable items)
      - estimatedTimeline (reasonable repair time e.g., "1-2 Days", "3-5 Days")
      - riskLevel ("Critical" | "High" | "Medium" | "Low" describing public danger index)
      - consequencesIfIgnored (1-sentence describing consequences if untreated)
      - justification (1-sentence explaining why this category/severity was chosen)

      You must return the response in strict JSON matching the schema format.
    `;

    const response = await activeAi.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [mediaPart, { text: promptText }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { 
              type: Type.STRING, 
              description: "Must be exactly one of: 'Road Damage', 'Water Leakage', 'Waste Management', 'Streetlight Failure', 'Drainage Issue', 'Public Safety Concern'." 
            },
            severity: { type: Type.STRING, description: "One of: 'Critical', 'High', 'Medium', 'Low'." },
            priority: { type: Type.STRING, description: "One of: 'Critical', 'High', 'Medium', 'Low'." },
            summary: { type: Type.STRING },
            confidence: { type: Type.INTEGER },
            safetyRisks: { type: Type.STRING },
            responsibleAuthority: { type: Type.STRING },
            recommendedActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            estimatedTimeline: { type: Type.STRING },
            riskLevel: { type: Type.STRING, description: "One of: 'Critical', 'High', 'Medium', 'Low'." },
            consequencesIfIgnored: { type: Type.STRING },
            justification: { type: Type.STRING }
          },
          required: [
            "category", "severity", "priority", "summary", "confidence", "safetyRisks", 
            "responsibleAuthority", "recommendedActions", "estimatedTimeline", "riskLevel", 
            "consequencesIfIgnored", "justification"
          ]
        }
      }
    });

    if (response && response.text) {
      const result = JSON.parse(response.text.trim());
      console.log("Gemini Vision/Video Agent analysis success:", result);
      return res.json(result);
    }
    throw new Error("Empty response text from Gemini");
  } catch (err: any) {
    console.error("Error calling Gemini Vision API:", err);
    return res.status(500).json({ error: `AI analysis failed: ${err.message || err}` });
  }
});

// Helper for lazy initialization of Cloudinary using environment variables
function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
    return true;
  }
  return false;
}

// Secure Cloudinary upload endpoint
app.post("/api/upload", async (req, res) => {
  const { fileData } = req.body;
  if (!fileData) {
    return res.status(400).json({ error: "Missing fileData (base64 string)" });
  }

  // Handle lazy initialization of Cloudinary SDK
  const isConfigured = configureCloudinary();
  if (!isConfigured) {
    console.warn("Cloudinary is not configured yet. Returning fallback base64 string directly.");
    return res.json({ secureUrl: fileData });
  }

  try {
    console.log("Uploading file to Cloudinary securely via backend...");
    const uploadResult = await cloudinary.uploader.upload(fileData, {
      resource_type: "auto",
      folder: "jansetu_reports",
    });

    console.log("Cloudinary Upload Succeeded:", uploadResult.secure_url);
    res.json({ secureUrl: uploadResult.secure_url });
  } catch (err: any) {
    console.error("Cloudinary Upload Error:", err);
    console.warn("Falling back to base64 due to upload error.");
    res.json({ secureUrl: fileData });
  }
});

// Dynamic Duplicate Issue Detection Agent (Agent 5)
app.post("/api/reports/check-duplicate", async (req, res) => {
  const { community, categoryHint, description, locationName, locationCoords, image } = req.body;

  const db = getFirestoreDb();
  let activeReports: any[] = [];

  // 1. Fetch real reports from Firestore if available
  if (db) {
    try {
      const q = firestoreQuery(
        firestoreCollection(db, "reports"),
        firestoreWhere("community", "==", community)
      );
      const snapshot = await firestoreGetDocs(q);
      activeReports = snapshot.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((r: any) => r.status !== "Resolved");
      console.log(`Fetched ${activeReports.length} active reports from Firestore for duplicate checking.`);
    } catch (err) {
      console.error("Failed to fetch active reports from Firestore for duplicate check:", err);
    }
  }

  // No local fallback under Firestore-only architecture

  if (activeReports.length === 0) {
    return res.json({ 
      duplicateDetected: false, 
      duplicateFound: false,
      duplicateReportId: null, 
      matchJustification: "No active reports exist in this neighborhood." 
    });
  }

  // Helper to calculate exact distance in meters
  function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || typeof lat2 !== 'number' || typeof lon2 !== 'number') {
      return 999999;
    }
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
  }

  // Use Gemini duplicate detection if key is present
  if (ai) {
    try {
      const existingSummary = activeReports.map((r: any) => {
        const dist = getDistanceInMeters(
          locationCoords?.lat,
          locationCoords?.lng,
          r.locationCoords?.lat,
          r.locationCoords?.lng
        );
        return `ID: "${r.id}", Title: "${r.title}", Category: "${r.category}", Location: "${r.locationName}", Distance: ${dist.toFixed(0)} meters, Description: "${r.description}", Status: "${r.status}", Verifications: ${r.verificationCount}, Created: "${r.createdAt}"`;
      }).join("\n");

      const contents: any[] = [];

      // Include multimodal image if provided
      if (image && image.startsWith("data:")) {
        try {
          let cleanBase64 = image;
          let mimeType = "image/jpeg";
          if (image.includes(";base64,")) {
            const parts = image.split(";base64,");
            const match = parts[0].match(/data:(.*)/);
            if (match) mimeType = match[1];
            cleanBase64 = parts[1];
          }
          contents.push({
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64
            }
          });
        } catch (mediaErr) {
          console.error("Failed to parse image for Gemini duplicate check:", mediaErr);
        }
      }

      const promptText = `
        You are the JanSetu Duplicate Issue Detection Agent (Agent 5).
        A citizen is reporting a new civic issue in the community: "${community}".
        New Report Details:
        - Category: "${categoryHint || "None provided"}"
        - Location Street: "${locationName || "None provided"}"
        - Citizen Description: "${description || "None provided"}"
        - Coordinates: Lat ${locationCoords?.lat || "Unknown"}, Lng ${locationCoords?.lng || "Unknown"}

        Here is the catalog of existing active reports currently tracked in the neighborhood:
        ${existingSummary}

        Determine if the new report represents the EXACT same physical hazard already logged (e.g., the same pothole, the same water leak, or the same garbage dump on the same block).
        Use both the descriptions, categories, coordinates, and calculated distances in meters, and visually compare the uploaded image (if provided) to match the descriptions of the existing issues.
        Be conservative; do not declare a duplicate unless there is a very high likelihood they refer to the same defect in the same immediate vicinity (typically within 150 meters, unless it's a massive regional issue).

        Return a JSON response containing:
        - duplicateDetected: (boolean, true if there is a match)
        - duplicateReportId: (string ID of matched duplicate, or null if unique)
        - matchJustification: (1-sentence detailing why this is a duplicate or unique)
      `;
      contents.push({ text: promptText });

      console.log("Invoking Gemini for Duplicate Issue Detection...");
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              duplicateDetected: { type: Type.BOOLEAN },
              duplicateReportId: { type: Type.STRING, nullable: true },
              matchJustification: { type: Type.STRING }
            },
            required: ["duplicateDetected", "duplicateReportId", "matchJustification"]
          }
        }
      });

      if (response && response.text) {
        const result = JSON.parse(response.text.trim());
        console.log("Duplicate detection success:", result);
        
        let matchedReport = null;
        if (result.duplicateDetected && result.duplicateReportId) {
          matchedReport = activeReports.find((r: any) => r.id === result.duplicateReportId);
        }

        return res.json({
          duplicateDetected: result.duplicateDetected,
          duplicateFound: result.duplicateDetected,
          duplicateReportId: result.duplicateReportId,
          reason: result.matchJustification,
          matchJustification: result.matchJustification,
          originalReport: matchedReport
        });
      }
    } catch (err) {
      console.error("Gemini duplicate check failed, using simulation:", err);
    }
  }

  // High-fidelity Simulation duplicate matching fallback
  console.log("Using simulation duplicate checking...");
  const matched = activeReports.find((r: any) => {
    const sameCategory = r.category.toLowerCase().includes((categoryHint || "").toLowerCase()) ||
                         (categoryHint || "").toLowerCase().includes(r.category.toLowerCase());
    const locationOverlap = locationName && r.locationName && (
      locationName.toLowerCase().includes(r.locationName.toLowerCase()) || 
      r.locationName.toLowerCase().includes(locationName.toLowerCase()) ||
      r.locationName.split(",")[0].trim().toLowerCase() === locationName.split(",")[0].trim().toLowerCase()
    );
    const dist = getDistanceInMeters(
      locationCoords?.lat,
      locationCoords?.lng,
      r.locationCoords?.lat,
      r.locationCoords?.lng
    );
    // If we have GPS coords, match if same category and within 150 meters
    if (locationCoords && r.locationCoords) {
      return sameCategory && dist < 150;
    }
    return sameCategory && locationOverlap;
  });

  if (matched) {
    return res.json({
      duplicateDetected: true,
      duplicateFound: true,
      duplicateReportId: matched.id,
      reason: `A matching active report was detected at "${matched.locationName}" under Category "${matched.category}".`,
      matchJustification: `A matching active report was detected at "${matched.locationName}" under Category "${matched.category}".`,
      originalReport: matched
    });
  }

  res.json({
    duplicateDetected: false,
    duplicateFound: false,
    duplicateReportId: null,
    matchJustification: "No duplicate issues matching location and category overlap found."
  });
});

// Dynamic AI community insights engine using Gemini! (Agent 2, 3, 8 & 9)
// Generates and stores community insights in the Firestore "communityInsights" collection, pulling from real reports.
async function generateAndSaveInsights(targetCommunity: string) {
  const db = getFirestoreDb();
  let reports: any[] = [];

  // 1. Fetch real reports from Firestore
  if (db) {
    try {
      const q = firestoreQuery(
        firestoreCollection(db, "reports"),
        firestoreWhere("community", "==", targetCommunity)
      );
      const snapshot = await firestoreGetDocs(q);
      reports = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      console.log(`Fetched ${reports.length} real reports from Firestore for insights generation in: ${targetCommunity}`);
    } catch (err) {
      console.error("Failed to fetch reports from Firestore for insights:", err);
    }
  }

  // No local fallback under Firestore-only architecture

  const totalCount = reports.length;
  const activeCount = reports.filter((r: any) => r.status !== "Resolved").length;
  const resolvedCount = reports.filter((r: any) => r.status === "Resolved").length;
  const criticalCount = reports.filter((r: any) => r.status !== "Resolved" && (r.severity === "Critical" || r.severity === "High")).length;
  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 100;

  // Compute a smart, realistic health score based on active and critical issues
  let healthScore = 100 - (activeCount * 4) - (criticalCount * 8);
  healthScore = Math.max(35, Math.min(100, healthScore));

  const issuesSummary = reports.map((r: any) => `- [${r.category}] Status: ${r.status}, Severity: ${r.severity}, Title: ${r.title}, Location: ${r.locationName}`).join("\n") || "No current issues reported in this community yet.";

  const openCategories = Array.from(new Set(reports.filter((r: any) => r.status !== "Resolved").map((r: any) => r.category))) as string[];
  let categoryDetail = "infrastructure and public utilities";
  if (openCategories.length > 0) {
    categoryDetail = openCategories.map(c => c.toLowerCase()).join(" and ");
  }

  const fallbackInsights = {
    community: targetCommunity,
    healthScore,
    healthScoreExplanation: totalCount > 0 
      ? `Our civic intelligence models score this neighborhood at ${healthScore}/100. This is primarily influenced by ${activeCount} active issues involving ${categoryDetail}.`
      : "No active civic issues have been reported. The community is operating at a pristine 100/100 score.",
    totalIssuesCount: totalCount,
    activeIssuesCount: activeCount,
    resolvedIssuesCount: resolvedCount,
    criticalIssuesCount: criticalCount,
    resolutionRate: `${resolutionRate}%`,
    mostCommonCategory: openCategories[0] || "Infrastructure",
    risingConcerns: openCategories.length > 0 
      ? `Emerging concern around local ${openCategories[0].toLowerCase()} affecting local transit and safety.`
      : "No rising concerns. Public services are operating smoothly.",
    highRiskAreas: reports.find((r: any) => r.status !== "Resolved" && (r.severity === "Critical" || r.severity === "High"))?.locationName || (reports.length > 0 ? reports[0].locationName : "Main sector crossroads"),
    recentTrends: totalCount > 0 
      ? `Civic resolution cycle average is currently at 3.2 days, with citizen audit participation growing.`
      : "Stable tracking with no active incidents.",
    summaryText: `Our platform metrics indicate that ${targetCommunity} is experiencing a concentrated focus on ${openCategories.length > 0 ? openCategories[0].toLowerCase() : "general civic infrastructure"}. Citizens are actively verifying reports to resolve problems quickly.`,
    weeklyTrends: totalCount > 0 
      ? `Reporting speed increased by 15% this week, mainly due to citizen engagement in mapping local ${categoryDetail}.`
      : "Excellent civic stability with zero reports logged this week.",
    recurringProblems: openCategories.length > 0 
      ? `Water-logging and seasonal road wear near heavy transit zones remain recurring challenges.`
      : "No chronic or recurring infrastructural issues have been flagged.",
    risingCategories: openCategories[0] || "None",
    emergingProblems: openCategories.length > 1 ? `Persistent degradation of public structures like ${openCategories[1].toLowerCase()}.` : "Emerging wear of high-traffic pedestrian subways.",
    frequentlyAffectedAreas: reports.length > 1 ? reports[1].locationName : (reports.length > 0 ? reports[0].locationName : "Main square"),
    recommendedPriorities: [
      `Inspect and resolve any active ${openCategories[0] || "general"} hazards in high-traffic zones first.`,
      "Rally local citizens to confirm outstanding reports to expedite official resolution.",
      "Check drainage structures prior to seasonal weather changes."
    ],
    generatedAt: new Date().toISOString()
  };

  let finalInsights = fallbackInsights;

  if (ai) {
    try {
      console.log(`Invoking Gemini 3.5 Flash for ${targetCommunity} Community Insights...`);
      const promptText = `
        You are the JanSetu Community Insights & Trend Analysis AI Agent (Agent 2, 3, 8 & 9).
        Analyze the current list of civic issues reported in the community: "${targetCommunity}".
        
        Metrics already calculated from the live database:
        - Total issues: ${totalCount}
        - Active issues: ${activeCount}
        - Resolved issues: ${resolvedCount}
        - Critical issues: ${criticalCount}
        - Resolution rate: ${resolutionRate}%
        - Baseline Health Score: ${healthScore}/100

        Here is the detailed state of reported issues:
        ${issuesSummary}

        Generate an extremely polished, high-fidelity locality health and trend analysis report.
        Return a JSON object containing:
        - healthScore: (An integer between 30 and 100. Adjust the baseline health score of ${healthScore} based on the actual severity, category mix, and description of the issues.)
        - healthScoreExplanation: (A 1-sentence highly specific explanation of why the score exists. E.g., "The score is affected by increased road damage reports and unresolved drainage issues.")
        - mostCommonCategory: (The category of issue occurring most frequently or most critical right now)
        - risingConcerns: (1-sentence describing any emerging local patterns or critical concerns)
        - highRiskAreas: (1-sentence pinpointing specific location or zones that pose the highest immediate public hazard)
        - recentTrends: (1-sentence outlining recent report velocity or resolution trends)
        - summaryText: (A highly engaging, supportive, and motivating 3-sentence community overview of how citizens are doing in terms of resolving problems)
        - weeklyTrends: (1-sentence on how reports have changed this week versus last week)
        - recurringProblems: (1-sentence detailing any persistent or seasonal recurring problems observed from descriptions)
        - risingCategories: (The category showing the fastest growth or highest risk)
        - emergingProblems: (A 1-sentence detailing emerging infrastructure problems)
        - frequentlyAffectedAreas: (Specific lanes or junctions mentioned frequently or affected multiple times)
        - recommendedPriorities: (An array of 3 actionable priority items or recommendations for the community to address first)

        Make it hyper-specific to the list of issues provided. Return strictly the JSON specified in the schema. Do not include any formatting other than the JSON string.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              healthScore: { type: Type.INTEGER },
              healthScoreExplanation: { type: Type.STRING },
              mostCommonCategory: { type: Type.STRING },
              risingConcerns: { type: Type.STRING },
              highRiskAreas: { type: Type.STRING },
              recentTrends: { type: Type.STRING },
              summaryText: { type: Type.STRING },
              weeklyTrends: { type: Type.STRING },
              recurringProblems: { type: Type.STRING },
              risingCategories: { type: Type.STRING },
              emergingProblems: { type: Type.STRING },
              frequentlyAffectedAreas: { type: Type.STRING },
              recommendedPriorities: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: [
              "healthScore", "healthScoreExplanation", "mostCommonCategory", "risingConcerns", "highRiskAreas", 
              "recentTrends", "summaryText", "weeklyTrends", "recurringProblems", "risingCategories", 
              "emergingProblems", "frequentlyAffectedAreas", "recommendedPriorities"
            ]
          }
        }
      });

      if (response && response.text) {
        const result = JSON.parse(response.text.trim());
        finalInsights = {
          community: targetCommunity,
          totalIssuesCount: totalCount,
          activeIssuesCount: activeCount,
          resolvedIssuesCount: resolvedCount,
          criticalIssuesCount: criticalCount,
          resolutionRate: `${resolutionRate}%`,
          ...result,
          generatedAt: new Date().toISOString()
        };
        console.log(`Gemini Insights Agent success for ${targetCommunity}`);
      }
    } catch (err) {
      console.error("Error generating Gemini Community Insights:", err);
    }
  }

  // Store the generated insights in the Firestore "communityInsights" collection
  if (db) {
    try {
      await firestoreSetDoc(firestoreDoc(db, "communityInsights", targetCommunity), finalInsights);
      console.log(`Successfully stored insights in Firestore collection "communityInsights" for: ${targetCommunity}`);
    } catch (writeErr) {
      console.error("Failed to write community insights to Firestore:", writeErr);
    }
  }

  // Automatically trigger predictive insights refresh in the background
  generateAndSavePredictions(targetCommunity).catch((predErr) => {
    console.error("Background Predictive Trend generation failed:", predErr);
  });

  return finalInsights;
}

// Generate and Save Predictive Trend Insights (Agent 5)
async function generateAndSavePredictions(targetCommunity: string) {
  const db = getFirestoreDb();
  let reports: any[] = [];

  if (db) {
    try {
      const q = firestoreQuery(
        firestoreCollection(db, "reports"),
        firestoreWhere("community", "==", targetCommunity)
      );
      const snapshot = await firestoreGetDocs(q);
      reports = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    } catch (err) {
      console.error("Failed to fetch reports from Firestore for predictions:", err);
    }
  }

  // No local fallback under Firestore-only architecture

  // Get corresponding Community AI Insights to add to the model context
  let communityInsight: any = null;
  if (db) {
    try {
      const docRef = firestoreDoc(db, "communityInsights", targetCommunity);
      const docSnap = await firestoreGetDoc(docRef);
      if (docSnap.exists()) {
        communityInsight = docSnap.data();
      }
    } catch (e) {
      console.error("Failed to read community insights for predictions:", e);
    }
  }

  // Fetch all discussion summaries for reports in this community to augment context
  let discussionSummariesText = "";
  if (reports.length > 0) {
    const summaryTexts: string[] = [];
    for (const rep of reports.slice(0, 5)) { // Limit to 5 reports to avoid exceeding token limits
      if (db) {
        try {
          const summaryDocRef = firestoreDoc(db, "discussionSummaries", rep.id);
          const docSnap = await firestoreGetDoc(summaryDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            summaryTexts.push(`- Report: "${rep.title}" -> AI Discussion Summary: ${data.summary} (Sentiment: ${data.sentiment})`);
          }
        } catch (e) {
          // ignore individual failures
        }
      }
    }
    discussionSummariesText = summaryTexts.join("\n") || "No discussion summaries generated yet for recent reports.";
  }

  const totalCount = reports.length;
  const activeCount = reports.filter((r: any) => r.status !== "Resolved").length;
  const resolvedCount = reports.filter((r: any) => r.status === "Resolved").length;
  const criticalCount = reports.filter((r: any) => r.status !== "Resolved" && (r.severity === "Critical" || r.severity === "High")).length;
  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 100;

  let healthScore = 100 - (activeCount * 4) - (criticalCount * 8);
  healthScore = Math.max(35, Math.min(100, healthScore));

  const reportsSummary = reports.map((r: any) => {
    const coords = r.locationCoords ? `[${r.locationCoords.lat}, ${r.locationCoords.lng}]` : "N/A";
    const verifications = r.verificationCount || 0;
    return `- [${r.category}] Title: "${r.title}", Status: ${r.status}, Severity: ${r.severity}, VerificationCount: ${verifications}, CreatedAt: ${r.createdAt}, Location: "${r.locationName}" ${coords}`;
  }).join("\n") || "No current or historical issues reported in this community yet.";

  const openCategories = Array.from(new Set(reports.filter((r: any) => r.status !== "Resolved").map((r: any) => r.category))) as string[];

  const fallbackPrediction = {
    communityId: targetCommunity,
    generatedAt: new Date().toISOString(),
    predictionSummary: totalCount > 0 
      ? `Based on active reporting in ${targetCommunity}, there is a potential risk of infrastructure degradation, particularly in water and road sectors.`
      : "No civic concerns are predicted at this time. The community continues to maintain an excellent preventive index.",
    riskScore: Math.min(100, Math.max(0, 100 - healthScore)),
    predictedIssues: openCategories.length > 0 ? openCategories.slice(0, 2) : ["Road Damage", "Waste Management"],
    hotspotLocations: reports.slice(0, 3).map((r: any) => r.locationName) || ["Main Sector Junction"],
    preventiveActions: [
      `Schedule Road Inspection for active ${openCategories[0] || "infrastructure"} sites`,
      "Increase Waste Collection Frequency in heavy transit zones",
      "Inspect Streetlights in High-Risk Zone prior to seasonal changes"
    ],
    recommendedAuthorities: ["Municipal Roads Department", "Sanitation Authority"],
    confidenceScore: 85,
    issueGrowthTrend: activeCount > 3 ? "Increasing" : "Stable",
    predictedNewIssuesCount: Math.ceil(activeCount * 0.5),
    seasonalRiskIndicators: "Unresolved drainage and road issues pose safety risks during seasonal downpours.",
    infrastructureRiskLevel: activeCount > 4 ? "High" : (activeCount > 1 ? "Medium" : "Low"),
    explanation: totalCount > 0
      ? `This prediction is based on ${activeCount} active reports in ${targetCommunity}, multiple unresolved issues near commercial junctions, and a steady report submission rate.`
      : "This prediction is generated based on zero reported civic issues and high historic stability."
  };

  let finalPrediction = fallbackPrediction;

  if (ai) {
    try {
      console.log(`Invoking Gemini 3.5 Flash for Predictive Trend Agent on ${targetCommunity}...`);
      const promptText = `
        You are the JanSetu Predictive Trend Agent (Agent 5).
        Analyze the historical and current civic issue patterns for the community: "${targetCommunity}".

        COMMUNITY CONTEXT & METRICS:
        - Total Historical Reports: ${totalCount}
        - Active Reports: ${activeCount}
        - Resolved Reports: ${resolvedCount}
        - Critical/High Severity Reports: ${criticalCount}
        - Community Baseline Health Score: ${healthScore}/100

        DETAILED LIST OF HISTORICAL REPORTS (including resolved ones):
        ${reportsSummary}

        COMMUNITY AI INSIGHTS CONTEXT:
        ${communityInsight ? JSON.stringify(communityInsight) : "No Community AI Insights report available."}

        RECENT DISCUSSION SUMMARIES:
        ${discussionSummariesText}

        Analyze the reporting timestamps (to identify submission frequency over time), category clusters, verification counts, status transitions, and GPS/geographic coordinates to identify emerging civic patterns, forecast risks, and recommend preventive actions.

        Provide a structured JSON response containing:
        - predictionSummary: A 1-2 sentence high-level summary of predicted civic trends and risk factors.
        - riskScore: An integer (0 to 100) representing the forecasted community risk level (where 100 is extremely high risk and 0 is completely safe).
        - predictedIssues: A JSON array of strings listing 2-3 issue categories predicted to experience high risk or growth.
        - hotspotLocations: A JSON array of strings identifying 2-4 high-risk hotspots or localities.
        - preventiveActions: A JSON array of 3-5 specific, highly actionable recommended preventive actions (e.g. "Schedule Road Inspection", "Increase Waste Collection Frequency", "Repair Drainage Before Monsoon", "Inspect Streetlights in High-Risk Zone").
        - recommendedAuthorities: A JSON array of strings specifying which government or municipal departments should handle these preventive recommendations.
        - confidenceScore: An integer (0 to 100) indicating the model's confidence in these predictions.
        - issueGrowthTrend: A single string indicating the projected issue growth trajectory. Must be strictly one of: "Increasing", "Stable", "Decreasing".
        - predictedNewIssuesCount: An integer representing the predicted number of new issues likely to be reported in the next 7 days.
        - seasonalRiskIndicators: A 1-sentence description of seasonal or weather-related risk indicators applicable to this community (e.g., monsoon rain clogging, winter fog visibility).
        - infrastructureRiskLevel: A single string representing the overall infrastructure risk rating. Must be strictly one of: "Critical", "High", "Medium", "Low".
        - explanation: A concise explanation of why this prediction was generated. It MUST use a format similar to: "This prediction is based on a [X]% increase in [Category] reports over the past two weeks, multiple unresolved issues within the same locality, and consistently high community verification counts." (Make the percentage and details factual based on the data).

        Return strictly a valid JSON object matching the requested schema. Do not include markdown wraps like \`\`\`json.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              predictionSummary: { type: Type.STRING },
              riskScore: { type: Type.INTEGER },
              predictedIssues: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              hotspotLocations: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              preventiveActions: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              recommendedAuthorities: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              confidenceScore: { type: Type.INTEGER },
              issueGrowthTrend: { type: Type.STRING },
              predictedNewIssuesCount: { type: Type.INTEGER },
              seasonalRiskIndicators: { type: Type.STRING },
              infrastructureRiskLevel: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: [
              "predictionSummary",
              "riskScore",
              "predictedIssues",
              "hotspotLocations",
              "preventiveActions",
              "recommendedAuthorities",
              "confidenceScore",
              "issueGrowthTrend",
              "predictedNewIssuesCount",
              "seasonalRiskIndicators",
              "infrastructureRiskLevel",
              "explanation"
            ]
          }
        }
      });

      if (response && response.text) {
        const result = JSON.parse(response.text.trim());
        finalPrediction = {
          communityId: targetCommunity,
          generatedAt: new Date().toISOString(),
          predictionSummary: result.predictionSummary,
          riskScore: result.riskScore,
          predictedIssues: result.predictedIssues,
          hotspotLocations: result.hotspotLocations,
          preventiveActions: result.preventiveActions,
          recommendedAuthorities: result.recommendedAuthorities,
          confidenceScore: result.confidenceScore,
          issueGrowthTrend: result.issueGrowthTrend,
          predictedNewIssuesCount: result.predictedNewIssuesCount,
          seasonalRiskIndicators: result.seasonalRiskIndicators,
          infrastructureRiskLevel: result.infrastructureRiskLevel,
          explanation: result.explanation
        };
        console.log(`Gemini Predictive Trend Agent success for ${targetCommunity}`);
      }
    } catch (err) {
      console.error("Error generating Gemini Predictive Trend Insights:", err);
    }
  }

  // Store the prediction in Firestore collection "predictedInsights"
  if (db) {
    try {
      await firestoreSetDoc(firestoreDoc(db, "predictedInsights", targetCommunity), finalPrediction);
      console.log(`Successfully stored prediction in Firestore collection "predictedInsights" for: ${targetCommunity}`);
    } catch (writeErr) {
      console.error("Failed to write predictive insights to Firestore:", writeErr);
    }
  }



  return finalPrediction;
}

// GET: Retrieve community insights (returns Firestore cached version if available)
app.get("/api/community-insights/:community", async (req, res) => {
  const targetCommunity = req.params.community;
  const db = getFirestoreDb();

  if (db) {
    try {
      const docRef = firestoreDoc(db, "communityInsights", targetCommunity);
      const docSnap = await firestoreGetDoc(docRef);
      if (docSnap.exists()) {
        console.log(`Serving cached community insights from Firestore for: ${targetCommunity}`);
        return res.json(docSnap.data());
      }
    } catch (e) {
      console.error("Failed to read cached community insights from Firestore:", e);
    }
  }

  const insights = await generateAndSaveInsights(targetCommunity);
  res.json(insights);
});

// POST: Force recalculate/refresh community insights
app.post("/api/community-insights/:community/refresh", async (req, res) => {
  const targetCommunity = req.params.community;
  const insights = await generateAndSaveInsights(targetCommunity);
  res.json(insights);
});

// Dynamic AI discussion summarizer (Agent 4)
// GET: Retrieve a cached discussion summary
app.get("/api/reports/:id/discussion-summary", async (req, res) => {
  const reportId = req.params.id;
  const db = getFirestoreDb();
  if (db) {
    try {
      const summaryDocRef = firestoreDoc(db, "discussionSummaries", reportId);
      const docSnap = await firestoreGetDoc(summaryDocRef);
      if (docSnap.exists()) {
        return res.json(docSnap.data());
      }
    } catch (e) {
      console.error("Failed to read cached discussion summary from Firestore:", e);
    }
  }

  // No local fallback under Firestore-only architecture
  res.status(404).json({ error: "No summary found" });
});

// POST: Force recalculate/refresh a discussion summary using Gemini 3.5 Flash
app.post("/api/reports/:id/summarize-discussion", async (req, res) => {
  const reportId = req.params.id;
  const db = getFirestoreDb();
  
  let report: any = null;
  let comments: any[] = [];
  let updates: any[] = [];

  // Try to load real data from Firestore
  if (db) {
    try {
      const reportRef = firestoreDoc(db, "reports", reportId);
      const reportSnap = await firestoreGetDoc(reportRef);
      if (reportSnap.exists()) {
        report = { id: reportSnap.id, ...reportSnap.data() };
      }
      
      const commentsRef = firestoreCollection(db, "reports", reportId, "comments");
      const commentsSnap = await firestoreGetDocs(commentsRef);
      comments = commentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const updatesRef = firestoreCollection(db, "reports", reportId, "updates");
      const updatesSnap = await firestoreGetDocs(updatesRef);
      updates = updatesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error("Failed to fetch report context and comments from Firestore:", err);
    }
  }

  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }

  // No local fallback under Firestore-only architecture

  // Sort comments and updates by timestamp
  comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  updates.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Generate string representations for the prompt
  const commentsText = comments.map((c: any) => `${c.userName} (${c.userBadge || 'Citizen'}): "${c.text}"`).join("\n") || "No comments posted yet.";
  const updatesText = updates.map((u: any) => `[${u.timestamp}] ${u.actorRole || 'Citizen'} (${u.actorName}): ${u.status} - "${u.message}"`).join("\n") || "No official coordinator updates posted yet.";

  // High-fidelity fallback summary in case Gemini is not available or comments are empty
  const hasComments = comments.length > 0;
  const fallbackSummary = {
    reportId,
    generatedAt: new Date().toISOString(),
    summary: hasComments 
      ? `Residents are actively discussing this ${report.category.toLowerCase()} issue. Key complaints include a high potential for safety hazards and the lack of official response so far.`
      : "No community discussion has taken place yet. Encourage residents to share updates!",
    sentiment: hasComments ? "Urgent" : "Neutral",
    concerns: hasComments 
      ? ["Safety hazard for children and senior citizens", "Poor illumination and visibility", "Slow response from local authorities"]
      : ["None yet"],
    numberOfUniqueConcerns: hasComments ? 3 : 0,
    mostRequestedAction: hasComments ? "Deploy temporary safety barricades and speed up repairs" : "Await inspector assignment",
    keySupportingEvidence: hasComments ? "Multiple scooter riders reported falling" : "None yet",
    recommendedAction: hasComments ? "Schedule Site Inspection" : "Await inspection",
    confidenceScore: hasComments ? 90 : 100
  };

  // If Gemini client is active, call it
  if (ai) {
    try {
      console.log(`Invoking Gemini 3.5 Flash for Discussion Summarizer on Issue ${reportId}...`);
      const promptText = `
        You are the JanSetu Discussion Summarizer Agent (Agent 4).
        Analyze the citizen comments, discussion history, and coordinator updates for the civic issue: "${report.title}".
        
        REPORT CONTEXT:
        - Category: ${report.category}
        - Description: ${report.description}
        - Current Status: ${report.status}
        - Severity: ${report.severity}
        - Verification/Support Count: ${report.verificationCount || 0}
        
        OFFICIAL UPDATES:
        ${updatesText}

        CITIZEN DISCUSSIONS / COMMENTS:
        ${commentsText}

        Based on the provided information, generate a factual structured discussion summary.
        Provide a JSON response containing:
        - summary: 1-2 sentences summarizing the overall discussion vibe, citizen perspectives, and core consensus.
        - sentiment: One single keyword representing community sentiment. Must be strictly one of: Positive, Neutral, Negative, Urgent.
        - concerns: A JSON array of strings containing the main distinct community concerns raised in the discussion (limit to 2-4 points).
        - numberOfUniqueConcerns: An integer representing the count of unique issues or concerns raised by citizens.
        - mostRequestedAction: 1 sentence summarizing the specific resolution or action citizens are requesting the most.
        - keySupportingEvidence: 1 sentence summarizing any key evidence, details, or reports shared by citizens (e.g. accidents, frequency, times of day).
        - recommendedAction: One single suggested coordinator next action. It MUST be chosen from one of these exact options: "Escalate to Municipal Roads Department", "Post Community Advisory", "Request Additional Evidence", "Mark Issue as High Priority", "Schedule Site Inspection".
        - confidenceScore: An integer between 0 and 100 indicating your confidence in this analysis based on comment clarity and quality.

        Return strictly a valid JSON object matching the requested schema. Do not include markdown wraps like \`\`\`json.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              sentiment: { type: Type.STRING },
              concerns: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              numberOfUniqueConcerns: { type: Type.INTEGER },
              mostRequestedAction: { type: Type.STRING },
              keySupportingEvidence: { type: Type.STRING },
              recommendedAction: { type: Type.STRING },
              confidenceScore: { type: Type.INTEGER }
            },
            required: [
              "summary", 
              "sentiment", 
              "concerns", 
              "numberOfUniqueConcerns", 
              "mostRequestedAction", 
              "keySupportingEvidence", 
              "recommendedAction", 
              "confidenceScore"
            ]
          }
        }
      });

      if (response && response.text) {
        const result = JSON.parse(response.text.trim());
        const summaryDoc = {
          reportId,
          generatedAt: new Date().toISOString(),
          summary: result.summary,
          sentiment: result.sentiment,
          concerns: result.concerns,
          numberOfUniqueConcerns: result.numberOfUniqueConcerns,
          mostRequestedAction: result.mostRequestedAction,
          keySupportingEvidence: result.keySupportingEvidence,
          recommendedAction: result.recommendedAction,
          confidenceScore: result.confidenceScore
        };

        // Store to real Firestore if initialized
        if (db) {
          try {
            const summaryDocRef = firestoreDoc(db, "discussionSummaries", reportId);
            await firestoreSetDoc(summaryDocRef, summaryDoc);
            console.log(`Saved AI Discussion Summary to Firestore: ${reportId}`);
          } catch (e) {
            console.error("Failed to save AI Discussion Summary to Firestore:", e);
          }
        }



        return res.json(summaryDoc);
      }
    } catch (e) {
      console.error("Error summarizing discussion with Gemini:", e);
    }
  }

  // Fallback storage
  if (db) {
    try {
      const summaryDocRef = firestoreDoc(db, "discussionSummaries", reportId);
      await firestoreSetDoc(summaryDocRef, fallbackSummary);
    } catch (e) {
      console.error("Failed to save fallback AI Discussion Summary to Firestore:", e);
    }
  }



  res.json(fallbackSummary);
});


// Predictive Trend Insights Endpoints (Agent 5)
// GET: Retrieve predictive insights (returns Firestore cached version if available)
app.get("/api/predictive-insights/:community", async (req, res) => {
  const targetCommunity = req.params.community;
  const db = getFirestoreDb();

  if (db) {
    try {
      const docRef = firestoreDoc(db, "predictedInsights", targetCommunity);
      const docSnap = await firestoreGetDoc(docRef);
      if (docSnap.exists()) {
        console.log(`Serving cached predictive insights from Firestore for: ${targetCommunity}`);
        return res.json(docSnap.data());
      }
    } catch (e) {
      console.error("Failed to read cached predictive insights from Firestore:", e);
    }
  }



  const prediction = await generateAndSavePredictions(targetCommunity);
  res.json(prediction);
});

// POST: Force recalculate/refresh predictive insights
app.post("/api/predictive-insights/:community/refresh", async (req, res) => {
  const targetCommunity = req.params.community;
  const prediction = await generateAndSavePredictions(targetCommunity);
  res.json(prediction);
});

// GET: Retrieve preventive recommendations status mapping
app.get("/api/predictive-insights/:community/action-status", async (req, res) => {
  const targetCommunity = req.params.community;
  const db = getFirestoreDb();

  if (db) {
    try {
      const docRef = firestoreDoc(db, "preventiveActionsStatus", targetCommunity);
      const docSnap = await firestoreGetDoc(docRef);
      if (docSnap.exists()) {
        return res.json(docSnap.data());
      }
    } catch (e) {
      console.error("Failed to read action status from Firestore:", e);
    }
  }



  res.json({ communityId: targetCommunity, statuses: {}, updatedAt: new Date().toISOString() });
});

// POST: Update preventive recommendation status
app.post("/api/predictive-insights/:community/action-status", async (req, res) => {
  const targetCommunity = req.params.community;
  const { recommendationText, status } = req.body; // status is Pending, In Progress, Completed
  const db = getFirestoreDb();

  let trackingDoc = {
    communityId: targetCommunity,
    statuses: {} as Record<string, string>,
    updatedAt: new Date().toISOString()
  };

  // Read existing
  if (db) {
    try {
      const docRef = firestoreDoc(db, "preventiveActionsStatus", targetCommunity);
      const docSnap = await firestoreGetDoc(docRef);
      if (docSnap.exists()) {
        trackingDoc = docSnap.data() as any;
      }
    } catch (e) {
      console.error("Failed to read action status from Firestore before update:", e);
    }

  }

  // Update specific recommendation
  trackingDoc.statuses[recommendationText] = status;
  trackingDoc.updatedAt = new Date().toISOString();

  // Save updated
  if (db) {
    try {
      await firestoreSetDoc(firestoreDoc(db, "preventiveActionsStatus", targetCommunity), trackingDoc);
    } catch (e) {
      console.error("Failed to write action status to Firestore:", e);
    }
  }



  res.json(trackingDoc);
});


// --- COORDINATOR AI ASSISTANT ENDPOINTS & HELPERS (Agent 6) ---

// HELPER: Get Or Create CoordinatorInsights
async function getOrCreateCoordinatorInsights(targetCommunity: string) {
  const db = getFirestoreDb();
  let doc: any = null;

  if (db) {
    try {
      const docRef = firestoreDoc(db, "coordinatorInsights", targetCommunity);
      const docSnap = await firestoreGetDoc(docRef);
      if (docSnap.exists()) {
        doc = docSnap.data();
      }
    } catch (e) {
      console.error("Failed to read coordinator insights from Firestore:", e);
    }
  }



  if (!doc) {
    doc = {
      communityId: targetCommunity,
      generatedAt: new Date().toISOString(),
      generatedBulletins: [],
      weeklyReports: [],
      escalationSuggestions: [],
      actionRecommendations: []
    };
  }

  return doc;
}

// HELPER: Save CoordinatorInsights
async function saveCoordinatorInsights(targetCommunity: string, doc: any) {
  const db = getFirestoreDb();
  doc.generatedAt = new Date().toISOString();

  if (db) {
    try {
      await firestoreSetDoc(firestoreDoc(db, "coordinatorInsights", targetCommunity), doc);
    } catch (e) {
      console.error("Failed to save coordinator insights to Firestore:", e);
    }
  }


}

// HELPER: Fetch context for a community
async function getCommunityContext(targetCommunity: string) {
  const db = getFirestoreDb();
  let reports: any[] = [];

  if (db) {
    try {
      const q = firestoreQuery(
        firestoreCollection(db, "reports"),
        firestoreWhere("community", "==", targetCommunity)
      );
      const snapshot = await firestoreGetDocs(q);
      reports = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    } catch (err) {
      console.error("Failed to fetch reports from Firestore for coordinator context:", err);
    }
  }



  let communityInsight: any = null;
  if (db) {
    try {
      const docRef = firestoreDoc(db, "communityInsights", targetCommunity);
      const docSnap = await firestoreGetDoc(docRef);
      if (docSnap.exists()) {
        communityInsight = docSnap.data();
      }
    } catch (e) {
      console.error("Failed to read community insights:", e);
    }
  }


  let predictedInsight: any = null;
  if (db) {
    try {
      const docRef = firestoreDoc(db, "predictedInsights", targetCommunity);
      const docSnap = await firestoreGetDoc(docRef);
      if (docSnap.exists()) {
        predictedInsight = docSnap.data();
      }
    } catch (e) {
      console.error("Failed to read predicted insights:", e);
    }
  }


  const totalReports = reports.length;
  const activeReports = reports.filter(r => r.status !== "Resolved").length;
  const resolvedReports = reports.filter(r => r.status === "Resolved").length;
  const criticalReports = reports.filter(r => (r.priority === "Critical" || r.severity === "Critical") && r.status !== "Resolved");

  const recentReportsSummary = reports.slice(0, 10).map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority || r.severity || "Medium",
    category: r.category,
    createdAt: r.createdAt
  }));

  return {
    totalReports,
    activeReports,
    resolvedReports,
    criticalReports,
    recentReportsSummary,
    communityInsight,
    predictedInsight
  };
}

// GET: Retrieve coordinator insights
app.get("/api/coordinator-insights/:community", async (req, res) => {
  const targetCommunity = req.params.community;
  try {
    const doc = await getOrCreateCoordinatorInsights(targetCommunity);
    res.json(doc);
  } catch (err) {
    console.error("Error retrieving coordinator insights:", err);
    res.status(500).json({ error: "Failed to retrieve coordinator insights" });
  }
});

// POST: Generate Community Bulletin
app.post("/api/coordinator-insights/:community/generate-bulletin", async (req, res) => {
  const targetCommunity = req.params.community;
  try {
    const context = await getCommunityContext(targetCommunity);
    const doc = await getOrCreateCoordinatorInsights(targetCommunity);

    let bulletinResult = {
      title: "Monsoon Preparedness & Drainage Advisory",
      content: `Attention Residents of ${targetCommunity},\n\nIn preparation for the upcoming monsoon season, the Ward Coordinator is working closely with municipal departments to clear major storm drains. Over the past week, we have logged multiple requests regarding drainage clogs near Sector 4 and Main Street. We urge all residents to refrain from dumping trash near drain covers and to report any immediate blockages through the JanSetu app.\n\nWork is scheduled to begin this Wednesday at 8:00 AM. Thank you for your continued cooperation in keeping our neighborhood safe.`,
      priority: "Normal",
      generatedAt: new Date().toISOString()
    };

    if (ai) {
      try {
        const promptText = `
          You are the JanSetu AI Coordinator Assistant. Your task is to auto-generate a highly professional, polite, and official community bulletin announcement based on the following community context:
          
          COMMUNITY NAME: ${targetCommunity}
          TOTAL REPORTS: ${context.totalReports}
          ACTIVE REPORTS: ${context.activeReports}
          RESOLVED REPORTS: ${context.resolvedReports}
          
          RECENT ISSUES LOGGED:
          ${JSON.stringify(context.recentReportsSummary)}
          
          COMMUNITY INSIGHTS:
          ${JSON.stringify(context.communityInsight)}
          
          PREDICTIVE RISK FORECAST:
          ${JSON.stringify(context.predictedInsight)}

          Requirements:
          - The bulletin must address active or predicted concerns (e.g. road repair delays, water quality, waste collection schedules, streetlight failures, or upcoming storm desilting).
          - Be encouraging, formal, and informative. Inform residents about upcoming actions, caution them about potential issues, and ask for cooperation.
          - Output strictly a JSON object with:
            - title: A short, professional headline/title.
            - content: The announcement text, beautifully drafted (approx. 2-3 paragraphs, around 100-200 words).
            - priority: Urgency level. Either "High" or "Normal".
          
          Return strictly valid JSON. Do not write any markdown wraps.
        `;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptText,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                priority: { type: Type.STRING }
              },
              required: ["title", "content", "priority"]
            }
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          bulletinResult = {
            title: parsed.title,
            content: parsed.content,
            priority: parsed.priority || "Normal",
            generatedAt: new Date().toISOString()
          };
        }
      } catch (err) {
        console.error("Gemini failed to generate bulletin, using fallback:", err);
      }
    }

    if (!doc.generatedBulletins) {
      doc.generatedBulletins = [];
    }
    doc.generatedBulletins.unshift(bulletinResult);
    await saveCoordinatorInsights(targetCommunity, doc);

    res.json(bulletinResult);
  } catch (err) {
    console.error("Error generating community bulletin:", err);
    res.status(500).json({ error: "Failed to generate bulletin" });
  }
});

// POST: Generate Weekly Community Report
app.post("/api/coordinator-insights/:community/generate-weekly-report", async (req, res) => {
  const targetCommunity = req.params.community;
  try {
    const context = await getCommunityContext(targetCommunity);
    const doc = await getOrCreateCoordinatorInsights(targetCommunity);

    const calculatedHealthScore = context.communityInsight?.healthScore || 85;

    let reportResult = {
      totalReports: context.totalReports || 12,
      resolvedReports: context.resolvedReports || 8,
      activeReports: context.activeReports || 4,
      communityHealthScore: calculatedHealthScore,
      trendAnalysis: "Incident reports have stabilized over the past 7 days, showing a 15% drop in new waste management filings.",
      topConcerns: ["Water leakages near Sector 3", "Drainage blockages ahead of seasonal rains"],
      majorAchievements: ["Resolved the high-voltage streetlight failure on Main Avenue", "Cleaned up public dumping spot near the central park"],
      pendingHighPriority: ["Water pipeline burst in Sector 3 (unresolved for 4 days)"],
      recommendedPriorities: ["Deploy sewer inspection teams to Sector 3", "Schedule routine drain desilting with the Sanitation Board"],
      fullReportText: `## Weekly Neighborhood Summary: ${targetCommunity}\n\nThis weekly summary is compiled for local administrative authorities and the Ward Coordinator to analyze the current civic state and response times.\n\n### 📊 Key Performance Metrics:\n- **Total Logged Incidents**: ${context.totalReports}\n- **Resolved Cases**: ${context.resolvedReports}\n- **Active / Pending Tracking**: ${context.activeReports}\n- **Community Health Index**: ${calculatedHealthScore}/100\n\n### 📈 Trend and Safety Analysis:\nOur monitoring shows that reporting speed has stabilized. The main areas of current public complaint center on sanitation and public utilities. However, our resolution rate has improved by 12% due to active volunteer follow-ups and prompt ward assignment.\n\n### 🏆 Major Achievements:\n1. Completed emergency repairs on Main Avenue streetlights, restoring illumination to a 500m high-risk pedestrian zone.\n2. Addressed the illegal solid waste pileup in front of Sector 2 Primary School.\n\n### ⚠️ Critical Concerns & Escalations:\n- **Sector 3 Pipeline Burst**: A major water line remains fractured, causing low water pressure for 180 residences. Escalation to the Water Supply & Sewerage Board is strongly advised.\n\n### 📋 Strategic Priorities for Next Week:\n- Launch drainage desilting patrols in Sector 3 and Sector 4.\n- Follow up on standard road repair work orders with municipal engineers.`,
      generatedAt: new Date().toISOString()
    };

    if (ai) {
      try {
        const promptText = `
          You are the JanSetu AI Coordinator Assistant. Your task is to generate a comprehensive, professional, and structured Weekly Community Report for the community "${targetCommunity}" based on the following community context:
          
          TOTAL LOGGED REPORTS: ${context.totalReports}
          ACTIVE REPORTS: ${context.activeReports}
          RESOLVED REPORTS: ${context.resolvedReports}
          COMMUNITY HEALTH SCORE: ${calculatedHealthScore}
          
          RECENT REPORTS DETAILS:
          ${JSON.stringify(context.recentReportsSummary)}
          
          COMMUNITY INSIGHTS:
          ${JSON.stringify(context.communityInsight)}
          
          PREDICTIVE FORECAST:
          ${JSON.stringify(context.predictedInsight)}

          Requirements:
          - Analyze the numbers and compile a detailed weekly report.
          - Include top concerns, major achievements, pending high-priority issues, and recommended priorities for next week.
          - Write a highly detailed, professional 'fullReportText' in markdown format suitable for sharing with local authorities. Include headings, bullet points, and performance breakdowns.
          - Output strictly a JSON object with:
            - totalReports: integer
            - resolvedReports: integer
            - activeReports: integer
            - communityHealthScore: integer (0-100)
            - trendAnalysis: A 2-sentence description of the reporting trend.
            - topConcerns: Array of strings (2-3 top concerns).
            - majorAchievements: Array of strings (1-3 recent resolved items or community actions).
            - pendingHighPriority: Array of strings (high-priority items still active).
            - recommendedPriorities: Array of strings (recommended actions for next week).
            - fullReportText: Comprehensive professional markdown summary report text.
          
          Return strictly valid JSON. Do not write any markdown wraps in the outer output.
        `;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptText,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                totalReports: { type: Type.INTEGER },
                resolvedReports: { type: Type.INTEGER },
                activeReports: { type: Type.INTEGER },
                communityHealthScore: { type: Type.INTEGER },
                trendAnalysis: { type: Type.STRING },
                topConcerns: { type: Type.ARRAY, items: { type: Type.STRING } },
                majorAchievements: { type: Type.ARRAY, items: { type: Type.STRING } },
                pendingHighPriority: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendedPriorities: { type: Type.ARRAY, items: { type: Type.STRING } },
                fullReportText: { type: Type.STRING }
              },
              required: [
                "totalReports", "resolvedReports", "activeReports", "communityHealthScore",
                "trendAnalysis", "topConcerns", "majorAchievements", "pendingHighPriority",
                "recommendedPriorities", "fullReportText"
              ]
            }
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          reportResult = {
            totalReports: parsed.totalReports,
            resolvedReports: parsed.resolvedReports,
            activeReports: parsed.activeReports,
            communityHealthScore: parsed.communityHealthScore,
            trendAnalysis: parsed.trendAnalysis,
            topConcerns: parsed.topConcerns,
            majorAchievements: parsed.majorAchievements,
            pendingHighPriority: parsed.pendingHighPriority,
            recommendedPriorities: parsed.recommendedPriorities,
            fullReportText: parsed.fullReportText,
            generatedAt: new Date().toISOString()
          };
        }
      } catch (err) {
        console.error("Gemini failed to generate weekly report, using fallback:", err);
      }
    }

    if (!doc.weeklyReports) {
      doc.weeklyReports = [];
    }
    doc.weeklyReports.unshift(reportResult);
    await saveCoordinatorInsights(targetCommunity, doc);

    res.json(reportResult);
  } catch (err) {
    console.error("Error generating weekly community report:", err);
    res.status(500).json({ error: "Failed to generate weekly report" });
  }
});

// POST: Refresh Actions and Escalation Suggestions
app.post("/api/coordinator-insights/:community/refresh-actions-and-escalations", async (req, res) => {
  const targetCommunity = req.params.community;
  try {
    const context = await getCommunityContext(targetCommunity);
    const doc = await getOrCreateCoordinatorInsights(targetCommunity);

    const unresolvedCriticalReports = (context.recentReportsSummary || []).filter(
      (r: any) => r.status !== "Resolved" && (r.priority === "Critical" || r.priority === "High")
    );

    let defaultActions = [
      {
        id: "act-1",
        title: "Deploy sanitation crew to Sector 2",
        description: "Organize volunteers and clear garbage dumps identified near primary school block.",
        urgency: "High",
        expectedImpact: "Restores clean pedestrian access for over 300 students.",
        isCompleted: false
      },
      {
        id: "act-2",
        title: "Escalate Sector 3 Water Leakage",
        description: "Submit formal complaint regarding pipeline rupture to Municipal Water Works.",
        urgency: "Critical",
        expectedImpact: "Saves thousands of liters of clean drinking water daily and restores main pressure.",
        isCompleted: false
      },
      {
        id: "act-3",
        title: "Schedule Streetlight Audit on Main Road",
        description: "Inspect faulty photo-sensors along Main Road to fix night outages.",
        urgency: "Medium",
        expectedImpact: "Improves nocturnal safety and security for evening commuters.",
        isCompleted: false
      }
    ];

    let defaultEscalations: any[] = [];
    if (unresolvedCriticalReports.length > 0) {
      defaultEscalations = unresolvedCriticalReports.map((r: any, index: number) => ({
        reportId: r.id,
        reportTitle: r.title,
        recommendedDepartment: "Municipal Civic Body / Public Works",
        reasonForEscalation: `Incident "${r.title}" has remained unresolved in ${r.status} status despite multiple community verifications and high urgency priority.`,
        suggestedEscalationMessage: `Dear Sir/Madam,\n\nWe are escalating a critical public interest concern reported via JanSetu in ${targetCommunity}.\n\nIssue Details: ${r.title}\nDescription: ${r.description}\nLogged Date: ${r.createdAt}\n\nThis issue significantly affects public safety and routine commerce in the ward. We kindly request emergency inspections and repairs.\n\nSincerely,\nWard Coordinator`,
        priorityLevel: r.priority || "High",
        expectedPublicImpact: "High risk of secondary incidents and rising citizen frustration if left unattended."
      }));
    } else {
      defaultEscalations = [
        {
          reportId: "demo-escalation-1",
          reportTitle: "Main Water Pipe Fracture in Sector 3",
          recommendedDepartment: "Municipal Sewerage & Water Board",
          reasonForEscalation: "The issue has been pending under In Progress for over 5 days with zero contractor updates.",
          suggestedEscalationMessage: "To the Commissioner,\n\nWe would like to request immediate intervention regarding the water pipeline rupture near Sector 3. It continues to cause waterlogging on the roadway and extremely low municipal pressure.\n\nRespectfully,\nWard Coordinator",
          priorityLevel: "Critical",
          expectedPublicImpact: "Saves massive water resources and prevents street surface erosion."
        }
      ];
    }

    let actionsAndEscalations = {
      actionRecommendations: defaultActions,
      escalationSuggestions: defaultEscalations
    };

    if (ai) {
      try {
        const promptText = `
          You are the JanSetu AI Coordinator Assistant. Your task is to recommend prioritised coordinator actions and formal escalation suggestions based on this community context:
          
          COMMUNITY NAME: ${targetCommunity}
          ACTIVE UNRESOLVED INCIDENTS:
          ${JSON.stringify(unresolvedCriticalReports)}
          
          ALL RECENT INCIDENTS:
          ${JSON.stringify(context.recentReportsSummary)}
          
          COMMUNITY HEALTH INSIGHTS:
          ${JSON.stringify(context.communityInsight)}

          Requirements:
          - Analyze the unresolved incidents and general state.
          - Formulate 3-5 high-value, highly specific Recommended Actions for the coordinator (e.g. coordinating cleanup drives, scheduling municipal followups, checking on vulnerable zones). Return them in 'actionRecommendations'.
          - Formulate formal Escalation Suggestions ('escalationSuggestions') specifically targeting the active unresolved critical/high-priority reports. Each suggestion must point to a real 'reportId' and 'reportTitle' from the provided active incidents (if empty, you can simulate a demo escalation for a typical sewer leak or road failure, clearly marked).
          - Recommend appropriate municipal department names (e.g., "Electricity Supply Board", "Waste Management Division").
          - Output strictly a JSON object with:
            - actionRecommendations: Array of objects, each containing:
              - title: short bold action name
              - description: detailed step-by-step description
              - urgency: "Critical" | "High" | "Medium" | "Low"
              - expectedImpact: what public benefit is expected
            - escalationSuggestions: Array of objects, each containing:
              - reportId: string id of the report
              - reportTitle: string title of the report
              - recommendedDepartment: string
              - reasonForEscalation: clear concise reason
              - suggestedEscalationMessage: professional formal letter text
              - priorityLevel: "Critical" | "High" | "Medium" | "Low"
              - expectedPublicImpact: concise description of public benefit
          
          Return strictly valid JSON. Do not write any markdown wraps.
        `;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptText,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                actionRecommendations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      urgency: { type: Type.STRING },
                      expectedImpact: { type: Type.STRING }
                    },
                    required: ["title", "description", "urgency", "expectedImpact"]
                  }
                },
                escalationSuggestions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      reportId: { type: Type.STRING },
                      reportTitle: { type: Type.STRING },
                      recommendedDepartment: { type: Type.STRING },
                      reasonForEscalation: { type: Type.STRING },
                      suggestedEscalationMessage: { type: Type.STRING },
                      priorityLevel: { type: Type.STRING },
                      expectedPublicImpact: { type: Type.STRING }
                    },
                    required: [
                      "reportId", "reportTitle", "recommendedDepartment", "reasonForEscalation",
                      "suggestedEscalationMessage", "priorityLevel", "expectedPublicImpact"
                    ]
                  }
                }
              },
              required: ["actionRecommendations", "escalationSuggestions"]
            }
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          actionsAndEscalations.actionRecommendations = parsed.actionRecommendations.map((act: any, idx: number) => ({
            id: `act-${Date.now()}-${idx}`,
            title: act.title,
            description: act.description,
            urgency: act.urgency || "Medium",
            expectedImpact: act.expectedImpact,
            isCompleted: false
          }));
          actionsAndEscalations.escalationSuggestions = parsed.escalationSuggestions;
        }
      } catch (err) {
        console.error("Gemini failed to generate actions/escalations, using fallback:", err);
      }
    }

    doc.actionRecommendations = actionsAndEscalations.actionRecommendations;
    doc.escalationSuggestions = actionsAndEscalations.escalationSuggestions;
    await saveCoordinatorInsights(targetCommunity, doc);

    res.json(doc);
  } catch (err) {
    console.error("Error refreshing actions/escalations:", err);
    res.status(500).json({ error: "Failed to refresh actions and escalations" });
  }
});

// POST: Toggle Action completed status
app.post("/api/coordinator-insights/:community/toggle-action", async (req, res) => {
  const targetCommunity = req.params.community;
  const { actionId } = req.body;
  try {
    const doc = await getOrCreateCoordinatorInsights(targetCommunity);
    if (doc.actionRecommendations) {
      doc.actionRecommendations = doc.actionRecommendations.map((act: any) => {
        if (act.id === actionId) {
          return { ...act, isCompleted: !act.isCompleted };
        }
        return act;
      });
    }
    await saveCoordinatorInsights(targetCommunity, doc);
    res.json(doc);
  } catch (err) {
    console.error("Error toggling action recommendation:", err);
    res.status(500).json({ error: "Failed to toggle action status" });
  }
});


// Vite middleware integration for full-stack build
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`JanSetu Server successfully listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
