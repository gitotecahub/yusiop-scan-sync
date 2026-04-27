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
 * Validates that a cover image meets minimum dimension requirements.
 * Throws an Error with a friendly message if the image is too small or invalid.
 */
export async function validateCoverDimensions(
  file: File,
  min: number = MIN_COVER_DIMENSION
): Promise<ImageDimensions> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen (JPG, PNG o WebP).');
  }
  const dims = await getImageDimensions(file);
  if (dims.width < min || dims.height < min) {
    throw new Error(
      `La portada debe tener al menos ${min} x ${min} píxeles. Tu imagen es ${dims.width} x ${dims.height}.`
    );
  }
  return dims;
}
