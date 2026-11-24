import { Injectable } from '@angular/core';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { app } from '../../firebase/config';

@Injectable({ providedIn: 'root' })
export class MediaStorageService {
  async uploadArtistImage(artistId: string, file: File): Promise<string> {
    return this.upload(`artists/${artistId}/${file.name}`, file);
  }

  async uploadProductImage(productId: string, file: File): Promise<string> {
    return this.upload(`products/${productId}/${file.name}`, file);
  }

  private async upload(path: string, file: File): Promise<string> {
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
      throw new Error('Selecciona una imagen válida de hasta 10 MB.');
    }
    const imageRef = ref(getStorage(app), path);
    await uploadBytes(imageRef, file);
    return getDownloadURL(imageRef);
  }
}
