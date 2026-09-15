import { CLOUDINARY } from '../config/credentials';

const b64 = (s: string) => {
  // RN me btoa available hota hai usually
  // agar nahi, base-64 package use karo
  try {
    return (global as any).btoa(s);
  } catch {
    return Buffer.from(s).toString('base64');
  }
};

export const CloudinaryService = {
  /**
   * Unsigned upload via preset. Returns secure_url + public_id.
   */
  upload: async (params: {
    uri: string;
    type: 'image' | 'video' | 'audio' | 'raw';
    mime: string;
    fileName: string;
  }): Promise<{ url: string; publicId: string; bytes: number }> => {
    const form = new FormData();
    form.append('file', {
      uri: params.uri,
      type: params.mime,
      name: params.fileName,
    } as any);
    form.append('upload_preset', CLOUDINARY.uploadPreset);

    const res = await fetch(CLOUDINARY.uploadUrl, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Upload failed: ${txt.slice(0, 120)}`);
    }
    const j = await res.json();
    return {
      url: j.secure_url,
      publicId: j.public_id,
      bytes: j.bytes || 0,
    };
  },

  /**
   * Delete by public_id using Admin API (Basic auth: api_key:api_secret).
   * Try image → video → raw (Cloudinary keeps them in different buckets).
   */
  delete: async (publicId: string, type?: 'image' | 'video' | 'raw') => {
    const auth = b64(`${CLOUDINARY.apiKey}:${CLOUDINARY.apiSecret}`);
    const buckets: Array<'image' | 'video' | 'raw'> = type
      ? [type]
      : ['image', 'video', 'raw'];

    for (const b of buckets) {
      const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/resources/${b}/upload?public_ids=${encodeURIComponent(
        publicId
      )}`;
      try {
        const res = await fetch(url, {
          method: 'DELETE',
          headers: { Authorization: `Basic ${auth}` },
        });
        if (res.ok) {
          const j = await res.json();
          if (j?.deleted?.[publicId] === 'deleted') return true;
        }
      } catch {}
    }
    return false;
  },
};
