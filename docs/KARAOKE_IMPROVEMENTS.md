# Cải Tiến Hệ Thống Karaoke & Word Timing

## Tổng Hợp Các Thay Đổi (2026-01-08)

### 1. whisper-youtube-srt-v3.js

#### A. Buffer Timing Mới:
```javascript
const START_BUFFER = 0.10;      // 100ms (trước: 80ms)
const END_BUFFER = 0.50;        // 500ms (trước: 350ms)
const FIRST_WORD_BUFFER = 0.15; // 150ms cho từ đầu câu (MỚI)
const GAP_THRESHOLD = 0.3;      // 300ms ngưỡng gap (MỚI)
```

#### B. Cải Tiến Chia Câu (MỚI):
```javascript
const MIN_WORDS = 5;          // Tối thiểu 5 từ (tránh câu quá ngắn)
const IDEAL_MIN_WORDS = 6;    // Lý tưởng tối thiểu 6 từ
const IDEAL_MAX_WORDS = 10;   // Lý tưởng tối đa 10 từ  
const MAX_WORDS = 14;         // Tối đa tuyệt đối 14 từ (trước: 12)
const MAX_CHAR_LENGTH = 180;  // Tối đa 180 ký tự (trước: 150)
```

**Logic chia câu mới (4 bước):**

1. **createRawSegments()**: Tạo raw segments từ GPT markers
2. **mergeShortSegments()**: Merge câu ngắn (<5 từ) với câu tiếp theo
3. **splitLongSegments()**: Split câu dài (>14 từ) tại điểm tự nhiên
4. **finalizeSegments()**: Build text và áp dụng buffer

**Điểm split tự nhiên (theo priority):**
- Priority 1: Sau dấu phẩy (,)
- Priority 2: Trước conjunction (aber, oder, und, weil, dass...)
- Priority 3: Sau verb ở vị trí V2 (tiếng Đức)

#### C. Chức năng mới khác:
- **fillWordGaps()**: Lấp đầy khoảng trống giữa các từ trong cùng segment
- **normalizeWord()**: Chuẩn hóa từ cho comparison (bao gồm ß → ss, ä → ae, etc.)
- **matchWords()**: So sánh từ với nhiều chiến lược (exact, contains, Levenshtein, prefix/suffix)
- **findSyncPoint()**: Tìm điểm đồng bộ khi mapping bị lệch
- **Adaptive buffer**: Từ đầu tiên và cuối cùng trong segment có buffer khác nhau

#### D. Cải tiến mapSegmentsToWords():
- Tăng search window động dựa trên số lần miss liên tiếp
- Thêm confidence score cho mỗi word timing
- Tự động tìm điểm đồng bộ khi miss 5+ từ liên tiếp
- Adaptive Levenshtein threshold dựa trên độ dài từ

### 2. useKaraokeHighlight.js

#### Cải tiến calculateWordTimings():
- Validation timing trong segment bounds
- Interpolation cho từ không có timing
- Minimum duration 50ms cho mỗi từ
- Confidence tracking (hasRealTiming)
- Syllable-based estimation cho tiếng Đức

#### Cải tiến getActiveWordIndex():
- Lookahead 50ms để highlight sớm hơn (smoother transition)
- Tìm từ gần nhất khi currentTime ở giữa gap
- Better edge case handling

#### Return values mới:
- `currentWordConfidence`: Cho biết độ tin cậy của timing hiện tại

---

## GPT Prompt Cải Tiến

Prompt mới cho việc chia câu (tiếng Đức):

```
SEGMENTIERUNG (5-14 Wörter pro Segment, IDEAL 6-10 Wörter):
- MINIMUM: 5 Wörter pro Segment (zu kurze Segmente sind schwer zu lesen)
- IDEAL: 6-10 Wörter pro Segment (optimale Leselänge)
- MAXIMUM: 14 Wörter pro Segment (zu lange Segmente sind unübersichtlich)
- Bei langen Sätzen (>14 Wörter): Trenne bei Kommata, Konjunktionen
- Bei kurzen Sätzen (<5 Wörter): Kombiniere mit dem nächsten Satz
```

---

## Giai Đoạn 2: TODO (Chưa Triển Khai)

### Gợi ý tiếp theo:

1. **WhisperX Integration** (Forced Alignment)
   - Sử dụng whisperX Python package
   - Precise word-level alignment đến 30ms
   - Yêu cầu: API hoặc local Python service

2. **Audio Preprocessing**
   ```bash
   ffmpeg -i input.mp3 -af "highpass=f=200,lowpass=f=3000,loudnorm" -ar 16000 output.wav
   ```

3. **Manual Timing Adjustment Tool**
   - Admin UI để chỉnh sửa timing thủ công
   - Drag-and-drop word boundaries
   - Waveform visualization

4. **Confidence-based UI Indicators**
   - Hiển thị màu khác cho từ có confidence thấp
   - Warning icon khi karaoke có thể không chính xác

---

## Testing

Để test các thay đổi:

1. Tạo bài mới từ YouTube URL (sử dụng Whisper V3)
2. Kiểm tra karaoke highlighting trên trang shadowing
3. So sánh độ chính xác trước/sau với các video khác nhau

### Video test cases:
- Speech tốc độ nhanh
- Speech có nhạc nền
- Speech với pause dài
- Speech với nhiều từ ghép (compound words)

### Kết quả mong đợi:
- Mỗi segment có 5-14 từ (lý tưởng 6-10)
- Không có câu quá ngắn (1-4 từ)
- Chia câu tại điểm tự nhiên (comma, conjunction)
- Karaoke highlight mượt mà, không bị trễ/sớm quá nhiều
