import Link from 'next/link';
import { ArrowRightIcon, ChartBarIcon, UserGroupIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-indigo-600">MediaJira</h1>
              </div>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="/campaigns" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                Campaigns
              </Link>
              <Link href="/api/campaigns/docs" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                API Docs
              </Link>
              <Link href="/testpage" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                Test Page
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            Professional
            <span className="text-indigo-600"> Campaign Management</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Streamline your advertising campaigns with our comprehensive management platform. 
            Track performance, manage teams, and optimize results with enterprise-level tools.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <div className="rounded-md shadow">
              <Link
                href="/campaigns"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
              >
                Get Started
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Link>
            </div>
            <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
              <Link
                href="/api/docs"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
              >
                View API Docs
              </Link>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-24">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Everything you need to manage campaigns
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
              From creation to completion, we provide all the tools you need for successful campaign management.
            </p>
          </div>

          <div className="mt-20">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Campaign Management */}
              <div className="pt-6">
                <div className="flow-root bg-white rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-indigo-500 rounded-md shadow-lg">
                        <ChartBarIcon className="h-6 w-6 text-white" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Campaign Management</h3>
                    <p className="mt-5 text-base text-gray-500">
                      Create, track, and optimize advertising campaigns with comprehensive analytics and performance metrics.
                    </p>
                  </div>
                </div>
              </div>

              {/* Team Collaboration */}
              <div className="pt-6">
                <div className="flow-root bg-white rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-indigo-500 rounded-md shadow-lg">
                        <UserGroupIcon className="h-6 w-6 text-white" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Team Collaboration</h3>
                    <p className="mt-5 text-base text-gray-500">
                      Assign team members with different roles and permissions for seamless collaboration.
                    </p>
                  </div>
                </div>
              </div>

              {/* Performance Tracking */}
              <div className="pt-6">
                <div className="flow-root bg-white rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-indigo-500 rounded-md shadow-lg">
                        <DocumentTextIcon className="h-6 w-6 text-white" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Performance Tracking</h3>
                    <p className="mt-5 text-base text-gray-500">
                      Monitor impressions, clicks, conversions, and costs with real-time analytics and reporting.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="px-6 py-12 sm:px-12 lg:py-16 lg:px-16">
            <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                  Ready to get started?
                </h2>
                <p className="mt-4 text-lg text-gray-500">
                  Join thousands of marketers who trust MediaJira for their campaign management needs.
                </p>
                <div className="mt-8">
                  <Link
                    href="/campaigns"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Start Managing Campaigns
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </div>
              <div className="mt-8 lg:mt-0">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Key Features</h3>
                  <ul className="space-y-3">
                    <li className="flex items-center text-sm text-gray-600">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span>
                      Multi-channel campaign support
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span>
                      Real-time performance analytics
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span>
                      Team collaboration tools
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span>
                      Budget tracking and alerts
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span>
                      Professional API access
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white">MediaJira</h3>
            <p className="mt-2 text-gray-400">
              Professional campaign management platform
            </p>
            <div className="mt-8 flex justify-center space-x-6">
              <Link href="/campaigns" className="text-gray-400 hover:text-white">
                Campaigns
              </Link>
              <Link href="/api/docs" className="text-gray-400 hover:text-white">
                API Documentation
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
