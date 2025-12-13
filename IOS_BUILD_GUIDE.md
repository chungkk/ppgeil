# 📱 Hướng Dẫn Build iOS App với Capacitor

## ✅ Đã Setup Xong

Dự án đã được cấu hình để chạy như iOS app native!

## 🎯 Cách Build & Chạy

### Bước 1: Mở Xcode
```bash
npm run cap:open:ios
# hoặc
npx cap open ios
```

### Bước 2: Trong Xcode
1. **Chọn Team/Signing**:
   - Mở `ios/App/App.xcworkspace` (nếu chưa mở)
   - Click vào project "App" ở sidebar trái
   - Tab "Signing & Capabilities"
   - Chọn Team (Apple Developer Account của bạn)
   
2. **Chọn Device**:
   - Toolbar trên: Chọn iPhone device hoặc Simulator
   - Ví dụ: "iPhone 15 Pro" hoặc thiết bị thật qua USB

3. **Build & Run**:
   - Nhấn nút Play (▶️) hoặc `Cmd + R`
   - App sẽ build và chạy trên device/simulator

## 🌐 Cách Hoạt Động

App này sử dụng **Hybrid Mode**:
- iOS app load nội dung từ `https://papageil.net`
- Giữ nguyên backend API và authentication
- Có thể thêm native iOS features sau (camera, notifications...)

## 📝 Yêu Cầu

- ✅ macOS với Xcode đã cài đặt
- ✅ Apple Developer Account (miễn phí cho testing)
- ✅ iOS device hoặc Simulator

## 🔧 Commands Hữu Ích

```bash
# Sync changes với iOS project
npm run cap:sync

# Mở Xcode
npm run cap:open:ios

# Run trực tiếp trên device
npm run cap:run:ios

# Nếu thay đổi code web, chỉ cần:
# 1. Đóng app trên iOS
# 2. Rerun từ Xcode (không cần cap:sync vì dùng remote URL)
```

## 🎨 Tùy Chỉnh

### Đổi App Name/Icon
- **App Name**: Sửa trong `ios/App/App/Info.plist` → `CFBundleDisplayName`
- **App Icon**: Thêm icon vào `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

### Đổi Bundle ID
- Sửa `appId` trong `capacitor.config.ts`
- Chạy `npm run cap:sync`
- Update Bundle ID trong Xcode Signing settings

## 🚀 Deploy lên App Store

1. **Tạo Archive**:
   - Xcode: Product → Archive
   
2. **Upload lên App Store Connect**:
   - Window → Organizer
   - Chọn archive → Distribute App

3. **Submit for Review** trên App Store Connect

## ⚠️ Lưu Ý

- App cần internet để hoạt động (load từ papageil.net)
- Để offline hoàn toàn: cần switch sang static export + PWA
- Push notifications: cần add `@capacitor/push-notifications`
- Camera/Mic: cần add permissions trong `Info.plist`

## 🆘 Troubleshooting

**Lỗi Signing**: 
- Cần Apple Developer Account (miễn phí)
- Xcode → Preferences → Accounts → Add Apple ID

**Lỗi Build**:
```bash
cd ios
pod install
cd ..
npm run cap:sync
```

**App bị trắng**:
- Kiểm tra papageil.net có online không
- Check console logs trong Xcode

## 📚 Tài Liệu

- [Capacitor iOS Docs](https://capacitorjs.com/docs/ios)
- [Apple Developer](https://developer.apple.com)
