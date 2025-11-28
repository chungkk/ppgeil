import fs from 'fs';
import path from 'path';
import { verifyToken } from '../../lib/jwt';

function parseSRTTime(timeString) {
  const [hours, minutes, secondsAndMs] = timeString.split(':');
  const [seconds, milliseconds] = secondsAndMs.split(',');
  
  return (
    parseInt(hours) * 3600 +
    parseInt(minutes) * 60 +
    parseInt(seconds) +
    parseInt(milliseconds) / 1000
  );
}

function convertSRTtoJSON(srtText) {
  const lines = srtText.trim().split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].trim() === '') {
      i++;
      continue;
    }

    const indexLine = lines[i].trim();
    if (!/^\d+$/.test(indexLine)) {
      i++;
      continue;
    }

    i++;
    if (i >= lines.length) break;

    const timeLine = lines[i].trim();
    const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
    
    if (!timeMatch) {
      i++;
      continue;
    }

    const start = parseSRTTime(timeMatch[1]);
    const end = parseSRTTime(timeMatch[2]);

    i++;
    let text = '';
    while (i < lines.length && lines[i].trim() !== '' && !/^\d+$/.test(lines[i].trim())) {
      if (text) text += ' ';
      text += lines[i].trim();
      i++;
    }

    if (text) {
      result.push({
        text: text,
        start: start,
        end: end
      });
    }
  }

  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(401).json({ message: 'Không có quyền truy cập' });
    }

    const { srtText, lessonId } = req.body;

    if (!srtText || !lessonId) {
      return res.status(400).json({ message: 'Thiếu dữ liệu SRT text hoặc lessonId' });
    }

    const jsonData = convertSRTtoJSON(srtText);

    if (jsonData.length === 0) {
      return res.status(400).json({ message: 'Không thể parse SRT text. Vui lòng kiểm tra định dạng.' });
    }

    const targetDir = path.join(process.cwd(), 'public', 'text');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const fileName = `${lessonId}.json`;
    const targetPath = path.join(targetDir, fileName);

    fs.writeFileSync(targetPath, JSON.stringify(jsonData, null, 4), 'utf8');

    const url = `/text/${fileName}`;

    return res.status(200).json({
      success: true,
      url,
      fileName,
      itemCount: jsonData.length
    });

  } catch (error) {
    console.error('Convert SRT error:', error);
    return res.status(500).json({ message: 'Lỗi convert SRT: ' + error.message });
  }
}
