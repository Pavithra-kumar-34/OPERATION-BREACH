import { useState, useEffect, useRef, useMemo } from "react";
import {
  Shield, AlertTriangle, Search, Network, FileText, Mail, Clock, CheckCircle,
  XCircle, Lock, LogOut, ChevronRight, Award, Eye, Flag, Send, Settings,
  Activity, Globe, HardDrive, Users, ArrowLeft, TrendingUp, Hash, Wifi,
  ClipboardList, ShieldAlert, Radio, Server, Fingerprint, BookOpen, Play,
  Pause, Square, BarChart3, Target, FileWarning, StickyNote, MonitorCheck
} from "lucide-react";

/* =========================================================================
   DATA LAYER — fictional companies, evidence, IOCs, response actions.
   All scoring logic below is deterministic and evaluated centrally (never
   trusts a submitted score), simulating server-side authority.
   ========================================================================= */

const STAGES = ["DETECT", "INVESTIGATE", "ANALYZE", "IDENTIFY", "RESPOND", "REPORT"];

const STAGE_MAX = {
  DETECT: 100, INVESTIGATE: 200, ANALYZE: 200, IDENTIFY: 150, RESPOND: 200, REPORT: 100, EFFICIENCY: 50,
};

function makeResponseOptions(list) {
  return list.map((r, i) => ({ id: `R${i + 1}`, ...r }));
}

const COMPANIES = {
  fincore: {
    id: "fincore",
    name: "FINCORE BANK",
    industry: "Financial Services",
    incidentTitle: "Suspicious Network Activity",
    severity: "HIGH",
    accent: "cyan",
    style: "NETWORK-FIRST",
    systems: [
      { label: "Network", status: "WARNING" },
      { label: "Endpoints", status: "NORMAL" },
      { label: "Accounts", status: "NORMAL" },
      { label: "Database", status: "NORMAL" },
    ],
    alert: {
      id: "ALERT-FC-2291",
      title: "Suspicious outbound communication detected",
      device: "FIN-WS-104",
      time: "10:42:17",
      severity: "HIGH",
      body: "Outbound network flow from workstation FIN-WS-104 exceeded baseline volume and matched a beaconing pattern. Automated triage flagged the session for analyst review.",
      assetOptions: ["FIN-WS-104", "FIN-DB-02", "FIN-WS-211"],
      correctAsset: "FIN-WS-104",
    },
    evidence: [
      { id: "E01", type: "FIREWALL", title: "Firewall Session Log", requires: ["ALERT"], keyEvidence: true,
        timestamp: "10:39:04",
        content: "FIN-WS-104 (10.12.4.104) -> 91.203.44.18:443  Proto: TCP  Bytes-out: 4,214,092  Action: ALLOWED  Rule: Default-Egress-HTTPS",
        meta: { Source: "10.12.4.104", Destination: "91.203.44.18:443", Bytes: "4.2 MB out", Action: "ALLOWED" } },
      { id: "E02", type: "ENDPOINT", title: "Endpoint Process Event", requires: ["E01"], keyEvidence: true,
        timestamp: "10:38:12",
        content: "Host FIN-WS-104: WINWORD.EXE (parent) spawned POWERSHELL.EXE (child) — atypical for this host's baseline behavior. User session: jsmith.",
        meta: { Host: "FIN-WS-104", Parent: "WINWORD.EXE", Child: "POWERSHELL.EXE", User: "jsmith" } },
      { id: "E03", type: "PROCESS", title: "Process Command Line", requires: ["E02"], keyEvidence: true,
        timestamp: "10:38:15",
        content: "powershell.exe -nop -w hidden -enc <base64>  (decoded intent: download payload from update-cdn-secure.test and execute in memory)",
        meta: { Process: "powershell.exe", Flags: "-nop -w hidden -enc", Target: "update-cdn-secure.test" } },
      { id: "E04", type: "DNS", title: "DNS Query Log", requires: ["E02"], keyEvidence: true,
        timestamp: "10:38:41",
        content: "FIN-WS-104 queried update-cdn-secure.test -> resolved to 91.203.44.18. Domain has no prior resolution history on this network.",
        meta: { Query: "update-cdn-secure.test", Resolved: "91.203.44.18", "First seen on network": "Yes" } },
      { id: "E05", type: "NETWORK", title: "Network Connection Detail", requires: ["E04", "E01"], keyEvidence: true,
        timestamp: "10:39:04",
        content: "Sustained TCP session to 91.203.44.18:443 for 3m12s, steady low-jitter interval typical of automated beacon traffic rather than user browsing.",
        meta: { Protocol: "TCP/443", Duration: "3m12s", Pattern: "Beacon-like" } },
      { id: "E06", type: "LOG", title: "Authentication Log — jsmith", requires: ["E02"], keyEvidence: false, redHerring: true,
        timestamp: "08:57:02",
        content: "jsmith authenticated to FIN-WS-104 at 08:57 from expected internal IP, normal business hours, no MFA anomalies. No indication of stolen credentials.",
        meta: { User: "jsmith", Result: "SUCCESS", Anomaly: "None" } },
      { id: "E07", type: "TIMELINE", title: "Compiled Host Timeline", requires: ["E05"], keyEvidence: true,
        timestamp: "10:37–10:42",
        content: "10:37 Email with attachment opened -> 10:38 WINWORD spawns PowerShell -> 10:38 DNS query to update-cdn-secure.test -> 10:39 Outbound session to 91.203.44.18 -> 10:42 Alert triggered.",
        meta: { Span: "10:37:50 – 10:42:17" } },
    ],
    iocDb: {
      "update-cdn-secure.test": { reputation: "MALICIOUS", confidence: "HIGH", firstObserved: "2026-08-10", related: ["E03", "E04"] },
      "91.203.44.18": { reputation: "MALICIOUS", confidence: "HIGH", firstObserved: "2026-08-10", related: ["E01", "E05"] },
      "10.12.4.104": { reputation: "INTERNAL ASSET", confidence: "N/A", firstObserved: "—", related: ["E01", "E02"] },
    },
    identify: {
      attackType: { correct: "Malicious Document / Loader (C2 beacon)", options: ["Malicious Document / Loader (C2 beacon)", "SQL Injection", "Brute-force Login", "Ransomware Encryption Event"] },
      vector: { correct: "Weaponized email attachment spawning PowerShell", options: ["Weaponized email attachment spawning PowerShell", "Exposed RDP port", "Insider USB drop", "Compromised VPN credential"] },
      asset: { correct: "FIN-WS-104", options: ["FIN-WS-104", "FIN-DB-02", "FIN-WS-211"] },
      ioc: { correct: "update-cdn-secure.test / 91.203.44.18", options: ["update-cdn-secure.test / 91.203.44.18", "billing-support.test", "10.12.4.104"] },
      keyEvidence: ["E02", "E03", "E04", "E05"],
    },
    responses: makeResponseOptions([
      { label: "Isolate FIN-WS-104 from the network", cls: "CORRECT", points: 60 },
      { label: "Block domain update-cdn-secure.test and IP 91.203.44.18", cls: "CORRECT", points: 50 },
      { label: "Preserve endpoint memory & disk image for forensics", cls: "CORRECT", points: 30 },
      { label: "Hunt for the same IOC across other endpoints", cls: "CORRECT", points: 30 },
      { label: "Force password reset for jsmith", cls: "PARTIAL", points: 15 },
      { label: "Monitor silently with no containment action", cls: "PARTIAL", points: 10 },
      { label: "Delete the malicious files immediately without imaging", cls: "DANGEROUS", points: -40 },
      { label: "Shut down the entire branch network", cls: "PREMATURE", points: -15 },
      { label: "Close the alert as a false positive", cls: "INCORRECT", points: -25 },
    ]),
    report: reportTemplate(),
  },

  medishield: {
    id: "medishield",
    name: "MEDISHIELD HOSPITAL",
    industry: "Healthcare",
    incidentTitle: "Phishing and Account Compromise",
    severity: "HIGH",
    accent: "blue",
    style: "EMAIL-FIRST",
    systems: [
      { label: "Network", status: "NORMAL" },
      { label: "Endpoints", status: "NORMAL" },
      { label: "Accounts", status: "WARNING" },
      { label: "Database", status: "NORMAL" },
    ],
    alert: {
      id: "ALERT-MS-1187",
      title: "Unusual authentication activity detected",
      device: "Account: dr.patel",
      time: "09:14:52",
      severity: "HIGH",
      body: "A successful login for account dr.patel occurred from a geolocation inconsistent with the account's normal pattern, shortly after an inbound email to the same mailbox.",
      assetOptions: ["dr.patel (clinician account)", "MED-DOC-22 (workstation)", "billing-svc (service account)"],
      correctAsset: "dr.patel (clinician account)",
    },
    evidence: [
      { id: "E01", type: "LOG", title: "Authentication Alert Detail", requires: ["ALERT"], keyEvidence: true,
        timestamp: "09:14:52",
        content: "Login success for dr.patel from IP 185.220.11.4 (unfamiliar ASN/geolocation), device fingerprint not previously seen for this account.",
        meta: { User: "dr.patel", IP: "185.220.11.4", "New device": "Yes" } },
      { id: "E02", type: "EMAIL", title: "Inbound Mailbox Item", requires: ["E01"], keyEvidence: true,
        timestamp: "09:08:03",
        content: "Subject: 'Password Expiry Notice — Action Required'. Body urges immediate login via a linked portal to avoid account lockout within 24 hours.",
        meta: { From: "it-support@medlshield-portal.test", To: "dr.patel@medishield.test", Subject: "Password Expiry Notice" } },
      { id: "E03", type: "EMAIL_HEADER", title: "Email Header Inspection", requires: ["E02"], keyEvidence: true,
        timestamp: "09:08:03",
        content: "Envelope-From domain (medlshield-portal.test) does not match the hospital's real domain (medishield.test). Reply-To routes to a separate, unrelated free-mail address.",
        meta: { "Envelope-From": "medlshield-portal.test", "Reply-To mismatch": "Yes", SPF: "FAIL" } },
      { id: "E04", type: "URL", title: "Embedded Link Analysis", requires: ["E02"], keyEvidence: true,
        timestamp: "09:08:03",
        content: "Link target: hxxps://secure-medishield-login.test/verify — a lookalike domain, not the hospital's actual SSO portal.",
        meta: { URL: "secure-medishield-login.test/verify", "Lookalike domain": "Yes" } },
      { id: "E05", type: "LOG", title: "Login Records (extended)", requires: ["E04", "E01"], keyEvidence: true,
        timestamp: "09:11:40",
        content: "A login attempt to the real MediShield portal was made 3 minutes after the phishing link was accessed, immediately followed by the anomalous login at 09:14:52.",
        meta: { "Link accessed": "09:11:02", "Suspicious login": "09:14:52" } },
      { id: "E06", type: "IP", title: "Source IP Details", requires: ["E05"], keyEvidence: true,
        timestamp: "09:14:52",
        content: "185.220.11.4 has no history of legitimate use on this network and is associated with anonymized hosting infrastructure.",
        meta: { IP: "185.220.11.4", "Prior legitimate use": "None" } },
      { id: "E07", type: "LOG", title: "Badge / Facility Access Log", requires: ["E01"], keyEvidence: false, redHerring: true,
        timestamp: "07:55:10",
        content: "dr.patel badged into the facility at 07:55, consistent with normal shift start. No physical anomaly.",
        meta: { Event: "Badge-in", Result: "Normal" } },
      { id: "E08", type: "DOMAIN", title: "Domain Registration Info", requires: ["E04"], keyEvidence: true,
        timestamp: "—",
        content: "secure-medishield-login.test was registered one day before the incident, a common trait of short-lived phishing infrastructure.",
        meta: { Domain: "secure-medishield-login.test", Registered: "2026-08-09" } },
    ],
    iocDb: {
      "medlshield-portal.test": { reputation: "SUSPICIOUS", confidence: "HIGH", firstObserved: "2026-08-09", related: ["E02", "E03"] },
      "secure-medishield-login.test": { reputation: "MALICIOUS", confidence: "HIGH", firstObserved: "2026-08-09", related: ["E04", "E08"] },
      "185.220.11.4": { reputation: "MALICIOUS", confidence: "MEDIUM", firstObserved: "2026-08-10", related: ["E01", "E05", "E06"] },
    },
    identify: {
      attackType: { correct: "Phishing-driven credential harvesting", options: ["Phishing-driven credential harvesting", "Ransomware", "SQL Injection", "Physical badge cloning"] },
      vector: { correct: "Lookalike-domain phishing email with credential-harvesting link", options: ["Lookalike-domain phishing email with credential-harvesting link", "Exposed database port", "Malicious USB device", "Unpatched VPN appliance"] },
      asset: { correct: "dr.patel (clinician account)", options: ["dr.patel (clinician account)", "MED-DOC-22 (workstation)", "billing-svc (service account)"] },
      ioc: { correct: "secure-medishield-login.test / 185.220.11.4", options: ["secure-medishield-login.test / 185.220.11.4", "update-cdn-secure.test", "MED-DOC-22"] },
      keyEvidence: ["E02", "E03", "E04", "E05", "E06"],
    },
    responses: makeResponseOptions([
      { label: "Disable dr.patel's account immediately", cls: "CORRECT", points: 55 },
      { label: "Force credential reset + enforce MFA re-enrollment", cls: "CORRECT", points: 45 },
      { label: "Block sender domain and phishing URL at the mail gateway", cls: "CORRECT", points: 45 },
      { label: "Search all mailboxes for the same phishing template", cls: "CORRECT", points: 30 },
      { label: "Preserve email headers and auth logs for the case file", cls: "CORRECT", points: 25 },
      { label: "Only notify dr.patel by email and wait", cls: "PARTIAL", points: 10 },
      { label: "Wipe dr.patel's mailbox to remove the phishing email", cls: "DANGEROUS", points: -40 },
      { label: "Lock out the entire clinical staff directory", cls: "PREMATURE", points: -15 },
      { label: "Mark as benign — login used correct password", cls: "INCORRECT", points: -25 },
    ]),
    report: reportTemplate(),
  },

  cloudnova: {
    id: "cloudnova",
    name: "CLOUDNOVA TECHNOLOGIES",
    industry: "Cloud Technology",
    incidentTitle: "Malware and Possible Data Exfiltration",
    severity: "HIGH",
    accent: "violet",
    style: "ENDPOINT-FIRST",
    systems: [
      { label: "Network", status: "WARNING" },
      { label: "Endpoints", status: "WARNING" },
      { label: "Accounts", status: "NORMAL" },
      { label: "Database", status: "NORMAL" },
    ],
    alert: {
      id: "ALERT-CN-3305",
      title: "Suspicious child process on production host",
      device: "CN-SRV-07",
      time: "02:16:33",
      severity: "HIGH",
      body: "EDR flagged an unusual process lineage on CN-SRV-07 during off-hours, followed by anomalous outbound data volume.",
      assetOptions: ["CN-SRV-07", "CN-SRV-11", "CN-WS-04"],
      correctAsset: "CN-SRV-07",
    },
    evidence: [
      { id: "E01", type: "ENDPOINT", title: "EDR Endpoint Alert", requires: ["ALERT"], keyEvidence: true,
        timestamp: "02:16:33",
        content: "CN-SRV-07: unexpected process spawned outside of the maintenance window, memory/CPU spike coincided with the event.",
        meta: { Host: "CN-SRV-07", Window: "Off-hours" } },
      { id: "E02", type: "PROCESS", title: "Process Tree", requires: ["E01"], keyEvidence: true,
        timestamp: "02:11:02",
        content: "svchost.exe -> cmd.exe -> updater.exe. updater.exe is not part of the approved software baseline for this host.",
        meta: { Lineage: "svchost.exe > cmd.exe > updater.exe", Baseline: "Not approved" } },
      { id: "E03", type: "FILE", title: "Dropped File Artifact", requires: ["E02"], keyEvidence: true,
        timestamp: "02:11:04",
        content: "File 'updater.exe' written to a temp directory moments before execution, unsigned, no matching vendor metadata.",
        meta: { Path: "%TEMP%\\updater.exe", Signed: "No" } },
      { id: "E04", type: "HASH", title: "File Hash Lookup", requires: ["E03"], keyEvidence: true,
        timestamp: "02:11:05",
        content: "SHA256 a13f...9c2e matches a known malicious loader family in the fictional threat feed.",
        meta: { SHA256: "a13f9204...e29c2e", Reputation: "MALICIOUS" } },
      { id: "E05", type: "DNS", title: "DNS Query From Host", requires: ["E03"], keyEvidence: true,
        timestamp: "02:12:40",
        content: "CN-SRV-07 queried telemetry-sync.test shortly after updater.exe executed — domain has no legitimate business justification on this host.",
        meta: { Query: "telemetry-sync.test", Justification: "None found" } },
      { id: "E06", type: "NETWORK", title: "Network Connection Log", requires: ["E05"], keyEvidence: true,
        timestamp: "02:13:10",
        content: "Periodic outbound connections to 45.77.12.9:8443 every ~90 seconds — consistent with automated beacon/C2 behavior.",
        meta: { Destination: "45.77.12.9:8443", Interval: "~90s" } },
      { id: "E07", type: "NETWORK", title: "Bulk Data Transfer Record", requires: ["E06"], keyEvidence: true,
        timestamp: "03:40–04:55",
        content: "An 850MB outbound transfer occurred over the same connection during overnight hours, well outside normal replication schedules — consistent with data exfiltration.",
        meta: { Volume: "850 MB", Window: "03:40–04:55" } },
      { id: "E08", type: "LOG", title: "Scheduled Backup Job Log", requires: ["E02"], keyEvidence: false, redHerring: true,
        timestamp: "01:00:00",
        content: "Routine nightly backup job completed successfully at 01:00, unrelated in timing and destination to the later transfer.",
        meta: { Job: "Nightly Backup", Result: "SUCCESS" } },
      { id: "E09", type: "TIMELINE", title: "Consolidated Host Timeline", requires: ["E07"], keyEvidence: true,
        timestamp: "02:11–04:55",
        content: "02:11 updater.exe dropped & run -> 02:12 DNS to telemetry-sync.test -> 02:13 beacon begins -> 03:40 large outbound transfer -> 04:55 transfer ends -> 06:02 EDR alert reviewed.",
        meta: { Span: "02:11:02 – 04:55:00" } },
    ],
    iocDb: {
      "telemetry-sync.test": { reputation: "MALICIOUS", confidence: "HIGH", firstObserved: "2026-08-11", related: ["E05"] },
      "45.77.12.9": { reputation: "MALICIOUS", confidence: "HIGH", firstObserved: "2026-08-11", related: ["E06", "E07"] },
      "a13f9204...e29c2e": { reputation: "MALICIOUS", confidence: "HIGH", firstObserved: "2026-08-11", related: ["E04"] },
    },
    identify: {
      attackType: { correct: "Malware loader with C2 beacon and data exfiltration", options: ["Malware loader with C2 beacon and data exfiltration", "Denial of Service", "Credential Stuffing", "Misconfigured backup job"] },
      vector: { correct: "Unsigned dropped executable disguised as an updater", options: ["Unsigned dropped executable disguised as an updater", "Phishing email", "Exposed admin panel", "Compromised third-party plugin"] },
      asset: { correct: "CN-SRV-07", options: ["CN-SRV-07", "CN-SRV-11", "CN-WS-04"] },
      ioc: { correct: "telemetry-sync.test / 45.77.12.9", options: ["telemetry-sync.test / 45.77.12.9", "update-cdn-secure.test", "185.220.11.4"] },
      keyEvidence: ["E02", "E03", "E04", "E05", "E06", "E07"],
    },
    responses: makeResponseOptions([
      { label: "Isolate CN-SRV-07 from the network immediately", cls: "CORRECT", points: 55 },
      { label: "Block 45.77.12.9 and telemetry-sync.test at the perimeter", cls: "CORRECT", points: 45 },
      { label: "Preserve memory image and the dropped file for forensics", cls: "CORRECT", points: 30 },
      { label: "Hunt for the file hash across the fleet", cls: "CORRECT", points: 30 },
      { label: "Rotate credentials/API keys reachable from this host", cls: "PARTIAL", points: 20 },
      { label: "Only increase logging verbosity and wait", cls: "PARTIAL", points: 10 },
      { label: "Delete updater.exe immediately without preserving evidence", cls: "DANGEROUS", points: -40 },
      { label: "Take the entire production cluster offline", cls: "PREMATURE", points: -15 },
      { label: "Close as expected backup traffic", cls: "INCORRECT", points: -25 },
    ]),
    report: reportTemplate(),
  },
};

function reportTemplate() {
  return [
    { key: "summary", label: "Incident Summary" },
    { key: "attackType", label: "Attack Type" },
    { key: "asset", label: "Affected Asset" },
    { key: "vector", label: "Initial Attack Vector" },
    { key: "timeline", label: "Timeline" },
    { key: "evidence", label: "Evidence" },
    { key: "iocs", label: "Indicators of Compromise" },
    { key: "impact", label: "Impact" },
    { key: "containment", label: "Containment" },
    { key: "recovery", label: "Recovery" },
    { key: "recommendations", label: "Recommendations" },
  ];
}

const HINTS = [
  { cost: 10, text: "Review the activity that took place immediately before the alert fired." },
  { cost: 20, text: "Compare the DNS activity against the outbound network connections on the same host." },
  { cost: 30, text: "One destination — domain or IP — should appear in more than one piece of evidence. That overlap is your lead." },
];

function newInvestigation() {
  return {
    stage: "DETECT",
    detectSubmitted: false,
    detectWrongAttempts: 0,
    detectCorrect: false,
    viewedEvidence: [],
    marks: {}, // id -> 'suspicious' | 'benign'
    markPenalty: 0,
    findings: [],
    identification: null,
    responseSelected: [],
    responseSubmitted: false,
    report: {},
    reportSubmitted: false,
    hintsUsed: 0,
    notes: "",
    iocSearches: [],
    startedAt: null,
    completedAt: null,
    finalScore: null,
  };
}

/* =========================================================================
   SCORING — pure functions, evaluated centrally so the client never
   dictates its own score.
   ========================================================================= */

function evidenceUnlocked(company, inv) {
  const viewed = new Set(inv.viewedEvidence);
  const alertDone = inv.detectSubmitted;
  return company.evidence.filter((e) => {
    if (e.requires.includes("ALERT")) return alertDone;
    return e.requires.every((r) => viewed.has(r));
  });
}

function scoreDetect(inv) {
  if (!inv.detectCorrect) return 0;
  return Math.max(40, 100 - inv.detectWrongAttempts * 15);
}

function scoreInvestigation(company, inv) {
  const key = company.evidence.filter((e) => e.keyEvidence).map((e) => e.id);
  const viewed = new Set(inv.viewedEvidence);
  const gotten = key.filter((id) => viewed.has(id)).length;
  const base = (gotten / key.length) * 200;
  return Math.max(0, Math.round(base - inv.markPenalty));
}

function bestFindingOverlap(company, inv) {
  const key = new Set(company.identify.keyEvidence);
  let best = 0;
  for (const f of inv.findings) {
    const hit = f.evidenceIds.filter((id) => key.has(id)).length;
    const ratio = hit / key.size;
    const reasoningBonus = f.reasoning.trim().length > 40 ? 1 : 0.75;
    best = Math.max(best, ratio * reasoningBonus);
  }
  return best;
}

function scoreAnalysis(company, inv) {
  return Math.round(Math.min(1, bestFindingOverlap(company, inv)) * 200);
}

function scoreIdentify(company, inv) {
  if (!inv.identification) return 0;
  const id = inv.identification;
  const c = company.identify;
  let correct = 0;
  if (id.attackType === c.attackType.correct) correct++;
  if (id.vector === c.vector.correct) correct++;
  if (id.asset === c.asset.correct) correct++;
  if (id.ioc === c.ioc.correct) correct++;
  return Math.round((correct / 4) * 150);
}

function scoreResponse(company, inv) {
  const total = inv.responseSelected.reduce((sum, id) => {
    const r = company.responses.find((x) => x.id === id);
    return sum + (r ? r.points : 0);
  }, 0);
  return Math.max(0, Math.min(200, total));
}

function scoreReport(company, inv) {
  const fields = company.report;
  let filled = 0;
  fields.forEach((f) => {
    const v = (inv.report[f.key] || "").trim();
    if (v.length >= 15) filled += 1;
    else if (v.length > 0) filled += 0.4;
  });
  return Math.round((filled / fields.length) * 100);
}

function scoreEfficiency(inv) {
  const hintPenalty = inv.hintsUsed >= 3 ? 60 : [0, 10, 30, 60][inv.hintsUsed];
  const wrongPenalty = inv.detectWrongAttempts * 5;
  return Math.max(0, 50 - hintPenalty - wrongPenalty);
}

function computeFullScore(company, inv) {
  const detection = scoreDetect(inv);
  const investigation = scoreInvestigation(company, inv);
  const analysis = scoreAnalysis(company, inv);
  const identification = scoreIdentify(company, inv);
  const response = scoreResponse(company, inv);
  const report = scoreReport(company, inv);
  const efficiency = scoreEfficiency(inv);
  const total = detection + investigation + analysis + identification + response + report + efficiency;
  return { detection, investigation, analysis, identification, response, report, efficiency, total: Math.max(0, Math.min(1000, total)) };
}

function qualityLabel(pct) {
  if (pct >= 90) return { label: "EXCELLENT", tone: "emerald" };
  if (pct >= 75) return { label: "GOOD", tone: "cyan" };
  if (pct >= 50) return { label: "DEVELOPING", tone: "amber" };
  return { label: "NEEDS IMPROVEMENT", tone: "red" };
}

const ACCENT = {
  cyan: { text: "text-cyan-400", bg: "bg-cyan-500", border: "border-cyan-500/40", soft: "bg-cyan-500/10" },
  blue: { text: "text-blue-400", bg: "bg-blue-500", border: "border-blue-500/40", soft: "bg-blue-500/10" },
  violet: { text: "text-violet-400", bg: "bg-violet-500", border: "border-violet-500/40", soft: "bg-violet-500/10" },
};

function fmtTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

/* =========================================================================
   SMALL SHARED COMPONENTS
   ========================================================================= */

function Panel({ children, className = "" }) {
  return (
    <div className={`bg-slate-900/70 border border-slate-800 rounded-lg backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-800 text-slate-300 border-slate-700",
    red: "bg-red-500/10 text-red-400 border-red-500/30",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded border ${tones[tone]}`}>{children}</span>;
}

function Toast({ toast }) {
  if (!toast) return null;
  const tones = { success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300", error: "border-red-500/40 bg-red-500/10 text-red-300", info: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" };
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg border ${tones[toast.type]} shadow-xl text-sm font-medium animate-[fadeIn_0.2s_ease]`}>
      {toast.msg}
    </div>
  );
}

function StageBar({ current }) {
  const idx = STAGES.indexOf(current);
  return (
    <div className="flex items-center gap-1 w-full overflow-x-auto">
      {STAGES.map((s, i) => (
        <div key={s} className="flex items-center flex-1 min-w-[90px]">
          <div className={`flex-1 text-center py-2 rounded text-[11px] font-semibold tracking-wide border ${
            i < idx ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
            : i === idx ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300"
            : "bg-slate-900 border-slate-800 text-slate-500"}`}>
            {i < idx ? "✓ " : ""}{s}
          </div>
          {i < STAGES.length - 1 && <ChevronRight size={14} className="text-slate-700 mx-1 shrink-0" />}
        </div>
      ))}
    </div>
  );
}

const EV_ICON = { ALERT: AlertTriangle, FIREWALL: Server, ENDPOINT: HardDrive, PROCESS: Activity, DNS: Globe, NETWORK: Network, LOG: FileText, EMAIL: Mail, EMAIL_HEADER: Mail, FILE: FileText, HASH: Fingerprint, IP: Wifi, DOMAIN: Globe, URL: Globe, TIMELINE: Clock };

/* =========================================================================
   LOGIN
   ========================================================================= */

function LoginScreen({ onLogin }) {
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #38bdf8 1px, transparent 0)", backgroundSize: "28px 28px" }} />
      <div className="w-full max-w-md relative">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4">
            <Shield className="text-cyan-400" size={30} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">DEFEND<span className="text-cyan-400">X</span></h1>
          <p className="text-slate-500 text-xs tracking-[0.2em] mt-1">THE BLUE TEAM · WE ARE THE DEFENDERS</p>
        </div>
        <Panel className="p-6">
          <h2 className="text-slate-200 font-semibold mb-1">Analyst Login</h2>
          <p className="text-slate-500 text-sm mb-5">Sign in to enter the SOC Command Center.</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Analyst Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. A. Rivera"
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Team Name</label>
              <input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="e.g. Cyber Sentinels"
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40" />
            </div>
            <button disabled={!name.trim() || !team.trim()} onClick={() => onLogin(name.trim(), team.trim())}
              className="w-full mt-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-semibold py-2.5 rounded-md text-sm transition-colors">
              Enter SOC
            </button>
          </div>
        </Panel>
        <p className="text-center text-slate-600 text-xs mt-4">Fictional training environment. No real systems, credentials, or infrastructure are involved.</p>
      </div>
    </div>
  );
}

/* =========================================================================
   TOP HEADER (shared)
   ========================================================================= */

function TopHeader({ profile, eventStatus, timeLeft, onExit, onAdmin, rank }) {
  return (
    <div className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <Shield className="text-cyan-400" size={20} />
          <div>
            <div className="text-white font-bold text-sm tracking-tight leading-none">DEFEND<span className="text-cyan-400">X</span> SOC</div>
            <div className="text-slate-500 text-[11px] leading-none mt-1">WE ARE THE DEFENDERS</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6 text-xs">
          <div><span className="text-slate-500">Analyst </span><span className="text-slate-200 font-medium">{profile.name}</span></div>
          <div><span className="text-slate-500">Team </span><span className="text-slate-200 font-medium">{profile.team}</span></div>
          <div><span className="text-slate-500">Rank </span><span className="text-cyan-400 font-medium">#{rank}</span></div>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${eventStatus === "ACTIVE" ? "bg-emerald-400 animate-pulse" : eventStatus === "PAUSED" ? "bg-amber-400" : "bg-red-400"}`} />
            <span className="text-slate-300 font-medium">{eventStatus}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-300 font-mono"><Clock size={13} className="text-slate-500" />{fmtTime(timeLeft)}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onAdmin} className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 px-2 py-1.5 rounded hover:bg-slate-900">
            <Settings size={14} /> <span className="hidden sm:inline">Admin</span>
          </button>
          <button onClick={onExit} className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 px-2 py-1.5 rounded hover:bg-slate-900">
            <LogOut size={14} /> <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   DASHBOARD / SOC COMMAND CENTER
   ========================================================================= */

function CompanyCard({ company, inv, onOpen }) {
  const acc = ACCENT[company.accent];
  const score = inv.finalScore;
  const pct = score ? Math.round((score.total / 1000) * 100) : null;
  const evUnlocked = evidenceUnlocked(company, inv).length;
  return (
    <button onClick={onOpen} className={`text-left w-full bg-slate-900/70 border rounded-lg p-5 hover:border-slate-600 transition-colors group ${score ? "border-emerald-500/30" : "border-slate-800"}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-white font-bold tracking-tight">{company.name}</div>
          <div className="text-slate-500 text-xs">{company.industry}</div>
        </div>
        <Badge tone={score ? "emerald" : "red"}>{score ? "COMPLETED" : "ACTIVE INCIDENT"}</Badge>
      </div>
      <div className="text-slate-400 text-xs mb-4">{company.incidentTitle}</div>
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-slate-500">Stage</span>
        <span className={`font-medium ${acc.text}`}>{inv.stage}</span>
      </div>
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-slate-500">Evidence discovered</span>
        <span className="text-slate-300">{evUnlocked} / {company.evidence.length}</span>
      </div>
      <div className="flex items-center justify-between text-xs mb-4">
        <span className="text-slate-500">Score</span>
        <span className="text-slate-200 font-semibold">{score ? `${score.total} / 1000` : "—"}</span>
      </div>
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${acc.bg} transition-all`} style={{ width: `${pct ?? Math.round((STAGES.indexOf(inv.stage) / (STAGES.length)) * 100)}%` }} />
      </div>
      <div className="mt-4 flex items-center gap-1 text-xs text-slate-500 group-hover:text-cyan-400 transition-colors">
        {score ? "Review case" : "Enter investigation"} <ChevronRight size={13} />
      </div>
    </button>
  );
}

function Dashboard({ profile, sessions, eventStatus, timeLeft, onOpenCompany, onExit, onAdmin, rank, overall }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <TopHeader profile={profile} eventStatus={eventStatus} timeLeft={timeLeft} onExit={onExit} onAdmin={onAdmin} rank={rank} />
      <div className="max-w-6xl mx-auto px-5 py-8">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-white mb-1">SOC Command Center</h1>
          <p className="text-slate-500 text-sm">Three organizations currently have active incidents requiring Blue Team investigation.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Panel className="p-4"><div className="text-slate-500 text-xs mb-1">Overall Score</div><div className="text-2xl font-bold text-white">{overall.total} <span className="text-sm text-slate-500 font-normal">/ 3000</span></div></Panel>
          <Panel className="p-4"><div className="text-slate-500 text-xs mb-1">Overall Percentage</div><div className="text-2xl font-bold text-cyan-400">{overall.pct}%</div></Panel>
          <Panel className="p-4"><div className="text-slate-500 text-xs mb-1">Companies Completed</div><div className="text-2xl font-bold text-white">{overall.completed} <span className="text-sm text-slate-500 font-normal">/ 3</span></div></Panel>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.values(COMPANIES).map((c) => (
            <CompanyCard key={c.id} company={c} inv={sessions[c.id]} onOpen={() => onOpenCompany(c.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   COMPANY SOC LANDING (pre-investigation overview)
   ========================================================================= */

function CompanySOCLanding({ company, inv, onBack, onEnter }) {
  const acc = ACCENT[company.accent];
  const statusTone = (s) => (s === "WARNING" ? "amber" : s === "CRITICAL" ? "red" : "emerald");
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="border-b border-slate-800 px-5 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm"><ArrowLeft size={15} /> Back to SOC</button>
      </div>
      <div className="max-w-4xl mx-auto px-5 py-10">
        <div className={`inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded border ${acc.border} ${acc.soft} ${acc.text} mb-4`}>
          {company.industry.toUpperCase()} · {company.style}
        </div>
        <h1 className="text-3xl font-bold text-white mb-1">{company.name}</h1>
        <p className="text-slate-400 mb-8">Security Operations Center</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {company.systems.map((s) => (
            <Panel key={s.label} className="p-3">
              <div className="text-slate-500 text-xs mb-1">{s.label}</div>
              <Badge tone={statusTone(s.status)}>{s.status}</Badge>
            </Panel>
          ))}
        </div>

        <Panel className="p-5 border-red-500/30 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-red-400" size={18} />
            <span className="text-red-400 font-semibold text-sm">ACTIVE ALERT · {company.alert.severity}</span>
          </div>
          <div className="text-white font-semibold mb-1">{company.alert.title}</div>
          <div className="text-slate-400 text-sm mb-3">{company.alert.body}</div>
          <div className="flex gap-6 text-xs text-slate-500">
            <span>Alert ID: <span className="text-slate-300">{company.alert.id}</span></span>
            <span>Time: <span className="text-slate-300">{company.alert.time}</span></span>
          </div>
        </Panel>

        <button onClick={onEnter} className={`${acc.bg} text-slate-950 font-semibold px-6 py-3 rounded-md flex items-center gap-2 hover:brightness-110 transition`}>
          {inv.stage === "DETECT" && !inv.detectSubmitted ? "Begin Investigation" : "Resume Investigation"} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   INVESTIGATION WORKSPACE
   ========================================================================= */

const CASE_TABS = [
  { id: "overview", label: "Incident Overview", icon: ClipboardList },
  { id: "evidence", label: "Evidence", icon: Search },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "ioc", label: "IOC Investigation", icon: Fingerprint },
  { id: "analysis", label: "Findings", icon: Target },
  { id: "identify", label: "Identify", icon: Flag },
  { id: "response", label: "Response", icon: ShieldAlert },
  { id: "report", label: "Report", icon: FileWarning },
  { id: "notes", label: "Case Notes", icon: StickyNote },
];

function InvestigationWorkspace({ company, inv, setInv, onComplete, onBack, timeLeft }) {
  const [tab, setTab] = useState("overview");
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "info") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2600); };

  const acc = ACCENT[company.accent];
  const unlocked = evidenceUnlocked(company, inv);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [assetChoice, setAssetChoice] = useState("");
  const [correlationSel, setCorrelationSel] = useState([]);
  const [findingTitle, setFindingTitle] = useState("");
  const [findingReasoning, setFindingReasoning] = useState("");
  const [findingConfidence, setFindingConfidence] = useState("MEDIUM");
  const [idForm, setIdForm] = useState({ attackType: "", vector: "", asset: "", ioc: "", confidence: "MEDIUM", evidenceIds: "" });
  const [respSel, setRespSel] = useState([]);
  const [iocQuery, setIocQuery] = useState("");
  const [iocResult, setIocResult] = useState(null);
  const [reportDraft, setReportDraft] = useState(inv.report);

  useEffect(() => { setReportDraft(inv.report); }, [company.id]);

  const liveScore = useMemo(() => computeFullScore(company, inv), [company, inv]);

  function update(patch) { setInv((prev) => ({ ...prev, ...patch })); }

  function submitDetect() {
    const correct = assetChoice === company.alert.correctAsset;
    if (!correct) {
      update({ detectWrongAttempts: inv.detectWrongAttempts + 1 });
      showToast("That asset doesn't match the alert evidence. Try again.", "error");
      return;
    }
    update({ detectSubmitted: true, detectCorrect: true, stage: "INVESTIGATE", startedAt: Date.now() });
    showToast("Alert acknowledged. Affected asset confirmed. Evidence unlocked.", "success");
  }

  function viewEvidence(ev) {
    setSelectedEvidence(ev);
    if (!inv.viewedEvidence.includes(ev.id)) {
      update({ viewedEvidence: [...inv.viewedEvidence, ev.id] });
    }
  }

  function markEvidence(ev, mark) {
    const marks = { ...inv.marks, [ev.id]: mark };
    let penaltyDelta = 0;
    if (ev.redHerring && mark === "suspicious") penaltyDelta = 5;
    if (ev.keyEvidence && mark === "benign") penaltyDelta = 15;
    update({ marks, markPenalty: inv.markPenalty + penaltyDelta });
    if (penaltyDelta > 0) showToast("Logged. Reconsider this classification as you gather more evidence.", "info");
  }

  function proceedToAnalyze() {
    update({ stage: "ANALYZE" });
    setTab("analysis");
    showToast("Moved to ANALYZE stage.", "success");
  }

  function createFinding() {
    if (correlationSel.length < 2 || !findingTitle.trim() || !findingReasoning.trim()) {
      showToast("Select at least 2 evidence items and explain the relationship.", "error");
      return;
    }
    const finding = { id: `F${inv.findings.length + 1}`, title: findingTitle.trim(), evidenceIds: correlationSel, reasoning: findingReasoning.trim(), confidence: findingConfidence };
    update({ findings: [...inv.findings, finding] });
    setFindingTitle(""); setFindingReasoning(""); setCorrelationSel([]);
    showToast("Finding created.", "success");
  }

  function proceedToIdentify() {
    if (inv.findings.length === 0) { showToast("Create at least one finding before identification.", "error"); return; }
    update({ stage: "IDENTIFY" });
    setTab("identify");
  }

  function submitIdentification() {
    if (!idForm.attackType || !idForm.vector || !idForm.asset || !idForm.ioc || !idForm.evidenceIds.trim()) {
      showToast("Complete every field, including supporting evidence IDs.", "error");
      return;
    }
    update({ identification: { ...idForm }, stage: "RESPOND" });
    setTab("response");
    showToast("Identification submitted. Proceed to Response.", "success");
  }

  function submitResponse() {
    if (respSel.length === 0) { showToast("Select at least one response action.", "error"); return; }
    update({ responseSelected: respSel, responseSubmitted: true, stage: "REPORT" });
    setTab("report");
    showToast("Response actions logged. Proceed to Report.", "success");
  }

  function submitReport() {
    const filled = company.report.filter((f) => (reportDraft[f.key] || "").trim().length >= 15).length;
    if (filled < company.report.length) { showToast(`Fill in all ${company.report.length} report sections (min. detail) before submitting.`, "error"); return; }
    const finalInv = { ...inv, report: reportDraft, reportSubmitted: true, completedAt: Date.now() };
    const score = computeFullScore(company, finalInv);
    onComplete({ ...finalInv, finalScore: score, stage: "REPORT" });
  }

  function useHint() {
    if (inv.hintsUsed >= 3) return;
    update({ hintsUsed: inv.hintsUsed + 1 });
  }

  function searchIOC() {
    const q = iocQuery.trim().toLowerCase();
    const match = Object.entries(company.iocDb).find(([k]) => k.toLowerCase() === q);
    if (match) {
      setIocResult({ query: match[0], ...match[1] });
      update({ iocSearches: [...inv.iocSearches, q] });
    } else {
      setIocResult({ query: q, reputation: "UNKNOWN", confidence: "—", firstObserved: "—", related: [] });
      update({ iocSearches: [...inv.iocSearches, q] });
    }
  }

  const stagePct = Math.round((STAGES.indexOf(inv.stage) / STAGES.length) * 100);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Toast toast={toast} />
      {/* top bar */}
      <div className="border-b border-slate-800 bg-slate-950/95 sticky top-0 z-30">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-slate-400 hover:text-white"><ArrowLeft size={16} /></button>
            <div>
              <div className="text-white font-semibold text-sm leading-none">{company.name}</div>
              <div className="text-slate-500 text-[11px] mt-0.5">{company.alert.id} · {inv.stage}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Badge tone="red">{company.severity}</Badge>
            <div className="flex items-center gap-1 text-slate-300 font-mono"><Clock size={13} className="text-slate-500" />{fmtTime(timeLeft)}</div>
            <div className="text-slate-300">Score <span className={`font-bold ${acc.text}`}>{liveScore.total}</span></div>
            <div className="hidden sm:block w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full ${acc.bg}`} style={{ width: `${stagePct}%` }} /></div>
          </div>
        </div>
        <div className="px-4 pb-2.5"><StageBar current={inv.stage} /></div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[220px_1fr_260px]">
        {/* LEFT: case management */}
        <div className="border-r border-slate-800 bg-slate-950/60 p-3 flex lg:flex-col gap-1 overflow-x-auto">
          {CASE_TABS.map((t) => {
            const Icon = t.icon;
            const disabled = (t.id === "analysis" && inv.stage === "DETECT") || (t.id === "identify" && STAGES.indexOf(inv.stage) < STAGES.indexOf("IDENTIFY") && inv.findings.length === 0) || (t.id === "response" && STAGES.indexOf(inv.stage) < STAGES.indexOf("RESPOND")) || (t.id === "report" && STAGES.indexOf(inv.stage) < STAGES.indexOf("REPORT"));
            return (
              <button key={t.id} onClick={() => !disabled && setTab(t.id)} disabled={disabled}
                className={`flex items-center gap-2 text-left px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  tab === t.id ? `${acc.soft} ${acc.text}` : disabled ? "text-slate-700 cursor-not-allowed" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"}`}>
                <Icon size={14} /> {t.label} {disabled && <Lock size={11} className="ml-auto" />}
              </button>
            );
          })}
        </div>

        {/* CENTER */}
        <div className="p-5 overflow-y-auto max-h-[calc(100vh-90px)]">
          {tab === "overview" && (
            <div className="space-y-4">
              {inv.stage === "DETECT" ? (
                <Panel className="p-5 border-red-500/30">
                  <div className="flex items-center gap-2 mb-3"><AlertTriangle className="text-red-400" size={18} /><span className="text-red-400 font-semibold text-sm">{company.alert.title}</span></div>
                  <p className="text-slate-400 text-sm mb-4">{company.alert.body}</p>
                  <div className="grid grid-cols-2 gap-3 text-xs mb-5">
                    <div><div className="text-slate-500">Alert ID</div><div className="text-slate-200">{company.alert.id}</div></div>
                    <div><div className="text-slate-500">Time</div><div className="text-slate-200">{company.alert.time}</div></div>
                    <div><div className="text-slate-500">Severity</div><Badge tone="red">{company.alert.severity}</Badge></div>
                    <div><div className="text-slate-500">Source flag</div><div className="text-slate-200">{company.alert.device}</div></div>
                  </div>
                  <div className="border-t border-slate-800 pt-4">
                    <div className="text-slate-300 text-sm font-medium mb-2">Confirm the affected asset before proceeding.</div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {company.alert.assetOptions.map((a) => (
                        <button key={a} onClick={() => setAssetChoice(a)} className={`text-xs px-3 py-1.5 rounded border ${assetChoice === a ? `${acc.border} ${acc.soft} ${acc.text}` : "border-slate-800 text-slate-400 hover:border-slate-600"}`}>{a}</button>
                      ))}
                    </div>
                    <button onClick={submitDetect} disabled={!assetChoice} className={`${acc.bg} disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 text-sm font-semibold px-4 py-2 rounded-md`}>Acknowledge Alert</button>
                    {inv.detectWrongAttempts > 0 && <div className="text-red-400 text-xs mt-2">Incorrect attempts: {inv.detectWrongAttempts}</div>}
                  </div>
                </Panel>
              ) : (
                <>
                  <Panel className="p-5">
                    <div className="text-slate-300 font-semibold text-sm mb-3">Incident Overview</div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div><div className="text-slate-500">Company</div><div className="text-slate-200">{company.name}</div></div>
                      <div><div className="text-slate-500">Incident</div><div className="text-slate-200">{company.incidentTitle}</div></div>
                      <div><div className="text-slate-500">Affected Asset</div><div className="text-slate-200">{company.alert.correctAsset}</div></div>
                      <div><div className="text-slate-500">Investigation Style</div><div className="text-slate-200">{company.style}</div></div>
                    </div>
                  </Panel>
                  <Panel className="p-5">
                    <div className="text-slate-300 font-semibold text-sm mb-2">Next step</div>
                    <p className="text-slate-500 text-xs">Open the <span className="text-slate-300">Evidence</span> tab to begin investigating. New evidence unlocks as you review what you already have.</p>
                  </Panel>
                </>
              )}
            </div>
          )}

          {tab === "evidence" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-slate-300 font-semibold text-sm">Evidence ({unlocked.length} / {company.evidence.length} unlocked)</div>
                {STAGES.indexOf(inv.stage) === STAGES.indexOf("INVESTIGATE") && (
                  <button onClick={proceedToAnalyze} disabled={inv.viewedEvidence.length < 4}
                    className={`text-xs px-3 py-1.5 rounded-md font-semibold ${inv.viewedEvidence.length >= 4 ? `${acc.bg} text-slate-950` : "bg-slate-800 text-slate-600"}`}>
                    Proceed to Analysis {inv.viewedEvidence.length < 4 && `(${inv.viewedEvidence.length}/4 viewed)`}
                  </button>
                )}
              </div>
              <div className="grid gap-2">
                {unlocked.map((ev) => {
                  const Icon = EV_ICON[ev.type] || FileText;
                  const viewed = inv.viewedEvidence.includes(ev.id);
                  const mark = inv.marks[ev.id];
                  return (
                    <div key={ev.id} className="border border-slate-800 rounded-lg bg-slate-900/50 overflow-hidden">
                      <button onClick={() => viewEvidence(ev)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-900">
                        <div className="flex items-center gap-3">
                          <Icon size={16} className={viewed ? acc.text : "text-slate-500"} />
                          <div>
                            <div className="text-slate-200 text-sm font-medium">{ev.id} · {ev.title}</div>
                            <div className="text-slate-500 text-[11px]">{ev.type} · {ev.timestamp}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {mark && <Badge tone={mark === "suspicious" ? "amber" : "slate"}>{mark.toUpperCase()}</Badge>}
                          {viewed ? <Eye size={14} className="text-emerald-400" /> : <Badge tone="cyan">NEW</Badge>}
                        </div>
                      </button>
                      {selectedEvidence?.id === ev.id && (
                        <div className="px-4 pb-4 border-t border-slate-800 pt-3">
                          <p className="text-slate-300 text-sm mb-3">{ev.content}</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                            {Object.entries(ev.meta).map(([k, v]) => (
                              <div key={k} className="bg-slate-950 border border-slate-800 rounded px-2 py-1.5">
                                <div className="text-slate-600 text-[10px]">{k}</div>
                                <div className="text-slate-300 text-xs font-mono">{v}</div>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => markEvidence(ev, "suspicious")} className={`text-xs px-2.5 py-1 rounded border ${mark === "suspicious" ? "border-amber-500/50 bg-amber-500/10 text-amber-400" : "border-slate-800 text-slate-400 hover:border-slate-600"}`}>Mark Suspicious</button>
                            <button onClick={() => markEvidence(ev, "benign")} className={`text-xs px-2.5 py-1 rounded border ${mark === "benign" ? "border-slate-600 bg-slate-800 text-slate-300" : "border-slate-800 text-slate-400 hover:border-slate-600"}`}>Mark Benign</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <HintBox inv={inv} useHint={useHint} />
            </div>
          )}

          {tab === "timeline" && (
            <div className="space-y-2">
              <div className="text-slate-300 font-semibold text-sm mb-2">Timeline</div>
              {unlocked.filter((e) => e.type === "TIMELINE" || inv.viewedEvidence.includes(e.id)).sort((a, b) => a.id.localeCompare(b.id)).map((ev) => (
                <div key={ev.id} className="flex gap-3 border-l-2 border-slate-800 pl-4 py-1 relative">
                  <div className={`absolute -left-[5px] top-2 w-2 h-2 rounded-full ${acc.bg}`} />
                  <div>
                    <div className="text-slate-200 text-sm">{ev.id} — {ev.title} <span className="text-slate-600 text-xs">({ev.timestamp})</span></div>
                    <div className="text-slate-500 text-xs">{ev.content}</div>
                  </div>
                </div>
              ))}
              {inv.viewedEvidence.length === 0 && <p className="text-slate-600 text-sm">No evidence reviewed yet.</p>}
            </div>
          )}

          {tab === "ioc" && (
            <div className="space-y-4">
              <div className="text-slate-300 font-semibold text-sm">IOC Investigation</div>
              <div className="flex gap-2">
                <input value={iocQuery} onChange={(e) => setIocQuery(e.target.value)} placeholder="Search a domain, IP, or hash observed in evidence…"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/60" />
                <button onClick={searchIOC} disabled={!iocQuery.trim()} className={`${acc.bg} disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 text-sm font-semibold px-4 rounded-md`}>Search</button>
              </div>
              {iocResult && (
                <Panel className="p-4">
                  <div className="text-slate-200 font-mono text-sm mb-2">{iocResult.query}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div><span className="text-slate-500">Reputation: </span><Badge tone={iocResult.reputation === "MALICIOUS" ? "red" : iocResult.reputation === "SUSPICIOUS" ? "amber" : "slate"}>{iocResult.reputation}</Badge></div>
                    <div><span className="text-slate-500">Confidence: </span><span className="text-slate-300">{iocResult.confidence}</span></div>
                    <div><span className="text-slate-500">First Observed: </span><span className="text-slate-300">{iocResult.firstObserved}</span></div>
                    <div><span className="text-slate-500">Related Evidence: </span><span className="text-slate-300">{iocResult.related?.join(", ") || "—"}</span></div>
                  </div>
                </Panel>
              )}
              <div className="text-slate-600 text-xs">This offline intelligence database contains fictional indicators specific to this simulation.</div>
            </div>
          )}

          {tab === "analysis" && (
            <div className="space-y-4">
              <div className="text-slate-300 font-semibold text-sm">Evidence Correlation Board</div>
              <Panel className="p-4">
                <div className="text-xs text-slate-400 mb-2">Select the evidence items you believe are related:</div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {company.evidence.filter((e) => inv.viewedEvidence.includes(e.id)).map((ev) => (
                    <button key={ev.id} onClick={() => setCorrelationSel((s) => s.includes(ev.id) ? s.filter((x) => x !== ev.id) : [...s, ev.id])}
                      className={`text-xs px-2.5 py-1 rounded border font-mono ${correlationSel.includes(ev.id) ? `${acc.border} ${acc.soft} ${acc.text}` : "border-slate-800 text-slate-400 hover:border-slate-600"}`}>
                      {ev.id}
                    </button>
                  ))}
                </div>
                <input value={findingTitle} onChange={(e) => setFindingTitle(e.target.value)} placeholder="Finding title (e.g. 'Malicious download chain')"
                  className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 mb-2 outline-none focus:border-cyan-500/60" />
                <textarea value={findingReasoning} onChange={(e) => setFindingReasoning(e.target.value)} placeholder="Explain why this evidence is related…" rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 mb-2 outline-none focus:border-cyan-500/60" />
                <div className="flex items-center justify-between">
                  <select value={findingConfidence} onChange={(e) => setFindingConfidence(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-300">
                    <option>LOW</option><option>MEDIUM</option><option>HIGH</option>
                  </select>
                  <button onClick={createFinding} className={`${acc.bg} text-slate-950 text-xs font-semibold px-4 py-2 rounded-md flex items-center gap-1`}><Flag size={13} /> Create Finding</button>
                </div>
              </Panel>
              {inv.findings.length > 0 && (
                <div className="space-y-2">
                  {inv.findings.map((f) => (
                    <Panel key={f.id} className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-slate-200 text-sm font-medium">{f.id}: {f.title}</div>
                        <Badge tone="cyan">{f.confidence}</Badge>
                      </div>
                      <div className="text-slate-500 text-xs mb-1">Evidence: {f.evidenceIds.join(", ")}</div>
                      <div className="text-slate-400 text-xs">{f.reasoning}</div>
                    </Panel>
                  ))}
                </div>
              )}
              {STAGES.indexOf(inv.stage) === STAGES.indexOf("ANALYZE") && (
                <button onClick={proceedToIdentify} disabled={inv.findings.length === 0}
                  className={`text-xs px-4 py-2 rounded-md font-semibold ${inv.findings.length > 0 ? `${acc.bg} text-slate-950` : "bg-slate-800 text-slate-600"}`}>
                  Proceed to Identification
                </button>
              )}
              <HintBox inv={inv} useHint={useHint} />
            </div>
          )}

          {tab === "identify" && (
            <div className="space-y-4">
              <div className="text-slate-300 font-semibold text-sm">Identify the Incident</div>
              <p className="text-slate-500 text-xs">Using the evidence you discovered, determine the attack characteristics. Cite supporting evidence IDs.</p>
              {[
                { key: "attackType", label: "Attack Type", opts: company.identify.attackType.options },
                { key: "vector", label: "Attack Vector", opts: company.identify.vector.options },
                { key: "asset", label: "Affected Asset", opts: company.identify.asset.options },
                { key: "ioc", label: "Relevant IOC", opts: company.identify.ioc.options },
              ].map((f) => (
                <Panel key={f.key} className="p-3">
                  <div className="text-xs text-slate-400 mb-2">{f.label}</div>
                  <div className="flex flex-col gap-1.5">
                    {f.opts.map((o) => (
                      <button key={o} onClick={() => setIdForm({ ...idForm, [f.key]: o })}
                        className={`text-left text-xs px-3 py-2 rounded border ${idForm[f.key] === o ? `${acc.border} ${acc.soft} ${acc.text}` : "border-slate-800 text-slate-400 hover:border-slate-600"}`}>
                        {o}
                      </button>
                    ))}
                  </div>
                </Panel>
              ))}
              <Panel className="p-3">
                <div className="text-xs text-slate-400 mb-2">Confidence</div>
                <select value={idForm.confidence} onChange={(e) => setIdForm({ ...idForm, confidence: e.target.value })} className="bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-300">
                  <option>LOW</option><option>MEDIUM</option><option>HIGH</option>
                </select>
              </Panel>
              <Panel className="p-3">
                <div className="text-xs text-slate-400 mb-2">Supporting Evidence IDs</div>
                <input value={idForm.evidenceIds} onChange={(e) => setIdForm({ ...idForm, evidenceIds: e.target.value })} placeholder="e.g. E02, E03, E04"
                  className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/60" />
              </Panel>
              <button onClick={submitIdentification} className={`${acc.bg} text-slate-950 text-sm font-semibold px-5 py-2.5 rounded-md`}>Submit Identification</button>
            </div>
          )}

          {tab === "response" && (
            <div className="space-y-3">
              <div className="text-slate-300 font-semibold text-sm">Response Center</div>
              <p className="text-slate-500 text-xs">Select the defensive actions you would take. Not every action is appropriate — some are premature, insufficient, or actively harmful.</p>
              <div className="grid gap-2">
                {company.responses.map((r) => (
                  <button key={r.id} onClick={() => setRespSel((s) => s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id])}
                    className={`text-left text-sm px-3 py-2.5 rounded-md border ${respSel.includes(r.id) ? `${acc.border} ${acc.soft} ${acc.text}` : "border-slate-800 text-slate-300 hover:border-slate-600"}`}>
                    {r.label}
                  </button>
                ))}
              </div>
              <button onClick={submitResponse} disabled={respSel.length === 0} className={`${acc.bg} disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 text-sm font-semibold px-5 py-2.5 rounded-md`}>Submit Response Actions</button>
            </div>
          )}

          {tab === "report" && (
            <div className="space-y-3">
              <div className="text-slate-300 font-semibold text-sm">Incident Report</div>
              {company.report.map((f) => (
                <div key={f.key}>
                  <label className="text-xs text-slate-400 mb-1 block">{f.label}</label>
                  <textarea rows={2} value={reportDraft[f.key] || ""} onChange={(e) => setReportDraft({ ...reportDraft, [f.key]: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/60" />
                </div>
              ))}
              <button onClick={submitReport} className={`${acc.bg} text-slate-950 text-sm font-semibold px-5 py-2.5 rounded-md flex items-center gap-2`}><Send size={14} /> Submit Investigation</button>
            </div>
          )}

          {tab === "notes" && (
            <div className="space-y-2">
              <div className="text-slate-300 font-semibold text-sm">Case Notes (private, autosaved)</div>
              <textarea rows={14} value={inv.notes} onChange={(e) => update({ notes: e.target.value })} placeholder="Jot down observations, hypotheses, and reminders…"
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/60" />
            </div>
          )}
        </div>

        {/* RIGHT: tools / status */}
        <div className="border-l border-slate-800 bg-slate-950/60 p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-90px)]">
          <div>
            <div className="text-slate-500 text-[11px] font-semibold tracking-wide mb-2">LIVE SCORE</div>
            <div className="space-y-1.5 text-xs">
              {[["Detection", liveScore.detection, 100], ["Investigation", liveScore.investigation, 200], ["Analysis", liveScore.analysis, 200], ["Identification", liveScore.identification, 150], ["Response", liveScore.response, 200], ["Report", liveScore.report, 100], ["Efficiency", liveScore.efficiency, 50]].map(([label, val, max]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-slate-300 font-mono">{val}/{max}</span>
                </div>
              ))}
              <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between font-semibold">
                <span className="text-slate-300">Total</span>
                <span className={acc.text}>{liveScore.total}/1000</span>
              </div>
            </div>
          </div>
          <div>
            <div className="text-slate-500 text-[11px] font-semibold tracking-wide mb-2">INVESTIGATION STATUS</div>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between"><span>Evidence viewed</span><span className="text-slate-200">{inv.viewedEvidence.length}/{company.evidence.length}</span></div>
              <div className="flex justify-between"><span>Findings</span><span className="text-slate-200">{inv.findings.length}</span></div>
              <div className="flex justify-between"><span>Hints used</span><span className="text-slate-200">{inv.hintsUsed}/3</span></div>
              <div className="flex justify-between"><span>Wrong attempts</span><span className="text-slate-200">{inv.detectWrongAttempts}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HintBox({ inv, useHint }) {
  return (
    <Panel className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-slate-400 text-xs font-semibold flex items-center gap-1"><BookOpen size={13} /> Hints ({inv.hintsUsed}/3 used)</div>
        {inv.hintsUsed < 3 && <button onClick={useHint} className="text-xs text-amber-400 hover:text-amber-300">Reveal next hint (-{HINTS[inv.hintsUsed].cost} pts)</button>}
      </div>
      <div className="space-y-1.5">
        {HINTS.slice(0, inv.hintsUsed).map((h, i) => (
          <div key={i} className="text-xs text-amber-300/90 bg-amber-500/5 border border-amber-500/20 rounded px-2.5 py-1.5">{h.text}</div>
        ))}
      </div>
    </Panel>
  );
}

/* =========================================================================
   RESULTS
   ========================================================================= */

function ResultScreen({ company, inv, onContinue }) {
  const score = inv.finalScore;
  const pct = Math.round((score.total / 1000) * 100);
  const q = qualityLabel(pct);
  const rows = [["Detection", score.detection, 100], ["Investigation", score.investigation, 200], ["Analysis", score.analysis, 200], ["Identification", score.identification, 150], ["Response", score.response, 200], ["Report", score.report, 100], ["Efficiency", score.efficiency, 50]];
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <CheckCircle className="mx-auto text-emerald-400 mb-3" size={40} />
          <h1 className="text-2xl font-bold text-white">Investigation Complete</h1>
          <p className="text-slate-500 text-sm">{company.name} · {company.incidentTitle}</p>
        </div>
        <Panel className="p-6 mb-4">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-slate-500 text-xs">Final Score</div>
              <div className="text-3xl font-bold text-white">{score.total} <span className="text-slate-500 text-lg font-normal">/ 1000</span></div>
            </div>
            <Badge tone={q.tone}>{q.label} · {pct}%</Badge>
          </div>
          <div className="space-y-2">
            {rows.map(([label, val, max]) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">{label}</span><span className="text-slate-300">{val} / {max}</span></div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-cyan-500" style={{ width: `${(val / max) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Panel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-center">
          <Panel className="p-3"><div className="text-slate-500 text-[11px]">Evidence</div><div className="text-slate-200 font-semibold">{inv.viewedEvidence.length}/{company.evidence.length}</div></Panel>
          <Panel className="p-3"><div className="text-slate-500 text-[11px]">Findings</div><div className="text-slate-200 font-semibold">{inv.findings.length}</div></Panel>
          <Panel className="p-3"><div className="text-slate-500 text-[11px]">Hints Used</div><div className="text-slate-200 font-semibold">{inv.hintsUsed}</div></Panel>
          <Panel className="p-3"><div className="text-slate-500 text-[11px]">Wrong Attempts</div><div className="text-slate-200 font-semibold">{inv.detectWrongAttempts}</div></Panel>
        </div>
        <button onClick={onContinue} className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-3 rounded-md flex items-center justify-center gap-2">
          Return to SOC Command Center <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   ADMIN DASHBOARD
   ========================================================================= */

function AdminDashboard({ onBack, eventStatus, setEventStatus, timeLeft, sessions, profile }) {
  const values = Object.values(sessions);
  const completedList = values.filter((s) => s.finalScore);
  const activeList = values.filter((s) => !s.finalScore && s.stage !== "DETECT");
  const totalParticipants = 1; // only the signed-in analyst has a real session in this client-only build
  const totalCompleted = completedList.length;
  const combinedScore = values.reduce((a, s) => a + (s.finalScore?.total || 0), 0);
  const combinedHints = values.reduce((a, s) => a + s.hintsUsed, 0);
  const combinedWrong = values.reduce((a, s) => a + s.detectWrongAttempts, 0);
  const hasAnyActivity = values.some((s) => s.viewedEvidence.length > 0 || s.finalScore);

  const companyLabel = { fincore: "FinCore", medishield: "MediShield", cloudnova: "CloudNova" };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="border-b border-slate-800 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm"><ArrowLeft size={15} /> Exit Admin</button>
          <div className="text-white font-semibold text-sm flex items-center gap-2"><Shield size={16} className="text-cyan-400" /> DEFENDX Admin Console</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEventStatus("ACTIVE")} className={`text-xs px-3 py-1.5 rounded-md flex items-center gap-1 ${eventStatus === "ACTIVE" ? "bg-emerald-500 text-slate-950" : "bg-slate-900 text-slate-400 border border-slate-800"}`}><Play size={13} /> Start</button>
          <button onClick={() => setEventStatus("PAUSED")} className={`text-xs px-3 py-1.5 rounded-md flex items-center gap-1 ${eventStatus === "PAUSED" ? "bg-amber-500 text-slate-950" : "bg-slate-900 text-slate-400 border border-slate-800"}`}><Pause size={13} /> Pause</button>
          <button onClick={() => setEventStatus("ENDED")} className={`text-xs px-3 py-1.5 rounded-md flex items-center gap-1 ${eventStatus === "ENDED" ? "bg-red-500 text-slate-950" : "bg-slate-900 text-slate-400 border border-slate-800"}`}><Square size={13} /> End</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Panel className="p-4"><div className="text-slate-500 text-xs">Total Participants</div><div className="text-2xl font-bold text-white">{totalParticipants}</div></Panel>
          <Panel className="p-4"><div className="text-slate-500 text-xs">Active</div><div className="text-2xl font-bold text-cyan-400">{hasAnyActivity && totalCompleted < 3 ? 1 : 0}</div></Panel>
          <Panel className="p-4"><div className="text-slate-500 text-xs">Completed Investigations</div><div className="text-2xl font-bold text-emerald-400">{totalCompleted}</div></Panel>
          <Panel className="p-4"><div className="text-slate-500 text-xs">Combined Score</div><div className="text-2xl font-bold text-white">{combinedScore}</div></Panel>
        </div>

        <div>
          <div className="text-slate-300 font-semibold text-sm mb-3 flex items-center gap-2"><MonitorCheck size={15} /> Live Participant Monitor</div>
          <Panel className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  {["Name", "Team", "Company", "Stage", "Score", "Hints", "Wrong", "Status"].map((h) => <th key={h} className="text-left font-medium px-3 py-2.5">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {!hasAnyActivity ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-slate-600">
                      No investigations started yet. Once {profile.name || "the analyst"} enters a company SOC, live progress will appear here.
                    </td>
                  </tr>
                ) : (
                  Object.entries(sessions).map(([id, s]) => {
                    if (s.viewedEvidence.length === 0 && !s.finalScore) return null;
                    const status = s.finalScore ? "COMPLETED" : s.detectWrongAttempts >= 2 ? "NEEDS ATTENTION" : "ACTIVE";
                    return (
                      <tr key={id} className="border-b border-slate-900 hover:bg-slate-900/50">
                        <td className="px-3 py-2.5 text-slate-200">{profile.name || "Analyst"}</td>
                        <td className="px-3 py-2.5 text-slate-400">{profile.team || "—"}</td>
                        <td className="px-3 py-2.5 text-slate-400">{companyLabel[id]}</td>
                        <td className="px-3 py-2.5 text-slate-400">{s.stage}</td>
                        <td className="px-3 py-2.5 text-slate-200 font-mono">{s.finalScore?.total ?? "—"}</td>
                        <td className="px-3 py-2.5 text-slate-400">{s.hintsUsed}</td>
                        <td className="px-3 py-2.5 text-slate-400">{s.detectWrongAttempts}</td>
                        <td className="px-3 py-2.5"><Badge tone={status === "COMPLETED" ? "emerald" : status === "NEEDS ATTENTION" ? "red" : "cyan"}>{status}</Badge></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </Panel>
        </div>

        <div>
          <div className="text-slate-300 font-semibold text-sm mb-3 flex items-center gap-2"><BarChart3 size={15} /> Performance Analysis</div>
          {totalCompleted === 0 ? (
            <Panel className="p-6 text-center text-slate-600 text-sm">
              Performance analytics (average stage scores, most difficult stage, most-missed evidence, hint dependency) will populate once at least one investigation is completed.
            </Panel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Panel className="p-4 space-y-2 text-xs">
                {["detection", "investigation", "analysis", "identification", "response", "report"].map((k) => {
                  const label = k[0].toUpperCase() + k.slice(1);
                  const max = { detection: 100, investigation: 200, analysis: 200, identification: 150, response: 200, report: 100 }[k];
                  const vals = completedList.map((s) => s.finalScore[k]);
                  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
                  return <div key={k} className="flex justify-between"><span className="text-slate-500">Avg {label}</span><span className="text-slate-200 font-mono">{avg}/{max}</span></div>;
                })}
              </Panel>
              <Panel className="p-4 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Hints used (total)</span><span className="text-slate-200">{combinedHints}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Incorrect detection attempts (total)</span><span className="text-slate-200">{combinedWrong}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Investigations completed</span><span className="text-slate-200">{totalCompleted} / 3</span></div>
              </Panel>
            </div>
          )}
        </div>

        <div className="text-slate-600 text-xs border-t border-slate-800 pt-4">
          Challenge, evidence, hint, and scoring management (per the full spec) live in this same console in the production build. This client-only demo shows real, live data from the current session rather than seeded sample participants — connect it to the FastAPI/PostgreSQL backend for a persistent, multi-participant admin view.
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   ROOT APP
   ========================================================================= */

export default function DefendXApp() {
  const [screen, setScreen] = useState("login"); // login | dashboard | landing | workspace | result | admin
  const [profile, setProfile] = useState({ name: "", team: "" });
  const [eventStatus, setEventStatus] = useState("ACTIVE");
  const [timeLeft, setTimeLeft] = useState(90 * 60);
  const [sessions, setSessions] = useState(() => ({
    fincore: newInvestigation(), medishield: newInvestigation(), cloudnova: newInvestigation(),
  }));
  const [activeCompanyId, setActiveCompanyId] = useState(null);
  const [justCompletedId, setJustCompletedId] = useState(null);

  useEffect(() => {
    if (eventStatus !== "ACTIVE") return;
    const t = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [eventStatus]);

  useEffect(() => {
    if (timeLeft === 0 && eventStatus === "ACTIVE") setEventStatus("ENDED");
  }, [timeLeft, eventStatus]);

  const overall = useMemo(() => {
    const vals = Object.values(sessions);
    const total = vals.reduce((a, s) => a + (s.finalScore?.total || 0), 0);
    const completed = vals.filter((s) => s.finalScore).length;
    return { total, pct: Math.round((total / 3000) * 100), completed };
  }, [sessions]);

  // With a single live participant, rank is trivially 1st once progress exists.
  // A real deployment computes this server-side across all registered participants.
  const rank = 1;

  function handleLogin(name, team) { setProfile({ name, team }); setScreen("dashboard"); }
  function openCompany(id) { setActiveCompanyId(id); setScreen("landing"); }
  function updateInv(id, updater) {
    setSessions((prev) => ({ ...prev, [id]: typeof updater === "function" ? updater(prev[id]) : updater }));
  }
  function completeInvestigation(id, finalInv) {
    setSessions((prev) => ({ ...prev, [id]: finalInv }));
    setJustCompletedId(id);
    setScreen("result");
  }

  if (screen === "login") return <LoginScreen onLogin={handleLogin} />;

  if (screen === "admin")
    return <AdminDashboard onBack={() => setScreen("dashboard")} eventStatus={eventStatus} setEventStatus={setEventStatus} timeLeft={timeLeft} sessions={sessions} profile={profile} />;

  if (screen === "dashboard")
    return (
      <Dashboard profile={profile} sessions={sessions} eventStatus={eventStatus} timeLeft={timeLeft}
        onOpenCompany={openCompany} onExit={() => setScreen("login")} onAdmin={() => setScreen("admin")}
        rank={rank} overall={overall} />
    );

  if (screen === "landing" && activeCompanyId)
    return (
      <CompanySOCLanding company={COMPANIES[activeCompanyId]} inv={sessions[activeCompanyId]}
        onBack={() => setScreen("dashboard")} onEnter={() => setScreen("workspace")} />
    );

  if (screen === "workspace" && activeCompanyId)
    return (
      <InvestigationWorkspace company={COMPANIES[activeCompanyId]} inv={sessions[activeCompanyId]}
        setInv={(updater) => updateInv(activeCompanyId, updater)}
        onComplete={(finalInv) => completeInvestigation(activeCompanyId, finalInv)}
        onBack={() => setScreen("dashboard")} timeLeft={timeLeft} />
    );

  if (screen === "result" && justCompletedId)
    return (
      <ResultScreen company={COMPANIES[justCompletedId]} inv={sessions[justCompletedId]}
        onContinue={() => setScreen("dashboard")} />
    );

  return <Dashboard profile={profile} sessions={sessions} eventStatus={eventStatus} timeLeft={timeLeft} onOpenCompany={openCompany} onExit={() => setScreen("login")} onAdmin={() => setScreen("admin")} rank={rank} overall={overall} />;
}
