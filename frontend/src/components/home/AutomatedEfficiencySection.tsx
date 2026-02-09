import React from 'react';
import { Settings, Zap } from 'lucide-react';

export default function AutomatedEfficiencySection() {
  return (
    <>
      {/* Automated Efficiency Section - Desktop */}
      <section className="hidden md:block py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto relative">
          <div className="flex flex-col lg:flex-row gap-0 items-center justify-center">
            {/* Left Card - Application Interface */}
            <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-100 p-6 relative z-30 w-full max-w-xl lg:ml-0 lg:mt-20">
              <div className="grid grid-cols-[1fr,1px,1fr] gap-6">
                {/* Left Panel - Chart */}
                <div>
                  <h5 className="text-sm font-bold text-gray-900 mb-4">Trigger Rule: ROI drop &gt; 10%</h5>

                  {/* Simple Line Chart */}
                  <div className="relative h-40 bg-gray-50 rounded-lg p-4">
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-4 bottom-4 flex flex-col justify-between text-xs text-gray-500">
                      <span>1.20</span>
                      <span>0.95</span>
                      <span>0.85</span>
                    </div>

                    {/* Chart area */}
                    <div className="ml-8 h-full relative border-l border-b border-gray-300">
                      {/* Line path */}
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 120" preserveAspectRatio="none">
                        <polyline
                          points="0,10 60,50 120,80"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>

                      {/* X-axis label */}
                      <div className="absolute bottom-0 left-0 right-0 text-center">
                        <span className="text-xs text-gray-500">Nov</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="bg-gray-200"></div>

                {/* Right Panel - Task Details */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-bold text-gray-900">Triggered:</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-4">
                    ROI dropped 15% — new task created for Data Analyst
                  </p>

                  <div className="border border-green-500 rounded-lg p-4 mb-4 max-w-fit">
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-bold text-gray-900">Optimize Campaign Performance</span>
                    </div>
                    <div className="mb-2">
                      <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                        Created Automatically
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">Assigned to:</p>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-orange-700">GL</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">Grace Lee</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card - Description */}
            <div className="bg-blue-50 rounded-2xl shadow-xl p-10 relative z-20 lg:-ml-48 lg:-mt-24 w-full max-w-2xl">
              <div className="flex items-start gap-6">
                <div className="bg-white rounded-full px-3 py-1.5 shadow-sm flex items-center gap-2 border border-gray-200">
                  <Zap className="w-4 h-4 text-gray-900" />
                  <span className="text-xs font-normal text-gray-900">Automated Efficiency</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    Work smarter with automated triggers and batch approvals.
                  </h3>
                  <p className="text-lg text-gray-600 mb-8">
                    Save time with automated alerts, scheduled triggers, and one-click batch operations.
                  </p>
                  <div className="flex justify-end">
                    <button className="px-6 py-3 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition font-medium shadow-md whitespace-nowrap">
                      Learn More
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Automated Efficiency Section - Mobile */}
      <section className="block md:hidden py-10 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          {/* Main Content Card */}
          <div className="bg-blue-50 rounded-2xl p-8 mb-6">
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                Work smarter with automated triggers and batch approvals.
              </h2>
              <p className="text-base text-gray-700 mb-6 leading-relaxed">
                Save time with automated alerts, scheduled triggers, and one-click batch operations.
              </p>
              <div className="flex justify-end">
                <button className="px-6 py-1.5 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition text-sm font-medium">
                  Learn More
                </button>
              </div>
            </div>

            {/* Mini Application Preview */}
            <div className="-mx-9 bg-white rounded-2xl shadow-xl p-2 h-auto overflow-visible">
              <div className="bg-white rounded-sm overflow-visible">
                {/* Content - Two Column Layout */}
                <div className="p-2 bg-white">
                  <div className="grid grid-cols-[1fr_1px_1fr] gap-2">
                    {/* Left Column: Chart Section */}
                    <div>
                      <h5 className="text-[7px] font-bold text-gray-900 mb-2">Trigger Rule: ROI drop &gt; 10%</h5>

                      {/* Chart with Y-axis labels */}
                      <div className="relative h-20">
                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 bottom-2 flex flex-col justify-between text-[6px] text-gray-500">
                          <span>1.20</span>
                          <span className="mt-7">0.95</span>
                          <span className="mt-7">0.85</span>
                        </div>

                        {/* Chart area */}
                        <div className="ml-6 h-full relative">
                          <div className="absolute inset-0 border-l border-b border-gray-300">
                            <svg className="w-[50%] h-full" viewBox="0 0 100 80" preserveAspectRatio="none">
                              <polyline
                                points="0,10 50,35 100,55"
                                fill="none"
                                stroke="#ef4444"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
                          {/* X-axis label */}
                          <div className="absolute -bottom-3 right-[50%]">
                            <span className="text-[6px] text-gray-500">Nov</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Vertical Divider */}
                    <div className="bg-gray-200"></div>

                    {/* Right Column: Task Details Section */}
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Zap className="w-2 h-2 text-yellow-500" />
                        <span className="text-[7px] font-bold text-gray-900">Triggered:</span>
                      </div>
                      <p className="text-[7px] text-gray-600 mb-2">
                        ROI dropped 15% — new task created for Data Analyst
                      </p>

                      {/* Task Card */}
                      <div className="border border-green-400 bg-white rounded p-1.5">
                        <div className="flex items-center gap-1 mb-1">
                          <Settings className="w-2 h-2 text-blue-600" />
                          <span className="text-[7px] font-bold text-gray-900 leading-tight">Optimize Campaign Performance</span>
                        </div>
                        <div className="mb-1">
                          <span className="inline-block px-1 py-0.5 bg-green-100 text-green-700 text-[6px] font-medium rounded">
                            Created Automatically
                          </span>
                        </div>
                        <p className="text-[6px] text-gray-600 mb-1">Assigned to:</p>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="text-[6px] font-semibold text-orange-700">GL</span>
                          </div>
                          <span className="text-[7px] font-medium text-gray-900">Grace Lee</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
