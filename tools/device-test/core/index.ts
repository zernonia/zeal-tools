// device-test core — the ONLY entry to run the tool. Pure and isomorphic:
// no Vue, no DOM, no runtime dependencies. The browser APIs (getUserMedia,
// MediaRecorder, the Fullscreen API) are reached from the components; what
// they hand back is interpreted here, where it can be tested.
export * from './audio'
export * from './keyboard'
export * from './pixel'
export * from './video'
