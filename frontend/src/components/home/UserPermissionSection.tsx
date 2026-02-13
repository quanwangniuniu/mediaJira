import React from 'react';
import { ChevronDown, Lock, Search, X } from 'lucide-react';

type UserPermissionSectionProps = {
  onRedirectToLogin: () => void;
};

export default function UserPermissionSection({ onRedirectToLogin }: UserPermissionSectionProps) {
  return (
    <>
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
                <button
                  onClick={onRedirectToLogin}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-900 rounded-full hover:bg-gray-50 transition border border-gray-200"
                >
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
                <button
                  onClick={onRedirectToLogin}
                  className="px-5 py-2.5 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition text-sm font-medium"
                >
                  Learn More
                </button>
              </div>
            </div>

            {/* Right Card - User & Permission Management */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-3 relative z-20 lg:-ml-56 lg:mt-6 max-w-lg md:m-auto">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg font-bold text-gray-900">User & Permission Management</h4>
                <button
                  onClick={onRedirectToLogin}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs font-medium"
                >
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
                    <button
                      onClick={onRedirectToLogin}
                      className="text-gray-400 hover:text-gray-600"
                    >
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
                    <button
                      onClick={onRedirectToLogin}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs font-medium"
                    >
                      Save
                    </button>
                  </div>
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
    </>
  );
}
