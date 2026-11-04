import { describe, expect, it } from 'vitest'

describe('package entrypoint', () => {
  it('imports without side effects', async () => {
    await expect(import('../../src/index')).resolves.toBeTruthy()
  })
})
