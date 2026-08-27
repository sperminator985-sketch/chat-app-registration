import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { isServerDown, onServerStatus } from '@/lib/api';

const ServerDownBanner = () => {
  const [down, setDown] = useState(isServerDown());

  useEffect(() => onServerStatus(setDown), []);

  if (!down) return null;

  return (
    <div className="sticky top-0 z-[60] border-b-2 border-foreground/35 bg-primary px-5 py-3 text-primary-foreground">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3">
        <Icon name="TriangleAlert" size={18} className="shrink-0" />
        <p className="text-[0.78rem] font-semibold uppercase tracking-[0.08em] md:text-[0.85rem]">
          Свет в общаге мигает: сервер временно не отвечает. Чат и вход недоступны — скоро починим.
        </p>
      </div>
    </div>
  );
};

export default ServerDownBanner;
