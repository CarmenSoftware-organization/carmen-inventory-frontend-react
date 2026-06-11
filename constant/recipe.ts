export const RECIPE_STATUS = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;

export type RecipeStatus = (typeof RECIPE_STATUS)[keyof typeof RECIPE_STATUS];

export const RECIPE_STATUS_OPTIONS: { value: RecipeStatus; label: string }[] = [
  { value: RECIPE_STATUS.DRAFT, label: "Draft" },
  { value: RECIPE_STATUS.PUBLISHED, label: "Published" },
  { value: RECIPE_STATUS.ARCHIVED, label: "Archived" },
];

export const RECIPE_DIFFICULTY = {
  EASY: "EASY",
  MEDIUM: "MEDIUM",
  HARD: "HARD",
} as const;

export type RecipeDifficulty =
  (typeof RECIPE_DIFFICULTY)[keyof typeof RECIPE_DIFFICULTY];

export const RECIPE_DIFFICULTY_OPTIONS: {
  value: RecipeDifficulty;
  label: string;
}[] = [
  { value: RECIPE_DIFFICULTY.EASY, label: "Easy" },
  { value: RECIPE_DIFFICULTY.MEDIUM, label: "Medium" },
  { value: RECIPE_DIFFICULTY.HARD, label: "Hard" },
];

export const ALLERGEN_OPTIONS = [
  { value: "gluten", label: "Gluten (Wheat, Barley, Rye)" },
  { value: "dairy", label: "Dairy (Milk)" },
  { value: "eggs", label: "Eggs" },
  { value: "fish", label: "Fish" },
  { value: "shellfish", label: "Shellfish (Crustaceans)" },
  { value: "tree_nuts", label: "Tree Nuts" },
  { value: "peanuts", label: "Peanuts" },
  { value: "soy", label: "Soy" },
  { value: "sesame", label: "Sesame" },
  { value: "celery", label: "Celery" },
  { value: "mustard", label: "Mustard" },
  { value: "lupin", label: "Lupin" },
  { value: "molluscs", label: "Molluscs" },
  { value: "sulphites", label: "Sulphites" },
] as const;
