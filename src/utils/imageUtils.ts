export const shimmer = (w: number, h: number) => `
  <svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs>
      <linearGradient id="g">
        <stop stop-color="#333" offset="20%" />
        <stop stop-color="#222" offset="50%" />
        <stop stop-color="#333" offset="70%" />
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="#333" />
    <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
    <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
  </svg>
`;

/**
 * Converts any Google Drive URL variant into a directly embeddable image URL.
 *
 * Handles these input formats:
 *   - https://drive.google.com/file/d/FILE_ID/view
 *   - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 *   - https://drive.google.com/open?id=FILE_ID
 *   - https://drive.google.com/uc?export=view&id=FILE_ID   (already correct)
 *   - https://lh3.googleusercontent.com/d/FILE_ID           (already correct)
 *
 * All are normalised to:
 *   https://lh3.googleusercontent.com/d/FILE_ID
 *
 * Non-Google-Drive URLs are returned unchanged.
 */
export const convertDriveUrl = (url: string): string => {
  if (!url) return url;

  // Already a direct lh3 thumbnail — no conversion needed
  if (url.includes("lh3.googleusercontent.com")) return url;

  // Already the uc?export=view format — extract ID and upgrade to lh3
  const ucMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (ucMatch) {
    return `https://lh3.googleusercontent.com/d/${ucMatch[1]}`;
  }

  // Sharing/view link: https://drive.google.com/file/d/FILE_ID/...
  const fileMatch = url.match(
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/
  );
  if (fileMatch) {
    return `https://lh3.googleusercontent.com/d/${fileMatch[1]}`;
  }

  // open?id= format
  const openMatch = url.match(
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/
  );
  if (openMatch) {
    return `https://lh3.googleusercontent.com/d/${openMatch[1]}`;
  }

  return url;
};

export const toBase64 = (str: string) =>

    typeof window === 'undefined'
        ? Buffer.from(str).toString('base64')
        : window.btoa(str);

/**
 * Compresses and resizes an image in the browser before upload.
 *
 * Targets:
 *   - Max dimension : 1600 px (preserves aspect ratio, no distortion)
 *   - Max file size : ~0.8 MB
 *   - Quality       : high enough for event posters (initialQuality 0.85)
 *
 * Uses the `browser-image-compression` library which handles EXIF rotation,
 * format selection, and progressive degradation automatically.
 * If compression fails for any reason the original file is returned unchanged
 * so the upload flow is never broken.
 *
 * The optional `quality` and `maxWidth` parameters are kept for backward
 * compatibility but are no longer the primary drivers — the library options
 * below take precedence.
 */
export const compressImage = async (
  file: File,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _quality: number = 0.85,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _maxWidth: number = 1600,
): Promise<File> => {
  try {
    // Dynamically import so this never affects server-side bundles.
    const imageCompression = (await import('browser-image-compression')).default;

    const options = {
      maxSizeMB: 0.8,          // Target ≤ 0.8 MB
      maxWidthOrHeight: 1600,   // Longest edge ≤ 1600 px; aspect ratio preserved
      useWebWorker: true,       // Non-blocking compression
      initialQuality: 0.85,     // High quality — avoids text becoming illegible
      alwaysKeepResolution: false,
      // Preserve original file type when it already compresses well (PNG→PNG,
      // JPEG→JPEG).  The library will output the same mime unless it helps.
      fileType: file.type,
    };

    const compressed = await imageCompression(file, options);

    // imageCompression may return a Blob; wrap in File to keep the name.
    const resultFile = new File(
      [compressed],
      file.name,
      { type: compressed.type, lastModified: Date.now() }
    );

    return resultFile;
  } catch (err) {
    // If compression fails for any reason, fall back to the original file
    // so the upload can still proceed.
    console.warn('[compressImage] Compression failed – uploading original file:', err);
    return file;
  }
};