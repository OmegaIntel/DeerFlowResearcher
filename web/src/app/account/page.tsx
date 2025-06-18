'use client';

import { useState, useEffect } from 'react';
import { AccountTabs } from './AccountTabs';

export default function AccountPage() {
  const [initialTab, setInitialTab] = useState('profile');

  useEffect(() => {
    // Only access search params on client side
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get('tab');
    if (tab && ['profile', 'integrations', 'notifications', 'danger'].includes(tab)) {
      setInitialTab(tab);
    }
  }, []);

  return <AccountTabs initialTab={initialTab} />;
}