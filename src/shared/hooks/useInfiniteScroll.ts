// src/hooks/useInfiniteScroll.ts
import { useState, useEffect, useCallback, useRef } from "react";

interface UseInfiniteScrollOptions {
  initialBatchSize?: number;
  incrementSize?: number;
  threshold?: number;
}

export function useInfiniteScroll<T>(
  items: T[],
  options: UseInfiniteScrollOptions = {}
) {
  const {
    initialBatchSize = 20,
    incrementSize = 20,
    threshold = 200,
  } = options;

  const [displayCount, setDisplayCount] = useState(initialBatchSize);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastItemRef = useRef<HTMLElement | null>(null);

  // 表示するアイテム
  const visibleItems = items.slice(0, displayCount);

  // 次のバッチをロードする関数
  const loadMore = useCallback(() => {
    if (displayCount >= items.length) {
      setHasMore(false);
      return;
    }

    setDisplayCount((prev) => Math.min(prev + incrementSize, items.length));
  }, [displayCount, items.length, incrementSize]);

  // 最後のアイテムを監視するref callback
  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (!node) return;

      lastItemRef.current = node;

      if (observer.current) {
        observer.current.disconnect();
      }

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            loadMore();
          }
        },
        {
          rootMargin: `0px 0px ${threshold}px 0px`,
        }
      );

      observer.current.observe(node);
    },
    [hasMore, loadMore, threshold]
  );

  // アイテムリストが変更されたら状態をリセット
  useEffect(() => {
    setDisplayCount(initialBatchSize);
    setHasMore(items.length > initialBatchSize);
  }, [items, initialBatchSize]);

  // アンマウント時にObserverをクリーンアップ
  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, []);

  return {
    visibleItems,
    hasMore,
    loadMore,
    lastElementRef,
  };
}
