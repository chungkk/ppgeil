# Feature Specification: Answer Streak System

**Feature Branch**: `002-answer-streak` (không tạo branch git)  
**Created**: 2024-12-02  
**Status**: Draft  
**Input**: Thêm streak cho trang, thân thiện, dễ sử dụng, cho user login, điểm danh hằng ngày, streak hiển thị ở header, setup vào database cùng bảng xếp hạng. Streak giành cho làm đúng được cộng điểm liên tiếp.

## Tổng quan

Hệ thống Answer Streak thưởng điểm bonus cho người dùng khi trả lời đúng nhiều câu liên tiếp. Khác với Daily Streak (streak hoạt động hàng ngày đã có), Answer Streak tập trung vào việc khuyến khích người dùng tập trung và chính xác trong quá trình học. Streak được hiển thị trực quan ở header và tích hợp với bảng xếp hạng.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Xây dựng Answer Streak (Priority: P1)

Người dùng muốn được thưởng điểm bonus khi trả lời đúng nhiều câu liên tiếp để có động lực duy trì độ chính xác cao.

**Why this priority**: Đây là tính năng cốt lõi - tạo động lực cho người dùng tập trung và chính xác.

**Independent Test**: Trả lời đúng 5 câu liên tiếp và xác nhận điểm bonus được cộng với hiệu ứng animation.

**Acceptance Scenarios**:

1. **Given** người dùng đã đăng nhập và đang làm bài, **When** họ trả lời đúng câu đầu tiên, **Then** answer streak tăng lên 1 và hiển thị tại header với animation.
2. **Given** người dùng có answer streak = 4, **When** họ trả lời đúng câu tiếp theo, **Then** answer streak tăng lên 5 và nhận điểm bonus (x1.5 điểm).
3. **Given** người dùng có answer streak đang chạy, **When** họ trả lời sai, **Then** answer streak reset về 0 với thông báo khuyến khích.
4. **Given** người dùng có answer streak = 10, **When** họ trả lời đúng, **Then** nhận điểm bonus cao hơn (x2.0 điểm) với celebration animation.

---

### User Story 2 - Hiển thị Answer Streak ở Header (Priority: P1)

Người dùng muốn luôn thấy answer streak hiện tại ở header để theo dõi tiến độ và có động lực.

**Why this priority**: Visibility là yếu tố quan trọng để gamification hoạt động hiệu quả.

**Independent Test**: Kiểm tra header hiển thị đúng answer streak với animation khi thay đổi.

**Acceptance Scenarios**:

1. **Given** người dùng đã đăng nhập, **When** họ có answer streak > 0, **Then** header hiển thị icon 🔥 kèm số streak với màu sắc theo cấp độ (1-4: normal, 5-9: gold, 10+: fire animation).
2. **Given** người dùng có answer streak = 0, **When** họ xem header, **Then** streak badge ẩn đi hoặc hiển thị "0" với opacity thấp.
3. **Given** người dùng vừa đạt milestone (5, 10, 15, 20 streak), **When** streak được cập nhật, **Then** hiển thị celebration popup nhỏ tại header.
4. **Given** người dùng trả lời sai và mất streak, **When** streak reset, **Then** hiển thị animation streak bị phá vỡ (crack/shake effect).

---

### User Story 3 - Answer Streak trong Leaderboard (Priority: P2)

Người dùng muốn xem bảng xếp hạng theo answer streak cao nhất để so sánh với cộng đồng.

**Why this priority**: Tích hợp với leaderboard tạo yếu tố cạnh tranh và social proof.

**Independent Test**: Chuyển sang tab "Best Streak" trên leaderboard và xác nhận hiển thị đúng.

**Acceptance Scenarios**:

1. **Given** người dùng đang ở trang leaderboard, **When** họ chọn tab "Best Streak", **Then** danh sách được sắp xếp theo max answer streak cao nhất.
2. **Given** người dùng xem leaderboard, **When** họ xem một user khác, **Then** có thể thấy current answer streak và max answer streak của user đó.
3. **Given** người dùng đạt answer streak mới cao nhất (personal best), **When** kết thúc session, **Then** max answer streak được cập nhật vào database và leaderboard.

---

### User Story 4 - Bonus Points Multiplier (Priority: P1)

Người dùng muốn nhận điểm bonus theo cấp độ answer streak để có động lực duy trì chuỗi dài.

**Why this priority**: Reward system là trọng tâm của tính năng.

**Independent Test**: Đạt các mức streak khác nhau và xác nhận điểm bonus chính xác.

**Acceptance Scenarios**:

1. **Given** người dùng có answer streak 1-4, **When** họ trả lời đúng, **Then** nhận điểm cơ bản (x1.0).
2. **Given** người dùng có answer streak 5-9, **When** họ trả lời đúng, **Then** nhận điểm bonus x1.5 với notification "Streak Bonus!".
3. **Given** người dùng có answer streak 10-14, **When** họ trả lời đúng, **Then** nhận điểm bonus x2.0 với notification "Fire Streak!".
4. **Given** người dùng có answer streak 15+, **When** họ trả lời đúng, **Then** nhận điểm bonus x2.5 với celebration animation.

---

### User Story 5 - Lưu trữ và đồng bộ Answer Streak (Priority: P1)

Người dùng muốn answer streak được lưu lại đúng cách và có thể xem lịch sử.

**Why this priority**: Data integrity là cần thiết cho hệ thống hoạt động đúng.

**Independent Test**: Đóng trình duyệt, mở lại và xác nhận current answer streak được khôi phục đúng.

**Acceptance Scenarios**:

1. **Given** người dùng đã đăng nhập và có answer streak, **When** họ refresh trang, **Then** answer streak được khôi phục từ database.
2. **Given** người dùng không hoạt động quá 30 phút, **When** họ quay lại làm bài, **Then** answer streak reset về 0 (session timeout).
3. **Given** người dùng hoàn thành một session học, **When** session kết thúc, **Then** max answer streak được cập nhật nếu current > max.

---

### Edge Cases

- Người dùng mất kết nối mạng giữa chừng: Lưu streak local và sync khi online lại.
- Người dùng mở nhiều tab: Streak được sync qua localStorage events.
- Trả lời đúng nhưng server timeout: Retry logic và không mất streak.
- Session hết hạn khi đang có streak: Graceful reset với notification.
- Người dùng chưa đăng nhập: Không theo dõi streak (yêu cầu login để sử dụng tính năng).

## Requirements *(mandatory)*

### Functional Requirements

**Answer Streak Tracking**:
- **FR-001**: System MUST track consecutive correct answers for each logged-in user
- **FR-002**: System MUST reset answer streak to 0 when user answers incorrectly
- **FR-003**: System MUST reset answer streak after 30 minutes of inactivity (session timeout)
- **FR-004**: System MUST store both current answer streak and max answer streak in database

**Header Display**:
- **FR-005**: System MUST display current answer streak in header for logged-in users
- **FR-006**: System MUST show streak with visual indicators (icon 🔥, color coding by level)
- **FR-007**: System MUST animate streak changes (increment animation, celebration on milestones)
- **FR-008**: System MUST show streak break animation when reset to 0

**Bonus Points**:
- **FR-009**: System MUST apply bonus multiplier based on streak level:
  - Streak 1-4: x1.0 (no bonus)
  - Streak 5-9: x1.5
  - Streak 10-14: x2.0
  - Streak 15+: x2.5
- **FR-010**: System MUST display bonus notification when multiplier is applied
- **FR-011**: System MUST show celebration animation at milestone streaks (5, 10, 15, 20)

**Leaderboard Integration**:
- **FR-012**: System MUST add "Best Streak" tab to leaderboard showing max answer streak rankings
- **FR-013**: System MUST display both current and max answer streak in user profiles on leaderboard
- **FR-014**: System MUST update max answer streak in real-time when user achieves new personal best

**Data Persistence**:
- **FR-015**: System MUST persist answer streak data to database on each update
- **FR-016**: System MUST sync streak across multiple tabs using localStorage events
- **FR-017**: System MUST restore streak from database on page load/refresh

### Key Entities

- **AnswerStreak**: Chuỗi câu trả lời đúng - currentAnswerStreak, maxAnswerStreak, lastAnswerTime, streakStartTime
- **StreakBonus**: Hệ số điểm thưởng theo cấp độ streak - multiplier, minStreak, notification
- **StreakMilestone**: Các mốc streak quan trọng - 5, 10, 15, 20 với celebration effects
- **StreakHistory**: Lịch sử các chuỗi streak đã đạt được - để thống kê và leaderboard

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% người dùng đăng nhập thấy answer streak trong header khi có streak > 0
- **SC-002**: Answer streak được cập nhật trong vòng 500ms sau mỗi câu trả lời
- **SC-003**: Điểm bonus được tính chính xác theo bảng multiplier 100% thời gian
- **SC-004**: Streak animation hoàn thành trong vòng 1 giây
- **SC-005**: Max answer streak được cập nhật vào leaderboard trong vòng 2 giây
- **SC-006**: Người dùng có thể thấy answer streak của người khác trên leaderboard
- **SC-007**: Streak được khôi phục chính xác sau page refresh 100% thời gian
- **SC-008**: Session timeout (30 phút) reset streak đúng 100% thời gian

## Clarifications

### Session 2024-12-02

- Q: Answer Streak khác với Daily Streak hiện tại như thế nào?
  → A: Daily Streak (đã có) đếm số ngày hoạt động liên tiếp. Answer Streak (mới) đếm số câu trả lời đúng liên tiếp trong một session.
- Q: Session timeout là bao lâu?
  → A: 30 phút không hoạt động sẽ reset answer streak.
- Q: Bonus multiplier có áp dụng cho tất cả loại câu hỏi không?
  → A: Có, áp dụng cho tất cả câu trả lời đúng trong các bài học (dictation, shadowing, self-lesson).

## Assumptions

- Người dùng đã có hệ thống login và authentication hoạt động
- Database đã có User model có thể mở rộng thêm fields
- Header component đã hiển thị điểm (💎) và có thể thêm streak badge
- Leaderboard đã hoạt động với nhiều tab ranking criteria
- Hệ thống cộng điểm hiện tại có thể hook vào để áp dụng multiplier
- Timezone không ảnh hưởng đến answer streak (chỉ dựa vào session timeout)

## Out of Scope

- Streak protection (shield để bảo vệ streak khi sai) - phase sau
- Team/Group streak challenges - phase sau  
- Streak achievements/badges - phase sau
- Streak statistics và analytics chi tiết - phase sau
- Streak reminders/notifications push - phase sau
