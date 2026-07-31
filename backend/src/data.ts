export type vidaCategory = "physical" | "social" | "cognitive" | "creative";

export type FriendSeed = {
  id: number;
  name: string;
  handle: string;
  avatar: string;
};

export type ActivitySeed = {
  id: number;
  title: string;
  description?: string;
  host: string;
  startsAt: string;
  location: string;
  lat: number;
  lng: number;
  durationMinutes: number;
  spots: number;
  priceSgd: number;
  rating: number;
  categories: vidaCategory[];
  isPremium: boolean;
  skillsFuturePayable?: boolean;
  isAAC?: boolean;
  imageUrls?: string[];
  tags: string[];
  participatingFriends: FriendSeed[];
};

export const friends: FriendSeed[] = [
  {
    id: 1,
    name: "Linda Tan",
    handle: "@lindatan",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=64&h=64&fit=crop&auto=format",
  },
  {
    id: 2,
    name: "Raymond Koh",
    handle: "@raymondkoh",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&auto=format",
  },
  {
    id: 3,
    name: "Susan Lim",
    handle: "@susanlim",
    avatar:
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=64&h=64&fit=crop&auto=format",
  },
  {
    id: 4,
    name: "David Ng",
    handle: "@davidng",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&auto=format",
  },
  {
    id: 5,
    name: "Mei Ling",
    handle: "@meiling",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&auto=format",
  },
  {
    id: 6,
    name: "James Ho",
    handle: "@jamesho",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&auto=format",
  },
  {
    id: 7,
    name: "Grace Wong",
    handle: "@gracewong",
    avatar:
      "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=64&h=64&fit=crop&auto=format",
  },
  {
    id: 8,
    name: "Peter Chia",
    handle: "@peterchia",
    avatar:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=64&h=64&fit=crop&auto=format",
  },
];

export const profile = {
  name: "Linda Tan",
  handle: "@lindatan",
  avatar:
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&h=160&fit=crop&auto=format",
  bio: "Retired teacher. Love Tai Chi, hiking, and cooking. Always looking for good company to explore Singapore with.",
  stats: [
    { value: "12", label: "Activities" },
    { value: "8", label: "Friends" },
    { value: "34", label: "Posts" },
  ],
};

export const activities: ActivitySeed[] = [
  {
    id: 1,
    title: "Tai Chi at Fort Canning",
    description:
      "A guided outdoor Tai Chi session focused on mobility, breath, and balance.",
    host: "Master Chen Wei",
    isPremium: true,
    imageUrls: [
      "https://images.unsplash.com/photo-1548957175-84f0f9af659e?w=400&h=220&fit=crop&auto=format",
    ],
    startsAt: "2026-06-27T07:00:00+08:00",
    location: "Fort Canning Park",
    lat: 1.295,
    lng: 103.8465,
    durationMinutes: 60,
    spots: 6,
    priceSgd: 12.6,
    rating: 4.9,
    categories: ["physical", "cognitive"],
    tags: ["Guided", "All levels"],
    participatingFriends: [friends[0], friends[2], friends[6]],
  },
  {
    id: 2,
    title: "Hawker Heritage Food Walk",
    description:
      "A small-group food walk through Chinatown stories, stalls, and tastings.",
    host: "Chef Mdm Siti",
    isPremium: true,
    imageUrls: [
      "https://images.unsplash.com/photo-1562593028-1fe2d15bde36?w=400&h=220&fit=crop&auto=format",
    ],
    startsAt: "2026-06-28T09:00:00+08:00",
    location: "Chinatown Complex",
    lat: 1.2823,
    lng: 103.8433,
    durationMinutes: 150,
    spots: 4,
    priceSgd: 24.5,
    rating: 5,
    categories: ["physical", "social", "creative"],
    tags: ["Tasting included", "Small group"],
    participatingFriends: [friends[4], friends[1]],
  },
  {
    id: 3,
    title: "Botanic Gardens Photography",
    description:
      "A practical photo walk for framing, light, and simple camera techniques.",
    host: "Raymond Koh",
    isPremium: true,
    skillsFuturePayable: true,
    imageUrls: [
      "https://images.unsplash.com/photo-1501554728187-ce583db33af7?w=400&h=220&fit=crop&auto=format",
    ],
    startsAt: "2026-06-29T07:30:00+08:00",
    location: "Singapore Botanic Gardens",
    lat: 1.3138,
    lng: 103.8159,
    durationMinutes: 90,
    spots: 8,
    priceSgd: 17.5,
    rating: 4.8,
    categories: ["physical", "cognitive", "creative"],
    tags: ["Camera tips", "Print included"],
    participatingFriends: [friends[1], friends[4], friends[0]],
  },
  {
    id: 4,
    title: "Morning Walk - East Coast Park",
    description:
      "A relaxed social walk along East Coast Park with an easy, friendly pace.",
    host: "David Ng",
    isPremium: false,
    startsAt: "2026-06-27T07:00:00+08:00",
    location: "East Coast Park",
    lat: 1.3008,
    lng: 103.9122,
    durationMinutes: 75,
    spots: 15,
    priceSgd: 0,
    rating: 4.7,
    categories: ["physical", "social"],
    tags: [],
    participatingFriends: [friends[3], friends[7], friends[1]],
  },
  {
    id: 5,
    title: "Senior Chess Club",
    description:
      "A casual chess meet-up for friendly games, puzzles, and conversation.",
    host: "James Ho",
    isPremium: false,
    startsAt: "2026-06-26T14:00:00+08:00",
    location: "Bishan Community Club",
    lat: 1.3508,
    lng: 103.8485,
    durationMinutes: 120,
    spots: 12,
    priceSgd: 0,
    rating: 4.6,
    categories: ["social", "cognitive"],
    tags: [],
    participatingFriends: [friends[5], friends[3]],
  },
  {
    id: 6,
    title: "Cantonese Cooking Class",
    description:
      "A hands-on Cantonese cooking class with practical kitchen guidance.",
    host: "Mdm Grace Wong",
    isPremium: false,
    skillsFuturePayable: true,
    startsAt: "2026-06-28T10:00:00+08:00",
    location: "Toa Payoh CC Kitchen",
    lat: 1.3343,
    lng: 103.8563,
    durationMinutes: 120,
    spots: 10,
    priceSgd: 15.4,
    rating: 4.9,
    categories: ["social", "cognitive", "creative"],
    tags: [],
    participatingFriends: [friends[6], friends[2], friends[4]],
  },
  {
    id: 7,
    title: "Kelong Fishing Day Trip",
    description:
      "A day trip for fishing, shared lunch, and stories by the water.",
    host: "Uncle Ravi",
    isPremium: true,
    startsAt: "2026-06-27T06:00:00+08:00",
    location: "Pulau Ubin Jetty",
    lat: 1.4022,
    lng: 103.9605,
    durationMinutes: 360,
    spots: 6,
    priceSgd: 31.5,
    rating: 4.8,
    categories: ["physical", "social", "cognitive"],
    tags: [],
    participatingFriends: [friends[0], friends[3]],
  },
  {
    id: 8,
    title: "Book Club - Cafe Meeting",
    description:
      "A cafe book club meet-up for thoughtful conversation and new friends.",
    host: "Linda Tan",
    isPremium: false,
    startsAt: "2026-06-26T15:30:00+08:00",
    location: "Tiong Bahru Bakery",
    lat: 1.2848,
    lng: 103.8329,
    durationMinutes: 90,
    spots: 10,
    priceSgd: 0,
    rating: 4.7,
    categories: ["social", "cognitive"],
    tags: [],
    participatingFriends: [friends[0], friends[6], friends[2]],
  },
];

export const groupChats = [
  {
    id: 1,
    name: "Tai Chi at Fort Canning",
    members: 14,
    avatar:
      "https://images.unsplash.com/photo-1548957175-84f0f9af659e?w=64&h=64&fit=crop&auto=format",
    lastMessage: "",
    time: "",
    unread: 0,
  },
  {
    id: 2,
    name: "East Coast Morning Walkers",
    members: 28,
    avatar:
      "https://images.unsplash.com/photo-1501554728187-ce583db33af7?w=64&h=64&fit=crop&auto=format",
    lastMessage: "",
    time: "",
    unread: 0,
  },
  {
    id: 3,
    name: "Botanic Gardens Photo Club",
    members: 11,
    avatar:
      "https://images.unsplash.com/photo-1629185752152-fe65698ddee4?w=64&h=64&fit=crop&auto=format",
    lastMessage: "",
    time: "",
    unread: 0,
  },
  {
    id: 4,
    name: "Cantonese Cooking Class",
    members: 9,
    avatar:
      "https://images.unsplash.com/photo-1659882751335-43e664461e6d?w=64&h=64&fit=crop&auto=format",
    lastMessage: "",
    time: "",
    unread: 0,
  },
  {
    id: 5,
    name: "Chinatown Hawker Walk",
    members: 16,
    avatar:
      "https://images.unsplash.com/photo-1562593028-1fe2d15bde36?w=64&h=64&fit=crop&auto=format",
    lastMessage: "",
    time: "",
    unread: 0,
  },
  {
    id: 6,
    name: "Senior Chess Club SG",
    members: 34,
    avatar:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=64&h=64&fit=crop&auto=format",
    lastMessage: "",
    time: "",
    unread: 0,
  },
  {
    id: 7,
    name: "Kelong Fishing Kakis",
    members: 8,
    avatar:
      "https://images.unsplash.com/photo-1502294624983-4ba589803a55?w=64&h=64&fit=crop&auto=format",
    lastMessage: "",
    time: "",
    unread: 0,
  },
  {
    id: 8,
    name: "Book Club - Cafe Meeting",
    members: 10,
    avatar:
      "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=64&h=64&fit=crop&auto=format",
    lastMessage: "",
    time: "",
    unread: 0,
  },
];

export const feedPosts = [
  {
    id: 1,
    user: "Linda Tan",
    handle: "@lindatan",
    minutesAgo: 120,
    caption:
      "Beautiful morning at Fort Canning with the Tai Chi group. The energy was just wonderful. See you all next Saturday!",
    image:
      "https://images.unsplash.com/photo-1548957175-84f0f9af659e?w=600&h=400&fit=crop&auto=format",
    comments: 2,
    activity: "Tai Chi at Fort Canning",
  },
  {
    id: 2,
    user: "Raymond Koh",
    handle: "@raymondkoh",
    minutesAgo: 1440,
    caption:
      "Caught the golden hour at the Botanic Gardens this morning. Who knew we had such beauty right here in Singapore.",
    image:
      "https://images.unsplash.com/photo-1629185752152-fe65698ddee4?w=600&h=400&fit=crop&auto=format",
    comments: 2,
    activity: "Botanic Gardens Photography",
  },
  {
    id: 3,
    user: "Grace Wong",
    handle: "@gracewong",
    minutesAgo: 2880,
    caption:
      "Our cooking class made the most amazing char kway teow from scratch. Everyone left with full stomachs and happy hearts.",
    image:
      "https://images.unsplash.com/photo-1659882751335-43e664461e6d?w=600&h=400&fit=crop&auto=format",
    comments: 2,
    activity: "Cantonese Cooking Class",
  },
  {
    id: 4,
    user: "David Ng",
    handle: "@davidng",
    minutesAgo: 4320,
    caption:
      "6km along East Coast Park. Perfect way to start the weekend. Who's joining us next Saturday? Drop your name below!",
    image:
      "https://images.unsplash.com/photo-1501554728187-ce583db33af7?w=600&h=400&fit=crop&auto=format",
    comments: 2,
    activity: "Morning Walk - East Coast Park",
  },
];

export const feedComments = [
  {
    postId: 1,
    handle: "@susanlim",
    body: "The breathing warm-up was my favourite part. Count me in next week.",
    minutesAgo: 78,
  },
  {
    postId: 1,
    handle: "@gracewong",
    body: "Such a peaceful start to the morning. Thank you for hosting.",
    minutesAgo: 64,
  },
  {
    postId: 2,
    handle: "@lindatan",
    body: "This photo is beautiful, Raymond. The light looks almost golden.",
    minutesAgo: 210,
  },
  {
    postId: 2,
    handle: "@meiling",
    body: "Please share your camera settings at the next session.",
    minutesAgo: 185,
  },
  {
    postId: 3,
    handle: "@davidng",
    body: "I can still smell the wok hei from that class.",
    minutesAgo: 430,
  },
  {
    postId: 3,
    handle: "@lindatan",
    body: "Grace, the sauce tip made all the difference. Mine finally tasted right.",
    minutesAgo: 415,
  },
  {
    postId: 4,
    handle: "@peterchia",
    body: "I am joining again. The sea breeze makes the distance feel easy.",
    minutesAgo: 790,
  },
  {
    postId: 4,
    handle: "@raymondkoh",
    body: "Saving my spot. I will bring a flask this time.",
    minutesAgo: 770,
  },
];

export const feedLikes = [
  {
    postId: 1,
    handles: ["@susanlim", "@gracewong", "@raymondkoh", "@test"],
  },
  {
    postId: 2,
    handles: ["@lindatan", "@meiling", "@test"],
  },
  {
    postId: 3,
    handles: ["@lindatan", "@davidng", "@susanlim"],
  },
  {
    postId: 4,
    handles: ["@peterchia", "@raymondkoh", "@test"],
  },
];

export const notifications = [
  {
    handle: "@lindatan",
    minutesAgo: 15,
    title: "Grace joined your walk",
    content: "Grace Wong joined Morning Walk - East Coast Park.",
    link: "/activities/4",
    read: false,
  },
  {
    handle: "@lindatan",
    minutesAgo: 180,
    title: "New comment",
    content: "Susan commented on your Tai Chi post.",
    link: "/feed",
    read: false,
  },
  {
    handle: "@lindatan",
    minutesAgo: 1500,
    title: "Activity reminder",
    content: "Botanic Gardens Photography starts tomorrow at 7:30 AM.",
    link: "/activities/3",
    read: true,
  },
  {
    handle: "@test",
    minutesAgo: 30,
    title: "Welcome to vida",
    content: "Your activity groups and feed updates will appear here.",
    link: "/activities",
    read: false,
  },
  {
    handle: "@test",
    minutesAgo: 240,
    title: "Tai Chi group update",
    content: "A new message was posted in Tai Chi at Fort Canning.",
    link: "/groups/1",
    read: true,
  },
];
