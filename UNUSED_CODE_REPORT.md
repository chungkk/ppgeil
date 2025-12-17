# Báo Cáo Code Không Sử Dụng - PapaGeil Project

**Ngày tạo:** 2025-12-17  
**Phân tích:** Components, Pages, Libraries

---

## 📊 Tổng Quan

### Thống Kê
- **Tổng components kiểm tra:** 58
- **Tổng lib files kiểm tra:** 45+
- **Components KHÔNG sử dụng:** 8 ✅
- **Lib files KHÔNG sử dụng:** 1 ✅
- **Pages có thể xóa:** 4 ✅ (bao gồm daily-phrase)
- **Components ĐANG DÙNG:** 3 ❌ (NotificationDropdown, CategoryTag, LoginModal)

---

## 🔴 COMPONENTS KHÔNG SỬ DỤNG - CÓ THỂ XÓA

### 1. AudioControls.js
**Đường dẫn:** `/components/AudioControls.js`  
**Lý do:** Không được import ở bất kỳ đâu  
**Mô tả:** Component điều khiển audio (play/pause/seek/playback rate)  
**Tìm thấy trong:** Chỉ trong các file docs, không có trong code production  
**Khuyến nghị:** ✅ **XÓA** - Component này không được sử dụng

---

### 2. NotificationDropdown.js ✅ ĐANG DÙNG
**Đường dẫn:** `/components/NotificationDropdown.js`  
**Lý do:** ĐANG ĐƯỢC SỬ DỤNG trong Header.js (line 305)  
**Mô tả:** Dropdown hiển thị thông báo cho user  
**Tìm thấy trong:** `Header.js` (imported line 13, used line 305)  
**Khuyến nghị:** ❌ **KHÔNG XÓA** - Component đang hoạt động

---

### 3. GoogleSignInButton.js
**Đường dẫn:** `/components/GoogleSignInButton.js`  
**Lý do:** Không được import trong code production  
**Mô tả:** Nút đăng nhập bằng Google  
**Tìm thấy trong:** Chỉ trong docs  
**Khuyến nghị:** ✅ **XÓA** - Có thể đã được thay thế bởi LoginModal

---

### 4. OptimizedImage.js & Exports
**Đường dẫn:** `/components/OptimizedImage.js`  
**Exports không dùng:**
- `LessonThumbnail`
- `HeroImage`  
- `AvatarImage`

**Lý do:** Chỉ default export được dùng trong LessonCard.js  
**Khuyến nghị:** ⚠️ **XÓA CÁC NAMED EXPORTS** - Chỉ giữ default export

---

### 5. Transcript.js
**Đường dẫn:** `/components/Transcript.js`  
**Lý do:** Không được import trong component nào  
**Mô tả:** Component hiển thị transcript với navigation  
**Tìm thấy trong:** Có thể đã được thay thế bởi `TranscriptPanel.js` trong dictation/  
**Khuyến nghị:** ✅ **XÓA** - Đã có TranscriptPanel thay thế

---

### 6. CategoryFilter.js
**Đường dẫn:** `/components/CategoryFilter.js`  
**Lý do:** KHÔNG được import trong bất kỳ page/component nào  
**Mô tả:** Component filter lessons theo category (T051-T057)  
**Tìm thấy:** Chỉ có CSS file `styles/CategoryFilter.module.css`  
**Khuyến nghị:** ✅ **XÓA** - Không được sử dụng (nhớ xóa cả CSS)

---

### 7. AuthForm.js
**Đường dẫn:** `/components/AuthForm.js`  
**Lý do:** Không được import trong production code  
**Mô tả:** Form đăng nhập/đăng ký  
**Khuyến nghị:** ✅ **XÓA** - Có thể đã được thay thế bởi LoginModal.js

---

### 8. VoiceInputButton.js
**Đường dẫn:** `/components/VoiceInputButton.js`  
**Lý do:** Không được import trong bất kỳ component nào  
**Mô tả:** Button để record voice input (Web Speech API + Whisper)  
**Khuyến nghị:** ⚠️ **GIỮ LẠI NẾU CÒN KẾ HOẠCH SỬ DỤNG** hoặc ✅ **XÓA**

---

### 9. SentenceListItem.js
**Đường dẫn:** `/components/SentenceListItem.js`  
**Lý do:** Không được import  
**Mô tả:** Component hiển thị sentence item trong list  
**Khuyến nghị:** ✅ **XÓA**

---

### 10. FooterControls.js
**Đường dẫn:** `/components/FooterControls.js`  
**Lý do:** Không được import trong production code  
**Mô tả:** Footer controls với navigation và progress  
**Khuyến nghị:** ✅ **XÓA**

---

### 11. CategoryTag.js ✅ ĐANG DÙNG
**Đường dẫn:** `/components/CategoryTag.js`  
**Lý do:** ĐANG ĐƯỢC SỬ DỤNG trong LessonCard.js  
**Mô tả:** Tag hiển thị category của lesson (T064-T066)  
**Tìm thấy trong:** `LessonCard.js` (imported line 4, used line 105)  
**Khuyến nghị:** ❌ **KHÔNG XÓA** - Component đang hoạt động

---

## 🔴 LIB FILES KHÔNG SỬ DỤNG

### 1. youtubeApi.js
**Đường dẫn:** `/lib/youtubeApi.js`  
**Lý do:** Được import nhưng có thể dùng hooks thay thế  
**Được import trong:**
- `pages/practice/[lessonId]/listen.js`
- `pages/dictation/[lessonId].js`
- `lib/hooks/youtube/useYouTubeAPI.js`
- `models/SystemSettings.js`

**Khuyến nghị:** ⚠️ **GIỮ LẠI** - Đang được sử dụng thông qua hooks

---

### 2. textToSpeech.js
**Đường dẫn:** `/lib/textToSpeech.js`  
**Được import trong:**
- `pages/dashboard.old.js` (OLD FILE)
- `pages/dictation/[lessonId].js`
- `components/DictionaryPopup.js`

**Khuyến nghị:** ⚠️ **GIỮ LẠI** - Đang được sử dụng trong DictionaryPopup

---

### 3. featureFlags.js
**Đường dẫn:** `/lib/featureFlags.js`  
**Lý do:** Chỉ được import trong DictionaryPopup.js  
**Mô tả:** A/B testing feature flags system  
**Khuyến nghị:** ⚠️ **GIỮ LẠI NẾU CÒN KẾ HOẠCH A/B TESTING** hoặc ✅ **XÓA**

---

### 4. serviceWorker.js
**Đường dẫn:** `/lib/serviceWorker.js`  
**Được import trong:**
- `pages/_app.js`
- `components/OfflineIndicator.js`

**Khuyến nghị:** ⚠️ **GIỮ LẠI** - Đang được sử dụng cho offline functionality

---

### 5. dictationUtils.js
**Đường dẫn:** `/lib/dictationUtils.js`  
**Được import trong:** Dictation pages và components  
**Khuyến nghị:** ⚠️ **GIỮ LẠI** - Đang được sử dụng

---

### 6. translationCache.js
**Đường dẫn:** `/lib/translationCache.js`  
**Lý do:** KHÔNG được import ở bất kỳ đâu  
**Mô tả:** Client-side translation caching system  
**Khuyến nghị:** ✅ **XÓA** - Hoàn toàn không được sử dụng

---

## 🟡 PAGES CÓ THỂ KHÔNG DÙNG

### 1. dashboard.old.js
**Đường dẫn:** `/pages/dashboard.old.js`  
**Khuyến nghị:** ✅ **XÓA** - Là file backup, đã có `dashboard/index.js`

---

### 2. admin/dashboard.old.js
**Đường dẫn:** `/pages/admin/dashboard.old.js`  
**Khuyến nghị:** ✅ **XÓA** - Là file backup, đã có `admin/dashboard/index.js`

---

### 3. dictionary-demo.js
**Đường dẫn:** `/pages/dictionary-demo.js`  
**Lý do:** Demo page, có thể không dùng trong production  
**Khuyến nghị:** ⚠️ **XEM XÉT XÓA** nếu không còn cần demo

---

### 4. daily-phrase.js
**Đường dẫn:** `/pages/daily-phrase.js`  
**Lý do:** Có link trong Header (line 206) nhưng có thể không cần thiết  
**Mô tả:** Page hiển thị Nomen-Verb-Verbindungen của ngày  
**Tìm thấy trong:** `Header.js` có link đến `/daily-phrase`  
**Khuyến nghị:** ⚠️ **TÙY NGƯỜI DÙNG** - Nếu không dùng feature này thì xóa (nhớ xóa link trong Header)

---

## 📋 DANH SÁCH XÓA ĐƯỢC NGAY

### Components (8 files):
```bash
rm components/AudioControls.js
rm components/GoogleSignInButton.js
rm components/Transcript.js
rm components/CategoryFilter.js
rm components/AuthForm.js
rm components/VoiceInputButton.js
rm components/SentenceListItem.js
rm components/FooterControls.js

# Xóa CSS tương ứng
rm styles/CategoryFilter.module.css
rm styles/FooterControls.module.css
rm styles/VoiceInputButton.module.css
```

### Lib Files (1 file):
```bash
rm lib/translationCache.js
```

### Pages (2-4 files tùy quyết định):
```bash
# Chắc chắn xóa được
rm pages/dashboard.old.js
rm pages/admin/dashboard.old.js

# Tùy quyết định
rm pages/dictionary-demo.js
rm pages/daily-phrase.js  # Nếu xóa thì phải xóa link trong Header.js line 206
```

### ✅ Đã Kiểm Tra - ĐANG DÙNG (KHÔNG XÓA):
- `components/NotificationDropdown.js` ✅ - Đang dùng trong Header.js
- `components/CategoryTag.js` ✅ - Đang dùng trong LessonCard.js
- `components/LoginModal.js` ✅ - Đang dùng trong Header.js

### Cần Quyết Định:
- `components/OptimizedImage.js` - Xóa named exports không dùng (LessonThumbnail, HeroImage, AvatarImage)
- `lib/featureFlags.js` - Quyết định có giữ A/B testing không
- `pages/daily-phrase.js` - Có link trong Header, xóa nếu không cần feature

---

## 🎯 KHUYẾN NGHỊ TIẾP THEO

### 1. Backup trước khi xóa
```bash
git checkout -b cleanup/unused-code
git add .
git commit -m "Backup before cleanup"
```

### 2. Xóa từng nhóm và test
- Xóa components không dùng → Test build
- Xóa lib files không dùng → Test build
- Xóa old pages → Test routing

### 3. Kiểm tra CSS không dùng
Các file CSS module tương ứng với components đã xóa:
- `styles/AudioControls.module.css` (nếu có)
- `styles/CategoryFilter.module.css`
- `styles/FooterControls.module.css`
- `styles/VoiceInputButton.module.css`
- v.v.

### 4. Estimate tiết kiệm
- **Components không dùng (8):** ~2,000 dòng code
- **Lib files không dùng (1):** ~50 dòng code
- **Old pages (2-4):** ~500-700 dòng code
- **CSS files:** ~200 dòng code
- **Tổng ước tính:** ~2,750-2,950 dòng code có thể xóa

---

## ⚠️ LƯU Ý

1. **Backup dữ liệu:** Đảm bảo có git commit trước khi xóa
2. **Test kỹ:** Sau khi xóa phải test toàn bộ features
3. **CSS Modules:** Nhớ xóa cả file CSS tương ứng
4. **Type definitions:** Xóa cả TypeScript types nếu có
5. **Documentation:** Update docs sau khi xóa

---

## 📞 Câu Hỏi Cần Trả Lời

1. ✅ ~~**NotificationDropdown**~~ - ĐANG DÙNG trong Header (line 305)
2. ✅ ~~**CategoryTag**~~ - ĐANG DÙNG trong LessonCard (line 105)
3. ⚠️ **daily-phrase.js** - Có muốn giữ feature "Nomen-Verb-Verbindungen của ngày" không?
4. ⚠️ **featureFlags.js** - Có kế hoạch A/B testing không?
5. ⚠️ **VoiceInputButton** - Có kế hoạch thêm voice input không?

---

## ✅ KẾT LUẬN CẬP NHẬT

**Có thể xóa an toàn NGAY:**
- **8 components** + **3 CSS files**
- **1 lib file** (translationCache.js)
- **2 old pages** (dashboard.old.js, admin/dashboard.old.js)
- **Tổng: ~12-13 files**, tiết kiệm **~2,750 dòng code**

**Cần quyết định trước khi xóa:**
- `daily-phrase.js` (nếu xóa phải update Header.js)
- `dictionary-demo.js` (demo page)
- `featureFlags.js` (A/B testing)
