# Báo cáo Rà soát Translation - PapaGeil

**Ngày:** 2025-11-21  
**Trạng thái:** Đã rà soát toàn bộ dự án

---

## 📊 Tổng quan

### ✅ Đã dịch hoàn chỉnh (100%)
- ✅ Header component (language selector)
- ✅ Footer component
- ✅ HomePage (index.js) - bao gồm FAQ, filters, pagination
- ✅ Dashboard pages (dashboard/index.js, dashboard/vocabulary.js)
- ✅ Leaderboard page
- ✅ Static pages (404.js, offline.js, about.js, contact.js)
- ✅ Core learning components:
  - AudioControls
  - FooterControls
  - LessonCard
  - ProgressIndicator
  - StreakPopup
  - ModeSelectionPopup
- ✅ Popup components (DictionaryPopup, VocabularyPopup, WordSuggestionPopup)
- ✅ Settings page (dashboard/settings.js)

### 🔄 Cần dịch (Priority: HIGH)

#### 1. **Auth Components & Pages**
**File:** `components/AuthForm.js`
- [ ] Form labels: "Name", "E-Mail", "Passwort", "Passwort bestätigen"
- [ ] Placeholders: "Geben Sie Ihren Namen ein", "ihre.email@beispiel.de", etc.
- [ ] Button text: "Lädt...", "Anmelden", "Registrieren"
- [ ] Links: "Passwort vergessen?"
- [ ] Error message: "Passwords do not match"

**File:** `pages/auth/login.js`
- [ ] Page title: "Anmelden | PapaGeil - Deutsch Lernen"
- [ ] Subtitle: "Melden Sie sich an, um weiterzulernen"
- [ ] Divider text: "oder"
- [ ] Footer text: "Noch kein Konto? Jetzt registrieren"
- [ ] Loading text: "⏳ Lädt..."

**File:** `pages/auth/register.js`
- [ ] Page title: "Kostenlos Registrieren | PapaGeil - Deutsch Lernen"
- [ ] Subtitle: "Beginnen Sie Ihre Deutsch-Lernreise"
- [ ] Features list:
  - "Lernen Sie Deutsch durch Shadowing-Methode"
  - "Interaktive Lektionen"
  - "Vokabel-Tracking"
  - "Audio-Unterstützung"
- [ ] Header text: "Konto erstellen"
- [ ] Footer text: "Bereits ein Konto? Jetzt anmelden"

**Số lượng keys cần thêm:** ~25-30 keys

---

#### 2. **Vocabulary Save Component**
**File:** `components/VocabularySaveButton.js`
- [ ] Warning toast: "Vui lòng nhập nghĩa của từ"
- [ ] Success toast: "Đã lưu từ vựng!"
- [ ] Error toast: "Lỗi: ...", "Có lỗi xảy ra"
- [ ] Button title: "Lưu từ vựng"
- [ ] Popup title: "Lưu Từ Vựng"
- [ ] Labels: "Từ:", "Ngữ cảnh:", "Nghĩa (tiếng Việt): *"
- [ ] Placeholder: "Nhập nghĩa của từ..."
- [ ] Loading text: "⏳ Đang tải thông tin chi tiết từ điển..."
- [ ] Button text: "Đang lưu...", "Lưu", "Hủy", "Đang tải thông tin..."

**Số lượng keys cần thêm:** ~15 keys

---

### 🔄 Cần dịch (Priority: MEDIUM)

#### 3. **Lesson Pages - Toast Messages**
**File:** `pages/dictation/[lessonId].js`
- [ ] Toast: "Bitte melden Sie sich an, um Vokabeln zu speichern"
- [ ] Và nhiều toast messages khác trong lesson flow

**File:** `pages/shadowing/[lessonId].js`
- [ ] Toast: "Bitte melden Sie sich an, um Vokabeln zu speichern"
- [ ] Và nhiều toast messages khác

**File:** `pages/self-lesson/[lessonId].js`
- [ ] Toast: "Bitte melden Sie sich an, um Vokabeln zu speichern"

**Ghi chú:** Các file này rất lớng (1500-3700 dòng), cần rà soát kỹ để tìm tất cả hardcoded text.

**Số lượng keys cần thêm:** ~50-100 keys (ước tính)

---

### 🔄 Không ưu tiên dịch (Priority: LOW)

#### 4. **Admin Pages**
- `pages/admin/dashboard/index.js`
- `pages/admin/dashboard/lesson/[id].js`
- `pages/admin/dashboard/pages.js`
- `pages/admin/dashboard/files.js`
- `pages/admin/settings.js`
- `pages/dashboard.old.js`
- `pages/admin/dashboard.old.js`

**Lý do:** Các trang này chỉ dành cho admin nội bộ, không cần thiết phải dịch đa ngôn ngữ.

**Số lượng:** ~30-50 toast messages với text "Bitte...", "Erfolgreich...", etc.

---

## 📋 Kế hoạch dịch tiếp theo

### Phase 1: Auth System (HIGH Priority)
1. Tạo translation keys cho `auth` section
2. Dịch AuthForm component
3. Dịch auth/login.js và auth/register.js pages
4. Test flow đăng nhập/đăng ký với 3 ngôn ngữ

**Ước tính:** ~30 translation keys, ~30 phút

### Phase 2: Vocabulary Save (HIGH Priority)
1. Tạo translation keys cho `vocabularySave` section
2. Dịch VocabularySaveButton component
3. Test chức năng lưu vocabulary với 3 ngôn ngữ

**Ước tính:** ~15 translation keys, ~15 phút

### Phase 3: Lesson Pages (MEDIUM Priority)
1. Rà soát chi tiết 3 file lesson lớn
2. Tạo translation keys cho `lesson` section
3. Thay thế tất cả hardcoded toast messages
4. Test lesson flow với 3 ngôn ngữ

**Ước tính:** ~80-120 translation keys, ~2-3 giờ

---

## 📈 Thống kê

### Translation Coverage
- **Components:** 20/28 (71%) ✅
- **Pages (Core):** 12/15 (80%) ✅
- **Pages (Admin):** 0/7 (0%) - Không ưu tiên
- **Overall (excluding admin):** 32/43 (74%) ✅

### Translation Keys
- **Hiện có:** ~220 keys
- **Cần thêm (High Priority):** ~45 keys
- **Cần thêm (Medium Priority):** ~80-120 keys
- **Tổng sau khi hoàn thành:** ~350-380 keys

---

## 🎯 Khuyến nghị

### Làm ngay (High Priority)
1. ✅ **Auth System** - Người dùng mới thấy đầu tiên
2. ✅ **Vocabulary Save** - Tính năng core được dùng nhiều

### Có thể làm sau (Medium Priority)
3. 🔄 **Lesson Pages Toast Messages** - Ít ảnh hưởng UX vì chỉ là toast

### Không cần làm (Low Priority)
4. ❌ **Admin Pages** - Nội bộ, không cần đa ngôn ngữ

---

## 📝 Ghi chú

- Tất cả translation keys đều cần có 3 phiên bản: `de`, `en`, `vi`
- Giữ nguyên emoji và icons trong các message
- Test kỹ với cả 3 ngôn ngữ sau mỗi phase
- Build project để đảm bảo không có lỗi syntax

---

**Người rà soát:** Droid  
**Công cụ:** Grep, Glob, Manual review  
**Files đã kiểm tra:** 70+ files (pages, components, lib)
