# Cleanup Old Recordings - Tự động xóa dữ liệu ghi âm sau 30 ngày

## Cách hoạt động

Hệ thống sẽ tự động xóa dữ liệu progress ghi âm của user sau 30 ngày kể từ lần ghi âm cuối cùng.

### Lưu trữ file ghi âm

- **Vị trí:** `public/recordings/{userId}/{lessonId}/sentence_{index}_{timestamp}.webm`
- **Chế độ ghi đè:** Khi user ghi âm lại một câu, file cũ sẽ bị xóa và thay thế bằng file mới
- **Metadata:** Database lưu đường dẫn file, accuracy, score, attempts
- **Auto-cleanup:** Sau 30 ngày không hoạt động, cả file và metadata đều bị xóa

### Flow lưu file

1. User ghi âm câu → Audio blob được tạo
2. Audio được gửi lên Whisper API để transcribe
3. Kết quả được so sánh với text gốc → tính accuracy và score
4. Save progress metadata vào database (accuracy, score, attempts)
5. Upload audio file lên server tại `public/recordings/{userId}/{lessonId}/`
6. Nếu đã có file cũ cho câu này → xóa file cũ, lưu file mới
7. Update database với đường dẫn file mới

## Các phương pháp cleanup

### 1. Tự động khi user truy cập (Auto-cleanup)

Khi user truy cập trang shadowing, hệ thống sẽ tự động xóa các progress cũ hơn 30 ngày của user đó.

- **File:** `pages/api/shadowing-sentence-progress.js`
- **Trigger:** Mỗi lần user load progress
- **Scope:** Chỉ xóa progress và audio files của user hiện tại
- **Logic:** 
  1. Tìm progress cũ hơn 30 ngày
  2. Xóa audio files tương ứng
  3. Xóa progress records trong database

### 2. Chạy thủ công (Manual cleanup)

Chạy script để xóa tất cả progress cũ của tất cả users:

```bash
npm run cleanup-recordings
```

**Hoặc:**

```bash
node scripts/cleanup-old-recordings.js
```

### 3. Gọi API endpoint (API cleanup)

Gọi API endpoint để trigger cleanup:

```bash
curl -X POST http://localhost:3000/api/cleanup-old-recordings \
  -H "x-api-key: YOUR_API_KEY"
```

**Cấu hình API key (optional):**

Thêm vào file `.env.local`:

```
CLEANUP_API_KEY=your-secret-key-here
```

### 4. Setup Cron Job (Tự động định kỳ)

#### Trên Linux/Mac (Crontab)

1. Mở crontab:
```bash
crontab -e
```

2. Thêm dòng sau để chạy hàng ngày lúc 2 giờ sáng:
```
0 2 * * * cd /path/to/your/project && npm run cleanup-recordings >> /var/log/cleanup-recordings.log 2>&1
```

#### Trên Server (PM2 + Cron)

1. Cài đặt `node-cron` (đã có trong dependencies)

2. Tạo file `cron-jobs.js` trong thư mục gốc:

```javascript
const cron = require('node-cron');
const { exec } = require('child_process');

// Chạy cleanup mỗi ngày lúc 2 giờ sáng
cron.schedule('0 2 * * *', () => {
  console.log('Running cleanup-old-recordings...');
  exec('npm run cleanup-recordings', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error}`);
      return;
    }
    console.log(`Output: ${stdout}`);
    if (stderr) console.error(`Stderr: ${stderr}`);
  });
});

console.log('Cron jobs started');
```

3. Chạy với PM2:
```bash
pm2 start cron-jobs.js --name cleanup-cron
pm2 save
```

#### Trên Vercel (Vercel Cron)

1. Thêm vào `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cleanup-old-recordings",
      "schedule": "0 2 * * *"
    }
  ]
}
```

2. Deploy lên Vercel

#### Trên Heroku (Heroku Scheduler)

1. Cài addon:
```bash
heroku addons:create scheduler:standard
```

2. Mở scheduler:
```bash
heroku addons:open scheduler
```

3. Thêm job:
```
npm run cleanup-recordings
```

Frequency: Daily, 2:00 AM

## Kiểm tra logs

Sau khi chạy cleanup, check logs để xem kết quả:

```
Found 123 old progress entries to delete
  ✓ Deleted audio: /recordings/userId123/lesson1/sentence_0_1234567890.webm
  ✓ Deleted audio: /recordings/userId123/lesson1/sentence_1_1234567891.webm
  ... (more deletions)

✅ Cleanup completed successfully!
📊 Deleted 123 old recording progress entries
🗑️ Deleted 98 audio files
🗓️ Cutoff date: 2024-10-24T02:00:00.000Z
📈 Remaining progress entries: 456
```

## Lưu ý

- Progress được xóa dựa trên field `lastAttemptDate`
- Chỉ xóa progress cũ hơn 30 ngày, không ảnh hưởng đến progress mới
- File ghi âm (audio blob) không được lưu vào database, chỉ tồn tại trong session
- Chỉ metadata (accuracy, score, attempts) được lưu và sẽ bị xóa sau 30 ngày

## Khôi phục dữ liệu

**Quan trọng:** Sau khi xóa, dữ liệu không thể khôi phục. Hãy đảm bảo backup database trước khi chạy cleanup thủ công.

Backup MongoDB:
```bash
mongodump --uri="YOUR_MONGODB_URI" --out=/backup/path
```
