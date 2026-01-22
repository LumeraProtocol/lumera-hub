import { H2, Card } from 'tamagui';
import { Construction } from '@tamagui/lucide-icons';

export const InferenceScreen = () => {
  return (
    <div className="space-y-8">
      <Card elevate size="$4" bordered className='w-full'>
        <div className='flex flex-col items-center justify-center min-h-[80vh]'>
          <div className="w-20 h-20 rounded-full grid place-items-center staking-icon wallet">
            <Construction size="$3" />
          </div>
          <H2 className='font-bold text-white text-[32px] leading-none !mt-5'>Coming soon</H2>
        </div>
      </Card>
    </div>
  )
}
