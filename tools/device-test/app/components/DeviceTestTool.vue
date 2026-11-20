<script setup lang="ts">
import { Keyboard, Mic, MonitorCheck, Webcam } from 'lucide-vue-next'

/**
 * The overview: all four tests behind tabs.
 *
 * Only the open tab's component is mounted (reka unmounts the others), and
 * each is a lazy component, so the camera, microphone and full-screen code
 * are fetched when their tab is first opened rather than preloaded with the
 * page. Leaving a tab unmounts its test, which is also what turns the camera
 * or microphone off.
 */
const tab = ref('keyboard')

const tests = [
  { id: 'keyboard', label: 'Keyboard', icon: Keyboard, page: 'keyboard', pageLabel: 'Open the full keyboard tester' },
  { id: 'microphone', label: 'Microphone', icon: Mic, page: 'microphone', pageLabel: 'Open the mic test on its own page' },
  { id: 'webcam', label: 'Webcam', icon: Webcam, page: 'webcam', pageLabel: 'Open the webcam test on its own page' },
  { id: 'dead-pixel', label: 'Dead pixel', icon: MonitorCheck, page: 'dead-pixel', pageLabel: 'Open the dead pixel test on its own page' },
] as const
</script>

<template>
  <Tabs v-model="tab">
    <TabsList aria-label="Choose a test">
      <TabsTrigger v-for="t in tests" :key="t.id" :value="t.id" class="h-11 gap-1.5 px-4">
        <component :is="t.icon" class="size-4" aria-hidden="true" />
        {{ t.label }}
      </TabsTrigger>
    </TabsList>

    <TabsContent v-for="t in tests" :key="t.id" :value="t.id">
      <LazyDeviceTestKeyboard v-if="t.id === 'keyboard'" />
      <LazyDeviceTestMicrophone v-else-if="t.id === 'microphone'" />
      <LazyDeviceTestWebcam v-else-if="t.id === 'webcam'" />
      <LazyDeviceTestDeadPixel v-else />
      <p class="mt-3 text-sm">
        <NuxtLink :to="`/tools/device-test/${t.page}`" class="text-primary underline-offset-4 hover:underline">
          {{ t.pageLabel }} →
        </NuxtLink>
      </p>
    </TabsContent>
  </Tabs>
</template>
