'use client'

import React from 'react';
import { useAuthStore } from '../lib/authStore';
import HeaderSection from '../components/home/HeaderSection';
import HeroSection from '../components/home/HeroSection';
import WhyMediaJiraSection from '../components/home/WhyMediaJiraSection';
import UserPermissionSection from '../components/home/UserPermissionSection';
import SmartWorkflowSection from '../components/home/SmartWorkflowSection';
import VisualizeCampaignsSection from '../components/home/VisualizeCampaignsSection';
import AutomatedEfficiencySection from '../components/home/AutomatedEfficiencySection';
import UnifiedNotificationsSection from '../components/home/UnifiedNotificationsSection';
import InsightfulAnalyticsSection from '../components/home/InsightfulAnalyticsSection';
import HowItWorksSection from '../components/home/HowItWorksSection';
import TestimonialsSection from '../components/home/TestimonialsSection';
import CtaSection from '../components/home/CtaSection';
import FooterSection from '../components/home/FooterSection';

export default function Page() {
  const { initialized, isAuthenticated, user } = useAuthStore();

  const redirectToLogin = () => {
    window.location.href = '/login';
  };

  const handleLoginClick = () => {
    if (!initialized) return;
    if (isAuthenticated) {
      window.location.href = '/profile';
      return;
    }
    window.location.href = '/login';
  };

  const handleGetStartedClick = () => {
    if (!initialized) return;
    if (isAuthenticated) {
      window.location.href = '/tasks';
      return;
    }
    window.location.href = '/login';
  };

  const displayName = user?.username || user?.email || 'User';
  const displayRole = user?.roles?.[0] || 'Member';

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <HeaderSection
        isAuthenticated={isAuthenticated}
        displayName={displayName}
        displayRole={displayRole}
        onLoginClick={handleLoginClick}
        onGetStartedClick={handleGetStartedClick}
        onRedirectToLogin={redirectToLogin}
      />
      <HeroSection onGetStartedClick={handleGetStartedClick} />
      <WhyMediaJiraSection />
      <UserPermissionSection onRedirectToLogin={redirectToLogin} />
      <SmartWorkflowSection onRedirectToLogin={redirectToLogin} />
      <VisualizeCampaignsSection onRedirectToLogin={redirectToLogin} />
      <AutomatedEfficiencySection />
      <UnifiedNotificationsSection onRedirectToLogin={redirectToLogin} />
      <InsightfulAnalyticsSection onRedirectToLogin={redirectToLogin} />
      <HowItWorksSection onGetStartedClick={handleGetStartedClick} />
      <TestimonialsSection onRedirectToLogin={redirectToLogin} onGetStartedClick={handleGetStartedClick} />
      <CtaSection onGetStartedClick={handleGetStartedClick} onRedirectToLogin={redirectToLogin} />
      <FooterSection />
    </div>
  );
}
