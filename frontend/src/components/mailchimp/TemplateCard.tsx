import React from "react";
import { useRouter } from "next/navigation";

export function TemplateCard() {
  const router = useRouter();
  return (
    <div className="relative group">
      {/* main */}
      <div className="flex flex-col h-[340px] w-[248px] rounded-xl border border-gray-300">
        <div className="flex-1"></div>
        <div className="p-4 border-t border-gray-300">template name</div>
      </div>

      {/* hover*/}
      <div className="absolute flex items-center justify-center top-0 left-0 h-[340px] w-[248px] rounded-xl border-2 border-emerald-700 bg-white opacity-0 group-hover:opacity-90 transition-opacity duration-200">
        <div className="flex flex-col space-y-6">
          <button
            className="rounded-sm w-20 py-1 text-sm bg-emerald-700 text-white"
            onClick={() => router.push("../../mailchimp/[draftId]")}
          >
            Apply
          </button>
          <button className="rounded-sm w-20 py-1 text-sm bg-gray-300">
            Preview
          </button>
        </div>
      </div>
    </div>
  );
}
