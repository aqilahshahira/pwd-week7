jest.mock('../src/config/supabase', () => ({
  ...jest.requireActual('../src/config/supabase'),
  ...require('./helpers/supabase'),
}));

import * as restaurantService from '../src/services/restaurants.service';
import { databaseClient } from './helpers/supabase';

describe('RestaurantService', () => {
  afterEach(async () => {
    jest.restoreAllMocks();
    await restaurantService.resetStore();
  });

  test('getAllRestaurants resolves with data', async () => {
    const restaurants = await restaurantService.getAllRestaurants();
    expect(Array.isArray(restaurants)).toBe(true);
    expect(restaurants.length).toBeGreaterThan(0);
  });

  test('getAllRestaurantsSync returns data immediately', () => {
    const restaurants = restaurantService.getAllRestaurantsSync();
    expect(Array.isArray(restaurants)).toBe(true);
    expect(restaurants.length).toBeGreaterThan(0);
  });

  test('async and sync file loaders read the same seed data', async () => {
    expect(await restaurantService.loadRestaurantsAsync()).toEqual(restaurantService.loadRestaurantsSync());
  });

  test('returned collections do not expose cached menu arrays', async () => {
    const restaurants = await restaurantService.getAllRestaurants();
    restaurants[0].recommendedMenu.push('External change');
    const fresh = restaurantService.getAllRestaurantsSync();
    expect(fresh[0].recommendedMenu).not.toContain('External change');
  });

  test('createRestaurant appends a new entry', async () => {
    const payload = {
      name: 'Test Restaurant',
      category: 'Test',
      location: 'Virtual Campus',
      rating: 4.5,
    };

    const created = await restaurantService.createRestaurant(payload);
    expect(created.id).toBeDefined();
    expect(created.name).toBe(payload.name);

    const all = await restaurantService.getAllRestaurants();
    const found = all.find((item) => item.id === created.id);
    expect(found).toBeTruthy();
  });

  test('createRestaurant rejects invalid payloads', async () => {
    await expect(
      restaurantService.createRestaurant({ name: 'Missing Restaurant' })
    ).rejects.toThrow("'category' is required");
  });
});


describe('Supabase storage contract', () => {
  afterEach(async () => {
    jest.restoreAllMocks();
    await restaurantService.resetStore();
  });

  test('returns DB rows with legacy field names and numeric types', async () => {
    const created = await restaurantService.createRestaurant({
      name: 'DB Registration', category: 'Korean Cuisine', location: 'Campus',
      priceRange: '7,000 KRW', rating: '4.75', recommendedMenu: ['Gimbap', 'Ramen'],
    });
    expect(created).toMatchObject({ id: 4, priceRange: '7,000 KRW', rating: 4.75, recommendedMenu: ['Gimbap', 'Ramen'], image: '' });
    expect(created).not.toHaveProperty('price_range');
    expect(created).not.toHaveProperty('recommended_menu');
    expect(await restaurantService.getRestaurantById(created.id)).toEqual(created);
    expect(restaurantService.getAllRestaurantsSync()).toHaveLength(4);
  });

  test.each(['abc', '1.5', '-1', '0'])('treats invalid ID %s as non-existent restaurant', async (id) => {
    expect(await restaurantService.getRestaurantById(id)).toBeNull();
  });

  test('forwards DB initialization failure to error handling without hiding it', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(databaseClient, 'rpc').mockResolvedValueOnce({
      data: null, error: { code: 'PGRST202', message: 'Function not found' },
    });
    await expect(restaurantService.resetStore()).rejects.toThrow('Supabase DB request failed.');
  });
});