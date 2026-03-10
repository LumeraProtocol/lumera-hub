import { AppLoading } from '@/components/Loading';
import useSnagStake from '@/hooks/useSnagStake';

export const StakeVerifyScreen = () => {
  const { isLoading, message } = useSnagStake();

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className='flex items-center justify-center gap-3 w-full'>
          <AppLoading
            isLoading
            className="w-10 h-10 !border-2"
            iconWidth={20}
            iconHeight={20}
            containerClassName='relative w-10 h-10 z-50'
          />
          <span>Processing ...</span>
        </div>
      );
    }

    if (message.type === 'error') {
      return (
        <div className='text-red-500 flex items-center justify-center w-full'>
          <span>{message.content}</span>
        </div>
      );
    }

    return (
      <div className='flex items-center justify-center w-full'>
        <span>Processing ...</span>
      </div>
    )
  }

  return (
    <div className='w-screen h-screen flex items-center justify-center'>
      <div className="relative p-3 min-w-2xl">
        {renderContent()}
      </div>
    </div>
  );
}
