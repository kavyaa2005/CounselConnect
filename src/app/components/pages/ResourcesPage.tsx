import { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Headphones, Video, ArrowRight, Search } from 'lucide-react';
import { CC } from '../../lib/colors';

const CATS = ['All','Anxiety','Depression','Mindfulness','Relationships','Stress','Sleep'];

const resources = [
  { id:1, type:'article', cat:'Anxiety',        title:'Understanding the 4-7-8 Breathing Technique',       desc:'A clinically-proven method for reducing acute anxiety in minutes by activating your parasympathetic nervous system.',         time:'5 min read',  img:'https://images.unsplash.com/photo-1763713383838-5cd702c13160?w=400&h=260&fit=crop' },
  { id:2, type:'audio',   cat:'Mindfulness',    title:'Morning Grounding Meditation',                       desc:'Start your day with intention. This 10-minute guided body-scan anchors you firmly in the present moment.',                  time:'10 min',      img:'https://images.unsplash.com/photo-1772267692484-5e54d9645e12?w=400&h=260&fit=crop' },
  { id:3, type:'video',   cat:'Stress',         title:'The Science of Stress & Your Brain',                 desc:'Dr. Chen explains how chronic stress physically changes the brain — and exactly what reverses those changes.',             time:'18 min',      img:'https://images.unsplash.com/photo-1714976694867-bc0e012fab70?w=400&h=260&fit=crop' },
  { id:4, type:'article', cat:'Sleep',          title:'Why Sleep Hygiene Matters for Mental Health',        desc:'The bidirectional relationship between sleep and mental wellness — and seven evidence-based habits that help.',            time:'7 min read',  img:'https://images.unsplash.com/photo-1598826739205-d09823c3bc3d?w=400&h=260&fit=crop' },
  { id:5, type:'audio',   cat:'Depression',     title:'Gentle Movement & Mood: A Guided Practice',          desc:'Research consistently shows movement improves mood. This session pairs light movement prompts with breathwork.',           time:'15 min',      img:'https://images.unsplash.com/photo-1768828246616-e86833c66dea?w=400&h=260&fit=crop' },
  { id:6, type:'article', cat:'Relationships',  title:'Setting Boundaries Without Guilt',                   desc:'A practical guide to communicating limits with warmth and clarity — for both new and long-term relationships.',          time:'8 min read',  img:'https://images.unsplash.com/photo-1778694276998-4cfd1f84bfe1?w=400&h=260&fit=crop' },
];

const typeIcon: Record<string,any>    = { article:BookOpen, audio:Headphones, video:Video };
const typeColor: Record<string,string> = { article:CC.forestSage, audio:CC.terracotta, video:CC.darkForest };

export function ResourcesPage() {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');

  const filtered = resources.filter(r =>
    (cat==='All'||r.cat===cat) &&
    (!search||r.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ backgroundColor:CC.luxuryBg, fontFamily:"'Inter',sans-serif" }}>
      {/* Hero */}
      <section style={{ padding:'130px 24px 80px', background:`linear-gradient(145deg,${CC.darkForest},${CC.forestSage})`, textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0 }}>
          <img src="https://images.unsplash.com/photo-1598826739205-d09823c3bc3d?w=1920&q=60" alt="" style={{ width:'100%', height:'100%', objectFit:'cover', opacity:0.1 }} />
          <div style={{ position:'absolute', inset:0, background:`linear-gradient(145deg,rgba(40,70,58,0.93),rgba(53,92,77,0.88))` }} />
        </div>
        <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} style={{ position:'relative', zIndex:1, maxWidth:680, margin:'0 auto' }}>
          <span style={{color:CC.terracotta,fontSize:'0.75rem',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase'}}>Wellness Library</span>
          <h1 style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:'clamp(1.8rem,4vw,2.8rem)',color:'white',margin:'14px 0',lineHeight:1.2}}>
            Resources for your journey
          </h1>
          <p style={{color:'rgba(255,255,255,0.65)',marginBottom:28,lineHeight:1.7}}>
            Curated articles, guided meditations, and expert video sessions — all evidence-based.
          </p>
          <div style={{ position:'relative', maxWidth:400, margin:'0 auto' }}>
            <Search size={16} color="rgba(255,255,255,0.5)" style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search resources..."
              style={{ width:'100%', padding:'13px 16px 13px 44px', borderRadius:16, backgroundColor:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', color:'white', fontSize:'0.9rem', outline:'none', boxSizing:'border-box' }} />
          </div>
        </motion.div>
        <div style={{ position:'absolute', bottom:0, left:0, right:0 }}>
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{display:'block',height:60,fill:CC.luxuryBg,width:'100%'}}>
            <path d="M0,30 C480,0 960,60 1440,20 L1440,60 L0,60 Z" />
          </svg>
        </div>
      </section>

      {/* Content */}
      <section style={{ padding:'40px 24px 80px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:32 }}>
            {CATS.map(c=>(
              <motion.button key={c} onClick={()=>setCat(c)} whileHover={{scale:1.04}} whileTap={{scale:0.96}}
                style={{ padding:'8px 16px', borderRadius:20, border:'none', cursor:'pointer', fontSize:'0.82rem', fontWeight:cat===c?600:400, backgroundColor:cat===c?CC.forestSage:CC.softSage, color:cat===c?'white':CC.primaryText }}>
                {c}
              </motion.button>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:24 }}>
            {filtered.map((r,i)=>{
              const Icon=typeIcon[r.type];
              const color=typeColor[r.type];
              return(
                <motion.div key={r.id} initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:false,amount:0.15}} transition={{delay:i*0.06}}
                  whileHover={{scale:1.02,y:-4}} style={{ borderRadius:24, overflow:'hidden', backgroundColor:CC.lightIvory, boxShadow:'0 4px 24px rgba(53,92,77,0.07)', cursor:'pointer' }}>
                  <div style={{ position:'relative', height:160, overflow:'hidden' }}>
                    <img src={r.img} alt={r.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,transparent 50%,rgba(35,49,45,0.5))' }} />
                    <span style={{ position:'absolute', top:12, left:12, padding:'4px 10px', borderRadius:20, backgroundColor:`${color}22`, border:`1px solid ${color}40`, color, fontSize:'0.7rem', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                      <Icon size={11}/>{r.type}
                    </span>
                  </div>
                  <div style={{ padding:'18px 20px 20px' }}>
                    <span style={{ fontSize:'0.68rem', color, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{r.cat}</span>
                    <h3 style={{ fontFamily:"'Poppins',sans-serif", fontWeight:700, fontSize:'0.95rem', color:CC.primaryText, margin:'6px 0', lineHeight:1.4 }}>{r.title}</h3>
                    <p style={{ fontSize:'0.8rem', color:CC.mutedOlive, lineHeight:1.6, marginBottom:12 }}>{r.desc}</p>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span style={{ fontSize:'0.72rem', color:CC.mutedOlive }}>{r.time}</span>
                      <button style={{ display:'flex', alignItems:'center', gap:4, color, fontSize:'0.78rem', fontWeight:600, background:'none', border:'none', cursor:'pointer' }}>
                        Open <ArrowRight size={13}/>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
