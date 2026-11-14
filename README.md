# Hoàng Kha Learning — Client

React, TypeScript strict, Ant Design và Tailwind CSS. Giao diện tiếng Việt cho Đại cương và Chuyên ngành CNTT, kết nối API NestJS trong `../server`. Không chứa dữ liệu demo, tài khoản mặc định hoặc API giả lập trong ứng dụng.

Typography dùng Segoe UI, chữ thường 16px, nhãn/chú thích tối thiểu khoảng 14px và màu chữ phụ đậm `#475569`. Theme Ant Design nằm ở `src/theme.ts`; bố cục, scrollbar và màn chờ ở `src/workspace.css`. Viền xám 1px, ô nhập/nút bo góc 6px và thẻ nội dung 8px. Màu nhấn xanh `#2455A4` dùng cho hành động chính; thao tác phụ dùng nền trắng, viền nhẹ. Tiêu đề trang, tên học phần/bài tập và hạn nộp có cỡ chữ, độ đậm cao hơn thông tin phụ. Thành công xanh lá `#15803D`, cảnh báo `#B45309`, lỗi đỏ `#B91C1C`, lưu ý quan trọng `#9A6700`; trạng thái có nội dung và biểu tượng kèm màu. Danh mục Đại cương/Chuyên ngành dùng tab có gạch chân; trang đăng nhập chỉ giữ thông tin và thao tác cần thiết.

`RichTextEditor` dùng [Tiptap](https://tiptap.dev/docs/editor/getting-started/install/react) cho hướng dẫn bài tập Đại cương/Chuyên ngành, mô tả chương, giới thiệu/yêu cầu đầu vào của lộ trình và nội dung bài học. Thanh công cụ có đậm, nghiêng, gạch ngang, tiêu đề, danh sách, trích dẫn, mã nguồn, liên kết, bảng, hoàn tác và làm lại. Nội dung vẫn gửi dưới dạng chuỗi Markdown qua các API hiện có; tên, email, tóm tắt ngắn và mục tiêu dạng từng dòng giữ ô nhập thông thường. `LearningText` hiển thị Markdown và GFM, bỏ HTML trực tiếp, giữ liên kết an toàn. Trình soạn thảo nhận trạng thái khóa từ Ant Design Form, hỗ trợ cập nhật dữ liệu khi mở lại, lỗi xác thực và giới hạn độ dài sẵn có. Thư viện soạn thảo chỉ tải cùng các trang giảng viên.

Khi mở ứng dụng, `ServerStartupGate` hiển thị hoạt ảnh Lottie ba chấm và dòng “Chờ một chút...” rồi kiểm tra `GET /api/health` trước khi chạy truy vấn đăng nhập/dữ liệu. Hoạt ảnh nội bộ ở `public/animations/waiting.json`, hỗ trợ tùy chọn giảm chuyển động. Yêu cầu kiểm tra có timeout 15 giây, tự thử lại sau 4 giây khi gặp lỗi mạng hoặc lỗi tạm thời; sau khoảng 3 phút chưa sẵn sàng sẽ có nút **Thử lại**. Phản hồi sai định dạng hoặc lỗi cấu hình 4xx không bị thử lại liên tục. Tính năng hỗ trợ server Render đang ngủ mà không tự gửi lại thao tác ghi dữ liệu. Đặt `VITE_API_URL` đúng backend khi triển khai.

## Chạy local

Yêu cầu Node.js 24 và Yarn 1. Backend chạy cổng 3000 theo [hướng dẫn server](../server/README.md).

Trong thư mục `client`:

```sh
yarn install --frozen-lockfile
yarn dev
```

Mở `http://127.0.0.1:5173`. API mặc định `/api` được Vite chuyển đến `http://localhost:3000`. Nếu backend đổi cổng, cập nhật `server.proxy` trong `vite.config.ts`.

Muốn dùng API khác, tạo `client/.env` và đặt `VITE_API_URL` bằng URL backend kết thúc bằng `/api`. Biến này nằm trong mã trình duyệt; không đưa mật khẩu Gmail, MongoDB URI, JWT secret hoặc Cloudinary secret vào client.

Build: `yarn build`. Kiểm tra mã: `yarn lint`. Kiểm tra cả mã và build: `yarn verify`. Chạy bản build local: `yarn preview`; preview không dùng dev proxy, vì vậy cần đặt URL API tuyệt đối trước khi build khi kiểm tra với backend thật.

## Đại cương

Chọn Đại cương tại trang chủ, lọc học kỳ → lớp → học phần → bài tập. Sinh viên không cần tài khoản.

- Nhập MSSV, họ tên, **email nhận mã**, ghi chú nếu có và file Office hoặc ảnh theo quy định bài tập. Hỗ trợ ảnh JPG/JPEG, PNG, WebP, GIF, AVIF, TIF/TIFF; danh sách chọn file có ảnh thu nhỏ với định dạng trình duyệt hiển thị được. Client kiểm tra phần mở rộng, file rỗng, số lượng và dung lượng; backend kiểm tra nội dung thật của file.
- Màn xác nhận hiển thị đầy đủ nơi nộp, email và danh sách file trước khi gửi.
- Khi nộp thành công, hiển thị biên nhận, mã bí mật, email nhận mã và kết quả gửi email. Có thể tải biên nhận `.txt`, sao chép mã và tải lại file đã nộp.
- Nếu gửi email lỗi nhưng bài đã lưu, hiển thị cảnh báo riêng và nút **Gửi lại mã qua email**. Nút dùng lại cùng nội dung và `Idempotency-Key`, không tạo phiên bản mới. File để gửi lại chỉ giữ trong bộ nhớ của trang; sau khi rời trang, dùng biên nhận đã lưu hoặc email đã nhận để tra cứu.
- Tra cứu bằng mã biên nhận và mã bí mật trong email, xem lịch sử và tải file của từng phiên bản. Mã bí mật gửi trong body POST, không đưa vào URL.
- Nộp lại khi giảng viên cho phép: giữ MSSV và dùng mã bí mật từ lần đầu. Từ màn hình biên nhận, nút nộp lại điền lại MSSV, họ tên, email và mã bí mật để thuận tiện thao tác.

Backend chọn dịch vụ gửi email qua `MAIL_PROVIDER`: Render Free dùng Brevo HTTPS API (`BREVO_API_KEY`, `MAIL_FROM_EMAIL`); máy local vẫn dùng được Gmail (`GMAIL_USER`, `GMAIL_APP_PASSWORD`). Xem cấu hình trong [README backend](../server/README.md). Không đưa key email vào client. Không có màn quản lý email hoặc tài khoản sinh viên riêng cho Đại cương.

Khi mất kết nối hoặc chưa có kết quả nộp bài, client giữ khóa yêu cầu và băm nội dung file trong `sessionStorage`. Thử lại phải cùng email, thông tin và nội dung file; không lưu binary hoặc mã bí mật trong bản ghi chờ. Nếu server yêu cầu chờ, nút thử lại đếm ngược theo `retryAfterSeconds`/`Retry-After`. Sau khi đã lưu bài thành công, bản ghi chờ được xóa.

## Chuyên ngành: sinh viên

Chọn Chuyên ngành và đăng nhập bằng tài khoản giảng viên cấp. Sinh viên không tự đăng ký hoặc tự ghi danh.

1. Đăng nhập bằng tên đăng nhập và mật khẩu được cấp.
2. Lần đầu hoặc sau khi giảng viên đặt lại mật khẩu, đổi sang mật khẩu riêng tối thiểu 12 ký tự, tối đa 72 byte trước khi vào học.
3. Bộ lọc mặc định chọn **Tất cả lộ trình**, hiển thị các lộ trình được công bố. Có thể chọn một lộ trình cụ thể hoặc tìm theo tên. Bộ lọc lớp/học phần Đại cương cũng hiển thị giá trị **Tất cả** khi đang hiển thị toàn bộ.
4. Khi chưa ghi danh, chỉ mở được các bài xem trước; tài liệu và bài thường vẫn khóa. Liên hệ giảng viên để được cấp quyền học đầy đủ.
5. Sau khi ghi danh, xem video, nội dung Markdown, mã nguồn và tài liệu của các bài được công bố. Đánh dấu hoặc bỏ hoàn thành bài để cập nhật tiến độ lộ trình.
6. Bài tập được nhóm theo lộ trình, chương và bài học. Trang nội dung bài học hiển thị bài tập liên quan; sidebar có liên kết tới bài tập chương. Nộp một file ZIP mã nguồn tối đa 10 MiB, xem lịch sử và tải từng phiên bản. Bỏ `node_modules`, `.git` trước khi nén; ZIP phải chứa mã nguồn thật. Thời hạn và quyền nộp lại do giảng viên đặt.

Video hỗ trợ nhúng YouTube/Vimeo, phát liên kết MP4/WebM/OGG hoặc mở trên nền tảng ngoài. Tài liệu là các liên kết HTTPS do giảng viên quản lý. Markdown hiển thị qua [react-markdown](https://github.com/remarkjs/react-markdown), không thực thi HTML nhúng.

Menu tài khoản có đổi mật khẩu và đăng xuất. Đăng xuất gọi API thu hồi phiên sinh viên. Khi phiên hết hạn hoặc tài khoản bị khóa, client trở về trang đăng nhập sinh viên.

## Giảng viên

Đăng nhập ở `/login` bằng tài khoản được cấp từ backend.

Phần **Đại cương** giữ các màn tổng quan, học kỳ, môn học, lớp, học phần, bài tập, bài nộp, tải file và xuất ZIP/Excel. Chi tiết bài nộp và từng phiên bản hiển thị email sinh viên.

Trong Tạo/Sửa bài tập → Quy định file, các định dạng được chia thành **Tài liệu Office** và **Hình ảnh**. Bài tập mới chọn sẵn cả hai nhóm; có thể bỏ các loại không nhận. Bài tập cũ giữ lựa chọn đã lưu, giảng viên cần bật thêm ảnh rồi lưu để sinh viên nộp được. Ảnh được lưu/tải theo cùng luồng bài nộp, biên nhận và lịch sử; không cần cấu hình môi trường mới.

Phần **Chuyên ngành** có:

- **Tài khoản sinh viên:** tìm kiếm, cấp tài khoản, sửa họ tên/email, khóa/mở, đặt lại mật khẩu. Khi cấp hoặc đặt lại, hệ thống tự gửi email gồm website, tên đăng nhập và mật khẩu tạm. Thông báo phân biệt gửi thành công với tài khoản đã lưu nhưng gửi email lỗi; khi lỗi, sửa cấu hình email rồi cấp lại mật khẩu để gửi lại. Mật khẩu tạm không trả về client.
- **Lộ trình học:** tạo/sửa tiêu đề, mã đường dẫn, cấp độ, tóm tắt, mô tả, mục tiêu, yêu cầu đầu vào, ảnh bìa HTTPS và trạng thái công bố. Có lọc, phân trang, lưu trữ và khôi phục.
- **Chương & bài học:** thêm/sửa chương, thứ tự, bài học, video, tài liệu, mã nguồn; soạn Markdown và xem trước nội dung. Xóa liên kết video để gỡ video, xóa từng tài liệu khi không cần. Từng chương/bài có công bố và lưu trữ riêng.
  Khi tạo/sửa chương hoặc bài học, phần **Bài tập mã nguồn** cho phép thêm tối đa 20 bài tập mới và liên kết tối đa 50 bài tập có sẵn trong cùng lộ trình. Các bài tập đang gắn được hiển thị riêng và không bị tạo lại khi sửa nội dung. Nút **Bài tập** ở từng chương/bài mở danh sách quản lý đúng phạm vi đó. Trang bài tập chung cho phép chọn cấp liên kết lộ trình/chương/bài học, đổi hoặc gỡ liên kết, giữ lịch sử nộp.
- **Sinh viên ghi danh:** tìm sinh viên theo tên/MSSV/tài khoản, ghi danh vào từng lộ trình, xem danh sách, thu hồi hoặc cấp lại quyền học. Thu hồi ghi danh giữ lịch sử tiến độ.
- **Bài tập/bài nộp mã nguồn:** tạo và sửa bài tập ZIP ngay trong lộ trình hoặc trang bài tập riêng; đặt thời hạn, đóng/mở, cho nộp trễ hoặc nộp lại. Xem phiên bản của từng sinh viên, tải file và xuất ZIP/Excel.

Sinh viên chỉ thấy nội dung khi lộ trình, chương và bài học đều được công bố và chưa lưu trữ. Bật **Cho phép xem trước** ở bài học để sinh viên đã đăng nhập có thể xem nội dung/video trước khi ghi danh; tài liệu vẫn cần ghi danh.

## Đường dẫn

Hai không gian theo vai trò dùng cùng typography, màu sắc và logo Hoàng Kha Learning:

- `StudentLayout`: nộp bài Đại cương, tra cứu và học/nộp ZIP Chuyên ngành. Không có liên kết chuyển sang giảng viên.
- `LecturerLayout`: giữ sidebar quản lý, gồm danh mục/bài nộp Đại cương và lộ trình/tài khoản/bài nộp mã nguồn Chuyên ngành. Không có điều hướng sang sinh viên.

Giảng viên đăng nhập trực tiếp tại `/login`; sinh viên Chuyên ngành tại `/specialized/login`. Trang đăng nhập sinh viên độc lập, không có header/footer học tập. Sidebar giảng viên cố định, menu cuộn riêng với scrollbar mỏng. Nút hamburger thu gọn/mở rộng sidebar trên desktop và mở menu trong drawer trên điện thoại; trạng thái thu gọn được ghi nhớ trong trình duyệt. Logo giảng viên đưa về tổng quan quản lý. Logo sinh viên đưa về trang học tập. Logo SVG chữ HK nằm ở `public/hoang-kha.svg`; tên thương hiệu được khai báo trong `src/lib/brand.ts`.

Các đường dẫn mới: `/specialized/assignments/:id` (sinh viên), `/lecturer/specialized-assignments` và `/lecturer/specialized-submissions` (giảng viên). Các thao tác lưu, nộp, ghi danh, cấp tài khoản và tải file có thông báo thành công hoặc lỗi.

| Đường dẫn                                                          | Màn hình                                                         |
| ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `/`                                                                | Đại cương, chọn học phần/bài tập và danh mục đào tạo             |
| `/assignments/:id`                                                 | Hướng dẫn, nộp bài bằng email và biên nhận                       |
| `/lookup`                                                          | Tra cứu, lịch sử và tải file bài nộp                             |
| `/specialized/login`                                               | Đăng nhập sinh viên                                              |
| `/specialized/change-password`                                     | Đổi mật khẩu sinh viên                                           |
| `/specialized`                                                     | Danh sách lộ trình được công bố                                  |
| `/specialized/paths/:pathId`                                       | Giới thiệu và đề cương lộ trình                                  |
| `/specialized/paths/:pathId/lessons/:lessonId`                     | Bài học, video, tài liệu và tiến độ                              |
| `/login`                                                           | Đăng nhập giảng viên                                             |
| `/lecturer/dashboard`                                              | Tổng quan bài nộp Đại cương                                      |
| `/lecturer/semesters`, `/subjects`, `/classes`, `/course-sections` | Danh mục học tập Đại cương, mỗi đường dẫn có tiền tố `/lecturer` |
| `/lecturer/assignments`, `/lecturer/submissions`                   | Bài tập, bài đã nộp                                              |
| `/lecturer/students`                                               | Tài khoản sinh viên Chuyên ngành                                 |
| `/lecturer/learning-paths`                                         | Danh sách lộ trình                                               |
| `/lecturer/learning-paths/:id`                                     | Soạn chương/bài và quản lý ghi danh                              |

## Phiên và quyền truy cập

JWT giảng viên và sinh viên dùng hai khóa `sessionStorage` riêng, chỉ gửi đến API tương ứng. Đăng xuất hoặc hết phiên của một vai trò không xóa phiên còn lại. Query cache riêng được xóa khi đăng xuất; backend tiếp tục kiểm tra quyền của từng yêu cầu.

Mật khẩu, mã bí mật của biên nhận và file binary không nằm trong URL hoặc `localStorage`. Mã tra cứu chỉ giữ trong bộ nhớ trang sau khi nhập hoặc nhận biên nhận; sinh viên có thể lưu mã ra file theo nhu cầu.

Các màn có trạng thái tải, lỗi kèm thử lại, danh sách rỗng, xác nhận thao tác ảnh hưởng quyền học và thông báo kết quả. Giao diện hỗ trợ điện thoại. Thời gian bài nộp hiển thị theo giờ Việt Nam.

## Nộp lại bài đã gửi nhầm

Đại cương: bấm Nộp lại bài ngay trên biên nhận sau khi nộp, hoặc tra cứu bằng mã biên nhận và mã bí mật rồi bấm Nộp lại bài. Form điền sẵn thông tin và mã bí mật, giữ nguyên MSSV; chọn lại toàn bộ file đúng rồi xác nhận. Mã bí mật được chuyển giữa hai trang trong bộ nhớ, không đặt vào URL, lịch sử điều hướng, localStorage hoặc sessionStorage. Nếu reload form, nhập lại mã bí mật hoặc tra cứu lại.

Chuyên ngành: mở bài tập → Bài đã nộp & điểm → Nộp lại bài, chọn ZIP đúng và xác nhận hộp thoại trước khi gửi; không cần mã bí mật. Có thể hủy hộp thoại để kiểm tra file, chưa phát sinh yêu cầu nộp bài.

Cả hai luồng chỉ nộp lại khi giảng viên đã bật Cho nộp lại và bài còn nhận bài. Khi không được phép, giao diện khóa nút và nêu lý do. Nộp lại tạo phiên bản mới chưa chấm, giữ bản/điểm cũ trong lịch sử; thử lại yêu cầu lỗi vẫn dùng cùng key và nội dung để tránh tạo trùng phiên bản.

## Chấm điểm và kết quả học tập

Trong Bài nộp Đại cương hoặc Bài nộp mã nguồn, giảng viên mở chi tiết, chọn Chấm điểm tại phiên bản cần chấm, nhập điểm thang 10 và nhận xét rồi Lưu điểm. Ô gửi email mặc định không chọn; nếu chọn, hệ thống gửi tới email hiển thị của phiên bản đó. Thông báo phân biệt lưu điểm thành công với lưu điểm nhưng gửi email thất bại. Khi có xung đột cập nhật, dữ liệu được tải lại để chấm tiếp từ điểm mới nhất.

Danh sách hiển thị điểm phiên bản mới nhất hoặc Chưa chấm. Đại cương tra cứu bằng mã biên nhận và mã bí mật để xem điểm/nhận xét từng phiên bản và lưu kết quả vào biên nhận. Sinh viên Chuyên ngành mở bài tập để xem phần Bài đã nộp & điểm; có nút Làm mới kết quả và tự kiểm tra lại khi quay lại cửa sổ. Phiên bản mới nộp lại không kế thừa điểm cũ. Kết quả hiển thị dù giảng viên không chọn gửi email.

## Triển khai

Trên Vercel, chọn Framework Preset **Vite**, Build Command `yarn build`, Output Directory `dist`. Root Directory để trống nếu repo chỉ chứa frontend; đặt `client` nếu repo chứa cả client và server. File `vercel.json` nằm cùng `package.json` và rewrite các đường dẫn về `/index.html`, giúp React Router xử lý khi mở link trực tiếp hoặc reload `/lookup`, `/specialized/login`, `/lecturer/...`.

Sau khi cập nhật cấu hình, commit và push `vercel.json`, rồi chờ Vercel deploy commit mới. Redeploy một commit cũ chưa có file này sẽ không áp dụng bản sửa. Tham khảo [Vercel: Vite SPA deep linking](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas).

`render.yaml` dành cho Static Site. Đặt Root Directory là `client` trong monorepo, build bằng `yarn install --frozen-lockfile --production=false && yarn build`, Publish Directory là `dist`.

Đặt `VITE_API_URL` bằng URL backend thật trước khi build và cấu hình `FRONTEND_URL` của backend đúng origin client. Rewrite `/*` về `/index.html` để mở trực tiếp hoặc tải lại các đường dẫn lộ trình. Không đưa thông tin Gmail vào cấu hình frontend.

Bản bàn giao đã bỏ test, fixtures và tài nguyên mẫu không dùng. Các lượt kiểm tra trình duyệt dùng API giả lập, không xác nhận thông tin Gmail, MongoDB hoặc Cloudinary thật của môi trường triển khai.
