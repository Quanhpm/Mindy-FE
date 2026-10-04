'use client';

import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { type Course, courses, readCartIds } from '../data/courses';

const storageKey = 'mindy-ocean-preview-cart';
type CartContextValue = {
  items: Course[];
  ready: boolean;
  addCourse: (id: string) => void;
  removeCourse: (id: string) => void;
};
const CartContext = createContext<CartContextValue | null>(null);

export function CartPreviewProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      setIds(readCartIds(sessionStorage.getItem(storageKey)));
    } catch {
      // Browsers without storage still support the in-memory preview cart.
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(ids));
    } catch {
      // Storage can be unavailable in private/embedded browsers.
    }
  }, [ids, ready]);

  function addCourse(id: string) {
    if (!ready || !courses.some((course) => course.id === id)) return;
    setIds((current) => (current.includes(id) ? current : [...current, id]));
  }
  function removeCourse(id: string) {
    setIds((current) => current.filter((item) => item !== id));
  }
  const items = ids.flatMap((id) => courses.filter((course) => course.id === id));
  return (
    <CartContext.Provider value={{ items, ready, addCourse, removeCourse }}>
      {children}
    </CartContext.Provider>
  );
}

export function usePreviewCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('Preview cart requires CartPreviewProvider');
  return context;
}
