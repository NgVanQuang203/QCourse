// src/app/auth/error/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  let errorMessage = 'Đã xảy ra lỗi không xác định.';

  if (error === 'Configuration') {
    errorMessage = 'Lỗi cấu hình (Configuration): Trang web thiếu Google Client ID/Secret trong thiết lập biến môi trường (Environment Variables) hoặc URL không khớp.';
  } else if (error === 'AccessDenied') {
    errorMessage = 'Bạn đã từ chối cấp quyền hoặc bị chặn đăng nhập.';
  } else if (error === 'Verification') {
    errorMessage = 'Liên kết xác thực đã hết hạn hoặc đã được sử dụng.';
  }

  return (
    <div style={{ padding: '8rem 2rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ color: '#ef4444', marginBottom: '1rem' }}>Lỗi đăng nhập!</h1>
      <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
        {errorMessage}
      </p>
      <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', textAlign: 'left', fontSize: '0.9rem' }}>
        <p><strong>Mã lỗi gốc:</strong> {error || 'Không rõ'}</p>
      </div>
      <Link href="/auth/login" style={{ padding: '0.75rem 1.5rem', background: 'var(--primary-color)', color: 'white', borderRadius: '8px', textDecoration: 'none' }}>
        Quay lại Đăng nhập
      </Link>
    </div>
  );
}
