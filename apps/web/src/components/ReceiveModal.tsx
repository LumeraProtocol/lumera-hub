import { useState } from 'react';
import {
  CheckCircle,
  X,
  Copy,
} from 'lucide-react';
import {  Dialog, VisuallyHidden } from 'tamagui'
import QRCode from "react-qr-code";

import { formatAddress } from '@/utils/format';

interface IReceiveModal {
    onClose: () => void;
    walletAddress: string;
    isOpen: boolean;
}

const ReceiveModal = ({ onClose, walletAddress, isOpen }: IReceiveModal) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) {
        return null;
    }
    
    const handleCopy = () => {
        navigator.clipboard.writeText(walletAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
      <Dialog
          open
          onOpenChange={onClose}
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
                <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-bold text-white">Receive LUME</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X/></button>
                </div>
                <div className="mt-6 flex flex-col items-center">
                    <div className="p-4 bg-white rounded-lg">
                        <QRCode
                            size={200}
                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                            value={walletAddress}
                            viewBox={`0 0 200 200`}
                        />
                    </div>
                    <p className="text-sm text-gray-400 mt-4">Scan this code or copy the address below.</p>
                    <div className="w-full flex items-center gap-2 bg-gray-900/50 p-3 rounded-lg mt-4">
                        <span className="font-mono text-sm text-gray-300 truncate">{formatAddress(walletAddress, 20, -15)}</span>
                        <button
                            onClick={handleCopy}
                            className="ml-auto p-1 text-gray-400 hover:text-white transition-colors"
                        >
                            {copied ? <CheckCircle className="w-4 h-4 text-green-400"/> : <Copy className="w-4 h-4"/>}
                        </button>
                    </div>
                </div>
              </Dialog.Content>
          </Dialog.Portal>
      </Dialog>
    );
};

export default ReceiveModal;
