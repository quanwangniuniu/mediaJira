import React from 'react';

const meta = {
  title: 'Home/WhyMediaJira',
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'Why MediaJira section with desktop and mobile layouts.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  render: () => (
    <>
      <section className="hidden md:block py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-gray-900 mb-4">
            Why MediaJira?
          </h2>
          <p className="text-center text-gray-600 mb-16 text-lg">
            MediaJira turns these challenges into a streamlined, end-to-end solution.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      <section className="block md:hidden py-12 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-center text-gray-900 mb-3 md:mb-4">
            Why MediaJira?
          </h2>
          <p className="text-center text-gray-600 mb-8 md:mb-15 text-base md:text-lg">
            MediaJira turns these challenges into a streamlined, end-to-end solution.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
    </>
  ),
};
