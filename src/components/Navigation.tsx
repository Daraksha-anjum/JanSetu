import React from "react";
import { Home, Map, Camera, Users, User } from "lucide-react";

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navigation({ activeTab, setActiveTab }: NavigationProps) {
  const tabs = [
    { id: "feed", label: "Feed", icon: Home },
    { id: "map", label: "Map", icon: Map },
    { id: "report", label: "Report", icon: Camera, isCenter: true },
    { id: "community", label: "Community", icon: Users },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <div id="bottom-navigation" className="sticky bottom-0 bg-white border-t border-slate-100 px-4 py-2 flex justify-between items-center z-40 shadow-md pb-safe">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        if (tab.isCenter) {
          return (
            <button
              id={`nav-tab-${tab.id}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center justify-center -mt-6 bg-primary text-white rounded-full p-4 shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 border-4 border-white cursor-pointer"
            >
              <Icon className="w-6 h-6" />
              <span className="sr-only">{tab.label}</span>
            </button>
          );
        }

        return (
          <button
            id={`nav-tab-${tab.id}`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 cursor-pointer ${
              isActive 
                ? "text-primary font-display font-semibold scale-102" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "stroke-[2.2]" : "stroke-[1.6]"}`} />
            <span className="text-[10px] tracking-tight font-medium">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
