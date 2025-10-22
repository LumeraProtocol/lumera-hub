import { ReactNode, MouseEvent } from "react";


type TVariants = {
    primary: string;
    secondary: string;
    ghost: string;
}

interface IButton {
    children: ReactNode; 
    onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
    className?: string;
    variant?: keyof TVariants;
    disabled?: boolean;
}

const AppButton = ({ 
    children, 
    onClick, 
    className = '', 
    variant = 'primary', 
    disabled = false,
}: IButton) => {
  const baseClasses = 'px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 cursor-pointer';
  const variants: TVariants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-500',
    secondary: 'bg-gray-700 text-gray-200 hover:bg-gray-600 focus:ring-gray-500',
    ghost: 'bg-transparent text-gray-300 hover:bg-gray-700/50',
  };
  return (
    <button 
        onClick={onClick} 
        className={`${baseClasses} ${variants[variant as keyof TVariants]} ${className}`} 
        disabled={disabled}
    >
        {children}
    </button>
  );
};

export default AppButton;