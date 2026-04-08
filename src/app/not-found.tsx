"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 'calc(100vh - var(--nav-height))', padding: '2rem', textAlign: 'center',
      background: 'var(--background)'
    }}>
      <div style={{
        position: 'relative', width: '220px', height: '220px', marginBottom: '2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))',
          filter: 'blur(30px)', animation: 'pulse 3s infinite alternate'
        }} />
        <span style={{ fontSize: '7rem', position: 'relative', zIndex: 1, textShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
          🛸
        </span>
      </div>

      <h1 style={{
        fontSize: '4rem', fontWeight: 900, margin: '0 0 0.5rem',
        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        letterSpacing: '-2px'
      }}>
        404
      </h1>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)', marginBottom: '1rem' }}>
        Lạc trôi đâu đó rồi...
      </h2>

      <p style={{
        maxWidth: '400px', fontSize: '0.95rem', color: 'var(--foreground)', opacity: 0.6,
        lineHeight: 1.6, marginBottom: '2.5rem'
      }}>
        Trang bạn đang tìm kiếm dường như không tồn tại hoặc đã bị di dời. Hãy kiểm tra lại đường dẫn nhé.
      </p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => router.back()}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.8rem 1.5rem', borderRadius: '12px',
            background: 'var(--surface)', border: '1.5px solid var(--border)',
            color: 'var(--foreground)', fontSize: '0.95rem', fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <ArrowLeft size={18} /> Quay lại
        </button>

        <Link
          href="/"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.8rem 1.75rem', borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))', border: 'none',
            color: 'white', fontSize: '0.95rem', fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(99,102,241,0.4)', transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <Home size={18} /> Trang chủ
        </Link>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.6; }
          100% { transform: scale(1.1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
