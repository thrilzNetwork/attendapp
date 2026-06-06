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
    slug: "the-12-questions-a-day-front-desk-problem",
    num: "01",
    category: "Operations",
    categoryColor: "#3B82F6",
    title: "The 12-Questions-a-Day Front Desk Problem",
    subtitle: "Why QR codes close the gap between guests and staff",
    problem: "Towels. WiFi. Late checkout. Parking. Breakfast. Checkout time. The same six questions, twice each, every shift. Why QR codes close the gap.",
    readingTime: "5 min",
    publishedDate: "2026-05-12",
    author: "Alejandro Soria",
    content: [
      "Every front desk agent knows the rhythm. The phone rings. A guest asks for towels. Another call: WiFi password. A third: what time is breakfast? You answer, you transfer, you note it on a sticky pad that disappears before shift change. Multiply that by every room, every day, and you've lost hours to questions that could answer themselves.",
      "The problem isn't the questions — it's the medium. Phone calls interrupt. Walk-ups require the guest to leave their room. Sticky notes get lost. The front desk becomes a switchboard instead of a service hub.",
      "QR codes change the math. A guest scans a code in their room — on the nightstand, the desk, the TV welcome screen. It opens a mobile web app. No download. No login. They tap what they need, type a message, or browse the menu. The request lands in the staff dashboard instantly.",
      "The numbers are real. Properties on Attenda see 73% faster response times on guest requests. The front desk stops answering the same question twelve times a day and starts resolving issues before guests have to ask twice.",
      "The key insight: guests don't want to call. They want to tap. Give them a tap interface, and they'll use it. Give them a phone number, and they'll call — interrupting whatever you're doing, every time.",
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
    slug: "why-we-killed-the-4-system-housekeeping-stack",
    num: "03",
    category: "Housekeeping",
    categoryColor: "#8B5CF6",
    title: "Why We Killed the 4-System Housekeeping Stack",
    subtitle: "The day the team stopped using three of them",
    problem: "Housekeeping in one app. Front desk in another. GM dashboard in a third. Guest requests in a fourth. The day the team stopped using three of them.",
    readingTime: "6 min",
    publishedDate: "2026-05-26",
    author: "Alejandro Soria",
    content: [
      "Walk into most independent hotels and count the software tabs open on the front desk browser. I've seen four. Sometimes five. One for PMS. One for housekeeping board. One for guest requests. One for the GM dashboard. One for vendor orders. Each one requires a login, a training session, and a mental context switch every time a guest asks for something.",
      "The breaking point came on a Monday morning. The housekeeping lead had her own tablet with her own app. The front desk had a different system. The GM had a third dashboard — for KPIs that were calculated from data that never made it out of the first two systems. Three systems, one property, one guest asking for extra pillows. It took four people and nine minutes to close the loop.",
      "Attenda consolidates everything into one thread. The guest requests towels → it appears on the staff dashboard → housekeeping accepts it → the status updates in real time → the GM sees response times on their screen. One system. One login. One training.",
      "The team stopped using three systems within the first week. The housekeeping tablet went back in its drawer. The guest request app went dormant. The GM stopped asking for reports because the data was already on their dashboard. One thread, every role, every room.",
      "If your team is juggling four systems right now, you're not running operations. You're running login screens.",
    ],
  },
  {
    slug: "the-ai-will-transform-hospitality-trap",
    num: "04",
    category: "Owner",
    categoryColor: "#F59E0B",
    title: "The 'AI Will Transform Hospitality' Trap",
    subtitle: "Three pitches, three contracts, three dashboards no one opened",
    problem: "Three pitches, three contracts, three dashboards no one opened. What the sales deck doesn't show you about contact with the front desk.",
    readingTime: "8 min",
    publishedDate: "2026-06-01",
    author: "Alejandro Soria",
    content: [
      "I've sat through every AI-in-hospitality demo. The chatbot that answers guest questions. The revenue optimizer that adjusts rates in real time. The predictive maintenance engine that catches problems before they happen. I signed three contracts. Three dashboards. None of them survived contact with the front desk.",
      "Here's what the sales deck doesn't tell you. AI is worthless if the data feeding it is bad. And in most independent hotels, the data is spread across four systems, written on sticky notes, or living in the shift lead's head. You can buy the smartest chatbot in the world — if it doesn't know whether Room 204 already got their towels, it's just a fancy voicemail system.",
      "The real gap in hotel tech isn't AI. It's operations data — capture, thread, visibility. Before you can predict anything, you need to know what's happening right now. That means one system where every guest request, every staff action, every vendor delivery lives.",
      "Attenda isn't an AI platform. It's an operations layer that generates clean data — every request, every response, every dollar — in a single thread. Once that thread exists, you can build anything on top of it. But you can't skip the thread and go straight to the prediction. That's what the sales deck doesn't show you.",
      "The next time a vendor pitches you AI, ask them one question: 'Where does the data come from?' If they can't answer with a system that's already running on your front desk, you're buying a dashboard no one will open.",
    ],
  },
  {
    slug: "the-ops-stack-gap-chains-vs-independents",
    num: "05",
    category: "Industry",
    categoryColor: "#6B7280",
    title: "The Ops Stack Gap: Chains vs. Independents",
    subtitle: "The six tools an independent hotel actually needs to compete in 2026",
    problem: "Chains can afford 8-figure PMS systems. Independents can't. The six tools an independent property actually needs to compete in 2026.",
    readingTime: "9 min",
    publishedDate: "2026-06-03",
    author: "Alejandro Soria",
    content: [
      "Marriott spends eight figures on their tech stack. Hilton spends more. They have dedicated IT teams, integration specialists, and a procurement process that takes eighteen months. Independent hotels — 60 rooms, 120 rooms, a GM who also does the scheduling and the purchasing — need something that works within the week.",
      "The gap isn't capability. It's integration. Chains buy best-in-class for every function — PMS here, CRM there, housekeeping board over here — and pay a team to glue them together. Independents buy one system, find out it doesn't do housekeeping well, buy a second, and end up with three logins for one shift.",
      "Here's what an independent hotel actually needs in 2026. One tool for guest requests and communication (QR code, no app). One tool for staff tasks and handoffs. One tool for vendor jobs and invoices. One tool for GM oversight and KPIs. One tool for knowledge and SOPs. And one tool that puts them all on one thread.",
      "That's Attenda. Six tools, one platform, weekly deployment cycle, no IT team required.",
      "The gap between chains and independents isn't going to close by buying more software. It closes by buying software that does more. Independent hotels don't need an 8-figure stack. They need a single thread that connects every role, every room, every shift.",
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
      "They deployed Attenda in February. QR codes in every room. Staff dashboard on the front desk tablet. Every request logged, timestamped, assigned. When a guest asked for towels at 3pm, it appeared on the screen. Someone accepted it. Someone delivered it. The guest saw the status update on their phone.",
      "By August, six months later, they were at 4.7 stars. The rooms hadn't changed. The staff hadn't changed. The breakfast was the same. The only thing that changed was the gap between request and response — from 'who knows' to '7 minutes and 14 seconds' average.",
      "The metric to watch isn't your average rating. It's your average response time. Improve that, and the stars follow.",
    ],
  },
];

export const featuredBlogPosts = blogPosts.map(({ slug, num, category, categoryColor, title, problem, readingTime, author }) => ({
  slug, num, category, categoryColor, title, problem, readingTime, author,
}));