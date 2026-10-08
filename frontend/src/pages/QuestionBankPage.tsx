import React, { useCallback, useEffect, useState } from 'react';
import interviewQuestionApi from '../api/interviewQuestion';
import { InterviewQuestion } from '../types/interviewQuestion';

const PAGE_SIZE = 10;

export const QuestionBankPage: React.FC = () => {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [search, setSearch] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState('');
  const [active, setActive] = useState('');
  const [page, setPage] = useState(0);

  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await interviewQuestionApi.list({
        search: search.trim() || undefined,
        difficultyLevel: difficultyLevel || undefined,
        active:
          active === ''
            ? undefined
            : active === 'true',
        page,
        size: PAGE_SIZE,
      });

      setQuestions(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (error) {
      console.error('Lỗi khi tải ngân hàng câu hỏi:', error);
      setQuestions([]);
      setTotalPages(0);
      setTotalElements(0);
      setErrorMessage('Không thể tải ngân hàng câu hỏi.');
    } finally {
      setIsLoading(false);
    }
  }, [search, difficultyLevel, active, page]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handleDifficultyChange = (value: string) => {
    setDifficultyLevel(value);
    setPage(0);
  };

  const handleActiveChange = (value: string) => {
    setActive(value);
    setPage(0);
  };

  const getDifficultyLabel = (value: string) => {
    switch (value) {
      case 'EASY':
        return 'Dễ';
      case 'MEDIUM':
        return 'Trung bình';
      case 'HARD':
        return 'Khó';
      default:
        return value || '-';
    }
  };

  const getActiveLabel = (value: boolean) => {
    return value ? 'Đang hoạt động' : 'Không hoạt động';
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h2>Ngân hàng câu hỏi phỏng vấn</h2>
          <p>
            Quản lý và tìm kiếm các câu hỏi được sử dụng trong quá trình phỏng vấn
          </p>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-wrap">
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Tìm kiếm câu hỏi..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="filter-select">
          <label>Độ khó:</label>
          <select
            value={difficultyLevel}
            onChange={(e) => handleDifficultyChange(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="EASY">Dễ</option>
            <option value="MEDIUM">Trung bình</option>
            <option value="HARD">Khó</option>
          </select>
        </div>

        <div className="filter-select">
          <label>Trạng thái:</label>
          <select
            value={active}
            onChange={(e) => handleActiveChange(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Không hoạt động</option>
          </select>
        </div>
      </div>

      {errorMessage && (
        <div className="toast-notification error">
          <i className="bi bi-exclamation-circle-fill"></i>
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Câu hỏi</th>
              <th>Danh mục</th>
              <th>Độ khó</th>
              <th>Vị trí tuyển dụng</th>
              <th>Tiêu chí</th>
              <th>Trạng thái</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ textAlign: 'center', padding: '30px' }}
                >
                  <i className="bi bi-arrow-repeat spin"></i>
                  {' '}Đang tải dữ liệu...
                </td>
              </tr>
            ) : questions.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    textAlign: 'center',
                    padding: '30px',
                    color: '#64748b',
                  }}
                >
                  Không tìm thấy câu hỏi nào phù hợp.
                </td>
              </tr>
            ) : (
              questions.map((question) => (
                <tr key={question.id}>
                  <td>
                    <strong>{question.questionText}</strong>
                  </td>

                  <td>{question.category || '-'}</td>

                  <td>
                    <span className="tag">
                      {getDifficultyLabel(question.difficultyLevel)}
                    </span>
                  </td>

                  <td>{question.jobTitle || '-'}</td>

                  <td>{question.criterionName || '-'}</td>

                  <td>
                    <span
                      className={`status-pill ${
                        question.active ? 'active' : 'inactive'
                      }`}
                    >
                      {getActiveLabel(question.active)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '16px',
        }}
      >
        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Tổng số: {totalElements} câu hỏi
        </span>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn btn-outline"
            disabled={page === 0 || isLoading}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            <i className="bi bi-chevron-left"></i>
          </button>

          <span style={{ minWidth: '80px', textAlign: 'center' }}>
            {totalPages === 0 ? 0 : page + 1} / {totalPages}
          </span>

          <button
            className="btn btn-outline"
            disabled={
              totalPages === 0 ||
              page >= totalPages - 1 ||
              isLoading
            }
            onClick={() =>
              setPage((current) =>
                Math.min(totalPages - 1, current + 1)
              )
            }
          >
            <i className="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionBankPage;