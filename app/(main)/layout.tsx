// File: app/(main)/layout.tsx

import { ConditionalLayoutWrapper } from '@/components/conditional-layout';
import { AuthGuard } from '@/components/auth-guard';
import React from 'react';

export default function MainAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ConditionalLayoutWrapper>
        {children}
      </ConditionalLayoutWrapper>
    </AuthGuard>
  );
}
