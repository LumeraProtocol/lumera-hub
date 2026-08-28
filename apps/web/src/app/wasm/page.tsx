/* eslint-disable @typescript-eslint/no-explicit-any */
// apps/web/src/app/wasm/page.tsx
'use client'

import { useEffect, useState } from 'react';
import { Card, Button } from 'tamagui';
import { toast } from 'react-toastify';
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import initWasm, {
  writeFileChunk,
  createDirAll,
  dirExists,
  RaptorQSession,
  getFileSize,
  readFileChunk,
} from '@/rq';
import wasmUrl from '@/rq/rq_library_bg.wasm';

let isInit = false;

export default function Page() {
  const dispatch = useDispatch();
  const [uploadedFilePath, setUploadedFilePath] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!isInit) {
      initWasm(wasmUrl);
    }
    isInit = true

    document.title = 'WASM - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/wasm',
    }));
    dispatch(setViewTitle({
      viewTitle: 'WASM',
    }));
  }, []);

  async function getJsonFile(path: string) {
    try {
      const size = getFileSize(path);
      const bytes = await readFileChunk(path, 0, size);
      return JSON.parse(new TextDecoder('utf-8').decode(bytes));
    } catch (error) {
      console.error('Error reading JSON:', error);
      toast.error(`Error reading JSON: ${(error as Error).message}`);
      return null;
    }
  }

  const handleCreateMetadata = async () => {
    if (!uploadedFilePath) {
      toast.error('Upload a file first.');
      return;
    }
    // symbol_size = 64k, redundancy_factor = 10, max_memory_mb = 1024 (1GB), concurrency_limit = 4
    const session = new RaptorQSession(65535, 10, BigInt(1024), BigInt(4));
    const outLayoutFile = "/metadata_layout_file.json";
    // createDirAll(outDir);
    setLogs(prev => [...prev, "Creating metadata..."]);
    const metadata = await session.create_metadata(uploadedFilePath, outLayoutFile, 0);
    setLogs(prev => [...prev, `Metadata created: ${JSON.stringify(metadata)}`]);
    const layoutFile = await getJsonFile(outLayoutFile);
    setLogs(prev => [...prev, `Layout file: ${JSON.stringify(layoutFile)}`]);
  }

  const handleUploadFile = async (event: any) => {
    const file = event.target.files[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    const path = `/${file.name}`;
    await writeFileChunk(path, 0, data);
    setUploadedFilePath(path);
    setLogs(prev => [...prev, `File ${file.name} (${data.length} bytes) stored in in-memory FS`]);
  }

  const handleDirManager = () => {
    const testDir = "/test/directory/path";
    createDirAll(testDir);
    dirExists(testDir).then((exists) => {
      setLogs(prev => [...prev, `Directory ${testDir} exists: ${exists}`]);
    });
  }

  const handleEncodeDecode = async () => {
    if (!uploadedFilePath) {
      toast.error('Upload a file first.');
      return;
    }
    // symbol_size = 64k, redundancy_factor = 10, max_memory_mb = 1024 (1GB), concurrency_limit = 4
    const session = new RaptorQSession(65535, 10, BigInt(1024), BigInt(4));
    const outDir = "/encoded_output";
    const decodedPath = "/decoded_output";

    createDirAll(outDir);
    setLogs(prev => [...prev, "Encoding file..."]);
    const encodeResult = await session.encode_file(uploadedFilePath, outDir, 0);
    setLogs(prev => [...prev, `Encode result: ${JSON.stringify(encodeResult)}`]);

    setLogs(prev => [...prev, "Decoding file..."]);
    const decodeResult = await session.decode_symbols(
      encodeResult.symbolsDirectory,
      decodedPath,
      encodeResult.layoutFilePath
    );
    setLogs(prev => [...prev, `Decode result: ${JSON.stringify(decodeResult)}`]);

    const size = getFileSize(decodedPath);
    setLogs(prev => [...prev, `Decoded file size: ${size}`]);
  }

  const handleClearStorage = () => {
    // Clear in-memory state (just for test)
    const keys = Object.getOwnPropertyNames(globalThis).filter(k => k.startsWith("mem"));
    for (const key of keys) {
      const globalAny = globalThis as any;
      if (globalAny[key]?.clear) {
        globalAny[key].clear();
      }
    }
    setUploadedFilePath('');
    setLogs(prev => [...prev, "In-memory storage cleared."]);
  }

  return (
    <>
      <Helmet>
        <title>WASM - Lumera Hub</title>
      </Helmet>
      <Card elevate size="$4" bordered className='!h-full'>
        <div className='p-4'>
          <h2 className="text-2xl font-bold mb-4">RaptorQ WASM File I/O Test (Modular + In-Memory)</h2>
          <div className="mt-5">
            <div className="file-input">
              <label htmlFor="file-upload" className='mr-3'>Upload a test file:</label>
              <input type="file" id="file-upload" onChange={handleUploadFile} className='px-2 py-1 bg-gray-800 rounded-sm border border-gray-700 cursor-pointer' />
            </div>

            <div className='mt-3 flex gap-2'>
              <Button className='cursor-pointer' onPress={handleDirManager} disabled={!uploadedFilePath}>Test Directory Manager</Button>
              <Button className='cursor-pointer' onPress={handleCreateMetadata} disabled={!uploadedFilePath}>Test Create Metadata</Button>
              <Button className='cursor-pointer' onPress={handleEncodeDecode} disabled={!uploadedFilePath}>Test Encode/Decode</Button>
              <Button className='cursor-pointer' onPress={handleClearStorage}>Clear Storage</Button>
            </div>
          </div>
          {logs?.length ?
            <div className="mt-5 p-3 bg-gray-800 border border-gray-700 rounded-xl wrap-break-word max-h-96 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className='text-sm'>{log}</div>
              ))}
            </div> : null
          }
        </div>
      </Card>
    </>
  )
}
