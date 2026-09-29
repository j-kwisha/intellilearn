import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import heroImg from '../../assets/Student_LandingPage.png';
import logo from '../../assets/logo.png';

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
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [authMode, setAuthMode]       = useState('login');
  const [loginForm, setLoginForm]     = useState({ email:'', password:'' });
  const [loginError, setLoginError]   = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPw, setShowRegPw]       = useState(false);
  const [regForm, setRegForm]   = useState({ first_name:'', last_name:'', email:'', password:'', password_confirmation:'' });
  const [regErrors, setRegErrors]   = useState({});
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.focus();
    const onScroll = () => setActiveSlide(Math.round(el.scrollTop / el.clientHeight));
    el.addEventListener('scroll', onScroll, { passive:true });
    const onWheel = (e) => { e.preventDefault(); el.scrollBy({ top:e.deltaY, behavior:'auto' }); };
    document.addEventListener('wheel', onWheel, { passive:false });
    return () => { el.removeEventListener('scroll', onScroll); document.removeEventListener('wheel', onWheel); };
  }, []);

  const scrollTo = (idx) => containerRef.current?.scrollTo({ top: idx * containerRef.current.clientHeight, behavior:'smooth' });

  const handleLogin = async (e) => {
    e.preventDefault(); setLoginError(''); setLoginLoading(true);
    try {
      const user = await login(loginForm.email, loginForm.password);
      if (user.role==='admin') navigate('/admin');
      else if (user.role==='instructor') navigate('/instructor');
      else navigate('/student');
    } catch (err) { setLoginError(err.response?.data?.message || 'Login failed.'); }
    finally { setLoginLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setRegErrors({}); setRegLoading(true);
    try {
      const res = await register(regForm);
      if (res.token) { localStorage.setItem('token', res.token); localStorage.setItem('user', JSON.stringify(res.user)); }
      navigate('/student');
    } catch (err) {
      if (err.response?.data?.errors) setRegErrors(err.response.data.errors);
      else setRegErrors({ general:[err.response?.data?.message || 'Registration failed.'] });
    } finally { setRegLoading(false); }
  };

  const handleGoogleLogin = async () => {
    try {
      // Call backend to get Google OAuth URL
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/google/redirect`);
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
    <div style={{ width:'100vw', height:'100vh', overflow:'hidden', fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif" }}>
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

        /* ── inputs ── */
        .ll-wrap{display:flex;align-items:center;border:1.5px solid #C9DBF5;border-radius:16px;background:#F5F9FF;overflow:hidden;transition:border-color .2s,box-shadow .2s;height:58px}
        .ll-wrap:focus-within{border-color:var(--blue-600);box-shadow:0 0 0 3px rgba(37,99,235,.15);background:#fff}
        .ll-inp{flex:1;padding:0 10px 0 0;border:none;background:transparent;font-size:14px;color:#0f172a;outline:none;font-family:'DM Sans',sans-serif;height:100%}
        .ll-inp::placeholder{color:#94a3b8}

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
        @media(max-width:1024px){
          .feat-grid{flex-wrap:wrap!important}
          .feat-card{flex:0 0 calc(50% - 10px)!important;width:calc(50% - 10px)!important}
        }
        @media(max-width:640px){
          .feat-card{flex:0 0 100%!important;width:100%!important}
        }
      `}</style>

      {/* ══ NAVBAR ══ */}
      <nav style={{
        position:'fixed',top:0,left:0,right:0,zIndex:300,height:64,
        background:'#EEF4FF',
        borderBottom:'1px solid rgba(180,210,255,.4)',boxShadow:'0 2px 12px rgba(37,99,235,.08)',
        display:'flex',alignItems:'center',padding:'0 40px',boxSizing:'border-box'
      }}>
        <div style={{ marginRight:'auto',display:'flex',alignItems:'center',gap:10,cursor:'pointer' }} onClick={()=>scrollTo(0)}>
          <img src={logo} alt="IntelliLearn" style={{ height:38,objectFit:'contain' }} />
        </div>
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
        <div className="ll-slide" style={{ background:'#EAF1FF',display:'flex',flexDirection:'column',padding:'72px 28px 28px',boxSizing:'border-box' }}>
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
            <div className={activeSlide===0?'ll-up':''} style={{ position:'relative',zIndex:10,padding:'50px 0 50px 58px',maxWidth:560 }}>
              {/* eyebrow */}
              <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:16 }}>
                <div style={{ width:24,height:1.5,background:'rgba(141,184,255,.8)',borderRadius:2 }} />
                <span style={{ fontSize:12,fontWeight:600,color:'#8DB8FF',letterSpacing:'3px',textTransform:'uppercase',fontFamily:"'Plus Jakarta Sans',sans-serif" }}>INTELLILEARN</span>
                <div style={{ width:24,height:1.5,background:'rgba(141,184,255,.8)',borderRadius:2 }} />
              </div>

              {/* headline — 54px so "Learning That ✦" fits on ONE line */}
              <h1 style={{ fontSize:54,fontWeight:800,lineHeight:1.08,margin:'0 0 18px',letterSpacing:'-1px',fontFamily:"'Plus Jakarta Sans',sans-serif",whiteSpace:'nowrap' }}>
                <span style={{ color:'white',display:'block' }}>
                  Learning That&nbsp;
                  <svg style={{ display:'inline-block',verticalAlign:'-3px' }} width="26" height="26" viewBox="0 0 26 26" fill="none">
                    <path d="M13 0 L14.6 11.4 L26 13 L14.6 14.6 L13 26 L11.4 14.6 L0 13 L11.4 11.4 Z" fill="#7FD0FF"/>
                  </svg>
                </span>
                <span style={{ display:'block',background:'linear-gradient(90deg,#7FD0FF 0%,#B8D8FF 50%,#DDE6FF 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>
                  Adapts to You.
                </span>
              </h1>

              <p style={{ fontSize:15,color:'rgba(255,255,255,.85)',lineHeight:1.7,maxWidth:440,marginBottom:34,fontFamily:"'DM Sans',sans-serif" }}>
                Traditional LMS platforms stop at content delivery. IntelliLearn goes further — using AI to personalize learning, provide instant feedback, and support students in real time.
              </p>

              {/* glassmorphism search bar — z:10, always above waves */}
              <div style={{ display:'flex',alignItems:'center',background:'rgba(255,255,255,.15)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,.38)',borderRadius:999,maxWidth:460,height:58,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,.15)',position:'relative',zIndex:10 }}>
                <div style={{ padding:'0 16px',display:'flex',alignItems:'center',flexShrink:0 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <input type="text" placeholder="Search Courses" style={{ flex:1,border:'none',outline:'none',fontSize:14,color:'white',background:'transparent',height:'100%',fontFamily:"'Plus Jakarta Sans',sans-serif" }} />
                <div style={{ display:'flex',alignItems:'center',gap:6,borderLeft:'1px solid rgba(255,255,255,.3)',padding:'0 18px',height:'100%',fontSize:13.5,fontWeight:700,color:'white',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0 }}>
                  Courses <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
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
        <div className="ll-slide" style={{ background:'var(--page-bg)',display:'flex',flexDirection:'column',paddingTop:64,boxSizing:'border-box',position:'relative',overflow:'hidden' }}>
          {/* subtle blob top-right */}
          <div style={{ position:'absolute',top:-100,right:-80,width:380,height:380,borderRadius:'50%',background:'rgba(37,99,235,.06)',pointerEvents:'none' }} />

          <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',padding:'28px 48px 16px' }}>
            <h1 className={activeSlide===1?'ll-up':''} style={{ fontSize:50,fontWeight:800,color:'var(--navy)',lineHeight:1.1,margin:0,letterSpacing:'-.025em' }}>
              Smart Features.<br />Real Impact.
            </h1>
            <p className={activeSlide===1?'ll-up ll-d1':''} style={{ flex:'0 0 260px',fontSize:14,color:'var(--muted)',lineHeight:1.75,margin:0,textAlign:'right',paddingTop:10,fontFamily:"'DM Sans',sans-serif" }}>
              IntelliLearn integrates artificial intelligence to improve how students learn and how instructors teach.
            </p>
          </div>

          {/* cards row — fixed height, aligned */}
          <div className={`feat-grid ${activeSlide===1?'ll-up ll-d2':''}`} style={{ display:'flex',gap:18,padding:'0 48px 36px',alignItems:'flex-start' }}>
            {features.map((f,idx)=>(
              <div key={f.title} className="feat-card" style={{ animationDelay:`${idx*.06}s` }}>
                {/* illustration panel — fixed height */}
                <div style={{ background:'#E6F0FF',height:170,borderRadius:'24px 24px 0 0',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0 }}>
                  <img src={f.img} alt={f.title} style={{ width:'90%',height:'90%',objectFit:'contain' }} onError={e=>{e.target.style.opacity='0'}} />
                </div>
                {/* navy icon badge — overlaps panel bottom */}
                <div style={{ width:56,height:56,borderRadius:'50%',background:'linear-gradient(135deg,#1e3a8a,#0b2a6f)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 6px 18px rgba(11,42,111,.4)',margin:'-28px auto 0',position:'relative',zIndex:2,flexShrink:0 }}>
                  {f.icon}
                </div>
                <div style={{ padding:'14px 18px 22px',display:'flex',flexDirection:'column' }}>
                  <p style={{ fontSize:14,fontWeight:800,color:'var(--navy)',margin:'0 0 10px',lineHeight:1.35 }}>{f.title}</p>
                  <p style={{ fontSize:13,color:'var(--muted)',lineHeight:1.65,margin:0,fontFamily:"'DM Sans',sans-serif" }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════
            (C) SLIDE 3 — LOGIN / SIGNUP
        ════════════════════════════════ */}
        <div className="ll-slide" style={{ display:'flex',alignItems:'stretch',paddingTop:64,boxSizing:'border-box',position:'relative',overflow:'hidden',background:'white' }}>

          {/* ── LEFT — form panel (white -> very light blue) ── */}
          <div className={activeSlide===2?'ll-up':''} style={{ flex:'0 0 50%',display:'flex',alignItems:'center',justifyContent:'center',padding:'32px 52px',boxSizing:'border-box',background:'linear-gradient(160deg,#ffffff 0%,#f0f6ff 100%)',position:'relative',zIndex:2 }}>
            {/* dot grid top-left of form side */}
            {Array.from({length:9},(_,i)=>(
              <div key={'fl'+i} style={{ position:'absolute',left:20+(i%3)*20,top:72+Math.floor(i/3)*20,width:5,height:5,borderRadius:'50%',background:'rgba(37,99,235,.15)',pointerEvents:'none' }} />
            ))}

            <div style={{ width:'100%',maxWidth:390 }}>
              {authMode==='login' ? (
                <>
                  <div style={{ width:36,height:4,background:'var(--blue-600)',borderRadius:2,marginBottom:18 }} />
                  <h2 style={{ fontSize:52,fontWeight:800,color:'var(--navy)',margin:'0 0 6px',letterSpacing:'-.03em' }}>LOGIN</h2>
                  <p style={{ fontSize:14,color:'var(--muted)',marginBottom:28,fontFamily:"'DM Sans',sans-serif" }}>Welcome back! Please log in to continue.</p>
                  {loginError && <div style={{ background:'#FEF2F2',color:'#DC2626',fontSize:13,padding:'10px 14px',borderRadius:10,marginBottom:16,border:'1px solid #FECACA' }}>{loginError}</div>}
                  <form onSubmit={handleLogin} style={{ display:'flex',flexDirection:'column',gap:16 }}>
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
                      <h3 style={{ fontSize:18,fontWeight:700,color:'var(--navy)',marginBottom:8 }}>Check your email!</h3>
                      <p style={{ fontSize:14,color:'var(--muted)',lineHeight:1.6,marginBottom:20 }}>We sent a verification link. Click it to activate your account.</p>
                      <button onClick={()=>{ setRegSuccess(false); setAuthMode('login'); }} className="ll-btn">Go to Login</button>
                    </div>
                  ) : (
                    <>
                      {regErrors.general && <div style={{ background:'#FEF2F2',color:'#DC2626',fontSize:13,padding:'10px 14px',borderRadius:10,marginBottom:12,border:'1px solid #FECACA' }}>{regErrors.general[0]}</div>}
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
          <div className={activeSlide===2?'ll-up ll-d1':''} style={{ flex:'0 0 50%',position:'relative',overflow:'hidden',background:'linear-gradient(145deg,#dbeafe 0%,#eff6ff 50%,#e8f4ff 100%)',display:'flex',flexDirection:'column',justifyContent:'center',padding:'40px 56px',boxSizing:'border-box',zIndex:1 }}>

            {/* background organic blobs */}
            <div style={{ position:'absolute',top:-100,right:-80,width:500,height:500,borderRadius:'50%',background:'rgba(191,219,254,.55)',pointerEvents:'none' }} />
            <div style={{ position:'absolute',top:'25%',right:-30,width:340,height:340,borderRadius:'50%',background:'rgba(219,234,254,.6)',pointerEvents:'none' }} />
            <div style={{ position:'absolute',bottom:-80,right:40,width:260,height:260,borderRadius:'50%',background:'rgba(147,197,253,.35)',pointerEvents:'none' }} />
            {/* small accent circle mid-right */}
            <div style={{ position:'absolute',top:'52%',right:'18%',width:55,height:55,borderRadius:'50%',background:'rgba(147,197,253,.4)',pointerEvents:'none' }} />

            {/* sparkles */}
            <svg style={{ position:'absolute',top:'36%',right:'30%',pointerEvents:'none' }} width="16" height="16" viewBox="0 0 26 26"><path d="M13 0 L14.3 11.7 L26 13 L14.3 14.3 L13 26 L11.7 14.3 L0 13 L11.7 11.7 Z" fill="#3b82f6" opacity=".55"/></svg>
            <svg style={{ position:'absolute',bottom:'20%',right:'40%',pointerEvents:'none' }} width="12" height="12" viewBox="0 0 26 26"><path d="M13 0 L14.3 11.7 L26 13 L14.3 14.3 L13 26 L11.7 14.3 L0 13 L11.7 11.7 Z" fill="#3b82f6" opacity=".4"/></svg>

            {/* dot grid bottom-right */}
            {Array.from({length:9},(_,i)=>(
              <div key={'dr'+i} style={{ position:'absolute',right:24+(i%3)*20,bottom:24+Math.floor(i/3)*20,width:5,height:5,borderRadius:'50%',background:'rgba(37,99,235,.2)',pointerEvents:'none' }} />
            ))}

            {/* brand — logo + text once */}
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:20,position:'relative',zIndex:2 }}>
              <img src={logo} alt="IntelliLearn" style={{ height:28,objectFit:'contain' }} />
              <span style={{ fontWeight:800,fontSize:13,color:'var(--navy)',letterSpacing:'.02em' }}>INTELLILEARN</span>
            </div>

            <h2 style={{ fontSize:40,fontWeight:800,color:'var(--navy)',lineHeight:1.12,margin:'0 0 4px',letterSpacing:'-.025em',position:'relative',zIndex:2 }}>
              Smarter Learning.<br />
              <span style={{ color:'var(--blue-600)' }}>Better Results.</span>
            </h2>
            <div style={{ width:40,height:4,background:'var(--blue-600)',borderRadius:2,margin:'14px 0 18px',position:'relative',zIndex:2 }} />
            <p style={{ fontSize:15,color:'var(--muted)',lineHeight:1.75,maxWidth:340,fontFamily:"'DM Sans',sans-serif",marginBottom:28,position:'relative',zIndex:2 }}>
              IntelliLearn uses AI to personalize your learning experience, giving you the right content, feedback, and support exactly when you need it.
            </p>
            <button style={{ display:'inline-flex',alignItems:'center',gap:8,background:'linear-gradient(90deg,#0B2A6F,#1E3A8A)',color:'white',border:'none',borderRadius:999,padding:'13px 26px',fontSize:14,fontWeight:700,cursor:'pointer',width:'fit-content',fontFamily:"'Plus Jakarta Sans',sans-serif",boxShadow:'0 4px 18px rgba(11,42,111,.25)',position:'relative',zIndex:2 }}>
              Learn More <ArrowForwardIcon sx={{fontSize:16}}/>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
