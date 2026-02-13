
export interface UploadRecord {
  id: string;
  fileName: string;
  state: string;
  city: string;
  uploadDate: string;
  fileSize: number;
  bucketUrl: string;
  s3Path?: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  hash?: string;
  recoveryKey?: string;
  encryptedKeyPayload?: string;
  mimeType?: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  PICKING_FILE = 'PICKING_FILE',
  UPLOADING = 'UPLOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export enum ViewMode {
  DEPOSIT = 'DEPOSIT',
  RETRIEVAL = 'RETRIEVAL',
  INSTALLATION = 'INSTALLATION',
  PRIVACY = 'PRIVACY'
}
