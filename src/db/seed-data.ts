export interface SeedFood {
  name: string;
  aliases?: string[];
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number; // mg
}

/**
 * Starter food database (~100 everyday foods). Values are per the listed
 * serving, based on USDA FoodData Central averages.
 */
export const SEED_FOODS: SeedFood[] = [
  // ----- Proteins -----
  { name: "Egg", aliases: ["large egg", "whole egg", "boiled egg", "fried egg"], servingSize: 1, servingUnit: "large egg", calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8, sodium: 71 },
  { name: "Egg White", servingSize: 1, servingUnit: "large egg white", calories: 17, protein: 3.6, carbs: 0.2, fat: 0.1, sodium: 55 },
  { name: "Chicken Breast", aliases: ["grilled chicken breast", "chicken breast cooked"], servingSize: 100, servingUnit: "g", calories: 165, protein: 31, carbs: 0, fat: 3.6, sodium: 74 },
  { name: "Chicken Thigh", servingSize: 100, servingUnit: "g", calories: 209, protein: 26, carbs: 0, fat: 10.9, sodium: 88 },
  { name: "Ground Beef", aliases: ["minced beef", "beef mince"], servingSize: 100, servingUnit: "g", calories: 250, protein: 26, carbs: 0, fat: 15, sodium: 75 },
  { name: "Steak", aliases: ["beef steak", "sirloin steak"], servingSize: 100, servingUnit: "g", calories: 271, protein: 25, carbs: 0, fat: 19, sodium: 54 },
  { name: "Pork Chop", servingSize: 100, servingUnit: "g", calories: 231, protein: 25.7, carbs: 0, fat: 13.9, sodium: 62 },
  { name: "Bacon", aliases: ["bacon strip", "bacon slice"], servingSize: 1, servingUnit: "slice", calories: 43, protein: 3, carbs: 0.1, fat: 3.3, sodium: 137 },
  { name: "Salmon", aliases: ["salmon fillet", "grilled salmon"], servingSize: 100, servingUnit: "g", calories: 208, protein: 20, carbs: 0, fat: 13, sodium: 59 },
  { name: "Tuna", aliases: ["canned tuna", "tuna in water"], servingSize: 100, servingUnit: "g", calories: 116, protein: 25.5, carbs: 0, fat: 0.8, sodium: 50 },
  { name: "Shrimp", aliases: ["prawns", "prawn"], servingSize: 100, servingUnit: "g", calories: 99, protein: 24, carbs: 0.2, fat: 0.3, sodium: 111 },
  { name: "Cod", aliases: ["white fish"], servingSize: 100, servingUnit: "g", calories: 82, protein: 18, carbs: 0, fat: 0.7, sodium: 54 },
  { name: "Turkey Breast", aliases: ["sliced turkey", "turkey slices"], servingSize: 100, servingUnit: "g", calories: 135, protein: 30, carbs: 0, fat: 1, sodium: 99 },
  { name: "Tofu", aliases: ["firm tofu"], servingSize: 100, servingUnit: "g", calories: 76, protein: 8, carbs: 1.9, fat: 4.8, fiber: 0.3, sodium: 7 },
  { name: "Tempeh", servingSize: 100, servingUnit: "g", calories: 192, protein: 20, carbs: 7.6, fat: 11, sodium: 9 },
  { name: "Ham", aliases: ["ham slice", "deli ham"], servingSize: 100, servingUnit: "g", calories: 145, protein: 21, carbs: 1.5, fat: 5.5, sodium: 1200 },
  { name: "Sausage", aliases: ["pork sausage", "breakfast sausage"], servingSize: 1, servingUnit: "link", calories: 170, protein: 9, carbs: 1, fat: 14, sodium: 400 },
  { name: "Protein Shake", aliases: ["whey protein", "protein powder", "protein scoop"], servingSize: 1, servingUnit: "scoop", calories: 120, protein: 24, carbs: 3, fat: 1.5, sugar: 2, sodium: 130 },

  // ----- Dairy -----
  { name: "Milk", aliases: ["whole milk", "glass of milk"], servingSize: 1, servingUnit: "cup (244 g)", calories: 149, protein: 7.7, carbs: 11.7, fat: 7.9, sugar: 12.3, sodium: 105 },
  { name: "Skim Milk", aliases: ["nonfat milk", "fat free milk"], servingSize: 1, servingUnit: "cup (245 g)", calories: 83, protein: 8.3, carbs: 12.2, fat: 0.2, sugar: 12.5, sodium: 103 },
  { name: "Greek Yogurt", aliases: ["greek yoghurt", "plain greek yogurt"], servingSize: 170, servingUnit: "g (container)", calories: 100, protein: 17, carbs: 6, fat: 0.7, sugar: 6, sodium: 61 },
  { name: "Yogurt", aliases: ["yoghurt", "plain yogurt"], servingSize: 170, servingUnit: "g (container)", calories: 104, protein: 6, carbs: 8, fat: 5.5, sugar: 8, sodium: 79 },
  { name: "Cheddar Cheese", aliases: ["cheddar", "cheese slice"], servingSize: 28, servingUnit: "g (slice)", calories: 113, protein: 6.4, carbs: 0.9, fat: 9.3, sodium: 180 },
  { name: "Mozzarella", aliases: ["mozzarella cheese"], servingSize: 28, servingUnit: "g", calories: 85, protein: 6.3, carbs: 0.6, fat: 6.3, sodium: 176 },
  { name: "Cottage Cheese", servingSize: 1, servingUnit: "cup (226 g)", calories: 183, protein: 24, carbs: 8, fat: 5, sugar: 8, sodium: 819 },
  { name: "Butter", aliases: ["pat of butter"], servingSize: 1, servingUnit: "tbsp (14 g)", calories: 102, protein: 0.1, carbs: 0, fat: 11.5, sodium: 91 },
  { name: "Cream Cheese", servingSize: 1, servingUnit: "tbsp (14.5 g)", calories: 51, protein: 0.9, carbs: 0.8, fat: 5, sugar: 0.5, sodium: 46 },
  { name: "Ice Cream", aliases: ["vanilla ice cream", "scoop of ice cream"], servingSize: 1, servingUnit: "scoop (66 g)", calories: 137, protein: 2.3, carbs: 15.6, fat: 7.3, sugar: 14, sodium: 53 },

  // ----- Grains & starches -----
  { name: "White Rice", aliases: ["rice", "steamed rice", "cooked rice", "bowl of rice"], servingSize: 1, servingUnit: "cup cooked (158 g)", calories: 205, protein: 4.3, carbs: 44.5, fat: 0.4, fiber: 0.6, sodium: 2 },
  { name: "Brown Rice", servingSize: 1, servingUnit: "cup cooked (195 g)", calories: 216, protein: 5, carbs: 44.8, fat: 1.8, fiber: 3.5, sodium: 10 },
  { name: "Oatmeal", aliases: ["oats", "porridge", "bowl of oatmeal", "rolled oats"], servingSize: 1, servingUnit: "cup cooked (234 g)", calories: 166, protein: 5.9, carbs: 28.1, fat: 3.6, fiber: 4, sugar: 0.6, sodium: 9 },
  { name: "White Bread", aliases: ["bread", "slice of bread", "toast"], servingSize: 1, servingUnit: "slice (25 g)", calories: 67, protein: 1.9, carbs: 12.7, fat: 0.8, fiber: 0.6, sugar: 1.4, sodium: 130 },
  { name: "Whole Wheat Bread", aliases: ["wheat bread", "wholemeal bread", "whole grain bread"], servingSize: 1, servingUnit: "slice (32 g)", calories: 82, protein: 4, carbs: 13.7, fat: 1.1, fiber: 1.9, sugar: 1.4, sodium: 144 },
  { name: "Bagel", aliases: ["plain bagel"], servingSize: 1, servingUnit: "medium bagel (105 g)", calories: 277, protein: 11, carbs: 55, fat: 1.4, fiber: 2.4, sugar: 5.5, sodium: 443 },
  { name: "Pasta", aliases: ["spaghetti", "noodles cooked", "penne"], servingSize: 1, servingUnit: "cup cooked (140 g)", calories: 221, protein: 8.1, carbs: 43.2, fat: 1.3, fiber: 2.5, sugar: 0.8, sodium: 1 },
  { name: "Quinoa", servingSize: 1, servingUnit: "cup cooked (185 g)", calories: 222, protein: 8.1, carbs: 39.4, fat: 3.6, fiber: 5.2, sugar: 1.6, sodium: 13 },
  { name: "Tortilla", aliases: ["flour tortilla", "wrap"], servingSize: 1, servingUnit: "medium tortilla (49 g)", calories: 146, protein: 3.9, carbs: 24.7, fat: 3.5, fiber: 1.4, sugar: 0.9, sodium: 364 },
  { name: "Cereal", aliases: ["corn flakes", "breakfast cereal"], servingSize: 1, servingUnit: "cup (28 g)", calories: 105, protein: 2, carbs: 24, fat: 0.3, fiber: 1, sugar: 3, sodium: 200 },
  { name: "Granola", servingSize: 0.5, servingUnit: "cup (56 g)", calories: 260, protein: 6, carbs: 34, fat: 12, fiber: 4, sugar: 12, sodium: 15 },
  { name: "Pancake", aliases: ["pancakes"], servingSize: 1, servingUnit: "medium pancake (77 g)", calories: 175, protein: 4.9, carbs: 22, fat: 7.4, fiber: 0.6, sugar: 4.4, sodium: 383 },
  { name: "Waffle", servingSize: 1, servingUnit: "waffle (75 g)", calories: 218, protein: 5.9, carbs: 24.7, fat: 10.6, fiber: 1.7, sugar: 3.5, sodium: 383 },
  { name: "Croissant", servingSize: 1, servingUnit: "medium croissant (57 g)", calories: 231, protein: 4.7, carbs: 26.1, fat: 12, fiber: 1.5, sugar: 6.4, sodium: 266 },
  { name: "Potato", aliases: ["baked potato", "boiled potato"], servingSize: 1, servingUnit: "medium potato (173 g)", calories: 161, protein: 4.3, carbs: 36.6, fat: 0.2, fiber: 3.8, sugar: 2, sodium: 17 },
  { name: "Sweet Potato", servingSize: 1, servingUnit: "medium (114 g)", calories: 103, protein: 2.3, carbs: 23.6, fat: 0.2, fiber: 3.8, sugar: 7.4, sodium: 41 },
  { name: "French Fries", aliases: ["fries", "chips"], servingSize: 1, servingUnit: "medium serving (117 g)", calories: 365, protein: 4, carbs: 48, fat: 17, fiber: 4.4, sugar: 0.3, sodium: 246 },

  // ----- Fruits -----
  { name: "Banana", servingSize: 1, servingUnit: "medium banana (118 g)", calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sugar: 14.4, sodium: 1 },
  { name: "Apple", servingSize: 1, servingUnit: "medium apple (182 g)", calories: 95, protein: 0.5, carbs: 25.1, fat: 0.3, fiber: 4.4, sugar: 18.9, sodium: 2 },
  { name: "Orange", servingSize: 1, servingUnit: "medium orange (131 g)", calories: 62, protein: 1.2, carbs: 15.4, fat: 0.2, fiber: 3.1, sugar: 12.2, sodium: 0 },
  { name: "Strawberries", aliases: ["strawberry"], servingSize: 1, servingUnit: "cup (152 g)", calories: 49, protein: 1, carbs: 11.7, fat: 0.5, fiber: 3, sugar: 7.4, sodium: 2 },
  { name: "Blueberries", aliases: ["blueberry"], servingSize: 1, servingUnit: "cup (148 g)", calories: 84, protein: 1.1, carbs: 21.4, fat: 0.5, fiber: 3.6, sugar: 14.7, sodium: 1 },
  { name: "Grapes", aliases: ["grape"], servingSize: 1, servingUnit: "cup (151 g)", calories: 104, protein: 1.1, carbs: 27.3, fat: 0.2, fiber: 1.4, sugar: 23.4, sodium: 3 },
  { name: "Watermelon", servingSize: 1, servingUnit: "cup diced (152 g)", calories: 46, protein: 0.9, carbs: 11.5, fat: 0.2, fiber: 0.6, sugar: 9.4, sodium: 2 },
  { name: "Mango", servingSize: 1, servingUnit: "cup sliced (165 g)", calories: 99, protein: 1.4, carbs: 24.7, fat: 0.6, fiber: 2.6, sugar: 22.5, sodium: 2 },
  { name: "Pineapple", servingSize: 1, servingUnit: "cup chunks (165 g)", calories: 82, protein: 0.9, carbs: 21.6, fat: 0.2, fiber: 2.3, sugar: 16.3, sodium: 2 },
  { name: "Avocado", servingSize: 0.5, servingUnit: "medium avocado (100 g)", calories: 160, protein: 2, carbs: 8.5, fat: 14.7, fiber: 6.7, sugar: 0.7, sodium: 7 },
  { name: "Peach", servingSize: 1, servingUnit: "medium peach (150 g)", calories: 59, protein: 1.4, carbs: 14.3, fat: 0.4, fiber: 2.3, sugar: 12.6, sodium: 0 },
  { name: "Pear", servingSize: 1, servingUnit: "medium pear (178 g)", calories: 101, protein: 0.6, carbs: 27.1, fat: 0.2, fiber: 5.5, sugar: 17.4, sodium: 2 },
  { name: "Kiwi", servingSize: 1, servingUnit: "kiwi (69 g)", calories: 42, protein: 0.8, carbs: 10.1, fat: 0.4, fiber: 2.1, sugar: 6.2, sodium: 2 },
  { name: "Raisins", servingSize: 1, servingUnit: "small box (43 g)", calories: 129, protein: 1.3, carbs: 34, fat: 0.2, fiber: 1.6, sugar: 25.4, sodium: 5 },

  // ----- Vegetables & legumes -----
  { name: "Broccoli", servingSize: 1, servingUnit: "cup chopped (91 g)", calories: 31, protein: 2.6, carbs: 6, fat: 0.3, fiber: 2.4, sugar: 1.5, sodium: 30 },
  { name: "Spinach", servingSize: 1, servingUnit: "cup raw (30 g)", calories: 7, protein: 0.9, carbs: 1.1, fat: 0.1, fiber: 0.7, sugar: 0.1, sodium: 24 },
  { name: "Carrot", aliases: ["carrots"], servingSize: 1, servingUnit: "medium carrot (61 g)", calories: 25, protein: 0.6, carbs: 5.8, fat: 0.1, fiber: 1.7, sugar: 2.9, sodium: 42 },
  { name: "Tomato", aliases: ["tomatoes"], servingSize: 1, servingUnit: "medium tomato (123 g)", calories: 22, protein: 1.1, carbs: 4.8, fat: 0.2, fiber: 1.5, sugar: 3.2, sodium: 6 },
  { name: "Cucumber", servingSize: 0.5, servingUnit: "cucumber (150 g)", calories: 23, protein: 1, carbs: 5.4, fat: 0.2, fiber: 0.8, sugar: 2.5, sodium: 3 },
  { name: "Lettuce", aliases: ["romaine lettuce"], servingSize: 1, servingUnit: "cup shredded (47 g)", calories: 8, protein: 0.6, carbs: 1.5, fat: 0.1, fiber: 1, sugar: 0.6, sodium: 4 },
  { name: "Bell Pepper", aliases: ["capsicum", "red pepper"], servingSize: 1, servingUnit: "medium pepper (119 g)", calories: 31, protein: 1.2, carbs: 7.2, fat: 0.4, fiber: 2.5, sugar: 5, sodium: 5 },
  { name: "Onion", servingSize: 1, servingUnit: "medium onion (110 g)", calories: 44, protein: 1.2, carbs: 10.3, fat: 0.1, fiber: 1.9, sugar: 4.7, sodium: 4 },
  { name: "Mushrooms", aliases: ["mushroom"], servingSize: 1, servingUnit: "cup sliced (70 g)", calories: 15, protein: 2.2, carbs: 2.3, fat: 0.2, fiber: 0.7, sugar: 1.4, sodium: 4 },
  { name: "Corn", aliases: ["sweet corn", "corn on the cob"], servingSize: 1, servingUnit: "ear (90 g)", calories: 77, protein: 2.9, carbs: 17.1, fat: 1.1, fiber: 2.4, sugar: 2.9, sodium: 14 },
  { name: "Green Beans", servingSize: 1, servingUnit: "cup (100 g)", calories: 31, protein: 1.8, carbs: 7, fat: 0.2, fiber: 2.7, sugar: 3.3, sodium: 6 },
  { name: "Black Beans", servingSize: 0.5, servingUnit: "cup cooked (86 g)", calories: 114, protein: 7.6, carbs: 20.4, fat: 0.5, fiber: 7.5, sugar: 0.3, sodium: 1 },
  { name: "Chickpeas", aliases: ["garbanzo beans"], servingSize: 0.5, servingUnit: "cup cooked (82 g)", calories: 134, protein: 7.3, carbs: 22.5, fat: 2.1, fiber: 6.2, sugar: 3.9, sodium: 6 },
  { name: "Lentils", servingSize: 0.5, servingUnit: "cup cooked (99 g)", calories: 115, protein: 9, carbs: 20, fat: 0.4, fiber: 7.8, sugar: 1.8, sodium: 2 },
  { name: "Edamame", servingSize: 1, servingUnit: "cup shelled (155 g)", calories: 188, protein: 18.5, carbs: 13.8, fat: 8.1, fiber: 8.1, sugar: 3.4, sodium: 9 },
  { name: "Hummus", servingSize: 2, servingUnit: "tbsp (30 g)", calories: 78, protein: 2.4, carbs: 6, fat: 5.4, fiber: 1.8, sugar: 0.1, sodium: 114 },

  // ----- Nuts, seeds & fats -----
  { name: "Almonds", aliases: ["almond"], servingSize: 28, servingUnit: "g (23 almonds)", calories: 164, protein: 6, carbs: 6.1, fat: 14.2, fiber: 3.5, sugar: 1.2, sodium: 0 },
  { name: "Peanut Butter", servingSize: 2, servingUnit: "tbsp (32 g)", calories: 188, protein: 8, carbs: 6.3, fat: 16.1, fiber: 1.9, sugar: 2.6, sodium: 152 },
  { name: "Peanuts", aliases: ["peanut"], servingSize: 28, servingUnit: "g", calories: 161, protein: 7.3, carbs: 4.6, fat: 14, fiber: 2.4, sugar: 1.3, sodium: 5 },
  { name: "Walnuts", aliases: ["walnut"], servingSize: 28, servingUnit: "g (14 halves)", calories: 185, protein: 4.3, carbs: 3.9, fat: 18.5, fiber: 1.9, sugar: 0.7, sodium: 1 },
  { name: "Cashews", aliases: ["cashew"], servingSize: 28, servingUnit: "g", calories: 157, protein: 5.2, carbs: 8.6, fat: 12.4, fiber: 0.9, sugar: 1.7, sodium: 3 },
  { name: "Chia Seeds", servingSize: 2, servingUnit: "tbsp (28 g)", calories: 138, protein: 4.7, carbs: 11.9, fat: 8.7, fiber: 9.8, sodium: 5 },
  { name: "Olive Oil", servingSize: 1, servingUnit: "tbsp (13.5 g)", calories: 119, protein: 0, carbs: 0, fat: 13.5, sodium: 0 },
  { name: "Mayonnaise", aliases: ["mayo"], servingSize: 1, servingUnit: "tbsp (13.8 g)", calories: 94, protein: 0.1, carbs: 0.1, fat: 10.3, sodium: 88 },

  // ----- Prepared / restaurant foods -----
  { name: "Pizza", aliases: ["pizza slice", "slice of pizza", "cheese pizza"], servingSize: 1, servingUnit: "slice (107 g)", calories: 285, protein: 12.2, carbs: 35.7, fat: 10.4, fiber: 2.5, sugar: 3.8, sodium: 640 },
  { name: "Hamburger", aliases: ["burger", "cheeseburger"], servingSize: 1, servingUnit: "burger (226 g)", calories: 540, protein: 25, carbs: 40, fat: 27, fiber: 2, sugar: 8, sodium: 950 },
  { name: "Hot Dog", servingSize: 1, servingUnit: "hot dog with bun (100 g)", calories: 290, protein: 10, carbs: 24, fat: 17, fiber: 1, sugar: 4, sodium: 810 },
  { name: "Chicken Nuggets", servingSize: 6, servingUnit: "pieces (96 g)", calories: 280, protein: 13, carbs: 18, fat: 17, fiber: 1, sodium: 540 },
  { name: "Caesar Salad", servingSize: 1, servingUnit: "bowl (200 g)", calories: 260, protein: 8, carbs: 12, fat: 20, fiber: 3, sugar: 3, sodium: 620 },
  { name: "Chicken Caesar Salad", servingSize: 1, servingUnit: "bowl (300 g)", calories: 390, protein: 34, carbs: 13, fat: 22, fiber: 3, sugar: 3, sodium: 800 },
  { name: "Burrito", aliases: ["chicken burrito"], servingSize: 1, servingUnit: "burrito (300 g)", calories: 580, protein: 27, carbs: 68, fat: 21, fiber: 8, sugar: 4, sodium: 1200 },
  { name: "Sushi Roll", aliases: ["california roll", "sushi"], servingSize: 6, servingUnit: "pieces (170 g)", calories: 255, protein: 9, carbs: 38, fat: 7, fiber: 3, sugar: 6, sodium: 430 },
  { name: "Fried Rice", aliases: ["chicken fried rice"], servingSize: 1, servingUnit: "cup (198 g)", calories: 333, protein: 12.5, carbs: 41.8, fat: 12.3, fiber: 1.4, sugar: 2, sodium: 780 },
  { name: "Ramen", aliases: ["instant noodles", "instant ramen"], servingSize: 1, servingUnit: "package (85 g dry)", calories: 380, protein: 9, carbs: 52, fat: 14, fiber: 2, sugar: 1, sodium: 1580 },
  { name: "Mac and Cheese", aliases: ["macaroni and cheese"], servingSize: 1, servingUnit: "cup (200 g)", calories: 350, protein: 13, carbs: 44, fat: 13, fiber: 2, sugar: 6, sodium: 750 },
  { name: "Grilled Cheese Sandwich", aliases: ["grilled cheese"], servingSize: 1, servingUnit: "sandwich (119 g)", calories: 400, protein: 14, carbs: 32, fat: 24, fiber: 1.5, sugar: 4, sodium: 900 },
  { name: "Peanut Butter and Jelly Sandwich", aliases: ["pb and j", "pbj sandwich"], servingSize: 1, servingUnit: "sandwich (101 g)", calories: 378, protein: 12, carbs: 48, fat: 16, fiber: 3.5, sugar: 17, sodium: 400 },
  { name: "Turkey Sandwich", servingSize: 1, servingUnit: "sandwich (183 g)", calories: 330, protein: 22, carbs: 41, fat: 8, fiber: 3, sugar: 5, sodium: 1200 },
  { name: "Chicken Soup", aliases: ["chicken noodle soup"], servingSize: 1, servingUnit: "cup (245 g)", calories: 90, protein: 6, carbs: 11, fat: 2.5, fiber: 1, sugar: 1, sodium: 850 },
  { name: "Protein Bar", aliases: ["energy bar"], servingSize: 1, servingUnit: "bar (60 g)", calories: 210, protein: 20, carbs: 22, fat: 7, fiber: 10, sugar: 2, sodium: 200 },

  // ----- Snacks & sweets -----
  { name: "Potato Chips", aliases: ["crisps", "bag of chips"], servingSize: 28, servingUnit: "g (small bag)", calories: 152, protein: 2, carbs: 15, fat: 9.8, fiber: 1.2, sugar: 0.1, sodium: 149 },
  { name: "Popcorn", servingSize: 1, servingUnit: "cup popped (8 g)", calories: 31, protein: 1, carbs: 6.2, fat: 0.4, fiber: 1.2, sugar: 0.1, sodium: 58 },
  { name: "Chocolate", aliases: ["milk chocolate", "chocolate bar"], servingSize: 1, servingUnit: "bar (43 g)", calories: 229, protein: 3.3, carbs: 25.5, fat: 13.1, fiber: 1.5, sugar: 22, sodium: 34 },
  { name: "Dark Chocolate", servingSize: 28, servingUnit: "g (2-3 squares)", calories: 170, protein: 2.2, carbs: 13, fat: 12.1, fiber: 3.1, sugar: 6.8, sodium: 6 },
  { name: "Cookie", aliases: ["chocolate chip cookie", "cookies"], servingSize: 1, servingUnit: "medium cookie (30 g)", calories: 148, protein: 1.5, carbs: 19.5, fat: 7.3, fiber: 0.6, sugar: 10.4, sodium: 93 },
  { name: "Donut", aliases: ["doughnut", "glazed donut"], servingSize: 1, servingUnit: "medium donut (60 g)", calories: 253, protein: 4, carbs: 30, fat: 14, fiber: 1, sugar: 12, sodium: 200 },
  { name: "Muffin", aliases: ["blueberry muffin"], servingSize: 1, servingUnit: "medium muffin (113 g)", calories: 426, protein: 6, carbs: 61, fat: 17, fiber: 1.5, sugar: 32, sodium: 380 },
  { name: "Brownie", servingSize: 1, servingUnit: "square (56 g)", calories: 227, protein: 2.7, carbs: 36, fat: 9.1, fiber: 1.2, sugar: 21, sodium: 156 },
  { name: "Crackers", aliases: ["cracker", "saltines"], servingSize: 5, servingUnit: "crackers (15 g)", calories: 64, protein: 1.4, carbs: 11, fat: 1.6, fiber: 0.4, sugar: 0.1, sodium: 141 },
  { name: "Trail Mix", servingSize: 0.25, servingUnit: "cup (38 g)", calories: 173, protein: 5, carbs: 17, fat: 11, fiber: 2, sugar: 10, sodium: 3 },

  // ----- Drinks -----
  { name: "Orange Juice", aliases: ["oj", "glass of orange juice"], servingSize: 1, servingUnit: "cup (248 g)", calories: 112, protein: 1.7, carbs: 25.8, fat: 0.5, fiber: 0.5, sugar: 20.8, sodium: 2 },
  { name: "Apple Juice", servingSize: 1, servingUnit: "cup (248 g)", calories: 114, protein: 0.2, carbs: 28, fat: 0.3, fiber: 0.5, sugar: 23.9, sodium: 10 },
  { name: "Coffee", aliases: ["black coffee", "cup of coffee"], servingSize: 1, servingUnit: "cup (237 mL)", calories: 2, protein: 0.3, carbs: 0, fat: 0, sodium: 5 },
  { name: "Latte", aliases: ["caffe latte", "coffee latte"], servingSize: 1, servingUnit: "medium (16 fl oz)", calories: 190, protein: 12, carbs: 18, fat: 7, sugar: 17, sodium: 170 },
  { name: "Cappuccino", servingSize: 1, servingUnit: "medium (16 fl oz)", calories: 120, protein: 8, carbs: 12, fat: 4, sugar: 10, sodium: 100 },
  { name: "Soda", aliases: ["coke", "cola", "soft drink", "can of coke"], servingSize: 1, servingUnit: "can (355 mL)", calories: 140, protein: 0, carbs: 39, fat: 0, sugar: 39, sodium: 45 },
  { name: "Diet Soda", aliases: ["diet coke", "coke zero"], servingSize: 1, servingUnit: "can (355 mL)", calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 40 },
  { name: "Beer", aliases: ["bottle of beer", "lager"], servingSize: 1, servingUnit: "bottle (355 mL)", calories: 153, protein: 1.6, carbs: 12.6, fat: 0, sodium: 14 },
  { name: "Red Wine", aliases: ["wine", "glass of wine"], servingSize: 1, servingUnit: "glass (148 mL)", calories: 125, protein: 0.1, carbs: 3.8, fat: 0, sugar: 0.9, sodium: 6 },
  { name: "Smoothie", aliases: ["fruit smoothie"], servingSize: 1, servingUnit: "medium (16 fl oz)", calories: 250, protein: 4, carbs: 57, fat: 1.5, fiber: 4, sugar: 48, sodium: 40 },
  { name: "Sports Drink", aliases: ["gatorade"], servingSize: 1, servingUnit: "bottle (591 mL)", calories: 140, protein: 0, carbs: 36, fat: 0, sugar: 34, sodium: 270 },
];
