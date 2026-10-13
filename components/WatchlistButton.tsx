'use client';

import {
  addWatchlistItem,
  removeFromWatchlist,
} from '@/lib/actions/watchlist.actions';
import { Star, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { interpolate } from '@/lib/i18n';
import { useLanguage } from './LanguageProvider';

const WatchlistButton = ({
  symbol,
  company,
  isInWatchlist,
  showTrashIcon = false,
  type = 'button',
  onWatchlistChange,
}: WatchlistButtonProps) => {
  const { dictionary } = useLanguage();
  const copy = dictionary.watchlist;
  const [added, setAdded] = useState<boolean>(!!isInWatchlist);
  const [pending, setPending] = useState(false);

  const [previousFollowed, setPreviousFollowed] = useState(isInWatchlist);
  if (previousFollowed !== isInWatchlist) {
    setPreviousFollowed(isInWatchlist);
    setAdded(!!isInWatchlist);
  }

  const toggleWatchlist = async (nextAdded: boolean) => {
    const result = nextAdded
      ? await addWatchlistItem(symbol, company)
      : await removeFromWatchlist(symbol);

    if (result.success) {
      toast.success(nextAdded ? copy.added : copy.removed, {
        description: interpolate(
          nextAdded ? copy.addedDescription : copy.removedDescription,
          { company }
        ),
      });

      onWatchlistChange?.(symbol, nextAdded);
      return true;
    }

    toast.error(result.message || copy.updateFailed);
    return false;
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (pending) return;

    const previous = added;
    const nextAdded = !added;
    setAdded(nextAdded);
    setPending(true);

    try {
      const success = await toggleWatchlist(nextAdded);
      if (!success) setAdded(previous);
    } catch (error) {
      setAdded(previous);
      toast.error(copy.updateFailed, {
        description:
          error instanceof Error ? error.message : copy.tryAgain,
      });
    } finally {
      setPending(false);
    }
  };

  if (type === 'icon') {
    return (
      <button
        title={
          added
            ? interpolate(copy.removeSymbol, { symbol })
            : interpolate(copy.addSymbol, { symbol })
        }
        aria-label={
          added
            ? interpolate(copy.removeSymbol, { symbol })
            : interpolate(copy.addSymbol, { symbol })
        }
        className={`watchlist-icon-btn ${added ? 'watchlist-icon-added' : ''}`}
        disabled={pending}
        aria-pressed={added}
        aria-busy={pending}
        onClick={handleClick}
      >
        {showTrashIcon && added ? <Trash2 size={18} /> : <Star size={18} fill={added ? 'currentColor' : 'none'} />}
      </button>
    );
  }

  return (
    <button
      className={`watchlist-btn ${added ? 'watchlist-remove' : ''}`}
      disabled={pending}
      aria-pressed={added}
      aria-busy={pending}
      onClick={handleClick}
    >
      {added ? <Trash2 size={18} /> : <Star size={18} />}
      <span>{added ? copy.remove : copy.add}</span>
    </button>
  );
};

export default WatchlistButton;
