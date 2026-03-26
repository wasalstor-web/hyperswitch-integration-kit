-- السماح بحالة skipped عند عدم ضبط MESSAGE_GATEWAY_URL (لا يُسجَّل كـ sent خطأً)
do $$
declare
  conname text;
begin
  select c.conname into conname
  from pg_constraint c
  join pg_class t on c.conrelid = t.oid
  join pg_namespace n on t.relnamespace = n.oid
  where n.nspname = 'public'
    and t.relname = 'message_outbox'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) like '%queued%'
    and pg_get_constraintdef(c.oid) like '%failed%';
  if conname is not null then
    execute format('alter table public.message_outbox drop constraint %I', conname);
  end if;
end $$;

alter table public.message_outbox
  add constraint message_outbox_status_check
  check (status in ('queued', 'sent', 'failed', 'skipped'));
