import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { Shelf, CreateShelfDto } from "@/types/shelf";

// backend ยังไม่มี /shelves — หน้า /config/shelf สร้างรอ contract นี้ไว้
// (ทรงเดียวกับ config entity อื่น) list จะ error จนกว่า backend จะลง endpoint
const crud = createConfigCrud<Shelf, CreateShelfDto>({
  queryKey: QUERY_KEYS.SHELVES,
  endpoint: API_ENDPOINTS.SHELVES,
  label: "shelf",
  updateMethod: "PATCH",
});

export const useShelf = crud.useList;

export const useCreateShelf = crud.useCreate;

export const useUpdateShelf = crud.useUpdate;

export const useDeleteShelf = crud.useDelete;
