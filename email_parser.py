import re
import html
from datetime import datetime
from bs4 import BeautifulSoup


# ==================== PLATFORM DETECTION ====================

def detect_platform(sender_email, subject, body):
    """Detect which platform the email is from."""
    sender_lower = (sender_email or "").lower()
    subject_lower = (subject or "").lower()

    if "linkedin" in sender_lower or "linkedin" in subject_lower:
        return "LinkedIn"
    elif "naukri" in sender_lower or "naukri" in subject_lower:
        return "Naukri"
    elif "indeed" in sender_lower or "indeed" in subject_lower:
        return "Indeed"
    elif "glassdoor" in sender_lower or "glassdoor" in subject_lower:
        return "Glassdoor"
    elif "wellfound" in sender_lower or "angel.co" in sender_lower:
        return "Wellfound"
    elif "instahyre" in sender_lower or "instahyre" in subject_lower:
        return "Instahyre"
    elif "hirist" in sender_lower or "hirist" in subject_lower:
        return "Hirist"
    elif "cutshort" in sender_lower or "cutshort" in subject_lower:
        return "CutShort"
    elif "internshala" in sender_lower or "internshala" in subject_lower:
        return "Internshala"
    elif "freshersworld" in sender_lower:
        return "FreshersWorld"
    elif "monster" in sender_lower:
        return "Monster"
    elif "shine" in sender_lower or "shine.com" in sender_lower:
        return "Shine"
    elif "ziprecruiter" in sender_lower:
        return "ZipRecruiter"
    elif "lever.co" in sender_lower:
        return "Lever"
    elif "greenhouse" in sender_lower:
        return "Greenhouse"
    elif "workday" in sender_lower:
        return "Workday"
    elif "icims" in sender_lower:
        return "iCIMS"
    elif "smartrecruiters" in sender_lower:
        return "SmartRecruiters"
    elif "successfactors" in sender_lower or "sap" in sender_lower:
        return "SAP SuccessFactors"
    elif "taleo" in sender_lower:
        return "Taleo"
    else:
        return "Direct/Company"


# ==================== CLEAN HTML ====================

def strip_boilerplate(text):
    """Strip footers, disclaimers, and system signatures from email body text."""
    if not text:
        return ""
    disclaimer_indicators = [
        "this is a system generated mail",
        "this is a system-generated",
        "do not reply to this email",
        "accenture has not authorized any agency",
        "accenture is committed to keeping your personal data",
        "read our privacy statement",
        "is committed to keeping your personal data",
        "confidentiality notice",
        "disclaimer:",
        "the information contained in this email",
        "if you receive any call or mail",
        "shine never asks for money"
    ]
    text_lower = text.lower()
    earliest_idx = len(text)
    for ind in disclaimer_indicators:
        idx = text_lower.find(ind)
        if idx != -1 and idx < earliest_idx:
            earliest_idx = idx
            
    if earliest_idx < len(text):
        text = text[:earliest_idx]
    return text.strip()


def clean_html(html_content):
    """Strip HTML tags, decode entities to plain text, and strip boilerplate/footers."""
    if not html_content:
        return ""
    soup = BeautifulSoup(html_content, "html.parser")
    text = soup.get_text(separator=" ", strip=True)
    text = html.unescape(text)
    # Collapse multiple whitespace
    text = re.sub(r"\s+", " ", text).strip()
    # Remove footer boilerplate
    text = strip_boilerplate(text)
    return text


# ==================== EXTRACT JOB ID ====================

def extract_job_id(text):
    """Extract job/reference ID from email text."""
    patterns = [
        r"(?:Job|Reference|Application|Requisition|Req|Tracking)\s*(?:ID|Number|No|#|Code)?\s*[:\-#]?\s*([A-Za-z0-9\-_/]+)",
        r"(?:Ref|Ref\.)\s*[:\-#]?\s*([A-Za-z0-9\-_]+)",
        r"#\s*([A-Z0-9\-]{4,20})",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            job_id = match.group(1).strip()
            # Filter out common false positives
            if len(job_id) >= 3 and job_id.lower() not in ["the", "for", "your", "this", "has", "was"]:
                return job_id
    return None


# ==================== CLEAN SUBJECT & TEXT HELPERS ====================

def clean_subject(subject):
    if not subject:
        return ""
    # Strip common prefixes like RE:, FW:, FWD:, [Naukri Alert], etc.
    subject = re.sub(r"^(?:RE|FWD?|FW)\s*:\s*", "", subject, flags=re.IGNORECASE)
    subject = re.sub(r"^\[.*?\]\s*", "", subject)
    return subject.strip()


def clean_extracted_text(text, is_company=False):
    if not text:
        return ""
    # Strip HTML tags
    text = re.sub(r"<[^>]*>", "", text)
    # Remove quotes and brackets
    text = re.sub(r"[<>\"'\[\]]", "", text)
    
    # Strip garbage trailing text/verbs
    garbage_suffixes = [
        r"\s+was\s+sent.*", r"\s+has\s+been\s+received.*", r"\s+received.*", r"\s+sent.*",
        r"\s+successfully.*", r"\s+confirmed.*", r"\s+confirmation.*", r"\s+alert.*",
        r"\s+application.*", r"\s+applied.*", r"\s+is\s+submitted.*", r"\s+submitted.*"
    ]
    for pattern in garbage_suffixes:
        text = re.sub(pattern, "", text, flags=re.IGNORECASE)
        
    text_lower = text.lower().strip()
        
    if is_company:
        # Common disclaimer or pronoun false-positives
        junk_companies = [
            "us", "we", "our", "you", "me", "hiring", "recruiter", "hr", "careers", "joining",
            "organization", "team", "helpline", "ethics", "accentures", "representative", "representatives",
            "disclaimer", "policy", "terms", "privacy", "jobs", "jobsalert", "jobsalerts", "opportunity",
            "shine", "naukri", "indeed", "glassdoor", "contactus", "notifications", "support", "no-reply"
        ]
        if text_lower in junk_companies or any(jk in text_lower for jk in ["ethics helpline", "present themselves", "accenture does not"]):
            return ""

        # Strip common corporate suffixes
        company_suffixes = [
            r"\s+pvt\s+ltd.*", r"\s+private\s+limited.*", r"\s+ltd.*", r"\s+limited.*",
            r"\s+inc\..*", r"\s+inc\b.*", r"\s+corp\..*", r"\s+corp\b.*", r"\s+corporation.*",
            r"\s+llc.*", r"\s+co\..*", r"\s+india.*", r"\s+technologies.*", r"\s+solutions.*"
        ]
        for pattern in company_suffixes:
            text = re.sub(pattern, "", text, flags=re.IGNORECASE)
        # If starts with "the ", strip it
        text = re.sub(r"^the\s+", "", text, flags=re.IGNORECASE)
        
        # Word count safety: Company names should be 1-3 words
        words = text.split()
        if len(words) > 3 or len(text) > 30:
            return ""
    else:
        # Strip leading phrases from role names
        role_prefixes = [
            r"^(?:your\s+)?application\s+(?:to|for)\s+(?:the\s+position\s+of\s+|the\s+role\s+of\s+|the\s+)?",
            r"^applied\s+(?:to|for)\s+(?:the\s+position\s+of\s+|the\s+role\s+of\s+|the\s+)?",
            r"^for\s+(?:the\s+post\s+of\s+|the\s+position\s+of\s+|the\s+)?",
            r"^post\s+of\s+", r"^position\s+of\s+", r"^role\s+of\s+",
            r"^indeed\s+application\s*:\s*", r"^job\s+application\s*:\s*", r"^application\s*:\s*"
        ]
        for pattern in role_prefixes:
            text = re.sub(pattern, "", text, flags=re.IGNORECASE)
            
        # Role name safety check
        junk_roles = ["resume", "profile", "password", "leaderboard", "contest", "quiz", "invitation", "walk-in", "walk in"]
        if any(jr in text_lower for jr in junk_roles) or len(text.split()) > 5 or len(text) > 50:
            return ""
            
    # Clean up double spaces and trailing punctuation
    text = re.sub(r"\s+", " ", text).strip()
    text = text.strip(" .,-–|!")
    return text


# ==================== EXTRACT COMPANY & ROLE ====================

def extract_company_role_by_platform(platform, subject, body_text):
    """Platform-specific extraction for highest accuracy."""
    subj_clean = clean_subject(subject)
    plat = (platform or "").lower()

    # 1. LinkedIn
    if "linkedin" in plat:
        # Pattern: "Your application to Software Engineer at TechCorp was sent"
        match = re.search(r"application\s+(?:to|for)\s+(.+?)\s+at\s+(.+?)(?:\s+was\s+sent|\s*$)", subj_clean, re.IGNORECASE)
        if match:
            return match.group(2), match.group(1)
        # Pattern: "You applied to Software Engineer at TechCorp"
        match = re.search(r"applied\s+(?:to|for)\s+(.+?)\s+at\s+(.+?)(?:\s*[-–|]|\s*$)", subj_clean, re.IGNORECASE)
        if match:
            return match.group(2), match.group(1)

    # 2. Indeed
    elif "indeed" in plat:
        # Pattern: "Indeed Application: Software Engineer at TechCorp"
        match = re.search(r"Indeed\s+Application:\s*(.+?)\s+at\s+(.+?)(?:\s*[-–|]|\s*$)", subj_clean, re.IGNORECASE)
        if match:
            return match.group(2), match.group(1)
        # Pattern: "You applied to TechCorp: Software Engineer"
        match = re.search(r"applied\s+to\s+(.+?)\s*:\s*(.+?)(?:\s*[-–|]|\s*$)", subj_clean, re.IGNORECASE)
        if match:
            return match.group(1), match.group(2)

    # 3. Naukri
    elif "naukri" in plat:
        # Pattern: "Application Confirmation - TechCorp - Software Engineer"
        match = re.search(r"Application\s+Confirmation\s*-\s*(.+?)\s*-\s*(.+?)(?:\s*[-–|]|\s*$)", subj_clean, re.IGNORECASE)
        if match:
            return match.group(1), match.group(2)
        # Pattern: "Confirmation of your application for Software Engineer at TechCorp"
        match = re.search(r"application\s+for\s+(?:the\s+post\s+of\s+)?(.+?)\s+at\s+(.+?)(?:\s*[-–|]|\s*$)", subj_clean, re.IGNORECASE)
        if match:
            return match.group(2), match.group(1)

    # 4. Instahyre
    elif "instahyre" in plat:
        # Pattern: "You have successfully applied to TechCorp"
        match = re.search(r"successfully\s+applied\s+to\s+(.+?)(?:\s*[-–|!.]|\s*$)", subj_clean, re.IGNORECASE)
        if match:
            return match.group(1), "Software Engineer"
        # Pattern: "Application received: TechCorp"
        match = re.search(r"Application\s+received:\s*(.+?)(?:\s*[-–|!.]|\s*$)", subj_clean, re.IGNORECASE)
        if match:
            return match.group(1), "Software Engineer"

    # 5. Internshala
    elif "internshala" in plat:
        # Pattern: "Application received for internship: Web Developer at TechCorp"
        match = re.search(r"internship\s*:\s*(.+?)\s+at\s+(.+?)(?:\s*[-–|]|\s*$)", subj_clean, re.IGNORECASE)
        if match:
            return match.group(2), match.group(1)
        # Pattern: "Your application for Web Developer at TechCorp has been sent"
        match = re.search(r"application\s+for\s+(.+?)\s+at\s+(.+?)(?:\s*[-–|]|\s*$)", subj_clean, re.IGNORECASE)
        if match:
            return match.group(2), match.group(1)

    return None, None


def extract_company_role_from_subject(subject):
    """Fallback general subject parser if platform-specific didn't match."""
    subj_clean = clean_subject(subject)

    # Pattern: "ROLE at COMPANY" or "ROLE with COMPANY"
    match = re.search(r"(.+?)\s+(?:at|with)\s+(.+?)(?:\s*[-–|]|\s*$)", subj_clean, re.IGNORECASE)
    if match:
        return match.group(2), match.group(1)

    # Pattern: "COMPANY - ROLE" or "ROLE - COMPANY"
    match = re.search(r"^(.+?)\s*[-–|]\s*(.+?)(?:\s*[-–|]|\s*$)", subj_clean)
    if match:
        part1 = match.group(1).strip()
        part2 = match.group(2).strip()
        
        role_keywords = ["engineer", "developer", "analyst", "manager", "designer", "intern",
                         "associate", "consultant", "specialist", "lead", "architect", "scientist",
                         "executive", "coordinator", "administrator", "trainee", "programmer", "program"]
        if any(kw in part2.lower() for kw in role_keywords):
            return part1, part2
        elif any(kw in part1.lower() for kw in role_keywords):
            return part2, part1

    # Pattern: "Application for COMPANY ROLE" or "Application for ROLE"
    match = re.search(r"application\s+for\s+(.+?)(?:\s*[-–|]|\s*$)", subj_clean, re.IGNORECASE)
    if match:
        extracted = match.group(1).strip()
        # Heuristic: if it contains user's name, strip it
        extracted = re.sub(r"\b(?:selvakumar|kprof|k)\b.*", "", extracted, flags=re.IGNORECASE).strip()
        return None, extracted
            
    # Pattern: "Thank you for applying to COMPANY"
    match = re.search(r"(?:thank\s+you\s+for\s+applying\s+(?:to|at|for))\s+(.+?)(?:\s*[-–|!.]|\s*$)", subj_clean, re.IGNORECASE)
    if match:
        return match.group(1), None

    return None, None


def extract_company_from_assessment_invite(body_text, sender_email):
    """If the email is from a test provider, look for the employer company in the body."""
    sender_lower = (sender_email or "").lower()
    # Check if sender is a known assessment platform
    assessment_platforms = ["shl", "hackerrank", "codility", "glider", "cocubes", "mettl", "hirevue", "testdome", "merittrac"]
    is_platform = any(plat in sender_lower for plat in assessment_platforms)
    
    if is_platform:
        # Search for employer patterns in the body
        patterns = [
            r"([A-Za-z0-9\s\-]+)\s+(?:has|have)\s+(?:invited\s+you|requested\s+you)",
            r"(?:on\s+behalf\s+of|behalf\s+of)\s+([A-Za-z0-9\s\-]+)",
            r"(?:for|at|with)\s+([A-Za-z0-9\s\-]+)\s+(?:assessment|test|interview|hiring|recruitment)",
            r"invited\s+by\s+([A-Za-z0-9\s\-]+)",
            r"([A-Za-z0-9\s\-]+)\s+Assessment\s+Invitation"
        ]
        for pattern in patterns:
            match = re.search(pattern, body_text, re.IGNORECASE)
            if match:
                extracted = clean_extracted_text(match.group(1), is_company=True)
                if extracted and extracted.lower() not in assessment_platforms:
                    return extracted
    return None


def extract_company_role_from_body(body_text):
    """Extract company and role from email body text."""
    # 1. Pattern: "applying/applied/application to COMPANY for ROLE"
    match = re.search(
        r"(?:applying|applied|application)\s+(?:to|at)\s+(.+?)\s+for\s+(?:the\s+)?(?:position\s+of\s+|role\s+of\s+|post\s+of\s+|job\s+of\s+)?(.+?)(?:[\.\,\!\n]|$)",
        body_text, re.IGNORECASE
    )
    if match:
        return match.group(1), match.group(2)

    # 2. Pattern: "application/applying/applied for ROLE with/at COMPANY"
    match = re.search(
        r"(?:applying|applied|application)\s+for\s+(?:the\s+)?(?:position\s+of\s+|role\s+of\s+|post\s+of\s+|job\s+of\s+)?(.+?)\s+(?:at|with)\s+(.+?)(?:[\.\,\!\n]|$)",
        body_text, re.IGNORECASE
    )
    if match:
        return match.group(2), match.group(1)

    # 3. Pattern: "ROLE position/role at COMPANY"
    match = re.search(
        r"(.+?)\s+(?:role|position|job)\s+(?:at|with)\s+(.+?)(?:[\.\,\!\n]|$)",
        body_text, re.IGNORECASE
    )
    if match:
        return match.group(2), match.group(1)

    # 4. Pattern: "interest in COMPANY"
    match = re.search(
        r"(?:interest|applying)\s+(?:in|to|at)\s+(.+?)(?:[\.\,\!\n]|$)",
        body_text, re.IGNORECASE
    )
    if match:
        return match.group(1), None

    return None, None


def extract_company_from_sender(sender_email):
    """Fallback: extract company name from sender's email domain."""
    if not sender_email:
        return None

    match = re.search(r"@([a-zA-Z0-9\-]+)\.", sender_email)
    if match:
        domain = match.group(1)
        generic = ["gmail", "yahoo", "hotmail", "outlook", "mail", "noreply", "no-reply",
                    "notifications", "linkedin", "naukri", "indeed", "glassdoor", "google"]
        if domain.lower() not in generic:
            return domain.capitalize()
    return None


# ==================== DETECT STATUS UPDATES ====================

def detect_status_from_email(subject, body_text):
    """Detect if the email indicates a status change."""
    text = (subject + " " + body_text).lower()

    # Order matters: most specific first
    if any(kw in text for kw in ["offer letter", "congratulations", "we are pleased to offer you",
                                  "excited to offer you", "send you a job offer", "attached job offer"]):
        return "Offer"

    if any(kw in text for kw in ["unfortunately", "regret to inform", "regret to know", "not moving forward",
                                  "decided not to proceed", "position has been filled", "no longer interested in pursuing",
                                  "not selected", "rejected", "will not be proceeding", "stands withdrawn", "withdrawn"]):
        return "Rejected"

    if any(kw in text for kw in ["coding challenge", "technical assessment", "assessment link",
                                  "online test", "hackerrank", "hackerearth", "codility",
                                  "online assessment", "pre-screening test", "aptitude test",
                                  "technical test"]):
        return "Assessment"

    if any(kw in text for kw in ["interview scheduled", "schedule an interview",
                                  "interview invitation", "round of interview",
                                  "discussion with", "call with"]):
        return "Interview"

    if any(kw in text for kw in ["shortlisted", "moved forward", "next round",
                                  "profile shortlisted", "been selected for"]):
        return "Shortlisted"

    if any(kw in text for kw in ["application received", "thank you for applying",
                                  "successfully submitted", "application confirmation",
                                  "applied successfully"]):
        return "Applied"

    return "Applied"


# ==================== EXTRACT LOCATION ====================

def extract_location(text):
    """Try to extract job location from email text."""
    # Pattern: "Location: CITY" or "Location - CITY"
    match = re.search(r"(?:Location|City|Office|Based\s+in)\s*[:\-]\s*(.+?)[\.\,\n]", text, re.IGNORECASE)
    if match:
        return match.group(1).strip()[:100]

    # Common Indian cities
    cities = ["Bangalore", "Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Chennai",
              "Pune", "Kolkata", "Noida", "Gurgaon", "Gurugram", "Ahmedabad",
              "Jaipur", "Coimbatore", "Kochi", "Chandigarh", "Indore", "Lucknow",
              "Remote", "Work from Home", "WFH", "Hybrid"]

    for city in cities:
        if re.search(r"\b" + re.escape(city) + r"\b", text, re.IGNORECASE):
            return city

    return ""


# ==================== MAIN PARSE FUNCTION ====================

def parse_email(subject, body_html, sender_email, received_date=None):
    """
    Parse a job-related email and extract structured data.

    Returns:
        dict with keys: company, role, job_id, location, status, source_platform,
                        confidence, applied_date
        or None if the email doesn't look job-related
    """
    body_text = clean_html(body_html) if body_html else ""
    platform = detect_platform(sender_email, subject, body_text)

    # 1. Try platform-specific extraction first (very accurate)
    company, role = extract_company_role_by_platform(platform, subject, body_text)
    company = clean_extracted_text(company, is_company=True)
    role = clean_extracted_text(role, is_company=False)

    # 2. Check if this is an assessment platform invite and pull the employer name
    if not company:
        company_invite = extract_company_from_assessment_invite(body_text, sender_email)
        if company_invite:
            company = company_invite

    if not company or not role:
        # Fallback to subject general parser
        company_subj, role_subj = extract_company_role_from_subject(subject or "")
        company_subj = clean_extracted_text(company_subj, is_company=True)
        role_subj = clean_extracted_text(role_subj, is_company=False)
        
        # Fallback to body general parser
        company_body, role_body = extract_company_role_from_body(body_text)
        company_body = clean_extracted_text(company_body, is_company=True)
        role_body = clean_extracted_text(role_body, is_company=False)
        
        # Fallback to sender domain
        company_sender = extract_company_from_sender(sender_email)
        company_sender = clean_extracted_text(company_sender, is_company=True)

        # Pick best values
        if not company:
            company = company_subj or company_body or company_sender
        if not role:
            role = role_subj or role_body

    company = company[:200] if company else ""
    role = role[:200] if role else ""

    # Strip company prefix from role if they overlap
    if company and role:
        comp_lower = company.lower()
        role_lower = role.lower()
        if role_lower.startswith(comp_lower):
            role = role[len(company):].strip(" -–|:")

    # If we couldn't extract both, return with low confidence
    job_id = extract_job_id((subject or "") + " " + body_text)
    location = extract_location(body_text)
    status = detect_status_from_email(subject or "", body_text)

    # Calculate confidence
    if company and role:
        confidence = "high"
    elif company or role:
        confidence = "medium"
    else:
        confidence = "low"

    # Use subject as fallback for role ONLY if it looks like a real role, else guess or keep empty
    if not role and subject:
        subj_clean = clean_extracted_text(subject, is_company=False)
        role_keywords = ["engineer", "developer", "analyst", "manager", "designer", "intern",
                         "associate", "consultant", "specialist", "lead", "architect", "scientist",
                         "executive", "coordinator", "administrator", "trainee", "programmer", "support"]
        if any(kw in subj_clean.lower() for kw in role_keywords):
            role = subj_clean
            confidence = "medium"
        else:
            role = "Software Engineer"  # default sensible fallback
            confidence = "low"

    # Skip if we have nothing useful
    if not company and not role:
        return None

    return {
        "company": company or "Unknown Company",
        "role": role or "Unknown Role",
        "job_id": job_id,
        "location": location,
        "status": status,
        "source_platform": platform,
        "confidence": confidence,
        "applied_date": received_date or datetime.now().strftime("%Y-%m-%d"),
    }


# ==================== IS JOB EMAIL? ====================

def is_job_related_email(subject, body_text, sender):
    """Check if an email is likely job/application related, filtering out newsletters and promotions."""
    subj = (subject or "").lower()
    sender_lower = (sender or "").lower()
    body = (body_text or "").lower()
    text = subj + " " + body

    # Exclude promotional or system management domains
    block_senders = ["@news.", "newsletter", "alert@", "digest", "recommendations", "job-alerts", "no-reply@linkedin.com", "notifications@linkedin.com", "shine.com", "jobsalert"]
    if any(snd in sender_lower for snd in block_senders):
        if not any(word in subj for word in ["application", "interview", "applied", "assessment"]):
            return False

    # Strict list of negative triggers
    negative_patterns = [
        "reset your password", "verify your email", "welcome to indeed", "welcome to linkedin", 
        "welcome to shine", "welcome to naukri", "similar jobs", "leaderboard", "weekly digest", 
        "recommendation", "top suggestions", "skills required to become", "last few days to enroll",
        "quiz", "contest", "coding challenge is open for registration", "invitation to connect", 
        "people are viewing your profile", "monthly leaderboard", "verify email", "your password", 
        "verify your account", "complete your profile", "activate your account", "welcome to codechef"
    ]
    if any(pat in text for pat in negative_patterns):
        return False

    # Positive application triggers (subject or body must have these)
    positive_phrases = [
        # confirmations
        "thank you for applying", "application received", "successfully submitted", 
        "application confirmation", "applied successfully", "your application to", 
        "applied for", "confirm your application", "thank you for your interest in",
        # status updates
        "interview invitation", "schedule an interview", "coding challenge", "technical assessment",
        "online assessment", "online test", "assessment link", "hackerrank", "codility", "hackerearth",
        "shortlisted", "moved forward in the process", "congratulations! you’re on our shortlist", 
        "offer letter", "we are pleased to offer", "not proceeding with your application", 
        "update on your application", "status of your application", "hiring for intern", 
        "urgently hiring for", "walk-in interview"
    ]
    
    # Must match at least one positive phrase
    if any(phrase in text for phrase in positive_phrases):
        return True

    # Secondary check: has job + application related keywords together in subject
    has_action = any(act in subj for act in ["applied", "application", "interview", "assessment", "shortlist", "offer", "update", "hiring", "fresher"])
    has_role = any(role in subj for role in ["engineer", "developer", "intern", "analyst", "trainee", "associate"])
    if has_action and has_role:
        return True

    return False
