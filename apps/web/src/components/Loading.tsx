import { Spinner } from 'tamagui';

interface ILoading {
    isLoading: boolean;
    size?: "large" | "small";
}

export default function Loading({
    isLoading,
    size = 'large'
}: ILoading) {
  if (!isLoading) {
    return null;
  }
  return (
    <>
      <div className='absolute loading-wrapper'>
        <Spinner size={size} color="$green10" />
      </div>
      <div className="fixed top-0 left-0 right-0 bottom-0 block bg-black/35 z-40"></div>
    </>
  )
}
