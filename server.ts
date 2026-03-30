import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { stringify } from "csv-stringify/sync";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Load biến môi trường từ file .env (cho môi trường local)
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

// Schema cho Logs
const logSchema = new mongoose.Schema({
  timestamp: { type: String, required: true },
  user: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String }
});
const Log = mongoose.model("Log", logSchema);

// Schema cho Dataset 
// Dùng { strict: false } vì tôi không rõ cấu trúc cột CSV cũ của bạn gồm những gì,
// điều này cho phép bạn lưu JSON data linh hoạt giống hệt như lưu CSV cũ.
const dataSchema = new mongoose.Schema({}, { strict: false, versionKey: false });
const Dataset = mongoose.model("Dataset", dataSchema);

// Hàm ghi Log
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

  // Lấy dữ liệu công trình (thay vì đọc file dataset.csv)
  app.get("/api/data", async (req, res) => {
    try {
      // Lấy toàn bộ dữ liệu, loại bỏ trường _id của MongoDB để trả về JSON thuần như cũ
      const records = await Dataset.find({}, { _id: 0 }).lean();
      res.json(records);
    } catch (error) {
      console.error("Error fetching data from MongoDB:", error);
      res.status(500).json({ error: "Failed to read data" });
    }
  });

  // Lưu dữ liệu công trình
  app.post("/api/data", async (req, res) => {
    try {
      const { data: newData, user, action, details } = req.body;
      
      // Logic cũ của bạn là ghi đè toàn bộ file CSV. 
      // Do đó, ta sẽ xóa trắng Collection và Insert lại toàn bộ dữ liệu mới.
      await Dataset.deleteMany({});
      if (newData && newData.length > 0) {
        await Dataset.insertMany(newData);
      }
      
      if (user && action) {
        await writeLog(user, action, details || "");
      }
      
      res.json({ message: "Data saved successfully to MongoDB" });
    } catch (error) {
      console.error("Error writing data to MongoDB:", error);
      res.status(500).json({ error: "Failed to save data" });
    }
  });

  // Đọc danh sách logs
  app.get("/api/logs", async (req, res) => {
    const role = req.headers["x-user-role"];
    if (role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      // Lấy logs, sắp xếp mới nhất lên đầu, bỏ đi cột _id và __v
      const logs = await Log.find({}, { _id: 0, __v: 0 }).sort({ timestamp: -1 }).lean();
      res.json(logs);
    } catch (error) {
      console.error("Error reading logs from MongoDB:", error);
      res.status(500).json({ error: "Failed to read logs" });
    }
  });

  // Xuất file CSV (Data)
  app.get("/api/export/data", async (req, res) => {
    try {
      const records = await Dataset.find({}, { _id: 0 }).lean();
      if (!records || records.length === 0) {
        return res.status(404).send("No data available to export");
      }
      
      const content = stringify(records, { header: true });
      const bom = "\uFEFF"; // Hỗ trợ hiển thị tiếng Việt UTF-8 trên Excel
      
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=dataset.csv");
      res.send(bom + content);
    } catch (error) {
      console.error("Export data error:", error);
      res.status(500).send("Export failed");
    }
  });

  // Xuất file CSV (Logs)
  app.get("/api/export/logs", async (req, res) => {
    const role = req.headers["x-user-role"];
    if (role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const logs = await Log.find({}, { _id: 0, __v: 0 }).sort({ timestamp: -1 }).lean();
      if (!logs || logs.length === 0) {
        return res.status(404).send("No logs available to export");
      }

      const content = stringify(logs, { header: true });
      const bom = "\uFEFF";
      
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=activity_log.csv");
      res.send(bom + content);
    } catch (error) {
      console.error("Export logs error:", error);
      res.status(500).send("Export failed");
    }
  });

  // ==========================================
  // 3. CẤU HÌNH VITE / STATIC FILE
  // ==========================================
  if (process.env.NODE_ENV !== "production") {
    // Sử dụng dynamic import: Chỉ nạp Vite khi chạy local
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
