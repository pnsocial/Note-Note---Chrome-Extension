# Daily Markdown Note — Chrome Extension

Extension thay **tab mới** bằng một sổ ghi **Markdown theo ngày**, lưu cục bộ qua `chrome.storage.local` (không gửi dữ liệu ra mạng, không đồng bộ đám mây mặc định).

## Tính năng chính

- Ghi chú **một ngày một trang** (chỉ sửa được ngày hôm nay; ngày trước chỉ xem).
- **Markdown** với xem trước đã render (DOMPurify + marked), thanh định dạng nhanh.
- **Tìm kiếm**, **lịch tháng** (popover), **xuất** từng ngày hoặc **ZIP** toàn bộ `.md`.
- **Giao diện sáng/tối**, thống kê **số từ / thời gian đọc** gần tiêu đề ngày.
- Phím tắt: **Ctrl/⌘ + Shift + Y** (theme), **Ctrl/⌘ + Shift + G** (ô tìm kiếm).

## Cài từ mã nguồn

1. Clone repo hoặc tải ZIP từ GitHub.
2. Mở Chrome → `chrome://extensions` → bật **Chế độ dành cho nhà phát triển**.
3. **Tải tiện ích đã giải nén** → chọn thư mục gốc của project (chứa `manifest.json`).

## Cấu trúc thư mục

| Đường dẫn | Mô tả |
|-----------|--------|
| `manifest.json` | Cấu hình MV3, override tab mới |
| `newtab.html` | Trang tab mới |
| `css/styles.css` | Giao diện |
| `js/` | Logic: editor, lưu trữ, render, lịch, ZIP, … |
| `icons/` | Icon extension (PNG + SVG nguồn) |

Dự án **không dùng npm / bundler** — chạy trực tiếp trong trình duyệt.

## Build trên GitHub

Workflow [**Build**](.github/workflows/build.yml) chạy tự động khi **push** hoặc **pull request** vào nhánh `main`:

1. **Kiểm tra** `manifest.json` hợp lệ (JSON).
2. **Đóng gói** extension thành file ZIP (`daily-markdown-note.zip`) để cài thử hoặc lưu bản build.

### Xem kết quả & tải ZIP

1. Vào tab **Actions** trên GitHub:  
   [https://github.com/pnsocial/Note-Note---Chrome-Extension/actions](https://github.com/pnsocial/Note-Note---Chrome-Extension/actions)
2. Chọn workflow run mới nhất (thành công có dấu ✓).
3. Kéo xuống mục **Artifacts** → tải **`extension-zip`** (bên trong là `daily-markdown-note.zip`).

> Lưu ý: Artifact trên GitHub có thời hạn lưu theo cài đặt repo/organization (mặc định thường vài chục ngày).

[![Build](https://github.com/pnsocial/Note-Note---Chrome-Extension/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/pnsocial/Note-Note---Chrome-Extension/actions/workflows/build.yml)

## Giấy phép

Nếu bạn chưa chọn license, có thể thêm file `LICENSE` (ví dụ MIT) trong repo sau.
