import React from 'react';
import { ArrowRight } from 'lucide-react';

const meta = {
  title: 'Home/CtaSection',
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'Call to action section with desktop and mobile layouts.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  render: () => {
    const handleGetStartedClick = () => {};
    const redirectToLogin = () => {};

    return (
      <>
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
              <button 
              onClick={handleGetStartedClick}
              className="px-8 py-4 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition font-medium text-lg inline-flex items-center gap-2 shadow-lg justify-center w-[200px]">
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
              <button 
              onClick={redirectToLogin}
              className="px-8 py-4 border-2 border-blue-600 text-blue-600 bg-white rounded-full hover:bg-blue-50 transition font-medium text-lg shadow-lg inline-flex items-center justify-center w-[200px]">
                Contact Us
              </button>
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
              <button className="flex items-center justify-center px-6 py-3 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition text-center font-medium text-sm gap-2 shadow-lg w-[60%]">
                See All Reviews
                <ArrowRight className="w-4 h-4" />
              </button>
              <button className="px-6 py-3 border-2 border-blue-600 text-blue-600 bg-white rounded-full hover:bg-blue-50 transition font-medium text-sm shadow-lg inline-flex items-center justify-center w-[60%]">
                Contact Us
              </button>
            </div>
          </div>
        </section>
      </>
    );
  },
};
