export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  reputationPoints: number;
  badge: 'Civic Reporter' | 'Community Guardian' | 'JanSetu Champion';
  reportsSubmittedCount: number;
  verificationsCount: number;
  communityContributionsCount: number;
  selectedCommunity: string;
  isCoordinator: boolean;
  email?: string;
  mobile?: string;
  location?: string;
  password?: string;
}

export interface TimelineUpdate {
  id: string;
  status: string;
  message: string;
  timestamp: string;
  actorName: string;
  actorRole: 'Citizen' | 'Coordinator' | 'Authority';
  evidenceImage?: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userBadge: string;
  text: string;
  createdAt: string;
}

export interface IssueReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterAvatar: string;
  title: string;
  description: string;
  image: string; // Base64 or a local/mock asset path
  imageUrl?: string;
  media?: string;
  locationName: string;
  locationCoords: { lat: number; lng: number };
  community: string; // e.g. "Old Bowenpally"
  category: 'Road Damage' | 'Water Leakage' | 'Waste Management' | 'Streetlight Failure' | 'Drainage Issue' | 'Public Safety Concern';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Reported' | 'Verified' | 'In Progress' | 'Resolved';
  verificationCount: number;
  confirmedBy: string[]; // List of userIds who confirmed
  resolvedBy: string[]; // List of userIds who verified as resolved
  confidence: number; // confidence score (0-100)
  summary: string; // AI generated summary
  safetyRisks: string; // AI identified safety risks
  responsibleAuthority: string; // AI recommended authority
  recommendedActions: string[]; // AI recommended steps
  estimatedTimeline: string; // AI estimated time
  createdAt: string;
  updatedAt: string;
  isEscalated?: boolean;
  isHighlighted?: boolean;
  duplicateOf?: string;
  updates: TimelineUpdate[];
  comments: Comment[];
  verificationConfidence?: number;
  evidenceStrength?: string;
  verificationReliability?: string;
  riskLevel?: string;
  consequencesIfIgnored?: string;
  justification?: string;
}

export interface CommunityInfo {
  name: string;
  memberCount: number;
  activeIssuesCount: number;
  resolvedIssuesCount: number;
  coordinatorName: string;
  coordinatorAvatar: string;
  announcements: { id: string; title: string; text: string; date: string }[];
}

export interface CommunityAIInsights {
  community: string;
  mostCommonCategory: string;
  risingConcerns: string;
  highRiskAreas: string;
  recentTrends: string;
  summaryText: string;
  generatedAt: string;
  healthScore?: number;
  healthScoreExplanation?: string;
  totalIssuesCount?: number;
  activeIssuesCount?: number;
  resolvedIssuesCount?: number;
  criticalIssuesCount?: number;
  resolutionRate?: string;
  weeklyTrends?: string;
  recurringProblems?: string;
  risingCategories?: string;
  emergingProblems?: string;
  frequentlyAffectedAreas?: string;
}

export interface PredictedInsight {
  communityId: string;
  generatedAt: string;
  predictionSummary: string;
  riskScore: number;
  predictedIssues: string[];
  hotspotLocations: string[];
  preventiveActions: string[];
  recommendedAuthorities: string[];
  confidenceScore: number;
  issueGrowthTrend: 'Increasing' | 'Stable' | 'Decreasing';
  predictedNewIssuesCount: number;
  seasonalRiskIndicators: string;
  infrastructureRiskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  explanation: string;
}

export interface PreventiveActionsStatus {
  communityId: string;
  statuses: Record<string, 'Pending' | 'In Progress' | 'Completed'>;
  updatedAt: string;
}

export interface CoordinatorInsights {
  communityId: string;
  generatedAt: string;
  generatedBulletins: {
    title: string;
    content: string;
    priority: string;
    generatedAt: string;
  }[];
  weeklyReports: {
    totalReports: number;
    resolvedReports: number;
    activeReports: number;
    communityHealthScore: number;
    trendAnalysis: string;
    topConcerns: string[];
    majorAchievements: string[];
    pendingHighPriority: string[];
    recommendedPriorities: string[];
    fullReportText: string;
    generatedAt: string;
  }[];
  escalationSuggestions: {
    reportId: string;
    reportTitle: string;
    recommendedDepartment: string;
    reasonForEscalation: string;
    suggestedEscalationMessage: string;
    priorityLevel: string;
    expectedPublicImpact: string;
  }[];
  actionRecommendations: {
    id: string;
    title: string;
    description: string;
    urgency: string;
    expectedImpact: string;
    isCompleted: boolean;
  }[];
}

export interface DiscussionMessage {
  id: string;
  message: string;
  sender: string; // Sender Name
  senderId?: string; // Optional Sender ID
  senderAvatar?: string; // Optional Sender Avatar
  role: 'Citizen' | 'Coordinator';
  community: string;
  timestamp: string;
  likes: number;
  isPinned: boolean;
  replyTo?: string;
  likedBy?: string[]; // track who liked
}

