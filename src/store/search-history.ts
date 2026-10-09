import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SearchItem {
  value: string;
  time: number;
}

export interface SearchHistoryState {
  keyword: string;
  items: SearchItem[];
}

export interface SearchHistoryAction {
  add: (value: string) => void;
  delete: (item: SearchItem) => void;
  clear: () => void;
}

export const useSearchHistory = create<SearchHistoryState & SearchHistoryAction>()(
  persist(
    (set, get) => ({
      keyword: "",
      items: [],
      add: value => {
        const { items } = get();
        const newItem = { value, time: Date.now() };

        if (items.some(i => i.value === value)) {
          set({ keyword: value, items: [newItem, ...items.filter(i => i.value !== value)] });
        } else {
          set({ keyword: value, items: [newItem, ...items] });
        }
      },
      delete: item => set(state => ({ items: state.items.filter(i => i.value !== item.value) })),
      clear: () => set({ keyword: "", items: [] }),
    }),
    {
      name: "search-history",
      // 仅持久化搜索历史列表。
      // keyword 是「当前搜索词」这个瞬时状态（同时是 /search 结果页的数据源、导航栏输入框初值），
      // 一旦被持久化，重启应用后输入框会残留上次的搜索词、搜索页也会直接展示旧结果。
      partialize: state => ({ items: state.items }),
      // 老版本的持久化数据里含 keyword，merge 时显式丢弃，
      // 保证升级后「第一次」启动就是干净的（否则要等到第二次启动才生效）。
      merge: (persisted, current) => ({
        ...current,
        items: (persisted as SearchHistoryState | undefined)?.items ?? current.items,
      }),
    },
  ),
);
