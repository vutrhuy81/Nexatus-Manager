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
  role: { type: String, required: true },
  agencyName: { type: String }
}, { versionKey: false });
const UserDB = mongoose.model("User", userSchema);

// SCHEMA PHẢN ÁNH SỰ CỐ
const incidentSchema = new mongoose.Schema({
  'Tên đại lý': String,
  'Công trình': String,
  'Mô tả sự cố': String,
  'Ảnh': String,
  'Ngày giờ phản ánh': String,
  'Kết quả xử lý': { type: String, default: "Chưa xử lý" },
  'Nguyên nhân và giải pháp': String
}, { versionKey: false });
const Incident = mongoose.model("Incident", incidentSchema);

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
  // Đã tăng limit lên 10mb để cho phép Upload ảnh Base64
  app.use(express.json({ limit: '10mb' })); 
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // --- API USERS ---
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

  // --- API SỰ CỐ (INCIDENTS) ---
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
        recordData['Ngày giờ phản ánh'] = new Date().toISOString(); // Tự động tạo ngày giờ
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
      res.json({ message: "Xóa thành công" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete" });
    }
  });

  // --- API DATA ---
  app.get("/api/stats/agencies", async (req, res) => {
    try {
      const stats = await Dataset.aggregate([
        { $group: { _id: "$Tên đại lý", count: { $sum: 1 } } },
        { $match: { _id: { $ne: null, $ne: "" } } },
        { $sort: { count: -1 } }
      ]);
      const formattedStats = stats.map(item => ({ name: item._id, value: item.count }));
      res.json(formattedStats);
    } catch (error) { res.status(500).json({ error: "Failed to fetch statistics" }); }
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

      let savedRecord;
      if (recordData._id) {
        const { _id, ...updateFields } = recordData;
        savedRecord = await Dataset.findByIdAndUpdate(_id, updateFields, { new: true });
      } else {
        savedRecord = await Dataset.create(recordData);
      }
      if (user && action) await writeLog(user, action, details || "");
      res.json({ message: "Lưu dữ liệu thành công", data: savedRecord });
    } catch (error) { res.status(500).json({ error: "Failed to save data" }); }
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

  // --- API LOGS & EXPORT ---
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
