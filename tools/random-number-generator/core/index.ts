/**
 * Random number generator, coin and dice — pure, isomorphic, zero-dependency.
 *
 * The one entry the UI, the REST route and the MCP tool all run through.
 * Randomness is always injected as a byte source: the browser and the server
 * pass `crypto.getRandomValues`, and the tests pass known sequences, which is
 * what lets "no modulo bias" be proven rather than asserted.
 */

export * from './coin'
export * from './dice'
export * from './numbers'
export * from './random'
export * from './request'
