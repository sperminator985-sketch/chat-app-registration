import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { avatarIcon, nickBgClass, NickColor } from '@/data/chat';

type AvatarProps = {
  avatar?: number;
  avatarUrl?: string | null;
  color: NickColor;
  size?: number;
  className?: string;
};

const Avatar = ({ avatar, avatarUrl, color, size = 26, className }: AvatarProps) => {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        style={{ width: size, height: size }}
        className={cn('inline-block shrink-0 border-2 border-foreground/40 object-cover', className)}
      />
    );
  }

  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center border-2 border-foreground/40',
        nickBgClass[color],
        className,
      )}
    >
      <Icon name={avatarIcon(avatar)} size={Math.round(size * 0.6)} className="text-background" />
    </span>
  );
};

export default Avatar;
