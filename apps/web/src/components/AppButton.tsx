import { ReactNode, MouseEvent } from "react";

type TVariants = {
  primary: string;
  secondary: string;
  ghost: string;
  third: string;
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
  const baseClasses = 'px-4 py-2 rounded-lg font-normal transition-all duration-300 flex items-center justify-center gap-2 shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 cursor-pointer text-base';
  const variants: TVariants = {
    primary: 'bg-lumera-teal text-white hover:bg-lumera-green focus:bg-lumera-navy disabled:bg-gray-700 disabled:text-gray-200',
    secondary: 'bg-gray-700 text-gray-200 hover:bg-gray-600 focus:ring-gray-500',
    ghost: 'bg-transparent text-gray-300 hover:bg-gray-700/50',
    third: 'bg-lumera-red text-white hover:bg-lumera-red-light',
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


interface AppLinkButton {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  variant?: keyof TVariants;
}

export const AppLinkButton = ({
  children,
  href = '',
  onClick = undefined,
  className = '',
  variant = 'primary',
}: AppLinkButton) => {
  const baseClasses = 'px-4 py-2 rounded-lg font-normal transition-all duration-300 flex items-center justify-center gap-2 shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 cursor-pointer text-base';
  const variants: TVariants = {
    primary: 'bg-lumera-teal text-white hover:bg-lumera-green focus:bg-lumera-navy',
    secondary: 'bg-gray-700 text-gray-200 hover:bg-gray-600 focus:ring-gray-500',
    ghost: 'bg-transparent text-gray-300 hover:bg-gray-700/50',
    third: 'bg-lumera-red text-white hover:bg-lumera-red-light',
  };
  return (
    <a
      href={href}
      onClick={onClick}
      className={`${baseClasses} ${variants[variant as keyof TVariants]} ${className}`}
    >
        {children}
    </a>
  );
};
