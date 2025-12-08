// api/supernode/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

import { IMarker } from '@/hooks/useCascade';

interface ApiRequestBody {
  action: 'read' | 'write';
  content?: IMarker;
}

const filePath = path.join(process.cwd(), 'data', 'supernodes.json');

async function readFile() {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return {
      status: true,
      supernodes: JSON.parse(data),
      message: null,
    };
  } catch (error) {
    return {
      status: false,
      supernodes: [],
      message: (error as Error)?.message ||  'An unknown error occurred.'
    };
  }
}

async function writeFile(content: IMarker) {
  try {
    await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf8');
    return { success: true, data: content };
  } catch {
    return { success: false, error: 'Cannot write file' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, content } = await request.json() as ApiRequestBody;

    if (!action) {
      return NextResponse.json({ error: 'Missing action (read or write)' }, { status: 400 });
    }

    if (action === 'read') {
      const data = await readFile();
      return NextResponse.json(data);
    } else if (action === 'write') {
      if (!content) {
        return NextResponse.json({ error: 'Missing content when writing' }, { status: 400 });
      }
      const result = await writeFile(content);
      if (result.success) {
        return NextResponse.json(result);
      } else {
        return NextResponse.json(result, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: (error as Error)?.message ||  'An unknown error occurred.' }, { status: 500 });
  }
}
