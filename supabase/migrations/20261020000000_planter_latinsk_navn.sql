-- Latinsk navn for planter som er gjenkjent fra bilde, men ikke finnes i plantelisten i appen.
alter table planter.planter add column latinsk_navn text check (length(latinsk_navn) <= 120);
