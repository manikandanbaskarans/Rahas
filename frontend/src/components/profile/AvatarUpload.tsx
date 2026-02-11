interface AvatarUploadProps {
  name: string;
  avatarUrl: string | null | undefined;
  size?: number;
  editable?: boolean;
  onAvatarChange?: (url: string) => void;
}

export function AvatarUpload({
  name,
  avatarUrl,
  size = 80,
  editable = false,
  onAvatarChange,
}: AvatarUploadProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const bgColors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500',
    'bg-pink-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-rose-500',
  ];
  const colorIndex = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % bgColors.length;

  return (
    <div className="relative inline-block">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className={`${bgColors[colorIndex]} rounded-full flex items-center justify-center text-white font-bold`}
          style={{ width: size, height: size, fontSize: size * 0.35 }}
        >
          {initials}
        </div>
      )}
      {editable && (
        <button
          onClick={() => {
            const url = prompt('Enter avatar URL:');
            if (url && onAvatarChange) onAvatarChange(url);
          }}
          className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs hover:bg-primary/80 transition-colors"
        >
          +
        </button>
      )}
    </div>
  );
}
