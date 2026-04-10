"""Query expansion for better retrieval."""
from __future__ import annotations

import re


def expand_query(query: str) -> list[str]:
    """Generate multiple query variations for better retrieval.
    
    Args:
        query: Original user query
        
    Returns:
        List of query variations (max 3)
    """
    query_lower = query.lower()
    expansions = [query]
    
    # Common abbreviations and their expansions
    replacements = {
        "biotech": ["biotechnology", "biological technology", "bio-technology"],
        "prof": ["professor", "faculty member"],
        "dr": ["doctor", "professor"],
        "dept": ["department", "department of"],
        "email": ["contact email", "email address", "e-mail"],
        "phone": ["contact number", "mobile number", "telephone", "phone number"],
        "admission": ["admissions", "enrollment", "joining", "entry"],
        "exam": ["examination", "test", "assessment"],
        "result": ["results", "marks", "grades", "scores"],
        "schedule": ["timetable", "calendar", "dates"],
        "fee": ["fees", "tuition", "charges", "cost"],
        "hod": ["head of department", "department head", "chairperson"],
        "pg": ["postgraduate", "post graduate", "masters"],
        "ug": ["undergraduate", "under graduate", "bachelors"],
        "phd": ["ph.d", "doctorate", "doctoral"],
        "msc": ["m.sc", "master of science", "masters in science"],
        "bsc": ["b.sc", "bachelor of science", "bachelors in science"],
        "ma": ["m.a", "master of arts", "masters in arts"],
        "ba": ["b.a", "bachelor of arts", "bachelors in arts"],
    }
    
    # Apply replacements
    for short, full_forms in replacements.items():
        # Use word boundaries to avoid partial matches
        pattern = r'\b' + re.escape(short) + r'\b'
        if re.search(pattern, query_lower):
            for full in full_forms[:2]:  # Limit to 2 expansions per term
                expanded = re.sub(pattern, full, query_lower, flags=re.IGNORECASE)
                if expanded not in [e.lower() for e in expansions]:
                    expansions.append(expanded)
                    if len(expansions) >= 3:
                        break
            if len(expansions) >= 3:
                break
    
    # Add department-specific variations
    if "contact" in query_lower or "email" in query_lower or "phone" in query_lower:
        if "department" not in query_lower and "dept" not in query_lower:
            # Add department context
            dept_query = query + " department contact"
            if dept_query not in expansions:
                expansions.append(dept_query)
    
    return expansions[:3]  # Return top 3 variations


def extract_department_name(query: str) -> str | None:
    """Extract department name from query if present.
    
    Args:
        query: User query
        
    Returns:
        Department name if found, None otherwise
    """
    query_lower = query.lower()
    
    departments = [
        "biotechnology", "biotech",
        "botany",
        "zoology",
        "chemistry",
        "physics",
        "mathematics", "maths",
        "civil engineering",
        "information technology", "it",
        "computer science", "cs",
        "economics",
        "politics", "governance",
        "tourism",
        "education",
        "physical education",
        "english",
        "urdu",
        "kashmiri",
        "law",
        "journalism", "communication",
        "management",
        "commerce",
    ]
    
    for dept in departments:
        if dept in query_lower:
            return dept.title()
    
    return None
