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
}

export const AGENCIES = ['Hoà Phát', 'Damitech', 'Việt Long', 'AME', 'INewSolar', 'Vitech'];
export const LISTENS = ['116.212.47.2', '103.78.7.6', '103.78.7.6', '202.60.107.187'];
export const LOCALIDS = ['Sophos_EVN', '%any', 'Null'];
export const LOCALSUBS = ['10.21.10.64/27', '192.168.108.0/28', '192.168.108.0/28', '10.137.101.132/32'];
