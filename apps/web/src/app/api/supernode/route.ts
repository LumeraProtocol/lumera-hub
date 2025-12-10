// api/supernode/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

import * as instance from '@/utils/api';
import { IMarker } from '@/hooks/useCascade';
import { isValidIPv4, } from '@/utils/helpers';
import { SNSCOPE_URL } from '@/contants/network';

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

async function writeFile(content: IMarker[]) {
  try {
    await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf8');
    return { success: true, data: content };
  } catch {
    return { success: false, error: 'Cannot write file' };
  }
}

async function fetchSupernodes(cursor = '') {
  try {
    const nextCursor = cursor ? `&cursor=${cursor}` : '';
    const { data } = await instance.getExternal(`${SNSCOPE_URL}/v1/supernodes/metrics?currentState=SUPERNODE_STATE_ACTIVE&status=available&minFailedProbeCounter=0&limit=200${nextCursor}`);

    return {
      next_cursor: data.next_cursor,
      nodes: data.nodes,
    }
  } catch {
    return {
      next_cursor: null,
      nodes: [],
    };
  }
}

async function fetchLocationFromIpWho(ip: string) {
  try {
    const { data } = await instance.getExternal(`https://ipwho.is/${ip}`);
    return {
      latitude: data?.latitude || null,
      longitude: data?.longitude || null,
      subdivision: data?.capital || null,
      city: data?.city || null,
      country: data?.country || null,
      continent: data?.continent || null,
      country_code: data?.country_code || null,
    };
  } catch (error) {
    console.error('Fetch location from IpWho Error:', error);
    return null;
  }
}

async function updateSupernode() {
  try {
    const snResults = [];
    let isContinue = true;
    let cursor = '';
    do {
      const data = await fetchSupernodes(cursor);
      if (data.nodes?.length) {
        snResults.push(...data.nodes)
      }
      cursor = data.next_cursor;
      if (!data.next_cursor) {
        isContinue = false;
      }
    } while (isContinue);

    if (snResults?.length) {
      const { supernodes } = await readFile();
      const supernodeData: IMarker[] = supernodes;
      const results: IMarker[] = [];
      for (const item of snResults) {
        const address = item.ip_address;
        const ip = address.split(':')[0];
        if (isValidIPv4(ip)) {
          const supernode = supernodeData.find((s) => s.address === address);
          if (!supernode) {
            const data = await fetchLocationFromIpWho(ip);
            if (data?.latitude && data?.longitude) {
              results.push({
                latLng: [data.latitude, data.longitude],
                name: data?.city || '',
                continent: data?.continent || '',
                country: data?.country || '',
                country_code: data?.country_code || '',
                subdivision: data?.subdivision || '',
                city: data?.city || '',
                supernodeAccount: item.supernode_account,
                validatorAddress: item.validator_address,
                validatorMoniker: item.validator_moniker,
                address,
                p2pPort: item.p2p_port.toString(),
              });
            }
          } else {
            results.push(supernode);
          }
        }
      }
      if (results?.length) {
        await writeFile(results);
      }
    }
  } catch (error) {
    console.error('Update supernode Error:', error)
  }
}

export async function GET() {
  try {
    const data = await readFile();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'There is an error when reading data. Please try again.' }, { status: 500 });
  }
}

export async function POST() {
  try {
    updateSupernode();
    return NextResponse.json({
      status: true
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'An unknown error occurred.' }, { status: 500 });
  }
}
