import { useState, useRef, useEffect, useCallback, useMemo } from "react";

const STRATEGY_MATRIX = {
  "g1→c1":1, "g1→c2":3, "g1→c3":0, "g1→c4":2, "g1→c5":3, "g2→c1":3, "g2→c2":2, "g2→c3":0, "g2→c4":2, "g2→c5":1, "g3→c1":2, "g3→c2":1, "g3→c3":3, "g3→c4":3, "g3→c5":0, "g4→c1":3, "g4→c2":2, "g4→c3":1, "g4→c4":2, "g4→c5":1, "g5→c1":1, "g5→c2":3, "g5→c3":0, "g5→c4":2, "g5→c5":2,
  "c1→ch1":3, "c1→ch2":2, "c1→ch3":1, "c1→ch4":0, "c1→ch5":0, "c2→ch1":0, "c2→ch2":2, "c2→ch3":1, "c2→ch4":3, "c2→ch5":3, "c3→ch1":3, "c3→ch2":2, "c3→ch3":0, "c3→ch4":0, "c3→ch5":1, "c4→ch1":3, "c4→ch2":3, "c4→ch3":2, "c4→ch4":2, "c4→ch5":3, "c5→ch1":0, "c5→ch2":2, "c5→ch3":0, "c5→ch4":0, "c5→ch5":3,
  "ch1→t1":3, "ch1→t2":2, "ch1→t3":0, "ch1→t4":2, "ch1→t5":2, "ch2→t1":2, "ch2→t2":3, "ch2→t3":1, "ch2→t4":1, "ch2→t5":2, "ch3→t1":2, "ch3→t2":1, "ch3→t3":3, "ch3→t4":2, "ch3→t5":3, "ch4→t1":2, "ch4→t2":3, "ch4→t3":1, "ch4→t4":3, "ch4→t5":1, "ch5→t1":3, "ch5→t2":2, "ch5→t3":0, "ch5→t4":1, "ch5→t5":2,
  "t1→m1":3, "t1→m2":2, "t1→m3":1, "t1→m4":3, "t1→m5":1, "t2→m1":3, "t2→m2":2, "t2→m3":1, "t2→m4":3, "t2→m5":0, "t3→m1":2, "t3→m2":3, "t3→m3":1, "t3→m4":2, "t3→m5":1, "t4→m1":2, "t4→m2":2, "t4→m3":2, "t4→m4":3, "t4→m5":1, "t5→m1":2, "t5→m2":2, "t5→m3":2, "t5→m4":2, "t5→m5":2,
};

const NODE_INSIGHTS = {
  g1: { insight: "Microsoft reaches 1B+ users across Windows, Edge, and Xbox — unmatched surface area for awareness.", exclusive: false },
  g2: { insight: "LinkedIn profile targeting gives you B2B lead gen precision no other ad platform can match.", exclusive: false },
  g3: { insight: "Shopping Ads on Bing convert 45% higher on desktop, with consistently lower CPC.", exclusive: false },
  g4: { insight: "Bing captures 38% of US desktop searches — often missed traffic at 30-50% lower CPC.", exclusive: false },
  g5: { insight: "Reach users across MSN, Outlook, and Xbox apps — premium environments exclusive to Microsoft.", exclusive: false },
  c1: { insight: "Text ads across Bing, Yahoo, and DuckDuckGo — reaching 900M+ monthly searches at lower CPCs.", exclusive: false },
  c2: { insight: "Native placements across MSN, Edge new tab, and Outlook — premium Microsoft-owned surfaces.", exclusive: true },
  c3: { insight: "Product ads across Bing Shopping with Merchant Center. 35% lower avg. CPC in competitive categories.", exclusive: false },
  c4: { insight: "AI-optimized across all Microsoft surfaces — search, audience, shopping in one campaign.", exclusive: false },
  c5: { insight: "Connected TV and online video across premium Microsoft properties and partners.", exclusive: false },
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
    best: { campaign: ["c2","c5"], channel: ["ch2","ch4","ch5"], targeting: ["t1","t5"], metric: ["m5"] },
    good: { campaign: ["c4"], channel: ["ch1","ch3"], targeting: ["t3","t4"], metric: ["m3"] },
    label: "Awareness Engine",
    principle: "Maximize surface area across premium Microsoft-exclusive placements.",
  },
  g2: { /* Lead Generation */
    best: { campaign: ["c1","c2"], channel: ["ch1","ch3"], targeting: ["t3","t2"], metric: ["m2"] },
    good: { campaign: ["c4"], channel: ["ch2","ch4"], targeting: ["t1","t4"], metric: ["m4"] },
    label: "Lead Precision",
    principle: "Combine high-intent search with LinkedIn B2B targeting for qualified leads.",
  },
  g3: { /* Online Sales */
    best: { campaign: ["c3","c4"], channel: ["ch1","ch2"], targeting: ["t1","t2"], metric: ["m1"] },
    good: { campaign: ["c1"], channel: ["ch5"], targeting: ["t4","t5"], metric: ["m4"] },
    label: "Commerce Accelerator",
    principle: "Product feeds + remarketing at lower CPCs drive profitable transactions.",
  },
  g4: { /* Website Traffic */
    best: { campaign: ["c1","c4"], channel: ["ch1","ch2"], targeting: ["t1","t5"], metric: ["m3"] },
    good: { campaign: ["c2"], channel: ["ch5","ch3"], targeting: ["t2","t3"], metric: ["m5"] },
    label: "Traffic Surge",
    principle: "Broad search + AI optimization across 900M+ monthly searches at lower CPCs.",
  },
  g5: { /* App Installs */
    best: { campaign: ["c2","c5"], channel: ["ch2","ch5","ch4"], targeting: ["t5","t1"], metric: ["m4"] },
    good: { campaign: ["c4"], channel: ["ch1","ch3"], targeting: ["t2","t4"], metric: ["m2"] },
    label: "Install Engine",
    principle: "Audience Ads on mobile surfaces with lookalike expansion.",
  },
};

function mapStrategyToBudget(placed) {
  const ids = new Set(placed.map(n => n.id));
  const enabled = [];
  const sliders = { search: 0, audience: 0, shopping: 0, video: 0, linkedin: 0 };

  if (ids.has("c1")) { if (!enabled.includes("search")) enabled.push("search"); sliders.search = Math.max(sliders.search, 70); }
  if (ids.has("c2")) { if (!enabled.includes("audience")) enabled.push("audience"); sliders.audience = Math.max(sliders.audience, 65); }
  if (ids.has("c3")) { if (!enabled.includes("shopping")) enabled.push("shopping"); sliders.shopping = Math.max(sliders.shopping, 75); }
  if (ids.has("c4")) {
    ["search","audience","shopping"].forEach(ch => { if (!enabled.includes(ch)) enabled.push(ch); });
    sliders.search = Math.max(sliders.search, 50);
    sliders.audience = Math.max(sliders.audience, 50);
    sliders.shopping = Math.max(sliders.shopping, 40);
  }
  if (ids.has("c5")) { if (!enabled.includes("video")) enabled.push("video"); sliders.video = Math.max(sliders.video, 60); }

  if (ids.has("ch3")) { if (!enabled.includes("linkedin")) enabled.push("linkedin"); sliders.linkedin = Math.max(sliders.linkedin, 55); }
  if (ids.has("ch1")) { if (!enabled.includes("search")) enabled.push("search"); sliders.search = Math.max(sliders.search, 60); }
  if (ids.has("ch2") || ids.has("ch4") || ids.has("ch5")) {
    if (!enabled.includes("audience")) enabled.push("audience");
    sliders.audience = Math.max(sliders.audience, 45);
  }

  if (ids.has("g1")) { sliders.audience = Math.min(100, sliders.audience + 15); sliders.video = Math.min(100, (sliders.video || 0) + 15); }
  if (ids.has("g2")) { sliders.search = Math.min(100, sliders.search + 10); sliders.linkedin = Math.min(100, (sliders.linkedin || 0) + 20); }
  if (ids.has("g3")) { sliders.shopping = Math.min(100, sliders.shopping + 20); sliders.search = Math.min(100, sliders.search + 10); }
  if (ids.has("g4")) { sliders.search = Math.min(100, sliders.search + 20); }
  if (ids.has("g5")) { sliders.audience = Math.min(100, sliders.audience + 15); sliders.video = Math.min(100, (sliders.video || 0) + 10); }

  if (ids.has("t3")) { if (!enabled.includes("linkedin")) enabled.push("linkedin"); sliders.linkedin = Math.max(sliders.linkedin, 40); }

  let budget = 5000;
  if (ids.has("g1")) budget = 10000;
  else if (ids.has("g2")) budget = 8000;
  else if (ids.has("g3")) budget = 6000;
  else if (ids.has("g4")) budget = 4000;
  else if (ids.has("g5")) budget = 7000;

  return { enabled, sliders, budget };
}

function gradeNode(goalId, nodeId) {
  if (!goalId) return "neutral";
  const opt = GOAL_OPTIMAL[goalId];
  if (!opt) return "neutral";
  const step = nodeId.match(/^[a-z]+/)?.[0];
  const stepMap = { c: "campaign", ch: "channel", t: "targeting", m: "metric" };
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

function generateOptimalStrategy(goalId) {
  const opt = GOAL_OPTIMAL[goalId];
  if (!opt) return [];
  const now = Date.now();
  const nodes = [{ id: goalId, label: STEPS[0].items.find(i => i.id === goalId)?.label, step: "goal", shape: "star", tip: "", born: now }];
  const stepMap = { campaign: 1, channel: 2, targeting: 3, metric: 4 };
  Object.entries(opt.best).forEach(([cat, ids]) => {
    const stepIdx = stepMap[cat];
    const stepDef = STEPS[stepIdx];
    ids.forEach((id, i) => {
      const item = stepDef.items.find(it => it.id === id);
      if (item) {
        nodes.push({ id, label: item.label, step: stepDef.key, shape: stepDef.shape, tip: item.tip, born: now + (stepIdx * 300) + i * 100 });
      }
    });
  });
  return nodes;
}

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
    key: "goal", label: "Campaign goal", shape: "star",
    desc: "What do you want to achieve?",
    color: "#3a2a1e", bg: "#f5e6d8",
    items: [
      { id: "g1", label: "Brand Awareness", tip: "Best with Audience Ads on MSN & Outlook" },
      { id: "g2", label: "Lead Generation", tip: "LinkedIn targeting excels here" },
      { id: "g3", label: "Online Sales", tip: "Shopping + Performance Max recommended" },
      { id: "g4", label: "Website Traffic", tip: "Search Ads with broad match keywords" },
      { id: "g5", label: "App Installs", tip: "Use Audience Ads with app extensions" },
    ],
  },
  {
    key: "campaign", label: "Campaign type", shape: "pill",
    desc: "How will your ads appear?",
    color: "#2a2535", bg: "#c8c0d8",
    items: [
      { id: "c1", label: "Search Ads", tip: "Text ads on Bing, Yahoo, DuckDuckGo" },
      { id: "c2", label: "Audience Ads", tip: "Native placements across Microsoft network" },
      { id: "c3", label: "Shopping", tip: "Product catalog with images and prices" },
      { id: "c4", label: "Performance Max", tip: "AI-optimized across all channels" },
      { id: "c5", label: "Video Ads", tip: "Connected TV and online video placements" },
    ],
  },
  {
    key: "channel", label: "Network", shape: "circle",
    desc: "Where should your ads appear?",
    color: "#3a2a10", bg: "#f0d888",
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
    desc: "Who are you trying to reach?",
    color: "#2a3320", bg: "#c8d4a8",
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
    desc: "What defines success?",
    color: "#fff", bg: "#4a3f35",
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
    bg = "#f5f0e8", strokeColor = null, strokeWidth = 0.7,
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
  const marginY = compact ? 60 : 120;
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

const styles = `
:root { --sp-xs: 8px; --sp-sm: 16px; --sp-md: 24px; --sp-lg: 48px; --sp-xl: 64px; --sp-2xl: 96px; --gutter: 48px; --section-gap: 64px; --radius-sm: 12px; --radius-md: 24px; --radius-lg: 32px; --radius-xl: 40px; --radius-pill: 100px; --c-bg: #f5f0e8; --c-text: #4a3f35; --c-text-soft: rgba(74,63,53,0.5); --c-border: rgba(74,63,53,0.1); }
html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
body { font-family: ${FONT}; background: var(--c-bg); color: var(--c-text); -webkit-font-smoothing: antialiased; overflow-x: hidden; }
.ms-page { width: 100%; min-height: 100vh; font-family: ${FONT}; background: var(--c-bg); color: var(--c-text); font-weight: 400; }
.ms-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 0 var(--gutter); height: 56px; background: transparent; pointer-events: none; transition: all 0.3s ease; }
.ms-nav-brand { font-size: 15px; letter-spacing: -0.01em; color: var(--c-text); font-weight: 400; }
.ms-nav-links { display: flex; gap: 32px; align-items: center; }
.ms-nav-link { font-size: 13px; color: rgba(74,63,53,0.5); text-decoration: none; cursor: pointer; transition: color 0.2s; font-weight: 400; }
.ms-nav-link:hover { color: var(--c-text); }
.ms-hero { position: relative; min-height: 85vh; overflow: hidden; background: var(--c-bg); z-index: 1; }
.ms-hero-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 2; pointer-events: none; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.ms-hero-content { position: relative; z-index: 5; padding: 0 var(--gutter); padding-top: calc(56px + 14vh); pointer-events: none; animation: fadeInUp 0.8s ease both; animation-delay: 0.2s; }
.ms-hero h1 { font-size: clamp(48px, 7vw, 96px); font-weight: 400; letter-spacing: -0.03em; line-height: 1.02; color: var(--c-text); pointer-events: none; }
.ms-hero-cta { display: flex; align-items: center; gap: 4px; margin-top: 40px; pointer-events: auto; position: relative; z-index: 30; animation: fadeInUp 0.8s ease both; animation-delay: 0.5s; }
.ms-btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 36px; height: 50px; background: var(--c-text); color: #fff; border: none; border-radius: 100px; font-size: 14px; font-family: ${FONT}; font-weight: 400; cursor: pointer; transition: all 0.4s cubic-bezier(0.22,1,0.36,1); letter-spacing: -0.01em; }
.ms-btn-arrow { display: inline-flex; align-items: center; justify-content: center; width: 50px; height: 50px; border-radius: 4px; background: var(--c-text); color: #fff; border: none; cursor: pointer; font-size: 18px; transition: all 0.4s cubic-bezier(0.22,1,0.36,1); }
.ms-hero-cta:hover .ms-btn-primary { background: #6b5d50; }
.ms-hero-cta:hover .ms-btn-arrow { border-radius: 50%; background: #6b5d50; }
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.ms-marquee-wrap { border-top: 1px solid rgba(74,63,53,0.15); border-bottom: 1px solid rgba(74,63,53,0.15); overflow: hidden; white-space: nowrap; padding: 16px 0; position: relative; background: var(--c-bg); }
.ms-marquee-track { display: inline-flex; animation: marquee 30s linear infinite; will-change: transform; }
.ms-marquee-track:hover { animation-play-state: paused; }
.ms-marquee-item { display: inline-flex; align-items: center; gap: 16px; padding: 0 24px; font-size: 14px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--c-text); font-weight: 400; white-space: nowrap; }
.ms-marquee-arrow { color: var(--c-text); font-size: 14px; }
.ms-section-block { padding: var(--section-gap) var(--gutter) 0; background: var(--c-bg); }
.ms-section-block-header { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--lg); margin-bottom: 32px; }
.ms-section-block h2, .ms-section-block-heading { font-size: clamp(36px, 5.5vw, 72px); font-weight: 400; letter-spacing: -0.03em; line-height: 1.02; color: var(--c-text); text-transform: uppercase; }
.ms-section-block-desc { font-size: 14px; color: rgba(74,63,53,0.45); line-height: 1.65; max-width: 320px; padding-top: 12px; font-weight: 400; }
.ms-section-block-number { font-size: 11px; color: rgba(74,63,53,0.35); margin-bottom: 12px; font-weight: 400; }
.ms-section-builder { padding: 0 !important; }
.ms-builder { width: 100%; }
.ms-builder-controls { padding: 12px var(--gutter) 12px; margin-bottom: 16px; }
.ms-builder-controls-left { display: flex; align-items: center; gap: 20px; }
.ms-builder-step-indicator { display: flex; gap: 3px; align-items: center; }
.ms-builder-step-dot { height: 5px; border-radius: 100px; transition: all 0.3s ease; }
.ms-builder-actions { display: flex; gap: 16px; align-items: center; }
.ms-builder-btn { border: none; background: transparent; padding: 4px 0; font-size: 11px; letter-spacing: 0.02em; cursor: pointer; border-radius: 0; font-family: ${FONT}; color: rgba(74,63,53,0.4); font-weight: 400; transition: all 0.15s; border-bottom: 1px solid transparent; }
.ms-builder-btn:hover { color: var(--c-text); border-bottom-color: rgba(74,63,53,0.2); }
.ms-builder-btn-primary { border: none; background: var(--c-text); color: #fff; padding: 6px 16px; font-size: 11px; letter-spacing: 0.02em; cursor: pointer; border-radius: 100px; font-family: ${FONT}; font-weight: 400; transition: all 0.15s; }
.ms-builder-btn-primary:hover { background: #3a3229; }
.ms-builder-btn-primary:disabled { opacity: 0.5; cursor: default; }
.ms-builder-canvas-wrap { height: 75vh; min-height: 560px; max-height: 800px; overflow: hidden; position: relative; transition: border 0.15s; background: var(--c-bg); }
.ms-builder-shelf { padding: 0 var(--gutter) 24px; border-bottom: 1px solid rgba(74,63,53,0.08); margin-bottom: 0; }
.ms-builder-shelf-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 14px; }
.ms-builder-shelf-step { font-size: 11px; color: rgba(74,63,53,0.35); font-weight: 400; }
.ms-builder-shelf-label { font-size: 13px; color: var(--c-text); font-weight: 400; }
.ms-builder-shelf-desc { font-size: 12px; color: rgba(74,63,53,0.3); font-weight: 400; }
.ms-builder-shelf-hint { font-size: 10px; color: rgba(74,63,53,0.2); margin-left: auto; }
.ms-builder-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.ms-builder-chip { display: flex; align-items: center; gap: 0; padding: 10px 18px; border: 1px solid rgba(74,63,53,0.15); border-radius: 40px; cursor: grab; background: var(--c-bg); user-select: none; transition: all 0.15s; font-size: 12px; color: var(--c-text); font-weight: 400; font-family: ${FONT}; line-height: 1.3; }
.ms-builder-chip:hover { background: var(--c-text); color: #fff; border-color: var(--c-text); }
.ms-builder-chip.placed { border: 1px solid rgba(74,63,53,0.15); opacity: 0.3; cursor: default; background: var(--c-bg); color: rgba(74,63,53,0.4); }
.ms-builder-complete { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
.ms-builder-complete-label { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--c-text); font-weight: 400; }
.ms-builder-complete-count { font-size: 13px; color: var(--c-text); }
.ms-builder-complete-path { font-size: 11px; color: rgba(74,63,53,0.2); margin-left: auto; }
.ms-drag-ghost { position: fixed; pointer-events: none; z-index: 9999; display: flex; align-items: center; gap: 8px; padding: 8px 14px 8px 10px; background: rgba(255,255,255,0.94); backdrop-filter: blur(6px); border: 1.5px solid rgba(74,63,53,0.1); border-radius: 40px; font-size: 12px; color: var(--c-text); font-family: ${FONT}; box-shadow: 0 4px 20px rgba(74,63,53,0.06); transition: border-color 0.15s; }
.ms-drag-ghost.over-canvas { border-color: rgba(74,63,53,0.35); }

/* ── Ecosystem Closer Section ── */
.ms-ecosystem { padding: 0 0 var(--section-gap); background: var(--c-bg); overflow: hidden; position: relative; }
.ms-ecosystem-inner { max-width: 1400px; margin: 0 auto; padding: 0 var(--gutter); display: grid; grid-template-columns: 3fr 2fr; gap: var(--sp-lg); align-items: center; }
.ms-ecosystem-text { display: flex; flex-direction: column; gap: var(--sp-md); }
.ms-ecosystem-overline { font-size: 11px; color: rgba(74,63,53,0.35); font-weight: 400; }
.ms-ecosystem-body { font-size: clamp(22px, 2.4vw, 30px); font-weight: 400; line-height: 1.35; color: var(--c-text); letter-spacing: -0.015em; }
.ms-ecosystem-canvas-wrap { position: relative; display: flex; align-items: center; justify-content: center; min-height: 520px; }
.ms-ecosystem-canvas-wrap canvas { display: block; }

.ms-closing { padding: var(--sp-2xl) var(--gutter); background: var(--c-bg); text-align: center; }
.ms-closing-inner { max-width: 720px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; }
.ms-closing-overline { display: block; font-size: 11px; color: rgba(74,63,53,0.35); margin-bottom: 48px; font-weight: 400; }
.ms-closing-title { font-size: clamp(32px, 4.5vw, 56px); font-weight: 400; letter-spacing: -0.03em; line-height: 1.1; color: var(--c-text); margin: 0 0 64px; }
.ms-closing-illustration { width: 100%; max-width: 480px; margin: 0 auto 64px; }
.ms-closing-svg { width: 100%; height: auto; }
.ms-closing-body { font-size: clamp(16px, 1.8vw, 20px); color: rgba(74,63,53,0.5); line-height: 1.5; font-weight: 400; margin-bottom: 48px; max-width: 440px; }
.ms-closing-cta { display: flex; align-items: center; gap: 4px; }
.ms-closing-cta:hover .ms-btn-primary { background: #6b5d50; }
.ms-closing-cta:hover .ms-btn-arrow { border-radius: 50%; background: #6b5d50; }
.ms-footer { border-top: 1px solid rgba(74,63,53,0.08); padding: 48px var(--gutter) 40px; background: var(--c-bg); }
.ms-footer-inner { max-width: 1400px; margin: 0 auto; display: grid; grid-template-columns: auto 1fr 1fr 1fr 1.5fr; gap: 48px; align-items: start; }
.ms-footer-logo { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; width: 22px; height: 22px; gap: 2px; margin-top: 2px; }
.ms-footer-logo span { display: block; }
.ms-footer-logo span:nth-child(1) { background: var(--c-text); }
.ms-footer-logo span:nth-child(2) { background: var(--c-text); }
.ms-footer-logo span:nth-child(3) { background: var(--c-text); }
.ms-footer-logo span:nth-child(4) { background: var(--c-text); }
.ms-footer-col { display: flex; flex-direction: column; gap: 10px; }
.ms-footer-col a { font-size: 13px; color: var(--c-text); text-decoration: none; cursor: pointer; transition: color 0.2s;  letter-spacing: 0.02em; }
.ms-footer-col a:hover { color: var(--c-text); }
.ms-footer-legal { display: flex; flex-direction: column; gap: 12px; }
.ms-footer-legal-copy { font-size: 13px; color: var(--c-text);  letter-spacing: 0.02em; }
.ms-footer-legal-text { font-size: 11px; color: var(--c-text); line-height: 1.55;  letter-spacing: 0.01em; max-width: 420px; }
.ms-footer-legal-text a { color: var(--c-text); text-decoration: underline; }
.ms-hero-toolbar { position: absolute; bottom: 28px; right: 28px; z-index: 50; display: flex; gap: 8px; align-items: center; transition: opacity 0.6s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1); will-change: transform, opacity; }
.ms-tool-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: transparent; border: 1.5px solid rgba(74,63,53,0.2); border-radius: 50%; color: var(--c-text); cursor: pointer; transition: border-color 0.2s, color 0.2s, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); padding: 0; }
.ms-tool-btn:hover { border-color: rgba(74,63,53,0.5); color: var(--c-text); transform: scale(1.08); }
.ms-tool-btn:active { transform: scale(0.95); }
.ms-brush-panel { position: absolute; bottom: 78px; right: 28px; z-index: 51; width: 250px; background: rgba(255,255,255,0.92); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1.5px solid rgba(74,63,53,0.1); border-radius: var(--radius-md); padding: 0; opacity: 0; transform: translateY(8px) scale(0.96); pointer-events: none; transition: opacity 0.3s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); font-family: 'Segoe UI', system-ui, sans-serif; overflow: hidden; }
.ms-brush-panel.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
.ms-brush-panel-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px 8px; font-size: 11px; font-weight: 600; color: var(--c-text); letter-spacing: 0.04em; text-transform: uppercase; }
.ms-brush-panel-close { width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; border-radius: 50%; cursor: pointer; font-size: 11px; color: #999; transition: color 0.15s, background 0.15s; }
.ms-brush-panel-close:hover { color: var(--c-text); background: rgba(74,63,53,0.05); }
.ms-brush-control { padding: 6px 16px; display: flex; align-items: center; gap: 8px; }
.ms-brush-control label { font-size: 10px; font-weight: 500; color: #888; min-width: 52px; letter-spacing: 0.02em; }
.ms-brush-control input[type="range"] { flex: 1; height: 3px; -webkit-appearance: none; appearance: none; background: rgba(74,63,53,0.1); border-radius: 2px; outline: none; cursor: pointer; }
.ms-brush-control input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; background: var(--c-text); border-radius: 50%; cursor: pointer; transition: transform 0.15s; }
.ms-brush-control input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.3); }
.ms-brush-val { font-size: 10px; font-weight: 500; color: #555; min-width: 28px; text-align: right; font-variant-numeric: tabular-nums; }
.ms-brush-swatches { display: flex; gap: 5px; flex: 1; flex-wrap: wrap; }
.ms-brush-swatch { width: 18px; height: 18px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: border-color 0.15s, transform 0.15s; padding: 0; }
.ms-brush-swatch:hover { transform: scale(1.15); }
.ms-brush-swatch.active { border-color: var(--c-text); transform: scale(1.1); }
.ms-toggle { position: relative; width: 32px; height: 18px; background: rgba(74,63,53,0.12); border-radius: 9px; border: none; padding: 0; cursor: pointer; transition: background 0.2s ease; flex-shrink: 0; }
.ms-toggle.on { background: var(--c-text); }
.ms-toggle::after { content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; background: var(--c-bg); border-radius: 50%; transition: transform 0.2s ease; }
.ms-toggle.on::after { transform: translateX(14px); }
.ms-export-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(74,63,53,0.6); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; padding: var(--gutter); animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.ms-export-modal { background: var(--c-bg); border-radius: var(--radius-lg); max-width: 900px; width: 100%; overflow: hidden; box-shadow: 0 24px 80px rgba(74,63,53,0.25); animation: modalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes modalIn { from { transform: translateY(20px) scale(0.97); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
.ms-export-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid rgba(74,63,53,0.06); }
.ms-export-modal-title { font-size: 14px; font-weight: 600; color: var(--c-text); font-family: 'Segoe UI', system-ui, sans-serif; }
.ms-export-modal-close { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: none; background: rgba(74,63,53,0.04); border-radius: 50%; cursor: pointer; font-size: 14px; color: rgba(74,63,53,0.55); transition: background 0.15s; }
.ms-export-modal-close:hover { background: rgba(74,63,53,0.08); color: var(--c-text); }
.ms-export-modal-preview { padding: 16px; background: #f8f8f8; }
.ms-export-modal-preview img { width: 100%; height: auto; display: block; border-radius: var(--radius-md); box-shadow: 0 2px 16px rgba(74,63,53,0.08); }
.ms-export-modal-footer { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-top: 1px solid rgba(74,63,53,0.06); }
.ms-export-modal-hint { font-size: 11px; color: rgba(74,63,53,0.35); font-family: 'Segoe UI', system-ui, sans-serif; }
.ms-export-modal-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; background: var(--c-text); color: #fff; border-radius: var(--radius-pill); font-size: 12px; font-weight: 500; font-family: 'Segoe UI', system-ui, sans-serif; text-decoration: none; cursor: pointer; transition: background 0.2s, transform 0.15s; }
.ms-export-modal-btn:hover { background: #3a3229; transform: translateY(-1px); }
.ms-sol { padding: var(--sp-2xl) 0 0; background: var(--c-bg); }
.ms-sol-placed { display: grid; grid-template-columns: repeat(12, 1fr); column-gap: 20px; row-gap: 0; position: relative; max-width: 1400px; margin: 0 auto; padding: 0 var(--gutter); }
.ms-sol-c1 { grid-column: 2 / 7; grid-row: 1; padding-bottom: 48px; }
.ms-sol-c2 { grid-column: 8 / 12; grid-row: 1; padding-top: 360px; }
.ms-sol-photo { width: 100%; overflow: hidden; position: relative; }
.ms-sol-c1 .ms-sol-photo { aspect-ratio: 3 / 4; background: linear-gradient(145deg, #2c3e50 0%, #1a252f 40%, #34495e 100%); }
.ms-sol-c2 .ms-sol-photo { aspect-ratio: 4 / 5; background: linear-gradient(160deg, #4a3f35 0%, #2c2418 45%, #5c4f42 100%); }
.ms-sol-photo-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; color: rgba(255,255,255,0.4); font-weight: 400; }
.ms-sol-body { padding-top: 20px; display: flex; flex-direction: column; gap: 8px; }
.ms-sol-name { font-size: clamp(22px, 2.2vw, 28px); font-weight: 400; letter-spacing: -0.015em; color: var(--c-text); line-height: 1.15; }
.ms-sol-text { font-size: 14px; color: rgba(74,63,53,0.5); line-height: 1.6; font-weight: 400; max-width: 380px; }
.ms-sol-arrow { font-size: 18px; color: var(--c-text); margin-top: 6px; cursor: pointer; display: inline-block; transition: transform 0.3s ease; align-self: flex-start; }
.ms-sol-arrow:hover { transform: translateX(4px); }
.ms-sol-test { display: grid; grid-template-columns: repeat(12, 1fr); column-gap: 20px; align-items: center; padding: var(--sp-2xl) var(--gutter) var(--sp-2xl); position: relative; max-width: 1400px; margin: 0 auto; }
.ms-sol-test-content { grid-column: 1 / 7; display: flex; flex-direction: column; gap: 32px; position: relative; }
.ms-sol-test-quote-wrap { display: block; position: relative; }
.ms-sol-test-marks { position: absolute; left: -0.6em; top: 0; font-size: clamp(22px, 2.4vw, 30px); font-weight: 400; color: var(--c-text); line-height: 1.35; user-select: none; }
.ms-sol-test-quote { font-size: clamp(22px, 2.4vw, 30px); font-weight: 400; letter-spacing: -0.015em; line-height: 1.35; color: var(--c-text); }
.ms-sol-test-attr { display: flex; flex-direction: column; gap: 8px; }
.ms-sol-test-name { font-size: 15px; font-weight: 400; color: var(--c-text); letter-spacing: -0.01em; }
.ms-sol-test-role { font-size: 15px; color: var(--c-text); line-height: 1.5; font-weight: 400; letter-spacing: -0.01em; }
.ms-sol-test-portrait { grid-column: 8 / 11; width: 100%; aspect-ratio: 3 / 4; border-radius: var(--radius-md); background: #b5a99a; overflow: hidden; position: relative; }
.ms-sol-test-portrait-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase; color: rgba(255,255,255,0.4); }
.ms-sol-placed-c3 { padding-bottom: var(--sp-2xl); }
.ms-sol-c3 { grid-column: 3 / 12; grid-row: 1; }
.ms-sol-c3 .ms-sol-photo { aspect-ratio: 16 / 7; }

.ms-gallery { padding: var(--section-gap) 0; background: var(--c-bg); overflow: hidden; position: relative; z-index: 10; }
.ms-gallery-inner { position: relative; max-width: 100%; }
.ms-gallery-headline { text-align: left; margin-bottom: var(--sp-2xl); position: relative; z-index: 2; }
.ms-gallery-headline h2 { font-size: clamp(40px, 5.5vw, 80px); font-weight: 400; letter-spacing: -0.04em; line-height: 0.92; color: var(--c-text); display: inline-block; }
.ms-gallery-stage { max-width: 100%; margin: 0 auto; padding: 0 var(--gutter); }

/* ── Video Player ── */
.ms-video-container { position: relative; width: 100%; border-radius: var(--radius-xl); overflow: hidden; background: #0a0a0a; cursor: pointer; }
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
.ms-video-ctrl-btn { background: none; border: none; color: #fff; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; opacity: 0.85; transition: opacity 0.15s; }
.ms-video-ctrl-btn:hover { opacity: 1; }
.ms-video-time { font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.7); font-family: 'Segoe UI', system-ui, sans-serif; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }
.ms-video-spacer { flex: 1; }
.ms-video-title-bar { position: absolute; top: 0; left: 0; right: 0; z-index: 3; display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; opacity: 0; transition: opacity 0.3s; pointer-events: none; }
.ms-video-container.playing .ms-video-title-bar,
.ms-video-container.paused .ms-video-title-bar { opacity: 1; pointer-events: auto; }
.ms-video-label { font-size: 11px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.5); font-family: 'Segoe UI', system-ui, sans-serif; }

/* ── Video Tabs ── */
.ms-video-tabs { display: flex; gap: 6px; margin-top: var(--sp-sm); flex-wrap: wrap; }
.ms-video-tab { padding: 8px 18px; border-radius: var(--radius-pill); background: rgba(74,63,53,0.04); border: 1px solid rgba(74,63,53,0.06); font-size: 12px; font-weight: 500; color: rgba(74,63,53,0.55); font-family: 'Segoe UI', system-ui, sans-serif; cursor: pointer; transition: all 0.25s cubic-bezier(0.22,1,0.36,1); letter-spacing: 0.01em; }
.ms-video-tab:hover { background: rgba(74,63,53,0.07); color: var(--c-text); }
.ms-video-tab.active { background: var(--c-text); color: #fff; border-color: var(--c-text); }
@media (max-width: 768px) {
:root { --gutter: 24px; --section-gap: 48px; --radius-xl: 32px; }
.ms-gallery-headline { margin-bottom: var(--sp-xl); }
.ms-gallery-stage { padding: 0 var(--sp-sm); }
.ms-video-container { border-radius: var(--radius-lg); }
.ms-video-play { width: 56px; height: 56px; }
.ms-video-tabs { gap: 4px; }
.ms-video-tab { padding: 6px 14px; font-size: 11px; }
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
.bm-chip:hover { border-color: rgba(74,63,53,0.3); }
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
.bm-shelf-budget-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(74,63,53,0.25); font-weight: 400; }
.bm-shelf-budget-track { position: relative; width: 64px; height: 2px; }
.bm-shelf-budget-track-bg { position: absolute; inset: 0; background: rgba(74,63,53,0.06); border-radius: 1px; }
.bm-shelf-budget-track-fill { position: absolute; top: 0; left: 0; height: 100%; background: var(--c-text); border-radius: 1px; transition: width 0.08s ease; }
.bm-shelf-budget-track input { position: absolute; inset: -8px 0; width: 100%; height: 18px; -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; margin: 0; padding: 0; }
.bm-shelf-budget-track input::-webkit-slider-thumb { -webkit-appearance: none; width: 10px; height: 10px; background: var(--c-text); border-radius: 50%; cursor: grab; border: none; }
.bm-shelf-budget-track input::-webkit-slider-thumb:hover { transform: scale(1.3); }
.bm-shelf-budget-track input::-moz-range-thumb { width: 10px; height: 10px; background: var(--c-text); border-radius: 50%; cursor: grab; border: none; }
.bm-shelf-budget-val { font-size: 11px; color: var(--c-text); font-variant-numeric: tabular-nums; font-weight: 400; }
.bm-shelf-sep { width: 1px; height: 16px; background: rgba(74,63,53,0.06); margin: 0 6px; flex-shrink: 0; }
.bm-preset { border: 1px solid rgba(74,63,53,0.08); background: transparent; padding: 6px 16px; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; border-radius: 100px; font-family: ${FONT}; color: rgba(74,63,53,0.3); font-weight: 400; transition: all 0.2s; white-space: nowrap; }
.bm-preset:hover { border-color: rgba(74,63,53,0.2); color: rgba(74,63,53,0.5); }
.bm-preset.active { background: var(--c-text); color: #fff; border-color: var(--c-text); }
.bm-shelf-alloc { font-size: 11px; color: rgba(74,63,53,0.25); margin-left: auto; font-weight: 400; }

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

function ParallaxMedia({ children, className = "", style = {}, scaleFrom = 0.88, scaleTo = 1, radiusFrom = 40, radiusTo = 24 }) {
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

function PixelHero({ setNavOverlay, exportCanvasRef, brushRef, clearRef }) {
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
      W = p.clientWidth; H = p.clientHeight;
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

    const ND = [
      { num: "01", label: "REACH",    big: "1B+",  sub: "monthly users",        px: 0.50, py: 0.05, c: NAVY,   r: 14 },
      { num: "02", label: "COPILOT",  big: "73%",  sub: "higher CTR",           px: 0.32, py: 0.18, c: GREEN,  r: 13 },
      { num: "03", label: "PMAX",     big: "AI",   sub: "omnichannel",          px: 0.68, py: 0.18, c: CORAL,  r: 13 },
      { num: "04", label: "LINKEDIN", big: "B2B",  sub: "exclusive targeting",  px: 0.30, py: 0.36, c: BROWN,  r: 12 },
      { num: "05", label: "CPC",      big: "–50%", sub: "avg savings",          px: 0.70, py: 0.36, c: GREEN,  r: 12 },
      { num: "06", label: "AUDIENCE", big: "70%",  sub: "aged 35–65",           px: 0.28, py: 0.54, c: GOLD,   r: 13 },
      { num: "07", label: "AGENTS",   big: "294%", sub: "purchase lift",        px: 0.72, py: 0.54, c: CLAY,   r: 13 },
      { num: "08", label: "CTV",      big: "2×",   sub: "budget growth",        px: 0.10, py: 0.74, c: SAND,   r: 12 },
      { num: "09", label: "CLARITY",  big: "→",    sub: "behavior analytics",   px: 0.36, py: 0.68, c: SAGE,   r: 11 },
      { num: "10", label: "IMPORT",   big: "1",    sub: "click migration",      px: 0.64, py: 0.68, c: NAVY,   r: 11 },
      { num: "11", label: "COMMERCE", big: "1P",   sub: "retail data",          px: 0.90, py: 0.74, c: LILAC,  r: 12 },
      { num: "12", label: "SHOWROOM", big: "AI",   sub: "immersive ads",        px: 0.50, py: 0.84, c: CORAL,  r: 14 },
    ];

    let nodes = [];
    const DISC_R = 40;

    const HIDDEN = [
      { px: 0.36, py: 0.80, big: "550M",  sub: "MSN monthly active",     c: CORAL,  label: "MSN",       title: "MSN Network",         unit: "monthly active users",    lines: ["One of the top 5 portals globally", "News · Finance · Sports · Weather", "Premium display inventory", "High-viewability placements"] },
      { px: 0.64, py: 0.82, big: "42%",   sub: "CPC discount avg",       c: GOLD,   label: "SAVINGS",   title: "CPC Savings",         unit: "average discount",        lines: ["Lower competition, better rates", "Less bidding pressure per keyword", "Higher ROAS per dollar spent", "Especially strong in B2B verticals"] },
      { px: 0.28, py: 0.92, big: "$19B",  sub: "ad revenue 2025",        c: CORAL,  label: "REVENUE",   title: "Ad Revenue",          unit: "annual 2025",             lines: ["Fastest growing major ad platform", "Search + Display + LinkedIn", "40% year-over-year growth", "Gaming & CTV driving new spend"] },
      { px: 0.72, py: 0.94, big: "16",    sub: "languages supported",    c: GOLD,   label: "LANGUAGES", title: "Global Languages",    unit: "languages supported",     lines: ["Copilot campaign tools multilingual", "Auto-translation for ad copy", "Local market optimization", "Expanding quarterly"] },
      { px: 0.50, py: 0.96, big: "33%",   sub: "shorter journeys",       c: SAND,   label: "JOURNEYS",  title: "Shorter Journeys",    unit: "faster conversion paths", lines: ["AI-optimized landing experiences", "Fewer clicks to purchase", "Copilot reduces decision friction", "Measured across all verticals"] },
      { px: 0.06, py: 0.06, big: "65%",   sub: "Fortune 500 on Azure AI",c: NAVY,   label: "ENTERPRISE", title: "Enterprise AI",      unit: "Fortune 500 on Azure",    lines: ["Deep integration with Azure stack", "First-party data activation", "Enterprise-grade compliance", "SSO & role-based access"] },
      { px: 0.94, py: 0.08, big: "80%",   sub: "B2B decision-makers",    c: GREEN,  label: "B2B",       title: "Decision Makers",     unit: "of audience are B2B",     lines: ["C-suite & senior management reach", "LinkedIn profile targeting", "Company size & industry filters", "Purchase intent signals"] },
      { px: 0.06, py: 0.40, big: "400M",  sub: "M365 commercial users",  c: NAVY,   label: "M365",      title: "Microsoft 365",       unit: "commercial users",        lines: ["Outlook · Teams · Office apps", "Native ad placements in workflow", "Professional context targeting", "Highest engagement during work hours"] },
      { px: 0.94, py: 0.42, big: "30",    sub: "partner markets",        c: GREEN,  label: "MARKETS",   title: "Partner Markets",     unit: "countries with partners",  lines: ["Global agency partnerships", "Local market expertise included", "Currency & timezone optimization", "Dedicated market support teams"] },
      { px: 0.05, py: 0.90, big: "53%",   sub: "purchase lift via Copilot", c: NAVY, label: "COPILOT+", title: "Copilot Commerce",  unit: "purchase lift",           lines: ["AI-assisted product discovery", "Conversational shopping in Copilot", "Personalized recommendations", "Brands embedded in AI answers"] },
      { px: 0.95, py: 0.62, big: "1P",    sub: "retailer data access",   c: GREEN,  label: "DATA",      title: "First-Party Data",    unit: "retailer data access",    lines: ["PromoteIQ retail media network", "Verified purchase data", "Closed-loop attribution", "Non-endemic brand access"] },
      { px: 0.08, py: 0.22, big: "22%",   sub: "more online spend",      c: GOLD,   label: "SPEND",     title: "Higher Spend",        unit: "more online spend",       lines: ["Microsoft audience outspends avg", "35–65 age bracket most active", "Desktop & mobile combined", "Premium product categories"] },
      { px: 0.40, py: 0.10, big: "→",     sub: "easy campaign import",    c: NAVY,   label: "MIGRATE",   title: "Easy Migration",      unit: "one-click import",        lines: ["Import existing campaigns instantly", "Import from Meta & Pinterest too", "Budget & bid mapping included", "Go live in under 30 minutes"] },
      { px: 0.60, py: 0.28, big: "2×",    sub: "ROAS with Epsilon",      c: CLAY,   label: "ROAS",      title: "Return on Ad Spend",  unit: "with Epsilon integration", lines: ["Epsilon identity resolution", "Cross-device attribution", "Offline-to-online measurement", "Proven across retail & CPG"] },
      { px: 0.42, py: 0.46, big: "360M",  sub: "Teams monthly active",   c: NAVY,   label: "TEAMS",     title: "Microsoft Teams",     unit: "monthly active users",    lines: ["Ad placements in Teams feed", "Professional audience context", "Meeting & chat adjacent", "Growing enterprise channel"] },
      { px: 0.58, py: 0.58, big: "Xbox",  sub: "gaming ad placements",   c: GREEN,  label: "GAMING",    title: "Gaming Ads",          unit: "Xbox & PC gaming",        lines: ["In-game ad placements", "Candy Crush · Solitaire · Minecraft", "200M+ monthly gamers", "Non-skippable high-attention formats"] },
      { px: 0.84, py: 0.26, big: "AI",    sub: "audio ads in Copilot Daily", c: NAVY, label: "AUDIO", title: "Audio Ads",          unit: "Copilot Daily podcast",   lines: ["AI-generated daily briefings", "Sponsored audio segments", "Personalized to listener interests", "New format launching 2025"] },
      { px: 0.16, py: 0.64, big: "$100K+",sub: "33% household income",   c: GOLD,   label: "INCOME",    title: "High Earners",        unit: "household income $100K+", lines: ["33% of Microsoft audience", "Premium purchasing power", "Higher-income demographic skew", "Luxury · Finance · Tech verticals"] },
    ];
    const HIDDEN_R = 22;

    let hiddenNodes = [];

    function layoutHidden() {
      hiddenNodes = HIDDEN.map((d, i) => ({
        ...d,
        x: d.px * W, y: d.py * H,
        found: hiddenNodes[i] ? hiddenNodes[i].found : false,
        foundT: hiddenNodes[i] ? hiddenNodes[i].foundT : 0,
        prog: hiddenNodes[i] ? hiddenNodes[i].prog : 0,
      }));
    }

    function layout() {
      nodes = ND.map((d, i) => ({
        ...d,
        x: d.px * W, y: d.py * H,
        discovered: nodes[i] ? nodes[i].discovered : false,
        discT: nodes[i] ? nodes[i].discT : 0,
        prog: nodes[i] ? nodes[i].prog : 0,
      }));
      layoutHidden();
    }

    if (clearRef) clearRef.current = () => {
      bCtx.clearRect(0, 0, buffer.width, buffer.height);
      nodes.forEach(n => { n.discovered = false; n.discT = 0; n.prog = 0; });
      hiddenNodes.forEach(h => { h.found = false; h.foundT = 0; h.prog = 0; });
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

    const COLOR_PAIRS = {
          [SAGE]: GREEN, [GREEN]: SAGE, [SAND]: CLAY, [CLAY]: SAND,
          [GOLD]: BROWN, [BROWN]: GOLD, [LILAC]: NAVY, [NAVY]: LILAC,
          [WARM]: BROWN, [CORAL]: BROWN,
        };

    const expanded = {
      active: false,
      nodeIdx: -1,
      prog: 0,        /* 0→1 circle expansion */
      contentProg: 0,  /* 0→1 text fade-in */
      closing: false,
    };

    const richContent = [
      { title: "Reach", stat: "1B+", para: "Microsoft Advertising connects you to over one billion monthly users across Bing, Yahoo, DuckDuckGo, AOL, Outlook, Xbox, MSN and Edge. 66 million of these users are unreachable on any other platform. That's 23% of US search volume — premium, high-intent traffic your competitors are missing." },
      { title: "Copilot", stat: "73%", para: "Microsoft Copilot transforms campaign management with AI-powered creation, natural language diagnostics and real-time optimization. Tasks that once took 30 minutes now take one or two. Advertisers using Copilot see 73% higher click-through rates — and the tool is free for every account." },
      { title: "Performance Max", stat: "AI", para: "Performance Max uses AI to dynamically assemble your ads across the entire Microsoft network — Search, Display, Native, Video and Audience. It pulls in LinkedIn profile targeting automatically, optimizes bidding in real time and distributes budget where conversion probability is highest." },
      { title: "LinkedIn", stat: "B2B", para: "Only Microsoft Advertising offers LinkedIn profile targeting — job title, company, industry and seniority — powered by the $26.2 billion acquisition. B2B engagement has grown 55% in two years. No other ad platform gives you this level of professional audience precision." },
      { title: "Lower CPC", stat: "–50%", para: "Microsoft Advertising delivers significantly cheaper cost per click, with roughly half the advertiser competition. Average CPCs run around £1.17 across key verticals. Less noise, higher conversion rates, and significantly better return on every dollar spent." },
      { title: "Audience", stat: "70%", para: "70% of Microsoft's search audience is aged 35 to 65 — peak earning years. One in three earns over $100,000 in household income, they spend 22% more online than average and 80% are B2B decision-makers. This is the audience that signs purchase orders." },
      { title: "Brand Agents", stat: "294%", para: "Brand Agents are AI-powered shopping assistants that live on your site and inside Copilot. They guide customers through conversational product discovery in real time, delivering personalized recommendations. Early results show a 294% increase in purchase intent and 53% lift in completed transactions." },
      { title: "Video & CTV", stat: "2×", para: "Connected TV advertising through Microsoft reaches audiences on Xbox consoles, PC and mobile — including placements in Candy Crush and Microsoft Casual Games. CTV budgets across the platform have doubled between 2023 and 2025 as advertisers discover high-attention, non-skippable formats." },
      { title: "Clarity", stat: "→", para: "Microsoft Clarity gives you free session replays and heatmaps filtered by campaign, ad group and keyword. See exactly where users click, scroll and drop off after arriving from your ads. Post-click friction analysis is built directly into the Microsoft Advertising dashboard." },
      { title: "Easy Import", stat: "1", para: "Import your existing campaigns in a single click. Budget mapping, bid strategies and brand assets transfer automatically. Most advertisers go live in under 30 minutes — same campaigns, new premium audience, zero rebuild." },
      { title: "Commerce", stat: "1P", para: "Curate for Commerce gives brands direct access to retailer first-party purchase data. Sponsored Promotions place products inside retailer experiences with verified transaction signals. Even non-endemic advertisers can reach high-intent shoppers with closed-loop attribution." },
      { title: "Showroom Ads", stat: "AI", para: "Showroom Ads create immersive, AI-generated product exploration experiences directly inside Copilot chat. Customers compare options, read contextual reviews and interact with rich product detail — all without leaving the conversation. Early tests show transformative engagement metrics." },
    ];

    const press = { active: false };

    const hitTestAny = (mx, my, radius) => {
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!n.discovered || n.prog < 0.5) continue;
        const dx = mx - n.x, dy = my - n.y;
        if (dx*dx + dy*dy < radius * radius) return { type: "node", idx: i };
      }
      for (let i = 0; i < hiddenNodes.length; i++) {
        const h = hiddenNodes[i];
        if (!h.found || h.prog < 0.5) continue;
        const dx = mx - h.x, dy = my - h.y;
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
        expanded.closing = true;
        return;
      }
      if (expanded.active) return;

      const HIT = 30;
      const hit = hitTestAny(mx, my, HIT);
      if (hit) {
        expanded.active = true;
        expanded.nodeIdx = hit.idx;
        expanded.isHidden = hit.type === "hidden";
        expanded.prog = 0;
        expanded.contentProg = 0;
        expanded.closing = false;
        setIsExpanded(true);
        const nd = hit.type === "hidden" ? hiddenNodes[hit.idx] : nodes[hit.idx];
        expanded.originX = nd.x;
        expanded.originY = nd.y;
        return;
      }

      press.active = true;
    };
    const onUp = () => { press.active = false; };

    const onMove = (e) => {
      if (expanded.active) return;
      const tracing = brushRef?.current?.traceMode;
      const isDrawing = e.touches || (e.buttons & 1) || tracing;
      const r = canvas.getBoundingClientRect();
      const mx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      const my = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
      const now = performance.now();

      const overNode = !!hitTestAny(mx, my, 30);
      canvas.parentElement.style.cursor = overNode ? "pointer" : "crosshair";

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

      nodes.forEach((n, i) => {
        const target = n.discovered ? 1 : 0;
        n.prog += (target - n.prog) * 0.06;
        const p = n.prog;

        if (!n.discovered) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = BLK;
          ctx.fill();
          return;
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * p, 0, Math.PI * 2);
        ctx.fillStyle = n.c;
        ctx.fill();

        if (p < 0.5) return;
        const a1 = Math.min(1, (p - 0.5) / 0.3);
        ctx.globalAlpha = a1;

        const sz = Math.round(13 * p);
        const fnt = `400 ${sz}px "Segoe UI", system-ui, sans-serif`;
        ctx.font = fnt;
        ctx.fillStyle = BLK;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(n.num, n.x + n.r * p + 8, n.y - 14 * p);

        if (p < 0.7) { ctx.globalAlpha = 1; return; }
        const a2 = Math.min(1, (p - 0.7) / 0.2);
        ctx.globalAlpha = a2;

        ctx.font = fnt;
        ctx.fillText(n.big, n.x + n.r * p + 8, n.y + 4 * p);

        if (p < 0.85) { ctx.globalAlpha = 1; return; }
        const a3 = Math.min(1, (p - 0.85) / 0.15);
        ctx.globalAlpha = a3;

        ctx.font = fnt;
        ctx.fillText(n.sub, n.x + n.r * p + 8, n.y + 22 * p);

        ctx.globalAlpha = a3;
        ctx.font = fnt;
        ctx.letterSpacing = "1px";
        ctx.fillText(n.label, n.x + n.r * p + 8, n.y + 40 * p);
        ctx.letterSpacing = "0px";

        ctx.globalAlpha = 1;
      });

      hiddenNodes.forEach((h) => {
        h.x = h.px * W; h.y = h.py * H;
        if (!h.found) return;

        const target = 1;
        h.prog += (target - h.prog) * 0.06;
        const p = h.prog;
        if (p < 0.05) return;

        ctx.beginPath();
        ctx.arc(h.x, h.y, 13 * p, 0, Math.PI * 2);
        ctx.fillStyle = h.c;
        ctx.fill();

        if (p < 0.5) return;
        const a1 = Math.min(1, (p - 0.5) / 0.3);
        ctx.globalAlpha = a1;

        const sz = Math.round(13 * p);
        const fnt = `400 ${sz}px "Segoe UI", system-ui, sans-serif`;
        ctx.font = fnt;
        ctx.fillStyle = BLK;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(h.big, h.x + 18, h.y - 10);

        if (p < 0.7) { ctx.globalAlpha = 1; return; }
        const a2 = Math.min(1, (p - 0.7) / 0.3);
        ctx.globalAlpha = a2;

        ctx.font = fnt;
        ctx.fillText(h.sub, h.x + 18, h.y + 8);
        ctx.globalAlpha = 1;
      });

      if (expanded.active) {
        let nd, rc;
        if (expanded.isHidden) {
          const h = hiddenNodes[expanded.nodeIdx];
          nd = h;
          rc = { title: h.title, stat: h.big, para: h.lines.join(". ") + "." };
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

            const ba = Math.max(0, Math.min(1, cp / 0.3));
            ctx.globalAlpha = ba * 0.6;
            ctx.fillStyle = txtC;
            const backSize = Math.min(13, Math.max(10, W * 0.01));
            const backX = colX(0);
            const backY = H * 0.08;
            ctx.font = `400 ${backSize}px "Segoe UI", system-ui, sans-serif`;
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText("\u2190  Back", backX, backY);
            ctx.textBaseline = "alphabetic";
            ctx.globalAlpha = 1;

            const la1 = Math.max(0, Math.min(1, cp / 0.25));
            ctx.globalAlpha = la1;
            const headSize = Math.min(22, Math.max(15, W * 0.016));
            ctx.font = `${FW} ${headSize}px "Segoe UI", system-ui, sans-serif`;
            const headY = H * 0.32;
            ctx.fillText((nd.num || "●") + " - " + (rc.title || nd.label || ""), colX(0), headY);

            const paraSize = Math.min(22, Math.max(15, W * 0.016));
            const LH = paraSize * 1.65;
            const maxTW = colW(6);
            ctx.font = `${FW} ${paraSize}px "Segoe UI", system-ui, sans-serif`;

            const paraLines = wrapText(ctx, rc.para, maxTW);

            const paraY0 = headY + LH + 16;
            paraLines.forEach((pl, pi) => {
              const pla = Math.max(0, Math.min(1, (cp - 0.06 - pi * 0.008) / 0.35));
              ctx.globalAlpha = pla;
              ctx.fillStyle = txtC;
              ctx.fillText(pl, colX(0), paraY0 + pi * LH);
            });

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
          ctx.globalAlpha = hintAlpha;
          ctx.font = `400 13px "Segoe UI", system-ui, sans-serif`;
          ctx.fillStyle = BLK;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText("click & drag to explore", W / 2, H * 0.48);
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

  return <canvas ref={canvasRef} className="ms-hero-canvas" style={isExpanded ? { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 9999 } : {}} />;
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
      <span className="ms-marquee-item" key={i}>
        {s}
        <span className="ms-marquee-arrow">→</span>
      </span>
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
        <span style={{ display: "block", fontSize: 11, color: "rgba(74,63,53,0.35)", marginBottom: 32 }}>03 — Solutions</span>
      </div>

      {/* Two asymmetric cards on 12-col grid */}
      <div className="ms-sol-placed">
        {/* Card 1 — wider, landscape, sits higher, skips col 1 */}
        <div className="ms-sol-c1">
          <ScrollReveal y={30} delay={0}>
            <ParallaxMedia className="ms-sol-photo" scaleFrom={0.9} scaleTo={1} radiusFrom={40} radiusTo={24}>
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
            <ParallaxMedia className="ms-sol-photo" scaleFrom={0.9} scaleTo={1} radiusFrom={40} radiusTo={24}>
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
          <ParallaxMedia className="ms-sol-test-portrait" scaleFrom={0.92} scaleTo={1} radiusFrom={32} radiusTo={24}>
            <img src="/assets/images/testimonial.png" alt="James Thompson" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </ParallaxMedia>
        </div>
      </ScrollReveal>

      {/* Card 3 — wide landscape after quote, asymmetric offset */}
      <ScrollReveal y={30} delay={0}>
        <div className="ms-sol-placed ms-sol-placed-c3">
          <div className="ms-sol-c3">
            <ParallaxMedia className="ms-sol-photo" scaleFrom={0.9} scaleTo={1} radiusFrom={40} radiusTo={24}>
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
              <div className="ms-sol-name">Video & Connected TV</div>
              <div className="ms-sol-text">
                Reach cord-cutters across premium, brand-safe environments — Xbox, MSN, and partner networks — with full-screen, non-skippable placements.
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
          ctx.font = `400 8px ${FONT}`;
          ctx.fillStyle = `rgba(74,63,53,${statsAlpha * 0.2})`;
          ctx.letterSpacing = "1px";
          ctx.fillText(sd.label.toUpperCase(), W - pad, statY + valSize + 2);
          ctx.letterSpacing = "0px";
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
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeGoal, setActiveGoal] = useState(null); /* Which goal drives scoring */
  const [actionLog, setActionLog] = useState([]); /* { text, grade, time } */

  /* ── Budget allocation phase (post-generate) ── */
  const [budgetPhase, setBudgetPhase] = useState(false);
  const [bmEnabled, setBmEnabled] = useState([]);
  const [bmSliders, setBmSliders] = useState({ search: 0, audience: 0, shopping: 0, video: 0, linkedin: 0 });
  const [bmBudget, setBmBudget] = useState(5000);
  const [bmHovIdx, setBmHovIdx] = useState(-1);
  const bmAnimBars = useRef({});
  const bmAnimStats = useRef({ reach: 0, impressions: 0, conversions: 0 });
  const bmTitleTrans = useRef(0);

  const posOverrides = useRef({});
  const [canvasDrag, setCanvasDrag] = useState(null); /* { id, offsetX, offsetY } */
  const [dragTick, setDragTick] = useState(0);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const [canvasDragPos, setCanvasDragPos] = useState({ x: 0, y: 0 }); /* global mouse pos during canvas drag */
  const trashRef = useRef(null);

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
    g1:["reach","impressions","SOV","frequency"],g2:["forms","leads","MQLs","pipeline"],
    g3:["cart","checkout","ROAS","revenue"],g4:["CTR","visits","bounce","sessions"],
    g5:["installs","CPI","engagement","retention"],c1:["keywords","RSA","broad match","ad rank"],
    c2:["native","MSN","Edge","Outlook"],c3:["feed","catalog","PLA","merchant"],
    c4:["auto-bid","multi-channel","Copilot","AI"],c5:["CTV","pre-roll","completion","viewability"],
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
      d.endY = cvr.top + cvr.height * 0.62;
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

    ctx.fillStyle = "#f5f0e8";
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

      // Strategy name + stat (compact, top-left)
      if (summary && summary.name) {
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.font = `400 11px ${FONT}`;
        ctx.fillStyle = "rgba(74,63,53,0.18)";
        ctx.letterSpacing = "1px";
        ctx.fillText("YOUR STRATEGY", bPad, bPad);
        ctx.letterSpacing = "0px";

        const nameSz = Math.min(28, Math.max(20, W * 0.022));
        ctx.font = `400 ${nameSz}px ${FONT}`;
        ctx.fillStyle = "rgba(74,63,53,0.85)";
        ctx.letterSpacing = "-0.5px";
        ctx.fillText(summary.name, bPad, bPad + 18);
        ctx.letterSpacing = "0px";

        if (summary.line) {
          ctx.font = `400 12px ${FONT}`;
          ctx.fillStyle = "rgba(74,63,53,0.3)";
          ctx.fillText(summary.line, bPad, bPad + 18 + nameSz + 6);
        }
      } else {
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.font = `400 11px ${FONT}`;
        ctx.fillStyle = "rgba(74,63,53,0.18)";
        ctx.letterSpacing = "1px";
        ctx.fillText("ALLOCATE BUDGET", bPad, bPad);
        ctx.letterSpacing = "0px";

        const nameSz = Math.min(28, Math.max(20, W * 0.022));
        ctx.font = `400 ${nameSz}px ${FONT}`;
        ctx.fillStyle = "rgba(74,63,53,0.7)";
        ctx.letterSpacing = "-0.5px";
        ctx.fillText("Adjust your spend", bPad, bPad + 18);
        ctx.letterSpacing = "0px";
      }

      // Stats — top right
      const as = bmAnimStats.current;
      as.reach += (bmStats.reach - as.reach) * 0.08;
      as.impressions += (bmStats.impressions - as.impressions) * 0.08;
      as.conversions += (bmStats.conversions - as.conversions) * 0.08;

      const statData = [
        { val: bmFormatNum(as.reach), label: "Reach" },
        { val: bmFormatNum(as.impressions), label: "Impressions" },
        { val: (Math.round(as.conversions)) + "K", label: "Conversions" },
      ];
      ctx.textAlign = "right";
      let statY = bPad;
      statData.forEach((sd) => {
        const valSize = Math.min(44, Math.max(28, W * 0.035));
        ctx.font = `300 ${valSize}px ${FONT}`;
        ctx.fillStyle = `rgba(74,63,53,0.9)`;
        ctx.textBaseline = "top";
        ctx.letterSpacing = "-1px";
        ctx.fillText(sd.val, W - bPad, statY);
        ctx.letterSpacing = "0px";
        ctx.font = `400 8px ${FONT}`;
        ctx.fillStyle = `rgba(74,63,53,0.2)`;
        ctx.letterSpacing = "1px";
        ctx.fillText(sd.label.toUpperCase(), W - bPad, statY + valSize + 2);
        ctx.letterSpacing = "0px";
        statY += valSize + 22;
      });

      // Stat badge — between title and chart
      if (summary && summary.stat) {
        const badgeY = bPad + 70;
        const statSz = Math.min(64, Math.max(36, W * 0.05));
        ctx.font = `300 ${statSz}px ${FONT}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillStyle = "rgba(74,63,53,0.9)";
        ctx.letterSpacing = "-2px";
        ctx.fillText(summary.stat, bPad, badgeY);
        const statW = ctx.measureText(summary.stat).width;
        ctx.letterSpacing = "0px";
        if (summary.statLabel) {
          ctx.font = `400 11px ${FONT}`;
          ctx.fillStyle = "rgba(74,63,53,0.25)";
          ctx.letterSpacing = "0.5px";
          ctx.fillText(summary.statLabel.toUpperCase(), bPad + statW + 12, badgeY + statSz - 14);
          ctx.letterSpacing = "0px";
        }
      }

      // ── Chart area ──
      const statsZoneH = bPad + Math.min(44, Math.max(28, W * 0.035)) * 3 + 22 * 3 + 20;
      const chartPad = { top: statsZoneH, right: bPad, bottom: 40, left: bPad };
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
          ctx.fillText((bmSliders[ch.id] || 0) + "%", groupX + groupW / 2, chartB + 22);

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
      }

      // Keep animating
      animFrameRef.current = requestAnimationFrame(() => setDragTick(t => t + 1));

    } else if (summary && summary.name && !budgetPhase) {
      const cardM = 12, cardR = 14, gx = 56;
      const cardX = cardM, cardY = cardM;
      const cardW = W - cardM * 2, cardH = H - cardM * 2;

      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, cardR);
      ctx.fillStyle = "#4a3f35";
      ctx.fill();

      const L = cardX + gx, R = cardX + cardW - gx;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      ctx.font = `400 13px ${FONT}`;
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.letterSpacing = "1px";
      ctx.fillText("STRATEGY", L, cardY + gx);
      ctx.letterSpacing = "0px";

      const nameSz = Math.min(28, Math.max(18, W * 0.02));
      ctx.font = `400 ${nameSz}px ${FONT}`;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.letterSpacing = "-0.5px";
      ctx.fillText(summary.name, L, cardY + gx + 22);
      ctx.letterSpacing = "0px";

      const statSz = Math.min(180, Math.max(96, W * 0.13));
      const statText = summary.stat || "";
      ctx.font = `300 ${statSz}px ${FONT}`;
      const statMW = ctx.measureText(statText).width;
      const statY = cardY + (cardH - statSz) * 0.42;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.letterSpacing = "-4px";
      ctx.fillText(statText, L, statY);
      ctx.letterSpacing = "0px";

      if (summary.statLabel) {
        const lSz = Math.min(15, Math.max(12, W * 0.011));
        ctx.font = `400 ${lSz}px ${FONT}`;
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        if (statMW + 232 < R - L) {
          ctx.textBaseline = "bottom";
          ctx.fillText(summary.statLabel, L + statMW + 24, statY + statSz - 8);
          ctx.textBaseline = "top";
        } else {
          ctx.fillText(summary.statLabel, L, statY + statSz + 8);
        }
      }

      if (summary.line) {
        const lnSz = Math.min(16, Math.max(13, W * 0.012));
        const lnY = statY + statSz + (summary.statLabel && !(statMW + 232 < R - L) ? 36 : 16);
        ctx.font = `400 ${lnSz}px ${FONT}`;
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        wrapText(ctx, summary.line, Math.min(R - L, 600)).forEach((l, i) => {
          ctx.fillText(l, L, lnY + i * lnSz * 1.6);
        });
      }

      if (summary.action) {
        ctx.font = `400 12px ${FONT}`;
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.letterSpacing = "0.5px";
        ctx.fillText("\u2192  " + summary.action, L, cardY + cardH - gx);
        ctx.letterSpacing = "0px";
      }

    } else {
      // ── Unified title: smoothly transitions between empty (big) and compact (small) ──
      const targetT = (hasNodes || dragging) ? 1 : 0;
      const speed = targetT > titleTransRef.current ? 0.045 : 0.06; // slightly faster collapse back
      titleTransRef.current += (targetT - titleTransRef.current) * speed;
      // Clamp to avoid sub-pixel jitter
      if (Math.abs(titleTransRef.current - targetT) < 0.002) titleTransRef.current = targetT;
      const tt = titleTransRef.current;

      // Interpolated sizes
      const tt_clamped = tt;

      // "02" overline
      const numAlpha = 0.2 - tt * 0.02;
      ctx.font = `400 11px ${FONT}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = `rgba(74,63,53,${numAlpha})`;
      ctx.fillText("02 — Strategy Builder", pad, pad);

      // Editorial body text — same style as ecosystem/gallery sections
      const bodySize = Math.min(30, Math.max(20, W * 0.022));
      const bodySizeAnim = bodySize + (bodySize * 0.15) * (1 - tt); // slightly larger when empty
      const bodyAlpha = Math.max(0.3, 1 - tt * 0.7);
      const bodyY = pad + 32;
      const lineH = bodySizeAnim * 1.38;
      ctx.font = `400 ${bodySizeAnim}px ${FONT}`;
      ctx.fillStyle = `rgba(74,63,53,${bodyAlpha})`;
      ctx.letterSpacing = "-0.3px";

      // Word-wrap the text
      const bodyText = "Maximize your return on ad spend. Drag the nodes below to build your perfect strategy and see how Microsoft's tools work together.";
      const maxW = Math.min(W * 0.55, 620);
      const words = bodyText.split(" ");
      let line = "";
      let lines = [];
      for (const word of words) {
        const test = line ? line + " " + word : word;
        if (ctx.measureText(test).width > maxW && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      lines.forEach((l, i) => ctx.fillText(l, pad, bodyY + i * lineH));
      ctx.letterSpacing = "0px";

      // Keep animating while transitioning
      if (tt > 0.002 && tt < 0.998) {
        animFrameRef.current = requestAnimationFrame(() => setDragTick(t => t + 1));
      }

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
        const cpOff = Math.abs(tp.x - fp.x) * 0.35;
        const cp1x = fp.x + cpOff, cp1y = fp.y;
        const cp2x = tp.x - cpOff, cp2y = tp.y;
        const weight = l.weight || 1;

        const fromNode = placed.find(n => n.id === l.from);
        const toNode = placed.find(n => n.id === l.to);
        const linkBorn = Math.max(fromNode?.born || 0, toNode?.born || 0);
        const linkAge = Math.min(1, (now - linkBorn) / 600);

        const isConnected = hoveredNode && (l.from === hoveredNode || l.to === hoveredNode);
        const baseAlpha = weight === 3 ? 1 : weight === 2 ? 0.5 : 0.2;
        const lineAlpha = hoveredNode
          ? (isConnected ? 1 : 0.04)
          : baseAlpha;
        const lineWidth = isConnected ? 1.5 : weight === 3 ? 1 : weight === 2 ? 0.7 : 0.4;

        if (linkAge < 1) {
          const t = easeOutBack(Math.min(linkAge, 1));
          const steps = Math.max(2, Math.floor(t * 30));
          ctx.beginPath();
          for (let i = 0; i <= steps; i++) {
            const u = (i / steps) * t;
            const x = bezierPt(u, fp.x, cp1x, cp2x, tp.x);
            const y = bezierPt(u, fp.y, cp1y, cp2y, tp.y);
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

      const GRADE_COLORS = {
        optimal: "#1a8a3e", good: "#3a7ab5", weak: "#b08a30", poor: "#c44", neutral: "#4a3f35"
      };

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
        const grade = activeGoal && n.step !== "goal" ? gradeNode(activeGoal, n.id) : "neutral";

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
          ctx.fillStyle = "#f5f0e8";
          ctx.fillText("M", bx, by + 0.3);
        }

        if (activeGoal && grade !== "neutral" && age >= 1) {
          const gx = p.x - dims.w / 2 + 3;
          const gy = p.y - dims.h / 2 - 2;
          ctx.beginPath();
          ctx.arc(gx, gy, 3, 0, Math.PI * 2);
          ctx.fillStyle = GRADE_COLORS[grade];
          ctx.fill();
        }

        ctx.restore();
      });

      if (hoveredNode) {
        const hp = positions[hoveredNode];
        const info = NODE_INSIGHTS[hoveredNode];
        const hovGrade = activeGoal ? gradeNode(activeGoal, hoveredNode) : null;
        if (hp && info) {
          const insightX = hp.x - 60;
          const insightY = hp.y + 26;
          const maxW = 240;

          let curY = insightY;
          if (hovGrade && hovGrade !== "neutral") {
            const fb = getNodeFeedback(hovGrade, hoveredNode);
            ctx.font = `600 8px ${FONT}`;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillStyle = GRADE_COLORS[hovGrade];
            ctx.fillText(`${hovGrade.toUpperCase()}`, insightX, curY);
            const labelW = ctx.measureText(`${hovGrade.toUpperCase()}`).width;
            ctx.font = `400 8px ${FONT}`;
            ctx.fillStyle = "rgba(74,63,53,0.4)";
            ctx.fillText(` — ${fb}`, insightX + labelW, curY);
            curY += 14;
          }

          if (info.exclusive) {
            ctx.font = `600 7px ${FONT}`;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillStyle = "#4a3f35";
            ctx.fillText("✦ MICROSOFT EXCLUSIVE", insightX, curY);
            curY += 12;
          }

          ctx.font = `400 9px ${FONT}`;
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillStyle = "rgba(74,63,53,0.3)";
          const insightLines = wrapText(ctx, info.insight, maxW);
          insightLines.forEach((il, ii) => {
            ctx.fillText(il, insightX, curY + ii * 12);
          });
        }
      }

      if (placed.length >= 2) {
        const goalScore = activeGoal ? calcGoalScore(activeGoal, placed) : null;

        if (goalScore) {
          const sx = pad;
          const sy = H - pad;

          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
          const gradeColor = goalScore.letter === "S" ? "#1a8a3e" : goalScore.letter === "A" ? "#3a7ab5" : goalScore.letter === "B" ? "#4a3f35" : goalScore.letter === "F" ? "#c44" : "rgba(74,63,53,0.55)";
          ctx.font = `300 42px ${FONT}`;
          ctx.fillStyle = gradeColor;
          ctx.fillText(goalScore.letter, sx, sy);
          const letterW = ctx.measureText(goalScore.letter).width;

          ctx.font = `300 20px ${FONT}`;
          ctx.fillStyle = "#4a3f35";
          ctx.fillText(goalScore.total, sx + letterW + 4, sy);

          const barX = sx + letterW + 4 + ctx.measureText(goalScore.total.toString()).width + 16;
          const barW = 80;
          const barY = sy - 6;
          ctx.fillStyle = "rgba(74,63,53,0.06)";
          ctx.fillRect(barX, barY, barW, 2);
          ctx.fillStyle = gradeColor;
          ctx.fillRect(barX, barY, barW * (goalScore.coherence / 100), 2);
          ctx.font = `400 7px ${FONT}`;
          ctx.fillStyle = "rgba(74,63,53,0.3)";
          ctx.textBaseline = "top";
          ctx.fillText(`${goalScore.coherence}%`, barX + barW + 6, barY - 3);

          ctx.font = `600 8px ${FONT}`;
          ctx.fillStyle = "rgba(74,63,53,0.25)";
          ctx.textBaseline = "top";
          ctx.letterSpacing = "1px";
          ctx.fillText(goalScore.goalLabel.toUpperCase(), sx, sy + 6);
          ctx.letterSpacing = "0px";

          const statsY = sy + 22;
          const statCols = [
            { count: goalScore.optimalCount, color: GRADE_COLORS.optimal, label: "optimal" },
            { count: goalScore.goodCount, color: GRADE_COLORS.good, label: "good" },
            { count: goalScore.weakCount, color: GRADE_COLORS.weak, label: "weak" },
            { count: goalScore.poorCount, color: GRADE_COLORS.poor, label: "poor" },
          ].filter(d => d.count > 0);

          let colX = sx;
          statCols.forEach(d => {
            ctx.font = `600 11px ${FONT}`;
            ctx.fillStyle = d.color;
            ctx.textBaseline = "top";
            ctx.textAlign = "left";
            ctx.fillText(d.count, colX, statsY);
            const countW = ctx.measureText(d.count.toString()).width;
            ctx.font = `400 8px ${FONT}`;
            ctx.fillStyle = "rgba(74,63,53,0.25)";
            ctx.fillText(d.label, colX + countW + 3, statsY + 2);
            colX += countW + 3 + ctx.measureText(d.label).width + 16;
          });

          const metaY = statsY + 18;
          ctx.font = `400 8px ${FONT}`;
          ctx.fillStyle = "rgba(74,63,53,0.2)";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          const metaParts = [`${goalScore.coverage}/5 stages`];
          if (goalScore.exclusives > 0) metaParts.push(`${goalScore.exclusives} exclusive${goalScore.exclusives > 1 ? "s" : ""}`);
          ctx.fillText(metaParts.join("  ·  "), sx, metaY);

        } else {
          const sx = pad, sy = H - pad;
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
          ctx.font = `300 28px ${FONT}`;
          ctx.fillStyle = "#4a3f35";
          const sc = calcStrategyScore(placed);
          ctx.fillText(sc.total, sx, sy);
          const numW = ctx.measureText(sc.total.toString()).width;
          ctx.font = `600 7px ${FONT}`;
          ctx.fillStyle = "rgba(74,63,53,0.2)";
          ctx.textBaseline = "top";
          ctx.letterSpacing = "1px";
          ctx.fillText("SCORE", sx, sy + 4);
          ctx.letterSpacing = "0px";
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
          ctx.font = i === 0 ? `400 9px ${FONT}` : `400 8px ${FONT}`;
          ctx.fillStyle = `rgba(${entry.grade === "optimal" ? "26,138,62" : entry.grade === "good" ? "58,122,181" : entry.grade === "weak" ? "176,138,48" : entry.grade === "poor" ? "204,68,68" : "0,0,0"},${fade * displayFade * 0.5})`;
          ctx.fillText(entry.text, logX, logY - i * 14);
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
  }, [canvasSize, placed, hoveredNode, dragging, dragPos, isDragOverCanvas, summary, selectedNode, canvasDrag, dragTick, activeGoal, actionLog, budgetPhase, bmActiveChannels, bmSliders, bmBudget, bmHovIdx, bmStats]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      setDragPos({ x: e.clientX, y: e.clientY });
      const cr = canvasContainerRef.current?.getBoundingClientRect();
      if (cr) {
        const inside = e.clientX >= cr.left && e.clientX <= cr.right && e.clientY >= cr.top && e.clientY <= cr.bottom;
        setIsDragOverCanvas(inside);
      }
    };
    const onUp = (e) => {
      if (isDragOverCanvas && dragging) {
        const already = placed.find((n) => n.id === dragging.id);
        if (!already) {
          const cr = canvasContainerRef.current?.getBoundingClientRect();
          if (cr) {
            const dropX = e.clientX - cr.left;
            const dropY = e.clientY - cr.top;
            posOverrides.current = { ...posOverrides.current, [dragging.id]: { x: dropX, y: dropY } };
          }
          const newNode = { id: dragging.id, label: dragging.label, step: dragging.step, shape: dragging.shape, tip: dragging.tip, born: Date.now() };
          setPlaced((prev) => [...prev, newNode]);
          if (dragging.step === "goal") {
            setActiveGoal(dragging.id);
            setActionLog(prev => [...prev, { text: `Goal set: ${dragging.label}`, grade: "optimal", time: Date.now() }]);
          } else if (activeGoal) {
            const grade = gradeNode(activeGoal, dragging.id);
            const fb = getNodeFeedback(grade, dragging.id);
            setActionLog(prev => [...prev, { text: `${dragging.label}: ${fb}`, grade, time: Date.now() }]);
          }
        }
      }
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
      for (const n of placed) {
        const p = positions[n.id];
        if (p && Math.abs(mx - p.x) < 78 && Math.abs(my - p.y) < 24) {
          found = n.id;
          break;
        }
      }
      setHoveredNode(found);
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
    [placed, canvasSize, dragging, summary]
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
          if (node?.step === "goal") { setActiveGoal(null); setActionLog([]); }
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
  }, [canvasDrag, placed, selectedNode, activeGoal]);

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
          if (n.step === "goal") { setActiveGoal(null); setActionLog([]); }
          setActionLog(prev => [...prev, { text: `Removed: ${n.label}`, grade: "weak", time: Date.now() }]);
          break;
        }
      }
    },
    [placed, canvasSize, summary, selectedNode, activeGoal]
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
      if (keyToRemove === "goal") { setActiveGoal(null); setActionLog([]); }
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
    setActiveGoal(null);
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

  const autoGenerate = (goalId) => {
    const nodes = generateOptimalStrategy(goalId);
    setActiveGoal(goalId);
    setPlaced(nodes);
    setCurrentStep(STEPS.length);
    posOverrides.current = {};
    setActionLog([{ text: `Auto-generated: ${GOAL_OPTIMAL[goalId]?.label}`, grade: "optimal", time: Date.now() }]);
  };

  const currentStepHasNodes = step ? placed.some((n) => n.step === step.key) : false;

  const generate = async () => {
    setSummaryLoading(true);
    setSummary(null);

    // Map strategy to budget allocation
    const mapping = mapStrategyToBudget(placed);
    setBmEnabled(mapping.enabled);
    setBmSliders(mapping.sliders);
    setBmBudget(mapping.budget);
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
          system: `You are a senior Microsoft Advertising strategist. The user configured a campaign across 5 layers: Goal → Campaign Type → Network → Audience → Optimize For.

Respond with ONLY a JSON object (no markdown, no backticks):

{
  "name": "2-4 word strategy name (e.g. 'LinkedIn Precision Engine', 'Full-Funnel Commerce')",
  "line": "One sentence, max 18 words. What this strategy does and why it works. Like a tagline.",
  "stat": "The single most impressive benchmark (e.g. '64%', '40–60%', '$1.20', '3.17%')",
  "statLabel": "What the stat measures, max 5 words (e.g. 'CVR lift with audiences', 'lower CPC on Bing')",
  "action": "First thing to do, max 10 words (e.g. 'Install UET tag and build remarketing lists')"
}

Use real Microsoft Ads benchmarks: avg CPC $1-2, 3.17% search CTR, 16% CTR lift LinkedIn, 64% CVR lift audiences, 70% audience 35-65, 33% income $100K+, 900M+ monthly searches. Pick the stat that best represents THIS specific combination's key advantage. Do NOT mention Google or any competitor.`,
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
      {/* ── Canvas — full bleed, first element ── */}
      <div
        ref={canvasContainerRef}
        className={`ms-builder-canvas-wrap ${isDragOverCanvas ? "drag-over" : ""}`}
      >
        <canvas
          ref={canvasRef}
          style={{ width: canvasSize.w, height: canvasSize.h, display: "block", cursor: budgetPhase ? (bmHovIdx >= 0 ? "crosshair" : "default") : canvasDrag ? "grabbing" : hoveredNode ? "grab" : "default" }}
          onMouseMove={handleCanvasMove}
          onMouseDown={handleCanvasDown}
          onClick={handleCanvasClick}
          onDoubleClick={handleCanvasDblClick}
          onMouseLeave={() => { if (budgetPhase) { setBmHovIdx(-1); } else if (!canvasDrag) setHoveredNode(null); }}
        />
      </div>

      {/* ── Controls bar: dots + actions inline ── */}
      <div className="ms-builder-controls">
        <div className="ms-builder-controls-left">
          <div className="ms-builder-step-indicator">
            {STEPS.map((s, i) => (
              <div
                key={s.key}
                className="ms-builder-step-dot"
                style={{
                  width: i <= currentStep ? 20 : 6,
                  background:
                    i < currentStep
                      ? "#4a3f35"
                      : i === currentStep
                      ? "rgba(74,63,53,0.5)"
                      : "rgba(74,63,53,0.06)",
                }}
              />
            ))}
          </div>
          <div className="ms-builder-actions">
            {/* Trash drop zone — visible when dragging a pill */}
            {!budgetPhase && placed.length > 0 && (
              <div
                ref={trashRef}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: isOverTrash ? 36 : canvasDrag ? 32 : 28,
                  height: isOverTrash ? 36 : canvasDrag ? 32 : 28,
                  borderRadius: "50%",
                  border: `1.5px solid ${isOverTrash ? "#c44" : canvasDrag ? "rgba(74,63,53,0.15)" : "rgba(74,63,53,0.06)"}`,
                  background: isOverTrash ? "#c44" : "transparent",
                  transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                  flexShrink: 0,
                  opacity: canvasDrag ? 1 : 0.25,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={isOverTrash ? "#fff" : "#4a3f35"} strokeWidth="1.2" strokeLinecap="round" style={{ transition: "stroke 0.15s" }}>
                  <path d="M2.5 3.5h9M5 3.5V2.5a1 1 0 011-1h2a1 1 0 011 1v1M3.5 3.5l.5 8a1 1 0 001 1h4a1 1 0 001-1l.5-8" />
                  <path d="M5.5 6v3.5M8.5 6v3.5" />
                </svg>
              </div>
            )}
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
            {!budgetPhase && !done && activeGoal && currentStep >= 1 && (
              <button className="ms-builder-btn" onClick={() => autoGenerate(activeGoal)}>
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Shelf: chips, complete state, or budget controls ── */}
      <div className="ms-builder-shelf">
        {budgetPhase ? (
          <>
            {/* Budget channel chips with inline sliders */}
            <div className="bm-chips" style={{ padding: "10px 0" }}>
              {BM_CHANNELS.map(ch => {
                const isOn = bmEnabled.includes(ch.id);
                const hasAny = bmEnabled.length > 0;
                return (
                  <div key={ch.id}
                    className={`bm-chip ${isOn ? "on" : hasAny ? "off" : ""}`}
                    style={{ "--chip-bg": ch.bg, "--chip-color": ch.color }}
                    onClick={(e) => { if (e.target.tagName === "INPUT") return; bmToggleChannel(ch.id); }}>
                    <div className="bm-chip-dot" style={{ background: isOn ? ch.color : "rgba(74,63,53,0.15)" }} />
                    <span>{ch.label}</span>
                    {isOn && (
                      <div className="bm-chip-slider" onClick={e => e.stopPropagation()}>
                        <div className="bm-chip-slider-bg" />
                        <div className="bm-chip-slider-fill" style={{ width: `${bmSliders[ch.id] || 0}%`, background: ch.color }} />
                        <input type="range" min="0" max="100" value={bmSliders[ch.id] || 0}
                          style={{ "--sc": ch.color }}
                          onChange={e => bmUpdateSlider(ch.id, +e.target.value)} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Budget + allocation row */}
            <div className="bm-shelf-row" style={{ borderTop: "1px solid rgba(74,63,53,0.04)" }}>
              <div className="bm-shelf-budget">
                <span className="bm-shelf-budget-label">Budget</span>
                <div className="bm-shelf-budget-track">
                  <div className="bm-shelf-budget-track-bg" />
                  <div className="bm-shelf-budget-track-fill" style={{ width: `${(bmBudget / 20000) * 100}%` }} />
                  <input type="range" min="500" max="20000" step="500" value={bmBudget}
                    onChange={e => setBmBudget(+e.target.value)} />
                </div>
                <span className="bm-shelf-budget-val">${(bmBudget / 1000).toFixed(bmBudget >= 1000 ? 0 : 1)}K/mo</span>
              </div>
              <div className="bm-shelf-sep" />
              <span className="bm-shelf-alloc">
                {bmActiveChannels.length > 0
                  ? bmActiveChannels.map((ch) => {
                      const totalAlloc = bmActiveChannels.reduce((s, c) => s + (bmSliders[c.id] || 0), 0);
                      const share = totalAlloc > 0 ? Math.round((bmSliders[ch.id] || 0) / totalAlloc * 100) : 0;
                      return `${ch.label} ${share}%`;
                    }).join("  ·  ")
                  : "Select channels to begin"
                }
              </span>
            </div>
          </>
        ) : !done ? (
          <>
            <div className="ms-builder-shelf-header">
              <span className="ms-builder-shelf-step">{currentStep + 1} / {STEPS.length}</span>
              <span className="ms-builder-shelf-label">{step.label}</span>
              <span className="ms-builder-shelf-desc">{step.desc}</span>
              <span className="ms-builder-shelf-hint">Drag to canvas</span>
            </div>
            <div className="ms-builder-chips">
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
                      // Kill demo loop permanently
                      if (!demoRef.current.killed) {
                        demoRef.current.killed = true;
                        demoRef.current.active = false;
                        if (demoRafRef.current) cancelAnimationFrame(demoRafRef.current);
                        setDemoTick(t => t + 1);
                      }
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
              {activeGoal && ` · ${GOAL_OPTIMAL[activeGoal]?.label}`}
            </span>
            <span className="ms-builder-complete-path">
              {STEPS.map((s) =>
                placed
                  .filter((n) => n.step === s.key)
                  .map((n) => n.label)
                  .join(", ")
              )
                .filter(Boolean)
                .join(" → ")}
            </span>
          </div>
        )}
      </div>

      {/* Strategy is now rendered directly on the canvas */}

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
              color: isOverTrash ? "#fff" : (stepDef?.color || "#4a3f35"),
              border: isOverTrash ? "1.5px solid #c44" : "1px solid #111",
              fontSize: isOverTrash ? 0 : 11,
              fontWeight: 600,
              fontFamily: "'Segoe UI', system-ui, sans-serif",
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
              fontFamily: "'Segoe UI', system-ui, sans-serif",
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
  const videoRadius = lerpVal(60, 28, vpEased);
  const videoY = lerpVal(40, 0, easeOutQuart(vp));
  const driftY = mapRange(p, 0, 1, 0, -25);

  return (
    <section className="ms-gallery" ref={sectionRef}>
      <div className="ms-gallery-inner">
        <div className="ms-gallery-stage">
          <div className="ms-gallery-headline" style={{ marginLeft: "auto", maxWidth: "58%" }}>
            <span style={{ display: "block", fontSize: 11, color: "rgba(74,63,53,0.35)", marginBottom: 20 }}>01 — Global Reach</span>
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

export default function MicrosoftAds() {
  const [scrolled, setScrolled] = useState(false);
  const [navOverlay, setNavOverlay] = useState(null);
  const exportCanvasRef = useRef(null);
  const [heroRef, heroProgress] = useSmoothParallax(80, 12, 1.5);
  const [showDownload, setShowDownload] = useState(false);
  const [exportOverlay, setExportOverlay] = useState(null);
  const [brushPanel, setBrushPanel] = useState(false);
  const [brushSettings, setBrushSettings] = useState({
    size: 1,          /* 0.3 → 3 multiplier */
    color: "#4a3f35", /* ink color */
    traceMode: true,  /* continuous trace on hover (default on) */
  });
  const brushRef = useRef(brushSettings);
  const clearRef = useRef(null);
  useEffect(() => { brushRef.current = brushSettings; }, [brushSettings]);

  useEffect(() => {
    const timer = setTimeout(() => setShowDownload(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleExport = useCallback(() => {
    const canvas = exportCanvasRef.current;
    if (!canvas) return;
    try {
      const exp = document.createElement("canvas");
      exp.width = canvas.width;
      exp.height = canvas.height;
      const ectx = exp.getContext("2d");
      ectx.fillStyle = "#f5f0e8";
      ectx.fillRect(0, 0, exp.width, exp.height);
      ectx.drawImage(canvas, 0, 0);
      const dataUrl = exp.toDataURL("image/png");
      setExportOverlay(dataUrl);
    } catch(e) {
      console.error("Export failed:", e);
    }
  }, []);

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
        <span className="ms-nav-brand" style={navOverlay ? { color: navOverlay.txt } : {}}>Microsoft Ads</span>
        <div className="ms-nav-links">
          <a className="ms-nav-link" style={navOverlay ? { color: navOverlay.txt, opacity: 0.7 } : {}}>Solutions</a>
          <a className="ms-nav-link" style={navOverlay ? { color: navOverlay.txt, opacity: 0.7 } : {}}>Products</a>
          <a className="ms-nav-link" style={navOverlay ? { color: navOverlay.txt, opacity: 0.7 } : {}}>Resources</a>
          <a className="ms-nav-link" style={navOverlay ? { color: navOverlay.txt, opacity: 0.7 } : {}}>Pricing</a>
        </div>
      </nav>

      {/* ── Hero: Pixel Art Generative ── */}
      <section className="ms-hero" ref={heroRef}>
        <PixelHero setNavOverlay={setNavOverlay} exportCanvasRef={exportCanvasRef} brushRef={brushRef} clearRef={clearRef} />
        <div className="ms-hero-content" style={{ transform: `translateY(${heroTitleY}px) scale(${heroTitleScale})`, transformOrigin: "left top", willChange: "transform" }}>
          <h1>Reach billions.<br />Convert millions.</h1>
          <div className="ms-hero-cta" style={{ opacity: heroCTAOpacity, transform: `translateY(${heroCTAY}px)`, willChange: "transform, opacity" }}>
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
        <div className={`ms-brush-panel ${brushPanel && !navOverlay ? "open" : ""}`}>
          <div className="ms-brush-panel-header">
            <span>Brush</span>
            <button className="ms-brush-panel-close" onClick={() => setBrushPanel(false)}>✕</button>
          </div>

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
          <div className="ms-brush-control" style={{ paddingBottom: 14 }}>
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
          <div className="ms-brush-control" style={{ paddingBottom: 14 }}>
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
        <div className="ms-export-overlay" onClick={() => setExportOverlay(null)}>
          <div className="ms-export-modal" onClick={e => e.stopPropagation()}>
            <div className="ms-export-modal-header">
              <span className="ms-export-modal-title">Your Artwork</span>
              <button className="ms-export-modal-close" onClick={() => setExportOverlay(null)}>✕</button>
            </div>
            <div className="ms-export-modal-preview">
              <img src={exportOverlay} alt="Exported artwork" />
            </div>
            <div className="ms-export-modal-footer">
              <span className="ms-export-modal-hint">Right-click image → Save as</span>
              <a className="ms-export-modal-btn" href={exportOverlay} download="microsoft-ads-artwork.png">
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

      {/* ── Closing Statement ── */}
      <section className="ms-closing">
        <div className="ms-closing-inner">
          <span className="ms-closing-overline">05 — Start here</span>
          <h2 className="ms-closing-title">Your audience is already here.</h2>
          <div className="ms-closing-illustration">
            <ParallaxMedia scaleFrom={0.92} scaleTo={1} radiusFrom={32} radiusTo={20} style={{ width: "100%", maxWidth: 800, margin: "0 auto" }}>
              <img src="/assets/images/ChatGPT Image 5 de fev. de 2025, 20_02_44.png" alt="Your audience illustration" style={{ width: "100%", height: "auto", display: "block" }} />
            </ParallaxMedia>
          </div>
          <p className="ms-closing-body">
            Meet them where they search, browse, play, and watch — with tools that make every impression count.
          </p>
          <div className="ms-closing-cta">
            <button className="ms-btn-primary">Get Started</button>
            <button className="ms-btn-arrow">→</button>
          </div>
        </div>
      </section>

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
