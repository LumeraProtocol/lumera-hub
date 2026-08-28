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
import { mergeSupernodeLocations } from '@/app/api/supernode/supernode-cache'
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
// The runtime cache above is gitignored, so a fresh deploy starts empty. The
// checked-in seed keeps the Cascade map populated on cold start instead of
// depending on ipwho.is being reachable (and unthrottled) at request time.
const seedFilePath = path.join(process.cwd(), 'data', 'supernodes.seed.json')

async function readCacheFile(pathToRead: string) {
  const data = await fs.readFile(pathToRead, 'utf8')
  return JSON.parse(data)
}

async function readFile() {
  try {
    return {
      status: true,
      supernodes: await readCacheFile(filePath),
      message: null,
    }
  } catch {
    // Fall through to the seed below.
  }
  try {
    return {
      status: true,
      supernodes: await readCacheFile(seedFilePath),
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
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf8')
    return { success: true, data: content }
  } catch {
    return { success: false, error: 'Cannot write file' }
  }
}

const locateSupernode = async (endpoint: string) => {
  const ip = await resolveSupernodeIPv4(endpoint)
  return ip ? fetchLocationFromIpWho(ip) : null
}

async function readAndUpdateSupernode(supernodes: SupernodeItem[]) {
  if (!supernodes?.length) {
    throw new Error('Supernodes list cannot be empty.')
  }
  try {
    const data = await readFile()
    const currentSupernodes: IMarker[] = data.supernodes
    const { results, isUpdate } = await mergeSupernodeLocations(
      supernodes,
      currentSupernodes,
      locateSupernode,
    )
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
