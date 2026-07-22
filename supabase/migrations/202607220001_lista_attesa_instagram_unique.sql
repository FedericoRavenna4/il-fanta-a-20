create unique index if not exists lista_attesa_instagram_normalized_unique
on public.lista_attesa (
  lower(trim(leading '@' from trim(instagram)))
);
