import { useEffect, useState } from "react";
import { isFavorite, subscribeFavorites, toggleFavorite } from "@/lib/favorites";
import { toast } from "sonner";

export function FavoriteButton({ id, name, className = "" }: { id: string; name: string; className?: string }) {
  const [fav, setFav] = useState(false);

  useEffect(() => {
    setFav(isFavorite(id));
    return subscribeFavorites(() => setFav(isFavorite(id)));
  }, [id]);

  const onClick = () => {
    const now = toggleFavorite(id);
    toast.success(now ? `Added "${name}" to favorites` : `Removed "${name}" from favorites`);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={fav}
      aria-label={fav ? `Remove ${name} from favorites` : `Add ${name} to favorites`}
      title={fav ? "Remove from favorites" : "Add to favorites"}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
        fav
          ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          : "border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:text-amber-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="m12 17.27 6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
      {fav ? "Saved" : "Save"}
    </button>
  );
}
