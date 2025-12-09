import { Spinner } from 'tamagui';

interface ILoading {
  isLoading: boolean;
  size?: "large" | "small";
  className?: string;
}

export default function Loading({
  isLoading,
  size = 'large',
  className = 'absolute',
}: ILoading) {
  if (!isLoading) {
    return null;
  }
  return (
    <>
      <div className={`loading-wrapper ${className}`}>
        <Spinner size={size} color="$green10" />
      </div>
      <div className="absolute top-0 left-0 right-0 bottom-0 block bg-black/35 z-40"></div>
    </>
  )
}
