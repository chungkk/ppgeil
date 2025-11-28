# Multilingual Routing Guide

## Hướng dẫn sử dụng URL đa ngôn ngữ

Ứng dụng hiện đã hỗ trợ định tuyến đa ngôn ngữ thông qua URL prefix.

### Các ngôn ngữ được hỗ trợ

- 🇩🇪 **Tiếng Đức (de)** - Ngôn ngữ mặc định
- 🇬🇧 **Tiếng Anh (en)**
- 🇻🇳 **Tiếng Việt (vi)**

### Cách sử dụng

#### 1. Truy cập với locale trong URL

Thêm prefix ngôn ngữ vào đầu URL:

```
# Tiếng Đức (mặc định)
http://localhost:3000/de/dictation/wo-ist-meine-mama-tirili-kinderlieder
http://localhost:3000/dictation/wo-ist-meine-mama-tirili-kinderlieder (tự động dùng 'de')

# Tiếng Anh
http://localhost:3000/en/dictation/wo-ist-meine-mama-tirili-kinderlieder

# Tiếng Việt
http://localhost:3000/vi/dictation/wo-ist-meine-mama-tirili-kinderlieder
```

#### 2. Chuyển đổi ngôn ngữ qua giao diện

- Nhấn vào nút chọn ngôn ngữ ở góc phải Header (hiển thị cờ và tên ngôn ngữ hiện tại)
- Chọn ngôn ngữ mong muốn từ dropdown menu
- URL sẽ tự động cập nhật và trang sẽ reload với ngôn ngữ mới

### Cơ chế hoạt động

1. **URL → Ngôn ngữ giao diện**: Khi truy cập URL có locale (ví dụ `/de/...`), ứng dụng tự động hiển thị giao diện bằng ngôn ngữ tương ứng.

2. **Đồng bộ tự động**: `LanguageContext` tự động đồng bộ với `router.locale` từ Next.js, không còn lưu vào `localStorage`.

3. **Chuyển đổi ngôn ngữ**: Khi user chọn ngôn ngữ mới, ứng dụng sẽ:
   - Cập nhật URL với locale mới
   - Thay đổi giao diện sang ngôn ngữ đã chọn
   - Giữ nguyên path hiện tại

### Configuration

Cấu hình i18n trong `next.config.js`:

```javascript
i18n: {
  locales: ['de', 'en', 'vi'],
  defaultLocale: 'de',
  localeDetection: false,
}
```

### Files liên quan

- **Context**: `context/LanguageContext.js` - Quản lý state ngôn ngữ và đồng bộ với router
- **Translations**: `public/locales/{locale}/common.json` - File dịch cho từng ngôn ngữ
- **Config**: `next.config.js` - Cấu hình i18n của Next.js
- **UI**: `components/Header.js` - Language selector dropdown

### Lưu ý

- Ngôn ngữ **không còn được lưu trong localStorage**, thay vào đó được xác định bởi URL
- URL locale có độ ưu tiên cao nhất
- Khi không có locale trong URL, mặc định sẽ dùng `de` (tiếng Đức)
- Tất cả các route đều hỗ trợ locale prefix: `/de/...`, `/en/...`, `/vi/...`
