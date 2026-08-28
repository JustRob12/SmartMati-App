export const CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'uanwbqvg';

export const UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'smartmati_preset';

/**
 * Uploads an image file or Blob directly to Cloudinary using an unsigned upload preset.
 * Returns the hosted secure URL.
 */
export const uploadImageToCloudinary = async (
  file: File | Blob,
  folder: string = 'smartmati_offices'
): Promise<string> => {
  const apiUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const response = await fetch(apiUrl, {
    method: 'POST',
    body: formData,
  });

  const responseText = await response.text();

  if (!response.ok) {
    let parsedError = responseText;
    try {
      const errorJson = JSON.parse(responseText);
      if (errorJson.error?.message) {
        parsedError = errorJson.error.message;
      }
    } catch (_) {}

    console.error('Cloudinary web upload failure:', parsedError);
    throw new Error(`Cloudinary Upload Error: ${parsedError}`);
  }

  const json = JSON.parse(responseText);
  if (!json.secure_url) {
    throw new Error('No secure image URL returned from Cloudinary.');
  }

  return json.secure_url;
};
