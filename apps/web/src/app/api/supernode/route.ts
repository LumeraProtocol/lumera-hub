// api/supernode/route.ts
import { NextResponse, NextRequest } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'

import { IMarker } from '@/hooks/useCascade'
import {
  supernodeListSchema,
  SupernodeItem,
} from '@/app/api/supernode/validators'
import {
  fetchLocationFromIpWho,
  resolveSupernodeIPv4,
} from '@/app/api/supernode/location'
import {
  checkRateLimit,
  getClientIP,
  RATE_LIMIT_WINDOW_MS,
} from '@/lib/rate-limit'

const bodySchema = z.object({
  supernodes: supernodeListSchema,
})

const MAX_REQUESTS = Number(process.env.NEXT_PUBLIC_MAX_REQUESTS || 10) // ~ 10/minute

const filePath = path.join(process.cwd(), 'data', 'supernodes.json')

async function readFile() {
  try {
    const data = await fs.readFile(filePath, 'utf8')
    return {
      status: true,
      supernodes: JSON.parse(data),
      message: null,
    }
  } catch (error) {
    return {
      status: false,
      supernodes: [],
      message: (error as Error)?.message || 'An unknown error occurred.',
    }
  }
}

async function writeFile(content: IMarker[]) {
  try {
    await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf8')
    return { success: true, data: content }
  } catch {
    return { success: false, error: 'Cannot write file' }
  }
}

async function readAndUpdateSupernode(supernodes: SupernodeItem[]) {
  if (!supernodes?.length) {
    throw new Error('Supernodes list cannot be empty.')
  }
  try {
    const data = await readFile()
    const currentSupernodes: IMarker[] = data.supernodes
    const results: IMarker[] = []
    let isUpdate = false
    for (const item of supernodes) {
      try {
        const supernode = currentSupernodes.find(
          (s) => s.address === item.ip_address,
        )
        if (!supernode) {
          const address = item.ip_address
          let data = null
          try {
            const ip = await resolveSupernodeIPv4(address)
            if (ip) {
              data = await fetchLocationFromIpWho(ip)
            }
          } catch (error) {
            console.error(error)
          }
          if (data?.latitude != null && data.longitude != null) {
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
            })
          }
          isUpdate = true
        } else {
          results.push(supernode)
        }
      } catch (error) {
        console.error(error)
        // noop
      }
    }
    if (isUpdate) {
      await writeFile(results)
    }
    return results
  } catch (error) {
    throw new Error((error as Error).message)
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)

  if (!checkRateLimit(ip, MAX_REQUESTS, RATE_LIMIT_WINDOW_MS)) {
    return NextResponse.json(
      {
        error: `Rate limit exceeded. Try again in ${Math.ceil(RATE_LIMIT_WINDOW_MS / 1000 / 60)} minutes.`,
      },
      {
        status: 429,
      },
    )
  }

  try {
    const body = await request.json()
    const validatedBody = bodySchema.parse(body)
    const { supernodes } = validatedBody

    const data = await readAndUpdateSupernode(supernodes)
    return NextResponse.json({
      status: true,
      supernodes: data,
    })
  } catch (error) {
    console.error('API Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid data',
          details: error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      { error: (error as Error).message || 'An unknown error occurred.' },
      { status: 500 },
    )
  }
}
