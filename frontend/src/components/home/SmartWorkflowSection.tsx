import React from 'react';
import {
  Bell,
  ChevronRight,
  Filter,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  User,
} from 'lucide-react';

type SmartWorkflowSectionProps = {
  onRedirectToLogin: () => void;
};

export default function SmartWorkflowSection({ onRedirectToLogin }: SmartWorkflowSectionProps) {
  return (
    <>
      {/* Smart Workflow Section - Desktop */}
      <section className="hidden md:block py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto relative">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-center relative">
            {/* Left Card - Workflow Application */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden relative z-30 w-full max-w-4xl lg:mt-32">
              {/* Top Bar */}
              <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between">
                <div className="flex-1 relative max-w-xs">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search"
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onRedirectToLogin}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Filters</span>
                  </button>
                  <button
                    onClick={onRedirectToLogin}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Create task</span>
                  </button>
                  <button
                    onClick={onRedirectToLogin}
                    className="p-1.5 hover:bg-gray-100 rounded-lg"
                  >
                    <Bell className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={onRedirectToLogin}
                    className="p-1.5 hover:bg-gray-100 rounded-lg"
                  >
                    <User className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="flex">
                {/* Sidebar */}
                <div className="w-40 bg-white border-r border-gray-200 p-1.5">
                  <nav className="space-y-0.5 mb-3">
                    <a href="#" className="flex items-center gap-2 px-2 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-medium">
                      <div className="w-1 h-3 bg-blue-600 rounded-full"></div>
                      <span className="text-xs">Dashboard</span>
                    </a>
                    <a href="#" className="flex items-center gap-2 px-2 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg">
                      <span className="text-xs">Tasks</span>
                      <span className="ml-auto px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded-full">16</span>
                    </a>
                  </nav>

                  <div className="space-y-0.5 mb-2">
                    <div className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5 px-2">MAIN</div>
                    <a href="#" className="flex items-center gap-2 px-2 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs">Reports</a>
                    <a href="#" className="flex items-center gap-2 px-2 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs">Teams</a>
                    <a href="#" className="flex items-center gap-2 px-2 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs">Settings</a>
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1 px-2">RECOMMEND</div>
                    <a href="#" className="flex items-center gap-2 px-2 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs">
                      Team
                      <ChevronRight className="w-3 h-3 ml-auto" />
                    </a>
                    <a href="#" className="flex items-center gap-2 px-2 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs">Clients</a>
                  </div>

                  <div className="mt-auto pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-[10px] font-semibold text-purple-700">BS</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-[10px] font-medium text-gray-900">Brooklyn Simmons</div>
                        <div className="text-[10px] text-gray-500">Admin</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Content - Workflow Board */}
                <div className="flex-1 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      Smart Workflow
                      <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                    </h3>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* Asset Review Column */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-semibold text-gray-700 mb-1">Asset Review</h4>

                      {/* Draft Card */}
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition">
                        <div className="h-1.5 bg-yellow-400 rounded-t-lg"></div>
                        <div className="p-2">
                          <div className="flex items-start justify-between mb-1.5">
                            <span className="text-xs font-semibold text-yellow-700 px-1.5 py-0.5 bg-yellow-100 rounded">Draft</span>
                            <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                          <h5 className="text-xs font-semibold text-gray-900 mb-1.5">Draft Video Ad</h5>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-5 h-5 bg-blue-100 rounded-full"></div>
                          </div>
                        </div>
                      </div>

                      {/* Pending Review Card */}
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition">
                        <div className="h-1.5 bg-orange-400 rounded-t-lg"></div>
                        <div className="p-2">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-semibold text-orange-700 px-1.5 py-0.5 bg-orange-100 rounded">Pending Review</span>
                            <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                          <h5 className="text-xs font-semibold text-gray-900 mb-1.5">Banner Ad - Pending Review</h5>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-5 h-5 bg-green-100 rounded-full"></div>
                          </div>
                        </div>
                      </div>

                      {/* Approved Card */}
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition">
                        <div className="h-1.5 bg-green-400 rounded-t-lg"></div>
                        <div className="p-2">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-semibold text-green-700 px-1.5 py-0.5 bg-green-100 rounded">Approved</span>
                            <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                          <h5 className="text-xs font-semibold text-gray-900 mb-1.5">Display Ad</h5>
                          <ul className="text-xs text-gray-600 space-y-1 mb-2">
                            <li>• Upload assets</li>
                            <li>• Finalize</li>
                          </ul>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-5 h-5 bg-purple-100 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Budget Approval Column */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-semibold text-gray-700 mb-1">Budget Approval</h4>

                      {/* Draft Card */}
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition">
                        <div className="h-1.5 bg-yellow-400 rounded-t-lg"></div>
                        <div className="p-2">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-semibold text-yellow-700 px-1.5 py-0.5 bg-yellow-100 rounded">Draft</span>
                            <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                          <h5 className="text-xs font-semibold text-gray-900 mb-1.5">$10K Budget Allocation</h5>
                          <div className="text-xs text-gray-600 space-y-1">
                            <p>Pending Submission</p>
                            <p>Under Approval</p>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-5 h-5 bg-blue-100 rounded-full"></div>
                          </div>
                        </div>
                      </div>

                      {/* Approved Card */}
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition">
                        <div className="h-1.5 bg-green-400 rounded-t-lg"></div>
                        <div className="p-2">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-semibold text-green-700 px-1.5 py-0.5 bg-green-100 rounded">Approved</span>
                            <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                          <h5 className="text-xs font-semibold text-gray-900 mb-1.5">$25K Budget Adjustment</h5>
                          <div className="text-xs text-gray-600 space-y-1">
                            <p>Launch</p>
                            <p>Monitor</p>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-5 h-5 bg-orange-100 rounded-full"></div>
                          </div>
                        </div>
                      </div>

                      {/* Rejected Card */}
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition">
                        <div className="h-1.5 bg-red-400 rounded-t-lg"></div>
                        <div className="p-2">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-semibold text-red-700 px-1.5 py-0.5 bg-red-100 rounded">Rejected</span>
                            <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                          <h5 className="text-xs font-semibold text-gray-900 mb-1.5">Revised Budget Proposal</h5>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-5 h-5 bg-blue-100 rounded-full"></div>
                            <div className="w-5 h-5 bg-green-100 rounded-full -ml-2"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Campaign Execution Column */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-semibold text-gray-700 mb-1">Campaign Execution</h4>

                      {/* Scheduled Card */}
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition">
                        <div className="h-1.5 bg-blue-400 rounded-t-lg"></div>
                        <div className="p-2">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-semibold text-blue-700 px-1.5 py-0.5 bg-blue-100 rounded">Scheduled</span>
                            <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                          <h5 className="text-xs font-semibold text-gray-900 mb-1.5">Facebook Ads Launch</h5>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-5 h-5 bg-purple-100 rounded-full"></div>
                            <div className="w-5 h-5 bg-pink-100 rounded-full -ml-2"></div>
                          </div>
                        </div>
                      </div>

                      {/* In Progress Card */}
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition">
                        <div className="h-1.5 bg-blue-400 rounded-t-lg"></div>
                        <div className="p-2">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-semibold text-blue-700 px-1.5 py-0.5 bg-blue-100 rounded">In Progress</span>
                            <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                          <h5 className="text-xs font-semibold text-gray-900 mb-1.5">Mid-Year Performance Review</h5>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-5 h-5 bg-orange-100 rounded-full"></div>
                            <div className="w-5 h-5 bg-green-100 rounded-full -ml-2"></div>
                          </div>
                        </div>
                      </div>

                      {/* Report Ready Card */}
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition">
                        <div className="h-1.5 bg-gray-400 rounded-t-lg"></div>
                        <div className="p-2">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-700 px-1.5 py-0.5 bg-gray-100 rounded">Report Ready</span>
                            <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                          <h5 className="text-xs font-semibold text-gray-900 mb-1.5">Q3 Campaign Review</h5>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-5 h-5 bg-blue-100 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card - Description */}
            <div className="bg-blue-50 rounded-2xl shadow-xl p-8 pl-24 relative z-20 w-full max-w-2xl lg:-mt-56 lg:-ml-56">
              {/* Smart Workflow Label - Top Left */}
              <div className="absolute top-4 left-4 bg-white rounded-full shadow-lg px-2.5 py-1 flex items-center gap-1.5 z-30 border border-gray-100">
                <RefreshCw className="w-3.5 h-3.5 text-gray-600" />
                <h3 className="text-xs font-normal text-gray-900">Smart Workflow</h3>
              </div>
              <div className="flex flex-col items-end">
                <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-right">
                  <div className="whitespace-nowrap">Connect every stage in</div>
                  <div className="whitespace-nowrap">one seamless workflow.</div>
                </h3>
                <p className="text-lg text-gray-600 mb-8 max-w-md text-right">
                  From creative reviews to budget approvals and campaign execution, MediaJira automates task transitions so your team stays perfectly aligned.
                </p>
                <button
                  onClick={onRedirectToLogin}
                  className="px-6 py-3 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition font-medium"
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Smart Workflow Section - Mobile */}
      <section className="block md:hidden py-10 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          {/* Main Content Card */}
          <div className="bg-blue-50 rounded-2xl p-8 mb-6">
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                Connect every stage in one seamless workflow.
              </h2>
              <p className="text-base text-gray-700 mb-6 leading-relaxed">
                MediaJira automates task transitions so your team stays perfectly aligned.
              </p>
              <div className="flex justify-end">
                <button className="px-6 py-1.5 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition text-sm font-medium">
                  Learn More
                </button>
              </div>
            </div>

            {/* Mini App Preview */}
            <div className="-mx-9 bg-white rounded-2xl shadow-xl p-2 h-auto">
              <div className="bg-white rounded-sm overflow-hidden">
                {/* Top Bar */}
                <div className="bg-white border-b border-gray-200 px-2 py-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative w-[80px] mb-1">
                      <Search className="absolute left-1 top-4 transform -translate-y-1/2 text-gray-400 w-2 h-2" />
                      <input
                        type="text"
                        placeholder="Search"
                        className="w-full pl-4 pr-1 py-1 text-[7px] border border-gray-300 rounded focus:outline-none h-[18px]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="flex items-center gap-0.5 px-1.5 py-1 text-[7px] border border-gray-300 rounded h-[18px]">
                      <Filter className="w-2 h-2" />
                      <span>Filters</span>
                    </button>
                    <button className="px-1.5 py-1 bg-blue-600 text-white rounded text-[7px] font-medium h-[18px]">
                      Create task
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded h-[18px] w-[18px] flex items-center justify-center">
                      <Bell className="w-2 h-2 text-gray-600" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded h-[18px] w-[18px] flex items-center justify-center">
                      <User className="w-2 h-2 text-gray-600" />
                    </button>
                  </div>
                </div>

                <div className="flex h-[215px]">
                  {/* Sidebar */}
                  <div className="w-[60px] bg-gray-50 border-r border-gray-200 p-1 flex flex-col">
                    <div className="space-y-0.5">
                      <button className="w-full flex items-center gap-0.5 px-1 py-0.5 bg-blue-50 text-blue-700 rounded text-[7px] font-medium">
                        <div className="w-1 h-1 bg-blue-600 rounded-full"></div>
                        <span>Dashboard</span>
                      </button>
                      <button className="w-full flex items-center justify-between px-1 py-0.5 text-gray-600 hover:bg-gray-100 rounded text-[7px]">
                        <span>Tasks</span>
                        <span className="px-0.5 py-0 bg-blue-100 text-blue-700 rounded-full text-[6px] font-semibold">16</span>
                      </button>
                    </div>

                    <div className="mt-1 pt-1 border-t border-gray-200 space-y-0.5">
                      <div className="text-[6px] font-semibold text-gray-400 uppercase px-1">MAIN</div>
                      <button className="w-full px-1 py-0.5 text-gray-600 hover:bg-gray-100 rounded text-[7px] text-left">Reports</button>
                      <button className="w-full px-1 py-0.5 text-gray-600 hover:bg-gray-100 rounded text-[7px] text-left">Teams</button>
                      <button className="w-full px-1 py-0.5 text-gray-600 hover:bg-gray-100 rounded text-[7px] text-left">Settings</button>
                    </div>

                    <div className="mt-1 pt-1 border-t border-gray-200 space-y-0.5">
                      <div className="text-[6px] font-semibold text-gray-400 uppercase px-1">RECOMMEND</div>
                      <button className="w-full flex items-center justify-between px-1 py-0.5 text-gray-600 hover:bg-gray-100 rounded text-[7px]">
                        <span>Team</span>
                        <ChevronRight className="w-2 h-2" />
                      </button>
                      <button className="w-full px-1 py-0.5 text-gray-600 hover:bg-gray-100 rounded text-[7px] text-left">Clients</button>
                    </div>

                    <div className="mt-auto pt-1 border-t border-gray-200">
                      <div className="flex items-center gap-0.5">
                        <div className="w-4 h-4 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-[6px] font-semibold text-purple-700">BS</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main Content - 3 Column Kanban Board */}
                  <div className="flex-1 bg-gray-50 p-1.5 overflow-hidden">
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="text-[8px] font-bold text-gray-900 flex items-center gap-1">
                        <RefreshCw className="w-2 h-2 text-gray-400" />
                        Search
                      </h3>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 h-full overflow-auto">
                      {/* Asset Review Column */}
                      <div className="space-y-1">
                        <h4 className="text-[7px] font-semibold text-gray-900 mb-1">Asset Review</h4>

                        {/* Draft Card */}
                        <div className="bg-white rounded border border-gray-200 shadow-sm">
                          <div className="h-0.5 bg-yellow-400 rounded-t"></div>
                          <div className="p-1">
                            <div className="text-[6px] font-semibold text-yellow-700 px-1 py-0.5 bg-yellow-100 rounded mb-0.5 inline-block">Draft</div>
                            <div className="text-[7px] font-medium text-gray-900 mb-1">Draft Video Ad</div>
                            <div className="w-3 h-3 bg-blue-100 rounded-full"></div>
                          </div>
                        </div>

                        {/* Pending Review Card */}
                        <div className="bg-white rounded border border-gray-200 shadow-sm">
                          <div className="h-0.5 bg-orange-400 rounded-t"></div>
                          <div className="p-1">
                            <div className="text-[6px] font-semibold text-orange-700 px-1 py-0.5 bg-orange-100 rounded mb-0.5 inline-block">Pending Review</div>
                            <div className="text-[7px] font-medium text-gray-900 mb-1">Banner Ad - Pending Review</div>
                            <div className="w-3 h-3 bg-green-100 rounded-full"></div>
                          </div>
                        </div>

                        {/* Approved Card */}
                        <div className="bg-white rounded border border-gray-200 shadow-sm">
                          <div className="h-0.5 bg-green-400 rounded-t"></div>
                          <div className="p-1">
                            <div className="text-[6px] font-semibold text-green-700 px-1 py-0.5 bg-green-100 rounded mb-0.5 inline-block">Approved</div>
                            <div className="text-[7px] font-medium text-gray-900 mb-1">Display Ad</div>
                            <div className="text-[6px] text-gray-600 mb-1">
                              <div>• Upload assets</div>
                              <div>• Finalize</div>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <div className="w-3 h-3 bg-purple-100 rounded-full"></div>
                              <div className="w-3 h-3 bg-orange-100 rounded-full -ml-1"></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Budget Approval Column */}
                      <div className="space-y-1">
                        <h4 className="text-[7px] font-semibold text-gray-900 mb-1">Budget Approval</h4>

                        {/* Draft Card */}
                        <div className="bg-white rounded border border-gray-200 shadow-sm">
                          <div className="h-0.5 bg-yellow-400 rounded-t"></div>
                          <div className="p-1">
                            <div className="text-[6px] font-semibold text-yellow-700 px-1 py-0.5 bg-yellow-100 rounded mb-0.5 inline-block">Draft</div>
                            <div className="text-[7px] font-medium text-gray-900 mb-1">$10K Budget Allocation</div>
                            <div className="text-[6px] text-gray-600 mb-1">
                              <div>• Pending Submission</div>
                              <div>• Under Approval</div>
                            </div>
                            <div className="w-3 h-3 bg-blue-100 rounded-full"></div>
                          </div>
                        </div>

                        {/* Approved Card */}
                        <div className="bg-white rounded border border-gray-200 shadow-sm">
                          <div className="h-0.5 bg-green-400 rounded-t"></div>
                          <div className="p-1">
                            <div className="text-[6px] font-semibold text-green-700 px-1 py-0.5 bg-green-100 rounded mb-0.5 inline-block">Approved</div>
                            <div className="text-[7px] font-medium text-gray-900 mb-1">$25K Budget Adjustment</div>
                            <div className="text-[6px] text-gray-600 mb-1">
                              <div>• Launch</div>
                              <div>• Monitor</div>
                            </div>
                            <div className="w-3 h-3 bg-orange-100 rounded-full"></div>
                          </div>
                        </div>

                        {/* Rejected Card */}
                        <div className="bg-white rounded border border-gray-200 shadow-sm">
                          <div className="h-0.5 bg-red-400 rounded-t"></div>
                          <div className="p-1">
                            <div className="text-[6px] font-semibold text-red-700 px-1 py-0.5 bg-red-100 rounded mb-0.5 inline-block">Rejected</div>
                            <div className="text-[7px] font-medium text-gray-900 mb-1">Revised Budget Proposal</div>
                            <div className="flex items-center gap-0.5">
                              <div className="w-3 h-3 bg-blue-100 rounded-full"></div>
                              <div className="w-3 h-3 bg-pink-100 rounded-full -ml-1"></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Campaign Execution Column */}
                      <div className="space-y-1">
                        <h4 className="text-[7px] font-semibold text-gray-900 mb-1">Campaign Execution</h4>

                        {/* Scheduled Card */}
                        <div className="bg-white rounded border border-gray-200 shadow-sm">
                          <div className="h-0.5 bg-blue-400 rounded-t"></div>
                          <div className="p-1">
                            <div className="text-[6px] font-semibold text-blue-700 px-1 py-0.5 bg-blue-100 rounded mb-0.5 inline-block">Scheduled</div>
                            <div className="text-[7px] font-medium text-gray-900 mb-1">Facebook Ads Launch</div>
                            <div className="w-3 h-3 bg-purple-100 rounded-full"></div>
                          </div>
                        </div>

                        {/* In Progress Card */}
                        <div className="bg-white rounded border border-gray-200 shadow-sm">
                          <div className="h-0.5 bg-blue-400 rounded-t"></div>
                          <div className="p-1">
                            <div className="text-[6px] font-semibold text-blue-700 px-1 py-0.5 bg-blue-100 rounded mb-0.5 inline-block">In Progress</div>
                            <div className="text-[7px] font-medium text-gray-900 mb-1">Mid-Year Performance Review</div>
                            <div className="flex items-center gap-0.5">
                              <div className="w-3 h-3 bg-orange-100 rounded-full"></div>
                              <div className="w-3 h-3 bg-green-100 rounded-full -ml-1"></div>
                            </div>
                          </div>
                        </div>

                        {/* Report Ready Card */}
                        <div className="bg-white rounded border border-gray-200 shadow-sm">
                          <div className="h-0.5 bg-gray-400 rounded-t"></div>
                          <div className="p-1">
                            <div className="text-[6px] font-semibold text-gray-700 px-1 py-0.5 bg-gray-100 rounded mb-0.5 inline-block">Report Ready</div>
                            <div className="text-[7px] font-medium text-gray-900 mb-1">Q3 Campaign Review</div>
                            <div className="w-3 h-3 bg-blue-100 rounded-full"></div>
                          </div>
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
