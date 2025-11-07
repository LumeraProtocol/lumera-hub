import { ReactNode } from "react";

interface ICard {
    className?: string;
    children: ReactNode;
}

export default function Card({ children, className = '' }: ICard) {
    return (
    <div className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-lg transition-all duration-300 ${className}`}>
        {children}
    </div>
)
}