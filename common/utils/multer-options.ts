import { diskStorage } from 'multer';
import { extname, basename } from 'path';
import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';

export const multerOptions = {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
        
      const ext = extname(file.originalname);
      const base = basename(file.originalname, ext)
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9-_]/g, '');
      const uniqueName = `${base}-${randomUUID()}${ext}`;
      cb(null, uniqueName);
    }
  }),
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Faqat rasm fayllari yuklanishi mumkin!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  }
};
