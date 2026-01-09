import { useState } from 'react';
import {
  Button,
  Dialog,
  Unspaced,
  VisuallyHidden,
  Card,
} from 'tamagui';
import { X } from '@tamagui/lucide-icons';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Rocket,
  Wallet,
  Layers,
  Database,
  Blocks,
  ChartNoAxesCombined,
  Shredder,
  Coins,
  Workflow,
} from 'lucide-react';

import Skeleton from '@/components/Skeleton';
import useStaking from '@/hooks/useStaking';
import { formatToken } from '@/utils/format';
import { useDispatch } from '@/redux/hooks';
import { setActiveView, setCurrentPath } from '@/redux/app.slice';

interface IGetStartedContent {
  onClose: () => void;
}

const GetStartedContent = ({ onClose }: IGetStartedContent) => {
  const staking = useStaking('');
  const dispatch = useDispatch();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleStakeNowClick = () => {
    dispatch(setCurrentPath({
      currentPath: '/staking',
    }));

    dispatch(setActiveView({
      activeView: 'staking',
    }));
    onClose();
  }

  const handleExploreNowClick = () => {
    dispatch(setCurrentPath({
      currentPath: '/cascade',
    }));

    dispatch(setActiveView({
      activeView: 'cascade',
    }));
    onClose();
  }

  const items: React.ReactNode[] = [
    <>
      <h2 className='text-xl md:text-3xl font-bold'>Welcome to Lumera Hub</h2>
      <div className='text-sm text-lumera-label mt-1.5'>Your gateway to everything Lumera.</div>
      <div className='max-h-[60vh] overflow-y-auto'>
        <div className='flex flex-col gap-2 mt-10'>
          <Card elevate size="$4" bordered>
            <div className='flex items-center gap-5 p-4'>
              <div className='rounded-full bg-white p-1.5'><Wallet className='text-black w-4.5 h-4.5' /></div>
              <div>
                <h3 className='text-base'>Create a Wallet</h3>
                <div className='text-lumera-label text-sm'>Securely set up your key to the ecosystem.</div>
              </div>
            </div>
          </Card>
          <Card elevate size="$4" bordered>
            <div className='flex items-center gap-5 p-4'>
              <div className='rounded-full bg-white p-1.5'><Layers className='text-black w-4.5 h-4.5' /></div>
              <div>
                <h3 className='text-base'>Stake & Earn</h3>
                <div className='text-lumera-label text-sm'>Delegate your LUME to a validator to earn rewards.</div>
              </div>
            </div>
          </Card>
          <Card elevate size="$4" bordered>
            <div className='flex items-center gap-5 p-4'>
              <div className='rounded-full bg-white p-1.5'><Database className='text-black w-4.5 h-4.5' /></div>
              <div>
                <h3 className='text-base'>Cascade</h3>
                <div className='text-lumera-label text-sm'>Your Data. Instantly Stored. Eternally Preserved.</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>,
    <>
      <h2 className='text-xl md:text-3xl font-bold'>Stake & Earn</h2>
      <div className='text-sm text-lumera-label mt-1.5'>Delegate your LUME to a validator to earn rewards through its proof-of-stake system.</div>
      <div className='flex flex-col gap-2 mt-10'>
        <Card elevate size="$4" bordered>
          <div className='flex items-center gap-5 p-4'>
            <div className='rounded-full bg-white p-1.5'><ChartNoAxesCombined className='text-black w-4.5 h-4.5' /></div>
            <div>
              <h3 className='text-sm text-lumera-label '>Total Staked LUME</h3>
              <div className=' text-2xl'>
                {staking.isLoading ?
                  <Skeleton /> : <>
                    ≈{staking.bondedTokens ? formatToken({
                      amount: `${staking.bondedTokens}`,
                      denom: staking.params.bond_denom,
                    }, false, '0,0.[00]') : 0}
                  </>
                }
              </div>
            </div>
          </div>
        </Card>
        <Card elevate size="$4" bordered>
          <div className='flex items-center gap-5 p-4'>
            <div className='rounded-full bg-white p-1.5'><Blocks className='text-black w-4.5 h-4.5' /></div>
            <div>
              <h3 className='text-sm text-lumera-label'>Staking Rewards APR</h3>
              <div className='text-2xl'>
                {staking.isAPRLoading ?
                  <Skeleton /> : <>
                    {staking.apr ? staking.apr.toFixed(2) : 0}%
                  </>
                }
              </div>
            </div>
          </div>
        </Card>
      </div>
      <div className='w-full pt-6'>
        <Link href='/staking' className='px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 cursor-pointer bg-lumera-teal text-white hover:bg-lumera-green focus:bg-lumera-navy' onClick={handleStakeNowClick}>Stake Now</Link>
      </div>
    </>,
    <>
      <h2 className='text-xl md:text-3xl font-bold'>Cascade</h2>
      <div className='text-sm text-lumera-label mt-1.5'>Lumera Protocol’s decentralized storage module</div>
      <div className='flex flex-col gap-2 mt-10'>
        <Card elevate size="$4" bordered>
          <div className='flex items-center gap-5 p-4'>
            <div className='rounded-full bg-white p-1.5'><Shredder className='text-black w-4.5 h-4.5' /></div>
            <div>
              <h3 className='text-base'>Permanence</h3>
              <div className='text-lumera-label text-sm'>Once stored, they are preserved forever.</div>
            </div>
          </div>
        </Card>
        <Card elevate size="$4" bordered>
          <div className='flex items-center gap-5 p-4'>
            <div className='rounded-full bg-white p-1.5'><Coins className='text-black w-4.5 h-4.5' /></div>
            <div>
              <h3 className='text-base'>Negligible Cost</h3>
              <div className='text-lumera-label text-sm'>Cascade&#39;s storage solution is cost-effective and sustainable.</div>
            </div>
          </div>
        </Card>
        <Card elevate size="$4" bordered>
          <div className='flex items-center gap-5 p-4'>
            <div className='rounded-full bg-white p-1.5'><Workflow className='text-black w-4.5 h-4.5' /></div>
            <div>
              <h3 className='text-base'>Lightweight Integration</h3>
              <div className='text-lumera-label text-sm'>Seamlessly integrate with third-party applications</div>
            </div>
          </div>
        </Card>
      </div>
      <div className='w-full pt-6'>
        <Link href='/cascade' className='px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 cursor-pointer bg-lumera-teal text-white hover:bg-lumera-green focus:bg-lumera-navy' onClick={handleExploreNowClick}>Explore Now</Link>
      </div>
    </>,
  ];

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goTo = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className='p-5 pt-3 w-[96vw] sm:w-[550px] max-h-[92vh] overflow-y-auto'>
      <div className="overflow-hidden w-full">
        <div className="flex-none w-full">
          {items[currentIndex]}
        </div>
      </div>
      <div className='grid grid-cols-3 gap-2 mt-10 w-full'>
        <div className='text-left'>
          {currentIndex > 0 && (
            <button
              onClick={goPrev}
              className="text-sm cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft size={18} /> <span>Previous</span>
            </button>
          )}
        </div>
        <div className='flex items-center justify-center gap-2'>
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={`w-3 h-3 rounded-full transition-colors cursor-pointer ${
                index === currentIndex ? 'bg-lumera-green' : 'bg-lumera-sub-label'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
        <div className='w-full flex justify-end'>
          {currentIndex < items.length - 1 && (
            <button
              onClick={goNext}
              className="text-sm cursor-pointer flex items-center gap-1.5 justify-end"
            >
              <span>Next</span> <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface IGetStarted {
  className?: string;
}

export default function GetStarted({ className = '' }: IGetStarted) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={`bg-lumera-teal hover:bg-lumera-green text-white text-sm px-4 py-2 rounded-lg transition-colors flex cursor-pointer ${className}`} onClick={() => setOpen(true)}><Rocket className='w-4 h-4 mr-2' /> Get Started</button>
      <Dialog modal open={open} onOpenChange={() => setOpen(false)}>
        <Dialog.Trigger asChild></Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay
            key="overlay"
            animation="quick"
            opacity={0.5}
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />

          <Dialog.Content
            bordered
            elevate
            key="content"
            animation={[
              'quick',
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
            enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
            exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
            x={0}
            scale={1}
            opacity={1}
            y={0}
          >
            <Unspaced>
              <Dialog.Close asChild>
                <div className='flex justify-end w-full'>
                  <Button
                    size="$3"
                    circular
                    icon={X}
                    backgroundColor="$backgroundStrong"
                    borderColor="#6c727f"
                    zIndex={100}
                  />
                </div>
              </Dialog.Close>
            </Unspaced>
            <VisuallyHidden>
              <Dialog.Title></Dialog.Title>
            </VisuallyHidden>
            <GetStartedContent onClose={() => setOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </>
  );
}
