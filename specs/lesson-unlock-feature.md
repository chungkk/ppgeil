# Tính năng Unlock Bài học

## Tổng quan
- 1 bài Free (admin chọn) - ai cũng xem được kể cả guest
- User mới đăng ký được 2 lần unlock miễn phí
- Unlock thêm tốn 100 points/bài
- Bài locked hiển thị đen trắng + icon khóa
- Không thể lock lại bài đã unlock

## Checklist triển khai

### 1. Backend - Models
- [x] User model: thêm `unlockedLessons: [String]`, `freeUnlocksRemaining: Number (default: 2)`
- [x] Lesson model: thêm `isFreeLesson: Boolean (default: false)`

### 2. Backend - APIs
- [x] `POST /api/lessons/[id]/unlock` - unlock bài học
  - Kiểm tra bài đã unlock chưa
  - Nếu còn free unlock → dùng free
  - Nếu hết → trừ 100 points
  - Thêm lesson ID vào `unlockedLessons`
- [x] `PUT /api/admin/lessons/[id]/set-free` - admin set/unset bài free
- [x] Cập nhật `GET /api/lessons` - trả về trạng thái locked/unlocked cho từng bài
- [x] Cập nhật `GET /api/lessons/[id]` - chặn xem nội dung bài locked
- [x] Cập nhật `GET /api/homepage-data` - trả về lock status và userUnlockInfo

### 3. Frontend - Components
- [x] Cập nhật LessonCard - hiển thị grayscale + lock icon cho bài locked
- [x] Tạo UnlockModal - popup xác nhận unlock (hiện số points hoặc "Miễn phí")
- [x] Cập nhật trang index - tích hợp UnlockModal

### 4. Frontend - Admin
- [x] Thêm toggle "Bài Free" trong admin lesson management

### 5. Testing
- [x] Build thành công
- [ ] Test guest xem bài free
- [ ] Test user mới unlock 2 bài miễn phí
- [ ] Test unlock bằng points
- [ ] Test không đủ points

## Files đã thay đổi

### Backend
- `models/User.js` - Thêm `unlockedLessons`, `freeUnlocksRemaining`
- `lib/models/Lesson.js` - Thêm `isFreeLesson`
- `pages/api/lessons/[id]/unlock.js` - API mới
- `pages/api/admin/lessons/[id]/set-free.js` - API mới
- `pages/api/lessons.js` - Thêm lock status
- `pages/api/lessons/[id].js` - Chặn nội dung locked
- `pages/api/homepage-data.js` - Thêm lock status & userUnlockInfo

### Frontend
- `components/LessonCard.js` - Thêm UI locked
- `components/UnlockModal.js` - Component mới
- `styles/LessonCard.module.css` - Thêm styles locked
- `styles/UnlockModal.module.css` - Styles mới
- `pages/index.js` - Tích hợp UnlockModal
- `pages/category/[slug].js` - Tích hợp UnlockModal
- `pages/admin/dashboard/index.js` - Toggle FREE lesson

## Cấu trúc dữ liệu

### User (bổ sung)
```javascript
{
  unlockedLessons: ['lesson-id-1', 'lesson-id-2'],
  freeUnlocksRemaining: 2 // giảm dần khi dùng
}
```

### Lesson (bổ sung)
```javascript
{
  isFreeLesson: false // true = bài free cho tất cả
}
```

## API Response mẫu

### GET /api/lessons
```javascript
{
  lessons: [
    { id: '...', title: '...', isLocked: false, isFreeLesson: true },
    { id: '...', title: '...', isLocked: true, isFreeLesson: false },
  ],
  userUnlockInfo: {
    freeUnlocksRemaining: 1,
    unlockedCount: 3
  }
}
```

### POST /api/lessons/[id]/unlock
```javascript
// Request: no body needed

// Response success:
{ success: true, usedFreeUnlock: true, freeUnlocksRemaining: 1 }
// hoặc
{ success: true, usedFreeUnlock: false, pointsDeducted: 100, remainingPoints: 500 }

// Response error:
{ error: 'Không đủ points', required: 100, current: 50 }
```
