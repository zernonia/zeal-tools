/**
 * WHOIS lookup — the only entry to run the tool.
 *
 * `domain` turns input into the name a registry answers for, `rdap` reads the
 * registry's answer, `status` explains it, `dns` reads what the name points
 * at, and `lookup` is the only part that touches the network.
 */
export * from './dns'
export * from './domain'
export * from './lookup'
export * from './rdap'
export * from './status'
