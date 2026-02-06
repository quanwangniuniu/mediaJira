import React from 'react';
import { Bell, Mail } from 'lucide-react';

const meta = {
  title: 'Home/UnifiedNotificationsSection',
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'Unified notifications section with desktop and mobile layouts.',
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
        {/* Unified Notifications Section - Desktop */}
        <section className="hidden md:block py-20 px-6 bg-white">
          <div className="max-w-7xl mx-auto relative">
            <div className="flex flex-col lg:flex-row gap-0 items-center justify-center">
              {/* Left Card - Description */}
              <div className="bg-blue-50 rounded-2xl shadow-xl p-6 relative z-10 w-full max-w-lg lg:ml-[-40px] lg:-mt-12">
                {/* Unified Notifications Button */}
                <div className="absolute top-4 right-4 bg-white rounded-full px-3 py-1.5 shadow-sm flex items-center gap-2 border border-gray-200 z-30">
                  <Bell className="w-4 h-4 text-gray-900" />
                  <span className="text-xs font-normal text-gray-900">Unified Notifications</span>
                </div>
                <div className="max-w-[50%]">
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                    Stay connected with smart, cross-channel alerts.
                  </h3>
                  <p className="text-base text-gray-600 mb-4">
                    Keep up with campaign updates through app, email, and chat — all in one notification hub.
                  </p>
                  <button
                    onClick={redirectToLogin}
                    className="px-6 py-3 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition font-medium shadow-md"
                  >
                    Learn More
                  </button>
                </div>
              </div>

              {/* Right Card - Notification Center */}
              <div className="bg-white rounded-2xl shadow-2xl p-4 relative z-20 lg:-ml-48 lg:mt-8 w-full max-w-lg">
                {/* Header */}
                <div className="flex items-center justify-between mb-3 pt-2">
                  <h4 className="text-lg font-bold text-gray-900">Notification Center</h4>
                  <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Unsubscribe
                  </a>
                </div>

                {/* Enable custom alerts toggle */}
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-900">Enable custom alerts</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>

                {/* Alert channels */}
                <div className="mb-3">
                  <h5 className="text-xs font-semibold text-gray-900 mb-2">Alert channels</h5>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 text-blue-600 bg-blue-600 border-gray-300 rounded focus:ring-blue-500" defaultChecked />
                        <span className="ml-2 text-sm text-gray-700">App</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="ml-2 text-sm text-gray-700">Email</span>
                      </label>
                      <div className="flex items-center">
                        <div className="w-4 h-4 flex items-center justify-center">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52 2.527 2.527 0 0 1 2.52 2.52m6.313-2.52a2.528 2.528 0 0 0-2.521-2.523 2.528 2.528 0 0 0-2.52 2.523 2.528 2.528 0 0 0 2.52 2.521 2.528 2.528 0 0 0 2.521-2.521m6.304 0a2.528 2.528 0 0 0-2.521-2.523 2.528 2.528 0 0 0-2.52 2.523 2.528 2.528 0 0 0 2.52 2.521 2.528 2.528 0 0 0 2.521-2.521m6.313 2.52a2.528 2.528 0 0 0-2.522 2.523 2.528 2.528 0 0 0 2.521 2.523c1.393 0 2.527-1.13 2.527-2.523a2.528 2.528 0 0 0-2.526-2.523" fill="#E01E5A"/>
                            <path d="M8.578 12.645a2.527 2.527 0 0 0 2.52-2.52 2.527 2.527 0 0 0-2.52-2.522 2.527 2.527 0 0 0-2.523 2.522 2.527 2.527 0 0 0 2.523 2.52m6.304 0a2.527 2.527 0 0 0 2.521-2.52 2.527 2.527 0 0 0-2.521-2.522 2.527 2.527 0 0 0-2.52 2.522 2.527 2.527 0 0 0 2.52 2.52m6.313-2.52a2.528 2.528 0 0 0-2.523-2.523 2.528 2.528 0 0 0-2.52 2.523 2.528 2.528 0 0 0 2.52 2.521 2.528 2.528 0 0 0 2.523-2.521m-6.313 2.52a2.528 2.528 0 0 0 2.522 2.523 2.528 2.528 0 0 0 2.521-2.523 2.528 2.528 0 0 0-2.521-2.521 2.528 2.528 0 0 0-2.522 2.521" fill="#36C5F0"/>
                            <path d="M8.578 19.688a2.527 2.527 0 0 0-2.523 2.52 2.527 2.527 0 0 0 2.523 2.523 2.527 2.527 0 0 0 2.52-2.523 2.527 2.527 0 0 0-2.52-2.52m6.304 0a2.527 2.527 0 0 0-2.521 2.52 2.527 2.527 0 0 0 2.521 2.523 2.527 2.527 0 0 0 2.52-2.523 2.527 2.527 0 0 0-2.52-2.52m6.313 2.52a2.528 2.528 0 0 0-2.523 2.523 2.528 2.528 0 0 0 2.521 2.523c1.393 0 2.527-1.13 2.527-2.523a2.528 2.528 0 0 0-2.526-2.523 2.528 2.528 0 0 0-2.523 2.523" fill="#2EB67D"/>
                            <path d="M8.578 5.602a2.527 2.527 0 0 0 2.52 2.523 2.527 2.527 0 0 0 2.522-2.523A2.527 2.527 0 0 0 11.098 3.08 2.527 2.527 0 0 0 8.578 5.602m6.304-2.522a2.527 2.527 0 0 0-2.521 2.523 2.527 2.527 0 0 0 2.521 2.522 2.527 2.527 0 0 0 2.52-2.522 2.527 2.527 0 0 0-2.52-2.523m6.313 2.523a2.528 2.528 0 0 0 2.521 2.522 2.528 2.528 0 0 0 2.523-2.522 2.528 2.528 0 0 0-2.523-2.521 2.528 2.528 0 0 0-2.521 2.521" fill="#ECB22E"/>
                          </svg>
                        </div>
                        <span className="ml-2 text-sm text-gray-700">Slack</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">Workovop sents</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Notification types */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Workflow status changes</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Comments added</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Budget exceeded</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Task assigned to me</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Upcoming deadlines</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Attachment uploaded</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={redirectToLogin}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Unified Notifications Section - Mobile */}
        <section className="block md:hidden py-10 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            {/* Main Content Card */}
            <div className="bg-blue-50 rounded-2xl p-8 mb-6">
              <div className="mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                  Stay connected with smart, cross-channel alerts.
                </h2>
                <p className="text-base text-gray-700 mb-6 leading-relaxed">
                  Keep up with campaign updates through app, email, and chat — all in one notification hub.
                </p>
                <div className="flex justify-end">
                  <button className="px-6 py-1.5 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition text-sm font-medium">
                    Learn More
                  </button>
                </div>
              </div>

              {/* Mini Notification Center Preview */}
              <div className="-mx-9 bg-white rounded-2xl shadow-xl p-2 h-auto overflow-visible">
                <div className="bg-white rounded-sm overflow-visible">
                  {/* Header */}
                  <div className="bg-white border-b border-gray-200 px-2 py-1 flex items-center justify-between">
                    <h4 className="text-[8px] font-bold text-gray-900">Notification Center</h4>
                    <a href="#" className="text-[6px] text-blue-600 font-medium">Unsubscribe</a>
                  </div>

                  {/* Content */}
                  <div className="p-2 bg-white space-y-1.5">
                    {/* Enable custom alerts toggle */}
                    <div className="flex items-center justify-between pb-1 border-b border-gray-200">
                      <span className="text-[7px] font-medium text-gray-900">Enable custom alerts</span>
                      <div className="w-5 h-2.5 bg-blue-600 rounded-full relative">
                        <div className="absolute right-0.5 top-0.5 w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                    </div>

                    {/* Alert channels */}
                    <div className="pb-0">
                      <h5 className="text-[7px] font-semibold text-gray-900 mb-0.5">Alert channels</h5>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-0.5">
                            <div className="w-2 h-2 bg-blue-600 rounded-sm flex items-center justify-center">
                              <span className="text-[5px] text-white">✓</span>
                            </div>
                            <span className="text-[6px] text-gray-700">App</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <svg
                              className="w-2 h-2 text-gray-400"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="3" y="5" width="18" height="14" rx="2" ry="2" fill="white" stroke="gray" />
                              <path d="M3 7L12 13L21 7" stroke="gray" />
                            </svg>
                            <span className="text-[6px] text-gray-700">Email</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <div className="w-2 h-2 flex items-center justify-center">
                              <svg className="w-2 h-2" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M5 10c0-1.1.9-2 2-2h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8z" fill="#E01E5A"/>
                                <path d="M5 10c0-1.1.9-2 2-2h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8z" fill="#36C5F0"/>
                              </svg>
                            </div>
                            <span className="text-[6px] text-gray-700">Slack</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[6px] text-gray-600">Workovop sents</span>
                          <svg
                            className="w-2.5 h-2.5"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path className="border border-gray-300" d="M3 3L21 12L14 14L13 21L3 3Z" />
                          </svg>
                          <div className="ml-auto w-5 h-2.5 bg-gray-200 rounded-full relative">
                            <div className="absolute left-0.5 top-0.5 w-1.5 h-1.5 bg-white rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Two Column Layout */}
                    <div className="relative grid grid-cols-2 justify-center">
                      <div className="absolute right-6 -top-1 bg-blue-50 rounded p-1 mb-1">
                        <p className="text-[6px] text-gray-600 leading-tight">Next round of submissions are due tomorrow</p>
                      </div>
                      {/* Left Column - Checkboxes */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 border border-gray-300 rounded-sm bg-white"></div>
                          <span className="text-[7px] text-gray-700">Workflow status changes</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 border border-gray-300 rounded-sm bg-white"></div>
                          <span className="text-[7px] text-gray-700">Comments added</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 border border-gray-300 rounded-sm bg-white"></div>
                          <span className="text-[7px] text-gray-700">Budget exceeded</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 border border-gray-300 rounded-sm bg-white"></div>
                          <span className="text-[7px] text-gray-700">Task assigned to me</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-blue-600 rounded-sm flex items-center justify-center">
                            <span className="text-[5px] text-white">✓</span>
                          </div>
                          <span className="text-[7px] text-gray-700">Upcoming deadlines</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 border border-gray-300 rounded-sm bg-white"></div>
                          <span className="text-[7px] text-gray-700">Attachment uploaded</span>
                        </div>
                      </div>

                      {/* Right Column - Info and Toggles */}
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-end">
                          <div className="w-5 h-2.5 bg-blue-600 rounded-full relative">
                            <div className="absolute right-0.5 top-0.5 w-1.5 h-1.5 bg-white rounded-full"></div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end">
                          <div className="w-5 h-2.5 bg-gray-200 rounded-full relative">
                            <div className="absolute left-0.5 top-0.5 w-1.5 h-1.5 bg-white rounded-full"></div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end">
                          <div className="w-5 h-2.5 bg-blue-600 rounded-full relative">
                            <div className="absolute right-0.5 top-0.5 w-1.5 h-1.5 bg-white rounded-full"></div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end">
                          <div className="w-5 h-2.5 bg-gray-200 rounded-full relative">
                            <div className="absolute left-0.5 top-0.5 w-1.5 h-1.5 bg-white rounded-full"></div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end">
                          <div className="w-5 h-2.5 bg-blue-600 rounded-full relative">
                            <div className="absolute right-0.5 top-0.5 w-1.5 h-1.5 bg-white rounded-full"></div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end">
                          <div className="w-5 h-2.5 bg-gray-200 rounded-full relative">
                            <div className="absolute left-0.5 top-0.5 w-1.5 h-1.5 bg-white rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-1">
                      <button className="px-2 py-1 bg-blue-600 text-white rounded text-[7px] font-medium">
                        Save
                      </button>
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
