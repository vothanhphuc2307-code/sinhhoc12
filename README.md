# Hệ thống ôn tập Sinh học 12 — Chương I, Bài 1–5

Một website luyện kiểm tra 15 phút cho Sinh học 12 (Kết nối tri thức), có frontend responsive, API backend chấm bài, giải thích từng câu và phân tích nhóm kiến thức cần ôn lại.

## Có gì trong bản này?

- **24 đề luyện tập biến thể**, mỗi đề 10 câu / 15 phút; phân bố 2 câu cho từng bài.
- **Ngân hàng 100 câu tự biên soạn**, chia đều 20 câu cho Bài 1–5. Các đề có thể dùng lại một số câu ở những tổ hợp khác nhau, không phải 240 câu hoàn toàn khác nhau.
- **Backend chấm bài** qua `/api/submit`. Frontend không nhận đáp án đúng trước khi nộp; khóa đáp án được đặt trong các module nội bộ của thư mục `api/`.
- **Giải thích theo từng câu**: đáp án đúng, lựa chọn của người làm và lý do.
- **Chẩn đoán lỗ hổng** theo kỹ năng như cấu trúc DNA, tái bản, phiên mã/dịch mã, operon lac, các dạng đột biến, DNA tái tổ hợp, vector/enzym và PCR.
- **Phân tích lũy kế** những nhóm kỹ năng thường sai qua các lần làm đề trên cùng trình duyệt.
- Giao diện có animation nhẹ, bảng chọn câu, đồng hồ 15 phút, tự nộp khi hết giờ, responsive cho máy tính và điện thoại.
- Không cần thư viện bên ngoài hoặc bước build để chạy bản cơ bản.

## Chạy thử trên máy tính

Yêu cầu Node.js 18 trở lên.

```bash
npm start
```

Sau đó mở `http://localhost:3000`.

Kiểm tra các API:

- `GET /api/test?set=1` — trả câu hỏi của đề nhưng không trả đáp án/giải thích.
- `POST /api/submit` — chấm câu trả lời và trả kết quả, giải thích cùng chẩn đoán.
- `GET /api/history?studentId=...` — đọc lịch sử cloud nếu đã cấu hình Supabase.

Chạy kiểm tra nhanh bộ câu hỏi và logic chấm:

```bash
npm test
```

## Đưa lên GitHub rồi triển khai bằng Vercel

1. Giải nén ZIP.
2. Tạo repository GitHub mới và upload **toàn bộ tệp/thư mục bên trong** (không upload nguyên ZIP làm một tệp duy nhất).
3. Mở Vercel, chọn **Add New → Project**, import repository vừa tạo.
4. Chọn Framework Preset **Other** nếu Vercel yêu cầu. Không cần build command hoặc output directory.
5. Deploy. Vercel tự nhận diện các function `.js` trong thư mục `api/`; `index.html`, `styles.css`, `app.js` là frontend.

Nếu sửa mã sau đó, commit và push lên GitHub; Vercel sẽ tạo deployment mới khi repository đã được kết nối.

## Lưu điểm và đồng bộ giữa thiết bị (tùy chọn)

Mặc định, backend vẫn chấm và phân tích bài đầy đủ; lịch sử nhiều lần làm được lưu trong `localStorage` của trình duyệt hiện tại. Để đồng bộ lịch sử qua những thiết bị khác nhau, có thể cấu hình Supabase:

1. Tạo project Supabase.
2. Mở SQL Editor, chạy nội dung `supabase/schema.sql` để tạo bảng `quiz_attempts`.
3. Trong Vercel → Project → Settings → Environment Variables, thêm:
   - `SUPABASE_URL` — URL của project Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY` — service-role key chỉ dùng phía server.
4. Redeploy project trên Vercel.

**Không** đặt `SUPABASE_SERVICE_ROLE_KEY` trong frontend, không thêm khóa đó vào `app.js`, và không commit giá trị thật lên GitHub. Có thể xem mẫu tên biến trong `.env.example`. Nếu chưa cấu hình Supabase, website vẫn chấm bài bình thường và thông báo lịch sử đang lưu trên trình duyệt này.

Lịch sử cloud dùng một mã ngẫu nhiên được tạo trên trình duyệt; không cần nhập tên, email hay thông tin cá nhân. Đây là mã định danh cục bộ, không phải tài khoản xác thực nên không nên dùng như hệ thống thi có giám sát hoặc cần chống gian lận.

## Phạm vi và lưu ý học tập

Tên bài trong phạm vi sách Kết nối tri thức:

1. DNA và cơ chế tái bản DNA.
2. Gene, quá trình truyền đạt thông tin di truyền và hệ gene.
3. Điều hòa biểu hiện gene.
4. Đột biến gene.
5. Công nghệ di truyền.

Bộ câu hỏi là tài liệu ôn tập tự biên soạn theo các kiến thức trọng tâm; không phải đề chính thức và không bảo đảm trùng với đề giáo viên. Một số câu liên hệ PCR/ứng dụng công nghệ gene nhằm luyện cách hiểu công cụ và quy trình; nên ưu tiên ghi chú giáo viên và nội dung SGK khi có khác biệt về mức độ chi tiết.

Tài liệu tham khảo đối chiếu phạm vi bài học:
- SGKVN, mục lục Sinh học 12 Kết nối tri thức: https://www.sgkvn.com/lop-12-15/ket-noi-tri-thuc-voi-cuoc-song-3/sinh-hoc-12-3357.html
- VietJack, Chương I — Di truyền phân tử: https://vietjack.com/sinh-hoc-12-kn/
