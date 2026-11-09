import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContextStore';
import api from '../../services/api';
import heroImg from '../../assets/Student_LandingPage.png';
import ThemeSwitch from '../../components/shared/ThemeSwitch';
import useSiteTheme from '../../hooks/useSiteTheme';

import imgLearningPath from '../../assets/Personalized_Learning_Path.png';
import imgFeedback     from '../../assets/Instant_Feedback_System.png';
import imgAnalytics    from '../../assets/Predictive_Analytics.png';
import imgChatbot      from '../../assets/AI_Chatbot_Assistant.png';
import imgLMS          from '../../assets/Complete_LMS_Tools.png';

import RouteIcon             from '@mui/icons-material/Route';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import BarChartIcon          from '@mui/icons-material/BarChart';
import SmartToyIcon          from '@mui/icons-material/SmartToy';
import SchoolIcon            from '@mui/icons-material/School';
import EmailOutlinedIcon     from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon      from '@mui/icons-material/LockOutlined';
import PersonOutlinedIcon    from '@mui/icons-material/PersonOutlined';
import VisibilityOutlinedIcon    from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const features = [
  { img: imgLearningPath, icon: <RouteIcon sx={{ fontSize:22, color:'#fff' }} />, title: 'Personalized Learning Path', desc: 'The system analyzes your quiz results and automatically recommends materials to help you improve on weak areas.' },
  { img: imgFeedback,     icon: <ChatBubbleOutlineIcon sx={{ fontSize:22, color:'#fff' }} />, title: 'Instant Feedback System', desc: 'Quizzes and essays are checked automatically using AI, giving immediate feedback to guide your learning.' },
  { img: imgAnalytics,    icon: <BarChartIcon sx={{ fontSize:22, color:'#fff' }} />, title: 'Predictive Analytics', desc: 'The system detects students at risk based on performance and activity, helping instructors take early action.' },
  { img: imgChatbot,      icon: <SmartToyIcon sx={{ fontSize:22, color:'#fff' }} />, title: 'AI Chatbot Assistant', desc: 'Ask questions anytime. The AI chatbot provides answers based on course content even outside class hours.' },
  { img: imgLMS,          icon: <SchoolIcon sx={{ fontSize:22, color:'#fff' }} />, title: 'Complete LMS Tools', desc: 'Everything in one platform. (Course management, Assignments & quizzes, Progress tracking, Announcements)' },
];

export default function LoginPage() {
  const { login, completeAdminLogin, register } = useAuth();
  const [darkMode, toggleTheme] = useSiteTheme();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [authMode, setAuthMode]       = useState('login');
  const [loginForm, setLoginForm]     = useState({ email:'', password:'' });
  const [loginError, setLoginError]   = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [adminChallenge, setAdminChallenge] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const adminCodeInputs = useRef([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPw, setShowRegPw]       = useState(false);
  const [regForm, setRegForm]   = useState({ first_name:'', last_name:'', email:'', password:'', password_confirmation:'' });
  const [regErrors, setRegErrors]   = useState({});
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [regEmail, setRegEmail] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (adminChallenge) adminCodeInputs.current[0]?.focus();
  }, [adminChallenge]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.focus();
    const onScroll = () => setActiveSlide(Math.round(el.scrollTop / el.clientHeight));
    el.addEventListener('scroll', onScroll, { passive:true });
    const onWheel = (e) => {
      const featuresSlide = e.target instanceof Element ? e.target.closest('.ll-features-slide') : null;
      if (featuresSlide && featuresSlide.scrollHeight > featuresSlide.clientHeight) {
        const canScroll = e.deltaY > 0
          ? featuresSlide.scrollTop + featuresSlide.clientHeight < featuresSlide.scrollHeight - 1
          : featuresSlide.scrollTop > 1;
        if (canScroll) {
          e.preventDefault();
          featuresSlide.scrollBy({ top: e.deltaY, behavior: 'auto' });
          return;
        }
      }
      e.preventDefault();
      el.scrollBy({ top:e.deltaY, behavior:'auto' });
    };
    document.addEventListener('wheel', onWheel, { passive:false });
    return () => { el.removeEventListener('scroll', onScroll); document.removeEventListener('wheel', onWheel); };
  }, []);

  const scrollTo = (idx) => {
    if (idx === 1) containerRef.current?.querySelector('.ll-features-slide')?.scrollTo({ top: 0 });
    containerRef.current?.scrollTo({ top: idx * containerRef.current.clientHeight, behavior:'smooth' });
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setLoginError(''); setLoginLoading(true);
    try {
      const result = await login(loginForm.email, loginForm.password);
      if (result?.requires_two_factor) {
        setAdminChallenge(result.challenge_token);
        setLoginError('A six-digit code was sent to your admin email.');
        return;
      }
      // Check if backend returned requires_verification (403 case)
      if (result?.requires_verification) {
        setUnverifiedEmail(result.email);
        return;
      }
      if (result.role==='admin') navigate('/admin');
      else if (result.role==='instructor') navigate('/instructor');
      else navigate('/student');
    } catch (err) {
      const data = err.response?.data;
      if (data?.requires_verification) {
        setUnverifiedEmail(data.email);
      } else {
        setLoginError(data?.message || 'Login failed.');
      }
    }
    finally { setLoginLoading(false); }
  };

  const handleAdminCode = async (e) => {
    e.preventDefault(); setLoginError(''); setLoginLoading(true);
    try {
      const user = await completeAdminLogin(adminChallenge, adminCode);
      if (user.role === 'admin') navigate('/admin');
      else setLoginError('This account is not an administrator.');
    } catch (err) {
      setLoginError(err.response?.data?.message || 'Could not verify the code.');
    } finally { setLoginLoading(false); }
  };

  const updateAdminCode = (startIndex, rawValue) => {
    const digits = rawValue.replace(/\D/g, '');
    if (!digits) {
      setAdminCode(code => code.length > startIndex
        ? code.slice(0, startIndex) + code.slice(startIndex + 1)
        : code);
      return;
    }

    const effectiveIndex = Math.min(startIndex, adminCode.length);
    setAdminCode(currentCode => {
      const index = Math.min(startIndex, currentCode.length);
      return (currentCode.slice(0, index) + digits.slice(0, 6 - index) + currentCode.slice(index + 1)).slice(0, 6);
    });
    const focusIndex = Math.min(effectiveIndex + digits.length, 5);
    adminCodeInputs.current[focusIndex]?.focus();
  };

  const handleAdminCodePaste = (event, startIndex = 0) => {
    const digits = event.clipboardData.getData('text').replace(/\D/g, '');
    if (!digits) return;
    event.preventDefault();
    event.stopPropagation();
    updateAdminCode(startIndex, digits);
  };

  const handleAdminCodeKeyDown = (event, index) => {
    if (event.key === 'Backspace' && !adminCode[index] && index > 0) {
      adminCodeInputs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      adminCodeInputs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < 5) {
      event.preventDefault();
      adminCodeInputs.current[index + 1]?.focus();
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setRegErrors({}); setRegLoading(true);
    try {
      const res = await register(regForm);
      if (res.requires_verification) {
        setRegEmail(regForm.email);
        setRegSuccess(true);
        return;
      }
      navigate('/student');
    } catch (err) {
      if (err.response?.data?.errors) setRegErrors(err.response.data.errors);
      else setRegErrors({ general:[err.response?.data?.message || 'Registration failed.'] });
    } finally { setRegLoading(false); }
  };

  const handleResendVerification = async () => {
    setResendLoading(true); setResendSent(false);
    try {
      await api.post('/email/resend');
      setResendSent(true);
    } catch {
      // silently fail
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      // Call backend to get Google OAuth URL
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/google/redirect`);
      const data = await response.json();
      
      if (data.url) {
        // Redirect user to Google OAuth
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Google login failed:', err);
      setLoginError('Failed to initiate Google login. Please try again.');
    }
  };

  return (
    <div className="ll-page" style={{ width:'100vw', height:'100vh', overflow:'hidden', fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif" }}>
      <style>{`
        :root {
          --navy: #0B2A6F;
          --blue-600: #2563EB;
          --blue-500: #3B82F6;
          --blue-100: #E6F0FF;
          --page-bg: #EAF3FF;
          --muted: #4A6FA5;
          --violet-end: #5B5BE6;
        }
        .ll-page{
          --ambient-feature-a:rgba(59,130,246,.11);
          --ambient-feature-b:rgba(91,151,232,.09);
          --ambient-form:rgba(78,139,231,.10);
          --auth-blob-one:rgba(191,219,254,.55);
          --auth-blob-two:rgba(219,234,254,.6);
          --auth-blob-three:rgba(147,197,253,.35);
          --auth-blob-four:rgba(147,197,253,.4);
        }

        /* ── scrollbar hide ── */
        .ll-scroll::-webkit-scrollbar{display:none}
        .ll-scroll{-ms-overflow-style:none;scrollbar-width:none}
        .ll-slide{scroll-snap-align:start;min-height:100vh;width:100vw}

        /* ── navbar ── */
        .nav-link{background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;color:#334155;padding:0 18px;letter-spacing:.04em;font-family:'Plus Jakarta Sans',sans-serif;transition:color .15s;position:relative;line-height:1;text-transform:uppercase}
        .nav-link:hover{color:var(--blue-600)}
        .nav-link.active{color:var(--blue-600)}
        .nav-link.active::after{content:'';position:absolute;bottom:-21px;left:18px;right:18px;height:2.5px;background:var(--blue-600);border-radius:2px}

        /* ── hero card ── */
        .hero-card{
          background:linear-gradient(135deg,#1a3ab0 0%,#2152d0 30%,#2e6ee6 65%,#4a90f5 100%);
          border-radius:28px;overflow:hidden;position:relative;flex:1;display:flex;align-items:center;
        }

        /* ── feature cards ── */
        .feat-card{
          background:#fff;border-radius:24px;border:1px solid #dbeafe;
          display:flex;flex-direction:column;overflow:visible;
          transition:transform .25s ease,box-shadow .25s ease;
          box-shadow:0 4px 16px rgba(37,99,235,.08);
          width:0;flex:1;
        }
        .feat-card:hover{transform:translateY(-6px);box-shadow:0 12px 30px rgba(37,99,235,.18)}
        .ll-features-header{display:flex;align-items:flex-start;justify-content:space-between;gap:32px;padding:40px 48px 24px}
        .ll-features-header,.ll-features-slide .feat-grid,.ll-journey{flex-shrink:0}
        .ll-features-header,.ll-features-slide .feat-grid,.ll-journey{position:relative;z-index:1}
        .ll-ambient-orb{position:absolute;z-index:0;pointer-events:none;border-radius:50%;will-change:transform}
        .ll-ambient-orb--feature-a{top:72px;right:24px;width:clamp(240px,30vw,440px);aspect-ratio:1;background:radial-gradient(circle,var(--ambient-feature-a) 0%,transparent 70%);animation:llAmbientDrift 24s ease-in-out infinite alternate}
        .ll-ambient-orb--feature-b{bottom:28px;left:24px;width:clamp(260px,35vw,520px);aspect-ratio:1;background:radial-gradient(circle,var(--ambient-feature-b) 0%,transparent 72%);animation:llAmbientDrift 31s ease-in-out infinite alternate-reverse}
        .ll-ambient-orb--form{bottom:-170px;left:-180px;width:480px;height:480px;background:radial-gradient(circle,var(--ambient-form) 0%,transparent 72%);animation:llAmbientDrift 28s ease-in-out infinite alternate-reverse}
        .ll-auth-blob{will-change:transform;animation:llAmbientDrift 26s ease-in-out infinite alternate}
        .ll-auth-blob--two{animation-duration:32s;animation-direction:alternate-reverse}
        .ll-auth-blob--three{animation-duration:29s}
        .ll-auth-blob--four{animation-duration:22s;animation-direction:alternate-reverse}
        @keyframes llAmbientDrift{from{transform:translate3d(-14px,10px,0)}to{transform:translate3d(18px,-14px,0)}}
        @media(prefers-reduced-motion:reduce){.ll-ambient-orb,.ll-auth-blob{animation:none;will-change:auto}}
        .ll-features-title{font-size:clamp(38px,3.4vw,64px);font-weight:800;color:var(--navy);line-height:1.1;margin:0;letter-spacing:-.03em}
        .ll-features-intro{flex:0 0 320px;font-size:17px;color:var(--muted);line-height:1.75;margin:0;text-align:right;padding-top:16px;font-family:'DM Sans',sans-serif}
        .ll-journey{margin:auto 48px;padding:20px 0 32px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;text-align:center}
        .ll-journey-title{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:clamp(14px,2.2vw,38px);font:italic 700 clamp(34px,3.6vw,66px)/1.2 'Poppins',sans-serif;letter-spacing:-.035em;color:var(--navy);margin:0}
        .ll-journey-separator{display:block;flex:0 0 clamp(12px,1.1vw,19px);width:clamp(12px,1.1vw,19px);height:clamp(12px,1.1vw,19px);border:2px solid var(--blue-600);border-radius:50%}
        .ll-journey-cta{border:0;border-bottom:2px solid var(--blue-600);background:transparent;color:var(--navy);padding:9px 2px;font:700 15px 'Plus Jakarta Sans',sans-serif;letter-spacing:.08em;cursor:pointer;transition:color .15s,transform .15s}
        .ll-journey-cta:hover{color:var(--blue-600);transform:translateY(-2px)}
        .ll-journey-cta:focus-visible{outline:3px solid #7ba7ff;outline-offset:3px}

        /* ── inputs ── */
        .ll-wrap{display:flex;align-items:center;border:1.5px solid #C9DBF5;border-radius:16px;background:#F5F9FF;overflow:hidden;transition:border-color .2s,box-shadow .2s;height:58px}
        .ll-wrap:focus-within{border-color:var(--blue-600);box-shadow:0 0 0 3px rgba(37,99,235,.15);background:#fff}
        .ll-inp{flex:1;padding:0 10px 0 0;border:none;background:transparent;font-size:14px;color:#0f172a;outline:none;font-family:'DM Sans',sans-serif;height:100%}
        .ll-inp::placeholder{color:#94a3b8}
        .ll-otp-digit{width:100%;height:52px;box-sizing:border-box;border:1px solid #D1D5DB;border-radius:5px;background:#fff;color:#0f172a;text-align:center;font:600 20px 'DM Sans',sans-serif;outline:none;transition:border-color .15s,box-shadow .15s}
        .ll-otp-digit:focus{border-color:#6D63F5;box-shadow:0 0 0 2px rgba(109,99,245,.18)}
        .ll-otp-digit:disabled{background:#F1F5F9;color:#64748b;cursor:not-allowed}

        /* ── login button ── */
        .ll-btn{width:100%;background:linear-gradient(90deg,#2F7BFF 0%,var(--violet-end) 100%);color:#fff;border:none;border-radius:999px;padding:16px;font-size:15px;font-weight:700;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 6px 24px rgba(37,99,235,.35);transition:opacity .2s,transform .15s,box-shadow .2s}
        .ll-btn:hover:not(:disabled){opacity:.93;transform:translateY(-2px);box-shadow:0 10px 28px rgba(37,99,235,.45)}
        .ll-btn:disabled{opacity:.65;cursor:not-allowed}

        /* ── dot nav ── */
        .ll-dot{border:none;cursor:pointer;padding:0;transition:all .25s}
        .ll-dot:hover{transform:scale(1.3)}

        /* ── animations ── */
        .ll-up{animation:llUp .55s cubic-bezier(.22,1,.36,1) both}
        .ll-d1{animation-delay:.07s}.ll-d2{animation-delay:.14s}
        @keyframes llUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes floatImg{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        .ll-float{animation:floatImg 6s ease-in-out infinite}

        /* ── feature section responsive ── */
        @media(max-width:1200px){
          .ll-features-header{padding:32px 32px 20px}
          .feat-grid{padding-left:32px!important;padding-right:32px!important}
          .ll-journey{margin-left:32px;margin-right:32px}
        }
        @media(max-width:1024px){
          .ll-features-header{flex-direction:column;gap:8px}
          .ll-features-intro{flex:initial;text-align:left;padding-top:0;max-width:650px}
          .feat-grid{flex-wrap:wrap!important}
          .feat-card{flex:0 0 calc(50% - 10px)!important;width:calc(50% - 10px)!important}
        }
        @media(max-width:640px){
          .ll-features-header{padding:26px 20px 18px}
          .ll-features-intro{font-size:15px}
          .feat-grid{padding-left:20px!important;padding-right:20px!important}
          .feat-card{flex:0 0 100%!important;width:100%!important}
          .ll-journey{margin:16px 20px 28px;padding:20px 0}
          .ll-journey-title{font-size:clamp(20px,5vw,28px);gap:8px}
          .ll-journey-separator{flex-basis:10px;width:10px;height:10px}
        }
      `}</style>

      {/* ══ NAVBAR ══ */}
      <nav className="ll-navbar" style={{
        position:'fixed',top:0,left:0,right:0,zIndex:300,height:64,
        background:'#EEF4FF',
        borderBottom:'1px solid rgba(180,210,255,.4)',boxShadow:'0 2px 12px rgba(37,99,235,.08)',
        display:'flex',alignItems:'center',padding:'0 40px',boxSizing:'border-box'
      }}>
        <div style={{ marginRight:'auto',display:'flex',alignItems:'center',gap:10,cursor:'pointer' }} onClick={()=>scrollTo(0)}>
          <span className="landing-logo-tile" aria-hidden="true" />
          <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:18, color:'#1e1b4b', letterSpacing:'.04em' }}>INTELLILEARN</span>
        </div>
        <ThemeSwitch darkMode={darkMode} onToggle={toggleTheme} />
        <button className="nav-link active" onClick={()=>scrollTo(0)}>HOME</button>
        <button className="nav-link" onClick={()=>scrollTo(1)}>BLOGS</button>
        <button className="nav-link">ABOUT US</button>
        <button className="nav-link">ONBOARDING</button>
        <button onClick={()=>{ scrollTo(2); setAuthMode('signup'); }} style={{
          background:'linear-gradient(135deg,#3B82F6 0%,#5B6CF0 100%)',
          color:'white',border:'none',borderRadius:999,padding:'11px 28px',
          marginLeft:20,fontSize:13,fontWeight:700,cursor:'pointer',
          fontFamily:"'Plus Jakarta Sans',sans-serif",letterSpacing:'.04em',
          boxShadow:'0 8px 20px rgba(59,130,246,.35)',transition:'all .2s'
        }}>SIGN UP</button>
      </nav>

      {/* ══ DOT NAV ══ */}
      <div style={{ position:'fixed',right:14,top:'50%',transform:'translateY(-50%)',zIndex:400,display:'flex',flexDirection:'column',gap:9 }}>
        {[0,1,2].map(i=>(
          <button key={i} onClick={()=>scrollTo(i)} className="ll-dot" style={{ width:9,height:9,borderRadius:'50%',background:activeSlide===i?'#2563EB':'rgba(37,99,235,.25)',border:'none' }} />
        ))}
      </div>

      {/* ══ SCROLL CONTAINER ══ */}
      <div ref={containerRef} className="ll-scroll" tabIndex={0} style={{ width:'100vw',height:'100vh',overflowY:'scroll',overflowX:'hidden',scrollSnapType:'y mandatory',outline:'none' }}>

        {/* ════════════════════════════════
            (A) SLIDE 1 — HERO
        ════════════════════════════════ */}
        <div className="ll-slide ll-hero-slide" style={{ background:'#EAF1FF',display:'flex',flexDirection:'column',padding:'72px 28px 28px',boxSizing:'border-box' }}>
          <div style={{ flex:1,position:'relative',overflow:'hidden',borderRadius:30,background:'linear-gradient(135deg,#1E44A8 0%,#2758CC 35%,#3D6EE0 65%,#5B7BE8 100%)' }}>

            {/* ── soft glow blobs top area ── */}
            <div style={{ position:'absolute',top:-60,left:'25%',width:500,height:360,borderRadius:'50%',background:'radial-gradient(ellipse,rgba(120,170,255,.22) 0%,transparent 68%)',pointerEvents:'none',zIndex:1 }} />
            <div style={{ position:'absolute',top:-30,right:'5%',width:360,height:280,borderRadius:'50%',background:'radial-gradient(ellipse,rgba(160,200,255,.15) 0%,transparent 70%)',pointerEvents:'none',zIndex:1 }} />

            {/* ── large circle behind student ── */}
            <div style={{ position:'absolute',top:'50%',right:'13%',transform:'translateY(-50%)',width:420,height:420,borderRadius:'50%',background:'rgba(255,255,255,.11)',border:'1px solid rgba(255,255,255,.18)',pointerEvents:'none',zIndex:2 }} />
            {/* ── inner circle ring ── */}
            <div style={{ position:'absolute',top:'50%',right:'19%',transform:'translateY(-50%)',width:270,height:270,borderRadius:'50%',background:'rgba(255,255,255,.06)',pointerEvents:'none',zIndex:2 }} />

            {/* ── floating orbs — extra visual depth ── */}
            <div style={{ position:'absolute',top:'18%',right:'42%',width:18,height:18,borderRadius:'50%',background:'rgba(255,255,255,.25)',pointerEvents:'none',zIndex:3 }} />
            <div style={{ position:'absolute',top:'35%',right:'38%',width:10,height:10,borderRadius:'50%',background:'rgba(255,255,255,.18)',pointerEvents:'none',zIndex:3 }} />
            <div style={{ position:'absolute',bottom:'38%',right:'44%',width:14,height:14,borderRadius:'50%',background:'rgba(255,255,255,.2)',pointerEvents:'none',zIndex:3 }} />

            {/* ── dot grid top-left 4×2 ── */}
            {Array.from({length:8},(_,i)=>(
              <div key={'tl'+i} style={{ position:'absolute',left:30+(i%4)*20,top:26+Math.floor(i/4)*20,width:6,height:6,borderRadius:'50%',background:'rgba(140,195,255,.55)',pointerEvents:'none',zIndex:3 }} />
            ))}
            {/* ── dot grid bottom-left 3×3 ── */}
            {Array.from({length:9},(_,i)=>(
              <div key={'bl'+i} style={{ position:'absolute',left:30+(i%3)*20,bottom:26+Math.floor(i/3)*20,width:6,height:6,borderRadius:'50%',background:'rgba(140,195,255,.45)',pointerEvents:'none',zIndex:3 }} />
            ))}

            {/* ── speed lines near student head top-right ── */}
            <svg style={{ position:'absolute',top:32,right:190,pointerEvents:'none',zIndex:9,transform:'rotate(-22deg)' }} width="46" height="40" viewBox="0 0 46 40">
              <line x1="2"  y1="5"  x2="42" y2="5"  stroke="#93c5fd" strokeWidth="4.5" strokeLinecap="round"/>
              <line x1="8"  y1="18" x2="40" y2="18" stroke="#93c5fd" strokeWidth="4.5" strokeLinecap="round"/>
              <line x1="14" y1="31" x2="38" y2="31" stroke="#93c5fd" strokeWidth="4.5" strokeLinecap="round"/>
            </svg>

            {/* ── extra sparkle top-right corner ── */}
            <svg style={{ position:'absolute',top:20,right:60,pointerEvents:'none',zIndex:3,opacity:.4 }} width="20" height="20" viewBox="0 0 20 20">
              <path d="M10 0 L11.2 8.8 L20 10 L11.2 11.2 L10 20 L8.8 11.2 L0 10 L8.8 8.8 Z" fill="white"/>
            </svg>
            <svg style={{ position:'absolute',bottom:'35%',left:'38%',pointerEvents:'none',zIndex:3,opacity:.3 }} width="14" height="14" viewBox="0 0 14 14">
              <path d="M7 0 L7.8 6.2 L14 7 L7.8 7.8 L7 14 L6.2 7.8 L0 7 L6.2 6.2 Z" fill="white"/>
            </svg>

            {/* ── text block ── */}
            <div className={activeSlide===0?'ll-up':''} style={{ position:'relative',zIndex:10,padding:'80px 0 50px 58px',maxWidth:680 }}>
              {/* eyebrow */}
              <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:24 }}>
                <div style={{ width:32,height:2,background:'rgba(141,184,255,.8)',borderRadius:2 }} />
                <span style={{ fontSize:15,fontWeight:700,color:'#8DB8FF',letterSpacing:'4px',textTransform:'uppercase',fontFamily:"'Plus Jakarta Sans',sans-serif" }}>INTELLILEARN</span>
                <div style={{ width:32,height:2,background:'rgba(141,184,255,.8)',borderRadius:2 }} />
              </div>

              {/* headline — increased from 54px to 84px */}
              <h1 style={{ fontSize:84,fontWeight:800,lineHeight:1.05,margin:'0 0 28px',letterSpacing:'-2px',fontFamily:"'Plus Jakarta Sans',sans-serif",whiteSpace:'nowrap' }}>
                <span style={{ color:'white',display:'block' }}>
                  Learning That&nbsp;
                  <svg style={{ display:'inline-block',verticalAlign:'-8px' }} width="42" height="42" viewBox="0 0 26 26" fill="none">
                    <path d="M13 0 L14.6 11.4 L26 13 L14.6 14.6 L13 26 L11.4 14.6 L0 13 L11.4 11.4 Z" fill="#7FD0FF"/>
                  </svg>
                </span>
                <span style={{ display:'block',background:'linear-gradient(90deg,#7FD0FF 0%,#B8D8FF 50%,#DDE6FF 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>
                  Adapts to You.
                </span>
              </h1>

              <p style={{ fontSize:19,color:'rgba(255,255,255,.88)',lineHeight:1.65,maxWidth:560,marginBottom:42,fontFamily:"'DM Sans',sans-serif" }}>
                Traditional LMS platforms stop at content delivery. IntelliLearn goes further — using AI to personalize learning, provide instant feedback, and support students in real time.
              </p>

              {/* glassmorphism search bar — z:10, always above waves */}
              <div style={{ display:'flex',alignItems:'center',background:'rgba(255,255,255,.15)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,.38)',borderRadius:999,maxWidth:520,height:64,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,.15)',position:'relative',zIndex:10 }}>
                <div style={{ padding:'0 20px',display:'flex',alignItems:'center',flexShrink:0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <input type="text" placeholder="Search Courses" style={{ flex:1,border:'none',outline:'none',fontSize:16,color:'white',background:'transparent',height:'100%',fontFamily:"'Plus Jakarta Sans',sans-serif" }} />
                <div style={{ display:'flex',alignItems:'center',gap:8,borderLeft:'1px solid rgba(255,255,255,.3)',padding:'0 22px',height:'100%',fontSize:15,fontWeight:700,color:'white',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0 }}>
                  Courses <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
            </div>

            {/* ── student image — z:5, behind waves ── */}
            <div className={`${activeSlide===0?'ll-up ll-d1':''} ll-float`} style={{ position:'absolute',right:0,bottom:0,height:'100%',display:'flex',alignItems:'flex-end',zIndex:5,pointerEvents:'none' }}>
              <img src={heroImg} alt="Student" style={{ height:'96%',width:'auto',objectFit:'contain',objectPosition:'bottom right',display:'block' }} />
            </div>

            {/* ── WAVES — 3 layers tall, IN FRONT of student (z:6–8) ── */}
            <svg style={{ position:'absolute',bottom:0,left:0,width:'100%',pointerEvents:'none',zIndex:6 }} viewBox="0 0 1200 190" preserveAspectRatio="none" height="190">
              <path d="M0,85 C180,25 420,160 640,75 C840,5 1040,125 1200,65 L1200,190 L0,190 Z" fill="#2A50C8" opacity=".85"/>
            </svg>
            <svg style={{ position:'absolute',bottom:0,left:0,width:'100%',pointerEvents:'none',zIndex:7 }} viewBox="0 0 1200 145" preserveAspectRatio="none" height="145">
              <path d="M0,80 C220,30 460,132 700,68 C880,18 1080,100 1200,58 L1200,145 L0,145 Z" fill="#4F70DC" opacity=".75"/>
            </svg>
            <svg style={{ position:'absolute',bottom:0,left:0,width:'100%',pointerEvents:'none',zIndex:8 }} viewBox="0 0 1200 95" preserveAspectRatio="none" height="95">
              <path d="M0,55 C200,12 450,88 700,45 C880,12 1080,70 1200,40 L1200,95 L0,95 Z" fill="#8AAAF0" opacity=".7"/>
            </svg>
          </div>
        </div>

        {/* ════════════════════════════════
            (B) SLIDE 2 — FEATURES
        ════════════════════════════════ */}
        <div className="ll-slide ll-features-slide" style={{ background:'var(--page-bg)',display:'flex',flexDirection:'column',paddingTop:64,boxSizing:'border-box',position:'relative',height:'100vh',overflowY:'auto',overflowX:'hidden' }}>
          <div className="ll-ambient-orb ll-ambient-orb--feature-a" aria-hidden="true" />
          <div className="ll-ambient-orb ll-ambient-orb--feature-b" aria-hidden="true" />

          <div className="ll-features-header">
            <h1 className={`ll-features-title ${activeSlide===1?'ll-up':''}`}>
              Smart Features.<br />Real Impact.
            </h1>
            <p className={`ll-features-intro ${activeSlide===1?'ll-up ll-d1':''}`}>
              IntelliLearn integrates artificial intelligence to improve how students learn and how instructors teach.
            </p>
          </div>

          {/* cards row — fixed height, aligned */}
          <div className={`feat-grid ${activeSlide===1?'ll-up ll-d2':''}`} style={{ display:'flex',gap:22,padding:'0 48px 22px',alignItems:'flex-start' }}>
            {features.map((f,idx)=>(
              <div key={f.title} className="feat-card" style={{ animationDelay:`${idx*.06}s` }}>
                {/* illustration panel — fixed height */}
                <div className="ll-feature-image" style={{ background:'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',height:190,borderRadius:'24px 24px 0 0',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0,position:'relative' }}>
                  <div style={{ position:'absolute',top:-20,right:-20,width:120,height:120,borderRadius:'50%',background:'rgba(59,130,246,.08)' }} />
                  <img src={f.img} alt={f.title} style={{ width:'85%',height:'85%',objectFit:'contain',position:'relative',zIndex:1 }} onError={e=>{e.target.style.opacity='0'}} />
                </div>
                {/* navy icon badge — overlaps panel bottom */}
                <div style={{ width:64,height:64,borderRadius:'50%',background:'linear-gradient(135deg,#1e40af,#1e3a8a)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 24px rgba(11,42,111,.45)',margin:'-32px auto 0',position:'relative',zIndex:2,flexShrink:0,border:'4px solid white' }}>
                  {f.icon}
                </div>
                <div style={{ padding:'18px 22px 28px',display:'flex',flexDirection:'column' }}>
                  <p style={{ fontSize:17,fontWeight:800,color:'var(--navy)',margin:'0 0 12px',lineHeight:1.3 }}>{f.title}</p>
                  <p style={{ fontSize:14,color:'var(--muted)',lineHeight:1.7,margin:0,fontFamily:"'DM Sans',sans-serif" }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <section className={`ll-journey ${activeSlide===1?'ll-up ll-d2':''}`} aria-label="How IntelliLearn works">
            <h2 className="ll-journey-title" aria-label="Explore. Learn. Succeed.">
              <span>Explore</span><span className="ll-journey-separator" aria-hidden="true" />
              <span>Learn</span><span className="ll-journey-separator" aria-hidden="true" />
              <span>Succeed</span>
            </h2>
            <button className="ll-journey-cta" onClick={() => { scrollTo(2); setAuthMode('signup'); }}>
              GET STARTED
            </button>
          </section>
        </div>

        {/* ════════════════════════════════
            (C) SLIDE 3 — LOGIN / SIGNUP
        ════════════════════════════════ */}
        <div className="ll-slide ll-auth-slide" style={{ display:'flex',alignItems:'stretch',paddingTop:64,boxSizing:'border-box',position:'relative',overflow:'hidden',background:'white' }}>

          {/* ── LEFT — form panel (white -> very light blue) ── */}
          <div className={`ll-auth-form-side ${activeSlide===2?'ll-up':''}`} style={{ flex:'0 0 50%',display:'flex',alignItems:'center',justifyContent:'center',padding:'32px 52px',boxSizing:'border-box',background:'linear-gradient(160deg,#ffffff 0%,#f0f6ff 100%)',position:'relative',zIndex:2 }}>
            <div className="ll-ambient-orb ll-ambient-orb--form" aria-hidden="true" />
            {/* dot grid top-left of form side */}
            {Array.from({length:9},(_,i)=>(
              <div key={'fl'+i} style={{ position:'absolute',left:20+(i%3)*20,top:72+Math.floor(i/3)*20,width:5,height:5,borderRadius:'50%',background:'rgba(37,99,235,.15)',pointerEvents:'none' }} />
            ))}

            <div style={{ width:'100%',maxWidth:390,position:'relative',zIndex:1 }}>
              {authMode==='login' ? (
                <>
                  <div style={{ width:36,height:4,background:'var(--blue-600)',borderRadius:2,marginBottom:18 }} />
                  <h2 style={{ fontSize:52,fontWeight:800,color:'var(--navy)',margin:'0 0 6px',letterSpacing:'-.03em' }}>LOGIN</h2>
                  <p style={{ fontSize:14,color:'var(--muted)',marginBottom:28,fontFamily:"'DM Sans',sans-serif" }}>Welcome back! Please log in to continue.</p>

                  {/* Unverified email warning */}
                  {unverifiedEmail ? (
                    <div className="ll-auth-alert" style={{ background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:12,padding:'16px 18px',marginBottom:16 }}>
                      <p style={{ fontSize:14,fontWeight:700,color:'#92400E',margin:'0 0 6px' }}>📧 Email not verified</p>
                      <p style={{ fontSize:13,color:'#78350f',margin:'0 0 12px',lineHeight:1.5 }}>
                        Please verify <strong>{unverifiedEmail}</strong> before logging in. Check your inbox for the verification link.
                      </p>
                      {resendSent ? (
                        <p style={{ fontSize:12,color:'#15803d',fontWeight:600,margin:0 }}>✓ Verification email resent! Check your inbox.</p>
                      ) : (
                        <button onClick={handleResendVerification} disabled={resendLoading}
                          style={{ background:'#92400E',color:'white',border:'none',borderRadius:8,padding:'8px 16px',fontSize:12,fontWeight:700,cursor:'pointer',opacity:resendLoading?0.7:1 }}>
                          {resendLoading ? 'Sending...' : 'Resend verification email'}
                        </button>
                      )}
                      <button onClick={() => setUnverifiedEmail('')}
                        style={{ background:'none',border:'none',cursor:'pointer',fontSize:12,color:'#92400E',marginLeft:12,textDecoration:'underline' }}>
                        Try different email
                      </button>
                    </div>
                  ) : (
                    loginError && <div className="ll-auth-alert" style={{ background:'#FEF2F2',color:'#DC2626',fontSize:13,padding:'10px 14px',borderRadius:10,marginBottom:16,border:'1px solid #FECACA' }}>{loginError}</div>
                  )}
                  <form onSubmit={handleLogin} style={{ display:adminChallenge ? 'none' : 'flex',flexDirection:'column',gap:16 }}>
                    <div>
                      <label style={{ display:'block',fontSize:13,fontWeight:600,color:'var(--navy)',marginBottom:7,fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Email Address</label>
                      <div className="ll-wrap">
                        <span style={{ padding:'0 14px',display:'flex',alignItems:'center',flexShrink:0 }}><EmailOutlinedIcon sx={{fontSize:18,color:'#94a3b8'}}/></span>
                        <input type="email" className="ll-inp" placeholder="abc@xyz.com" value={loginForm.email} onChange={e=>setLoginForm({...loginForm,email:e.target.value})} required />
                      </div>
                    </div>
                    <div>
                      <label style={{ display:'block',fontSize:13,fontWeight:600,color:'var(--navy)',marginBottom:7,fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Password</label>
                      <div className="ll-wrap">
                        <span style={{ padding:'0 14px',display:'flex',alignItems:'center',flexShrink:0 }}><LockOutlinedIcon sx={{fontSize:18,color:'#94a3b8'}}/></span>
                        <input type={showPassword?'text':'password'} className="ll-inp" placeholder="••••••••••••" value={loginForm.password} onChange={e=>setLoginForm({...loginForm,password:e.target.value})} required />
                        <button type="button" onClick={()=>setShowPassword(p=>!p)} style={{ background:'none',border:'none',cursor:'pointer',padding:'0 14px',display:'flex',alignItems:'center',color:'#94a3b8' }}>
                          {showPassword?<VisibilityOffOutlinedIcon sx={{fontSize:18}}/>:<VisibilityOutlinedIcon sx={{fontSize:18}}/>}
                        </button>
                      </div>
                    </div>
                    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                      <label style={{ display:'flex',alignItems:'center',gap:8,color:'#64748b',cursor:'pointer',fontSize:13,fontFamily:"'DM Sans',sans-serif" }}>
                        <input type="checkbox" style={{ accentColor:'#2563EB',width:15,height:15 }} /> Remember me
                      </label>
                      <Link to="/forgot-password" style={{ color:'var(--blue-600)',fontWeight:700,textDecoration:'underline',fontSize:13,fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Forgot password?</Link>
                    </div>
                    <button type="submit" disabled={loginLoading} className="ll-btn">
                      {loginLoading?'Logging in...':<><span>Log in</span><ArrowForwardIcon sx={{fontSize:17}}/></>}
                    </button>
                  </form>
                  {adminChallenge && <form onSubmit={handleAdminCode} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    <p style={{ color:'#475569', fontSize:14, margin:0 }}>Enter the six-digit code sent to the administrator email address. The code expires in five minutes.</p>
                    <fieldset style={{ border:0, padding:0, margin:0, minWidth:0 }}>
                      <legend style={{ padding:0, marginBottom:8, fontSize:13, fontWeight:600, color:'var(--navy)' }}>Verification code</legend>
                      <div role="group" aria-label="Six-digit verification code" style={{ display:'grid', gridTemplateColumns:'repeat(6, minmax(0, 1fr))', gap:10 }} onPaste={event => handleAdminCodePaste(event)}>
                        {Array.from({ length:6 }, (_, index) => (
                          <input
                            key={index}
                            ref={element => { adminCodeInputs.current[index] = element; }}
                            aria-label={`Digit ${index + 1} of 6`}
                            type="text"
                            inputMode="numeric"
                            autoComplete={index === 0 ? 'one-time-code' : 'off'}
                            maxLength={6}
                            required={index === 0}
                            value={adminCode[index] || ''}
                            onChange={event => updateAdminCode(index, event.target.value)}
                            onKeyDown={event => handleAdminCodeKeyDown(event, index)}
                            onPaste={event => handleAdminCodePaste(event, index)}
                            disabled={loginLoading}
                            className="ll-otp-digit"
                          />
                        ))}
                      </div>
                    </fieldset>
                    <button type="submit" disabled={loginLoading || !/^\d{6}$/.test(adminCode)} className="ll-btn">{loginLoading ? 'Verifying…' : 'Verify and log in'}</button>
                    <button type="button" onClick={() => { setAdminChallenge(''); setAdminCode(''); setLoginError(''); }} style={{ background:'none', border:0, color:'#2563EB', cursor:'pointer' }}>Use a different account</button>
                  </form>}
                  
                  {/* Divider */}
                  <div style={{ display:'flex',alignItems:'center',gap:12,margin:'20px 0' }}>
                    <div style={{ flex:1,height:1,background:'#E2E8F0' }} />
                    <span style={{ fontSize:12,color:'#94a3b8',fontWeight:600,fontFamily:"'Plus Jakarta Sans',sans-serif" }}>OR</span>
                    <div style={{ flex:1,height:1,background:'#E2E8F0' }} />
                  </div>

                  {/* Google Sign In Button */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    style={{
                      width:'100%',
                      background:'white',
                      border:'1.5px solid #E2E8F0',
                      borderRadius:999,
                      padding:'14px',
                      fontSize:14,
                      fontWeight:600,
                      cursor:'pointer',
                      fontFamily:"'Plus Jakarta Sans',sans-serif",
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      gap:10,
                      transition:'all .2s',
                      boxShadow:'0 2px 8px rgba(0,0,0,.05)'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.08)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.05)';
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18">
                      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                      <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                    </svg>
                    <span style={{ color:'#1F2937' }}>Sign in with Google</span>
                  </button>

                  <div style={{ marginTop:20,textAlign:'center' }}>
                    <p style={{ fontSize:13,color:'#94a3b8',margin:0,fontFamily:"'DM Sans',sans-serif" }}>
                      {"Don't have an account? "}<button onClick={()=>setAuthMode('signup')} style={{ background:'none',border:'none',color:'var(--blue-600)',fontWeight:700,cursor:'pointer',fontSize:13,textDecoration:'underline',fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Sign up</button>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ width:36,height:4,background:'var(--blue-600)',borderRadius:2,marginBottom:18 }} />
                  <h2 style={{ fontSize:42,fontWeight:800,color:'var(--navy)',margin:'0 0 6px',letterSpacing:'-.03em' }}>SIGN UP</h2>
                  <p style={{ fontSize:14,color:'var(--muted)',marginBottom:16,fontFamily:"'DM Sans',sans-serif" }}>Join the Community Now!</p>
                  {regSuccess ? (
                    <div style={{ textAlign:'center',padding:'20px 0' }}>
                      <div style={{ fontSize:'3rem',marginBottom:12 }}>📧</div>
                      <h3 style={{ fontSize:20,fontWeight:800,color:'var(--navy)',marginBottom:8 }}>Check your email!</h3>
                      <p style={{ fontSize:14,color:'var(--muted)',lineHeight:1.6,marginBottom:6 }}>
                        We sent a verification link to:
                      </p>
                      <p style={{ fontSize:14,fontWeight:700,color:'var(--navy)',marginBottom:16 }}>{regEmail}</p>
                      <p style={{ fontSize:13,color:'var(--muted)',lineHeight:1.6,marginBottom:20 }}>
                        Click the link in your email to activate your account. The link expires in 60 minutes.
                      </p>
                      {resendSent ? (
                        <p style={{ fontSize:13,color:'#15803d',fontWeight:600,marginBottom:16 }}>✓ Verification email resent!</p>
                      ) : (
                        <button onClick={handleResendVerification} disabled={resendLoading}
                          style={{ background:'none',border:'1.5px solid var(--blue-600)',color:'var(--blue-600)',borderRadius:8,padding:'8px 20px',fontSize:13,fontWeight:700,cursor:'pointer',marginBottom:12,opacity:resendLoading?0.7:1 }}>
                          {resendLoading ? 'Sending...' : "Didn't receive it? Resend"}
                        </button>
                      )}
                      <br/>
                      <button onClick={()=>{ setRegSuccess(false); setAuthMode('login'); }} className="ll-btn" style={{ marginTop:8 }}>Go to Login</button>
                    </div>
                  ) : (
                    <>
                      {regErrors.general && <div className="ll-auth-alert" style={{ background:'#FEF2F2',color:'#DC2626',fontSize:13,padding:'10px 14px',borderRadius:10,marginBottom:12,border:'1px solid #FECACA' }}>{regErrors.general[0]}</div>}
                      <form onSubmit={handleRegister} style={{ display:'flex',flexDirection:'column',gap:12 }}>
                        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                          <div>
                            <label style={{ display:'block',fontSize:13,fontWeight:600,color:'var(--navy)',marginBottom:7 }}>First Name</label>
                            <div className="ll-wrap"><span style={{ padding:'0 14px',display:'flex',alignItems:'center' }}><PersonOutlinedIcon sx={{fontSize:18,color:'#94a3b8'}}/></span><input type="text" className="ll-inp" placeholder="Juan" value={regForm.first_name} onChange={e=>setRegForm({...regForm,first_name:e.target.value})} required /></div>
                            {regErrors.first_name&&<p style={{ color:'#DC2626',fontSize:11,marginTop:4 }}>{regErrors.first_name[0]}</p>}
                          </div>
                          <div>
                            <label style={{ display:'block',fontSize:13,fontWeight:600,color:'var(--navy)',marginBottom:7 }}>Last Name</label>
                            <div className="ll-wrap"><span style={{ padding:'0 14px',display:'flex',alignItems:'center' }}><PersonOutlinedIcon sx={{fontSize:18,color:'#94a3b8'}}/></span><input type="text" className="ll-inp" placeholder="Dela Cruz" value={regForm.last_name} onChange={e=>setRegForm({...regForm,last_name:e.target.value})} required /></div>
                          </div>
                        </div>
                        <div>
                          <label style={{ display:'block',fontSize:13,fontWeight:600,color:'var(--navy)',marginBottom:7 }}>Email Address</label>
                          <div className="ll-wrap"><span style={{ padding:'0 14px',display:'flex',alignItems:'center' }}><EmailOutlinedIcon sx={{fontSize:18,color:'#94a3b8'}}/></span><input type="email" className="ll-inp" placeholder="abc@xyz.com" value={regForm.email} onChange={e=>setRegForm({...regForm,email:e.target.value})} required /></div>
                          {regErrors.email&&<p style={{ color:'#DC2626',fontSize:11,marginTop:4 }}>{regErrors.email[0]}</p>}
                        </div>
                        <div>
                          <label style={{ display:'block',fontSize:13,fontWeight:600,color:'var(--navy)',marginBottom:7 }}>Password</label>
                          <div className="ll-wrap">
                            <span style={{ padding:'0 14px',display:'flex',alignItems:'center' }}><LockOutlinedIcon sx={{fontSize:18,color:'#94a3b8'}}/></span>
                            <input type={showRegPw?'text':'password'} className="ll-inp" placeholder="••••••••••••" value={regForm.password} onChange={e=>setRegForm({...regForm,password:e.target.value})} required />
                            <button type="button" onClick={()=>setShowRegPw(p=>!p)} style={{ background:'none',border:'none',cursor:'pointer',padding:'0 14px',display:'flex',alignItems:'center',color:'#94a3b8' }}>{showRegPw?<VisibilityOffOutlinedIcon sx={{fontSize:18}}/>:<VisibilityOutlinedIcon sx={{fontSize:18}}/>}</button>
                          </div>
                          {regErrors.password&&<p style={{ color:'#DC2626',fontSize:11,marginTop:4 }}>{regErrors.password[0]}</p>}
                        </div>
                        <div>
                          <label style={{ display:'block',fontSize:13,fontWeight:600,color:'var(--navy)',marginBottom:7 }}>Confirm Password</label>
                          <div className="ll-wrap">
                            <span style={{ padding:'0 14px',display:'flex',alignItems:'center' }}><LockOutlinedIcon sx={{fontSize:18,color:'#94a3b8'}}/></span>
                            <input type={showRegPw?'text':'password'} className="ll-inp" placeholder="••••••••••••" value={regForm.password_confirmation} onChange={e=>setRegForm({...regForm,password_confirmation:e.target.value})} required />
                          </div>
                          {regErrors.password_confirmation&&<p style={{ color:'#DC2626',fontSize:11,marginTop:4 }}>{regErrors.password_confirmation[0]}</p>}
                        </div>
                        <button type="submit" disabled={regLoading} className="ll-btn" style={{ marginTop:4 }}>
                          {regLoading?'Creating account...':<><span>Sign Up</span><ArrowForwardIcon sx={{fontSize:17}}/></>}
                        </button>
                      </form>
                      <div style={{ marginTop:14,textAlign:'center' }}>
                        <p style={{ fontSize:13,color:'#94a3b8',margin:0,fontFamily:"'DM Sans',sans-serif" }}>
                          {'Already have an account? '}<button onClick={()=>setAuthMode('login')} style={{ background:'none',border:'none',color:'var(--blue-600)',fontWeight:700,cursor:'pointer',fontSize:13,textDecoration:'underline',fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Log in</button>
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── RIGHT — decorative panel ── */}
          <div className={`ll-auth-info-side ${activeSlide===2?'ll-up ll-d1':''}`} style={{ flex:'0 0 50%',position:'relative',overflow:'hidden',background:'linear-gradient(145deg,#dbeafe 0%,#eff6ff 50%,#e8f4ff 100%)',display:'flex',flexDirection:'column',justifyContent:'center',padding:'40px 56px',boxSizing:'border-box',zIndex:1 }}>

            {/* background organic blobs */}
            <div className="ll-auth-blob" aria-hidden="true" style={{ position:'absolute',top:-100,right:-80,width:500,height:500,borderRadius:'50%',background:'var(--auth-blob-one)',pointerEvents:'none' }} />
            <div className="ll-auth-blob ll-auth-blob--two" aria-hidden="true" style={{ position:'absolute',top:'25%',right:-30,width:340,height:340,borderRadius:'50%',background:'var(--auth-blob-two)',pointerEvents:'none' }} />
            <div className="ll-auth-blob ll-auth-blob--three" aria-hidden="true" style={{ position:'absolute',bottom:-80,right:40,width:260,height:260,borderRadius:'50%',background:'var(--auth-blob-three)',pointerEvents:'none' }} />
            {/* small accent circle mid-right */}
            <div className="ll-auth-blob ll-auth-blob--four" aria-hidden="true" style={{ position:'absolute',top:'52%',right:'18%',width:55,height:55,borderRadius:'50%',background:'var(--auth-blob-four)',pointerEvents:'none' }} />

            {/* sparkles */}
            <svg style={{ position:'absolute',top:'36%',right:'30%',pointerEvents:'none' }} width="16" height="16" viewBox="0 0 26 26"><path d="M13 0 L14.3 11.7 L26 13 L14.3 14.3 L13 26 L11.7 14.3 L0 13 L11.7 11.7 Z" fill="#3b82f6" opacity=".55"/></svg>
            <svg style={{ position:'absolute',bottom:'20%',right:'40%',pointerEvents:'none' }} width="12" height="12" viewBox="0 0 26 26"><path d="M13 0 L14.3 11.7 L26 13 L14.3 14.3 L13 26 L11.7 14.3 L0 13 L11.7 11.7 Z" fill="#3b82f6" opacity=".4"/></svg>

            {/* dot grid bottom-right */}
            {Array.from({length:9},(_,i)=>(
              <div key={'dr'+i} style={{ position:'absolute',right:24+(i%3)*20,bottom:24+Math.floor(i/3)*20,width:5,height:5,borderRadius:'50%',background:'rgba(37,99,235,.2)',pointerEvents:'none' }} />
            ))}

            {/* brand — logo + text once */}
            <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:28,position:'relative',zIndex:2 }}>
              <span className="landing-logo-tile landing-logo-tile--hero" aria-hidden="true" />
              <span style={{ fontWeight:800,fontSize:18,color:'var(--navy)',letterSpacing:'.02em' }}>INTELLILEARN</span>
            </div>

            <h2 style={{ fontSize:52,fontWeight:800,color:'var(--navy)',lineHeight:1.08,margin:'0 0 8px',letterSpacing:'-.03em',position:'relative',zIndex:2 }}>
              Smarter Learning.<br />
              <span style={{ color:'var(--blue-600)' }}>Better Results.</span>
            </h2>
            <div style={{ width:50,height:5,background:'linear-gradient(90deg, #2563EB, #3B82F6)',borderRadius:3,margin:'18px 0 22px',position:'relative',zIndex:2 }} />
            <p style={{ fontSize:18,color:'var(--muted)',lineHeight:1.7,maxWidth:400,fontFamily:"'DM Sans',sans-serif",marginBottom:32,position:'relative',zIndex:2 }}>
              IntelliLearn uses AI to personalize your learning experience, giving you the right content, feedback, and support exactly when you need it.
            </p>
            <button style={{ display:'inline-flex',alignItems:'center',gap:10,background:'linear-gradient(135deg,#0B2A6F,#1E40AF)',color:'white',border:'none',borderRadius:999,padding:'16px 32px',fontSize:15,fontWeight:700,cursor:'pointer',width:'fit-content',fontFamily:"'Plus Jakarta Sans',sans-serif",boxShadow:'0 6px 24px rgba(11,42,111,.35)',position:'relative',zIndex:2,transition:'all .2s' }}>
              Learn More <ArrowForwardIcon sx={{fontSize:18}}/>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
