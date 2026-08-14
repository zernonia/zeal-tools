<template>
  <footer class="border-t border-neutral-200/70 py-10 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
    <div class="container-page flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
      <div class="max-w-xs space-y-2">
        <p class="font-semibold text-neutral-900 dark:text-neutral-100">zeal<span class="text-flame-500">.tools</span></p>
        <p>Free tools, made with zeal. No sign-ups, no watermarks, no nonsense — open source and yours to audit.</p>
      </div>
      <nav class="grid grid-cols-2 gap-x-12 gap-y-2 sm:grid-cols-2" aria-label="Footer">
        <a href="https://github.com/zernonia/zeal-tools" target="_blank" rel="noopener" class="hover:text-flame-600">GitHub</a>
        <NuxtLink to="/api/v1" class="hover:text-flame-600">API docs</NuxtLink>
        <NuxtLink to="/#promise" class="hover:text-flame-600">The Zeal Promise</NuxtLink>
        <NuxtLink to="/#mcp" class="hover:text-flame-600">MCP server</NuxtLink>
      </nav>
    </div>
    <div class="container-page mt-8 text-xs">
      <p>MIT licensed · every tool works in the browser, over the API, and through MCP.</p>
    </div>
  </footer>
</template>
