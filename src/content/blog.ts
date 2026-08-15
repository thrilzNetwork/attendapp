export interface BlogPost {
  slug: string;
  num: string;
  category: string;
  categoryColor: string;
  title: string;
  subtitle: string;
  problem: string;
  readingTime: string;
  content: string[];
  author: string;
  publishedDate: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "hotels-dont-have-an-information-problem",
    num: "01",
    category: "Operations",
    categoryColor: "#3B82F6",
    title: "Hotels Don't Have an Information Problem",
    subtitle: "They have an organization problem",
    problem: "Your team already creates everything you need to run the hotel. It's just scattered across apps, paper, radios, and people's heads.",
    readingTime: "5 min",
    publishedDate: "2026-05-12",
    author: "Alejandro Soria",
    content: [
      "Walk any independent hotel at 9am and you'll find the information already exists. Housekeeping knows which rooms are turned. The front desk knows who checked in late. The shuttle driver knows the airport is backed up. A supervisor knows the ice machine is down again. None of it is missing. It's just scattered.",
      "That's the real problem. Not a lack of information — a lack of organization. Schedules live in one app, checklists in a binder, SOPs in a manager's head, requests on a sticky note that disappears at shift change. Everyone is holding a piece, and no one can see the whole.",
      "So the manager spends the day chasing answers instead of making decisions. 'Did 214 get their towels?' 'Who closed the cash drawer?' 'Is the shuttle running?' Every answer requires a phone call, a radio, or a walk down the hall.",
      "Attenda's job is unglamorous and essential: put the information your team already creates somewhere everyone can actually use it. Requests, tasks, schedules, transportation, knowledge — one place, updated as the work happens. Not more data. Organized data.",
      "The test is simple. When the GM is off-property and wants to know how the day is going, can they see it in ten seconds — or do they have to call someone? If it's the phone call, you don't have an information problem. You have an organization problem.",
    ],
  },
  {
    slug: "cruise-day-shuttle-the-dollar7820-line-item",
    num: "02",
    category: "Revenue",
    categoryColor: "#0D9488",
    title: "Cruise-Day Shuttle: the $7,820 Line Item",
    subtitle: "How a 121-room boutique captured shuttle revenue in four months",
    problem: "How a 121-room boutique captured $7,820 in four months from cruise-day shuttle bookings — the math, the UI, the cruise calendar integration.",
    readingTime: "7 min",
    publishedDate: "2026-05-19",
    author: "Alejandro Soria",
    content: [
      "Port Everglades. PortMiami. Cape Canaveral. If your property is within 20 miles of a cruise port, you're leaving money on the table every week.",
      "Here's the math. A 121-room boutique hotel near PortMiami started tracking shuttle bookings through Attenda in February. By June — four months — they'd booked $7,820 in shuttle revenue. Not projected. Not estimated. Actual, trackable, attributable revenue.",
      "How? The shuttle booking form lives inside the guest QR code app. Guests tap 'Transport', pick a time, choose airport or cruise port, and confirm. The request hits the staff dashboard. The driver sees it on their phone. No phone calls. No 'I asked three hours ago'. No missed pickups.",
      "The cruise calendar integration is key. The hotel syncs cruise ship arrival dates — PortMiami publishes them months in advance. When a guest books during a cruise window, the shuttle is already factored into staffing. The hotel doesn't guess how many drivers they need. They know.",
      "Seven thousand, eight hundred and twenty dollars. From one feature, in one property, in four months. No new staff. No new vehicle. Just a QR code and a form that replaces the 'do you have a shuttle?' phone call that happens 40 times a day.",
    ],
  },
  {
    slug: "stop-answering-wheres-the-shuttle",
    num: "03",
    category: "Transportation",
    categoryColor: "#0EA5E9",
    title: "Stop Answering 'Where's the Shuttle?'",
    subtitle: "The one question that eats a front desk shift",
    problem: "A guest lands, calls the front desk, asks where the shuttle is. Multiply by every arrival. Live GPS answers it before the phone rings.",
    readingTime: "6 min",
    publishedDate: "2026-05-26",
    author: "Alejandro Soria",
    content: [
      "The guest exits the airport, looks around, checks their phone, and calls the hotel. The front desk agent — mid-check-in with another guest — puts them on hold to radio the driver. The driver is in traffic and can't answer. Another call comes in: same question. This happens all day, every arrival day.",
      "Nobody in that chain has the information they need. The guest doesn't know where the shuttle is. The front desk doesn't know where the shuttle is. Only the driver knows, and he's driving.",
      "Attenda closes the loop with live GPS. Through the Bouncie integration, the shuttle's real-time location, speed, and ETA are visible — to the guest on their phone, to staff on the dashboard, and to the manager watching the day. When the shuttle is half a mile out, everyone knows.",
      "The result isn't just fewer phone calls. It's coordination. Staff stage arrivals around real ETAs instead of guesses. Dispatch stops being a person shouting into a radio. And the guest waiting at the curb sees '4 minutes away' instead of wondering if they've been forgotten.",
      "Transportation is where independent hotels quietly lose guest confidence — and where a little visibility goes a long way. Stop answering 'where's the shuttle?' Give guests and staff the answer before the question.",
    ],
  },
  {
    slug: "ai-that-knows-when-not-to-guess",
    num: "04",
    category: "AI",
    categoryColor: "#F59E0B",
    title: "AI That Knows When Not to Guess",
    subtitle: "Assistance, not autonomy — and why that's the point",
    problem: "The dangerous AI in a hotel isn't the one that's wrong. It's the one that's confidently wrong. Attenda's assistant escalates instead of guessing.",
    readingTime: "6 min",
    publishedDate: "2026-06-01",
    author: "Alejandro Soria",
    content: [
      "Every AI-in-hospitality pitch promises the same thing: the software will run your hotel. Answer the guests, optimize the rates, manage the team. I've signed those contracts. The problem was never that the AI was wrong sometimes. It was that it was confidently wrong — and a hotel runs on trust.",
      "Attenda takes the opposite stance. The AI is an assistant to the operation, not the authority over it. It answers from what the hotel has actually approved — your SOPs, your procedures, your property knowledge. It can take a call, answer a common question, and route the rest to the right person.",
      "The most important thing it does is know its limits. When the answer isn't in the approved knowledge, it doesn't invent one. It hands off to a manager. 'AI that knows when not to guess' isn't a limitation — it's the whole point. Managers still decide. People still own the operation.",
      "That's also why the human input matters. Your team completes the checklists, logs the requests, records what happened. The AI organizes and surfaces that — it doesn't replace it. The magic isn't automation pretending to run a hotel. It's making the knowledge your people already have easy to reach.",
      "Ask any AI vendor one question: what happens when it doesn't know? If the answer is 'it answers anyway,' walk away. In a hotel, a confident wrong answer costs you a guest.",
    ],
  },
  {
    slug: "when-a-hotel-needs-a-manager-not-more-software",
    num: "05",
    category: "Management",
    categoryColor: "#6B7280",
    title: "When a Hotel Needs a Manager, Not More Software",
    subtitle: "The case for fractional hotel management",
    problem: "Sometimes the software isn't the problem — execution is. For qualified properties, a certified operator can run the operation on the platform.",
    readingTime: "6 min",
    publishedDate: "2026-06-03",
    author: "Alejandro Soria",
    content: [
      "There's a point some independent properties hit where more software won't help. The tools are fine. The problem is that no one on-site has the time — or the training — to run the operation the way it needs to be run. The owner is remote. The GM seat is empty or stretched thin. The team is doing its best without a captain.",
      "Software alone doesn't run a hotel. People do. That's not a knock on the technology — it's the reason the technology matters. A platform is only as good as the operator using it.",
      "So for qualified properties, Attenda can place a fractional hotel manager: a certified Attenda operator who runs the operation on the platform alongside your team. Not a consultant who writes a report and leaves. An operator who owns the daily execution — checklists, cash, transportation, guest recovery, staff accountability — using the same system your team sees.",
      "'Certified' matters here. These operators are trained across models — limited-service, extended-stay, full-service, boutique — because a select-service airport hotel and a boutique cruise-port property don't run the same way. The same operational problems appear in different clothes, and an operator who's seen them all closes the gap faster.",
      "This isn't for everyone, and it isn't meant to be. It's a premium engagement for properties that need execution, not just tools. If that's your situation, the question isn't which software to buy. It's who's going to run it.",
    ],
  },
  {
    slug: "from-3-8-to-4-7-stars-a-six-month-turnaround",
    num: "06",
    category: "Reviews",
    categoryColor: "#10B981",
    title: "From 3.8 to 4.7 Stars: a Six-Month Turnaround",
    subtitle: "The problem was never the rooms — it was the response time",
    problem: "The problem was never the rooms. It was the gap between 'I need towels' and 'towels arrived.' The fix, the timeline, the metric to watch.",
    readingTime: "5 min",
    publishedDate: "2026-06-05",
    author: "Alejandro Soria",
    content: [
      "A 72-room property in Florida was stuck at 3.8 stars on Google. The rooms were clean. The staff was friendly. The breakfast was solid. But the reviews kept saying the same thing: 'Asked for towels at 3pm. Never got them.' 'Called front desk three times about the A/C.' 'Waited 45 minutes for someone to bring a rollaway.'",
      "The problem wasn't the staff. It was the gap between request and response. Guests called the front desk. The front desk wrote it on a sticky note. The sticky note got lost during shift change. The next shift didn't know about it. The guest left a 2-star review.",
      "They deployed Attenda in February. Guests reached the hotel through its own welcome touchpoints — a link, a QR, at check-in — no app required. Staff dashboard on the front desk tablet. Every request logged, timestamped, assigned. When a guest asked for towels at 3pm, it appeared on the screen. Someone accepted it. Someone delivered it. The guest saw the status update on their phone.",
      "By August, six months later, they were at 4.7 stars. The rooms hadn't changed. The staff hadn't changed. The breakfast was the same. The only thing that changed was the gap between request and response — from 'who knows' to '7 minutes and 14 seconds' average.",
      "The metric to watch isn't your average rating. It's your average response time. Improve that, and the stars follow.",
    ],
  },
];

export const featuredBlogPosts = blogPosts.map(({ slug, num, category, categoryColor, title, problem, readingTime, author }) => ({
  slug, num, category, categoryColor, title, problem, readingTime, author,
}));

export const presenceBlogPost: BlogPost = {
  slug: "attenda-presence-never-a-silent-front-desk",
  num: "07",
  category: "Product",
  categoryColor: "#0D9488",
  title: "Attenda Presence: Never a Silent Front Desk",
  subtitle: "The two-sided realtime system for single-coverage hotels",
  problem: "One desk, one staff member, twelve reasons to step away — and no way for guests to know. The fix is Presence: a kiosk display, a phone console, and a log that never lies.",
  readingTime: "6 min",
  publishedDate: "2026-08-08",
  author: "Alejandro Soria",
  content: [
    "Most independent hotels run single-coverage front desks. One person. One shift. One desk. That person checks guests in, answers the phone, calls housekeeping, restocks the lobby, walks the property, and takes their break. When they step away — for any reason — the desk is empty. The guest who walks up sees no one. They wait. They leave. They leave a review.",
    "The problem isn't that staff step away. They should. They have to. The problem is that the desk goes silent. No sign, no countdown, no way to ask for help. The guest stands there guessing whether someone is coming back in thirty seconds or thirty minutes.",
    "Attenda Presence fixes this with two devices and one realtime channel. A kiosk-locked tablet sits on the front desk. When staff is there, it shows an ambient screen — a clock, hotel info, rotating promos. When staff steps away, the display switches: an amber bar appears with a clear message, a reason, a live countdown, and a button to request assistance. The guest always knows the state of the desk.",
    "On the staff side, a phone app. One tap to step away — pick a reason (towels, guest assist, restock, property walk, break), pick a duration. The display updates in under a second. If a guest taps the assistance button while the desk is unattended, the staff member's phone vibrates immediately. They acknowledge it, head back, and the event is logged.",
    "The key design decision: guests never see 'overdue.' The countdown on the guest display floors at zero. If staff is late, the bar stays at 0:00. Overdue is a staff and admin concept — it shows in red on the phone console and in the admin dashboard, never on the guest-facing screen. Guests see calm. Staff see accountability.",
    "Every away session is logged server-side. Who stepped away, when, for how long, the reason, the estimated duration, the actual duration, and whether it ran overdue. Assist requests are timestamped — when the guest asked, when staff acknowledged, when it was resolved. This is labor-adjacent data, visible to GMs and owners, not to other staff.",
    "The display is offline-safe. If the network drops, it keeps functioning locally — it caches the last state, queues any assistance taps, and delivers them when the connection returns. No error states visible to guests. The service worker handles it. Staff see 'display offline' on their phone if the heartbeat is missed.",
    "We're building this for the properties that run lean. The ones where one person holds the desk and every minute away is a minute the guest notices. Presence doesn't add staff. It makes the staff you have visible — to guests, to themselves, and to the people managing the property.",
  ],
};