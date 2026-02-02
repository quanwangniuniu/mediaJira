"use client";

import React from "react";

// Grid wrapper for rendering multiple draft cards.
export type EmailDraftCardProps = {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2;
};

// Layout wrapper for displaying multiple draft cards together.
export function EmailDraftCard({
  children,
  className = "",
  columns = 2,
}: EmailDraftCardProps) {
  const gridClass =
    columns === 1 ? "grid grid-cols-1 gap-6" : "grid grid-cols-1 lg:grid-cols-2 gap-6";

  return <div className={`${gridClass} ${className}`}>{children}</div>;
}
