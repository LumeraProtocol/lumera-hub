import { describe, expect, it } from 'vitest'

import { cascadeUploadSchema } from './cascadeUploadSchema'

describe('cascadeUploadSchema', () => {
  it('uses a clear validation message for a missing task ID', () => {
    const result = cascadeUploadSchema.safeParse({
      lumeraAddress: 'lumera1qy352euf40x77qfrg4ncn27dauqjx3t83egcev',
      taskId: '',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.find((issue) => issue.path[0] === 'taskId')
          ?.message,
      ).toBe('Task ID is required')
    }
  })
})
