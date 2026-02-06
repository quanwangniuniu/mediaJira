import React from 'react';
import {
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Info,
  MoreVertical,
  RefreshCw,
} from 'lucide-react';

const meta = {
  title: 'Home/HeroSection',
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'Hero section for the home page with desktop and mobile layouts.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  render: () => {
    const handleGetStartedClick = () => {};

    return (
      <>
        {/* Hero Section - Desktop */}
        <section className="hidden md:block py-8 px-6 bg-white">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2 leading-tight">
              The Ultimate Work Operating System<br />for Advertising Teams
            </h2>
            <p className="text-base md:text-lg text-gray-600 mb-6 max-w-3xl mx-auto leading-relaxed">
              Integrating asset management, budget approval, campaign execution, and performance
              review into a unified platform, covering every stage of the advertising lifecycle.
            </p>
            <button 
            onClick={handleGetStartedClick}
            className="px-8 py-3 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition text-base font-medium inline-flex items-center gap-2 shadow-lg mb-8">
              Get Started <ChevronRight className="w-5 h-5" />
            </button>

            {/* Workflow Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8 max-w-2xl mx-auto relative">
              {/* Staggered card positioning with slight overlaps */}
              <div className="bg-white rounded-xl shadow-lg p-4 text-left relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 bg-orange-200 rounded-full overflow-hidden flex-shrink-0">
                    <img 
                      src="https://i.pravatar.cc/150?img=1" 
                      alt="User" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-base">Asset Review</h3>
                  <Info className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
                </div>
                <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full mb-2">
                  <Clock className="w-3 h-3" />
                  <span className="font-medium text-xs">Pending Review</span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-1.5 bg-gray-200 rounded w-full"></div>
                  <div className="h-1.5 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-4 text-left relative z-20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 bg-purple-200 rounded-full overflow-hidden flex-shrink-0">
                    <img 
                      src="https://i.pravatar.cc/150?img=12" 
                      alt="User" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-base">Budget Approval</h3>
                  <Info className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
                </div>
                <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-2 py-1 rounded-full mb-2">
                  <CheckCircle className="w-3 h-3" />
                  <span className="font-medium text-xs">Approved</span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-1.5 bg-gray-200 rounded w-full"></div>
                  <div className="h-1.5 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-4 text-left relative z-30 -mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 bg-blue-200 rounded-full overflow-hidden flex-shrink-0">
                    <img 
                      src="https://i.pravatar.cc/150?img=33" 
                      alt="User" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-base">Campaign Execution</h3>
                  <Info className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
                </div>
                <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-2 py-1 rounded-full mb-2">
                  <RefreshCw className="w-3 h-3" />
                  <span className="font-medium text-xs">In Progress</span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-1.5 bg-gray-200 rounded w-full"></div>
                  <div className="h-1.5 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-4 text-left relative z-40 -mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 bg-pink-200 rounded-full overflow-hidden flex-shrink-0">
                    <img 
                      src="https://i.pravatar.cc/150?img=47" 
                      alt="User" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-base">Scheduled Retrospective</h3>
                  <Info className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
                </div>
                <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-2 py-1 rounded-full mb-2">
                  <Calendar className="w-3 h-3" />
                  <span className="font-medium text-xs">Scheduled</span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-1.5 bg-gray-200 rounded w-full"></div>
                  <div className="h-1.5 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Hero Section - Mobile */}
        <section className="block md:hidden py-8 px-6 bg-blue-50 md:bg-gradient-to-b md:from-blue-50 md:to-white">
          <div className="space-y-4">
            {/* Main Hero Card */}
            <div className="bg-white rounded-3xl shadow-lg p-8 text-center max-w-sm mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
                Your Ultimate<br />Ad Work OS
              </h2>
              <p className="text-base text-gray-700 mb-8 leading-relaxed">
                Integrates assets, budgets, execution, and review into one ad-lifecycle platform
              </p>
              <button onClick={handleGetStartedClick} className="px-8 py-3 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition text-base font-medium inline-flex items-center gap-2 shadow-lg">
                Get Started <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Feature Cards - Mobile with Horizontal Scroll */}
            <div className="overflow-x-auto scrollbar-hide -mx-6 snap-x snap-mandatory scroll-smooth">
              <div className="flex gap-4 min-w-max">
                {/* Asset Review Card */}
                <div className="bg-white rounded-xl shadow-lg p-4 text-left flex-shrink-0 w-[50vw] snap-start">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-purple-200 rounded-full overflow-hidden flex-shrink-0">
                      <img 
                        src="https://i.pravatar.cc/150?img=1" 
                        alt="User" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-xs flex-1">Asset Review</h3>
                    <MoreVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </div>
                  <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full mb-2">
                    <Clock className="w-3 h-3" />
                    <span className="font-medium text-xs">Pending Review</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-1.5 bg-gray-200 rounded w-full"></div>
                    <div className="h-1.5 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>

                {/* Budget Approval Card */}
                <div className="bg-white rounded-xl shadow-lg p-4 text-left flex-shrink-0 w-[50vw] snap-start">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-purple-200 rounded-full overflow-hidden flex-shrink-0">
                      <img 
                        src="https://i.pravatar.cc/150?img=12" 
                        alt="User" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-xs flex-1">Budget Approval</h3>
                    <MoreVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </div>
                  <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-2 py-1 rounded-full mb-2">
                    <CheckCircle className="w-3 h-3" />
                    <span className="font-medium text-xs">Approved</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-1.5 bg-gray-200 rounded w-full"></div>
                    <div className="h-1.5 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>

                {/* Additional cards for scrolling effect */}
                <div className="bg-white rounded-xl shadow-lg p-4 text-left flex-shrink-0 w-[50vw] snap-start">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-blue-200 rounded-full overflow-hidden flex-shrink-0">
                      <img 
                        src="https://i.pravatar.cc/150?img=33" 
                        alt="User" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-xs flex-1">Campaign Execution</h3>
                    <MoreVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </div>
                  <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-2 py-1 rounded-full mb-2">
                    <RefreshCw className="w-3 h-3" />
                    <span className="font-medium text-xs">In Progress</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-1.5 bg-gray-200 rounded w-full"></div>
                    <div className="h-1.5 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-4 text-left flex-shrink-0 w-[50vw] snap-start">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-pink-200 rounded-full overflow-hidden flex-shrink-0">
                      <img 
                        src="https://i.pravatar.cc/150?img=47" 
                        alt="User" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-xs flex-1">Scheduled Retrospective</h3>
                    <MoreVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </div>
                  <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-2 py-1 rounded-full mb-2">
                    <RefreshCw className="w-3 h-3" />
                    <span className="font-medium text-xs">Scheduled</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-1.5 bg-gray-200 rounded w-full"></div>
                    <div className="h-1.5 bg-gray-200 rounded w-3/4"></div>
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
