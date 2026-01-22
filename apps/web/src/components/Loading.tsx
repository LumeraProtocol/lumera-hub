import { ReactNode } from 'react';
import { Spinner } from 'tamagui';
import Image from 'next/image';

interface ILoading {
  isLoading: boolean;
  size?: "large" | "small";
  className?: string;
  content?: ReactNode;
}

export default function Loading({
  isLoading,
  size = 'large',
  className = 'absolute',
  content = '',
}: ILoading) {
  if (!isLoading) {
    return null;
  }
  return (
    <>
      <div className={`loading-wrapper ${className}`}>
        <Spinner size={size} color="$green10" />
        {content}
      </div>
      <div className="absolute top-0 left-0 right-0 bottom-0 block bg-black/35 z-40"></div>
    </>
  )
}

interface IAppLoading {
  isLoading: boolean;
  className?: string;
  iconClassName?: string;
  overlayClassName?: string;
  containerClassName?: string;
  iconWidth?: number;
  iconHeight?: number;
  hideOverlay?: boolean;
}

export function AppLoading({
  isLoading,
  className = 'w-[150px] h-[150px]',
  containerClassName = 'absolute top-1/2 left-1/2 -translate-1/2 w-[150px] h-[150px] z-50',
  iconWidth = 100,
  iconHeight = 100,
  iconClassName = '',
  overlayClassName = '',
  hideOverlay = false,
}: IAppLoading) {
  if (!isLoading) {
    return null;
  }

  return (
    <>
      <div className={containerClassName}>
        <div className={`${className} rounded-full aspect-[1] border-6 border-solid border-transparent border-t-lumera-teal border-r-lumera-teal border-b-lumera-teal animate-spin duration-1000`}></div>
        <Image src="/lumera-symbol.svg" alt="Lumera" width={iconWidth} height={iconHeight} className={`absolute top-1/2 left-1/2 -translate-1/2 rounded-full ${iconClassName}`} />
      </div>
      {!hideOverlay ?
        <div className={`absolute top-0 left-0 right-0 bottom-0 block bg-black/35 z-10 ${overlayClassName}`}></div> : null
      }
    </>
  );
}
