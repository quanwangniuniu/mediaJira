import React from 'react';
import { BarChart3, ChevronDown } from 'lucide-react';

const meta = {
  title: 'Home/InsightfulAnalyticsSection',
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'Insightful analytics section with desktop and mobile layouts.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  render: () => {
    const redirectToLogin = () => {};

    return (
      <>
        {/* Insightful Analytics Section - Desktop */}
        <section className="hidden md:block py-20 px-6 bg-white">
          <div className="max-w-7xl mx-auto relative">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-0 items-center justify-center">
              {/* Left Card - Analytics Dashboard */}
              <div className="bg-white rounded-2xl shadow-2xl p-3 relative z-30 w-full max-w-lg md:mx-auto lg:mx-0 lg:mt-8 lg:translate-x-[30px] lg:translate-y-[30px]">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-base font-bold text-gray-900">Overview</h4>
                  <button 
                  onClick={redirectToLogin}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium">
                    Export report
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Top Left - Stats */}
                  <div className="col-span-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <div className="text-xl font-bold text-gray-900">12,428</div>
                        <div className="text-xs text-gray-600">Total Tasks</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <div className="text-xl font-bold text-gray-900">1,040</div>
                        <div className="text-xs text-gray-600">Completed</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <div className="text-xl font-bold text-gray-900">54</div>
                        <div className="text-xs text-gray-600">Overdue</div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Left - Top Performers */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <h5 className="text-sm font-bold text-gray-900">Top Media Buyers</h5>
                      <a href="#" className="text-xs text-blue-600 hover:text-blue-700">Learn</a>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-orange-700">GL</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-xs text-gray-900 truncate">Grace Lee</div>
                          <div className="text-xs text-gray-500">142%</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-blue-700">JW</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-xs text-gray-900 truncate">Jack Wilson</div>
                          <div className="text-xs text-gray-500">129%</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-purple-700">AB</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-xs text-gray-900 truncate">Alice Brown</div>
                          <div className="text-xs text-gray-500">124%</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Right - Line Chart */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h5 className="text-sm font-bold text-gray-900 mb-1.5">Task Trend</h5>
                    <div className="h-24 relative">
                      <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
                        <polyline
                          points="0,80 40,50 80,30 120,35 160,20 200,15"
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <polyline
                          points="0,65 40,40 80,25 120,30 160,18 200,12"
                          fill="none"
                          stroke="#f97316"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-400">
                        <span>4w</span>
                        <span>Today</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Right - Pie Charts */}
                  <div className="col-span-2">
                    <div className="grid grid-cols-2 gap-2">
                      {/* Pie Chart */}
                      <div className="bg-gray-50 rounded-lg p-2">
                        <h5 className="text-xs font-bold text-gray-900 mb-1.5 text-center">Task Status</h5>
                        <div className="flex items-center justify-center mb-1.5">
                          <div className="w-16 h-16 relative">
                            <svg className="w-16 h-16" viewBox="0 0 100 100">
                              {/* Failed - Red - 25% = 90° (from top, 0° to 90°) */}
                              <path d="M 50 50 L 50 5 A 45 45 0 0 1 95 50 Z" fill="#ef4444" />
                              {/* Pending - Yellow - 25% = 90° (from 90° to 180°) */}
                              <path d="M 50 50 L 95 50 A 45 45 0 0 1 50 95 Z" fill="#eab308" />
                              {/* Comp - Blue - 25% = 90° (from 180° to 270°) */}
                              <path d="M 50 50 L 50 95 A 45 45 0 0 1 5 50 Z" fill="#3b82f6" />
                              {/* Appr - Green - 25% = 90° (from 270° to 360°/0°, completes circle) */}
                              <path d="M 50 50 L 5 50 A 45 45 0 0 1 50 5 Z" fill="#10b981" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span className="text-xs text-gray-600">Failed</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                            <span className="text-xs text-gray-600">Pending</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-xs text-gray-600">Comp</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-xs text-gray-600">Appr</span>
                          </div>
                        </div>
                      </div>

                      {/* Donut Chart */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h5 className="text-xs font-bold text-gray-900 mb-2 text-center">Distribution</h5>
                        <div className="flex items-center justify-center mb-2">
                          <div className="w-16 h-16 relative">
                            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="45" fill="none" stroke="#3b82f6" strokeWidth="10" strokeDasharray="90 20" />
                              <circle cx="50" cy="50" r="45" fill="none" stroke="#eab308" strokeWidth="10" strokeDasharray="40 70" strokeDashoffset="-90" />
                              <circle cx="50" cy="50" r="45" fill="none" stroke="#10b981" strokeWidth="10" strokeDasharray="25 85" strokeDashoffset="-130" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-xs text-gray-600">Comp</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                            <span className="text-xs text-gray-600">Pending</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-xs text-gray-600">Failed</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Card - Description */}
              <div className="bg-blue-50 rounded-2xl shadow-xl p-8 relative z-20 w-full max-w-xl md:mx-auto lg:mx-0 lg:-ml-24 lg:-mt-16">
                <div className="inline-flex items-center gap-2 bg-white rounded-full px-3 py-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-gray-900" />
                  <span className="text-sm font-semibold text-gray-900">Insightful Analytics</span>
                </div>
                <div className="ml-auto w-2/3">
                  <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                    <span className="block">Visualize performance</span>
                    <span className="block">and turn data into</span>
                    <span className="block">action.</span>
                  </h3>
                  <p className="text-lg text-gray-600 mb-8">
                    See what's working, fix what's slowing you down, and keep improving every campaign.
                  </p>
                </div>
                <button 
                onClick={redirectToLogin}
                className="absolute bottom-8 right-8 px-6 py-3 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition font-medium shadow-md">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Insightful Analytics Section - Mobile */}
        <section className="block md:hidden py-10 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            {/* Main Content Card */}
            <div className="bg-blue-50 rounded-2xl p-8 mb-6">
              <div className="mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                  Visualize performance and turn data into action.
                </h2>
                <p className="text-base text-gray-700 mb-6 leading-relaxed">
                  See what's working, fix what's slowing you down, and keep improving every campaign.
                </p>
                <div className="flex justify-end">
                  <button className="px-6 py-1.5 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition text-sm font-medium">
                    Learn More
                  </button>
                </div>
              </div>

              {/* Mini Analytics Dashboard Preview */}
              <div className="-mx-9 bg-white rounded-2xl shadow-xl p-2 h-auto overflow-visible">
                <div className="bg-white rounded-sm overflow-visible">
                  {/* Header */}
                  <div className="bg-white border-b border-gray-200 px-2 py-1 flex items-center justify-between">
                    <h4 className="text-[8px] font-bold text-gray-900">Overview</h4>
                    <button className="flex items-center gap-0.5 px-1 py-0.5 bg-blue-600 text-white rounded text-[6px] font-medium">
                      Export report
                      <ChevronDown className="w-2 h-2" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-2 bg-white space-y-1">
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-1">
                      <div className="bg-gray-50 rounded p-1">
                        <div className="text-[8px] font-bold text-gray-900">12,428</div>
                        <div className="text-[6px] text-gray-600">Total Tasks</div>
                      </div>
                      <div className="bg-gray-50 rounded p-1">
                        <div className="text-[8px] font-bold text-gray-900">1,040</div>
                        <div className="text-[6px] text-gray-600">Completed</div>
                      </div>
                      <div className="bg-gray-50 rounded p-1">
                        <div className="text-[8px] font-bold text-gray-900">54</div>
                        <div className="text-[6px] text-gray-600">Overdue</div>
                      </div>
                    </div>

                    {/* Two Column Layout */}
                    <div className="grid grid-cols-2 gap-1">
                      {/* Top Performers Table */}
                      <div className="bg-white rounded p-1.5 border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <h5 className="text-[7px] font-bold text-gray-900">Top Performing<br/>Media Buyers <span className="text-gray-500 font-normal">(by ROI)</span></h5>
                          <a href="#" className="text-[6px] text-blue-600 underline">Learn Mor</a>
                        </div>
                        
                        {/* Table Header */}
                        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-1 pb-0.5 border-b border-gray-200 mb-0.5">
                          <div className="text-[6px] font-semibold text-gray-600">Rank</div>
                          <div className="text-[6px] font-semibold text-gray-600">Name</div>
                          <div className="text-[6px] font-semibold text-gray-600 text-right">ROI</div>
                          <div className="w-3"></div>
                        </div>
                        
                        {/* Table Rows */}
                        <div className="space-y-0.5">
                          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-1 items-center">
                            <div className="text-[6px] text-gray-900">1</div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-orange-100 rounded-full flex items-center justify-center">
                                <span className="text-[6px] font-semibold text-orange-700">GL</span>
                              </div>
                              <span className="text-[6px] text-gray-900">Grace Lee</span>
                            </div>
                            <div className="text-[6px] font-semibold text-gray-900">142%</div>
                            <div className="text-[6px] text-gray-400">ROI</div>
                          </div>
                          
                          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-1 items-center">
                            <div className="text-[6px] text-gray-900">2</div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-[6px] font-semibold text-blue-700">JW</span>
                              </div>
                              <span className="text-[6px] text-gray-900">Jack Wilson</span>
                            </div>
                            <div className="text-[6px] font-semibold text-gray-900">129%</div>
                            <div className="text-[6px] text-gray-400">ROI</div>
                          </div>
                          
                          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-1 items-center">
                            <div className="text-[6px] text-gray-900">3</div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-[6px] font-semibold text-purple-700">AB</span>
                              </div>
                              <span className="text-[6px] text-gray-900">Alice Brown</span>
                            </div>
                            <div className="text-[6px] font-semibold text-gray-900">124%</div>
                            <div className="text-[6px] text-gray-400">ROI</div>
                          </div>
                        </div>
                        
                        <div className="mt-1 pt-0.5">
                          <a href="#" className="text-[6px] text-blue-600 underline">List 1a tales</a>
                        </div>
                      </div>

                      {/* Line Chart */}
                      <div className="bg-white rounded p-1.5 border border-gray-100">
                        <h5 className="text-[7px] font-bold text-gray-900 mb-1">Task Completion Trend <span className="text-gray-500 font-normal">(Last 30 Days)</span></h5>
                        <div className="h-16 relative">
                          <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
                            <polyline
                              points="0,80 40,50 80,30 120,35 160,20 200,15"
                              fill="none"
                              stroke="#3b82f6"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            <polyline
                              points="0,65 40,40 80,25 120,30 160,18 200,12"
                              fill="none"
                              stroke="#f97316"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[6px] text-gray-400">
                            <span>4 weeks</span>
                            <span>Tues</span>
                            <span>Wed 1</span>
                            <span>Thu1</span>
                            <span>Today</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-2 gap-1">
                      {/* Pie Chart */}
                      <div className="bg-white rounded p-1.5 border border-gray-100">
                        <h5 className="text-[7px] font-bold text-gray-900 mb-1 text-center">Task Distribution by Status</h5>
                        <div className="flex items-center justify-center mb-1">
                          <div className="w-12 h-12">
                            <svg className="w-12 h-12" viewBox="0 0 100 100">
                              <path d="M 50 50 L 50 5 A 45 45 0 0 1 95 50 Z" fill="#ef4444" />
                              <path d="M 50 50 L 95 50 A 45 45 0 0 1 50 95 Z" fill="#eab308" />
                              <path d="M 50 50 L 50 95 A 45 45 0 0 1 5 50 Z" fill="#3b82f6" />
                              <path d="M 50 50 L 5 50 A 45 45 0 0 1 50 5 Z" fill="#10b981" />
                            </svg>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
                          <div className="flex items-center gap-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            <span className="text-[6px] text-gray-600">Completed</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                            <span className="text-[6px] text-gray-600">Pending</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                            <span className="text-[6px] text-gray-600">Failed</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            <span className="text-[6px] text-gray-600">Approved</span>
                          </div>
                        </div>
                      </div>

                      {/* Donut Chart */}
                      <div className="bg-white rounded p-1.5 border border-gray-100">
                        <h5 className="text-[7px] font-bold text-gray-900 mb-1 text-center">Distribution</h5>
                        <div className="flex items-center justify-center mb-1">
                          <div className="w-12 h-12">
                            <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="45" fill="none" stroke="#3b82f6" strokeWidth="10" strokeDasharray="90 20" />
                              <circle cx="50" cy="50" r="45" fill="none" stroke="#eab308" strokeWidth="10" strokeDasharray="40 70" strokeDashoffset="-90" />
                              <circle cx="50" cy="50" r="45" fill="none" stroke="#10b981" strokeWidth="10" strokeDasharray="25 85" strokeDashoffset="-130" />
                            </svg>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
                          <div className="flex items-center gap-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            <span className="text-[6px] text-gray-600">Completed</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                            <span className="text-[6px] text-gray-600">Pending</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            <span className="text-[6px] text-gray-600">Failed</span>
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
  },
};
