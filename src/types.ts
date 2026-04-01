export type UserRole = 'ADMIN' | 'OPERATION' | 'AGENCY';

export interface User {
  username: string;
  role: UserRole;
  agencyName?: string;
}

export interface ProjectData {
  STT: string;
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
  'Nhà sản xuất Inverter': string;
  'Inverter No. / Inverter Type': string;
  'Mã Logger': string;
  'Mã công tơ 2 chiều': string;
  'Đã gửi cấu hình Nexatus': string;
  'Đã upload cấu hình Nexatus': string;
  'Đã tích hợp Nexatus': string;
  'Đã nghiệm thu': string;
  'Link cấu hình': string;
}

export const AGENCIES = ['Hoà Phát', 'Damitech', 'Việt Long', 'AME', 'INewSolar', 'Vitech'];
export const LISTENS = ['116.212.47.2 (NPC)', '103.78.7.6 (CPC2/SPC)', '116.105.225.236 (CPC1)', '202.60.107.187 (HCMC)'];
export const LOCALIDS = ['Sophos_EVN (NPC)', '%any (HCMC)', 'Null (CPC)'];
export const LOCALSUBS = ['10.21.10.64/27 (NPC)', '192.168.108.0/28 (CPC2/SPC)', '10.112.191.0/30 (CPC1)', '10.137.101.132/32 (HCMC)'];
export const NSXIVTS = ['HUAWEI', 'SUNGROW', 'SMA', 'SOLIS', 'DEYE', 'FRONIUS', 'ABB', 'GOOGWE', 'GROWATT', 'KEHUA', 'AUXSOL', 'SAJ'];
export const LOGGERS = ['FRONIUS', 'ABB_PVS', 'ABB_TRIO20', 'GOOGWE', 'GROWATT', 'HUAWEI', 'KEHUA', 'SMA', 'SOLIS', 'SUNGROW', 'DEYE_SUN_G03', 'SMART_HUAWEI', 'SMART_SUNGROW', 'SMART_SAJ_C1', 'SMART_SAJ_SEC', 'SMART_SOLIS_S3', 'SMART_AUXSOL', 'SMART_SMA'];
export const METERS = ['DT03MRF', 'SMARTLOGGER HUAWEI', 'ACREL DTSD1352', 'JANITZA UMG604 SUM', 'JANITZA UMG604 SINGLE', 'SMARTLOGGER SAJ C1', 'SMARTLOGGER SAJ SEC', 'SCHNEIDER PM51XX 53XX', 'EASTRON SDM630MCT', 'EASTRON SDM630MCT', 'SMARTLOGGER AUXSOL', 'SMARTLOGGER SMA'];

