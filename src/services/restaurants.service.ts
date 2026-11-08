import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import Restaurant from '../models/restaurant.model';
import type { CreateRestaurantInput, RestaurantInput } from '../types/restaurant.types';
import type { RestaurantInsert } from '../types/database.types';
import { getSupabase, throwDatabaseError } from '../config/supabase';
import HttpError from '../utils/httpError';

const DATA_PATH = path.join(__dirname, '..', 'data', 'restaurants.json');
const RESTAURANT_COLUMNS = 'id,name,category,location,price_range,rating,description,recommended_menu,likes,image';
let synchronousDemoSnapshot: Restaurant[] = loadRestaurantsSync();

export function loadRestaurantsSync(): Restaurant[] {
  const raw = readFileSync(DATA_PATH, 'utf8');
  const parsed: RestaurantInput[] = JSON.parse(raw);
  return parsed.map((item) => new Restaurant(item));
}

export async function loadRestaurantsAsync(): Promise<Restaurant[]> {
  const raw = await readFile(DATA_PATH, 'utf8');
  const parsed: RestaurantInput[] = JSON.parse(raw);
  return parsed.map((item) => new Restaurant(item));
}

export async function getAllRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await getSupabase()
    .from('restaurants')
    .select(RESTAURANT_COLUMNS)
    .order('id', { ascending: true });
  if (error) throwDatabaseError(error);
  const restaurants = (data ?? []).map(Restaurant.fromDatabase);
  synchronousDemoSnapshot = restaurants.map((item) => new Restaurant(item));
  return restaurants;
}

export function getAllRestaurantsSync(): Restaurant[] {
  return synchronousDemoSnapshot.map((item) => new Restaurant(item));
}

export async function getRestaurantById(id: number | string): Promise<Restaurant | null> {
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId <= 0) return null;

  const { data, error } = await getSupabase()
    .from('restaurants')
    .select(RESTAURANT_COLUMNS)
    .eq('id', numericId)
    .maybeSingle();
  if (error) throwDatabaseError(error);
  return data ? Restaurant.fromDatabase(data) : null;
}

export async function getPopularRestaurants(limit = 5): Promise<Restaurant[]> {
  const restaurants = await getAllRestaurants();
  return restaurants
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

export async function createRestaurant(payload: Partial<CreateRestaurantInput>): Promise<Restaurant> {
  const { name, category, location } = payload;
  if (!name || !category || !location) {
    const missingField = !name ? 'name' : !category ? 'category' : 'location';
    throw new HttpError(400, `'${missingField}' is required`);
  }

  const row: RestaurantInsert = {
    name,
    category,
    location,
    price_range: payload.priceRange ?? 'No Information',
    rating: Number(payload.rating ?? 0),
    description: payload.description ?? '',
    recommended_menu: payload.recommendedMenu ?? [],
    likes: 0,
    image: payload.image ?? '',
  };
  const { data, error } = await getSupabase()
    .from('restaurants')
    .insert(row)
    .select(RESTAURANT_COLUMNS)
    .single();
  if (error) throwDatabaseError(error);
  const restaurant = Restaurant.fromDatabase(data!);
  synchronousDemoSnapshot = [...synchronousDemoSnapshot, new Restaurant(restaurant)];
  return restaurant;
}

export async function resetStore(): Promise<void> {
  const { error } = await getSupabase().rpc('reset_restaurant_demo_data');
  if (error) throwDatabaseError(error);
  synchronousDemoSnapshot = loadRestaurantsSync();
}