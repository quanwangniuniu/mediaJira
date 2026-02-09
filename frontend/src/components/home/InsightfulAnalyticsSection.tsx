import React from 'react';
import { BarChart3, ChevronDown } from 'lucide-react';

type InsightfulAnalyticsSectionProps = {
  onRedirectToLogin: () => void;
};

export default function InsightfulAnalyticsSection({ onRedirectToLogin }: InsightfulAnalyticsSectionProps) {
  return (
    <>
      {/* Insightful Analytics Section - Desktop */}
      <section className="hidden md:block py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto relative">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-0 items-center justify-center">
            {/* Left Card - Analytics Dashboard */}
            <div className="bg-white rounded-2xl shadow-2xl p-3 relative z-30 w-full max-w-lg md:mx-auto lg:mx-0 lg:mt-8 lg:translate-x-[30px] lg:translate-y-[40px]">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-base font-bold text-gray-900">Overview</h4>
                <button
                  onClick={onRedirectToLogin}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium"
                >
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
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                    <span>May</span>
                  </div>
                </div>

                {/* Bottom Right - Performance */}
                <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                  <h5 className="text-sm font-bold text-gray-900 mb-1.5">Performance</h5>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">93%</div>
                        <div className="text-xs text-gray-500">On Track</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">11%</div>
                        <div className="text-xs text-gray-500">At Risk</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">4%</div>
                        <div className="text-xs text-gray-500">Overdue</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card - Description */}
            <div className="bg-blue-50 rounded-2xl shadow-xl p-10 relative z-20 w-full max-w-2xl lg:-ml-24 lg:-mt-16">
              <div className="flex items-start gap-6">
                <div className="bg-white rounded-full px-3 py-1.5 shadow-sm flex items-center gap-2 border border-gray-200">
                  <BarChart3 className="w-4 h-4 text-gray-900" />
                  <span className="text-xs font-normal text-gray-900">Insightful Analytics</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    Visualize performance and turn data into action.
                  </h3>
                  <p className="text-lg text-gray-600 mb-8">
                    See what's working, fix what's slowing you down, and keep improving every campaign.
                  </p>
                  <div className="flex justify-end">
                    <button
                      onClick={onRedirectToLogin}
                      className="px-6 py-3 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition font-medium shadow-md whitespace-nowrap"
                    >
                      Learn More
                    </button>
                  </div>
                </div>
              </div>
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

                  {/* Top Media Buyers */}
                  <div className="bg-gray-50 rounded p-1">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[7px] font-semibold text-gray-900">Top Media Buyers</h5>
                      <a href="#" className="text-[6px] text-blue-600">Learn</a>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-orange-100 rounded-full flex items-center justify-center">
                          <span className="text-[6px] font-semibold text-orange-700">GL</span>
                        </div>
                        <span className="text-[6px] text-gray-900">Grace Lee</span>
                        <span className="text-[6px] text-gray-500 ml-auto">142%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-[6px] font-semibold text-blue-700">JW</span>
                        </div>
                        <span className="text-[6px] text-gray-900">Jack Wilson</span>
                        <span className="text-[6px] text-gray-500 ml-auto">129%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-[6px] font-semibold text-purple-700">AB</span>
                        </div>
                        <span className="text-[6px] text-gray-900">Alice Brown</span>
                        <span className="text-[6px] text-gray-500 ml-auto">124%</span>
                      </div>
                    </div>
                  </div>

                  {/* Line Chart */}
                  <div className="bg-gray-50 rounded p-1">
                    <h5 className="text-[7px] font-semibold text-gray-900 mb-0.5">Task Trend</h5>
                    <div className="h-12 relative">
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
                    </div>
                    <div className="flex justify-between text-[6px] text-gray-500">
                      <span>Jan</span>
                      <span>Feb</span>
                      <span>Mar</span>
                      <span>Apr</span>
                      <span>May</span>
                    </div>
                  </div>

                  {/* Performance */}
                  <div className="bg-gray-50 rounded p-1">
                    <h5 className="text-[7px] font-semibold text-gray-900 mb-0.5">Performance</h5>
                    <div className="grid grid-cols-3 gap-1">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-100 rounded-full flex items-center justify-center">
                          <BarChart3 className="w-2 h-2 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-[6px] font-bold text-gray-900">93%</div>
                          <div className="text-[6px] text-gray-500">On Track</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-orange-100 rounded-full flex items-center justify-center">
                          <BarChart3 className="w-2 h-2 text-orange-600" />
                        </div>
                        <div>
                          <div className="text-[6px] font-bold text-gray-900">11%</div>
                          <div className="text-[6px] text-gray-500">At Risk</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-100 rounded-full flex items-center justify-center">
                          <BarChart3 className="w-2 h-2 text-green-600" />
                        </div>
                        <div>
                          <div className="text-[6px] font-bold text-gray-900">4%</div>
                          <div className="text-[6px] text-gray-500">Overdue</div>
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
