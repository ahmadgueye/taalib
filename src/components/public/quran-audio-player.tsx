"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { Loader2, Pause, Play, Repeat, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const listeners = new Set<() => void>();
  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  function getSnapshot(): T {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return defaultValue;
    const parsed = parse(raw);
    return parsed === undefined ? defaultValue : parsed;
  }
  function getServerSnapshot(): T {
    return defaultValue;
  }
  function setStored(next: T) {
    window.localStorage.setItem(key, String(next));
    listeners.forEach((listener) => listener());
  }
  return { subscribe, getSnapshot, getServerSnapshot, setStored };
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

  const reciterId = useSyncExternalStore(
    reciterStore.subscribe,
    reciterStore.getSnapshot,
    reciterStore.getServerSnapshot,
  );
  const [reciters, setReciters] = useState<QuranReciter[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [playerVisible, setPlayerVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedAudioKeyRef = useRef<string | null>(null);
  const lastChapterIdRef = useRef(selectedChapterId);
  const [loopDialogOpen, setLoopDialogOpen] = useState(false);
  // The queue of per-verse audio URLs currently looping and where we are in
  // it — a ref because advancing it happens inside the <audio> "ended"
  // handler and shouldn't itself trigger a re-render.
  const loopQueueRef = useRef<{ urls: string[]; index: number } | null>(null);
  const verseAudioCacheRef = useRef<
    Map<string, { verseKey: string; url: string }[]>
  >(new Map());
  // Only for display ("En boucle : versets X-Y") — the actual playback
  // logic reads loopQueueRef, not this.
  const [loopRange, setLoopRange] = useState<{
    startVerseNumber: number;
    endVerseNumber: number;
  } | null>(null);
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
    loopQueueRef.current = null;
    setLoopRange(null);
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

  async function getVerseAudioList(chapterId: number, recitationId: number) {
    const key = `${chapterId}:${recitationId}`;
    const cached = verseAudioCacheRef.current.get(key);
    if (cached) return cached;
    const res = await fetch(
      `/api/quran/verse-audio/${chapterId}?recitation=${recitationId}`,
    );
    if (!res.ok) throw new Error("Failed to load verse audio");
    const { verses } = (await res.json()) as {
      verses: { verseKey: string; url: string }[];
    };
    verseAudioCacheRef.current.set(key, verses);
    return verses;
  }

  // Loops a verse range by chaining pre-trimmed per-verse audio files (see
  // getVerseAudioUrls in queries.ts — the chapter-wide audio file has no
  // exposed per-verse timestamps to seek within, so this plays short
  // individual files back-to-back instead of seeking one continuous file).
  async function playLoop(
    chapterId: number,
    startVerseNumber: number,
    endVerseNumber: number,
  ) {
    const audio = audioRef.current;
    if (!audio) return;
    setAudioLoading(true);
    try {
      const verses = await getVerseAudioList(chapterId, reciterId);
      const urls = verses
        .slice(startVerseNumber - 1, endVerseNumber)
        .map((v) => v.url);
      if (urls.length === 0) return;

      loadedAudioKeyRef.current = null;
      loopQueueRef.current = { urls, index: 0 };
      setLoopRange({ startVerseNumber, endVerseNumber });
      audio.src = urls[0];
      // If the user pauses/quits the loop before this settles, pause()
      // rejects the pending play() with a benign AbortError — nothing to
      // surface (same race as the one handled in the "ended" handler).
      await audio.play().catch(() => {});
    } finally {
      setAudioLoading(false);
    }
  }

  function stopLoop() {
    loopQueueRef.current = null;
    setLoopRange(null);
    audioRef.current?.pause();
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || audioLoading) return;
    if (isPlaying) {
      audio.pause();
      return;
    }
    if (loopQueueRef.current) {
      await audio.play();
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
    loopQueueRef.current = null;
    setLoopRange(null);
    setPlayerVisible(false);
  }

  // If the user manually navigates to another surah while audio is playing
  // (dropdown selection or the prev/next-surah buttons), continue playback
  // into that surah rather than leaving stale audio running. Compares
  // against the last-seen chapter id (not a "have I run once" boolean) so
  // this stays correct under StrictMode's dev-only mount→cleanup→mount
  // replay — a boolean flipped inside the effect body would no longer
  // block the second (real) invocation.
  useEffect(() => {
    if (lastChapterIdRef.current === selectedChapterId) return;
    lastChapterIdRef.current = selectedChapterId;
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
                {loopRange ? (
                  <button
                    type="button"
                    className="truncate text-xs text-muted-foreground hover:underline"
                    onClick={stopLoop}
                  >
                    En boucle : versets {loopRange.startVerseNumber}–
                    {loopRange.endVerseNumber} (quitter)
                  </button>
                ) : (
                  <button
                    type="button"
                    className="truncate text-xs text-muted-foreground hover:underline"
                    onClick={() => setDialogOpen(true)}
                  >
                    {reciters.find((r) => r.id === reciterId)?.name ??
                      "Changer de récitateur"}
                  </button>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Répéter une plage de versets"
                aria-pressed={loopRange !== null}
                onClick={() => setLoopDialogOpen(true)}
              >
                <Repeat className={loopRange ? "text-primary" : undefined} />
              </Button>
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

      {selectedChapter && (
        <LoopRangeDialog
          // Remounts with fresh start/end state whenever the dialog opens
          // (or the surah changes while open) instead of resetting via an
          // effect — see https://react.dev/learn/you-might-not-need-an-effect.
          key={loopDialogOpen ? `open-${selectedChapterId}` : "closed"}
          open={loopDialogOpen}
          onOpenChange={setLoopDialogOpen}
          versesCount={selectedChapter.versesCount}
          onConfirm={(start, end) => {
            setLoopDialogOpen(false);
            playLoop(selectedChapterId, start, end);
          }}
        />
      )}

      <audio
        ref={audioRef}
        className="hidden"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => {
          const queue = loopQueueRef.current;
          const audio = audioRef.current;
          if (queue && audio) {
            const nextIndex = (queue.index + 1) % queue.urls.length;
            loopQueueRef.current = { ...queue, index: nextIndex };
            audio.src = queue.urls[nextIndex];
            // Fire-and-forget: on very short verses (e.g. "الم"), the next
            // `ended` can supersede this play() before its promise settles,
            // which rejects with a benign AbortError — nothing to surface.
            audio.play().catch(() => {});
            return;
          }
          setIsPlaying(false);
        }}
      />
    </>
  );

  return { isPlaying, audioLoading, handlePlayButtonClick, elements };
}

function LoopRangeDialog({
  open,
  onOpenChange,
  versesCount,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versesCount: number;
  onConfirm: (startVerseNumber: number, endVerseNumber: number) => void;
}) {
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(Math.min(3, versesCount));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Répéter une plage de versets</DialogTitle>
          <DialogDescription>
            La sourate en cours sera lue en boucle entre ces deux versets.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Du verset</span>
          <Select
            value={String(start)}
            onValueChange={(value) => value && setStart(Number(value))}
          >
            <SelectTrigger size="sm" className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: versesCount }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">au verset</span>
          <Select
            value={String(end)}
            onValueChange={(value) => value && setEnd(Number(value))}
          >
            <SelectTrigger size="sm" className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: versesCount }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          disabled={end < start}
          onClick={() => onConfirm(start, end)}
        >
          Lancer la boucle
        </Button>
      </DialogContent>
    </Dialog>
  );
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
