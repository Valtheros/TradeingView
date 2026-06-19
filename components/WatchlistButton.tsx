'use client';

import {
  addWatchlistItem,
  removeFromWatchlist,
} from '@/lib/actions/watchlist.actions';
import { Star, Trash2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const WatchlistButton = ({
  symbol,
  company,
  isInWatchlist,
  showTrashIcon = false,
  type = 'button',
  onWatchlistChange,
}: WatchlistButtonProps) => {
  const [added, setAdded] = useState<boolean>(!!isInWatchlist);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setAdded(!!isInWatchlist);
  }, [isInWatchlist]);

  const label = useMemo(() => {
    if (type === 'icon') return added ? '' : '';
    return added ? 'Remove from Watchlist' : 'Add to Watchlist';
  }, [added, type]);

  const toggleWatchlist = async (nextAdded: boolean) => {
    const result = nextAdded
      ? await addWatchlistItem(symbol, company)
      : await removeFromWatchlist(symbol);

    if (result.success) {
      toast.success(nextAdded ? 'Added to Watchlist' : 'Removed from Watchlist', {
        description: `${company} ${
          nextAdded ? 'added to' : 'removed from'
        } your watchlist`,
      });

      onWatchlistChange?.(symbol, nextAdded);
      return true;
    }

    toast.error(result.message || 'Unable to update watchlist');
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
      toast.error('Unable to update watchlist', {
        description:
          error instanceof Error ? error.message : 'Please try again.',
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
            ? `Remove ${symbol} from watchlist`
            : `Add ${symbol} to watchlist`
        }
        aria-label={
          added
            ? `Remove ${symbol} from watchlist`
            : `Add ${symbol} to watchlist`
        }
        className={`watchlist-icon-btn ${added ? 'watchlist-icon-added' : ''}`}
        disabled={pending}
        onClick={handleClick}
      >
        <Star fill={added ? 'currentColor' : 'none'} />
      </button>
    );
  }

  return (
    <button
      className={`watchlist-btn ${added ? 'watchlist-remove' : ''}`}
      disabled={pending}
      onClick={handleClick}
    >
      {showTrashIcon && added ? <Trash2 /> : null}
      <span>{label}</span>
    </button>
  );
};

export default WatchlistButton;
