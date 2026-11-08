export interface RestaurantData {
    id: number;
    name: string;
    category: string;
    location: string;
    priceRange: string;
    rating: number;
    description: string;
    recommendedMenu: string[];
    likes: number;
    image: string;
}

export interface RestaurantInput {
    id: number | string;
    name: string;
    category: string;
    location: string;
    priceRange: string;
    rating: number | string;
    description: string;
    recommendedMenu?: string[];
    likes?: number | string;
    image?: string;
}

export interface CreateRestaurantInput {
    name: string;
    category: string;
    location: string;
    priceRange?: string;
    rating?: number | string;
    description?: string;
    recommendedMenu?: string[];
    image?: string;
}

export type CreateRestaurantBody = Omit<Partial<CreateRestaurantInput>, 'recommendedMenu'> & {
    recommendedMenu?: unknown;
};