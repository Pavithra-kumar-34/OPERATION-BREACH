from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# ----------------- Auth Schemas -----------------
class AdminLoginRequest(BaseModel):
    email: str
    password: str

class ParticipantLoginRequest(BaseModel):
    analyst_name: str
    team_code: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_info: Dict[str, Any]

class UserMeResponse(BaseModel):
    role: str
    email: Optional[str] = None
    analyst_name: Optional[str] = None
    team_id: Optional[int] = None
    team_name: Optional[str] = None
    team_code: Optional[str] = None
    scenario_id: Optional[int] = None

# ----------------- Team Schemas -----------------
class TeamCreateRequest(BaseModel):
    team_name: str
    analyst_1_name: str
    analyst_2_name: str
    scenario_id: Optional[int] = None
    difficulty: str = "Medium"
    time_limit_minutes: int = 60
    max_hints: int = 3

class TeamReassignRequest(BaseModel):
    scenario_id: int

class TeamUpdateRequest(BaseModel):
    team_name: Optional[str] = None
    difficulty: Optional[str] = None
    time_limit_minutes: Optional[int] = None
    max_hints: Optional[int] = None
    status: Optional[str] = None

class TeamResponse(BaseModel):
    id: int
    team_name: str
    team_code: str
    scenario_id: Optional[int] = None
    scenario_name: Optional[str] = None
    difficulty: str
    time_limit_minutes: int
    max_hints: int
    status: str
    score: float
    analyst_1_name: str
    analyst_2_name: str
    current_stage: Optional[str] = "DETECT"
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TeamDetailResponse(BaseModel):
    team: TeamResponse
    operation_state: Optional[Dict[str, Any]] = None
    score_breakdown: Optional[Dict[str, Any]] = None
    viewed_evidence_count: int = 0
    total_evidence_count: int = 0
    hints_used: int = 0
    max_hints: int = 3
    findings: List[Dict[str, Any]] = []
    ioc_searches: List[Dict[str, Any]] = []
    recent_activity: List[Dict[str, Any]] = []

# ----------------- Scenario & Evidence Schemas -----------------
class EvidenceResponse(BaseModel):
    id: int
    evidence_code: str
    title: str
    evidence_type: str
    content: str
    is_suspicious: bool = False
    is_authoritative: bool = False
    prerequisite_evidence_code: Optional[str] = None
    is_locked: bool = False
    viewed: bool = False
    is_flagged_suspicious: bool = False
    is_flagged_benign: bool = False
    viewed_by: Optional[str] = None

class ScenarioSummaryResponse(BaseModel):
    id: int
    key: str
    name: str
    description: str
    difficulty: str

class ScenarioDetailResponse(BaseModel):
    id: int
    key: str
    name: str
    description: str
    difficulty: str
    detection_signal: str
    detection_options: List[Dict[str, Any]]
    identification_options: Dict[str, Any]
    response_actions: List[Dict[str, Any]]
    timeline: List[Dict[str, Any]]
    evidence_count: int
    stage_prompts: Dict[str, str] = {}
    tactical_hints: List[str] = []
    report_fields: List[Dict[str, Any]] = []

# ----------------- Academy Schemas -----------------
class AcademyModuleSummary(BaseModel):
    id: int
    module_number: int
    title: str
    category: str
    description: str
    difficulty: str
    completed: bool = False
    quiz_score: float = 0.0
    attempts: int = 0

class AcademyModuleDetail(BaseModel):
    id: int
    module_number: int
    title: str
    category: str
    description: str
    learning_objective: str
    explanation: str
    why_it_matters: str
    example: str
    guided_task: str
    practice_activity: str
    difficulty: str
    hints: List[str]
    quiz_questions: List[Dict[str, Any]]
    completed: bool = False
    task_completed: bool = False
    quiz_score: float = 0.0
    attempts: int = 0

class TaskSubmitRequest(BaseModel):
    module_id: int
    task_solution: str

class QuizSubmitRequest(BaseModel):
    module_id: int
    answers: List[int]

class QuizResultResponse(BaseModel):
    module_id: int
    score: float
    passed: bool
    correct_count: int
    total_questions: int
    feedback: List[Dict[str, Any]]
    module_completed: bool

class RecommendationResponse(BaseModel):
    overall_progress: float
    completed_modules: int
    total_modules: int
    current_next_step: Optional[AcademyModuleSummary] = None
    recommendations: List[Dict[str, Any]] = []
    is_certified: bool = False

# ----------------- Operation Schemas -----------------
class DetectSubmitRequest(BaseModel):
    selected_option_id: str

class EvidenceFlagRequest(BaseModel):
    evidence_id: int
    flag_type: str  # "suspicious", "benign", or "clear"

class IOCSearchRequest(BaseModel):
    query: str

class IOCSearchResponse(BaseModel):
    query: str
    is_match: bool
    status: str
    details: Optional[Dict[str, Any]] = None

class FindingCreateRequest(BaseModel):
    description: str
    evidence_ids: List[int] = []

class FindingResponse(BaseModel):
    id: int
    analyst_name: str
    description: str
    evidence_ids: List[int]
    created_at: datetime

class IdentifySubmitRequest(BaseModel):
    attack_type: str
    attack_vector: str
    affected_asset: str
    primary_ioc: str

class ResponseSubmitRequest(BaseModel):
    selected_action_ids: List[str]

class ReportUpdateRequest(BaseModel):
    incident_summary: Optional[str] = None
    attack_type: Optional[str] = None
    affected_asset: Optional[str] = None
    attack_vector: Optional[str] = None
    timeline: Optional[str] = None
    key_evidence: Optional[str] = None
    iocs: Optional[str] = None
    impact: Optional[str] = None
    containment: Optional[str] = None
    recovery: Optional[str] = None
    recommendations: Optional[str] = None

class TabSwitchRequest(BaseModel):
    blurred_at: Optional[datetime] = None

class OperationStatusResponse(BaseModel):
    team_id: int
    team_name: str
    team_code: str
    scenario_id: Optional[int]
    scenario_name: Optional[str]
    status: str  # LOCKED, ACTIVE, PAUSED, COMPLETED
    current_stage: str  # DETECT, INVESTIGATE, ANALYZE, IDENTIFY, RESPOND, REPORT
    stage_status: str
    started_at: Optional[datetime]
    end_time: Optional[datetime]
    paused_at: Optional[datetime]
    time_remaining_seconds: int
    total_time_seconds: int
    hints_used: int
    max_hints: int
    total_score: float
    score_breakdown: Dict[str, float]
    completed_stages: List[str]
    analyst_1: str
    analyst_2: str
    scenario_completed: bool = False

# ----------------- Scoring & Leaderboard Schemas -----------------
class LeaderboardEntry(BaseModel):
    rank: int
    team_name: str
    team_code: str
    scenario_name: str
    score: float
    accuracy_percentage: float
    efficiency_score: float
    current_stage: str
    status: str
    completed: bool

# ----------------- Admin Schemas -----------------
class CompetitionControlRequest(BaseModel):
    action: str  # "START", "PAUSE", "RESUME", "END", "RESET"

class AnalyticsOverview(BaseModel):
    total_teams: int
    active_teams: int
    completed_teams: int
    total_participants: int
    average_score: float
    average_accuracy: float
    average_completion: float
    average_efficiency: float
    academy_average_completion: float
    operation_completion_rate: float
    stage_distribution: Dict[str, int]
    score_distribution: Dict[str, int]

class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    actor: str
    role: str
    action: str
    team_code: Optional[str]
    payload: Dict[str, Any]
    ip_address: Optional[str]
