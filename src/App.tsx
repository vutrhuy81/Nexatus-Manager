import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  LogOut, 
  Plus, 
  Search, 
  Edit2, 
  Save, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Database,
  User as UserIcon,
  Settings,
  Download,
  Trash2, 
  Copy,
  Users,
  PieChart,
  Filter,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  AlertTriangle 
} from 'lucide-react';
import { User, ProjectData, IncidentData, AGENCIES, LISTENS, LOCALIDS, LOCALSUBS, NSXIVTS, LOGGERS, METERS, CORPORATIONS, POWER_COMPANIES } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('nexatus_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [data, setData] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showFilters, setShowFilters] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' | null }>({ key: null, direction: null });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false); 
  const [isIncidentListOpen, setIsIncidentListOpen] = useState(false);
  
  const [editingProject, setEditingProject] = useState<ProjectData | null>(null);
  const [loginError, setLoginError] = useState('');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return; 

    let timeoutId: ReturnType<typeof setTimeout>;

    const performLogout = () => {
      setUser(null);
      setUsername('');
      setPassword('');
      localStorage.removeItem('nexatus_user'); 
      alert("Phiên đăng nhập đã hết hạn do không có hoạt động trong 5 phút. Vui lòng đăng nhập lại.");
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(performLogout, 300000); 
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data');
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('nexatus_user', JSON.stringify(data.user));
        setLoginError('');
      } else {
        setLoginError(data.message || 'Sai tên đăng nhập hoặc mật khẩu');
      }
    } catch (error) {
      setLoginError('Lỗi kết nối đến máy chủ');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setUsername('');
    setPassword('');
    localStorage.removeItem('nexatus_user');
  };

  const handleExportData = () => {
    window.open('/api/export/data', '_blank');
  };

  const handleSave = async (project: ProjectData) => {
    let action = '';
    let details = '';
    let projectToSave = { ...project };

    if (projectToSave._id) {
      action = 'CẬP NHẬT';
      details = `Cập nhật công trình: ${project['Tên công trình']} (STT: ${project.STT})`;
    } else {
      const nextStt = data.length > 0 ? (Math.max(...data.map(p => parseInt(p.STT) || 0)) + 1).toString() : "1";
      projectToSave.STT = nextStt;
      action = 'KHAI BÁO MỚI';
      details = `Khai báo công trình mới: ${project['Tên công trình']} (STT: ${nextStt})`;
    }

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: projectToSave,
          user: user?.username,
          action,
          details
        }),
      });

      if (res.ok) {
        const result = await res.json();
        const savedRecord = result.data; 

        if (projectToSave._id) {
          setData(data.map(p => p._id === savedRecord._id ? savedRecord : p));
        } else {
          setData([...data, savedRecord]);
        }
        
        setIsModalOpen(false);
        setEditingProject(null);
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Có lỗi xảy ra khi lưu dữ liệu lên server.");
      }
    } catch (error) {
      console.error('Failed to save data', error);
      alert("Lỗi kết nối máy chủ khi lưu dữ liệu.");
    }
  };

  const handleDelete = async (project: ProjectData) => {
    if (!project._id) {
      alert("Không tìm thấy ID của bản ghi để xóa.");
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa công trình: ${project['Tên công trình']}?`)) return;

    try {
      const res = await fetch(`/api/data/${project._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: user?.username,
          action: 'XÓA BẢN GHI',
          details: `Xóa công trình: ${project['Tên công trình']} (STT: ${project.STT})`
        }),
      });

      if (res.ok) {
        setData(data.filter(p => p._id !== project._id));
      } else {
        alert("Có lỗi xảy ra khi xóa dữ liệu trên server.");
      }
    } catch (error) {
      console.error('Lỗi khi gọi API xóa:', error);
    }
  };

  const handleClone = (project: ProjectData) => {
    const { _id, ...rest } = project as any;
    const clonedProject = {
      ...rest,
      'Tên công trình': `${project['Tên công trình']} - Copy`,
      'STT': '', 
      'SN Nexatus': '', 
    } as ProjectData;

    setEditingProject(clonedProject);
    setIsModalOpen(true);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
    setSortConfig({ key, direction });
  };

  const handleColumnFilterChange = (key: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredData = useMemo(() => {
    let result = data;
    
    if (user?.role === 'AGENCY' && user.agencyName) {
      result = result.filter(p => p['Tên đại lý'] === user.agencyName);
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(p => 
        (p['Tên công trình'] || '').toLowerCase().includes(lowerSearch) ||
        (p['Mã khách hàng'] || '').toLowerCase().includes(lowerSearch) ||
        (p['Tên đại lý'] || '').toLowerCase().includes(lowerSearch)
      );
    }

    Object.keys(columnFilters).forEach(key => {
      const filterValue = columnFilters[key];
      if (filterValue) {
        const lowerFilter = filterValue.toLowerCase();
        result = result.filter(p => String(p[key as keyof ProjectData] || '').toLowerCase().includes(lowerFilter));
      }
    });

    if (sortConfig.key && sortConfig.direction) {
      result = [...result].sort((a, b) => {
        const valA = String(a[sortConfig.key as keyof ProjectData] || '');
        const valB = String(b[sortConfig.key as keyof ProjectData] || '');
        
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }
        
        return sortConfig.direction === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      });
    }

    return result;
  }, [data, user, searchTerm, columnFilters, sortConfig]);

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey || !sortConfig.direction) return <ArrowUpDown size={12} className="opacity-30" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-blue-50/30 flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[32px] shadow-xl w-full max-w-md border border-gray-100"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
              <Database className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-gray-800">Hệ Thống Quản Lý</h1>
            <p className="text-gray-500 text-sm italic">Vận hành và khai thác Nexatus</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 ml-1">Tên đăng nhập</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-5 py-3 rounded-2xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                placeholder="Nhập username..."
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 ml-1">Mật khẩu</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-3 rounded-2xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                placeholder="Nhập password..."
                required
              />
            </div>
            {loginError && (
              <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-xl border border-red-100">
                <AlertCircle size={16} />
                <span>{loginError}</span>
              </div>
            )}
            <button 
              type="submit"
              className="w-full bg-primary text-white py-4 rounded-2xl font-semibold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
            >
              Đăng Nhập
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-gray-800">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-xl">
                <LayoutDashboard className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold leading-tight text-primary">Nexatus Ops</h1>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Management System</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsIncidentListOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl border border-orange-100 hover:bg-orange-100 transition-all text-sm font-semibold"
              >
                <AlertTriangle size={16} />
                <span className="hidden sm:inline">Sự Cố</span>
              </button>

              {user.role === 'ADMIN' && (
                <>
                  <button 
                    onClick={() => setIsUserModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-xl border border-purple-100 hover:bg-purple-100 transition-all text-sm font-semibold"
                  >
                    <Users size={16} />
                    <span className="hidden sm:inline">Quản Lý Users</span>
                  </button>
                  <button 
                    onClick={() => setIsLogModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-primary rounded-xl border border-blue-100 hover:bg-blue-100 transition-all text-sm font-semibold"
                  >
                    <Database size={16} />
                    <span className="hidden sm:inline">Nhật Ký</span>
                  </button>
                </>
              )}
              
              <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-full border border-gray-100">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <UserIcon size={16} className="text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-gray-900">{user.username}</p>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">{user.role}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Tìm kiếm chung..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-sm"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              title="Bật/tắt bộ lọc từng cột"
              className={`flex items-center justify-center p-3 rounded-2xl border transition-all ${
                showFilters ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50 shadow-sm'
              }`}
            >
              <Filter size={20} />
            </button>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
            <button 
              onClick={handleExportData}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-gray-600 px-6 py-3 rounded-2xl font-semibold border border-gray-200 hover:bg-gray-50 transition-all shadow-sm"
            >
              <Download size={18} />
              <span>Export Data</span>
            </button>
            {user.role !== 'OPERATION' && (
              <button 
                onClick={() => {
                  setEditingProject(null);
                  setIsModalOpen(true);
                }}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-semibold hover:bg-primary-dark transition-all shadow-md shadow-primary/10"
              >
                <Plus size={18} />
                <span>Thêm Công Trình</span>
              </button>
            )}
          </div>
        </div>

        <AgencyPieChart data={filteredData} />

        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50">
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('STT')}>
                    <div className="flex items-center gap-1">STT <SortIcon columnKey="STT" /></div>
                  </th>
                  <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('Tên công trình')}>
                    <div className="flex items-center gap-1">Tên Công Trình <SortIcon columnKey="Tên công trình" /></div>
                  </th>
                  <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('Tên đại lý')}>
                    <div className="flex items-center gap-1">Đại Lý <SortIcon columnKey="Tên đại lý" /></div>
                  </th>
                  <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('Mã khách hàng')}>
                    <div className="flex items-center gap-1">Mã KH <SortIcon columnKey="Mã khách hàng" /></div>
                  </th>
                  <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('Đã gửi cấu hình Nexatus')}>
                    <div className="flex items-center gap-1">Send Nex.Cfg <SortIcon columnKey="Đã gửi cấu hình Nexatus" /></div>
                  </th>
                  <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('Đã upload cấu hình Nexatus')}>
                    <div className="flex items-center gap-1">Upload Nex.Cfg <SortIcon columnKey="Đã upload cấu hình Nexatus" /></div>
                  </th>
                  <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('Đã tích hợp Nexatus')}>
                    <div className="flex items-center gap-1">Tích Hợp RMCS <SortIcon columnKey="Đã tích hợp Nexatus" /></div>
                  </th>
                  <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('Đã nghiệm thu')}>
                    <div className="flex items-center gap-1">Nghiệm thu <SortIcon columnKey="Đã nghiệm thu" /></div>
                  </th>
                  <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-400 text-right min-w-[140px]">Thao Tác</th>
                </tr>

                <AnimatePresence>
                  {showFilters && (
                    <motion.tr 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }} 
                      className="bg-primary/5 border-b border-gray-100"
                    >
                      <td className="px-2 py-2"><input type="text" placeholder="Lọc..." value={columnFilters['STT'] || ''} onChange={(e) => handleColumnFilterChange('STT', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-primary" /></td>
                      <td className="px-2 py-2"><input type="text" placeholder="Lọc Tên/Địa chỉ..." value={columnFilters['Tên công trình'] || ''} onChange={(e) => handleColumnFilterChange('Tên công trình', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-primary" /></td>
                      <td className="px-2 py-2"><input type="text" placeholder="Lọc Đại lý..." value={columnFilters['Tên đại lý'] || ''} onChange={(e) => handleColumnFilterChange('Tên đại lý', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-primary" /></td>
                      <td className="px-2 py-2"><input type="text" placeholder="Lọc Mã KH..." value={columnFilters['Mã khách hàng'] || ''} onChange={(e) => handleColumnFilterChange('Mã khách hàng', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-primary" /></td>
                      <td className="px-2 py-2"><input type="text" placeholder="Ok/Nok..." value={columnFilters['Đã gửi cấu hình Nexatus'] || ''} onChange={(e) => handleColumnFilterChange('Đã gửi cấu hình Nexatus', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-primary" /></td>
                      <td className="px-2 py-2"><input type="text" placeholder="Ok/Nok..." value={columnFilters['Đã upload cấu hình Nexatus'] || ''} onChange={(e) => handleColumnFilterChange('Đã upload cấu hình Nexatus', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-primary" /></td>
                      <td className="px-2 py-2"><input type="text" placeholder="Ok/Nok..." value={columnFilters['Đã tích hợp Nexatus'] || ''} onChange={(e) => handleColumnFilterChange('Đã tích hợp Nexatus', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-primary" /></td>
                      <td className="px-2 py-2"><input type="text" placeholder="Ok/Nok..." value={columnFilters['Đã nghiệm thu'] || ''} onChange={(e) => handleColumnFilterChange('Đã nghiệm thu', e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-primary" /></td>
                      <td></td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-400 italic">Đang tải dữ liệu...</td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-400 italic">Không tìm thấy dữ liệu phù hợp</td>
                  </tr>
                ) : (
                  filteredData.map((project) => (
                    <tr 
                      key={project._id || project.STT} 
                      className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                      title={`Tên công trình: ${project['Tên công trình']}\nRemote Subnet: ${project['Remote subnet'] || 'Chưa có'}`}
                    >
                      <td className="px-4 py-4 text-sm font-mono text-gray-400">{project.STT}</td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-900 line-clamp-1">{project['Tên công trình']}</div>
                        <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{project['Địa chỉ']}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {project['Tên đại lý']}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-600">{project['Mã khách hàng']}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={project['Đã gửi cấu hình Nexatus']} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={project['Đã upload cấu hình Nexatus']} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={project['Đã tích hợp Nexatus']} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={project['Đã nghiệm thu']} />
                      </td>
                      <td className="px-4 py-4 text-right flex justify-end gap-1">
                        {project['Link cấu hình'] ? (
                          <a 
                            href={project['Link cấu hình']}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Tải file cấu hình"
                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all flex items-center justify-center"
                          >
                            <Download size={16} />
                          </a>
                        ) : (
                          <button 
                            disabled
                            title="Chưa có link cấu hình"
                            className="p-2 text-gray-200 cursor-not-allowed flex items-center justify-center"
                          >
                            <Download size={16} />
                          </button>
                        )}

                        <button 
                          onClick={() => {
                            setEditingProject(project);
                            setIsModalOpen(true);
                          }}
                          title="Chỉnh sửa công trình"
                          className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleClone(project)}
                          title="Nhân bản công trình"
                          className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-all"
                        >
                          <Copy size={16} />
                        </button>
                        {user.role === 'ADMIN' && (
                          <button 
                            onClick={() => handleDelete(project)}
                            title="Xóa công trình"
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isModalOpen && (
          <ProjectModal 
            user={user}
            project={editingProject}
            onClose={() => {
              setIsModalOpen(false);
              setEditingProject(null);
            }}
            onSave={handleSave}
          />
        )}
        {isLogModalOpen && (
          <LogModal 
            user={user}
            onClose={() => setIsLogModalOpen(false)}
          />
        )}
        {isUserModalOpen && (
          <UserManagementModal 
            currentUser={user}
            onClose={() => setIsUserModalOpen(false)}
          />
        )}
        {isIncidentListOpen && (
          <IncidentListModal 
            currentUser={user}
            projects={data}
            onClose={() => setIsIncidentListOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// COMPONENT: QUẢN LÝ SỰ CỐ
// ============================================================================
function IncidentListModal({ currentUser, projects, onClose }: { currentUser: User; projects: ProjectData[]; onClose: () => void }) {
  const [incidents, setIncidents] = useState<IncidentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingIncident, setEditingIncident] = useState<IncidentData | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); 

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const res = await fetch('/api/incidents', { headers: { 'x-user-role': currentUser.role } });
      const data = await res.json();
      if (currentUser.role === 'AGENCY') {
        setIncidents(data.filter((i: IncidentData) => i['Tên đại lý'] === currentUser.agencyName));
      } else {
        setIncidents(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const incToDelete = incidents.find(i => i._id === id);
    if (!window.confirm("Bạn có chắc chắn muốn xóa sự cố này?")) return;
    try {
      await fetch(`/api/incidents/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user: currentUser.username, 
          action: 'XÓA SỰ CỐ',
          details: incToDelete ? `Xóa sự cố công trình: ${incToDelete['Công trình']}` : 'Xóa sự cố'
        })
      });
      fetchIncidents();
    } catch (error) { console.error(error); }
  };

  const handleExportIncidents = () => {
    const url = currentUser.role === 'AGENCY' 
      ? `/api/export/incidents?agency=${encodeURIComponent(currentUser.agencyName || '')}`
      : `/api/export/incidents`;
    window.open(url, '_blank');
  };

  const filteredIncidents = useMemo(() => {
    if (!searchTerm) return incidents;
    const lower = searchTerm.toLowerCase();
    return incidents.filter(inc => 
      (inc['Công trình'] || '').toLowerCase().includes(lower) ||
      (inc['Mô tả sự cố'] || '').toLowerCase().includes(lower)
    );
  }, [incidents, searchTerm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      
      {!isFormOpen ? (
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[32px] shadow-2xl flex flex-col">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 p-2 rounded-xl text-white"><AlertTriangle size={20} /></div>
              <div>
                <h2 className="text-xl font-serif font-bold text-gray-800">Danh Sách Sự Cố</h2>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Incident Reports</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text"
                  placeholder="Tìm công trình, sự cố..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-full sm:w-64 shadow-sm transition-all"
                />
              </div>

              <button onClick={handleExportIncidents} className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 flex items-center gap-2 transition-colors">
                <Download size={16} /> Export
              </button>

              <button onClick={() => { setEditingIncident(null); setIsFormOpen(true); }} className="px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-xl hover:bg-orange-700 flex items-center gap-2">
                <Plus size={16} /> Thêm Phản Ánh
              </button>
              
              <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-6">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Ngày Giờ</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Công Trình</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Mô Tả</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Kết Quả</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-gray-500">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? <tr><td colSpan={5} className="p-4 text-center text-gray-400">Đang tải...</td></tr> : 
                 filteredIncidents.length === 0 ? <tr><td colSpan={5} className="p-4 text-center text-gray-400">Không có sự cố nào</td></tr> :
                 filteredIncidents.map(inc => (
                  <tr key={inc._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{new Date(inc['Ngày giờ phản ánh']).toLocaleString('vi-VN')}</td>
                    <td className="px-4 py-3 font-medium text-sm">{inc['Công trình']}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{inc['Mô tả sự cố']}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        inc['Kết quả xử lý'] === 'Ok' ? 'bg-green-100 text-green-700' :
                        inc['Kết quả xử lý'] === 'Nok' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                      }`}>{inc['Kết quả xử lý']}</span>
                    </td>
                    <td className="px-4 py-3 text-right flex justify-end gap-1">
                      <button onClick={() => { setEditingIncident(inc); setIsFormOpen(true); }} className="p-1.5 text-gray-400 hover:text-primary bg-gray-50 rounded"><Edit2 size={14}/></button>
                      {(currentUser.role === 'ADMIN' || currentUser.role === 'OPERATION') && (
                        <button onClick={() => handleDelete(inc._id!)} className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 rounded"><Trash2 size={14}/></button>
                      )}
                    </td>
                  </tr>
                 ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : (
        <IncidentForm 
          currentUser={currentUser}
          projects={projects}
          incident={editingIncident}
          onClose={() => setIsFormOpen(false)}
          onSave={async (data: IncidentData) => {
            const isUpdate = !!data._id;
            const actionName = isUpdate ? 'CẬP NHẬT SỰ CỐ' : 'THÊM SỰ CỐ';
            const detailsText = `${isUpdate ? 'Cập nhật' : 'Thêm'} sự cố công trình: ${data['Công trình']}`;

            await fetch('/api/incidents', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                data, 
                user: currentUser.username, 
                action: actionName,
                details: detailsText
              })
            });
            fetchIncidents();
            setIsFormOpen(false);
          }}
        />
      )}
    </div>
  );
}

function IncidentForm({ currentUser, projects, incident, onClose, onSave }: any) {
  const isAgency = currentUser.role === 'AGENCY';
  
  const agencyProjects = isAgency 
    ? projects.filter((p: ProjectData) => p['Tên đại lý'] === currentUser.agencyName)
    : projects;

  const initialImages = Array.isArray(incident?.['Ảnh']) ? incident?.['Ảnh'] : (incident?.['Ảnh'] ? [incident?.['Ảnh']] : []);
  const initialResultImages = Array.isArray(incident?.['Ảnh kết quả']) ? incident?.['Ảnh kết quả'] : (incident?.['Ảnh kết quả'] ? [incident?.['Ảnh kết quả']] : []);

  const [formData, setFormData] = useState<any>(incident ? {
    ...incident,
    'Ảnh': initialImages,
    'Ảnh kết quả': initialResultImages
  } : {
    'Tên đại lý': currentUser.agencyName || '',
    'Công trình': '',
    'Mô tả sự cố': '',
    'Ảnh': [],
    'Ảnh kết quả': [],
    'Ngày giờ phản ánh': '',
    'Kết quả xử lý': 'Chưa xử lý',
    'Nguyên nhân và giải pháp': ''
  });

  const handleMultipleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'Ảnh' | 'Ảnh kết quả') => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const base64Promises = files.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    const base64Images = await Promise.all(base64Promises);
    
    setFormData((prev: any) => ({
      ...prev,
      [field]: [...(prev[field] || []), ...base64Images]
    }));
  };

  const removeImage = (index: number, field: 'Ảnh' | 'Ảnh kết quả') => {
    setFormData((prev: any) => {
      const newArray = [...(prev[field] || [])];
      newArray.splice(index, 1);
      return { ...prev, [field]: newArray };
    });
  };

  return (
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[32px] shadow-2xl flex flex-col">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
        <h2 className="text-lg font-bold">{incident ? 'Cập Nhật Sự Cố' : 'Thêm Phản Ánh Sự Cố'}</h2>
        <button onClick={onClose} className="p-2 text-gray-400 hover:bg-white rounded-full"><X size={20}/></button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="flex-1 overflow-y-auto p-6 space-y-4">
        
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase text-gray-400 ml-1">Công trình *</label>
          <select 
            disabled={!isAgency && !!incident} 
            required 
            value={formData['Công trình']} 
            onChange={e => setFormData({...formData, 'Công trình': e.target.value})}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm disabled:opacity-60"
          >
            <option value="">Chọn công trình...</option>
            {agencyProjects.map((p: ProjectData) => <option key={p.STT} value={p['Tên công trình']}>{p['Tên công trình']}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase text-gray-400 ml-1">Mô tả sự cố *</label>
          <textarea 
            required 
            disabled={!isAgency && !!incident} 
            rows={3} 
            value={formData['Mô tả sự cố']} 
            onChange={e => setFormData({...formData, 'Mô tả sự cố': e.target.value})}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm disabled:opacity-60"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase text-gray-400 ml-1">Ảnh đính kèm từ Đại lý</label>
          {isAgency && (
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={(e) => handleMultipleImageUpload(e, 'Ảnh')} 
              className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100" 
            />
          )}
          {formData['Ảnh'] && formData['Ảnh'].length > 0 && (
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {formData['Ảnh'].map((imgStr: string, idx: number) => (
                <div key={idx} className="relative border border-gray-200 rounded-xl overflow-hidden aspect-square group">
                  <img src={imgStr} alt="Sự cố" className="w-full h-full object-cover" />
                  {isAgency && (
                    <button 
                      type="button" 
                      onClick={() => removeImage(idx, 'Ảnh')} 
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-gray-100 mt-4">
          <h3 className="text-xs font-bold uppercase text-primary mb-3">Phần Dành Cho Bộ Phận Xử Lý</h3>
          <div className="space-y-1.5 mb-4">
            <label className="block text-[10px] font-bold uppercase text-gray-400 ml-1">Kết quả xử lý</label>
            <select 
              disabled={isAgency} 
              value={formData['Kết quả xử lý']} 
              onChange={e => setFormData({...formData, 'Kết quả xử lý': e.target.value})}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm disabled:opacity-60"
            >
              <option value="Chưa xử lý">Chưa xử lý</option>
              <option value="Đang xử lý">Đang xử lý</option>
              <option value="Ok">Ok</option>
              <option value="Nok">Nok</option>
            </select>
          </div>
          
          <div className="space-y-1.5 mb-4">
            <label className="block text-[10px] font-bold uppercase text-gray-400 ml-1">Nguyên nhân và giải pháp</label>
            <textarea 
              disabled={isAgency} 
              rows={3} 
              value={formData['Nguyên nhân và giải pháp']} 
              onChange={e => setFormData({...formData, 'Nguyên nhân và giải pháp': e.target.value})}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm disabled:opacity-60"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase text-gray-400 ml-1">Ảnh kết quả xử lý (Admin / Operation)</label>
            {!isAgency && (
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={(e) => handleMultipleImageUpload(e, 'Ảnh kết quả')} 
                className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
              />
            )}
            {formData['Ảnh kết quả'] && formData['Ảnh kết quả'].length > 0 && (
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                {formData['Ảnh kết quả'].map((imgStr: string, idx: number) => (
                  <div key={idx} className="relative border border-gray-200 rounded-xl overflow-hidden aspect-square group">
                    <img src={imgStr} alt="Kết quả" className="w-full h-full object-cover" />
                    {!isAgency && (
                      <button 
                        type="button" 
                        onClick={() => removeImage(idx, 'Ảnh kết quả')} 
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold">Hủy</button>
          <button type="submit" className="px-6 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-orange-500/20">Lưu Phản Ánh</button>
        </div>
      </form>
    </motion.div>
  );
}

// ============================================================================
// COMPONENT BIỂU ĐỒ PIE CHART
// ============================================================================
function AgencyPieChart({ data }: { data: ProjectData[] }) {
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(p => {
      const agency = p['Tên đại lý'];
      if (agency) counts[agency] = (counts[agency] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); 
  }, [data]);

  if (stats.length === 0) return null;

  const total = stats.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;
  
  const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

  const conicString = stats.map((item, i) => {
    const angle = (item.value / total) * 360;
    const str = `${colors[i % colors.length]} ${currentAngle}deg ${currentAngle + angle}deg`;
    currentAngle += angle;
    return str;
  }).join(', ');

  return (
    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row items-center gap-8">
      <div className="flex flex-col gap-1 md:w-1/3">
        <div className="flex items-center gap-2 mb-1">
          <div className="bg-purple-100 p-1.5 rounded-lg text-purple-600">
            <PieChart size={18} />
          </div>
          <h3 className="text-lg font-serif font-bold text-gray-800">Thống Kê Đại Lý</h3>
        </div>
        <p className="text-xs text-gray-500">Tỉ lệ phân bổ dựa trên {total} công trình đang hiển thị</p>
      </div>
      
      <div className="flex items-center gap-8 w-full justify-around md:justify-start">
        <div 
          style={{ background: `conic-gradient(${conicString})` }} 
          className="w-28 h-28 md:w-32 md:h-32 rounded-full shadow-md shrink-0 border-4 border-white transition-all hover:scale-105"
        />
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm w-full max-w-md">
          {stats.map((item, i) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: colors[i % colors.length] }} />
              <span className="font-medium text-gray-700 truncate max-w-[100px] md:max-w-[150px]" title={item.name}>
                {item.name}
              </span>
              <span className="text-gray-400 font-mono text-xs">({((item.value / total) * 100).toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT QUẢN LÝ USER
// ============================================================================
function UserManagementModal({ currentUser, onClose }: { currentUser: User; onClose: () => void }) {
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState(''); 
  const [role, setRole] = useState('OPERATION');
  const [agencyName, setAgencyName] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { headers: { 'x-user-role': currentUser.role } });
      const data = await res.json();
      setUsersList(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({
          _id: editingId || undefined,
          username,
          password,
          email, 
          role,
          agencyName: role === 'AGENCY' ? agencyName : ''
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setEditingId(''); setUsername(''); setPassword(''); setEmail(''); setRole('OPERATION'); setAgencyName('');
        fetchUsers();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("Lỗi khi lưu User");
    }
  };

  const handleEdit = (u: any) => {
    setEditingId(u._id);
    setUsername(u.username);
    setPassword(u.password);
    setEmail(u.email || ''); 
    setRole(u.role);
    setAgencyName(u.agencyName || '');
  };

  const handleDeleteUser = async (u: any) => {
    if (u.username === 'Admin') return alert("Không thể xóa tài khoản Admin gốc!");
    if (!window.confirm(`Xóa tài khoản: ${u.username}?`)) return;
    try {
      const res = await fetch(`/api/users/${u._id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': currentUser.role }
      });
      if (res.ok) fetchUsers();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[32px] shadow-2xl flex flex-col">
        
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500 p-2 rounded-xl">
              <Users className="text-white w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-gray-800">Quản Lý Người Dùng</h2>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">User Management</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden p-6 flex flex-col gap-6">
          <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-5 gap-4 items-end shrink-0">
            <FormField label="Username" value={username} onChange={setUsername} required />
            <FormField label="Password" value={password} onChange={setPassword} required />
            <FormField label="Email (Nhận Cảnh Báo)" value={email} onChange={setEmail} type="email" />
            
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Vai Trò (Role) *</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                <option value="ADMIN">ADMIN</option>
                <option value="OPERATION">OPERATION</option>
                <option value="AGENCY">AGENCY</option>
              </select>
            </div>

            {role === 'AGENCY' && (
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Đại lý *</label>
                <select value={agencyName} onChange={(e) => setAgencyName(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
                  <option value="">Chọn đại lý...</option>
                  {AGENCIES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            )}

            <div className="md:col-span-full flex justify-end gap-2 mt-2">
              {editingId && (
                <button type="button" onClick={() => {setEditingId(''); setUsername(''); setPassword(''); setEmail('');}} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-200 rounded-lg">
                  Hủy sửa
                </button>
              )}
              <button type="submit" className="px-6 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-500/20">
                {editingId ? 'Cập Nhật User' : 'Thêm User Mới'}
              </button>
            </div>
          </form>

          <div className="flex-1 border border-gray-100 rounded-2xl overflow-auto bg-white relative">
            <table className="w-full text-left">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500">Username</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500">Email</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500">Role</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500">Đại lý</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={5} className="p-4 text-center text-gray-400">Đang tải...</td></tr>
                ) : (
                  usersList.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-semibold">{u.username}</td>
                      <td className="px-4 py-3 text-gray-500 text-sm">{u.email || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold px-2 py-1 rounded bg-gray-100 text-gray-600">{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">{u.agencyName || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleEdit(u)} className="p-1.5 text-gray-400 hover:text-purple-600 mx-1"><Edit2 size={16}/></button>
                        {u.username !== 'Admin' && (
                          <button onClick={() => handleDeleteUser(u)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// COMPONENT NHẬT KÝ
// ============================================================================
function LogModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/logs', {
          headers: { 'x-user-role': user.role }
        });
        const data = await res.json();
        setLogs(data.reverse());
      } catch (error) {
        console.error('Failed to fetch logs', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [user]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-4xl max-h-[80vh] overflow-hidden rounded-[32px] shadow-2xl flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-xl"><Database className="text-white w-5 h-5" /></div>
            <div>
              <h2 className="text-xl font-serif font-bold">Nhật Ký Hoạt Động</h2>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">System Activity Logs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? <div className="text-center py-12">Đang tải...</div> : (
            <div className="space-y-4">
              {logs.map((log, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">{new Date(log.timestamp).toLocaleString('vi-VN')}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">{log.action}</span>
                    </div>
                    <p className="text-sm font-medium mt-1">{log.details}</p>
                  </div>
                  <span className="text-xs font-bold text-gray-600">{log.user}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const lowerStatus = status?.toLowerCase().trim() || '';
  
  let colorClass = 'bg-orange-50 text-orange-600'; 
  let isSuccessIcon = false;

  if (lowerStatus === 'nok' || lowerStatus === 'không') {
    colorClass = 'bg-red-50 text-red-600';
  } else if (lowerStatus === 'ok' || lowerStatus === 'có') {
    colorClass = 'bg-green-50 text-green-600';
    isSuccessIcon = true;
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${colorClass}`}>
      {isSuccessIcon ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
      <span>{status || 'N/A'}</span>
    </div>
  );
}

function ProjectModal({ user, project, onClose, onSave }: { user: User; project: ProjectData | null; onClose: () => void; onSave: (p: ProjectData) => void }) {
  const [formData, setFormData] = useState<any>(project || {
    STT: '', 'Tổng công ty': '', 'Công ty điện lực': '', 'Đơn vị điện lực': '', 'Mã TBA': '', 'Mã xuất tuyến': '', 'Tên công trình': '',
    'Mã khách hàng': '', 'Tên đại lý': user.agencyName || '', 'Địa chỉ': '', 'Listening interface': '', 'Preshared key': '',
    'Local ID': '', 'Remote ID': '', 'Local subnet': '', 'Remote subnet': '', Lat: '', Long: '', 'CSTK DC (kWp)': '',
    'CSTK AC (kW)': '', 'Công suất lắp đặt (kW)': '', 'Công suất tối đa (kW)': '', 'Zero export': 'Không', 'SN Nexatus': '', 'SIM IP tĩnh': '','Router IP tĩnh': '',
    'Nhà sản xuất Inverter': '', 'Inverter No. / Inverter Type': '', 'Mã Logger': '', 'Mã công tơ 2 chiều': '',
    'Đã gửi cấu hình Nexatus': 'Nok', 'Đã upload cấu hình Nexatus': 'Nok', 'Đã tích hợp Nexatus': 'Nok', 'Đã nghiệm thu': 'Nok',
    'Link cấu hình': '' 
  });

  const canEditField = (field: keyof ProjectData | 'Link cấu hình') => {
    if (user.role === 'ADMIN') return true;
    if (user.role === 'OPERATION') return ['Đã gửi cấu hình Nexatus', 'Đã tích hợp Nexatus', 'Link cấu hình'].includes(field as string);
    if (user.role === 'AGENCY') return !['Đã gửi cấu hình Nexatus', 'Đã tích hợp Nexatus', 'Link cấu hình'].includes(field as string);
    return false;
  };

  const isRequired = (field: keyof ProjectData) => ['Tổng công ty', 'Công ty điện lực', 'Đơn vị điện lực', 'Tên công trình', 'Mã khách hàng', 'Tên đại lý', 'Địa chỉ', 'Listening interface', 'Preshared key', 'Local ID', 'Remote ID', 'Local subnet', 'Remote subnet', 'Nhà sản xuất Inverter', 'Mã Logger', 'Mã công tơ 2 chiều'].includes(field as string);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[32px] shadow-2xl flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-xl"><Settings className="text-white w-5 h-5" /></div>
            <div>
              <h2 className="text-xl font-serif font-bold">{!project ? 'Thêm Công Trình Mới' : (project._id ? 'Cập Nhật' : 'Nhân Bản')}</h2>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Project Details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-gray-400"><X size={20} /></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="col-span-full mb-2"><h3 className="text-xs font-bold uppercase text-primary border-b border-primary/10 pb-2">Thông Tin Chung</h3></div>
            
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase text-gray-400 ml-1">Tổng công ty {isRequired('Tổng công ty') && <span className="text-red-400">*</span>}</label>
              <select disabled={!canEditField('Tổng công ty')} value={formData['Tổng công ty'] || ''} onChange={(e) => setFormData({ ...formData, 'Tổng công ty': e.target.value, 'Công ty điện lực': '' })} className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-60" required={isRequired('Tổng công ty')}>
                <option value="">Chọn tổng công ty...</option>
                {CORPORATIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase text-gray-400 ml-1">Công ty điện lực {isRequired('Công ty điện lực') && <span className="text-red-400">*</span>}</label>
              <select disabled={!canEditField('Công ty điện lực') || !formData['Tổng công ty']} value={formData['Công ty điện lực'] || ''} onChange={(e) => setFormData({ ...formData, 'Công ty điện lực': e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-60" required={isRequired('Công ty điện lực')}>
                <option value="">Chọn công ty điện lực...</option>
                {formData['Tổng công ty'] && POWER_COMPANIES[formData['Tổng công ty']]?.map(pc => <option key={pc} value={pc}>{pc}</option>)}
              </select>
            </div>

            <FormField label="Đơn vị điện lực" required={isRequired('Đơn vị điện lực')} disabled={!canEditField('Đơn vị điện lực')} value={formData['Đơn vị điện lực']} onChange={(v: string) => setFormData({ ...formData, 'Đơn vị điện lực': v })} />
            <FormField label="Tên công trình" required={isRequired('Tên công trình')} disabled={!canEditField('Tên công trình')} value={formData['Tên công trình']} onChange={(v: string) => setFormData({ ...formData, 'Tên công trình': v })} />
            <FormField label="Mã khách hàng" required={isRequired('Mã khách hàng')} disabled={!canEditField('Mã khách hàng')} value={formData['Mã khách hàng']} onChange={(v: string) => setFormData({ ...formData, 'Mã khách hàng': v })} />
            
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase text-gray-400 ml-1">Tên đại lý {isRequired('Tên đại lý') && <span className="text-red-400">*</span>}</label>
              <select disabled={!canEditField('Tên đại lý') || user.role === 'AGENCY'} value={formData['Tên đại lý']} onChange={(e) => setFormData({ ...formData, 'Tên đại lý': e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-60" required={isRequired('Tên đại lý')}>
                <option value="">Chọn đại lý...</option>
                {AGENCIES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <FormField label="Địa chỉ" required={isRequired('Địa chỉ')} disabled={!canEditField('Địa chỉ')} value={formData['Địa chỉ']} onChange={(v: string) => setFormData({ ...formData, 'Địa chỉ': v })} />

            <div className="col-span-full mt-4 mb-2"><h3 className="text-xs font-bold uppercase text-primary border-b border-primary/10 pb-2">Thông Số Kỹ Thuật (VPN Profile)</h3></div>
            
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Listening interface {isRequired('Listening interface') && <span className="text-red-400">*</span>}</label>
              <select disabled={!canEditField('Listening interface')} value={formData['Listening interface']} onChange={(e) => setFormData({ ...formData, 'Listening interface': e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm disabled:opacity-60" required={isRequired('Listening interface')}>
                <option value="">Chọn Listening interface...</option>
                {Array.from(new Set(LISTENS)).map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <FormField label="Preshared key" disabled={!canEditField('Preshared key')} value={formData['Preshared key']} onChange={(v: string) => setFormData({ ...formData, 'Preshared key': v })} />
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Local ID {isRequired('Local ID') && <span className="text-red-400">*</span>}</label>
              <select disabled={!canEditField('Local ID')} value={formData['Local ID']} onChange={(e) => setFormData({ ...formData, 'Local ID': e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm disabled:opacity-60" required={isRequired('Local ID')}>
                <option value="">Chọn Local ID...</option>
                {Array.from(new Set(LOCALIDS)).map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <FormField label="Remote ID" disabled={!canEditField('Remote ID')} value={formData['Remote ID']} onChange={(v: string) => setFormData({ ...formData, 'Remote ID': v })} />
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Local subnet {isRequired('Local subnet') && <span className="text-red-400">*</span>}</label>
              <select disabled={!canEditField('Local subnet')} value={formData['Local subnet']} onChange={(e) => setFormData({ ...formData, 'Local subnet': e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm disabled:opacity-60" required={isRequired('Local subnet')}>
                <option value="">Chọn Local subnet...</option>
                {Array.from(new Set(LOCALSUBS)).map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <FormField label="Remote subnet" disabled={!canEditField('Remote subnet')} value={formData['Remote subnet']} onChange={(v: string) => setFormData({ ...formData, 'Remote subnet': v })} />
            
            <div className="col-span-full mt-4 mb-2"><h3 className="text-xs font-bold uppercase text-primary border-b border-primary/10 pb-2">Thông Số Vật lý</h3></div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Lat" disabled={!canEditField('Lat')} value={formData.Lat} onChange={(v: string) => setFormData({ ...formData, Lat: v })} />
              <FormField label="Long" disabled={!canEditField('Long')} value={formData.Long} onChange={(v: string) => setFormData({ ...formData, Long: v })} />
            </div>
            <FormField label="CSTK DC (kWp)" disabled={!canEditField('CSTK DC (kWp)')} value={formData['CSTK DC (kWp)']} onChange={(v: string) => setFormData({ ...formData, 'CSTK DC (kWp)': v })} />
            <FormField label="CSTK AC (kW)" disabled={!canEditField('CSTK AC (kW)')} value={formData['CSTK AC (kW)']} onChange={(v: string) => setFormData({ ...formData, 'CSTK AC (kW)': v })} />
            
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase text-gray-400 ml-1">Zero export</label>
              <select disabled={!canEditField('Zero export')} value={formData['Zero export']} onChange={(e) => setFormData({ ...formData, 'Zero export': e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-60">
                <option value="Có">Có</option>
                <option value="Không">Không</option>
              </select>
            </div>
            
            <FormField label="SN Nexatus" disabled={!canEditField('SN Nexatus')} value={formData['SN Nexatus']} onChange={(v: string) => setFormData({ ...formData, 'SN Nexatus': v })} />
            <FormField label="SIM IP tĩnh" disabled={!canEditField('SIM IP tĩnh')} value={formData['SIM IP tĩnh']} onChange={(v: string) => setFormData({ ...formData, 'SIM IP tĩnh': v })} />
            <FormField label="Router IP tĩnh" disabled={!canEditField('Router IP tĩnh')} value={formData['Router IP tĩnh']} onChange={(v: string) => setFormData({ ...formData, 'Router IP tĩnh': v })} />
            
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Nhà sản xuất Inverter {isRequired('Nhà sản xuất Inverter') && <span className="text-red-400">*</span>}</label>
              <select disabled={!canEditField('Nhà sản xuất Inverter')} value={formData['Nhà sản xuất Inverter']} onChange={(e) => setFormData({ ...formData, 'Nhà sản xuất Inverter': e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm disabled:opacity-60" required={isRequired('Nhà sản xuất Inverter')}>
                <option value="">Chọn Nhà sản xuất Inverter...</option>
                {Array.from(new Set(NSXIVTS)).map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Mã Logger {isRequired('Mã Logger') && <span className="text-red-400">*</span>}</label>
              <select disabled={!canEditField('Mã Logger')} value={formData['Mã Logger']} onChange={(e) => setFormData({ ...formData, 'Mã Logger': e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm disabled:opacity-60" required={isRequired('Mã Logger')}>
                <option value="">Chọn Mã Logger...</option>
                {Array.from(new Set(LOGGERS)).map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Mã công tơ 2 chiều {isRequired('Mã công tơ 2 chiều') && <span className="text-red-400">*</span>}</label>
              <select disabled={!canEditField('Mã công tơ 2 chiều')} value={formData['Mã công tơ 2 chiều']} onChange={(e) => setFormData({ ...formData, 'Mã công tơ 2 chiều': e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm disabled:opacity-60" required={isRequired('Mã công tơ 2 chiều')}>
                <option value="">Chọn Mã công tơ 2 chiều...</option>
                {Array.from(new Set(METERS)).map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>

            <div className="col-span-full mt-4 mb-2"><h3 className="text-xs font-bold uppercase text-primary border-b border-primary/10 pb-2">Trạng Thái Vận Hành & Tệp Tin</h3></div>
            
            <div className="col-span-full mb-2">
              <FormField 
                label="Link File Cấu Hình (Google Drive, Dropbox...)" 
                disabled={!canEditField('Link cấu hình')} 
                value={formData['Link cấu hình']} 
                onChange={(v: string) => setFormData({ ...formData, 'Link cấu hình': v })} 
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase text-gray-400 ml-1">Đã gửi cấu hình Nexatus</label>
              <select disabled={!canEditField('Đã gửi cấu hình Nexatus')} value={formData['Đã gửi cấu hình Nexatus']} onChange={(e) => setFormData({ ...formData, 'Đã gửi cấu hình Nexatus': e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-60">
                <option value="Ok">Ok</option>
                <option value="Nok">Nok</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase text-gray-400 ml-1">Đã upload cấu hình Nexatus</label>
              <select disabled={!canEditField('Đã upload cấu hình Nexatus')} value={formData['Đã upload cấu hình Nexatus']} onChange={(e) => setFormData({ ...formData, 'Đã upload cấu hình Nexatus': e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-60">
                <option value="Ok">Ok</option>
                <option value="Nok">Nok</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase text-gray-400 ml-1">Đã tích hợp Nexatus</label>
              <select disabled={!canEditField('Đã tích hợp Nexatus')} value={formData['Đã tích hợp Nexatus']} onChange={(e) => setFormData({ ...formData, 'Đã tích hợp Nexatus': e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-60">
                <option value="Ok">Ok</option>
                <option value="Nok">Nok</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase text-gray-400 ml-1">Đã nghiệm thu</label>
              <select disabled={!canEditField('Đã nghiệm thu')} value={formData['Đã nghiệm thu']} onChange={(e) => setFormData({ ...formData, 'Đã nghiệm thu': e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-60">
                <option value="Ok">Ok</option>
                <option value="Nok">Nok</option>
              </select>
            </div>
          </div>

          <div className="mt-12 flex gap-4 justify-end">
            <button type="button" onClick={onClose} className="px-8 py-3 rounded-2xl font-semibold text-gray-500 hover:bg-gray-100">Hủy</button>
            <button type="submit" className="px-10 py-3 bg-primary text-white rounded-2xl font-semibold hover:bg-primary-dark flex items-center gap-2"><Save size={18} /><span>Lưu Thay Đổi</span></button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function FormField({ label, value, onChange, disabled, required, type = "text" }: any) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} required={required} className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-60" />
    </div>
  );
}
