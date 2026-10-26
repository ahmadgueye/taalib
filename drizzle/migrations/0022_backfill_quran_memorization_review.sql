-- Custom SQL migration file, put your code below! --

-- Backfill: verses already "maîtrisé" before spaced repetition existed had
-- no review schedule. Enter them at box 1, due tomorrow, instead of leaving
-- them permanently invisible to the review cycle.
UPDATE quran_memorization
SET review_box = 1,
    next_review_at = now() + interval '1 day'
WHERE status = 'maitrise' AND review_box IS NULL;