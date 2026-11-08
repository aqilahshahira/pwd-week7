create table if not exists public.restaurants (
  id bigint generated always as identity primary key,
  name text not null,
  category text not null,
  location text not null,
  price_range text not null default 'no information',
  rating numeric not null default 0,
  description text not null default '',
  recommended_menu text[] not null default '{}',
  likes integer not null default 0,
  image text not null default ''
);

alter table public.restaurants enable row level security;
revoke all on table public.restaurants from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, delete on table public.restaurants to service_role;
grant usage, select, update on sequence public.restaurants_id_seq to service_role;

create or replace function public.reset_restaurants_demo_data()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
    lock table public.restaurants in exclusive mode;
    delete from public.restaurants;
    insert into public.restaurants
        (id, name, category, location, price_range, rating, description, recommended_menu, likes, image)
    values
        (1, 'Songlim Restaurant', 'Korean Cuisine', '21 World cup-ro 193beon-gil, Yeongtong-gu, Suwon-si, Gyeonggi-do (Woncheon-dong)', '7,000-13,000 KRW', 4.99, 'The best Korean restaurant around.', array['Soft Tofu Stew', 'Kimchi Stew', 'Beef Bulgogi', 'Spicy Stir-fried Pork']::text[], 0, 'https://mblogthumb-phinf.pstatic.net/MjAyMjA2MTJfODEg/MDAxNjU0OTYzNTM3MjE1.1BfmrmOsz_B6DBHAnhQSs6qfNIDnssofR-DrzMfigIIg.JHHDheG6ifJjtfKUqLss_mLXWFE9fNJ5BmepNUVXSOog.PNG.cary63/image.png?type=w966'),
        (2, 'Byeolmi Tteokbokki', 'Snack', 'Academy Building, 42 Aju-ro, Yeongtong-gu, Suwon-si, Gyeonggi-do', '7,000-10,000 KRW', 4.92, 'A happy bite paired with crispy deep-fried snacks.', array['Tteokbokki', 'Assorted Tempura', 'Blood Sausage', 'Fish Cake']::text[], 0, 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyNTA4MTJfMjcg%2FMDAxNzU0OTQ5ODk1Mjg0.GR6i3mNpJJXyqQrozGEJ65InCDBGlEmxc0aCeVHncJgg.sduDPX67J8hhoGxq4vLohpS4dXk1w-706dQLPfVs1iwg.JPEG%2Foutput%25A3%25DF1564208956.jpg'),
        (3, 'SOGO', 'Japanese Cuisine', '7 World cup-ro 193beon-gil, Yeongtong-gu, Suwon-si, Gyeonggi-do', '10,000-16,000 KRW', 4.89, 'Great Japanese cuisine, formerly Heosuabi,', array['Cold Soba', 'Kimchi Tonkatsu Nabe', 'Cordon Bleu Cutlet']::text[], 0, 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20190707_63%2F1562462598960nPDMy_JPEG%2FW7iKQEhTMzCF3flC1t0pzgzF.jpeg.jpg');

    perform pg_catalog.setval(pg_catalog.pg_get_serial_sequence('public.restaurants', 'id'), 3, true);
end;
$$;

revoke all on function public.reset_restaurants_demo_data() from public, anon, authenticated;
grant execute on function public.reset_restaurants_demo_data() to service_role;