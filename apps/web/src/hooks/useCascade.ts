import { useState } from "react";
// import {
//   createLumeraClient,
//   createBatchedSignaturePrompter,
//   // createDefaultTxPrompter,
// } from "@lumera/sdk-js";
// import {
//   createLumeraClient,
//   createBatchedSignaturePrompter,
// } from "D:/Projects/LumeraProtocal/source/lumera-hub/apps/web/node_modules/@lumera/sdk-js/src";
// import { createDefaultTxPrompter } from "D:/Projects/LumeraProtocal/source/lumera-hub/apps/web/node_modules/@lumera/sdk-js/src/wallets/prompter";

import { useSelector } from '@/redux/hooks';
import useWalletConnect from '@/hooks/useWalletConnect';
import { RPC_ENDPOINT, CHAIN_ID, REST_AI_URL, SNAPI_URL } from '@/contants/network';

export interface ITask {
  taskId?: string | undefined;
  status?: string | undefined;
  progress?: number | undefined;
}

// const keplrSignaturePrompter = createBatchedSignaturePrompter();
// const keplrTxPrompter = createDefaultTxPrompter();

const useCascade = () => {
  const { getOfflineSigner } = useWalletConnect();
  const { address } = useSelector((state) => state.wallet);
  const [isUploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadResult, setUploadResult] = useState<ITask | null>(null);

  const handleUploadCascade = async (files: File[]) => {
    setUploading(true);
    setError('');
    setUploadResult(null);
    try {
      const signer = await getOfflineSigner();
      // const client = await createLumeraClient({
      //   chainId: CHAIN_ID,
      //   rpcUrl: RPC_ENDPOINT,
      //   lcdUrl: REST_AI_URL,
      //   snapiUrl: SNAPI_URL,
      //   signer,
      //   address,
      //   gasPrice: "0.025ulume",
      //   http: {
      //     timeout: 45000,
      //     maxRetries: 3,
      //   },
      // });
      // const selectedFile = files[0];
      // const fileBuffer = await selectedFile.arrayBuffer();
      // const fileBytes = new Uint8Array(fileBuffer);
      // const expirationTime = Math.floor(Date.now() / 1000 + 86400 * 1.5).toString();

      //  const result = await client.Cascade.uploader.uploadFile(fileBytes, {
      //   fileName: selectedFile.name,
      //   isPublic: false,
      //   expirationTime: expirationTime,
      //   taskOptions: {
      //     pollInterval: 2000,
      //     timeout: 300000,
      //   },
      //   // signaturePrompter: keplrSignaturePrompter,
      //   // txPrompter: keplrTxPrompter,
      // });
      // setUploadResult(result);
      // console.log(result);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
    setUploading(false);
  }

  return {
    isUploading,
    error,
    uploadResult,
    handleUploadCascade,
  }
}

export default useCascade;
