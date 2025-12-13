import React from 'react';
import Link from 'next/link';
import { CheckCircle, Clock, Calendar, RefreshCw, Info, Grid3x3, Lock, Search, MoreVertical, X, ChevronDown, Filter, Plus, Bell, User, ChevronRight, Folder, Zap, Settings, BarChart3, Users, FileText, TrendingUp, ArrowRight, Mail, Hand } from 'lucide-react';
import MobileMenu from '../components/MobileMenu';

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="hidden md:block border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <h1 className="text-3xl font-bold">
              <span className="text-blue-800">Media</span>
              <span className="text-gray-900">Jira</span>
            </h1>
            <nav className="hidden lg:flex gap-6">
              <a href="#" className="text-gray-700 hover:text-gray-900">Features</a>
              <a href="#" className="text-gray-700 hover:text-gray-900">Solutions</a>
              <a href="#" className="text-gray-700 hover:text-gray-900">Pricing</a>
              <a href="#" className="text-gray-700 hover:text-gray-900">Resource</a>
            </nav>
          </div>
          <div className="flex items-center gap-3 mt-auto">
            <button className="px-6 py-2 text-blue-800 border border-blue-800 rounded-full hover:bg-blue-50 transition bg-white">
              Log in
            </button>
            <button className="px-6 py-2 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition">
              Get Started
            </button>
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <Grid3x3 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

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
          <button className="px-8 py-3 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition text-base font-medium inline-flex items-center gap-2 shadow-lg mb-8">
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

            <div className="bg-white rounded-xl shadow-lg p-4 text-left relative z-20 mt-2">
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

            <div className="bg-white rounded-xl shadow-lg p-4 text-left relative z-40 -mt-4">
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

      {/* Why MediaJira Section */}
      <section className="hidden md:block py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-gray-900 mb-4">
            Why MediaJira?
          </h2>
          <p className="text-center text-gray-600 mb-16 text-lg">
            MediaJira turns these challenges into a streamlined, end-to-end solution.
          </p>

          {/* Persona Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Designer Card */}
            <div className="bg-blue-50 rounded-2xl p-6 hover:shadow-lg transition">
              <div className="flex items-start gap-4 mb-2">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Designer</h3>
                  <p className="text-gray-700 italic text-sm leading-relaxed">
                    "My creative files get lost in endless email threads, and approvals take forever."
                  </p>
                </div>
                <div className="w-44 h-44 flex-shrink-0 overflow-hidden">
                  <img 
                    src="/Standing woman working from home.png" 
                    alt="Designer" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Senior Media Buyer Card */}
            <div className="bg-blue-50 rounded-2xl p-6 hover:shadow-lg transition">
              <div className="flex items-start gap-4 mb-2">
                <div className="w-44 h-44 flex-shrink-0 overflow-hidden">
                  <img 
                    src="/Man studying or working on laptop.png" 
                    alt="Project Management" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Senior Media Buyer</h3>
                  <p className="text-gray-700 italic text-sm leading-relaxed">
                    "Budgets are tracked in spreadsheets, and I never know if the latest version is approved."
                  </p>
                </div>
              </div>
            </div>

            {/* Specialist Media Buyer Card */}
            <div className="bg-blue-50 rounded-2xl p-6 hover:shadow-lg transition">
              <div className="flex items-start gap-4 mb-2">
                <div className="w-44 h-44 flex-shrink-0 overflow-hidden">
                  <img 
                    src="/Project management and problem solving skills.png" 
                    alt="Media Buyer" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Specialist Media Buyer</h3>
                  <p className="text-gray-700 italic text-sm leading-relaxed">
                    "Managing Google Ads, TikTok, and Facebook separately wastes time and causes errors."
                  </p>
                </div>
              </div>
            </div>

            {/* Data Analyst Card */}
            <div className="bg-blue-50 rounded-2xl p-6 hover:shadow-lg transition">
              <div className="flex items-start gap-4 mb-2">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Data Analyst</h3>
                  <p className="text-gray-700 italic text-sm leading-relaxed">
                    "I spend days collecting data from different tools just to prepare a report."
                  </p>
                </div>
                <div className="w-44 h-44 flex-shrink-0 overflow-hidden">
                  <img 
                    src="/Woman programming on laptop.png" 
                    alt="Data Analyst" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User & Permission Management Section - Desktop */}
      <section className="hidden md:block py-12 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Powerful tools to manage every stage of your advertising workflow
            </h2>
            <p className="text-base text-gray-600 max-w-3xl mx-auto">
              From setup to optimization, every feature works together to keep your campaigns in sync.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 items-start relative">
            {/* Left Card - Description */}
            <div className="bg-blue-50 rounded-2xl p-3 relative overflow-hidden z-10 lg:ml-16 lg:mr-8 lg:-mt-6">
              <div className="absolute top-3 right-3">
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-900 rounded-full hover:bg-gray-50 transition border border-gray-200">
                  <Lock className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Manage Access & Roles</span>
                </button>
              </div>
              <div className="py-3 max-w-[50%]">
                <h3 className="text-2xl font-bold text-gray-900 mb-2 text-left">
                  Empower every role with secure, granular permissions.
                </h3>
                <p className="text-gray-700 text-base mb-2 text-left">
                  Create multi-level teams, assign access rights, and onboard users seamlessly with SSO.
                </p>
                <button className="px-5 py-2.5 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition text-sm font-medium">
                  Learn More
                </button>
              </div>
            </div>

            {/* Right Card - User & Permission Management */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-3 relative z-20 lg:-ml-56 lg:mt-6 max-w-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg font-bold text-gray-900">User & Permission Management</h4>
                <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs font-medium">
                  Invite
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative mb-2 max-w-md">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users"
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* User List with Name and Role */}
              <div className="relative pr-72">
                {/* Table Header */}
                <div className="grid grid-cols-[1fr_auto] gap-4 items-center pb-2 border-b border-gray-200 mb-2 px-1">
                  <span className="text-xs font-semibold text-gray-600">Name</span>
                  <span className="text-xs font-semibold text-gray-600 text-left min-w-[180px] ml-12">Role</span>
                </div>
                {/* User List */}
                <div className="space-y-2">
                  {/* User 1 */}
                  <div className="grid grid-cols-[1fr_auto] gap-4 items-center py-1.5 hover:bg-gray-50 rounded-lg px-1 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-purple-700">AB</span>
                      </div>
                      <span className="text-xs font-medium text-gray-900">Alice Brown</span>
                    </div>
                    <span className="text-xs text-gray-900 text-left min-w-[180px]">Organization Admin</span>
                  </div>

                  {/* User 2 */}
                  <div className="grid grid-cols-[1fr_auto] gap-4 items-center py-1.5 hover:bg-gray-50 rounded-lg px-1 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-blue-700">JW</span>
                      </div>
                      <span className="text-xs font-medium text-gray-900">Jack Wilson</span>
                    </div>
                    <span className="text-xs text-gray-900 text-left min-w-[180px]">Media Buyer</span>
                  </div>

                  {/* User 3 */}
                  <div className="grid grid-cols-[1fr_auto] gap-4 items-center py-1.5 hover:bg-gray-50 rounded-lg px-1 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-green-700">ET</span>
                      </div>
                      <span className="text-xs font-medium text-gray-900">Eve Turner</span>
                    </div>
                    <span className="text-xs text-gray-900 text-left min-w-[180px]">Cretape Creativ Team</span>
                  </div>

                  {/* User 4 */}
                  <div className="grid grid-cols-[1fr_auto] gap-4 items-center py-1.5 hover:bg-gray-50 rounded-lg px-1 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-orange-700">GL</span>
                      </div>
                      <span className="text-xs font-medium text-gray-900">Grace Lee</span>
                    </div>
                    <span className="text-xs text-gray-900 text-left min-w-[180px]">Data Analyst Operations</span>
                  </div>
                </div>

                {/* Role Permissions Panel - Overlay - Right */}
                <div className="absolute -top-8 right-0 bg-white rounded-xl p-3 border border-gray-200 shadow-lg z-30 w-56">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-bold text-gray-900">Role Permissions</h5>
                    <button className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Role</label>
                    <div className="relative">
                      <select className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-2 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs">
                        <option>Media Buyer</option>
                        <option>Organization Admin</option>
                        <option>Creative Team</option>
                        <option>Data Analyst</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <h6 className="text-xs font-semibold text-gray-900 mb-2">Module-based permissions</h6>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                        <span className="text-xs text-gray-700">Asset Management</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                        <span className="text-xs text-gray-700">Budget Approval</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                        <span className="text-xs text-gray-700">Campaign Execution</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                        <span className="text-xs text-gray-700">Reporting</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                        <span className="text-xs text-gray-700">Delete</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end mt-2">
                    <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs font-medium">
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Smart Workflow Section - Desktop */}
      <section className="hidden md:block py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto relative">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-center relative">
            {/* Left Card - Workflow Application */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden relative z-30 w-full max-w-4xl lg:ml-24 lg:mt-32">
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
                  <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Filter className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Filters</span>
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Create task</span>
                  </button>
                  <button className="p-1.5 hover:bg-gray-100 rounded-lg">
                    <Bell className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-1.5 hover:bg-gray-100 rounded-lg">
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
                <button className="px-6 py-3 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition font-medium">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visualize Campaigns Section - Desktop */}
      <section className="hidden md:block py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto relative">
          <div className="flex flex-col lg:flex-row gap-0 items-start justify-center">
            {/* Left Card - Description */}
            <div className="bg-blue-50 rounded-2xl shadow-xl p-8 relative z-10 w-full max-w-xl lg:-mt-16 lg:mr-[-100px]">
              {/* Multi-View Control Button */}
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
                <button className="px-6 py-3 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition font-medium shadow-md">
                  Learn More
                </button>
              </div>
            </div>

            {/* Right Card - Gantt Chart */}
            <div className="bg-white rounded-2xl shadow-2xl pt-3 pl-3 pr-0 pb-32 relative z-20 lg:-ml-40 lg:mt-8 w-full max-w-xl">
              {/* Top Bar */}
              <div className="flex items-center justify-between mb-1 pt-0">
                <h4 className="text-base font-bold text-gray-900">MediaJira - Advertising Projects</h4>
                <div className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg px-2 py-1">
                  <span>Color: Channel</span>
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>

              {/* Gantt Chart */}
              <div className="relative pb-0">
                {/* Timeline Headers */}
                <div className="grid grid-cols-[repeat(7,1fr)] gap-1 mb-1">
                  <div className="text-[10px] font-semibold text-gray-600 text-center">May 2025</div>
                  <div className="text-[10px] font-semibold text-gray-600 text-center">Mon 12</div>
                  <div className="text-[10px] font-semibold text-gray-600 text-center">Tue</div>
                  <div className="text-[10px] font-semibold text-gray-600 text-center">Wed</div>
                  <div className="text-[10px] font-semibold text-gray-600 text-center">Thu</div>
                  <div className="text-[10px] font-semibold text-gray-600 text-center">Fri</div>
                  <div className="text-[10px] font-semibold text-gray-600 text-center">Fi</div>
                </div>

                {/* Gantt Rows */}
                <div className="space-y-0.5 pb-0">
                  {/* Row 1: Asset Review with Design Banner */}
                  <div className="grid grid-cols-[repeat(7,1fr)] gap-1 items-center">
                    <div className="text-xs font-medium text-gray-900 col-span-1">Asset Review</div>
                    <div className="col-span-1"></div>
                    <div className="col-span-2 bg-yellow-300 rounded-lg px-2 py-1 flex items-center justify-between relative">
                      <span className="text-[10px] font-semibold text-gray-900">Design Banner</span>
                      <span className="text-[10px] font-semibold text-gray-900">40%</span>
                    </div>
                    <div className="col-span-3"></div>
                  </div>

                  {/* Row 2: Budget Approval with Allocate Budget */}
                  <div className="grid grid-cols-[repeat(7,1fr)] gap-1 items-center">
                    <div className="text-xs font-medium text-gray-900 col-span-1">Budget Approval</div>
                    <div className="col-span-2"></div>
                    <div className="col-span-1 bg-green-300 rounded-lg px-2 py-1 flex items-center justify-between whitespace-nowrap">
                      <span className="text-[10px] font-semibold text-gray-900 whitespace-nowrap">Allocate Budget</span>
                      <span className="text-[10px] font-semibold text-gray-900 whitespace-nowrap">100%</span>
                    </div>
                    <div className="col-span-3"></div>
                  </div>

                  {/* Row 3: Campaign Execution with Launch Google Ads */}
                  <div className="grid grid-cols-[repeat(7,1fr)] gap-1 items-center">
                    <div className="text-xs font-medium text-gray-900 col-span-1">Campaign Execution</div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2 bg-blue-300 rounded-lg px-2 py-1 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-gray-900">Launch Google Ads</span>
                      <span className="text-[10px] font-semibold text-gray-900">60%</span>
                    </div>
                    <div className="col-span-2"></div>
                  </div>

                  {/* Row 4: Scheduled with Analyze Campaign */}
                  <div className="grid grid-cols-[repeat(7,1fr)] gap-1 items-center relative">
                    <div className="text-[10px] font-medium text-gray-900 col-span-1">Scheduled</div>
                    <div className="col-span-3"></div>
                    <div className="col-span-2 bg-purple-300 rounded-lg px-1.5 py-0.5 flex items-center justify-between relative">
                      <span className="text-[9px] font-semibold text-gray-900">Analyze Campaign</span>
                      <span className="text-[9px] font-semibold text-gray-900">25%</span>
                      {/* Context Menu Popup */}
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

                  {/* Row 5: Retrospective */}
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

      {/* Automated Efficiency Section - Desktop */}
      <section className="hidden md:block py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto relative">
          <div className="flex flex-col lg:flex-row gap-0 items-center justify-center">
            {/* Left Card - Application Interface */}
            <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-100 p-6 relative z-30 w-full max-w-xl lg:ml-[-40px] lg:mt-20">
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

      {/* Unified Notifications Section - Desktop */}
      <section className="hidden md:block py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto relative">
          <div className="flex flex-col lg:flex-row gap-0 items-start justify-center">
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
                <button className="px-6 py-3 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition font-medium shadow-md">
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
                  <div className="w-11 h-6 bg-blue-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
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
                    <div className="w-11 h-6 bg-blue-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
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
                    <div className="w-11 h-6 bg-blue-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
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
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Insightful Analytics Section - Desktop */}
      <section className="hidden md:block py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto relative">
          <div className="lg:flex-row gap-0 items-start justify-center">
            {/* Left Card - Analytics Dashboard */}
            <div className="bg-white rounded-2xl shadow-2xl p-3 relative z-30 w-full max-w-lg lg:ml-[-120px] lg:mt-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-base font-bold text-gray-900">Overview</h4>
                <button className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium">
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
            <div className="bg-blue-50 rounded-2xl shadow-xl p-8 relative z-20 lg:-ml-48 lg:-mt-16 w-full max-w-xl">
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
              <button className="absolute bottom-8 right-8 px-6 py-3 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition font-medium shadow-md">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

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
            <button className="px-8 py-4 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition font-medium text-lg inline-flex items-center gap-2 shadow-lg">
              Start Your Journey Today
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials Section -Desktop */}
      <section className="hidden md:block py-20 px-6 bg-blue-50 rounded-t-3xl">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              What teams love about<br />
              MediaJira?
            </h2>
            <p className="text-lg text-gray-600 mx-auto text-center whitespace-nowrap">
              From setup to reporting, MediaJira helps teams stay aligned, efficient, and confident in every campaign.
            </p>
          </div>

          {/* Testimonial Cards with Carousel */}
          <div className="mb-12 relative overflow-hidden">
            <div className="flex gap-6 animate-marquee group hover:[animation-play-state:paused]">
              {/* Testimonial 1 */}
              <div className="bg-white rounded-xl shadow-lg p-6 min-w-[350px] flex-shrink-0 hover:scale-110 transition-transform duration-300 cursor-pointer flex flex-col">
                <p className="text-gray-700 mb-4 italic flex-grow relative mx-auto text-center">
                  <img src="/opening quote.png" alt="Opening quote" className="absolute top-0 -left-12 w-4 h-4" />
                  <img src="/closing quote.png" alt="Closing quote" className="absolute bottom-0 -right-12 w-4 h-4" />
                  Finally, one place to manage<br />
                  budgets, assets, and approvals.<br />
                  We cut our setup time by half.
                </p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-12 h-12 bg-blue-100 rounded-full overflow-hidden flex-shrink-0">
                    <img 
                      src="https://i.pravatar.cc/150?img=68" 
                      alt="Jack Wilson" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Jack Wilson</div>
                    <div className="text-sm text-gray-600">Senior Media Buyer</div>
                  </div>
                </div>
              </div>

              {/* Testimonial 2 */}
              <div className="bg-white rounded-xl shadow-lg p-6 min-w-[350px] flex-shrink-0 hover:scale-110 transition-transform duration-300 cursor-pointer flex flex-col">
                <p className="text-gray-700 mb-4 italic flex-grow relative mx-auto text-center">
                  <img src="/opening quote.png" alt="Opening quote" className="absolute top-0 -left-12 w-4 h-4" />
                  <img src="/closing quote.png" alt="Closing quote" className="absolute bottom-0 -right-12 w-4 h-4" />
                  I love how the review and<br />
                  approval flow feels natural.<br />
                  No more endless Slack threads.
                </p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-12 h-12 bg-green-100 rounded-full overflow-hidden flex-shrink-0">
                    <img 
                      src="https://i.pravatar.cc/150?img=47" 
                      alt="Eve Turner" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Eve Turner</div>
                    <div className="text-sm text-gray-600">Designer</div>
                  </div>
                </div>
              </div>

              {/* Testimonial 3 */}
              <div className="bg-white rounded-xl shadow-lg p-6 min-w-[350px] flex-shrink-0 hover:scale-110 transition-transform duration-300 cursor-pointer flex flex-col">
                <p className="text-gray-700 mb-4 italic flex-grow relative mx-auto text-center">
                  <img src="/opening quote.png" alt="Opening quote" className="absolute top-0 -left-12 w-4 h-4" />
                  <img src="/closing quote.png" alt="Closing quote" className="absolute bottom-0 -right-12 w-4 h-4" />
                  The reporting dashboard gives<br />
                  instant clarity. We spot<br />
                  underperforming channels in<br />
                  minutes.
                </p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-12 h-12 bg-orange-100 rounded-full overflow-hidden flex-shrink-0">
                    <img 
                      src="https://i.pravatar.cc/150?img=59" 
                      alt="Grace Lee" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Grace Lee</div>
                    <div className="text-sm text-gray-600">Data Analyst</div>
                  </div>
                </div>
              </div>

              {/* Duplicate cards for seamless loop */}
              <div className="bg-white rounded-xl shadow-lg p-6 min-w-[350px] flex-shrink-0 hover:scale-110 transition-transform duration-300 cursor-pointer flex flex-col">
                <p className="text-gray-700 mb-4 italic flex-grow relative mx-auto text-center">
                  <img src="/opening quote.png" alt="Opening quote" className="absolute top-0 -left-12 w-4 h-4" />
                  <img src="/closing quote.png" alt="Closing quote" className="absolute bottom-0 -right-12 w-4 h-4" />
                  Finally, one place to manage<br />
                  budgets, assets, and approvals.<br />
                  We cut our setup time by half.
                </p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-12 h-12 bg-blue-100 rounded-full overflow-hidden flex-shrink-0">
                    <img 
                      src="https://i.pravatar.cc/150?img=68" 
                      alt="Jack Wilson" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Jack Wilson</div>
                    <div className="text-sm text-gray-600">Senior Media Buyer</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 min-w-[350px] flex-shrink-0 hover:scale-110 transition-transform duration-300 cursor-pointer flex flex-col">
                <p className="text-gray-700 mb-4 italic flex-grow relative mx-auto text-center">
                  <img src="/opening quote.png" alt="Opening quote" className="absolute top-0 -left-12 w-4 h-4" />
                  <img src="/closing quote.png" alt="Closing quote" className="absolute bottom-0 -right-12 w-4 h-4" />
                  I love how the review and<br />
                  approval flow feels natural.<br />
                  No more endless Slack threads.
                </p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-12 h-12 bg-green-100 rounded-full overflow-hidden flex-shrink-0">
                    <img 
                      src="https://i.pravatar.cc/150?img=47" 
                      alt="Eve Turner" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Eve Turner</div>
                    <div className="text-sm text-gray-600">Designer</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 min-w-[350px] flex-shrink-0 hover:scale-110 transition-transform duration-300 cursor-pointer flex flex-col">
                <p className="text-gray-700 mb-4 italic flex-grow relative mx-auto text-center">
                  <img src="/opening quote.png" alt="Opening quote" className="absolute top-0 -left-12 w-4 h-4" />
                  <img src="/closing quote.png" alt="Closing quote" className="absolute bottom-0 -right-12 w-4 h-4" />
                  The reporting dashboard gives<br />
                  instant clarity. We spot<br />
                  underperforming channels in<br />
                  minutes.
                </p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-12 h-12 bg-orange-100 rounded-full overflow-hidden flex-shrink-0">
                    <img 
                      src="https://i.pravatar.cc/150?img=59" 
                      alt="Grace Lee" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Grace Lee</div>
                    <div className="text-sm text-gray-600">Data Analyst</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button className="px-8 py-4 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition font-medium text-lg inline-flex items-center gap-2 shadow-lg">
              See All Reviews
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section - Desktop */}
      <section className="hidden md:block py-32 px-6 bg-blue-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-[1.8]">
            Ready to transform your<br />
            Ad operations?
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto whitespace-nowrap">
            Simplify every stage of your advertising lifecycle — from planning to performance.
          </p>
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
            <button className="px-8 py-4 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition font-medium text-lg inline-flex items-center gap-2 shadow-lg justify-center w-[200px]">
              Get Started
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="px-8 py-4 border-2 border-blue-600 text-blue-600 bg-white rounded-full hover:bg-blue-50 transition font-medium text-lg shadow-lg inline-flex items-center justify-center w-[200px]">
              Contact Us
            </button>
          </div>
        </div>
      </section>

      {/* Footer - Desktop */}
      <footer className="hidden md:block bg-white border-t border-gray-200 pt-16 pb-4 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start mb-4">
            {/* Logo and Email */}
            <div className="mb-4 md:mb-0 md:ml-32">
              <h3 className="text-2xl font-bold mb-2 text-left">
                <span className="text-blue-600">Media</span>
                <span className="text-gray-900">Jira</span>
              </h3>
              <p className="text-gray-600 mb-6 text-left">One platform.<br />Every stage.</p>
              <div className="relative w-fit">
                <input
                  type="email"
                  placeholder="Enter Your Email"
                  className="w-64 px-4 pr-24 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
                />
                <button className="absolute right-1 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition text-sm">
                  Submit
                </button>
              </div>
            </div>

            {/* Four Columns */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:-ml-24">
              {/* Product */}
              <div>
                <h4 className="font-normal text-gray-900 mb-4">Product</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-600 hover:text-gray-900">Features</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-gray-900">How it works</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-gray-900">Pricing</a></li>
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h4 className="font-normal text-gray-900 mb-4">Resources</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-600 hover:text-gray-900">Blog</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-gray-900">Case Studies</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-gray-900">Guides</a></li>
                </ul>
              </div>

              {/* Company */}
              <div>
                <h4 className="font-normal text-gray-900 mb-4">Company</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-600 hover:text-gray-900">About</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-gray-900">Contact us</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-gray-900">Careers</a></li>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h4 className="font-normal text-gray-900 mb-4">Legal</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-600 hover:text-gray-900">Privacy Policy</a></li>
                  <li><a href="#" className="text-gray-600 hover:text-gray-900">Terms of Service</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Header - Mobile */}
      <header className="block md:hidden border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            <span className="text-blue-800">Media</span>
            <span className="text-gray-900">Jira</span>
          </h1>
          <MobileMenu />
        </div>
      </header>
      
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
            <button className="px-8 py-3 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition text-base font-medium inline-flex items-center gap-2 shadow-lg">
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

      {/* Why MediaJira Section - Mobile */}
      <section className="block md:hidden py-12 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-center text-gray-900 mb-3 md:mb-4">
            Why MediaJira?
          </h2>
          <p className="text-center text-gray-600 mb-8 md:mb-15 text-base md:text-lg">
            MediaJira turns these challenges into a streamlined, end-to-end solution.
          </p>

          {/* Persona Cards - Vertical layout on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Designer Card */}
            <div className="bg-blue-50 rounded-2xl p-4 md:p-6 hover:shadow-lg transition">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="flex-1">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Designer</h3>
                  <p className="text-gray-700 italic text-xs md:text-sm leading-relaxed">
                    "My creative files get lost in endless email threads, and approvals take forever."
                  </p>
                </div>
                <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 overflow-hidden">
                  <img 
                    src="/Standing woman working from home.png" 
                    alt="Designer" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Senior Media Buyer Card */}
            <div className="bg-blue-50 rounded-2xl p-4 md:p-6 hover:shadow-lg transition">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 overflow-hidden">
                  <img 
                    src="/Man studying or working on laptop.png" 
                    alt="Project Management" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Senior Media Buyer</h3>
                  <p className="text-gray-700 italic text-xs md:text-sm leading-relaxed">
                    "Budgets are tracked in spreadsheets, and I never know if the latest version is approved."
                  </p>
                </div>
              </div>
            </div>

            {/* Specialist Media Buyer Card */}
            <div className="bg-blue-50 rounded-2xl p-4 md:p-6 hover:shadow-lg transition">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 overflow-hidden">
                  <img 
                    src="/Project management and problem solving skills.png" 
                    alt="Media Buyer" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Specialist Media Buyer</h3>
                  <p className="text-gray-700 italic text-xs md:text-sm leading-relaxed">
                    "Managing Google Ads, TikTok, and Facebook separately wastes time and causes errors."
                  </p>
                </div>
              </div>
            </div>

            {/* Data Analyst Card */}
            <div className="bg-blue-50 rounded-2xl p-4 md:p-6 hover:shadow-lg transition">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="flex-1">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Data Analyst</h3>
                  <p className="text-gray-700 italic text-xs md:text-sm leading-relaxed">
                    "I spend days collecting data from different tools just to prepare a report."
                  </p>
                </div>
                <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 overflow-hidden">
                  <img 
                    src="/Woman programming on laptop.png" 
                    alt="Data Analyst" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User & Permission Management Section - Mobile */}
      <section className="block md:hidden py-10 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3 md:mb-6">
              Powerful tools to manage every stage
            </h2>
            <p className="text-sm md:text-base text-gray-600 max-w-3xl mx-auto">
              From setup to optimization, every feature works together to keep your campaigns in sync.
            </p>
          </div>

          <div className="space-y-4">
            {/* Description Card */}
            <div className="bg-blue-50 rounded-2xl p-8">
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                Empower every role with secure, granular permissions.
              </h3>
              <p className="text-base text-gray-700 mb-6 leading-relaxed">
                Create multi-level teams, assign access rights, and onboard users seamlessly with SSO.
              </p>
              <div className="flex justify-end mb-4">
                <button className="px-6 py-1.5 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition text-sm font-medium">
                  Learn More
                </button>
              </div>
              <div className="relative -mx-9 bg-white rounded-2xl shadow-xl p-2 h-[250px]">
                {/* Simplified User Management Card */}
                <div className="bg-white rounded-2xl p-3 h-[200px] space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[12px] font-bold text-gray-900">User & Permission Management</h4>
                    <button className="px-2.5 py-1 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition text-[8px] font-medium">
                      Invite
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative max-w-[50%]">
                    <Search className="absolute left-1 top-1.5 transform -translate-y-1/2 text-gray-400 w-2 h-2" />
                    <input
                      type="text"
                      placeholder="Search users"
                      className="flex w-full pl-4 pr-3 py-0.1 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-[8px]"
                    />
                  </div>

                  {/* User List */}
                  <div className="space-y-1">
                    {/* Table Header */}
                    <div className="grid grid-cols-[25%_25%] gap-auto pb-0.5 border-b border-gray-200">
                      <span className="text-[10px] font-semibold text-gray-600">Name</span>
                      <span className="text-[10px] font-semibold text-gray-600">Role</span>
                    </div>

                    {/* Users */}
                    <div className="grid grid-cols-[25%_25%] gap-auto py-0.5 hover:bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-[8px] font-semibold text-purple-700">AB</span>
                        </div>
                        <span className="text-[8px] font-medium text-gray-900">Alice Brown</span>
                      </div>
                      <span className="text-[8px] text-gray-900">Organization Admin</span>
                    </div>

                    <div className="grid grid-cols-[25%_25%] gap-auto py-0.5 hover:bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-[8px] font-semibold text-blue-700">JW</span>
                        </div>
                        <span className="text-[8px] font-medium text-gray-900">Jack Wilson</span>
                      </div>
                      <span className="flex items-center text-[8px] text-gray-900">Media Buyer</span>
                    </div>

                    <div className="grid grid-cols-[25%_25%] gap-auto py-0.5 hover:bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-[8px] font-semibold text-green-700">ET</span>
                        </div>
                        <span className="text-[8px] font-medium text-gray-900">Eve Turner</span>
                      </div>
                      <span className="flex items-center text-[8px] text-gray-900">Creative Team</span>
                    </div>

                    <div className="grid grid-cols-[25%_25%] gap-auto py-0.5 hover:bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-orange-100 rounded-full flex items-center justify-center">
                          <span className="text-[8px] font-semibold text-orange-700">GL</span>
                        </div>
                        <span className="text-[8px] font-medium text-gray-900">Grace Lee</span>
                      </div>
                      <span className="flex items-center text-[8px] text-gray-900">Data Analyst</span>
                    </div>
                  </div>
                </div>
                {/* Role Permissions Panel - Overlay - Right */}
                <div className="absolute top-14 right-5 bg-white rounded-sm p-3 border border-gray-200 shadow-lg h-100">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[8px] font-bold text-gray-900">Role Permissions</h5>
                    <button className="text-gray-400 hover:text-gray-600">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <div className="mt-1 mb-1">
                    <label className="block text-[7px] font-medium text-gray-700 -mb-1.5">Role</label>
                    <div className="relative">
                      <select className="w-full appearance-none bg-white border border-gray-300 rounded-sm px-1.5 py-0.5 pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500 text-[7px]">
                        <option>Media Buyer</option>
                        <option>Organization Admin</option>
                        <option>Creative Team</option>
                        <option>Data Analyst</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-4 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <h6 className="text-[7px] font-semibold text-gray-900 mb-0">Module-based permissions</h6>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked className="w-2 h-2 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                        <span className="text-[7px] text-gray-700">Asset Management</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked className="w-2 h-2 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                        <span className="text-[7px] text-gray-700">Budget Approval</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked className="w-2 h-2 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                        <span className="text-[7px] text-gray-700">Campaign Execution</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked className="w-2 h-2 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                        <span className="text-[7px] text-gray-700">Reporting</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked className="w-2 h-2 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                        <span className="text-[7px] text-gray-700">Delete</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button className="px-3.5 py-1 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition text-[7px] font-medium">
                      Save
                    </button>
                  </div>
                </div>
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
                  <div className="relative flex justify-center grid grid-cols-2">
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
              <button className="flex items-center px-6 py-3 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition text-center font-medium text-sm inline-flex gap-4 shadow-lg">
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
              <button className="flex items-center px-6 py-3 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition text-center font-medium text-sm inline-flex gap-4 shadow-lg">
                See All Reviews
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Mobile */}
      <section className="block md:hidden py-10 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 leading-tight">
            Ready to transform your<br />
            Ad operations?
          </h2>
          <p className="text-base text-gray-700 mb-10 leading-relaxed">
            Simplify every stage of your advertising lifecycle — from planning to performance.
          </p>
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
            <button className="flex items-center justify-center px-6 py-3 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition text-center font-medium text-sm inline-flex gap-2 shadow-lg w-[60%]">
              See All Reviews
              <ArrowRight className="w-4 h-4" />
            </button>
            <button className="px-6 py-3 border-2 border-blue-600 text-blue-600 bg-white rounded-full hover:bg-blue-50 transition font-medium text-sm shadow-lg inline-flex items-center justify-center w-[60%]">
              Contact Us
            </button>
          </div>
        </div>
      </section>

      {/* Footer - Mobile */}
      <footer className="block md:hidden bg-white border-t border-gray-200 pt-10 pb-4 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Logo and Email */}
          <div className="mb-8 text-center">
            <h3 className="text-2xl font-bold mb-2">
              <span className="text-blue-600">Media</span>
              <span className="text-gray-900">Jira</span>
            </h3>
            <p className="text-gray-600 mb-6">One platform. Every stage.</p>
            <div className="relative w-full max-w-sm mx-auto">
              <input
                type="email"
                placeholder="Enter Your Email"
                className="w-full px-4 pr-24 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button className="absolute right-1 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition text-sm">
                Submit
              </button>
            </div>
          </div>

          {/* Navigation Links - 2x2 Grid */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Product */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Product</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Features</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 text-sm">How it works</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Pricing</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Blog</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Case Studies</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Guides</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 hover:text-gray-900 text-sm">About</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Contact us</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Careers</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">© 2025 MediaJira. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}