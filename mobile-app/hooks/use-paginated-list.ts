/**
 * 分页加载 Hook
 * 
 * 支持：
 * - 初始加载
 * - 下拉刷新
 * - 上拉加载更多（无限滚动）
 * - 搜索过滤
 */
import { useState, useCallback, useRef } from 'react';
import errorLogger from '@/lib/error-logger';

const DEFAULT_PAGE_SIZE = 20;

interface UsePaginatedListOptions<T> {
  /** 数据获取函数 */
  fetchFn: (params: { limit: number; offset: number; search?: string }) => Promise<{ data: T[]; total: number }>;
  /** 每页数量 */
  pageSize?: number;
  /** 模块名称（用于日志） */
  module?: string;
}

interface UsePaginatedListReturn<T> {
  /** 数据列表 */
  data: T[];
  /** 总数 */
  total: number;
  /** 是否正在加载 */
  loading: boolean;
  /** 是否正在刷新 */
  refreshing: boolean;
  /** 是否正在加载更多 */
  loadingMore: boolean;
  /** 是否还有更多数据 */
  hasMore: boolean;
  /** 错误信息 */
  error: string | null;
  /** 初始加载 */
  loadData: (searchText?: string) => Promise<void>;
  /** 下拉刷新 */
  onRefresh: () => void;
  /** 加载更多 */
  onLoadMore: () => void;
  /** 重置 */
  reset: () => void;
}

export function usePaginatedList<T>({
  fetchFn,
  pageSize = DEFAULT_PAGE_SIZE,
  module = 'PaginatedList',
}: UsePaginatedListOptions<T>): UsePaginatedListReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const currentSearchRef = useRef<string>('');
  const offsetRef = useRef(0);
  const isLoadingRef = useRef(false);

  const loadData = useCallback(async (searchText?: string) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    
    try {
      setLoading(true);
      setError(null);
      currentSearchRef.current = searchText || '';
      offsetRef.current = 0;

      const result = await fetchFn({
        limit: pageSize,
        offset: 0,
        search: searchText || undefined,
      });

      const list = result.data || [];
      setData(list);
      setTotal(result.total || list.length);
      setHasMore(list.length >= pageSize);
      offsetRef.current = list.length;
    } catch (err: any) {
      errorLogger.error(module, 'Load data failed', err);
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
      isLoadingRef.current = false;
    }
  }, [fetchFn, pageSize, module]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(currentSearchRef.current);
  }, [loadData]);

  const onLoadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMore || loadingMore) return;
    isLoadingRef.current = true;
    setLoadingMore(true);

    try {
      const result = await fetchFn({
        limit: pageSize,
        offset: offsetRef.current,
        search: currentSearchRef.current || undefined,
      });

      const list = result.data || [];
      setData(prev => [...prev, ...list]);
      setTotal(result.total || (data.length + list.length));
      setHasMore(list.length >= pageSize);
      offsetRef.current += list.length;
    } catch (err: any) {
      errorLogger.error(module, 'Load more failed', err);
    } finally {
      setLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [fetchFn, pageSize, hasMore, loadingMore, data.length, module]);

  const reset = useCallback(() => {
    setData([]);
    setTotal(0);
    setLoading(true);
    setError(null);
    setHasMore(true);
    offsetRef.current = 0;
    currentSearchRef.current = '';
  }, []);

  return {
    data,
    total,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    loadData,
    onRefresh,
    onLoadMore,
    reset,
  };
}
