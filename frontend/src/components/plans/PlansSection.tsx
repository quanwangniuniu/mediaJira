'use client';

import { useState } from 'react';
import OrganizationPlans from './OrganizationPlans';

export default function PlansSection() {
  const [selectedPlan, setSelectedPlan] = useState<'organization' | 'workspace'>('organization');
  const [billingFrequency, setBillingFrequency] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div>
      {/* Page Header */}
      <div className="plan-header py-[clamp(3rem,calc((3-((5-3)/(90-20))*20)*1rem+((5-3)/(90-20))*100vw),5rem)]">
        <div className="plan-header-container max-w-[1440px] w-[90%] mx-auto">
          <div className="max-w-[80ch]">
            <p className="font-medium text-[#5a5a5a] mb-[clamp(calc(.625*1rem),calc((.625-((1-.625)/(90-20)*20))*1rem+((1-.625)/(90-20))*100vw),1rem)] text-[clamp(calc(1.125*1rem),calc((1.125-((1.25-1.125)/(90-20)*20))*1rem+((1.25-1.125)/(90-20))*100vw),1.25rem)] transform-gpu will-change-[transform,opacity]" style={{ animationName: 'scale', animationDuration: '0.75s', animationDelay: '0s', animationFillMode: 'both', animationTimingFunction: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)' }}>Our pricing</p>
            <h1 className="font-semibold leading-[1.04] text-[clamp(calc(2.75*1rem),calc((2.75-((5-2.75)/(90-20)*20))*1rem+((5-2.75)/(90-20))*100vw),5rem)] transform-gpu will-change-[transform,opacity]" style={{ fontFamily: "'WF Visual Sans Variable', Arial, sans-serif", animationName: 'scale', animationDuration: '1.2s', animationDelay: '0.3s', animationFillMode: 'both', animationTimingFunction: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)' }}>Get started with Media Jira</h1>
          </div>
        </div>
      </div>
      <div className='sticky top-[85px] z-50 bg-white border-b border-gray-300'>
        <div className='plan-sub-menu h-[4.25rem] w-auto'>
          <div className='flex items-center justify-between px-[6vw] w-auto h-[4.25rem]'>
            {/* Plan Type Selector */}
            <div className='flex items-center gap-6 h-full'>
              <button
                onClick={() => setSelectedPlan('organization')}
                className={`text-base font-normal flex items-center h-full border-b-2 transition-colors ${selectedPlan === 'organization'
                  ? 'text-blue-600 border-blue-600'
                  : 'hover:text-blue-700 border-transparent'
                  }`}
              >
                Organization plans
              </button>
              <button
                onClick={() => setSelectedPlan('workspace')}
                className={`text-base font-normal flex items-center h-full border-b-2 transition-colors ${selectedPlan === 'workspace'
                  ? 'text-blue-600 border-blue-600'
                  : ' hover:text-blue-700 border-transparent'
                  }`}
              >
                Workspace plans
              </button>
            </div>

            {/* Divider */}
            <div className='hidden md:block h-4 w-px bg-gray-300'></div>

            {/* Billing Frequency Toggle */}
            <div className='flex items-center gap-3'>
              <span className={`text-base font-medium transition-colors ${billingFrequency === 'monthly' ? '' : 'text-gray-600'
                }`}>Monthly</span>
              <button
                onClick={() => setBillingFrequency(billingFrequency === 'monthly' ? 'yearly' : 'monthly')}
                className={`relative w-12 h-6 rounded-full transition-colors ${billingFrequency === 'monthly' ? 'bg-gray-400' : 'bg-blue-600'
                  }`}
              >
                <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full transition-transform ${billingFrequency === 'yearly' ? 'right-1' : 'left-1'
                  }`}></div>
              </button>
              <span className={`text-base font-medium transition-colors ${billingFrequency === 'yearly' ? '' : 'text-gray-600'
                }`}>Yearly (Save up to 33%)</span>
            </div>
          </div>
        </div>
      </div>
      <OrganizationPlans />
    </div>
  );
}


