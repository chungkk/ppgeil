import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { verifyToken } from '../../lib/jwt';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    // Parse form data
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    const type = fields.type?.[0];
    const url = fields.url?.[0];

    if (type === 'url') {
      if (!url) {
        return res.status(400).json({ message: 'URL is required for type url' });
      }
    } else {
      if (!file) {
        return res.status(400).json({ message: 'Không có file được upload' });
      }
    }

    // Determine target directory based on type
    let targetDir;
    let urlPrefix;

    if (type === 'audio' || (type === 'url' && fields.audioType?.[0] === 'audio')) {
      targetDir = path.join(process.cwd(), 'public', 'audio');
      urlPrefix = '/audio';
    } else if (type === 'json' || (type === 'url' && fields.audioType?.[0] === 'json')) {
      targetDir = path.join(process.cwd(), 'public', 'text');
      urlPrefix = '/text';
    } else if (type === 'thumbnail') {
      targetDir = path.join(process.cwd(), 'public', 'thumbnails');
      urlPrefix = '/thumbnails';
    } else {
      return res.status(400).json({ message: 'Type không hợp lệ (audio, json, hoặc thumbnail)' });
    }

    // Create directory if not exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    let fileName, targetPath, fileSize;

    if (type === 'url') {
      // Fetch from URL
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(400).json({ message: 'Failed to fetch from URL' });
      }
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || '';
      const ext = contentType.includes('audio') ? '.mp3' : path.extname(url) || '.mp3';
      const baseName = path.basename(url, path.extname(url)) || 'audio';
      const timestamp = Date.now();
      fileName = `${baseName}_${timestamp}${ext}`;
      targetPath = path.join(targetDir, fileName);
      fs.writeFileSync(targetPath, Buffer.from(buffer));
      fileSize = buffer.byteLength;
    } else {
      // Generate unique filename
      const originalName = file.originalFilename || 'file';
      const ext = path.extname(originalName);
      const baseName = path.basename(originalName, ext);
      const timestamp = Date.now();
      fileName = `${baseName}_${timestamp}${ext}`;
      targetPath = path.join(targetDir, fileName);

      // Move file to target directory
      fs.copyFileSync(file.filepath, targetPath);
      fs.unlinkSync(file.filepath); // Clean up temp file
      fileSize = file.size;
    }

    const fileUrl = `${urlPrefix}/${fileName}`;

    return res.status(200).json({
      success: true,
      url: fileUrl,
      fileName,
      size: fileSize
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ message: 'Lỗi upload file' });
  }
}
