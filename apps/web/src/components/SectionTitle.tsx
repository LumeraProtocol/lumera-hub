import { ReactNode } from "react";

interface ISectionTitle {
  children: ReactNode;
  className?: string;
}

export default function SectionTitle({ children, className = 'mb-5' }: ISectionTitle) {
  return (
    <h3 className={`text-xl font-semibold text-white whitespace-nowrap ${className}`}>{children}</h3>
  )
}
