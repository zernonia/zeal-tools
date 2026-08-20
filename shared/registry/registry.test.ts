import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { registry } from './index'

/**
 * The registry is what the API index, llms.txt and the RFC 9727 catalog
 * publish — nothing checks it against the slices at build time, so `apiPath`
 * and `apiMethods` can drift the moment a route file is added or removed and
 * CI stays green. That drift has already shipped URLs and verbs that 404.
 * These tests read the filesystem so the meta cannot outlive the route.
 */

const toolsDir = fileURLToPath(new URL('../../tools', import.meta.url))

function exists(path: string): boolean {
  try {
    statSync(path)
    return true
  }
  catch {
    return false
  }
}

/** Every `/api/v1/<segment>` a slice actually implements, with its verbs. */
function routesOnDisk(): Map<string, { slug: string, methods: string[] }> {
  const found = new Map<string, { slug: string, methods: string[] }>()
  for (const slug of readdirSync(toolsDir)) {
    const apiDir = join(toolsDir, slug, 'server/api/v1')
    if (!exists(apiDir))
      continue
    for (const segment of readdirSync(apiDir)) {
      const methods = (['get', 'post'] as const)
        .filter(method => exists(join(apiDir, segment, `index.${method}.ts`)))
        .map(method => method.toUpperCase())
      if (methods.length)
        found.set(segment, { slug, methods })
    }
  }
  return found
}

describe('registry api metadata', () => {
  const routes = routesOnDisk()

  it('finds the api routes it is about to compare against', () => {
    expect(routes.size).toBeGreaterThan(0)
  })

  for (const tool of registry) {
    const segment = tool.apiPath ?? tool.slug
    const route = routes.get(segment)

    if (tool.api) {
      it(`${tool.slug}: apiPath '${segment}' resolves to a route`, () => {
        expect(route, `no tools/*/server/api/v1/${segment}/ on disk`).toBeDefined()
        expect(route!.slug).toBe(tool.slug)
      })

      it(`${tool.slug}: apiMethods matches the handlers it ships`, () => {
        expect([...(tool.apiMethods ?? ['GET'])].sort()).toEqual([...route!.methods].sort())
      })
    }
    else {
      it(`${tool.slug}: api: false ships no endpoint`, () => {
        expect(route).toBeUndefined()
      })
    }
  }

  it('no route on disk goes unadvertised', () => {
    const advertised = new Set(registry.filter(tool => tool.api).map(tool => tool.apiPath ?? tool.slug))
    expect([...routes.keys()].filter(segment => !advertised.has(segment))).toEqual([])
  })
})
