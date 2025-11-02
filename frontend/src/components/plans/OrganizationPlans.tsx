'use client';

import { useState } from 'react';
import PlanCard from './PlanCard';
import usePlan from '@/hooks/usePlan';
import { useAuthStore } from '@/lib/authStore';

export default function OrganizationPlans() {
  const [isExpanded, setIsExpanded] = useState(true);
  const { plans, loading, error, handleSubscribe } = usePlan();
  const user = useAuthStore((state) => state.user);
  const currentPlanId = user?.organization?.plan_id;

  return (
    <div className='organization-plans py-[clamp(3*1rem,((3-((5-3)/(90-20)*20))*1rem+((5-3)/(90-20))*100vw),5*1rem)]'>
      <section>
        {/* Organization Header */}
        <div className='max-w-[calc(90*1rem)] w-[90%] mx-auto'>
          <div className="flex items-center justify-start gap-[clamp(.625*1rem,((.625-((1-.625)/(90-20)*20))*1rem+((1-.625)/(90-20))*100vw),1*1rem)] py-[clamp(1.25*1rem,((1.25-((1.5-1.25)/(90-20)*20))*1rem+((1.5-1.25)/(90-20))*100vw),1.5*1rem)]">
            <h2 className="font-semibold text-[clamp(2*1rem,((2-((3.5-2)/(90-20)*20))*1rem+((3.5-2)/(90-20))*100vw),3.5*1rem)]" style={{ fontFamily: "'WF Visual Sans Variable', Arial, sans-serif" }}>Organization plans</h2>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-center w-8 h-8"
            >
              <div className="relative w-5 h-5">
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Horizontal line (stays fixed) */}
                  <line x1="4" y1="10" x2="16" y2="10" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                  {/* Second line: starts horizontal, rotates 90deg clockwise when expanded */}
                  <g style={{
                    transformOrigin: '10px 10px',
                    transition: 'transform 0.3s',
                    transform: isExpanded ? 'rotate(0deg)' : 'rotate(90deg)'
                  }}>
                    <line
                      x1="4"
                      y1="10"
                      x2="16"
                      y2="10"
                      stroke="#2563eb"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </g>
                </svg>
              </div>
            </button>
          </div>
        </div>

        <div className={`max-w-[calc(90*1rem)] w-[90%] mx-auto transition-all duration-500 overflow-hidden ${isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
          }`}>
          <div className='flex flex-col'>
            <div className='w-full md:w-10/12 lg:w-6/12 mb-[clamp(3*1rem,((3-((5-3)/(90-20)*20))*1rem+((5-3)/(90-20))*100vw),5*1rem)]'>
              <p className='text-xl text-gray-700 font-normal'>Build with Media Jira campaign management platform — free to start, and upgrade anytime to unlock advanced features.</p>
            </div>
          </div>

          <div className="grid border-l border-t border-gray-300 overflow-hidden" style={{gridTemplateRows: 'auto', gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))', gridAutoRows: 'max-content', gridAutoColumns: '1fr'}}>
            {loading ? (
              <div className="p-8 text-center text-gray-600">Loading plans...</div>
            ) : error ? (
              <div className="p-8 text-center text-red-600">{error}</div>
            ) : plans.length === 0 ? (
              <div className="p-8 text-center text-gray-600">No plans available</div>
            ) : (
              plans.map((plan, index) => (
                <PlanCard
                  key={plan.id}
                  name={plan.name}
                  price={plan.price}
                  priceLabel={plan.price !== null ? `$${plan.price}` : 'Free'}
                  priceSubtext={plan.price !== null && plan.price !== 0 ? 'billed monthly' : undefined}
                  description={plan.desc || `Professional ${plan.name.toLowerCase()} plan for your organization.`}
                  features={[
                    { category: 'TEAM', label: 'Team members', value: plan.max_team_members.toString(), tooltip: `Maximum number of team members allowed in your organization on the ${plan.name} plan.` },
                    { category: 'USAGE', label: 'Previews/day', value: plan.max_previews_per_day.toString(), tooltip: `Maximum number of previews you can generate per day on the ${plan.name} plan.` },
                    { category: 'USAGE', label: 'Tasks/day', value: plan.max_tasks_per_day.toString(), tooltip: `Maximum number of tasks you can run per day on the ${plan.name} plan.` },
                  ]}
                  ctaText={currentPlanId ? (currentPlanId === plan.id ? "Current plan" : "Switch plan") : "Subscribe now"}
                  badge={index === plans.length - 2 ? 'Popular' : undefined}
                  planId={plan.id}
                  stripePriceId={plan.stripe_price_id}
                  onSubscribe={handleSubscribe}
                  isCurrentPlan={currentPlanId === plan.id}
                />
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

