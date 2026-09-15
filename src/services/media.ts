import RNFS from 'react-native-fs';
import { createDownloadTask } from '@kesha-antonov/react-native-background-downloader';
import { db, C } from './firebase';
import firestore from '@react-native-firebase/firestore';
import { NotifeeService } from './notifee';
import { CloudinaryService } from './cloudinary';
import { BandwidthService } from './bandwidth';
import { APP } from '../config/credentials';

const MEDIA_DIR = `${RNFS.DocumentDirectoryPath}/crizon_media`;

const ensureDir = async () => {
  const exists = await RNFS.exists(MEDIA_DIR);
  if (!exists) await RNFS.mkdir(MEDIA_DIR);
};

export const MediaService = {
  localPath: (messageId: string, ext = 'bin') =>
    `${MEDIA_DIR}/${messageId}.${ext}`,

  /**
   * Download a media message, with progress notification.
   * On 100% complete + local save, sends ACK to Firestore:
   *   - status = 'delivered'
   *   - downloadedAt = timestamp
   * Then deletes from Cloudinary.
   */
  download: async (params: {
    messageId: string;
    chatId: string;
    url: string;
    publicId?: string;
    type: 'image' | 'video' | 'audio' | 'raw';
    fileName: string;
    sizeBytes: number;
  }): Promise<string> => {
    await ensureDir();
    const ext = params.fileName.split('.').pop() || 'bin';
    const dest = MediaService.localPath(params.messageId, ext);

    const already = await RNFS.exists(dest);
    if (already) {
      const stat = await RNFS.stat(dest);
      if (Number(stat.size) === params.sizeBytes || params.sizeBytes === 0) {
        return dest;
      }
      await RNFS.unlink(dest).catch(() => {});
    }

    await NotifeeService.showDownloadProgress(params.fileName, 0);

    const finalPath = await new Promise<string>((resolve, reject) => {
      createDownloadTask({
        id: params.messageId,
        url: params.url,
        destination: dest,
      })
        .begin(({ expectedBytes }) => {
          NotifeeService.showDownloadProgress(params.fileName, 1);
        })
        .progress(({ bytesDownloaded, bytesTotal }) => {
          const pct = bytesTotal
            ? Math.round((bytesDownloaded / bytesTotal) * 100)
            : 0;
          NotifeeService.showDownloadProgress(params.fileName, pct);
        })
        .done(({ location }) => {
          resolve(location || dest);
        })
        .error(({ error }) => {
          reject(new Error(error || 'Download failed'));
        });
    });
    const stat = await RNFS.stat(finalPath);

    // Verify download fully complete
    const expected = params.sizeBytes || 0;
    const got = Number(stat.size);

    await NotifeeService.hideDownload();

    if (expected > 0 && Math.abs(got - expected) > Math.max(2048, expected * 0.02)) {
      // Size mismatch — corrupted / partial
      throw new Error('Download incomplete, dobara try karo');
    }

    // Update Firestore — ACK
    await db
      .collection(C.messages)
      .doc(params.chatId)
      .collection('thread')
      .doc(params.messageId)
      .update({
        status: 'delivered',
        downloadedAt: Date.now(),
      });

    // Bandwidth usage
    await BandwidthService.add(Math.ceil(got / 1024 / 1024));

    // Delete from Cloudinary (silent)
    if (params.publicId) {
      CloudinaryService.delete(params.publicId, params.type).catch(() => {});
    }

    return finalPath;
  },

  /**
   * Delete local file.
   */
  removeLocal: async (path: string) => {
    try {
      if (await RNFS.exists(path)) await RNFS.unlink(path);
    } catch {}
  },

  /**
   * Total local media size in MB.
   */
  localUsageMB: async (): Promise<number> => {
    try {
      const exists = await RNFS.exists(MEDIA_DIR);
      if (!exists) return 0;
      const files = await RNFS.readDir(MEDIA_DIR);
      const total = files.reduce(
        (acc, f) => acc + Number(f.size || 0),
        0
      );
      return Math.ceil(total / 1024 / 1024);
    } catch {
      return 0;
    }
  },

  /**
   * Wipe all local media (Settings > Clear app storage).
   */
  clearAll: async () => {
    try {
      const exists = await RNFS.exists(MEDIA_DIR);
      if (exists) await RNFS.unlink(MEDIA_DIR);
      await ensureDir();
    } catch {}
  },
};
