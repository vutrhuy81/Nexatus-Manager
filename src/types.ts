export type UserRole = 'ADMIN' | 'OPERATION' | 'AGENCY';

export interface User {
  username: string;
  role: UserRole;
  agencyName?: string;
  email?: string; 
}

export interface ProjectData {
  STT: string;
  'Tổng công ty': string;
  'Công ty điện lực': string;
  'Đơn vị điện lực': string;
  'Mã TBA': string;
  'Mã xuất tuyến': string;
  'Tên công trình': string;
  'Mã khách hàng': string;
  'Tên đại lý': string;
  'Địa chỉ': string;
  'Listening interface': string;
  'Preshared key': string;
  'Local ID': string;
  'Remote ID': string;
  'Local subnet': string;
  'Remote subnet': string;
  Lat: string;
  Long: string;
  'CSTK DC (kWp)': string;
  'CSTK AC (kW)': string;
  'Công suất lắp đặt (kW)': string;
  'Công suất tối đa (kW)': string;
  'Zero export': string;
  'SN Nexatus': string;
  'SIM IP tĩnh': string;
  'Router IP tĩnh': string;
  'Nhà sản xuất Inverter': string;
  'Inverter No. / Inverter Type': string;
  'Mã Logger': string;
  'Mã công tơ 2 chiều': string;
  'Đã gửi cấu hình Nexatus': string;
  'Đã upload cấu hình Nexatus': string;
  'Đã tích hợp Nexatus': string;
  'Đã nghiệm thu': string;
  'Link cấu hình'?: string;
}

export interface IncidentData {
  _id?: string;
  'Tên đại lý': string;
  'Công trình': string;
  'Mô tả sự cố': string;
  'Ảnh'?: string[];           
  'Ảnh kết quả'?: string[];   
  'Ngày giờ phản ánh': string;
  'Kết quả xử lý': string;
  'Nguyên nhân và giải pháp': string;
}

// === DATA DICTIONARIES ===
export const AGENCIES = ['Hoà Phát', 'Damitech', 'Việt Long', 'AME', 'INewSolar', 'Vitech'];
export const LISTENS = ['116.212.47.2 (NPC)', '103.78.7.6 (CPC2/SPC)', '116.105.225.236 (CPC1)', '202.60.107.187 (HCMC)'];
export const LOCALIDS = ['Sophos_EVN (NPC)', '%any (HCMC)', 'Null (CPC/SPC)', 'CpcemecSophos'];
export const LOCALSUBS = ['10.21.10.64/27 (NPC)', '192.168.108.0/28 (CPC2/SPC)', '10.112.191.0/30 (CPC1)', '10.137.101.132/32 (HCMC)'];
export const NSXIVTS = ['HUAWEI', 'SUNGROW', 'SMA', 'SOLIS', 'DEYE', 'FRONIUS', 'ABB', 'GOOGWE', 'GROWATT', 'KEHUA', 'AUXSOL', 'SAJ'];
export const LOGGERS = ['FRONIUS', 'ABB_PVS', 'ABB_TRIO20', 'GOOGWE', 'GROWATT', 'HUAWEI', 'KEHUA', 'SMA', 'SOLIS', 'SUNGROW', 'KSTAR', 'DEYE SUN 70K-110K G03', 'SMARTLOGGER HUAWEI', 'SMARTLOGGER SUNGROW', 'SMARTLOGGER SAJ C1', 'SMARTLOGGER SAJ SEC', 'SMARTLOGGER SOLIS S3', 'SMARTLOGGER AUXSOL', 'SMARTLOGGER SMA', 'SMARTLOGGER GROWATT'];
export const METERS = ['DT03MRF', 'SMARTLOGGER HUAWEI', 'ACREL DTSD1352', 'JANITZA UMG604 SUM', 'JANITZA UMG604 SINGLE', 'SMARTLOGGER SAJ C1', 'SMARTLOGGER SAJ SEC', 'SCHNEIDER PM51XX 53XX', 'EASTRON SDM630MCT', 'EASTRON SDM630MCT', 'SMARTLOGGER AUXSOL', 'SMARTLOGGER SMA', 'SMARTLOGGER GROWATT', 'DONGLE HUAWEI'];

export const POWER_COMPANIES: Record<string, string[]> = {
  'EVNNPC': [
    'Công ty Điện lực Bắc Ninh', 'Công ty Điện lực Cao Bằng', 'Công ty Điện lực Điện Biên',
    'Công ty Điện lực Hà Tĩnh', 'Công ty Điện lực Hải Phòng', 'Công ty Điện lực Hưng Yên',
    'Công ty Điện lực Lai Châu', 'Công ty Điện lực Lạng Sơn', 'Công ty Điện lực Lào Cai',
    'Công ty Điện lực Ninh Bình', 'Công ty Điện lực Nghệ An', 'Công ty Điện lực Phú Thọ',
    'Công ty Điện lực Quảng Ninh', 'Công ty Điện lực Sơn La', 'Công ty Điện lực Tuyên Quang',
    'Công ty Điện lực Thái Nguyên', 'Công ty Điện lực Thanh Hóa'
  ],
  'EVNCPC': [
    'Công ty Điện lực Quảng Trị', 'Công ty Điện lực Thừa Thiên Huế', 'Công ty Điện lực Đà Nẵng',
    'Công ty Điện lực Quảng Ngãi', 'Công ty Điện lực Gia Lai', 'Công ty Điện lực Đắk Lắk',
    'Công ty Điện lực Khánh Hòa', 'Công ty Cổ phần Điện lực Khánh Hòa'
  ],
  'EVNSPC': [
    'Công ty Điện lực An Giang', 'Công ty Điện lực Cà Mau', 'Công ty Điện lực Đồng Tháp',
    'Công ty Điện lực Vĩnh Long', 'Công ty Điện lực TP. Cần Thơ', 'Công ty Điện lực Tây Ninh',
    'Công ty Điện lực Đồng Nai', 'Công ty Điện lực Lâm Đồng'
  ],
  'EVNHANOI': [
    'Công ty Điện lực Ba Đình', 'Công ty Điện lực Hoàn Kiếm', 'Công ty Điện lực Từ Liêm',
    'Công ty Điện lực Hà Đông', 'Công ty Điện lực Thanh Trì', 'Công ty Điện lực Gia Lâm',
    'Công ty Điện lực Đông Anh', 'Công ty Điện lực Sóc Sơn', 'Công ty Điện lực Sơn Tây',
    'Công ty Điện lực Thạch Thất', 'Công ty Điện lực Thường Tín', 'Công ty Điện lực Ứng Hòa'
  ],
  'EVNHCMC': [
    'Công ty Điện lực Sài Gòn', 'Công ty Điện lực Tân Thuận', 'Công ty Điện lực Gia Định',
    'Công ty Điện lực Chợ Lớn', 'Công ty Điện lực Thủ Đức', 'Công ty Điện lực Bình Chánh',
    'Công ty Điện lực Củ Chi', 'Công ty Điện lực Hóc Môn', 'Công ty Điện lực An Phú Đông',
    'Công ty Điện lực Bình Phú', 'Công ty Điện lực Bình Dương', 'Công ty Điện lực Bến Cát',
    'Công ty Điện lực Thuận An', 'Công ty Điện lực Đất Đỏ', 'Công ty Điện lực Vũng Tàu'
  ]
};

export const CORPORATIONS = Object.keys(POWER_COMPANIES);
