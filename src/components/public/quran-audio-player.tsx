"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { Loader2, Pause, Play, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { QuranChapter, QuranReciter } from "@/lib/quran/types";

const DEFAULT_RECITER_ID = 7; // Mishary Rashid al-`Afasy

// Small localStorage-backed store — same shape as quran-reader.tsx's, kept
// local here since the reciter preference is only relevant to this player.
function createPersistedState<T>(
  key: string,
  defaultValue: T,
  parse: (raw: string) => T | undefined,
) {
  function getSnapshot(): T {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return defaultValue;
    const parsed = parse(raw);
    return parsed === undefined ? defaultValue : parsed;
  }
  function setStored(next: T) {
    window.localStorage.setItem(key, String(next));
  }
  return { getSnapshot, setStored };
}

const reciterStore = createPersistedState<number>(
  "deenshare:quran-reciter-id",
  DEFAULT_RECITER_ID,
  (raw) => {
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : undefined;
  },
);

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Owns all reciter/playback state and renders the modal, the floating
// player and the hidden <audio> element (as `elements`, mount once anywhere
// in the tree). The actual trigger button is left to the caller — see
// `QuranPlayButton` below — so it can be placed wherever the UI needs it
// (e.g. under the surah's translated title) without losing playback state
// when that spot scrolls out of the DOM.
export function useQuranAudioPlayer({
  chapters,
  selectedChapterId,
}: {
  chapters: QuranChapter[];
  selectedChapterId: number;
}) {
  const chaptersById = useMemo(
    () => new Map(chapters.map((c) => [c.id, c])),
    [chapters],
  );
  const selectedChapter = chaptersById.get(selectedChapterId);

  // Read once: this only needs to reflect the persisted value at mount, the
  // same way quran-reader.tsx's other settings do.
  const [reciterId, setReciterId] = useState(() => reciterStore.getSnapshot());
  const [reciters, setReciters] = useState<QuranReciter[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [playerVisible, setPlayerVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedAudioKeyRef = useRef<string | null>(null);
  const isInitialChapterRender = useRef(true);
  // The floating player uses `fixed` positioning, which needs to escape
  // whatever ancestor it's mounted under: if that ancestor has a
  // backdrop-filter (e.g. the reader's sticky toolbar uses backdrop-blur),
  // it creates a new containing block for `fixed` descendants — anchoring
  // them to that ancestor's box instead of the viewport. Portaling to
  // <body> sidesteps that, but document isn't available during SSR, so the
  // portal target is only resolved once mounted on the client.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    fetch("/api/quran/recitations")
      .then((res) => res.json())
      .then((data: { recitations: QuranReciter[] }) => {
        setReciters(data.recitations);
      });
  }, []);

  async function playChapterAudio(chapterId: number, recitationId: number) {
    const audio = audioRef.current;
    if (!audio) return;
    setAudioLoading(true);
    try {
      const res = await fetch(
        `/api/quran/chapter-audio/${chapterId}?recitation=${recitationId}`,
      );
      if (!res.ok) throw new Error("Failed to load audio");
      const { audioUrl } = (await res.json()) as { audioUrl: string };
      audio.src = audioUrl;
      loadedAudioKeyRef.current = `${chapterId}:${recitationId}`;
      await audio.play();
    } finally {
      setAudioLoading(false);
    }
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || audioLoading) return;
    if (isPlaying) {
      audio.pause();
      return;
    }
    const key = `${selectedChapterId}:${reciterId}`;
    if (loadedAudioKeyRef.current === key) {
      await audio.play();
    } else {
      await playChapterAudio(selectedChapterId, reciterId);
    }
  }

  function handlePlayButtonClick() {
    if (!playerVisible) {
      setDialogOpen(true);
      return;
    }
    togglePlayback();
  }

  function handlePickReciter(reciter: QuranReciter) {
    reciterStore.setStored(reciter.id);
    setReciterId(reciter.id);
    setDialogOpen(false);
    setPlayerVisible(true);
    playChapterAudio(selectedChapterId, reciter.id);
  }

  function handleSeek(value: number | readonly number[]) {
    const audio = audioRef.current;
    const next = Array.isArray(value) ? value[0] : value;
    if (!audio || next === undefined) return;
    audio.currentTime = next;
    setCurrentTime(next);
  }

  function closePlayer() {
    audioRef.current?.pause();
    setPlayerVisible(false);
  }

  // If the user manually navigates to another surah while audio is playing
  // (dropdown selection or the prev/next-surah buttons), continue playback
  // into that surah rather than leaving stale audio running.
  useEffect(() => {
    if (isInitialChapterRender.current) {
      isInitialChapterRender.current = false;
      return;
    }
    const loadedChapterId = loadedAudioKeyRef.current
      ? Number(loadedAudioKeyRef.current.split(":")[0])
      : null;
    if (isPlaying && loadedChapterId !== selectedChapterId) {
      playChapterAudio(selectedChapterId, reciterId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChapterId]);

  const elements = (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choisir un récitateur</DialogTitle>
            <DialogDescription>
              La sourate sera lue par la voix sélectionnée.
            </DialogDescription>
          </DialogHeader>
          <div className="-mx-1 max-h-80 space-y-1 overflow-y-auto px-1">
            {reciters.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                Chargement des récitateurs…
              </p>
            )}
            {reciters.map((reciter) => (
              <button
                key={reciter.id}
                type="button"
                onClick={() => handlePickReciter(reciter)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent",
                  reciter.id === reciterId && "bg-accent font-medium",
                )}
              >
                <span>{reciter.name}</span>
                {reciter.style && (
                  <span className="text-xs text-muted-foreground">
                    {reciter.style}
                  </span>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {playerVisible &&
        mounted &&
        createPortal(
          <div className="fixed right-4 bottom-20 z-45 w-72 rounded-xl border bg-popover p-3 shadow-lg ring-1 ring-foreground/10 sm:right-6 sm:bottom-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {selectedChapter
                    ? `${selectedChapter.id}. ${selectedChapter.nameSimple}`
                    : ""}
                </p>
                <button
                  type="button"
                  className="truncate text-xs text-muted-foreground hover:underline"
                  onClick={() => setDialogOpen(true)}
                >
                  {reciters.find((r) => r.id === reciterId)?.name ??
                    "Changer de récitateur"}
                </button>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Fermer le lecteur"
                onClick={closePlayer}
              >
                <XIcon />
              </Button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={isPlaying ? "Mettre en pause" : "Lire"}
                disabled={audioLoading}
                onClick={togglePlayback}
              >
                {audioLoading ? (
                  <Loader2 className="animate-spin" />
                ) : isPlaying ? (
                  <Pause />
                ) : (
                  <Play />
                )}
              </Button>
              <span className="w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={Math.min(currentTime, duration || 1)}
                min={0}
                max={duration || 1}
                step={1}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span className="w-9 shrink-0 text-xs text-muted-foreground tabular-nums">
                {formatTime(duration)}
              </span>
            </div>
          </div>,
          document.body,
        )}

      <audio
        ref={audioRef}
        className="hidden"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setIsPlaying(false)}
      />
    </>
  );

  return { isPlaying, audioLoading, handlePlayButtonClick, elements };
}

export function QuranPlayButton({
  isPlaying,
  audioLoading,
  onClick,
  className,
}: {
  isPlaying: boolean;
  audioLoading: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={audioLoading}
      onClick={onClick}
      className={className}
    >
      {audioLoading ? (
        <Loader2 className="animate-spin" />
      ) : isPlaying ? (
        <Pause />
      ) : (
        <Play />
      )}
      {audioLoading ? "Chargement…" : isPlaying ? "Pause" : "Écouter"}
    </Button>
  );
}
