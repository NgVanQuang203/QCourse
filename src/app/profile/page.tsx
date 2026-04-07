import { Suspense } from 'react';
import ProfilePageInner from './ProfilePageInner';

export default function ProfilePage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100svh - var(--nav-height))' }}>Đang tải...</div>}>
      <ProfilePageInner />
    </Suspense>
  );
}
