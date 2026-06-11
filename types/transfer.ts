/**
 * Add/remove transfer payload — shared by DTOs that sync a many-to-many
 * relation (e.g. department users/HODs, location users/products).
 */
export interface TransferPayload {
  add: { id: string }[];
  remove: { id: string }[];
}
