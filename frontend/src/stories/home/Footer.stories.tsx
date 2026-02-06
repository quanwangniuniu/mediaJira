import React from 'react';

const meta = {
  title: 'Home/Footer',
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'Footer section with desktop and mobile layouts.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  render: () => (
    <>
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
    </>
  ),
};
