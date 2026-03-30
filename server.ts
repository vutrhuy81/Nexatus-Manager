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
  .then(() => console.log("✅ Đã kết nối thành công tới MongoDB Atlas"))
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
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  // ĐÃ SỬA: Bỏ { _id: 0 } để trả về ID cho Frontend
  app.get("/api/data", async (req, res) => {
    try {
      const records = await Dataset.find({}).lean();
      res.json(records);
    } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).json({ error: "Failed to read data" });
    }
  });

  // ĐÃ SỬA: Chỉ Thêm mới hoặc Cập nhật 1 bản ghi dựa trên ID (Không dùng deleteMany nữa)
  app.post("/api/data", async (req, res) => {
    try {
      const { data: recordData, user, action, details } = req.body;
      
      if (!recordData) {
        return res.status(400).json({ error: "Không có dữ liệu gửi lên" });
      }

      let savedRecord;

      if (recordData._id) {
        const { _id, ...updateFields } = recordData;
        savedRecord = await Dataset.findByIdAndUpdate(_id, updateFields, { new: true });
      } else {
        savedRecord = await Dataset.create(recordData);
      }
      
      if (user && action) {
        await writeLog(user, action, details || "");
      }
      
      res.json({ message: "Lưu dữ liệu thành công", data: savedRecord });
    } catch (error) {
      console.error("Error saving data:", error);
      res.status(500).json({ error: "Failed to save data" });
    }
  });

  // API Xóa bản ghi
  app.delete("/api/data/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { user, action, details } = req.body; 

      await Dataset.findByIdAndDelete(id);

      if (user && action) {
        await writeLog(user, action, details || `Đã xóa bản ghi ID: ${id}`);
      }

      res.json({ message: "Xóa dữ liệu thành công" });
    } catch (error) {
      console.error("Error deleting data:", error);
      res.status(500).json({ error: "Failed to delete data" });
    }
  });

  app.get("/api/logs", async (req, res) => {
    const role = req.headers["x-user-role"];
    if (role !== "ADMIN") return res.status(403).json({ error: "Unauthorized" });

    try {
      const logs = await Log.find({}, { _id: 0, __v: 0 }).sort({ timestamp: -1 }).lean();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to read logs" });
    }
  });

  // Xuất file CSV Data (Vẫn giữ {_id: 0} ở đây để file tải về không bị dính cột mã ID lạ)
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
    const role = req.headers["x-user-role"];
    if (role !== "ADMIN") return res.status(403).json({ error: "Unauthorized" });
    
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
