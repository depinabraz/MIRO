import { useState, useRef, useEffect, useCallback, useMemo } from "react";

const STRATEGY_MATRIX = {
  // goal → channel (direct, no campaign type step)
  "g1→ch1":1, "g1→ch2":3, "g1→ch3":2, "g1→ch4":3, "g1→ch5":3,
  "g2→ch1":3, "g2→ch2":2, "g2→ch3":3, "g2→ch4":2, "g2→ch5":1,
  "g3→ch1":3, "g3→ch2":2, "g3→ch3":0, "g3→ch4":1, "g3→ch5":2,
  "g4→ch1":3, "g4→ch2":3, "g4→ch3":1, "g4→ch4":1, "g4→ch5":2,
  "g5→ch1":1, "g5→ch2":3, "g5→ch3":1, "g5→ch4":2, "g5→ch5":3,
  // channel → targeting
  "ch1→t1":3, "ch1→t2":2, "ch1→t3":0, "ch1→t4":2, "ch1→t5":2, "ch2→t1":2, "ch2→t2":3, "ch2→t3":1, "ch2→t4":1, "ch2→t5":2, "ch3→t1":2, "ch3→t2":1, "ch3→t3":3, "ch3→t4":2, "ch3→t5":3, "ch4→t1":2, "ch4→t2":3, "ch4→t3":1, "ch4→t4":3, "ch4→t5":1, "ch5→t1":3, "ch5→t2":2, "ch5→t3":0, "ch5→t4":1, "ch5→t5":2,
  // targeting → metric
  "t1→m1":3, "t1→m2":2, "t1→m3":1, "t1→m4":3, "t1→m5":1, "t2→m1":3, "t2→m2":2, "t2→m3":1, "t2→m4":3, "t2→m5":0, "t3→m1":2, "t3→m2":3, "t3→m3":1, "t3→m4":2, "t3→m5":1, "t4→m1":2, "t4→m2":2, "t4→m3":2, "t4→m4":3, "t4→m5":1, "t5→m1":2, "t5→m2":2, "t5→m3":2, "t5→m4":2, "t5→m5":2,
};

const NODE_INSIGHTS = {
  g1: { insight: "Microsoft reaches 1B+ users across Windows, Edge, and Xbox — unmatched surface area for awareness.", exclusive: false },
  g2: { insight: "LinkedIn profile targeting gives you B2B lead gen precision no other ad platform can match.", exclusive: false },
  g3: { insight: "Shopping Ads on Bing convert 45% higher on desktop, with consistently lower CPC.", exclusive: false },
  g4: { insight: "Bing captures 38% of US desktop searches — often missed traffic at 30-50% lower CPC.", exclusive: false },
  g5: { insight: "Reach users across MSN, Outlook, and Xbox apps — premium environments exclusive to Microsoft.", exclusive: false },
  b1: { insight: "Starter budgets work best with 1–2 focused channels. Search Ads on Bing avg $1.54 CPC.", exclusive: false },
  b2: { insight: "Growth range enables search + audience. Enough to test 2–3 channels simultaneously.", exclusive: false },
  b3: { insight: "Scale budget unlocks LinkedIn targeting and multi-channel optimization.", exclusive: false },
  b4: { insight: "Enterprise budget covers the full Microsoft ecosystem including CTV and LinkedIn.", exclusive: false },
  b5: { insight: "Premium investment maximizes all Microsoft surfaces — 1B+ users across Windows, Edge, Xbox.", exclusive: false },
  ch1: { insight: "900M+ monthly searches. Bing users skew older, higher income — 30% earn $100K+.", exclusive: false },
  ch2: { insight: "New tab + sidebar placements in the default Windows browser. 600M+ monthly users.", exclusive: true },
  ch3: { insight: "The only ad platform with native LinkedIn targeting — reach by job title, company, industry.", exclusive: true },
  ch4: { insight: "Native inbox ads in Outlook.com reaching 400M+ active users worldwide.", exclusive: true },
  ch5: { insight: "Windows Start menu feed + MSN content network. Reach users at the OS level.", exclusive: true },
  t1: { insight: "Microsoft's in-market segments leverage signals from Bing, LinkedIn, and Windows activity.", exclusive: false },
  t2: { insight: "UET tag remarketing across the entire Microsoft ecosystem — not just search.", exclusive: false },
  t3: { insight: "Target by job function, seniority, company size, industry. Unique to the Microsoft ecosystem.", exclusive: true },
  t4: { insight: "Upload CRM lists for direct matching across Microsoft's identity graph.", exclusive: false },
  t5: { insight: "AI-built lookalike audiences from your converters, expanded across Microsoft properties.", exclusive: false },
  m1: { insight: "Automated bidding optimized for return on ad spend across all Microsoft surfaces.", exclusive: false },
  m2: { insight: "Target CPA bidding with conversion tracking via the Universal Event Tag.", exclusive: false },
  m3: { insight: "Maximize click volume — consistently lower CPCs with less advertiser competition.", exclusive: false },
  m4: { insight: "Optimize toward completed actions with smart bidding and broad match expansion.", exclusive: false },
  m5: { insight: "Maximize reach across 1B+ users on Windows, Edge, Xbox, LinkedIn, and MSN.", exclusive: false },
};

function calcStrategyScore(placed) {
  const stepGroups = {};
  placed.forEach(n => {
    if (!stepGroups[n.step]) stepGroups[n.step] = [];
    stepGroups[n.step].push(n.id);
  });

  const stepKeys = STEPS.map(s => s.key);
  let totalWeight = 0, maxWeight = 0, strongLinks = 0, exclusives = 0;

  for (let i = 0; i < stepKeys.length - 1; i++) {
    const fromIds = stepGroups[stepKeys[i]] || [];
    const toIds = stepGroups[stepKeys[i + 1]] || [];
    fromIds.forEach(f => {
      toIds.forEach(t => {
        const w = STRATEGY_MATRIX[`${f}→${t}`] || 0;
        totalWeight += w;
        maxWeight += 3;
        if (w >= 3) strongLinks++;
      });
    });
  }

  placed.forEach(n => {
    if (NODE_INSIGHTS[n.id]?.exclusive) exclusives++;
  });

  const coverage = STEPS.filter(s => (stepGroups[s.key] || []).length > 0).length;
  const coherence = maxWeight > 0 ? Math.round((totalWeight / maxWeight) * 100) : 0;

  return { coverage, coherence, strongLinks, exclusives, total: Math.min(100, Math.round(coherence * 0.6 + coverage * 8 + exclusives * 3)) };
}

const GOAL_OPTIMAL = {
  g1: { /* Brand Awareness */
    best: { channel: ["ch2","ch4","ch5"], targeting: ["t1","t5"], metric: ["m5"] },
    good: { channel: ["ch1","ch3"], targeting: ["t3","t4"], metric: ["m3"] },
    label: "Awareness Engine",
    principle: "Maximize surface area across premium Microsoft-exclusive placements.",
    suggestedBudget: 10000,
  },
  g2: { /* Lead Generation */
    best: { channel: ["ch1","ch3"], targeting: ["t3","t2"], metric: ["m2"] },
    good: { channel: ["ch2","ch4"], targeting: ["t1","t4"], metric: ["m4"] },
    label: "Lead Precision",
    principle: "Combine high-intent search with LinkedIn B2B targeting for qualified leads.",
    suggestedBudget: 8000,
  },
  g3: { /* Online Sales */
    best: { channel: ["ch1","ch2"], targeting: ["t1","t2"], metric: ["m1"] },
    good: { channel: ["ch5"], targeting: ["t4","t5"], metric: ["m4"] },
    label: "Commerce Accelerator",
    principle: "Product feeds + remarketing at lower CPCs drive profitable transactions.",
    suggestedBudget: 6000,
  },
  g4: { /* Website Traffic */
    best: { channel: ["ch1","ch2"], targeting: ["t1","t5"], metric: ["m3"] },
    good: { channel: ["ch5","ch3"], targeting: ["t2","t3"], metric: ["m5"] },
    label: "Traffic Surge",
    principle: "Broad search + AI optimization across 900M+ monthly searches at lower CPCs.",
    suggestedBudget: 4000,
  },
  g5: { /* App Installs */
    best: { channel: ["ch2","ch5","ch4"], targeting: ["t5","t1"], metric: ["m4"] },
    good: { channel: ["ch1","ch3"], targeting: ["t2","t4"], metric: ["m2"] },
    label: "Install Engine",
    principle: "Audience Ads on mobile surfaces with lookalike expansion.",
    suggestedBudget: 7000,
  },
};

/* ── Realistic channel costs (monthly, based on Microsoft Ads benchmarks) ── */
const CHANNEL_COSTS = {
  search:   { cpc: 1.54, cpm: 4.20, monthlyMin: 500,  label: "Avg CPC $1.54" },
  audience: { cpc: 0.85, cpm: 3.20, monthlyMin: 300,  label: "Avg CPM $3.20" },
  shopping: { cpc: 0.70, cpm: 2.80, monthlyMin: 400,  label: "Avg CPC $0.70" },
  video:    { cpc: 0.12, cpm: 8.50, monthlyMin: 1000, label: "Avg CPM $8.50" },
  linkedin: { cpc: 5.26, cpm: 33.80, monthlyMin: 1500, label: "Avg CPC $5.26" },
};

function mapStrategyToBudget(placed) {
  const ids = new Set(placed.map(n => n.id));
  const enabled = [];
  const sliders = { search: 0, audience: 0, shopping: 0, video: 0, linkedin: 0 };

  // Channel nodes → direct mapping
  if (ids.has("ch1")) { if (!enabled.includes("search")) enabled.push("search"); sliders.search = Math.max(sliders.search, 65); }
  if (ids.has("ch2")) { if (!enabled.includes("audience")) enabled.push("audience"); sliders.audience = Math.max(sliders.audience, 55); }
  if (ids.has("ch3")) { if (!enabled.includes("linkedin")) enabled.push("linkedin"); sliders.linkedin = Math.max(sliders.linkedin, 60); }
  if (ids.has("ch4")) { if (!enabled.includes("audience")) enabled.push("audience"); sliders.audience = Math.max(sliders.audience, 45); }
  if (ids.has("ch5")) {
    if (!enabled.includes("audience")) enabled.push("audience");
    sliders.audience = Math.max(sliders.audience, 40);
  }

  // Goal-based adjustments
  if (ids.has("g1")) { sliders.audience = Math.min(100, sliders.audience + 15); if (!enabled.includes("video")) { enabled.push("video"); } sliders.video = Math.min(100, (sliders.video || 0) + 25); }
  if (ids.has("g2")) { sliders.search = Math.min(100, sliders.search + 10); sliders.linkedin = Math.min(100, (sliders.linkedin || 0) + 20); if (!enabled.includes("linkedin")) enabled.push("linkedin"); }
  if (ids.has("g3")) { if (!enabled.includes("shopping")) enabled.push("shopping"); sliders.shopping = Math.min(100, (sliders.shopping || 0) + 30); sliders.search = Math.min(100, sliders.search + 10); }
  if (ids.has("g4")) { sliders.search = Math.min(100, sliders.search + 20); }
  if (ids.has("g5")) { sliders.audience = Math.min(100, sliders.audience + 15); if (!enabled.includes("video")) { enabled.push("video"); } sliders.video = Math.min(100, (sliders.video || 0) + 15); }

  // Targeting adjustments
  if (ids.has("t3")) { if (!enabled.includes("linkedin")) enabled.push("linkedin"); sliders.linkedin = Math.max(sliders.linkedin, 40); }

  // Budget from goal
  let budget = 5000;
  if (ids.has("g1")) budget = 10000;
  else if (ids.has("g2")) budget = 8000;
  else if (ids.has("g3")) budget = 6000;
  else if (ids.has("g4")) budget = 4000;
  else if (ids.has("g5")) budget = 7000;

  return { enabled, sliders, budget };
}

function calcEstimatedSpend(bmEnabled, bmSliders, totalBudget) {
  if (bmEnabled.length === 0 || !totalBudget) return 0;
  // Sum of channel minimum costs — this is the floor
  const minSpend = bmEnabled.reduce((sum, chId) => {
    const costs = CHANNEL_COSTS[chId];
    return sum + (costs ? costs.monthlyMin : 0);
  }, 0);
  return minSpend;
}

/* Compute how the budget is sliced per channel */
function calcChannelAllocations(bmEnabled, bmSliders, totalBudget) {
  if (bmEnabled.length === 0 || !totalBudget) return {};
  const totalWeight = bmEnabled.reduce((s, id) => s + (bmSliders[id] || 0), 0) || 1;
  const alloc = {};
  bmEnabled.forEach(id => {
    const share = (bmSliders[id] || 0) / totalWeight;
    alloc[id] = Math.round(totalBudget * share);
  });
  return alloc;
}

function gradeNode(goalId, nodeId) {
  if (!goalId) return "neutral";
  const opt = GOAL_OPTIMAL[goalId];
  if (!opt) return "neutral";
  const step = nodeId.match(/^[a-z]+/)?.[0];
  const stepMap = { ch: "channel", t: "targeting", m: "metric" };
  const cat = stepMap[step];
  if (!cat) return "neutral";
  if (opt.best[cat]?.includes(nodeId)) return "optimal";
  if (opt.good[cat]?.includes(nodeId)) return "good";
  const w = STRATEGY_MATRIX[`${goalId}→${nodeId}`];
  if (w !== undefined) {
    if (w >= 3) return "optimal";
    if (w >= 2) return "good";
    if (w >= 1) return "weak";
    return "poor";
  }
  return "weak";
}

function gradeNodeMulti(goalIds, nodeId) {
  if (!goalIds || goalIds.length === 0) return "neutral";
  const grades = goalIds.map(gid => gradeNode(gid, nodeId));
  const order = ["optimal", "good", "weak", "poor", "neutral"];
  return grades.sort((a, b) => order.indexOf(a) - order.indexOf(b))[0];
}

function calcGoalScoreMulti(goalIds, placed) {
  if (!goalIds || goalIds.length === 0) return null;
  if (goalIds.length === 1) return calcGoalScore(goalIds[0], placed);

  const nonGoal = placed.filter(n => n.step !== "goal");
  let optimalCount = 0, goodCount = 0, weakCount = 0, poorCount = 0;
  nonGoal.forEach(n => {
    const g = gradeNodeMulti(goalIds, n.id);
    if (g === "optimal") optimalCount++;
    else if (g === "good") goodCount++;
    else if (g === "weak") weakCount++;
    else poorCount++;
  });

  const stepKeys = STEPS.map(s => s.key);
  const stepGroups = {};
  placed.forEach(n => { if (!stepGroups[n.step]) stepGroups[n.step] = []; stepGroups[n.step].push(n.id); });
  let chainScore = 0, chainMax = 0;
  for (let i = 0; i < stepKeys.length - 1; i++) {
    const fromIds = stepGroups[stepKeys[i]] || [];
    const toIds = stepGroups[stepKeys[i + 1]] || [];
    fromIds.forEach(f => { toIds.forEach(t => { chainScore += (STRATEGY_MATRIX[`${f}→${t}`] || 0); chainMax += 3; }); });
  }

  const exclusives = nonGoal.filter(n => NODE_INSIGHTS[n.id]?.exclusive).length;
  const coverage = STEPS.filter(s => (stepGroups[s.key] || []).length > 0).length;
  const coherence = chainMax > 0 ? chainScore / chainMax : 0;
  const nodeScore = (optimalCount * 10 + goodCount * 6 + weakCount * 2 - poorCount * 3);
  const maxNodeScore = nonGoal.length * 10;
  const nodeNorm = maxNodeScore > 0 ? nodeScore / maxNodeScore : 0;
  const total = Math.max(0, Math.min(100, Math.round(nodeNorm * 40 + coherence * 35 + (coverage / 5) * 15 + Math.min(exclusives * 2.5, 10))));
  const letter = total >= 90 ? "S" : total >= 75 ? "A" : total >= 60 ? "B" : total >= 40 ? "C" : total >= 20 ? "D" : "F";
  const labels = goalIds.map(gid => GOAL_OPTIMAL[gid]?.label).filter(Boolean);
  return { total, letter, coherence: Math.round(coherence * 100), optimalCount, goodCount, weakCount, poorCount, exclusives, coverage, diag: [], goalLabel: labels.join(" + "), principle: "" };
}

function calcGoalScore(goalId, placed) {
  if (!goalId) return null;
  const opt = GOAL_OPTIMAL[goalId];
  if (!opt) return null;

  const nonGoal = placed.filter(n => n.step !== "goal");
  let optimalCount = 0, goodCount = 0, weakCount = 0, poorCount = 0;
  nonGoal.forEach(n => {
    const g = gradeNode(goalId, n.id);
    if (g === "optimal") optimalCount++;
    else if (g === "good") goodCount++;
    else if (g === "weak") weakCount++;
    else poorCount++;
  });

  const stepKeys = STEPS.map(s => s.key);
  const stepGroups = {};
  placed.forEach(n => {
    if (!stepGroups[n.step]) stepGroups[n.step] = [];
    stepGroups[n.step].push(n.id);
  });
  let chainScore = 0, chainMax = 0;
  for (let i = 0; i < stepKeys.length - 1; i++) {
    const fromIds = stepGroups[stepKeys[i]] || [];
    const toIds = stepGroups[stepKeys[i + 1]] || [];
    fromIds.forEach(f => {
      toIds.forEach(t => {
        const w = STRATEGY_MATRIX[`${f}→${t}`] || 0;
        chainScore += w;
        chainMax += 3;
      });
    });
  }

  const exclusives = nonGoal.filter(n => NODE_INSIGHTS[n.id]?.exclusive).length;
  const coverage = STEPS.filter(s => (stepGroups[s.key] || []).length > 0).length;
  const coherence = chainMax > 0 ? chainScore / chainMax : 0;

  const nodeScore = (optimalCount * 10 + goodCount * 6 + weakCount * 2 - poorCount * 3);
  const maxNodeScore = nonGoal.length * 10;
  const nodeNorm = maxNodeScore > 0 ? nodeScore / maxNodeScore : 0;

  const total = Math.max(0, Math.min(100, Math.round(
    nodeNorm * 40 +
    coherence * 35 +
    (coverage / 5) * 15 +
    Math.min(exclusives * 2.5, 10)
  )));

  const letter = total >= 90 ? "S" : total >= 75 ? "A" : total >= 60 ? "B" : total >= 40 ? "C" : total >= 20 ? "D" : "F";

  const diag = [];
  if (poorCount > 0) diag.push(`${poorCount} misaligned node${poorCount > 1 ? "s" : ""} — hurting your ${opt.label} strategy`);
  if (weakCount > 1) diag.push(`${weakCount} weak picks — consider swapping for optimal alternatives`);
  if (exclusives > 0) diag.push(`${exclusives} Microsoft exclusive${exclusives > 1 ? "s" : ""} — platform advantage`);
  if (coherence > 0.7) diag.push("Strong chain coherence — your layers work well together");
  else if (coherence < 0.4 && nonGoal.length > 2) diag.push("Weak chain coherence — layers aren't reinforcing each other");
  if (coverage >= 5) diag.push("Full funnel coverage — all stages active");

  return {
    total, letter, coherence: Math.round(coherence * 100),
    optimalCount, goodCount, weakCount, poorCount,
    exclusives, coverage, diag,
    goalLabel: opt.label, principle: opt.principle,
  };
}

function generateOptimalStrategy(goalIds) {
  const ids = Array.isArray(goalIds) ? goalIds : [goalIds];
  const ts = Date.now();
  const nodes = [];
  // Add goal nodes
  const goalStep = STEPS.find(s => s.key === "goal");
  ids.forEach(goalId => {
    const goalItem = goalStep.items.find(i => i.id === goalId);
    if (goalItem) nodes.push({ id: goalId, label: goalItem.label, step: "goal", shape: "star", tip: "", born: ts });
  });
  // Merge best nodes from all goals, deduplicated
  const stepMap = { channel: "channel", targeting: "targeting", metric: "metric" };
  const seen = new Set(ids);
  ids.forEach(goalId => {
    const opt = GOAL_OPTIMAL[goalId];
    if (!opt) return;
    Object.entries(opt.best).forEach(([cat, catIds]) => {
      const stepDef = STEPS.find(s => s.key === stepMap[cat]);
      if (!stepDef) return;
      const stepIdx = STEPS.indexOf(stepDef);
      catIds.forEach((id, i) => {
        if (seen.has(id)) return;
        seen.add(id);
        const item = stepDef.items.find(it => it.id === id);
        if (item) nodes.push({ id, label: item.label, step: stepDef.key, shape: stepDef.shape, tip: item.tip, born: ts + (stepIdx * 300) + i * 100 });
      });
    });
  });
  return nodes;
}

const GRADE_COLORS = {
  optimal: "#1a8a3e", good: "#3a7ab5", weak: "#b08a30", poor: "#c44", neutral: "#4a3f35"
};

const NODE_FEEDBACK = {
  optimal: ["Perfect fit.", "Optimal choice.", "Exactly right.", "Strategic match."],
  good: ["Solid pick.", "Good synergy.", "Works well here.", "Strong addition."],
  weak: ["Marginal fit.", "Consider alternatives.", "Low synergy.", "Suboptimal."],
  poor: ["Misaligned.", "Doesn't support your goal.", "Wasted spend risk.", "Reconsider this."],
};

function getNodeFeedback(grade, nodeId) {
  const msgs = NODE_FEEDBACK[grade] || NODE_FEEDBACK.weak;
  const idx = nodeId.charCodeAt(nodeId.length - 1) % msgs.length;
  return msgs[idx];
}
const STEPS = [
  {
    key: "budget", label: "Monthly budget", shape: "pill",
    desc: "Choose your monthly budget",
    color: "#4a3f35", bg: "#F0EDE8",
    isBudgetStep: true,
    items: [
      { id: "b1", label: "$1K – 3K", tip: "Starter budget — focus on 1–2 channels", value: 2000 },
      { id: "b2", label: "$3K – 6K", tip: "Growth budget — expand to search + audience", value: 5000 },
      { id: "b3", label: "$6K – 12K", tip: "Scale budget — multi-channel with LinkedIn", value: 9000 },
      { id: "b4", label: "$12K – 25K", tip: "Enterprise — full ecosystem coverage", value: 18000 },
      { id: "b5", label: "$25K+", tip: "Premium — maximize all Microsoft surfaces", value: 35000 },
    ],
  },
  {
    key: "goal", label: "Campaign goal", shape: "star",
    desc: "Choose your campaign goal",
    color: "#602926", bg: "#E7CAAD",
    items: [
      { id: "g1", label: "Brand Awareness", tip: "Best with Audience Ads on MSN & Outlook" },
      { id: "g2", label: "Lead Generation", tip: "LinkedIn targeting excels here" },
      { id: "g3", label: "Online Sales", tip: "Shopping + Performance Max recommended" },
      { id: "g4", label: "Website Traffic", tip: "Search Ads with broad match keywords" },
      { id: "g5", label: "App Installs", tip: "Use Audience Ads with app extensions" },
    ],
  },
  {
    key: "channel", label: "Network", shape: "circle",
    desc: "Choose your ad network",
    color: "#311F10", bg: "#FAE19D",
    items: [
      { id: "ch1", label: "Bing & partners", tip: "900M+ monthly searches" },
      { id: "ch2", label: "Microsoft Edge", tip: "New tab + sidebar placements" },
      { id: "ch3", label: "LinkedIn", tip: "Professional targeting by job title & company" },
      { id: "ch4", label: "Outlook.com", tip: "Native ad placements in inbox" },
      { id: "ch5", label: "MSN & Start", tip: "Content feed across Windows devices" },
    ],
  },
  {
    key: "targeting", label: "Audience", shape: "diamond",
    desc: "Choose your audience",
    color: "#3D532F", bg: "#CAD6B2",
    items: [
      { id: "t1", label: "In-market", tip: "People actively researching your category" },
      { id: "t2", label: "Remarketing", tip: "Re-engage visitors who didn't convert" },
      { id: "t3", label: "LinkedIn profiles", tip: "Target by industry, job function, company" },
      { id: "t4", label: "Custom audiences", tip: "Upload your CRM list for matching" },
      { id: "t5", label: "Similar audiences", tip: "Find new people like your best customers" },
    ],
  },
  {
    key: "metric", label: "Optimize for", shape: "triangle",
    desc: "Choose your success metric",
    color: "#E7CAAD", bg: "#602926",
    items: [
      { id: "m1", label: "ROAS", tip: "Return on ad spend — best for e-commerce" },
      { id: "m2", label: "CPA", tip: "Cost per acquisition — best for lead gen" },
      { id: "m3", label: "Clicks", tip: "Maximize traffic volume" },
      { id: "m4", label: "Conversions", tip: "Optimize for completed actions" },
      { id: "m5", label: "Impressions", tip: "Maximize visibility and reach" },
    ],
  },
];

function drawPill(ctx, x, y, label, opts = {}) {
  const {
    fontSize = 16, fontWeight = "400", color = "#4a3f35",
    bg = "#f8f4ee", strokeColor = null, strokeWidth = 0.7,
    paddingX = 18, paddingY = 10, alpha = 1,
  } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${fontWeight} ${fontSize}px ${FONT}`;
  const tw = ctx.measureText(label).width;
  const pw = tw + paddingX * 2;
  const ph = fontSize + paddingY * 2;
  const rx = x - pw / 2, ry = y - ph / 2;
  const rad = ph / 2;

  ctx.beginPath();
  ctx.moveTo(rx + rad, ry);
  ctx.lineTo(rx + pw - rad, ry);
  ctx.arc(rx + pw - rad, ry + rad, rad, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(rx + rad, ry + ph);
  ctx.arc(rx + rad, ry + rad, rad, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();

  ctx.fillStyle = bg;
  ctx.fill();

  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(label, x, y + 0.5);
  ctx.restore();
  return { w: pw, h: ph };
}

function computeLayout(placed, W, H, compact = false, overrides = {}) {
  const groups = {};
  STEPS.forEach((s) => { groups[s.key] = []; });
  placed.forEach((n) => { if (groups[n.step]) groups[n.step].push(n); });

  const activeSteps = STEPS.filter((s) => groups[s.key].length > 0);
  const colCount = activeSteps.length;
  if (!colCount) return { positions: {}, links: [] };

  const marginX = 140;
  const topZone = compact ? H * 0.38 : H;
  const marginY = compact ? 60 : 80;
  const usableW = W - marginX * 2;
  const usableH = topZone - marginY * 2;

  const seed = (id) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
    return h;
  };

  const positions = {};
  activeSteps.forEach((s, ci) => {
    const items = groups[s.key];
    const x = colCount > 1 ? marginX + (ci / (colCount - 1)) * usableW : W / 2;
    const spacing = Math.min(compact ? 60 : 100, usableH / Math.max(items.length + 1, 2));
    const blockH = (items.length - 1) * spacing;
    const centerY = marginY + usableH / 2;
    const startY = centerY - blockH / 2;
    items.forEach((item, ri) => {
      const s1 = seed(item.id);
      const jx = ((s1 % 30) - 15);
      const jy = ((Math.abs(s1 * 7) % 20) - 10);
      // Clamp to stay within canvas bounds with pill padding
      const px = Math.max(marginX, Math.min(W - marginX, x + jx));
      const py = Math.max(marginY, Math.min(topZone - marginY, startY + ri * spacing + jy));
      positions[item.id] = { x: px, y: py };
    });
  });

  const links = [];
  for (let si = 1; si < activeSteps.length; si++) {
    const prev = groups[activeSteps[si - 1].key];
    const curr = groups[activeSteps[si].key];
    prev.forEach((p) => curr.forEach((c) => {
      const w = STRATEGY_MATRIX[`${p.id}→${c.id}`];
      if (w === undefined || w > 0) {
        links.push({ from: p.id, to: c.id, weight: w || 1 });
      }
    }));
  }

  Object.keys(overrides).forEach((id) => {
    if (positions[id]) {
      // Also clamp overrides
      const ox = Math.max(marginX, Math.min(W - marginX, overrides[id].x));
      const oy = Math.max(marginY, Math.min(topZone - marginY, overrides[id].y));
      positions[id] = { x: ox, y: oy };
    }
  });

  return { positions, links };
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const FONT = "'Segoe UI', system-ui, -apple-system, sans-serif";

/* ── SVG arc path helper for radial gauge ── */
function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = { x: cx + r * Math.cos(startAngle), y: cy + r * Math.sin(startAngle) };
  const end = { x: cx + r * Math.cos(endAngle), y: cy + r * Math.sin(endAngle) };
  const diff = endAngle - startAngle;
  if (diff < 0.01) return `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${start.x + 0.01} ${start.y}`;
  const largeArc = diff > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

const styles = `
:root { --sp-xs: 8px; --sp-sm: 16px; --sp-md: 24px; --sp-lg: 48px; --sp-xl: 80px; --sp-2xl: 140px; --gutter: 48px; --section-gap: 96px; --radius-xs: 12px; --radius-sm: 20px; --radius-md: 28px; --radius-lg: 40px; --radius-xl: 56px; --radius-pill: 100px; --c-bg: #f8f4ee; --c-text: #4a3f35; --c-text-soft: rgba(74,63,53,0.5); --c-border: rgba(74,63,53,0.1); --text-primary: #4a3f35; --text-inverse: #CAC0D9; --text-on-dark: #CAC0D9; --text-secondary: rgba(74,63,53,0.5); --text-tertiary: rgba(74,63,53,0.35); --text-ghost: rgba(74,63,53,0.2); }
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
body { font-family: ${FONT}; background: var(--c-bg); color: var(--c-text); -webkit-font-smoothing: antialiased; overflow-x: hidden; margin: 0; }
.ms-page { width: 100%; min-height: 100vh; font-family: ${FONT}; background: var(--c-bg); color: var(--c-text); font-weight: 400; }
.ms-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0 var(--gutter); height: 56px; background: transparent; pointer-events: none; transition: all 0.3s ease; }
.ms-nav-brand { display: flex; align-items: center; font-size: 14px; letter-spacing: -0.01em; color: var(--c-text); font-weight: 500; }
.ms-nav-links { display: flex; gap: 32px; align-items: center; }
.ms-nav-link { font-size: 12px; color: var(--c-text); text-decoration: none; cursor: pointer; transition: color 0.2s; font-weight: 400; }
.ms-nav-link:hover { color: var(--c-text); }
.ms-hero { position: relative; min-height: 85vh; overflow: hidden; background: var(--c-bg); z-index: 1; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
.ms-hero-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 2; pointer-events: none; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.ms-hero-content { position: relative; z-index: 5; padding: 0 var(--gutter); padding-top: calc(56px + 14vh); pointer-events: none; animation: fadeInUp 0.8s ease both; animation-delay: 0.2s; }
.ms-hero h1 { font-size: clamp(48px, 7vw, 96px); font-weight: 400; letter-spacing: -0.03em; line-height: 1.02; color: var(--c-text); pointer-events: none; }
.ms-hero-cta { display: inline-flex; align-items: center; gap: 4px; margin-top: 40px; pointer-events: auto; position: relative; z-index: 30; animation: fadeInUp 0.8s ease both; animation-delay: 0.5s; }
.ms-btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 36px; height: 50px; background: #EDE2D1; color: var(--c-text); border: none; border-radius: 100px; font-size: 14px; font-family: ${FONT}; font-weight: 400; cursor: pointer; transition: all 0.4s cubic-bezier(0.22,1,0.36,1); letter-spacing: -0.01em; }
.ms-btn-arrow { display: inline-flex; align-items: center; justify-content: center; width: 50px; height: 50px; border-radius: var(--radius-xs); background: #EDE2D1; color: var(--c-text); border: none; cursor: pointer; font-size: 16px; transition: all 0.4s cubic-bezier(0.22,1,0.36,1); }
.ms-hero-cta:hover .ms-btn-primary { background: #f0d888; color: #3a2a10; }
.ms-hero-cta:hover .ms-btn-arrow { border-radius: 50%; background: #f0d888; color: #3a2a10; }
@keyframes marquee { from { transform: translateX(-50%); } to { transform: translateX(0); } }
.ms-marquee-wrap { border-top: 1px solid rgba(74,63,53,0.15); border-bottom: 1px solid rgba(74,63,53,0.15); overflow: hidden; white-space: nowrap; padding: 16px 0; position: relative; z-index: 10000; background: var(--c-bg); }
.ms-marquee-track { display: inline-flex; animation: marquee 30s linear infinite; will-change: transform; }
.ms-marquee-track:hover { animation-play-state: paused; }
.ms-marquee-item { display: inline-flex; align-items: center; gap: 0; padding: 0; font-size: 14px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--c-text); font-weight: 400; white-space: nowrap; }
.ms-marquee-sep { padding: 0 24px; font-size: 14px; color: var(--c-text); }
.ms-section-block { padding: var(--section-gap) var(--gutter) 0; background: var(--c-bg); }
.ms-section-block-header { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--lg); margin-bottom: 32px; }
.ms-section-block h2, .ms-section-block-heading { font-size: clamp(36px, 5.5vw, 72px); font-weight: 400; letter-spacing: -0.03em; line-height: 1.02; color: var(--c-text); text-transform: uppercase; }
.ms-section-block-desc { font-size: 14px; color: var(--c-text); line-height: 1.65; max-width: 320px; padding-top: 12px; font-weight: 400; }
.ms-section-block-number { font-size: 12px; color: var(--c-text); margin-bottom: 12px; font-weight: 400; }
.ms-section-builder { padding: 0 !important; border-bottom: 1px solid rgba(74,63,53,0.1); }
.bm-info-popover { position: absolute; right: 0; top: calc(100% + 12px); width: 300px; background: var(--c-bg); border: 1px solid rgba(74,63,53,0.12); border-radius: var(--radius-md); padding: 24px; z-index: 100; font-family: ${FONT}; box-shadow: 0 8px 40px rgba(74,63,53,0.08); }
.bm-info-name { font-size: 16px; font-weight: 500; color: #4a3f35; letter-spacing: -0.3px; margin-bottom: 6px; }
.bm-info-line { font-size: 12px; color: rgba(74,63,53,0.5); line-height: 1.5; margin-bottom: 20px; }
.bm-info-stat { display: flex; align-items: baseline; gap: 10px; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid rgba(74,63,53,0.08); }
.bm-info-stat-val { font-size: 36px; font-weight: 300; color: #4a3f35; letter-spacing: -1.5px; }
.bm-info-stat-label { font-size: 12px; color: rgba(74,63,53,0.4); }
.bm-info-metrics { display: flex; gap: 24px; }
.bm-info-metrics > div { font-size: 12px; color: rgba(74,63,53,0.5); }
.bm-info-metric-val { font-size: 16px; font-weight: 300; color: #4a3f35; margin-right: 4px; letter-spacing: -0.3px; display: block; margin-bottom: 2px; }
.ms-builder { width: 100%; }
.ms-builder-header { padding: var(--sp-lg) var(--gutter) 24px; }
.ms-builder-overline { display: block; font-size: 14px; color: var(--c-text); margin-bottom: 16px; font-weight: 400; }
.ms-builder-headline-text { font-size: clamp(20px, 2.2vw, 30px); font-weight: 400; letter-spacing: -0.3px; line-height: 1.38; color: var(--c-text); max-width: 820px; margin: 0; font-family: ${FONT}; }
.ms-builder-controls { padding: 12px var(--gutter); min-height: 44px; display: flex; align-items: center; }
.ms-builder-controls-left { display: flex; align-items: center; gap: 20px; width: 100%; }
.ms-builder-step-indicator { display: flex; gap: 4px; align-items: center; }
.ms-builder-step-dot { height: 6px; border-radius: 100px; transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s ease; }
.ms-builder-actions { display: flex; gap: 16px; align-items: center; }
.ms-builder-btn { border: none; background: transparent; padding: 4px 0; font-size: 12px; letter-spacing: 0.02em; cursor: pointer; border-radius: 0; font-family: ${FONT}; color: var(--c-text); font-weight: 400; transition: all 0.15s; border-bottom: 1px solid transparent; }
.ms-builder-btn:hover { color: var(--c-text); border-bottom-color: var(--text-ghost); }
.ms-builder-btn-primary { border: none; background: #e0d8cc; color: var(--c-text); padding: 6px 16px; font-size: 12px; letter-spacing: 0.02em; cursor: pointer; border-radius: 100px; font-family: ${FONT}; font-weight: 500; transition: all 0.15s; }
.ms-builder-btn-primary:hover { background: #d4cabb; }
.ms-builder-btn-primary:disabled { opacity: 0.5; cursor: default; }
.ms-builder-btn-outline { border: 1px solid rgba(74,63,53,0.12); background: rgba(74,63,53,0.03); color: var(--c-text); padding: 6px 16px; font-size: 12px; letter-spacing: 0.02em; cursor: pointer; border-radius: 100px; font-family: ${FONT}; font-weight: 400; transition: all 0.15s; }
.ms-builder-btn-outline:hover { border-color: rgba(74,63,53,0.25); background: rgba(74,63,53,0.06); }
.bm-toolbar { display: flex; align-items: center; gap: 0; padding: 6px var(--gutter) 12px; flex-wrap: wrap; }
.bm-toolbar-channels { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; flex-wrap: wrap; }
.bm-toolbar-sep { width: 1px; height: 24px; background: rgba(74,63,53,0.08); margin: 0 16px; flex-shrink: 0; }
.bm-toolbar-budget { display: flex; align-items: center; gap: 8px; flex-shrink: 0; padding: 4px 12px 4px 10px; border-radius: 40px; background: rgba(74,63,53,0.03); }
.bm-toolbar-budget-val { font-size: 12px; font-weight: 400; color: var(--c-text); font-variant-numeric: tabular-nums; white-space: nowrap; letter-spacing: -0.2px; }
.bm-toolbar-actions { display: flex; align-items: center; gap: 12px; padding: 6px var(--gutter) 10px; }
.ms-builder-canvas-wrap { height: clamp(340px, 50vh, 560px); overflow: visible; position: relative; transition: border 0.15s; background: var(--c-bg); }
.node-popover { position: absolute; transform: translateX(-50%); width: 240px; background: var(--pop-bg); border: 1px solid color-mix(in srgb, var(--pop-color) 12%, transparent); border-radius: 16px; padding: 16px 20px; z-index: 90; pointer-events: none; animation: nodePopIn 0.2s cubic-bezier(0.34,1.56,0.64,1); }
@keyframes nodePopIn { from { opacity: 0; transform: translateX(-50%) translateY(4px) scale(0.97); } to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } }
.node-popover-grade { font-size: 12px; font-weight: 500; color: var(--pop-color); margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
.node-popover-excl { font-size: 12px; color: var(--pop-color); }
.node-popover-insight { font-size: 12px; color: var(--pop-color); line-height: 1.5; }
.node-popover-tip { font-size: 12px; color: var(--pop-color); margin-top: 8px; padding-top: 8px; border-top: 1px solid color-mix(in srgb, var(--pop-color) 8%, transparent); }
.ms-builder-shelf { padding: 16px var(--gutter) 16px; }
.ms-builder-shelf-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px; min-height: 18px; }
.ms-builder-shelf-step { font-size: 12px; color: var(--c-text); font-weight: 400; }
.ms-builder-shelf-label { font-size: 12px; color: var(--c-text); font-weight: 400; }
.ms-builder-shelf-desc { font-size: 12px; color: var(--c-text); font-weight: 400; }
.ms-builder-shelf-hint { font-size: 12px; color: var(--c-text); margin-left: auto; }
.ms-builder-chips { display: flex; gap: 8px; flex-wrap: wrap; min-height: 42px; align-items: center; }
.ms-builder-chip { display: flex; align-items: center; gap: 0; padding: 10px 18px; border: 1px solid rgba(74,63,53,0.15); border-radius: 40px; cursor: pointer; background: var(--c-bg); user-select: none; transition: all 0.15s; font-size: 12px; color: var(--c-text); font-weight: 400; font-family: ${FONT}; line-height: 1.3; }
.ms-builder-chip:hover { background: var(--step-bg, #E7CAAD); color: var(--step-color, #602926); border-color: var(--step-bg, #E7CAAD); }
.ms-builder-chip.placed { border: 1px solid rgba(74,63,53,0.15); opacity: 0.3; cursor: default; background: var(--c-bg); color: var(--c-text); }
.ms-builder-complete { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
.ms-builder-complete-label { font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--c-text); font-weight: 400; }
.ms-builder-complete-count { font-size: 12px; color: var(--c-text); }
.ms-builder-complete-path { font-size: 12px; color: var(--c-text); margin-left: auto; }
.ms-drag-ghost { position: fixed; pointer-events: none; z-index: 9999; display: flex; align-items: center; gap: 8px; padding: 8px 14px 8px 10px; background: rgba(255,255,255,0.94); backdrop-filter: blur(6px); border: 1.5px solid rgba(74,63,53,0.1); border-radius: 40px; font-size: 12px; color: var(--c-text); font-family: ${FONT}; box-shadow: 0 4px 20px rgba(74,63,53,0.06); transition: border-color 0.15s; }
.ms-drag-ghost.over-canvas { border-color: var(--text-tertiary); }

/* ── Ecosystem Closer Section ── */
.ms-ecosystem { padding: 0 0 var(--section-gap); background: var(--c-bg); overflow: hidden; position: relative; }
.ms-ecosystem-inner { max-width: 1400px; margin: 0 auto; padding: 0 var(--gutter); display: grid; grid-template-columns: 3fr 2fr; gap: var(--sp-lg); align-items: center; }
.ms-ecosystem-text { display: flex; flex-direction: column; gap: var(--sp-md); }
.ms-ecosystem-overline { font-size: 14px; color: var(--c-text); font-weight: 400; }
.ms-ecosystem-body { font-size: clamp(22px, 2.4vw, 30px); font-weight: 400; line-height: 1.35; color: var(--c-text); letter-spacing: -0.015em; }
.ms-ecosystem-canvas-wrap { position: relative; display: flex; align-items: center; justify-content: center; min-height: 520px; }
.ms-ecosystem-canvas-wrap canvas { display: block; }

.ms-closing { padding: var(--sp-2xl) var(--gutter); background: var(--c-bg); }
.ms-closing-inner { display: flex; flex-direction: column; align-items: flex-start; }
.ms-closing-overline { display: block; font-size: 14px; color: var(--c-text); margin-bottom: 48px; font-weight: 400; }
.ms-closing-title { font-size: clamp(48px, 7vw, 96px); font-weight: 400; letter-spacing: -0.03em; line-height: 1.02; color: var(--c-text); margin: 0 0 48px; }
.ms-closing-illustration { width: 100%; max-width: 480px; margin: 0 auto 64px; }
.ms-closing-svg { width: 100%; height: auto; }
.ms-closing-body { font-size: clamp(16px, 1.8vw, 20px); color: var(--c-text); line-height: 1.5; font-weight: 400; margin-bottom: 48px; max-width: 440px; }
.ms-closing-cta { display: inline-flex; align-items: center; gap: 4px; }
.ms-closing-cta:hover .ms-btn-primary { background: #f0d888; color: #3a2a10; }
.ms-closing-cta:hover .ms-btn-arrow { border-radius: 50%; background: #f0d888; color: #3a2a10; }
.ms-footer { border-top: none; padding: 80px var(--gutter) 60px; background: var(--c-bg); }
.ms-footer-inner { display: grid; grid-template-columns: auto 1fr 1fr 1fr 1.5fr; gap: 48px; align-items: start; }
.ms-footer-logo { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; width: 22px; height: 22px; gap: 2px; margin-top: 2px; }
.ms-footer-logo span { display: block; }
.ms-footer-logo span:nth-child(1) { background: var(--c-text); }
.ms-footer-logo span:nth-child(2) { background: var(--c-text); }
.ms-footer-logo span:nth-child(3) { background: var(--c-text); }
.ms-footer-logo span:nth-child(4) { background: var(--c-text); }
.ms-footer-col { display: flex; flex-direction: column; gap: 10px; }
.ms-footer-col a { font-size: 12px; color: var(--c-text); text-decoration: none; cursor: pointer; transition: color 0.2s;  letter-spacing: 0.02em; }
.ms-footer-col a:hover { color: var(--c-text); }
.ms-footer-legal { display: flex; flex-direction: column; gap: 12px; }
.ms-footer-legal-copy { font-size: 12px; color: var(--c-text);  letter-spacing: 0.02em; }
.ms-footer-legal-text { font-size: 12px; color: var(--c-text); line-height: 1.55;  letter-spacing: 0.01em; max-width: 420px; }
.ms-footer-legal-text a { color: var(--c-text); text-decoration: underline; }
.ms-hero-toolbar { position: absolute; bottom: 28px; right: 28px; z-index: 50; display: flex; gap: 8px; align-items: center; transition: opacity 0.6s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1); will-change: transform, opacity; }
.ms-tool-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: var(--c-bg); border: 1.5px solid rgba(74,63,53,0.15); border-radius: 50%; color: var(--c-text); cursor: pointer; transition: border-color 0.2s, color 0.2s, background 0.2s, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); padding: 0; }
.ms-tool-btn:hover { border-color: var(--text-secondary); color: var(--c-text); transform: scale(1.08); }
.ms-tool-btn:active { transform: scale(0.95); }
.ms-brush-panel { position: absolute; bottom: 78px; right: 28px; z-index: 51; width: 260px; background: var(--c-bg); border: 1px solid rgba(74,63,53,0.12); border-radius: var(--radius-md); padding: 20px; opacity: 0; transform: translateY(8px) scale(0.96); pointer-events: none; transition: opacity 0.3s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); font-family: ${FONT}; box-shadow: 0 8px 40px rgba(74,63,53,0.08); }
.ms-brush-panel.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
.ms-brush-control { padding: 0; margin-bottom: 18px; display: flex; align-items: center; gap: 10px; }
.ms-brush-control:last-child { margin-bottom: 0; }
.ms-brush-control label { font-size: 12px; font-weight: 400; color: var(--c-text); min-width: 32px; letter-spacing: 0.02em; }
.ms-brush-control input[type="range"] { flex: 1; height: 2px; -webkit-appearance: none; appearance: none; background: rgba(74,63,53,0.08); border-radius: 1px; outline: none; cursor: pointer; }
.ms-brush-control input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 10px; height: 10px; background: var(--c-text); border-radius: 50%; cursor: pointer; transition: transform 0.15s; }
.ms-brush-control input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.3); }
.ms-brush-val { font-size: 12px; font-weight: 400; color: var(--c-text); min-width: 24px; text-align: right; font-variant-numeric: tabular-nums; }
.ms-brush-swatches { display: flex; gap: 6px; flex: 1; }
.ms-brush-swatch { width: 20px; height: 20px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: border-color 0.2s, transform 0.2s cubic-bezier(0.22,1,0.36,1); padding: 0; }
.ms-brush-swatch:hover { transform: scale(1.15); }
.ms-brush-swatch.active { border-color: rgba(74,63,53,0.3); transform: scale(1.1); }
.ms-toggle { position: relative; width: 28px; height: 16px; background: rgba(74,63,53,0.2); border-radius: 8px; border: none; padding: 0; cursor: pointer; transition: background 0.3s ease; flex-shrink: 0; }
.ms-toggle.on { background: var(--c-text); }
.ms-toggle::after { content: ""; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; background: var(--c-bg); border-radius: 50%; transition: transform 0.3s cubic-bezier(0.22,1,0.36,1); }
.ms-toggle.on::after { transform: translateX(12px); }
.ms-export-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(74,63,53,0.6); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; padding: var(--gutter); animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.ms-export-modal { background: var(--c-bg); border-radius: var(--radius-lg); max-width: 900px; width: 100%; overflow: hidden; animation: modalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes modalIn { from { transform: translateY(20px) scale(0.97); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
.ms-export-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px 12px; }
.ms-export-modal-title { font-size: 12px; font-weight: 400; color: var(--c-text); font-family: ${FONT}; letter-spacing: 0.02em; }
.ms-export-modal-close { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; border-radius: 50%; cursor: pointer; font-size: 12px; color: var(--c-text); transition: opacity 0.15s; }
.ms-export-modal-close:hover { color: var(--c-text); }
.ms-export-modal-preview { padding: 0 24px; }
.ms-export-modal-preview img { width: 100%; height: auto; display: block; border-radius: var(--radius-md); border: 1px solid rgba(74,63,53,0.25); animation: exportFadeIn 0.4s cubic-bezier(0.22,1,0.36,1); }
@keyframes exportFadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
.ms-export-modal-footer { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px 20px; }
.ms-export-modal-hint { font-size: 12px; color: var(--c-text); font-family: ${FONT}; }
.ms-export-modal-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; background: var(--c-text); color: var(--text-on-dark); border-radius: var(--radius-pill); font-size: 12px; font-weight: 400; font-family: ${FONT}; text-decoration: none; cursor: pointer; transition: background 0.2s, transform 0.15s; }
.ms-export-modal-btn:hover { background: #3a3229; transform: translateY(-1px); }
.ms-sol { padding: var(--sp-2xl) 0 0; background: var(--c-bg); }
.ms-sol-placed { display: grid; grid-template-columns: repeat(12, 1fr); column-gap: 20px; row-gap: 0; position: relative; max-width: 1400px; margin: 0 auto; padding: 0 var(--gutter); }
.ms-sol-c1 { grid-column: 2 / 7; grid-row: 1; padding-bottom: 48px; }
.ms-sol-c2 { grid-column: 8 / 12; grid-row: 1; padding-top: 360px; }
.ms-sol-photo { width: 100%; overflow: hidden; position: relative; }
.ms-sol-c1 .ms-sol-photo { aspect-ratio: 3 / 4; background: linear-gradient(145deg, #2c3e50 0%, #1a252f 40%, #34495e 100%); }
.ms-sol-c2 .ms-sol-photo { aspect-ratio: 4 / 5; background: linear-gradient(160deg, #4a3f35 0%, #2c2418 45%, #5c4f42 100%); }
.ms-sol-photo-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase; color: rgba(255,255,255,0.4); font-weight: 400; }
.ms-sol-body { padding-top: 20px; display: flex; flex-direction: column; gap: 8px; }
.ms-sol-name { font-size: clamp(22px, 2.2vw, 28px); font-weight: 400; letter-spacing: -0.015em; color: var(--c-text); line-height: 1.15; }
.ms-sol-text { font-size: 14px; color: var(--c-text); line-height: 1.6; font-weight: 400; max-width: 380px; }
.ms-sol-arrow { font-size: 16px; color: var(--c-text); margin-top: 6px; cursor: pointer; display: inline-block; transition: transform 0.3s ease; align-self: flex-start; }
.ms-sol-arrow:hover { transform: translateX(4px); }
.ms-sol-test { display: grid; grid-template-columns: repeat(12, 1fr); column-gap: 20px; align-items: center; padding: var(--sp-2xl) var(--gutter) var(--sp-2xl); position: relative; max-width: 1400px; margin: 0 auto; }
.ms-sol-test-content { grid-column: 1 / 7; display: flex; flex-direction: column; gap: 32px; position: relative; }
.ms-sol-test-quote-wrap { display: block; position: relative; }
.ms-sol-test-marks { position: absolute; left: -0.6em; top: 0; font-size: clamp(22px, 2.4vw, 30px); font-weight: 400; color: var(--c-text); line-height: 1.35; user-select: none; }
.ms-sol-test-quote { font-size: clamp(22px, 2.4vw, 30px); font-weight: 400; letter-spacing: -0.015em; line-height: 1.35; color: var(--c-text); }
.ms-sol-test-attr { display: flex; flex-direction: column; gap: 8px; }
.ms-sol-test-name { font-size: 14px; font-weight: 400; color: var(--c-text); letter-spacing: -0.01em; }
.ms-sol-test-role { font-size: 14px; color: var(--c-text); line-height: 1.5; font-weight: 400; letter-spacing: -0.01em; }
.ms-sol-test-portrait { grid-column: 8 / 11; width: 100%; aspect-ratio: 3 / 4; border-radius: var(--radius-md); background: #b5a99a; overflow: hidden; position: relative; }
.ms-sol-test-portrait-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase; color: rgba(255,255,255,0.4); }
.ms-sol-placed-c3 { padding-bottom: var(--sp-2xl); }
.ms-sol-c3 { grid-column: 3 / 12; grid-row: 1; }
.ms-sol-c3 .ms-sol-photo { aspect-ratio: 16 / 7; }

.ms-gallery { padding: var(--section-gap) 0; background: var(--c-bg); overflow: hidden; position: relative; z-index: 10; }
.ms-gallery-inner { position: relative; max-width: 100%; }
.ms-gallery-headline { text-align: left; margin-bottom: var(--sp-2xl); position: relative; z-index: 2; }
.ms-gallery-headline h2 { font-size: clamp(40px, 5.5vw, 80px); font-weight: 400; letter-spacing: -0.04em; line-height: 0.92; color: var(--c-text); display: inline-block; }
.ms-gallery-stage { max-width: 100%; margin: 0 auto; padding: 0 var(--gutter); }

/* ── Video Player ── */
.ms-video-container { position: relative; width: 100%; border-radius: clamp(40px, 9vw, 128px); overflow: hidden; background: #0a0a0a; cursor: pointer; }
.ms-video-frame { width: 100%; aspect-ratio: 16 / 9; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.ms-video-bg { position: absolute; inset: 0; }
.ms-video-bg-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), filter 0.6s; }
.ms-video-container:hover .ms-video-bg-img { transform: scale(1.03); }
.ms-video-container.playing .ms-video-bg-img { filter: none; }
.ms-video-gradient { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(74,63,53,0) 0%, rgba(74,63,53,0.04) 50%, rgba(74,63,53,0.35) 100%); pointer-events: none; transition: opacity 0.5s; }
.ms-video-container.playing .ms-video-gradient { opacity: 0; }

/* play button */
.ms-video-play { position: absolute; z-index: 3; width: 72px; height: 72px; border-radius: 50%; background: rgba(255,255,255,0.92); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.25s cubic-bezier(0.22,1,0.36,1), opacity 0.3s, background 0.2s; }
.ms-video-play:hover { transform: scale(1.08); background: var(--c-bg); }
.ms-video-play svg { margin-left: 3px; }
.ms-video-container.playing .ms-video-play { opacity: 0; pointer-events: none; transform: scale(0.8); }

/* progress bar */
.ms-video-progress-wrap { position: absolute; bottom: 0; left: 0; right: 0; z-index: 4; padding: 0 0 0 0; opacity: 0; transition: opacity 0.3s; }
.ms-video-container.playing .ms-video-progress-wrap,
.ms-video-container.paused .ms-video-progress-wrap { opacity: 1; }
.ms-video-progress-track { width: 100%; height: 3px; background: rgba(255,255,255,0.15); cursor: pointer; transition: height 0.15s; }
.ms-video-progress-track:hover { height: 5px; }
.ms-video-progress-bar { height: 100%; background: var(--c-bg); border-radius: 0 1.5px 1.5px 0; transition: width 0.1s linear; }

/* controls overlay */
.ms-video-controls { position: absolute; bottom: 0; left: 0; right: 0; z-index: 3; display: flex; align-items: center; gap: 14px; padding: 14px 20px 18px; background: linear-gradient(to top, rgba(74,63,53,0.5) 0%, transparent 100%); opacity: 0; transition: opacity 0.3s; pointer-events: none; }
.ms-video-container.playing .ms-video-controls,
.ms-video-container.paused .ms-video-controls { opacity: 1; pointer-events: auto; }
.ms-video-ctrl-btn { background: none; border: none; color: var(--text-on-dark); cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; opacity: 0.85; transition: opacity 0.15s; }
.ms-video-ctrl-btn:hover { opacity: 1; }
.ms-video-time { font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.7); font-family: ${FONT}; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }
.ms-video-spacer { flex: 1; }
.ms-video-title-bar { position: absolute; top: 0; left: 0; right: 0; z-index: 3; display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; opacity: 0; transition: opacity 0.3s; pointer-events: none; }
.ms-video-container.playing .ms-video-title-bar,
.ms-video-container.paused .ms-video-title-bar { opacity: 1; pointer-events: auto; }
.ms-video-label { font-size: 12px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.5); font-family: ${FONT}; }

/* ── Video Tabs ── */
.ms-video-tabs { display: flex; gap: 6px; margin-top: var(--sp-sm); flex-wrap: wrap; }
.ms-video-tab { padding: 8px 18px; border-radius: var(--radius-pill); background: rgba(74,63,53,0.04); border: 1px solid rgba(74,63,53,0.06); font-size: 12px; font-weight: 500; color: var(--c-text); font-family: ${FONT}; cursor: pointer; transition: all 0.25s cubic-bezier(0.22,1,0.36,1); letter-spacing: 0.01em; }
.ms-video-tab:hover { background: rgba(74,63,53,0.07); color: var(--c-text); }
.ms-video-tab.active { background: var(--c-text); color: var(--text-on-dark); border-color: var(--c-text); }
@media (max-width: 768px) {
:root { --gutter: 24px; --section-gap: 64px; --radius-xl: 36px; }
.ms-gallery-headline { margin-bottom: var(--sp-xl); }
.ms-gallery-stage { padding: 0 var(--sp-sm); }
.ms-video-play { width: 56px; height: 56px; }
.ms-video-tabs { gap: 4px; }
.ms-video-tab { padding: 6px 14px; font-size: 12px; }
.ms-hero { min-height: 75vh; }
.ms-hero-content { padding: 100px var(--gutter) 40px; }
.ms-nav { padding: 0 var(--gutter); }
.ms-section-block-header { flex-direction: column; gap: var(--sp-sm); }
.ms-footer-inner { grid-template-columns: 1fr 1fr; gap: 32px; }
.ms-footer-logo { margin-bottom: 8px; }
.ms-ecosystem-inner { grid-template-columns: 1fr; min-height: auto; gap: var(--sp-md); }
.ms-ecosystem-canvas-wrap { max-height: 400px; }
.ms-sol-placed { grid-template-columns: 1fr; }
.ms-sol-c1, .ms-sol-c2 { grid-column: 1; padding-top: 0; padding-bottom: 40px; }
.ms-sol-test { grid-template-columns: 1fr; gap: 20px; }
.ms-sol-c3 { grid-column: 1; }
}
/* ── Budget Mixer v3 — editorial ── */
.bm { width: 100%; background: var(--c-bg); }
.bm-canvas-wrap { height: 75vh; min-height: 560px; max-height: 800px; overflow: hidden; position: relative; background: var(--c-bg); }
.bm-canvas-wrap canvas { display: block; }

/* Controls — single row of chips */
.bm-controls { padding: var(--sp-sm) var(--gutter) 12px; border-top: 1px solid rgba(74,63,53,0.06); }
.bm-chips { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

/* Channel chips — expand to include slider when ON */
.bm-chip { display: inline-flex; align-items: center; gap: 8px; padding: 9px 18px; border: 1px solid rgba(74,63,53,0.12); border-radius: 100px; cursor: pointer; background: var(--c-bg); user-select: none; transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1); font-size: 12px; color: var(--c-text); font-weight: 500; font-family: ${FONT}; line-height: 1; white-space: nowrap; }
.bm-chip:hover { border-color: var(--text-tertiary); }
.bm-chip.on { background: var(--chip-bg); color: var(--chip-color); border-color: var(--chip-bg); padding-right: 14px; }
.bm-chip.on:hover { border-color: var(--chip-color); }
.bm-chip.off { border-color: rgba(74,63,53,0.06); opacity: 0.3; }
.bm-chip.off:hover { opacity: 0.55; border-color: rgba(74,63,53,0.12); }
.bm-chip-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; transition: all 0.2s; }

/* Inline slider inside chip */
.bm-chip-slider { position: relative; width: 52px; height: 2px; flex-shrink: 0; }
.bm-chip-slider-bg { position: absolute; inset: 0; background: rgba(74,63,53,0.08); border-radius: 1px; }
.bm-chip-slider-fill { position: absolute; top: 0; left: 0; height: 100%; border-radius: 1px; transition: width 0.08s ease; }
.bm-chip-slider input { position: absolute; inset: -8px 0; width: 100%; height: 18px; -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; margin: 0; padding: 0; }
.bm-chip-slider input::-webkit-slider-thumb { -webkit-appearance: none; width: 10px; height: 10px; background: var(--sc); border-radius: 50%; cursor: grab; border: none; transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1); }
.bm-chip-slider input::-webkit-slider-thumb:hover { transform: scale(1.4); }
.bm-chip-slider input::-webkit-slider-thumb:active { cursor: grabbing; }
.bm-chip-slider input::-moz-range-thumb { width: 10px; height: 10px; background: var(--sc); border-radius: 50%; cursor: grab; border: none; }

/* Shelf — budget, presets, allocation summary */
.bm-shelf { padding: 0 var(--gutter); border-top: 1px solid rgba(74,63,53,0.04); }
.bm-shelf-row { display: flex; align-items: center; gap: 8px; padding: 10px 0; flex-wrap: wrap; }
.bm-shelf-budget { display: flex; align-items: center; gap: 8px; margin-right: 6px; }
.bm-shelf-budget-label { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--c-text); font-weight: 400; }
.bm-shelf-budget-track { position: relative; width: 64px; height: 2px; }
.bm-shelf-budget-track-bg { position: absolute; inset: 0; background: rgba(74,63,53,0.06); border-radius: 1px; }
.bm-shelf-budget-track-fill { position: absolute; top: 0; left: 0; height: 100%; background: var(--c-text); border-radius: 1px; transition: width 0.08s ease; }
.bm-shelf-budget-track input { position: absolute; inset: -8px 0; width: 100%; height: 18px; -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; margin: 0; padding: 0; }
.bm-shelf-budget-track input::-webkit-slider-thumb { -webkit-appearance: none; width: 10px; height: 10px; background: var(--c-text); border-radius: 50%; cursor: grab; border: none; }
.bm-shelf-budget-track input::-webkit-slider-thumb:hover { transform: scale(1.3); }
.bm-shelf-budget-track input::-moz-range-thumb { width: 10px; height: 10px; background: var(--c-text); border-radius: 50%; cursor: grab; border: none; }
.bm-shelf-budget-val { font-size: 12px; color: var(--c-text); font-variant-numeric: tabular-nums; font-weight: 400; }
.bm-shelf-sep { width: 1px; height: 16px; background: rgba(74,63,53,0.06); margin: 0 6px; flex-shrink: 0; }
.bm-preset { border: 1px solid rgba(74,63,53,0.08); background: transparent; padding: 6px 16px; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; border-radius: 100px; font-family: ${FONT}; color: var(--c-text); font-weight: 400; transition: all 0.2s; white-space: nowrap; }
.bm-preset:hover { border-color: rgba(74,63,53,0.2); color: var(--c-text); }
.bm-preset.active { background: var(--c-text); color: var(--text-on-dark); border-color: var(--c-text); }
.bm-shelf-alloc { font-size: 12px; color: var(--c-text); margin-left: auto; font-weight: 400; }

@media (max-width: 768px) {
.bm-chips { gap: 6px; }
.bm-chip-slider { width: 40px; }
.bm-shelf-budget-track { width: 48px; }
.bm-canvas-wrap { min-height: 420px; }
}
`;

function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function useSmoothParallax(stiffness = 120, damping = 14, mass = 1) {
  const ref = useRef(null);
  const rawRef = useRef(0);
  const springRef = useRef({ pos: 0, vel: 0 });
  const [progress, setProgress] = useState(0);
  const raf = useRef(null);
  const prevT = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let running = true;

    const update = (timestamp) => {
      if (!running) return;

      const dt = prevT.current ? Math.min((timestamp - prevT.current) / 1000, 0.064) : 0.016;
      prevT.current = timestamp;

      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const center = rect.top + rect.height / 2;
      rawRef.current = Math.max(-1, Math.min(1, 1 - (center / (vh / 2 + rect.height / 2))));

      const s = springRef.current;
      const displacement = s.pos - rawRef.current;
      const springForce = -stiffness * displacement;
      const dampingForce = -damping * s.vel;
      const accel = (springForce + dampingForce) / mass;

      s.vel += accel * dt;
      s.pos += s.vel * dt;

      const rounded = Math.round(s.pos * 10000) / 10000;
      setProgress(rounded);

      raf.current = requestAnimationFrame(update);
    };
    raf.current = requestAnimationFrame(update);
    return () => { running = false; prevT.current = null; cancelAnimationFrame(raf.current); };
  }, [stiffness, damping, mass]);

  return [ref, progress];
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerpVal = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
const mapRange = (v, inMin, inMax, outMin, outMax) => {
  const t = clamp((v - inMin) / (inMax - inMin), 0, 1);
  return outMin + (outMax - outMin) * t;
};

const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeOutQuart = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 4);
const easeOutExpo = (t) => { const c = clamp(t, 0, 1); return c === 1 ? 1 : 1 - Math.pow(2, -10 * c); };

function ScrollReveal({ children, delay = 0, y = 40, className = "", style = {} }) {
  const [ref, visible] = useScrollReveal(0.1);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        transform: visible ? "translateY(0)" : `translateY(${y}px)`,
        opacity: visible ? 1 : 0,
        transition: `transform 1s cubic-bezier(0.22, 1.2, 0.36, 1) ${delay}s, opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
        willChange: "transform, opacity",
      }}
    >
      {children}
    </div>
  );
}

/* Generate squircle SVG mask as data URI */
function squircleMask(radiusPct = 15) {
  const n = 5;
  const pts = 200;
  const path = [];
  for (let i = 0; i <= pts; i++) {
    const t = (i / pts) * 2 * Math.PI;
    const cos = Math.cos(t);
    const sin = Math.sin(t);
    const x = 50 + 50 * Math.sign(cos) * Math.pow(Math.abs(cos), 2 / n);
    const y = 50 + 50 * Math.sign(sin) * Math.pow(Math.abs(sin), 2 / n);
    path.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  path.push("Z");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='${path.join(" ")}' fill='black'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
const SQUIRCLE_MASK = squircleMask();

function ParallaxMedia({ children, className = "", style = {}, scaleFrom = 0.88, scaleTo = 1, radiusFrom = 56, radiusTo = 32 }) {
  const elRef = useRef(null);
  const springRef = useRef({ pos: 0, vel: 0 });
  const [vals, setVals] = useState({ scale: scaleFrom, radius: radiusFrom, y: 20 });
  const prevT = useRef(null);

  useEffect(() => {
    let running = true;
    const stiff = 60, damp = 12, mass = 1.4;
    const tick = (ts) => {
      if (!running) return;
      const dt = prevT.current ? Math.min((ts - prevT.current) / 1000, 0.064) : 0.016;
      prevT.current = ts;
      const el = elRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const raw = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
        const s = springRef.current;
        const disp = s.pos - raw;
        s.vel += ((-stiff * disp) + (-damp * s.vel)) / mass * dt;
        s.pos += s.vel * dt;
        const t = easeOutExpo(clamp(s.pos, 0, 1));
        setVals({
          scale: lerpVal(scaleFrom, scaleTo, t),
          radius: lerpVal(radiusFrom, radiusTo, t),
          y: lerpVal(20, 0, t),
        });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { running = false; prevT.current = null; };
  }, [scaleFrom, scaleTo, radiusFrom, radiusTo]);

  return (
    <div
      ref={elRef}
      className={className}
      style={{
        ...style,
        transform: `scale(${vals.scale}) translateY(${vals.y}px)`,
        borderRadius: vals.radius,
        willChange: "transform, border-radius",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function AnimatedHeadline({ text, tag = "h2", className = "", splitBy = "char", stagger = 0.025, baseDelay = 0 }) {
  const [ref, visible] = useScrollReveal(0.15);
  const lines = text.split("\n");

  const content = lines.map((line, li) => {
    const units = splitBy === "char" ? line.split("") : line.split(" ");
    return (
      <span key={li} style={{ display: "block", overflow: "hidden" }}>
        {units.map((unit, ui) => {
          const globalIdx = lines.slice(0, li).reduce((a, l) => a + (splitBy === "char" ? l.length : l.split(" ").length), 0) + ui;
          return (
            <span
              key={ui}
              style={{
                display: "inline-block",
                transform: visible ? "translateY(0) rotate(0deg)" : "translateY(110%) rotate(3deg)",
                opacity: visible ? 1 : 0,
                transition: `transform 0.8s cubic-bezier(0.22, 1.2, 0.36, 1) ${baseDelay + globalIdx * stagger}s, opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${baseDelay + globalIdx * stagger}s`,
                willChange: "transform, opacity",
                whiteSpace: splitBy === "word" ? "pre" : undefined,
                transformOrigin: "left bottom",
              }}
            >
              {splitBy === "word" ? (ui < units.length - 1 ? unit + " " : unit) : (unit === " " ? "\u00A0" : unit)}
            </span>
          );
        })}
      </span>
    );
  });

  const Tag = tag;
  return <Tag ref={ref} className={className}>{content}</Tag>;
}

function PixelHero({ setNavOverlay, exportCanvasRef, brushRef, clearRef, ctaRef, exportRenderRef }) {
  const canvasRef = useRef(null);
  const bufferRef = useRef(null);
  const animRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (exportCanvasRef) exportCanvasRef.current = canvasRef.current;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const buffer = document.createElement("canvas");
    bufferRef.current = buffer;
    const bCtx = buffer.getContext("2d");
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      let imgData = null;
      if (W && H) try { imgData = bCtx.getImageData(0, 0, buffer.width, buffer.height); } catch(e) {}
      const isFixed = canvas.style.position === "fixed";
      W = isFixed ? window.innerWidth : p.clientWidth;
      H = isFixed ? window.innerHeight : p.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buffer.width = W * dpr; buffer.height = H * dpr;
      bCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (imgData) try { bCtx.putImageData(imgData, 0, 0); } catch(e) {}
    };

    const BLK    = "#4a3f35";
    const BROWN  = "#311F10";
    const GREEN  = "#3D532F";
    const SAGE   = "#CAD6B2";
    const GOLD   = "#FAE19D";
    const NAVY   = "#4a3f35";
    const CLAY   = "#602926";
    const CORAL  = "#E7614C";
    const LILAC  = "#CAC0D9";
    const SAND   = "#E7CAAD";
    const WARM   = "#E6E0D2";

    const TXT = {
      [NAVY]:  "#75728f",
      [BROWN]: "#a46835",
      [GREEN]: "#5d7f48",
      [SAGE]:  "#697c42",
      [GOLD]:  "#91711a",
      [CLAY]:  "#ba5752",
      [CORAL]: "#d63e26",
      [LILAC]: "#826ba6",
      [SAND]:  "#a2692f",
    };

    // Color pairs — used for text on colored backgrounds
    const COLOR_PAIRS = {
          [SAGE]: GREEN, [GREEN]: SAGE, [SAND]: CLAY, [CLAY]: SAND,
          [GOLD]: BROWN, [BROWN]: GOLD, [LILAC]: NAVY, [NAVY]: LILAC,
          [WARM]: BROWN, [CORAL]: BROWN,
        };

    // Circle text uses same colors as expanded panel text (COLOR_PAIRS)
    const TONE = {};
    const TONE_SUB = {};
    Object.keys(TXT).forEach(k => {
      TONE[k] = COLOR_PAIRS[k] || "#4a3f35";
      TONE_SUB[k] = COLOR_PAIRS[k] || "#4a3f35";
    });

    const ND = [
      { label: "Reach",    big: "1B+",  sub: "users",          c: NAVY   },
      { label: "Copilot",  big: "73%",  sub: "higher CTR",     c: GREEN  },
      { label: "PMax",     big: "AI",   sub: "omnichannel",    c: CORAL  },
      { label: "LinkedIn", big: "B2B",  sub: "exclusive",      c: BROWN  },
      { label: "CPC",      big: "–50%", sub: "savings",        c: GREEN  },
      { label: "Audience", big: "70%",  sub: "aged 35–65",     c: GOLD   },
      { label: "Agents",   big: "294%", sub: "purchase lift",  c: CLAY   },
      { label: "CTV",      big: "2×",   sub: "growth",         c: SAND   },
      { label: "Clarity",  big: "→",    sub: "analytics",      c: SAGE   },
      { label: "Import",   big: "1",    sub: "click",          c: NAVY   },
      { label: "Commerce", big: "1P",   sub: "retail data",    c: LILAC  },
      { label: "Showroom", big: "AI",   sub: "immersive",      c: CORAL  },
    ];
    const NODE_R = 40; // uniform radius — fits "$100K+" + "Enterprise"

    // Randomize positions using Poisson-disc sampling
    // Uses aspect-aware distance to prevent overlap at any canvas ratio
    const randSeed = Date.now() % 100000;
    let _rs = randSeed;
    const seededRand = () => { _rs = (_rs * 16807 + 0) % 2147483647; return _rs / 2147483647; };

    const margin = 0.10;
    const maxAttempts = 500;
    const placedPts = [];
    const minPixelDist = NODE_R * 2.8;

    // Exclusion zone: headline + CTA area (top-left quadrant)
    // Headline sits at ~x:0-50%, y:15-42%, CTA at ~x:0-25%, y:44-56%
    const isExcluded = (px, py) => {
      // Headline block
      if (px < 0.55 && py > 0.12 && py < 0.44) return true;
      // CTA buttons
      if (px < 0.30 && py > 0.42 && py < 0.60) return true;
      return false;
    };

    ND.forEach((d) => {
      let bestPt = null;
      let bestMinDist = -1;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const px = margin + seededRand() * (1 - margin * 2);
        const py = margin + seededRand() * (1 - margin * 2);

        // Skip if in exclusion zone
        if (isExcluded(px, py)) continue;

        // Check distance in actual pixels
        let minD = Infinity;
        for (let j = 0; j < placedPts.length; j++) {
          const dpx = (px - placedPts[j].px) * W;
          const dpy = (py - placedPts[j].py) * H;
          const dist = Math.sqrt(dpx * dpx + dpy * dpy);
          if (dist < minD) minD = dist;
        }

        if (minD >= minPixelDist) {
          bestPt = { px, py };
          break;
        }
        if (minD > bestMinDist) {
          bestMinDist = minD;
          bestPt = { px, py };
        }
      }

      d.px = bestPt.px;
      d.py = bestPt.py;
      placedPts.push(bestPt);
    });

    // Parallax entrance: each dot has a staggered birth time and Y offset
    const dotBirthTime = performance.now();
    const dotEntranceDelays = ND.map((_, i) => i * 120 + seededRand() * 200);
    const dotEntranceOffsets = ND.map(() => 30 + seededRand() * 50); // 30-80px upward travel

    let nodes = [];
    const DISC_R = 50;
    /* Subtle drift: each node gets unique sin-based floating */
    const driftSeeds = ND.map((_, i) => ({
      ax: 1.5 + Math.sin(i * 7.3) * 1.0,   /* x amplitude: 0.5–2.5px */
      ay: 1.2 + Math.cos(i * 5.1) * 0.8,   /* y amplitude: 0.4–2.0px */
      fx: 0.15 + Math.sin(i * 3.7) * 0.08,  /* x frequency */
      fy: 0.12 + Math.cos(i * 4.9) * 0.06,  /* y frequency */
      px: i * 1.3,                            /* x phase offset */
      py: i * 2.1,                            /* y phase offset */
    }));
    const hiddenDriftSeeds = Array.from({ length: 30 }, (_, i) => ({
      ax: 1.0 + Math.sin(i * 9.1) * 0.6,
      ay: 0.8 + Math.cos(i * 6.3) * 0.5,
      fx: 0.10 + Math.sin(i * 4.2) * 0.05,
      fy: 0.08 + Math.cos(i * 5.7) * 0.04,
      px: i * 2.7,
      py: i * 1.9,
    }));
    let globalTime = 0;

    const HIDDEN = [
      { px: 0.36, py: 0.80, big: "550M",  label: "MSN",        c: CORAL,  title: "MSN Network",         unit: "monthly active users",    lines: ["One of the top 5 portals globally", "News · Finance · Sports · Weather", "Premium display inventory", "High-viewability placements"] },
      { px: 0.64, py: 0.82, big: "42%",   label: "Savings",    c: GOLD,   title: "CPC Savings",         unit: "average discount",        lines: ["Lower competition, better rates", "Less bidding pressure per keyword", "Higher ROAS per dollar spent", "Especially strong in B2B verticals"] },
      { px: 0.28, py: 0.92, big: "$19B",  label: "Revenue",    c: CORAL,  title: "Ad Revenue",          unit: "annual 2025",             lines: ["Fastest growing major ad platform", "Search + Display + LinkedIn", "40% year-over-year growth", "Gaming & CTV driving new spend"] },
      { px: 0.72, py: 0.94, big: "16",    label: "Languages",  c: GOLD,   title: "Global Languages",    unit: "languages supported",     lines: ["Copilot campaign tools multilingual", "Auto-translation for ad copy", "Local market optimization", "Expanding quarterly"] },
      { px: 0.50, py: 0.96, big: "33%",   label: "Journeys",   c: SAND,   title: "Shorter Journeys",    unit: "faster conversion paths", lines: ["AI-optimized landing experiences", "Fewer clicks to purchase", "Copilot reduces decision friction", "Measured across all verticals"] },
      { px: 0.06, py: 0.06, big: "65%",   label: "Enterprise",  c: NAVY,  title: "Enterprise AI",       unit: "Fortune 500 on Azure",    lines: ["Deep integration with Azure stack", "First-party data activation", "Enterprise-grade compliance", "SSO & role-based access"] },
      { px: 0.94, py: 0.08, big: "80%",   label: "B2B",        c: GREEN,  title: "Decision Makers",     unit: "of audience are B2B",     lines: ["C-suite & senior management reach", "LinkedIn profile targeting", "Company size & industry filters", "Purchase intent signals"] },
      { px: 0.06, py: 0.72, big: "400M",  label: "M365",       c: NAVY,   title: "Microsoft 365",       unit: "commercial users",        lines: ["Outlook · Teams · Office apps", "Native ad placements in workflow", "Professional context targeting", "Highest engagement during work hours"] },
      { px: 0.94, py: 0.50, big: "30",    label: "Markets",    c: GREEN,  title: "Partner Markets",     unit: "countries with partners", lines: ["Global agency partnerships", "Local market expertise included", "Currency & timezone optimization", "Dedicated market support teams"] },
      { px: 0.05, py: 0.90, big: "53%",   label: "Copilot+",   c: NAVY,   title: "Copilot Commerce",    unit: "purchase lift",           lines: ["AI-assisted product discovery", "Conversational shopping in Copilot", "Personalized recommendations", "Brands embedded in AI answers"] },
      { px: 0.95, py: 0.62, big: "1P",    label: "Data",       c: GREEN,  title: "First-Party Data",    unit: "retailer data access",    lines: ["PromoteIQ retail media network", "Verified purchase data", "Closed-loop attribution", "Non-endemic brand access"] },
      { px: 0.08, py: 0.74, big: "22%",   label: "Spend",      c: GOLD,   title: "Higher Spend",        unit: "more online spend",       lines: ["Microsoft audience outspends avg", "35–65 age bracket most active", "Desktop & mobile combined", "Premium product categories"] },
      { px: 0.78, py: 0.10, big: "→",     label: "Migrate",    c: NAVY,   title: "Easy Migration",      unit: "one-click import",        lines: ["Import existing campaigns instantly", "Import from Meta & Pinterest too", "Budget & bid mapping included", "Go live in under 30 minutes"] },
      { px: 0.88, py: 0.56, big: "2×",    label: "ROAS",       c: CLAY,   title: "Return on Ad Spend",  unit: "with Epsilon integration", lines: ["Epsilon identity resolution", "Cross-device attribution", "Offline-to-online measurement", "Proven across retail & CPG"] },
      { px: 0.42, py: 0.68, big: "360M",  label: "Teams",      c: NAVY,   title: "Microsoft Teams",     unit: "monthly active users",    lines: ["Ad placements in Teams feed", "Professional audience context", "Meeting & chat adjacent", "Growing enterprise channel"] },
      { px: 0.58, py: 0.62, big: "Xbox",  label: "Gaming",     c: GREEN,  title: "Gaming Ads",          unit: "Xbox & PC gaming",        lines: ["In-game ad placements", "Candy Crush · Solitaire · Minecraft", "200M+ monthly gamers", "Non-skippable high-attention formats"] },
      { px: 0.84, py: 0.46, big: "AI",    label: "Audio",      c: NAVY,   title: "Audio Ads",           unit: "Copilot Daily podcast",   lines: ["AI-generated daily briefings", "Sponsored audio segments", "Personalized to listener interests", "New format launching 2025"] },
      { px: 0.16, py: 0.64, big: "$100K+",label: "Income",     c: GOLD,   title: "High Earners",        unit: "household income $100K+", lines: ["33% of Microsoft audience", "Premium purchasing power", "Higher-income demographic skew", "Luxury · Finance · Tech verticals"] },
    ];
    const HIDDEN_R = NODE_R; // same size as main nodes

    let hiddenNodes = [];

    function layoutHidden() {
      hiddenNodes = HIDDEN.map((d, i) => ({
        ...d,
        x: d.px * W, y: d.py * H,
        found: hiddenNodes[i] ? hiddenNodes[i].found : false,
        foundT: hiddenNodes[i] ? hiddenNodes[i].foundT : 0,
        prog: hiddenNodes[i] ? hiddenNodes[i].prog : 0,
        // Physics properties for collision
        vx: hiddenNodes[i] ? hiddenNodes[i].vx : 0,
        vy: hiddenNodes[i] ? hiddenNodes[i].vy : 0,
        angle: hiddenNodes[i] ? hiddenNodes[i].angle : 0,
        angVel: hiddenNodes[i] ? hiddenNodes[i].angVel : 0,
        ox: hiddenNodes[i] ? hiddenNodes[i].ox : 0,
        oy: hiddenNodes[i] ? hiddenNodes[i].oy : 0,
        mass: 1.0,
        // Hover
        hoverScale: hiddenNodes[i] ? hiddenNodes[i].hoverScale : 1.0,
      }));
    }

    function layout() {
      nodes = ND.map((d, i) => ({
        ...d,
        x: d.px * W, y: d.py * H,
        discovered: nodes[i] ? nodes[i].discovered : false,
        discT: nodes[i] ? nodes[i].discT : 0,
        prog: nodes[i] ? nodes[i].prog : 0,
        // Physics properties for collision
        vx: nodes[i] ? nodes[i].vx : 0,
        vy: nodes[i] ? nodes[i].vy : 0,
        angle: nodes[i] ? nodes[i].angle : 0,
        angVel: nodes[i] ? nodes[i].angVel : 0,
        // Offset from base position (physics displacement)
        ox: nodes[i] ? nodes[i].ox : 0,
        oy: nodes[i] ? nodes[i].oy : 0,
        mass: 1.0,
        // Hover
        hoverScale: nodes[i] ? nodes[i].hoverScale : 1.0,
      }));
      layoutHidden();
    }

    if (clearRef) clearRef.current = () => {
      bCtx.clearRect(0, 0, buffer.width, buffer.height);
      nodes.forEach(n => { n.discovered = false; n.discT = 0; n.prog = 0; n.vx = 0; n.vy = 0; n.ox = 0; n.oy = 0; n.angle = 0; n.angVel = 0; n.hoverScale = 1; });
      hiddenNodes.forEach(h => { h.found = false; h.foundT = 0; h.prog = 0; h.vx = 0; h.vy = 0; h.ox = 0; h.oy = 0; h.angle = 0; h.angVel = 0; h.hoverScale = 1; });
    };

    // Export render — draws canvas with interpolated circle sizes
    // t: 0 = full data circles, 1 = minimal dots. Supports any value 0–1 for animation.
    if (exportRenderRef) exportRenderRef.current = (t = 0) => {
      const exp = document.createElement("canvas");
      exp.width = canvas.width;
      exp.height = canvas.height;
      const ectx = exp.getContext("2d");
      const s = window.devicePixelRatio || 1;
      ectx.setTransform(s, 0, 0, s, 0, 0);

      ectx.fillStyle = "#f8f4ee";
      ectx.fillRect(0, 0, W, H);
      ectx.drawImage(buffer, 0, 0, buffer.width, buffer.height, 0, 0, W, H);

      const FONT_FAM = "'Segoe UI', system-ui, sans-serif";
      const MIN_R = 14; // minimal dot radius
      const toneColor = { "#FAE19D": "#4a3f35", "#E7614C": "#fff", "#CAD6B2": "#4a3f35", "#4a3f35": "#f8f4ee", "#602926": "#f8f4ee", "#CAC0D9": "#4a3f35", "#E7CAAD": "#4a3f35", "#3D532F": "#f8f4ee", "#311F10": "#f8f4ee" };
      const subColor = { "#FAE19D": "rgba(74,63,53,0.6)", "#E7614C": "rgba(255,255,255,0.7)", "#CAD6B2": "rgba(74,63,53,0.6)", "#4a3f35": "rgba(248,244,238,0.6)", "#602926": "rgba(248,244,238,0.6)", "#CAC0D9": "rgba(74,63,53,0.6)", "#E7CAAD": "rgba(74,63,53,0.6)", "#3D532F": "rgba(248,244,238,0.6)", "#311F10": "rgba(248,244,238,0.6)" };

      const drawCircle = (cx, cy, fullR, c, big, label, prog) => {
        // Interpolate radius: full → minimal dot
        const r = fullR + (MIN_R - fullR) * t;
        ectx.beginPath();
        ectx.arc(cx, cy, Math.max(1, r), 0, Math.PI * 2);
        ectx.fillStyle = c;
        ectx.fill();

        // Text fades out as t approaches 1
        const textAlpha = 1 - t;
        if (textAlpha > 0.01 && prog > 0.4) {
          ectx.globalAlpha = textAlpha;
          ectx.textAlign = "center";
          ectx.textBaseline = "middle";
          const ratio = r / NODE_R;
          ectx.font = "500 " + Math.max(1, 16 * ratio) + "px " + FONT_FAM;
          ectx.fillStyle = toneColor[c] || "#f8f4ee";
          ectx.fillText(big, cx, cy - 4 * ratio);
          if (prog > 0.55) {
            ectx.font = "500 " + Math.max(1, 9 * ratio) + "px " + FONT_FAM;
            ectx.fillStyle = subColor[c] || "rgba(248,244,238,0.6)";
            ectx.fillText(label, cx, cy + 12 * ratio);
          }
          ectx.globalAlpha = 1;
        }
      };

      // As t→1 (minimal), reduce drift+physics offset so dots settle near base position
      const driftScale = 1 - t * 0.7; // at t=1, drift is 30% of original

      nodes.forEach((n, i) => {
        if (!n.discovered || n.prog < 0.05) return;
        const ds = driftSeeds[i];
        const nx = n.x + (Math.sin(globalTime * ds.fx + ds.px) * ds.ax + (n.ox || 0)) * driftScale;
        const ny = n.y + (Math.cos(globalTime * ds.fy + ds.py) * ds.ay + (n.oy || 0)) * driftScale;
        const fullR = NODE_R * n.prog * (n.hoverScale || 1);
        drawCircle(nx, ny, fullR, n.c, n.big, n.label, n.prog);
      });

      hiddenNodes.forEach((h, hi) => {
        if (!h.found || h.prog < 0.05) return;
        const hds = hiddenDriftSeeds[hi % hiddenDriftSeeds.length];
        const hx = h.x + (Math.sin(globalTime * hds.fx + hds.px) * hds.ax + (h.ox || 0)) * driftScale;
        const hy = h.y + (Math.cos(globalTime * hds.fy + hds.py) * hds.ay + (h.oy || 0)) * driftScale;
        const fullR = NODE_R * h.prog * (h.hoverScale || 1);
        drawCircle(hx, hy, fullR, h.c, h.big, h.label, h.prog);
      });

      nodes.forEach((n, i) => {
        if (n.discovered) return;
        const ds = driftSeeds[i];
        ectx.beginPath();
        ectx.arc(n.x + Math.sin(globalTime * ds.fx + ds.px) * ds.ax, n.y + Math.cos(globalTime * ds.fy + ds.py) * ds.ay, 3.5, 0, Math.PI * 2);
        ectx.fillStyle = "#4a3f35";
        ectx.fill();
      });

      return exp.toDataURL("image/png");
    };

    const ink = { active: false, lx: 0, ly: 0, lt: 0, vel: 0 };
    const strokePts = [];

    let _seed = 42;
    const srand = () => { _seed = (_seed * 16807 + 0) % 2147483647; return _seed / 2147483647; };

    const getInkColor = () => brushRef?.current?.color || BLK;
    const getInkOpacity = () => brushRef?.current?.opacity ?? 0.9;

    const drawCatmullRom = (targetCtx, points, inkColor, inkAlpha, srandFn) => {
      if (points.length < 2) return;
      targetCtx.lineCap = "round";
      targetCtx.lineJoin = "round";
      targetCtx.strokeStyle = inkColor;

      if (points.length === 2) {
        const [a, b] = points;
        targetCtx.globalAlpha = inkAlpha;
        targetCtx.lineWidth = (a.w + b.w) / 2;
        targetCtx.beginPath();
        targetCtx.moveTo(a.x, a.y);
        targetCtx.lineTo(b.x, b.y);
        targetCtx.stroke();
        targetCtx.globalAlpha = 1;
        return;
      }

      const n = points.length;
      const segs = 16;
      for (let s = 0; s < n - 1; s++) {
        const p0 = points[Math.max(0, s - 1)];
        const p1 = points[s];
        const p2 = points[Math.min(n - 1, s + 1)];
        const p3 = points[Math.min(n - 1, s + 2)];

        for (let i = 0; i < segs; i++) {
          const t = i / segs;
          const tN = (i + 1) / segs;
          const cx  = 0.5*((-p0.x + 3*p1.x - 3*p2.x + p3.x)*t*t*t + (2*p0.x - 5*p1.x + 4*p2.x - p3.x)*t*t + (-p0.x + p2.x)*t + 2*p1.x);
          const cy  = 0.5*((-p0.y + 3*p1.y - 3*p2.y + p3.y)*t*t*t + (2*p0.y - 5*p1.y + 4*p2.y - p3.y)*t*t + (-p0.y + p2.y)*t + 2*p1.y);
          const cx2 = 0.5*((-p0.x + 3*p1.x - 3*p2.x + p3.x)*tN*tN*tN + (2*p0.x - 5*p1.x + 4*p2.x - p3.x)*tN*tN + (-p0.x + p2.x)*tN + 2*p1.x);
          const cy2 = 0.5*((-p0.y + 3*p1.y - 3*p2.y + p3.y)*tN*tN*tN + (2*p0.y - 5*p1.y + 4*p2.y - p3.y)*tN*tN + (-p0.y + p2.y)*tN + 2*p1.y);

          const w = p1.w + (p2.w - p1.w) * ((t + tN) / 2);

          targetCtx.globalAlpha = inkAlpha * (0.9 + srandFn() * 0.1);
          targetCtx.lineWidth = Math.max(0.3, w);
          targetCtx.beginPath();
          targetCtx.moveTo(cx, cy);
          targetCtx.lineTo(cx2, cy2);
          targetCtx.stroke();
        }
      }
      targetCtx.globalAlpha = 1;
    };

    const drawSmoothSegment = (points) => {
      drawCatmullRom(bCtx, points, getInkColor(), getInkOpacity(), srand);
    };

    const inkDust = (x, y, intensity) => {
      const count = Math.floor(intensity * 2);
      const inkColor = getInkColor();
      for (let i = 0; i < count; i++) {
        const ang = srand() * Math.PI * 2;
        const d = 1 + srand() * intensity * 4;
        bCtx.globalAlpha = 0.08 + srand() * 0.12;
        bCtx.beginPath();
        bCtx.arc(x + Math.cos(ang) * d, y + Math.sin(ang) * d, 0.2 + srand() * 0.3, 0, Math.PI * 2);
        bCtx.fillStyle = inkColor;
        bCtx.fill();
      }
      bCtx.globalAlpha = 1;
    };

    const stamp = (x0, y0, x1, y1, w) => {
      const smoothW = brushRef?.current?.smoothing ?? 8;
      strokePts.push({ x: x1, y: y1, w, t: performance.now() });
      if (strokePts.length > smoothW) strokePts.shift();
      if (strokePts.length >= 2) {
        drawSmoothSegment(strokePts.slice(-Math.min(4, strokePts.length)));
      }
    };

    const discover = (idx, now) => {
      if (nodes[idx].discovered) return;
      nodes[idx].discovered = true;
      nodes[idx].discT = now;
    };

    const expanded = {
      active: false,
      nodeIdx: -1,
      prog: 0,        /* 0→1 circle expansion */
      contentProg: 0,  /* 0→1 text fade-in */
      closing: false,
    };

    const richContent = [
      { title: "Reach", stat: "1B+", unit: "monthly users", pages: [
        "Microsoft Advertising connects you to over one billion monthly users across Bing, Yahoo, DuckDuckGo, AOL, Outlook, Xbox, MSN and Edge. 66 million of these users are unreachable on any other platform.",
        "That's 23% of US search volume — premium, high-intent traffic your competitors are missing. The Microsoft Search Network reaches users across every major browser and device.",
        "With Microsoft's ecosystem spanning productivity, gaming and social, you get diverse touchpoints at every stage of the customer journey."
      ]},
      { title: "Copilot", stat: "73%", unit: "higher click-through rate", pages: [
        "Microsoft Copilot transforms campaign management with AI-powered creation, natural language diagnostics and real-time optimization. Tasks that once took 30 minutes now take one or two.",
        "Advertisers using Copilot see 73% higher click-through rates. The AI suggests bid strategies, generates ad copy variations and identifies underperforming keywords automatically.",
        "Copilot is free for every Microsoft Advertising account — no premium tier, no additional cost. Just ask it what you need in plain language."
      ]},
      { title: "Performance Max", stat: "AI", unit: "omnichannel optimization", pages: [
        "Performance Max uses AI to dynamically assemble your ads across the entire Microsoft network — Search, Display, Native, Video and Audience.",
        "It pulls in LinkedIn profile targeting automatically, optimizes bidding in real time and distributes budget where conversion probability is highest.",
        "Creative assets are mixed and matched by machine learning to find the highest-performing combinations for each audience segment."
      ]},
      { title: "LinkedIn", stat: "B2B", unit: "exclusive targeting", pages: [
        "Only Microsoft Advertising offers LinkedIn profile targeting — job title, company, industry and seniority — powered by the $26.2 billion acquisition.",
        "B2B engagement has grown 55% in two years. No other ad platform gives you this level of professional audience precision.",
        "Layer LinkedIn segments on top of search intent to reach decision-makers actively researching your category."
      ]},
      { title: "Lower CPC", stat: "–50%", unit: "average savings", pages: [
        "Microsoft Advertising delivers significantly cheaper cost per click, with roughly half the advertiser competition. Average CPCs run around £1.17 across key verticals.",
        "Less noise means higher conversion rates. Your ads appear in less crowded auctions where purchase intent is equally strong.",
        "Especially powerful for B2B verticals where Google CPCs have risen 15–20% year over year."
      ]},
      { title: "Audience", stat: "70%", unit: "aged 35–65", pages: [
        "70% of Microsoft's search audience is aged 35 to 65 — peak earning years. One in three earns over $100,000 in household income.",
        "They spend 22% more online than average and 80% are B2B decision-makers. This is the audience that signs purchase orders.",
        "Younger demographics are growing too — Edge and Copilot adoption is pulling in 18–34 users at an accelerating rate."
      ]},
      { title: "Brand Agents", stat: "294%", unit: "purchase intent lift", pages: [
        "Brand Agents are AI-powered shopping assistants that live on your site and inside Copilot. They guide customers through conversational product discovery in real time.",
        "Early results show a 294% increase in purchase intent and 53% lift in completed transactions. Personalized recommendations adapt to each user's context.",
        "Brands embedded in Copilot answers reach users at the moment of decision — before they ever see a traditional search result."
      ]},
      { title: "Video & CTV", stat: "2×", unit: "budget growth", pages: [
        "Connected TV advertising through Microsoft reaches audiences on Xbox consoles, PC and mobile — including placements in Candy Crush and Microsoft Casual Games.",
        "CTV budgets across the platform have doubled between 2023 and 2025 as advertisers discover high-attention, non-skippable formats.",
        "200M+ monthly gamers see your ads in premium, brand-safe environments with completion rates above 90%."
      ]},
      { title: "Clarity", stat: "→", unit: "free analytics", pages: [
        "Microsoft Clarity gives you free session replays and heatmaps filtered by campaign, ad group and keyword.",
        "See exactly where users click, scroll and drop off after arriving from your ads. Post-click friction analysis is built directly into the dashboard.",
        "Identify UX issues costing you conversions — dead clicks, rage clicks, excessive scrolling — all mapped to your ad traffic."
      ]},
      { title: "Easy Import", stat: "1", unit: "click import", pages: [
        "Import your existing campaigns in a single click. Budget mapping, bid strategies and brand assets transfer automatically.",
        "Most advertisers go live in under 30 minutes — same campaigns, new premium audience, zero rebuild.",
        "Also supports import from Meta, Pinterest and Amazon Ads. Bring your entire multi-platform strategy into one dashboard."
      ]},
      { title: "Commerce", stat: "1P", unit: "retail data access", pages: [
        "Curate for Commerce gives brands direct access to retailer first-party purchase data. Sponsored Promotions place products inside retailer experiences.",
        "Verified transaction signals power closed-loop attribution. Know exactly which impressions drove in-store and online sales.",
        "Even non-endemic advertisers can reach high-intent shoppers — financial services, insurance and auto brands see strong results."
      ]},
      { title: "Showroom Ads", stat: "AI", unit: "immersive experiences", pages: [
        "Showroom Ads create immersive, AI-generated product exploration experiences directly inside Copilot chat.",
        "Customers compare options, read contextual reviews and interact with rich product detail — all without leaving the conversation.",
        "Early tests show transformative engagement metrics. The format turns passive browsing into active shopping."
      ]},
    ];

    const press = { active: false };

    const hitTestAny = (mx, my, radius) => {
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!n.discovered || n.prog < 0.5) continue;
        const ds = driftSeeds[i];
        const effX = n.x + (n.ox || 0) + Math.sin(globalTime * ds.fx + ds.px) * ds.ax;
        const effY = n.y + (n.oy || 0) + Math.cos(globalTime * ds.fy + ds.py) * ds.ay;
        const dx = mx - effX, dy = my - effY;
        if (dx*dx + dy*dy < radius * radius) return { type: "node", idx: i };
      }
      for (let i = 0; i < hiddenNodes.length; i++) {
        const h = hiddenNodes[i];
        if (!h.found || h.prog < 0.5) continue;
        const hds = hiddenDriftSeeds[i % hiddenDriftSeeds.length];
        const effX = h.x + (h.ox || 0) + Math.sin(globalTime * hds.fx + hds.px) * hds.ax;
        const effY = h.y + (h.oy || 0) + Math.cos(globalTime * hds.fy + hds.py) * hds.ay;
        const dx = mx - effX, dy = my - effY;
        if (dx*dx + dy*dy < radius * radius) return { type: "hidden", idx: i };
      }
      return null;
    };

    const onDown = (e) => {
      if (!e.touches && e.button !== 0) return;
      const r = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      const mx = t.clientX - r.left, my = t.clientY - r.top;

      if (expanded.active && !expanded.closing) {
        // Check page nav hit areas before closing
        const MARGIN = Math.round(W * 0.025);
        const navY = H * 0.08;
        // "← Back" button area (left side)
        if (mx < MARGIN + 80 && my > navY - 16 && my < navY + 16) {
          expanded.closing = true;
          return;
        }
        // "←" prev page button
        const prevX = W - MARGIN - 60;
        const nextX = W - MARGIN - 20;
        if (expanded.pages && expanded.pages.length > 1) {
          if (mx > prevX - 20 && mx < prevX + 20 && my > navY - 16 && my < navY + 16) {
            expanded.page = ((expanded.page || 0) - 1 + expanded.pages.length) % expanded.pages.length;
            expanded.contentProg = 0.3; // quick re-entrance
            return;
          }
          if (mx > nextX - 20 && mx < nextX + 20 && my > navY - 16 && my < navY + 16) {
            expanded.page = ((expanded.page || 0) + 1) % expanded.pages.length;
            expanded.contentProg = 0.3; // quick re-entrance
            return;
          }
        }
        expanded.closing = true;
        return;
      }
      if (expanded.active) return;

      const HIT = 45;
      const hit = hitTestAny(mx, my, HIT);
      if (hit) {
        expanded.active = true;
        expanded.nodeIdx = hit.idx;
        expanded.isHidden = hit.type === "hidden";
        expanded.prog = 0;
        expanded.contentProg = 0;
        expanded.closing = false;
        expanded.page = 0;
        expanded.pages = null; // will be set during rendering
        setIsExpanded(true);
        const nd = hit.type === "hidden" ? hiddenNodes[hit.idx] : nodes[hit.idx];
        expanded.originX = nd.x + (nd.ox || 0);
        expanded.originY = nd.y + (nd.oy || 0);
        return;
      }

      press.active = true;
    };
    const onUp = () => { press.active = false; };

    // Hover state — tracked continuously, consumed by draw loop
    const hover = { type: null, idx: -1 };

    const onMove = (e) => {
      if (expanded.active) return;
      const tracing = brushRef?.current?.traceMode;
      const isDrawing = e.touches || (e.buttons & 1) || tracing;
      const r = canvas.getBoundingClientRect();
      const mx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      const my = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
      const now = performance.now();

      const hit = hitTestAny(mx, my, 48);
      if (hit) {
        hover.type = hit.type;
        hover.idx = hit.idx;
        canvas.parentElement.style.cursor = "pointer";
      } else {
        hover.type = null;
        hover.idx = -1;
        canvas.parentElement.style.cursor = "crosshair";
      }

      if (!isDrawing) { ink.active = false; return; }

      if (!ink.active) {
        ink.active = true;
        ink.lx = mx; ink.ly = my; ink.lt = now; ink.vel = 0;
        strokePts.length = 0;
        strokePts.push({ x: mx, y: my, w: 1.5, t: now });
        return;
      }

      const dx = mx - ink.lx, dy = my - ink.ly;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 1.5) return;

      const dt = Math.max(1, now - ink.lt);
      const speed = dist / dt;
      ink.vel = ink.vel * 0.65 + speed * 0.35;

      const angle = Math.atan2(dy, dx);
      const nibEffect = Math.abs(Math.sin(angle - 0.7)); /* ~40° nib angle */
      const brushSize = brushRef?.current?.size ?? 1;
      const velWidth = Math.max(0.5, Math.min(5, 5 - ink.vel * 3));
      const baseW = velWidth * (0.6 + nibEffect * 0.4) * brushSize;
      const w = press.active ? baseW * 2.5 : baseW;

      stamp(ink.lx, ink.ly, mx, my, w);

      if (strokePts.length > 4) {
        const prev = strokePts[strokePts.length - 4];
        const prevAngle = Math.atan2(ink.ly - prev.y, ink.lx - prev.x);
        const angleDiff = Math.abs(angle - prevAngle);
        if (angleDiff > 1.2 && ink.vel > 0.5) {
          inkDust(mx, my, angleDiff * 0.3);
        }
      }

      nodes.forEach((n, i) => {
        if (n.discovered) return;
        const ndx = mx - n.x, ndy = my - n.y;
        if (ndx*ndx + ndy*ndy < DISC_R * DISC_R) {
          discover(i, now);
        }
      });

      hiddenNodes.forEach((h) => {
        if (h.found) return;
        const hdx = mx - h.x, hdy = my - h.y;
        if (hdx*hdx + hdy*hdy < HIDDEN_R * HIDDEN_R) {
          h.found = true;
          h.foundT = now;
        }
      });

      ink.lx = mx; ink.ly = my; ink.lt = now;
    };

    const onLeave = () => {
      ink.active = false;
      press.active = false;
      strokePts.length = 0;
      hover.type = null;
      hover.idx = -1;
    };
    const onEnter = () => { ink.active = false; strokePts.length = 0; };

    const hero = canvas.parentElement;
    hero.style.cursor = "crosshair";
    hero.addEventListener("mousedown", onDown);
    hero.addEventListener("mouseup", onUp);
    hero.addEventListener("mousemove", onMove);
    hero.addEventListener("mouseleave", onLeave);
    hero.addEventListener("mouseenter", onEnter);
    hero.addEventListener("touchstart", (e) => { e.preventDefault(); ink.active = false; onDown(e); onMove(e); }, { passive: false });
    hero.addEventListener("touchmove", (e) => { e.preventDefault(); onMove(e); }, { passive: false });
    hero.addEventListener("touchend", onUp);

    const demoBuffer = document.createElement("canvas");
    const dCtx = demoBuffer.getContext("2d");
    const demo = {
      active: true,
      phase: 0,        // 0=wait, 1=drawing, 2=pause, 3=fadeout
      t: 0,
      userTouched: false,
      opacity: 1,
      cursorX: 0, cursorY: 0,
      prevX: 0, prevY: 0,
      vel: 0,
      pts: [],         // stroke points for Catmull-Rom
    };

    const resizeDemo = () => {
      demoBuffer.width = buffer.width;
      demoBuffer.height = buffer.height;
    };

    const demoPath = (t) => {
      const n = ND[0];
      const sx = 0.12, sy = 0.10;
      const ex = n.px, ey = n.py;
      const c1x = 0.22, c1y = 0.03;
      const c2x = 0.38, c2y = 0.12;
      const u = Math.min(1, t);
      const inv = 1 - u;
      return {
        x: inv*inv*inv*sx + 3*inv*inv*u*c1x + 3*inv*u*u*c2x + u*u*u*ex,
        y: inv*inv*inv*sy + 3*inv*inv*u*c1y + 3*inv*u*u*c2y + u*u*u*ey,
      };
    };

    const demoDraw = (points) => {
      drawCatmullRom(dCtx, points, BLK, 0.9, srand);
    };

    const killDemo = () => {
      if (!demo.active) return;
      demo.userTouched = true;
      demo.phase = 3;
      demo.t = 0;
    };
    hero.addEventListener("mousedown", killDemo, { once: true });
    hero.addEventListener("touchstart", killDemo, { once: true });

    resize(); layout(); resizeDemo();
    window.addEventListener("resize", () => { resize(); layout(); resizeDemo(); });

    let startT = 0;

    const draw = (ts) => {
      if (!startT) startT = ts;
      const t = (ts - startT) / 1000;
      const now = performance.now();
      ctx.clearRect(0, 0, W, H);

      nodes.forEach((n, i) => { n.x = ND[i].px * W; n.y = ND[i].py * H; });

      if (demo.active) {
        const WAIT = 1.0;
        const DRAW_DUR = 1.8;
        const PAUSE = 0.6;
        const FADE = 0.8;

        if (demo.phase === 0) {
          demo.t += 1/60;
          if (demo.t >= WAIT) {
            demo.phase = 1; demo.t = 0;
            const sp = demoPath(0);
            demo.cursorX = sp.x * W; demo.cursorY = sp.y * H;
            demo.prevX = demo.cursorX; demo.prevY = demo.cursorY;
            demo.vel = 0;
            demo.pts = [{ x: demo.cursorX, y: demo.cursorY, w: 2.5 }];
          }
          const sp = demoPath(0);
          demo.cursorX = sp.x * W; demo.cursorY = sp.y * H;
          const pulse = 0.5 + 0.5 * Math.sin(demo.t * 5);
          ctx.globalAlpha = 0.25 + pulse * 0.25;
          ctx.beginPath();
          ctx.arc(demo.cursorX, demo.cursorY, 14, 0, Math.PI * 2);
          ctx.strokeStyle = BLK;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(demo.cursorX, demo.cursorY, 3, 0, Math.PI * 2);
          ctx.fillStyle = BLK;
          ctx.fill();
          ctx.globalAlpha = 1;

        } else if (demo.phase === 1) {
          demo.t += 1/60;
          const prog = Math.min(1, demo.t / DRAW_DUR);
          const ease = prog < 0.5 ? 2*prog*prog : 1 - Math.pow(-2*prog+2, 2)/2;
          const pt = demoPath(ease);
          const px = pt.x * W, py = pt.y * H;

          demo.cursorX = px; demo.cursorY = py;

          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.arc(px, py, 10, 0, Math.PI * 2);
          ctx.strokeStyle = BLK;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fillStyle = BLK;
          ctx.fill();
          ctx.globalAlpha = 1;

          if (prog >= 1) { demo.phase = 2; demo.t = 0; }

        } else if (demo.phase === 2) {
          demo.t += 1/60;
          const a = Math.max(0, 0.4 - demo.t / PAUSE * 0.4);
          ctx.globalAlpha = a;
          ctx.beginPath();
          ctx.arc(demo.cursorX, demo.cursorY, 10, 0, Math.PI * 2);
          ctx.strokeStyle = BLK;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.globalAlpha = 1;
          if (demo.t >= PAUSE) { demo.phase = 3; demo.t = 0; }

        } else if (demo.phase === 3) {
          demo.t += 1/60;
          demo.opacity = Math.max(0, 1 - demo.t / FADE);
          if (demo.opacity <= 0) {
            demo.active = false;
            dCtx.clearRect(0, 0, demoBuffer.width, demoBuffer.height);
          }
        }

        if (demo.active && demo.opacity > 0) {
          ctx.globalAlpha = demo.phase === 3 ? demo.opacity : 1;
          ctx.drawImage(demoBuffer, 0, 0, W * dpr, H * dpr, 0, 0, W, H);
          ctx.globalAlpha = 1;
        }
      }

      ctx.drawImage(buffer, 0, 0, W * dpr, H * dpr, 0, 0, W, H);

      globalTime += 0.016;

      /* ══════════════════════════════════════════════════════════
         HOVER SCALE INTERPOLATION — smooth ease toward target
         ══════════════════════════════════════════════════════════ */
      const HOVER_GROW = 1.12;       // 12% bigger on hover
      const HOVER_LERP_IN = 0.045;   // ease in — gentle
      const HOVER_LERP_OUT = 0.03;   // ease out — even gentler, lingers

      nodes.forEach((n, i) => {
        if (!n.discovered) return;
        const isHovered = hover.type === "node" && hover.idx === i;
        const target = isHovered ? HOVER_GROW : 1.0;
        const speed = n.hoverScale < target ? HOVER_LERP_IN : HOVER_LERP_OUT;
        n.hoverScale = n.hoverScale + (target - n.hoverScale) * speed;
        // Kill micro-jitter
        if (Math.abs(n.hoverScale - target) < 0.001) n.hoverScale = target;
      });
      hiddenNodes.forEach((h, i) => {
        if (!h.found) return;
        const isHovered = hover.type === "hidden" && hover.idx === i;
        const target = isHovered ? HOVER_GROW : 1.0;
        const speed = h.hoverScale < target ? HOVER_LERP_IN : HOVER_LERP_OUT;
        h.hoverScale = h.hoverScale + (target - h.hoverScale) * speed;
        if (Math.abs(h.hoverScale - target) < 0.001) h.hoverScale = target;
      });

      /* ══════════════════════════════════════════════════════════
         PHYSICS COLLISION SOLVER — Cinema 4D-style rigid body push
         Hover-enlarged circles naturally push neighbors
         CTA + Headline act as static rectangular colliders
         ══════════════════════════════════════════════════════════ */
      {
        const allBodies = [];
        nodes.forEach((n, i) => {
          if (!n.discovered) return;
          const r = NODE_R * n.prog * (n.hoverScale || 1);
          if (r < 2) return;
          allBodies.push({ ref: n, idx: i, type: "node", r, isGrowing: n.prog < 0.95, isHovered: (n.hoverScale || 1) > 1.01 });
        });
        hiddenNodes.forEach((h, i) => {
          if (!h.found) return;
          const r = NODE_R * h.prog * (h.hoverScale || 1);
          if (r < 2) return;
          allBodies.push({ ref: h, idx: i, type: "hidden", r, isGrowing: h.prog < 0.95, isHovered: (h.hoverScale || 1) > 1.01 });
        });

        const SPRING_K = 0.18;
        const DAMPING = 0.92;
        const ANG_DAMPING = 0.95;
        const OVERLAP_MARGIN = 3;
        const GROW_PUSH_MULT = 2.2;
        const HOVER_PUSH_MULT = 1.6;
        const MAX_VEL = 5;
        const RETURN_SPRING = 0.008;

        // ── Static rectangular colliders (CTA + headline) ──
        // Measure CTA position relative to canvas
        const staticRects = [];
        const UI_PADDING = 18; // extra breathing room around UI elements
        if (ctaRef?.current && canvas) {
          const canvasRect = canvas.parentElement.getBoundingClientRect();
          const ctaEl = ctaRef.current;
          const ctaBounds = ctaEl.getBoundingClientRect();
          staticRects.push({
            x: ctaBounds.left - canvasRect.left - UI_PADDING,
            y: ctaBounds.top - canvasRect.top - UI_PADDING,
            w: ctaBounds.width + UI_PADDING * 2,
            h: ctaBounds.height + UI_PADDING * 2,
          });
        }
        // Headline: approximate from known CSS layout
        // ~x:0, y: 14vh+56px to ~55% width, ~42% height
        staticRects.push({
          x: 0,
          y: H * 0.10,
          w: W * 0.58,
          h: H * 0.34,
        });

        // Circle-vs-Rectangle collision (closest point on rect to circle center)
        const STATIC_SPRING = 0.35; // stronger — static bodies are immovable
        allBodies.forEach((body) => {
          const ref = body.ref;
          const ds = body.type === "node" ? driftSeeds[body.idx] : hiddenDriftSeeds[body.idx % hiddenDriftSeeds.length];
          const bx = ref.x + (ref.ox || 0) + Math.sin(globalTime * ds.fx + ds.px) * ds.ax;
          const by = ref.y + (ref.oy || 0) + Math.cos(globalTime * ds.fy + ds.py) * ds.ay;

          staticRects.forEach((rect) => {
            // Closest point on rectangle to circle center
            const closestX = Math.max(rect.x, Math.min(bx, rect.x + rect.w));
            const closestY = Math.max(rect.y, Math.min(by, rect.y + rect.h));
            const dx = bx - closestX;
            const dy = by - closestY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < body.r && dist > 0.01) {
              const overlap = body.r - dist;
              const nx = dx / dist;
              const ny = dy / dist;
              const forceMag = overlap * STATIC_SPRING;

              // Only the circle moves (rect is static/infinite mass)
              ref.vx += nx * forceMag;
              ref.vy += ny * forceMag;

              // Positional correction
              ref.ox = (ref.ox || 0) + nx * overlap * 0.2;
              ref.oy = (ref.oy || 0) + ny * overlap * 0.2;

              // Slight angular kick
              const tx = -ny, ty = nx;
              ref.angVel = (ref.angVel || 0) + (overlap * 0.004 * (Math.random() - 0.5));
            } else if (dist < 0.01 && bx >= rect.x && bx <= rect.x + rect.w && by >= rect.y && by <= rect.y + rect.h) {
              // Circle center is inside rect — push to nearest edge
              const dLeft = bx - rect.x;
              const dRight = (rect.x + rect.w) - bx;
              const dTop = by - rect.y;
              const dBottom = (rect.y + rect.h) - by;
              const minD = Math.min(dLeft, dRight, dTop, dBottom);
              let pushX = 0, pushY = 0;
              if (minD === dLeft) pushX = -(dLeft + body.r);
              else if (minD === dRight) pushX = dRight + body.r;
              else if (minD === dTop) pushY = -(dTop + body.r);
              else pushY = dBottom + body.r;
              ref.ox = (ref.ox || 0) + pushX * 0.3;
              ref.oy = (ref.oy || 0) + pushY * 0.3;
            }
          });
        });

        // ── Circle-vs-Circle collision ──
        for (let i = 0; i < allBodies.length; i++) {
          for (let j = i + 1; j < allBodies.length; j++) {
            const a = allBodies[i], b = allBodies[j];
            const aRef = a.ref, bRef = b.ref;

            const ds_a = a.type === "node" ? driftSeeds[a.idx] : hiddenDriftSeeds[a.idx % hiddenDriftSeeds.length];
            const ds_b = b.type === "node" ? driftSeeds[b.idx] : hiddenDriftSeeds[b.idx % hiddenDriftSeeds.length];
            const ax_eff = aRef.x + (aRef.ox || 0) + Math.sin(globalTime * ds_a.fx + ds_a.px) * ds_a.ax;
            const ay_eff = aRef.y + (aRef.oy || 0) + Math.cos(globalTime * ds_a.fy + ds_a.py) * ds_a.ay;
            const bx_eff = bRef.x + (bRef.ox || 0) + Math.sin(globalTime * ds_b.fx + ds_b.px) * ds_b.ax;
            const by_eff = bRef.y + (bRef.oy || 0) + Math.cos(globalTime * ds_b.fy + ds_b.py) * ds_b.ay;

            const dx = bx_eff - ax_eff;
            const dy = by_eff - ay_eff;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = a.r + b.r + OVERLAP_MARGIN;

            if (dist < minDist && dist > 0.01) {
              const overlap = minDist - dist;
              const nx = dx / dist;
              const ny = dy / dist;

              let forceMag = overlap * SPRING_K;
              if (a.isGrowing || b.isGrowing) forceMag *= GROW_PUSH_MULT;
              if (a.isHovered || b.isHovered) forceMag *= HOVER_PUSH_MULT;

              const totalMass = aRef.mass + bRef.mass;
              const aRatio = bRef.mass / totalMass;
              const bRatio = aRef.mass / totalMass;

              const hoverMassA = a.isHovered ? 0.2 : aRatio;
              const hoverMassB = b.isHovered ? 0.2 : bRatio;
              const hmTotal = hoverMassA + hoverMassB;

              aRef.vx -= nx * forceMag * (hoverMassA / hmTotal);
              aRef.vy -= ny * forceMag * (hoverMassA / hmTotal);
              bRef.vx += nx * forceMag * (hoverMassB / hmTotal);
              bRef.vy += ny * forceMag * (hoverMassB / hmTotal);

              const tx = -ny, ty = nx;
              const relVx = (bRef.vx || 0) - (aRef.vx || 0);
              const relVy = (bRef.vy || 0) - (aRef.vy || 0);
              const tangentVel = relVx * tx + relVy * ty;
              const angImpulse = tangentVel * 0.01 + (overlap * 0.002 * (Math.random() - 0.5));
              aRef.angVel = (aRef.angVel || 0) + angImpulse * (hoverMassA / hmTotal);
              bRef.angVel = (bRef.angVel || 0) - angImpulse * (hoverMassB / hmTotal);

              const correction = overlap * 0.1;
              aRef.ox = (aRef.ox || 0) - nx * correction * (hoverMassA / hmTotal);
              aRef.oy = (aRef.oy || 0) - ny * correction * (hoverMassA / hmTotal);
              bRef.ox = (bRef.ox || 0) + nx * correction * (hoverMassB / hmTotal);
              bRef.oy = (bRef.oy || 0) + ny * correction * (hoverMassB / hmTotal);
            }
          }
        }

        // Integrate & damp
        allBodies.forEach(({ ref, r, type, idx }) => {
          ref.ox = (ref.ox || 0) + (ref.vx || 0);
          ref.oy = (ref.oy || 0) + (ref.vy || 0);
          ref.angle = (ref.angle || 0) + (ref.angVel || 0);

          ref.vx = (ref.vx || 0) * DAMPING;
          ref.vy = (ref.vy || 0) * DAMPING;
          ref.angVel = (ref.angVel || 0) * ANG_DAMPING;

          const vel = Math.sqrt(ref.vx * ref.vx + ref.vy * ref.vy);
          if (vel > MAX_VEL) { ref.vx = (ref.vx / vel) * MAX_VEL; ref.vy = (ref.vy / vel) * MAX_VEL; }

          ref.vx -= (ref.ox || 0) * RETURN_SPRING;
          ref.vy -= (ref.oy || 0) * RETURN_SPRING;
          ref.angVel -= (ref.angle || 0) * 0.004;

          // ── Canvas boundary collision — keep circles inside ──
          const ds = type === "node" ? driftSeeds[idx] : hiddenDriftSeeds[idx % hiddenDriftSeeds.length];
          const effX = ref.x + (ref.ox || 0) + Math.sin(globalTime * ds.fx + ds.px) * ds.ax;
          const effY = ref.y + (ref.oy || 0) + Math.cos(globalTime * ds.fy + ds.py) * ds.ay;
          const WALL_K = 0.4;  // wall spring stiffness
          const WALL_PAD = 4;  // extra padding from edge

          // Left wall
          if (effX - r < WALL_PAD) {
            const pen = (WALL_PAD + r) - effX;
            ref.ox += pen * WALL_K;
            ref.vx += pen * 0.1;
            ref.angVel += pen * 0.003 * (Math.random() - 0.5);
          }
          // Right wall
          if (effX + r > W - WALL_PAD) {
            const pen = (effX + r) - (W - WALL_PAD);
            ref.ox -= pen * WALL_K;
            ref.vx -= pen * 0.1;
            ref.angVel += pen * 0.003 * (Math.random() - 0.5);
          }
          // Top wall
          if (effY - r < WALL_PAD) {
            const pen = (WALL_PAD + r) - effY;
            ref.oy += pen * WALL_K;
            ref.vy += pen * 0.1;
          }
          // Bottom wall
          if (effY + r > H - WALL_PAD) {
            const pen = (effY + r) - (H - WALL_PAD);
            ref.oy -= pen * WALL_K;
            ref.vy -= pen * 0.1;
          }

          if (Math.abs(ref.vx) < 0.003) ref.vx = 0;
          if (Math.abs(ref.vy) < 0.003) ref.vy = 0;
          if (Math.abs(ref.ox) < 0.05 && ref.vx === 0) ref.ox = 0;
          if (Math.abs(ref.oy) < 0.05 && ref.vy === 0) ref.oy = 0;
          if (Math.abs(ref.angVel) < 0.00005) ref.angVel = 0;
          if (Math.abs(ref.angle) < 0.0005 && ref.angVel === 0) ref.angle = 0;
        });
      }
      /* ═══════════════ END PHYSICS ═══════════════ */

      // Pre-cache font strings
      const fontCache = {};
      const getFont = (w, sz) => {
        const k = `${w}-${Math.round(sz*10)}`;
        if (!fontCache[k]) fontCache[k] = `${w} ${sz.toFixed(1)}px '${FONT.split("'")[1] || "Segoe UI"}', system-ui, sans-serif`;
        return fontCache[k];
      };

      const DOT_COLOR = "#4a3f35";
      const CREAM = "#f8f4ee";

      // Smoother spring easing — lower frequency, higher damping = buttery ease
      const springTextScale = (p) => {
        if (p < 0.25) return 0;
        const t = (p - 0.25) / 0.75;
        const omega = 4.2;   // lower freq = slower, smoother oscillation
        const zeta = 0.68;   // higher damping = less overshoot, more ease
        const decay = Math.exp(-zeta * omega * t);
        const osc = Math.cos(omega * Math.sqrt(1 - zeta * zeta) * t);
        return 1 - decay * osc;
      };

      const springLabelScale = (p) => {
        if (p < 0.45) return 0;
        const t = (p - 0.45) / 0.55;
        const omega = 3.8;   // even calmer for label
        const zeta = 0.72;
        const decay = Math.exp(-zeta * omega * t);
        const osc = Math.cos(omega * Math.sqrt(1 - zeta * zeta) * t);
        return 1 - decay * osc;
      };

      const BASE_STAT_SIZE = 16;
      const BASE_LABEL_SIZE = 9;
      const BASE_STAT_Y = -4;
      const BASE_LABEL_Y = 12;

      // Draw text content — now receives hoverScale to grow text with circle
      const drawNodeText = (cx, cy, rp, p, big, label, c, rot, hs) => {
        if (p < 0.25) return;

        const statS = springTextScale(p);
        const labelS = springLabelScale(p);
        if (statS < 0.01) return;

        // radiusRatio includes hover scale — text grows proportionally
        const radiusRatio = (rp / NODE_R);
        const statSize = Math.max(1, BASE_STAT_SIZE * radiusRatio * statS);
        const labelSize = Math.max(1, BASE_LABEL_SIZE * radiusRatio * labelS);
        const statY = BASE_STAT_Y * radiusRatio * statS;
        const labelY = BASE_LABEL_Y * radiusRatio * Math.max(statS, labelS);

        const revealing = p < 0.95;
        // Smoother alpha curves — cubic ease
        const statAlphaRaw = revealing ? Math.min(1, (p - 0.25) * 2.0) : 1;
        const labelAlphaRaw = revealing ? Math.min(1, (p - 0.45) * 2.5) : 1;
        const statAlpha = statAlphaRaw * statAlphaRaw * (3 - 2 * statAlphaRaw); // smoothstep
        const labelAlpha = labelAlphaRaw * labelAlphaRaw * (3 - 2 * labelAlphaRaw);

        ctx.save();
        ctx.translate(cx, cy);
        if (Math.abs(rot) > 0.001) ctx.rotate(rot);
        ctx.scale(statS, statS);

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.globalAlpha = statAlpha;
        ctx.font = getFont(500, statSize / statS);
        ctx.fillStyle = TONE[c] || CREAM;
        ctx.fillText(big, 0, statY / statS);

        if (labelS > 0.01) {
          ctx.globalAlpha = labelAlpha;
          const labelCompensate = labelS / statS;
          ctx.font = getFont(500, (labelSize / statS) * (1 / labelCompensate));
          ctx.fillStyle = TONE_SUB[c] || CREAM;
          ctx.save();
          ctx.scale(labelCompensate, labelCompensate);
          ctx.fillText(label, 0, labelY / (statS * labelCompensate));
          ctx.restore();
        }

        ctx.restore();
        ctx.globalAlpha = 1;
      };

      nodes.forEach((n, i) => {
        const target = n.discovered ? 1 : 0;
        // Smoother prog interpolation — ease-out cubic
        const progDelta = target - n.prog;
        n.prog += progDelta * 0.04; // slower = smoother growth

        const p = n.prog;

        const entranceElapsed = (now - dotBirthTime - dotEntranceDelays[i]) * 0.00125;
        const entranceT = entranceElapsed < 0 ? 0 : entranceElapsed > 1 ? 1 : entranceElapsed;
        const et1 = 1 - entranceT;
        const entranceEase = 1 - et1 * et1 * et1;
        const entranceY = (1 - entranceEase) * dotEntranceOffsets[i];

        const ds = driftSeeds[i];
        const dx = Math.sin(globalTime * ds.fx + ds.px) * ds.ax;
        const dy = Math.cos(globalTime * ds.fy + ds.py) * ds.ay;
        const nx = n.x + dx + (n.ox || 0);
        const ny = n.y + dy + entranceY + (n.oy || 0);

        if (entranceEase < 0.01) return;

        const hs = n.hoverScale || 1;
        const rp = NODE_R * p * hs;

        if (!n.discovered) {
          ctx.globalAlpha = entranceEase;
          ctx.beginPath();
          ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = DOT_COLOR;
          ctx.fill();
          ctx.globalAlpha = 1;
          return;
        }

        // Draw circle with hover scale
        ctx.beginPath();
        ctx.arc(nx, ny, rp, 0, Math.PI * 2);
        ctx.fillStyle = n.c;
        ctx.fill();

        drawNodeText(nx, ny, rp, p, n.big, n.label, n.c, n.angle || 0, hs);
      });

      hiddenNodes.forEach((h, hi) => {
        h.x = h.px * W; h.y = h.py * H;
        if (!h.found) return;

        const target = 1;
        h.prog += (target - h.prog) * 0.04; // smoother
        const p = h.prog;
        if (p < 0.05) return;

        const hds = hiddenDriftSeeds[hi % hiddenDriftSeeds.length];
        const hdx = Math.sin(globalTime * hds.fx + hds.px) * hds.ax;
        const hdy = Math.cos(globalTime * hds.fy + hds.py) * hds.ay;
        const hx = h.x + hdx + (h.ox || 0);
        const hy = h.y + hdy + (h.oy || 0);

        const hs = h.hoverScale || 1;
        const hr = NODE_R * p * hs;

        ctx.beginPath();
        ctx.arc(hx, hy, hr, 0, Math.PI * 2);
        ctx.fillStyle = h.c;
        ctx.fill();

        drawNodeText(hx, hy, hr, p, h.big, h.label, h.c, h.angle || 0, hs);
      });

      if (expanded.active) {
        resize();
        let nd, rc;
        if (expanded.isHidden) {
          const h = hiddenNodes[expanded.nodeIdx];
          nd = h;
          rc = { title: h.title, stat: h.big, unit: h.unit, pages: h.lines.map((l, i, arr) => {
            // Group 2 lines per page for hidden nodes
            if (i % 2 === 0) return arr.slice(i, i + 2).join(". ") + ".";
            return null;
          }).filter(Boolean) };
        } else {
          nd = nodes[expanded.nodeIdx];
          rc = richContent[expanded.nodeIdx];
        }

        if (expanded.closing) {
          expanded.prog -= 0.04;
          expanded.contentProg -= 0.07;
          if (expanded.prog <= 0) {
            expanded.active = false;
            expanded.closing = false;
            expanded.prog = 0;
            expanded.contentProg = 0;
            setNavOverlay && setNavOverlay(null);
            setIsExpanded(false);
            setTimeout(resize, 50);
          }
        } else {
          expanded.prog = Math.min(1, expanded.prog + 0.03);
          if (expanded.prog > 0.35) expanded.contentProg = Math.min(1, expanded.contentProg + 0.035);
          if (expanded.prog > 0.5 && nd) {
            setNavOverlay && setNavOverlay({ bg: nd.c, txt: COLOR_PAIRS[nd.c] || "#4a3f35" });
          }
        }

        const ep = Math.max(0, expanded.prog);
        const cp = Math.max(0, expanded.contentProg);

        if (ep > 0 && nd && rc) {
          const maxR = Math.sqrt(W * W + H * H);
          const ease = 1 - Math.pow(1 - ep, 3);
          const circR = ease * maxR;

          ctx.save();
          ctx.beginPath();
          ctx.arc(expanded.originX, expanded.originY, circR, 0, Math.PI * 2);
          ctx.fillStyle = nd.c;
          ctx.fill();

          if (cp > 0.02) {
            const MARGIN = Math.round(W * 0.025);
            const GUTTER = Math.round(W * 0.015);
            const COL_W = (W - MARGIN * 2 - GUTTER * 11) / 12;
            const colX = (n) => MARGIN + n * (COL_W + GUTTER);
            const colW = (n) => n * COL_W + (n - 1) * GUTTER;

            const txtC = COLOR_PAIRS[nd.c] || "#4a3f35";
            ctx.fillStyle = txtC;
            ctx.textAlign = "left";
            ctx.textBaseline = "alphabetic";

            const FW = "400";

            // Build pages array
            let pages;
            if (rc.pages) {
              pages = rc.pages;
            } else if (rc.para) {
              pages = [rc.para];
            } else {
              pages = [nd.lines ? nd.lines.join(". ") + "." : ""];
            }
            expanded.pages = pages;
            const pageIdx = expanded.page || 0;
            const currentPageText = pages[pageIdx] || pages[0];

            // ── Top bar: "← Back" left,  "← N/M →" right ──
            const ba = Math.max(0, Math.min(1, cp / 0.3));
            const backSize = Math.min(13, Math.max(10, W * 0.01));
            const backY = H * 0.08;

            ctx.globalAlpha = ba * 0.6;
            ctx.fillStyle = txtC;
            ctx.font = `400 ${backSize}px "Segoe UI", system-ui, sans-serif`;
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText("\u2190  Back", colX(0), backY);

            // Page nav (right side)
            if (pages.length > 1) {
              ctx.textAlign = "right";
              ctx.globalAlpha = ba * 0.4;
              ctx.fillText(`${pageIdx + 1} / ${pages.length}`, W - MARGIN, backY);
              
              // ← → arrows as nav
              const arrowSize = Math.min(14, Math.max(11, W * 0.012));
              ctx.font = `400 ${arrowSize}px "Segoe UI", system-ui, sans-serif`;
              ctx.globalAlpha = ba * 0.6;
              ctx.fillText("→", W - MARGIN + 2, backY);
              ctx.textAlign = "left";
              ctx.fillText("←", W - MARGIN - 60, backY);
            }

            ctx.textBaseline = "alphabetic";
            ctx.textAlign = "left";
            ctx.globalAlpha = 1;

            // ── Hero stat + unit (baseline aligned) ──
            const la1 = Math.max(0, Math.min(1, cp / 0.25));
            ctx.globalAlpha = la1;
            const statSize = Math.min(72, Math.max(44, W * 0.055));
            ctx.font = `300 ${statSize}px "Segoe UI", system-ui, sans-serif`;
            const statY = H * 0.32;
            const statText = rc.stat || nd.big || "";
            ctx.fillStyle = txtC;
            ctx.fillText(statText, colX(0), statY);
            
            // Unit text — baseline aligned with stat
            const statWidth = ctx.measureText(statText).width;
            const unitSize = Math.min(16, Math.max(12, W * 0.013));
            ctx.font = `400 ${unitSize}px "Segoe UI", system-ui, sans-serif`;
            ctx.globalAlpha = la1 * 0.5;
            ctx.fillText(rc.unit || nd.unit || "", colX(0) + statWidth + 12, statY);
            ctx.globalAlpha = la1;

            // ── Title ──
            const headSize = Math.min(18, Math.max(13, W * 0.014));
            ctx.font = `${FW} ${headSize}px "Segoe UI", system-ui, sans-serif`;
            const headY = statY + headSize + 24;
            ctx.globalAlpha = la1 * 0.5;
            ctx.fillStyle = txtC;
            ctx.fillText((nd.num || "●") + " — " + (rc.title || nd.title || nd.label || ""), colX(0), headY);
            ctx.globalAlpha = 1;

            // ── Page content ──
            const paraSize = Math.min(22, Math.max(15, W * 0.016));
            const LH = paraSize * 1.65;
            const maxTW = colW(6);
            ctx.font = `${FW} ${paraSize}px "Segoe UI", system-ui, sans-serif`;

            const paraLines = wrapText(ctx, currentPageText, maxTW);

            const paraY0 = headY + LH + 12;
            paraLines.forEach((pl, pi) => {
              const pla = Math.max(0, Math.min(1, (cp - 0.06 - pi * 0.008) / 0.35));
              ctx.globalAlpha = pla;
              ctx.fillStyle = txtC;
              ctx.fillText(pl, colX(0), paraY0 + pi * LH);
            });

            // ── Bottom hint ──
            ctx.globalAlpha = cp * 0.25;
            ctx.fillStyle = txtC;
            ctx.font = `${FW} 9px "Segoe UI", system-ui, sans-serif`;
            ctx.textAlign = "right";
            ctx.fillText("click anywhere to close", W - MARGIN, H - 34);
          }

          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }

      if (demo.active) {
        let hintAlpha = 0;
        if (demo.phase === 0) hintAlpha = Math.min(1, demo.t / 0.4) * 0.45;
        else if (demo.phase === 1) hintAlpha = 0.45;
        else if (demo.phase === 2) hintAlpha = Math.max(0, 0.45 - demo.t / 0.6 * 0.45);
        else if (demo.phase === 3) hintAlpha = Math.max(0, 0.45 * demo.opacity);
        if (hintAlpha > 0.01) {
          ctx.globalAlpha = 1;
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      hero.removeEventListener("mousedown", onDown);
      hero.removeEventListener("mouseup", onUp);
      hero.removeEventListener("mousemove", onMove);
      hero.removeEventListener("mouseleave", onLeave);
      hero.removeEventListener("mouseenter", onEnter);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="ms-hero-canvas" style={isExpanded ? { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 50, pointerEvents: "auto" } : {}} />;
}
function MarqueeTicker() {
  const stats = [
    "785M UNIQUE USERS",
    "24% PC MARKET SHARE",
    "700M+ AUDIENCE NETWORK",
    "23B MONTHLY SEARCHES",
  ];

  const renderItems = () =>
    stats.map((s, i) => (
      <React.Fragment key={i}>
        <span className="ms-marquee-item">{s}</span>
        <span className="ms-marquee-sep">→</span>
      </React.Fragment>
    ));

  return (
    <div className="ms-marquee-wrap">
      <div className="ms-marquee-track">
        {renderItems()}
        {renderItems()}
        {renderItems()}
        {renderItems()}
      </div>
    </div>
  );
}

function SolutionsSection() {
  return (
    <section className="ms-sol">
      {/* Overline */}
      <div style={{ padding: "0 var(--gutter)", maxWidth: 1400, margin: "0 auto" }}>
        <span style={{ display: "block", fontSize: 14, color: "var(--c-text)", marginBottom: 32 }}>03 — Solutions</span>
      </div>

      {/* Two asymmetric cards on 12-col grid */}
      <div className="ms-sol-placed">
        {/* Card 1 — wider, landscape, sits higher, skips col 1 */}
        <div className="ms-sol-c1">
          <ScrollReveal y={30} delay={0}>
            <ParallaxMedia className="ms-sol-photo" scaleFrom={0.9} scaleTo={1} radiusFrom={56} radiusTo={32}>
              <img src="/assets/images/pexels-kekremsi-16093054.jpg" alt="Search & Shopping" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </ParallaxMedia>
            <div className="ms-sol-body">
              <div className="ms-sol-name">Search & Shopping</div>
              <div className="ms-sol-text">
                Reach users actively searching for your products. Text ads, dynamic search, and product listings with ratings and prices — right when intent peaks.
              </div>
              <span className="ms-sol-arrow">→</span>
            </div>
          </ScrollReveal>
        </div>

        {/* Card 2 — narrower, portrait, offset down, starts col 7 */}
        <div className="ms-sol-c2">
          <ScrollReveal y={30} delay={0.15}>
            <ParallaxMedia className="ms-sol-photo" scaleFrom={0.9} scaleTo={1} radiusFrom={56} radiusTo={32}>
              <img src="/assets/images/pexels-didsss-12274675.jpg" alt="Display & Native" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </ParallaxMedia>
            <div className="ms-sol-body">
              <div className="ms-sol-name">Display & Native</div>
              <div className="ms-sol-text">
                Visual storytelling across Microsoft 365, MSN, Edge, and Casual Games.
              </div>
              <span className="ms-sol-arrow">→</span>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* Testimonial on 12-col grid */}
      <ScrollReveal y={25} delay={0}>
        <div className="ms-sol-test">
          {/* Quote + attribution — cols 1-6 */}
          <div className="ms-sol-test-content">
            <div className="ms-sol-test-quote-wrap">
              <span className="ms-sol-test-marks">{"\u201C"}</span>
              <div className="ms-sol-test-quote">
                Launching CPS campaigns during peak season drove incremental revenue at a very favorable ROI. This was a welcome boost to our online performance during a highly competitive period.
              </div>
            </div>
            <div className="ms-sol-test-attr">
              <div className="ms-sol-test-name">James Thompson</div>
              <div className="ms-sol-test-role">
                Digital Marketing Group Manager at The Watches of Switzerland Group
              </div>
            </div>
          </div>

          {/* Portrait — cols 8-10 */}
          <ParallaxMedia className="ms-sol-test-portrait" scaleFrom={0.92} scaleTo={1} radiusFrom={56} radiusTo={32}>
            <img src="/assets/images/testimonial.png" alt="James Thompson" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </ParallaxMedia>
        </div>
      </ScrollReveal>

      {/* Card 3 — wide landscape after quote, asymmetric offset */}
      <ScrollReveal y={30} delay={0}>
        <div className="ms-sol-placed ms-sol-placed-c3">
          <div className="ms-sol-c3">
            <ParallaxMedia className="ms-sol-photo" scaleFrom={0.9} scaleTo={1} radiusFrom={56} radiusTo={32}>
              <video
                muted
                playsInline
                loop
                autoPlay
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                src="/assets/videos/Copilot_Brand_Pack_Motion_Test_RD1.mp4"
              />
            </ParallaxMedia>
            <div className="ms-sol-body">
              <div className="ms-sol-name">AI-Powered Advertising</div>
              <div className="ms-sol-text">
                Reach customers across every Copilot touchpoint — search, shopping, maps, and chat. One platform, every moment of intent.
              </div>
              <span className="ms-sol-arrow">→</span>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
/* ── REACH CANVAS ── */

const BM_CHANNELS = [
  { id: "search", label: "Search", color: "#2a2535", bg: "#c8c0d8",
    base: { reach: 12.4, impressions: 38, conversions: 24 },
    scale: { reach: 1, impressions: 1.2, conversions: 1.4 },
  },
  { id: "audience", label: "Audience", color: "#3a2a1e", bg: "#f5e6d8",
    base: { reach: 22.8, impressions: 55, conversions: 18 },
    scale: { reach: 1.3, impressions: 1.5, conversions: 0.8 },
  },
  { id: "shopping", label: "Shopping", color: "#3a2a10", bg: "#f0d888",
    base: { reach: 6.2, impressions: 18, conversions: 28 },
    scale: { reach: 0.6, impressions: 0.8, conversions: 1.6 },
  },
  { id: "video", label: "Video & CTV", color: "#2a3320", bg: "#c8d4a8",
    base: { reach: 8.6, impressions: 14, conversions: 6 },
    scale: { reach: 0.7, impressions: 0.6, conversions: 0.5 },
  },
  { id: "linkedin", label: "LinkedIn", color: "#4a3f35", bg: "#b8c4d4",
    base: { reach: 4.8, impressions: 12, conversions: 14 },
    scale: { reach: 0.5, impressions: 0.7, conversions: 1.2 },
  },
];

const BM_PRESETS = [
  { id: "ecommerce", label: "E-commerce", enabled: ["search","shopping","audience"], sliders: { search: 70, shopping: 80, audience: 40, video: 0, linkedin: 0 }, budget: 5000 },
  { id: "b2b", label: "B2B", enabled: ["search","linkedin","audience"], sliders: { search: 55, linkedin: 75, audience: 30, shopping: 0, video: 0 }, budget: 8000 },
  { id: "local", label: "Local", enabled: ["search","audience"], sliders: { search: 85, audience: 35, shopping: 0, video: 0, linkedin: 0 }, budget: 2000 },
  { id: "brand", label: "Awareness", enabled: ["audience","video","linkedin"], sliders: { audience: 80, video: 65, linkedin: 40, search: 0, shopping: 0 }, budget: 12000 },
  { id: "full", label: "Full funnel", enabled: ["search","audience","shopping","video","linkedin"], sliders: { search: 60, audience: 50, shopping: 45, video: 35, linkedin: 30 }, budget: 10000 },
];

function BudgetMixer() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 900, h: 480 });
  const [enabled, setEnabled] = useState([]);
  const [sliders, setSliders] = useState({ search: 0, audience: 0, video: 0, shopping: 0, linkedin: 0 });
  const [budget, setBudget] = useState(5000);
  const [activePreset, setActivePreset] = useState(null);
  const [hovIdx, setHovIdx] = useState(-1);
  const animRef = useRef(null);
  const animBars = useRef({});
  const animStats = useRef({ reach: 0, impressions: 0, conversions: 0 });
  const [, setTick] = useState(0);
  const titleTransRef = useRef(0); // 0 = empty/big, 1 = compact/working
  const hasInteracted = enabled.length > 0;

  useEffect(() => {
    const measure = () => {
      if (!wrapRef.current) return;
      const r = wrapRef.current.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const toggleChannel = useCallback((id) => {
    setEnabled(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      // Auto-set a default slider value when enabling a channel for the first time
      if (!prev.includes(id)) {
        setSliders(s => ({ ...s, [id]: s[id] || 50 }));
      }
      return next;
    });
    setActivePreset(null);
  }, []);

  const updateSlider = useCallback((id, val) => {
    setSliders(prev => ({ ...prev, [id]: val }));
    setActivePreset(null);
  }, []);

  const applyPreset = useCallback((p) => {
    setEnabled([...p.enabled]);
    const s = {};
    BM_CHANNELS.forEach(ch => { s[ch.id] = p.sliders[ch.id] || 0; });
    setSliders(s);
    setBudget(p.budget);
    setActivePreset(p.id);
  }, []);

  const activeChannels = useMemo(() => BM_CHANNELS.filter(ch => enabled.includes(ch.id)), [enabled]);

  const stats = useMemo(() => {
    const bm = budget / 5000;
    let reach = 0, impressions = 0, conversions = 0;
    activeChannels.forEach(ch => {
      const p = (sliders[ch.id] || 0) / 100;
      reach += ch.base.reach * (0.2 + p * ch.scale.reach) * bm;
      impressions += ch.base.impressions * (0.15 + p * ch.scale.impressions) * bm;
      conversions += ch.base.conversions * (0.1 + p * ch.scale.conversions) * bm;
    });
    return {
      reach: Math.round(reach * 10) / 10,
      impressions: Math.round(impressions * 10) / 10,
      conversions: Math.round(conversions * 10) / 10,
    };
  }, [sliders, budget, activeChannels]);

  const formatNum = (n) => n >= 1000 ? (n / 1000).toFixed(1) + "B" : n.toFixed(1) + "M";

  // ── Canvas
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const W = size.w, H = size.h;
    c.width = W * dpr; c.height = H * dpr;
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    let running = true;
    const bars = animBars.current;
    const as = animStats.current;
    const hov = hovIdx;
    const bm = budget / 5000;
    const metrics = ["reach", "impressions", "conversions"];
    const metricLabels = ["Reach", "Impr.", "Conv."];
    const metricOffsets = { reach: 0.2, impressions: 0.15, conversions: 0.1 };
    const calcBarVal = (ch, m, pct, bm) => ch.base[m] * (metricOffsets[m] + pct * ch.scale[m]) * bm;
    const maxVals = { reach: 35, impressions: 120, conversions: 50 };

    activeChannels.forEach(ch => {
      if (!bars[ch.id]) bars[ch.id] = { reach: 0, impressions: 0, conversions: 0 };
    });

    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);

      // ── Title transition (same paradigm as CampaignBuilder) ──
      const targetT = hasInteracted ? 1 : 0;
      const speed = targetT > titleTransRef.current ? 0.045 : 0.06;
      titleTransRef.current += (targetT - titleTransRef.current) * speed;
      if (Math.abs(titleTransRef.current - targetT) < 0.002) titleTransRef.current = targetT;
      const tt = titleTransRef.current;

      const pad = 48;

      // ── Title — interpolated big→small ──
      const bigTitle = Math.min(72, Math.max(44, W * 0.055));
      const smallTitle = Math.min(28, W * 0.022);
      const titleSz = bigTitle + (smallTitle - bigTitle) * tt;
      const titleY = pad + 22;

      // "03" label
      const numAlpha = 0.2 - tt * 0.02;
      ctx.font = `400 11px ${FONT}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = `rgba(74,63,53,${numAlpha})`;
      ctx.fillText("03", pad, pad);

      // Title text
      const titleAlpha = 1 - tt * 0.25;
      ctx.font = `400 ${titleSz}px ${FONT}`;
      ctx.fillStyle = `rgba(74,63,53,${titleAlpha})`;
      const bigSpacing = -1.5;
      const smallSpacing = -0.5;
      const spacing = bigSpacing + (smallSpacing - bigSpacing) * tt;
      ctx.letterSpacing = `${spacing}px`;
      ctx.fillText("See your", pad, titleY);
      ctx.fillText("reach", pad, titleY + titleSz * 1.08);
      ctx.letterSpacing = "0px";

      // Subtitle — fades out as tt → 1
      const instrAlpha = Math.max(0, 0.25 * (1 - tt * 2.5));
      if (instrAlpha > 0.005) {
        const instrY = titleY + titleSz * 2.4;
        const instrSize = Math.min(36, Math.max(22, W * 0.028));
        const instrSizeAnim = instrSize * (1 - tt * 0.3);
        ctx.font = `400 ${instrSizeAnim}px ${FONT}`;
        ctx.fillStyle = `rgba(74,63,53,${instrAlpha})`;
        ctx.letterSpacing = "-0.5px";
        ctx.fillText("Model your budget across Microsoft channels.", pad, instrY);
        ctx.fillText("Toggle channels below to begin.", pad, instrY + instrSizeAnim * 1.3);
        ctx.letterSpacing = "0px";
      }

      // ── Stats — fade in as tt → 1 ──
      const statsAlpha = Math.max(0, (tt - 0.3) / 0.7);
      if (statsAlpha > 0.005) {
        as.reach += (stats.reach - as.reach) * 0.08;
        as.impressions += (stats.impressions - as.impressions) * 0.08;
        as.conversions += (stats.conversions - as.conversions) * 0.08;

        const statData = [
          { val: formatNum(as.reach), label: "Reach" },
          { val: formatNum(as.impressions), label: "Impressions" },
          { val: (Math.round(as.conversions)) + "K", label: "Conversions" },
        ];
        ctx.textAlign = "right";
        let statY = pad;
        statData.forEach((sd) => {
          const valSize = Math.min(44, Math.max(28, W * 0.035));
          ctx.font = `300 ${valSize}px ${FONT}`;
          ctx.fillStyle = `rgba(74,63,53,${statsAlpha * 0.9})`;
          ctx.textBaseline = "top";
          ctx.letterSpacing = "-1px";
          ctx.fillText(sd.val, W - pad, statY);
          ctx.letterSpacing = "0px";
          ctx.font = `400 11px ${FONT}`;
          ctx.fillStyle = `rgba(74,63,53,${statsAlpha * 0.3})`;
          ctx.fillText(sd.label, W - pad, statY + valSize + 2);
          statY += valSize + 22;
        });
      } else {
        // Still smooth counters toward zero when nothing active
        as.reach += (stats.reach - as.reach) * 0.08;
        as.impressions += (stats.impressions - as.impressions) * 0.08;
        as.conversions += (stats.conversions - as.conversions) * 0.08;
      }

      // ── Chart area — only draws when interacted ──
      const chartAlpha = Math.max(0, (tt - 0.2) / 0.8);
      if (chartAlpha > 0.005 && hasInteracted) {
        ctx.save();
        ctx.globalAlpha = chartAlpha;

      // Push chart top below the stats/title area
      const statsZoneH = pad + Math.min(44, Math.max(28, W * 0.035)) * 3 + 22 * 3 + 20;
      const chartPad = { top: statsZoneH, right: pad, bottom: 40, left: pad };
      const chartL = chartPad.left, chartR = W - chartPad.right;
      const chartT = chartPad.top, chartB = H - chartPad.bottom;
      const chartW = chartR - chartL, chartH = chartB - chartT;
      const chCount = activeChannels.length;

      // ── Dot grid — only within chart area, stops at baseline
      const dotSp = 20;
      const dotR = 0.7;
      ctx.fillStyle = "rgba(74,63,53,0.15)";
      for (let gx = chartL; gx < chartR; gx += dotSp) {
        for (let gy = chartT; gy < chartB; gy += dotSp) {
          ctx.beginPath();
          ctx.arc(gx, gy, dotR, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (chCount === 0) {
        ctx.font = `400 13px ${FONT}`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(74,63,53,0.12)";
        ctx.fillText("Toggle channels above to see projections", W / 2, H / 2);
        ctx.restore();
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      // Baseline
      ctx.beginPath();
      ctx.moveTo(chartL, chartB);
      ctx.lineTo(chartR, chartB);
      ctx.strokeStyle = "#4a3f35";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Bar groups
      const groupGap = Math.max(16, chartW * 0.05);
      const totalGaps = Math.max(0, chCount - 1) * groupGap;
      const edgePad = Math.max(12, chartW * 0.02);
      const usableW = chartW - edgePad * 2;
      const groupW = (usableW - totalGaps) / chCount;
      const barGap = Math.max(2, groupW * 0.06);
      const subBarW = (groupW - barGap * (metrics.length - 1)) / metrics.length;

      activeChannels.forEach((ch, ci) => {
        const pct = (sliders[ch.id] || 0) / 100;
        const groupX = chartL + edgePad + ci * (groupW + groupGap);
        const isHov = hov === ci;

        if (!bars[ch.id]) bars[ch.id] = { reach: 0, impressions: 0, conversions: 0 };
        metrics.forEach(m => {
          const raw = calcBarVal(ch, m, pct, bm);
          const t = Math.min(1, raw / maxVals[m]);
          bars[ch.id][m] += (t - bars[ch.id][m]) * 0.1;
        });

        metrics.forEach((m, mi) => {
          const barX = groupX + mi * (subBarW + barGap);
          const barH = bars[ch.id][m] * chartH;
          const barY = chartB - barH;
          if (barH < 1) return;
          // Responsive radius: proportional to bar width, always soft
          const r = Math.max(4, Math.min(subBarW * 0.35, barH * 0.4, 14));

          const barPath = () => {
            ctx.beginPath();
            ctx.moveTo(barX + r, barY);
            ctx.lineTo(barX + subBarW - r, barY);
            ctx.arc(barX + subBarW - r, barY + r, r, -Math.PI / 2, 0);
            ctx.lineTo(barX + subBarW, chartB);
            ctx.lineTo(barX, chartB);
            ctx.lineTo(barX, barY + r);
            ctx.arc(barX + r, barY + r, r, Math.PI, -Math.PI / 2);
            ctx.closePath();
          };

          const fillPct = 0.3 + pct * 0.7;
          const fillH = barH * fillPct;
          const fillY = chartB - fillH;
          if (fillH > 1) {
            ctx.save();
            barPath();
            ctx.clip();
            ctx.globalAlpha = isHov ? 0.55 : 0.35;
            ctx.fillStyle = ch.bg;
            ctx.fillRect(barX, fillY, subBarW, fillH);
            ctx.globalAlpha = 1;
            ctx.restore();
          }

          barPath();
          ctx.strokeStyle = isHov ? ch.color : "rgba(74,63,53,0.7)";
          ctx.lineWidth = isHov ? 1.4 : 0.8;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(barX + 1, fillY);
          ctx.lineTo(barX + subBarW - 1, fillY);
          ctx.strokeStyle = isHov ? ch.color : "rgba(74,63,53,0.5)";
          ctx.lineWidth = isHov ? 1.2 : 0.7;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(barX + subBarW / 2, fillY, isHov ? 2 : 1.5, 0, Math.PI * 2);
          ctx.fillStyle = isHov ? ch.color : "rgba(74,63,53,0.6)";
          ctx.fill();

          if (isHov && barH > 16) {
            const raw = calcBarVal(ch, m, pct, bm);
            ctx.font = `500 8px ${FONT}`;
            ctx.textAlign = "center"; ctx.textBaseline = "bottom";
            ctx.fillStyle = ch.color;
            ctx.fillText(m === "conversions" ? Math.round(raw) + "K" : raw.toFixed(1) + "M", barX + subBarW / 2, barY - 5);
          }
        });

        // Channel label
        ctx.font = `${isHov ? "500" : "400"} 11px ${FONT}`;
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillStyle = isHov ? ch.color : "rgba(74,63,53,0.45)";
        ctx.fillText(ch.label, groupX + groupW / 2, chartB + 8);

        // %
        ctx.font = `400 9px ${FONT}`;
        ctx.fillStyle = isHov ? ch.color : "rgba(74,63,53,0.25)";
        ctx.fillText((sliders[ch.id] || 0) + "%", groupX + groupW / 2, chartB + 22);

        // Sub-labels on hover
        if (isHov) {
          ctx.font = `400 7px ${FONT}`;
          ctx.fillStyle = "rgba(74,63,53,0.15)";
          metrics.forEach((m, mi) => {
            const barX = groupX + mi * (subBarW + barGap);
            ctx.textAlign = "center"; ctx.textBaseline = "top";
            ctx.fillText(metricLabels[mi], barX + subBarW / 2, chartB + 34);
          });
        }
      });

      setTick(t => t + 1);
      ctx.restore();
      } // end if chartAlpha

      // Keep animating during title transition
      if (tt > 0.002 && tt < 0.998) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [size, sliders, budget, activeChannels, hovIdx, stats, hasInteracted]);

  // Hover
  const handleMove = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const W = size.w;
    const pad = 48;
    const chartL = pad, chartR = W - pad;
    const chartW = chartR - chartL;
    const chCount = activeChannels.length;
    if (chCount === 0) { setHovIdx(-1); return; }
    const groupGap = Math.max(16, chartW * 0.05);
    const edgePad = Math.max(12, chartW * 0.02);
    const usableW = chartW - edgePad * 2;
    const groupW = (usableW - Math.max(0, chCount - 1) * groupGap) / chCount;
    let found = -1;
    for (let i = 0; i < chCount; i++) {
      const gx = chartL + edgePad + i * (groupW + groupGap);
      if (mx >= gx && mx <= gx + groupW) { found = i; break; }
    }
    setHovIdx(found);
  }, [size, activeChannels]);

  const totalAlloc = activeChannels.reduce((s, ch) => s + (sliders[ch.id] || 0), 0);
  const shares = activeChannels.map(ch => totalAlloc > 0 ? Math.round((sliders[ch.id] || 0) / totalAlloc * 100) : 0);

  return (
    <div className="bm">
      {/* ── Canvas — includes title, stats, and chart ── */}
      <div ref={wrapRef} className="bm-canvas-wrap">
        <canvas ref={canvasRef}
          style={{ width: size.w, height: size.h, cursor: hovIdx >= 0 ? "crosshair" : "default" }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHovIdx(-1)} />
      </div>

      {/* ── Controls — channel chips with inline sliders ── */}
      <div className="bm-controls">
        <div className="bm-chips">
          {BM_CHANNELS.map(ch => {
            const isOn = enabled.includes(ch.id);
            const hasAny = enabled.length > 0;
            return (
              <div key={ch.id}
                className={`bm-chip ${isOn ? "on" : hasAny ? "off" : ""}`}
                style={{ "--chip-bg": ch.bg, "--chip-color": ch.color }}
                onClick={(e) => { if (e.target.tagName === "INPUT") return; toggleChannel(ch.id); }}>
                <div className="bm-chip-dot" style={{ background: isOn ? ch.color : "rgba(74,63,53,0.15)" }} />
                <span>{ch.label}</span>
                {isOn && (
                  <div className="bm-chip-slider" onClick={e => e.stopPropagation()}>
                    <div className="bm-chip-slider-bg" />
                    <div className="bm-chip-slider-fill" style={{ width: `${sliders[ch.id] || 0}%`, background: ch.color }} />
                    <input type="range" min="0" max="100" value={sliders[ch.id] || 0}
                      style={{ "--sc": ch.color }}
                      onChange={e => updateSlider(ch.id, +e.target.value)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Shelf — budget + presets + allocation ── */}
      <div className="bm-shelf">
        <div className="bm-shelf-row">
          <div className="bm-shelf-budget">
            <span className="bm-shelf-budget-label">Budget</span>
            <div className="bm-shelf-budget-track">
              <div className="bm-shelf-budget-track-bg" />
              <div className="bm-shelf-budget-track-fill" style={{ width: `${(budget / 20000) * 100}%` }} />
              <input type="range" min="500" max="20000" step="500" value={budget}
                onChange={e => { setBudget(+e.target.value); setActivePreset(null); }} />
            </div>
            <span className="bm-shelf-budget-val">${(budget / 1000).toFixed(budget >= 1000 ? 0 : 1)}K/mo</span>
          </div>

          <div className="bm-shelf-sep" />

          {BM_PRESETS.map(p => (
            <button key={p.id} className={`bm-preset ${activePreset === p.id ? "active" : ""}`}
              onClick={() => applyPreset(p)}>{p.label}</button>
          ))}

          <span className="bm-shelf-alloc">
            {activeChannels.length > 0
              ? activeChannels.map((ch, i) => `${ch.label} ${shares[i]}%`).join("  ·  ")
              : "Select channels to begin"
            }
          </span>
        </div>
      </div>
    </div>
  );
}
/* ── Interactive Budget Allocation Bar ── */
function BudgetAllocationBar({ channels, sliders, onSlidersChange, budget }) {
  const barRef = useRef(null);
  const draggingIdx = useRef(null);
  const [hoveredDiv, setHoveredDiv] = useState(null);

  if (channels.length === 0) return null;

  const totalWeight = channels.reduce((s, ch) => s + (sliders[ch.id] || 0), 0) || 1;
  const shares = channels.map(ch => (sliders[ch.id] || 0) / totalWeight);

  // Cumulative positions for dividers (between segments)
  const cumulative = [];
  let cum = 0;
  shares.forEach((s, i) => {
    cum += s;
    if (i < channels.length - 1) cumulative.push(cum);
  });

  const handleMouseDown = (dividerIdx, e) => {
    e.preventDefault();
    draggingIdx.current = dividerIdx;

    const onMove = (ev) => {
      if (draggingIdx.current === null || !barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const x = (ev.clientX - rect.left) / rect.width;
      const clamped = Math.max(0.05, Math.min(0.95, x));
      const idx = draggingIdx.current;

      const prevDivider = idx > 0 ? cumulative[idx - 1] : 0;
      const nextDivider = idx < cumulative.length - 1 ? cumulative[idx + 1] : 1;
      const minGap = 0.05;
      const pos = Math.max(prevDivider + minGap, Math.min(nextDivider - minGap, clamped));

      const newSliders = { ...sliders };
      const leftCh = channels[idx];
      const rightCh = channels[idx + 1];
      const leftStart = idx > 0 ? cumulative[idx - 1] : 0;
      const rightEnd = idx < cumulative.length - 1 ? cumulative[idx + 1] : 1;

      const leftShare = pos - leftStart;
      const rightShare = rightEnd - pos;
      newSliders[leftCh.id] = Math.round(leftShare * 100);
      newSliders[rightCh.id] = Math.round(rightShare * 100);

      onSlidersChange(newSliders);
    };

    const onUp = () => {
      draggingIdx.current = null;
      setHoveredDiv(null);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const barHeight = 28;

  return (
    <div
      ref={barRef}
      style={{
        position: "relative",
        height: barHeight + 18,
        width: "100%",
        userSelect: "none",
      }}
    >
      {/* Stacked bar */}
      <div style={{
        display: "flex",
        height: barHeight,
        borderRadius: 100,
        overflow: "hidden",
        background: "rgba(74,63,53,0.06)",
      }}>
        {channels.map((ch, i) => {
          const dollars = Math.round(budget * shares[i]);
          return (
            <div key={ch.id} style={{
              width: `${shares[i] * 100}%`,
              height: "100%",
              background: ch.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              transition: draggingIdx.current !== null ? "none" : "width 0.15s ease",
              minWidth: 30,
            }}>
              {shares[i] > 0.12 && (
                <span style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: ch.color,
                  fontFamily: FONT,
                  fontVariantNumeric: "tabular-nums",
                  pointerEvents: "none",
                  letterSpacing: "-0.2px",
                }}>
                  ${(dollars/1000).toFixed(1)}K
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Draggable dividers — vertical rule + triangle handle */}
      {cumulative.map((pos, i) => {
        const isActive = hoveredDiv === i || draggingIdx.current === i;
        return (
          <div
            key={i}
            onMouseDown={(e) => handleMouseDown(i, e)}
            onMouseEnter={() => setHoveredDiv(i)}
            onMouseLeave={() => { if (draggingIdx.current === null) setHoveredDiv(null); }}
            style={{
              position: "absolute",
              left: `${pos * 100}%`,
              top: -4,
              transform: "translateX(-50%)",
              cursor: "ew-resize",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "0 8px",
            }}
          >
            {/* Vertical rule */}
            <div style={{
              width: isActive ? 2 : 1,
              height: barHeight + 8,
              background: isActive ? "#4a3f35" : "rgba(74,63,53,0.2)",
              transition: "background 0.15s, width 0.15s",
              flexShrink: 0,
            }} />
            {/* Triangle — connected to rule */}
            <svg width="10" height="7" viewBox="0 0 10 7" style={{ display: "block", marginTop: -1, overflow: "visible" }}>
              <path d="M5 0L10 7H0Z" fill={isActive ? "#4a3f35" : "rgba(74,63,53,0.3)"} style={{ transition: "fill 0.15s" }} />
            </svg>
          </div>
        );
      })}
    </div>
  );
}

function CampaignBuilder() {
  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ w: 900, h: 680 });
  const [currentStep, setCurrentStep] = useState(0);
  const [placed, setPlaced] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const hoveredNodePos = useRef({ x: 0, y: 0 });
  const [hoveredXNode, setHoveredXNode] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeGoals, setActiveGoals] = useState([]); /* Which goals drive scoring */
  const [actionLog, setActionLog] = useState([]); /* { text, grade, time } */

  /* ── Budget allocation phase (post-generate) ── */
  const [budgetPhase, setBudgetPhase] = useState(false);
  const [bmEnabled, setBmEnabled] = useState([]);
  const [bmSliders, setBmSliders] = useState({ search: 0, audience: 0, shopping: 0, video: 0, linkedin: 0 });
  const [bmBudget, setBmBudget] = useState(5000);
  const [bmHovIdx, setBmHovIdx] = useState(-1);
  const [bmInfoOpen, setBmInfoOpen] = useState(false);
  const [bmInfoPage, setBmInfoPage] = useState(0);
  const [editingBudget, setEditingBudget] = useState(false);
  const [editBudgetVal, setEditBudgetVal] = useState("");
  const [customBudget, setCustomBudget] = useState(null);
  const bmAnimBars = useRef({});
  const bmAnimStats = useRef({ reach: 0, impressions: 0, conversions: 0 });
  const bmTitleTrans = useRef(0);

  const posOverrides = useRef({});
  const [canvasDrag, setCanvasDrag] = useState(null); /* { id, offsetX, offsetY } */
  const [dragTick, setDragTick] = useState(0);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const [canvasDragPos, setCanvasDragPos] = useState({ x: 0, y: 0 });
  const trashRef = useRef(null);
  const chipClickRef = useRef(null);

  const satellitesRef = useRef({});
  const animFrameRef = useRef(null);
  const titleTransRef = useRef(0); // 0 = empty/big, 1 = compact/small — smoothly animated

  /* ── Onboarding demo: smooth looping pill animation ── */
  const demoRef = useRef({
    active: false,
    killed: false,
    t: 0,              // continuous time in seconds, loops
    startX: 0, startY: 0,
    endX: 0, endY: 0,
    measured: false,
  });
  const [demoTick, setDemoTick] = useState(0); // drives re-render each frame
  const demoChipRef = useRef(null);
  const demoRafRef = useRef(null);

  const SAT_WORDS = {
    b1:["starter","focused","lean","efficient"],b2:["growth","expand","scale","optimize"],
    b3:["multi-channel","diversify","premium","accelerate"],b4:["enterprise","dominate","full-funnel","maximize"],
    b5:["premium","total","ecosystem","unlimited"],
    g1:["reach","impressions","SOV","frequency"],g2:["forms","leads","MQLs","pipeline"],
    g3:["cart","checkout","ROAS","revenue"],g4:["CTR","visits","bounce","sessions"],
    g5:["installs","CPI","engagement","retention"],
    ch1:["Yahoo","DuckDuckGo","AOL","900M"],ch2:["sidebar","new tab","copilot","browser"],
    ch3:["B2B","job title","industry","seniority"],ch4:["inbox","newsletter","professional","email"],
    ch5:["feed","Windows","Start menu","content"],t1:["purchase intent","research","comparison","signals"],
    t2:["pixel","UET","30-day","lists"],t3:["company","function","C-suite","firmographic"],
    t4:["CRM","upload","match rate","1st party"],t5:["lookalike","expansion","prospecting","scale"],
    m1:["revenue","margin","bid strategy","target"],m2:["cost/lead","efficiency","budget","learning"],
    m3:["volume","traffic","bid cap","maximize"],m4:["actions","goals","UET tag","tracking"],
    m5:["eyeballs","share","CPM","awareness"],
  };

  const bmActiveChannels = useMemo(() => BM_CHANNELS.filter(ch => bmEnabled.includes(ch.id)), [bmEnabled]);

  const bmStats = useMemo(() => {
    const bm = bmBudget / 5000;
    let reach = 0, impressions = 0, conversions = 0;
    bmActiveChannels.forEach(ch => {
      const p = (bmSliders[ch.id] || 0) / 100;
      reach += ch.base.reach * (0.2 + p * ch.scale.reach) * bm;
      impressions += ch.base.impressions * (0.15 + p * ch.scale.impressions) * bm;
      conversions += ch.base.conversions * (0.1 + p * ch.scale.conversions) * bm;
    });
    return {
      reach: Math.round(reach * 10) / 10,
      impressions: Math.round(impressions * 10) / 10,
      conversions: Math.round(conversions * 10) / 10,
    };
  }, [bmSliders, bmBudget, bmActiveChannels]);

  const bmFormatNum = (n) => n >= 1000 ? (n / 1000).toFixed(1) + "B" : n.toFixed(1) + "M";

  /* ── Budget gauge state ── */
  const selectedBudgetNode = placed.find(n => n.step === "budget");
  const selectedBudgetValue = customBudget || (selectedBudgetNode ? (STEPS[0].items.find(i => i.id === selectedBudgetNode.id)?.value || 5000) : null);

  const estimatedMinSpend = useMemo(() => {
    if (bmEnabled.length === 0 || !selectedBudgetValue) return 0;
    return calcEstimatedSpend(bmEnabled, bmSliders, selectedBudgetValue);
  }, [bmEnabled, bmSliders, selectedBudgetValue]);

  const channelAllocations = useMemo(() => {
    return calcChannelAllocations(bmEnabled, bmSliders, selectedBudgetValue || bmBudget);
  }, [bmEnabled, bmSliders, selectedBudgetValue, bmBudget]);

  // Over budget = sum of channel minimums exceeds total budget
  const isOverBudget = selectedBudgetValue && budgetPhase && estimatedMinSpend > selectedBudgetValue;
  // How much of the arc is filled — always 100% allocated (sliders sum to full), but show red if over
  const budgetUsedPct = 1; // arc always full — segments show proportional split
  const budgetGaugeAnimRef = useRef(0);

  const bmToggleChannel = useCallback((id) => {
    setBmEnabled(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      if (!prev.includes(id)) setBmSliders(s => ({ ...s, [id]: s[id] || 50 }));
      return next;
    });
  }, []);

  const bmUpdateSlider = useCallback((id, val) => {
    setBmSliders(prev => ({ ...prev, [id]: val }));
  }, []);

  const step = STEPS[currentStep];
  const done = currentStep >= STEPS.length;
  const placedIds = new Set(placed.map((n) => n.id));

  useEffect(() => {
    const measure = () => {
      if (!canvasContainerRef.current) return;
      const r = canvasContainerRef.current.getBoundingClientRect();
      setCanvasSize({ w: r.width, h: r.height });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /* ── Demo: trigger on viewport entry, run single smooth rAF loop ── */
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const d = demoRef.current;
    let lastT = 0;

    const measure = () => {
      const chip = demoChipRef.current;
      const cvs = canvasContainerRef.current;
      if (!chip || !cvs) return;
      const cr = chip.getBoundingClientRect();
      const cvr = cvs.getBoundingClientRect();
      d.startX = cr.left + cr.width / 2;
      d.startY = cr.top + cr.height / 2;
      d.endX = cvr.left + cvr.width * 0.5;
      d.endY = cvr.top + cvr.height * 0.5;
      d.measured = true;
    };

    const tick = (now) => {
      if (d.killed) return;
      if (!lastT) lastT = now;
      const dt = Math.min((now - lastT) / 1000, 0.04);
      lastT = now;
      d.t += dt;
      // Re-measure every loop start to handle scroll/resize
      measure();
      setDemoTick(t => t + 1);
      demoRafRef.current = requestAnimationFrame(tick);
    };

    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !d.active && !d.killed && placed.length === 0) {
        d.active = true;
        d.t = 0;
        lastT = 0;
        measure();
        demoRafRef.current = requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    obs.observe(container);

    return () => {
      obs.disconnect();
      if (demoRafRef.current) cancelAnimationFrame(demoRafRef.current);
    };
  }, [placed.length]);

  useEffect(() => {
    const sats = { ...satellitesRef.current };
    placed.forEach((n) => {
      if (!sats[n.id]) {
        const words = SAT_WORDS[n.id] || ["data", "signal", "metric"];
        sats[n.id] = words.map((w, i) => ({
          label: w,
          angle: (Math.PI * 2 * i) / words.length - Math.PI / 2 + (Math.random() - 0.5) * 0.3,
          radius: 60 + i * 16 + Math.random() * 12,
          size: 1.5 + Math.random(),
          born: Date.now(),
        }));
      }
    });
    const ids = new Set(placed.map((n) => n.id));
    Object.keys(sats).forEach((k) => { if (!ids.has(k)) delete sats[k]; });
    satellitesRef.current = sats;
  }, [placed]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvasSize.w, H = canvasSize.h;
    c.width = W * dpr;
    c.height = H * dpr;
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#f8f4ee";
    ctx.fillRect(0, 0, W, H);

    const pad = 48;
    const hasNodes = placed.length > 0;
    const now = Date.now();

    if (budgetPhase && bmActiveChannels.length > 0) {
      // ── BUDGET ALLOCATION PHASE ──
      const targetBT = 1;
      const btSpeed = 0.045;
      bmTitleTrans.current += (targetBT - bmTitleTrans.current) * btSpeed;
      if (Math.abs(bmTitleTrans.current - targetBT) < 0.002) bmTitleTrans.current = targetBT;
      const btt = bmTitleTrans.current;

      const bPad = 48;

      // Stats animated (keep updating for popover)
      const as = bmAnimStats.current;
      as.reach += (bmStats.reach - as.reach) * 0.08;
      as.impressions += (bmStats.impressions - as.impressions) * 0.08;
      as.conversions += (bmStats.conversions - as.conversions) * 0.08;

      // ── Chart area — full canvas ──
      const chartPad = { top: bPad, right: bPad, bottom: 40, left: bPad };
      const chartL = chartPad.left, chartR = W - chartPad.right;
      const chartT = chartPad.top, chartB = H - chartPad.bottom;
      const chartW = chartR - chartL, chartH = chartB - chartT;
      const chCount = bmActiveChannels.length;

      const bm = bmBudget / 5000;
      const metrics = ["reach", "impressions", "conversions"];
      const metricLabels = ["Reach", "Impr.", "Conv."];
      const metricOffsets = { reach: 0.2, impressions: 0.15, conversions: 0.1 };
      const calcBarVal = (ch, m, pct, bm) => ch.base[m] * (metricOffsets[m] + pct * ch.scale[m]) * bm;
      const maxVals = { reach: 35, impressions: 120, conversions: 50 };
      const bars = bmAnimBars.current;
      const hov = bmHovIdx;

      // Dot grid
      const dotSp = 20;
      const dotR = 0.7;
      ctx.fillStyle = "rgba(74,63,53,0.12)";
      for (let gx = chartL; gx < chartR; gx += dotSp) {
        for (let gy = chartT; gy < chartB; gy += dotSp) {
          ctx.beginPath();
          ctx.arc(gx, gy, dotR, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Baseline
      ctx.beginPath();
      ctx.moveTo(chartL, chartB);
      ctx.lineTo(chartR, chartB);
      ctx.strokeStyle = "#4a3f35";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Bar groups
      if (chCount > 0) {
        const groupGap = Math.max(16, chartW * 0.05);
        const totalGaps = Math.max(0, chCount - 1) * groupGap;
        const edgePad = Math.max(12, chartW * 0.02);
        const usableW = chartW - edgePad * 2;
        const groupW = (usableW - totalGaps) / chCount;
        const barGap = Math.max(2, groupW * 0.06);
        const subBarW = (groupW - barGap * (metrics.length - 1)) / metrics.length;

        bmActiveChannels.forEach((ch, ci) => {
          const pct = (bmSliders[ch.id] || 0) / 100;
          const groupX = chartL + edgePad + ci * (groupW + groupGap);
          const isHov = hov === ci;

          if (!bars[ch.id]) bars[ch.id] = { reach: 0, impressions: 0, conversions: 0 };
          metrics.forEach(m => {
            const raw = calcBarVal(ch, m, pct, bm);
            const t = Math.min(1, raw / maxVals[m]);
            bars[ch.id][m] += (t - bars[ch.id][m]) * 0.1;
          });

          metrics.forEach((m, mi) => {
            const barX = groupX + mi * (subBarW + barGap);
            const barH = bars[ch.id][m] * chartH;
            const barY = chartB - barH;
            if (barH < 1) return;
            const r = Math.max(4, Math.min(subBarW * 0.35, barH * 0.4, 14));

            const barPath = () => {
              ctx.beginPath();
              ctx.moveTo(barX + r, barY);
              ctx.lineTo(barX + subBarW - r, barY);
              ctx.arc(barX + subBarW - r, barY + r, r, -Math.PI / 2, 0);
              ctx.lineTo(barX + subBarW, chartB);
              ctx.lineTo(barX, chartB);
              ctx.lineTo(barX, barY + r);
              ctx.arc(barX + r, barY + r, r, Math.PI, -Math.PI / 2);
              ctx.closePath();
            };

            const fillPct = 0.3 + pct * 0.7;
            const fillH = barH * fillPct;
            const fillY = chartB - fillH;
            if (fillH > 1) {
              ctx.save();
              barPath();
              ctx.clip();
              ctx.globalAlpha = isHov ? 0.55 : 0.35;
              ctx.fillStyle = ch.bg;
              ctx.fillRect(barX, fillY, subBarW, fillH);
              ctx.globalAlpha = 1;
              ctx.restore();
            }

            barPath();
            ctx.strokeStyle = isHov ? ch.color : "rgba(74,63,53,0.7)";
            ctx.lineWidth = isHov ? 1.4 : 0.8;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(barX + 1, fillY);
            ctx.lineTo(barX + subBarW - 1, fillY);
            ctx.strokeStyle = isHov ? ch.color : "rgba(74,63,53,0.5)";
            ctx.lineWidth = isHov ? 1.2 : 0.7;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(barX + subBarW / 2, fillY, isHov ? 2 : 1.5, 0, Math.PI * 2);
            ctx.fillStyle = isHov ? ch.color : "rgba(74,63,53,0.6)";
            ctx.fill();

            if (isHov && barH > 16) {
              const raw = calcBarVal(ch, m, pct, bm);
              ctx.font = `500 9px ${FONT}`;
              ctx.textAlign = "center"; ctx.textBaseline = "bottom";
              ctx.fillStyle = ch.color;
              ctx.fillText(m === "conversions" ? Math.round(raw) + "K" : raw.toFixed(1) + "M", barX + subBarW / 2, barY - 5);
            }
          });

          // Channel label
          ctx.font = `${isHov ? "500" : "400"} 11px ${FONT}`;
          ctx.textAlign = "center"; ctx.textBaseline = "top";
          ctx.fillStyle = isHov ? ch.color : "rgba(74,63,53,0.5)";
          ctx.fillText(ch.label, groupX + groupW / 2, chartB + 8);

          // %
          ctx.font = `400 11px ${FONT}`;
          ctx.fillStyle = isHov ? ch.color : "rgba(74,63,53,0.25)";
          ctx.fillText((bmSliders[ch.id] || 0) + "%", groupX + groupW / 2, chartB + 22);

          // Sub-labels on hover
          if (isHov) {
            ctx.font = `400 9px ${FONT}`;
            ctx.fillStyle = "rgba(74,63,53,0.25)";
            metrics.forEach((m, mi) => {
              const barX = groupX + mi * (subBarW + barGap);
              ctx.textAlign = "center"; ctx.textBaseline = "top";
              ctx.fillText(metricLabels[mi], barX + subBarW / 2, chartB + 34);
            });
          }
        });
      }

      // ── Realistic channel cost labels ──
      if (bmActiveChannels.length > 0) {
        const costY = chartB + 42;
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.font = `400 8px ${FONT}`;
        bmActiveChannels.forEach((ch, ci) => {
          const groupGapC = Math.max(16, chartW * 0.05);
          const edgePadC = Math.max(12, chartW * 0.02);
          const usableWC = chartW - edgePadC * 2;
          const groupWC = (usableWC - Math.max(0, chCount - 1) * groupGapC) / chCount;
          const gxC = chartL + edgePadC + ci * (groupWC + groupGapC);
          const costInfo = CHANNEL_COSTS[ch.id];
          if (costInfo) {
            ctx.fillStyle = "rgba(74,63,53,0.2)";
            ctx.fillText(costInfo.label, gxC + groupWC / 2, costY);
          }
        });
        ctx.restore();
      }

      // Keep animating
      animFrameRef.current = requestAnimationFrame(() => setDragTick(t => t + 1));

    } else if (summary && summary.name && !budgetPhase) {
      const cardM = 12, cardR = 32;
      const cardX = cardM, cardY = cardM;
      const cardW = W - cardM * 2, cardH = H - cardM * 2;

      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, cardR);
      ctx.fillStyle = "#4a3f35";
      ctx.fill();

      // Grid: consistent padding
      const px = Math.max(32, Math.min(48, W * 0.04)); // horizontal padding
      const py = Math.max(28, Math.min(40, W * 0.035)); // vertical padding
      const L = cardX + px;
      const R = cardX + cardW - px;
      const T = cardY + py;
      const B = cardY + cardH - py;
      const contentW = R - L;

      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      // ── Row 1: Name ──
      const nameSz = Math.min(24, Math.max(16, W * 0.018));
      ctx.font = `400 ${nameSz}px ${FONT}`;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.letterSpacing = "-0.3px";
      ctx.fillText(summary.name, L, T);
      ctx.letterSpacing = "0px";

      // ── Row 2: Description ──
      let descEndY = T + nameSz + 4;
      if (summary.line) {
        ctx.font = `400 ${Math.min(13, Math.max(11, W * 0.01))}px ${FONT}`;
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        const descLines = wrapText(ctx, summary.line, Math.min(contentW * 0.7, 420));
        descLines.forEach((l, i) => {
          ctx.fillText(l, L, T + nameSz + 8 + i * 17);
        });
        descEndY = T + nameSz + 8 + descLines.length * 17;
      }

      // ── Row 3: Hero stat — vertically centered in remaining space ──
      const statSz = Math.min(140, Math.max(72, W * 0.11));
      const statText = summary.stat || "";
      ctx.font = `300 ${statSz}px ${FONT}`;
      const statMW = ctx.measureText(statText).width;

      // Center the stat between description and bottom metrics
      const metricsRowH = 44; // reserved for bottom row
      const availH = B - descEndY - metricsRowH;
      const statY = descEndY + (availH - statSz) * 0.45;

      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.letterSpacing = `${Math.min(-2, -statSz * 0.025)}px`;
      ctx.fillText(statText, L, statY);
      ctx.letterSpacing = "0px";

      // Stat label — beside or below
      if (summary.statLabel) {
        ctx.font = `400 11px ${FONT}`;
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        const labelLines = wrapText(ctx, summary.statLabel, 160);
        if (statMW + 180 < contentW) {
          // Beside stat, baseline-aligned
          labelLines.forEach((l, i) => {
            ctx.fillText(l, L + statMW + 20, statY + statSz - 20 - (labelLines.length - 1 - i) * 14);
          });
        } else {
          labelLines.forEach((l, i) => {
            ctx.fillText(l, L, statY + statSz + 6 + i * 14);
          });
        }
      }

      // ── Row 4: Bottom — action left, or empty ──
      if (summary.action) {
        ctx.font = `400 11px ${FONT}`;
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillText("→  " + summary.action, L, B - 11);
      }

    } else {
      // ── Strategy phase: nodes only (headline is in DOM) ──

      // ── Draw nodes, links, scores when we have placed items ──
      if (hasNodes || dragging) {

      const { positions, links } = computeLayout(placed, W, H, false, posOverrides.current);

      const easeOutBack = (t) => {
        const c1 = 1.70158, c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      };

      const getNodeColors = (id) => {
        const n = placed.find(p => p.id === id);
        if (!n) return { bg: "#e0d9cf", color: "#4a3f35" };
        const s = STEPS.find(s => s.key === n.step);
        return s ? { bg: s.bg, color: s.color } : { bg: "#e0d9cf", color: "#4a3f35" };
      };

      const bezierPt = (t, p0, cp1, cp2, p1) => {
        const mt = 1 - t;
        return mt*mt*mt*p0 + 3*mt*mt*t*cp1 + 3*mt*t*t*cp2 + t*t*t*p1;
      };

      links.forEach((l, li) => {
        const fp = positions[l.from], tp = positions[l.to];
        if (!fp || !tp) return;
        const dx = tp.x - fp.x;
        const dy = tp.y - fp.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Generous horizontal spread
        const cpOff = Math.max(60, Math.abs(dx) * 0.5);
        // Strong perpendicular sway — whip-like
        const swayBase = Math.min(80, dist * 0.25);
        const swayDir = (li % 3 === 0 ? 1 : li % 3 === 1 ? -1 : 0.5);
        const sway1 = swayDir * swayBase;
        const sway2 = -swayDir * swayBase * 0.7;
        const cp1x = fp.x + cpOff, cp1y = fp.y + sway1;
        const cp2x = tp.x - cpOff, cp2y = tp.y + sway2;
        const weight = l.weight || 1;

        const fromNode = placed.find(n => n.id === l.from);
        const toNode = placed.find(n => n.id === l.to);
        const linkBorn = Math.max(fromNode?.born || 0, toNode?.born || 0);
        const linkAge = Math.min(1, (now - linkBorn) / 900);

        const isConnected = hoveredNode && (l.from === hoveredNode || l.to === hoveredNode);
        const baseAlpha = weight === 3 ? 1 : weight === 2 ? 0.5 : 0.2;
        const lineAlpha = hoveredNode
          ? (isConnected ? 1 : 0.04)
          : baseAlpha;
        const lineWidth = isConnected ? 1.5 : weight === 3 ? 1 : weight === 2 ? 0.7 : 0.4;

        if (linkAge < 1) {
          // Whip effect: line draws with elastic overshoot on the sway
          const t = easeOutBack(Math.min(linkAge, 1));
          // Elastic multiplier on sway — overshoots then settles
          const elasticT = linkAge < 0.6
            ? 1 + Math.sin(linkAge * Math.PI * 3) * (1 - linkAge) * 0.6
            : 1;
          const aSway1 = sway1 * elasticT;
          const aSway2 = sway2 * elasticT;
          const aCp1y = fp.y + aSway1;
          const aCp2y = tp.y + aSway2;
          const steps = Math.max(8, Math.floor(t * 40));
          ctx.beginPath();
          for (let i = 0; i <= steps; i++) {
            const u = (i / steps) * t;
            const x = bezierPt(u, fp.x, cp1x, cp2x, tp.x);
            const y = bezierPt(u, fp.y, aCp1y, aCp2y, tp.y);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        } else {
          ctx.beginPath();
          ctx.moveTo(fp.x, fp.y);
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, tp.x, tp.y);
        }
        ctx.strokeStyle = `rgba(74,63,53,${lineAlpha})`;
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        if (linkAge >= 1 && weight >= 2) {
          const speed = 3000 + li * 500;
          const dotT = ((now % speed) / speed);
          const dx = bezierPt(dotT, fp.x, cp1x, cp2x, tp.x);
          const dy = bezierPt(dotT, fp.y, cp1y, cp2y, tp.y);
          const dotAlpha = hoveredNode ? (isConnected ? 0.7 : 0.03) : (weight === 3 ? 0.6 : 0.3);
          const dotR = weight === 3 ? 2.5 : 1.5;
          ctx.beginPath();
          ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(74,63,53,${dotAlpha})`;
          ctx.fill();
        }
      });

      const sats = satellitesRef.current;
      if (selectedNode) {
        const selP = positions[selectedNode];
        const selSats = sats[selectedNode];
        const selColors = getNodeColors(selectedNode);
        if (selP && selSats) {
          selSats.forEach((s, si) => {
            const stagger = si * 60;
            const age = Math.min(1, Math.max(0, (now - s.born - stagger) / 350));
            const ease = easeOutBack(age);
            const sx = selP.x + Math.cos(s.angle) * s.radius * ease;
            const sy = selP.y + Math.sin(s.angle) * s.radius * ease;

            ctx.beginPath();
            ctx.moveTo(selP.x, selP.y);
            ctx.lineTo(sx, sy);
            ctx.strokeStyle = `rgba(74,63,53,${0.15 * age})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();

            drawPill(ctx, sx, sy, s.label, {
              fontSize: 12, fontWeight: "400",
              color: selColors.color,
              bg: selColors.bg,
              strokeColor: "#4a3f35",
              strokeWidth: 0.5,
              paddingX: 10, paddingY: 5,
              alpha: age * 0.75,
            });
          });
        }
      }

      placed.forEach((n) => {
        const p = positions[n.id];
        if (!p) return;
        const isHov = hoveredNode === n.id;
        const isSel = selectedNode === n.id;
        const isDragged = canvasDrag && canvasDrag.id === n.id;
        const stepDef = STEPS.find(s => s.key === n.step);
        const pillBg = stepDef ? stepDef.bg : "#f2f2f2";
        const pillColor = stepDef ? stepDef.color : "#4a3f35";
        const nodeInfo = NODE_INSIGHTS[n.id];
        const grade = activeGoals.length > 0 && n.step !== "goal" ? gradeNodeMulti(activeGoals, n.id) : "neutral";

        const age = Math.min(1, Math.max(0, (now - (n.born || 0)) / 400));
        const scale = age < 0.01 ? 0 : easeOutBack(age);

        let pillAlpha = 1;
        if (hoveredNode && !isHov) {
          const isLinked = links.some(l =>
            (l.from === hoveredNode && l.to === n.id) ||
            (l.to === hoveredNode && l.from === n.id)
          );
          pillAlpha = isLinked ? 1 : 0.25;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(scale, scale);
        ctx.translate(-p.x, -p.y);

        const strokeCol = "#4a3f35";

        const dims = drawPill(ctx, p.x, p.y, n.label, {
          fontSize: 16,
          fontWeight: "400",
          color: pillColor,
          bg: pillBg,
          strokeColor: strokeCol,
          strokeWidth: isDragged ? 1.5 : isSel ? 1.2 : isHov ? 1 : 0.7,
          paddingX: 20, paddingY: 10,
          alpha: pillAlpha,
        });

        // ── X close badge ──
        if (age >= 1 && !summary) {
          const xR = 7;
          const xBx = p.x + dims.w / 2 + 2;
          const xBy = p.y - dims.h / 2 - 2;
          const isXHov = hoveredXNode === n.id;
          ctx.beginPath();
          ctx.arc(xBx, xBy, xR, 0, Math.PI * 2);
          ctx.fillStyle = isXHov ? "rgba(204,68,68,0.12)" : "rgba(74,63,53,0.06)";
          ctx.fill();
          ctx.beginPath();
          const xS = 2.5;
          ctx.moveTo(xBx - xS, xBy - xS); ctx.lineTo(xBx + xS, xBy + xS);
          ctx.moveTo(xBx + xS, xBy - xS); ctx.lineTo(xBx - xS, xBy + xS);
          ctx.strokeStyle = isXHov ? "rgba(204,68,68,0.8)" : "rgba(74,63,53,0.25)";
          ctx.lineWidth = 1.2; ctx.lineCap = "round"; ctx.stroke(); ctx.lineCap = "butt";
        }

        if (nodeInfo?.exclusive && age >= 1) {
          const bx = p.x + dims.w / 2 - 4;
          const by = p.y - dims.h / 2 - 2;
          ctx.beginPath();
          ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = "#4a3f35";
          ctx.fill();
          ctx.font = `700 5px ${FONT}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#f8f4ee";
          ctx.fillText("M", bx, by + 0.3);
        }

        if (activeGoals.length > 0 && grade !== "neutral" && age >= 1) {
          const gx = p.x - dims.w / 2 + 3;
          const gy = p.y - dims.h / 2 - 2;
          ctx.beginPath();
          ctx.arc(gx, gy, 3, 0, Math.PI * 2);
          ctx.fillStyle = GRADE_COLORS[grade];
          ctx.fill();
        }

        ctx.restore();
      });

      // Node tooltip rendered as DOM popover below

      if (placed.length >= 2) {
        const goalScore = activeGoals.length > 0 ? calcGoalScoreMulti(activeGoals, placed) : null;

        if (goalScore) {
          const sx = pad;
          const sy = H - pad - 32;

          // ── Donut: coherence ring ──
          const donutR = 22;
          const donutX = sx + donutR;
          const donutY = sy - donutR + 2;
          const lineW = 3;
          const startAngle = -Math.PI / 2;
          const coherencePct = goalScore.coherence / 100;

          // Background ring
          ctx.beginPath();
          ctx.arc(donutX, donutY, donutR, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(74,63,53,0.06)";
          ctx.lineWidth = lineW;
          ctx.stroke();

          // Fill ring
          const gradeColor = goalScore.letter === "S" ? "#1a8a3e" : goalScore.letter === "A" ? "#3a7ab5" : goalScore.letter === "B" ? "#4a3f35" : goalScore.letter === "F" ? "#c44" : "rgba(74,63,53,0.7)";
          ctx.beginPath();
          ctx.arc(donutX, donutY, donutR, startAngle, startAngle + Math.PI * 2 * coherencePct);
          ctx.strokeStyle = gradeColor;
          ctx.lineWidth = lineW;
          ctx.lineCap = "round";
          ctx.stroke();
          ctx.lineCap = "butt";

          // Grade letter inside donut
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = `400 18px ${FONT}`;
          ctx.fillStyle = gradeColor;
          ctx.fillText(goalScore.letter, donutX, donutY);

          // Score + coherence label to the right of donut
          const textX = sx + donutR * 2 + 14;
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.font = `300 20px ${FONT}`;
          ctx.fillStyle = "#4a3f35";
          const scoreY = donutY - 14;
          ctx.fillText(goalScore.total, textX, scoreY);

          ctx.font = `400 11px ${FONT}`;
          ctx.fillStyle = "rgba(74,63,53,0.25)";
          ctx.fillText(`${goalScore.coherence}% coherence`, textX, scoreY + 24);

          // Grade breakdown — only when mixed
          const statCols = [
            { count: goalScore.optimalCount, color: GRADE_COLORS.optimal, label: "optimal" },
            { count: goalScore.goodCount, color: GRADE_COLORS.good, label: "good" },
            { count: goalScore.weakCount, color: GRADE_COLORS.weak, label: "weak" },
            { count: goalScore.poorCount, color: GRADE_COLORS.poor, label: "poor" },
          ].filter(d => d.count > 0);

          if (statCols.length > 1) {
            const statsY = scoreY + 42;
            let colX = textX;
            statCols.forEach(d => {
              ctx.font = `500 11px ${FONT}`;
              ctx.fillStyle = d.color;
              ctx.textBaseline = "top";
              ctx.textAlign = "left";
              ctx.fillText(d.count, colX, statsY);
              const countW = ctx.measureText(d.count.toString()).width;
              ctx.font = `400 11px ${FONT}`;
              ctx.fillStyle = "rgba(74,63,53,0.5)";
              ctx.fillText(d.label, colX + countW + 3, statsY);
              colX += countW + 3 + ctx.measureText(d.label).width + 16;
            });
          }

        } else {
          const sx = pad, sy = H - pad;
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
          ctx.font = `300 28px ${FONT}`;
          ctx.fillStyle = "#4a3f35";
          const sc = calcStrategyScore(placed);
          ctx.fillText(sc.total, sx, sy);
          const numW = ctx.measureText(sc.total.toString()).width;
          ctx.font = `400 9px ${FONT}`;
          ctx.fillStyle = "rgba(74,63,53,0.25)";
          ctx.textBaseline = "top";
          ctx.fillText("score", sx, sy + 4);
        }
      }

      if (actionLog.length > 0) {
        const logX = W - pad, logY = H - pad;
        ctx.textAlign = "right";
        ctx.textBaseline = "alphabetic";
        const recent = actionLog.slice(-3).reverse();
        recent.forEach((entry, i) => {
          const entryAge = (now - entry.time) / 1000;
          const displayFade = entryAge > 6 ? Math.max(0, 1 - (entryAge - 6) / 2) : 1;
          const fade = Math.max(0, 1 - (i * 0.3));
          ctx.font = `400 11px ${FONT}`;
          ctx.fillStyle = `rgba(${entry.grade === "optimal" ? "26,138,62" : entry.grade === "good" ? "58,122,181" : entry.grade === "weak" ? "176,138,48" : entry.grade === "poor" ? "204,68,68" : "0,0,0"},${fade * displayFade * 0.5})`;
          ctx.fillText(entry.text, logX, logY - i * 16);
        });
      }

      if (dragging && isDragOverCanvas) {
        const canvasRect = canvasContainerRef.current?.getBoundingClientRect();
        if (canvasRect) {
          const cx = dragPos.x - canvasRect.left;
          const cy = dragPos.y - canvasRect.top;
          const stepDef = STEPS.find(s => s.key === dragging.step);
          drawPill(ctx, cx, cy, dragging.label, {
            fontSize: 16, fontWeight: "400",
            color: stepDef ? stepDef.color : "#4a3f35",
            bg: stepDef ? stepDef.bg : "#f2f2f2",
            strokeColor: "#4a3f35",
            paddingX: 20, paddingY: 10, alpha: 0.5,
          });
        }
      }

      if (placed.length > 0) {
        animFrameRef.current = requestAnimationFrame(() => setDragTick(t => t + 1));
      }

      } // end if (hasNodes || dragging)
    }
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [canvasSize, placed, hoveredNode, hoveredXNode, dragging, dragPos, isDragOverCanvas, summary, selectedNode, canvasDrag, dragTick, activeGoals, actionLog, budgetPhase, bmActiveChannels, bmSliders, bmBudget, bmHovIdx, bmStats, isOverBudget, estimatedMinSpend, selectedBudgetValue, budgetUsedPct, channelAllocations]);

  useEffect(() => {
    if (!dragging) return;
    const DRAG_THRESHOLD = 5;
    const onMove = (e) => {
      if (chipClickRef.current && !chipClickRef.current.moved) {
        const dx = e.clientX - chipClickRef.current.x;
        const dy = e.clientY - chipClickRef.current.y;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD) chipClickRef.current.moved = true;
      }
      setDragPos({ x: e.clientX, y: e.clientY });
      const cr = canvasContainerRef.current?.getBoundingClientRect();
      if (cr) {
        const inside = e.clientX >= cr.left && e.clientX <= cr.right && e.clientY >= cr.top && e.clientY <= cr.bottom;
        setIsDragOverCanvas(inside);
      }
    };
    const onUp = (e) => {
      const wasClick = chipClickRef.current && !chipClickRef.current.moved;
      const placeNode = () => {
        const already = placed.find((n) => n.id === dragging.id);
        if (already) return;
        if (!wasClick) {
          const cr = canvasContainerRef.current?.getBoundingClientRect();
          if (cr) {
            posOverrides.current = { ...posOverrides.current, [dragging.id]: { x: e.clientX - cr.left, y: e.clientY - cr.top } };
          }
        }
        const newNode = { id: dragging.id, label: dragging.label, step: dragging.step, shape: dragging.shape, tip: dragging.tip, born: Date.now() };
        setPlaced((prev) => {
          // For budget step, replace any existing budget node
          if (dragging.step === "budget") {
            return [...prev.filter(n => n.step !== "budget"), newNode];
          }
          return [...prev, newNode];
        });
        if (dragging.step === "budget") {
          const budgetItem = STEPS[0].items.find(i => i.id === dragging.id);
          if (budgetItem) setBmBudget(budgetItem.value);
          setActionLog(prev => [...prev, { text: `Budget: ${dragging.label}`, grade: "optimal", time: Date.now() }]);
        } else if (dragging.step === "goal") {
          setActiveGoals(prev => prev.includes(dragging.id) ? prev : [...prev, dragging.id]);
          setActionLog(prev => [...prev, { text: `Goal set: ${dragging.label}`, grade: "optimal", time: Date.now() }]);
        } else if (activeGoals.length > 0) {
          const grade = gradeNodeMulti(activeGoals, dragging.id);
          const fb = getNodeFeedback(grade, dragging.id);
          setActionLog(prev => [...prev, { text: `${dragging.label}: ${fb}`, grade, time: Date.now() }]);
        }
      };
      if (wasClick || (isDragOverCanvas && dragging)) placeNode();
      chipClickRef.current = null;
      setDragging(null);
      setIsDragOverCanvas(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, isDragOverCanvas, placed]);

  const handleCanvasMove = useCallback(
    (e) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;

      // Budget phase hover
      if (budgetPhase && bmActiveChannels.length > 0) {
        const W = canvasSize.w;
        const bPad = 48;
        const chartL = bPad, chartR = W - bPad;
        const chartW = chartR - chartL;
        const chCount = bmActiveChannels.length;
        if (chCount === 0) { setBmHovIdx(-1); return; }
        const groupGap = Math.max(16, chartW * 0.05);
        const edgePad = Math.max(12, chartW * 0.02);
        const usableW = chartW - edgePad * 2;
        const groupW = (usableW - Math.max(0, chCount - 1) * groupGap) / chCount;
        let found = -1;
        for (let i = 0; i < chCount; i++) {
          const gx = chartL + edgePad + i * (groupW + groupGap);
          if (mx >= gx && mx <= gx + groupW) { found = i; break; }
        }
        setBmHovIdx(found);
        return;
      }

      if (canvasDrag) return;

      if (dragging || summary) return;
      const { positions } = computeLayout(placed, canvasSize.w, canvasSize.h, false, posOverrides.current);
      let found = null;
      let foundX = null;
      for (const n of placed) {
        const p = positions[n.id];
        if (!p) continue;
        // Check X badge
        const tmpC = document.createElement("canvas").getContext("2d");
        tmpC.font = `400 16px ${FONT}`;
        const tw = tmpC.measureText(n.label).width;
        const pw = tw + 40, ph = 36;
        const xBx = p.x + pw / 2 + 2, xBy = p.y - ph / 2 - 2;
        if (Math.hypot(mx - xBx, my - xBy) < 10) {
          foundX = n.id; found = n.id; break;
        }
        if (Math.abs(mx - p.x) < 78 && Math.abs(my - p.y) < 24) {
          found = n.id;
        }
      }
      setHoveredNode(found);
      if (found) {
        const { positions: ps } = computeLayout(placed, canvasSize.w, canvasSize.h, false, posOverrides.current);
        if (ps[found]) hoveredNodePos.current = { x: ps[found].x, y: ps[found].y };
      }
      setHoveredXNode(foundX);
    },
    [placed, canvasSize, dragging, summary, canvasDrag, budgetPhase, bmActiveChannels]
  );

  const handleCanvasDown = useCallback(
    (e) => {
      if (dragging || summary) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const { positions } = computeLayout(placed, canvasSize.w, canvasSize.h, false, posOverrides.current);
      // Check X badge click first
      for (const n of placed) {
        const p = positions[n.id];
        if (!p) continue;
        const tmpC = document.createElement("canvas").getContext("2d");
        tmpC.font = `400 16px ${FONT}`;
        const tw = tmpC.measureText(n.label).width;
        const pw = tw + 40, ph = 36;
        const xBx = p.x + pw / 2 + 2, xBy = p.y - ph / 2 - 2;
        if (Math.hypot(mx - xBx, my - xBy) < 10) {
          setPlaced(prev => prev.filter(nd => nd.id !== n.id));
          delete posOverrides.current[n.id];
          if (selectedNode === n.id) setSelectedNode(null);
          if (n.step === "goal") { setActiveGoals(prev => prev.filter(g => g !== n.id)); setActionLog([]); }
          setActionLog(prev => [...prev, { text: `Removed: ${n.label}`, grade: "weak", time: Date.now() }]);
          e.preventDefault();
          return;
        }
      }
      // Normal pill drag
      for (const n of placed) {
        const p = positions[n.id];
        if (p && Math.abs(mx - p.x) < 78 && Math.abs(my - p.y) < 24) {
          setCanvasDrag({ id: n.id, offsetX: mx - p.x, offsetY: my - p.y, startX: mx, startY: my });
          setCanvasDragPos({ x: e.clientX, y: e.clientY });
          e.preventDefault();
          return;
        }
      }
    },
    [placed, canvasSize, dragging, summary, selectedNode, activeGoals]
  );

  useEffect(() => {
    if (!canvasDrag) { setIsOverTrash(false); return; }
    const onMove = (e) => {
      setCanvasDragPos({ x: e.clientX, y: e.clientY });

      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        posOverrides.current = {
          ...posOverrides.current,
          [canvasDrag.id]: { x: mx - canvasDrag.offsetX, y: my - canvasDrag.offsetY },
        };
        setDragTick(t => t + 1);
      }
      const tr = trashRef.current?.getBoundingClientRect();
      if (tr) {
        const cx = tr.left + tr.width / 2, cy = tr.top + tr.height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        setIsOverTrash(dist < 40);
      }
    };
    const onUp = (e) => {
      const tr = trashRef.current?.getBoundingClientRect();
      if (tr) {
        const cx = tr.left + tr.width / 2, cy = tr.top + tr.height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        if (dist < 40) {
          const id = canvasDrag.id;
          const node = placed.find(n => n.id === id);
          setPlaced(prev => prev.filter(n => n.id !== id));
          delete posOverrides.current[id];
          if (selectedNode === id) setSelectedNode(null);
          if (node?.step === "goal") { setActiveGoals(prev => prev.filter(g => g !== node.id)); setActionLog([]); }
          if (node) setActionLog(prev => [...prev, { text: `Removed: ${node.label}`, grade: "weak", time: Date.now() }]);
          setCanvasDrag(null);
          setIsOverTrash(false);
          return;
        }
      }
      const rect = canvasRef.current?.getBoundingClientRect();
      const mx = rect ? e.clientX - rect.left : 0;
      const my = rect ? e.clientY - rect.top : 0;
      const dist = Math.hypot(mx - canvasDrag.startX, my - canvasDrag.startY);
      if (dist < 5) {
        delete posOverrides.current[canvasDrag.id];
        const next = canvasDrag.id === selectedNode ? null : canvasDrag.id;
        if (next && satellitesRef.current[next]) {
          const now = Date.now();
          satellitesRef.current[next].forEach((s) => { s.born = now; });
        }
        setSelectedNode(next);
      }
      setCanvasDrag(null);
      setIsOverTrash(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [canvasDrag, placed, selectedNode, activeGoals]);

  const handleCanvasClick = useCallback(
    (e) => {
      if (canvasDrag) return;
      if (dragging || summary) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const { positions } = computeLayout(placed, canvasSize.w, canvasSize.h, false, posOverrides.current);
      let onNode = false;
      for (const n of placed) {
        const p = positions[n.id];
        if (p && Math.abs(mx - p.x) < 78 && Math.abs(my - p.y) < 24) {
          onNode = true;
          break;
        }
      }
      if (!onNode) setSelectedNode(null);
    },
    [placed, canvasSize, dragging, summary, canvasDrag]
  );

  const handleCanvasDblClick = useCallback(
    (e) => {
      if (summary) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const { positions } = computeLayout(placed, canvasSize.w, canvasSize.h, false, posOverrides.current);
      for (const n of placed) {
        const p = positions[n.id];
        if (p && Math.abs(mx - p.x) < 78 && Math.abs(my - p.y) < 24) {
          setPlaced(prev => prev.filter(nd => nd.id !== n.id));
          delete posOverrides.current[n.id];
          if (selectedNode === n.id) setSelectedNode(null);
          if (n.step === "goal") { setActiveGoals(prev => prev.filter(g => g !== n.id)); setActionLog([]); }
          setActionLog(prev => [...prev, { text: `Removed: ${n.label}`, grade: "weak", time: Date.now() }]);
          break;
        }
      }
    },
    [placed, canvasSize, summary, selectedNode, activeGoals]
  );

  const advanceStep = useCallback(() => {
    if (currentStep < STEPS.length) setCurrentStep((s) => s + 1);
  }, [currentStep]);

  const goBack = () => {
    if (currentStep > 0) {
      const keyToRemove = STEPS[currentStep - 1].key;
      setPlaced((prev) => prev.filter((n) => n.step !== keyToRemove));
      setCurrentStep((s) => s - 1);
      setSummary(null);
      setSelectedNode(null);
      if (keyToRemove === "goal") { setActiveGoals([]); setActionLog([]); }
      const removedIds = new Set(STEPS.find(s => s.key === keyToRemove)?.items.map(i => i.id) || []);
      const clean = { ...posOverrides.current };
      removedIds.forEach(id => delete clean[id]);
      posOverrides.current = clean;
    }
  };

  const reset = () => {
    setCurrentStep(0);
    setPlaced([]);
    setSummary(null);
    setSummaryLoading(false);
    setSelectedNode(null);
    setActiveGoals([]);
    setActionLog([]);
    setBudgetPhase(false);
    setBmEnabled([]);
    setBmSliders({ search: 0, audience: 0, shopping: 0, video: 0, linkedin: 0 });
    setBmBudget(5000);
    bmAnimBars.current = {};
    bmAnimStats.current = { reach: 0, impressions: 0, conversions: 0 };
    bmTitleTrans.current = 0;
    posOverrides.current = {};
  };

  const autoGenerate = () => {
    const goalIds = placed.filter(n => n.step === "goal").map(n => n.id);
    if (goalIds.length === 0) return;
    const budgetNode = placed.find(n => n.step === "budget");
    const nodes = generateOptimalStrategy(goalIds);
    // Preserve budget node if it exists
    if (budgetNode) nodes.unshift(budgetNode);
    setActiveGoals(goalIds);
    setPlaced(nodes);
    setCurrentStep(STEPS.length);
    posOverrides.current = {};
    const labels = goalIds.map(gid => GOAL_OPTIMAL[gid]?.label).filter(Boolean).join(" + ");
    setActionLog([{ text: `Auto-generated: ${labels}`, grade: "optimal", time: Date.now() }]);
  };

  const currentStepHasNodes = step ? placed.some((n) => n.step === step.key) : false;

  const generate = async () => {
    setSummaryLoading(true);
    setSummary(null);

    // Map strategy to budget allocation
    const mapping = mapStrategyToBudget(placed);
    setBmEnabled(mapping.enabled);
    setBmSliders(mapping.sliders);
    // Use budget from step 1 (budget node), fallback to mapping
    const budgetNode = placed.find(n => n.step === "budget");
    const budgetFromStep = budgetNode ? (STEPS[0].items.find(i => i.id === budgetNode.id)?.value || 5000) : null;
    setBmBudget(budgetFromStep || mapping.budget);
    bmAnimBars.current = {};
    bmAnimStats.current = { reach: 0, impressions: 0, conversions: 0 };
    bmTitleTrans.current = 0;

    const parts = STEPS.map((s) => {
      const items = placed.filter((n) => n.step === s.key);
      return items.length ? `${s.label}: ${items.map((i) => `${i.label}`).join(", ")}` : null;
    })
      .filter(Boolean)
      .join("\n");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are a senior Microsoft Advertising strategist. The user configured a campaign across Budget → Goal → Network → Audience → Optimize For.

Respond with ONLY a JSON object (no markdown, no backticks):

{
  "name": "2-4 word strategy name (e.g. 'LinkedIn Precision Engine', 'Full-Funnel Commerce')",
  "line": "One sentence, max 18 words. What this strategy does and why it works. Like a tagline.",
  "stat": "The single most impressive benchmark (e.g. '64%', '40–60%', '$1.20', '3.17%')",
  "statLabel": "What the stat measures, max 5 words (e.g. 'CVR lift with audiences', 'lower CPC on Bing')",
  "action": "First thing to do, max 10 words (e.g. 'Install UET tag and build remarketing lists')"
}

Use real Microsoft Ads benchmarks: avg CPC $1.54, search CTR 3.17%, LinkedIn CTR lift 16%, audience CVR lift 64%, 70% audience 35-65, 33% income $100K+, 900M+ monthly searches. Pick the stat that best represents THIS combination's key advantage. Do NOT mention Google or any competitor.`,
          messages: [{ role: "user", content: `Campaign:\n${parts}` }],
        }),
      });
      const json = await res.json();
      const raw = (json.content || [])
        .map((b) => b.text || "")
        .join("")
        .trim()
        .replace(/```json|```/g, "")
        .trim();
      try {
        const parsed = JSON.parse(raw);
        setSummary(parsed);
      } catch {
        setSummary({ name: "Strategy", line: raw.slice(0, 120), stat: "", statLabel: "", action: "" });
      }
    } catch {
      setSummary(null);
    }
    setSummaryLoading(false);
    setBudgetPhase(true);
  };

  return (
    <div className="ms-builder">
      {/* ── Editorial headline ── */}
      <div className="ms-builder-header">
        <span className="ms-builder-overline">02 — Strategy Builder</span>
        <p className="ms-builder-headline-text">
          {budgetPhase
            ? <>Allocate your budget.<br/>See projected performance.</>
            : <>Build your own strategy.<br/>See how Microsoft's tools work together.</>
          }
        </p>
      </div>

      {/* ── Shelf: chips, complete state, or budget controls ── */}
      <div className="ms-builder-shelf">
        {budgetPhase ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", padding: "0" }}>
            {/* Budget label row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 12, color: "#4a3f35", fontFamily: FONT, fontWeight: 500 }}>Budget allocation</span>
              {editingBudget ? (
                <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#4a3f35", fontFamily: FONT }}>$</span>
                  <input
                    autoFocus
                    type="text"
                    inputMode="numeric"
                    value={editBudgetVal}
                    onChange={e => setEditBudgetVal(e.target.value.replace(/[^0-9]/g, ""))}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        const num = parseInt(editBudgetVal, 10) * 1000;
                        if (num >= 1000) { setBmBudget(num); setCustomBudget(num); }
                        setEditingBudget(false);
                      }
                      if (e.key === "Escape") setEditingBudget(false);
                    }}
                    onBlur={() => {
                      const num = parseInt(editBudgetVal, 10) * 1000;
                      if (num >= 1000) { setBmBudget(num); setCustomBudget(num); }
                      setEditingBudget(false);
                    }}
                    style={{
                      border: "none", borderBottom: "1.5px solid #4a3f35", background: "transparent",
                      fontSize: 14, fontWeight: 500, color: "#4a3f35", fontFamily: FONT,
                      fontVariantNumeric: "tabular-nums", width: 48, padding: 0, outline: "none",
                      textAlign: "right",
                    }}
                  />
                  <span style={{ fontWeight: 400, fontSize: 12, color: "#7a7068", fontFamily: FONT }}>K/mo</span>
                </div>
              ) : (
                <span
                  onClick={() => { setEditBudgetVal(((selectedBudgetValue || bmBudget) / 1000).toFixed(0)); setEditingBudget(true); }}
                  style={{
                    fontSize: 14, fontWeight: 500, color: "#4a3f35", fontFamily: FONT, fontVariantNumeric: "tabular-nums",
                    cursor: "text", borderBottom: "1px dashed rgba(74,63,53,0.2)", paddingBottom: 1,
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={e => e.target.style.borderBottomColor = "rgba(74,63,53,0.5)"}
                  onMouseLeave={e => e.target.style.borderBottomColor = "rgba(74,63,53,0.2)"}
                  title="Click to edit budget"
                >
                  ${((selectedBudgetValue || bmBudget) / 1000).toFixed(0)}K<span style={{ fontWeight: 400, fontSize: 12, color: "#7a7068" }}>/mo</span>
                </span>
              )}
            </div>
            {/* ── Interactive stacked allocation bar ── */}
            <BudgetAllocationBar
              channels={BM_CHANNELS.filter(ch => bmEnabled.includes(ch.id))}
              sliders={bmSliders}
              onSlidersChange={(newSliders) => {
                Object.keys(newSliders).forEach(id => bmUpdateSlider(id, newSliders[id]));
              }}
              budget={selectedBudgetValue || bmBudget}
            />
            {/* Channel legends */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {BM_CHANNELS.filter(ch => bmEnabled.includes(ch.id)).map(ch => {
                const budget = selectedBudgetValue || bmBudget;
                const totalWeight = bmEnabled.reduce((s, id) => s + (bmSliders[id] || 0), 0) || 1;
                const share = (bmSliders[ch.id] || 0) / totalWeight;
                const dollars = Math.round(budget * share);
                const pct = Math.round(share * 100);
                return (
                  <span key={ch.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontFamily: FONT, lineHeight: 1, whiteSpace: "nowrap" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 4, background: ch.bg, border: `1.5px solid ${ch.color}`, flexShrink: 0 }} />
                    <span style={{ color: "#7a7068" }}>{ch.label}</span>
                    <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 500, color: "#4a3f35" }}>${(dollars/1000).toFixed(1)}K</span>
                    <span style={{ fontVariantNumeric: "tabular-nums", color: "#9a9088", fontSize: 12 }}>({pct}%)</span>
                  </span>
                );
              })}
            </div>
          </div>
        ) : !done ? (
          <>
            <div className="ms-builder-shelf-header">
              <span className="ms-builder-shelf-step">{currentStep + 1} / {STEPS.length}</span>
              <span className="ms-builder-shelf-desc">{step.desc}</span>
              <span className="ms-builder-shelf-hint">Click or drag to canvas</span>
            </div>
            <div className="ms-builder-chips" style={{ "--step-bg": step.bg, "--step-color": step.color }}>
              {step.items.map((item) => {
                const isPlaced = placedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    ref={item.id === "g1" ? demoChipRef : undefined}
                    className={`ms-builder-chip ${isPlaced ? "placed" : ""}`}
                    onMouseDown={(e) => {
                      if (isPlaced) return;
                      e.preventDefault();
                      if (!demoRef.current.killed) {
                        demoRef.current.killed = true;
                        demoRef.current.active = false;
                        if (demoRafRef.current) cancelAnimationFrame(demoRafRef.current);
                        setDemoTick(t => t + 1);
                      }
                      chipClickRef.current = { x: e.clientX, y: e.clientY, moved: false };
                      setDragging({ ...item, step: step.key, shape: step.shape });
                      setDragPos({ x: e.clientX, y: e.clientY });
                    }}
                    title={item.tip}
                  >
                    {item.label}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="ms-builder-complete">
            <span className="ms-builder-complete-label">Complete</span>
            <span className="ms-builder-complete-count">
              {placed.length} nodes placed across{" "}
              {STEPS.filter((s) => placed.some((n) => n.step === s.key)).length} layers
              {activeGoals.length > 0 && ` · ${activeGoals.map(g => GOAL_OPTIMAL[g]?.label).filter(Boolean).join(" + ")}`}
            </span>
          </div>
        )}
      </div>

      {/* ── Controls bar: dots + actions ── */}
      <div className="ms-builder-controls">
        <div className="ms-builder-controls-left">
          {!budgetPhase && (
          <div className="ms-builder-step-indicator">
            {STEPS.map((s, i) => (
              <div
                key={s.key}
                className="ms-builder-step-dot"
                style={{
                  width: i === currentStep ? 20 : 6,
                  background:
                    i < currentStep
                      ? s.bg
                      : i === currentStep
                      ? s.bg
                      : "rgba(74,63,53,0.1)",
                }}
              />
            ))}
          </div>
          )}
          <div className="ms-builder-actions">
            {!budgetPhase && placed.length > 0 && (
              <button className="ms-builder-btn" onClick={() => { posOverrides.current = {}; setDragTick(t => t + 1); }}>
                Tidy
              </button>
            )}
            {!budgetPhase && currentStep > 0 && (
              <button className="ms-builder-btn" onClick={goBack}>
                ← Back
              </button>
            )}
            {!budgetPhase && !done && currentStepHasNodes && (
              <button className="ms-builder-btn-primary" onClick={advanceStep}>
                {currentStep < STEPS.length - 1 ? "Next →" : "Finish →"}
              </button>
            )}
            {!budgetPhase && !done && activeGoals.length > 0 && currentStep >= 1 && (
              <button className="ms-builder-btn" onClick={() => autoGenerate()}>
                Auto strategy
              </button>
            )}
            {!budgetPhase && done && (
              <>
                <button
                  className="ms-builder-btn-primary"
                  onClick={generate}
                  disabled={summaryLoading}
                >
                  {summaryLoading ? "Analyzing…" : summary ? "↻ Regenerate" : "▶ Generate strategy"}
                </button>
                <button className="ms-builder-btn" onClick={reset}>
                  Reset
                </button>
              </>
            )}
            {budgetPhase && (
              <>
                <button className="ms-builder-btn" onClick={() => { setBudgetPhase(false); setSummary(null); }}>
                  ← Strategy
                </button>
                <button
                  className="ms-builder-btn-primary"
                  onClick={generate}
                  disabled={summaryLoading}
                >
                  {summaryLoading ? "Analyzing…" : "↻ Regenerate"}
                </button>
                <button className="ms-builder-btn" onClick={reset}>
                  Reset
                </button>
                <div style={{ position: "relative", marginLeft: "auto" }}>
                  <button
                    className={bmInfoOpen ? "ms-builder-btn-primary" : "ms-builder-btn-outline"}
                    onClick={() => { setBmInfoOpen(o => !o); setBmInfoPage(0); }}
                  >
                    {bmInfoOpen ? "✕ Close" : "ⓘ Details"}
                  </button>
                  {bmInfoOpen && (() => {
                    const activeChans = BM_CHANNELS.filter(ch => bmEnabled.includes(ch.id));
                    const totalWeight = bmEnabled.reduce((s, id) => s + (bmSliders[id] || 0), 0) || 1;
                    const CHANNEL_INSIGHTS = {
                      search: { title: "Search Ads", desc: "Capture high-intent users actively searching for your products. Microsoft Search reaches 14.6B monthly searches across Bing, Yahoo, and AOL.", advantage: "Lower CPC than Google Ads with comparable conversion rates." },
                      audience: { title: "Audience Network", desc: "Native ads across MSN, Outlook, and Microsoft Edge. Reach users in lean-back browsing moments with contextual relevance.", advantage: "Premium inventory at scale with brand-safe environments." },
                      shopping: { title: "Shopping Campaigns", desc: "Product listing ads with images, prices, and reviews. Appear at the top of search results for commercial queries.", advantage: "Higher ROAS with visual product discovery and lower competition." },
                      video: { title: "Video & CTV", desc: "Connected TV and online video across premium publishers. Full-screen, sound-on experiences that drive brand recall.", advantage: "Reach cord-cutters on streaming platforms with precise targeting." },
                      linkedin: { title: "LinkedIn Integration", desc: "Layer LinkedIn profile targeting onto Microsoft Ads. Target by job title, company, industry, and seniority.", advantage: "Exclusive B2B targeting unavailable on any other ad platform." },
                    };
                    const totalPages = 1 + activeChans.length;
                    const page = Math.min(bmInfoPage, totalPages - 1);

                    return (
                    <div className="bm-info-popover" style={{ width: 280 }}>
                      {page === 0 ? (
                        <>
                          {/* ── Page 0: Overview ── */}
                          <div style={{ fontSize: 12, color: "#4a3f35", fontFamily: FONT, fontWeight: 500, marginBottom: 20 }}>Projected performance</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                            {[
                              { val: bmFormatNum(bmAnimStats.current.reach), label: "Reach" },
                              { val: bmFormatNum(bmAnimStats.current.impressions), label: "Impressions" },
                              { val: `${Math.round(bmAnimStats.current.conversions)}K`, label: "Conversions" },
                            ].map((m, i) => (
                              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                <span style={{ fontSize: 12, color: "#9a9088", fontFamily: FONT }}>{m.label}</span>
                                <span style={{ fontSize: 18, fontWeight: 300, color: "#4a3f35", letterSpacing: "-0.5px", fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>{m.val}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{ height: 1, background: "rgba(74,63,53,0.08)", margin: "0 -24px", marginBottom: 16 }} />
                          {activeChans.map((ch, idx, arr) => {
                            const share = (bmSliders[ch.id] || 0) / totalWeight;
                            const dollars = Math.round((selectedBudgetValue || bmBudget) * share);
                            const pct = Math.round(share * 100);
                            return (
                              <div key={ch.id} style={{
                                display: "flex", alignItems: "center", gap: 8, padding: "8px 0",
                                borderBottom: idx < arr.length - 1 ? "1px solid rgba(74,63,53,0.06)" : "none",
                              }}>
                                <span style={{ width: 6, height: 6, borderRadius: 3, background: ch.bg, border: `1px solid ${ch.color}`, flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: 12, fontWeight: 400, color: "#4a3f35", fontFamily: FONT }}>{ch.label}</span>
                                <span style={{ fontSize: 12, fontWeight: 500, color: "#4a3f35", fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>${(dollars/1000).toFixed(1)}K</span>
                                <span style={{ fontSize: 12, color: "#9a9088", fontFamily: FONT, fontVariantNumeric: "tabular-nums", width: 28, textAlign: "right" }}>{pct}%</span>
                              </div>
                            );
                          })}
                        </>
                      ) : (
                        (() => {
                          const ch = activeChans[page - 1];
                          const insight = CHANNEL_INSIGHTS[ch?.id] || {};
                          const share = ch ? (bmSliders[ch.id] || 0) / totalWeight : 0;
                          const dollars = ch ? Math.round((selectedBudgetValue || bmBudget) * share) : 0;
                          const pct = Math.round(share * 100);
                          const bm = dollars / 5000;
                          const chReach = ch ? ch.base.reach * bm * (ch.scale?.reach || 1) : 0;
                          const chConv = ch ? ch.base.conversions * bm * (ch.scale?.conversions || 1) : 0;
                          const costs = ch ? CHANNEL_COSTS[ch.id] : null;
                          return (
                            <>
                              {/* Channel name + dot */}
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                <span style={{ width: 6, height: 6, borderRadius: 3, background: ch?.bg, border: `1px solid ${ch?.color}`, flexShrink: 0 }} />
                                <span style={{ fontSize: 12, color: "#9a9088", fontFamily: FONT }}>{ch?.label}</span>
                              </div>

                              {/* Hero stat — the allocation */}
                              <div style={{ fontSize: 32, fontWeight: 300, color: "#4a3f35", fontFamily: FONT, letterSpacing: "-1px", lineHeight: 1, marginBottom: 4, fontVariantNumeric: "tabular-nums" }}>
                                ${(dollars/1000).toFixed(1)}K
                              </div>
                              <div style={{ fontSize: 12, color: "#9a9088", fontFamily: FONT, marginBottom: 20 }}>{pct}% of budget</div>

                              {/* Editorial description */}
                              <div style={{ fontSize: 12, color: "#5a5048", fontFamily: FONT, lineHeight: 1.6, marginBottom: 20 }}>
                                {insight.desc}{insight.advantage ? ` ${insight.advantage}` : ""}
                              </div>

                              {/* Divider */}
                              <div style={{ height: 1, background: "rgba(74,63,53,0.08)", margin: "0 -24px", marginBottom: 16 }} />

                              {/* Key metrics — just 3, clean */}
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                {[
                                  { val: bmFormatNum(chReach), label: "Reach" },
                                  { val: `${Math.round(chConv)}K`, label: "Conv." },
                                  { val: costs ? costs.label.replace("Avg ", "") : "—", label: "Avg. cost" },
                                ].map((m, i) => (
                                  <div key={i} style={{ textAlign: i === 0 ? "left" : i === 2 ? "right" : "center" }}>
                                    <div style={{ fontSize: 14, fontWeight: 400, color: "#4a3f35", fontFamily: FONT, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{m.val}</div>
                                    <div style={{ fontSize: 12, color: "#9a9088", fontFamily: FONT, marginTop: 3 }}>{m.label}</div>
                                  </div>
                                ))}
                              </div>
                            </>
                          );
                        })()
                      )}

                      {/* ── Navigation footer ── */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, paddingTop: 12, borderTop: "1px solid rgba(74,63,53,0.06)" }}>
                        <button
                          onClick={() => setBmInfoPage(p => Math.max(0, p - 1))}
                          disabled={page === 0}
                          style={{
                            border: "none", background: "none", cursor: page === 0 ? "default" : "pointer",
                            opacity: page === 0 ? 0.2 : 0.6, padding: 4, fontFamily: FONT, fontSize: 14, color: "#4a3f35",
                            transition: "opacity 0.15s",
                          }}
                          onMouseEnter={e => { if (page > 0) e.target.style.opacity = 1; }}
                          onMouseLeave={e => { if (page > 0) e.target.style.opacity = 0.6; }}
                        >←</button>
                        <span style={{ fontSize: 12, color: "#9a9088", fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>
                          {page === 0 ? "Overview" : activeChans[page - 1]?.label} · {page + 1}/{totalPages}
                        </span>
                        <button
                          onClick={() => setBmInfoPage(p => Math.min(totalPages - 1, p + 1))}
                          disabled={page >= totalPages - 1}
                          style={{
                            border: "none", background: "none", cursor: page >= totalPages - 1 ? "default" : "pointer",
                            opacity: page >= totalPages - 1 ? 0.2 : 0.6, padding: 4, fontFamily: FONT, fontSize: 14, color: "#4a3f35",
                            transition: "opacity 0.15s",
                          }}
                          onMouseEnter={e => { if (page < totalPages - 1) e.target.style.opacity = 1; }}
                          onMouseLeave={e => { if (page < totalPages - 1) e.target.style.opacity = 0.6; }}
                        >→</button>
                      </div>
                    </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Canvas — full bleed ── */}
      <div
        ref={canvasContainerRef}
        className={`ms-builder-canvas-wrap ${isDragOverCanvas ? "drag-over" : ""}`}
      >
        <canvas
          ref={canvasRef}
          style={{ width: canvasSize.w, height: canvasSize.h, display: "block", cursor: budgetPhase ? (bmHovIdx >= 0 ? "crosshair" : "default") : canvasDrag ? "grabbing" : hoveredXNode ? "default" : hoveredNode ? "grab" : "default" }}
          onMouseMove={handleCanvasMove}
          onMouseDown={handleCanvasDown}
          onClick={handleCanvasClick}
          onDoubleClick={handleCanvasDblClick}
          onMouseLeave={() => { if (budgetPhase) { setBmHovIdx(-1); } else if (!canvasDrag) { setHoveredNode(null); setHoveredXNode(null); } }}
        />
        {hoveredNode && !budgetPhase && !summary && (() => {
          const node = placed.find(n => n.id === hoveredNode);
          const info = NODE_INSIGHTS[hoveredNode];
          const stepDef = node ? STEPS.find(s => s.key === node.step) : null;
          const stepItem = stepDef ? stepDef.items.find(it => it.id === hoveredNode) : null;
          const hovGrade = activeGoals.length > 0 ? gradeNodeMulti(activeGoals, hoveredNode) : null;
          const pos = hoveredNodePos.current;
          if (!info || !stepDef) return null;
          return (
            <div
              className="node-popover"
              style={{
                left: pos.x,
                top: pos.y + 28,
                "--pop-bg": stepDef.bg,
                "--pop-color": stepDef.color,
              }}
            >
              {hovGrade && hovGrade !== "neutral" && (
                <div className="node-popover-grade">
                  {hovGrade.charAt(0).toUpperCase() + hovGrade.slice(1)}
                  {info.exclusive && <span className="node-popover-excl">  ·  Exclusive</span>}
                </div>
              )}
              {(!hovGrade || hovGrade === "neutral") && info.exclusive && (
                <div className="node-popover-grade">Exclusive</div>
              )}
              <div className="node-popover-insight">{info.insight}</div>
            </div>
          );
        })()}
      </div>

      {dragging && (
        <div
          className={`ms-drag-ghost ${isDragOverCanvas ? "over-canvas" : ""}`}
          style={{ left: dragPos.x - 16, top: dragPos.y - 16 }}
        >
          {dragging.label}
        </div>
      )}

      {/* Floating ghost for canvas pill drag — appears when dragged beyond canvas */}
      {canvasDrag && (() => {
        const node = placed.find(n => n.id === canvasDrag.id);
        const stepDef = node ? STEPS.find(s => s.key === node.step) : null;
        const canvasRect = canvasContainerRef.current?.getBoundingClientRect();
        const isBeyondCanvas = canvasRect && canvasDragPos.y > canvasRect.bottom - 20;
        const isDragging = canvasRect && Math.hypot(
          canvasDragPos.x - (canvasRect.left + canvasDrag.startX),
          canvasDragPos.y - (canvasRect.top + canvasDrag.startY)
        ) > 10;
        if (!node || !isDragging) return null;
        return (
          <div
            style={{
              position: "fixed",
              left: canvasDragPos.x,
              top: canvasDragPos.y,
              transform: isOverTrash
                ? "translate(-50%, -50%) scale(0.5)"
                : "translate(-50%, -50%) scale(1)",
              width: isOverTrash ? 28 : "auto",
              height: isOverTrash ? 28 : "auto",
              padding: isOverTrash ? 0 : "6px 14px",
              borderRadius: isOverTrash ? "50%" : 20,
              background: isOverTrash ? "#c44" : (stepDef?.bg || "#f2f2f2"),
              color: isOverTrash ? "#CAC0D9" : (stepDef?.color || "#4a3f35"),
              border: isOverTrash ? "1.5px solid #c44" : "1px solid #111",
              fontSize: isOverTrash ? 0 : 11,
              fontWeight: 600,
              fontFamily: FONT,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 9999,
              transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), width 0.2s, height 0.2s, border-radius 0.2s, padding 0.2s, background 0.15s, font-size 0.15s, color 0.15s, border 0.15s, opacity 0.15s",
              boxShadow: isOverTrash ? "0 0 0 4px rgba(204,68,68,0.15)" : "0 2px 8px rgba(74,63,53,0.12)",
              opacity: isBeyondCanvas || isOverTrash ? 1 : 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {!isOverTrash && node.label}
          </div>
        );
      })()}

      {/* ── Demo ghost pill — continuous smooth loop ── */}
      {(() => {
        const d = demoRef.current;
        if (!d.active || d.killed || !d.measured) return null;

        // Cycle layout: wait 0.5 → fly 1.4 → hold 0.7 → fade 0.5 → pause 0.7
        const WAIT = 0.5;
        const FLY = 1.4;
        const HOLD = 0.7;
        const FADE = 0.5;
        const PAUSE = 0.7;
        const CYCLE = WAIT + FLY + HOLD + FADE + PAUSE; // 3.8s

        const loopT = d.t % CYCLE;

        const easeInOutCubic = (t) => {
          const c = Math.min(1, Math.max(0, t));
          return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
        };

        let x, y, opacity;
        const sx = d.startX, sy = d.startY;
        const ex = d.endX, ey = d.endY;

        if (loopT < WAIT) {
          // Waiting at chip position — fade in
          const p = Math.min(1, loopT / Math.min(WAIT, 0.3));
          x = sx;
          y = sy;
          opacity = p;
        } else if (loopT < WAIT + FLY) {
          // Flying — smooth bezier
          const raw = (loopT - WAIT) / FLY;
          const p = easeInOutCubic(raw);
          const cp1x = sx + (ex - sx) * 0.25, cp1y = sy - 80;
          const cp2x = ex - 40, cp2y = ey - 30;
          const inv = 1 - p;
          x = inv*inv*inv*sx + 3*inv*inv*p*cp1x + 3*inv*p*p*cp2x + p*p*p*ex;
          y = inv*inv*inv*sy + 3*inv*inv*p*cp1y + 3*inv*p*p*cp2y + p*p*p*ey;
          opacity = 1;
        } else if (loopT < WAIT + FLY + HOLD) {
          // Holding at target
          x = ex;
          y = ey;
          opacity = 1;
        } else if (loopT < WAIT + FLY + HOLD + FADE) {
          // Fading out
          const p = (loopT - WAIT - FLY - HOLD) / FADE;
          x = ex;
          y = ey;
          opacity = Math.max(0, 1 - p);
        } else {
          // Pause — invisible
          return null;
        }

        return (
          <div
            style={{
              position: "fixed",
              left: x,
              top: y,
              transform: "translate(-50%, -50%)",
              padding: "10px 18px",
              borderRadius: 40,
              background: STEPS[0].bg,
              color: STEPS[0].color,
              border: "1px solid rgba(74,63,53,0.15)",
              fontSize: 12,
              fontWeight: 500,
              fontFamily: FONT,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 9999,
              opacity: opacity,
              willChange: "transform, opacity",
            }}
          >
            Brand Awareness
          </div>
        );
      })()}
    </div>
  );
}

function PhotoGallery() {
  const [current, setCurrent] = useState(0);
  const [sectionRef, progress] = useSmoothParallax(100, 16, 1.2);
  const videoRef = useRef(null);
  const videoSpring = useRef({ pos: 0, vel: 0 });
  const [videoProgress, setVideoProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Smooth scroll tracker tied to the video element's viewport position
  useEffect(() => {
    let running = true;
    let prevT = null;
    const stiff = 50, damp = 11, m = 1.6;
    const tick = (timestamp) => {
      if (!running) return;
      const dt = prevT ? Math.min((timestamp - prevT) / 1000, 0.064) : 0.016;
      prevT = timestamp;
      const el = videoRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        // raw: 0 when video top enters bottom of viewport, 1 when video top reaches ~40% from top
        const raw = clamp((vh - rect.top) / (vh * 0.7), 0, 1);
        const s = videoSpring.current;
        const disp = s.pos - raw;
        s.vel += ((-stiff * disp - damp * s.vel) / m) * dt;
        s.pos += s.vel * dt;
        setVideoProgress(Math.round(s.pos * 10000) / 10000);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { running = false; };
  }, []);
  const timerRef = useRef(null);

  const videos = [
    { color: "#1a1d23", accent: "#4a9eff", label: "Customer Story", title: "How Contoso tripled ROAS with Performance Max", duration: 185 },
    { color: "#1c2318", accent: "#6abf69", label: "Product Demo", title: "AI-powered campaign creation in under 5 minutes", duration: 142 },
    { color: "#231d1a", accent: "#e87040", label: "Webinar", title: "2026 digital advertising trends & Microsoft insights", duration: 264 },
    { color: "#1a1c23", accent: "#a07de8", label: "Case Study", title: "From local shop to 125 countries with Microsoft Ads", duration: 210 },
  ];

  const vid = videos[current];

  const startPlayback = useCallback(() => {
    setPlaying(true);
    setPaused(false);
    setElapsed(0);
    const vidEl = videoRef.current?.querySelector("video");
    if (vidEl) { vidEl.currentTime = 0; vidEl.play().catch(() => {}); }
  }, []);

  const togglePause = useCallback(() => {
    const vidEl = videoRef.current?.querySelector("video");
    if (!playing) { startPlayback(); return; }
    if (paused) {
      if (vidEl) vidEl.play().catch(() => {});
    } else {
      if (vidEl) vidEl.pause();
    }
    setPaused(p => !p);
  }, [playing, paused, startPlayback]);

  useEffect(() => {
    if (playing && !paused) {
      timerRef.current = setInterval(() => {
        setElapsed(e => {
          if (e >= vid.duration) {
            setPlaying(false); setPaused(false);
            return 0;
          }
          return e + 0.1;
        });
      }, 100);
    }
    return () => clearInterval(timerRef.current);
  }, [playing, paused, vid.duration]);

  const selectVideo = (i) => {
    if (i === current) return;
    setCurrent(i);
    setPlaying(false);
    setPaused(false);
    setElapsed(0);
  };

  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const pct = vid.duration > 0 ? (elapsed / vid.duration) * 100 : 0;
  const state = playing ? (paused ? "paused" : "playing") : "";

  const p = progress;
  const enterRaw = mapRange(p, -0.85, 0.05, 0, 1);
  const enterT = easeOutExpo(enterRaw);

  // Video scale driven by its own viewport position
  const vp = clamp(videoProgress, 0, 1);
  const vpEased = easeOutExpo(vp);
  const videoScale = lerpVal(0.40, 1, vpEased);
  const videoRadius = lerpVal(128, 40, vpEased);
  const videoY = lerpVal(40, 0, easeOutQuart(vp));
  const driftY = mapRange(p, 0, 1, 0, -25);

  return (
    <section className="ms-gallery" ref={sectionRef}>
      <div className="ms-gallery-inner">
        <div className="ms-gallery-stage">
          <div className="ms-gallery-headline" style={{ marginLeft: "auto", maxWidth: "58%" }}>
            <span style={{ display: "block", fontSize: 14, color: "var(--c-text)", marginBottom: 20 }}>01 — Global Reach</span>
            <p style={{ fontSize: "clamp(22px, 2.4vw, 30px)", fontWeight: 400, lineHeight: 1.35, letterSpacing: "-0.015em", color: "var(--c-text)", maxWidth: 720, margin: 0 }}>Across 125 countries, Microsoft Advertising connects businesses with the audiences that matter most — reaching people at the moments they're ready to discover, decide, and act.</p>
          </div>

          {/* Video Player */}
          <div
            ref={videoRef}
            className={`ms-video-container ${state}`}
            style={{
              transform: `scale(${videoScale}) translateY(${videoY + driftY}px)`,
              borderRadius: videoRadius,
              willChange: "transform, border-radius",
            }}
            onClick={togglePause}
          >
            <div className="ms-video-frame">
              {/* Background — video */}
              <div className="ms-video-bg">
                <video
                  muted
                  playsInline
                  loop
                  className="ms-video-bg-img"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  src="/assets/videos/hero-reel.mp4"
                />
              </div>
              <div className="ms-video-gradient" />

              {/* Play Button */}
              <button className="ms-video-play" onClick={(e) => { e.stopPropagation(); startPlayback(); }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#4a3f35">
                  <polygon points="8,5 20,12 8,19" />
                </svg>
              </button>
            </div>

            {/* Title bar when playing */}
            <div className="ms-video-title-bar">
              <span className="ms-video-label"></span>
            </div>

            {/* Bottom controls */}
            <div className="ms-video-controls" onClick={e => e.stopPropagation()}>
              <button className="ms-video-ctrl-btn" onClick={togglePause}>
                {paused ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><polygon points="8,5 20,12 8,19" /></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                )}
              </button>
              <span className="ms-video-time">{fmtTime(elapsed)} / {fmtTime(vid.duration)}</span>
              <div className="ms-video-spacer" />
              <button className="ms-video-ctrl-btn" title="Fullscreen">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              </button>
            </div>

            {/* Progress bar */}
            <div className="ms-video-progress-wrap" onClick={e => e.stopPropagation()}>
              <div
                className="ms-video-progress-track"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  setElapsed(ratio * vid.duration);
                }}
              >
                <div className="ms-video-progress-bar" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

function EcosystemCloser() {
  const [sectionRef, progress] = useSmoothParallax(100, 16, 1.2);
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const progressRef = useRef(0);

  // Scroll drives the illustration: -0.5 → 0 (nothing), 0.2 → 1 (fully drawn)
  const animProgress = Math.max(0, Math.min(1, mapRange(progress, -0.5, 0.2, 0, 1)));
  progressRef.current = animProgress;

  const enterRaw = mapRange(progress, -0.8, 0.0, 0, 1);
  const enterT = easeOutExpo(enterRaw);
  const textOpacity = lerpVal(0, 1, easeOutQuart(mapRange(progress, -0.7, -0.15, 0, 1)));
  const textY = lerpVal(50, 0, enterT);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      const w = Math.max(rect.width, 300);
      const h = Math.max(rect.height, 520);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const ry = 18;
    const ellipseYRatios = [0.00, 0.035, 0.08, 0.25, 0.46, 0.67, 0.90];
    const totalEllipses = ellipseYRatios.length;

    const draw = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const t = progressRef.current;
      if (t <= 0) { animRef.current = requestAnimationFrame(draw); return; }

      const cx = w * 0.5;
      const baseY = h * 0.92;
      const topY = h * 0.06;
      const axisH = baseY - topY;
      const ellipseRx = w * 0.42;

      const travelerFloat = t * (totalEllipses - 1);
      const droppedCount = Math.floor(travelerFloat);
      const frac = travelerFloat - droppedCount;
      const currentRatio = droppedCount < totalEllipses - 1
        ? ellipseYRatios[droppedCount] + (ellipseYRatios[droppedCount + 1] - ellipseYRatios[droppedCount]) * frac
        : ellipseYRatios[totalEllipses - 1];

      // Axis
      const axisEnd = baseY - currentRatio * axisH;
      ctx.save();
      ctx.strokeStyle = "#4a3f35";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, baseY + 8);
      ctx.lineTo(cx, Math.min(axisEnd - 10, baseY));
      ctx.stroke();

      // Arrow
      if (t >= 0.98) {
        const finalTop = baseY - ellipseYRatios[totalEllipses - 1] * axisH;
        ctx.beginPath();
        ctx.moveTo(cx - 5, finalTop - 8);
        ctx.lineTo(cx, finalTop - 18);
        ctx.lineTo(cx + 5, finalTop - 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, axisEnd - 10);
        ctx.lineTo(cx, finalTop - 18);
        ctx.stroke();
      }

      // Dot
      ctx.fillStyle = "#4a3f35";
      ctx.beginPath();
      ctx.arc(cx, baseY + 8, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Dropped ellipses
      for (let i = 0; i <= Math.min(droppedCount, totalEllipses - 1); i++) {
        const y = baseY - ellipseYRatios[i] * axisH;
        ctx.save();
        ctx.strokeStyle = "#4a3f35";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, y, ellipseRx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Traveling ellipse
      if (droppedCount < totalEllipses - 1) {
        const travelerY = baseY - currentRatio * axisH;
        ctx.save();
        ctx.strokeStyle = "#4a3f35";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, travelerY, ellipseRx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <section className="ms-ecosystem" ref={sectionRef}>
      <div className="ms-ecosystem-inner">
        <div className="ms-ecosystem-text" style={{ opacity: textOpacity, transform: `translateY(${textY}px)`, willChange: "transform, opacity" }}>
          <span className="ms-ecosystem-overline">04 — The Ecosystem</span>
          <p className="ms-ecosystem-body">Everything you need to grow, built to work together. Microsoft brings together the products, data, and intelligence businesses need to grow with efficiency and confidence — from discovery to engagement, from insight to action, designed to reduce friction and amplify results.</p>
        </div>
        <div className="ms-ecosystem-canvas-wrap">
          <canvas ref={canvasRef} />
        </div>
      </div>
    </section>
  );
}

/* ── Animated Chart for card ── */
function AnimatedChart({ color = "#1a73e8" }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !visible) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = wrap.getBoundingClientRect();
    const W = Math.max(rect.width, 120);
    const H = Math.max(rect.height, 80);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = 12;
    const gW = W - pad * 2, gH = H - pad * 2;
    // Smooth sine-like curve points
    const pts = [];
    const numPts = 7;
    const yVals = [0.18, 0.75, 0.22, 0.65, 0.1, 0.58, 0.25];
    for (let i = 0; i < numPts; i++) {
      pts.push({ x: i / (numPts - 1), y: yVals[i] });
    }

    let progress = 0;
    let raf;
    const draw = () => {
      progress = Math.min(1, progress + 0.015);
      ctx.clearRect(0, 0, W, H);

      // Grid lines
      const gridColor = `${color}18`;
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 0.8;
      for (let i = 0; i <= 3; i++) {
        const y = pad + (gH / 3) * i;
        ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(pad + gW, y); ctx.stroke();
      }
      for (let i = 0; i <= 3; i++) {
        const x = pad + (gW / 3) * i;
        ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, pad + gH); ctx.stroke();
      }

      // Grid border with rounded corners
      ctx.strokeStyle = `${color}28`;
      ctx.lineWidth = 1.2;
      const r = 10;
      ctx.beginPath();
      ctx.moveTo(pad + r, pad);
      ctx.lineTo(pad + gW - r, pad); ctx.quadraticCurveTo(pad + gW, pad, pad + gW, pad + r);
      ctx.lineTo(pad + gW, pad + gH - r); ctx.quadraticCurveTo(pad + gW, pad + gH, pad + gW - r, pad + gH);
      ctx.lineTo(pad + r, pad + gH); ctx.quadraticCurveTo(pad, pad + gH, pad, pad + gH - r);
      ctx.lineTo(pad, pad + r); ctx.quadraticCurveTo(pad, pad, pad + r, pad);
      ctx.closePath(); ctx.stroke();

      // Draw curve with catmull-rom-like smoothing
      const drawPts = pts.map(p => ({ x: pad + p.x * gW, y: pad + p.y * gH }));
      const totalSegs = drawPts.length - 1;
      const visibleSegs = progress * totalSegs;

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, Math.min(2.5, W * 0.008));
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      if (visibleSegs > 0) {
        ctx.moveTo(drawPts[0].x, drawPts[0].y);
        for (let i = 0; i < Math.min(Math.ceil(visibleSegs), totalSegs); i++) {
          const p0 = drawPts[i], p1 = drawPts[i + 1];
          const segProgress = i < Math.floor(visibleSegs) ? 1 : visibleSegs - Math.floor(visibleSegs);
          const cpx1 = p0.x + (p1.x - p0.x) * 0.4;
          const cpx2 = p0.x + (p1.x - p0.x) * 0.6;
          const ex = p0.x + (p1.x - p0.x) * segProgress;
          const ey = p0.y + (p1.y - p0.y) * segProgress;
          if (segProgress === 1) {
            ctx.bezierCurveTo(cpx1, p0.y, cpx2, p1.y, p1.x, p1.y);
          } else {
            // Partial bezier approximation
            const t = segProgress;
            const mx = (1-t)*(1-t)*(1-t)*p0.x + 3*(1-t)*(1-t)*t*cpx1 + 3*(1-t)*t*t*cpx2 + t*t*t*p1.x;
            const my = (1-t)*(1-t)*(1-t)*p0.y + 3*(1-t)*(1-t)*t*p0.y + 3*(1-t)*t*t*p1.y + t*t*t*p1.y;
            ctx.lineTo(mx, my);
          }
        }
        ctx.stroke();
      }

      // Dots at each visible point
      const visiblePtCount = Math.floor(visibleSegs) + 1;
      for (let i = 0; i < Math.min(visiblePtCount, drawPts.length); i++) {
        ctx.beginPath();
        ctx.arc(drawPts[i].x, drawPts[i].y, Math.max(2, Math.min(4, W * 0.012)), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      if (progress < 1) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [visible, color]);

  return (
    <div ref={wrapRef} style={{ width: "100%", height: "100%", position: "relative", minHeight: 120 }}>
      <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, display: "block" }} />
    </div>
  );
}

/* ── Floating Card ── */
/* ── Floating Card ── */
function FloatingCard({ card, index }) {
  const ref = useRef(null);
  const springRef = useRef({ pos: 0, vel: 0 });
  const prevT = useRef(null);
  const [vals, setVals] = useState({ scale: 0.88, y: 60 });
  const [flipped, setFlipped] = useState(false);

  const configs = [
    { stiff: 40, damp: 10, mass: 1.8, yRange: 80, scaleFrom: 0.82, delay: 0 },
    { stiff: 38, damp: 9,  mass: 1.9, yRange: 90, scaleFrom: 0.80, delay: 0.06 },
    { stiff: 35, damp: 9,  mass: 2.0, yRange: 85, scaleFrom: 0.78, delay: 0.12 },
    { stiff: 42, damp: 10, mass: 1.7, yRange: 75, scaleFrom: 0.83, delay: 0.04 },
    { stiff: 36, damp: 9,  mass: 1.9, yRange: 85, scaleFrom: 0.81, delay: 0.10 },
  ];
  const cfg = configs[index % 5];

  useEffect(() => {
    let running = true;
    const tick = (ts) => {
      if (!running) return;
      const dt = prevT.current ? Math.min((ts - prevT.current) / 1000, 0.064) : 0.016;
      prevT.current = ts;
      const el = ref.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const raw = clamp((vh - rect.top) / (vh + rect.height) - cfg.delay, 0, 1);
        const s = springRef.current;
        const disp = s.pos - raw;
        s.vel += ((-cfg.stiff * disp) + (-cfg.damp * s.vel)) / cfg.mass * dt;
        s.pos += s.vel * dt;
        const t = easeOutExpo(clamp(s.pos, 0, 1));
        setVals({
          scale: lerpVal(cfg.scaleFrom, 1, t),
          y: lerpVal(cfg.yRange, -cfg.yRange * 0.15, t),
        });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { running = false; prevT.current = null; };
  }, [cfg]);

  const ic = card.iconColor || "#4a3f35";
  // Microsoft Fluent-style icons
  const icons = {
    search: <svg width="16" height="16" viewBox="0 0 20 20" fill={ic}><path d="M8.5 3a5.5 5.5 0 014.383 8.823l4.147 4.147a.75.75 0 01-1.06 1.06l-4.147-4.147A5.5 5.5 0 118.5 3zm0 1.5a4 4 0 100 8 4 4 0 000-8z"/></svg>,
    ar: <svg width="16" height="16" viewBox="0 0 20 20" fill={ic}><path d="M2 5.5A2.5 2.5 0 014.5 3h11A2.5 2.5 0 0118 5.5v9a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 012 14.5v-9zM4.5 4.5a1 1 0 00-1 1v9a1 1 0 001 1h11a1 1 0 001-1v-9a1 1 0 00-1-1h-11zM10 7.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5z"/></svg>,
    voice: <svg width="16" height="16" viewBox="0 0 20 20" fill={ic}><path d="M7.5 4A2.5 2.5 0 0110 1.5 2.5 2.5 0 0112.5 4v5a2.5 2.5 0 01-5 0V4zM6 9a4 4 0 008 0h1.5A5.5 5.5 0 0110.75 14.4V17h-1.5v-2.6A5.5 5.5 0 014.5 9H6z"/></svg>,
    gaming: <svg width="16" height="16" viewBox="0 0 20 20" fill={ic}><path d="M6.5 3A4.5 4.5 0 002 7.5v3A4.5 4.5 0 006.5 15h7a4.5 4.5 0 004.5-4.5v-3A4.5 4.5 0 0013.5 3h-7zM7 7.25a.75.75 0 01.75.75v1h1a.75.75 0 010 1.5h-1v1a.75.75 0 01-1.5 0v-1h-1a.75.75 0 010-1.5h1V8A.75.75 0 017 7.25zm5.25 1.25a.75.75 0 100 1.5.75.75 0 000-1.5zm-1.5 1.75a.75.75 0 100 1.5.75.75 0 000-1.5z"/></svg>,
  };

  const fb = card.mode === "fullbleed";
  const ch = card.mode === "chart";

  /* Back face colors — derive from card's color scheme */
  const backBg = card.bg;
  const backTextColor = card.textColor || (fb ? "#fff" : "#4a3f35");

  return (
    <div ref={ref} style={{
      position: "absolute",
      left: card.x, top: card.y, width: card.w,
      transform: `translateY(${vals.y}px) scale(${vals.scale})`,
      transformOrigin: "center center",
      willChange: "transform",
      perspective: 1000,
    }}
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
    >
      <div style={{
        position: "relative",
        aspectRatio: "331 / 450",
        borderRadius: 36,
        transformStyle: "preserve-3d",
        WebkitTransformStyle: "preserve-3d",
        transition: "transform 0.7s cubic-bezier(0.4, 0.0, 0.2, 1)",
        transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
      }}>
        {/* ── FRONT FACE ── */}
        <div style={{
          position: "absolute", inset: 0,
          background: card.bg, borderRadius: 36, overflow: "hidden",
          display: "flex", flexDirection: "column",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}>
          {/* Tag — rounded rect, darker shade of card bg */}
          <div style={{
            position: fb ? "absolute" : "relative", top: 0, left: 0, right: 0,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "16px 20px",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: fb ? "rgba(255,255,255,0.18)" : `color-mix(in srgb, ${card.textColor || card.iconColor || "#4a3f35"} 15%, transparent)`,
              padding: "8px 14px", borderRadius: 20,
              fontSize: 12, fontWeight: 500, fontFamily: FONT,
              color: fb ? "#fff" : (card.textColor || ic),
            }}>
              {(() => {
                const tagIc = fb ? "#fff" : ic;
                const tagIcons = {
                  search: <svg width="14" height="14" viewBox="0 0 20 20" fill={tagIc}><path d="M8.5 3a5.5 5.5 0 014.383 8.823l4.147 4.147a.75.75 0 01-1.06 1.06l-4.147-4.147A5.5 5.5 0 118.5 3zm0 1.5a4 4 0 100 8 4 4 0 000-8z"/></svg>,
                  ar: <svg width="14" height="14" viewBox="0 0 20 20" fill={tagIc}><path d="M2 5.5A2.5 2.5 0 014.5 3h11A2.5 2.5 0 0118 5.5v9a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 012 14.5v-9zM4.5 4.5a1 1 0 00-1 1v9a1 1 0 001 1h11a1 1 0 001-1v-9a1 1 0 00-1-1h-11zM10 7.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5z"/></svg>,
                  voice: <svg width="14" height="14" viewBox="0 0 20 20" fill={tagIc}><path d="M7.5 4A2.5 2.5 0 0110 1.5 2.5 2.5 0 0112.5 4v5a2.5 2.5 0 01-5 0V4zM6 9a4 4 0 008 0h1.5A5.5 5.5 0 0110.75 14.4V17h-1.5v-2.6A5.5 5.5 0 014.5 9H6z"/></svg>,
                  gaming: <svg width="14" height="14" viewBox="0 0 20 20" fill={tagIc}><path d="M6.5 3A4.5 4.5 0 002 7.5v3A4.5 4.5 0 006.5 15h7a4.5 4.5 0 004.5-4.5v-3A4.5 4.5 0 0013.5 3h-7zM7 7.25a.75.75 0 01.75.75v1h1a.75.75 0 010 1.5h-1v1a.75.75 0 01-1.5 0v-1h-1a.75.75 0 010-1.5h1V8A.75.75 0 017 7.25zm5.25 1.25a.75.75 0 100 1.5.75.75 0 000-1.5zm-1.5 1.75a.75.75 0 100 1.5.75.75 0 000-1.5z"/></svg>,
                };
                return tagIcons[card.icon];
              })()}
              {card.badge}
            </div>
            <span style={{ fontSize: 18, fontWeight: 300, fontFamily: FONT, color: fb ? "rgba(255,255,255,0.5)" : (card.textColor || "#4a3f35"), opacity: 0.4 }}>+</span>
          </div>

          {fb ? (
            <>
              <img src={card.imageSrc} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                padding: "60px 20px 24px",
                background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
                color: "#fff", fontSize: "clamp(16px, 1.6vw, 24px)", fontWeight: 400, lineHeight: 1.25, fontFamily: FONT, letterSpacing: "-0.01em",
              }}>{card.text}</div>
            </>
          ) : ch ? (
            <>
              <div style={{ padding: "0 16px", flex: 1, minHeight: 0 }}>
                <AnimatedChart color={card.chartColor || "#4a3f35"} />
              </div>
              <div style={{ padding: "12px 20px 24px", fontSize: "clamp(16px, 1.6vw, 24px)", fontWeight: 400, lineHeight: 1.25, color: card.textColor, fontFamily: FONT, letterSpacing: "-0.01em" }}>{card.text}</div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px", flex: 1, minHeight: 0 }}>
                <img src={card.imageSrc} alt="" style={{ maxWidth: "70%", maxHeight: "85%", objectFit: "contain", display: "block" }} />
              </div>
              <div style={{ padding: "12px 20px 28px", fontSize: "clamp(16px, 1.6vw, 24px)", fontWeight: 400, lineHeight: 1.25, color: card.textColor, fontFamily: FONT, letterSpacing: "-0.01em" }}>{card.text}</div>
            </>
          )}
        </div>

        {/* ── BACK FACE ── */}
        <div style={{
          position: "absolute", inset: 0,
          background: backBg, borderRadius: 36, overflow: "hidden",
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
          padding: "32px 24px",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
        }}>
          <p style={{
            fontSize: "clamp(14px, 1.5vw, 20px)",
            fontWeight: 400,
            lineHeight: 1.45,
            color: backTextColor,
            fontFamily: FONT,
            letterSpacing: "-0.015em",
            margin: 0,
          }}>
            {card.backText}
          </p>
        </div>
      </div>
    </div>
  );
}

function FloatingCardsClosing() {
  /*
   * Gallery scatter — matches rascunho layout exactly.
   * Voice card bleeds off right edge. Swiss editorial closing.
   *
   * Row 1:  AR (left)       Musician (center)      Voice (right, bleeds edge)
   * Row 2:       Chart (left-center)       Sunset (center-right)
   */
  const CARDS = [
    {
      icon: "ar", badge: "AR", mode: "alpha",
      bg: "#dde8cc", textColor: "#2a3320", iconColor: "#2a3320",
      imageSrc: "/assets/images/ad-greenchair.png",
      text: "Visualize your new decor before you buy with AR in Search",
      backText: "Augmented Reality ads let shoppers place products in their space before purchasing. 3D models render in real-time through the camera, reducing returns by up to 25% and increasing purchase confidence.",
      x: "0%", y: "0%", w: "22.4%",
    },
    {
      icon: "search", badge: "Search", mode: "fullbleed",
      bg: "#1a1a1a", iconColor: "#4a3f35",
      imageSrc: "/assets/images/ad-guitar.png",
      text: "Find local events by searching [city] events",
      backText: "Local event discovery drives foot traffic and ticket sales. Microsoft's event graph indexes millions of listings across venues, promoters, and social platforms — surfacing results with dates, prices, and direct booking links.",
      x: "34.3%", y: "8%", w: "22.4%",
    },
    {
      icon: "voice", badge: "Voice", mode: "alpha",
      bg: "#d8d0e4", textColor: "#2a2535", iconColor: "#2a2535",
      imageSrc: "/assets/images/ad-red.png",
      text: "Can\u2019t remember the name of the song? Just hum the tune",
      backText: "Voice search is growing 35% year-over-year. Copilot's audio recognition matches hummed melodies, spoken lyrics, and ambient sound — opening new ad surfaces in music discovery, podcasts, and hands-free shopping.",
      x: "68.6%", y: "16%", w: "22.4%",
    },
    {
      icon: "search", badge: "Search", mode: "chart",
      bg: "#cdd6e0", textColor: "#2a3040", iconColor: "#2a3040",
      chartColor: "#2a3040",
      text: "Whether sin or cos, graph functions right in Search",
      backText: "Rich interactive results keep users on-page longer. Graph calculators, unit converters, and visual tools create high-attention moments where sponsored results achieve 2.3× higher engagement than standard text ads.",
      x: "8.6%", y: "80%", w: "22.4%",
    },
    {
      icon: "search", badge: "Search", mode: "fullbleed",
      bg: "#1e1e1e", iconColor: "#4a3f35",
      imageSrc: "/assets/images/ad-sunset.png",      text: "Search sunrise or sunset to find golden hour",
      backText: "Contextual moments — weather, golden hour, tides — signal high purchase intent for outdoor gear, travel, and photography. Microsoft Advertising places your brand at the exact moment of inspiration.",
      x: "51.5%", y: "56%", w: "22.4%",
    },
  ];

  return (
    <section style={{ background: "var(--c-bg)", overflow: "visible" }}>
      {/* Editorial intro — overline + text, offset col 4 */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "var(--gutter)",
        maxWidth: 1400, margin: "0 auto", padding: "200px var(--gutter) 120px",
      }}>
        <div style={{ gridColumn: "7 / 12" }}>
          <span style={{ display: "block", fontSize: 14, color: "var(--c-text)", marginBottom: 32 }}>05 — Surfaces</span>
          <p style={{
            fontSize: "clamp(22px, 2.4vw, 30px)",            fontWeight: 400,
            letterSpacing: "-0.025em",
            lineHeight: 1.3,
            color: "var(--c-text)",
            margin: 0,
            fontFamily: FONT,
          }}>
            Every surface is an opportunity — search, shopping, AR, voice, Copilot, connected TV. Your customers, every moment of intent.
          </p>
        </div>
      </div>

      {/* Cards scatter */}
      <div style={{
        maxWidth: 1400, margin: "0 auto",
        padding: "0 var(--gutter)",
      }}>
        <div style={{
          position: "relative",
          height: "clamp(900px, 85vw, 1500px)",
        }}>
          {CARDS.map((c, i) => <FloatingCard key={i} card={c} index={i} />)}
        </div>
      </div>

      {/* Bottom headline + illustration — Swiss editorial layout */}
      <div style={{
        position: "relative",
        padding: "0 var(--gutter)",
        marginTop: "clamp(240px, 30vw, 480px)",
        marginBottom: "clamp(120px, 15vw, 280px)",
        minHeight: "clamp(700px, 60vw, 1200px)",
      }}>
        {/* Headline + CTA — left side, z-index above illustration */}
        <div style={{ position: "relative", zIndex: 2 }}>
          <h2 style={{
            fontSize: "clamp(56px, 8.5vw, 120px)",
            fontWeight: 300,
            letterSpacing: "-0.045em",
            lineHeight: 0.95,
            color: "var(--c-text)",
            margin: "0 0 56px",
            fontFamily: FONT,
            maxWidth: "55%",
          }}>
            Your audience<br/>is already here.
          </h2>
          <div className="ms-closing-cta" id="closing-cta">
            <button className="ms-btn-primary">Learn More</button>
            <button className="ms-btn-arrow">&#8594;</button>
          </div>
        </div>

        {/* Illustration — absolute, right-aligned, bleeds into headline column */}
        <div style={{
          position: "absolute",
          right: "var(--gutter)",
          left: "38%",
          top: "calc(clamp(56px, 8.5vw, 120px) * 2.1 + 56px)",
          zIndex: 1,
        }}>
          <ParallaxMedia style={{ aspectRatio: "16 / 10" }} scaleFrom={0.92} scaleTo={1} radiusFrom={56} radiusTo={36}>
            <img src="/assets/images/artifact_0-5.png" alt="Illustration" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </ParallaxMedia>
        </div>
      </div>
    </section>
  );
}

export default function MicrosoftAds() {
  const [scrolled, setScrolled] = useState(false);
  const [navOverlay, setNavOverlay] = useState(null);
  const exportCanvasRef = useRef(null);
  const [heroRef, heroProgress] = useSmoothParallax(80, 12, 1.5);
  const [showDownload, setShowDownload] = useState(false);
  const [exportOverlay, setExportOverlay] = useState(null);
  const [exportMinimal, setExportMinimal] = useState(false);
  const [brushPanel, setBrushPanel] = useState(false);
  const [brushSettings, setBrushSettings] = useState({
    size: 1,          /* 0.3 → 3 multiplier */
    color: "#4a3f35", /* ink color */
    traceMode: true,  /* continuous trace on hover (default on) */
  });
  const brushRef = useRef(brushSettings);
  const clearRef = useRef(null);
  const ctaRef = useRef(null);
  const exportRenderRef = useRef(null);
  const brushPanelRef = useRef(null);
  useEffect(() => { brushRef.current = brushSettings; }, [brushSettings]);

  // Click outside to close brush panel
  useEffect(() => {
    if (!brushPanel) return;
    const handler = (e) => {
      if (brushPanelRef.current && !brushPanelRef.current.contains(e.target)) {
        // Also ignore clicks on the brush toggle button itself
        const btn = e.target.closest('.ms-tool-btn');
        if (btn) return;
        setBrushPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [brushPanel]);

  useEffect(() => {
    const timer = setTimeout(() => setShowDownload(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleExport = useCallback(() => {
    if (exportRenderRef.current) {
      const dataUrl = exportRenderRef.current(0);
      setExportMinimal(false);
      setExportOverlay(dataUrl);
    } else {
      const canvas = exportCanvasRef.current;
      if (!canvas) return;
      try {
        const exp = document.createElement("canvas");
        exp.width = canvas.width; exp.height = canvas.height;
        const ectx = exp.getContext("2d");
        ectx.fillStyle = "#f8f4ee";
        ectx.fillRect(0, 0, exp.width, exp.height);
        ectx.drawImage(canvas, 0, 0);
        setExportOverlay(exp.toDataURL("image/png"));
      } catch(e) { console.error("Export failed:", e); }
    }
  }, []);

  // Animated toggle: drives t with spring easing over ~600ms
  const exportAnimRef = useRef({ t: 0, target: 0, raf: null });

  const toggleExportMinimal = useCallback(() => {
    if (!exportRenderRef.current) return;
    const newVal = !exportMinimal;
    setExportMinimal(newVal);
    const anim = exportAnimRef.current;
    anim.target = newVal ? 1 : 0;
    if (anim.raf) cancelAnimationFrame(anim.raf);

    const startT = anim.t;
    const startTime = performance.now();
    const duration = 600; // ms

    const tick = (now) => {
      const elapsed = now - startTime;
      const raw = Math.min(1, elapsed / duration);
      // Ease-out cubic for smooth deceleration
      const ease = 1 - Math.pow(1 - raw, 3);
      anim.t = startT + (anim.target - startT) * ease;

      const dataUrl = exportRenderRef.current(anim.t);
      setExportOverlay(dataUrl);

      if (raw < 1) {
        anim.raf = requestAnimationFrame(tick);
      } else {
        anim.t = anim.target;
        anim.raf = null;
      }
    };
    anim.raf = requestAnimationFrame(tick);
  }, [exportMinimal]);

  const heroTitleY = mapRange(heroProgress, -0.1, 0.8, 0, -120);
  const heroTitleScale = lerpVal(1, 0.95, easeOut(mapRange(heroProgress, 0, 0.7, 0, 1)));
  const heroCTAOpacity = mapRange(heroProgress, 0.05, 0.35, 1, 0);
  const heroCTAY = mapRange(heroProgress, 0, 0.4, 0, -50);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="ms-page">
      <style>{styles}</style>

      {/* ── Navigation ── */}
      <nav
        className={`ms-nav ${scrolled && !navOverlay ? "scrolled" : ""}`}
        style={navOverlay ? {
          background: "transparent",
          borderBottom: "none",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
        } : {}}
      >
        <span className="ms-nav-brand" style={navOverlay ? { color: navOverlay.txt } : {}}>
          <svg width="16" height="16" viewBox="0 0 21 21" fill="none" style={{ marginRight: 8, flexShrink: 0 }}>
            <rect x="0" y="0" width="10" height="10" fill="currentColor"/>
            <rect x="11" y="0" width="10" height="10" fill="currentColor"/>
            <rect x="0" y="11" width="10" height="10" fill="currentColor"/>
            <rect x="11" y="11" width="10" height="10" fill="currentColor"/>
          </svg>
          Microsoft Advertising
        </span>
        <div className="ms-nav-links">
          <a className="ms-nav-link" style={navOverlay ? { color: navOverlay.txt } : {}}>Global Reach</a>
          <a className="ms-nav-link" style={navOverlay ? { color: navOverlay.txt } : {}}>Strategy Builder</a>
          <a className="ms-nav-link" style={navOverlay ? { color: navOverlay.txt } : {}}>Solutions</a>
          <a className="ms-nav-link" style={navOverlay ? { color: navOverlay.txt } : {}}>Ecosystem</a>
        </div>
      </nav>

      {/* ── Hero: Pixel Art Generative ── */}
      <section className="ms-hero" ref={heroRef}>
        <PixelHero setNavOverlay={setNavOverlay} exportCanvasRef={exportCanvasRef} brushRef={brushRef} clearRef={clearRef} ctaRef={ctaRef} exportRenderRef={exportRenderRef} />
        <div className="ms-hero-content" style={{ transform: `translateY(${heroTitleY}px) scale(${heroTitleScale})`, transformOrigin: "left top", willChange: "transform" }}>
          <h1>We build the stage.<br />You tell the story.</h1>
          <div className="ms-hero-cta" ref={ctaRef} style={{ opacity: heroCTAOpacity, transform: `translateY(${heroCTAY}px)`, willChange: "transform, opacity" }}>
            <button className="ms-btn-primary">Get Started</button>
            <button className="ms-btn-arrow">→</button>
          </div>
        </div>

        {/* ── Toolbar — brush + export, bottom-right ── */}
        <div
          className="ms-hero-toolbar"
          style={{
            opacity: showDownload && !navOverlay ? 1 : 0,
            transform: showDownload && !navOverlay ? "translateY(0)" : "translateY(12px)",
            pointerEvents: showDownload && !navOverlay ? "auto" : "none",
          }}
        >
          <button className="ms-tool-btn" onClick={() => setBrushPanel(p => !p)} title="Brush settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18.37 2.63a2.12 2.12 0 0 1 3 3L14 13l-4 1 1-4 7.37-7.37z"/>
              <path d="M3 17.25V21h3.75L17.81 9.94"/>
            </svg>
          </button>
          <button className="ms-tool-btn" onClick={() => clearRef.current && clearRef.current()} title="Clear canvas">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-3-6.7"/>
              <path d="M21 3v6h-6"/>
            </svg>
          </button>
          <button className="ms-tool-btn" onClick={handleExport} title="Export artwork">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7.5 1v9.5M7.5 10.5L4 7m3.5 3.5L11 7"/>
              <path d="M2 12.5h11"/>
            </svg>
          </button>
        </div>

        {/* ── Brush Settings Panel ── */}
        <div ref={brushPanelRef} className={`ms-brush-panel ${brushPanel && !navOverlay ? "open" : ""}`}>
          {/* Size */}
          <div className="ms-brush-control">
            <label>Size</label>
            <input
              type="range" min="0.3" max="3" step="0.1"
              value={brushSettings.size}
              onChange={e => setBrushSettings(s => ({ ...s, size: +e.target.value }))}
            />
            <span className="ms-brush-val">{brushSettings.size.toFixed(1)}</span>
          </div>

          {/* Color swatches */}
          <div className="ms-brush-control">
            <label>Ink</label>
            <div className="ms-brush-swatches">
              {[
                { c: "#4a3f35", name: "Ink" },
                { c: "#3D532F", name: "Forest" },
                { c: "#1A3A5C", name: "Navy" },
                { c: "#E7614C", name: "Coral" },
                { c: "#8B6914", name: "Gold" },
                { c: "#CAC0D9", name: "Lilac" },
              ].map(({ c, name }) => (
                <button
                  key={c}
                  className={`ms-brush-swatch ${brushSettings.color === c ? "active" : ""}`}
                  style={{ background: c }}
                  onClick={() => setBrushSettings(s => ({ ...s, color: c }))}
                  title={name}
                />
              ))}
            </div>
          </div>

          {/* Continuous trace toggle */}
          <div className="ms-brush-control" style={{ marginBottom: 0 }}>
            <label>Trace</label>
            <button
              className={`ms-toggle ${brushSettings.traceMode ? "on" : ""}`}
              onClick={() => setBrushSettings(s => ({ ...s, traceMode: !s.traceMode }))}
              title={brushSettings.traceMode ? "Hover draws" : "Click to draw"}
            />
          </div>
        </div>

      </section>

      {/* ── Export Overlay ── */}
      {exportOverlay && (
        <div className="ms-export-overlay" onClick={() => { if (exportAnimRef.current.raf) cancelAnimationFrame(exportAnimRef.current.raf); exportAnimRef.current = { t: 0, target: 0, raf: null }; setExportOverlay(null); }}>
          <div className="ms-export-modal" onClick={e => e.stopPropagation()}>
            <div className="ms-export-modal-header">
              <span className="ms-export-modal-title">Your Artwork</span>
              <button className="ms-export-modal-close" onClick={() => { if (exportAnimRef.current.raf) cancelAnimationFrame(exportAnimRef.current.raf); exportAnimRef.current = { t: 0, target: 0, raf: null }; setExportOverlay(null); }}>✕</button>
            </div>
            <div className="ms-export-modal-preview">
              <img src={exportOverlay} alt="Exported artwork" />
            </div>
            <div className="ms-export-modal-footer">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="ms-export-modal-hint" style={{ opacity: exportMinimal ? 0.4 : 1, cursor: "pointer", transition: "opacity 0.2s" }} onClick={() => { if (exportMinimal) toggleExportMinimal(); }}>Data</span>
                <button
                  className={`ms-toggle ${exportMinimal ? "on" : ""}`}
                  onClick={toggleExportMinimal}
                  style={{ flexShrink: 0 }}
                />
                <span className="ms-export-modal-hint" style={{ opacity: exportMinimal ? 1 : 0.4, cursor: "pointer", transition: "opacity 0.2s" }} onClick={() => { if (!exportMinimal) toggleExportMinimal(); }}>Minimal</span>
              </div>
              <a className="ms-export-modal-btn" href={exportOverlay} download={`microsoft-ads-artwork${exportMinimal ? "-minimal" : ""}.png`}>
                <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                  <path d="M7.5 1v9.5M7.5 10.5L4 7m3.5 3.5L11 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12.5h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                Download PNG
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Marquee Ticker ── */}
      <MarqueeTicker />

      {/* ── Gallery: Across 125 Countries ── */}
      <PhotoGallery />

      {/* ── Section 01: Maximize Your Return — canvas IS the section ── */}
      <section className="ms-section-block ms-section-builder">
        <CampaignBuilder />
      </section>

      {/* ── Section 02: Solutions — Editorial Cards ── */}
      <SolutionsSection />

      {/* ── Section 03: Ecosystem Closer ── */}
      <EcosystemCloser />

      {/* ── Closing: Floating Cards ── */}
      <FloatingCardsClosing />

      {/* ── Footer ── */}
      <footer className="ms-footer">
        <div className="ms-footer-inner">
          <div className="ms-footer-logo">
            <span /><span /><span /><span />
          </div>
          <div className="ms-footer-col">
            <a>About</a>
            <a>News</a>
            <a>Team</a>
            <a>Careers</a>
          </div>
          <div className="ms-footer-col">
            <a>LinkedIn</a>
            <a>Instagram</a>
            <a>X</a>
          </div>
          <div className="ms-footer-col">
            <a>Contact</a>
            <a>Privacy &amp; Cookies</a>
            <a>Terms</a>
            <a>Trademarks</a>
            <a>Microsoft.com</a>
          </div>
          <div className="ms-footer-legal">
            <span className="ms-footer-legal-copy">© Microsoft 2026</span>
            <span className="ms-footer-legal-text">
              This site runs Microsoft Clarity for behavioral insights. By using this site, you consent to the collection and use of your data, such as how you interact with this website, by Microsoft for product improvements. Learn more <a>here</a> and at our <a>Privacy Statement</a>.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
