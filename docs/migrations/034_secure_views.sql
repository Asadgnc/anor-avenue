-- 034_secure_views.sql
-- GÜVENLİK DÜZELTMESİ (8 Temmuz 2026 — teslim öncesi denetim bulgusu)
--
-- Sorun: accounting_ledger ve guest_loyalty_balance view'leri SECURITY DEFINER
-- olarak oluşturulmuştu ve anon (giriş yapmamış herkes) + authenticated rollerine
-- açıktı. Bu, RLS'i atlayarak otelin finans kayıtlarının dışarıdan okunabilmesi
-- demekti. İki view kodda hiç kullanılmıyor — erişimi kapatmak hiçbir şeyi bozmaz.
--
-- rooms_with_effective_price guest-site için anon SELECT gerektirir; alttaki
-- rooms/room_types tablolarında zaten herkese açık SELECT politikası olduğundan
-- security_invoker moduna almak davranışı değiştirmez, sadece güvenli hale getirir.

-- 1) Finansal view'lerden anon/authenticated erişimini tamamen kaldır
revoke all on public.accounting_ledger from anon, authenticated;
revoke all on public.guest_loyalty_balance from anon, authenticated;

-- 2) Üç view'i de "sorgulayanın yetkisiyle çalış" (security_invoker) moduna al —
--    böylece alttaki tabloların RLS politikaları uygulanır
alter view public.accounting_ledger set (security_invoker = true);
alter view public.guest_loyalty_balance set (security_invoker = true);
alter view public.rooms_with_effective_price set (security_invoker = true);

-- 3) rooms_with_effective_price: sadece okumaya izin ver (yazma grant'ları gereksiz)
revoke insert, update, delete, truncate, references, trigger
  on public.rooms_with_effective_price from anon, authenticated;

-- 4) Trigger fonksiyonu dışarıdan çağrılamasın (advisor uyarısı — sertleştirme)
revoke execute on function public.notify_admin_panel_change() from anon, authenticated;

-- 5) KOLON KORUMASI: receptionist rooms tablosunu güncelleyebiliyor (oda durumu
--    için gerekli) ama aynı tabloda price_override (fiyat) ve is_public (gizli
--    oda anahtarı) var. Bu iki kolonu yalnızca admin/manager değiştirebilsin.
--    Not: service_role (server actions) etkilenmez — auth.uid() boş olduğunda
--    get_user_role() null döner ve kontrol atlanır.
create or replace function public.protect_room_sensitive_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.price_override is distinct from old.price_override
      or new.is_public is distinct from old.is_public)
     and get_user_role() is not null
     and get_user_role() not in ('admin'::user_role, 'manager'::user_role) then
    raise exception 'Oda fiyatı ve görünürlüğü yalnızca admin tarafından değiştirilebilir';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_room_sensitive_columns on public.rooms;
create trigger trg_protect_room_sensitive_columns
  before update on public.rooms
  for each row
  execute function public.protect_room_sensitive_columns();

revoke execute on function public.protect_room_sensitive_columns() from anon, authenticated;
