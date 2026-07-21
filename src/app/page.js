import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navigation Header */}
      <header className="navbar">
        <div className="logo-section">
          <div className="logo-icon">🧩</div>
          <span className="logo-text">SimAutism</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/login" className="btn btn-outline" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}>
            Sign In
          </Link>
          <Link href="/login" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}>
            Get Started
          </Link>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        
        {/* Hero Section */}
        <section className="hero-grid">
          <div>
            {/* Decorative Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'var(--primary-glow)',
              border: '1px solid rgba(5, 150, 105, 0.2)',
              borderRadius: '9999px',
              color: 'var(--primary)',
              fontSize: '0.85rem',
              fontWeight: '600',
              marginBottom: '1.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              🧩 Observational Assessment Portal
            </div>

            <h1 style={{
              fontSize: '3.25rem',
              lineHeight: '1.15',
              marginBottom: '1.5rem',
              background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--primary) 80%, var(--secondary) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: '800'
            }}>
              Empowering Families & Clinicians in Autism Assessment
            </h1>
            
            <p style={{
              fontSize: '1.15rem',
              color: 'var(--text-secondary)',
              marginBottom: '2.5rem',
              lineHeight: '1.7',
              maxWidth: '600px'
            }}>
              A secure, HIPAA-aligned platform connecting parents and AI evaluators. Upload observation videos, track development stages, and collaborate on structured assessment reports with full data protection.
            </p>

            {/* Portals Access Links */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '2.5rem'
            }}>
              <Link href="/login" className="btn btn-primary" style={{ padding: '1rem 2.25rem', fontSize: '1.05rem' }} id="btn-login-portal">
                Parent & AI Portal
              </Link>
              <Link href="/admin/login" className="btn btn-outline" style={{ padding: '1rem 2.25rem', fontSize: '1.05rem' }} id="btn-admin-portal">
                Admin Dashboard
              </Link>
            </div>

            {/* Trust Badges */}
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>🛡️ HIPAA Aligned Storage</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>🔒 Secure Video Encryption</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>👥 Guided Care Team</span>
            </div>
          </div>

          {/* Right Column: Hero Image */}
          <div className="float-animation" style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="hero-image-container">
              <Image 
                src="/autism_hero_play.png" 
                alt="Child playing with developmental puzzle blocks" 
                width={500} 
                height={500} 
                priority
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
          </div>
        </section>

        {/* Dynamic Cards Layout */}
        <section style={{ marginBottom: '5rem' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2.25rem', marginBottom: '1rem' }}>Tailored Portals for Collaborative Care</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
            SimAutism bridges the gap between home observations and clinical assessments through a secure digital workflow.
          </p>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2rem',
            textAlign: 'left'
          }}>
            
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📹</div>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.4rem' }}>For Parents & Guardians</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                  Record and securely upload observational videos of your child in comfortable, natural environments. Communicate with assigned clinicians and receive detailed developmental recommendations.
                </p>
              </div>
              <Link href="/login" style={{ fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)' }}>
                Access Parent Portal →
              </Link>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🩺</div>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.4rem' }}>For AI Assessment</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                  Review parent-submitted observation videos using professional timeline tools. Add time-stamped clinical notes, rate assessment metrics, and build customized reports efficiently.
                </p>
              </div>
              <Link href="/login" style={{ fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)' }}>
                Access AI Portal →
              </Link>
            </div>

          </div>
        </section>

        {/* Detailed Benefits Section */}
        <section className="features-section">
          {/* Left: Illustration */}
          <div className="float-animation" style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="hero-image-container" style={{ maxWidth: '420px' }}>
              <Image 
                src="/autism_observation.png" 
                alt="Psychologist observing children play developmental games" 
                width={450} 
                height={450}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
          </div>

          {/* Right: Feature items */}
          <div>
            <h2 style={{ fontSize: '2.25rem', marginBottom: '1.5rem', lineHeight: '1.2' }}>Professional & Structured Observation Review</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', lineHeight: '1.7' }}>
              Our platform allows clinical teams to perform systematic video evaluations with timeline annotations, removing the friction of long hospital waits and unfamiliar settings for sensitive children.
            </p>

            <div className="feature-item">
              <div className="feature-icon-wrapper">✓</div>
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Time-seekable Video Annotations</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Clinicians can add timestamped notes linked directly to specific observation moments.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-wrapper">✓</div>
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Secure Messaging & Notification Center</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Real-time coordination and feedback loops keep parents updated on review status changes.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-wrapper">✓</div>
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Structured Diagnostic Support</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Access detailed audit trails, review histories, and developmental questionnaire results.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Disclaimer Section */}
        <section style={{ marginBottom: '5rem' }}>
          <div style={{
            background: 'rgba(245, 158, 11, 0.05)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: 'var(--border-radius-md)',
            padding: '2rem',
            color: '#d97706',
            fontSize: '0.95rem',
            textAlign: 'left',
            lineHeight: '1.6',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h4 style={{ color: '#b45309', fontSize: '1.1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚠️ Clinical Observation Disclaimer
            </h4>
            This platform is designed solely for observation hosting and AI review support. It does not offer automated diagnostics. Official autism spectrum diagnosis must be verified through clinical sessions with qualified medical professionals.
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer style={{
        padding: '3rem 0 2rem 0',
        borderTop: '1px solid var(--border-color)',
        color: 'var(--text-muted)',
        fontSize: '0.9rem',
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div>
          <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>🧩 SimAutism Assessment Portal</div>
          <p style={{ fontSize: '0.825rem' }}>Connecting clinical observation and supportive guidance safely.</p>
        </div>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div>
            <div style={{ fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Portals</div>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li><Link href="/login" style={{ fontSize: '0.825rem' }}>Parent Portal</Link></li>
              <li><Link href="/login" style={{ fontSize: '0.825rem' }}>AI Portal</Link></li>
              <li><Link href="/admin/login" style={{ fontSize: '0.825rem' }}>Admin Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <div style={{ fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Security</div>
            <p style={{ fontSize: '0.825rem', maxWidth: '200px' }}>HIPAA compliance, SSL/TLS, and database level security controls.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
