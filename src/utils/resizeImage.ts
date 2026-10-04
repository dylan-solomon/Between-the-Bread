type Output = { type?: string; quality?: number }

export const resizeImage = (file: File, maxWidth: number, output: Output = {}): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const scale = img.width > maxWidth ? maxWidth / img.width : 1
      const width = Math.round(img.width * scale)
      const height = Math.round(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (ctx === null) {
        reject(new Error('Canvas 2D context is not available.'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => {
        if (blob === null) {
          reject(new Error('Failed to create resized image.'))
          return
        }
        resolve(blob)
      }, output.type ?? file.type, output.quality)
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image.'))
    }

    img.src = objectUrl
  })
