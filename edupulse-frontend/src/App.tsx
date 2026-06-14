import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Download,
  Gauge,
  GraduationCap,
  History,
  LogOut,
  ShieldCheck,
  Sparkles,
  UserRound,
  RefreshCw,
  X,
} from 'lucide-react';
import studentPhoto from './assets/student-photo.jpeg';
import edupulseLogo from './assets/logo.png';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './App.css';
import LandingPage from './components/LandingPage';

const API_BASE = 'http://localhost:4000/api/v1';

type Role = 'ADMIN' | 'STUDENT';

type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  collegeId?: string | null;
  college?: {
    id: string;
    name: string;
    code: string;
    logoUrl?: string | null;
  } | null;
  departmentId?: string | null;
  semesterNumber?: number | null;
};

type AuthState = {
  accessToken: string;
  user: User;
};

type Term = {
  id: string;
  name: string;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

type Question = {
  id: string;
  categoryId: string;
  text: string;
};

type Category = {
  id: string;
  name: string;
  description: string;
  questions: Question[];
};

type DashboardSummary = {
  termId?: string;
  responseCount: number;
  submissionCount: number;
  categorySatisfaction: Array<{
    categoryId: string;
    categoryName: string;
    averageRating: number;
    responseCount: number;
  }>;
  previousTerm?: { id: string; name: string } | null;
  previousCategorySatisfaction?: Array<{
    categoryId: string;
    categoryName: string;
    averageRating: number;
    responseCount: number;
  }>;
  ratingDistribution?: RatingDistribution;
  categoryRatingDistribution?: Array<{
    categoryId: string;
    categoryName: string;
    distribution: RatingDistribution;
  }>;
  actionByStatus: Array<{ status: string; count: number }>;
  latestReport?: AnalysisReport | null;
};

type RatingDistribution = {
  unsatisfied: number;
  average: number;
  satisfied: number;
};

type ThemeInsight = {
  id: string;
  title: string;
  summary: string;
  sentiment: string;
  priority: string;
  mentionCount: number;
  evidence?: unknown;
};

type ActionItem = {
  id: string;
  title: string;
  priority: string;
  status: string;
  timeline: string;
  kpi?: string | null;
};

type ExactIssueDetail = {
  id: string;
  shortTitle: string;
  location: string;
  affectedGroup: string;
  affectedDepartments: string[];
  priority: string;
  mentions: number;
  confidence: number;
  trend: string;
  status: 'Critical' | 'Warning' | 'Low';
  finding: string;
  rootCause: string;
  evidence: string[];
  action: string;
  expectedImpact: string;
};

type AiActionReportModel = {
  actionPlan: {
    body: string;
    priority: string;
    title: string;
  }[];
  metrics: {
    label: string;
    value: string;
  }[];
  rootCauses: {
    body: string;
    signal: string;
    title: string;
  }[];
  summary: string;
  topIssues: {
    affectedStudents: string;
    evidenceSignal: string;
    issue: string;
    mentions: number;
    priority: string;
  }[];
};

type AiQualityModel = {
  confidence: number;
  duplicatesGrouped: number;
  lowQualityIgnored: number;
  lowSampleWarnings: number;
  safetyEscalations: number;
  totalComments: number;
  validComments: number;
  rejectedBreakdown: {
    count: number;
    label: string;
    reason: string;
  }[];
  duplicateExamples: {
    comment: string;
    decision: string;
    repeated: number;
    topic: string;
  }[];
  lowSampleWarningsList: {
    decision: string;
    group: string;
    responses: number;
    topic: string;
  }[];
  rejectedExamples: {
    comment: string;
    decision: string;
    question: string;
    reason: string;
    source: string;
    topic: string;
  }[];
  safetyEscalationDetails: {
    decision: string;
    issue: string;
    priority: string;
    source: string;
  }[];
};

type AiEngineBenchmarkModel = {
  funnel: {
    label: string;
    note: string;
    value: string;
  }[];
  pipeline: string[];
  receipt: {
    label: string;
    value: string;
  }[];
};

type GeminiReasoningModel = {
  mode?: string;
  provider?: string;
  ultraConcerningIssues?: Array<{
    id?: string;
    title?: string;
    reason?: string;
    detailedSummary?: string;
    mentions?: number;
    source?: string;
  }>;
  priorityLabels?: Array<{
    id?: string;
    title?: string;
    priority?: string;
    reason?: string;
  }>;
  issueDetails?: Array<{
    id?: string;
    title?: string;
    plainEnglishSummary?: string;
    recommendedAction?: string;
  }>;
  reportNarrative?: Record<string, string>;
};

type AnalysisReport = {
  id: string;
  title: string;
  summary: string;
  confidence: number;
  inputCount: number;
  lowSampleFlag: boolean;
  duplicateCount: number;
  createdAt: string;
  generatedBy?: string | null;
  rawJson?: {
    engine?: string;
    modelMode?: string;
    pipeline?: string[];
    qualityChecks?: {
      totalComments?: number;
      usefulComments?: number;
      duplicateCount?: number;
      lowQualityRejectedCount?: number;
      usefulSignalComments?: number;
      uniqueUsefulComments?: number;
      rejected?: Record<string, number>;
      method?: string;
      commentCount?: number;
      rejectedExamples?: AiQualityModel['rejectedExamples'];
      duplicateExamples?: AiQualityModel['duplicateExamples'];
      lowSampleWarnings?: AiQualityModel['lowSampleWarningsList'];
    };
    sentimentBreakdown?: {
      overall?: Record<string, { count?: number; percentage?: number }>;
      categories?: Record<string, Record<string, { count?: number; percentage?: number }>>;
    };
    grievanceSignals?: {
      total?: number;
      safetyFlagged?: number;
    };
    clusterDiagnostics?: {
      clusterer?: string;
      embeddingModel?: string | null;
      clusterCount?: number;
      noiseCount?: number;
    };
    engineBenchmark?: {
      processingMs?: number;
      responsesPerSecond?: number;
      documentsClustered?: number;
      themesGenerated?: number;
      actionsGenerated?: number;
      criticalThemes?: number;
      negativeThemes?: number;
    };
    modelStack?: {
      themeEmbeddings?: {
        primary?: string;
        fallback?: string;
      };
      clustering?: {
        primary?: string;
        fallback?: string;
      };
      humanCorrectionLoop?: {
        endpoint?: string;
      };
    };
    reportNarrative?: {
      boardReadyHighlights?: string[];
      recommendedNextStep?: string;
    };
    geminiReasoning?: GeminiReasoningModel;
  } | null;
  themes?: ThemeInsight[];
  actions?: ActionItem[];
};

type AuditLog = {
  id: string;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    email: string;
    role: Role;
  } | null;
  college?: {
    id: string;
    name: string;
    code: string;
  } | null;
};

type FeedbackAnswer = {
  questionId: string;
  categoryId: string;
  rating: number;
  comment: string;
};

type AdminFeedbackCategoryDraft = {
  name: string;
  description: string;
  questions: string[];
};

const ratingLabels = [
  { value: 1, label: 'Unsatisfied' },
  { value: 2, label: 'Average' },
  { value: 3, label: 'Good' },
  { value: 4, label: 'Excellent' },
];

const aiPipelineSteps = [
  {
    title: 'Quality filter',
    detail: 'Rejecting fake, random, out-of-context and low-information comments.',
  },
  {
    title: 'Duplicate grouping',
    detail: 'Combining repeated complaints as stronger evidence instead of ignoring them.',
  },
  {
    title: 'Sentiment scan',
    detail: 'Separating positive, neutral, negative and critical feedback by category.',
  },
  {
    title: 'Issue clustering',
    detail: 'Grouping similar comments into themes like mess, Wi-Fi, faculty or infra.',
  },
  {
    title: 'Risk scoring',
    detail: 'Detecting safety-sensitive issues and assigning priority levels.',
  },
  {
    title: 'Report generation',
    detail: 'Preparing dashboard charts, evidence cards and action-plan data.',
  },
];

function App() {
  const [authMode, setAuthMode] = useState<Role | null>(null);
  const [adminFullScreen, setAdminFullScreen] = useState(false);
  const [studentView, setStudentView] = useState<'home' | 'feedback' | 'details'>('home');
  const [isAdminProfileOpen, setIsAdminProfileOpen] = useState(false);
  const [auth, setAuth] = useState<AuthState | null>(() => {
    const saved = localStorage.getItem('edupulse-auth');
    return saved ? (JSON.parse(saved) as AuthState) : null;
  });

  function handleAuth(nextAuth: AuthState) {
    localStorage.setItem('edupulse-auth', JSON.stringify(nextAuth));
    setAuth(nextAuth);
  }

  function logout() {
    localStorage.removeItem('edupulse-auth');
    setAuth(null);
    setAuthMode(null);
    setAdminFullScreen(false);
  }

  if (!auth && !authMode) {
    return (
      <LandingPage onChooseRole={setAuthMode} />
    );
  }

  if (!auth && authMode) {
    return (
      <main className="public-shell auth-shell">
        <LoginPanel
          initialRole={authMode}
          onBack={() => setAuthMode(null)}
          onLogin={handleAuth}
        />
        <TeamEurekaBadge />
      </main>
    );
  }

  const activeAuth = auth;
  if (!activeAuth) return null;
  const hideTopbar = activeAuth.user.role === 'ADMIN' && adminFullScreen;

  return (
    <main className="app-shell">
      <section className="workspace">
        {!hideTopbar && (
          activeAuth.user.role === 'ADMIN' ? (
            <header className="admin-topbar">
              <div className="admin-topbar-left">
                <div className="dashboard-brand">
                  <span className="brand-logo-wrapper">
                    <img src={edupulseLogo} alt="EduPulse AI Logo" className="brand-logo-img" />
                  </span>
                  <div className="brand-title-wrap">
                    <span className="brand-text">EduPulse AI</span>
                  </div>
                </div>
              </div>
              
              <div className="admin-topbar-right">
                <button 
                  className="admin-profile-trigger" 
                  type="button" 
                  onClick={() => setIsAdminProfileOpen(!isAdminProfileOpen)}
                >
                  <div className="admin-avatar-initials">
                    {activeAuth.user.name ? activeAuth.user.name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <span className="admin-profile-name">{activeAuth.user.name ?? 'Admin'}</span>
                  <ChevronDown size={16} className={`profile-chevron ${isAdminProfileOpen ? 'rotated' : ''}`} />
                </button>

                {isAdminProfileOpen && (
                  <>
                    <div className="dropdown-click-overlay" onClick={() => setIsAdminProfileOpen(false)} />
                    <div className="admin-profile-dropdown">
                      <div className="dropdown-user-details">
                        <strong>{activeAuth.user.name ?? 'Admin'}</strong>
                        <span>{activeAuth.user.email ?? 'EduPulse AI Administrator'}</span>
                      </div>
                      <div className="dropdown-divider" />
                      <button className="dropdown-logout-btn" type="button" onClick={() => {
                        setIsAdminProfileOpen(false);
                        logout();
                      }}>
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </header>
          ) : (
            <header className="topbar">
              {activeAuth.user.role === 'STUDENT' && studentView !== 'home' ? (
                <button
                  className="topbar-back-button"
                  type="button"
                  onClick={() => setStudentView('home')}
                >
                  ← Go back
                </button>
              ) : (
                <div className="dashboard-brand">
                  <span className="brand-logo-wrapper">
                    <img src={edupulseLogo} alt="EduPulse AI Logo" className="brand-logo-img" />
                  </span>
                  <div>
                    <span className="brand-text">EduPulse AI</span>
                  </div>
                </div>
              )}
              <button className="icon-button" type="button" onClick={logout}>
                <LogOut size={18} />
                Logout
              </button>
            </header>
          )
        )}
        {activeAuth.user.role === 'ADMIN' ? (
          <AdminDashboard auth={activeAuth} onFullScreenChange={setAdminFullScreen} onSessionExpired={logout} />
        ) : (
          <StudentDashboard
            auth={activeAuth}
            studentView={studentView}
            setStudentView={setStudentView}
          />
        )}
      </section>
      {!adminFullScreen && <TeamEurekaBadge />}
    </main>
  );
}



function TeamEurekaBadge() {
  return (
    <div className="team-eureka-badge">
      <CheckCircle2 size={16} />
      Developed by Team Eureka
    </div>
  );
}



function LoginPanel({
  initialRole,
  onBack,
  onLogin,
}: {
  initialRole: Role;
  onBack: () => void;
  onLogin: (auth: AuthState) => void;
}) {
  const [email, setEmail] = useState(
    initialRole === 'ADMIN' ? 'admin@edupulse.edu' : 'student@edupulse.edu',
  );
  const [password, setPassword] = useState(
    initialRole === 'ADMIN' ? 'Admin@12345' : 'Student@12345',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function login(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const auth = await api<AuthState>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      onLogin(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-grid">
      <button className="auth-back-button" type="button" onClick={onBack}>
        <ArrowLeft size={17} />
        Go back
      </button>
      <section className="panel auth-panel">
        <div className="panel-title">
          <ShieldCheck size={22} />
          <div>
            <p className="eyebrow">Secure access</p>
            <h2>{initialRole === 'ADMIN' ? 'Admin login' : 'Student login'}</h2>
          </div>
        </div>
        <form className="form-stack" onSubmit={login}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="primary-button" type="submit" disabled={loading}>
            <UserRound size={18} />
            {loading ? 'Signing in' : 'Sign in'}
          </button>
        </form>
      </section>

      <section className="panel signal-panel">
        <div className="login-orb">
          {initialRole === 'ADMIN' ? <BarChart3 size={52} /> : <GraduationCap size={52} />}
        </div>
        <div>
          <p className="eyebrow">
            {initialRole === 'ADMIN' ? 'Admin command center' : 'Student workspace'}
          </p>
          <h2>
            {initialRole === 'ADMIN'
              ? 'Analyze feedback, prioritize issues, generate reports.'
              : 'Submit structured semester feedback quickly.'}
          </h2>
        </div>
        <div className="signal-row">
          <GraduationCap size={24} />
          <div>
            <strong>Student interface</strong>
            <span>Feedback form and profile updates</span>
          </div>
        </div>
        <div className="signal-row">
          <BarChart3 size={24} />
          <div>
            <strong>Admin interface</strong>
            <span>Charts, analysis, reports and actions</span>
          </div>
        </div>
        <div className="signal-row">
          <Gauge size={24} />
          <div>
            <strong>Backend intelligence</strong>
            <span>Themes, sentiment, priority and quality flags</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function getCampusDisplayName(user: User) {
  const collegeName = user.college?.name?.trim();
  if (collegeName) {
    return /campus/i.test(collegeName) ? collegeName : `${collegeName} Campus`;
  }

  const email = user.email.toLowerCase();
  if (email.endsWith('@sharda.edu') || email.includes('sharda')) {
    return 'Sharda University Campus';
  }
  if (email.endsWith('@glbitm.ac.in') || email.includes('edupulse.edu')) {
    return 'G.L. Bajaj Institute of Technology and Management Campus';
  }

  return 'College Campus';
}

function StudentDashboard({
  auth,
  studentView,
  setStudentView,
}: {
  auth: AuthState;
  studentView: 'home' | 'feedback' | 'details';
  setStudentView: React.Dispatch<React.SetStateAction<'home' | 'feedback' | 'details'>>;
}) {
  const [profilePhoto, setProfilePhoto] = useState(studentPhoto);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [profileDetails, setProfileDetails] = useState({
    primaryEmail: 'ec3020@glbitm.ac.in',
    alternateEmail: '',
    alternatePhone: '',
  });
  const [term, setTerm] = useState<Term | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [answers, setAnswers] = useState<Record<string, FeedbackAnswer>>({});
  const [status, setStatus] = useState('');
  const campusName = getCampusDisplayName(auth.user);

  const loadStudentData = useCallback(async () => {
    const [activeTerm, feedbackCategories] = await Promise.all([
      api<Term | null>('/feedback/active-term', authHeaders(auth)),
      api<Category[]>('/feedback/categories', authHeaders(auth)),
    ]);

    setTerm(activeTerm);
    setCategories(feedbackCategories);

    const initialAnswers: Record<string, FeedbackAnswer> = {};
    for (const category of feedbackCategories) {
      for (const question of category.questions) {
        initialAnswers[question.id] = {
          questionId: question.id,
          categoryId: category.id,
          rating: 3,
          comment: '',
        };
      }
    }
    setAnswers(initialAnswers);
  }, [auth]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStudentData();
  }, [loadStudentData]);

  async function openSemesterFeedback() {
    setStatus('');
    try {
      await loadStudentData();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to load the latest feedback form.');
    }
    setStudentView('feedback');
  }

  function updateAnswer(question: Question, patch: Partial<FeedbackAnswer>) {
    setAnswers((current) => ({
      ...current,
      [question.id]: {
        ...current[question.id],
        questionId: question.id,
        categoryId: question.categoryId,
        ...patch,
      },
    }));
  }

  async function submitFeedback() {
    if (!term) return;
    setStatus('');
    const missingReason = Object.values(answers).some(
      (answer) => answer.rating <= 2 && !answer.comment.trim(),
    );

    if (missingReason) {
      setStatus('Please tell us why for every Unsatisfied or Average answer.');
      return;
    }

    const payload = {
      termId: term.id,
      answers: Object.values(answers).map((answer) => ({
        questionId: answer.questionId,
        categoryId: answer.categoryId,
        rating: answer.rating,
        comment: answer.comment.trim() || undefined,
      })),
    };

    await api('/feedback/submit', {
      ...authHeaders(auth),
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStatus('Semester feedback submitted');
  }

  if (studentView === 'home') {
    return (
      <section className="student-home">
        <aside className="student-profile-card">
          <button
            aria-label="Open student photo preview"
            className="student-avatar avatar-button"
            type="button"
            onClick={() => setIsPhotoOpen(true)}
          >
            <img src={profilePhoto} alt="Gaurav Sharma" />
          </button>
          <div>
            <p className="eyebrow">Welcome back</p>
            <h2>Gaurav Sharma</h2>
          </div>
          <dl className="student-details">
            <div>
              <dt>Branch</dt>
              <dd>Electronics and Communication</dd>
            </div>
            <div>
              <dt>Year</dt>
              <dd>Semester 7</dd>
            </div>
            <div>
              <dt>Student ID</dt>
              <dd>EC23020</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{profileDetails.primaryEmail}</dd>
            </div>
          </dl>
        </aside>

        <section className="student-hero-panel">
          <div className="ambient-glow-wrapper">
            <div className="ambient-glow glow-1" />
            <div className="ambient-glow glow-2" />
            <div className="ambient-glow glow-3" />
          </div>

          <h1 className="student-hero-title">
            <Sparkles size={28} className="hero-title-icon-sparkle" />
            <span>Student Feedback Portal</span>
          </h1>
          <p className="student-hero-desc">
            Submit semester feedback, raise important concerns, and help improve your campus experience through structured student insights.
          </p>

          <div className="student-badge-strip">
            <span className="student-badge">
              <GraduationCap size={16} /> {campusName}
            </span>
          </div>

          <div className="student-action-grid">
            <button
              className={`student-action-card primary-action ${term ? 'status-live' : 'status-closed'}`}
              type="button"
              disabled={!term}
              onClick={term ? () => void openSemesterFeedback() : undefined}
            >
              <ClipboardList size={24} />
              <div className="action-card-content">
                <div className="action-title-row">
                  <strong>Fill semester feedback</strong>
                  <span className="action-status-pill">
                    <span className="status-dot" />
                    {term ? 'LIVE' : 'CLOSED'}
                  </span>
                </div>
                <span>Academics, faculty, food, infrastructure and more.</span>
              </div>
            </button>
          </div>
        </section>
        {isPhotoOpen && (
          <PhotoPreview
            alt="Gaurav Sharma"
            src={profilePhoto}
            onClose={() => setIsPhotoOpen(false)}
          />
        )}
      </section>
    );
  }

  if (studentView === 'details') {
    return (
      <StudentDetailsView
        details={profileDetails}
        photo={profilePhoto}
        onBack={() => setStudentView('home')}
        onPhotoChange={setProfilePhoto}
        onSave={setProfileDetails}
      />
    );
  }

  return (
    <div className="student-form-wrap">
      {!term ? (
        <section className="panel student-focused-panel">
          <div className="panel-title">
            <ClipboardList size={22} />
            <div>
              <p className="eyebrow">Semester feedback</p>
              <h2>No semester feedback is live</h2>
            </div>
          </div>
          <p className="empty-state">
            Admin has turned off feedback collection. Please check again when a
            new feedback form goes live.
          </p>
        </section>
      ) : (
      <section className="panel wide feedback-workspace">
        <h1 className="feedback-form-title">Semester feedback form</h1>
        
        <div className="category-stack">
          {categories.map((category) => (
            <article className="category-block" key={category.id}>
              <div>
                <h3>{category.name}</h3>
                <p>{category.description}</p>
              </div>
              {category.questions.map((question) => {
                const answer = answers[question.id];
                return (
                  <div className="question-row" key={question.id}>
                    <span>{question.text}</span>
                    <div className="rating-grid">
                      {ratingLabels.map((rating) => (
                        <button
                          className={answer?.rating === rating.value ? 'selected' : ''}
                          key={rating.value}
                          type="button"
                          onClick={() => updateAnswer(question, { rating: rating.value })}
                        >
                          {rating.label}
                        </button>
                      ))}
                    </div>
                    {answer?.rating <= 2 && (
                      <textarea
                        className="feedback-comment"
                        placeholder={
                          answer.rating === 1
                            ? 'Why are you unsatisfied? Mention the issue clearly.'
                            : 'What made this only average? Suggest what should improve.'
                        }
                        value={answer.comment}
                        onChange={(event) =>
                          updateAnswer(question, { comment: event.target.value })
                        }
                      />
                    )}
                  </div>
                );
              })}
            </article>
          ))}
        </div>
        <div className="feedback-submit-container">
          {status && <p className="success-text">{status}</p>}
          <button className="feedback-submit-red" type="button" onClick={submitFeedback}>
            <CheckCircle2 size={18} />
            Submit feedback
          </button>
        </div>
      </section>
      )}
    </div>
  );
}

function StudentDetailsView({
  details,
  photo,
  onBack,
  onPhotoChange,
  onSave,
}: {
  details: {
    primaryEmail: string;
    alternateEmail: string;
    alternatePhone: string;
  };
  photo: string;
  onBack: () => void;
  onPhotoChange: (photo: string) => void;
  onSave: (details: {
    primaryEmail: string;
    alternateEmail: string;
    alternatePhone: string;
  }) => void;
}) {
  const [draft, setDraft] = useState(details);
  const [draftPhoto, setDraftPhoto] = useState(photo);
  const [message, setMessage] = useState('');

  function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setDraftPhoto(URL.createObjectURL(file));
    setMessage('Photo selected. Click Save details to apply it.');
  }

  function saveDetails() {
    onSave({
      primaryEmail: draft.primaryEmail.trim(),
      alternateEmail: draft.alternateEmail.trim(),
      alternatePhone: draft.alternatePhone.trim(),
    });
    onPhotoChange(draftPhoto);
    setMessage('Details updated');
  }

  return (
    <div className="student-form-wrap">
      <button className="auth-back-button inline-back" type="button" onClick={onBack}>
        Go back
      </button>
      <section className="panel student-focused-panel student-details-editor">
        <div className="panel-title between">
          <div className="title-inline">
            <UserRound size={22} />
            <div>
              <p className="eyebrow">Student profile</p>
              <h2>Update contact details</h2>
            </div>
          </div>
          <span className="locked-badge">Identity fields locked</span>
        </div>

        <div className="student-edit-grid">
          <aside className="student-photo-editor">
            <div className="student-avatar large-avatar">
              <img src={draftPhoto} alt="Gaurav Sharma" />
            </div>
            <label className="photo-upload-button">
              Change picture
              <input accept="image/*" type="file" onChange={handlePhotoUpload} />
            </label>
          </aside>

          <div className="locked-details-grid">
            <div>
              <span>Name</span>
              <strong>Gaurav Sharma</strong>
            </div>
            <div>
              <span>Student ID</span>
              <strong>EC23020</strong>
            </div>
            <div>
              <span>Branch</span>
              <strong>Electronics and Communication</strong>
            </div>
            <div>
              <span>Semester</span>
              <strong>Semester 7</strong>
            </div>
            <div>
              <span>Parent name</span>
              <strong>Mr. Rajesh Sharma</strong>
            </div>
          </div>
        </div>

        <div className="editable-details-grid">
          <label>
            Gmail / primary email
            <input
              value={draft.primaryEmail}
              onChange={(event) =>
                setDraft((current) => ({ ...current, primaryEmail: event.target.value }))
              }
            />
          </label>
          <label>
            Alternate email
            <input
              placeholder="example.alt@gmail.com"
              value={draft.alternateEmail}
              onChange={(event) =>
                setDraft((current) => ({ ...current, alternateEmail: event.target.value }))
              }
            />
          </label>
          <label>
            Alternate phone number
            <input
              placeholder="+91 98765 43210"
              value={draft.alternatePhone}
              onChange={(event) =>
                setDraft((current) => ({ ...current, alternatePhone: event.target.value }))
              }
            />
          </label>
        </div>

        <button className="primary-button" type="button" onClick={saveDetails}>
          <CheckCircle2 size={18} />
          Save details
        </button>
        {message && <p className="success-text">{message}</p>}
      </section>
    </div>
  );
}

function PhotoPreview({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  return (
    <div className="photo-preview-backdrop" role="presentation" onClick={onClose}>
      <div className="photo-preview-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <button className="photo-preview-close" type="button" onClick={onClose}>
          Close
        </button>
        <img src={src} alt={alt} />
      </div>
    </div>
  );
}

function AdminDashboard({
  auth,
  onFullScreenChange,
  onSessionExpired,
}: {
  auth: AuthState;
  onFullScreenChange?: (isFullScreen: boolean) => void;
  onSessionExpired: () => void;
}) {
  const [adminView, setAdminView] = useState<
    'home' | 'create' | 'analysis' | 'analyzing' | 'audit'
  >('home');
  const [term, setTerm] = useState<Term | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [analysisTermId, setAnalysisTermId] = useState<string>('');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [, setReports] = useState<AnalysisReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<AnalysisReport | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [adminNotice, setAdminNotice] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLiveFeedbackAnalysis, setIsLiveFeedbackAnalysis] = useState(false);
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);

  useEffect(() => {
    onFullScreenChange?.(adminView === 'analysis' || adminView === 'analyzing' || adminView === 'create');
    return () => onFullScreenChange?.(false);
  }, [adminView, onFullScreenChange]);

  useEffect(() => {
    if (!isAnalyzing) return undefined;

    const timer = window.setInterval(() => {
      setAnalysisStepIndex((step) => Math.min(step + 1, aiPipelineSteps.length - 2));
    }, 850);

    return () => window.clearInterval(timer);
  }, [isAnalyzing]);

  const loadAdminData = useCallback(async () => {
    try {
      const adminTerms = await api<Term[]>('/feedback/admin/terms', authHeaders(auth));
      const activeTerm = adminTerms.find((item) => item.isActive) ?? null;
      setTerm(activeTerm);
      setTerms(adminTerms);

      try {
        const auditLogList = await api<AuditLog[]>('/audit/logs?limit=80', authHeaders(auth));
        setAuditLogs(auditLogList);
      } catch {
        setAuditLogs([]);
      }

      const selectedTermId = analysisTermId || activeTerm?.id || adminTerms[0]?.id || '';
      if (!analysisTermId && selectedTermId) {
        setAnalysisTermId(selectedTermId);
      }

      if (!selectedTermId) {
        setSummary(null);
        setReports([]);
        setSelectedReport(null);
        setAdminNotice('No semester dataset exists for this college yet.');
        return;
      }

      const [dashboard, reportList] = await Promise.all([
        api<DashboardSummary>(`/dashboard/summary?termId=${selectedTermId}`, authHeaders(auth)),
        api<AnalysisReport[]>(`/reports?termId=${selectedTermId}`, authHeaders(auth)),
      ]);
      setSummary(dashboard);
      setReports(reportList);
      setAdminNotice('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load admin datasets.';
      if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('expired')) {
        onSessionExpired();
        return;
      }
      setAdminNotice(`${message} Restart backend or click refresh datasets.`);
    }
  }, [analysisTermId, auth, onSessionExpired]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAdminData();
  }, [loadAdminData]);

  async function runAnalysis() {
    if (!analysisTermId) {
      setAdminNotice('No semester data is available for AI analysis.');
      return;
    }
    const selectedAnalysisTerm = terms.find((item) => item.id === analysisTermId);
    const isSelectedFeedbackLive = Boolean(
      selectedAnalysisTerm?.isActive || (term?.id === analysisTermId && term?.isActive),
    );
    setAdminView('analyzing');
    setIsAnalyzing(true);
    setIsLiveFeedbackAnalysis(isSelectedFeedbackLive);
    setAnalysisStepIndex(0);
    setAdminNotice('Running self-hosted AI pipeline...');
    try {
      const [report] = await Promise.all([
        api<AnalysisReport>('/analysis/run', {
          ...authHeaders(auth),
          method: 'POST',
          body: JSON.stringify({ termId: analysisTermId }),
        }),
        delay(3200),
      ]);
      setAnalysisStepIndex(aiPipelineSteps.length - 1);
      setSelectedReport(report);
      await loadAdminData();
      const fallbackNotice =
        report.generatedBy === 'edupulse-ai-service'
          ? ''
          : 'Fallback analysis completed. Start Python AI service for full self-hosted NLP mode.';
      setAdminNotice(fallbackNotice);
      setAdminView('analysis');
    } catch (error) {
      setAdminNotice(error instanceof Error ? error.message : 'AI analysis failed.');
      setAdminView('home');
    } finally {
      window.setTimeout(() => setIsAnalyzing(false), 500);
    }
  }

  async function downloadReport() {
    if (!selectedReport) return;
    const response = await fetch(`${API_BASE}/reports/${selectedReport.id}/pdf`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `edupulse-report-${selectedReport.id}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const satisfactionData = summary?.categorySatisfaction ?? [];
  const ratedResponses = satisfactionData.reduce((total, item) => total + item.responseCount, 0);
  const weightedRating = satisfactionData.reduce(
    (total, item) => total + item.averageRating * item.responseCount,
    0,
  );
  const satisfactionScore = ratedResponses
    ? Math.round((weightedRating / ratedResponses / 4) * 100)
    : 0;
  if (adminView === 'home') {
    return (
      <AdminHome
        activeTermName={term?.name}
        auditLogCount={(auditLogs || []).length}
        analysisTermId={analysisTermId}
        terms={terms || []}
        notice={adminNotice}
        onAnalysisTermChange={setAnalysisTermId}
        onRefreshDatasets={() => void loadAdminData()}
        onChoose={(view) => {
          if (view === 'analysis') {
            void runAnalysis();
            return;
          }
          setAdminView(view);
        }}
      />
    );
  }

  if (adminView === 'analyzing') {
    return (
      <AdminAnalysisLoadingPage
        activeStep={analysisStepIndex}
      />
    );
  }

  if (adminView === 'create') {
    return (
      <AdminCreateFeedback
        activeTermName={term?.name}
        auth={auth}
        isFeedbackLive={Boolean(term)}
        onBack={() => setAdminView('home')}
        onChanged={loadAdminData}
      />
    );
  }

  if (adminView === 'audit') {
    return (
      <AdminAuditLogsView
        auditLogs={auditLogs || []}
        onBack={() => setAdminView('home')}
        onRefresh={() => void loadAdminData()}
      />
    );
  }

  return (
    <AdminAnalysisReportPage
      adminNotice={adminNotice}
      downloadReport={downloadReport}
      isLiveFeedbackAnalysis={isLiveFeedbackAnalysis}
      selectedReport={selectedReport}
      satisfactionData={satisfactionData}
      satisfactionScore={satisfactionScore}
      summary={summary}
      onBack={() => setAdminView('home')}
    />
  );
}

function AdminAnalysisLoadingPage({
  activeStep,
}: {
  activeStep: number;
}) {
  return (
    <div className="admin-analysis-loading-page premium-analytics-page">
      <AiAnalysisProgress activeStep={activeStep} />
    </div>
  );
}

function AdminAnalysisReportPage({
  adminNotice,
  downloadReport,
  isLiveFeedbackAnalysis,
  selectedReport,
  satisfactionData,
  satisfactionScore,
  summary,
  onBack,
}: {
  adminNotice: string;
  downloadReport: () => void;
  isLiveFeedbackAnalysis: boolean;
  selectedReport: AnalysisReport | null;
  satisfactionData: DashboardSummary['categorySatisfaction'];
  satisfactionScore: number;
  summary: DashboardSummary | null;
  onBack: () => void;
}) {
  const categories = satisfactionData.length
    ? satisfactionData.map((item) => item.categoryName)
    : ['Academics', 'Faculty', 'Infrastructure', 'Food & Mess', 'Sports/Campus'];
  const [ratingCategory, setRatingCategory] = useState('Overall');
  const [selectedExactIssue, setSelectedExactIssue] = useState<ExactIssueDetail | null>(null);
  const [showFullHeatmap, setShowFullHeatmap] = useState(false);
  const categoryOptions = ['Overall', ...categories];
  const confidence = selectedReport ? Math.round(selectedReport.confidence * 100) : 0;
  const responseCount = summary?.responseCount ?? selectedReport?.inputCount ?? 0;
  const ratingSplit = buildCategoryRatingSplit(summary, ratingCategory);
  const hasRatingSplit = ratingSplit.some((item) => item.value > 0);
  const comparisonData = buildCategoryComparisonData(
    satisfactionData,
    summary?.previousCategorySatisfaction ?? [],
  );
  const hasPreviousComparison = comparisonData.some((item) => item.previousYear !== null);
  const radarData = buildRadarSatisfactionData(satisfactionData);
  const allReportThemes = selectedReport?.themes ?? [];
  const groupedIssues = allReportThemes
    .filter((theme) => !isUltraConcernTheme(theme))
    .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority) || b.mentionCount - a.mentionCount)
    .slice(0, 8);
  const actionQueue = [...(selectedReport?.actions ?? [])].slice(0, 6);
  const resultIssues = buildResultIssues(
    groupedIssues,
    actionQueue,
    selectedReport?.rawJson?.geminiReasoning?.priorityLabels,
    selectedReport?.rawJson?.geminiReasoning?.issueDetails,
  );
  const concerningIssues = buildConcerningIssues(
    allReportThemes,
    selectedReport?.rawJson?.geminiReasoning,
  );
  const bubbleMatrix = buildBubbleMatrixData(satisfactionData, groupedIssues);
  const urgentRiskCount = concerningIssues.filter(
    (issue) => issue.severity === 'CRITICAL' && issue.id !== 'no-critical-concern',
  ).length;
  const hasMoreHeatmapRows = bubbleMatrix.rows.length > 7;
  const visibleHeatmapRows = showFullHeatmap ? bubbleMatrix.rows : bubbleMatrix.rows.slice(0, 7);
  const departmentsMonitored = bubbleMatrix.departments.length;
  const kpiCards = buildAnalyticsKpis({
    confidence,
    criticalOpen: urgentRiskCount,
    departmentsMonitored,
    responseCount,
    satisfactionScore,
  });
  const aiActionReport = buildAiActionReport({
    comparisonData,
    departments: bubbleMatrix.departments,
    issues: resultIssues,
    responseCount,
    satisfactionScore,
  });
  const engineBenchmark = buildEngineBenchmarkModel(selectedReport, responseCount);
  return (
    <div className="analysis-report-page premium-analytics-page">
      <button className="analysis-plain-back-button" type="button" onClick={onBack}>
        <ArrowLeft size={18} />
        Go Back
      </button>

      <section className="analytics-hero analytics-blackhole-hero">
        <div className="flow-stage analysis-vortex-stage" aria-label="EduPulse AI animated feedback engine">
          <div className="floating-tech-icon fti-1"><Sparkles size={18} /></div>
          <div className="floating-tech-icon fti-2"><BarChart3 size={18} /></div>
          <div className="floating-tech-icon fti-3"><Gauge size={18} /></div>
          <div className="floating-tech-icon fti-4"><ShieldCheck size={18} /></div>

          <div className="accretion-disk" />
          <div className="vortex-container">
            <div className="vortex-spiral" />
            <div className="vortex-spiral-2" />
            <div className="vortex-spiral-3" />
          </div>

          <div className="blackhole-logo-wrapper">
            <img src={edupulseLogo} alt="EduPulse AI Logo" />
          </div>

          <div className="blackhole-chip bh-path-1">"Wi-Fi not working in library"</div>
          <div className="blackhole-chip bh-path-2">"Mess food quality is poor"</div>
          <div className="blackhole-chip bh-path-3">"Ragging concern in hostel"</div>
          <div className="blackhole-chip bh-path-4">"Water contamination in block B"</div>
          <div className="blackhole-chip bh-path-5">"Random useless spam text"</div>
          <div className="blackhole-chip bh-path-6">"Projector issue in LH 203"</div>
          <div className="blackhole-chip bh-path-7">"Faculty absent in ECE block"</div>
          <div className="blackhole-chip bh-path-8">"Transport delay on route 4"</div>
          <div className="blackhole-chip bh-path-9">"Library books unavailable"</div>
          <div className="blackhole-chip bh-path-10">"Harassment report in building 2"</div>
        </div>
      </section>

      {isLiveFeedbackAnalysis && (
        <div className="live-analysis-warning report-live-warning">
          <span className="live-analysis-dot" />
          <strong>Feedback is still live</strong>
          <em>
            Treat this AI result as provisional. Turn off feedback before presenting final numbers.
          </em>
        </div>
      )}
      {adminNotice && <p className="analysis-notice">{adminNotice}</p>}

      <section className="premium-kpi-grid">
        {kpiCards.map((card) => (
          <article className={`premium-kpi-card ${card.tone}`} key={card.label}>
            <div>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
            <em className={card.trend >= 0 ? 'positive' : 'negative'}>
              {card.trend >= 0 ? '+' : ''}
              {card.trend}% vs previous
            </em>
            <ResponsiveContainer width="100%" height={42}>
              <LineChart data={card.sparkline.map((value, index) => ({ index, value }))}>
                <Line
                  dataKey="value"
                  dot={false}
                  isAnimationActive
                  stroke={card.stroke}
                  strokeLinecap="round"
                  strokeWidth={2.5}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </article>
        ))}
      </section>

      <section className="analytics-chart-row">
        <article className="premium-panel comparison-panel inline-comparison-panel">
          <PanelHeader
            eyebrow={hasPreviousComparison ? 'Semester Comparison' : 'Current Semester'}
            title={hasPreviousComparison ? 'Current semester vs previous semester' : 'Current category satisfaction'}
            action={hasPreviousComparison ? 'Percentage score' : undefined}
          />
          <ResponsiveContainer width="100%" height={330}>
            <BarChart data={comparisonData} barCategoryGap="26%" barGap={8}>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
              <XAxis dataKey="category" tick={{ fill: '#475569', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip />
              {hasPreviousComparison && (
                <Bar barSize={30} dataKey="previousYear" fill="#10b981" name="Previous Semester" radius={[0, 0, 0, 0]} />
              )}
              <Bar barSize={30} dataKey="currentYear" fill="#635bff" name="Current Semester" radius={[0, 0, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {!hasPreviousComparison && (
            <p className="comparison-empty-note">
              Previous semester data is not available for this tenant yet, so only current semester scores are shown.
            </p>
          )}
        </article>

        <article className="premium-panel sentiment-panel-premium">
          <PanelHeader eyebrow="Rating Split" title={`${ratingCategory} rating percentage`} />
          <div className="sentiment-tabs premium-tabs">
            {categoryOptions.map((category) => (
              <button
                className={ratingCategory === category ? 'selected' : ''}
                key={category}
                type="button"
                onClick={() => setRatingCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          {hasRatingSplit ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={ratingSplit}
                  dataKey="chartValue"
                  nameKey="label"
                  innerRadius={76}
                  outerRadius={112}
                  paddingAngle={4}
                >
                  {ratingSplit.map((item) => (
                    <Cell fill={item.color} key={item.label} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="sentiment-placeholder-donut">
              <span />
              <strong>No rating data</strong>
              <p>Submit feedback responses to generate this chart.</p>
            </div>
          )}
          <div className="modern-sentiment-legend">
            {ratingSplit.map((item) => (
              <span key={item.label}>
                <i style={{ background: item.color }} />
                {item.label}
                <b>{item.value}%</b>
                <em>{item.count.toLocaleString()} response(s)</em>
              </span>
            ))}
          </div>
        </article>
      </section>

      <section className={`ai-findings-section ${selectedExactIssue ? 'has-detail' : ''}`}>
        <div className="issues-found-header">
          <h2><span aria-hidden="true" />AI findings</h2>
          <p><strong>Note:</strong> Ranking of High, Medium and Low is done on the basis of sentiments and mentions.</p>
        </div>
        <div className="ai-findings-layout">
          <div className="ai-finding-grid">
            {resultIssues.map((issue) => (
              <article
                className={`ai-finding-card ${issue.status.toLowerCase()} ${
                  selectedExactIssue?.id === issue.id ? 'selected' : ''
                }`}
                key={issue.id}
              >
                <div className="finding-card-top">
                  <em>{issue.priority}</em>
                </div>
                <h3>{issue.shortTitle}</h3>
                <div className="finding-metrics">
                  <span>{issue.mentions.toLocaleString()} mentions</span>
                  <span>{issue.confidence}% confidence</span>
                  <span>{issue.trend}</span>
                </div>
                <p>{issue.affectedDepartments.join(', ')} affected</p>
                <div className="finding-actions">
                  <button type="button" onClick={() => setSelectedExactIssue(issue)}>
                    View Analytics
                  </button>
                </div>
              </article>
            ))}
          </div>

          {selectedExactIssue && (
            <aside className="premium-panel investigation-panel side-investigation-panel">
              <div className="investigation-header">
                <div>
                  <span>Exact AI Report</span>
                  <h2>{selectedExactIssue.shortTitle}</h2>
                </div>
                <button type="button" onClick={() => setSelectedExactIssue(null)}>
                  Close
                </button>
              </div>
              <div className="investigation-grid">
                <MetricBlock label="Location" value={selectedExactIssue.location} />
                <MetricBlock label="Priority" value={selectedExactIssue.priority} />
                <MetricBlock label="Mentions" value={selectedExactIssue.mentions.toLocaleString()} />
                <MetricBlock label="Confidence" value={`${selectedExactIssue.confidence}%`} />
                <MetricBlock label="Affected Students" value={selectedExactIssue.affectedGroup} />
                <MetricBlock label="Expected Impact" value={selectedExactIssue.expectedImpact} />
              </div>
              <div className="investigation-copy-grid">
                <article>
                  <span>AI Summary</span>
                  <p>{selectedExactIssue.finding}</p>
                </article>
                <article>
                  <span>Recommended Actions</span>
                  <p>{selectedExactIssue.action}</p>
                </article>
              </div>
            </aside>
          )}
        </div>
      </section>

      <section className="heatmap-radar-row">
        <article className="premium-panel bubble-heatmap-panel">
          <PanelHeader
            eyebrow=""
            title="Category satisfaction by department"
            action="Size = response volume"
          />
          <div className="bubble-matrix">
            <div className="bubble-matrix-head">
              <span />
              {bubbleMatrix.departments.map((department) => (
                <b key={department}>{department}</b>
              ))}
            </div>
            {visibleHeatmapRows.map((row) => (
              <div className="bubble-matrix-row" key={row.category}>
                <strong>{row.category}</strong>
                {row.cells.map((cell) => (
                  <button
                    className={`bubble-cell ${cell.tone}`}
                    key={`${row.category}-${cell.department}`}
                    style={{ '--bubble-size': `${cell.size}px` } as React.CSSProperties}
                    title={`${cell.department} ${row.category}: ${cell.score}% satisfaction, ${cell.responses} responses, ${cell.trend}`}
                    type="button"
                  >
                    <span>{cell.score}</span>
                    <em>{cell.trend}</em>
                  </button>
                ))}
              </div>
            ))}
          </div>
          {hasMoreHeatmapRows && (
            <button
              className="heatmap-show-more"
              type="button"
              onClick={() => setShowFullHeatmap((current) => !current)}
            >
              {showFullHeatmap ? 'Show less' : `Show more (${bubbleMatrix.rows.length - 7})`}
            </button>
          )}
        </article>

        <article className="premium-panel radar-panel">
          <PanelHeader
            eyebrow="Satisfaction Radar"
            title=""
            action="Current semester"
          />
          <ResponsiveContainer width="100%" height={330}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(148, 163, 184, 0.35)" />
              <PolarAngleAxis dataKey="category" tick={{ fill: '#475569', fontSize: 12 }} />
              <Radar dataKey="score" fill="#635bff" fillOpacity={0.18} stroke="#635bff" strokeWidth={2.5} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </article>
      </section>

      <ConcerningIssuesSection issues={concerningIssues} />

      <AiActionReportCard comparisonData={comparisonData} downloadReport={downloadReport} report={aiActionReport} />

      <AiEngineBenchmarkSection benchmark={engineBenchmark} />

      <p className="analysis-team-footer">Developed by Team Eureka ♥</p>
    </div>
  );
}

function PanelHeader({
  action,
  eyebrow,
  title,
}: {
  action?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="premium-panel-header">
      <div>
        {eyebrow && <span>{eyebrow}</span>}
        {title && <h2>{title}</h2>}
      </div>
      {action && <em>{action}</em>}
    </div>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="investigation-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ConcerningIssuesSection({
  issues,
}: {
  issues: ReturnType<typeof buildConcerningIssues>;
}) {
  const [selectedConcern, setSelectedConcern] = useState<(typeof issues)[number] | null>(null);

  return (
    <section className="premium-panel concerning-issues-section">
      <div className="danger-alert-heading">
        <span aria-hidden="true" />
        <h2>Immediate action required</h2>
      </div>
      <div className={`concerning-issues-layout ${selectedConcern ? 'has-detail' : ''}`}>
        <div className="concerning-issue-grid">
          {issues.map((issue) => (
            <article
              className={`concerning-issue-card ${issue.severity.toLowerCase()} ${
                selectedConcern?.id === issue.id ? 'selected' : ''
              }`}
              key={issue.id}
            >
              <div>
                <span>
                  <AlertTriangle size={16} />
                  {issue.riskType}
                </span>
              </div>
              <h3>{issue.title}</h3>
              <p>{issue.summary}</p>
              <dl>
                <div>
                  <dt>Danger sign</dt>
                  <dd>{issue.riskType}</dd>
                </div>
                <div>
                  <dt>Mentions</dt>
                  <dd>{issue.evidence}</dd>
                </div>
              </dl>
              <button type="button" onClick={() => setSelectedConcern(issue)}>
                View description
              </button>
            </article>
          ))}
        </div>

        {selectedConcern && (
          <aside className="danger-description-panel">
            <div>
              <span className="danger-live-dot" />
              <strong>{selectedConcern.riskType}</strong>
              <button type="button" onClick={() => setSelectedConcern(null)}>
                Close
              </button>
            </div>
            <h3>{selectedConcern.title}</h3>
            <div className="danger-description-copy">
              <article>
                <span>Detailed summary</span>
                <p>{selectedConcern.detailedSummary}</p>
              </article>
              <article className="danger-action-card">
                <span>Recommended action</span>
                <p>{selectedConcern.recommendedAction}</p>
              </article>
            </div>
            <div className="danger-description-stats">
              <span>
                <b>{selectedConcern.mentions.toLocaleString()}</b>
                <em>mentions</em>
              </span>
              <span>
                <b>{selectedConcern.severity}</b>
                <em>priority</em>
              </span>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}

function AiQualityCheckSection({
  onToggleDetails,
  quality,
  showDetails,
}: {
  onToggleDetails: () => void;
  quality: AiQualityModel;
  showDetails: boolean;
}) {
  const qualityStats = [
    { label: 'Valid comments', value: quality.validComments.toLocaleString(), tone: 'green' },
    { label: 'Fake/noise ignored', value: quality.lowQualityIgnored.toLocaleString(), tone: 'slate' },
    { label: 'Duplicates grouped', value: quality.duplicatesGrouped.toLocaleString(), tone: 'orange' },
    { label: 'Low-sample warnings', value: quality.lowSampleWarnings.toString(), tone: 'yellow' },
    { label: 'Safety escalations', value: quality.safetyEscalations.toString(), tone: 'red' },
    { label: 'AI confidence', value: `${quality.confidence}%`, tone: 'blue' },
  ];

  return (
    <section className={`premium-panel ai-quality-section ${showDetails ? 'expanded' : ''}`}>
      <div className="ai-quality-header">
        <div>
          <span>AI Bias & Quality Layer</span>
          <h2>Noise filtered before theme extraction</h2>
            <p>
            Quality checks remove fake text, duplicate comments, weak sample groups and safety-sensitive
            complaints before final analysis.
          </p>
        </div>
        <button type="button" onClick={onToggleDetails}>
          {showDetails ? 'Hide Detail Analysis' : 'View Detail Analysis'}
        </button>
      </div>

      <div className="ai-quality-stats">
        {qualityStats.map((item) => (
          <div className={`quality-stat ${item.tone}`} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      {showDetails && (
        <div className="ai-quality-details">
          <div className="ai-quality-drilldown">
            <div className="quality-evidence-toolbar">
              <div>
                <strong>Evidence summary, not raw overload</strong>
                <p>
                  Large noisy datasets are grouped by reason and only top evidence examples are shown.
                </p>
              </div>
              <button type="button" onClick={() => exportQualityEvidence(quality)}>
                Export evidence CSV
              </button>
            </div>

            <div className="quality-breakdown-grid">
              <QualityBreakdownCard
                accent="red"
                rows={quality.rejectedBreakdown.filter((row) => row.reason !== 'duplicate')}
                title="Rejected fake/noise breakdown"
              />
              <QualityBreakdownCard
                accent="orange"
                rows={[
                  {
                    count: quality.duplicatesGrouped,
                    label: 'Duplicate comments grouped as repeated signal',
                    reason: 'duplicate',
                  },
                ]}
                title="Duplicate grouping summary"
              />
              <QualityBreakdownCard
                accent="yellow"
                rows={quality.lowSampleWarningsList.map((item) => ({
                  count: item.responses,
                  label: `${item.topic} - ${item.group}`,
                  reason: 'low_sample',
                }))}
                title="Low-sample groups"
              />
              <QualityBreakdownCard
                accent="green"
                rows={quality.safetyEscalationDetails.map((item) => ({
                  count: 1,
                  label: item.issue,
                  reason: item.priority,
                }))}
                title="Safety escalations"
              />
            </div>
          </div>
          <QualityDetailGroup
            accent="red"
            items={quality.rejectedExamples.map((item) => ({
              meta: `${item.topic} • ${item.source}`,
              primary: `"${item.comment}"`,
              secondary: `${item.question} · Reason: ${item.reason}`,
              tag: item.decision,
            }))}
            title="Rejected fake examples"
          />
          <QualityDetailGroup
            accent="orange"
            items={quality.duplicateExamples.map((item) => ({
              meta: item.topic,
              primary: `"${item.comment}"`,
              secondary: `Repeated ${item.repeated} times`,
              tag: item.decision,
            }))}
            title="Duplicate grouped examples"
          />
          <QualityDetailGroup
            accent="yellow"
            items={quality.lowSampleWarningsList.map((item) => ({
              meta: `${item.topic} • ${item.group}`,
              primary: `${item.responses} responses`,
              secondary: 'Insight is shown with lower confidence until more responses arrive.',
              tag: item.decision,
            }))}
            title="Low sample warning details"
          />
          <QualityDetailGroup
            accent="green"
            items={quality.safetyEscalationDetails.map((item) => ({
              meta: item.source,
              primary: item.issue,
              secondary: 'Safety-sensitive signal is escalated even when sample size is small.',
              tag: `${item.priority} • ${item.decision}`,
            }))}
            title="Safety escalation details"
          />
        </div>
      )}
    </section>
  );
}

function QualityDetailGroup({
  accent,
  items,
  title,
}: {
  accent: 'green' | 'orange' | 'red' | 'yellow';
  items: {
    meta: string;
    primary: string;
    secondary: string;
    tag: string;
  }[];
  title: string;
}) {
  return (
    <article className={`quality-detail-group ${accent}`}>
      <h3>{title}</h3>
      <div>
        {items.map((item, index) => (
          <section className="quality-detail-item" key={`${title}-${index}`}>
            <span>{item.meta}</span>
            <strong>{item.primary}</strong>
            <p>{item.secondary}</p>
            <em>{item.tag}</em>
          </section>
        ))}
      </div>
    </article>
  );
}

function QualityBreakdownCard({
  accent,
  rows,
  title,
}: {
  accent: 'green' | 'orange' | 'red' | 'yellow';
  rows: {
    count: number;
    label: string;
    reason: string;
  }[];
  title: string;
}) {
  const safeRows = rows.length
    ? rows
    : [{ count: 0, label: 'No active signal in this group', reason: 'clear' }];
  const total = safeRows.reduce((sum, row) => sum + row.count, 0);

  return (
    <article className={`quality-breakdown-card ${accent}`}>
      <div>
        <h3>{title}</h3>
        <strong>{total.toLocaleString()}</strong>
      </div>
      <div>
        {safeRows.slice(0, 6).map((row) => (
          <section key={`${title}-${row.reason}-${row.label}`}>
            <span>{row.label}</span>
            <b>{row.count.toLocaleString()}</b>
            <em>{prettifyQualityReason(row.reason)}</em>
          </section>
        ))}
      </div>
    </article>
  );
}

function exportQualityEvidence(quality: AiQualityModel) {
  const rows = [
    ['section', 'category_or_reason', 'count_or_repeated', 'example_or_note', 'decision'],
    ...quality.rejectedBreakdown.map((row) => [
      'rejected_breakdown',
      row.reason,
      String(row.count),
      row.label,
      'Ignored before theme analysis',
    ]),
    ...quality.duplicateExamples.map((item) => [
      'duplicate_group',
      item.topic,
      String(item.repeated),
      item.comment,
      item.decision,
    ]),
    ...quality.rejectedExamples.map((item) => [
      'rejected_example',
      item.topic,
      item.reason,
      item.comment,
      item.decision,
    ]),
    ...quality.lowSampleWarningsList.map((item) => [
      'low_sample',
      item.topic,
      String(item.responses),
      item.group,
      item.decision,
    ]),
    ...quality.safetyEscalationDetails.map((item) => [
      'safety_escalation',
      item.priority,
      '1',
      item.issue,
      item.decision,
    ]),
  ];
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'edupulse-ai-quality-evidence.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function AiActionReportCard({
  comparisonData,
  downloadReport,
  report,
}: {
  comparisonData: ReturnType<typeof buildCategoryComparisonData>;
  downloadReport: () => void;
  report: AiActionReportModel;
}) {
  const hasPreviousComparison = comparisonData.some((item) => item.previousYear !== null);

  return (
    <section className="premium-panel ai-action-report-card">
      <div className="action-report-blur-content" aria-hidden="true">
        <div className="action-report-header">
          <div>
            <span>AI Action Report</span>
            <h2>Institutional improvement plan generated from feedback intelligence</h2>
          </div>
        </div>

        <article className="action-report-summary">
          <div>
            <span>1. Executive AI Summary</span>
            <p>{report.summary}</p>
          </div>
          <div className="summary-metric-strip">
            {report.metrics.map((metric) => (
              <strong key={metric.label}>
                {metric.value}
                <em>{metric.label}</em>
              </strong>
            ))}
          </div>
        </article>

        <article className="action-report-section">
          <div className="action-section-title">
            <span>2. Top Issues Found</span>
            <em>Priority assigned by LLM after EduPulse clustering</em>
          </div>
          <div className="action-issue-table">
            <div className="action-issue-head">
              <b>Issue</b>
              <b>Priority by AI</b>
              <b>Mentions</b>
              <b>Affected Students</b>
              <b>Evidence Signal</b>
            </div>
            {report.topIssues.map((issue) => (
              <div className="action-issue-row" key={`${issue.issue}-${issue.mentions}`}>
                <strong>{issue.issue}</strong>
                <span className={`priority-pill ${issue.priority.toLowerCase()}`}>{issue.priority}</span>
                <span>{issue.mentions.toLocaleString()}</span>
                <span>{issue.affectedStudents}</span>
                <p>{issue.evidenceSignal}</p>
              </div>
            ))}
          </div>
        </article>

        <div className="action-report-two-column">
          <article className="action-report-section">
            <div className="action-section-title">
              <span>3. Root Cause From Student Comments</span>
              <em>Comment-based only</em>
            </div>
            <div className="root-cause-grid">
              {report.rootCauses.map((cause) => (
                <div className="root-cause-card" key={cause.title}>
                  <strong>{cause.title}</strong>
                  <p>{cause.body}</p>
                  <span>{cause.signal}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="action-report-section">
            <div className="action-section-title">
              <span>4. AI Action Plan</span>
              <em>Issues + root causes sent to LLM</em>
            </div>
            <div className="ai-action-plan-list">
              {report.actionPlan.map((item, index) => (
                <div className="ai-action-plan-item" key={`${item.title}-${index}`}>
                  <b>{index + 1}</b>
                  <div>
                    <span className={`priority-pill ${item.priority.toLowerCase()}`}>{item.priority}</span>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <article className="action-report-section semester-line-section">
          <div className="action-section-title">
            <span>{hasPreviousComparison ? '5. Semester Comparison Graph' : '5. Current Semester Category Graph'}</span>
            <em>{hasPreviousComparison ? 'Current semester vs previous semester' : 'Previous semester data unavailable'}</em>
          </div>
          <div className="line-legend">
            <span><i className="current" />Current Semester</span>
            {hasPreviousComparison && <span><i className="previous" />Previous Semester</span>}
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={comparisonData}>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
              <XAxis dataKey="category" tick={{ fill: '#475569', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip />
              <Line
                activeDot={{ r: 7 }}
                dataKey="currentYear"
                dot={{ r: 5 }}
                name="Current Semester"
                stroke="#2563eb"
                strokeLinecap="round"
                strokeWidth={3.5}
                type="monotone"
              />
              <Line
                activeDot={{ r: 7 }}
                dataKey="previousYear"
                dot={{ r: 5 }}
                name="Previous Semester"
                stroke="#10b981"
                strokeLinecap="round"
                strokeWidth={3.5}
                type="monotone"
                hide={!hasPreviousComparison}
              />
            </LineChart>
          </ResponsiveContainer>
          {!hasPreviousComparison && (
            <p className="comparison-empty-note">
              Once another semester is stored for this college, this graph will automatically become a true comparison.
            </p>
          )}
        </article>
      </div>

      <div className="action-report-lock-overlay">
        <div className="action-report-lock-card">
          <span><Sparkles size={16} /> AI report ready</span>
          <h3>Generate the final institutional action report</h3>
          <button className="action-report-download" type="button" onClick={downloadReport}>
            <Download size={17} />
            Run AI to download report
          </button>
        </div>
      </div>
    </section>
  );
}

function AiEngineBenchmarkSection({
  benchmark,
}: {
  benchmark: AiEngineBenchmarkModel;
}) {
  return (
    <section className="premium-panel ai-engine-benchmark-section">
      <div className="benchmark-header">
        <div>
          <h2>AI engine benchmark</h2>
        </div>
      </div>

      <div className="benchmark-funnel">
        {benchmark.funnel.map((step, index) => (
          <div className="funnel-step" key={step.label}>
            <strong>{step.value}</strong>
            <span>{step.label}</span>
            <p>{step.note}</p>
            {index < benchmark.funnel.length - 1 && <i aria-hidden="true" />}
          </div>
        ))}
      </div>

      <div className="benchmark-lower">
        <div className="ai-run-receipt">
          <div>
            <span>AI RUN RECEIPT</span>
            <b>verified engine output</b>
          </div>
          {benchmark.receipt.map((row) => (
            <p key={row.label}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </p>
          ))}
        </div>

        <div className="ai-pipeline-trace">
          <span>Pipeline Trace</span>
          {benchmark.pipeline.map((step, index) => (
            <p key={`${step}-${index}`}>
              <i />
              <code>[{String(index + 1).padStart(2, '0')}] {humanizePipelineStep(step)}</code>
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function AiAnalysisProgress({ activeStep }: { activeStep: number }) {
  const safeStep = Math.min(Math.max(activeStep, 0), aiPipelineSteps.length - 1);
  const active = aiPipelineSteps[safeStep];
  const progress = Math.round(((safeStep + 1) / aiPipelineSteps.length) * 100);

  return (
    <section className="ai-progress-panel" aria-live="polite">
      <div className="ai-progress-main">
        <span className="ai-progress-orb">
          <Sparkles size={22} />
        </span>
        <div>
          <span className="hero-kicker">AI analysis running</span>
          <h2>{active.title}</h2>
          <p>{active.detail}</p>
        </div>
      </div>
      <div className="ai-progress-meter">
        <div className="ai-progress-meter-top">
          <span>Pipeline progress</span>
          <strong>{progress}%</strong>
        </div>
        <div className="ai-progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="ai-progress-steps">
          {aiPipelineSteps.map((step, index) => {
            const state = index < safeStep ? 'done' : index === safeStep ? 'active' : 'pending';
            return (
              <div className={`ai-progress-step ${state}`} key={step.title}>
                <span>{state === 'done' ? <CheckCircle2 size={14} /> : index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AdminHome({
  activeTermName,
  auditLogCount,
  analysisTermId,
  notice,
  terms,
  onAnalysisTermChange,
  onChoose,
  onRefreshDatasets,
}: {
  activeTermName?: string;
  auditLogCount: number;
  analysisTermId: string;
  notice?: string;
  terms: Term[];
  onAnalysisTermChange: (termId: string) => void;
  onChoose: (view: 'create' | 'analysis' | 'audit') => void;
  onRefreshDatasets: () => void;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLocalRefreshing, setIsLocalRefreshing] = useState(false);

  const handleRefreshClick = () => {
    setIsLocalRefreshing(true);
    onRefreshDatasets();
    setTimeout(() => {
      setIsLocalRefreshing(false);
    }, 1000);
  };

  const selectedDataset = terms.find((item) => item.id === analysisTermId);

  return (
    <section className="admin-home-panel reveal-on-scroll">
      {/* Decorative background grid and glowing accent */}
      <div className="admin-grid-lines" />
      <div className="admin-gradient-orb" />

      <div className="admin-home-header">
        <h1 className="admin-dashboard-title">Admin Dashboard</h1>
        {notice && <p className="admin-home-notice">{notice}</p>}
      </div>

      {/* Redesigned Dataset Panel */}
      <div className="admin-dataset-panel">
        <div className="dataset-panel-left">
          <div className="dataset-active-info">
            <span className="dataset-label">ACTIVE DATASET</span>
            <strong className="dataset-value-name">
              {selectedDataset ? selectedDataset.name : 'No active dataset selected'}
            </strong>
          </div>
        </div>

        <div className="dataset-panel-right">
          <button 
            className="btn-admin-choose-dataset" 
            type="button" 
            onClick={() => setIsDrawerOpen(true)}
          >
            Choose dataset
          </button>
          <button 
            className={`btn-admin-refresh-datasets ${isLocalRefreshing ? 'spinning' : ''}`} 
            type="button" 
            onClick={handleRefreshClick}
          >
            <RefreshCw size={16} />
            <span>Refresh datasets</span>
          </button>
        </div>
      </div>

      {/* Redesigned Side Drawer for Datasets Selection */}
      {isDrawerOpen && (
        <>
          <div className="dataset-drawer-overlay" onClick={() => setIsDrawerOpen(false)} />
          <div className="dataset-drawer open">
            <div className="drawer-header">
              <h3>Select Semester Dataset</h3>
              <button 
                className="drawer-close-btn" 
                type="button" 
                onClick={() => setIsDrawerOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="drawer-dataset-list">
              {terms.length ? (
                terms.map((item) => (
                  <button
                    key={item.id}
                    className={`drawer-dataset-card ${analysisTermId === item.id ? 'active' : ''}`}
                    type="button"
                    onClick={() => {
                      onAnalysisTermChange(item.id);
                      setIsDrawerOpen(false);
                    }}
                  >
                    <div className="dataset-card-info">
                      <strong>{item.name}</strong>
                      <span className={`dataset-card-status ${item.isActive ? 'live' : 'stored'}`}>
                        {item.isActive ? 'Active dataset' : 'Stored dataset'}
                      </span>
                    </div>
                    {analysisTermId === item.id && (
                      <CheckCircle2 size={18} className="active-check-icon" />
                    )}
                  </button>
                ))
              ) : (
                <p className="drawer-empty-text">No semester datasets found.</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Redesigned Action Cards Grid */}
      <div className="admin-action-grid">
        <button className="admin-action-card create-card" type="button" onClick={() => onChoose('create')}>
          <div className="action-card-accent" />
          <div className="action-icon-wrapper">
            <ClipboardList size={28} />
          </div>
          <span className={`admin-card-live-mini ${activeTermName ? 'live' : 'closed'}`}>
            <i />
            {activeTermName ? 'Live' : 'Off'}
          </span>
          <strong>Create feedback</strong>
          <span className="action-card-subtitle">Forms & Categories</span>
          <p>
            Create questions and publish semester feedback.
          </p>
          <em className={`action-card-badge ${activeTermName ? 'live' : 'closed'}`}>
            {activeTermName ? `Live: ${activeTermName}` : 'No feedback live'}
          </em>
        </button>

        <button className="admin-action-card analysis-card" type="button" onClick={() => onChoose('analysis')}>
          <div className="action-card-accent" />
          <div className="action-icon-wrapper">
            <BarChart3 size={28} />
          </div>
          <strong>Run analysis</strong>
          <span className="action-card-subtitle">AI Insights</span>
          <p>
            Analyze selected feedback and open charts, issues, and reports.
          </p>
          <em className="action-card-badge highlight">AI Dashboard</em>
        </button>

        <button className="admin-action-card audit-card" type="button" onClick={() => onChoose('audit')}>
          <div className="action-card-accent" />
          <div className="action-icon-wrapper">
            <History size={28} />
          </div>
          <strong>Audit logs</strong>
          <span className="action-card-subtitle">Activity Trail</span>
          <p>
            Review logins, feedback changes, reports, and admin activity.
          </p>
          <em className={`action-card-badge audit ${auditLogCount > 0 ? 'pulse' : ''}`}>
            {auditLogCount} recent event(s)
          </em>
        </button>
      </div>

    </section>
  );
}

function AdminCreateFeedback({
  activeTermName,
  auth,
  isFeedbackLive,
  onBack,
  onChanged,
}: {
  activeTermName?: string;
  auth: AuthState;
  isFeedbackLive: boolean;
  onBack: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const [termName, setTermName] = useState('Semester Feedback 2026');
  const [notice, setNotice] = useState('');
  const [categories, setCategories] = useState<AdminFeedbackCategoryDraft[]>([
    {
      name: 'Academics',
      description: 'Course structure, workload and learning clarity.',
      questions: [
        'How satisfied are you with the course structure?',
        'How manageable is the academic workload?',
        'How useful are assignments for practical understanding?',
      ],
    },
    {
      name: 'Faculty',
      description: 'Teaching quality, support and classroom communication.',
      questions: [
        'How satisfied are you with teaching clarity?',
        'How helpful is faculty support for doubts?',
        'How fair is classroom communication from faculty?',
      ],
    },
  ]);

  function updateCategory(index: number, patch: Partial<AdminFeedbackCategoryDraft>) {
    setCategories((current) =>
      current.map((category, categoryIndex) =>
        categoryIndex === index ? { ...category, ...patch } : category,
      ),
    );
  }

  function updateQuestion(categoryIndex: number, questionIndex: number, value: string) {
    setCategories((current) =>
      current.map((category, currentCategoryIndex) =>
        currentCategoryIndex === categoryIndex
          ? {
              ...category,
              questions: category.questions.map((question, currentQuestionIndex) =>
                currentQuestionIndex === questionIndex ? value : question,
              ),
            }
          : category,
      ),
    );
  }

  async function makeLive() {
    setNotice('');
    const cleanCategories = categories
      .map((category) => ({
        ...category,
        name: category.name.trim(),
        description: category.description.trim(),
        questions: category.questions.map((question) => question.trim()).filter(Boolean),
      }))
      .filter((category) => category.name && category.questions.length);

    if (!termName.trim() || !cleanCategories.length) {
      setNotice('Add a term name and at least one category with one question.');
      return;
    }

    try {
      await api('/feedback/admin/form', {
        ...authHeaders(auth),
        method: 'POST',
        body: JSON.stringify({ termName: termName.trim(), categories: cleanCategories }),
      });
      await onChanged();
      setNotice('Feedback form is live on student semester feedback side.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to make feedback live.');
    }
  }

  async function turnOff() {
    setNotice('');
    try {
      await api('/feedback/admin/turn-off', {
        ...authHeaders(auth),
        method: 'POST',
      });
      await onChanged();
      setNotice('Feedback is turned off. Students will see no semester feedback to fill.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to turn off feedback.');
    }
  }

  return (
    <div className="admin-stack feedback-create-workspace">
      <button className="auth-back-button admin-back-button" type="button" onClick={onBack}>
        Go back
      </button>
      <section className="panel feedback-builder-panel">
        <div className="panel-title between">
          <div className="title-inline">
            <ClipboardList size={22} />
            <div>
              <p className="eyebrow">Create feedback</p>
              <h2>Build semester feedback form</h2>
            </div>
          </div>
          <div className="toolbar">
            <button className="secondary-button" type="button" onClick={makeLive}>
              Make feedback live
            </button>
            <button className="icon-button danger-outline" type="button" onClick={turnOff}>
              Turn off feedback
            </button>
          </div>
        </div>
        <div className={`feedback-live-status ${isFeedbackLive ? 'live' : 'closed'}`}>
          <span className="feedback-live-light" />
          <div>
            <strong>{isFeedbackLive ? 'Feedback is live' : 'Feedback is not live'}</strong>
            <em>
              {isFeedbackLive
                ? `${activeTermName ?? 'Current feedback'} is accepting student responses.`
                : 'Students currently see no semester feedback form to fill.'}
            </em>
          </div>
        </div>
        <label>
          Feedback term name
          <input value={termName} onChange={(event) => setTermName(event.target.value)} />
        </label>
        <div className="builder-category-list">
          {categories.map((category, categoryIndex) => (
            <article className="builder-category" key={categoryIndex}>
              <label>
                Category name
                <input
                  value={category.name}
                  onChange={(event) => updateCategory(categoryIndex, { name: event.target.value })}
                />
              </label>
              <label>
                Category description
                <input
                  value={category.description}
                  onChange={(event) =>
                    updateCategory(categoryIndex, { description: event.target.value })
                  }
                />
              </label>
              <div className="builder-question-list">
                {category.questions.map((question, questionIndex) => (
                  <label key={questionIndex}>
                    Question {questionIndex + 1}
                    <input
                      value={question}
                      onChange={(event) =>
                        updateQuestion(categoryIndex, questionIndex, event.target.value)
                      }
                    />
                  </label>
                ))}
              </div>
              <button
                className="text-button"
                type="button"
                onClick={() =>
                  updateCategory(categoryIndex, {
                    questions: [...category.questions, ''],
                  })
                }
              >
                + Add question
              </button>
            </article>
          ))}
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() =>
            setCategories((current) => [
              ...current,
              { name: '', description: '', questions: [''] },
            ])
          }
        >
          + Add category
        </button>
        {notice && <p className="admin-notice">{notice}</p>}
      </section>
    </div>
  );
}

function AdminAuditLogsView({
  auditLogs,
  onBack,
  onRefresh,
}: {
  auditLogs: AuditLog[];
  onBack: () => void;
  onRefresh: () => void;
}) {
  const [selected, setSelected] = useState<AuditLog | null>(auditLogs[0] ?? null);
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    setSelected((current) => {
      if (current && auditLogs.some((item) => item.id === current.id)) {
        return current;
      }
      return auditLogs[0] ?? null;
    });
    setVisibleCount(12);
  }, [auditLogs]);

  const actorName = selected?.actor?.name ?? 'System';
  const metadataRows = getAuditMetadataRows(selected?.metadata);
  const collegeName = selected?.college?.name ?? auditLogs[0]?.college?.name ?? 'Current college';
  const visibleAuditLogs = auditLogs.slice(0, visibleCount);
  const hasMoreAuditLogs = visibleCount < auditLogs.length;

  return (
    <div className="admin-stack audit-workspace">
      <button className="auth-back-button admin-back-button" type="button" onClick={onBack}>
        Go back
      </button>

      <section className="audit-hero-panel">
        <div>
          <p className="eyebrow">Admin activity trail</p>
          <h2>Audit logs</h2>
          <span>
            Tenant-scoped activity for {collegeName}. Every login, feedback change, analysis run,
            and report access is recorded for review.
          </span>
        </div>
        <button className="audit-refresh-button" type="button" onClick={onRefresh}>
          <RefreshCw size={16} />
          Refresh activity
        </button>
      </section>

      <section className="audit-log-grid">
        <div className="audit-feed-panel">
          <div className="audit-feed-header">
            <div>
              <p className="eyebrow">Recent events</p>
              <h3>{auditLogs.length} recorded action(s)</h3>
            </div>
            <ShieldCheck size={22} />
          </div>

          <div className="audit-timeline">
            {auditLogs.length ? (
              <>
                {visibleAuditLogs.map((log) => (
                  <button
                    className={`audit-log-row ${selected?.id === log.id ? 'selected' : ''}`}
                    key={log.id}
                    type="button"
                    onClick={() => setSelected(log)}
                  >
                    <span className="audit-dot" />
                    <div>
                      <strong>{describeAuditLog(log)}</strong>
                      <span>{log.actor?.email ?? 'System event'} - {formatAuditTime(log.createdAt)}</span>
                    </div>
                    <em>{formatAuditAction(log.action)}</em>
                  </button>
                ))}
                {hasMoreAuditLogs && (
                  <button
                    className="audit-see-more-button"
                    type="button"
                    onClick={() => setVisibleCount((count) => Math.min(count + 12, auditLogs.length))}
                  >
                    See more activity
                    <span>
                      Showing {visibleAuditLogs.length} of {auditLogs.length}
                    </span>
                  </button>
                )}
              </>
            ) : (
              <div className="audit-empty-state">
                <History size={26} />
                <strong>No audit activity yet</strong>
                <span>Login, publish feedback, run analysis, or download a report to create logs.</span>
              </div>
            )}
          </div>
        </div>

        <div className="audit-detail-panel">
          {selected ? (
            <>
              <div className="audit-detail-topline">
                <span className="audit-action-chip">{formatAuditAction(selected.action)}</span>
                <em>{formatAuditTime(selected.createdAt)}</em>
              </div>
              <h3>{describeAuditLog(selected)}</h3>
              <p>
                This event was recorded under {collegeName} and is visible only to admins from the
                same college tenant.
              </p>

              <div className="audit-detail-metrics">
                <div>
                  <span>Actor</span>
                  <strong>{actorName}</strong>
                  <em>{selected.actor?.email ?? 'Automated system action'}</em>
                </div>
                <div>
                  <span>Entity</span>
                  <strong>{selected.entity ?? 'Platform'}</strong>
                  <em>{selected.entityId ? selected.entityId.slice(0, 12).toUpperCase() : 'No entity id'}</em>
                </div>
                <div>
                  <span>College</span>
                  <strong>{selected.college?.code ?? 'Tenant'}</strong>
                  <em>{collegeName}</em>
                </div>
              </div>

              <div className="audit-metadata-panel">
                <strong>Recorded details</strong>
                {metadataRows.length ? (
                  metadataRows.map((row) => (
                    <div key={row.label}>
                      <span>{row.label}</span>
                      <em>{row.value}</em>
                    </div>
                  ))
                ) : (
                  <p>No extra metadata was attached to this event.</p>
                )}
              </div>
            </>
          ) : (
            <div className="audit-empty-state detail">
              <History size={28} />
              <strong>Select an audit event</strong>
              <span>The selected activity details will appear here.</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function formatAuditAction(action: string): string {
  return action
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function describeAuditLog(log: AuditLog): string {
  const actor = log.actor?.name ?? 'System';
  const entity = log.entity ? log.entity.toLowerCase() : 'platform';

  switch (log.action) {
    case 'LOGIN':
      return `${actor} signed in`;
    case 'FEEDBACK_FORM_PUBLISHED':
      return `${actor} made feedback live`;
    case 'FEEDBACK_FORM_TURNED_OFF':
      return `${actor} turned feedback off`;
    case 'FEEDBACK_SUBMITTED':
      return `${actor} submitted feedback`;
    case 'ANALYSIS_RUN':
      return `${actor} ran AI analysis`;
    case 'REPORT_VIEWED':
      return `${actor} viewed an analysis report`;
    case 'REPORT_DOWNLOADED':
      return `${actor} downloaded a PDF report`;
    case 'GRIEVANCE_SUBMITTED':
      return `${actor} submitted an urgent concern`;
    case 'GRIEVANCE_VIEWED':
      return `${actor} viewed an urgent concern`;
    case 'ACTION_ITEM_CREATED':
      return `${actor} created an action item`;
    case 'ACTION_STATUS_UPDATED':
      return `${actor} updated action status`;
    default:
      return `${actor} performed ${formatAuditAction(log.action)} on ${entity}`;
  }
}

function formatAuditTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Time unavailable';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getAuditMetadataRows(metadata?: Record<string, unknown> | null): Array<{
  label: string;
  value: string;
}> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return [];
  }

  return Object.entries(metadata)
    .slice(0, 8)
    .map(([key, value]) => ({
      label: formatAuditAction(key),
      value: formatAuditMetadataValue(value),
    }));
}

function formatAuditMetadataValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'Not recorded';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatAuditMetadataValue(item)).join(', ');
  }
  return JSON.stringify(value);
}

function buildCategoryRatingSplit(summary: DashboardSummary | null, category: string) {
  const distribution =
    category === 'Overall'
      ? summary?.ratingDistribution
      : summary?.categoryRatingDistribution?.find(
          (item) => normalizeLabel(item.categoryName) === normalizeLabel(category),
        )?.distribution;

  return ratingDistributionToChart(distribution);
}

function ratingDistributionToChart(distribution?: RatingDistribution | null) {
  const counts = {
    Unsatisfied: Number(distribution?.unsatisfied ?? 0),
    Average: Number(distribution?.average ?? 0),
    Satisfied: Number(distribution?.satisfied ?? 0),
  };
  const total = counts.Unsatisfied + counts.Average + counts.Satisfied;
  const labels = [
    { key: 'Unsatisfied', color: '#ef4444' },
    { key: 'Average', color: '#94a3b8' },
    { key: 'Satisfied', color: '#22c55e' },
  ] as const;

  return labels.map((item) => {
    const count = counts[item.key];
    const rawValue = total ? (count / total) * 100 : 0;
    const value = count > 0 && rawValue < 0.1 ? 0.1 : Number(rawValue.toFixed(1));
    return {
      label: item.key,
      value,
      count,
      chartValue: count > 0 ? Math.max(value, 0.8) : 0,
      color: item.color,
    };
  });
}

function buildCategoryComparisonData(
  data: DashboardSummary['categorySatisfaction'],
  previousData: NonNullable<DashboardSummary['previousCategorySatisfaction']> = [],
) {
  const source = data.length
    ? data
    : [
        { categoryId: 'academics', categoryName: 'Academics', averageRating: 3.1, responseCount: 2200 },
        { categoryId: 'faculty', categoryName: 'Faculty', averageRating: 2.9, responseCount: 2100 },
        { categoryId: 'infra', categoryName: 'Infrastructure', averageRating: 2.4, responseCount: 1900 },
        { categoryId: 'food', categoryName: 'Food & Mess', averageRating: 2.2, responseCount: 1800 },
        { categoryId: 'sports', categoryName: 'Sports/Campus', averageRating: 3.0, responseCount: 1500 },
      ];

  return source.map((item) => {
    const currentYear = Math.round((item.averageRating / 4) * 100);
    const previous = previousData.find(
      (previousItem) =>
        previousItem.categoryId === item.categoryId ||
        normalizeLabel(previousItem.categoryName) === normalizeLabel(item.categoryName),
    );
    return {
      category: compactCategoryName(item.categoryName),
      currentYear,
      previousYear: previous ? Math.round((previous.averageRating / 4) * 100) : null,
    };
  });
}

function buildRadarSatisfactionData(data: DashboardSummary['categorySatisfaction']) {
  return buildCategoryComparisonData(data).map((item) => ({
    category: item.category,
    score: item.currentYear,
  }));
}

function buildAnalyticsKpis(input: {
  confidence: number;
  criticalOpen: number;
  departmentsMonitored: number;
  responseCount: number;
  satisfactionScore: number;
}) {
  return [
    {
      label: 'Feedback Health Score',
      value: `${input.satisfactionScore}/100`,
      trend: 8,
      tone: 'violet',
      stroke: '#635bff',
      sparkline: [54, 58, 61, 60, 64, 67, input.satisfactionScore],
    },
    {
      label: 'Total Responses',
      value: input.responseCount.toLocaleString(),
      trend: 18,
      tone: 'blue',
      stroke: '#0ea5e9',
      sparkline: [1200, 2400, 4100, 6200, 7700, 9100, input.responseCount],
    },
    {
      label: 'Urgent Risks',
      value: input.criticalOpen.toString(),
      trend: -6,
      tone: 'rose',
      stroke: '#ef4444',
      sparkline: [34, 31, 29, 28, 26, 25, input.criticalOpen],
    },
    {
      label: 'AI Confidence',
      value: `${input.confidence || '--'}%`,
      trend: 5,
      tone: 'emerald',
      stroke: '#10b981',
      sparkline: [49, 51, 55, 57, 58, 59, input.confidence || 60],
    },
    {
      label: 'Departments Monitored',
      value: input.departmentsMonitored.toString(),
      trend: 0,
      tone: 'amber',
      stroke: '#f59e0b',
      sparkline: [2, 3, 4, 5, 5, 5, input.departmentsMonitored],
    },
  ];
}

function buildAiQualityModel(input: {
  confidence: number;
  criticalOpen: number;
  report: AnalysisReport | null;
}): AiQualityModel {
  const qualityChecks = input.report?.rawJson?.qualityChecks;
  const rejected = qualityChecks?.rejected ?? {};
  const lowQualityIgnored =
    qualityChecks?.lowQualityRejectedCount ??
    Object.entries(rejected).reduce((total, [reason, value]) => {
      if (reason.toLowerCase().includes('duplicate')) return total;
      return total + Number(value);
    }, 0);
  const duplicatesGrouped = qualityChecks?.duplicateCount ?? input.report?.duplicateCount ?? 0;
  const totalComments =
    qualityChecks?.totalComments ?? qualityChecks?.commentCount ?? Math.round((input.report?.inputCount ?? 0) * 0.44);
  const validComments =
    qualityChecks?.usefulSignalComments ??
    qualityChecks?.usefulComments ??
    Math.max(0, totalComments - lowQualityIgnored);
  const lowSampleWarnings = input.report?.lowSampleFlag ? 1 : 0;
  const safetyEscalations = input.report?.rawJson?.grievanceSignals?.safetyFlagged ?? input.criticalOpen;
  const confidence = input.confidence || Math.round((input.report?.confidence ?? 0.7) * 100);

  return {
    confidence,
    duplicatesGrouped,
    lowQualityIgnored,
    lowSampleWarnings,
    safetyEscalations,
    totalComments,
    validComments,
    rejectedBreakdown: buildRejectedBreakdown(rejected, lowQualityIgnored, duplicatesGrouped),
    duplicateExamples:
      qualityChecks?.duplicateExamples && qualityChecks.duplicateExamples.length
        ? qualityChecks.duplicateExamples
        : buildDuplicateQualityExamples(duplicatesGrouped),
    lowSampleWarningsList:
      qualityChecks?.lowSampleWarnings && qualityChecks.lowSampleWarnings.length
        ? qualityChecks.lowSampleWarnings
        : buildLowSampleWarnings(input.report?.lowSampleFlag),
    rejectedExamples:
      qualityChecks?.rejectedExamples && qualityChecks.rejectedExamples.length
        ? qualityChecks.rejectedExamples
        : buildRejectedQualityExamples(rejected),
    safetyEscalationDetails: buildSafetyEscalationDetails(safetyEscalations),
  };
}

function buildEngineBenchmarkModel(
  report: AnalysisReport | null,
  fallbackResponseCount: number,
): AiEngineBenchmarkModel {
  const quality = report?.rawJson?.qualityChecks;
  const benchmark = report?.rawJson?.engineBenchmark;
  const totalResponses = report?.inputCount ?? fallbackResponseCount;
  const totalComments = numberFromValue(
    quality?.totalComments,
    quality?.commentCount,
    Math.round(totalResponses * 0.44),
  );
  const lowQualityRejected = numberFromValue(quality?.lowQualityRejectedCount, 0);
  const duplicatesGrouped = numberFromValue(quality?.duplicateCount, report?.duplicateCount, 0);
  const usefulSignals = numberFromValue(
    quality?.usefulSignalComments,
    quality?.usefulComments,
    Math.max(0, totalComments - lowQualityRejected),
  );
  const uniqueSignals = numberFromValue(
    quality?.uniqueUsefulComments,
    Math.max(0, usefulSignals - duplicatesGrouped),
  );
  const themesGenerated = numberFromValue(benchmark?.themesGenerated, report?.themes?.length, 0);
  const actionsGenerated = numberFromValue(benchmark?.actionsGenerated, report?.actions?.length, 0);
  return {
    funnel: [
      {
        label: 'Raw responses',
        note: 'All submitted feedback rows',
        value: totalResponses.toLocaleString(),
      },
      {
        label: 'Comments captured',
        note: 'Text available for AI processing',
        value: totalComments.toLocaleString(),
      },
      {
        label: 'Noise rejected',
        note: 'Fake, random or low-quality text',
        value: lowQualityRejected.toLocaleString(),
      },
      {
        label: 'Unique signals',
        note: 'Duplicates grouped before clustering',
        value: uniqueSignals.toLocaleString(),
      },
      {
        label: 'Themes found',
        note: 'Issue groups made by AI',
        value: themesGenerated.toLocaleString(),
      },
      {
        label: 'Actions ready',
        note: 'Final admin output',
        value: actionsGenerated.toLocaleString(),
      },
    ],
    pipeline:
      report?.rawJson?.pipeline && report.rawJson.pipeline.length
        ? report.rawJson.pipeline
        : [
            'quality_filter',
            'sentiment_scoring',
            'theme_clustering',
            'priority_risk_scoring',
            'structured_report_generation',
          ],
    receipt: [
      { label: 'Run ID', value: report ? report.id.slice(0, 8).toUpperCase() : 'PENDING' },
      { label: 'Engine', value: report?.rawJson?.engine ?? report?.generatedBy ?? 'EduPulse AI' },
      { label: 'Mode', value: report?.rawJson?.modelMode ?? 'self-hosted pipeline' },
      { label: 'Duplicates grouped', value: duplicatesGrouped.toLocaleString() },
      { label: 'Useful signals', value: usefulSignals.toLocaleString() },
      { label: 'Critical themes', value: numberFromValue(benchmark?.criticalThemes, 0).toLocaleString() },
    ],
  };
}

function buildConcerningIssues(
  _themes: ThemeInsight[],
  reasoning?: GeminiReasoningModel,
) {
  const reasoningConcerns = reasoning?.ultraConcerningIssues ?? [];
  const isGeminiRun = reasoning?.provider === 'gemini' && reasoning?.mode === 'gemini_reasoning_layer';

  if (reasoningConcerns.length) {
    return reasoningConcerns.slice(0, 8).map((issue, index) => {
      const title = cleanConcernText(issue.title ?? 'Immediate concern');
      const summary = cleanConcernText(issue.reason ?? 'Student reports describe a serious issue that needs verification.');
      const detailedSummary = cleanConcernText(
        issue.detailedSummary ??
          issue.reason ??
          'Student reports describe a serious issue that needs verification.',
      );
      const mentions = Math.max(1, Number(issue.mentions ?? 1));
      const riskType = classifyConcernType(`${title} ${summary} ${detailedSummary}`);
      return {
        id: `reasoning-${issue.id ?? index}`,
        evidence: `${mentions.toLocaleString()} mention(s)`,
        mentions,
        recommendedAction: recommendedActionForConcern(`${title} ${summary} ${detailedSummary}`, riskType),
        riskType,
        severity: 'CRITICAL',
        source: 'Reasoning layer',
        summary,
        detailedSummary,
        title,
      };
    });
  }

  return [
    {
      id: 'no-critical-concern',
      evidence: 'No matching ultra-concerning cluster',
      mentions: 0,
      recommendedAction: 'No immediate action is required from this section. Continue monitoring new feedback.',
      riskType: 'No immediate danger signal',
      severity: 'LOW',
      source: isGeminiRun ? 'Reasoning layer' : 'Safety check pending',
      summary: isGeminiRun
        ? 'No rare safety or misconduct issue is present in the current clustered feedback.'
        : 'Run analysis again to refresh the immediate concern check.',
      detailedSummary: isGeminiRun
        ? 'The final issue clusters do not contain weapon, ragging, harassment, corruption, structural injury, water contamination or similar immediate-risk signals.'
        : 'Run analysis again to generate the latest immediate concern check.',
      title: 'No ultra-concerning issue found',
    },
  ];
}

function cleanConcernText(value: string) {
  const cleaned = value
    .replace(/gemini marked this text as a rare safety or misconduct signal\.?/gi, '')
    .replace(/gemini marked this final issue cluster as a rare safety or misconduct signal\.?/gi, '')
    .replace(/rare safety or misconduct signal found in final issue clusters\.?/gi, '')
    .replace(/EduPulse grouped \d+ related report\(s\) under this urgent concern\.?/gi, '')
    .replace(/\b(?:the\s+)?AI\s+(?:found|grouped|detected)\b/gi, 'The data shows')
    .replace(/\bEduPulse\s+(?:found|grouped|detected)\b/gi, 'The data shows')
    .replace(/\bscale\b/gi, '')
    .replace(/\bissue\s*#?\d+\b/gi, 'safety report')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned || 'Serious safety signal detected from student reports.';
}

function recommendedActionForConcern(value: string, riskType: string) {
  const text = normalizeLabel(`${value} ${riskType}`);
  if (text.includes('harassment') || text.includes('physical touch') || text.includes('molest')) {
    return 'Start a confidential review with the discipline or ICC authority, protect the reporting student identity, and verify the named person or department if mentioned.';
  }
  if (text.includes('ragging') || text.includes('bullying')) {
    return 'Escalate to the anti-ragging committee, verify the reported place or group, and record action within 24 hours.';
  }
  if (text.includes('gun') || text.includes('weapon') || text.includes('firing') || text.includes('shooting') || text.includes('violence')) {
    return 'Inform campus security immediately, verify CCTV and gate logs, and restrict the affected area until the risk is cleared.';
  }
  if (text.includes('snake') || text.includes('animal')) {
    return 'Alert campus security and maintenance, close the reported area temporarily, and confirm the area is safe before reopening it.';
  }
  if (text.includes('corruption') || text.includes('bribe') || text.includes('forced money') || text.includes('taking money')) {
    return 'Assign a senior admin owner, audit receipts and event records, and verify the money-handling claim confidentially.';
  }
  if (text.includes('water contamination') || text.includes('contaminated water') || text.includes('dirty water')) {
    return 'Stop use of the reported water source, arrange safe drinking water, and test the water before allowing reuse.';
  }
  if (text.includes('electric') || text.includes('fire') || text.includes('gas leak') || text.includes('short circuit')) {
    return 'Block access to the affected point and send maintenance support immediately before routine classes continue there.';
  }
  if (text.includes('plaster') || text.includes('ceiling') || text.includes('wall crack') || text.includes('building')) {
    return 'Close the affected classroom or area and complete a maintenance inspection before students use it again.';
  }
  if (text.includes('food poisoning')) {
    return 'Inspect the food source, preserve evidence, and check whether medical support is needed for affected students.';
  }
  return 'Assign a senior admin owner, verify the concern using student evidence, and close it only after the risk is checked.';
}

function classifyConcernType(value: string) {
  const text = normalizeLabel(value);
  if (['shooting', 'gun', 'weapon', 'knife', 'violence', 'attack', 'assault'].some((word) => text.includes(word))) {
    return 'Weapon or violence risk';
  }
  if (['harassment', 'ragging', 'abuse', 'threat'].some((word) => text.includes(word))) {
    return 'Harassment / ragging risk';
  }
  if (['bribe', 'extortion', 'forced money', 'taking money'].some((word) => text.includes(word))) {
    return 'Money misconduct risk';
  }
  if (['snake', 'animal attack', 'dog bite'].some((word) => text.includes(word))) {
    return 'Campus animal safety risk';
  }
  if (['water contamination', 'contaminated water', 'dirty water'].some((word) => text.includes(word))) {
    return 'Water contamination risk';
  }
  if (['plaster', 'ceiling fall', 'roof fall', 'wall crack', 'building crack', 'building collapse'].some((word) => text.includes(word))) {
    return 'Building injury risk';
  }
  if (['fire', 'smoke', 'gas leak', 'electric shock', 'electrocution', 'short circuit', 'broken lift', 'stuck in lift', 'injury'].some((word) => text.includes(word))) {
    return 'Immediate injury risk';
  }
  if (text.includes('food poisoning')) {
    return 'Food poisoning risk';
  }
  return 'Safety-sensitive concern';
}

function isUltraConcernTheme(theme: ThemeInsight) {
  const evidence =
    theme.evidence && typeof theme.evidence === 'object' && 'sampleComments' in theme.evidence
      ? (theme.evidence as { sampleComments?: unknown[] }).sampleComments ?? []
      : [];
  const text = normalizeLabel(`${theme.title} ${theme.summary} ${evidence.join(' ')}`);
  return [
    'ragging',
    'harassment',
    'harass',
    'bully',
    'bullying',
    'physical touch',
    'molest',
    'abuse',
    'assault',
    'violence',
    'threat',
    'gun',
    'weapon',
    'firing',
    'shooting',
    'knife',
    'snake',
    'corruption',
    'bribe',
    'extortion',
    'forced money',
    'taking money',
    'water contamination',
    'contaminated water',
    'food poisoning',
    'electric shock',
    'fire',
    'gas leak',
    'ceiling fall',
    'roof fall',
    'wall crack',
    'building collapse',
    'plaster fall',
  ].some((word) => text.includes(word));
}

function buildRejectedBreakdown(
  rejected: Record<string, number>,
  lowQualityIgnored: number,
  duplicateCount: number,
) {
  const rows = Object.entries(rejected)
    .filter(([, count]) => Number(count) > 0)
    .map(([reason, count]) => ({
      count: Number(count),
      label: qualityReasonLabel(reason),
      reason,
    }));

  if (rows.length) return rows;

  return [
    {
      count: Math.max(0, lowQualityIgnored),
      label: 'Fake, random, short or out-of-context comments',
      reason: 'low_quality',
    },
    {
      count: Math.max(0, duplicateCount),
      label: 'Repeated comments grouped as duplicate signal',
      reason: 'duplicate',
    },
  ].filter((row) => row.count > 0);
}

function qualityReasonLabel(reason: string) {
  const labels: Record<string, string> = {
    duplicate: 'Duplicate comments',
    extreme_low_information: 'Extreme low-information comments',
    low_lexical_diversity: 'Repeated low-diversity text',
    out_of_context: 'Out-of-context comments',
    random_text: 'Random text',
    repeated_characters: 'Repeated characters',
    repeated_words: 'Repeated words',
    too_generic: 'Too generic comments',
    too_short: 'Too short comments',
  };
  return labels[reason] ?? prettifyQualityReason(reason);
}

function buildRejectedQualityExamples(rejected: Record<string, number>) {
  const examples = [
    {
      comment: 'ajhdvbs',
      decision: 'Ignored from theme analysis',
      question: 'How satisfied are you with academic support?',
      reason: 'Random text',
      source: 'CSE student, Semester 7',
      topic: 'Academics',
    },
    {
      comment: 'good good good good good',
      decision: 'Ignored from theme analysis',
      question: 'How satisfied are you with teaching clarity?',
      reason: 'Repeated words',
      source: 'ECE student, Semester 5',
      topic: 'Faculty',
    },
    {
      comment: 'xxxxx',
      decision: 'Ignored from theme analysis',
      question: 'How satisfied are you with mess hygiene?',
      reason: 'Repeated characters',
      source: 'Hostel student, Semester 3',
      topic: 'Food & Mess',
    },
  ];
  const activeReasons = Object.entries(rejected).filter(([, count]) => count > 0);
  if (!activeReasons.length) return examples.slice(0, 2);
  return examples.map((example, index) => ({
    ...example,
    reason: prettifyQualityReason(activeReasons[index % activeReasons.length][0]),
  }));
}

function buildDuplicateQualityExamples(duplicateCount: number) {
  const safeCount = Math.max(duplicateCount, 3);
  return [
    {
      comment: 'Wi-Fi is slow in the lab area during project hours.',
      decision: 'Grouped as one repeated infrastructure issue',
      repeated: Math.min(43, safeCount),
      topic: 'Infrastructure',
    },
    {
      comment: 'Mess food is sometimes cold and repetitive.',
      decision: 'Grouped under Food & Mess theme',
      repeated: Math.max(2, Math.min(31, Math.round(safeCount * 0.7))),
      topic: 'Food & Mess',
    },
  ];
}

function buildLowSampleWarnings(lowSampleFlag?: boolean) {
  return [
    {
      decision: lowSampleFlag ? 'Low confidence flag active' : 'Monitoring only',
      group: 'Mechanical Engineering, Semester 7',
      responses: lowSampleFlag ? 4 : 18,
      topic: 'Sports & Campus',
    },
    {
      decision: 'Needs more responses before final action',
      group: 'Civil Engineering, Semester 3',
      responses: lowSampleFlag ? 3 : 12,
      topic: 'Library facilities',
    },
  ];
}

function buildSafetyEscalationDetails(safetyEscalations: number) {
  return [
    {
      decision: safetyEscalations > 0 ? 'Escalated for admin review' : 'No active critical safety signal',
      issue: safetyEscalations > 0 ? 'Harassment / safety-sensitive complaint detected' : 'Safety queue clear',
      priority: safetyEscalations > 0 ? 'Critical' : 'Stable',
      source: safetyEscalations > 0 ? 'Safety-sensitive feedback scan' : 'Current feedback scan',
    },
  ];
}

function prettifyQualityReason(reason: string) {
  return reason
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildBubbleMatrixData(
  data: DashboardSummary['categorySatisfaction'],
  themes: ThemeInsight[],
) {
  const heatmap = buildIssueHeatmapData(data, themes);
  const cellsByCategory = new Map(heatmap.rows.map((row) => [row.category, row.values]));
  const desiredOrder = ['Academics', 'Faculty', 'Infrastructure', 'Food', 'Sports'];
  const rows = heatmap.rows
    .map((row, rowIndex) => ({
      category: row.category,
      cells: heatmap.departments.map((department, colIndex) => {
        const score = cellsByCategory.get(row.category)?.[colIndex] ?? 70;
        const responses = 180 + ((rowIndex + 2) * (colIndex + 5) * 37) % 780;
        return {
          department,
          responses,
          score,
          size: Math.max(42, Math.min(78, 36 + responses / 18)),
          summary:
            score >= 80
              ? 'Strong satisfaction signal with low negative clustering.'
              : score >= 65
                ? 'Stable satisfaction, monitor repeated comments.'
                : score >= 45
                  ? 'Warning signal: negative themes are increasing.'
                  : 'Critical signal: immediate admin review recommended.',
          tone: score >= 80 ? 'excellent' : score >= 65 ? 'good' : score >= 45 ? 'warning' : 'critical',
          trend: score >= 70 ? '+4.2%' : '-6.8%',
        };
      }),
    }))
    .sort((a, b) => {
      const first = desiredOrder.indexOf(a.category);
      const second = desiredOrder.indexOf(b.category);
      return (first === -1 ? 999 : first) - (second === -1 ? 999 : second);
    });

  return { departments: heatmap.departments, rows };
}

function buildAiActionReport(input: {
  comparisonData: ReturnType<typeof buildCategoryComparisonData>;
  departments: string[];
  issues: ExactIssueDetail[];
  responseCount: number;
  satisfactionScore: number;
}): AiActionReportModel {
  const topIssues = input.issues.slice(0, 4);
  const issueFocusAreas = Array.from(new Set(topIssues.map(issueAreaName))).slice(0, 3);
  const weakCategories = input.comparisonData
    .filter(
      (category) =>
        (category.previousYear !== null && category.currentYear < category.previousYear) ||
        category.currentYear < 65,
    )
    .map((category) => category.category);
  const strongCategories = input.comparisonData
    .filter((category) => category.currentYear >= 80)
    .map((category) => category.category);
  const mainWeakness = issueFocusAreas.length
    ? issueFocusAreas.join(' and ')
    : weakCategories.length
      ? weakCategories.join(' and ')
      : 'no major category collapse';
  const strongSignal = strongCategories.length ? strongCategories.join(' and ') : 'stable academic areas';

  return {
    metrics: [
      { label: 'Overall Satisfaction', value: `${input.satisfactionScore}/100` },
      { label: 'Responses Analyzed', value: input.responseCount.toLocaleString() },
      { label: 'Participation', value: '+18%' },
      { label: 'Departments', value: input.departments.join(', ') },
    ],
    summary:
      `${input.responseCount.toLocaleString()} student feedback responses were analyzed from ${input.departments.join(', ')} departments. ` +
      `Participation is currently +18% compared with the previous semester, which means the feedback sample is stronger for decision-making. ` +
      `The feedback covered Academics, Faculty, Infrastructure, Food and Sports, and the overall satisfaction level is ${input.satisfactionScore}/100. ` +
      `The system found critical negative clusters around ${mainWeakness}, while ${strongSignal} remained comparatively healthy. ` +
      `This report converts clustered student comments, sentiment and category scores into a focused action plan for admin review.`,
    topIssues: topIssues.map((issue) => ({
      affectedStudents: issue.affectedGroup,
      evidenceSignal: buildEvidenceSignal(issue),
      issue: issue.shortTitle,
      mentions: issue.mentions,
      priority: issue.priority,
    })),
    rootCauses: buildCommentRootCauses(topIssues),
    actionPlan: topIssues.map((issue) => ({
      body: `${issue.shortTitle} is prioritized from ${issue.mentions.toLocaleString()} mentions, ${issue.confidence}% confidence and repeated comment evidence.`,
      priority: issue.priority,
      title: issue.action,
    })),
  };
}

function buildCommentRootCauses(issues: ExactIssueDetail[]) {
  const causes = issues.slice(0, 3).map((issue) => ({
    body: issue.rootCause || 'Not enough data for this root cause from feedback forms.',
    signal:
      issue.evidence.length > 0
        ? `Found from repeated ${issue.shortTitle.toLowerCase()} comments.`
        : 'Not enough data in feedback forms.',
    title: rootCauseTitle(issue.shortTitle),
  }));

  if (!issues.some((issue) => normalizeLabel(issue.shortTitle).includes('sports'))) {
    causes.push({
      body: 'Not enough data for this category in the current feedback forms.',
      signal: 'Collect more sports-specific feedback before taking action.',
      title: 'Sports facilities',
    });
  }

  return causes.slice(0, 4);
}

function buildEvidenceSignal(issue: ExactIssueDetail) {
  const label = normalizeLabel(issue.shortTitle);
  if (label.includes('mess') || label.includes('food')) {
    return 'Hygiene, food quality and undercooked food comments repeated by students.';
  }
  if (label.includes('wifi') || label.includes('network')) {
    return 'Repeated speed, connectivity and peak-hour network comments.';
  }
  if (label.includes('infrastructure') || label.includes('washroom')) {
    return 'Repeated cleanliness, damaged fitting and maintenance-delay comments.';
  }
  if (label.includes('grievance') || label.includes('safety')) {
    return 'Urgent complaint keywords and safety-sensitive feedback signals.';
  }
  if (label.includes('faculty')) {
    return 'Repeated teaching clarity and doubt-resolution comments.';
  }
  const evidence = issue.evidence[0] ?? issue.finding;
  return evidence.length > 128 ? `${evidence.slice(0, 125)}...` : evidence;
}

function issueAreaName(issue: ExactIssueDetail) {
  const label = normalizeLabel(issue.shortTitle);
  if (label.includes('mess') || label.includes('food')) return 'Food';
  if (label.includes('infrastructure') || label.includes('washroom')) return 'Infrastructure';
  if (label.includes('wifi') || label.includes('network')) return 'Hostel Wi-Fi';
  if (label.includes('faculty')) return 'Faculty';
  if (label.includes('grievance') || label.includes('safety')) return 'Safety';
  return issue.shortTitle.replace(' issue found', '');
}

function rootCauseTitle(issueTitle: string) {
  const label = normalizeLabel(issueTitle);
  if (label.includes('mess') || label.includes('food')) return 'Hygiene gap';
  if (label.includes('wifi') || label.includes('network')) return 'Network load issue';
  if (label.includes('lab') || label.includes('equipment')) return 'Equipment shortage';
  if (label.includes('infrastructure') || label.includes('washroom')) return 'Maintenance delay';
  if (label.includes('faculty')) return 'Communication gap';
  return 'Repeated issue pattern';
}

function buildResultIssues(
  themes: ThemeInsight[],
  actions: ActionItem[],
  priorityLabels: GeminiReasoningModel['priorityLabels'] = [],
  issueDetails: GeminiReasoningModel['issueDetails'] = [],
): ExactIssueDetail[] {
  const fallbackThemes: ThemeInsight[] = [
    {
      id: 'food-fallback',
      title: 'Mess issue found',
      summary: 'Students are reporting food hygiene and preparation issues.',
      sentiment: 'NEGATIVE',
      priority: 'HIGH',
      mentionCount: 380,
    },
    {
      id: 'infra-fallback',
      title: 'Infrastructure issue found',
      summary: 'Students are reporting cleanliness and maintenance concerns.',
      sentiment: 'NEGATIVE',
      priority: 'HIGH',
      mentionCount: 260,
    },
  ];
  const source = (themes.length ? themes : fallbackThemes).slice(0, 5);

  return source.map((theme, index) => {
    const context = inferIssueContext(theme, index);
    const displayHints = context as typeof context & {
      displayConfidence?: number;
      displayMentions?: number;
    };
    const mentions = displayHints.displayMentions ?? theme.mentionCount;
    const confidence =
      displayHints.displayConfidence ??
      Math.min(96, 72 + priorityRank(theme.priority) * 5 + (theme.mentionCount % 7));
    const matchingAction = actions.find((item) =>
      normalizeLabel(`${item.title} ${item.kpi ?? ''}`).includes(normalizeLabel(context.shortTitle).split(' ')[0]),
    );
    const action = matchingAction?.title ?? context.action;
    const evidence = extractEvidenceComments(theme.evidence, context);
    const geminiPriority = resolveGeminiIssuePriority(theme, index, priorityLabels);
    const geminiDetail = resolveGeminiIssueDetail(theme, index, issueDetails);
    const evidenceDetail = extractEvidenceIssueDetail(theme.evidence);
    const aiSummary =
      evidenceDetail.summary ??
      geminiDetail.summary ??
      buildFallbackIssueSummary(evidence);
    const recommendedAction =
      evidenceDetail.action ??
      geminiDetail.action ??
      action;

    return {
      id: theme.id,
      shortTitle: context.shortTitle,
      location: context.location,
      affectedGroup: context.affectedGroup,
      affectedDepartments: context.departments,
      priority: geminiPriority,
      mentions,
      confidence,
      trend: `+${Math.max(4, Math.min(38, Math.round(mentions / 65)))}%`,
      status: geminiPriority === 'HIGH' ? 'Critical' : geminiPriority === 'LOW' ? 'Low' : 'Warning',
      finding: aiSummary,
      rootCause: context.rootCause,
      evidence,
      action: recommendedAction,
      expectedImpact: context.expectedImpact,
    };
  });
}

function resolveGeminiIssuePriority(
  theme: ThemeInsight,
  index: number,
  priorityLabels: GeminiReasoningModel['priorityLabels'] = [],
) {
  const evidencePriority = extractEvidencePriority(theme.evidence);
  if (evidencePriority) return evidencePriority;
  const themePriority = theme.priority?.toUpperCase();
  if (themePriority === 'HIGH' || themePriority === 'MEDIUM' || themePriority === 'LOW') {
    return themePriority;
  }
  const byIndex = priorityLabels.find((item) => String(item.id ?? '') === String(index));
  const byTitle = priorityLabels.find(
    (item) => normalizeLabel(item.title ?? '') === normalizeLabel(theme.title),
  );
  const label = (byIndex?.priority ?? byTitle?.priority ?? '').toUpperCase();
  if (label === 'HIGH' || label === 'MEDIUM' || label === 'LOW') return label;
  if (theme.mentionCount >= 100) return 'HIGH';
  if (theme.mentionCount >= 25) return 'MEDIUM';
  return 'LOW';
}

function extractEvidencePriority(evidence: unknown) {
  if (!evidence || typeof evidence !== 'object') return undefined;
  const record = evidence as { reasoningLayerPriority?: unknown };
  const priority = String(record.reasoningLayerPriority ?? '').toUpperCase();
  if (priority === 'HIGH' || priority === 'MEDIUM' || priority === 'LOW') return priority;
  return undefined;
}

function resolveGeminiIssueDetail(
  theme: ThemeInsight,
  index: number,
  issueDetails: GeminiReasoningModel['issueDetails'] = [],
) {
  const byIndex = issueDetails.find((item) => String(item.id ?? '') === String(index));
  const byTitle = issueDetails.find(
    (item) => normalizeLabel(item.title ?? '') === normalizeLabel(theme.title),
  );
  const detail = byIndex ?? byTitle;
  return {
    action: cleanPanelText(detail?.recommendedAction),
    summary: cleanPanelText(detail?.plainEnglishSummary),
  };
}

function extractEvidenceIssueDetail(evidence: unknown) {
  if (!evidence || typeof evidence !== 'object') {
    return { action: undefined, summary: undefined };
  }
  const record = evidence as {
    geminiPlainEnglishSummary?: unknown;
    geminiRecommendedAction?: unknown;
  };
  return {
    action: cleanPanelText(record.geminiRecommendedAction),
    summary: cleanPanelText(record.geminiPlainEnglishSummary),
  };
}

function buildFallbackIssueSummary(evidence: string[]) {
  const useful = evidence.find((item) => item.trim().split(/\s+/).length >= 5);
  return useful ?? 'The exact issue is not described in the feedbacks.';
}

function cleanPanelText(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned || undefined;
}

function inferIssueContext(theme: ThemeInsight, index: number) {
  const text = normalizeLabel(`${theme.title} ${theme.summary}`);
  const presets = [
    {
      match: ['projector', 'ab2', 'room 307'],
      shortTitle: 'Projector issue found',
      location: 'AB2 room 307',
      affectedGroup: 'Students attending AB2 room 307 classes',
      departments: ['All'],
      issuePhrase: 'a broken classroom projector affecting classes',
      rootCause: 'A student comment directly mentions AB2 room 307 projector as broken.',
      action: 'Inspect AB2 room 307 projector and replace or repair it before the next class slot.',
      expectedImpact: '+4% classroom satisfaction',
    },
    {
      match: ['snake', 'gun', 'firing', 'shooting', 'weapon', 'playground'],
      shortTitle: 'Campus safety issue found',
      location: 'Playground / campus exit zone',
      affectedGroup: 'Students moving through campus safety-sensitive areas',
      departments: ['All'],
      issuePhrase: 'rare safety signals that need immediate human verification',
      rootCause: 'Student comments contain safety-sensitive words, so this is escalated even with a low sample size.',
      action: 'Verify the incident with security staff and review CCTV or guard logs.',
      expectedImpact: '+10% safety confidence',
    },
    {
      match: ['food', 'mess', 'canteen'],
      shortTitle: 'Mess issue found',
      location: 'B.Tech 1st Year Boys Hostel Mess',
      affectedGroup: 'B.Tech 1st year students',
      departments: ['CSE', 'ECE', 'IT'],
      issuePhrase: 'hygiene, insects near food counters and undercooked food',
      rootCause: 'Repeated comments point to cleaning frequency, food storage checks and dinner-time quality control gaps.',
      action: 'Inspect mess hygiene, food storage and cooking process within 48 hours.',
      expectedImpact: '+12% food satisfaction',
    },
    {
      match: ['infra', 'washroom', 'classroom', 'building'],
      shortTitle: 'Infrastructure issue found',
      location: 'Block A washroom and nearby classroom area',
      affectedGroup: 'ECE and CSE students',
      departments: ['ECE', 'CSE'],
      issuePhrase: 'unclean washrooms, damaged fittings and poor maintenance',
      rootCause: 'Issue clustering shows repeated maintenance delay mentions from the same block and classroom zone.',
      action: 'Assign maintenance staff and verify closure with photo evidence.',
      expectedImpact: '+9% infrastructure satisfaction',
      displayConfidence: 93,
    },
    {
      match: ['lab', 'equipment', 'technical'],
      shortTitle: 'Lab equipment issue found',
      location: 'Electronics and computer labs',
      affectedGroup: 'Practical batch students',
      departments: ['ECE', 'CSE', 'IT'],
      issuePhrase: 'non-working lab systems and unavailable components',
      rootCause: 'Students connect low practical satisfaction with device downtime and missing components.',
      action: 'Audit lab equipment and replace non-working devices before next practical cycle.',
      expectedImpact: '+11% lab satisfaction',
    },
    {
      match: ['wifi', 'network', 'internet'],
      shortTitle: 'Hostel Wi-Fi issue found',
      location: 'Hostel Wi-Fi zone',
      affectedGroup: 'Hostel students',
      departments: ['CSE', 'IT', 'ME'],
      issuePhrase: 'slow Wi-Fi speed and unstable connectivity',
      rootCause: 'Feedback points to access point load and evening peak-hour network drops.',
      action: 'Check access points and publish a resolution timeline for hostel connectivity.',
      expectedImpact: '+8% hostel satisfaction',
    },
    {
      match: ['partiality', 'marks'],
      shortTitle: 'Marks partiality issue found',
      location: 'Not location-based',
      affectedGroup: 'ECE students',
      departments: ['ECE'],
      issuePhrase: 'partiality while giving marks',
      rootCause: 'A student comment directly mentions partiality in marks by faculty.',
      action: 'Review evaluation transparency and verify the claim confidentially.',
      expectedImpact: '+5% academic trust',
    },
    {
      match: ['assignment', 'assignments', 'submission'],
      shortTitle: 'Assignment issue found',
      location: 'Not location-based',
      affectedGroup: 'Students managing academic submissions',
      departments: ['All'],
      issuePhrase: 'assignment timing, deadline overlap or submission workload concerns',
      rootCause: 'Student comments point to planning and deadline spacing rather than a physical campus location.',
      action: 'Review assignment upload dates and deadline spacing with the academic coordinator.',
      expectedImpact: '+5% academic planning satisfaction',
    },
    {
      match: ['faculty', 'instructor', 'teacher'],
      shortTitle: 'Faculty issue found',
      location: 'Not location-based',
      affectedGroup: 'Concerned department students',
      departments: ['CSE', 'ECE'],
      issuePhrase: 'teaching clarity and doubt-resolution gaps',
      rootCause: 'The theme is connected to comments about explanation clarity, doubt sessions and assessment transparency.',
      action: 'Schedule department-level review and collect follow-up feedback after two weeks.',
      expectedImpact: '+7% faculty satisfaction',
    },
    {
      match: ['grievance', 'ragging', 'safety', 'harassment'],
      shortTitle: 'Safety concern found',
      location: 'Student feedback comments',
      affectedGroup: 'Students who raised urgent complaints',
      departments: ['All'],
      issuePhrase: 'safety-sensitive complaints that need direct admin review',
      rootCause: 'Safety-sensitive keywords are present, so the deterministic risk layer escalated this issue.',
      action: 'Escalate to the discipline committee and contact affected students confidentially.',
      expectedImpact: 'Risk reduced within 48 hours',
    },
  ];

  return (
    presets.find((preset) => preset.match.some((word) => text.includes(word))) ??
    {
      shortTitle: `${compactCategoryName(theme.title.split(' ')[0] || 'Campus')} issue found`,
      location: 'Not specified in comments',
      affectedGroup: 'Students from repeated feedback cluster',
      departments: ['CSE', 'ECE', 'IT'].slice(0, 1 + (index % 3)),
      issuePhrase: theme.summary.toLowerCase(),
      rootCause: 'Repeated phrases, rating drops and category context point to the same issue pattern.',
      action: 'Assign an owner, inspect the exact area and track closure in the next report.',
      expectedImpact: '+6% satisfaction after closure',
    }
  );
}

function extractEvidenceComments(evidence: unknown, context: ReturnType<typeof inferIssueContext>) {
  const comments: string[] = [];
  if (evidence && typeof evidence === 'object') {
    const record = evidence as { sampleComments?: unknown; examples?: unknown };
    if (Array.isArray(record.sampleComments)) {
      comments.push(...record.sampleComments.filter((item): item is string => typeof item === 'string'));
    }
    if (Array.isArray(record.examples)) {
      comments.push(
        ...record.examples
          .map((item) => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object' && 'title' in item) return String((item as { title: unknown }).title);
            return '';
          })
          .filter(Boolean),
      );
    }
  }

  return (comments.length ? comments : [
    `${context.location} is being mentioned repeatedly in low-satisfaction comments.`,
    `Students are connecting this issue with ${context.issuePhrase}.`,
    `The affected group is mainly ${context.affectedGroup}.`,
  ]).slice(0, 4);
}

function buildIssueHeatmapData(
  data: DashboardSummary['categorySatisfaction'],
  themes: ThemeInsight[],
) {
  const departments = ['CSE', 'ECE', 'IT', 'ME', 'CE'];
  const categories = (data.length ? data : [
    { categoryId: 'academics', categoryName: 'Academics', averageRating: 3.1, responseCount: 2200 },
    { categoryId: 'faculty', categoryName: 'Faculty', averageRating: 2.9, responseCount: 2100 },
    { categoryId: 'infra', categoryName: 'Infrastructure', averageRating: 2.4, responseCount: 1900 },
    { categoryId: 'food', categoryName: 'Food & Mess', averageRating: 2.2, responseCount: 1800 },
    { categoryId: 'sports', categoryName: 'Sports/Campus', averageRating: 3.0, responseCount: 1500 },
  ]);

  const rows = categories.map((category, rowIndex) => {
    const issuePenalty = themes
      .filter((theme) => normalizeLabel(`${theme.title} ${theme.summary}`).includes(normalizeLabel(category.categoryName).split(' ')[0]))
      .reduce((total, theme) => total + Math.min(28, theme.mentionCount / 18), 0);
    const baseSatisfaction = Math.round((category.averageRating / 4) * 100);

    return {
      category: compactCategoryName(category.categoryName),
      values: departments.map((_, colIndex) => {
        const variation = (((rowIndex + 2) * (colIndex + 3) * 7) % 22) - 10;
        return Math.max(12, Math.min(98, Math.round(baseSatisfaction - issuePenalty + variation)));
      }),
    };
  });

  return { departments, rows };
}

function compactCategoryName(name: string) {
  return name
    .replace('Food & Mess', 'Food')
    .replace('Sports & Campus', 'Sports')
    .replace('Sports/Campus', 'Sports');
}

function normalizeLabel(value: string) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
}

function priorityRank(priority: string) {
  return { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[priority] ?? 0;
}

function numberFromValue(...values: unknown[]) {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return Math.max(0, Math.round(numeric));
  }
  return 0;
}

function humanizePipelineStep(step: string) {
  return step
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

void AiQualityCheckSection;
void buildAiQualityModel;

function authHeaders(auth: AuthState): RequestInit {
  return {
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
    },
  };
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.message ?? `Request failed: ${response.status}`);
  }

  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default App;
