# Daily Markdown Note — Chrome Extension

Extension thay **tab mới** bằng một sổ ghi **Markdown theo ngày**, lưu cục bộ qua `chrome.storage.local` (không gửi dữ liệu ra mạng, không đồng bộ đám mây mặc định).

## Tính năng chính

- Ghi chú **một ngày một trang** (chỉ sửa được ngày hôm nay; ngày trước chỉ xem).
- **Markdown** với xem trước đã render (DOMPurify + marked), thanh định dạng nhanh.
- **Tìm kiếm**, **lịch tháng** (popover), **xuất** từng ngày hoặc **ZIP** toàn bộ `.md`.
- **Giao diện sáng/tối**, thống kê **số từ / thời gian đọc** gần tiêu đề ngày.
- Phím tắt: **Ctrl/⌘ + Shift + Y** (theme), **Ctrl/⌘ + Shift + G** (ô tìm kiếm).

## Tải bản phát hành (ZIP — cài Chrome)

Bản build chính thức nằm trong **GitHub Releases** (file ZIP đính kèm, không hết hạn như Artifact của Actions):

1. Mở trang [**Releases**](https://github.com/pnsocial/Note-Note---Chrome-Extension/releases) → chọn bản mới nhất hoặc [**Latest**](https://github.com/pnsocial/Note-Note---Chrome-Extension/releases/latest).
2. Trong mục **Assets**, tải `daily-markdown-note-<phiên_bản>.zip`.
3. Giải nén — thư mục gốc (cấp đầu tiên sau khi giải nén) phải có `manifest.json`.
4. Chrome → `chrome://extensions` → bật **Chế độ dành cho nhà phát triển** → **Tải tiện ích đã giải nén** → chọn thư mục đó.

> ZIP trong Release được tạo bởi workflow [**Release**](.github/workflows/release.yml) mỗi khi có **tag** dạng `v*` trùng với trường `"version"` trong `manifest.json` (ví dụ manifest `1.0.0` → tag `v1.0.0`).

## Cài từ mã nguồn

1. Clone repo hoặc tải ZIP mã nguồn từ GitHub (khác với ZIP extension ở Releases).
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

### Release (ZIP cho người dùng)

Khi bạn **đẩy tag** `v<version>` trùng với `"version"` trong `manifest.json`, workflow [**Release**](.github/workflows/release.yml) sẽ:

1. Kiểm tra tag khớp phiên bản manifest.
2. Tạo file `daily-markdown-note-<version>.zip`.
3. Tạo **GitHub Release** và đính kèm ZIP vào **Assets**.

Ví dụ phát hành bản `1.0.0` (đã có trong `manifest.json`):

```bash
git add manifest.json && git commit -m "Bump version 1.0.0"  # nếu vừa đổi version
git push origin main
git tag v1.0.0
git push origin v1.0.0
```

### Build kiểm tra (mỗi push `main`)

Workflow [**Build**](.github/workflows/build.yml) chạy tự động khi **push** hoặc **pull request** vào nhánh `main`:

1. **Kiểm tra** `manifest.json` hợp lệ (JSON).
2. **Đóng gói** extension thành file ZIP (`daily-markdown-note.zip`) để cài thử hoặc lưu bản build.

### Xem kết quả & tải ZIP

1. Vào tab **Actions** trên GitHub:  
   [https://github.com/pnsocial/Note-Note---Chrome-Extension/actions](https://github.com/pnsocial/Note-Note---Chrome-Extension/actions)
2. Chọn workflow run mới nhất (thành công có dấu ✓).
3. Kéo xuống mục **Artifacts** → tải **`extension-zip`** (bên trong là `daily-markdown-note.zip`).

> Lưu ý: Artifact trên GitHub có thời hạn lưu theo cài đặt repo/organization (mặc định thường vài chục ngày).

### Cảnh báo Node.js trên GitHub Actions (đã xử lý)

GitHub đang loại bỏ **Node.js 20** làm runtime cho các action JavaScript (mặc định chuyển **Node.js 24** từ tháng 6/2026; gỡ Node 20 khỏi runner khoảng **16/9/2026**). Với bản cũ, `actions/checkout@v4` và `actions/upload-artifact@v4` có thể báo cảnh báo kiểu:

> Node.js 20 actions are deprecated …

Workflow hiện dùng **`actions/checkout@v5`** và **`actions/upload-artifact@v5`** (chạy trên runtime Node 24 của action), nên không cần đặt `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` trong file workflow. Chi tiết: [GitHub Blog — deprecation of Node 20 on Actions runners](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/).

[![Build](https://github.com/pnsocial/Note-Note---Chrome-Extension/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/pnsocial/Note-Note---Chrome-Extension/actions/workflows/build.yml)

## Giấy phép

Nếu bạn chưa chọn license, có thể thêm file `LICENSE` (ví dụ MIT) trong repo sau.
