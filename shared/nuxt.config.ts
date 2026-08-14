// The shared layer: common components, composables, server utils and the
// tool registry. Slices may import from here — never from each other.
export default defineNuxtConfig({
  components: [
    // Paths resolve against the layer srcDir (shared/app).
    // shadcn-vue components register by filename (Button, Input, SelectItem …)
    { path: './components/ui', pathPrefix: false },
    { path: './components', pathPrefix: false },
  ],
})
