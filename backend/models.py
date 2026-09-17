import json
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float
)
from sqlalchemy.orm import relationship
from database import Base

def utcnow():
    return datetime.now(timezone.utc)

class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    team_name = Column(String(100), unique=True, index=True, nullable=False)
    team_code = Column(String(20), unique=True, index=True, nullable=False)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), nullable=True)
    difficulty = Column(String(20), default="Medium")
    time_limit_minutes = Column(Integer, default=60)
    max_hints = Column(Integer, default=3)
    status = Column(String(20), default="LOCKED")  # LOCKED, ACTIVE, PAUSED, COMPLETED
    score = Column(Float, default=0.0)
    score_breakdown_json = Column(Text, default="{}")
    analyst_1_name = Column(String(100), nullable=False)
    analyst_2_name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    # Relationships
    scenario = relationship("Scenario", back_populates="teams")
    analysts = relationship("Analyst", back_populates="team", cascade="all, delete-orphan")
    operation_state = relationship("TeamOperationState", back_populates="team", uselist=False, cascade="all, delete-orphan")
    team_evidence = relationship("TeamEvidence", back_populates="team", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="team", cascade="all, delete-orphan")
    ioc_searches = relationship("IOCSearch", back_populates="team", cascade="all, delete-orphan")
    actions = relationship("OperationAction", back_populates="team", cascade="all, delete-orphan")
    report = relationship("Report", back_populates="team", uselist=False, cascade="all, delete-orphan")
    score_breakdown = relationship("Score", back_populates="team", uselist=False, cascade="all, delete-orphan")
    scenario_progress = relationship("ScenarioProgress", back_populates="team", cascade="all, delete-orphan")

class Analyst(Base):
    __tablename__ = "analysts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    team = relationship("Team", back_populates="analysts")

class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    difficulty = Column(String(20), default="Medium")
    attack_type = Column(String(100), nullable=False)
    attack_vector = Column(String(100), nullable=False)
    affected_asset = Column(String(100), nullable=False)
    primary_ioc = Column(String(100), nullable=False)
    detection_signal = Column(Text, nullable=False)
    detection_options_json = Column(Text, default="[]")  # list of alert options
    identification_options_json = Column(Text, default="{}")  # attack types, vectors, assets, iocs options
    response_actions_json = Column(Text, default="[]")  # list of actions with classifications: CORRECT, DANGEROUS, INCORRECT
    timeline_json = Column(Text, default="[]")
    indicators_json = Column(Text, default="[]")  # list of authoritative IOC objects for IOC search
    stage_prompts_json = Column(Text, default="{}")
    tactical_hints_json = Column(Text, default="[]")
    report_fields_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    teams = relationship("Team", back_populates="scenario")
    evidences = relationship("Evidence", back_populates="scenario", cascade="all, delete-orphan")

    @property
    def detection_options(self):
        return json.loads(self.detection_options_json) if self.detection_options_json else []

    @property
    def identification_options(self):
        return json.loads(self.identification_options_json) if self.identification_options_json else {}

    @property
    def response_actions(self):
        return json.loads(self.response_actions_json) if self.response_actions_json else []

    @property
    def timeline(self):
        return json.loads(self.timeline_json) if self.timeline_json else []

    @property
    def indicators(self):
        return json.loads(self.indicators_json) if self.indicators_json else []

    @property
    def stage_prompts(self):
        return json.loads(self.stage_prompts_json) if self.stage_prompts_json else {}

    @property
    def tactical_hints(self):
        return json.loads(self.tactical_hints_json) if self.tactical_hints_json else []

    @property
    def report_fields(self):
        return json.loads(self.report_fields_json) if self.report_fields_json else []


class ScenarioProgress(Base):
    __tablename__ = "scenario_progress"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), nullable=False)
    current_stage = Column(String(20), default="DETECT")
    stage_status = Column(String(20), default="IN_PROGRESS")
    answers_json = Column(Text, default="{}")
    findings_json = Column(Text, default="[]")
    score = Column(Float, default=0.0)
    completion_status = Column(String(20), default="IN_PROGRESS")
    report_data_json = Column(Text, default="{}")
    detection_answer = Column(String(150), nullable=True)
    detection_correct = Column(Boolean, default=False)
    detection_attempts = Column(Integer, default=0)
    hints_used = Column(Integer, default=0)
    identification_submission_json = Column(Text, default="{}")
    identification_correct = Column(Boolean, default=False)
    selected_responses_json = Column(Text, default="[]")
    report_submitted = Column(Boolean, default=False)
    started_at = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    paused_at = Column(DateTime, nullable=True)
    total_paused_seconds = Column(Integer, default=0)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    team = relationship("Team", back_populates="scenario_progress")
    scenario = relationship("Scenario")

    @property
    def answers(self):
        return json.loads(self.answers_json) if self.answers_json else {}

    @property
    def findings(self):
        return json.loads(self.findings_json) if self.findings_json else []

    @property
    def report_data(self):
        return json.loads(self.report_data_json) if self.report_data_json else {}

    @property
    def identification_submission(self):
        return json.loads(self.identification_submission_json) if self.identification_submission_json else {}

    @property
    def selected_responses(self):
        return json.loads(self.selected_responses_json) if self.selected_responses_json else []

class Evidence(Base):
    __tablename__ = "evidences"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), nullable=False)
    evidence_code = Column(String(50), nullable=False)
    title = Column(String(150), nullable=False)
    evidence_type = Column(String(50), nullable=False)  # Email, Authentication log, Network log, Endpoint event, DNS record, Process event, File hash, Threat intelligence, User activity
    content = Column(Text, nullable=False)
    is_suspicious = Column(Boolean, default=False)
    is_authoritative = Column(Boolean, default=False)
    prerequisite_evidence_code = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=utcnow)

    scenario = relationship("Scenario", back_populates="evidences")
    team_evidence_links = relationship("TeamEvidence", back_populates="evidence", cascade="all, delete-orphan")

class TeamEvidence(Base):
    __tablename__ = "team_evidence"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    evidence_id = Column(Integer, ForeignKey("evidences.id"), nullable=False)
    viewed = Column(Boolean, default=False)
    is_flagged_suspicious = Column(Boolean, default=False)
    is_flagged_benign = Column(Boolean, default=False)
    viewed_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    team = relationship("Team", back_populates="team_evidence")
    evidence = relationship("Evidence", back_populates="team_evidence_links")

class TeamOperationState(Base):
    __tablename__ = "team_operation_states"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), unique=True, nullable=False)
    current_stage = Column(String(20), default="DETECT")  # DETECT, INVESTIGATE, ANALYZE, IDENTIFY, RESPOND, REPORT
    stage_status = Column(String(20), default="IN_PROGRESS")  # IN_PROGRESS, COMPLETED
    started_at = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    paused_at = Column(DateTime, nullable=True)
    total_paused_seconds = Column(Integer, default=0)
    detection_answer = Column(String(150), nullable=True)
    detection_correct = Column(Boolean, default=False)
    detection_attempts = Column(Integer, default=0)
    hints_used = Column(Integer, default=0)
    identification_submission_json = Column(Text, default="{}")
    identification_correct = Column(Boolean, default=False)
    selected_responses_json = Column(Text, default="[]")
    report_data_json = Column(Text, default="{}")
    report_submitted = Column(Boolean, default=False)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    team = relationship("Team", back_populates="operation_state")

    @property
    def identification_submission(self):
        return json.loads(self.identification_submission_json) if self.identification_submission_json else {}

    @property
    def selected_responses(self):
        return json.loads(self.selected_responses_json) if self.selected_responses_json else []

    @property
    def report_data(self):
        return json.loads(self.report_data_json) if self.report_data_json else {}

class Finding(Base):
    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    analyst_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    evidence_ids_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=utcnow)

    team = relationship("Team", back_populates="findings")

    @property
    def evidence_ids(self):
        return json.loads(self.evidence_ids_json) if self.evidence_ids_json else []

class IOCSearch(Base):
    __tablename__ = "ioc_searches"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    analyst_name = Column(String(100), nullable=False)
    query = Column(String(255), nullable=False)
    is_match = Column(Boolean, default=False)
    match_details_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=utcnow)

    team = relationship("Team", back_populates="ioc_searches")

    @property
    def match_details(self):
        return json.loads(self.match_details_json) if self.match_details_json else {}

class OperationAction(Base):
    __tablename__ = "operation_actions"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    analyst_name = Column(String(100), nullable=False)
    action_type = Column(String(50), nullable=False)
    payload_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=utcnow)

    team = relationship("Team", back_populates="actions")

    @property
    def payload(self):
        return json.loads(self.payload_json) if self.payload_json else {}

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), unique=True, nullable=False)
    analyst_name = Column(String(100), nullable=False)
    incident_summary = Column(Text, default="")
    attack_type = Column(String(150), default="")
    affected_asset = Column(String(150), default="")
    attack_vector = Column(String(150), default="")
    timeline = Column(Text, default="")
    key_evidence = Column(Text, default="")
    iocs = Column(Text, default="")
    impact = Column(Text, default="")
    containment = Column(Text, default="")
    recovery = Column(Text, default="")
    recommendations = Column(Text, default="")
    is_final = Column(Boolean, default=False)
    score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    team = relationship("Team", back_populates="report")

class Score(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), unique=True, nullable=False)
    total_score = Column(Float, default=0.0)  # Max 1000
    detection_score = Column(Float, default=0.0)  # Max 100
    investigation_score = Column(Float, default=0.0)  # Max 200
    analysis_score = Column(Float, default=0.0)  # Max 150
    identification_score = Column(Float, default=0.0)  # Max 150
    response_score = Column(Float, default=0.0)  # Max 200
    evidence_score = Column(Float, default=0.0)  # Max 100
    report_score = Column(Float, default=0.0)  # Max 100
    efficiency_score = Column(Float, default=0.0)  # Deductions/Bonuses
    accuracy_percentage = Column(Float, default=0.0)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    team = relationship("Team", back_populates="score_breakdown")

class AcademyModule(Base):
    __tablename__ = "academy_modules"

    id = Column(Integer, primary_key=True, index=True)
    module_number = Column(Integer, unique=True, nullable=False)
    title = Column(String(150), nullable=False)
    category = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    learning_objective = Column(Text, nullable=False)
    explanation = Column(Text, nullable=False)
    why_it_matters = Column(Text, nullable=False)
    example = Column(Text, nullable=False)
    guided_task = Column(Text, nullable=False)
    practice_activity = Column(Text, nullable=False)
    difficulty = Column(String(20), default="Beginner")
    quiz_questions_json = Column(Text, default="[]")  # list of question objects with options, correct answer index, explanation
    hints_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    progress_records = relationship("AcademyProgress", back_populates="module", cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="module", cascade="all, delete-orphan")

    @property
    def quiz_questions(self):
        return json.loads(self.quiz_questions_json) if self.quiz_questions_json else []

    @property
    def hints(self):
        return json.loads(self.hints_json) if self.hints_json else []

class AcademyProgress(Base):
    __tablename__ = "academy_progress"

    id = Column(Integer, primary_key=True, index=True)
    analyst_name = Column(String(100), index=True, nullable=False)
    module_id = Column(Integer, ForeignKey("academy_modules.id"), nullable=False)
    completed = Column(Boolean, default=False)
    task_completed = Column(Boolean, default=False)
    quiz_score = Column(Float, default=0.0)
    attempts = Column(Integer, default=0)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    module = relationship("AcademyModule", back_populates="progress_records")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    analyst_name = Column(String(100), index=True, nullable=False)
    module_id = Column(Integer, ForeignKey("academy_modules.id"), nullable=False)
    score = Column(Float, default=0.0)
    passed = Column(Boolean, default=False)
    answers_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=utcnow)

    module = relationship("AcademyModule", back_populates="quiz_attempts")

    @property
    def answers(self):
        return json.loads(self.answers_json) if self.answers_json else []

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=utcnow, index=True)
    actor = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False, index=True)
    team_code = Column(String(50), nullable=True, index=True)
    payload_json = Column(Text, default="{}")
    ip_address = Column(String(50), nullable=True)

    @property
    def payload(self):
        return json.loads(self.payload_json) if self.payload_json else {}

class CompetitionSettings(Base):
    __tablename__ = "competition_settings"

    id = Column(Integer, primary_key=True, index=True)
    status = Column(String(20), default="LOCKED")  # LOCKED, ACTIVE, PAUSED, COMPLETED
    registration_open = Column(Boolean, default=True)
    default_time_limit = Column(Integer, default=60)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
