import * as ImagePicker from 'expo-image-picker';

const CLOUD_NAME =
  process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  'uanwbqvg';

const UPLOAD_PRESET =
  process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
  'smartmati_preset';

/**
 * Opens image gallery, prompts user to crop in 1:1 aspect ratio, and returns local file URI.
 */
export const pickAndCropAvatar = async (): Promise<string | null> => {
  return pickAvatarFromGallery();
};

/**
 * Pick photo from device photo gallery with 1:1 square crop.
 */
export const pickAvatarFromGallery = async (): Promise<string | null> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Permission to access photo library was denied. Please allow access in device settings.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1], // 1:1 square crop for profile picture
    quality: 0.85,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  return result.assets[0].uri;
};

/**
 * Take live portrait photo using device camera with 1:1 square crop.
 */
export const takeAvatarWithCamera = async (): Promise<string | null> => {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Permission to access camera was denied. Please allow camera access in device settings.');
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1], // 1:1 square crop for profile picture
    quality: 0.85,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  return result.assets[0].uri;
};

/**
 * Uploads a local image file or base64 URI directly to Cloudinary using unsigned upload preset.
 * Returns the hosted secure URL.
 */
export const uploadImageToCloudinary = async (
  localUri: string,
  folder: string = 'smartmati_reports'
): Promise<string> => {
  const apiUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  const filename = localUri.split('/').pop() || `upload_${Date.now()}.jpg`;
  const match = /\.(\w+)$/.exec(filename);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  const formData = new FormData();

  // If already a base64 data URI
  if (localUri.startsWith('data:')) {
    formData.append('file', localUri);
  } else {
    // Standard React Native file payload
    formData.append('file', {
      uri: localUri,
      name: filename,
      type: mimeType,
    } as any);
  }

  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
    });

    const responseText = await res.text();

    if (!res.ok) {
      let parsedError = responseText;
      try {
        const errorJson = JSON.parse(responseText);
        if (errorJson.error?.message) {
          parsedError = errorJson.error.message;
        }
      } catch (_) {}

      console.error('Cloudinary upload failure details:', parsedError);
      throw new Error(`Cloudinary Upload Error: ${parsedError}`);
    }

    const json = JSON.parse(responseText);
    if (!json.secure_url) {
      throw new Error('No secure image URL returned from Cloudinary.');
    }

    return json.secure_url;
  } catch (err: any) {
    console.error('uploadImageToCloudinary catch error:', err);
    throw err;
  }
};
