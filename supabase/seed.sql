do $$
begin
    if not exists ( select 1 from public.restaurants) then perform public.reset_restaurants_demo_data();
    end if;
end;
$$;