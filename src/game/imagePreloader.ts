export function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map(
      url =>
        new Promise<void>(resolve => {
          const img = new Image()
          img.onload = () => resolve()
          img.onerror = () => resolve()
          img.src = url
        })
    )
  )
}
