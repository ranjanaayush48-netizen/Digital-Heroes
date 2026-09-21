/**
 * Resizes and compresses an image file to ensure it stays below Firestore's 1MiB limit.
 * @param file The image file to compress
 * @param maxWidth Maximum width in pixels
 * @param maxHeight Maximum height in pixels
 * @param quality Compression quality (0.0 to 1.0)
 * @returns Promise resolving to a base64 Data URL
 */
export const compressImage = (
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.7
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        // Output as JPEG to benefit from quality parameter
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Final size check (Firestore doc limit is ~1MB, we aim for < 800KB to be safe with other fields)
        const sizeInBytes = Math.round((dataUrl.length * 3) / 4);
        console.log(`Image compressed: ${width}x${height}, approx size: ${Math.round(sizeInBytes / 1024)}KB`);
        
        if (sizeInBytes > 1000000) {
          // If still too big, try again with lower quality
          if (quality > 0.2) {
            console.warn('Image still too large, retrying with lower quality...');
            resolve(compressImage(file, maxWidth - 100, maxHeight - 100, quality - 0.2));
          } else {
            reject(new Error('Image is too large and could not be compressed below 1MB.'));
          }
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};
