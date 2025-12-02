# Tối ưu giao diện Mobile - Trang Shadowing Transcript Column

## Tổng quan

Cải thiện UI/UX cho cột transcript trên trang shadowing ở thiết bị mobile, tập trung vào:
- Tăng độ dễ đọc (readability)
- Cải thiện trải nghiệm chạm (touch experience)
- Tối ưu bố cục hiển thị

## Các vấn đề hiện tại

### 1. Typography
- Font size nhỏ (10-13px), khó đọc trên mobile
- Line height chưa tối ưu cho đọc văn bản dài
- Transcript translation quá nhỏ (10px)

### 2. Spacing & Touch Targets
- Padding transcript item chặt (8px)
- Các nút bookmark/play button có thể khó chạm chính xác
- Gap giữa các elements chưa tối ưu

### 3. Visual Hierarchy
- Khó phân biệt câu đang active với câu khác
- Score badge và bookmark button cạnh tranh visual attention
- Play button và text chưa có khoảng cách tốt

### 4. Controls Bar
- Nhiều nút trong không gian nhỏ
- Font size quá nhỏ (10px)

## Yêu cầu tối ưu

### R1: Tăng Typography
- Transcript text: 14px → 15px
- Translation: 10px → 12px  
- IPA: 10px → 11px
- Line height tối thiểu 1.6

### R2: Cải thiện Spacing
- Transcript item padding: 8px → 12px 10px
- Gap giữa items: 5px → 8px
- Gap giữa play button và text: 6px → 10px

### R3: Tối ưu Touch Targets (Apple HIG 44x44pt)
- Play button: 22px → 28px
- Bookmark button đảm bảo touch area 44px
- Score badge clickable area mở rộng

### R4: Visual Hierarchy
- Active item: border-left 3px → 4px, background đậm hơn
- Cải thiện contrast cho translation text
- Score badge vị trí rõ ràng hơn

### R5: Mobile Controls Bar
- Button padding tăng cho dễ chạm
- Font size: 10px → 11px
- Sentence counter rõ ràng hơn

## Phạm vi

### Trong phạm vi
- File: `components/shadowing/ShadowingMobile.js`
- File: `styles/shadowingPage.module.css` (phần media query mobile)

### Ngoài phạm vi
- ShadowingDesktop.js
- Logic/functionality changes
- Color scheme changes

## Acceptance Criteria

1. Transcript text dễ đọc hơn trên màn hình 375px width
2. Tất cả touch targets >= 44pt (iOS) / 48dp (Android)
3. Active sentence rõ ràng, dễ nhận biết
4. Translation text có contrast ratio >= 4.5:1
5. Không ảnh hưởng đến layout desktop
