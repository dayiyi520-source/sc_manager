import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { Building2, LockKeyhole, MessageCircle, QrCode, UserRound, Zap } from 'lucide-react';
import { devLogin, readSession } from '../../services/session';

gsap.registerPlugin(Draggable, MorphSVGPlugin);

const accounts = [
  { username: 'admin', name: '林志豪', role: '超级系统管理员' },
  { username: 'sales', name: '陈雅婷', role: '销售总监' },
  { username: 'product', name: '张瑞', role: '产品经理' },
  { username: 'tech', name: '王浩然', role: '技术负责人' },
];

function playPullSound() {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const now = context.currentTime;
  [0, 0.08].forEach((offset, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(index ? 880 : 660, now + offset);
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.12, now + offset + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.16);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now + offset);
    oscillator.stop(now + offset + 0.17);
  });
  window.setTimeout(() => context.close().catch(() => undefined), 500);
}

export function DevLoginPage() {
  const navigate = useNavigate();
  const existing = readSession();
  const [isOn, setIsOn] = useState(false);
  const [shadeHue, setShadeHue] = useState(205);
  const [loginMode, setLoginMode] = useState<'account' | 'wechat'>('account');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isOnRef = useRef(false);
  const lampRootRef = useRef<HTMLDivElement>(null);
  const ropeHandleRef = useRef<HTMLButtonElement>(null);
  const ropePathRef = useRef<SVGPathElement>(null);
  const ropeBaseRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const root = lampRootRef.current;
    const handle = ropeHandleRef.current;
    const rope = ropePathRef.current;
    const ropeBase = ropeBaseRef.current;
    if (!root || !handle || !rope || !ropeBase) return;
    const setLampState = (next: boolean) => {
      setIsOn((current) => {
        if (current === next) return current;
        const hue = Math.floor(Math.random() * 360);
        setShadeHue(hue);
        isOnRef.current = next;
        gsap.to(rope, { duration: 0.22, morphSVG: next ? ropeBase : 'M205 119 C205 140 205 160 205 178', ease: 'elastic.out(1, 0.5)' });
        return next;
      });
    };
    const draggable = Draggable.create(handle, {
      type: 'y', bounds: { minY: 0, maxY: 92 },
      onPress() { playPullSound(); gsap.to(rope, { duration: 0.18, morphSVG: 'M205 119 C194 142 216 162 205 190', ease: 'power2.out' }); },
      onDragEnd() {
        const pulled = Math.abs(this.y) > 50;
        setLampState(pulled ? !isOnRef.current : isOnRef.current);
        gsap.to(this.target, { duration: 0.55, y: 0, ease: 'elastic.out(1, 0.45)' });
      },
      onRelease() { gsap.to(rope, { duration: 0.45, morphSVG: 'M205 119 C205 140 205 160 205 178', ease: 'elastic.out(1, 0.45)' }); },
    });
    return () => draggable.forEach((instance) => instance.kill());
  }, []);

  useEffect(() => { isOnRef.current = isOn; }, [isOn]);

  useEffect(() => {
    const root = lampRootRef.current;
    if (!root) return;
    gsap.fromTo(root.querySelector('.lamp-stand'), { rotate: -2 }, { rotate: 2, duration: 3.8, repeat: -1, yoyo: true, ease: 'sine.inOut' });
  }, []);

  if (existing && existing.expiresAt > Date.now()) return <Navigate to="/app/wb_my_tasks" replace />;
  const submit = async () => {
    setLoading(true); setError('');
    try { await devLogin(username); navigate('/app/wb_my_tasks', { replace: true }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '本地登录失败'); }
    finally { setLoading(false); }
  };

  return (
    <main className={`login-scene ${isOn ? 'is-lit' : ''}`} style={{ '--shade-hue': shadeHue } as CSSProperties}>
      <div className="login-grid" aria-hidden="true" />
      <div className="login-shell">
        <section className="lamp-panel" ref={lampRootRef} style={{ '--on': isOn ? 1 : 0, '--shade-hue': shadeHue } as CSSProperties}>
          <div className="lamp-glow" /><div className="lamp-copy"><span className="eyebrow"><Zap size={13} /> SC DIGITAL WORKSPACE</span><h1>让每一次协作<br /><span>都被看见</span></h1><p>点亮台灯，进入师创管理后台。</p></div>
          <div className="lamp-art" aria-label="可拖拽拉绳切换台灯">
            <svg viewBox="0 0 280 330" role="img" aria-label={isOn ? '台灯已开启' : '拖拽拉绳开启台灯'}>
              <defs><linearGradient id="lamp-metal" x1="0" x2="1"><stop offset="0" stopColor="#273446" /><stop offset="0.5" stopColor="#9aaac0" /><stop offset="1" stopColor="#1a2637" /></linearGradient><radialGradient id="lamp-light"><stop stopColor="hsl(var(--shade-hue) 95% 75% / .8)" /><stop offset="1" stopColor="hsl(var(--shade-hue) 90% 55% / 0)" /></radialGradient></defs>
              <ellipse className="lamp-beam" cx="145" cy="175" rx="122" ry="108" fill="url(#lamp-light)" />
              <g className="lamp-stand" style={{ transformOrigin: '145px 205px' }}>
                <path d="M145 119 L145 272" stroke="#71839a" strokeWidth="7" strokeLinecap="round" />
                <path d="M93 286 Q145 266 197 286" fill="none" stroke="url(#lamp-metal)" strokeWidth="9" strokeLinecap="round" />
                <ellipse cx="145" cy="286" rx="54" ry="10" fill="#182536" stroke="#3d4c60" strokeWidth="2" />
                <path d="M65 119 Q65 30 145 30 Q225 30 225 119 Q145 143 65 119 Z" fill="hsl(var(--shade-hue) 72% 32%)" stroke="hsl(var(--shade-hue) 85% 68% / .85)" strokeWidth="3" />
                <path d="M70 118 Q145 96 220 118 Q145 139 70 118 Z" fill="hsl(var(--shade-hue) 96% 68% / calc(.15 + var(--on) * .7))" />
                <ellipse cx="145" cy="119" rx="77" ry="13" fill="none" stroke="hsl(var(--shade-hue) 88% 75% / .85)" strokeWidth="2" />
                <g className="lamp-eyes" transform={isOn ? 'rotate(0 145 86)' : 'rotate(180 145 86)'}><circle cx="128" cy="84" r="4" fill="#07101c" /><circle cx="162" cy="84" r="4" fill="#07101c" /><path d="M133 97 Q145 106 157 97" fill="none" stroke="#07101c" strokeWidth="3" strokeLinecap="round" /></g>
              </g>
              <path ref={ropeBaseRef} d="M205 119 C205 140 205 160 205 178" fill="none" stroke="transparent" strokeWidth="2" /><path ref={ropePathRef} d="M205 119 C205 140 205 160 205 178" fill="none" stroke="#b8c7d9" strokeWidth="2" strokeDasharray="3 4" /><circle cx="205" cy="120" r="4" fill="#dbeafe" />
            </svg><button ref={ropeHandleRef} type="button" className="rope-handle" aria-label="拖拽拉绳切换台灯"><span /></button><span className="rope-hint">向下拖拽拉绳</span>
          </div><div className="lamp-status"><span className="status-dot" /> {isOn ? '照明已开启' : '灯光已关闭'} · {isOn ? '欢迎回来' : '拉动拉绳开始'}</div>
        </section>
        <section className={`login-card ${isOn ? 'login-card-visible' : ''}`} aria-live="polite">
          <div className="login-card-header"><div className="brand-mark">SC</div><div><span className="card-kicker">SECURE ACCESS</span><h2>欢迎回来</h2><p>登录以继续你的工作空间</p></div></div>
          <div className="mode-switch" role="tablist" aria-label="登录方式"><button type="button" role="tab" aria-selected={loginMode === 'account'} className={loginMode === 'account' ? 'active' : ''} onClick={() => setLoginMode('account')}><UserRound size={15} />账号登录</button><button type="button" role="tab" aria-selected={loginMode === 'wechat'} className={loginMode === 'wechat' ? 'active' : ''} onClick={() => setLoginMode('wechat')}><MessageCircle size={15} />企业微信扫码</button></div>
          {loginMode === 'account' ? <form className="login-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}><label>账号<input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="输入账号" autoComplete="username" /><UserRound size={16} /></label><label>密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="输入密码" autoComplete="current-password" /><LockKeyhole size={16} /></label><div className="account-quick-picks">{accounts.map((account) => <button key={account.username} type="button" onClick={() => setUsername(account.username)} className={username === account.username ? 'selected' : ''}>{account.username}</button>)}</div><button className="login-submit" type="submit" disabled={loading}>{loading ? '正在进入...' : '进入工作空间'}<Zap size={16} /></button>{error && <p className="login-error" role="alert">{error}</p>}</form> : <div className="wechat-panel"><div className="qr-frame"><QrCode size={116} strokeWidth={1.4} /><span>企业微信</span></div><strong>使用企业微信扫一扫</strong><p>扫码后将在当前浏览器完成身份确认</p><button type="button" onClick={() => setLoginMode('account')}><Building2 size={14} />返回账号登录</button></div>}
          <footer className="login-footer">师创管理后台 · 本地开发环境 <span>V4.2</span></footer>
        </section>
      </div>
    </main>
  );
}
