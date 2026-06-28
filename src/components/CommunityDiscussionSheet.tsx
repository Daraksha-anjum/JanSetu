import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  Send, 
  ThumbsUp, 
  Pin, 
  CornerDownRight, 
  Megaphone, 
  MessageSquare, 
  Users, 
  Sparkles,
  ArrowDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../lib/firebase";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  query, 
  orderBy, 
  setDoc,
  getDocs,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from "firebase/firestore";
import { DISCUSSION_SEEDS } from "../data/discussionSeeds";
import { DiscussionMessage, UserProfile } from "../types";

interface CommunityDiscussionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  communityName: string;
  currentUser: UserProfile;
}

export default function CommunityDiscussionSheet({ 
  isOpen, 
  onClose, 
  communityName, 
  currentUser 
}: CommunityDiscussionSheetProps) {
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [replyTo, setReplyTo] = useState<DiscussionMessage | null>(null);
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [loading, setLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(24);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  // Generate random online count based on community name to keep it consistent yet dynamic
  useEffect(() => {
    let hash = 0;
    for (let i = 0; i < communityName.length; i++) {
      hash = communityName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const count = Math.abs(hash % 21) + 15; // Between 15 and 35
    setOnlineCount(count);
  }, [communityName]);

  // Handle message reading and automatic seeding
  useEffect(() => {
    if (!isOpen || !communityName) return;

    setLoading(true);
    const msgsCol = collection(db, "communityDiscussions", communityName, "messages");
    // Sort primarily by timestamp ascending so the stream reads forward in time
    const q = query(msgsCol, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        console.log(`[Discussion] Collection for ${communityName} is empty. Seeding defaults...`);
        // Seed messages from our seed data
        const seeds = DISCUSSION_SEEDS[communityName] || [];
        try {
          for (const seed of seeds) {
            await setDoc(doc(db, "communityDiscussions", communityName, "messages", seed.id), {
              ...seed,
              likedBy: []
            });
          }
        } catch (err) {
          console.error("Failed to seed community discussions:", err);
        }
        setLoading(false);
        return;
      }

      const list: DiscussionMessage[] = [];
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          ...data
        } as DiscussionMessage);
      });

      // Stable sort in JS so that pinned messages appear at the very top of the feed if requested,
      // or we can just sort pinned messages to the top. Let's sort pinned messages to the top,
      // and within each group (pinned vs unpinned), preserve chronological order.
      const pinned = list.filter(m => m.isPinned).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const unpinned = list.filter(m => !m.isPinned).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      setMessages([...pinned, ...unpinned]);
      setLoading(false);

      // Auto-scroll to bottom on first load and when messages arrive
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    }, (error) => {
      console.error("Firestore discussion snapshot error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, communityName]);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const messageText = inputText.trim();
    setInputText("");

    try {
      const msgsCol = collection(db, "communityDiscussions", communityName, "messages");
      
      let formattedMessage = messageText;
      let finalIsPinned = isAnnouncement;

      // If posting as announcement, prefix with visual marker
      if (isAnnouncement && currentUser.isCoordinator) {
        formattedMessage = `📢 OFFICIAL ANNOUNCEMENT: ${messageText}`;
        finalIsPinned = true;
      }

      const newMessageData: Omit<DiscussionMessage, "id"> = {
        message: formattedMessage,
        sender: currentUser.name,
        senderId: currentUser.id,
        senderAvatar: currentUser.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${currentUser.name}`,
        role: currentUser.isCoordinator ? "Coordinator" : "Citizen",
        community: communityName,
        timestamp: new Date().toISOString(),
        likes: 0,
        isPinned: finalIsPinned,
        likedBy: []
      };

      if (replyTo) {
        newMessageData.replyTo = replyTo.id;
      }

      await addDoc(msgsCol, newMessageData);

      // Reset state
      setReplyTo(null);
      setIsAnnouncement(false);
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);

    } catch (err) {
      console.error("Failed to send discussion message:", err);
    }
  };

  const handleLikeMessage = async (msgId: string) => {
    if (!currentUser.id) return;

    try {
      const msgRef = doc(db, "communityDiscussions", communityName, "messages", msgId);
      const message = messages.find(m => m.id === msgId);
      if (!message) return;

      const likedBy = message.likedBy || [];
      const hasLiked = likedBy.includes(currentUser.id);

      if (hasLiked) {
        await updateDoc(msgRef, {
          likes: Math.max(0, message.likes - 1),
          likedBy: arrayRemove(currentUser.id)
        });
      } else {
        await updateDoc(msgRef, {
          likes: message.likes + 1,
          likedBy: arrayUnion(currentUser.id)
        });
      }
    } catch (err) {
      console.error("Failed to like message:", err);
    }
  };

  const handleTogglePin = async (msgId: string, currentPinStatus: boolean) => {
    if (!currentUser.isCoordinator) return;

    try {
      const msgRef = doc(db, "communityDiscussions", communityName, "messages", msgId);
      await updateDoc(msgRef, {
        isPinned: !currentPinStatus
      });
    } catch (err) {
      console.error("Failed to toggle pin status:", err);
    }
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            id="discussion-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 z-50 pointer-events-auto"
          />

          {/* Bottom Sheet Container */}
          <motion.div
            id="discussion-bottom-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="absolute bottom-0 left-0 right-0 h-[85%] bg-slate-50 rounded-t-[32px] shadow-[0_-10px_40px_rgba(15,23,42,0.15)] flex flex-col overflow-hidden z-50 border-t border-slate-200 pointer-events-auto"
          >
            {/* Grabber indicator bar */}
            <div className="w-full flex justify-center py-2.5">
              <div className="w-12 h-1 bg-slate-200 rounded-full" />
            </div>

            {/* Header section with Metadata */}
            <div className="px-5 pb-3 border-b border-slate-100 bg-white flex items-center justify-between shadow-3xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-800 leading-none">
                    {communityName} Discussion
                  </h2>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{onlineCount} residents online</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Scroll to bottom quick action */}
                <button 
                  onClick={scrollToBottom}
                  title="Scroll to bottom"
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                {/* Close Button */}
                <button 
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Discussion Stream */}
            <div 
              id="discussion-feed-container"
              ref={feedContainerRef}
              className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 scrollbar-none"
            >
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-emerald-600 animate-spin"></div>
                  <span className="text-xs font-semibold font-mono">Connecting Discussion Room...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-3">
                  <Users className="w-10 h-10 text-slate-300" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">No messages in discussion yet</p>
                    <p className="text-xs text-slate-500 mt-1">Start the conversation about civic issues in {communityName}!</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Pinned section indicator if pinned messages exist */}
                  {messages.some(m => m.isPinned) && (
                    <div className="flex items-center gap-1.5 px-1 py-0.5 mb-1 text-[10px] font-extrabold text-amber-600 uppercase tracking-wider bg-amber-50/50 border border-amber-100/40 rounded-lg max-w-max">
                      <Pin className="w-3.5 h-3.5 fill-amber-500 stroke-amber-600 shrink-0" />
                      <span>Pinned Announcements & Guidelines</span>
                    </div>
                  )}

                  {messages.map((msg) => {
                    const isCoordinator = msg.role === "Coordinator";
                    const isMe = msg.senderId === currentUser.id;
                    const hasLiked = msg.likedBy?.includes(currentUser.id);
                    const repliedMsg = msg.replyTo ? messages.find(m => m.id === msg.replyTo) : null;

                    return (
                      <div 
                        id={`discussion-msg-${msg.id}`}
                        key={msg.id}
                        className={`flex flex-col max-w-[85%] ${
                          msg.isPinned 
                            ? "border border-amber-200/60 bg-amber-50/20" 
                            : isCoordinator 
                              ? "bg-emerald-50/50 border border-emerald-100/60" 
                              : "bg-white border border-slate-100"
                        } rounded-2xl p-3.5 shadow-3xs transition-all relative group ${
                          isMe ? "self-end border-primary/20 bg-primary/5" : "self-start"
                        }`}
                      >
                        {/* Pinned visual flag */}
                        {msg.isPinned && (
                          <div className="absolute top-2.5 right-2.5 text-amber-500" title="Pinned Message">
                            <Pin className="w-3.5 h-3.5 fill-amber-500 stroke-amber-600" />
                          </div>
                        )}

                        {/* Reply Info Block */}
                        {repliedMsg && (
                          <div className="mb-2 px-2.5 py-1.5 bg-slate-100/80 rounded-lg text-[11px] text-slate-500 flex items-center gap-1.5 border-l-2 border-slate-400 font-medium">
                            <CornerDownRight className="w-3 h-3 text-slate-400" />
                            <span className="font-bold text-slate-700">{repliedMsg.sender}</span>
                            <span className="truncate max-w-[150px]">"{repliedMsg.message}"</span>
                          </div>
                        )}

                        {/* Header: Sender details */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <img 
                            src={msg.senderAvatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${msg.sender}`} 
                            alt={msg.sender} 
                            className="w-5 h-5 rounded-full bg-slate-200"
                            referrerPolicy="no-referrer"
                          />
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {msg.sender} {isMe && "(You)"}
                          </span>
                          
                          {/* Role Badge */}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold uppercase tracking-wide border ${
                            isCoordinator 
                              ? "bg-blue-50/80 text-blue-600 border-blue-100" 
                              : "bg-slate-100 text-slate-500 border-slate-200/50"
                          }`}>
                            {isCoordinator ? "Coordinator" : "Citizen"}
                          </span>

                          <span className="text-[10px] text-slate-400 font-mono ml-auto pr-4">
                            {formatTimestamp(msg.timestamp)}
                          </span>
                        </div>

                        {/* Message body text */}
                        <p className={`text-[13px] leading-relaxed whitespace-pre-wrap ${
                          isCoordinator ? "text-slate-850 font-medium" : "text-slate-600"
                        }`}>
                          {msg.message}
                        </p>

                        {/* Actions bar (Like, Reply, Pin) */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100/50 flex items-center gap-3 text-slate-400 text-xs">
                          {/* Like button */}
                          <button 
                            onClick={() => handleLikeMessage(msg.id)}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                              hasLiked 
                                ? "text-emerald-600 bg-emerald-50" 
                                : "hover:text-emerald-600 hover:bg-slate-50"
                            }`}
                          >
                            <ThumbsUp className={`w-3.5 h-3.5 ${hasLiked ? "fill-emerald-600" : ""}`} />
                            <span className="font-bold font-mono text-[11px]">{msg.likes || 0}</span>
                          </button>

                          {/* Reply trigger button */}
                          <button 
                            onClick={() => setReplyTo(msg)}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:text-primary hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <CornerDownRight className="w-3.5 h-3.5" />
                            <span className="font-bold text-[11px]">Reply</span>
                          </button>

                          {/* Pin Toggle for Coordinators */}
                          {currentUser.isCoordinator && (
                            <button 
                              onClick={() => handleTogglePin(msg.id, msg.isPinned)}
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer ml-auto opacity-70 group-hover:opacity-100 ${
                                msg.isPinned 
                                  ? "text-amber-600 bg-amber-50" 
                                  : "hover:text-amber-600 hover:bg-slate-50"
                              }`}
                            >
                              <Pin className={`w-3.5 h-3.5 ${msg.isPinned ? "fill-amber-500" : ""}`} />
                              <span className="font-bold text-[11px]">
                                {msg.isPinned ? "Unpin" : "Pin"}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input & Form footer area */}
            <div className="p-4 border-t border-slate-100 bg-white shadow-md">
              <form onSubmit={handleSendMessage} className="flex flex-col gap-2.5">
                {/* Reply state preview */}
                {replyTo && (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 rounded-xl text-xs border border-slate-200">
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                      <span>Replying to <strong className="text-slate-800">{replyTo.sender}</strong>:</span>
                      <span className="truncate max-w-[200px] text-slate-500">"{replyTo.message}"</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setReplyTo(null)}
                      className="p-1 hover:bg-slate-200 rounded-full transition-all"
                    >
                      <X className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                )}

                {/* Main input layout */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative flex items-center">
                    <input 
                      type="text"
                      placeholder={
                        replyTo 
                          ? `Reply to ${replyTo.sender}...` 
                          : isAnnouncement 
                            ? "Write official announcement..." 
                            : "Share civic concern or update with residents..."
                      }
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      maxLength={400}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-4 py-3 text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-primary focus:bg-white text-slate-800 shadow-inner"
                    />
                  </div>

                  {/* Send Button */}
                  <button 
                    type="submit"
                    disabled={!inputText.trim()}
                    className="h-10 w-10 shrink-0 rounded-2xl bg-primary text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 shadow-md cursor-pointer disabled:opacity-50 disabled:scale-100"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </div>

                {/* Extras bar (Official Announcement toggle for Coordinator) */}
                {currentUser.isCoordinator && (
                  <div className="flex items-center gap-2 px-1">
                    <label className="flex items-center gap-2 text-[11px] text-slate-600 font-bold cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={isAnnouncement}
                        onChange={(e) => setIsAnnouncement(e.target.checked)}
                        className="rounded-sm border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                      />
                      <span className="flex items-center gap-1">
                        <Megaphone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        Post as official announcement (will be pinned)
                      </span>
                    </label>
                  </div>
                )}
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
