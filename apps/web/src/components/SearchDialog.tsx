'use client'

import { useState } from 'react';
import {
  H3,
  Button,
  Dialog,
  Input,
  VisuallyHidden,
} from 'tamagui';
import { CircleX, Search } from '@tamagui/lucide-icons';

import useAppRouter from '@/hooks/useAppRouter';
import { parseSearchQuery } from '@/utils/search';

export default function SearchDialog() {
  const { redirect } = useAppRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const closeDialog = () => {
    setIsOpen(false);
    setQuery('');
    setError(null);
  };

  const onConfirm = () => {
    const url = parseSearchQuery(query);
    if (!url) {
      setError('Enter a valid height, transaction hash, or account address.');
      return;
    }
    closeDialog();
    redirect(url);
  };

  return (
    <>
      <button
        type="button"
        className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer"
        onClick={() => setIsOpen(true)}
        aria-label="Search"
      >
        <Search size={20} />
      </button>

      <Dialog
        open={isOpen}
        onOpenChange={(open: boolean) => {
          if (!open) closeDialog();
        }}
        modal
      >
        <Dialog.Trigger asChild>
        </Dialog.Trigger>

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
            <VisuallyHidden>
              <Dialog.Title>Search</Dialog.Title>
            </VisuallyHidden>
            <div className='relative w-[90vw] max-w-[550px]'>
              <div className='flex justify-between items-center'>
                <div className='flex items-baseline gap-3'>
                  <H3 className='text-lumera-label text-[32px]'>Search</H3>
                  <span className='text-sm text-gray-400 font-bold hidden sm:inline'>
                    Height/Transaction/Account Address
                  </span>
                </div>
                <button className='btn-close-modal cursor-pointer' onClick={closeDialog}><CircleX /></button>
              </div>
              <div className='mt-3'>
                <div className='input-wrapper'>
                  <Input
                    id="global-search"
                    placeholder="Height/Transaction/Account Address"
                    className='input'
                    autoFocus
                    value={query}
                    onChangeText={(newValue) => {
                      setQuery(newValue);
                      setError(null);
                    }}
                    onKeyPress={(event) => {
                      if (event.nativeEvent.key === 'Enter') {
                        event.preventDefault();
                        onConfirm();
                      }
                    }}
                  />
                </div>
              </div>
              {error ?
                <div className='text-lumera-red-light mt-3'>{error}</div> : null
              }
              <div className='btn-primary mt-4'>
                <Button width="100%" onPress={onConfirm}>CONFIRM</Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </>
  )
}
