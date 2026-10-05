import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Users,
  ChevronRight,
  Search,
  Filter,
  Layers,
} from 'lucide-react';
import { JobTitle, JobTitleLevel, LEVEL_METADATA } from '../../types/jobTitle';
import { Department } from '../../types/organization';

interface CareerMatrixVisualizerProps {
  jobTitles: JobTitle[];
  departments: Department[];
  onSelectJobTitle: (jt: JobTitle) => void;
}

export const CareerMatrixVisualizer: React.FC<CareerMatrixVisualizerProps> = ({
  jobTitles,
  departments,
  onSelectJobTitle,
}) => {
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [matrixSearch, setMatrixSearch] = useState('');

  // Level progression order
  const levelOrder: JobTitleLevel[] = [
    'INTERN',
    'JUNIOR',
    'MIDDLE',
    'SENIOR',
    'LEAD',
    'MANAGER',
    'DIRECTOR',
    'EXECUTIVE',
  ];

  // Filter job titles for matrix
  const filteredTitles = useMemo(() => {
    return jobTitles.filter((jt) => {
      const matchDept = selectedDeptId === 'ALL' || jt.departmentId === Number(selectedDeptId);
      const matchSearch =
        !matrixSearch.trim() ||
        jt.title.toLowerCase().includes(matrixSearch.toLowerCase().trim()) ||
        jt.code.toLowerCase().includes(matrixSearch.toLowerCase().trim());
      return matchDept && matchSearch;
    });
  }, [jobTitles, selectedDeptId, matrixSearch]);

  // Group by level
  const groupedByLevel = useMemo(() => {
    const map: Record<JobTitleLevel, JobTitle[]> = {
      INTERN: [],
      JUNIOR: [],
      MIDDLE: [],
      SENIOR: [],
      LEAD: [],
      MANAGER: [],
      DIRECTOR: [],
      EXECUTIVE: [],
    };

    filteredTitles.forEach((jt) => {
      if (map[jt.level]) {
        map[jt.level].push(jt);
      }
    });

    return map;
  }, [filteredTitles]);

  return (
    <div className="jt-matrix-container">
      {/* Header Info & Controls */}
      <div className="jt-matrix-header">
        <div className="jt-matrix-header-info">
          <div className="jt-matrix-badge">
            <TrendingUp size={16} />
            <span>Lộ trình Năng lực & Khung Cấp bậc Doanh nghiệp</span>
          </div>
          <h3>Ma trận Bậc chức danh (Career Ladder & Competency Matrix)</h3>
          <p>
            Trực quan hóa cấu trúc thăng tiến nghề nghiệp theo 8 cấp bậc chuẩn quốc tế, giúp chuẩn hóa dải đãi ngộ và lộ trình phát triển nội bộ.
          </p>
        </div>

        {/* Matrix Filters */}
        <div className="jt-matrix-filters">
          <div className="jt-matrix-search-box">
            <Search size={16} className="jt-search-icon" />
            <input
              type="text"
              placeholder="Lọc chức danh trong ma trận..."
              value={matrixSearch}
              onChange={(e) => setMatrixSearch(e.target.value)}
            />
          </div>

          <div className="jt-matrix-select-wrap">
            <Filter size={16} />
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
            >
              <option value="ALL">Tất cả phòng ban</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Matrix Horizontal Level Steps */}
      <div className="jt-matrix-steps-overview">
        {levelOrder.map((lvl, index) => {
          const count = groupedByLevel[lvl].length;
          const meta = LEVEL_METADATA[lvl];
          return (
            <div key={lvl} className={`jt-step-pill ${count > 0 ? 'has-data' : ''}`}>
              <span className="step-num">{index + 1}</span>
              <span className="step-label">{meta.shortLabel}</span>
              <span className="step-count">{count}</span>
              {index < levelOrder.length - 1 && <ChevronRight size={14} className="step-arrow" />}
            </div>
          );
        })}
      </div>

      {/* Grid Columns for Each Level */}
      <div className="jt-matrix-columns-grid">
        {levelOrder.map((lvl, idx) => {
          const list = groupedByLevel[lvl];
          const meta = LEVEL_METADATA[lvl];

          return (
            <div key={lvl} className="jt-matrix-column">
              <div className="jt-col-header" style={{ borderTopColor: meta.badgeText }}>
                <div className="jt-col-header-top">
                  <span className="jt-col-level-num">Bậc {idx + 1}</span>
                  <span className="jt-col-count">{list.length} vị trí</span>
                </div>
                <h4 className="jt-col-title" title={meta.label}>
                  {meta.shortLabel}
                </h4>
              </div>

              <div className="jt-col-cards-list">
                {list.length === 0 ? (
                  <div className="jt-col-empty">
                    <span>Chưa có chức danh ở bậc này</span>
                  </div>
                ) : (
                  list.map((jt) => (
                    <div
                      key={jt.id}
                      className={`jt-matrix-card ${!jt.active ? 'inactive-card' : ''}`}
                      onClick={() => onSelectJobTitle(jt)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onSelectJobTitle(jt);
                      }}
                    >
                      <div className="jt-card-top-row">
                        <span className="jt-card-code">{jt.code}</span>
                        {jt.openRequisitions > 0 && (
                          <span className="jt-card-hiring-pill" title="Đang tuyển">
                            +{jt.openRequisitions} tuyển
                          </span>
                        )}
                      </div>

                      <h5 className="jt-card-title">{jt.title}</h5>

                      <div className="jt-card-dept-tag">
                        <Layers size={12} />
                        <span>{jt.departmentName}</span>
                      </div>

                      <div className="jt-card-bottom-row">
                        <span className="jt-card-salary">
                          {jt.salaryRangeDisplay || 'Thỏa thuận'}
                        </span>
                        <span className="jt-card-headcount" title="Số lượng nhân sự hiện tại">
                          <Users size={12} /> {jt.currentHeadcount}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CareerMatrixVisualizer;
