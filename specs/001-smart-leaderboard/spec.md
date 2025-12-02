# Feature Specification: Smart Leaderboard Design

**Feature Branch**: `001-smart-leaderboard`  
**Created**: 2024-12-02  
**Status**: Draft  
**Input**: User description: "thiết kế trang leaderboard thông minh, khoa học hơn"

## Tổng quan

Thiết kế lại trang Leaderboard để trở nên thông minh, khoa học và có ý nghĩa hơn cho người dùng. Thay vì chỉ hiển thị bảng xếp hạng đơn thuần theo điểm số, hệ thống sẽ cung cấp nhiều góc nhìn phân tích, các chỉ số học tập có ý nghĩa, và tạo động lực học tập thông qua gamification.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Xem bảng xếp hạng đa tiêu chí (Priority: P1)

Người dùng muốn xem bảng xếp hạng theo nhiều tiêu chí khác nhau (không chỉ tổng điểm) để hiểu rõ thế mạnh của mình so với cộng đồng.

**Why this priority**: Đây là tính năng cốt lõi của leaderboard thông minh - cho phép đánh giá đa chiều thay vì một chiều.

**Independent Test**: Có thể test bằng cách chuyển đổi giữa các tab ranking khác nhau và xác nhận thứ hạng thay đổi theo tiêu chí.

**Acceptance Scenarios**:

1. **Given** người dùng đang ở trang leaderboard, **When** họ chọn tab "Streak Champions", **Then** danh sách được sắp xếp theo streak dài nhất, hiển thị streak hiện tại và max streak của mỗi người.
2. **Given** người dùng đang ở trang leaderboard, **When** họ chọn tab "Time Invested", **Then** danh sách được sắp xếp theo tổng thời gian học, hiển thị số giờ học của mỗi người.
3. **Given** người dùng đang ở trang leaderboard, **When** họ chọn tab "Most Improved", **Then** danh sách được sắp xếp theo số điểm kiếm được trong tuần hiện tại.

---

### User Story 2 - Xem vị trí cá nhân và phân tích (Priority: P1)

Người dùng muốn thấy vị trí của mình trong bảng xếp hạng kèm theo phân tích chi tiết về performance.

**Why this priority**: Việc hiểu vị trí của bản thân là động lực chính để người dùng quay lại sử dụng.

**Independent Test**: Đăng nhập với tài khoản có dữ liệu học tập và xác nhận card cá nhân hiển thị đầy đủ thông tin.

**Acceptance Scenarios**:

1. **Given** người dùng đã đăng nhập và có dữ liệu học tập, **When** họ mở trang leaderboard, **Then** card cá nhân hiển thị: rank hiện tại, tổng điểm, streak, thời gian học tuần này, và số bài đã hoàn thành.
2. **Given** người dùng đã đăng nhập, **When** họ xem card cá nhân, **Then** hiển thị chênh lệch điểm với người trên/dưới một bậc để biết cần bao nhiêu điểm để lên hạng.
3. **Given** người dùng có thứ hạng nằm ngoài top 100, **When** họ xem leaderboard, **Then** vẫn có thể thấy vị trí của mình với những người xung quanh (5 người trên, 5 người dưới).

---

### User Story 3 - Xem biểu đồ tiến bộ theo thời gian (Priority: P2)

Người dùng muốn xem biểu đồ thể hiện sự tiến bộ của mình qua thời gian.

**Why this priority**: Visualization giúp người dùng có cái nhìn tổng quan và động lực dài hạn.

**Independent Test**: Xem biểu đồ rank theo tuần/tháng và xác nhận dữ liệu chính xác.

**Acceptance Scenarios**:

1. **Given** người dùng có ít nhất 7 ngày dữ liệu, **When** họ xem phần "Your Progress", **Then** hiển thị biểu đồ rank thay đổi trong 7 ngày gần nhất.
2. **Given** người dùng xem biểu đồ, **When** biểu đồ cho thấy rank tăng lên, **Then** hiển thị indicator màu xanh với số bậc đã tăng.
3. **Given** người dùng mới (< 7 ngày dữ liệu), **When** họ xem phần progress, **Then** hiển thị thông báo khuyến khích tiếp tục học để xem tiến bộ.

---

### User Story 4 - Xem badges và achievements (Priority: P2)

Người dùng muốn được công nhận thành tích qua hệ thống badges.

**Why this priority**: Gamification tăng engagement và retention.

**Independent Test**: Người dùng đạt điều kiện và nhận badge tương ứng.

**Acceptance Scenarios**:

1. **Given** người dùng đứng top 10 trong tháng, **When** tháng kết thúc, **Then** họ nhận badge "Top Monthly" cho tháng đó.
2. **Given** người dùng đứng top 10 All-time, **When** họ xem leaderboard, **Then** badge "Top All-time" được hiển thị bên cạnh tên.
3. **Given** người dùng xem leaderboard, **When** hover vào badge của bất kỳ ai, **Then** hiển thị tooltip giải thích badge đó.

---

### User Story 5 - Lọc leaderboard theo thời gian (Priority: P2)

Người dùng muốn xem bảng xếp hạng theo nhiều khoảng thời gian khác nhau.

**Why this priority**: Cung cấp các góc nhìn khác nhau, người mới có cơ hội cạnh tranh trong bảng xếp hạng ngắn hạn.

**Independent Test**: Chuyển đổi giữa các tab thời gian và xác nhận dữ liệu thay đổi.

**Acceptance Scenarios**:

1. **Given** người dùng đang xem leaderboard, **When** chọn "This Week", **Then** hiển thị bảng xếp hạng chỉ tính từ thứ Hai tuần hiện tại.
2. **Given** người dùng đang xem leaderboard, **When** chọn "This Month", **Then** hiển thị bảng xếp hạng tính từ ngày 1 tháng hiện tại.
3. **Given** người dùng đang xem leaderboard, **When** chọn "All Time", **Then** hiển thị bảng xếp hạng tính từ khi user đăng ký.

---

### User Story 6 - Xem leagues/divisions (Priority: P3)

Người dùng muốn được phân vào các league/division để cạnh tranh với người có trình độ tương đương.

**Why this priority**: Tạo cạnh tranh công bằng hơn, tránh việc người mới bị nản khi thấy người top quá xa.

**Independent Test**: Xác nhận người dùng được phân vào league phù hợp với điểm số.

**Acceptance Scenarios**:

1. **Given** người dùng có tổng điểm < 1000, **When** họ xem leaderboard, **Then** họ được đặt trong "Bronze League" và chỉ thấy những người cùng league mặc định.
2. **Given** người dùng ở cuối league Silver trở lên (vd: rank 46-50), **When** tuần mới bắt đầu, **Then** họ được xuống league thấp hơn. (Bronze không demote)
3. **Given** người dùng ở đầu league (vd: rank 1-5 trong Bronze), **When** tuần mới bắt đầu, **Then** họ được thăng lên league cao hơn.

---

### Edge Cases

- Người dùng mới chưa có dữ liệu học tập: Hiển thị thông báo khuyến khích bắt đầu học và placeholder UI.
- Hai người dùng có cùng điểm số: Sắp xếp theo thời gian đạt được điểm đó (ai đạt trước xếp trên).
- Người dùng không đăng nhập: Chỉ xem được top 20 leaderboard, không thấy vị trí cá nhân.
- Server trả về lỗi khi load leaderboard: Hiển thị skeleton loading, sau đó error message với nút retry.
- Leaderboard trống (chưa có ai học): Hiển thị empty state khuyến khích người dùng trở thành người đầu tiên.

## Requirements *(mandatory)*

### Functional Requirements

**Ranking System**:
- **FR-001**: System MUST support multiple ranking criteria: Total Points, Streak Days, Time Invested, Lessons Completed, Most Improved
- **FR-002**: System MUST allow switching between ranking criteria without page reload
- **FR-003**: System MUST handle tie-breaking by timestamp (earlier achievement wins)

**Time Filters**:
- **FR-004**: System MUST support time filters: This Week, This Month, All Time
- **FR-005**: System MUST reset weekly leaderboard every Monday 00:00 UTC+7
- **FR-006**: System MUST reset monthly leaderboard every 1st of month 00:00 UTC+7

**Personal Stats**:
- **FR-007**: System MUST display current user's rank prominently at top of page
- **FR-008**: System MUST show points difference to next higher rank
- **FR-009**: System MUST show surrounding users (5 above, 5 below) when user is outside top 100
- **FR-010**: System MUST display weekly/monthly progress chart for logged-in users

**Badges System**:
- **FR-011**: System MUST award 2 badge types: "Top Monthly" (top 10 tháng) và "Top All-time" (top 10 tổng)
- **FR-012**: System MUST display earned badges next to user name
- **FR-013**: System MUST provide tooltip explaining each badge on hover

**League System**:
- **FR-014**: System MUST divide users into leagues: Bronze (0-999), Silver (1000-4999), Gold (5000-14999), Platinum (15000-49999), Diamond (50000+)
- **FR-015**: System MUST promote top 5 users in each league weekly
- **FR-016**: System MUST demote bottom 5 users in each league weekly (trừ Bronze - league thấp nhất giữ nguyên)
- **FR-017**: System MUST allow filtering by specific league

**Access Control**:
- **FR-018**: System MUST show full leaderboard for logged-in users
- **FR-019**: System MUST show only top 20 for non-logged-in users
- **FR-020**: System MUST prompt login for non-logged-in users wanting to see more

### Key Entities

- **LeaderboardEntry**: Đại diện cho một dòng trong bảng xếp hạng - bao gồm user info, rank, points, streak, time spent, badges
- **Badge**: Thành tích người dùng đạt được - tên, điều kiện, icon, mô tả
- **League**: Phân hạng người dùng - tên league, điểm tối thiểu, điểm tối đa, màu sắc
- **RankHistory**: Lịch sử thay đổi rank của người dùng - lưu 30 ngày gần nhất để vẽ biểu đồ tiến bộ
- **WeeklyLeaderboard**: Bảng xếp hạng tuần - reset mỗi thứ Hai
- **MonthlyLeaderboard**: Bảng xếp hạng tháng - reset mỗi ngày 1 (đã có)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Người dùng có thể chuyển đổi giữa các tiêu chí ranking trong vòng 1 giây
- **SC-002**: Trang leaderboard load hoàn toàn trong vòng 2 giây trên kết nối 3G
- **SC-003**: 100% người dùng đăng nhập có thể thấy vị trí cá nhân và khoảng cách đến rank tiếp theo
- **SC-004**: Biểu đồ tiến bộ hiển thị chính xác cho người dùng có >= 7 ngày dữ liệu
- **SC-005**: Hệ thống badges tự động cấp badge trong vòng 1 phút sau khi đủ điều kiện
- **SC-006**: Người dùng mới có thể hiểu cách hoạt động của leaderboard trong lần truy cập đầu tiên (qua UI/UX rõ ràng)
- **SC-007**: Leaderboard hoạt động mượt mà với 10,000 users đồng thời

## Clarifications

### Session 2024-12-02

- Q: Phạm vi badges cho MVP là gì? → A: Chỉ 2 loại badges: Top Monthly và Top All-time
- Q: Cách tính "Most Improved"? → A: Điểm tuyệt đối kiếm được trong tuần (points gained)
- Q: Xử lý bottom 5 Bronze League? → A: Giữ nguyên vị trí, không demote (Bronze là league thấp nhất)
- Q: Quyền riêng tư trên leaderboard? → A: Tất cả public, không có option ẩn
- Q: Lưu trữ RankHistory bao lâu? → A: 30 ngày gần nhất

## Assumptions

- Người dùng hiện tại đã có dữ liệu học tập trong database (totalPoints, streak, timeSpent, etc.)
- Frontend đã có cơ sở hạ tầng để render charts (có thể sử dụng thư viện chart đã có hoặc thêm mới)
- Timezone mặc định cho reset là UTC+7 (Vietnam timezone)
- League promotion/demotion diễn ra tự động vào 00:00 thứ Hai hàng tuần
- Badge icons sẽ sử dụng emoji hoặc SVG icons đơn giản, không cần thiết kế phức tạp
- Tất cả users đều hiển thị public trên leaderboard (không có privacy opt-out)

## Out of Scope

- Social features (add friend, compare with friends) - có thể làm ở phase sau
- Notifications khi thay đổi rank - có thể làm ở phase sau
- Leaderboard theo từng bài học cụ thể - quá chi tiết
- Rewards/prizes cho top users - cần business decision riêng
