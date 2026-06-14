import { useEffect, useRef, useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  GraduationCap, 
  ChevronRight, 
  Lock, 
  Users, 
  FileText, 
  Layers, 
  X,
  ArrowRight,
  Filter,
  Copy,
  Activity,
  Tags,
  AlertOctagon,
  FolderTree,
  TrendingUp,
  Sparkle,
  Gauge
} from 'lucide-react';

import edupulseLogo from '../assets/logo.png';
import './LandingPage.css';

// types
type Role = 'ADMIN' | 'STUDENT';

interface LandingProps {
  onChooseRole: (role: Role) => void;
}

// Lifecycle Steps for HUD
const lifecycleSteps = [
  {
    step: "01",
    title: "Student Submission",
    detail: "Students submit feedback securely along with ratings, comments, category, branch, and semester tags.",
    coord: "LAT: 28.469 | LNG: 77.524",
    status: "INGESTION_ACTIVE",
    iconName: "GraduationCap",
    logs: [
      "> INGESTING FEEDBACK STREAM FROM STUDENT PORTALS",
      "> SECURING META-TAGS (BRANCH, RATINGS, TERM)",
      "> INGESTION SYNCHRONIZED [OK]"
    ]
  },
  {
    step: "02",
    title: "Data Cleansing",
    detail: "EduPulse AI automatically filters out fake, spam, repeating, and out-of-context comments.",
    coord: "INTEGRITY_SCAN: 99.8%",
    status: "CLEANSING_ACTIVE",
    iconName: "Filter",
    logs: [
      "> EXECUTING HEURISTIC SPAM SHIELD V4.2",
      "> FILTERING SPAMMERS AND OFF-TOPIC PHRASES",
      "> INTEGRITY VERIFICATION: 99.8% TRUST RATIO"
    ]
  },
  {
    step: "03",
    title: "Duplicate Grouping",
    detail: "Similar complaints are automatically cataloged and counted together instead of filling the board as spam.",
    coord: "DEDUPLICATION: ENABLED",
    status: "GROUPING_ACTIVE",
    iconName: "Copy",
    logs: [
      "> VECTOR CLUSTERING ON COMMENT SEGMENTS",
      "> SEARCHING FOR DUPLICATED COMPLAINT PATHS",
      "> CONSOLIDATED 14 REPEATED NODES [OK]"
    ]
  },
  {
    step: "04",
    title: "Urgency Detection",
    detail: "Serious concerns (such as ragging or harassment) are separated instantly for quick leadership attention.",
    coord: "SEVERITY_LEVEL: CRITICAL",
    status: "SAFETY_FILTER_ONLINE",
    iconName: "AlertOctagon",
    logs: [
      "> DISPATCHING SAFETY THREAD SCANNER",
      "> SCANNING FOR HARASSMENT OR SECURITY ISSUES",
      "> CRITICAL FLAG DETECTED -> REPORT ESCALATED"
    ]
  },
  {
    step: "05",
    title: "Classification Math",
    detail: "Issues are grouped across exact facility, academic, transport, safety, and hygiene taxonomies.",
    coord: "TAXONOMY: 6_CHANNELS",
    status: "CLASSIFIER_ONLINE",
    iconName: "FolderTree",
    logs: [
      "> RUNNING TOKENIZER & N-GRAM CORRELATOR",
      "> SORTING ENTRIES TO TAXONOMY MAP",
      "> CATEGORY CORRELATION ASSIGNED [SUCCESS]"
    ]
  },
  {
    step: "06",
    title: "Priority Scoring",
    detail: "Priority level is calculated using transparent math proportional to the volume of valid student complaints.",
    coord: "PRIORITY_RATIO: 1.48",
    status: "SCORING_ACTIVE",
    iconName: "Gauge",
    logs: [
      "> AGGREGATING GRIEVANCE FREQUENCY RATIOS",
      "> INITIATING SCORE INTEGRATOR (FACTOR: 1.48)",
      "> PRIORITY STATUS CALCULATED -> HIGH"
    ]
  },
  {
    step: "07",
    title: "Gemini Narrative",
    detail: "Gemini AI structures findings into human-readable action summaries and board-ready highlights.",
    coord: "MODEL_STACK: GEMINI_PRO",
    status: "NARRATIVE_ONLINE",
    iconName: "Sparkles",
    logs: [
      "> CONNECTING TO GEMINI MODEL API CLUSTER",
      "> PARSING DATASETS INTO EXECUTIVE RESUMES",
      "> NARRATIVE SYNTHESIS COMPLETED [OK]"
    ]
  },
  {
    step: "08",
    title: "Admin Action Center",
    detail: "Institution heads receive visual dashboards, critical alerts, and downloadable action reports.",
    coord: "PORTAL_SYNC: ESTABLISHED",
    status: "SYNC_ACTIVE",
    iconName: "ShieldCheck",
    logs: [
      "> SYNCHRONIZING REALTIME ADMIN CONSOLE",
      "> REFRESHING ANALYTICS SCHEMATICS & CHARTS",
      "> COMPILING AUDIT-READY PDF BRIEFINGS"
    ]
  }
];

const getLifecycleIcon = (name: string, size = 24) => {
  switch (name) {
    case 'GraduationCap': return <GraduationCap size={size} />;
    case 'Filter': return <Filter size={size} />;
    case 'Copy': return <Copy size={size} />;
    case 'AlertOctagon': return <AlertOctagon size={size} />;
    case 'FolderTree': return <FolderTree size={size} />;
    case 'Gauge': return <Gauge size={size} />;
    case 'Sparkles': return <Sparkles size={size} />;
    case 'ShieldCheck': return <ShieldCheck size={size} />;
    default: return <Sparkles size={size} />;
  }
};

// 3D Pipeline steps
const pipelineSteps = [
  {
    num: "01",
    title: "Raw Feedback",
    detail: "Student ratings, comments, category, branch, and semester tags are collected at entry.",
    face: 1, // Front
    icon: <Sparkles size={24} />
  },
  {
    num: "02",
    title: "Quality Filter",
    detail: "Fake, useless, random, repeated, and out-of-context comments are automatically removed.",
    face: 2, // Back
    icon: <Filter size={24} />
  },
  {
    num: "03",
    title: "Duplicate Grouping",
    detail: "Same or similar repeated comments are counted together instead of filling the database as spam.",
    face: 2, // Back
    icon: <Copy size={24} />
  },
  {
    num: "04",
    title: "Sentiment & Rating",
    detail: "Rating-based math classifies feedback into satisfied, average, and unsatisfied groups.",
    face: 3, // Right
    icon: <Activity size={24} />
  },
  {
    num: "05",
    title: "Issue Taxonomy",
    detail: "The system detects exact issue types across facilities, academics, faculty, transport, safety, and hygiene.",
    face: 3, // Right
    icon: <Tags size={24} />
  },
  {
    num: "06",
    title: "Urgent Concern",
    detail: "Serious issues like ragging, harassment, weapons, snakes, or contamination move to Immediate Action.",
    face: 4, // Left
    icon: <AlertOctagon size={24} />
  },
  {
    num: "07",
    title: "Normal Clustering",
    detail: "Similar normal issues are grouped together (e.g. multiple instructor absences form one attendance issue).",
    face: 5, // Top
    icon: <FolderTree size={24} />
  },
  {
    num: "08",
    title: "Priority Scoring",
    detail: "Priority is calculated: High (>10% valid reviews), Medium (5%-10%), and Low (<5%).",
    face: 5, // Top
    icon: <TrendingUp size={24} />
  },
  {
    num: "09",
    title: "Gemini Layer",
    detail: "Gemini is used after structuring to draft human-like action wording and board highlights.",
    face: 6, // Bottom
    icon: <Sparkle size={24} />
  },
  {
    num: "10",
    title: "Dashboard & Report",
    detail: "Visual administrative dashboards, live alerts, and downloadable PDF action reports are generated.",
    face: 6, // Bottom
    icon: <Gauge size={24} />
  }
];

export default function LandingPage({ onChooseRole }: LandingProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const pipelineRef = useRef<HTMLDivElement | null>(null);
  const productRef = useRef<HTMLDivElement | null>(null);
  const teamRef = useRef<HTMLDivElement | null>(null);
  
  // Pipeline animation step cycling
  const [activeStep, setActiveStep] = useState(0);

  // HUD Interactive Lifecycle Step Selection
  const [hudStep, setHudStep] = useState(0);

  const rotationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoRotation = () => {
    if (rotationTimerRef.current) {
      clearInterval(rotationTimerRef.current);
    }
    rotationTimerRef.current = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 10);
    }, 3200);
  };

  useEffect(() => {
    startAutoRotation();
    return () => {
      if (rotationTimerRef.current) {
        clearInterval(rotationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const revealElements = Array.from(document.querySelectorAll<HTMLElement>('.reveal-on-scroll'));

    const revealVisibleElements = () => {
      const triggerPoint = window.innerHeight * 0.86;
      revealElements.forEach((el) => {
        if (el.classList.contains('is-visible')) return;
        const rect = el.getBoundingClientRect();
        if (rect.top <= triggerPoint && rect.bottom >= 0) {
          el.classList.add('is-visible');
        }
      });
    };

    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries, currentObserver) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                currentObserver.unobserve(entry.target);
              }
            });
          },
          {
            root: null,
            rootMargin: '0px 0px -8% 0px',
            threshold: 0.08,
          },
        )
      : null;

    revealElements.forEach((el) => observer?.observe(el));
    revealVisibleElements();
    const animationFrame = window.requestAnimationFrame(revealVisibleElements);

    window.addEventListener('scroll', revealVisibleElements, { passive: true });
    window.addEventListener('resize', revealVisibleElements);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('scroll', revealVisibleElements);
      window.removeEventListener('resize', revealVisibleElements);
      observer?.disconnect();
    };
  }, []);

  const handleCubeClick = () => {
    setActiveStep((prev) => (prev + 1) % 10);
    startAutoRotation();
  };

  const handleDotClick = (idx: number) => {
    setActiveStep(idx);
    startAutoRotation();
  };

  const triggerScroll = (elementRef: React.RefObject<HTMLDivElement | null>) => {
    if (elementRef.current) {
      elementRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Get rotation degrees for the 3D dice based on current active face
  const getDiceRotation = () => {
    const face = pipelineSteps[activeStep].face;
    switch(face) {
      case 1: return 'rotateX(0deg) rotateY(0deg)';
      case 2: return 'rotateX(0deg) rotateY(180deg)';
      case 3: return 'rotateX(0deg) rotateY(-90deg)';
      case 4: return 'rotateX(0deg) rotateY(90deg)';
      case 5: return 'rotateX(-90deg) rotateY(0deg)';
      case 6: return 'rotateX(90deg) rotateY(0deg)';
      default: return 'rotateX(0deg) rotateY(0deg)';
    }
  };

  return (
    <div className="landing-shell">
      {/* 1. STICKY NAVIGATION BAR */}
      <header className="nav-header">
        <div className="brand-wrapper" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img src={edupulseLogo} alt="EduPulse AI Logo" className="brand-logo-img" />
          <span>EduPulse AI</span>
        </div>

        <nav className="nav-links">
          <span className="nav-item" onClick={() => triggerScroll(productRef)}>Product</span>
          <span className="nav-item" onClick={() => triggerScroll(pipelineRef)}>Pipeline</span>
          <span className="nav-item" onClick={() => triggerScroll(teamRef)}>Team</span>
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            Get Started
          </button>
        </nav>
      </header>

      {/* 2. HERO SECTION (Black Hole Animation with Logo) */}
      <section className="hero-panel">
        {/* Black Hole stage */}
        <div className="flow-stage reveal-on-scroll">
          {/* Floating decorative high-tech symbols */}
          <div className="floating-tech-icon fti-1"><Sparkles size={18} /></div>
          <div className="floating-tech-icon fti-2"><Activity size={18} /></div>
          <div className="floating-tech-icon fti-3"><Gauge size={18} /></div>
          <div className="floating-tech-icon fti-4"><ShieldCheck size={18} /></div>

          {/* Vortex accretion glow & rotation */}
          <div className="accretion-disk" />
          <div className="vortex-container">
            <div className="vortex-spiral" />
            <div className="vortex-spiral-2" />
            <div className="vortex-spiral-3" />
          </div>

          {/* Central Logo Black Hole (VERY BIG) */}
          <div className="blackhole-logo-wrapper" onClick={() => setModalOpen(true)}>
            <img src={edupulseLogo} alt="EduPulse AI Logo" />
          </div>

          {/* Feedback chips swirling (10 chips) */}
          <div className="blackhole-chip bh-path-1">“Wi-Fi not working in library”</div>
          <div className="blackhole-chip bh-path-2">“Mess food quality is poor”</div>
          <div className="blackhole-chip bh-path-3">“Ragging concern in hostel”</div>
          <div className="blackhole-chip bh-path-4">“Water contamination in block B”</div>
          <div className="blackhole-chip bh-path-5">“Random useless spam text”</div>
          <div className="blackhole-chip bh-path-6">“Projector issue in LH 203”</div>
          <div className="blackhole-chip bh-path-7">“Faculty absent in ECE block”</div>
          <div className="blackhole-chip bh-path-8">“Transport delay on Route 4”</div>
          <div className="blackhole-chip bh-path-9">“Library books unavailable”</div>
          <div className="blackhole-chip bh-path-10">“Harassment report in building 2”</div>
        </div>

        <div className="hero-info reveal-on-scroll">
          <h1>Transform Campus Feedback Into Actionable Institutional Intelligence</h1>
          <p>
            EduPulse AI turns raw student feedback into verified insights, urgent alerts, structured issue clusters, and admin-ready action reports.
          </p>
          
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => setModalOpen(true)}>
              Get Started
            </button>
            <button className="btn-secondary" onClick={() => triggerScroll(pipelineRef)}>
              View AI Pipeline
            </button>
          </div>

          <div className="hero-trust-strip">
            <div className="trust-item">
              <CheckCircle2 size={16} /> Quality-filtered feedback
            </div>
            <div className="trust-item">
              <CheckCircle2 size={16} /> Urgent concern detection
            </div>
            <div className="trust-item">
              <CheckCircle2 size={16} /> Admin-ready reports
            </div>
          </div>
        </div>
      </section>

      {/* 3. STORYTELLING SECTION (FUTURISTIC HUD LIFE-CYCLE - NO CARDS) */}
      <section ref={productRef} className="story-wrapper">
        <div className="story-container">
          <div className="story-header reveal-on-scroll">
            <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={24} style={{ marginRight: '12px', color: 'var(--bright-blue)' }} />
              Campus Feedback Lifecycle
            </h2>
            <p>See how raw student reviews translate into solid, non-spammed reports for executive decision-makers.</p>
          </div>

          {/* Futuristic HUD interface */}
          <div className="hud-lifecycle-grid reveal-on-scroll">
            
            {/* Left side list of steps (borderless, bracketed lines) */}
            <div className="hud-step-stack">
              {lifecycleSteps.map((item, idx) => (
                <div 
                  key={idx}
                  className={`hud-step-item ${hudStep === idx ? 'is-selected-step' : ''}`}
                  onMouseEnter={() => setHudStep(idx)}
                  onClick={() => setHudStep(idx)}
                >
                  <div className="hud-step-meta">
                    <span className="hud-step-tech-bracket">[</span>
                    <span className="hud-step-meta-icon-inline" style={{ display: 'inline-flex', alignItems: 'center', marginRight: '6px', color: hudStep === idx ? 'var(--bright-blue)' : '#64748b' }}>
                      {getLifecycleIcon(item.iconName, 13)}
                    </span>
                    <span>STAGE {item.step}</span>
                    <span className="hud-step-tech-bracket">]</span>
                  </div>
                  <h3>{item.title}</h3>
                </div>
              ))}
            </div>

            {/* Right side: Circular Radar Scope display */}
            <div className="hud-radar-display">
              {/* Corner crosshairs */}
              <span className="hud-radar-crosshair ch-top-left">┌</span>
              <span className="hud-radar-crosshair ch-top-right">┐</span>
              <span className="hud-radar-crosshair ch-bottom-left">└</span>
              <span className="hud-radar-crosshair ch-bottom-right">┘</span>

              {/* Spinning radar lines */}
              <div className="hud-radar-scope">
                <div className="hud-radar-ring-1" />
                <div className="hud-radar-ring-2" />
                <div className="hud-radar-sweep" />
                <div className="hud-radar-center-icon">
                  {getLifecycleIcon(lifecycleSteps[hudStep].iconName, 72)}
                </div>
              </div>

              {/* Tech details of the hovered step */}
              <div className="hud-active-step-details">
                <h4>{lifecycleSteps[hudStep].title}</h4>
                <p>{lifecycleSteps[hudStep].detail}</p>
                
                <div className="hud-tech-feed">
                  <span>COORD: {lifecycleSteps[hudStep].coord}</span>
                  <span>STATUS: {lifecycleSteps[hudStep].status}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. TEAM SECTION */}
      <section ref={teamRef} className="team-container">
        <div className="team-heading-block reveal-on-scroll">
          <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} style={{ marginRight: '12px', color: 'var(--cyan-accent)' }} />
            Built by the EduPulse AI Team
          </h2>
          <p>A focused engineering team combining frontend, backend, AI, and database development to build an admin-ready campus intelligence system.</p>
        </div>

        <div className="team-grid reveal-on-scroll">
          <div className="team-member-card">
            <div className="avatar-initials">HG</div>
            <h3>Harshit Gourlariya</h3>
            <div className="member-role">Team Lead & Backend Developer</div>
            <div className="member-edu">4th Year B.Tech ECE, G.L. Bajaj</div>
            <p className="member-desc">Led the team and worked on backend architecture, server-side logic, and system integration.</p>
          </div>

          <div className="team-member-card">
            <div className="avatar-initials">GS</div>
            <h3>Gaurav Sharma</h3>
            <div className="member-role">AI & Database Developer</div>
            <div className="member-edu">4th Year B.Tech ECE, G.L. Bajaj</div>
            <p className="member-desc">Worked on AI development, feedback intelligence, and parts of the database system.</p>
          </div>

          <div className="team-member-card">
            <div className="avatar-initials">NJ</div>
            <h3>Nishant Jangra</h3>
            <div className="member-role">Frontend Developer</div>
            <div className="member-edu">4th Year B.Tech ECE, G.L. Bajaj</div>
            <p className="member-desc">Designed and developed the frontend interface and user-facing experience.</p>
          </div>

          <div className="team-member-card">
            <div className="avatar-initials">DR</div>
            <h3>DevPratap Rai</h3>
            <div className="member-role">AI Integration Developer</div>
            <div className="member-edu">4th Year B.Tech ECE, G.L. Bajaj</div>
            <p className="member-desc">Worked on AI development support and integration of intelligent analysis features.</p>
          </div>

          <div className="team-member-card">
            <div className="avatar-initials">DT</div>
            <h3>Deepesh Tiwari</h3>
            <div className="member-role">Backend Developer</div>
            <div className="member-edu">4th Year B.Tech ECE, G.L. Bajaj</div>
            <p className="member-desc">Worked on backend development, data handling, and server-side implementation.</p>
          </div>
        </div>
      </section>

      {/* 5. AI PIPELINE ANIMATION SECTION (3D Rotating Dice - Clickable & Auto-rolling) */}
      <section ref={pipelineRef} className="pipeline-section">
        <div className="pipeline-wrapper">
          <div className="team-heading-block reveal-on-scroll">
          <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Gauge size={24} style={{ marginRight: '12px', color: 'var(--fresh-green)' }} />
            The Intelligent Pipeline
          </h2>
          <p>How student inputs flow through clean-ups and semantic math to build executive insights.</p>
        </div>

        <div className="pipeline-grid-layout reveal-on-scroll">
            {/* 3D Dice - Clicking advances steps */}
            <div className="dice-stage">
              <div 
                className="pipeline-cube" 
                style={{ transform: getDiceRotation() }}
                onClick={handleCubeClick}
              >
                {/* Face 1: Front */}
                <div className={`cube-face face-front ${pipelineSteps[activeStep].face === 1 ? 'is-active-face' : ''}`}>
                  <div className="cube-face-icon" style={{ background: 'rgba(59, 130, 246, 0.08)', color: 'var(--bright-blue)' }}>
                    <Sparkles size={28} />
                  </div>
                  <h5>Ingestion</h5>
                  <p>Step 01: Raw feedback collection</p>
                </div>

                {/* Face 2: Back */}
                <div className={`cube-face face-back ${pipelineSteps[activeStep].face === 2 ? 'is-active-face' : ''}`}>
                  <div className="cube-face-icon" style={{ background: 'rgba(236, 72, 153, 0.08)', color: 'var(--glow-pink)' }}>
                    <Filter size={28} />
                  </div>
                  <h5>Cleansing</h5>
                  <p>Steps 02-03: Filtering & spam deduplication</p>
                </div>

                {/* Face 3: Right */}
                <div className={`cube-face face-right ${pipelineSteps[activeStep].face === 3 ? 'is-active-face' : ''}`}>
                  <div className="cube-face-icon" style={{ background: 'rgba(6, 182, 212, 0.08)', color: 'var(--cyan-accent)' }}>
                    <Activity size={28} />
                  </div>
                  <h5>Analysis</h5>
                  <p>Steps 04-05: Sentiment & Category classification</p>
                </div>

                {/* Face 4: Left */}
                <div className={`cube-face face-left ${pipelineSteps[activeStep].face === 4 ? 'is-active-face' : ''}`}>
                  <div className="cube-face-icon" style={{ background: 'rgba(245, 158, 11, 0.08)', color: 'var(--alert-yellow)' }}>
                    <AlertOctagon size={28} />
                  </div>
                  <h5>Risk Scan</h5>
                  <p>Step 06: Urgent issues segregation</p>
                </div>

                {/* Face 5: Top */}
                <div className={`cube-face face-top ${pipelineSteps[activeStep].face === 5 ? 'is-active-face' : ''}`}>
                  <div className="cube-face-icon" style={{ background: 'rgba(16, 185, 129, 0.08)', color: 'var(--fresh-green)' }}>
                    <FolderTree size={28} />
                  </div>
                  <h5>Clustering</h5>
                  <p>Steps 07-08: Normal issues clustering & priority math</p>
                </div>

                {/* Face 6: Bottom */}
                <div className={`cube-face face-bottom ${pipelineSteps[activeStep].face === 6 ? 'is-active-face' : ''}`}>
                  <div className="cube-face-icon" style={{ background: 'rgba(30, 64, 175, 0.08)', color: 'var(--electric-blue)' }}>
                    <Gauge size={28} />
                  </div>
                  <h5>Reporting</h5>
                  <p>Steps 09-10: Gemini narratives & admin dashboards</p>
                </div>
              </div>
            </div>

            {/* Description panel */}
            <div className="pipeline-desc-panel">
              <div className="pipeline-step-card glow-card">
                <div className="pipeline-header-block">
                  <h3>
                    <span style={{ marginRight: '12px', color: 'var(--bright-blue)', verticalAlign: 'middle', display: 'inline-flex' }}>
                      {pipelineSteps[activeStep].icon}
                    </span>
                    {pipelineSteps[activeStep].title}
                  </h3>
                  <span className="pipeline-step-indicator">Step {pipelineSteps[activeStep].num} / 10</span>
                </div>
                <p className="step-details">
                  {pipelineSteps[activeStep].detail}
                </p>
              </div>

              {/* Step indicator dots */}
              <div className="pipeline-dots-progress">
                {pipelineSteps.map((_, idx) => (
                  <span 
                    key={idx} 
                    className={`progress-dot ${activeStep === idx ? 'active' : ''}`}
                    onClick={() => handleDotClick(idx)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SAAS BUSINESS VALUE SECTION */}
      <section className="business-value-wrapper">
        <div className="business-heading-center reveal-on-scroll">
          <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={24} style={{ marginRight: '12px', color: 'var(--glow-pink)' }} />
            Enterprise Value for Institutions
          </h2>
          <p>EduPulse AI is designed as a secure, scalable SaaS tool to minimize administrative effort and accelerate resolution times.</p>
        </div>

        <div className="value-cards-layout reveal-on-scroll">
          <div className="value-panel-box">
            <div className="value-icon-box">
              <Users size={20} />
            </div>
            <h3>Faster issue visibility</h3>
            <p>Spot critical and repeating issues immediately, bypassing days of manual reading.</p>
          </div>

          <div className="value-panel-box">
            <div className="value-icon-box">
              <Layers size={20} />
            </div>
            <h3>Admin-ready intelligence</h3>
            <p>View consolidated analytics categorized by branch, semester, priority, and severity.</p>
          </div>

          <div className="value-panel-box">
            <div className="value-icon-box">
              <FileText size={20} />
            </div>
            <h3>Structured reports</h3>
            <p>Download comprehensive PDF reports built directly from analyzed student inputs.</p>
          </div>

          <div className="value-panel-box">
            <div className="value-icon-box">
              <Lock size={20} />
            </div>
            <h3>Scalable SaaS model</h3>
            <p>Deploy a tenant-separated architecture perfect for colleges and multi-campus universities.</p>
          </div>
        </div>
      </section>

      {/* 7. FINAL PROJECT EXPLANATION + CTA */}
      <section className="final-cta-wrapper">
        <div className="final-cta-card reveal-on-scroll">
          <p className="cta-paragraph">
            EduPulse AI is an intelligent campus feedback analysis system designed to help institutions understand student concerns with clarity, speed, and accountability. It combines structured feedback collection, quality filtering, duplicate detection, issue classification, priority scoring, AI-assisted reporting, and admin-focused dashboards to turn scattered feedback into meaningful institutional action.
          </p>

          <div className="cta-buttons-block">
            <button className="btn-primary" onClick={() => setModalOpen(true)}>
              Get Started <ArrowRight size={16} style={{ marginLeft: '4px' }} />
            </button>
            <button className="btn-secondary" onClick={() => triggerScroll(pipelineRef)}>
              Explore Pipeline
            </button>
          </div>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="footer-strip">
        <div className="footer-content">
          <h4>EduPulse AI</h4>
          <p>Campus Feedback Intelligence</p>
          <p>Built for institutional action &bull; &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>

      {/* UNIFIED ROLE SELECTION MODAL */}
      {modalOpen && (
        <div className="role-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="role-modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="role-modal-close" onClick={() => setModalOpen(false)}>
              <X size={20} />
            </button>
            <h2>Select your role</h2>
            <p className="role-modal-desc">Select your role to access the EduPulse AI portals.</p>

            <div className="role-options-stack">
              <button 
                className="role-option-button" 
                onClick={() => {
                  setModalOpen(false);
                  onChooseRole('STUDENT');
                }}
              >
                <div className="role-option-icon">
                  <GraduationCap size={22} />
                </div>
                <div className="role-option-text">
                  <span className="role-option-title">Student Portal</span>
                  <span className="role-option-hint">Submit structured semester feedback</span>
                </div>
                <ChevronRight size={18} style={{ marginLeft: 'auto', opacity: 0.5 }} />
              </button>

              <button 
                className="role-option-button" 
                onClick={() => {
                  setModalOpen(false);
                  onChooseRole('ADMIN');
                }}
              >
                <div className="role-option-icon">
                  <ShieldCheck size={22} />
                </div>
                <div className="role-option-text">
                  <span className="role-option-title">Institution Admin</span>
                  <span className="role-option-hint">Review reports, view analytics, and take action</span>
                </div>
                <ChevronRight size={18} style={{ marginLeft: 'auto', opacity: 0.5 }} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
