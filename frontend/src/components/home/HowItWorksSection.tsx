import React from 'react';
import { ArrowRight } from 'lucide-react';

type HowItWorksSectionProps = {
  onGetStartedClick: () => void;
};

export default function HowItWorksSection({ onGetStartedClick }: HowItWorksSectionProps) {
  return (
    <>
      {/* How it works Section -Desktop */}
      <section className="hidden md:block py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How it works?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From setup to optimization,<br />
              MediaJira keeps your campaigns moving effortlessly.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 mb-12">
            {/* Step 1 */}
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-xs hover:shadow-xl transition flex flex-col">
              <div className="flex items-center justify-center mb-4 h-32">
                <img src="/step1.png" alt="Plan & Assign" className="w-24 h-24 object-contain" />
              </div>
              <div className="text-center flex-shrink-0">
                <p className="text-sm text-gray-600 mb-1">Step 1</p>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Plan & Assign</h3>
                <p className="text-gray-600">
                  Define roles, permissions, and tasks in one place.
                </p>
              </div>
            </div>

            {/* Arrow 1 */}
            <div className="hidden lg:block">
              <img src="/blueArrow.png" alt="Arrow" className="w-16 h-16 object-contain" />
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-xs hover:shadow-xl transition flex flex-col">
              <div className="flex items-center justify-center mb-4 h-32">
                <img src="/step2.png" alt="Execute & Collab" className="w-24 h-24 object-contain" />
              </div>
              <div className="text-center flex-shrink-0">
                <p className="text-sm text-gray-600 mb-1">Step 2</p>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Execute & Collab</h3>
                <p className="text-gray-600">
                  Manage assets, budgets, and channels seamlessly.
                </p>
              </div>
            </div>

            {/* Arrow 2 */}
            <div className="hidden lg:block">
              <img src="/yellowArrow.png" alt="Arrow" className="w-16 h-16 object-contain" />
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-xs hover:shadow-xl transition flex flex-col">
              <div className="flex items-center justify-center mb-4 h-32">
                <img src="/step3.png" alt="Automate & Notify" className="w-[72px] h-[72px] object-contain" />
              </div>
              <div className="text-center flex-shrink-0">
                <p className="text-sm text-gray-600 mb-1">Step 3</p>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Automate & Notify</h3>
                <p className="text-gray-600">
                  Trigger smart workflows and stay informed in real time.
                </p>
              </div>
            </div>

            {/* Arrow 3 */}
            <div className="hidden lg:block">
              <img src="/redArrow.png" alt="Arrow" className="w-16 h-16 object-contain" />
            </div>

            {/* Step 4 */}
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-xs hover:shadow-xl transition flex flex-col">
              <div className="flex items-center justify-center mb-4 h-32">
                <img src="/step4.png" alt="Analyze & Optimize" className="w-[72px] h-[72px] object-contain" />
              </div>
              <div className="text-center flex-shrink-0">
                <p className="text-sm text-gray-600 mb-1">Step 4</p>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Analyze & Optimize</h3>
                <p className="text-gray-600">
                  Turn data into insights for your next campaign.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={onGetStartedClick}
              className="px-8 py-4 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition font-medium text-lg inline-flex items-center gap-2 shadow-lg"
            >
              Start Your Journey Today
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* How it works and Testimonials Section - Mobile */}
      <section className="block md:hidden py-10 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="bg-blue-50 rounded-2xl p-8 mb-6">
            {/* How it works Section */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
                How it works?
              </h2>
              <p className="text-base text-gray-700 mb-6 leading-relaxed">
                From setup to optimization,<br />
                MediaJira keeps your campaigns moving effortlessly.
              </p>
            </div>

            <div className="overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth mb-2 pb-4 -mx-14 px-10">
              <div className="flex items-center gap-4 min-w-max">
                {/* Step 1 */}
                <div className="bg-white rounded-xl shadow-lg p-6 pt-0 w-60 hover:shadow-xl transition flex flex-col flex-shrink-0">
                  <div className="flex items-center justify-center h-32">
                    <img src="/step1.png" alt="Plan & Assign" className="w-24 h-24 object-contain" />
                  </div>
                  <div className="text-center flex-shrink-0">
                    <p className="text-sm text-gray-600 mb-1">Step 1</p>
                    <h3 className="text-md font-bold text-gray-900 mb-2">Plan & Assign</h3>
                    <p className="text-sm text-gray-600">
                      Define roles, permissions, and tasks in one place.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-white rounded-xl shadow-lg p-6 pt-0 w-60 hover:shadow-xl transition flex flex-col flex-shrink-0">
                  <div className="flex items-center justify-center h-32">
                    <img src="/step2.png" alt="Execute & Collab" className="w-24 h-24 object-contain" />
                  </div>
                  <div className="text-center flex-shrink-0">
                    <p className="text-sm text-gray-600 mb-1">Step 2</p>
                    <h3 className="text-md font-bold text-gray-900 mb-2">Execute & Collab</h3>
                    <p className="text-sm text-gray-600">
                      Manage assets, budgets, and channels seamlessly.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-white rounded-xl shadow-lg p-6 pt-0 w-60 hover:shadow-xl transition flex flex-col flex-shrink-0">
                  <div className="flex items-center justify-center h-32">
                    <img src="/step3.png" alt="Automate & Notify" className="w-[72px] h-[72px] object-contain" />
                  </div>
                  <div className="text-center flex-shrink-0">
                    <p className="text-sm text-gray-600 mb-1">Step 3</p>
                    <h3 className="text-md font-bold text-gray-900 mb-2">Automate & Notify</h3>
                    <p className="text-sm text-gray-600">
                      Trigger smart workflows and stay informed in real time.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="bg-white rounded-xl shadow-lg p-6 pt-0 w-60 hover:shadow-xl transition flex flex-col flex-shrink-0">
                  <div className="flex items-center justify-center h-32">
                    <img src="/step4.png" alt="Analyze & Optimize" className="w-[72px] h-[72px] object-contain" />
                  </div>
                  <div className="text-center flex-shrink-0">
                    <p className="text-sm text-gray-600 mb-1">Step 4</p>
                    <h3 className="text-md font-bold text-gray-900 mb-2">Analyze & Optimize</h3>
                    <p className="text-sm text-gray-600">
                      Turn data into insights for your next campaign.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={onGetStartedClick}
                className="flex items-center px-6 py-3 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition text-center font-medium text-sm gap-4 shadow-lg"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Testimonials Section */}
            <div className="text-center pt-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
                What teams love about<br />
                MediaJira?
              </h2>
              <p className="text-base text-gray-700 mb-6 leading-relaxed">
                From setup to reporting, MediaJira helps teams stay aligned, efficient, and confident in every campaign.
              </p>
            </div>

            <div className="overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth mb-2 pb-4 -mx-14 px-10">
              <div className="flex gap-4 min-w-max">
                {/* Testimonial 1 */}
                <div className="bg-white rounded-xl shadow-lg p-6 min-w-[280px] flex-shrink-0 snap-center flex flex-col">
                  <p className="text-gray-700 mb-4 italic flex-grow relative text-center text-sm">
                    <img src="/opening quote.png" alt="Opening quote" className="absolute top-0 -left-4 w-3 h-3" />
                    <img src="/closing quote.png" alt="Closing quote" className="absolute bottom-0 -right-4 w-3 h-3" />
                    Finally, one place to manage<br />
                    budgets, assets, and approvals.<br />
                    We cut our setup time by half.
                  </p>
                  <div className="flex items-center gap-3 mt-auto">
                    <div className="w-10 h-10 bg-blue-100 rounded-full overflow-hidden flex-shrink-0">
                      <img
                        src="https://i.pravatar.cc/150?img=68"
                        alt="Jack Wilson"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">Jack Wilson</div>
                      <div className="text-xs text-gray-600">Senior Media Buyer</div>
                    </div>
                  </div>
                </div>

                {/* Testimonial 2 */}
                <div className="bg-white rounded-xl shadow-lg p-6 min-w-[280px] flex-shrink-0 snap-center flex flex-col">
                  <p className="text-gray-700 mb-4 italic flex-grow relative text-center text-sm">
                    <img src="/opening quote.png" alt="Opening quote" className="absolute top-0 -left-4 w-3 h-3" />
                    <img src="/closing quote.png" alt="Closing quote" className="absolute bottom-0 -right-4 w-3 h-3" />
                    I love how the review and<br />
                    approval flow feels natural.<br />
                    No more endless Slack threads.
                  </p>
                  <div className="flex items-center gap-3 mt-auto">
                    <div className="w-10 h-10 bg-green-100 rounded-full overflow-hidden flex-shrink-0">
                      <img
                        src="https://i.pravatar.cc/150?img=47"
                        alt="Eve Turner"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">Eve Turner</div>
                      <div className="text-xs text-gray-600">Designer</div>
                    </div>
                  </div>
                </div>

                {/* Testimonial 3 */}
                <div className="bg-white rounded-xl shadow-lg p-6 min-w-[280px] flex-shrink-0 snap-center flex flex-col">
                  <p className="text-gray-700 mb-4 italic flex-grow relative text-center text-sm">
                    <img src="/opening quote.png" alt="Opening quote" className="absolute top-0 -left-4 w-3 h-3" />
                    <img src="/closing quote.png" alt="Closing quote" className="absolute bottom-0 -right-4 w-3 h-3" />
                    The reporting dashboard gives<br />
                    instant clarity. We spot<br />
                    underperforming channels in<br />
                    minutes.
                  </p>
                  <div className="flex items-center gap-3 mt-auto">
                    <div className="w-10 h-10 bg-orange-100 rounded-full overflow-hidden flex-shrink-0">
                      <img
                        src="https://i.pravatar.cc/150?img=59"
                        alt="Grace Lee"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">Grace Lee</div>
                      <div className="text-xs text-gray-600">Data Analyst</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button className="flex items-center px-6 py-3 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition text-center font-medium text-sm gap-4 shadow-lg">
                See All Reviews
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
