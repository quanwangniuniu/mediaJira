import React from 'react';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import AutomatedEfficiencySection from '../../components/home/AutomatedEfficiencySection';
import CtaSection from '../../components/home/CtaSection';
import FooterSection from '../../components/home/FooterSection';
import HeaderSection from '../../components/home/HeaderSection';
import HeroSection from '../../components/home/HeroSection';
import HowItWorksSection from '../../components/home/HowItWorksSection';
import InsightfulAnalyticsSection from '../../components/home/InsightfulAnalyticsSection';
import SmartWorkflowSection from '../../components/home/SmartWorkflowSection';
import TestimonialsSection from '../../components/home/TestimonialsSection';
import UnifiedNotificationsSection from '../../components/home/UnifiedNotificationsSection';
import UserPermissionSection from '../../components/home/UserPermissionSection';
import VisualizeCampaignsSection from '../../components/home/VisualizeCampaignsSection';
import WhyMediaJiraSection from '../../components/home/WhyMediaJiraSection';

const mockRouter = {
  back: () => {},
  forward: () => {},
  prefetch: async () => {},
  push: () => {},
  refresh: () => {},
  replace: () => {},
};

const meta = {
  title: 'Home/FullPage',
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: true,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'Full home page layout.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  render: () => {
    const handleLoginClick = () => {};
    const handleGetStartedClick = () => {};
    const redirectToLogin = () => {};

    return (
      <AppRouterContext.Provider value={mockRouter}>
        <div
          onClickCapture={(event) => {
            const target = event.target as HTMLElement | null;
            const clickable = target?.closest?.('a, button');
            if (clickable) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
            <HeaderSection
              isAuthenticated={false}
              displayName="User"
              displayRole="Member"
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
            <CtaSection
              onGetStartedClick={handleGetStartedClick}
              onRedirectToLogin={redirectToLogin}
            />
            <FooterSection />
          </div>
        </div>
      </AppRouterContext.Provider>
    );
  },
};
