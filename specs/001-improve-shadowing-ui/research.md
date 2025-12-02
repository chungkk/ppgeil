# Research: Mobile UI Best Practices cho Transcript Column

## 1. Typography Standards

### Decision: Font Sizes
- **Transcript text**: 15px (body text minimum cho mobile readability)
- **Translation**: 12px (secondary text, phải đủ đọc được)
- **IPA**: 11px (monospace, technical notation)

### Rationale
- Apple HIG recommends minimum 11pt for legible text
- Material Design recommends 14sp minimum for body text
- Line height 1.5-1.7 cho multi-line reading

### Alternatives Considered
- 14px text: Quá nhỏ cho long-form reading
- 16px text: Có thể làm UI chật, ít câu hiển thị

## 2. Touch Target Sizes

### Decision: Minimum 44x44pt
- Play button: 28px visual, 44px touch area
- Bookmark button: 20px visual, 44px touch area (padding extended)
- Score badge: 30x16px visual, 44x44px touch area

### Rationale
- Apple HIG: 44x44pt minimum
- Android Material: 48x48dp recommended
- Smaller targets lead to tap errors

### Alternatives Considered
- 36px targets: Không đủ cho finger taps
- 48px targets: Quá lớn, chiếm nhiều space

## 3. Spacing & Padding

### Decision
- Item padding: 12px vertical, 10px horizontal
- Gap between items: 8px
- Gap play button to text: 10px

### Rationale
- Adequate breathing room improves scan-ability
- Clear separation between interactive elements
- Follows 4px/8px grid system

## 4. Visual Hierarchy

### Decision
- Active item: 4px border-left, stronger background (0.15 opacity)
- Translation: Distinct color (#a5b4c8), arrow indicator
- Score: Right-aligned, colored badges

### Rationale
- Users need instant recognition of current position
- Secondary content should be visually subordinate
- Interactive elements need clear affordances

## 5. Controls Bar

### Decision
- Button font: 11px (up from 10px)
- Padding: 5px 12px (up from 4px 10px)
- Min-height: 32px

### Rationale
- Larger buttons easier to tap accurately
- Clear labeling improves usability
- Consistent with iOS/Android control sizes
