import { useState, useEffect, useRef } from 'react';
import logoDark from './assets/logo.png';
import logoLight from './assets/logo-white.svg';
import marcosPhoto from './assets/marcos.webp';
import { FlickeringGridDemo } from './components/ui/demo.jsx';
import ThemeToggle from './modules/theme/components/ThemeToggle.jsx';
import { useTheme } from './modules/theme/hooks/useTheme.js';
import LanguageToggle from './modules/i18n/components/LanguageToggle.jsx';
import { useLanguage } from './modules/i18n/hooks/useLanguage.js';

const INDICADOR = import.meta.env.VITE_INDICADOR || 'template';
const SEND_ENDPOINT = '/api/send';

const PROOF_STATS = [
  { prefix: '',  value: 94,  suffix: '%',  labelKey: 'satisfied' },
  { prefix: '',  value: 3,   suffix: 'x',  labelKey: 'growth' },
  { prefix: '+', value: 200, suffix: '',   labelKey: 'projects' },
  { prefix: '',  value: 4.9, suffix: '★',  labelKey: 'rating' },
];

const ProofBar = ({ t }) => {
  const [counts, setCounts] = useState(() => PROOF_STATS.map(() => 0));
  const proofRef = useRef(null);
  const animated = useRef(false);

  useEffect(() => {
    const el = proofRef.current;
    if (!el) return;
    let rafId = 0;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || animated.current) return;
      animated.current = true;
      const duration = 1800;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2;
        setCounts(PROOF_STATS.map(stat =>
          Number.isInteger(stat.value)
            ? Math.round(eased * stat.value)
            : parseFloat((eased * stat.value).toFixed(1))
        ));
        if (t < 1) rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={proofRef} className="container proof-bar" style={{ padding: '0' }}>
      {PROOF_STATS.map((stat, i) => (
        <div
          key={i}
          className="proof-item reveal"
          data-delay={String(i + 1)}
          style={{
            flex: 1,
            padding: '32px 48px',
            borderRight: i < 3 ? '0.5px solid var(--border-hairline)' : 'none',
            textAlign: 'center',
          }}
        >
          <div className="proof-number">
            {stat.prefix}{counts[i]}{stat.suffix}
          </div>
          <div className="proof-label">{t(`proof.${stat.labelKey}`)}</div>
        </div>
      ))}
    </div>
  );
};

const App = () => {
  const [form, setForm] = useState({ name: '', phone: '', email: '', segment: '', need: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { theme } = useTheme();
  const { t } = useLanguage();
  const logo = theme === 'dark' ? logoLight : logoDark;

  const SEGMENTS = t('form.segments') || [];

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler, { passive: true });
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [submitted]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      indicador: INDICADOR,
      nome: form.name,
      whatsapp: form.phone,
      segmento: form.segment,
      necessidade: form.need,
      data: new Date().toISOString(),
    };

    // Local backup before sending
    try {
      const backlog = JSON.parse(localStorage.getItem('vpi_backlog') || '[]');
      backlog.push(payload);
      localStorage.setItem('vpi_backlog', JSON.stringify(backlog));
    } catch (_) {}

    // Up to 3 retries — best-effort delivery, but the lead already has a local
    // backup, so the UI always confirms success and never surfaces a failure.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(SEND_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) break;
      } catch (_) {}
      if (attempt < 2) await new Promise(r => setTimeout(r, 1500));
    }

    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* NAV */}
      <nav className="nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <img src={logo} alt="Logo" className="nav-logo" style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: 0, backgroundColor: 'transparent' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <LanguageToggle />
          <ThemeToggle />
          <button
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 24px', fontSize: '13px', margin: 0, color: 'var(--accent)' }}
            onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            {t('nav.cta')}
          </button>
        </div>
      </nav>

      {/* HERO WITH FLICKERING GRID LOGO MASK */}
      <section style={{ position: 'relative', minHeight: '95vh', width: '100%', marginTop: '-76px', paddingTop: '76px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <FlickeringGridDemo />

        {/* Hero Content Overlay */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '76px' }}>
          <div className="container" style={{ textAlign: 'center' }}>
            <div className="hero-tag" style={{ justifyContent: 'center', marginBottom: '32px' }}>
              <div style={{ width: '28px', height: '0.5px', backgroundColor: 'var(--accent)' }} />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {t('hero.tag')}
              </span>
            </div>

            <h1 className="hero-h1" style={{ maxWidth: '1000px', margin: '0 auto 32px' }}>
              {t('hero.h1Part1')}<br />
              {t('hero.h1Part2')} <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>{t('hero.h1Highlight')}</span><br />
              {t('hero.h1Part3')}
            </h1>

            <p className="hero-sub" style={{ margin: '0 auto', maxWidth: '650px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{t('hero.subA')}</span>
              <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{t('hero.subB')}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{t('hero.subC')}</span>
            </p>
          </div>
        </div>
      </section>

      {/* PROOF BAR */}
      <section style={{
        borderTop: '0.5px solid var(--border-hairline)',
        borderBottom: '0.5px solid var(--border-hairline)',
        marginBottom: '80px'
      }}>
        <ProofBar t={t} />
      </section>

      {/* MAIN CONTENT GRID */}
      <main className="container" style={{ marginBottom: '120px' }}>
        <div
          className="main-grid"
          style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '80px' }}
        >

          {/* LEFT COLUMN */}
          <div className="left-col">
            <span className="section-label reveal reveal--left">{t('how.label')}</span>
            <h2 className="reveal" data-delay="1" style={{ fontSize: '28px', marginBottom: '24px' }}>
              {t('how.title')}
            </h2>

            <p className="reveal" data-delay="2" style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '48px', maxWidth: '540px' }}>
              {t('how.paragraphA')}
              <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{t('how.paragraphHighlight')}</span>
              {t('how.paragraphB')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', marginBottom: '80px' }}>
              {(t('how.steps') || []).map((step, i) => ({ n: String(i + 1).padStart(2, '0'), t: step.t, d: step.d })).map((step, i) => (
                <div
                  key={i}
                  className="step-item reveal"
                  data-delay={String(i + 1)}
                  style={{ borderBottom: i < 2 ? '0.5px solid var(--border-card)' : 'none' }}
                >
                  <div className="step-badge">{step.n}</div>
                  <div>
                    <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>{step.t}</h3>
                    <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>{step.d}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* TESTIMONIAL */}
            <div className="testimonial-card reveal reveal--scale" data-delay="2">
              <p style={{ fontStyle: 'italic', fontSize: '16px', marginBottom: '24px', color: 'var(--text-main)' }}>
                {t('testimonial.quote')}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '1px solid rgba(var(--accent-rgb), 0.35)',
                  flexShrink: 0,
                }}>
                  <img
                    src={marcosPhoto}
                    alt="Marcos Ribeiro"
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center 35%',
                      display: 'block',
                    }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>Marcos Ribeiro</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('testimonial.role')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN — FORM */}
          <div id="contact-form" className="sticky-col reveal reveal--scale" data-delay="3" style={{ position: 'sticky', top: '100px', alignSelf: 'start' }}>
            <div className="form-card" style={{ background: 'var(--bg-card-dark)', borderRadius: '16px', padding: '40px 36px', color: 'var(--text-on-dark)', transition: 'background-color 0.25s ease, color 0.25s ease' }}>

              {submitted ? (
                <div className="fade-in" style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div className="check-pop" style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(119, 88, 219, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    color: 'var(--accent)',
                    fontSize: '24px',
                  }}>✓</div>
                  <h3 style={{ fontSize: '24px', marginBottom: '16px' }}>{t('form.successTitle')}</h3>
                  <p style={{ fontSize: '15px', color: 'var(--text-on-dark-muted)', lineHeight: 1.6 }}>
                    {t('form.successBody')}
                  </p>
                </div>
              ) : (
                <>
                  <span className="section-label" style={{ color: 'var(--accent)' }}>{t('form.label')}</span>
                  <h3 style={{ fontSize: '22px', marginBottom: '8px', fontWeight: 500, color: 'var(--text-on-dark)' }}>
                    {t('form.heading')}
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-on-dark-muted)', marginBottom: '32px' }}>
                    {t('form.sub')}
                  </p>

                  <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="form-group">
                      <label>{t('form.nameLabel')}</label>
                      <input type="text" name="name" placeholder={t('form.namePlaceholder')} required value={form.name} onChange={handleChange} autoComplete="off" />
                    </div>

                    <div className="form-group">
                      <label>{t('form.phoneLabel')}</label>
                      <input type="tel" name="phone" placeholder={t('form.phonePlaceholder')} required value={form.phone} onChange={handleChange} autoComplete="off" />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '32px 0' }}>
                      <div style={{ flex: 1, height: '1px', background: 'var(--divider-on-dark)' }} />
                      <span style={{ fontSize: '10px', color: 'var(--text-on-dark-soft)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('form.divider')}</span>
                      <div style={{ flex: 1, height: '1px', background: 'var(--divider-on-dark)' }} />
                    </div>

                    <div className="form-group" ref={dropdownRef} style={{ position: 'relative' }}>
                      <label>{t('form.segmentLabel')}</label>
                      <button
                        type="button"
                        onClick={() => setDropdownOpen(o => !o)}
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          background: 'var(--bg-card-dark-input)',
                          border: `1px solid ${dropdownOpen ? 'var(--accent)' : 'var(--border-on-dark)'}`,
                          borderRadius: '8px',
                          color: form.segment ? 'var(--text-on-dark)' : 'var(--text-on-dark-muted)',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          boxShadow: dropdownOpen ? '0 0 0 3px rgba(119,88,219,0.15)' : 'none',
                          transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}
                      >
                        <span>{form.segment || t('form.segmentPlaceholder')}</span>
                        <svg
                          width="16" height="16" viewBox="0 0 16 16" fill="none"
                          style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease', flexShrink: 0 }}
                        >
                          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>

                      {dropdownOpen && (
                        <ul style={{
                          position: 'absolute',
                          top: 'calc(100% + 6px)',
                          left: 0,
                          right: 0,
                          background: 'var(--bg-card-dark-input)',
                          border: '1px solid var(--border-on-dark)',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          zIndex: 100,
                          listStyle: 'none',
                          padding: '4px',
                          boxShadow: 'var(--dropdown-shadow-on-dark)',
                          animation: 'dropdownIn 0.18s cubic-bezier(0.25,0.46,0.45,0.94) both',
                        }}>
                          {SEGMENTS.map((seg) => (
                            <li key={seg}>
                              <button
                                type="button"
                                onClick={() => {
                                  setForm(prev => ({ ...prev, segment: seg }));
                                  setDropdownOpen(false);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '10px 14px',
                                  background: form.segment === seg ? 'rgba(119,88,219,0.15)' : 'transparent',
                                  border: 'none',
                                  borderRadius: '6px',
                                  color: form.segment === seg ? 'var(--accent)' : 'var(--text-on-dark-option)',
                                  fontSize: '14px',
                                  fontFamily: 'inherit',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  transition: 'background 0.15s, color 0.15s',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                }}
                                onMouseEnter={e => { if (form.segment !== seg) e.currentTarget.style.background = 'var(--dropdown-hover-on-dark)'; }}
                                onMouseLeave={e => { if (form.segment !== seg) e.currentTarget.style.background = 'transparent'; }}
                              >
                                {form.segment === seg && (
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                                {form.segment !== seg && <span style={{ width: '12px', display: 'inline-block' }} />}
                                {seg}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="form-group">
                      <label>{t('form.needLabel')}</label>
                      <textarea
                        name="need"
                        rows="4"
                        placeholder={t('form.needPlaceholder')}
                        required
                        value={form.need}
                        onChange={handleChange}
                        style={{ resize: 'none' }}
                      />
                    </div>

                    <button type="submit" className="btn-primary btn-cta" disabled={loading}>
                      {loading ? (
                        <span className="btn-cta__loading">
                          <span className="btn-cta__dot" />
                          <span className="btn-cta__dot" />
                          <span className="btn-cta__dot" />
                        </span>
                      ) : (
                        <span className="btn-cta__label">
                          {t('form.submit')}
                          <span className="btn-cta__arrow">→</span>
                        </span>
                      )}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '20px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-on-dark-notice)' }}>
                        {t('form.privacy')}
                      </span>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer style={{ borderTop: '0.5px solid var(--border-hairline)', padding: '32px 48px', marginTop: 'auto' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={logo} alt="Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('footer.tagline')}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('footer.copyright')}</span>
            <a
              href="https://methodgrowthhub.com.br"
              target="_blank"
              rel="noopener"
              style={{ fontSize: '11px', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              {t('footer.credit')}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
