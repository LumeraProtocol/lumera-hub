// apps/web/src/app/wasm/page.tsx
'use client'

import { useEffect, useState } from 'react';
import {
  Input,
  Card,
} from 'tamagui';

import init, { add_array } from '@/wasm/wasm_module';

export default function Page() {
  const [result, setResult] = useState(0);
  const [input, setInput] = useState('');

  useEffect(() => {
    init();
  }, []);

  const handleCompute = () => {
    const jsArr: number[] = input.split(',').map(Number);
    const wasmArr = new Int32Array(jsArr);
    const sum = add_array(wasmArr);
    setResult(sum);
  };

  return (
    <Card elevate size="$4" bordered className='!h-full'>
      <div className='p-4'>
        <h2 className="text-2xl font-bold mb-4">Calculate the sum of the array</h2>
        <Input
          id="module"
          className='input'
          placeholder='Enter 1,2,3,4,5,6'
          value={input}
          onChangeText={(val) => setInput(val)}
        />
        <div className="mt-4">
          <button
            onClick={handleCompute}
            className="cursor-pointer bg-lumera-teal hover:bg-lumera-green text-white rounded-[9px] px-4 py-2"
          >
            Submit
          </button>
        </div>
        <p className="mt-4 text-lg">Results: {result}</p>
      </div>
    </Card>
  )
}
