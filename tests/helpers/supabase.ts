import fs from 'node:fs';
import path from 'node:path';
import type { RestaurantInsert, RestaurantRow } from '../../src/types/database.types';
import type { RestaurantInput } from '../../src/types/restaurant.types';

type Result<T> = { data: T; error: { code: string; message: string } | null };

function seedRows(): RestaurantRow[] {
  const seed: RestaurantInput[] = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../../src/data/restaurants.json'), 'utf8',
  ));
  return seed.map((item) => ({
    id: Number(item.id), name: item.name, category: item.category, location: item.location,
    price_range: item.priceRange, rating: Number(item.rating), description: item.description,
    recommended_menu: item.recommendedMenu ?? [], likes: Number(item.likes ?? 0), image: item.image ?? '',
  }));
}

let rows = seedRows();

export const databaseClient = {
  from(table: string) {
    if (table !== 'restaurants') throw new Error(`Unexpected table: ${table}`);
    return {
      select() {
        return {
          async order(): Promise<Result<RestaurantRow[]>> {
            return { data: structuredClone(rows), error: null };
          },
          eq(column: string, id: number) {
            if (column !== 'id') throw new Error(`Unexpected filter: ${column}`);
            return {
              async maybeSingle(): Promise<Result<RestaurantRow | null>> {
                return { data: structuredClone(rows.find((row) => row.id === id) ?? null), error: null };
              },
            };
          },
        };
      },
      insert(input: RestaurantInsert) {
        return {
          select() {
            return {
              async single(): Promise<Result<RestaurantRow>> {
                const row: RestaurantRow = {
                  id: Math.max(0, ...rows.map((item) => item.id)) + 1,
                  name: input.name, category: input.category, location: input.location,
                  price_range: input.price_range ?? 'No Information', rating: input.rating ?? 0,
                  description: input.description ?? '', recommended_menu: input.recommended_menu ?? [],
                  likes: input.likes ?? 0, image: input.image ?? '',
                };
                rows.push(structuredClone(row));
                return { data: structuredClone(row), error: null };
              },
            };
          },
        };
      },
    };
  },
  async rpc(name: string): Promise<Result<null>> {
    if (name !== 'reset_restaurant_demo_data') throw new Error(`Unexpected function: ${name}`);
    rows = seedRows();
    return { data: null, error: null };
  },
};

export function getSupabase() {
  return databaseClient;
}