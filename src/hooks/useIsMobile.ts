import { useEffect, useState } from 'react';

/** Mismo corte que el prefijo `md:` de Tailwind (768 px). */
const QUERY = '(max-width: 767px)';

/** true en pantallas de celular; se actualiza al girar el equipo o cambiar el tamaño de la ventana. */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => window.matchMedia(QUERY).matches);
  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const onChange = () => setMobile(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return mobile;
}
