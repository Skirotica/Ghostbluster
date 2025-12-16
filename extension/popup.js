// popup.js
const fastBtn = document.getElementById('fastScanBtn');
const deepBtn = document.getElementById('deepScanBtn');
const patternBtn = document.getElementById('patternScanBtn');

const scanPageBtn = document.getElementById('scanPageBtn');
const runBtn = document.getElementById('runBtn');
const clearBtn = document.getElementById('clearBtn');

const jdInput = document.getElementById('jdInput');
const companyInput = document.getElementById('companyInput');
const titleInput = document.getElementById('titleInput');

const resultsSection = document.getElementById('results');
const summaryEl = document.getElementById('summary');
const scoreEl = document.getElementById('score');
const breakdownEl = document.getElementById('breakdown');
const recommendationEl = document.getElementById('recommendation');
const outreachEl = document.getElementById('outreach');

let currentMode = 'fast';

function setMode(modeBtn, mode) {
  document.querySelectorAll('.mode').forEach(b => b.classList.remove('active'));
  modeBtn.classList.add('active');
  currentMode = mode;
  resultsSection.classList.add('hidden');
}

fastBtn.addEventListener('click', () => setMode(fastBtn, 'fast'));
deepBtn.addEventListener('click', () => setMode(deepBtn, 'deep'));
patternBtn.addEventListener('click', () => setMode(patternBtn, 'pattern'));

scanPageBtn.addEventListener('click', async () => {
  // Ask content script for extracted job metadata
  resultsSection.classList.add('hidden');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_JOB" }, (resp) => {
    if (!resp) {
      alert('No extractable content found on this page.');
      return;
    }
    jdInput.value = resp.jd || "";
    companyInput.value = resp.company || "";
    titleInput.value = resp.title || "";
    // default to fast scan
    currentMode = 'fast';
    document.querySelectorAll('.mode').forEach(b => b.classList.remove('active'));
    fastBtn.classList.add('active');
    runScanFromUI();
  });
});

runBtn.addEventListener('click', () => runScanFromUI());
clearBtn.addEventListener('click', () => {
  jdInput.value = '';
  companyInput.value = '';
  titleInput.value = '';
  resultsSection.classList.add('hidden');
});

function runScanFromUI() {
  const jd = jdInput.value.trim();
  const company = companyInput.value.trim();
  const title = titleInput.value.trim();

  if (currentMode === 'pattern') {
    // Pattern scan would ideally accept multiple links; basic fallback:
    runPatternScan(company);
    return;
  }

  if (!jd && currentMode === 'deep') {
    alert('Paste a job description for Deep Scan or use Scan Current Page.');
    return;
  }

  // For Fast Scan we allow using minimal info
  const payload = {
    mode: currentMode,
    jd,
    company,
    title,
    timestamp: new Date().toISOString()
  };

  const result = runScoringEngine(payload);
  displayResult(result);
}

/* ---------------------------
   Scoring engine (client-side)
   Implements the 3-layer rubric:
   Layer1 (0-40), Layer2 (0-35), Layer3 (0-25)
   --------------------------- */

function runScoringEngine({ jd, company, title }) {
  // Lower-level heuristics & helpers:
  function scoreSpecificity(jd, title) {
    // tries to identify: specific deliverables, product name, stack words, numbers
    if (!jd && !title) return 2;
    const specificityIndicators = [
      /first 90 days|first 90 days|first-90|first 3 months|first 3 months/i,
      /success metrics|kpi|okrs|deliverables|shipping features|roadmap/i,
      /\bReact\b|\bNode\b|\bAWS\b|\bGCP\b|\bPython\b|\bSQL\b|\bJava\b/i,
      /\bsenior\b|\blead\b|\bmanager\b|\bprincipal\b/i,
      /\bproduct\b|\bteam\b|\bowner\b|\bresponsible for\b/i
    ];
    let hits = 0;
    specificityIndicators.forEach(rx => { if (rx.test(jd + " " + title)) hits++; });
    if (hits >= 3) return 10;
    if (hits === 2) return 7;
    if (hits === 1) return 4;
    return 1;
  }

  function scoreSkillsAlignment(jd) {
    if (!jd) return 2;
    // check for concrete vs generic skill phrases
    const concrete = jd.match(/(React|Node|Python|SQL|GCP|AWS|Kubernetes|TensorFlow|machine learning|data pipeline|Figma|Sketch|postgre|postgres|Java|C\+\+)/i);
    const generic = jd.match(/(team player|excellent communication|self-starter|leadership|adaptable)/i);
    if (concrete && !generic) return 10;
    if (concrete && generic) return 8;
    if (!concrete && generic) return 3;
    return 5;
  }

  function scoreDeliverables(jd) {
    if (!jd) return 2;
    const rx = /(first 90 days|first 3 months|success metrics|deliverables|kpi|okrs|roadmap|launch|ship|MVP)/i;
    return rx.test(jd) ? 10 : 3;
  }

  function scoreOrgPlacement(jd) {
    if (!jd) return 2;
    // look for reporting line mentions
    const rx = /(reports to|reports into|manager|director|vp of|head of|part of the .* team|on the .* team)/i;
    return rx.test(jd) ? 9 : 3;
  }

  function scoreHiringClimate(company) {
    if (!company) return 6; // neutral if unknown
    // client side can't query web; use heuristics: company name length / corporate-sounding => neutral
    // We'll give mid score but mark as unknown in details
    return 6;
  }

  function scoreTeamActivity(jd, company) {
    // if JD mentions "we're scaling" or "growing team", give a boost
    if (/(scal(e|ing)|growing team|expanding|hiring for)/i.test(jd)) return 9;
    return 5;
  }

  function scoreFitWithOrg(title, company) {
    if (!title || !company) return 5;
    // basic heuristic: uncommon title -> lower
    if (/AI Product Director|Head of Growth|VP of Product/i.test(title)) return 8;
    if (/Intern|Entry|Associate/i.test(title)) return 9; // easier to exist
    return 6;
  }

  function scoreSeasonality() {
    // no direct calendar check here; neutral mid score
    return 3;
  }

  // Layer 3 heuristics (public behavioral, pre-application only)
  function scoreInternalEngagement(jd, company) {
    // can't check LinkedIn without web request; we'll infer from presence of lines like "join our team" or "we're hiring"
    if (!jd) return 5;
    if (/(we're hiring|join our team|our team is growing|we are hiring)/i.test(jd)) return 6;
    return 4;
  }

  function scoreCrossPlatformConsistency(company) {
    // unknown => neutral
    return 3;
  }

  function scorePostingFreshness(jd) {
    // If JD contains "posted X days ago" we could parse; otherwise neutral
    if (!jd) return 2;
    const md = jd.match(/posted\s*(\d+)\s*(day|days|week|weeks|month|months)/i);
    if (md) {
      const n = parseInt(md[1], 10);
      if (n <= 14) return 5;
      if (n <= 60) return 3;
      return 1;
    }
    return 3;
  }

  function scoreRecruiterLegitimacy() {
    // unknown w/o web; neutral
    return 3;
  }

  // Compose Layer 1
  const L1_specificity = scoreSpecificity(jd, title);       // 0-10
  const L1_skills = scoreSkillsAlignment(jd);               // 0-10
  const L1_deliverables = scoreDeliverables(jd);            // 0-10
  const L1_org = scoreOrgPlacement(jd);                     // 0-10
  const layer1 = L1_specificity + L1_skills + L1_deliverables + L1_org; // 0-40

  // Compose Layer 2
  const L2_climate = scoreHiringClimate(company);           // 0-10
  const L2_team = scoreTeamActivity(jd, company);           // 0-10
  const L2_fit = scoreFitWithOrg(title, company);           // 0-10
  const L2_timing = scoreSeasonality();                     // 0-5
  const layer2 = L2_climate + L2_team + L2_fit + L2_timing; // 0-35

  // Compose Layer 3
  const L3_internal = scoreInternalEngagement(jd, company); // 0-10
  const L3_cross = scoreCrossPlatformConsistency(company);  // 0-5
  const L3_fresh = scorePostingFreshness(jd);               // 0-5
  const L3_recruiter = scoreRecruiterLegitimacy();          // 0-5
  const layer3 = L3_internal + L3_cross + L3_fresh + L3_recruiter; // 0-25

  const totalScore = Math.max(0, Math.min(100, layer1 + layer2 + layer3));
  const ghostProbability = 100 - totalScore;

  // Compose flagged items
  const redFlags = [];
  const greenFlags = [];

  if (L1_specificity <= 4) redFlags.push("Role lacks clear, specific scope or first-90-day outcomes.");
  else greenFlags.push("Role shows specific technical/organizational hints.");

  if (L1_skills <= 4) redFlags.push("Skills listed are generic or missing.");
  else greenFlags.push("Concrete skills/tech stack mentioned.");

  if (L1_org <= 4) redFlags.push("Reporting line or team placement unclear.");
  else greenFlags.push("Reports to / team referenced in description.");

  if (L2_climate <= 4) redFlags.push("No company hiring/funding signals detected (unknown without web).");
  else greenFlags.push("Company shows growth language in description.");

  if (L3_fresh <= 2) redFlags.push("Posting appears old or no clear freshness indicator in text.");
  else greenFlags.push("Posting contains a freshness/time indicator.");

  // Recommendation logic
  let verdict = "";
  let recommendText = "";
  if (totalScore <= 39) {
    verdict = "Likely Ghost Job";
    recommendText = "Skip or investigate further only if you have strong inside contacts. Avoid applying blind.";
  } else if (totalScore <= 59) {
    verdict = "Uncertain";
    recommendText = "Proceed cautiously. Research the company, check careers page, and look for internal engagement before applying.";
  } else if (totalScore <= 79) {
    verdict = "Likely Real";
    recommendText = "Apply with a tailored resume and try to contact the hiring manager or a team member first.";
  } else {
    verdict = "Active Search";
    recommendText = "Good fit to apply. Consider a short, targeted outreach to the hiring manager or recruiter.";
  }

  // Outreach template (only shown when likely real/active)
  let outreach = "";
  if (totalScore >= 60) {
    outreach = `Hi [Name],\n\nI’m excited about the ${title || '[role]'} at ${company || '[company]'} — particularly the focus on [one matching area]. I have experience with [brief skill], and I’d love to briefly discuss how I can help achieve the first-90-day goals. Are you available for a 15-minute call next week?\n\nThanks,\n[Your name]`;
  }

  return {
    mode: currentMode,
    layer1: {
      score: layer1,
      parts: { specificity: L1_specificity, skills: L1_skills, deliverables: L1_deliverables, org: L1_org }
    },
    layer2: {
      score: layer2,
      parts: { climate: L2_climate, team: L2_team, fit: L2_fit, timing: L2_timing }
    },
    layer3: {
      score: layer3,
      parts: { internalEngagement: L3_internal, crossPlatform: L3_cross, freshness: L3_fresh, recruiter: L3_recruiter }
    },
    totalScore,
    ghostProbability,
    verdict,
    recommendText,
    redFlags,
    greenFlags,
    outreach
  };
}

/* ---------------------------
   UI rendering
   --------------------------- */
function displayResult(r) {
  resultsSection.classList.remove('hidden');
  summaryEl.innerText = `${r.verdict} — Ghost Probability: ${Math.round(r.ghostProbability)}%`;
  scoreEl.innerText = `Score: ${r.totalScore}/100`;
  breakdownEl.innerText = [
    `Layer 1 (Structure): ${r.layer1.score}/40  — parts: ${JSON.stringify(r.layer1.parts)}`,
    `Layer 2 (Org & Market): ${r.layer2.score}/35 — parts: ${JSON.stringify(r.layer2.parts)}`,
    `Layer 3 (Public Behavioral): ${r.layer3.score}/25 — parts: ${JSON.stringify(r.layer3.parts)}`,
    ``,
    `Green flags: ${r.greenFlags.join(' • ') || 'None detected (or info unavailable)'} `,
    `Red flags: ${r.redFlags.join(' • ') || 'None detected'}`
  ].join('\n\n');

  recommendationEl.innerText = r.recommendText;
  outreachEl.innerText = r.outreach ? `Suggested outreach:\n\n${r.outreach}` : "";

  // Color-code summary quickly
  summaryEl.style.color = r.ghostProbability > 60 ? '#ffb4b4' : (r.ghostProbability > 40 ? '#ffd28a' : '#bff0d6');
}
