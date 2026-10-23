import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, Edit2, Trash2, Copy } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import requisitionApi, { extractApiErrorMessage } from '../api/requisition';
import { Requisition } from '../types/requisition';
import { PageHeader } from '../components/common/PageHeader';
import { Pagination } from '../components/common';
import '../styles/requisitions.css';

export const RequisitionManagementPage: React.FC = () => {
  const { hasPermission, hasAnyRole } = useAuth();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const pageFromUrl = parseInt(searchParams.get('page') || '1', 10);
  const sizeFromUrl = parseInt(searchParams.get('size') || '10', 10);
  const searchParam = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || 'ALL';

  const currentPage = Number.isFinite(pageFromUrl) && pageFromUrl > 0 ? pageFromUrl : 1;
  const pageSize = [10, 20, 50].includes(sizeFromUrl) ? sizeFromUrl : 10;

  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const reqRes = await requisitionApi.list({
        search: searchParam.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        page: currentPage - 1,
        size: pageSize,
      });

      setRequisitions(reqRes?.content || []);
      setTotalElements(reqRes?.totalElements || 0);
      setTotalPages(reqRes?.totalPages || 1);
    } catch (err: any) {
      showToast(extractApiErrorMessage(err, 'Không thể tải danh sách.'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [searchParam, statusFilter, currentPage, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (req: Requisition) => {
    if (!window.confirm(`Bạn có chắc muốn xóa "${req.title}"?`)) return;
    try {
      await requisitionApi.delete(req.id);
      showToast('Đã xóa bản nháp.');
      loadData();
    } catch (err: any) {
      showToast(extractApiErrorMessage(err, 'Không thể xóa.'), 'error');
    }
  };

  const handleClone = async (req: Requisition) => {
    try {
      const cloned = await requisitionApi.clone(req.id);
      showToast(`Đã sao chép thành công bản nháp: ${cloned.requisitionCode}`);
      loadData();
    } catch (err: any) {
      showToast(extractApiErrorMessage(err, 'Không thể sao chép.'), 'error');
    }
  };

  return (
    <div className="req-container">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <PageHeader title="Yêu cầu Tuyển dụng" subtitle="Quản lý phiếu yêu cầu tuyển dụng" />

      <div className="req-card">
        {isLoading ? (
          <div>Đang tải danh sách...</div>
        ) : requisitions.length === 0 ? (
          <div>Không có dữ liệu.</div>
        ) : (
          <table className="req-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tiêu đề</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {requisitions.map((req) => (
                <tr key={req.id}>
                  <td><strong>{req.requisitionCode}</strong></td>
                  <td>{req.title}</td>
                  <td>{req.status}</td>
                  <td>
                    {req.status === 'DRAFT' && (
                      <button onClick={() => handleDelete(req)}>Xóa</button>
                    )}
                    <button onClick={() => handleClone(req)}>Sao chép</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalElements}
          pageSize={pageSize}
          onPageChange={(p) => setSearchParams({ page: String(p) })}
          onPageSizeChange={(s) => setSearchParams({ size: String(s), page: '1' })}
        />
      </div>
    </div>
  );
};

export default RequisitionManagementPage;