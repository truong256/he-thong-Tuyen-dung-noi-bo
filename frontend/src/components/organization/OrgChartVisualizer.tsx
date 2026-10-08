import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ListTree,
  Network,
} from 'lucide-react';
import { Department } from '../../types/organization';

interface OrgChartVisualizerProps {
  departments: Department[];
  onAddSubDepartment: (parentId: number) => void;
  onEditDepartment: (dept: Department) => void;
  onToggleStatus: (id: number) => void;
  onDeleteDepartment?: (dept: Department) => void;
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
  onDeleteDepartment,
  canEdit,
}) => {
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  const [highlightKeyword, setHighlightKeyword] = useState('');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'tree' | 'outline'>('tree');

  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Drag-to-pan states
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // Build tree structure from flat departments list
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

  // Auto-expand ancestor nodes if a child matches highlightKeyword
  useEffect(() => {
    if (!highlightKeyword.trim()) return;
    const kw = highlightKeyword.toLowerCase().trim();

    const matchedIds = new Set<number>();
    const findMatches = (node: TreeNode, parents: number[]) => {
      const match =
        node.name.toLowerCase().includes(kw) ||
        node.code.toLowerCase().includes(kw) ||
        (node.managerName && node.managerName.toLowerCase().includes(kw));
      if (match) {
        parents.forEach((pId) => matchedIds.add(pId));
      }
      node.children.forEach((c) => findMatches(c, [...parents, node.id]));
    };

    treeRoots.forEach((root) => findMatches(root, []));

    if (matchedIds.size > 0) {
      setCollapsedIds((prev) => {
        const next = new Set(prev);
        matchedIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  }, [highlightKeyword, treeRoots]);

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

  // Zoom controls
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(1.4, Number((prev + 0.1).toFixed(1))));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(0.6, Number((prev - 0.1).toFixed(1))));
  const handleZoomReset = () => {
    setZoomLevel(1);
    if (viewportRef.current && canvasRef.current) {
      const viewport = viewportRef.current;
      const canvas = canvasRef.current;
      viewport.scrollLeft = (canvas.scrollWidth - viewport.clientWidth) / 2;
    }
  };

  // Auto-fit on mount or window resize
  useEffect(() => {
    const handleResize = () => {
      if (viewportRef.current && canvasRef.current && viewMode === 'tree') {
        const vpWidth = viewportRef.current.clientWidth - 24;
        const canvasWidth = canvasRef.current.scrollWidth;
        if (canvasWidth > vpWidth && vpWidth > 0) {
          const idealZoom = Math.max(0.6, Math.min(1, Number((vpWidth / canvasWidth).toFixed(2))));
          setZoomLevel(idealZoom);
        } else {
          setZoomLevel(1);
        }
      }
    };

    const timer = setTimeout(handleResize, 200);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [departments, viewMode]);

  const handleFitToScreen = () => {
    if (!viewportRef.current || !canvasRef.current) return;
    const vpWidth = viewportRef.current.clientWidth - 24;
    const canvasWidth = canvasRef.current.scrollWidth;
    if (canvasWidth > vpWidth && canvasWidth > 0) {
      const idealZoom = Math.max(0.6, Math.min(1, Number((vpWidth / canvasWidth).toFixed(2))));
      setZoomLevel(idealZoom);
    } else {
      setZoomLevel(1);
    }
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewMode !== 'tree' || !viewportRef.current) return;
    // Don't start drag if clicking on buttons or inputs
    if ((e.target as HTMLElement).closest('button, input, select, a')) return;

    setIsPanning(true);
    setPanStart({
      x: e.pageX,
      y: e.pageY,
      scrollLeft: viewportRef.current.scrollLeft,
      scrollTop: viewportRef.current.scrollTop,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !viewportRef.current) return;
    e.preventDefault();
    const dx = e.pageX - panStart.x;
    const dy = e.pageY - panStart.y;
    viewportRef.current.scrollLeft = panStart.scrollLeft - dx;
    viewportRef.current.scrollTop = panStart.scrollTop - dy;
  };

  const handleMouseUp = () => setIsPanning(false);

  // Render node in Hierarchical Tree View
  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsedIds.has(node.id);
    const isHighlighted =
      highlightKeyword.trim() !== '' &&
      (node.name.toLowerCase().includes(highlightKeyword.toLowerCase().trim()) ||
        node.code.toLowerCase().includes(highlightKeyword.toLowerCase().trim()) ||
        (node.managerName &&
          node.managerName.toLowerCase().includes(highlightKeyword.toLowerCase().trim())));

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

            {node.managerName ? (
              <div className="node-manager-info" title={`Trưởng đơn vị: ${node.managerName}`}>
                <Shield size={13} className="manager-icon" />
                <span className="manager-name">{node.managerName}</span>
              </div>
            ) : (
              <div className="node-manager-info unassigned" title="Chưa phân công người phụ trách">
                <Shield size={13} className="manager-icon text-muted" />
                <span className="manager-name text-muted italic">Chưa phân công</span>
              </div>
            )}

            <div className="node-metrics-bar">
              <span className="node-metric-chip" title="Số lượng nhân sự hiện tại">
                <Users size={12} />
                <strong>{node.employeeCount || 0}</strong> nhân sự
              </span>

              {hasChildren && (
                <span className="node-metric-chip children-count" title="Số đơn vị cấp dưới trực thuộc">
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

              {onDeleteDepartment && (
                <button
                  type="button"
                  className="node-action-btn btn-delete text-danger"
                  onClick={() => onDeleteDepartment(node)}
                  title="Xóa phòng ban"
                  aria-label={`Xóa phòng ban ${node.name}`}
                  style={{ color: '#ef4444' }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          )}

          {/* Collapse/Expand Toggle Button */}
          {hasChildren && (
            <button
              type="button"
              className="node-collapse-toggle"
              onClick={() => toggleCollapse(node.id)}
              aria-label={isCollapsed ? `Mở rộng ${node.name}` : `Thu gọn ${node.name}`}
              title={isCollapsed ? 'Nhấn để mở rộng đơn vị con' : 'Nhấn để thu gọn'}
            >
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>

        {/* Children branch with perfectly aligned CSS tree connectors */}
        {hasChildren && !isCollapsed && (
          <div className="org-tree-children">
            <div className="org-tree-connector-stem" />
            <div className="org-tree-children-container">
              {node.children.map((child) => renderTreeNode(child, depth + 1))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render node in Outline / Compact List View (Ideal for mobile and quick hierarchy overview)
  const renderOutlineNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsedIds.has(node.id);
    const isHighlighted =
      highlightKeyword.trim() !== '' &&
      (node.name.toLowerCase().includes(highlightKeyword.toLowerCase().trim()) ||
        node.code.toLowerCase().includes(highlightKeyword.toLowerCase().trim()) ||
        (node.managerName &&
          node.managerName.toLowerCase().includes(highlightKeyword.toLowerCase().trim())));

    return (
      <div className="outline-tree-item" key={node.id}>
        <div
          className={`outline-node-row depth-${Math.min(depth, 3)} ${
            !node.active ? 'node-inactive' : ''
          } ${isHighlighted ? 'node-highlighted' : ''}`}
          style={{ '--outline-depth': depth } as React.CSSProperties}
          data-testid={`org-node-${node.id}`}
        >
          {/* Collapse/Expand Icon or Leaf Bullet */}
          <div className="outline-toggle-slot">
            {hasChildren ? (
              <button
                type="button"
                className="outline-toggle-btn"
                onClick={() => toggleCollapse(node.id)}
                title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
                aria-label={isCollapsed ? `Mở rộng ${node.name}` : `Thu gọn ${node.name}`}
              >
                {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
              </button>
            ) : (
              <span className="outline-leaf-bullet" />
            )}
          </div>

          {/* Department Code Badge */}
          <span className="node-code-badge">{node.code}</span>

          {/* Name & Manager */}
          <div className="outline-info-col">
            <span className="outline-dept-name font-semibold" title={node.name}>
              {node.name}
            </span>
            {node.managerName && (
              <span className="outline-dept-manager" title={`Trưởng đơn vị: ${node.managerName}`}>
                <Shield size={12} className="manager-icon" />
                <span>{node.managerName}</span>
              </span>
            )}
          </div>

          {/* Metrics */}
          <div className="outline-metrics-col">
            <span className="node-metric-chip" title="Số lượng nhân sự">
              <Users size={12} />
              <strong>{node.employeeCount || 0}</strong>
            </span>
            {hasChildren && (
              <span className="node-metric-chip children-count" title="Số đơn vị con">
                <Layers size={12} />
                {node.children.length}
              </span>
            )}
            <span
              className={`status-dot ${node.active ? 'status-active' : 'status-inactive'}`}
              title={node.active ? 'Đang hoạt động' : 'Tạm ngưng'}
            />
          </div>

          {/* Actions */}
          {canEdit && (
            <div className="outline-actions-col">
              <button
                type="button"
                className="btn-icon-subtle"
                onClick={() => onAddSubDepartment(node.id)}
                title="Thêm phòng ban trực thuộc"
                aria-label={`Thêm con cho ${node.name}`}
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                className="btn-icon-subtle"
                onClick={() => onEditDepartment(node)}
                title="Chỉnh sửa"
                aria-label={`Chỉnh sửa ${node.name}`}
              >
                <Edit2 size={14} />
              </button>
              <button
                type="button"
                className={`btn-icon-subtle ${node.active ? 'text-amber' : 'text-success'}`}
                onClick={() => onToggleStatus(node.id)}
                title={node.active ? 'Tạm ngưng' : 'Kích hoạt'}
                aria-label={node.active ? `Ngưng ${node.name}` : `Kích hoạt ${node.name}`}
              >
                <Power size={14} />
              </button>
              {onDeleteDepartment && (
                <button
                  type="button"
                  className="btn-icon-subtle text-danger"
                  onClick={() => onDeleteDepartment(node)}
                  title="Xóa phòng ban"
                  aria-label={`Xóa ${node.name}`}
                  style={{ color: '#ef4444' }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Outline Children Container */}
        {hasChildren && !isCollapsed && (
          <div className="outline-children-list">
            {node.children.map((child) => renderOutlineNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="org-chart-wrapper" data-testid="org-chart-visualizer">
      {/* Visualizer Toolbar */}
      <div className="org-chart-toolbar">
        {/* Left: View Mode Toggle & Legend */}
        <div className="toolbar-left">
          <div className="view-mode-toggle-group" role="group" aria-label="Chế độ hiển thị">
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'tree' ? 'active' : ''}`}
              onClick={() => setViewMode('tree')}
              title="Xem sơ đồ cây phân nhánh trực quan"
            >
              <Network size={14} />
              <span>Sơ đồ cây</span>
            </button>
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'outline' ? 'active' : ''}`}
              onClick={() => setViewMode('outline')}
              title="Xem danh sách cây phân cấp dạng danh mục"
            >
              <ListTree size={14} />
              <span>Cây phân cấp</span>
            </button>
          </div>

          <div className="chart-legend">
            <span className="legend-item" title="Cấp 1: Ban Tổng Giám Đốc điều hành">
              <span className="legend-color-box root-color" /> Ban Điều Hành
            </span>
            <span className="legend-item" title="Cấp 2: Khối chuyên môn / Ban chức năng">
              <span className="legend-color-box division-color" /> Khối / Ban chức năng
            </span>
            <span className="legend-item" title="Cấp 3+: Phòng ban trực thuộc khối">
              <span className="legend-color-box department-color" /> Phòng ban trực thuộc
            </span>
          </div>
        </div>

        {/* Right: Search, Zoom Controls & Expand/Collapse */}
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

          {viewMode === 'tree' && (
            <div className="chart-zoom-controls">
              <button
                type="button"
                className="btn btn-outline btn-sm zoom-btn"
                onClick={handleZoomOut}
                title="Thu nhỏ sơ đồ"
                aria-label="Thu nhỏ"
                disabled={zoomLevel <= 0.6}
              >
                <ZoomOut size={13} />
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm zoom-level-btn"
                onClick={handleZoomReset}
                title="Đặt lại mức thu phóng 100%"
                aria-label="Đặt lại thu phóng"
              >
                <RotateCcw size={12} />
                <span>{Math.round(zoomLevel * 100)}%</span>
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm zoom-btn"
                onClick={handleZoomIn}
                title="Phóng to sơ đồ"
                aria-label="Phóng to"
                disabled={zoomLevel >= 1.4}
              >
                <ZoomIn size={13} />
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm fit-btn"
                onClick={handleFitToScreen}
                title="Tự động thu phóng vừa vặn khung nhìn"
              >
                <span>Vừa màn hình</span>
              </button>
            </div>
          )}

          <div className="chart-control-buttons">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={expandAll}
              title="Mở rộng toàn bộ cây"
            >
              <Maximize2 size={13} />
              <span>Mở rộng tất cả</span>
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={collapseAll}
              title="Thu gọn toàn bộ cây"
            >
              <Minimize2 size={13} />
              <span>Thu gọn tất cả</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewport Container */}
      {viewMode === 'tree' ? (
        <div
          className={`org-chart-viewport ${isPanning ? 'is-panning' : ''}`}
          ref={viewportRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="org-chart-canvas"
            ref={canvasRef}
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
            }}
          >
            <div className="org-tree-root-container">
              {treeRoots.map((root) => renderTreeNode(root, 0))}
            </div>
          </div>
        </div>
      ) : (
        /* Outline / Compact Tree List Mode */
        <div className="org-outline-viewport">
          <div className="org-outline-container">
            {treeRoots.map((root) => renderOutlineNode(root, 0))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgChartVisualizer;
