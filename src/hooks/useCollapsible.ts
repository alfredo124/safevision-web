import { useCallback, useState } from 'react';
import { isCompactScreen } from './useIsMobile';

/**
 * Panel plegable que recuerda la elección en este equipo (localStorage).
 * Sin elección guardada: plegado en celular (vertical u horizontal), desplegado en PC.
 */
export function useCollapsible(key: string): [boolean, () => void] {
  const storageKey = `safevision_plegado_${key}`;
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) return saved === '1';
    } catch { /* sin almacenamiento: valor por defecto */ }
    return isCompactScreen();
  });
  const toggle = useCallback(() => {
    setCollapsed(value => {
      try { localStorage.setItem(storageKey, value ? '0' : '1'); } catch { /* sin almacenamiento */ }
      return !value;
    });
  }, [storageKey]);
  return [collapsed, toggle];
}
