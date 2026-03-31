import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { stringify } from "csv-stringify/sync";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    await seedAdminUser(); // Khởi tạo tài khoản Admin gốc nếu chưa có
  })
  .catch((err) => console.error("❌ Lỗi kết nối MongoDB:", err));

// Schema Logs
const logSchema = new mongoose.Schema({
  timestamp: { type: String, required: true },
  user: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String }
});
const Log = mongoose.model("Log", logSchema);

// Schema Dataset
const dataSchema = new mongoose.Schema({}, { strict: false, versionKey: false });
const Dataset = mongoose.model("Dataset", dataSchema);

// Schema Users (MỚI THÊM)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true }, // ADMIN, OPERATION, AGENCY
  agencyName: { type: String } // Dành riêng cho role AGENCY
}, { versionKey: false });
const UserDB = mongoose.model("User", userSchema);

// Hàm tạo tài khoản Admin mặc định (Phòng trường hợp DB mới tinh chưa có user nào)
async function seedAdminUser() {
  try {
    const adminCount = await UserDB.countDocuments({ role: 'ADMIN' });
    if (adminCount === 0) {
      await UserDB.create({ username: 'Admin', password: '123456', role: 'ADMIN' });
      console.log("⭐ Đã tạo tài khoản mặc định: User: Admin | Pass: 123456");
    }
  } catch (error) {
    console.error("Lỗi khi tạo Admin gốc:", error);
  }
}

async function writeLog(user: string, action: string, details: string) {
  const timestamp = new Date().toISOString();
  try {
    await Log.create({ timestamp, user, action, details });
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
  app.use(express.json());

  // --- API ĐĂNG NHẬP (MỚI) ---
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await UserDB.findOne({ username, password }).lean();
      if (user) {
        res.json({ success: true, user });
      } else {
        res.status(401).json({ success: false, message: "Sai tên đăng nhập hoặc mật khẩu" });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    }
  });

  // --- API QUẢN LÝ USER (CHỈ ADMIN) ---
  app.get("/api/users", async (req, res) => {
    if (req.headers["x-user-role"] !== "ADMIN") return res.status(403).json({ error: "Unauthorized" });
    try {
      const users = await UserDB.find({}).lean();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
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
        // Kiểm tra trùng username
        const exist = await UserDB.findOne({ username: userData.username });
        if (exist) return res.status(400).json({ error: "Tên đăng nhập đã tồn tại!" });
        savedUser = await UserDB.create(userData);
      }
      res.json({ message: "Lưu user thành công", user: savedUser });
    } catch (error) {
      res.status(500).json({ error: "Failed to save user" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    if (req.headers["x-user-role"] !== "ADMIN") return res.status(403).json({ error: "Unauthorized" });
    try {
      await UserDB.findByIdAndDelete(req.params.id);
      res.json({ message: "Xóa user thành công" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // --- API QUẢN LÝ CÔNG TRÌNH ---
  app.get("/api/data", async (req, res) => {
    try {
      const records = await Dataset.find({}).lean();
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: "Failed to read data" });
    }
  });

  app.post("/api/data", async (req, res) => {
    try {
      const { data: recordData, user, action, details } = req.body;
      if (!recordData) return res.status(400).json({ error: "Không có dữ liệu gửi lên" });

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
    } catch (error) {
      res.status(500).json({ error: "Failed to delete data" });
    }
  });

  // --- API LOGS & EXPORT ---
  app.get("/api/logs", async (req, res) => {
    if (req.headers["x-user-role"] !== "ADMIN") return res.status(403).json({ error: "Unauthorized" });
    try {
      const logs = await Log.find({}, { _id: 0, __v: 0 }).sort({ timestamp: -1 }).lean();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to read logs" });
    }
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
    } catch (error) {
      res.status(500).send("Export failed");
    }
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
    } catch (error) {
      res.status(500).send("Export failed");
    }
  });

  // ==========================================
  // 3. CẤU HÌNH VITE / STATIC FILE
  // ==========================================
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
