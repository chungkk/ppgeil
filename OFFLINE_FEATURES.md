# 📥 Tính năng Offline - Hướng dẫn sử dụng

## Tổng quan

App PapaGeil giờ đã hỗ trợ **học offline hoàn toàn** với khả năng:

✅ Pre-cache bài học trước khi học  
✅ Tải xuống 10 bài phổ biến nhất chỉ với 1 click  
✅ Chọn bài học cụ thể để download  
✅ Quản lý dung lượng cache  
✅ Header/Footer tự động ẩn trên iOS app

---

## Cách sử dụng

### 1. Truy cập trang Offline Downloads

1. Mở app và đăng nhập
2. Vào **Profile** → **Settings** (⚙️)
3. Click vào tab **📥 Offline**

### 2. Tải xuống bài học

#### Option A: Tải nhanh 10 bài phổ biến
- Click nút **"📦 Tải 10 bài phổ biến nhất"**
- Đợi quá trình download hoàn tất
- Progress bar sẽ hiển thị tiến độ

#### Option B: Chọn bài học cụ thể
- Scroll xuống danh sách **"Tất cả bài học"**
- Click nút **"⬇️ Tải"** bên cạnh bài muốn download
- Bài đã tải sẽ hiển thị **"Đã tải"** và có icon ✓

### 3. Xem thông tin Storage
Ở đầu trang sẽ hiển thị:
- Dung lượng đã dùng / Tổng dung lượng
- % dung lượng đã sử dụng
- Progress bar trực quan

### 4. Quản lý bài đã tải

#### Xóa từng bài
- Vào section **"Đã tải xuống"**
- Click icon 🗑️ bên cạnh bài muốn xóa
- Confirm để xóa

#### Xóa tất cả
- Click nút **"Xóa tất cả"** ở góc phải section "Đã tải xuống"
- Confirm để xóa toàn bộ cache

---

## Nội dung được tải xuống

Khi download 1 bài học, những file sau sẽ được cache:

📄 **Lesson Data** - Thông tin bài học từ API  
📝 **Transcript** - File transcript JSON  
🖼️ **Thumbnail** - Ảnh thumbnail từ YouTube  
🔊 **Audio Files** - File audio (nếu có)

---

## Học offline

Sau khi tải xuống:

1. **Tắt internet** hoặc bật **Airplane Mode**
2. Mở bài học đã tải
3. App sẽ tự động load từ cache
4. Học bình thường như khi online

**Lưu ý:**
- Progress vẫn được lưu local
- Khi online lại, progress sẽ tự động sync lên server

---

## Kỹ thuật Implementation

### Architecture

```
┌─────────────────────────────────────┐
│   OfflineDownloadManager (UI)      │
│   /components/                      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   useOfflineCache (Hook)            │
│   /lib/hooks/                       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   offlineCache.js (Service)         │
│   - cacheLessonComplete()           │
│   - preCacheTopLessons()            │
│   - getCachedLessons()              │
└──────────────┬──────────────────────┘
               │
     ┌─────────┴─────────┐
     ▼                   ▼
┌─────────┐     ┌──────────────────┐
│ Cache   │     │   IndexedDB      │
│ API     │     │   (Metadata)     │
└─────────┘     └──────────────────┘
```

### Files Created

1. **`/lib/offlineCache.js`**
   - Core offline cache service
   - Handle download/remove lessons
   - Manage IndexedDB metadata

2. **`/lib/hooks/useOfflineCache.js`**
   - React hook for state management
   - Progress tracking
   - Cache operations

3. **`/components/OfflineDownloadManager.js`**
   - UI component for download management
   - Tab "Offline" in Settings page

4. **`/styles/OfflineDownloadManager.module.css`**
   - Styling for download manager

5. **`/lib/hooks/useIsNativeApp.js`**
   - Detect iOS platform
   - Used to hide header/footer

### Service Worker Integration

Service Worker (`/public/sw.js`) đã support:
- Cache transcripts, audio, images
- Network-first strategy for API
- Cache-first strategy for assets
- Background sync for progress

---

## Testing

### Web (Browser)
```bash
npm run dev
# Open http://localhost:3000
# Login → Profile → Settings → Offline tab
```

### iOS (Simulator/Device)
```bash
# Terminal 1: Start Next.js (if using local dev)
npm run dev

# Terminal 2: Sync and open Xcode
npx cap sync ios
npx cap open ios

# In Xcode: Select device and Run (⌘R)
```

### Test Offline Mode
1. Download some lessons
2. Turn off WiFi/4G
3. Navigate to downloaded lessons
4. Verify they load correctly

---

## Known Limitations

❌ **API Authentication offline**: API routes cần internet lần đầu  
❌ **Video streaming**: Chỉ cache transcript và audio, không cache video YouTube  
❌ **Dynamic content**: Content cập nhật mới cần re-download

---

## Future Improvements

🔮 **Auto-download on WiFi**: Tự động tải lessons khi kết nối WiFi  
🔮 **Smart cache**: Tự động xóa lessons cũ khi hết dung lượng  
🔮 **Download queue**: Queue system cho bulk downloads  
🔮 **Partial cache**: Cache theo section thay vì cả bài

---

## Troubleshooting

### Lỗi: "Failed to cache lesson"
- Kiểm tra internet connection
- Kiểm tra storage space
- Clear cache và thử lại

### Bài học không load offline
- Verify bài đã được download
- Check console logs trong Safari/Chrome DevTools
- Clear Service Worker cache và re-download

### Storage đầy
- Xóa bài cũ không cần
- Hoặc click "Xóa tất cả" để reset

---

## Credits

Developed by: Droid (Factory AI)  
Date: 2025-12-13  
Version: 1.0.0
