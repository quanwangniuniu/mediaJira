import React from 'react';
import { ChevronDown, Folder } from 'lucide-react';

const meta = {
  title: 'Home/VisualizeCampaignsSection',
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'Visualize campaigns section with desktop and mobile layouts.',
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
      <section className="hidden md:block py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto relative">
          <div className="flex flex-col lg:flex-row gap-0 items-center justify-center">
            <div className="bg-blue-50 rounded-2xl shadow-xl p-8 relative z-10 w-full max-w-xl lg:-mt-16 lg:mr-[-100px]">
              <div className="absolute top-4 right-4 bg-white rounded-full px-3 py-2 shadow-lg z-30 flex items-center gap-2 border border-gray-100">
                <Folder className="w-4 h-4 text-gray-900 fill-current" />
                <span className="text-sm font-normal text-gray-900">Multi-View Control</span>
              </div>
              <div className="max-w-[50%]">
                <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Visualize your campaigns the way you work best.
                </h3>
                <p className="text-lg text-gray-600 mb-8">
                  Create multi-level teams, assign access rights, and onboard users seamlessly with SSO.
                </p>
                <button 
                onClick={redirectToLogin}
                className="px-6 py-3 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition font-medium shadow-md">
                  Learn More
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-2xl pt-3 pl-3 pr-0 pb-32 relative z-20 lg:-ml-40 lg:mt-8 w-full max-w-xl">
              <div className="flex items-center justify-between mb-1 pt-0">
                <h4 className="text-base font-bold text-gray-900">MediaJira - Advertising Projects</h4>
                <div className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg px-2 py-1">
                  <span>Color: Channel</span>
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>

              <div className="relative pb-0">
                <div className="grid grid-cols-[repeat(7,1fr)] gap-1 mb-1">
                  <div className="text-[10px] font-semibold text-gray-600 text-center">May 2025</div>
                  <div className="text-[10px] font-semibold text-gray-600 text-center">Mon 12</div>
                  <div className="text-[10px] font-semibold text-gray-600 text-center">Tue</div>
                  <div className="text-[10px] font-semibold text-gray-600 text-center">Wed</div>
                  <div className="text-[10px] font-semibold text-gray-600 text-center">Thu</div>
                  <div className="text-[10px] font-semibold text-gray-600 text-center">Fri</div>
                  <div className="text-[10px] font-semibold text-gray-600 text-center">Fi</div>
                </div>

                <div className="space-y-0.5 pb-0">
                  <div className="grid grid-cols-[repeat(7,1fr)] gap-1 items-center">
                    <div className="text-xs font-medium text-gray-900 col-span-1">Asset Review</div>
                    <div className="col-span-1"></div>
                    <div className="col-span-2 bg-yellow-300 rounded-lg px-2 py-1 flex items-center justify-between relative">
                      <span className="text-[10px] font-semibold text-gray-900">Design Banner</span>
                      <span className="text-[10px] font-semibold text-gray-900">40%</span>
                    </div>
                    <div className="col-span-3"></div>
                  </div>

                  <div className="grid grid-cols-[repeat(7,1fr)] gap-1 items-center">
                    <div className="text-xs font-medium text-gray-900 col-span-1">Budget Approval</div>
                    <div className="col-span-2"></div>
                    <div className="col-span-1 bg-green-300 rounded-lg px-2 py-1 flex items-center justify-between whitespace-nowrap">
                      <span className="text-[10px] font-semibold text-gray-900 whitespace-nowrap">Allocate Budget</span>
                      <span className="text-[10px] font-semibold text-gray-900 whitespace-nowrap">100%</span>
                    </div>
                    <div className="col-span-3"></div>
                  </div>

                  <div className="grid grid-cols-[repeat(7,1fr)] gap-1 items-center">
                    <div className="text-xs font-medium text-gray-900 col-span-1">Campaign Execution</div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2 bg-blue-300 rounded-lg px-2 py-1 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-gray-900">Launch Google Ads</span>
                      <span className="text-[10px] font-semibold text-gray-900">60%</span>
                    </div>
                    <div className="col-span-2"></div>
                  </div>

                  <div className="grid grid-cols-[repeat(7,1fr)] gap-1 items-center relative">
                    <div className="text-[10px] font-medium text-gray-900 col-span-1">Scheduled</div>
                    <div className="col-span-3"></div>
                    <div className="col-span-2 bg-purple-300 rounded-lg px-1.5 py-0.5 flex items-center justify-between relative">
                      <span className="text-[9px] font-semibold text-gray-900">Analyze Campaign</span>
                      <span className="text-[9px] font-semibold text-gray-900">25%</span>
                      <div className="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-1.5 w-40 z-40">
                        <div className="space-y-0">
                          <div className="px-3 py-0.5 text-xs text-gray-700 hover:bg-gray-100 rounded cursor-pointer">Task settings</div>
                          <div className="px-3 py-0.5 text-xs text-gray-700 hover:bg-gray-100 rounded cursor-pointer">Add subtask</div>
                          <div className="px-3 py-0.5 text-xs text-gray-700 hover:bg-gray-100 rounded cursor-pointer">Add member</div>
                          <div className="px-3 py-0.5 text-xs text-gray-700 hover:bg-gray-100 rounded cursor-pointer">Copy</div>
                          <div className="px-3 py-0.5 text-xs text-gray-700 hover:bg-gray-100 rounded cursor-pointer">Paste</div>
                          <div className="px-3 py-0.5 text-xs text-gray-700 hover:bg-gray-100 rounded cursor-pointer flex items-center justify-between">
                            <span>Color</span>
                            <div className="flex gap-1">
                              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                              <div className="w-3 h-3 rounded-full bg-green-400"></div>
                              <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                              <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-1"></div>
                  </div>

                  <div className="grid grid-cols-[repeat(7,1fr)] gap-1 items-center">
                    <div className="text-xs font-medium text-gray-900 col-span-1">Retrospective</div>
                    <div className="col-span-6"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visualize Campaigns Section - Mobile */}
      <section className="block md:hidden py-10 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          {/* Main Content Card */}
          <div className="bg-blue-50 rounded-2xl p-8 mb-6">
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                Visualize your campaigns the way you work best.
              </h2>
              <p className="text-base text-gray-700 mb-6 leading-relaxed">
                Create multi-level teams, assign access rights, and onboard users seamlessly with SSO.
              </p>
              <div className="flex justify-end">
                <button className="px-6 py-1.5 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition text-sm font-medium">
                  Learn More
                </button>
              </div>
            </div>

            {/* Mini Gantt Chart Preview */}
            <div className="-mx-9 bg-white rounded-2xl shadow-xl p-2 pb-32 h-auto overflow-visible">
              <div className="bg-white rounded-sm overflow-visible">
                {/* Top Bar */}
                <div className="bg-white border-b border-gray-200 px-2 py-1 flex items-center justify-between">
                  <h4 className="text-[8px] font-semibold text-gray-900">MediaJira - Advertising Projects</h4>
                  <div className="flex items-center gap-0.5 text-[7px] text-gray-600 border border-gray-300 rounded px-1 py-0.5">
                    <span>Color: Channel</span>
                    <ChevronDown className="w-2 h-2" />
                  </div>
                </div>

                {/* Gantt Chart */}
                <div className="p-2 bg-white">
                  {/* Timeline Headers */}
                  <div className="grid grid-cols-7 gap-0.5 mb-1">
                    <div className="text-[7px] font-semibold text-gray-600">May 2025</div>
                    <div className="text-[7px] font-semibold text-gray-600 text-center">Mon 12</div>
                    <div className="text-[7px] font-semibold text-gray-600 text-center">Tue</div>
                    <div className="text-[7px] font-semibold text-gray-600 text-center">Wed</div>
                    <div className="text-[7px] font-semibold text-gray-600 text-center">Thu</div>
                    <div className="text-[7px] font-semibold text-gray-600 text-center">Fri</div>
                    <div className="text-[7px] font-semibold text-gray-600 text-center">Sat</div>
                  </div>

                  {/* Gantt Rows */}
                  <div className="space-y-1">
                    {/* Row 1: Asset Review */}
                    <div className="grid grid-cols-7 gap-0.5 items-center">
                      <div className="text-[7px] font-medium text-gray-900 truncate">Asset Review</div>
                      <div></div>
                      <div className="col-span-2 bg-yellow-300 rounded px-1 py-0.5 flex items-center justify-between">
                        <span className="text-[7px] font-semibold text-gray-900">Design Banner</span>
                        <span className="text-[7px] font-semibold text-gray-900">40%</span>
                      </div>
                      <div className="col-span-3"></div>
                    </div>

                    {/* Row 2: Budget Approval */}
                    <div className="grid grid-cols-7 gap-0.5 items-center">
                      <div className="text-[7px] font-medium text-gray-900 truncate">Budget Approval</div>
                      <div className="col-span-2"></div>
                      <div className="bg-green-300 rounded px-1 py-0.5 flex items-center justify-between">
                        <span className="text-[7px] font-semibold text-gray-900 truncate">Allocate Budget</span>
                        <span className="text-[7px] font-semibold text-gray-900 ml-0.5">100%</span>
                      </div>
                      <div className="col-span-3"></div>
                    </div>

                    {/* Row 3: Campaign Execution */}
                    <div className="grid grid-cols-7 gap-0.5 items-center">
                      <div className="text-[7px] font-medium text-gray-900 truncate">Campaign Execution</div>
                      <div className="col-span-2"></div>
                      <div className="col-span-2 bg-blue-300 rounded px-1 py-0.5 flex items-center justify-between">
                        <span className="text-[7px] font-semibold text-gray-900 truncate">Launch Google Ads</span>
                        <span className="text-[7px] font-semibold text-gray-900 ml-0.5">60%</span>
                      </div>
                      <div className="col-span-2"></div>
                    </div>

                    {/* Row 4: Scheduled - with context menu */}
                    <div className="grid grid-cols-7 gap-0.5 items-center relative">
                      <div className="text-[7px] font-medium text-gray-900 truncate">Scheduled</div>
                      <div className="col-span-3"></div>
                      <div className="col-span-2 bg-purple-300 rounded px-1 py-0.5 flex items-center justify-between relative">
                        <span className="text-[7px] font-semibold text-gray-900 truncate">Analyze Campaign</span>
                        <span className="text-[7px] font-semibold text-gray-900 ml-0.5">25%</span>
                        {/* Context Menu */}
                        <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-2xl border border-gray-200 p-1 w-28 z-50">
                          <div className="space-y-0">
                            <button className="w-full text-left px-1.5 py-0.5 text-[7px] text-gray-700 hover:bg-gray-100 rounded">Task settings</button>
                            <button className="w-full text-left px-1.5 py-0.5 text-[7px] text-gray-700 hover:bg-gray-100 rounded">Add subtask</button>
                            <button className="w-full text-left px-1.5 py-0.5 text-[7px] text-gray-700 hover:bg-gray-100 rounded">Add member</button>
                            <button className="w-full text-left px-1.5 py-0.5 text-[7px] text-gray-700 hover:bg-gray-100 rounded">Copy</button>
                            <button className="w-full text-left px-1.5 py-0.5 text-[7px] text-gray-700 hover:bg-gray-100 rounded">Paste</button>
                            <div className="px-1.5 py-0.5 text-[7px] text-gray-700 hover:bg-gray-100 rounded flex items-center justify-between">
                              <span>Color</span>
                              <div className="flex gap-0.5">
                                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Row 5: Retrospective */}
                    <div className="grid grid-cols-7 gap-0.5 items-center">
                      <div className="text-[7px] font-medium text-gray-900 truncate">Retrospective</div>
                      <div className="col-span-6"></div>
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
