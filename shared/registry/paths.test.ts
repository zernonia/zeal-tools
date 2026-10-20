import { describe, expect, it } from 'vitest'
import { toolOfPath } from './index'

describe('toolOfPath', () => {
  it('names a tool page', () => {
    expect(toolOfPath('/tools/worship-pads')).toEqual({ tool: 'worship-pads' })
  })

  it('names a registered variant', () => {
    expect(toolOfPath('/tools/name-picker/classroom')).toEqual({ tool: 'name-picker', variant: 'classroom' })
  })

  it('ignores a trailing slash', () => {
    expect(toolOfPath('/tools/qr-code-generator/wifi/')).toEqual({ tool: 'qr-code-generator', variant: 'wifi' })
  })

  it('does not count an app surface that is not an advertised page', () => {
    expect(toolOfPath('/tools/stage-timer/stage')).toBeNull()
  })

  it('does not count pages outside the tools', () => {
    expect(toolOfPath('/')).toBeNull()
    expect(toolOfPath('/blog/free-tools-for-teachers')).toBeNull()
    expect(toolOfPath('/tools/not-a-tool')).toBeNull()
  })
})
