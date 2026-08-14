/**
 * SVG string → PNG blob (browser only). The SVG renderer is the single
 * source of truth for styling; PNG downloads, copy-image and Web Share all
 * rasterize its exact output, so every pattern/eye/gradient option carries
 * over with full fidelity.
 */
export async function svgToPngBlob(svg: string, sizePx: number): Promise<Blob | null> {
  const size = Math.max(64, Math.min(4096, Math.round(sizePx)))
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Failed to rasterize SVG'))
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, size, size)
    return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  }
  catch {
    return null
  }
  finally {
    URL.revokeObjectURL(url)
  }
}
