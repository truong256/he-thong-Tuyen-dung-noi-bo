import React, { useState, useMemo } from 'react';
import {
  Users,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Power,
  Shield,
  Layers,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Department } from '../../types/organization';

interface OrgChartVisualizerProps {
  departments: Department[];
  onAddSubDepartment: (parentId: number) => void;
  onEditDepartment: (dept: Department) => void;
  onToggleStatus: (id: number) => void;
  canEdit: boolean;
}

interface TreeNode extends Department {
  children: TreeNode[];
}

export const OrgChartVisualizer: React.FC<OrgChartVisualizerProps> = ({
  departments,
  onAddSubDepartment,
  onEditDepartment,
  onToggleStatus,
  canEdit,
}) => {
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  const [highlightKeyword, setHighlightKeyword] = useState('');

  // Build tree from flat departments list
  const treeRoots = useMemo(() => {
    const nodeMap = new Map<number, TreeNode>();
    departments.forEach((d) => {
      nodeMap.set(d.id, { ...d, children: [] });
    });

    const roots: TreeNode[] = [];
    nodeMap.forEach((node) => {
      if (node.parentDepartmentId && nodeMap.has(node.parentDepartmentId)) {
        nodeMap.get(node.parentDepartmentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [departments]);

  const toggleCollapse = (id: number) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => setCollapsedIds(new Set());
  const collapseAll = () => {
    const ids = new Set<number>();
    departments.forEach((d) => ids.add(d.id));
    setCollapsedIds(ids);
  };

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsedIds.has(node.id);
    const isHighlighted =
      highlightKeyword.trim() !== '' &&
      (node.name.toLowerCase().includes(highlightKeyword.toLowerCase()) ||
        node.code.toLowerCase().includes(highlightKeyword.toLowerCase()) ||
        (node.managerName && node.managerName.toLowerCase().includes(highlightKeyword.toLowerCase())));

    return (
      <div className="org-tree-branch" key={node.id}>
        <div
          className={`org-chart-node depth-${Math.min(depth, 3)} ${
            !node.active ? 'node-inactive' : ''
          } ${isHighlighted ? 'node-highlighted' : ''}`}
          data-testid={`org-node-${node.id}`}
        >
          {/* Card Header / Badge */}
          <div className="node-top-bar">
            <span className="node-code-badge">{node.code}</span>
            <div className="node-status-indicator">
              <span
                className={`status-dot ${node.active ? 'status-active' : 'status-inactive'}`}
                title={node.active ? 'Đang hoạt động' : 'Tạm ngưng hoạt động'}
              />
              <span className="status-label">{node.active ? 'Hoạt động' : 'Ngưng'}</span>
            </div>
          </div>

          {/* Node Body */}
          <div className="node-content">
            <h4 className="node-title" title={node.name}>
              {node.name}
            </h4>

            {node.managerName && (
              <div className="node-manager-info" title={`Trưởng đơn vị: ${node.managerName}`}>
                <Shield size={13} className="manager-icon" />
                <span className="manager-name">{node.managerName}</span>
              </div>
            )}

            <div className="node-metrics-bar">
              <span className="node-metric-chip" title="Số lượng nhân sự hiện tại">
                <Users size={12} />
                <strong>{node.employeeCount || 0}</strong> nhân sự
              </span>

              {hasChildren && (
                <span className="node-metric-chip children-count" title="Số đơn vị cấp dưới">
                  <Layers size={12} />
                  {node.children.length} đơn vị con
                </span>
              )}
            </div>
          </div>

          {/* Node Action Footer */}
          {canEdit && (
            <div className="node-footer-actions">
              <button
                type="button"
                className="node-action-btn btn-add-sub"
                onClick={() => onAddSubDepartment(node.id)}
                title="Thêm phòng ban trực thuộc"
                aria-label={`Thêm phòng ban trực thuộc ${node.name}`}
              >
                <Plus size={13} />
                <span>Thêm con</span>
              </button>

              <button
                type="button"
                className="node-action-btn btn-edit"
                onClick={() => onEditDepartment(node)}
                title="Chỉnh sửa thông tin phòng ban"
                aria-label={`Chỉnh sửa ${node.name}`}
              >
                <Edit2 size={13} />
              </button>

              <button
                type="button"
                className={`node-action-btn btn-toggle ${node.active ? 'active-color' : 'inactive-color'}`}
                onClick={() => onToggleStatus(node.id)}
                title={node.active ? 'Tạm ngưng hoạt động' : 'Kích hoạt lại'}
                aria-label={node.active ? `Ngưng hoạt động ${node.name}` : `Kích hoạt lại ${node.name}`}
              >
                <Power size={13} />
              </button>
            </div>
          )}

          {/* Collapse/Expand Toggle Button */}
          {hasChildren && (
            <button
              type="button"
              className="node-collapse-toggle"
              onClick={() => toggleCollapse(node.id)}
              aria-label={isCollapsed ? `Mở rộng ${node.name}` : `Thu gọn ${node.name}`}
              title={isCollapsed ? 'Nhấn để mở rộng' : 'Nhấn để thu gọn'}
            >
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>

        {/* Children branch with connecting visual lines */}
        {hasChildren && !isCollapsed && (
          <div className="org-tree-children">
            <div className="org-tree-connector-stem" />
            <div className="org-tree-children-container">
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="org-chart-wrapper" data-testid="org-chart-visualizer">
      {/* Visualizer Toolbar */}
      <div className="org-chart-toolbar">
        <div className="toolbar-left">
          <div className="chart-legend">
            <span className="legend-item">
              <span className="legend-color-box root-color" /> Ban Điều Hành
            </span>
            <span className="legend-item">
              <span className="legend-color-box division-color" /> Khối / Ban chức năng
            </span>
            <span className="legend-item">
              <span className="legend-color-box department-color" /> Phòng ban trực thuộc
            </span>
          </div>
        </div>

        <div className="toolbar-right">
          <div className="chart-search-box">
            <input
              type="text"
              placeholder="Lọc nổi bật theo tên/mã/trưởng đơn vị..."
              value={highlightKeyword}
              onChange={(e) => setHighlightKeyword(e.target.value)}
              className="chart-search-input"
              aria-label="Tìm kiếm trong sơ đồ tổ chức"
            />
          </div>

          <div className="chart-control-buttons">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={expandAll}
              title="Mở rộng toàn bộ cây"
            >
              <Maximize2 size={14} />
              <span>Mở rộng tất cả</span>
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={collapseAll}
              title="Thu gọn toàn bộ cây"
            >
              <Minimize2 size={14} />
              <span>Thu gọn tất cả</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tree Canvas */}
      <div className="org-chart-canvas">
        <div className="org-tree-root-container">
          {treeRoots.map((root) => renderNode(root, 0))}
        </div>
      </div>
    </div>
  );
};

export default OrgChartVisualizer;
