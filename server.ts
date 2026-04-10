import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { stringify } from "csv-stringify/sync";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import nodemailer from "nodemailer"; // BỔ SUNG THƯ VIỆN GỬI MAIL

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// CẤU HÌNH GỬI EMAIL (NODEMAILER)
// ==========================================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // VD: địa chỉ email gửi đi (gmail của bạn)
    pass: process.env.EMAIL_PASS  // Mật khẩu ứng dụng (App Password) của Gmail
  }
});

// THÊM ĐOẠN NÀY ĐỂ DEBUG ĐĂNG NHẬP EMAIL
transporter.verify(function (error, success) {
  if (error) {
    console.error("❌ LỖI ĐĂNG NHẬP EMAIL:", error);
  } else {
    console.log("✅ Server đã đăng nhập thành công vào Email:", process.env.EMAIL_USER);
  }
});

// ==========================================
// 1. KẾT NỐI MONGODB & ĐỊNH NGHĨA SCHEMA
// ==========================================
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("LỖI: Chưa cấu hình biến môi trường MONGODB_URI.");
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log("✅ Đã kết nối thành công tới MongoDB Atlas");
    await seedAdminUser(); 
  })
  .catch((err) => console.error("❌ Lỗi kết nối MongoDB:", err));

const logSchema = new mongoose.Schema({
  timestamp: { type: String, required: true },
  user: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String }
});
const Log = mongoose.model("Log", logSchema);

const dataSchema = new mongoose.Schema({}, { strict: false, versionKey: false });
const Dataset = mongoose.model("Dataset", dataSchema);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String }, // Bổ sung để lưu email user
  role: { type: String, required: true },
  agencyName: { type: String }
}, { versionKey: false });
const UserDB = mongoose.model("User", userSchema);

const incidentSchema = new mongoose.Schema({
  'Tên đại lý': String,
  'Công trình': String,
  'Mô tả sự cố': String,
  'Ảnh': [String],
  'Ảnh kết quả': [String],
  'Ngày giờ phản ánh': String,
  'Kết quả xử lý': { type: String, default: "Chưa xử lý" },
  'Nguyên nhân và giải pháp': String
}, { versionKey: false });
const Incident = mongoose.model("Incident", incidentSchema);

async function seedAdminUser() {
  try {
    const adminCount = await UserDB.countDocuments({ role: 'ADMIN' });
    if (adminCount === 0) {
      await UserDB.create({ username: 'Admin', password: '123456', role: 'ADMIN', email: 'vutrhuy81@gmail.com' });
      console.log("⭐ Đã tạo tài khoản mặc định: User: Admin | Pass: 123456");
    }
  } catch (error) {
    console.error("Lỗi khi tạo Admin gốc:", error);
  }
}

// HÀM GỬI EMAIL THÔNG BÁO LOG
async function sendLogEmail(user: string, action: string, details: string, timestamp: string) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log("⚠️ Bỏ qua gửi email: Chưa cấu hình EMAIL_USER và EMAIL_PASS trong biến môi trường.");
    return;
  }

  try {
    // 1. Lấy danh sách email của tất cả Admin & Operation từ Database
    const adminOpUsers = await UserDB.find({ role: { $in: ['ADMIN', 'OPERATION'] } }, 'email').lean();
    const dbEmails = adminOpUsers.map(u => u.email).filter(e => e && e.trim() !== '');

    // 2. Gộp với danh sách email mặc định (tránh trùng lặp)
    const defaultEmails = ['vutrhuy81@gmail.com', 'eduon.ltd@gmail.com'];
    const targetEmails = Array.from(new Set([...dbEmails, ...defaultEmails]));

    if (targetEmails.length === 0) return;

    // 3. Khung giao diện HTML cho Email
    const mailOptions = {
      from: `"Hệ thống Nexatus Ops" <${process.env.EMAIL_USER}>`,
      to: targetEmails.join(', '),
      subject: `[Thông báo Hệ thống] ${action}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-w: 600px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #4f46e5; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Nhật Ký Hoạt Động Mới</h2>
          <p>Hệ thống vừa ghi nhận một thay đổi dữ liệu từ tài khoản: <strong>${user}</strong>.</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; width: 120px; background-color: #f9fafb;">Thời gian</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">${new Date(timestamp).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; background-color: #f9fafb;">Hành động</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;"><span style="background-color: #dbeafe; color: #1d4ed8; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">${action}</span></td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; background-color: #f9fafb;">Chi tiết</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb; line-height: 1.5;">${details}</td>
            </tr>
          </table>
          <p style="margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center;">
            Đây là email thông báo tự động từ hệ thống Nexatus Manager.<br>Vui lòng không trả lời email này.
          </p>
        </div>
      `
    };   
    
    console.log(`⏳ Đang thực hiện gửi email tới: ${targetEmails.join(', ')}...`);    
    const info = await transporter.sendMail(mailOptions);    
    console.log("✉️ GỬI EMAIL THÀNH CÔNG!");
    console.log("👉 Message ID:", info.messageId);
    console.log("👉 Phản hồi từ Server:", info.response);
  } catch (error: any) {
    console.error("❌ LỖI TRONG QUÁ TRÌNH GỬI EMAIL:");
    console.error("- Tên lỗi:", error.name);
    console.error("- Mã lỗi:", error.code);
    console.error("- Thông báo:", error.message);
  }
}

async function writeLog(user: string, action: string, details: string) {
  const timestamp = new Date().toISOString();
  try {
    await Log.create({ timestamp, user, action, details });    
    // BẮT BUỘC THÊM AWAIT Ở ĐÂY KHI CHẠY TRÊN VERCEL // Gọi hàm gửi email nhưng KHÔNG await để không làm chậm trải nghiệm của người dùng trên web
    await sendLogEmail(user, action, details, timestamp);
  } catch (error) {
    console.error("Lỗi khi ghi log vào MongoDB:", error);
  }
}

// ==========================================
// 2. KHỞI TẠO SERVER & API ROUTES
// ==========================================
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' })); 
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await UserDB.findOne({ username, password }).lean();
      if (user) res.json({ success: true, user });
      else res.status(401).json({ success: false, message: "Sai tên đăng nhập hoặc mật khẩu" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    }
  });

  app.get("/api/users", async (req, res) => {
    if (req.headers["x-user-role"] !== "ADMIN") return res.status(403).json({ error: "Unauthorized" });
    try {
      const users = await UserDB.find({}).lean();
      res.json(users);
    } catch (error) { res.status(500).json({ error: "Failed to fetch users" }); }
  });

  app.post("/api/users", async (req, res) => {
    if (req.headers["x-user-role"] !== "ADMIN") return res.status(403).json({ error: "Unauthorized" });
    try {
      const userData = req.body;
      let savedUser;
      if (userData._id) {
        const { _id, ...updateFields } = userData;
        savedUser = await UserDB.findByIdAndUpdate(_id, updateFields, { new: true });
      } else {
        const exist = await UserDB.findOne({ username: userData.username });
        if (exist) return res.status(400).json({ error: "Tên đăng nhập đã tồn tại!" });
        savedUser = await UserDB.create(userData);
      }
      res.json({ message: "Lưu user thành công", user: savedUser });
    } catch (error) { res.status(500).json({ error: "Failed to save user" }); }
  });

  app.delete("/api/users/:id", async (req, res) => {
    if (req.headers["x-user-role"] !== "ADMIN") return res.status(403).json({ error: "Unauthorized" });
    try {
      await UserDB.findByIdAndDelete(req.params.id);
      res.json({ message: "Xóa user thành công" });
    } catch (error) { res.status(500).json({ error: "Failed to delete user" }); }
  });

  // --- API SỰ CỐ ---
  app.get("/api/incidents", async (req, res) => {
    try {
      const records = await Incident.find({}).lean();
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: "Failed to read incidents" });
    }
  });

  app.post("/api/incidents", async (req, res) => {
    try {
      const { data: recordData, user, action, details } = req.body;
      let savedRecord;
      if (recordData._id) {
        const { _id, ...updateFields } = recordData;
        savedRecord = await Incident.findByIdAndUpdate(_id, updateFields, { new: true });
      } else {
        recordData['Ngày giờ phản ánh'] = new Date().toISOString(); 
        savedRecord = await Incident.create(recordData);
      }
      
      if (user && action) await writeLog(user, action, details || "");
      res.json({ message: "Lưu sự cố thành công", data: savedRecord });
    } catch (error) {
      res.status(500).json({ error: "Failed to save incident" });
    }
  });

  app.delete("/api/incidents/:id", async (req, res) => {
    try {
      const { user, action, details } = req.body; 
      await Incident.findByIdAndDelete(req.params.id);
      if (user && action) await writeLog(user, action, details || "");
      res.json({ message: "Xóa sự cố thành công" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete incident" });
    }
  });

  // --- API DATA ---
  app.get("/api/stats/agencies", async (req, res) => {
    try {
      const stats = await Dataset.aggregate([
        { $group: { _id: "$Tên đại lý", count: { $sum: 1 } } },
        { $match: { _id: { $nin: [null, ""] } } }, 
        { $sort: { count: -1 } }
      ]);
      const formattedStats = stats.map(item => ({ name: item._id, value: item.count }));
      res.json(formattedStats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  app.get("/api/data", async (req, res) => {
    try {
      const records = await Dataset.find({}).lean();
      res.json(records);
    } catch (error) { res.status(500).json({ error: "Failed to read data" }); }
  });

  app.post("/api/data", async (req, res) => {
    try {
      const { data: recordData, user, action, details } = req.body;
      if (!recordData) return res.status(400).json({ error: "Không có dữ liệu gửi lên" });

      // KIỂM TRA TRÙNG LẶP TÊN CÔNG TRÌNH HOẶC MÃ KHÁCH HÀNG
      const duplicateQuery: any = {
        $or: [
          { 'Tên công trình': recordData['Tên công trình'] },
          { 'Mã khách hàng': recordData['Mã khách hàng'] }
        ]
      };
      
      // Nếu là cập nhật, bỏ qua record hiện tại
      if (recordData._id) {
        duplicateQuery._id = { $ne: recordData._id };
      }

      const duplicateCheck = await Dataset.findOne(duplicateQuery);
      if (duplicateCheck) {
        return res.status(400).json({ error: `Từ chối lưu: "Tên công trình" hoặc "Mã khách hàng" đã tồn tại trong hệ thống!` });
      }  
      
      let savedRecord;
      if (recordData._id) {
        const { _id, ...updateFields } = recordData;
        savedRecord = await Dataset.findByIdAndUpdate(_id, updateFields, { new: true });
      } else {
        savedRecord = await Dataset.create(recordData);
      }
      if (user && action) await writeLog(user, action, details || "");
      res.json({ message: "Lưu dữ liệu thành công", data: savedRecord });
    } catch (error) { 
      res.status(500).json({ error: "Failed to save data" }); 
    }
  });

  app.delete("/api/data/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { user, action, details } = req.body; 
      await Dataset.findByIdAndDelete(id);
      if (user && action) await writeLog(user, action, details || `Đã xóa bản ghi ID: ${id}`);
      res.json({ message: "Xóa dữ liệu thành công" });
    } catch (error) { res.status(500).json({ error: "Failed to delete data" }); }
  });

  app.get("/api/logs", async (req, res) => {
    if (req.headers["x-user-role"] !== "ADMIN") return res.status(403).json({ error: "Unauthorized" });
    try {
      const logs = await Log.find({}, { _id: 0, __v: 0 }).sort({ timestamp: -1 }).lean();
      res.json(logs);
    } catch (error) { res.status(500).json({ error: "Failed to read logs" }); }
  });

  app.get("/api/export/data", async (req, res) => {
    try {
      const records = await Dataset.find({}, { _id: 0 }).lean();
      if (!records || records.length === 0) return res.status(404).send("No data");
      const content = stringify(records, { header: true });
      const bom = "\uFEFF"; 
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=dataset.csv");
      res.send(bom + content);
    } catch (error) { res.status(500).send("Export failed"); }
  });

  app.get("/api/export/logs", async (req, res) => {
    if (req.headers["x-user-role"] !== "ADMIN") return res.status(403).json({ error: "Unauthorized" });
    try {
      const logs = await Log.find({}, { _id: 0, __v: 0 }).sort({ timestamp: -1 }).lean();
      if (!logs || logs.length === 0) return res.status(404).send("No logs");
      const content = stringify(logs, { header: true });
      const bom = "\uFEFF";
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=activity_log.csv");
      res.send(bom + content);
    } catch (error) { res.status(500).send("Export failed"); }
  });

  if (process.env.NODE_ENV !== "production") {
    const viteModule = await import("vite");
    const vite = await viteModule.createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT as number, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
