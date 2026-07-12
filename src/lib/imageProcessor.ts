export function compressAndResizeImage(
  file: File,
  maxWidth = 500,
  maxHeight = 500,
  quality = 0.4
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Using highly optimized quality (0.4) and resolution (500 max) to save space
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = () => reject(new Error('Image failed to load'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('File failed to read'));
    reader.readAsDataURL(file);
  });
}
