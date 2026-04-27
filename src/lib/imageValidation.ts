export const MIN_COVER_DIMENSION = 1600;

export interface ImageDimensions {
  width: number;
  height: number;
}

export function getImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };
    img.src = url;
  });
}

/**
 * Validates that a cover image is a valid image file.
 * NOTE: Minimum dimension check (1600x1600) is temporarily disabled.
 * It will be re-enabled in the future.
 */
export async function validateCoverDimensions(
  file: File,
  _min: number = MIN_COVER_DIMENSION
): Promise<ImageDimensions> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen (JPG, PNG o WebP).');
  }
  // Dimension check disabled for now — return dims if readable, otherwise pass.
  try {
    return await getImageDimensions(file);
  } catch {
    return { width: 0, height: 0 };
  }
}
