# Hệ thống ôn tập Sinh học 12 KNTT — Chương I, Bài 1–5

Website luyện kiểm tra 15 phút gồm frontend responsive và backend API Node.js, có chấm bài, giải thích từng câu, phát hiện kỹ năng yếu và tạo đề ôn vá lỗi. Phù hợp để triển khai bằng GitHub + Vercel.

## Nội dung và mức độ kiểm chứng

- 100 câu tự biên soạn/diễn đạt lại, 20 câu cho mỗi bài; câu hỏi có đáp án và giải thích do hệ thống dùng để chấm.
- 24 đề biến thể, mỗi đề 10 câu, 15 phút, bố trí 2 câu từ mỗi Bài 1–5. Một số câu được dùng lại ở các tổ hợp đề khác nhau; đây không phải 240 câu hoàn toàn riêng biệt.
- Đối chiếu phạm vi và khái niệm với trang bài học Sinh học 12 Kết nối tri thức của SGKVN, ngân hàng trắc nghiệm có đáp án của VietJack, và các trang lời giải Bài 3–5 tại Bài Kiểm Tra. Nguồn và link cụ thể được liệt kê trong giao diện và `CONTENT_AUDIT.md`.
- Câu hỏi được diễn đạt lại, không bê nguyên văn các bộ đề. Các link ngoài là nguồn đối chiếu; không đồng nghĩa mỗi câu là câu trích dẫn từ nguồn đó.
- Bài 5 đã ưu tiên đúng nội dung công nghệ DNA tái tổ hợp, vector/chuyển gene, sinh vật biến đổi gene, thành tựu và rủi ro/đạo đức sinh học. Không lấy PCR/điện di làm trọng tâm riêng của Bài 5.
- Đáp án được kiểm tra bằng lập luận sinh học và đối chiếu tài liệu tham khảo trong phạm vi có thể; không tuyên bố đảm bảo tuyệt đối 100% hoặc trùng đề giáo viên. Khi vở ghi/SGK của lớp có quy ước cụ thể hơn, ưu tiên tài liệu giáo viên.

## Tính năng

- `GET /api/test?set=1` trả 10 câu không kèm đáp án/giải thích.
- `POST /api/submit` chấm trên backend, trả đáp án đúng, giải thích, link nguồn và phân tích sai theo kỹ năng/bài học.
- `POST /api/adaptive` tạo đề vá lỗ hổng, ưu tiên kỹ năng đã sai nhưng vẫn bao phủ cả 5 bài; câu trả lời sai của lượt trước được loại khỏi pool nếu vẫn còn đủ câu thay thế. Khi nộp đề cá nhân hóa, backend tái tạo cùng đề theo seed để chấm đúng bộ câu đã phát.
- `GET /api/sources` cung cấp mục lục nguồn đối chiếu.
- `GET /api/health` kiểm tra trạng thái ngân hàng/API.
- 24 đề thường, 10 câu/15 phút, đồng hồ tự nộp ở frontend, thanh tiến độ, đáp án/giải thích sau khi nộp.
- Lịch sử và phân tích lũy kế lưu trong trình duyệt hiện tại; lịch sử cloud tùy chọn chỉ lưu đề thường, không lưu đề cá nhân hóa trong cấu hình hiện tại.
- `lib/` chứa module nội bộ; `vercel.json` chặn truy cập tĩnh trực tiếp tới `/lib/*`, `/scripts/*`, `/supabase/*` và tài liệu/config riêng. Chỉ các handler thật ở `api/` mới là serverless endpoints trên Vercel. Đáp án không được xuất trong payload nhận đề thường.

## Chạy cục bộ

Cần Node.js 18 trở lên, không cần cài package bên ngoài.

```bash
npm start
```

Mở `http://localhost:3000`. API kiểm tra: `/api/health`, `/api/test?set=1`, `/api/sources`.

Chạy kiểm tra tự động:

```bash
npm test
```

## Đưa lên GitHub/Vercel

1. Giải nén ZIP và tạo repository GitHub.
2. Upload nội dung **bên trong** thư mục gốc, gồm `index.html`, `app.js`, `styles.css`, `api/`, `lib/`, `vercel.json`, `package.json`. Đừng upload nguyên ZIP như một file đơn lẻ.
3. Vào Vercel → Add New → Project → import repository. Chọn Framework Preset `Other` nếu cần; không cần build command.
4. Deploy; Vercel tự nhận diện các hàm trong thư mục `api/`.

## Đồng bộ lịch sử qua thiết bị (tùy chọn)

Mặc định, điểm và lịch sử phân tích được lưu trong `localStorage` của trình duyệt này. Nếu muốn lịch sử cloud cho các đề thường, chạy `supabase/schema.sql` trong Supabase SQL Editor rồi cấu hình `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` trong Vercel Environment Variables. Không bao giờ đặt service-role key trong `app.js`, HTML hoặc repository công khai. Mã studentId là mã ngẫu nhiên cục bộ, không phải tài khoản xác thực.

## Nguồn tham khảo đối chiếu

- SGKVN — Sinh học 12 Kết nối tri thức: https://www.sgkvn.com/lop-12-15/ket-noi-tri-thuc-voi-cuoc-song-3/sinh-hoc-12-3357.html
- VietJack — Ngân hàng trắc nghiệm Chương I: https://vietjack.com/sinh-hoc-12-kn/trac-nghiem-chuong-1-di-truyen-phan-tu.jsp
- Các trang SGKVN, VietJack và tài liệu có đáp án theo từng Bài 1–5 được ghi cụ thể trong `lib/bank.js` và hiển thị trực tiếp trong website sau khi nộp bài.

Đây là công cụ ôn tập do AI hỗ trợ biên soạn, không phải đề chính thức của trường/giáo viên. Không dùng kết quả tự động thay thế việc xác minh các phần giáo viên yêu cầu.
