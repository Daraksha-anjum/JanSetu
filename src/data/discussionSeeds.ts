export interface SeedMessage {
  id: string;
  message: string;
  sender: string;
  role: 'Citizen' | 'Coordinator';
  community: string;
  timestamp: string;
  likes: number;
  isPinned: boolean;
  replyTo?: string;
}

export const DISCUSSION_SEEDS: Record<string, SeedMessage[]> = {
  "Old Bowenpally": [
    {
      id: "obp_msg_1",
      message: "Has anyone else noticed that the massive pothole near Old Bowenpally Market Main Crossing is getting deeper after yesterday's rain? My scooter almost slipped.",
      sender: "Arun Kumar",
      role: "Citizen",
      community: "Old Bowenpally",
      timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      likes: 5,
      isPinned: false
    },
    {
      id: "obp_msg_2",
      message: "Yes Arun! It's completely filled with water, making it impossible to see how deep it is. Highly dangerous at night.",
      sender: "Divya Reddy",
      role: "Citizen",
      community: "Old Bowenpally",
      timestamp: new Date(Date.now() - 46 * 3600 * 1000).toISOString(),
      likes: 3,
      isPinned: false
    },
    {
      id: "obp_msg_3",
      message: "⚠️ OFFICIAL ANNOUNCEMENT: I have officially logged this with GHMC Road Maintenance Wing. The patching crew is assigned. Volunteers are placing caution reflective coning today.",
      sender: "Srinivas Raju",
      role: "Coordinator",
      community: "Old Bowenpally",
      timestamp: new Date(Date.now() - 42 * 3600 * 1000).toISOString(),
      likes: 12,
      isPinned: true
    },
    {
      id: "obp_msg_4",
      message: "Thanks Srinivas, that's reassuring. Let's put up temporary coning. I have spare markers in my store if needed.",
      sender: "Rajesh Sekhar",
      role: "Citizen",
      community: "Old Bowenpally",
      timestamp: new Date(Date.now() - 38 * 3600 * 1000).toISOString(),
      likes: 2,
      isPinned: false
    },
    {
      id: "obp_msg_5",
      message: "I'll join for coning. What time are we starting tomorrow? We need to keep drivers safe.",
      sender: "Meera Bai",
      role: "Citizen",
      community: "Old Bowenpally",
      timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      likes: 4,
      isPinned: false
    },
    {
      id: "obp_msg_6",
      message: "We're meeting near the market corner at 8:00 AM. Safety cones are ready. All hands welcome!",
      sender: "Srinivas Raju",
      role: "Coordinator",
      community: "Old Bowenpally",
      timestamp: new Date(Date.now() - 34 * 3600 * 1000).toISOString(),
      likes: 7,
      isPinned: false
    },
    {
      id: "obp_msg_7",
      message: "The streetlights near the same crossing are also flickering. It makes the pothole even harder to see.",
      sender: "Venkat Rao",
      role: "Citizen",
      community: "Old Bowenpally",
      timestamp: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
      likes: 6,
      isPinned: false
    },
    {
      id: "obp_msg_8",
      message: "Thanks for organizing this, Srinivas. This platform is incredibly helpful to coordinate action.",
      sender: "Sai Teja",
      role: "Citizen",
      community: "Old Bowenpally",
      timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      likes: 3,
      isPinned: false
    },
    {
      id: "obp_msg_9",
      message: "Excellent effort! Really grateful to the team for responding within hours.",
      sender: "Arun Kumar",
      role: "Citizen",
      community: "Old Bowenpally",
      timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      likes: 4,
      isPinned: false
    },
    {
      id: "obp_msg_10",
      message: "Official Update: Coning completed successfully! GHMC crew scheduled for Monday morning.",
      sender: "Srinivas Raju",
      role: "Coordinator",
      community: "Old Bowenpally",
      timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      likes: 15,
      isPinned: false
    }
  ],
  "New Bowenpally": [
    {
      id: "nbp_msg_1",
      message: "The waste accumulation near the colony entrance has started attracting so many stray dogs. The smell is awful.",
      sender: "Sandeep Kumar",
      role: "Citizen",
      community: "New Bowenpally",
      timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      likes: 4,
      isPinned: false
    },
    {
      id: "nbp_msg_2",
      message: "Completely agree. It hasn't been cleared for four days now. We need the green dumpster cleared.",
      sender: "Swathi Krishna",
      role: "Citizen",
      community: "New Bowenpally",
      timestamp: new Date(Date.now() - 46 * 3600 * 1000).toISOString(),
      likes: 3,
      isPinned: false
    },
    {
      id: "nbp_msg_3",
      message: "📢 UPDATE: Raised the solid waste dumpster clearance ticket with GHMC Sanitation division. Escalated to the zonal commissioner.",
      sender: "Ananya Rao",
      role: "Coordinator",
      community: "New Bowenpally",
      timestamp: new Date(Date.now() - 42 * 3600 * 1000).toISOString(),
      likes: 10,
      isPinned: true
    },
    {
      id: "nbp_msg_4",
      message: "Thanks Ananya! Let's make sure everyone upvotes the report on the feed so it stays high priority.",
      sender: "Harish Rao",
      role: "Citizen",
      community: "New Bowenpally",
      timestamp: new Date(Date.now() - 38 * 3600 * 1000).toISOString(),
      likes: 5,
      isPinned: false
    },
    {
      id: "nbp_msg_5",
      message: "Just verified and upvoted the report. Hopefully they send the loader tomorrow.",
      sender: "Priyanka Sen",
      role: "Citizen",
      community: "New Bowenpally",
      timestamp: new Date(Date.now() - 32 * 3600 * 1000).toISOString(),
      likes: 3,
      isPinned: false
    },
    {
      id: "nbp_msg_6",
      message: "Is anyone going to be there when the truck arrives? We should request them to clean the surrounding pavement too.",
      sender: "Naresh Naik",
      role: "Citizen",
      community: "New Bowenpally",
      timestamp: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
      likes: 2,
      isPinned: false
    },
    {
      id: "nbp_msg_7",
      message: "I will monitor the site when they arrive. They've scheduled the crew for tomorrow morning.",
      sender: "Ananya Rao",
      role: "Coordinator",
      community: "New Bowenpally",
      timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      likes: 6,
      isPinned: false
    },
    {
      id: "nbp_msg_8",
      message: "Thank you Ananya for always taking prompt action. Our lane will look much cleaner.",
      sender: "Swathi Krishna",
      role: "Citizen",
      community: "New Bowenpally",
      timestamp: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
      likes: 4,
      isPinned: false
    },
    {
      id: "nbp_msg_9",
      message: "The sanitation crew has just arrived! They are clearing the entire heap right now. Wonderful!",
      sender: "Sandeep Kumar",
      role: "Citizen",
      community: "New Bowenpally",
      timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      likes: 8,
      isPinned: false
    },
    {
      id: "nbp_msg_10",
      message: "Official Update: Sanitation truck completed clearing and disinfected the area with bleaching powder.",
      sender: "Ananya Rao",
      role: "Coordinator",
      community: "New Bowenpally",
      timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      likes: 12,
      isPinned: false
    }
  ],
  "Kukatpally": [
    {
      id: "kkp_msg_1",
      message: "The foam from the sewer line near Kukatpally Metro underpass is spreading. It's extremely slippery.",
      sender: "Naveen Goud",
      role: "Citizen",
      community: "Kukatpally",
      timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      likes: 6,
      isPinned: false
    },
    {
      id: "kkp_msg_2",
      message: "Yes, it looks chemical and smells very toxic. Pedestrians are having a hard time.",
      sender: "Kavitha Nair",
      role: "Citizen",
      community: "Kukatpally",
      timestamp: new Date(Date.now() - 46 * 3600 * 1000).toISOString(),
      likes: 5,
      isPinned: false
    },
    {
      id: "kkp_msg_3",
      message: "⚠️ PRE-MONSOON SEWER WARNING: Clean-out operations are active. Please avoid walking on the lower terrain underpass tonight.",
      sender: "Pranathi Reddy",
      role: "Coordinator",
      community: "Kukatpally",
      timestamp: new Date(Date.now() - 42 * 3600 * 1000).toISOString(),
      likes: 14,
      isPinned: true
    },
    {
      id: "kkp_msg_4",
      message: "Thanks for the warning. I usually walk that way. I'll take the metro footbridge instead.",
      sender: "Sai Teja",
      role: "Citizen",
      community: "Kukatpally",
      timestamp: new Date(Date.now() - 38 * 3600 * 1000).toISOString(),
      likes: 3,
      isPinned: false
    },
    {
      id: "kkp_msg_5",
      message: "Has this been reported to HMWS&SB Sewerage Operations? It needs high-pressure vacuum cleaners.",
      sender: "Divya Teja",
      role: "Citizen",
      community: "Kukatpally",
      timestamp: new Date(Date.now() - 34 * 3600 * 1000).toISOString(),
      likes: 4,
      isPinned: false
    },
    {
      id: "kkp_msg_6",
      message: "Yes, ticket registered. We've escalated this as a critical hazard since it's right near the metro walking lane.",
      sender: "Pranathi Reddy",
      role: "Coordinator",
      community: "Kukatpally",
      timestamp: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
      likes: 8,
      isPinned: false
    },
    {
      id: "kkp_msg_7",
      message: "Just upvoted the report. Let's make sure the ward officer sees the high verification count.",
      sender: "Mahesh Babu",
      role: "Citizen",
      community: "Kukatpally",
      timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      likes: 5,
      isPinned: false
    },
    {
      id: "kkp_msg_8",
      message: "The foaming is slowly reducing but the mud is still slick. Be careful everyone.",
      sender: "Kavitha Nair",
      role: "Citizen",
      community: "Kukatpally",
      timestamp: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
      likes: 3,
      isPinned: false
    },
    {
      id: "kkp_msg_9",
      message: "HMWS&SB vacuum team has reached the underpass. Suction and high-pressure washing are underway.",
      sender: "Pranathi Reddy",
      role: "Coordinator",
      community: "Kukatpally",
      timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      likes: 11,
      isPinned: false
    },
    {
      id: "kkp_msg_10",
      message: "Awesome! Can confirm they've cleared the toxic foam. Great job tracking this.",
      sender: "Naveen Goud",
      role: "Citizen",
      community: "Kukatpally",
      timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      likes: 13,
      isPinned: false
    }
  ],
  "Madhapur": [
    {
      id: "mdp_msg_1",
      message: "Traffic near the Hitec City underpass is completely jammed because of water logging. Avoid this route.",
      sender: "Nikhil Reddy",
      role: "Citizen",
      community: "Madhapur",
      timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      likes: 8,
      isPinned: false
    },
    {
      id: "mdp_msg_2",
      message: "Is the storm drain blocked again? It always happens even after slight showers.",
      sender: "Sneha Paul",
      role: "Citizen",
      community: "Madhapur",
      timestamp: new Date(Date.now() - 46 * 3600 * 1000).toISOString(),
      likes: 5,
      isPinned: false
    },
    {
      id: "mdp_msg_3",
      message: "📌 EMERGENCY DRILL: GHMC stormwater division is desilting the catch basins right now. One lane is closed for safety.",
      sender: "Kiran Goud",
      role: "Coordinator",
      community: "Madhapur",
      timestamp: new Date(Date.now() - 42 * 3600 * 1000).toISOString(),
      likes: 11,
      isPinned: true
    },
    {
      id: "mdp_msg_4",
      message: "Thanks for the update, Kiran. Good to know they are desilting before the monsoon picks up.",
      sender: "Pranav Shah",
      role: "Citizen",
      community: "Madhapur",
      timestamp: new Date(Date.now() - 38 * 3600 * 1000).toISOString(),
      likes: 6,
      isPinned: false
    },
    {
      id: "mdp_msg_5",
      message: "Is there a diversion route recommended for office goers?",
      sender: "Tarun Tej",
      role: "Citizen",
      community: "Madhapur",
      timestamp: new Date(Date.now() - 32 * 3600 * 1000).toISOString(),
      likes: 3,
      isPinned: false
    },
    {
      id: "mdp_msg_6",
      message: "Take the service road bypass near Novotel lane. It's relatively free.",
      sender: "Kiran Goud",
      role: "Coordinator",
      community: "Madhapur",
      timestamp: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
      likes: 8,
      isPinned: false
    },
    {
      id: "mdp_msg_7",
      message: "Just passed the underpass, the crew is working fast. Appreciate the real-time alerts here.",
      sender: "Sneha Paul",
      role: "Citizen",
      community: "Madhapur",
      timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      likes: 4,
      isPinned: false
    },
    {
      id: "mdp_msg_8",
      message: "Upvoted the drainage report. Let's keep monitoring the progress.",
      sender: "Rohit Sharma",
      role: "Citizen",
      community: "Madhapur",
      timestamp: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
      likes: 5,
      isPinned: false
    },
    {
      id: "mdp_msg_9",
      message: "Thanks everyone. This civic forum has made tracking Madhapur issues so much more efficient.",
      sender: "Shalini Sen",
      role: "Citizen",
      community: "Madhapur",
      timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      likes: 7,
      isPinned: false
    },
    {
      id: "mdp_msg_10",
      message: "Official Update: Storm drain block cleared. Water has receded, all lanes are now open.",
      sender: "Kiran Goud",
      role: "Coordinator",
      community: "Madhapur",
      timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      likes: 14,
      isPinned: false
    }
  ],
  "Gachibowli": [
    {
      id: "gcb_msg_1",
      message: "The entire stretch of streetlights near the Financial District park is pitch black tonight. Very unsafe.",
      sender: "Karthik Aryan",
      role: "Citizen",
      community: "Gachibowli",
      timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      likes: 7,
      isPinned: false
    },
    {
      id: "gcb_msg_2",
      message: "Yes, noticed this yesterday too. Elderly walkers are avoiding the park pavement completely.",
      sender: "Pooja Hegde",
      role: "Citizen",
      community: "Gachibowli",
      timestamp: new Date(Date.now() - 46 * 3600 * 1000).toISOString(),
      likes: 6,
      isPinned: false
    },
    {
      id: "gcb_msg_3",
      message: "🚨 SAFETY BULLET: Registered the cable fault with TSSPDCL electricity branch. Patrol team is dispatching to inspect.",
      sender: "Aarav Sharma",
      role: "Coordinator",
      community: "Gachibowli",
      timestamp: new Date(Date.now() - 42 * 3600 * 1000).toISOString(),
      likes: 13,
      isPinned: true
    },
    {
      id: "gcb_msg_4",
      message: "Excellent Aarav! The blind corners there are especially risky for vehicles turning fast.",
      sender: "Vinay Kumar",
      role: "Citizen",
      community: "Gachibowli",
      timestamp: new Date(Date.now() - 38 * 3600 * 1000).toISOString(),
      likes: 4,
      isPinned: false
    },
    {
      id: "gcb_msg_5",
      message: "Just added my verification on the report card. Everyone please confirm to elevate priority.",
      sender: "Yamini Reddy",
      role: "Citizen",
      community: "Gachibowli",
      timestamp: new Date(Date.now() - 32 * 3600 * 1000).toISOString(),
      likes: 5,
      isPinned: false
    },
    {
      id: "gcb_msg_6",
      message: "TSSPDCL crew is on site right now! They've opened the feeder pillar panel.",
      sender: "Vinay Kumar",
      role: "Citizen",
      community: "Gachibowli",
      timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      likes: 6,
      isPinned: false
    },
    {
      id: "gcb_msg_7",
      message: "Thanks for the on-ground update, Vinay. They found a short circuit in the underground cable armoring.",
      sender: "Aarav Sharma",
      role: "Coordinator",
      community: "Gachibowli",
      timestamp: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
      likes: 7,
      isPinned: false
    },
    {
      id: "gcb_msg_8",
      message: "Wonderful. Lights are flickering back on now. Thank you TSSPDCL and Aarav!",
      sender: "Pooja Hegde",
      role: "Citizen",
      community: "Gachibowli",
      timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      likes: 9,
      isPinned: false
    },
    {
      id: "gcb_msg_9",
      message: "Brilliant response. Walkway feels safe again.",
      sender: "Karthik Aryan",
      role: "Citizen",
      community: "Gachibowli",
      timestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      likes: 4,
      isPinned: false
    },
    {
      id: "gcb_msg_10",
      message: "Official Update: Repair complete. All 12 streetlight poles are fully illuminated.",
      sender: "Aarav Sharma",
      role: "Coordinator",
      community: "Gachibowli",
      timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      likes: 16,
      isPinned: false
    }
  ],
  "Secunderabad": [
    {
      id: "scb_msg_1",
      message: "The water pipeline near the reservoir junction is leaking fresh drinking water for two days now.",
      sender: "Raghavan Iyer",
      role: "Citizen",
      community: "Secunderabad",
      timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      likes: 8,
      isPinned: false
    },
    {
      id: "scb_msg_2",
      message: "Thousands of gallons of clean drinking water are going down the drain. It's heartbreaking.",
      sender: "Manisha Roy",
      role: "Citizen",
      community: "Secunderabad",
      timestamp: new Date(Date.now() - 46 * 3600 * 1000).toISOString(),
      likes: 7,
      isPinned: false
    },
    {
      id: "scb_msg_3",
      message: "💧 WATER EMERGENCY: Joint rupture confirmed. HMWS&SB repair teams are closing the main supply valve to begin welding.",
      sender: "Vikram Malhotra",
      role: "Coordinator",
      community: "Secunderabad",
      timestamp: new Date(Date.now() - 42 * 3600 * 1000).toISOString(),
      likes: 15,
      isPinned: true
    },
    {
      id: "scb_msg_4",
      message: "Thanks Vikram. Will this affect our domestic water supply hours tomorrow?",
      sender: "Bala Krishna",
      role: "Citizen",
      community: "Secunderabad",
      timestamp: new Date(Date.now() - 38 * 3600 * 1000).toISOString(),
      likes: 4,
      isPinned: false
    },
    {
      id: "scb_msg_5",
      message: "Yes, expect a 2-hour delay in supply tomorrow morning while pressure stabilizes.",
      sender: "Vikram Malhotra",
      role: "Coordinator",
      community: "Secunderabad",
      timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      likes: 9,
      isPinned: false
    },
    {
      id: "scb_msg_6",
      message: "Thanks for the early warning. Let me store some water tonight.",
      sender: "Manisha Roy",
      role: "Citizen",
      community: "Secunderabad",
      timestamp: new Date(Date.now() - 32 * 3600 * 1000).toISOString(),
      likes: 5,
      isPinned: false
    },
    {
      id: "scb_msg_7",
      message: "The excavation team has reached. They are digging up the red soil near the valve.",
      sender: "Yamini Reddy",
      role: "Citizen",
      community: "Secunderabad",
      timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      likes: 6,
      isPinned: false
    },
    {
      id: "scb_msg_8",
      message: "The team is working on the main weld joint now. It should be completed by late evening.",
      sender: "Vikram Malhotra",
      role: "Coordinator",
      community: "Secunderabad",
      timestamp: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
      likes: 8,
      isPinned: false
    },
    {
      id: "scb_msg_9",
      message: "Great tracking by our coordinator. Saved so much precious drinking water!",
      sender: "Raghavan Iyer",
      role: "Citizen",
      community: "Secunderabad",
      timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      likes: 10,
      isPinned: false
    },
    {
      id: "scb_msg_10",
      message: "Official Update: Welding successfully completed! Main distributor pipeline is reinforced and supply valve is restored.",
      sender: "Vikram Malhotra",
      role: "Coordinator",
      community: "Secunderabad",
      timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      likes: 18,
      isPinned: false
    }
  ]
};
