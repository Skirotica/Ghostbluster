GhostBluster

GhostBluster is a Chrome extension that helps job seekers detect ghost jobs — job postings that appear active but are unlikely to be filled — before applying.

It analyzes job descriptions, company signals, and publicly observable hiring behavior using a structured, pre-application scoring rubric. The goal is simple: save time, energy, and emotional bandwidth.

Features

Fast Scan
Quick vibe check while browsing job boards.

Deep Scan
Full analysis using a 3-layer, 100-point rubric:

Structural signals (role clarity, deliverables)

Org & market signals (hiring climate, team fit)

Public behavioral signals (posting freshness, engagement)

Pattern Scan (optional)
Analyze a company’s historical hiring behavior to spot habitual ghost-job posters.

Auto-extraction
Attempts to extract job title, company, posting age, and description from:

LinkedIn

Indeed

Glassdoor

Common ATS pages (Workday, Greenhouse, etc.)

☁️ Optional server-side AI analysis
Offloads deeper reasoning and pattern detection to a backend service.

How GhostBluster Works

GhostBluster evaluates jobs before you apply using only publicly observable signals.

Scoring Model (100 points total)
Layer	Description	Max
Layer 1	Structural signals	40
Layer 2	Org & market signals	35
Layer 3	Public behavioral signals	25

Ghost Probability = 100 − Total Score

Verdicts

0–39 → Likely Ghost Job → Skip

40–59 → Mixed Signals → Proceed cautiously

60–79 → Likely Real → Apply strategically

80–100 → Active Search → Apply

Project Structure
GhostBluster/
├── extension/
│   ├── manifest.json
│   ├── background.js
│   ├── contentScript.js
│   ├── popup.html
│   ├── popup.js
│   ├── styles.css
│   └── icons/
│       ├── 16.png
│       ├── 48.png
│       └── 128.png
└── server/              # Optional backend
    ├── index.js
    ├── package.json
    ├── .env
    └── README.md

🚀 Getting Started (Local Development)
1. Load the Chrome Extension

Open Chrome

Navigate to:

chrome://extensions/


Enable Developer Mode (top-right)

Click Load unpacked

Select the GhostBluster/extension folder

You should now see the GhostBluster icon in your toolbar.

2. Test the Extension

Navigate to a job posting (LinkedIn, Indeed, company site)

Click the GhostBluster icon

Click Scan This Job

Review the ghost probability, flags, and recommendation

If no job is detected, paste the job description manually and run a Deep Scan.

☁️ Optional: Running the Backend Server

The server enables deeper AI-based reasoning and cross-posting analysis.

Setup
cd GhostBluster/server
npm install


Create a .env file:

OPENAI_API_KEY=your_api_key_here
PORT=3001


Start the server:

npm start


Update the extension’s background.js to point to:

http://localhost:3001/api/analyze

Security Notes

Never commit your .env file

API keys live only on the server

The Chrome extension acts as a thin client

All job analysis is pre-application and privacy-preserving

Known Limitations

DOM extraction is best-effort and varies by site

LinkedIn frequently changes selectors

Public engagement signals are inferred unless server-backed

Ghost detection is probabilistic, not absolute

GhostBluster is designed to be conservative — if it’s unsure, it will tell you.

Roadmap Ideas

Inline badge overlay on job pages

Company “Ghost Job Index”

Local history + watchlist

Hiring-manager outreach generator

 Pattern detection across saved postings

 Automated regression tests for extractors

Contributing

This project started as an experiment in vibe coding and pragmatic agent design.
PRs, issues, and experiments welcome.

Philosophy

“The best job application is the one you never had to submit.”

GhostBluster exists to reduce wasted effort, false hope, and applicant fatigue — not to dunk on companies or recruiters.
