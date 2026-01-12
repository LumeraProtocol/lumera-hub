import { ReactNode } from 'react';
import {
  H3,
  Dialog,
  VisuallyHidden,
} from 'tamagui';

import AppButton from '@/components/AppButton';

interface IConfirmModal {
  isOpen: boolean;
  onConfirmClick: () => void;
  onCancelClick: () => void;
  onCloseModal: () => void;
  title?: string;
  content: ReactNode;
  className?: string;
  btnCancelLabel?: string;
  btnConfirmLabel?: string;
}

export default function ConfirmModal({
  isOpen,
  onConfirmClick,
  onCancelClick,
  onCloseModal,
  title,
  content,
  className = 'max-w-[550px]',
  btnCancelLabel = 'Cancel',
  btnConfirmLabel = 'Ok',
}: IConfirmModal) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={onCloseModal}
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
            <Dialog.Title></Dialog.Title>
          </VisuallyHidden>
          <div className={`relative p-3 ${className}`}>
            {title ?
              <div className='mb-5'>
                <h3 className='text-2xl font-bold text-white'>{title}</h3>
              </div>: null
            }
            <div>{content}</div>
            <div className='flex justify-end mt-5 gap-3'>
              <AppButton
                variant="secondary"
                onClick={onCancelClick}
              >
                {btnCancelLabel}
              </AppButton>
              <AppButton onClick={onConfirmClick}>{btnConfirmLabel}</AppButton>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
